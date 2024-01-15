import {
  orParentThat,
  parentWithTag,
  rangeDistance,
  rangeEqual,
  rangeShift,
  rectDistance,
} from "../utils.js";

// sbSelectRange([start, end]): View | null
// sbSelectAtBoundary(part?, atStart): {view: View, range}
// sbIsMoveAtBoundary(delta): boolean
// sbCandidateForRange(range): {view, rect} | null

function nodeIsEditablePart(node) {
  return (
    node instanceof Element &&
    (node.tagName === "SB-TEXT" ||
      // nodeIsEditable(node) ||
      !!node.getAttribute("role") === "presentation" ||
      !!node.getAttribute("sb-editable-part"))
  );
}

function nodeIsEditable(node) {
  return !!node.getAttribute("sb-editable");
}

function nodeEditableForPart(node) {
  return orParentThat(node, (p) => nodeIsEditable(p));
}

export function followingEditablePart(node, direction) {
  const currentEditable = nodeEditableForPart(node);
  do {
    node = direction > 0 ? nextNodePreOrder(node) : previousNodePreOrder(node);
    if (nodeIsEditablePart(node) && node !== currentEditable) return node;
  } while (node);
}

function nextNodePreOrder(node) {
  if (node.firstElementChild) return node.firstElementChild;
  if (node.nextElementSibling) return node.nextElementSibling;

  let current = node;
  while ((current = current.parentNode)) {
    if (current.nextElementSibling) return current.nextElementSibling;
  }
  return null;
}

function previousNodePreOrder(node) {
  if (node.previousElementSibling) {
    let current = node.previousElementSibling;
    while (current.lastElementChild) current = current.lastElementChild;
    return current;
  }
  return node.parentNode;
}

// Manages selection and caret position for an editor.
// Both positions within the text buffer (range) and outside
// (replacements / widgets) are supported. the selection is
// responsible for moving the cursor between those.
export class SBSelection extends EventTarget {
  range = [0, 0];
  view = null;
  lastRect = null;

  // encompasses exactly the full node
  get isExact() {
    return (
      this.range && this.view?.range && rangeEqual(this.range, this.view.range)
    );
  }

  moveToRange(editor, targetRange, scrollIntoView = true) {
    let node = this.viewForMove(editor, targetRange);
    do {
      let view = nodeEditableForPart(node).sbSelectRange(targetRange);
      if (view) {
        this._moveTo(view, targetRange, scrollIntoView);
        return;
      }

      // TODO direction?
      node = followingEditablePart(node, 1);
    } while (node);
  }

  viewForMove(editor, newRange = null) {
    newRange ??= this.range;
      
      const cm = this.view.livelyCM.editor
    const cursor = cm.getCursor("from")
    const el = CodeMirror.posToDOM(cm, cursor)
    // lively.showElement(el.node.parentNode)
      const view = el.node.parentNode
      console.log(view)
      return view;

    if (this.view && this.view.isConnected) return this.view;
    console.assert(newRange);

    for (const editable of getAllEditableElements(editor)) {
      if (editable.sbSelectRange(newRange)) return editable;
    }

    if (this.lastRect) {
      let best = null;
      let bestPixelDist = Infinity;
      let bestIndexDist = Infinity;
      for (const editable of getAllEditableElements(editor)) {
        const info = editable.sbCandidateForRange(newRange);
        if (info) {
          const pixelDist = rectDistance(info.rect, this.lastRect);
          const indexDist = rangeDistance(info.range, newRange);
          if (
            indexDist < bestIndexDist ||
            (indexDist === bestIndexDist && pixelDist < bestPixelDist)
          ) {
            best = info.view;
            bestPixelDist = pixelDist;
            bestIndexDist = indexDist;
          }
        }
      }
      if (best) return best;
    }

    console.assert(false, "no view found for range, return any?", newRange);
  }

  moveToNext(editor, delta) {
    let node = followingEditablePart(
      this.viewForMove(
        editor,
        this.range ? rangeShift(this.range, delta) : null
      ),
      delta
    );
    if (!node) return;

    let info = nodeEditableForPart(node).sbSelectAtBoundary(node, delta > 0);
    this._moveTo(info.view, info.range, true);
  }

  _moveTo(view, range, scrollIntoView = true) {
    console.assert(view);
    this.informChange(view, range);
    if (scrollIntoView)
      view.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  deselect() {
    // this.informChange(null, null);
  }

  informChange(view, range) {
    if (!view) debugger;
    this.range = range;

    if (this.view !== view) {
      this.lastRect = this.view?.getBoundingClientRect();

      this.dispatchEvent(new CustomEvent("viewChange", { detail: view }));
      this.view = view;
    }
    this.dispatchEvent(new CustomEvent("caretChange"));
  }
}

// mark this element as editable and subscribe to key events to check
// whether a requested cursor move hit the element's boundary.
// For preact, use with `h("input", { ref: markAsEditableElement })`.
export function markAsEditableElement(element) {
  if (element.getAttribute("sb-editable")) return;

  element.setAttribute("sb-editable", "true");
  
  switch (element.tagName) {
    case "INPUT":
      element.addEventListener("keydown", handleKeyDown.bind(element));
      _markInput(element);
      break;
    case "SB-SHARD":
      // all implemented in the shard class
      element.addEventListener("keydown", handleKeyDown.bind(element));
      break;
    default:
      break;
  }
}

function handleKeyDown(e) {
  switch (e.key) {
    case "ArrowLeft":
      handleMove.call(this, e, -1);
      break;
    case "ArrowRight":
      handleMove.call(this, e, 1);
      break;
    case "Delete":
    case "Backspace":
      handleDelete.call(this, e);
      break;
  }
}

function getEditor(el) {
  return orParentThat(el, e => e.sbIsEditor)
}

function getAllEditableElements(el) {
  return getEditor(el).querySelectorAll("[sb-editable]")
}

// TODO handle shift-selection and ctrl move
function handleMove(e, delta) {
  if (this.sbIsMoveAtBoundary(delta)) {
    const editor = getEditor(this);
    editor.selection.moveToNext(editor, delta);
    e.preventDefault();
  }
  e.stopPropagation();
}

function handleDelete(e) {
  const isDelete = e.key === "Delete";
  if (this.sbIsMoveAtBoundary(isDelete ? 1 : -1)) {
    const editor = getEditor(this);
    const current = editor.selection.range[0];
    const pos = isDelete ? current : current - 1;
    if (pos < 0) return;
    editor.applyChanges([
      {
        from: current + (isDelete ? 0 : -1),
        to: current + (isDelete ? 1 : 0),
        text: "",
        selectionRange: [pos, pos],
      },
    ]);
    e.preventDefault();
  }
  e.stopPropagation();
}

function _markInput(element) {
  element.setAttribute("sb-editable-part", "true");
  element.sbSelectAtBoundary = (part, atStart) => {
    const position = atStart ? 0 : element.value.length;
    element.focus();
    element.selectionStart = position;
    element.selectionEnd = position;
    return { view: element };
  };
  element.sbSelectRange = () => null;
  element.sbIsMoveAtBoundary = (delta) => {
    const position = element.selectionStart;
    return delta > 0 ? position === element.value.length : position === 0;
  };
  element.addEventListener("focus", () =>
    getEditor(element).selection.informChange(element, null)
  );
}
