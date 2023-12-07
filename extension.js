class Extension {
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

customElements.define(
  "sb-extension-scope",
  class ExtensionScope extends HTMLElement {
    constructor() {
      super();
      this.extensions = [];
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<slot></slot>`;
    }

    registerExtension(extension) {
      this.extensions.push(extension);
    }
  }
);
