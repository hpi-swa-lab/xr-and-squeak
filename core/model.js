import { WeakArray, exec } from "../utils.js";
import { TrueDiff } from "./diff.js";
import md5 from "../external/md5.min.js";

export class SBLanguage {
  constructor({ name, extensions, defaultExtensions }) {
    this.name = name;
    this.extensions = extensions;
    this.defaultExtensions = defaultExtensions;
  }

  async ready() {}
  separatorContextFor(node) {
    return null;
  }
  compatibleType(type, other) {
    return type === other;
  }
  parse(text, oldRoot = null) {}

  destroyRoot(root) {}

  async initModelAndView(text) {
    await this.ready();
    return this.updateModelAndView(text);
  }

  updateModelAndView(text, oldRoot = null) {
    if (text.slice(-1) !== "\n") text += "\n";

    let newRoot = this.parse(text, oldRoot);
    if (oldRoot) {
      newRoot = new TrueDiff().applyEdits(oldRoot, newRoot);
    }
    newRoot._language = this;
    newRoot._sourceString = text;
    return newRoot;
  }
}

class SBNode {
  static _id = 0;
  static next() {
    return this._id++;
  }

  _parent = null;

  constructor() {
    this._id = this.constructor.next().toString();
  }

  exec(...script) {
    return exec(this, ...script);
  }

  get language() {
    return this.isRoot ? this._language : this.root.language;
  }

  get id() {
    return this._id;
  }

  get children() {
    return [];
  }
  get parent() {
    return this._parent;
  }
  get range() {
    return this._range;
  }

  get root() {
    return this.parent ? this.parent.root : this;
  }

  get isRoot() {
    return !this.parent;
  }

  get sourceString() {
    return this.root._sourceString.slice(...this.range);
  }

  updateModelAndView(text) {
    this.language.updateModelAndView(text, this);
  }

  destroy() {
    this._language.destroyRoot(this);
  }

  createShard() {
    return this.editor.createShardFor(this);
  }

  viewsDo(cb) {
    if (this.views) this.views.forEach(cb);
  }

  get editor() {
    let editor = null;
    this.root.viewsDo(
      (view) => !editor && view.isConnected && (editor = view.editor)
    );
    return editor;
  }

  get field() {
    return this._field;
  }

  atField(field) {
    return this.children.find((child) => child.field === field);
  }

  print(level = 0, namedOnly = false) {
    let out = "";
    for (let i = 0; i < level; i++) out += "  ";
    out += this.type ?? `"${this.text.replace(/\n/g, "\\n")}"`;
    out += ` (${this.range[0]}, ${this.range[1]})`;
    out += "\n";
    for (const child of this.children) {
      if (!namedOnly || child.named) out += child.print(level + 1, namedOnly);
    }
    return out;
  }

  shiftRange(offset) {
    this._range = [this.range[0] + offset, this.range[1] + offset];
  }

  replaceNode(node) {
    const parent = this.parent;
    const index = parent.children.indexOf(this);
    parent.removeChild(this);
    parent.insertChild(node, index);
  }

  childNode(index) {
    for (let i = 0; i < this.children.length; i++) {
      if (!this.children[i].isWhitespace()) {
        if (index === 0) return this.children[i];
        index--;
      }
    }
    return null;
  }

  get childNodes() {
    return this.children.filter((child) => !child.isWhitespace());
  }

  childBlock(index) {
    for (let i = 0; i < this.children.length; i++) {
      if (!!this.children[i].named) {
        if (index === 0) return this.children[i];
        index--;
      }
    }
    return null;
  }

  get childBlocks() {
    return this.children.filter((child) => !!child.named);
  }

  get nextSiblingBlock() {
    if (this.isRoot) return null;
    let pickNext = false;
    for (const sibling of this.parent.children) {
      if (pickNext && sibling.named) return sibling;
      if (sibling === this) pickNext = true;
    }
    return null;
  }

  get nextSiblingNode() {
    if (this.isRoot) return null;
    let pickNext = false;
    for (const sibling of this.parent.children) {
      if (pickNext && !sibling.isWhitespace()) return sibling;
      if (sibling === this) pickNext = true;
    }
    return null;
  }

  get previousSiblingNode() {
    if (this.isRoot) return null;
    let last = null;
    for (const sibling of this.parent.children) {
      if (sibling === this) return last;
      if (!sibling.isWhitespace()) last = sibling;
    }
    return null;
  }

  get siblingIndex() {
    return this.parent.children.indexOf(this);
  }

  get previousSiblingChild() {
    return this.parent.children[this.siblingIndex - 1];
  }

  get nextSiblingChild() {
    return this.parent.children[this.siblingIndex + 1];
  }

  get childBlocks() {
    return this.children.filter((child) => !!child.named);
  }

  compatibleWith(type) {
    return this.language.compatibleType(this.type, type);
  }

  insert(string, type, index) {
    const list = this.childBlocks.filter((child) => child.compatibleWith(type));
    // TODO handle empty list by finding any slot that takes the type

    const ref = list[Math.min(index, list.length - 1)];
    const sep = this.language.separatorContextFor(ref);
    if (index < list.length)
      this.editor.insertTextFromCommand(ref.range[0], string + sep);
    else this.editor.insertTextFromCommand(ref.range[1], sep + string);
  }

  insertBefore(string, type) {
    this.parent.insert(string, type, this.parent.childBlocks.indexOf(this));
  }

  insertAfter(string, type) {
    this.parent.insert(string, type, this.parent.childBlocks.indexOf(this) + 1);
  }

  // The nodes that should be deleted, when a delete action is invoked
  // on this node. the concept and wording originates from cursorless'
  // `removalRange`.
  get removalNodes() {
    if (!this.parent) return [this];

    let ret = [this];

    const pending = this.parent.childNodes;
    if (
      this.isText ||
      this.type === "ERROR" ||
      this.parent.type === "ERROR" ||
      pending.some((node) => node.type === "ERROR")
    ) {
      return [this];
    }

    const separator = this.language.separatorContextFor(this);
    if (separator && this.nextSiblingNode?.text === separator) {
      ret.push(this.nextSiblingNode);
      if (this.nextSiblingNode.nextSiblingChild.isWhitespace()) {
        ret.push(this.nextSiblingNode.nextSiblingChild);
      }
    } else if (separator && this.previousSiblingNode?.text === separator) {
      ret.push(this.previousSiblingNode);
      if (this.previousSiblingNode.previousSiblingChild.isWhitespace()) {
        ret.push(this.previousSiblingNode.previousSiblingChild);
      }
      if (this.previousSiblingChild.isWhitespace()) {
        ret.push(this.previousSiblingChild);
      }
    }
    return ret;
  }

  isWhitespace() {
    return false;
  }

  orAnyParent(predicate) {
    let current = this;
    while (current) {
      if (predicate(current)) return current;
      current = current.parent;
    }
    return null;
  }

  nodeAndParentsDo(cb) {
    cb(this);
    if (this.parent) this.parent.nodeAndParentsDo(cb);
  }

  allNodesDo(cb) {
    cb(this);
    for (const child of this.children) {
      child.allNodesDo(cb);
    }
  }

  allChildrenDo(cb) {
    for (const child of this.children) {
      child.allNodesDo(cb);
    }
  }

  allLeafsDo(cb) {
    if (this.isText) cb(this);
    else for (const child of this.children) child.allLeafsDo(cb);
  }

  allLeafs() {
    const leafs = [];
    this.allLeafsDo((leaf) => leafs.push(leaf));
    return leafs;
  }

  get isText() {
    return false;
  }

  get treeHeight() {
    if (this._treeHeight) return this._treeHeight;

    let height = 0;
    for (const child of this.children) {
      height = Math.max(height, child.treeHeight);
    }
    return height + 1;
  }

  // edit operations
  replaceWith(str) {
    this.editor.replaceTextFromCommand(this.range, str);
  }

  wrapWith(start, end) {
    this.editor.replaceTextFromCommand(
      this.range,
      `${start}${this.sourceString}${end}`
    );
  }

  select(adjacentView) {
    adjacentView.editor.findNode(this).select();
  }

  get isSelected() {
    return this.editor.selected?.node === this;
  }
}

const structureHashText = md5("text");

export class SBText extends SBNode {
  constructor(text, start, end) {
    super();
    this._text = text;
    this._range = [start, end];
  }

  shallowClone() {
    return new SBText(this.text, this.range[0], this.range[1], this.named);
  }

  get structureHash() {
    // hard-coded, arbitrary constant value
    return structureHashText;
  }

  get literalHash() {
    return (this._literalHash ??= md5(this.text));
  }

  get text() {
    return this._text;
  }

  get treeHeight() {
    return 1;
  }

  get isText() {
    return true;
  }

  isWhitespace() {
    return this.text.trim() === "";
  }

  toHTML() {
    const text = document.createElement("sb-text");
    text.setAttribute("text", this.text);
    text.node = this;
    (this.views ??= new WeakArray()).push(text);
    return text;
  }
}

export class SBBlock extends SBNode {
  _children = [];

  constructor(type, field, start, end, named) {
    super();
    this._type = type;
    this._field = field;
    this._range = [start, end];
    this._named = named;
  }

  get children() {
    return this._children;
  }

  get type() {
    return this._type;
  }

  get named() {
    return this._named;
  }

  shallowClone() {
    return new SBBlock(
      this.type,
      this.field,
      this.range[0],
      this.range[1],
      this.named
    );
  }

  addChild(child) {
    this._children.push(child);
    child._parent = this;
  }
  removeChild(child) {
    this._children.splice(this._children.indexOf(child), 1);
    child._parent = null;
  }
  insertChild(child, index) {
    this._children.splice(index, 0, child);
    child._parent = this;
  }

  get text() {
    return this.children.length === 1 && this.children[0].isText
      ? this.children[0].text
      : "";
  }

  get structureHash() {
    return (this._structureHash ??= md5(
      this.type + this.children.map((c) => c.structureHash).join("")
    ));
  }
  get literalHash() {
    return (this._literalHash ??= md5(
      this.children.map((c) => c.literalHash).join("")
    ));
  }

  toHTML() {
    const block = document.createElement("sb-block");
    for (const child of this.children) {
      block.appendChild(child.toHTML());
    }
    block.node = this;
    (this.views ??= new WeakArray()).push(block);
    return block;
  }
}
