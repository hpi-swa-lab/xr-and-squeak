import { Extension } from "./extension.js";
import { config } from "./core/config.js";
import {
  ToggleableMutationObserver,
  findChange,
  getSelection,
  orParentThat,
  parentWithTag,
  rangeContains,
} from "./utils.js";
import { Block, Shard, Text } from "./view.js";
import { languageFor } from "./core/languages.js";

// An Editor manages the view for a single model.
//
// The mapping between editor and model is 1-1 but within the
// editor, the model may be split into multiple editable shards.
// Consequently, the Editor manages any state that is global to
// the model, such as its undo/redo history and tracks selection.
export class Editor extends HTMLElement {
  static keyMap = {};
  static registerKeyMap(map) {
    this.keyMap = map;
  }

  static init() {
    this.registerKeyMap({
      undo: "Ctrl-z",
      redo: "Ctrl-Z",
      save: "Ctrl-s",
      cut: "Ctrl-x",
      copy: "Ctrl-c",
      dismiss: "Escape",
      search: "Ctrl-f",
      indentLess: "Shift-Tab",
      indentMore: "Tab",

      selectNodeUp: "Ctrl-ArrowUp",
      selectNodeDown: "Ctrl-ArrowDown",
      popNodeOut: "Ctrl-o",

      insertFirstArg: "Alt-1",
      insertSecondArg: "Alt-2",
      insertThirdArg: "Alt-3",
      insertFourthArg: "Alt-4",
      insertFifthArg: "Alt-5",

      wrapWithWatch: "Ctrl-q",
      printIt: "Ctrl-p",
      browseIt: "Ctrl-b",
      browseSenders: "Alt-n",
      browseImplementors: "Alt-m",
      resetContents: "Ctrl-l",
      addNewBlock: "Ctrl-Enter",
      autocompleteAI: "Ctrl-.",
    });

    customElements.define("sb-shard", Shard);
    customElements.define("sb-block", Block);
    customElements.define("sb-text", Text);
    customElements.define("sb-editor", Editor);
  }

  // may be set by external parties to provide e.g. a file path or similar to
  // extensions that are coded specifically against that external party
  context = null;

  extensionInstances = [];

  focus() {
    this.focusShard(this.editHistory?.lastView?.shard);
  }

  focusShard(shard) {
    this.selectRange(...(this.selectionRange ?? [0, 0]), shard);
  }

  _sourceString = null;
  get sourceString() {
    return this._sourceString;
  }
  set sourceString(text) {
    // need a trailing newline for contenteditable, empty nodes cannot be edited
    if (text && text.slice(-1) !== "\n") text += "\n";
    this._sourceString = text;
  }

  set interactionMode(mode) {
    this._interactionMode = mode;
    this.hideSelection.textContent =
      mode === "block" ? `*::selection { background: transparent; }` : "";
  }
  get interactionMode() {
    return this._interactionMode;
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML =
      `<link rel="stylesheet" href="${config.baseURL}style.css">` +
      `${
        this.interactionMode === "block"
          ? `<link rel="stylesheet" href="${config.baseURL}style-blocks.css">`
          : ""
      }<slot></slot>`;
    this.editHistory = new EditHistory();
    this.suggestions = document.createElement("sb-suggestions");
    this.hideSelection = document.createElement("style");

    this.interactionMode = "text";
  }

  replaceSelection(text) {
    const range = this.selectionRange;
    this.replaceTextFromTyping({
      range: range,
      text,
      shard: this.selectedShard,
      selectionRange: [range[0] + text.length, range[0] + text.length],
    });
  }

  replaceTextFromTyping({ range, text, shard, selectionRange }) {
    const change = findChange(
      this.sourceString.slice(...range),
      text,
      this.selectionRange[1] - range[0]
    );
    change.from += range[0];
    change.to += range[0];
    change.selectionRange = selectionRange;

    if (change) {
      this.extensionsDo((e) => e.filterChange(change, this.sourceString));
    }

    this.setTextTracked(
      this.sourceString.slice(0, change.from) +
        (change.insert ?? "") +
        this.sourceString.slice(change.to),
      shard,
      change.selectionRange
    );
  }

  insertTextFromCommand(position, text) {
    this.replaceTextFromCommand([position, position], text);
  }

  replaceTextFromCommand(range, text) {
    this.setTextTracked(
      this.sourceString.slice(0, range[0]) +
        text +
        this.sourceString.slice(range[1]),
      null,
      this.selectedShard ?? this.shardForRange(range),
      range
    );
  }

  setTextTracked(text, shard, selectionRange) {
    const oldSelected = this.editHistory.lastView;
    const oldRange = this.selectionRange ?? [0, 0];
    const oldSource = this.sourceString;

    this.setText(text, shard, selectionRange);

    if (oldSelected !== this.selected) {
      this.editHistory.push(oldSource, oldRange, this.selected);
    }
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.sourceString })
    );
  }

  setText(text, shard, selectionRange) {
    if (text) {
      this.sourceString = text;
      this.source.updateModelAndView(this.sourceString);
    }

    this.extensionsDo((e) => e.process(["replacement"], this.source));
    this.resyncSelectionAfterChange(...selectionRange, shard);
    this.processType();
    this.extensionsDo((e) =>
      e.process(["always"], this.selected?.node ?? this.source)
    );
  }

  processType() {
    this.clearSuggestions();
    if (this.selected)
      this.extensionsDo((e) => e.process(["type"], this.selected.node));
  }

  set inlineExtensions(extensions) {
    this._inlineExtensions = extensions;
  }

  get inlineExtensions() {
    return this._inlineExtensions;
  }

  extensionsDo(cb) {
    ToggleableMutationObserver.ignoreMutation(() => {
      for (const e of [
        ...this.extensionInstances,
        ...(this.inlineExtensions ?? []),
      ])
        cb(e);
    });
  }

  async asyncExtensionsDo(cb) {
    for (const e of [
      ...this.extensionInstances,
      ...(this.inlineExtensions ?? []),
    ])
      await cb(e);
  }

  updateExtension(stringOrExtension, trigger, cb) {
    const ext =
      this.extensionInstances.find((e) => e.name === stringOrExtension) ??
      this.extensionInstances.find((e) => e.extension === stringOrExtension) ??
      this.inlineExtensions.find((e) => e.name === stringOrExtension) ??
      this.inlineExtensions.find((e) => e.extension === stringOrExtension);
    cb(ext);
    ToggleableMutationObserver.ignoreMutation(() => {
      ext.process([trigger], this.selected?.node ?? this.source);
    });
  }

  undo() {
    if (!this.editHistory.canUndo()) return;
    const { sourceString, cursorRange } = this.editHistory.undo();
    this.sourceString = sourceString;
    this.setText(sourceString, null, cursorRange);
  }

  redo() {
    // TODO need to push newest item
    if (!this.editHistory.canRedo()) return;
    const { sourceString, cursorRange } = this.editHistory.redo();
    this.setText(sourceString, null, cursorRange);
  }

  connectedCallback() {
    document.addEventListener(
      "selectionchange",
      (this.selectionHandler = this.onSelectionChange.bind(this))
    );
  }

  disconnectedCallback() {
    document.removeEventListener("selectionchange", this.selectionHandler);

    this.extensionsDo((e) => e.process(["extensionDisconnected"], this.source));
  }

  static observedAttributes = ["text", "language", "extensions"];
  attributeChangedCallback() {
    queueMicrotask(async () => {
      await this.updateEditor();
    });
  }

  async updateEditor() {
    await this._initEditor(
      this.getAttribute("text"),
      this.getAttribute("language"),
      this.getAttribute("extensions").split(" ").filter(Boolean)
    );
  }

  initializing = false;

  async _initEditor(text, language, extensionNames) {
    if (this.initializing) {
      this.queuedUpdate = arguments;
      return;
    }
    this.initializing = true;

    this.sourceString = text;
    if (this.shard) {
      this.extensionsDo((e) =>
        e.process(["extensionDisconnected"], this.source)
      );
      this.extensionInstances.forEach((e) => e.destroy());
      this.shard.source.destroy();
      this.shadowRoot.removeChild(this.shard);
    }

    const [root, ...extensions] = await Promise.all([
      languageFor(language).initModelAndView(text, language, this.root),
      ...extensionNames.map((e) => Extension.get(e)),
    ]);

    this.shadowRoot.appendChild(this.createShardFor(root));

    this.extensionInstances = extensions.map((e) => e.instance());
    this.extensionsDo((e) =>
      e.process(["extensionConnected", "replacement", "always"], this.source)
    );
    this.initializing = false;

    if (this.queuedUpdate) {
      let update = this.queuedUpdate;
      this.queuedUpdate = null;
      await this._initEditor(...update);
    }
  }

  changeSelection(cb) {
    const selection = getSelection();
    selection.removeAllRanges();
    cb(selection);
  }

  onSelectionChange() {
    const target = getSelection().anchorNode;
    if (!orParentThat(target, (p) => p === this)) return;

    const { selectionRange, selected } =
      this.selectedShard?._extractSourceStringAndCursorRange() ?? {};
    this._updateSelected(selected, selectionRange);
  }

  _updateSelected(newSelected, selectionRange) {
    const oldSelection = this.selected;
    this.selected = newSelected;
    this.selectionRange = selectionRange;
    if (oldSelection !== this.selected) {
      this.suggestions.onSelected(this.selected);
      if (this.selected)
        this.extensionsDo((e) => e.process(["selection"], this.selected.node));
    }

    const selectionIsExact =
      selectionRange &&
      this.selected &&
      selectionRange[0] === this.selected.range[0] &&
      selectionRange[1] === this.selected.range[1];
    if (selectionIsExact && !this.hideSelection.isConnected) {
      this.shadowRoot.appendChild(this.hideSelection);
    } else if (!selectionIsExact && this.hideSelection.isConnected) {
      this.shadowRoot.removeChild(this.hideSelection);
    }
  }

  resyncSelectionAfterChange(start, end, preferredShard) {
    // FIXME quite heavy and usually not necessary for all. we just need to
    // make sure the visibleRanges have reacted to changes in replacements.
    this.allShards.forEach((s) => s._extractSourceStringAndCursorRange());

    const shard = this.selectRange(start, end, preferredShard);
    // the selection may have gone away entirely as a side-effect of a mutation
    if (shard) {
      const r = [start, end];
      this._updateSelected(shard.findSelectedForRange(r), r);
    } else {
      this._updateSelected(null, null);
    }
  }

  selectRange(start, end, preferredShard = null) {
    const shard =
      this.shardForRange(start, end, preferredShard) ??
      this.closestShardForRange(start, end);
    shard?.selectRange(start, end);
    return shard;
  }

  shardForRange(start, end, preferredShard = null) {
    if (
      preferredShard &&
      preferredShard.isConnected &&
      preferredShard.containsRange([start, end])
    ) {
      return preferredShard;
    } else {
      for (const shard of this.allShards) {
        if (shard.isConnected && shard.containsRange([start, end])) {
          return shard;
        }
      }
    }
    return null;
  }

  closestShardForRange(start, end) {
    // first shard that is just after start
    // FIXME may want to take the best one of all possible
    for (const shard of this.allShards) {
      if (
        shard.isConnected &&
        shard.visibleRanges.some((r) => rangeContains(r, [start, start]))
      ) {
        return shard;
      }
    }
    return null;
  }

  _shards = [];

  createShardFor(node) {
    const shard = document.createElement("sb-shard");
    shard._editor = this;
    shard.update(node);
    return shard;
  }

  registerShard(shard) {
    this._shards.push(shard);
  }

  deregisterShard(shard) {
    const index = this._shards.indexOf(shard);
    if (index === -1) throw new Error("shard not registered");
    this._shards.splice(index, 1);
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

  get allShards() {
    return this._shards;
  }

  get selectedShard() {
    const selection = getSelection();
    const shard = parentWithTag(selection.anchorNode, "SB-SHARD");
    return shard?.editor === this ? shard : null;
  }

  get selectedText() {
    return this.sourceString.slice(...this.selectionRange);
  }

  get textForShortcut() {
    const range = this.selectionRange;
    if (range.start === range.end) {
      return this.selected?.node?.sourceString ?? "";
    } else {
      return this.selectedText;
    }
  }

  findNode(node) {
    return findNode(this.shard, node);
  }

  clearSuggestions() {
    this.suggestions?.clear();
  }

  addSuggestions(list) {
    this.suggestions.add(this.selected, list);
  }
}

function findNode(element, node) {
  if (element.node === node) return element;
  for (const child of element.children) {
    const found = findNode(child, node);
    if (found) return found;
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

    use() {
      this.anchor.node.replaceWith(
        this.shadowRoot.querySelector("div[active]").textContent
      );
    }

    canMove(delta) {
      const index = this.activeIndex;
      if (index === -1) return false;
      return index + delta >= 0 && index + delta < this.entries.length;
    }

    moveSelected(delta) {
      const index = this.activeIndex;
      if (index === -1) return;
      const newIndex = clamp(index + delta, 0, this.entries.length - 1);
      this.entries[index].removeAttribute("active");
      this.entries[newIndex].setAttribute("active", "true");
    }

    get active() {
      return this.isConnected;
    }

    get entries() {
      return this.shadowRoot.querySelector("#entries").querySelectorAll("div");
    }

    get activeEntry() {
      return this.shadowRoot.querySelector("div[active]");
    }

    get activeIndex() {
      return [...this.entries].indexOf(this.activeEntry);
    }

    clear() {
      this.shadowRoot.querySelector("#entries").innerHTML = "";
      this.remove();
    }

    add(view, list) {
      if (list.length === 0) return;

      this.anchor = view;
      for (const item of list) {
        const entry = document.createElement("div");
        entry.textContent = item;
        entry.addEventListener("click", () => {
          this.dispatchEvent(new CustomEvent("select", { detail: item }));
        });
        this.shadowRoot.querySelector("#entries").appendChild(entry);
      }
      this.entries[0].setAttribute("active", "true");
      this.shadowRoot.host.style.display = "block";
      const rect = view.getBoundingClientRect();
      this.shadowRoot.host.style.top = `${rect.bottom + 5}px`;
      this.shadowRoot.host.style.left = `${rect.left}px`;
      document.body.appendChild(this);
    }
  }
);

class EditHistory {
  undoStack = [];
  redoStack = [];

  get lastView() {
    return this.undoStack[this.undoStack.length - 1]?.view.deref();
  }

  push(sourceString, cursorRange, view) {
    this.redoStack = [];
    this.undoStack.push({
      sourceString,
      cursorRange,
      view: view ? new WeakRef(view) : null,
    });
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
