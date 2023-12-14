import { Replacement } from "./widgets.js";
import { Editor } from "./editor.js";
import {
  ToggleableMutationObserver,
  getSelection,
  nextHash,
  allViewsDo,
  clamp,
  rangeContains,
} from "./utils.js";

// A Shard is a self-contained editable element.
//
// Consequently, it keeps track of the selection and detects and isolates
// modifications to its content. It collaborates with the Editor to update
// the model when changes occur. It contains _EditableElements. It refers
// to a node in the source model. Multiple shards may point to the same node.
export class Shard extends HTMLElement {
  source = null;

  // provide convenience setter for preact, we want this to always
  // call our own update method, so we wrap the arg in an array and
  // thus force preact to always update the property (as the array
  // keeps changing identity)
  set initNode([node]) {
    this.update(node);
  }

  constructor() {
    super();

    // TODO use queue
    // this.addEventListener("compositionstart", () => { });
    // this.addEventListener("compositionend", () => { });

    this.addEventListener("blur", (e) => this.editor.clearSuggestions());

    this.addEventListener("paste", function (event) {
      event.preventDefault();
      document.execCommand(
        "inserttext",
        false,
        event.clipboardData.getData("text/plain")
      );
    });

    this.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "Tab":
          e.preventDefault();
          if (this.editor.suggestions.active) {
            this.editor.suggestions.use();
          } else {
            document.execCommand("insertText", false, "\t");
          }
          break;
        case "ArrowUp":
          if (this.editor.suggestions.canMove(-1)) {
            e.preventDefault();
            this.suggestions?.moveSelected(-1);
          }
          break;
        case "ArrowDown":
          if (this.editor.suggestions.canMove(1)) {
            e.preventDefault();
            this.suggestions?.moveSelected(1);
          }
          break;
      }

      for (const [action, key] of Object.entries(Editor.keyMap)) {
        if (this.matchesKey(e, key)) {
          let preventDefault = true;
          let selected = this.editor.selected;

          // dispatch to extensions
          this.editor.extensionsDo((e) => e.dispatchShortcut(action, selected));

          // built-in actions
          switch (action) {
            case "dismiss":
              this.editor.clearSuggestions();
              break;
            case "save":
              this.editor.extensionsDo((e) => e.process(["save"], this.source));
              break;
            case "cut":
            case "copy":
              // if we don't have a selection, cut/copy the full node
              if (new Set(this.editor.selectionRange).size === 1) {
                this.selectRange(...selected.getRange());
              }
              preventDefault = false;
              break;
          }

          if (preventDefault) e.preventDefault();
        }
      }
    });
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

    this.observer = new ToggleableMutationObserver(this, (mutations) => {
      mutations = [...mutations, ...this.observer.takeRecords()].reverse();
      console.assert(!mutations.some((m) => m.type === "attributes"));
      if (!mutations.some((m) => this.isMyMutation(m))) return;

      ToggleableMutationObserver.ignoreMutation(() => {
        const { selectionRange, sourceString } =
          this._extractSourceStringAndCursorRange();
        for (const mutation of mutations) this.observer.undoMutation(mutation);

        this.editor.replaceTextFromTyping({
          range: this.range,
          text: sourceString,
          shard: this,
          selectionRange,
        });
      });
    });

    this.editor.extensionsDo((e) => e.process(["always"], this.source));

    if (!this.editor) {
      debugger;
    }
  }

  disconnectedCallback() {
    this.observer.destroy();
    this.observer = null;

    this.addEventListener("blur", (e) => this.editor.clearSuggestions());
  }

  get editor() {
    const host = this.getRootNode().host;
    if (!host) return undefined;
    const editor = host.editor;
    console.assert(editor.tagName === "SB-EDITOR");
    return editor;
  }

  get range() {
    // if we are the root, tree-sitter reports ranges that start after the first whitespace.
    // this conflicts with our updating routines
    if (this.source.isRoot) return [0, this.editor.sourceString.length];
    return this.source.range;
  }

  matchesKey(e, key) {
    const modifiers = key.split("-");
    const baseKey = modifiers.pop();

    if (modifiers.includes("Ctrl") && !e.ctrlKey && !e.metaKey) return false;
    if (modifiers.includes("Alt") && !e.altKey) return false;
    return e.key === baseKey;
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
      if (this.childNodes[0]?.node !== this.source) {
        if (this.childNodes[0]) this.removeChild(this.childNodes[0]);
        this.appendChild(node.toHTML());
      }
    } else if (this.childNodes.length === 0) {
      this.appendChild(node.toHTML());
    }
  }

  get sourceString() {
    return this.editor.sourceString.slice(...this.range);
  }

  // combined operation to find the source string and cursor range
  // in the dom. we combine this because it is most commonly needed
  // after the user typed something, which changes both, and the
  // way to find them is the same.
  _extractSourceStringAndCursorRange() {
    const selection = getSelection(this.getRootNode());
    const cursorElements = [selection.focusNode, selection.anchorNode];
    const visibleRanges = [];

    let start = null;
    let string = "";
    const nestedElements = this._getNestedContentElements(
      this,
      [],
      cursorElements,
      true
    );
    let focusOffset = null;
    let anchorOffset = null;
    const rangeStart = this.range[0];
    for (const nested of [...nestedElements, null]) {
      const range = document.createRange();

      if (start) range.setStartAfter(start);
      else range.setStart(this, 0);

      if (nested === selection.focusNode) {
        range.setEnd(selection.focusNode, selection.focusOffset);
        focusOffset = string.length + range.toString().length;
      }
      if (nested === selection.anchorNode) {
        range.setEnd(selection.anchorNode, selection.anchorOffset);
        anchorOffset = string.length + range.toString().length;
      }
      if (cursorElements.includes(nested)) continue;

      if (nested) range.setEndBefore(nested);
      else range.setEndAfter(this);

      const str = range.toString();
      visibleRanges.push([
        rangeStart + string.length,
        rangeStart + string.length + str.length,
      ]);
      start = nested;
      string += str;

      if (nested) {
        string += nested.sourceString ?? "";
      }
    }

    const selectionRange = [
      this.range[0] + focusOffset,
      this.range[0] + anchorOffset,
    ].sort((a, b) => a - b);

    this.visibleRanges = visibleRanges;

    return {
      sourceString: string,
      selectionRange,
      selected: this.findSelectedForRange(selectionRange),
    };
  }

  containsRange(range) {
    return this.visibleRanges.some((r) => rangeContains(r, range));
  }

  // Recursively iterate over all elements within this shard.
  // when encountering an element that is neither a Block nor a Text,
  // we note it.
  // Additionally, we need to insert the two elements that our cursor
  // is located in this list, in the right position, so that we can
  // later grab the string from the previous element to the cursor.
  _getNestedContentElements(parent, list, cursorElements, insideBlocks) {
    for (const child of parent.childNodes) {
      if (
        cursorElements.includes(child) ||
        (insideBlocks && !(child instanceof Block || child instanceof Text))
      )
        list.push(child);
      this._getNestedContentElements(
        child,
        list,
        cursorElements,
        insideBlocks && child instanceof Block
      );
    }
    return list;
  }

  // smallest child encompassing range: on a tie, prefer named nodes
  // e.g., for this scenario: `abc|(` even though at index 3 is valid
  // for both the identifier and the parens, we prefer the identifier.
  findSelectedForRange(range) {
    let candidate = null;

    // we may have been deleted entirely
    if (!this.root) return null;

    allViewsDo(this, (child) => {
      const [start, end] = child.getRange();
      if (start <= range[0] && end >= range[1]) {
        if (
          !candidate ||
          ((child.node.named || !candidate.node.named) &&
            candidate.getRange()[1] - candidate.getRange()[0] > end - start)
        )
          candidate = child;
      }
    });
    return candidate;
  }

  _rangeToCursor(start, end) {
    const range = document.createRange();
    const startNode = this.root.findTextForCursor(start);
    const endNode = this.root.findTextForCursor(end);
    range.setStart(...startNode.rangeParams(start));
    range.setEnd(...endNode.rangeParams(end));
    return range;
  }

  _clampRange(start, end) {
    const range = this.range;
    return [clamp(start, ...range), clamp(end, ...range)];
  }

  selectRange(start, end) {
    if (end === undefined) end = start;
    const range = this._rangeToCursor(...this._clampRange(start, end));
    const selection = getSelection(this.getRootNode());
    selection.removeAllRanges();
    selection.addRange(range);
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
    const [c, d] = this.editor.selectionRange;
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
  set node(v) {
    super.node = v;
    if (v.named) this.setAttribute("type", v.type);
    if (v.field) this.setAttribute("field", v.field);
    else this.removeAttribute("field");
    // FIXME js specific
    if (
      [
        "class_declaration",
        "function_declaration",
        "method_definition",
      ].includes(v.type)
    )
      this.setAttribute("scope", true);
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
