import { TrueDiff } from "./diff.js";
import { config } from "./config.js";
import { SBBlock, SBText } from "./model.js";

class NoMatch {}

export function compatibleType(myType, grammarType, language) {
  if (myType === grammarType) return true;
  const rule = language.grammar.rules[grammarType];
  console.assert(rule);
  return matchesType(rule, myType, language);
}

function matchesType(rule, myType, language) {
  switch (rule.type) {
    case "SYMBOL":
      return (
        rule.name === myType ||
        matchesType(language.grammar.rules[rule.name], myType, language)
      );
    case "CHOICE":
      return rule.members.some((member) =>
        matchesType(member, myType, language)
      );
    case "PREC_DYNAMIC":
    case "PREC_LEFT":
    case "PREC_RIGHT":
    case "PREC":
    case "FIELD":
      return matchesType(rule.content, myType, language);
    case "ALIAS":
      return (
        rule.value === myType || matchesType(rule.content, myType, language)
      );
    case "BLANK":
      return !myType;
    default:
      return false;
  }
}

// FIXME cb should only be called once we know that we have a full match
export function matchRule(rule, pending, language, cb) {
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
      if (compatibleType(pending[0]?.type, rule.name, language)) {
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
        // FIXME assumes that is can commit early to a choice,
        // instead we should be exploring all possible results
        try {
          const copy = [...pending];
          matchRule(member, copy, language, cb);
          // shrink to same size and continue
          while (pending.length > copy.length) pending.shift();
          break;
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
      if (rule.regex.test(pending[0]?.text ?? "")) {
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

export class GrammarNode extends Object {
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

  repeaterFor(cb) {
    return (this.type === "REPEAT" || this.type === "REPEAT1") && cb(this)
      ? this
      : this.parent?.repeaterFor(cb);
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
    return this.repeatSeparator ? this : this.parent?.separatorContext;
  }

  postProcess(grammar) {
    this.detectSeparator();

    for (const child of this.children) {
      child.postProcess(grammar);
    }
  }

  firstChildThat(cb) {
    for (const child of this.children) {
      if (cb(child)) return child;
      else {
        const result = child.firstChildThat(cb);
        if (result) return result;
      }
    }
    return null;
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

    let newRoot = this.nodeFromCursor(newTree.walk(), text);
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
    const language = config.languages.find(
      (l) => l.languageName === languageName
    );
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

  static addTextFromCursor(cursor, node, isLeaf, text) {
    const gap = text.slice(this.lastLeafIndex, cursor.startIndex);
    if (gap) {
      node.addChild(new SBText(gap, this.lastLeafIndex, cursor.startIndex));
      this.lastLeafIndex = cursor.startIndex;
    }

    if (isLeaf && cursor.nodeText.length > 0) {
      node.addChild(
        new SBText(cursor.nodeText, cursor.startIndex, cursor.endIndex)
      );
      this.lastLeafIndex = cursor.endIndex;
    }
  }

  static lastLeafIndex;
  static nodeFromCursor(cursor, text) {
    this.lastLeafIndex = 0;
    let node = this._nodeFromCursor(cursor, text);
    return node;
  }

  static _nodeFromCursor(cursor, text) {
    const node = new SBBlock(
      cursor.nodeType,
      cursor.currentFieldName(),
      cursor.startIndex,
      cursor.endIndex,
      cursor.nodeIsNamed
    );

    if (cursor.gotoFirstChild()) {
      do {
        this.addTextFromCursor(cursor, node, false, text);
        node.addChild(this._nodeFromCursor(cursor, text));
      } while (cursor.gotoNextSibling());
      this.addTextFromCursor(cursor, node, false, text);
      cursor.gotoParent();
    } else {
      this.addTextFromCursor(cursor, node, true, text);
    }

    // see if there is some trailing whitespace we are supposed to include
    if (this.lastLeafIndex < node.range[1]) {
      node.addChild(
        new SBText(
          text.slice(this.lastLeafIndex, node.range[1]),
          this.lastLeafIndex,
          node.range[1]
        )
      );
      this.lastLeafIndex = node.range[1];
    }

    return node;
  }
}
