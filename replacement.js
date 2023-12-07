class Replacement extends HTMLElement {
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

customElements.define(
  "sb-watch",
  class Watch extends Replacement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<span>WATCH</span>`;
    }

    init(source) {
      super.init(source);
      this.shadowRoot.appendChild(
        this.createShard((source) => nodeChildNode(source, 0))
      );
    }
  }
);

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

function installReplacement(node, tag) {
  nodeViewsDo(node, (view) => {
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
