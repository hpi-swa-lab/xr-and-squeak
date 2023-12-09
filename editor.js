import { SBParser, config } from "./model.js";
import { findChange } from "./utils.js";

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

// An Editor manages the view for a single model.
//
// The mapping between editor and model is 1-1 but within the
// editor, the model may be split into multiple editable shards.
// Consequently, the Editor manages any state that is global to
// the model, such as its undo/redo history.
export class Editor extends HTMLElement {
  lastEditInView = null;

  _sourceString = null;
  get sourceString() {
    return this._sourceString;
  }
  set sourceString(text) {
    // need a trailing newline for contenteditable, empty nodes cannot be edited
    if (text.slice(-1) !== "\n") text += "\n";
    this._sourceString = text;
  }

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

  replaceSelection(text) {
    const range = this.shard.cursorToRange();
    this.replaceTextFromTyping({
      range: range,
      text,
      cursorRange: range,
      view: this.selected,
    });
    this.shard.selectRange(range[0] + text.length);
  }

  replaceTextFromTyping({ range, text, cursorRange, view }) {
    if (view !== this.lastEditInView) {
      this.editHistory.push(this.sourceString, cursorRange);
      this.lastEditInView = view;
    }
    this._replaceText(range, text);
  }

  replaceTextFromCommand(range, text) {
    this.editHistory.push(this.sourceString, range);
    this.lastEditInView = null;
    this._replaceText(range, text);
  }

  _replaceText(range, text) {
    this.setText(
      this.sourceString.slice(0, range[0]) +
        text +
        this.sourceString.slice(range[1])
    );
  }

  setText(text) {
    // FIXME does not support change as replace yet
    if (this.sourceString.length !== text.length)
      this.shard.extensionsDo(
        (e) =>
          (text = e.filterChange(findChange(this.sourceString, text), text))
      );

    this.sourceString = text;
    SBParser.updateModelAndView(this.sourceString, null, this.source);
    this.shard.extensionsDo((e) => e.process(["always"], this.source));
  }

  undo() {
    if (!this.editHistory.canUndo()) return;
    const { sourceString, cursorRange } = this.editHistory.undo();
    this.sourceString = sourceString;
    this.lastEditInView = null;
    this.setText(sourceString);
    this.shard.selectRange(...cursorRange);
  }

  redo() {
    // TODO need to push newest item
    if (!this.editHistory.canRedo()) return;
    const { sourceString, cursorRange } = this.editHistory.redo();
    this.setText(sourceString);
    this.shard.placeCursorAt(cursorRange);
  }

  connectedCallback() {
    this.style.display = "block";
    this.style.margin = "1rem";
    this.sourceString = this.getAttribute("text");
    SBParser.parseText(this.sourceString, this.getAttribute("language")).then(
      (node) => {
        this.shadowRoot.appendChild(node.createView());

        // FIXME changes from Jens, not sure if those can work if the root is swapped out
        // this.shadowRoot.querySelectorAll(".view").forEach(ea => ea.remove())
        // let view = node.createView()
        // view.classList.add("view")
        // this.shadowRoot.appendChild(view);
      }
    );
  }

  get source() {
    return this.shard.source;
  }

  get shard() {
    return this.shadowRoot.querySelector("sb-shard");
  }

  get selected() {
    // TODO first find shard that has cursor
    return this.shard.selected;
  }
}
customElements.define("sb-editor", Editor);
