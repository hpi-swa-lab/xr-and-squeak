export function ensureReplacement(node, tag) {
  node.viewsDo((view) => {
    if (view.tagName === tag) {
      view.update(node);
    } else {
      const replacement = document.createElement(tag);
      replacement.init(node);
      replacement.update(node);
      view.replaceWith(replacement);
    }
  });
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

  registerQuery(trigger, query) {
    if (!this.queries.has(trigger)) this.queries.set(trigger, []);
    this.queries.get(trigger).push(query);
    return this;
  }

  processTrigger(node, ...triggers) {
    for (const trigger of triggers) {
      if (this.queries.has(trigger)) {
        nodeAllDo(node, (node) => {
          for (const query of queries.get(trigger)) {
            runQuery(query, node);
          }
        });
      }
    }
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
    this.getAttribute("extensions")
      .split(" ")
      .filter((name) => name.length > 0)
      .forEach((name) => {
        this.extensions.push(Extension.get(name));
      });
  }

  processTrigger(node, ...triggers) {
    for (const extension of this.extensions) {
      extension.processTrigger(node, ...triggers);
    }
  }
}

customElements.define("sb-extension-scope", ExtensionScope);

export class Replacement extends HTMLElement {
  shards = [];

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
}
