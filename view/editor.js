import { Extension } from "../core/extension.js";
import {
  ToggleableMutationObserver,
  findChange,
  getSelection,
  last,
  parentWithTag,
} from "../utils.js";
import { Block, Text, ViewList } from "./elements.js";
import { Shard } from "./shard.js";
import { languageFor } from "../core/languages.js";
import {} from "./suggestions.js";
import { SBSelection } from "../core/focus.js";
import { SandblocksExtensionInstance } from "./extension-instance.js";
import { setConfig } from "../core/config.js";
import { preferences } from "./preferences.js";

preferences
  .registerDefaultShortcut("save", "Ctrl-s")
  .registerDefaultShortcut("undo", "Ctrl-z")
  .registerDefaultShortcut("undo", "Ctrl-z")
  .registerDefaultShortcut("redo", "Ctrl-Z")
  .registerDefaultShortcut("save", "Ctrl-s")
  .registerDefaultShortcut("cut", "Ctrl-x")
  .registerDefaultShortcut("copy", "Ctrl-c")
  .registerDefaultShortcut("dismiss", "Escape")
  .registerDefaultShortcut("search", "Ctrl-f")
  .registerDefaultShortcut("indentLess", "Shift-Tab")
  .registerDefaultShortcut("indentMore", "Tab")
  .registerDefaultShortcut("homeSelect", "Shift-Home")
  .registerDefaultShortcut("home", "Home")

  .registerDefaultShortcut("selectNodeUp", "Ctrl-ArrowUp")
  .registerDefaultShortcut("selectNodeDown", "Ctrl-ArrowDown")
  .registerDefaultShortcut("popNodeOut", "Ctrl-o")

  .registerDefaultShortcut("insertFirstArg", "Alt-1")
  .registerDefaultShortcut("insertSecondArg", "Alt-2")
  .registerDefaultShortcut("insertThirdArg", "Alt-3")
  .registerDefaultShortcut("insertFourthArg", "Alt-4")
  .registerDefaultShortcut("insertFifthArg", "Alt-5")

  .registerDefaultShortcut("highlightIt", "Ctrl-h")
  .registerDefaultShortcut("wrapWithWatch", "Ctrl-q")
  .registerDefaultShortcut("printIt", "Ctrl-p")
  .registerDefaultShortcut("browseIt", "Ctrl-b")
  .registerDefaultShortcut("browseSenders", "Alt-n")
  .registerDefaultShortcut("browseImplementors", "Alt-m")
  .registerDefaultShortcut("resetContents", "Ctrl-l")
  .registerDefaultShortcut("addNewBlock", "Ctrl-Enter")

  .addDefaultExtension("base:base", true, false);

// An Editor manages the view for a single model.
//
// The mapping between editor and model is 1-1 but within the
// editor, the model may be split into multiple editable shards.
// Consequently, the Editor manages any state that is global to
// the model, such as its undo/redo history and tracks selection.
export class Editor extends HTMLElement {
  static init(baseUrl = null) {
    baseUrl ??= new URL(".", location.href).toString();
    setConfig({ baseUrl });

    Extension.clearRegistry();

    customElements.define("sb-shard", Shard);
    customElements.define("sb-block", Block);
    customElements.define("sb-view-list", ViewList);
    customElements.define("sb-text", Text);
    customElements.define("sb-editor", Editor);
  }

  // may be set by external parties to provide e.g. a file path or similar to
  // extensions that are coded specifically against that external party
  context = null;

  get shardTag() {
    return "sb-shard";
  }

  get preferences() {
    return preferences;
  }

  extensionInstances = [];

  focus() {
    this.focusShard(this.editHistory?.lastView?.shard ?? this.shard);
  }

  focusShard(shard) {
    this.selection.focusEditable(shard);
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

  selected = null;

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
    this.selection.addEventListener("caretChange", () => this.onCaretChange());
  }

  onCaretChange() {
    this.maybeViewChange();

    this.extensionsDo((e) => e.process(["caret"], this.selected?.node));

    if (this.selection.isExact && !this.hideSelection.isConnected) {
      this.appendChild(this.hideSelection);
    } else if (!this.selection.isExact && this.hideSelection.isConnected) {
      this.removeChild(this.hideSelection);
    }
  }

  maybeViewChange() {
    const s = this.selection;
    const oldSelected = this.selected;
    this.selected =
      s.range && s.lastEditable?.tagName === "SB-SHARD"
        ? s.lastEditable.findSelectedForRange(s.range)
        : null;

    if (this.selected !== oldSelected) {
      this.suggestions.onSelected(this.selected);
      if (this.selected?.node)
        this.extensionsDo((e) => e.process(["selection"], this.selected.node));
    }
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
    if (!change) return;

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

  replaceFullTextFromCommand(text, selectionRange) {
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
    console.assert(typeof text === "string");
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

    const diff = this._setText(newSource);
    if (diff && !this.suspendViewChanges) {
      this.updateViewAfterChange(
        last(changes).selectionRange,
        diff,
        changes,
        doNotCommitToHistory,
        oldSelected,
        oldRange,
        oldSource
      );
    }
  }

  updateViewAfterChange(
    selectionRange,
    diff,
    changes,
    doNotCommitToHistory,
    oldSelected,
    oldRange,
    oldSource
  ) {
    this.extensionsDo((e) => e.process(["replacement"], this.source));
    if (selectionRange) this.selection.moveToRange(this, selectionRange);

    if (diff)
      this.extensionsDo((e) =>
        e.changesApplied(
          changes,
          oldSource,
          this.sourceString,
          this.source,
          diff
        )
      );
    this.clearSuggestions();
    if (this.selected)
      this.extensionsDo((e) => e.process(["type"], this.selected.node));
    this.extensionsDo((e) =>
      e.process(["always"], this.selected?.node ?? this.source)
    );

    if (!doNotCommitToHistory && oldSelected !== this.selected) {
      this.editHistory.push(oldSource, oldRange, this.selected);
    }
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.sourceString })
    );
  }

  // update the text buffer and resync selection and replacements
  // returns either the diff on success or null if the change was
  // denied
  _setText(text) {
    const { diff, tx } = this.source.updateModelAndView(text);

    let mayCommit = true;
    this.extensionsDo(
      (e) => (mayCommit = mayCommit && e.processStickyReplacements(this.source))
    );
    for (const node of this.stickyNodes) {
      mayCommit = mayCommit && node.connected;
    }
    if (!mayCommit) {
      tx.rollback();
      this.selection.moveToRange(this, this.selection.range);
      return null;
    }

    return diff;
  }

  stickyNodes = [];
  markSticky(node, sticky) {
    if (sticky) {
      this.stickyNodes.push(node);
    } else {
      const index = this.stickyNodes.indexOf(node);
      if (index !== -1) this.stickyNodes.splice(index, 1);
    }
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

  async addExtension(extension) {
    this.inlineExtensions ??= [];
    if (typeof extension === "string")
      extension = await Extension.get(extension);
    if (extension instanceof Extension)
      extension = extension.instance(SandblocksExtensionInstance);
    this.inlineExtensions.push(extension);

    extension.process(["extensionConnected"], this.source);
    // need to process all extensions since the new extension may have
    // introduced new shards
    this.extensionsDo((e) => e.process(["replacement"], this.source));
    this.extensionsDo((e) => e.process(["always"], this.source));
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

  disconnectedCallback() {
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

    this.extensionInstances = extensions.map((e) =>
      e.instance(SandblocksExtensionInstance)
    );
    this.extensionsDo((e) => e.process(["extensionConnected"], this.source));
    this.extensionsDo((e) => e.process(["replacement"], this.source));
    this.extensionsDo((e) => e.process(["always"], this.source));
    this.initializing = false;
    this._queuedViewUpdate = false;

    if (this.queuedUpdate) {
      let update = this.queuedUpdate;
      this.queuedUpdate = null;
      await this.load(...update);
    }

    queueMicrotask(() => this.dispatchEvent(new CustomEvent("loaded")));
  }

  selectRange(start, end, scrollIntoView = true) {
    console.assert(end !== undefined);
    this.selection.moveToRange(this, [start, end], scrollIntoView);
  }

  queueViewUpdate() {
    if (this._queuedViewUpdate) return;
    this._queuedViewUpdate = true;
    queueMicrotask(() => {
      this._queuedViewUpdate = false;
      this.extensionsDo((e) => e.process(["replacement"], this.source));
      this.extensionsDo((e) => e.process(["always"], this.source));
    });
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
    this.queueViewUpdate();
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

  get sbIsEditor() {
    return true;
  }

  get shard() {
    return this.querySelector("sb-shard");
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
    return (
      this.selectionRange && this.sourceString.slice(...this.selectionRange)
    );
  }

  get textForShortcut() {
    const range = this.selectionRange;
    if (range[0] === range[1]) {
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
  if (element.node === node && element.tagName !== "SB-SHARD") return element;
  for (const child of element.children) {
    const found = findNode(child, node);
    if (found) return found;
  }
}

class EditHistory {
  undoStack = [];
  redoStack = [];

  get lastView() {
    return this.undoStack[this.undoStack.length - 1]?.view?.deref();
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
