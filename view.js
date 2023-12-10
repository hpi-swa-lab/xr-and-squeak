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

    document.addEventListener(
      "selectionchange",
      (this.selectionHandler = this.onSelectionChange.bind(this))
    );

    this.addEventListener("blur", (e) => this.suggestions?.show(null, []));

    this.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "Tab":
          e.preventDefault();
          if (this.suggestions?.active) {
            this.suggestions.use();
          } else {
            document.execCommand("insertText", false, "\t");
          }
          break;
        case "ArrowUp":
          if (this.suggestions?.canMove(-1)) {
            e.preventDefault();
            this.suggestions?.moveSelected(-1);
          }
          break;
        case "ArrowDown":
          if (this.suggestions?.canMove(1)) {
            e.preventDefault();
            this.suggestions?.moveSelected(1);
          }
          break;
      }

      for (const [action, key] of Object.entries(Editor.keyMap)) {
        if (this.matchesKey(e, key)) {
          e.preventDefault();

          // dispatch to extensions
          this.editor.extensionsDo((e) =>
            e.dispatchShortcut(action, this.selected)
          );

          // built-in actions
          switch (action) {
            case "save":
              this.editor.extensionsDo((e) => e.process(["save"], this.source));
              break;
          }
        }
      }
    });

    this.observer = new ToggleableMutationObserver(this, (mutations) => {
      mutations = [...mutations, ...this.observer.takeRecords()].reverse();
      console.assert(!mutations.some((m) => m.type === "attributes"));
      if (!mutations.some((m) => this.isMyMutation(m))) return;

      ToggleableMutationObserver.ignoreMutation(() => {
        const text = this.sourceString;
        const cursorRange = this.cursorToRange();
        for (const mutation of mutations) this.observer.undoMutation(mutation);

        this.editor.replaceTextFromTyping({
          range: this.range,
          text,
          cursorRange,
          view: this.selected,
        });
      });
    });
    this.editor.extensionsDo((e) => e.process(["open", "always"], this.source));
  }

  disconnectedCallback() {
    document.removeEventListener("selectionchange", this.selectionHandler);
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

  previousSelection = null;
  onSelectionChange() {
    const newSelection = this.selected;
    if (newSelection !== this.previousSelection) {
      this.previousSelection = newSelection;
      this.suggestions?.onSelected(newSelection);
      if (newSelection)
        this.editor.extensionsDo((e) =>
          e.process(["selection"], newSelection.node)
        );
    }
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

  showSuggestions(list) {
    (this.suggestions ??= document.createElement("sb-suggestions")).show(
      this.selected,
      list
    );
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

customElements.define(
  "sb-suggestions",
  class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            position: absolute;
            z-index: 100;
            background: #f5f5f5;
            color: #000;
            padding: 0.25rem;
            border-radius: 0.25rem;
            white-space: nowrap;
            cursor: pointer;
            user-select: none;
            font-family: monospace;
            line-height: 1.5;
            box-shadow: 0 3px 15px rgba(0, 0, 0, 0.3);
            border: 1px solid #aaa;
            min-width: 200px;
            display: none;
          }
          #entries > div[active] {
            background: #ceddfe;
            border-radius: 0.25rem;
          }
          #entries > div {
            padding: 0.15rem 1rem;
          }
        </style>
        <div id="entries"><slot></slot></div>
      `;
    }

    onSelected(selected) {
      if (selected !== this.anchor) this.remove();
    }

    get active() {
      return this.isConnected;
    }

    use() {
      this.anchor.node.replaceWith(
        this.shadowRoot.querySelector("div[active]").textContent
      );
    }

    canMove(delta) {
      const entries = this.shadowRoot.querySelector("#entries");
      const children = entries.querySelectorAll("div");
      const active = entries.querySelector("div[active]");
      const index = [...children].indexOf(active);
      if (index === -1) return false;
      return index + delta >= 0 && index + delta < children.length;
    }

    moveSelected(delta) {
      const entries = this.shadowRoot.querySelector("#entries");
      const children = entries.querySelectorAll("div");
      const active = entries.querySelector("div[active]");
      const index = [...children].indexOf(active);
      if (index === -1) return;
      const newIndex = clamp(index + delta, 0, children.length - 1);
      children[index].removeAttribute("active");
      children[newIndex].setAttribute("active", "true");
    }

    show(view, list) {
      this.anchor = view;
      if (list.length === 0) {
        this.remove();
        return;
      }
      this.shadowRoot.querySelector("#entries").innerHTML = "";
      for (const item of list) {
        const entry = document.createElement("div");
        entry.textContent = item;
        entry.addEventListener("click", () => {
          this.dispatchEvent(new CustomEvent("select", { detail: item }));
        });
        this.shadowRoot.querySelector("#entries").appendChild(entry);
        list.indexOf(item) === 0 && entry.setAttribute("active", "true");
      }
      this.shadowRoot.host.style.display = "block";
      const rect = view.getBoundingClientRect();
      this.shadowRoot.host.style.top = `${rect.bottom + 5}px`;
      this.shadowRoot.host.style.left = `${rect.left}px`;
      document.body.appendChild(this);
    }
  }
);
