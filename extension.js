import { Shard } from "./view.js";
import { nextHash } from "./utils.js";

export class Replacement extends HTMLElement {
  shards = [];

  constructor() {
    super();
    this.hash = nextHash();
  }

  update(source) {
    for (const [locator, shard] of this.shards) {
      const node = locator(source);
      if (node !== shard.source) {
        shard.update(node);
      }
    }
  }

  init(source) {}

  createShard(locator) {
    const shard = document.createElement("sb-shard");
    this.shards.push([locator, shard]);
    return shard;
  }

  get sourceString() {
    return this.source.root._sourceText.slice(
      this.source.range[0],
      this.source.range[1]
    );
  }
}

function runQuery(query, arg) {
  let current = arg;
  for (const predicate of query) {
    if (Array.isArray(predicate)) {
      current = runQuery(predicate, current);
      if (!current) return null;
    } else {
      let next = predicate(current);
      if (!next) return null;
      if (Array.isArray(next) && next.length < 1) return null;
      if (next !== true) current = next;
    }
  }
}

export class Extension {
  static extensionRegistry = new Map();

  static register(name, extension) {
    this.extensionRegistry.set(name, extension);
  }

  static get(name) {
    const extension = this.extensionRegistry.get(name);
    if (!extension) throw new Error(`No extension registered for ${name}`);
    return extension;
  }

  constructor() {
    this.queries = new Map();
  }

  attachedData = new Map();

  registerQuery(trigger, query) {
    if (!this.queries.has(trigger)) this.queries.set(trigger, []);
    this.queries.get(trigger).push(query);
    return this;
  }

  processTriggers(node, ...triggers) {
    for (const trigger of triggers) {
      if (this.queries.has(trigger)) {
        this.processTrigger(node, trigger);
      }
    }
  }

  processTrigger(node, trigger) {
    this.newAttachedData = new Map();

    node.allNodesDo((node) => {
      for (const query of this.queries.get(trigger)) {
        runQuery(query(this), node);
      }
    });

    for (const key of this.attachedData.keys()) {
      if (!this.newAttachedData.has(key)) {
        this.attachedData.get(key)();
      }
    }

    this.attachedData = this.newAttachedData;
  }

  applySyntaxHighlighting(node, ...cls) {
    node.viewsDo((view) => {
      console.assert(view.hash, "view has no hash");
      const hash = `${view.hash}:syntax:${cls.join(":")}`;
      if (!this.attachedData.has(hash)) {
        for (const c of cls) view.classList.add(c);
        this.newAttachedData.set(hash, () => view.classList.remove(cls));
      } else {
        this.newAttachedData.set(hash, this.attachedData.get(hash));
      }
    });
  }

  ensureReplacement(node, tag) {
    node.viewsDo((view) => {
      if (view.tagName === tag) {
        view.shard.ignoreMutation(() => view.update(node));
      } else {
        // FIXME not intended, should work without
        if (!view.shard) return;

        const replacement = document.createElement(tag);
        replacement.source = node;
        replacement.init(node);
        replacement.update(node);
        Shard.ignoreMutation(() => view.replaceWith(replacement));
        node.allNodesDo((node) => node.views.remove(view));
        node.views.push(replacement);
      }
    });
  }
}

export class ExtensionScope extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<slot></slot>`;
  }

  connectedCallback() {
    this.extensions = [];
    queueMicrotask(() =>
      this.getAttribute("extensions")
        ?.split(" ")
        ?.filter((name) => name.length > 0)
        ?.forEach((name) => {
          this.extensions.push(Extension.get(name));
        })
    );
  }

  processTriggers(node, ...triggers) {
    for (const extension of this.extensions) {
      extension.processTriggers(node, ...triggers);
    }
  }
}

customElements.define("sb-extension-scope", ExtensionScope);
