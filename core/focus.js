import {
  isNullRect,
  parentWithTag,
  rangeEqual,
  rectDistance,
} from "../utils.js";

// interface Position {
//   rect: DOMRect;
//   [userData]?: any;
// }
// sbPositionForRange([start, end]): Position | null
// sbCursorEntryPositions(): Position[]
// sbSelectPosition(Position): {view: View, sourceRange}
// sbIsMoveAtBoundary(delta): boolean
// ??? sbCurrentPosition(): Position | null

// Manages selection and caret position for an editor.
// Both positions within the text buffer (range) and outside
// (replacements / widgets) are supported. the selection is
// responsible for moving the cursor between those.
export class SBSelection extends EventTarget {
  range = [0, 0];
  view = null;
  rect = null;

  // encompasses exactly the full node
  get isExact() {
    return this.range && this.view && rangeEqual(this.range, this.view.range);
  }

  moveToRange(editor, targetRange, scrollIntoView = true) {
    const rect = this.rect ?? this.view.getBoundingClientRect();

    const [best, position] = [...editor.allEditableElements]
      .map((e) => [e, e.sbPositionForRange(targetRange)])
      .filter(([_, r]) => !!r)
      .reduce(([a, pA], [b, pB]) =>
        rectDistance(rect, pA.rect) < rectDistance(rect, pB.rect)
          ? [a, pA]
          : [b, pB]
      );

    this._moveToPosition(best, position, scrollIntoView);
  }

  moveToNext(editor, delta) {
    const candidates = editor.allEditableElements;
    const verticalRange = 50;
    const verticallyCloseElements = [];

    for (const candidate of candidates) {
      for (const position of candidate.sbCursorEntryPositions()) {
        const candidatePos =
          delta > 0 ? position.rect.left : position.rect.right;
        if (
          Math.abs(position.rect.top - this.rect.top) <= verticalRange &&
          (delta < 0
            ? candidatePos < this.rect.left
            : candidatePos > this.rect.left)
        ) {
          verticallyCloseElements.push([candidate, position]);
        }
      }
    }

    let bestPos = delta < 0 ? -Infinity : Infinity;
    let bestCandidate = null;
    let bestPosition = null;

    for (const [candidate, position] of verticallyCloseElements) {
      const candidatePos = delta > 0 ? position.rect.left : position.rect.right;
      if (delta < 0 ? candidatePos > bestPos : candidatePos < bestPos) {
        bestPos = candidatePos;
        bestCandidate = candidate;
        bestPosition = position;
      }
    }

    if (bestCandidate) this._moveToPosition(bestCandidate, bestPosition, true);
  }

  _moveToPosition(view, position, scrollIntoView = true) {
    const { selected, sourceRange } = view.sbSelectPosition(position);
    this.informChange(selected, sourceRange, position.rect);
    if (scrollIntoView)
      selected?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  informChange(view, range, rect) {
    this.range = range;
    if (!isNullRect(rect)) this.rect = rect;

    if (this.view !== view) {
      this.dispatchEvent(new CustomEvent("viewChange", { detail: view }));
      this.view = view;
    }
    this.dispatchEvent(new CustomEvent("caretChange"));
  }
}

// mark this element as editable and subscribe to key events to check
// whether a requested cursor move hit the element's boundary.
export function markAsEditableElement(element) {
  element.setAttribute("sb-editable", "true");
  element.addEventListener("keydown", handleKeyDown.bind(element));

  switch (element.tagName) {
    case "INPUT":
      element.sbCursorPoint = () => {};
      element.sbIsMoveAtBoundary = (delta) => {
        const position = element.selectionStart;
        return delta > 0 ? position === element.value.length : position === 0;
      };
      element.sbFocus = (_rect, atEnd) => {
        element.focus();
        element.setSelectionRange(
          atEnd ? element.value.length : 0,
          atEnd ? element.value.length : 0
        );
      };
      element.addEventListener("selectionchange", (e) => {
        const rect = element.getBoundingClientRect();
        parentWithTag(element, "SB-EDITOR").selection.informChange(
          element,
          null,
          new DOMRect(
            element.selectionStart === 0 ? rect.left : rect.right,
            rect.top,
            0,
            rect.height
          )
        );
      });
      break;
    case "SB-SHARD":
      // all implemented in the shard class
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

// TODO handle shift-selection and ctrl move
function handleMove(e, delta) {
  if (this.sbIsMoveAtBoundary(delta)) {
    const editor = parentWithTag(this, "SB-EDITOR");
    editor.selection.moveToNext(editor, delta);
    e.preventDefault();
  }
  e.stopPropagation();
}

function handleDelete(e) {
  const current = this.editor.selection.range[0];
  const isDelete = e.key === "Delete";
  if (this.sbIsMoveAtBoundary(current, isDelete ? 1 : -1)) {
    const pos = isDelete ? current : current - 1;
    this.editor.applyChanges([
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

function _debugShowAllRects(editor, point) {
  for (const candidate of editor.allEditableElements) {
    const rects = candidate.sbRects();
    for (const rect of rects) {
      _debugRect(rect, "red");
    }
  }
  _debugRect({ left: point[0], top: point[1], width: 10, height: 10 }, "green");
}
function _debugRect(rect, color) {
  const r = document.createElement("div");
  r.style.position = "absolute";
  r.style.left = rect.left + "px";
  r.style.top = rect.top + "px";
  r.style.width = rect.width + "px";
  r.style.height = rect.height + "px";
  r.style.border = `1px solid ${color}`;
  document.body.appendChild(r);
}
