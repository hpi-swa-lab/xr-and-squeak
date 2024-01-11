import { Replacement } from "./widgets.js";
import { Editor } from "./editor.js";
import {
  ToggleableMutationObserver,
  getSelection,
  allViewsDo,
  clamp,
  rangeContains,
  orParentThat,
  matchesKey,
  last,
  rectDistance,
  lastDeepChild,
  firstDeepChild,
  withDo,
  parentWithTag,
} from "../utils.js";
import { Block, Text } from "./elements.js";
import { markAsEditableElement } from "../core/focus.js";

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
      event.stopPropagation();
      document.execCommand(
        "inserttext",
        false,
        event.clipboardData.getData("text/plain")
      );
    });

    this.addEventListener("copy", function (e) {
      e.clipboardData.setData("text/plain", this.editor.selectedText);
      e.preventDefault();
      e.stopPropagation();
    });

    this.addEventListener("keydown", async (e) => {
      switch (e.key) {
        case "ArrowUp":
          if (this.editor.suggestions.canMove(-1)) {
            e.preventDefault();
            this.editor.suggestions?.moveSelected(-1);
          }
          break;
        case "ArrowDown":
          if (this.editor.suggestions.canMove(1)) {
            e.preventDefault();
            this.editor.suggestions?.moveSelected(1);
          }
          break;
      }

      for (const [action, key] of Object.entries(Editor.keyMap)) {
        if (matchesKey(e, key)) {
          let preventDefault = true;
          let selected = this.editor.selected;

          // dispatch to extensions
          this.editor.extensionsDo((e) =>
            e.dispatchShortcut(action, selected, this.editor.source)
          );

          // built-in actions
          switch (action) {
            case "dismiss":
              this.editor.clearSuggestions();
              break;
            case "save":
              e.preventDefault();
              e.stopPropagation();
              await this.editor.asyncExtensionsDo((e) =>
                e.processAsync("preSave", this.source)
              );
              this.editor.extensionsDo((e) => e.process(["save"], this.source));
              this.editor.dispatchEvent(
                new CustomEvent("save", { detail: this.editor.sourceString })
              );
              break;
            case "cut":
            case "copy":
              // if we don't have a selection, cut/copy the full node
              if (new Set(this.editor.selectionRange).size === 1) {
                debugger;
              }
              preventDefault = false;
              break;
          }

          if (preventDefault) {
            e.preventDefault();
            e.stopPropagation();
          }

          break;
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
      focusable: "true",
    }))
      this.setAttribute(key, value);

    markAsEditableElement(this);

    this.editor.registerShard(this);

    this.observer = new ToggleableMutationObserver(this, (mutations) => {
      mutations = [...mutations, ...this.observer.takeRecords()].reverse();
      if (mutations.some((m) => m.type === "attributes")) return;
      console.assert(!mutations.some((m) => m.type === "attributes"));
      if (!mutations.some((m) => this.isMyMutation(m))) return;

      ToggleableMutationObserver.ignoreMutation(() => {
        const { selectionRange, sourceString } =
          this._extractSourceStringAndSelectionRangeAfterMutation();
        for (const mutation of mutations) this.observer.undoMutation(mutation);

        this.editor.replaceTextFromTyping({
          range: this.range,
          text: sourceString,
          selectionRange,
        });
      });
    });
  }

  disconnectedCallback() {
    this.observer.destroy();
    this.observer = null;

    this.editor.deregisterShard(this);

    this.addEventListener("blur", (e) => this.editor.clearSuggestions());
  }

  get root() {
    return this.childNodes[0];
  }

  get editor() {
    if (this._editor) return this._editor;

    this._editor = orParentThat(this, (x) => x.tagName === "SB-EDITOR");
    if (this._editor) return this._editor;

    return (this._editor = orParentThat(
      this.parentNode,
      (x) => x.tagName === "SB-SHARD" && x.editor
    )?.editor);
  }

  get range() {
    // if we are the root, tree-sitter reports ranges that start after the first whitespace.
    // this conflicts with our updating routines
    if (this.source.isRoot) return [0, this.editor.sourceString.length];
    return this.source.range;
  }

  destroy() {
    this.observer.disconnect();
    this.parentElement?.removeChild(this);
  }

  focus() {
    this.editor.focusShard(this);
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
    if (
      !this.source ||
      !this.source.equals(node) ||
      this.childNodes.length === 0
    ) {
      this.innerHTML = "";
      this.append(node.toHTML());
      this.source = node;
    }
  }

  get sourceString() {
    return this.editor.sourceString.slice(...this.range);
  }

  // extract the current DOM selection.
  // to be used only after DOM changes have been reconciled with the model.
  _extractSelectionRange() {
    return this._rangeForSelection(getSelection().getRangeAt(0));
  }

  _rangeForSelection(range) {
    const selectionRange = [
      this._indexForSelection(range.startContainer, range.startOffset),
      this._indexForSelection(range.endContainer, range.endOffset),
    ].sort((a, b) => a - b);
    return {
      selectionRange,
      rect: range.getBoundingClientRect(),
      view: this.findSelectedForRange(selectionRange),
    };
  }

  _indexForSelection(node, offset) {
    if (node instanceof window.Text)
      return parentWithTag(node, "SB-TEXT").range[0] + offset;
    return orParentThat(
      node.children[clamp(offset, 0, node.children.length - 1)],
      (n) => !!n.range
    ).range[offset < node.children.length ? 0 : 1];
    return parentWithTag("SB-BLOCK").range[
      offset < node.children.length ? 0 : 1
    ];
  }

  // combined operation to find the source string and cursor range
  // in the dom. to be used after a DOM mutation has happened that
  // we have not yet undone and reconciled with the model.
  _extractSourceStringAndSelectionRangeAfterMutation() {
    const selection = getSelection();
    const hasSelection = selection.anchorNode && selection.focusNode;
    const cursorElements = hasSelection
      ? [selection.focusNode, selection.anchorNode]
      : [];

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

      if (hasSelection && nested === selection.focusNode) {
        range.setEnd(selection.focusNode, selection.focusOffset);
        focusOffset = string.length + range.toString().length;
      }
      if (hasSelection && nested === selection.anchorNode) {
        range.setEnd(selection.anchorNode, selection.anchorOffset);
        anchorOffset = string.length + range.toString().length;
      }
      if (cursorElements.includes(nested)) continue;

      if (nested) range.setEndBefore(nested);
      else range.setEndAfter(lastDeepChild(this));

      start = nested;
      string += range.toString();

      if (nested) {
        string += nested.sourceString ?? "";
      }
    }

    return {
      sourceString: string,
      selectionRange: [
        this.range[0] + focusOffset,
        this.range[0] + anchorOffset,
      ].sort((a, b) => a - b),
    };
  }

  // Recursively iterate over all elements within this shard.
  // when encountering an element that is neither a Block nor a Text,
  // we note it.
  // Additionally, we need to insert the two elements that our cursor
  // is located in this list, in the right position, so that we can
  // later grab the string from the previous element to the cursor.
  _getNestedContentElements(parent, list, cursorElements, insideBlocks) {
    for (const child of parent.childNodes) {
      if (cursorElements.includes(child) || (insideBlocks && !child.isNodeView))
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
      if (!child.node.isText) return;
      if (child.shard !== this) return;
      const [start, end] = child.getRange();
      if (start <= range[0] && end >= range[1]) {
        if (
          !candidate ||
          ((child.node.parent.named || !candidate.node.parent.named) &&
            candidate.getRange()[1] - candidate.getRange()[0] >= end - start)
        )
          candidate = child;
      }
    });
    return candidate;
  }

  _cursorToRange(start, end) {
    const range = document.createRange();
    let startNode = this.root.findTextForCursor(start);
    let endNode = this.root.findTextForCursor(end);
    if (!startNode || !endNode) {
      return null;
    }
    range.setStart(...startNode.rangeParams(start));
    range.setEnd(...endNode.rangeParams(end));
    return range;
  }

  ////////////////////////////////////
  // Selection API
  ////////////////////////////////////
  sbPositionForRange(sourceRange) {
    const selectionRange = this._cursorToRange(...sourceRange);
    if (!selectionRange) return null;

    const candidate = this.findSelectedForRange(sourceRange);
    return {
      sourceRange,
      rect: candidate.getBoundingClientRect(),
      selectionRange,
    };
  }
  sbCursorEntryPositions() {
    const cursorPoints = [];
    const nestedElements = this._getNestedContentElements(this, [], [], true);
    let start = null;
    for (const end of [...nestedElements, null]) {
      const range = document.createRange();

      if (start) range.setStartAfter(start);
      else {
        start = firstDeepChild(this);
        range.setStartBefore(start);
      }

      if (end) range.setEndBefore(end);
      else range.setEndAfter(lastDeepChild(this));

      for (const atStart of [true, false])
        cursorPoints.push({
          rect: withDo(
            range.getClientRects(),
            (r) => new DOMRect(r[0][atStart ? "left" : "right"], r[0].top, 0, 0)
          ),
          selectionRange: withDo(
            range.cloneRange(),
            (r) => (r.collapse(atStart), r)
          ),
        });
      start = end;
    }
    return cursorPoints;
  }
  sbSelectPosition({ selectionRange: r }) {
    this.editor.changeSelection((selection) => selection.addRange(r));
    const { view, selectionRange } = this._rangeForSelection(r);
    return { view, sourceRange: selectionRange };
  }
  sbIsMoveAtBoundary(delta) {
    return !this.findSelectedForRange(
      withDo(this.editor.selection.range[0] + delta, (p) => [p, p])
    );
  }
}
