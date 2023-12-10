import { ExtensionScope } from "./extension.js";
import { SBParser, config } from "./model.js";
import { ToggleableMutationObserver, findChange } from "./utils.js";
import {} from "./view.js";

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
  extensionInstances = {};

  _sourceString = null;
  get sourceString() {
    return this._sourceString;
  }
  set sourceString(text) {
    // need a trailing newline for contenteditable, empty nodes cannot be edited
    if (text && text.slice(-1) !== "\n") text += "\n";
    this._sourceString = text;
  }

  static keyMap = {};
  static registerKeyMap(map) {
    this.keyMap = map;
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<link rel="stylesheet" href="${config.baseURL}style.css"><span id="content"></span><slot></slot>`;
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
    this._replaceText(range, text, view.shard, cursorRange);
  }

  replaceTextFromCommand(range, text) {
    this.editHistory.push(this.sourceString, range);
    this.lastEditInView = null;
    this._replaceText(range, text);
  }

  _replaceText(range, text, shard, cursorRange) {
    this.setText(
      this.sourceString.slice(0, range[0]) +
        text +
        this.sourceString.slice(range[1]),
      shard,
      cursorRange
    );
  }

  setText(text, shard, cursorRange) {
    // FIXME does not support change as replace yet
    if (this.sourceString.length !== text.length)
      this.extensionsDo(
        (e) =>
          (text = e.filterChange(findChange(this.sourceString, text), text))
      );

    this.sourceString = text;
    SBParser.updateModelAndView(this.sourceString, null, this.source);

    if (shard) shard.selectRange(...cursorRange);
    this.processType();
    this.extensionsDo((e) =>
      e.process(["always"], this.selected?.node ?? this.source)
    );
  }

  processType() {
    const selected = this.selected;
    selected.shard.clearSuggestions();
    this.extensionsDo((e) => e.process(["type"], selected.node));
  }

  extensionsDo(cb) {
    ToggleableMutationObserver.ignoreMutation(() => {
      let current = this.parentElement;
      while (current) {
        if (current instanceof ExtensionScope) {
          current.extensionsDo((e) => {
            if (!this.extensionInstances[e.name])
              this.extensionInstances[e.name] = e.instance();
          });
        }
        current = current.parentElement;
      }
      for (const e of Object.values(this.extensionInstances)) cb(e);
    });
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

    if (!this.getAttribute("language")) return;

    let contentRoot = this.shadowRoot.querySelector("#content");
    contentRoot.innerHTML = "";
    contentRoot.appendChild(
      SBParser.initModelAndView(
        this.sourceString,
        this.getAttribute("language")
      ).createShard()
    );
  }

  get editor() {
    return this;
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

  findNode(node) {
    return findNode(this.shard, node);
  }
}

function findNode(element, node) {
  if (element.node === node) return element;
  for (const child of element.children) {
    const found = findNode(child, node);
    if (found) return found;
  }
}
