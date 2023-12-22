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

  constructor({ repo, branch, path, extensions }) {
    this.repo = repo;
    this.branch = branch ?? "master";
    this.path = path ?? "/";
    this.extensions = extensions;
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

    this.grammar = this._prepareGrammar(await this._loadGrammar());
  }

  async _loadGrammar() {
    const saved = localStorage.getItem(this.languageName + "-grammar");
    if (saved) {
      const info = JSON.parse(saved);
      if (
        info.repo === this.repo &&
        info.branch === this.branch &&
        info.path === this.path
      ) {
        return info.grammar;
      }
    }

    const grammar = await (
      await fetch(
        `https://raw.githubusercontent.com/${this.repo}/${this.branch}${this.path}src/grammar.json`
      )
    ).json();
    localStorage.setItem(
      this.languageName + "-grammar",
      JSON.stringify({
        repo: this.repo,
        branch: this.branch,
        path: this.path,
        grammar,
      })
    );
    return grammar;
  }

  _prepareGrammar(grammar) {
    for (const [name, rule] of Object.entries(grammar.rules)) {
      grammar.rules[name] = new GrammarNode(rule, null, name);
    }

    for (const external of grammar.externals) {
      grammar.rules[external.name] = new GrammarNode(
        { type: "BLANK" },
        null,
        external.name
      );
    }

    for (const rule of Object.values(grammar.rules)) {
      rule.postProcess(grammar);
    }

    return grammar;
  }
}

class GrammarNode extends Object {
  static buildRegex(node) {
    switch (node.type) {
      case "PREC":
      case "PREC_DYNAMIC":
      case "PREC_LEFT":
      case "PREC_RIGHT":
      case "FIELD":
        return this.buildRegex(node.content);
      case "SEQ":
        return node.children.map((c) => this.buildRegex(c)).join("");
      case "CHOICE":
        return `(${node.children.map((c) => this.buildRegex(c)).join("|")})`;
      case "TOKEN":
      case "IMMEDIATE_TOKEN":
        return this.buildRegex(node.content);
      case "REPEAT":
        return `(${this.buildRegex(node.content)})*`;
      case "REPEAT1":
        return `(${this.buildRegex(node.content)})+`;
      case "PATTERN":
        return `(${node.value})`;
      case "BLANK":
        return "";
      case "STRING":
        return node.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      default:
        throw new Error("unknown node type " + node.type);
    }
  }
  constructor(rule, parent, name = undefined) {
    super();
    this.parent = parent;
    if (name) this.name = name;
    if (rule.members)
      this.members = rule.members.map((r) => new GrammarNode(r, this));
    if (rule.content) this.content = new GrammarNode(rule.content, this);
    for (const key of Object.keys(rule)) {
      if (key === "members" || key === "content") continue;
      this[key] = rule[key];
    }
    if (this.type === "TOKEN" || this.type === "IMMEDIATE_TOKEN") {
      this.regex = new RegExp(this.constructor.buildRegex(this.content));
    }
    if (this.type === "PATTERN") {
      this.regex = new RegExp(this.value);
    }
  }

  get children() {
    return this.members ?? (this.content ? [this.content] : []);
  }

  get root() {
    while (this.parent) return this.parent.root;
    return this;
  }

  get structure() {
    return [this.type, ...this.children.map((c) => c.structure)];
  }

  get separatorContext() {
    if (this.repeatSeparator) return this;
    while (this.parent) return this.parent.separatorContext;
    return null;
  }

  postProcess(grammar) {
    this.detectSeparator();

    for (const child of this.children) {
      child.postProcess(grammar);
    }
  }

  matchesStructure(structure) {
    return matchesStructure(this.structure, structure);
  }

  deepEqual(other) {
    if (this.type !== other.type) return false;
    if (this.children.length !== other.children.length) return false;
    for (let i = 0; i < this.children.length; i++) {
      if (!this.children[i].deepEqual(other.children[i])) return false;
    }
    return true;
  }

  detectSeparator() {
    if (
      this.matchesStructure([
        "CHOICE",
        [
          "SEQ",
          ["SEQ", ["*"], ["REPEAT", ["SEQ", ["STRING"], ["*"]]]],
          ["CHOICE", ["STRING"], ["BLANK"]],
        ],
        ["BLANK"],
      ])
    ) {
      const sep1 = this.children[0].children[1].children[0].value;
      const sep2 =
        this.children[0].children[0].children[1].children[0].children[0].value;
      const sym1 = this.children[0].children[0].children[0];
      const sym2 =
        this.children[0].children[0].children[1].children[0].children[1];
      if (sep1 === sep2 && sym1.deepEqual(sym2)) {
        this.repeatSeparator = sep1;
        this.repeatSymbol = sym1;
        return;
      }
    }

    if (
      this.matchesStructure([
        "SEQ",
        ["*"],
        ["REPEAT", ["SEQ", ["STRING"], ["*"]]],
      ])
    ) {
      const sep = this.children[1].children[0].children[0].value;
      const sym1 = this.children[0];
      const sym2 = this.children[1].children[0].children[1];
      if (sym1.deepEqual(sym2)) {
        this.repeatSeparator = sep;
        this.repeatSymbol = sym1;
        return;
      }
    }

    if (
      this.matchesStructure([
        "CHOICE",
        ["SEQ", ["*"], ["REPEAT", ["SEQ", ["STRING"], ["*"]]]],
        ["BLANK"],
      ])
    ) {
      const sep = this.children[0].children[1].children[0].children[0].value;
      const sym1 = this.children[0].children[0];
      const sym2 = this.children[0].children[1].children[0].children[1];
      if (sym1.deepEqual(sym2)) {
        this.repeatSeparator = sep;
        this.repeatSymbol = sym1;
        return;
      }
    }
  }
}

function matchesStructure(a, b) {
  if (a[0] === "*" || b[0] === "*") return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Array.isArray(a[i]) && Array.isArray(b[i])) {
      if (!matchesStructure(a[i], b[i])) return false;
    } else if (a[i] !== b[i]) return false;
  }
  return true;
}

export let config = {
  baseURL: "",
  languages: {
    javascript: new Language({
      repo: "tree-sitter/tree-sitter-javascript",
      branch: "0c0b18de798a90cd22819cec4802a27b914e395c",
      extensions: ["js"],
    }),
    smalltalk: new Language({
      repo: "tom95/tree-sitter-smalltalk",
      branch: "fd6a5a256f831f0882b435d976c9baab04fb9e2b",
      extensions: ["st"],
    }),
    tlaplus: new Language({
      repo: "tlaplus-community/tree-sitter-tlaplus",
      branch: "c5fae9e4ad9f483fb6232a8688a2c940be6b496b",
      extensions: ["tla"],
    }),
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
    if (!this.parent) return [this];

    // TODO resolve aliases --> type would not be found
    const rule = this.language.grammar.rules[this.parent.type];

    const pending = this.parent.childNodes;
    if (
      this.isText ||
      this.type === "ERROR" ||
      this.parent.type === "ERROR" ||
      pending.some((node) => node.type === "ERROR")
    ) {
      return [this];
    }
    let ret = [this];
    matchRule(
      rule,
      pending,
      this.language,
      (node, rule) => {
        if (this === node) {
          const separator = rule.separatorContext;
          if (
            separator &&
            this.nextSiblingNode?.text === separator.repeatSeparator
          ) {
            ret.push(this.nextSiblingNode);
            if (this.nextSiblingNode.nextSiblingChild.isWhitespace()) {
              ret.push(this.nextSiblingNode.nextSiblingChild);
            }
          } else if (
            separator &&
            this.previousSiblingNode?.text === separator.repeatSeparator
          ) {
            ret.push(this.previousSiblingNode);
            if (this.previousSiblingNode.previousSiblingChild.isWhitespace()) {
              ret.push(this.previousSiblingNode.previousSiblingChild);
            }
            if (this.previousSiblingChild.isWhitespace()) {
              ret.push(this.previousSiblingChild);
            }
          }
        }
      },
      new Set()
    );
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

  get isSelected() {
    return this.editor.selected?.node === this;
  }
}

class NoMatch {}

function compatibleType(node, grammarType, language) {
  if (node?.type === grammarType) return true;
  const rule = language.grammar.rules[grammarType];
  console.assert(rule);
  return matchesType(rule, node, language);
}

function matchesType(rule, node, language) {
  switch (rule.type) {
    case "SYMBOL":
      return (
        rule.name === node?.type ||
        matchesType(language.grammar.rules[rule.name], node, language)
      );
    case "CHOICE":
      return rule.members.some((member) => matchesType(member, node, language));
    case "PREC_DYNAMIC":
    case "PREC_LEFT":
    case "PREC_RIGHT":
    case "PREC":
    case "FIELD":
      return matchesType(rule.content, node, language);
    case "ALIAS":
      return (
        rule.value === node?.type || matchesType(rule.content, node, language)
      );
    case "BLANK":
      return !node;
    default:
      return false;
  }
}

function matchRule(rule, pending, language, cb) {
  switch (rule.type) {
    case "SEQ":
      for (const member of rule.members) {
        matchRule(member, pending, language, cb);
      }
      break;
    case "STRING":
      if (rule.value === (pending[0]?.text ?? "")) {
        cb(pending.shift(), rule);
      } else {
        throw new NoMatch();
      }
      break;
    case "SYMBOL":
      if (compatibleType(pending[0], rule.name, language)) {
        cb(pending.shift(), rule);
      } else {
        throw new NoMatch();
      }
      break;
    case "ALIAS":
      if (pending[0]?.type === rule.value) {
        cb(pending.shift(), rule);
      } else {
        throw new NoMatch();
      }
      break;
    case "CHOICE":
      for (const member of rule.members) {
        try {
          matchRule(member, pending, language, cb);
        } catch (e) {
          if (!(e instanceof NoMatch)) throw e;
        }
      }
      break;
    case "REPEAT1":
      matchRule(rule.content, pending, language, cb);
    // fallthrough /!\
    case "REPEAT":
      for (let i = 0; ; i++) {
        try {
          let previousLength = pending.length;
          matchRule(rule.content, pending, language, cb);
          if (pending.length === previousLength) break;
          else previousLength = pending.length;
        } catch (e) {
          if (!(e instanceof NoMatch)) throw e;
          break;
        }
      }
      break;
    case "TOKEN":
    case "IMMEDIATE_TOKEN":
      if (rule.regex.test(pending[0].text ?? "")) {
        cb(pending.shift(), rule);
      } else {
        throw new NoMatch();
      }
      break;
    case "PREC_DYNAMIC":
    case "PREC_LEFT":
    case "PREC_RIGHT":
    case "PREC":
    case "FIELD":
      return matchRule(rule.content, pending, language, cb);
    case "BLANK":
      break;
    default:
      debugger;
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
    language ??= oldRoot._language;
    parser.setLanguage(language.tsLanguage);

    // TODO reuse currentTree (breaks indices, need to update or use new nodes)
    const newTree = parser.parse(text);
    if (oldRoot?._tree) oldRoot._tree.delete();

    let newRoot = nodeFromCursor(newTree.walk(), text);
    if (oldRoot) {
      newRoot = new TrueDiff().applyEdits(oldRoot, newRoot);
      if (oldRoot !== newRoot) {
        delete oldRoot._tree;
        delete oldRoot._language;
      }
    }

    newRoot._tree = newTree;
    newRoot._language = language;
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
