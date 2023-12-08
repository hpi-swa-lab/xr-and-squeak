import { ExtensionScope, Replacement } from "./extension.js";
import { SBParser, config } from "./model.js";
import {
  ToggleableMutationObserver,
  WeakArray,
  getSelection,
  nextHash,
  parentWithTag,
  allViewsDo,
  clamp,
} from "./utils.js";

class EditHistory {
  undoStack = [];
  redoStack = [];

  push(sourceString, cursorRange) {
    this.redoStack = [];
    this.undoStack.push({ sourceString, cursorRange });
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const item = this.undoStack.pop();
    this.redoStack.push(item);
    return item;
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const item = this.redoStack.pop();
    this.undoStack.push(item);
    return item;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }
}

export class Editor extends HTMLElement {
  lastEditInNode = null;
  lastSourceString = null;

  static keyMap = {};
  static registerKeyMap(map) {
    this.keyMap = map;
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<link rel="stylesheet" href="${config.baseURL}style.css"><slot></slot>`;
    this.editHistory = new EditHistory();
  }

  noteChange(newSourceString, cursorRange, textField) {
    if (textField !== this.lastEditInNode) {
      this.editHistory.push(this.lastSourceString, cursorRange);
      this.lastEditInNode = textField;
    }
    this.lastSourceString = newSourceString;
  }

  undo() {
    if (!this.editHistory.canUndo()) return;
    const { sourceString, cursorRange } = this.editHistory.undo();
    this.lastSourceString = sourceString;
    this.lastEditInNode = null;
    SBParser.setNewText(this.source, sourceString);
    this.shard.selectRange(...cursorRange);
  }

  redo() {
    // TODO need to push newest item
    if (!this.editHistory.canRedo()) return;
    const { sourceString, cursorRange } = this.editHistory.redo();
    SBParser.setNewText(this.source, sourceString);
    this.shard.placeCursorAt(cursorRange);
  }

  connectedCallback() {
    this.style.display = "block";
    this.style.margin = "1rem";
    this.lastSourceString = this.getAttribute("text");
    SBParser.parseText(
      this.getAttribute("text"),
      this.getAttribute("language")
    ).then((node) => {
      this.shadowRoot.appendChild(node.createView());

      // FIXME changes from jens, not sure if those can work if the root is swapped out
      // this.shadowRoot.querySelectorAll(".view").forEach(ea => ea.remove())
      // let view = node.createView()
      // view.classList.add("view")
      // this.shadowRoot.appendChild(view);
    });
  }

  get sourceString() {
    return this.shard.sourceString;
  }

  get source() {
    return this.shard.source;
  }

  get shard() {
    return this.shadowRoot.querySelector("sb-shard");
  }

  get selected() {
    return this.shard.selected;
  }

  findNode(node) {
    return findNode(this.shard, node);
  }
}
customElements.define("sb-editor", Editor);

function findNode(parent, node) {
  // iterate over all dom children and check if the node is the same
  // as the source node
  for (const child of parent.childNodes) {
    if (child.node === node) return child;
    const result = findNode(child, node);
    if (result) return result;
  }
}

function getEditor(element) {
  const editor = element.getRootNode().host;
  console.assert(editor.tagName === "SB-EDITOR");
  return editor;
}

export class Shard extends HTMLElement {
  static observers = new WeakArray();
  static nestedDisable = 0;
  static ignoreMutation(cb) {
    if (this.nestedDisable === 0)
      this.observers.forEach((observer) => observer.disconnect());
    this.nestedDisable++;
    try {
      cb();
    } finally {
      this.nestedDisable--;
      if (this.nestedDisable === 0)
        this.observers.forEach((observer) => observer.connect());
    }
  }

  source = null;

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
    // this.addEventListener("compositionstart", () => {
    //   this.constructor.observers.forEach((observer) => observer.disconnect());
    // });
    // this.addEventListener("compositionend", () => {
    //   this.constructor.observers.forEach((observer) => observer.connect());
    // });

    this.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        document.execCommand("insertText", false, "\t");
      }

      for (const [action, key] of Object.entries(Editor.keyMap)) {
        if (this.matchesKey(e, key)) {
          e.preventDefault();
          this.extensionScopesDo((scope) => {
            scope.dispatchShortcut(action, this.selected);
          });
        }
      }
    });

    this.observer = new ToggleableMutationObserver(this, (mutations) => {
      mutations = [...mutations, ...this.observer.takeRecords()].reverse();
      if (!mutations.some((m) => this.isMyMutation(m))) return;

      this.constructor.ignoreMutation(() => {
        const newText = this.sourceString;
        this.restoreCursorAfter(() => {
          for (const mutation of mutations) {
            this.undoMutation(mutation);
          }

          SBParser.replaceText(this.source.root, this.range, newText);
        });
        this.editor.noteChange(newText, this.cursorToRange(), this.selected);
      });
    });
    this.constructor.observers.push(this.observer);
    this.processTriggers(["always", "open"], this.source);
  }
  get editor() {
    return getEditor(this);
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

  extensionScopesDo(cb) {
    this.constructor.ignoreMutation(() => {
      let current = this.getRootNode().host;
      while (current) {
        if (current instanceof ExtensionScope) {
          cb(current);
        }
        current = current.parentElement;
      }
    });
  }

  processTriggers(triggers, node) {
    this.extensionScopesDo((scope) => {
      scope.processTriggers(triggers, node);
    });
  }

  get sourceString() {
    const range = document.createRange();
    range.selectNodeContents(this);
    return range.toString();
  }

  undoMutation(mutation) {
    switch (mutation.type) {
      case "characterData":
        mutation.target.textContent = mutation.oldValue;
        break;
      case "childList":
        for (const node of mutation.removedNodes) {
          mutation.target.insertBefore(node, mutation.nextSibling);
        }
        for (const node of mutation.addedNodes) {
          mutation.target.removeChild(node);
        }
        break;
      default:
        debugger;
    }
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
    const range = this.rangeToCursor(...this.clampRange(start, end));
    const selection = getSelection(this.getRootNode());
    selection.removeAllRanges();
    selection.addRange(range);
  }
  clampRange(start, end) {
    const range = [0, this.sourceString.length];
    return [clamp(start, ...range), clamp(end, ...range)];
  }
  rangeToCursor(start, end) {
    const range = document.createRange();
    const startNode = this.root.findTextForCursor(start);
    const endNode = this.root.findTextForCursor(end);
    range.setStart(...startNode.rangeParams(start));
    range.setEnd(...endNode.rangeParams(start));
    return range;
  }
  cursorToRange() {
    const selection = getSelection(this.getRootNode());
    if (selection.rangeCount === 0) return null;
    return [
      this.cursorToIndex(selection.anchorNode, selection.anchorOffset),
      this.cursorToIndex(selection.focusNode, selection.focusOffset),
    ];
  }
  cursorToIndex(node, offset) {
    const parent = parentWithTag(node, ["SB-TEXT", "SB-BLOCK"]);
    if (!parent) return 0;

    const range = document.createRange();
    range.selectNodeContents(parent);
    range.setEnd(
      node,
      // FIXME I have no idea why we seem to need to add an offset here for empty lines.
      node.textContent.slice(-1) === "\n" ? Math.max(1, offset) : offset
    );
    return parent.getRange()[0] + range.toString().length;
  }

  get root() {
    return this.childNodes[0];
  }
}
customElements.define("sb-shard", Shard);

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
    const editor = this.getRootNode().host;
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
    Shard.ignoreMutation(() =>
      this.shard.processTriggers(["doubleClick"], this.node)
    );
  }
}

customElements.define(
  "sb-block",
  class Block extends _EditableElement {
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
);

customElements.define(
  "sb-text",
  class Text extends _EditableElement {
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
);
