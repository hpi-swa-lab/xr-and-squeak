import { config } from "./config.js";
import { GrammarNode } from "./tree-sitter.js";

export class Language {
  static _initPromise = null;
  static async initTS() {
    await (this._initPromise ??= this._initTS());
  }
  static async _initTS() {
    await TreeSitter.init();
  }

  _readyPromise = null;
  tsLanguage = null;

  constructor({
    repo,
    branch,
    path,
    extensions,
    languageName,
    defaultExtensions,
  }) {
    this.repo = repo;
    this.branch = branch ?? "master";
    this.path = path ?? "/";
    this.extensions = extensions;
    this.defaultExtensions = defaultExtensions;
    this.languageName =
      languageName ?? this.repo.match(/.+\/tree-sitter-(.+)/)[1];
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
