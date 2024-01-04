export class WeakArray {
  constructor() {
    this._array = [];
  }
  push(item) {
    this._array.push(new WeakRef(item));
  }
  get length() {
    return this._array.length;
  }
  remove(item) {
    this._array = this._array.filter((ref) => ref.deref() !== item);
  }
  forEach(callback) {
    let anyRemoved = false;
    // work on a copy to allow removing while iterating
    const copy = [...this._array];
    for (let i = 0; i < copy.length; i++) {
      const item = copy[i].deref();
      if (item) {
        callback(item);
      } else {
        anyRemoved = true;
      }
    }
    // work on the original
    if (anyRemoved) this._array = this._array.filter((item) => item.deref());
  }
  getAll() {
    const list = [];
    this.forEach((e) => list.push(e));
    return list;
  }
  includes(item) {
    return this._array.some((ref) => ref.deref() === item);
  }
}

export class ToggleableMutationObserver {
  static observers = new WeakArray();
  static nestedDisable = 0;
  static get enable() {
    return this.nestedDisable === 0;
  }
  static ignoreMutation(cb) {
    if (this.nestedDisable === 0) {
      this.observers.forEach((observer) => observer.disconnect());
    }
    this.nestedDisable++;
    try {
      cb();
    } finally {
      this.nestedDisable--;
      if (this.nestedDisable === 0) {
        this.observers.forEach((observer) => observer.connect());
      }
    }
  }

  constructor(target, callback) {
    this.target = target;
    this.callback = callback;
    this.observer = new MutationObserver(this.callback);
    this.enabled = false;
    this.destroyed = false;
    if (this.constructor.enable) this.connect();
    this.constructor.observers.push(this);
  }

  takeRecords() {
    return this.observer.takeRecords();
  }

  connect() {
    if (this.destroyed) throw new Error("Cannot connect destroyed observer");
    if (this.enabled) return;

    // flush any that precede us listening
    this.observer.takeRecords();

    this.enabled = true;
    this.observer.observe(this.target, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      characterDataOldValue: true,
    });
  }

  disconnect() {
    if (!this.enabled) return;
    this.enabled = false;
    this.observer.disconnect();
  }

  destroy() {
    this.disconnect();
    this.constructor.observers.remove(this);
    this.destroyed = true;
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
}

export function findChange(a, b, preferredPos, preferredSide) {
  const diff = findDiff(a, b, preferredPos, preferredSide);
  if (!diff) return null;

  const change =
    diff.from === diff.toB
      ? { delete: a.slice(diff.from, diff.toA), from: diff.from, to: diff.toA }
      : { insert: b.slice(diff.from, diff.toB), from: diff.from, to: diff.toA };
  return change;
}
// copied from codemirror: detect the change between to strings at the cursor position.
// `preferredSide` should be "end" if backspace was pressed
function findDiff(a, b, preferredPos, preferredSide) {
  let minLen = Math.min(a.length, b.length);
  let from = 0;
  while (from < minLen && a.charCodeAt(from) == b.charCodeAt(from)) from++;
  if (from == minLen && a.length == b.length) return null;
  let toA = a.length,
    toB = b.length;
  while (toA > 0 && toB > 0 && a.charCodeAt(toA - 1) == b.charCodeAt(toB - 1)) {
    toA--;
    toB--;
  }

  if (preferredSide === "end") {
    let adjust = Math.max(0, from - Math.min(toA, toB));
    preferredPos -= toA + adjust - from;
  }
  if (toA < from && a.length < b.length) {
    let move =
      preferredPos <= from && preferredPos >= toA ? from - preferredPos : 0;
    from -= move;
    toB = from + (toB - toA);
    toA = from;
  } else if (toB < from) {
    let move =
      preferredPos <= from && preferredPos >= toB ? from - preferredPos : 0;
    from -= move;
    toA = from + (toA - toB);
    toB = from;
  }
  return { from, toA, toB };
}

// assume the only change from prev to current is that a string was inserted
// into current. find that string.
function findInsertedString(prev, current) {
  if (prev.length >= current.length) throw new Error("prev must be shorter");

  let string = "";
  let start = 0;
  let i = 0;
  let j = 0;

  while (j < current.length) {
    if (prev[i] !== current[j]) {
      start = i;
      string += current[j];
      j++;
    } else {
      i++;
      j++;
    }
  }

  return { string, index: start };
}

// on firefox, we pierce to the inner-most shadow root.
// on chrome, we can call getSelection on the shadow root, so we repeat
// until there is no more shadowRoot to pierce.
export function getSelection() {
  let selection = document.getSelection();
  while (
    selection.type !== "None" &&
    selection.anchorNode.childNodes[selection.anchorOffset]?.shadowRoot &&
    selection.anchorNode.childNodes[selection.anchorOffset].shadowRoot
      .getSelection
  ) {
    selection =
      selection.anchorNode.childNodes[
        selection.anchorOffset
      ].shadowRoot.getSelection();
  }

  return selection;
}

export function orParentThat(node, predicate) {
  if (node instanceof Text) node = node.parentNode;

  while (node instanceof HTMLElement) {
    if (predicate(node)) return node;
    node = node.parentNode ?? node.getRootNode()?.host;
    if (node instanceof ShadowRoot) node = node.host;
  }
  return null;
}

export function parentWithTag(node, tag) {
  return orParentThat(node, (n) =>
    Array.isArray(tag) ? tag.includes(n.tagName) : n.tagName === tag
  );
}

export function parentsWithTagDo(node, tag, cb) {
  while (node) {
    if (Array.isArray(tag) ? tag.includes(node.tagName) : node.tagName === tag)
      cb(node);
    node = node.parentNode;
  }
}

export class SortedArray {
  constructor(compare) {
    this.array = [];
    this.compare = compare;
  }

  insert(value) {
    const index = this.array.findIndex((v) => this.compare(v, value) > 0);
    if (index === -1) {
      this.array.push(value);
    } else {
      this.array.splice(index, 0, value);
    }
  }
}

export function zipOrNullDo(a, b, cb) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    cb(a[i], b[i]);
  }
}

let _hash = 1;
export function nextHash() {
  return _hash++;
}

export function allViewsDo(parent, cb) {
  for (const child of parent.childNodes) {
    if (child.tagName === "SB-TEXT" || child.tagName === "SB-BLOCK") {
      cb(child);
      allViewsDo(child, cb);
    } else {
      allViewsDo(child, cb);
    }
  }
}

export function mapSeparated(list, item, separator) {
  const result = [];
  for (let i = 0; i < list.length; i++) {
    result.push(item(list[i]));
    if (i < list.length - 1) result.push(separator());
  }
  return result;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function exec(arg, ...script) {
  if (!arg) return null;

  let current = arg;
  for (const predicate of script) {
    let next = predicate(current);
    if (!next) return null;
    if (Array.isArray(next) && next.length < 1) return null;
    if (next !== true) current = next;
  }
  return current;
}

export function rangeEqual(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

export function rangeContains(a, b) {
  return a[0] <= b[0] && a[1] >= b[1];
}

export function matchesKey(e, key) {
  const modifiers = key.split("-");
  const baseKey = modifiers.pop();

  if (modifiers.includes("Ctrl") && !e.ctrlKey && !e.metaKey) return false;
  if (modifiers.includes("Alt") && !e.altKey) return false;
  if (modifiers.includes("Shift") && !e.shiftKey) return false;
  return e.key === baseKey;
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
