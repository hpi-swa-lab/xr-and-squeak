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
}

export function getSelection(root) {
  return root.getSelection ? root.getSelection() : document.getSelection();
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
