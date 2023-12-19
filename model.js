import { TrueDiff } from "./diff.js";
import { WeakArray, exec } from "./utils.js";

class Language {
  static _initPromise = null;
  static async initTS() {
    await (this._initPromise ??= this._initTS());
  }
  static async _initTS() {
    await TreeSitter.init();
  }

  _readyPromise = null;
  tsLanguage = null;

  constructor(repo, branch = "master", path = "/") {
    this.repo = repo;
    this.branch = branch;
    this.path = path;
    this.languageName = this.repo.match(/.+\/tree-sitter-(.+)/)[1];
  }

  async ready() {
    await (this._readyPromise ??= this._load());
  }

  async _load() {
    await this.constructor.initTS();

    this.tsLanguage = await TreeSitter.Language.load(
      config.baseURL + `external/tree-sitter-${this.languageName}.wasm`
    );

    this.grammar = await (
      await fetch(
        `https://raw.githubusercontent.com/${this.repo}/${this.branch}${this.path}src/grammar.json`
      )
    ).json();
  }
}

export let config = {
  baseURL: "",
  languages: {
    javascript: new Language(
      "tree-sitter/tree-sitter-javascript",
      "0c0b18de798a90cd22819cec4802a27b914e395c"
    ),
    smalltalk: new Language(
      "tom95/tree-sitter-smalltalk",
      "fd6a5a256f831f0882b435d976c9baab04fb9e2b"
    ),
    tlaplus: new Language(
      "tlaplus-community/tree-sitter-tlaplus",
      "c5fae9e4ad9f483fb6232a8688a2c940be6b496b"
    ),
  },
};

export function setConfig(options) {
  Object.assign(config, options);
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
    return this.editor.sourceString.slice(...this.range);
  }

  createShard() {
    const shard = document.createElement("sb-shard");
    shard.update(this);
    return shard;
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

  get previousSiblingChild() {
    return this.parent.children[this.parent.children.indexOf(this) - 1];
  }

  get nextSiblingChild() {
    return this.parent.children[this.parent.children.indexOf(this) + 1];
  }

  get childBlocks() {
    return this.children.filter((child) => !!child.named);
  }

  // The nodes that should be deleted, when a delete action is invoked
  // on this node. the concept and wording originates from cursorless'
  // `removalRange`.
  get removalNodes() {
    return [this];
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

  exec(...script) {
    return exec(this, ...script);
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
}

const structureHashText = md5("text");
class SBText extends SBNode {
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

class SBBlock extends SBNode {
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

export class SBParser {
  static _init = false;
  static loadedLanguages = new Map();

  static updateModelAndView(text, oldRoot = null, language = null) {
    if (text.slice(-1) !== "\n") text += "\n";

    const parser = new TreeSitter();
    language ??= oldRoot.language;
    parser.setLanguage(language.tsLanguage);

    // TODO reuse currentTree (breaks indices, need to update or use new nodes)
    const newTree = parser.parse(text);
    if (oldRoot?._tree) oldRoot._tree.delete();

    let newRoot = nodeFromCursor(newTree.walk(), text);
    if (oldRoot) {
      newRoot = new TrueDiff().applyEdits(oldRoot, newRoot);
      if (oldRoot !== newRoot) {
        delete oldRoot._tree;
        delete oldRoot.language;
      }
    }

    newRoot._tree = newTree;
    newRoot.language = language;
    console.assert(newRoot.range[1] === text.length, "root range is wrong");

    return newRoot;
  }

  static async initModelAndView(text, languageName) {
    const language = config.languages[languageName];
    if (!language) throw new Error("No registered language " + languageName);

    await language.ready();

    return this.updateModelAndView(text, null, language);
  }

  static destroyModel(root) {
    root._tree.delete();
    delete root._tree;
  }

  static async _loadLanguage(languageName) {
    if (!this._init) await TreeSitter.init();
    this._init = true;
    if (this.loadedLanguages.has(languageName)) {
      return await this.loadedLanguages.get(languageName);
    }
    const languagePromise = TreeSitter.Language.load(
      config.baseURL + `external/tree-sitter-${languageName}.wasm`
    );
    this.loadedLanguages.set(languageName, languagePromise);
    return await languagePromise;
  }

  static async parseText(text, languageName) {
    if (!this._init) await TreeSitter.init();
    this._init = true;

    if (!languageName) throw new Error("languageName is required");

    if (!this.loadedLanguages.has(languageName)) {
      this.loadedLanguages.set(
        languageName,
        await TreeSitter.Language.load(
          config.baseURL + `tree-sitter-${languageName}.wasm`
        )
      );
    }

    return this.updateModelAndView(
      text,
      this.loadedLanguages.get(languageName)
    );
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
    cursor.currentFieldName(),
    cursor.startIndex,
    cursor.endIndex,
    cursor.nodeIsNamed
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
