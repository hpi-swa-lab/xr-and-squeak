import { TrueDiff } from "./diff.js";
import { WeakArray } from "./utils.js";

class SBNode {
  static _id = 0;
  static next() {
    return this._id++;
  }

  _parent = null;

  constructor() {
    this._id = this.constructor.next().toString();
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

  createView() {
    const shard = document.createElement("sb-shard");
    shard.update(this);
    return shard;
  }

  viewsDo(cb) {
    if (this.views) this.views.forEach(cb);
  }

  field(field) {
    return this.children.find((child) => child.field === field);
  }

  print(level = 0) {
    let out = "";
    for (let i = 0; i < level; i++) out += "  ";
    out += this.type ?? `"${this.text}"`;
    out += "\n";
    for (const child of this.children) {
      out += child.print(level + 1);
    }
    return out;
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

  isWhitespace() {
    return false;
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
    SBParser.replaceText(this.root, this.range, str);
  }

  select(adjacentView) {
    adjacentView.editor.findNode(this).select();
  }
}

const structureHashText = md5("text");
class SBText extends SBNode {
  constructor(text, start, end) {
    super();
    this._text = text;
    this._range = [start, end];
  }

  shallowClone() {
    return new SBText(this.text, this.range[0], this.range[1]);
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

class SBBlock extends SBNode {
  _children = [];

  constructor(type, field, start, end) {
    super();
    this._type = type;
    this._field = field;
    this._range = [start, end];
  }

  get children() {
    return this._children;
  }

  get type() {
    return this._type;
  }

  shallowClone() {
    return new SBBlock(this.type, this.field, this.range[0], this.range[1]);
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

export class SBParser {
  static init = false;
  static loadedLanguages = new Map();

  static replaceText(root, range, text) {
    return this._parseText(
      root._sourceText.slice(0, range[0]) +
        text +
        root._sourceText.slice(range[1]),
      root._tree.language,
      root
    );
  }

  static setNewText(root, text) {
    return this._parseText(text, root._tree.language, root);
  }

  static _parseText(text, language, root = null) {
    // need a trailing newline for contenteditable, empty nodes cannot be edited
    if (text.slice(-1) !== "\n") text += "\n";

    const parser = new TreeSitter();
    parser.setLanguage(language);

    // TODO reuse currentTree (breaks indices, need to update or use new nodes)
    const newTree = parser.parse(text);
    if (root?._tree) root._tree.delete();
    let newRoot = nodeFromCursor(newTree.walk(), text);

    if (root) {
      newRoot = new TrueDiff().applyEdits(root, newRoot);
      if (root !== newRoot) {
        delete root._tree;
        delete root._sourceText;
      }
    }

    root = newRoot;
    root._tree = newTree;
    root._sourceText = text;
    console.assert(root.range[1] === text.length, "root range is wrong");

    root.viewsDo((view) => view.shard.processTriggers(["always"], root));

    return root;
  }

  static async parseText(text, languageName, baseURL = "") {
    if (!this.init) await TreeSitter.init();
    this.init = true;

    if (!languageName) throw new Error("languageName is required");

    if (!this.loadedLanguages.has(languageName)) {
      this.loadedLanguages.set(
        languageName,
        await TreeSitter.Language.load(
          baseURL + `tree-sitter-${languageName}.wasm`
        )
      );
    }

    return this._parseText(text, this.loadedLanguages.get(languageName));
  }
}

/* converting cursor to nodes */
function addTextFromCursor(cursor, node, isLeaf, text) {
  const gap = text.slice(lastLeafIndex, cursor.startIndex);
  if (gap) {
    node.addChild(new SBText(gap, lastLeafIndex, cursor.startIndex));
    lastLeafIndex = cursor.startIndex;
  }

  if (isLeaf && cursor.nodeText.length > 0) {
    node.addChild(
      new SBText(cursor.nodeText, cursor.startIndex, cursor.endIndex)
    );
    lastLeafIndex = cursor.endIndex;
  }
}

let lastLeafIndex;
function nodeFromCursor(cursor, text) {
  lastLeafIndex = 0;
  let node = _nodeFromCursor(cursor, text);
  if (lastLeafIndex < text.length)
    node.addChild(
      new SBText(text.slice(lastLeafIndex), lastLeafIndex, text.length)
    );
  return node;
}

function _nodeFromCursor(cursor, text) {
  const node = new SBBlock(
    cursor.nodeType,
    cursor.nodeField,
    cursor.startIndex,
    cursor.endIndex
  );

  if (cursor.gotoFirstChild()) {
    do {
      addTextFromCursor(cursor, node, false, text);
      node.addChild(_nodeFromCursor(cursor, text));
    } while (cursor.gotoNextSibling());
    addTextFromCursor(cursor, node, false, text);
    cursor.gotoParent();
  } else {
    addTextFromCursor(cursor, node, true, text);
  }

  return node;
}
