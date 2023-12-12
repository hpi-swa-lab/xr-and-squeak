import { ExtensionScope } from "./extension.js";
import { SBParser, config } from "./model.js";
import {
  ToggleableMutationObserver,
  findChange,
  getSelection,
  parentWithTag,
} from "./utils.js";
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
    this.shadowRoot.innerHTML = `<link rel="stylesheet" href="${config.baseURL}style.css"><slot></slot>`;
    this.editHistory = new EditHistory();
    this.suggestions = document.createElement("sb-suggestions");
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
    this._replaceText(range, text, shard, selectionRange);
    if (this.selected !== this.lastEditInView) {
      this.editHistory.push(this.sourceString, this.selectionRange);
      this.lastEditInView = this.selected;
    }
  }

  replaceTextFromCommand(range, text) {
    this.editHistory.push(this.sourceString, range);
    this.lastEditInView = null;
    this._replaceText(
      range,
      text,
      this.selectedShard ?? this.shardForRange(range),
      range
    );
  }

  _replaceText(range, text, shard, selectionRange) {
    this.setText(
      this.sourceString.slice(0, range[0]) +
        text +
        this.sourceString.slice(range[1]),
      shard,
      selectionRange
    );
  }

  setText(text, shard, selectionRange) {
    // FIXME does not support change as replace yet
    if (this.sourceString.length !== text.length)
      this.extensionsDo(
        (e) =>
          (text =
            text && e.filterChange(findChange(this.sourceString, text), text))
      );

    if (text) {
      this.sourceString = text;
      SBParser.updateModelAndView(this.sourceString, null, this.source);
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
    this.selectRange(...cursorRange);
  }

  redo() {
    // TODO need to push newest item
    if (!this.editHistory.canRedo()) return;
    const { sourceString, cursorRange } = this.editHistory.redo();
    this.setText(sourceString);
    this.selectRange(...cursorRange);
  }

  isInitialized = false;

  connectedCallback() {
    if (this.isInitialized) {
      return;
    }

    this.style.display = "block";
    this.style.margin = "1rem";
    this.sourceString = this.getAttribute("text");

    this.isInitialized = true;
    this.shadowRoot.appendChild(
      SBParser.initModelAndView(
        this.sourceString,
        this.getAttribute("language")
      ).createShard()
    );

    document.addEventListener(
      "selectionchange",
      (this.selectionHandler = this.onSelectionChange.bind(this))
    );
  }

  disconnectedCallback() {
    document.removeEventListener("selectionchange", this.selectionHandler);
  }

  onSelectionChange() {
    const oldSelection = this.selected;
    const { selectionRange, selected } =
      this.selectedShard?._extractSourceStringAndCursorRange() ?? {};
    this.selectionRange = selectionRange;
    this.selected = selected;

    if (oldSelection !== this.selected) {
      this.suggestions.onSelected(this.selected);
      if (this.selected)
        this.extensionsDo((e) => e.process(["selection"], this.selected.node));
    }
  }

  resyncSelectionAfterChange(start, end, preferredShard) {
    // FIXME quite heavy and usually not necessary for all. we just need to
    // make sure the visibleRanges have reacted to changes in replacements.
    this.allShards.forEach((s) => s._extractSourceStringAndCursorRange());

    const shard = this.selectRange(start, end, preferredShard);
    // the selection may have gone away entirely as a side-effect of a mutation
    if (shard) {
      this.selected = shard.findSelectedForRange([start, end]);
      this.selectionRange = [start, end];
    } else {
      this.selected = null;
      this.selectionRange = null;
    }
  }

  selectRange(start, end, preferredShard = null) {
    const shard = this.shardForRange(start, end, preferredShard);
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
    return this.shadowRoot.querySelectorAll("sb-shard");
  }

  get selectedShard() {
    const selection = getSelection(this.shadowRoot);
    const shard = parentWithTag(selection.anchorNode, "SB-SHARD");
    return shard?.editor === this ? shard : null;
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
