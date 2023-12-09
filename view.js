import { Replacement } from "./widgets.js";
import { Editor } from "./editor.js";
import {
  ToggleableMutationObserver,
  getSelection,
  nextHash,
  parentWithTag,
  allViewsDo,
  clamp,
} from "./utils.js";

// A Shard is a self-contained editable element.
//
// Consequently, it keeps track of the selection and detects and isolates
// modifications to its content. It collaborates with the Editor to update
// the model when changes occur. It contains _EditableElements. It refers
// to a node in the source model. Multiple shards may point to the same node.
export class Shard extends HTMLElement {
  source = null;

  // provide convenience setter for preact
  set initNode(node) {
    this.update(node);
  }

  connectedCallback() {
    for (const [key, value] of Object.entries({
      spellcheck: "false",
      autocorrect: "off",
      autocapitalize: "off",
      translate: "no",
      contenteditable: "true",
      role: "textbox",
      "aria-multiline": "true",
    }))
      this.setAttribute(key, value);

    // TODO use queue
    // this.addEventListener("compositionstart", () => { });
    // this.addEventListener("compositionend", () => { });

    this.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        document.execCommand("insertText", false, "\t");
      }

      for (const [action, key] of Object.entries(Editor.keyMap)) {
        if (this.matchesKey(e, key)) {
          e.preventDefault();
          this.editor.extensionsDo((e) =>
            e.dispatchShortcut(action, this.selected)
          );
        }
      }
    });

    this.observer = new ToggleableMutationObserver(this, (mutations) => {
      mutations = [...mutations, ...this.observer.takeRecords()].reverse();
      console.assert(!mutations.some((m) => m.type === "attributes"));
      if (!mutations.some((m) => this.isMyMutation(m))) return;

      ToggleableMutationObserver.ignoreMutation(() => {
        const text = this.sourceString;
        this.restoreCursorAfter(() => {
          for (const mutation of mutations)
            this.observer.undoMutation(mutation);

          this.editor.replaceTextFromTyping({
            range: this.range,
            text,
            cursorRange: this.cursorToRange(),
            view: this.selected,
          });
        });
      });
    });
    this.editor.extensionsDo((e) => e.process(["open", "always"], this.source));
  }

  get editor() {
    const editor = this.getRootNode().host.editor;
    console.assert(editor.tagName === "SB-EDITOR");
    return editor;
  }

  get range() {
    // if we are the root, tree-sitter reports ranges that start after the first whitespace.
    // this conflicts with our updating routines
    if (this.source.isRoot) return [0, this.sourceString.length];
    return this.source.range;
  }

  matchesKey(e, key) {
    const modifiers = key.split("-");
    const baseKey = modifiers.pop();

    if (modifiers.includes("Ctrl") && !e.ctrlKey && !e.metaKey) return false;
    if (modifiers.includes("Alt") && !e.altKey) return false;
    return e.key === baseKey;
  }

  get sourceString() {
    let start = null;
    let string = "";
    for (const nested of [...this.getNestedContentElements(), null]) {
      const range = document.createRange();

      if (start) range.setStartAfter(start);
      else range.setStart(this, 0);

      if (nested) range.setEndBefore(nested);
      else range.setEndAfter(this);

      start = nested;
      string += range.toString();

      if (nested) string += nested.sourceString ?? "";
    }
    return string;
  }

  getNestedContentElements(parent = this, list = []) {
    for (const child of parent.childNodes) {
      if (child instanceof Block) this.getNestedContentElements(child, list);
      else if (!(child instanceof Text)) list.push(child);
    }
    return list;
  }

  destroy() {
    this.observer.disconnect();
    this.parentElement?.removeChild(this);
  }

  isMyMutation(mutation) {
    let current = mutation.target;
    while (current) {
      if (current === this) return true;
      // in another shard
      if (current.tagName === "SB-SHARD") return false;
      // in a replacement
      if (current instanceof Replacement) return false;
      current = current.parentElement;
    }
    throw new Error("Mutation is not in shard");
  }

  update(node) {
    if (!this.source) {
      this.appendChild(node.toHTML());
      this.source = node;
    } else if (this.source !== node) {
      this.source = node;
      if (this.childNodes[0].node !== this.source) {
        this.removeChild(this.childNodes[0]);
        this.appendChild(node.toHTML());
      }
    }
  }

  get selected() {
    const range = this.cursorToRange();
    return range ? this.findSelected(this.root, range) : null;
  }
  // smallest child encompassing range
  findSelected(parent, range) {
    let candidate = null;
    allViewsDo(parent, (child) => {
      const [start, end] = child.getRange();
      if (start <= range[0] && end >= range[1]) {
        if (
          !candidate ||
          candidate.getRange()[1] - candidate.getRange()[0] > end - start
        )
          candidate = child;
      }
    });
    return candidate;
  }
  restoreCursorAfter(cb) {
    const range = this.cursorToRange();
    cb();
    if (range) this.selectRange(...range);
  }
  selectRange(start, end) {
    if (end === undefined) end = start;
    const range = this.rangeToCursor(...this.clampRange(start, end));
    const selection = getSelection(this.getRootNode());
    selection.removeAllRanges();
    selection.addRange(range);
  }
  clampRange(start, end) {
    const range = this.range;
    return [clamp(start, ...range), clamp(end, ...range)];
  }
  rangeToCursor(start, end) {
    const range = document.createRange();
    const startNode = this.root.findTextForCursor(start);
    const endNode = this.root.findTextForCursor(end);
    range.setStart(...startNode.rangeParams(start));
    range.setEnd(...endNode.rangeParams(end));
    return range;
  }
  cursorToRange() {
    const selection = getSelection(this.getRootNode());
    if (selection.rangeCount === 0) return null;
    return [
      this.cursorToIndex(selection.anchorNode, selection.anchorOffset),
      this.cursorToIndex(selection.focusNode, selection.focusOffset),
    ].sort();
  }
  cursorToIndex(node, offset) {
    const parent = parentWithTag(node, ["SB-TEXT", "SB-BLOCK"]);
    if (!parent) return 0;

    const range = document.createRange();
    range.selectNodeContents(parent);
    range.setEnd(
      node,
      // FIXME I have no idea why we seem to need to add an offset here
      // for empty lines.
      node.textContent.slice(-1) === "\n" ? Math.max(1, offset) : offset
    );
    return parent.getRange()[0] + range.toString().length;
  }

  get root() {
    return this.childNodes[0];
  }
}

// _EditableElement is the superclass for Text and Block elements, grouping
// common functionality.
class _EditableElement extends HTMLElement {
  get shard() {
    let current = this.parentElement;
    while (current) {
      if (current.tagName === "SB-SHARD") return current;
      current = current.parentElement;
    }
    return current;
  }
  get editor() {
    const editor = this.getRootNode().host.editor;
    console.assert(editor.tagName === "SB-EDITOR");
    return editor;
  }

  getRange() {
    return this.node.range;
  }

  isFullySelected() {
    const [a, b] = this.getRange();
    const [c, d] = this.shard.cursorToRange();
    return a === c && b === d;
  }

  select() {
    const range = document.createRange();
    range.selectNode(this);
    const selection = getSelection(this.getRootNode());
    selection.removeAllRanges();
    selection.addRange(range);
  }

  connectedCallback() {
    this.addEventListener("dblclick", this.onDoubleClick);
  }
  disconnectedCallback() {
    this.removeEventListener("dblclick", this.onDoubleClick);
  }
  onDoubleClick(e) {
    e.stopPropagation();
    this.editor.extensionsDo((e) => e.process(["doubleClick"], this.node));
  }
}

// Block the view for any non-terminal node.
export class Block extends _EditableElement {
  constructor() {
    super();
    this.hash = nextHash();
  }
  findTextForCursor(cursor) {
    for (const child of this.children) {
      if (["SB-TEXT", "SB-BLOCK"].includes(child.tagName)) {
        const [start, end] = child.node.range;
        if (start <= cursor && end >= cursor) {
          if (child.tagName === "SB-BLOCK")
            return child.findTextForCursor(cursor);
          else return child;
        }
      }
    }
    return null;
  }
}

// Text is the view for a terminal node.
export class Text extends _EditableElement {
  static observedAttributes = ["text"];
  constructor() {
    super();
    this.hash = nextHash();
  }
  rangeParams(offset) {
    if (this.childNodes.length === 0)
      this.appendChild(document.createTextNode(""));
    return [this.childNodes[0], offset - this.getRange()[0]];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "text") {
      this.textContent = newValue;
    }
  }
}
