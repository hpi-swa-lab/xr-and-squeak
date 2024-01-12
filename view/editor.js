import { Extension } from "../core/extension.js";
import {
  ToggleableMutationObserver,
  findChange,
  getSelection,
  last,
  orParentThat,
  parentWithTag,
  rangeEqual,
  rectDistance,
} from "../utils.js";
import { Block, Text, ViewList } from "./elements.js";
import { Shard } from "./shard.js";
import { languageFor } from "../core/languages.js";
import {} from "./suggestions.js";
import { SBSelection } from "../core/focus.js";

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
    Extension.clearRegistry();

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
      homeSelect: "Shift-Home",
      home: "Home",

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
    customElements.define("sb-view-list", ViewList);
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
    this.selectRange(...(this.selectionRange ?? [0, 0]), shard, false);
  }

  get sourceString() {
    return this.source.sourceString;
  }

  get selectionRange() {
    return this.selection.range;
  }
  set selectionRange(range) {
    throw new Error("FIXME set selectionRange");
  }

  get selected() {
    return this.selection.view;
  }
  set selected(node) {
    throw new Error("FIXME set selected");
  }
  get selectedText() {
    return this.sourceString.slice(...this.selectionRange);
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

    this.editHistory = new EditHistory();

    this.suggestions = document.createElement("sb-suggestions");
    this.hideSelection = document.createElement("style");

    this.interactionMode = "text";

    this.selection = new SBSelection();

    this.selection.addEventListener("viewChange", ({ detail: view }) => {
      this.suggestions.onSelected(view);
      if (view) this.extensionsDo((e) => e.process(["selection"], view.node));
    });
    this.selection.addEventListener("caretChange", () => {
      this.extensionsDo((e) => e.process(["caret"], this.selected?.node));

      if (this.selection.isExact && !this.hideSelection.isConnected) {
        this.appendChild(this.hideSelection);
      } else if (!this.selection.isExact && this.hideSelection.isConnected) {
        this.removeChild(this.hideSelection);
      }
    });
  }

  replaceSelection(text) {
    const range = this.selectionRange;
    this.replaceTextFromTyping({
      range: range,
      text,
      selectionRange: [range[0] + text.length, range[0] + text.length],
    });
  }

  replaceTextFromTyping({ range, text, selectionRange }) {
    const change = findChange(
      this.sourceString.slice(...range),
      text,
      this.selectionRange[1] - range[0]
    );
    change.from += range[0];
    change.to += range[0];
    change.selectionRange = selectionRange;

    if (change) {
      this.extensionsDo((e) =>
        e.filterChange(change, this.sourceString, this.source)
      );
    }

    this.applyChanges([change]);
  }

  insertTextFromCommand(position, text) {
    this.replaceTextFromCommand([position, position], text);
  }

  replaceFullTextFromCommand(text, shard, selectionRange) {
    this.applyChanges([
      {
        from: 0,
        to: this.sourceString.length,
        insert: text,
        selectionRange: selectionRange ?? [text.length, text.length],
      },
    ]);
  }

  replaceTextFromCommand(range, text) {
    const position = range[0] + text.length;
    this.applyChanges([
      {
        from: range[0],
        to: range[1],
        insert: text,
        selectionRange: [position, position],
      },
    ]);
  }

  // apply a change to the text buffer and notify all interested parties
  // NOTE: the change may be denied if it would destroy a sticky replacement
  applyChanges(changes, doNotCommitToHistory = false) {
    const oldSelected = this.editHistory.lastView;
    const oldRange = this.selectionRange ?? [0, 0];
    const oldSource = this.sourceString;

    let newSource = oldSource;
    for (const { from, to, insert } of changes) {
      newSource =
        newSource.slice(0, from) + (insert ?? "") + newSource.slice(to);
    }

    const diff = this._setText(newSource, last(changes).selectionRange);
    if (diff) {
      this.clearSuggestions();
      if (this.selected)
        this.extensionsDo((e) => e.process(["type"], this.selected.node));
      this.extensionsDo((e) =>
        e.process(["always"], this.selected?.node ?? this.source)
      );
      this.extensionsDo((e) =>
        e.changesApplied(changes, oldSource, newSource, this.source, diff)
      );

      if (!doNotCommitToHistory && oldSelected !== this.selected) {
        this.editHistory.push(oldSource, oldRange, this.selected);
      }
      this.dispatchEvent(
        new CustomEvent("change", { detail: this.sourceString })
      );
    }
  }

  // update the text buffer and resync selection and replacements
  // returns either the diff on success or null if the change was
  // denied
  _setText(text, selectionRange) {
    const { diff, tx } = this.source.updateModelAndView(text);

    let mayCommit = true;
    this.extensionsDo(
      (e) =>
        (mayCommit = mayCommit && e._processStickyReplacements(this.source))
    );
    if (!mayCommit) {
      tx.rollback();
      this.selection.moveToRange(this, this.selection.range);
      return null;
    }

    this.extensionsDo((e) => e.process(["replacement"], this.source));
    this.selection.moveToRange(this, selectionRange);
    return diff;
  }

  changeDOM(cb) {
    ToggleableMutationObserver.ignoreMutation(() => {
      cb();
      this.extensionsDo((e) => e.process(["replacement"], this.source));
      this.extensionsDo((e) =>
        e.process(["always"], this.selected?.node ?? this.source)
      );
    });
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
    cb?.(ext);
    ToggleableMutationObserver.ignoreMutation(() => {
      ext.process([trigger], this.selected?.node ?? this.source);
    });
  }

  undo() {
    if (!this.editHistory.canUndo()) return;
    const { sourceString, cursorRange, view } = this.editHistory.undo();
    // TODO update to only remember and apply changes
    this.applyChanges(
      [
        {
          from: 0,
          to: this.sourceString.length,
          insert: sourceString,
          selectionRange: cursorRange,
        },
      ],
      true
    );
  }

  redo() {
    // TODO need to push newest item
    // TODO not implemented
    // if (!this.editHistory.canRedo()) return;
    // const { sourceString, cursorRange } = this.editHistory.redo();
    // this.setText(sourceString, null, cursorRange);
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
  _queued = false;
  attributeChangedCallback() {
    if (!this._queued) {
      this._queued = true;
      queueMicrotask(async () => {
        this._queued = false;
        await this.updateEditor();
      });
    }
  }

  async updateEditor() {
    await this.load(
      this.getAttribute("text"),
      this.getAttribute("language"),
      this.getAttribute("extensions").split(" ").filter(Boolean)
    );
  }

  initializing = false;

  async load(text, language, extensionNames) {
    if (this.initializing) {
      this.queuedUpdate = arguments;
      return;
    }
    this.initializing = true;

    if (this.shard) {
      this.extensionsDo((e) =>
        e.process(["extensionDisconnected"], this.source)
      );
      this.extensionInstances.forEach((e) => e.destroy());
      this.shard.source.destroy();
      this.shard.remove();
    }

    const [root, ...extensions] = await Promise.all([
      languageFor(language).initModelAndView(text, language, this.root),
      ...extensionNames.map((e) => Extension.get(e)),
    ]);

    this.appendChild(this.createShardFor(root));

    this.extensionInstances = extensions.map((e) => e.instance());
    this.extensionsDo((e) => e.process(["extensionConnected"], this.source));
    this.extensionsDo((e) => e.process(["replacement"], this.source));
    this.extensionsDo((e) => e.process(["always"], this.source));
    this.initializing = false;

    if (this.queuedUpdate) {
      let update = this.queuedUpdate;
      this.queuedUpdate = null;
      await this.load(...update);
    }

    queueMicrotask(() => this.dispatchEvent(new CustomEvent("loaded")));
  }

  changeSelection(cb) {
    const selection = getSelection();
    selection.removeAllRanges();
    cb(selection);
  }

  onSelectionChange() {
    if (document.activeElement.tagName !== "SB-SHARD")
      return this.selection.deselect();

    const selection = getSelection();
    // no selection -- this typically means that we are in the process of changing selections
    if (selection.type === "None") return;

    const shard = parentWithTag(selection.anchorNode, "SB-SHARD");
    if (shard?.editor !== this) return this.selection.deselect();

    const { selectionRange, view } = shard._extractSelectionRange() ?? {};
    this.selection.informChange(view, selectionRange);
  }

  selectRange(start, end, scrollIntoView = true) {
    this.selection.moveToRange(this, [start, end], scrollIntoView);
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
    return this.querySelector("sb-shard");
  }

  get allShards() {
    return this._shards;
  }

  get allEditableElements() {
    return this.querySelectorAll("[sb-editable]");
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
