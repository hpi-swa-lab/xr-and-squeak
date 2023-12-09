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
    for (let i = 0; i < this._array.length; i++) {
      const item = this._array[i].deref();
      if (item) {
        callback(item);
      } else {
        anyRemoved = true;
      }
    }
    if (anyRemoved) this._array = this._array.filter((item) => item.deref());
  }
}

export class ToggleableMutationObserver {
  constructor(target, callback) {
    this.target = target;
    this.callback = callback;
    this.observer = new MutationObserver(this.callback);
    this.enabled = false;
    this.connect();
  }

  takeRecords() {
    return this.observer.takeRecords();
  }

  connect() {
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

export function findChange(prev, current) {
  if (prev.length > current.length) {
    return { op: "delete", ...findInsertedString(current, prev) };
  } else {
    return { op: "insert", ...findInsertedString(prev, current) };
  }
}

// assume the only change from prev to current is that a string was inserted into current.
// find that string.
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

export function getSelection(root) {
  return root.getSelection ? root.getSelection() : document.getSelection();
}

export function parentWithTag(node, tag) {
  while (
    node &&
    (Array.isArray(tag) ? !tag.includes(node.tagName) : node.tagName !== tag)
  ) {
    node = node.parentNode;
  }
  return node;
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

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}