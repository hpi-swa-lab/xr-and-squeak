"use strict";

let queries;

registerQuery("always", [
  (x) => false,
  (x) => x.type === "unary_message",
  (x) => nodeText(nodeChildNode(x, 1)) === "sbWatch",
  (x) => installReplacement(x, "sb-watch"),
]);

customElements.define(
  "sb-shard",
  class Shard extends HTMLElement {
    source = null;
    update(node) {
      this.innerHTML = "";
      this.appendChild(nodeToHTML(node));
      this.source = node;
    }
  }
);

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

// get parent that is an sb-snippet, across shadow roots
function getShard(block) {
  let parent =
    block.getRootNode() === document ? block : block.getRootNode().host;
  while (parent && parent.tagName !== "SB-SHARD") {
    parent = parent.parentElement;
  }
  return parent;
}

function registerQuery(trigger, query) {
  if (!queries) queries = new Map();
  if (!queries.has(trigger)) queries.set(trigger, []);
  queries.get(trigger).push(query);
}

function getSelection(root) {
  // https://stackoverflow.com/questions/62054839/shadowroot-getselection
  return root.getSelection ? root.getSelection() : document.getSelection();
}

function getGlobalCursorPosition(root) {
  const selection = getSelection(root);
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      const parentElement = container.getRootNode().host;
      if (parentElement?.tagName === "SB-TEXT") {
        return parentElement.getRange()[0] + range.startOffset;
      }
    }
  }
  return null;
}

function nodeToHTML(node) {
  if (node.kind === "text") {
    const text = document.createElement("sb-text");
    text.setAttribute("text", node.text);
    text.node = node;
    (node.views ??= []).push(new WeakRef(text));
    return text;
  } else {
    const block = document.createElement("sb-block");
    for (const child of node.children) {
      block.appendChild(nodeToHTML(child));
    }
    block.node = node;
    (node.views ??= []).push(new WeakRef(block));
    return block;
  }
}

customElements.define(
  "sb-block",
  class Block extends HTMLElement {
    _node = null;
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: inline-block;
                padding: 2px 0;
                display: flex;
                border: 1px solid #ccc;
                align-items: center;
            }
        </style>
        <slot></slot>
        `;
    }
    set node(v) {
      this._node = v;
      this.setAttribute("type", v.type);
    }
    get node() {
      return this._node;
    }
    getRange() {
      return this.node.range;
    }
    findTextForCursor(cursor) {
      for (const child of this.children) {
        if (["SB-TEXT", "SB-BLOCK"].includes(child.tagName)) {
          const [start, end] = child.node.range;
          if (start <= cursor && end >= cursor) {
            if (child.tagName === "SB-BLOCK")
              return child.findTextForCursor(cursor);
            else return child;
          }
        }
      }
      return null;
    }
  }
);

customElements.define(
  "sb-text",
  class Text extends HTMLElement {
    static observedAttributes = ["text"];

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: inline-block;
                font-family: monospace;
            }
            span {
                outline: none;
            }
        </style>
        <span contenteditable></span>`;
      this.addEventListener("input", (event) => {
        const input = event.data;
        const cursor = getGlobalCursorPosition(this.shadowRoot) - input.length;

        // undo text change, the diffing will apply it
        this.shadowRoot.querySelector("span").textContent =
          this.getAttribute("text");

        if (input && cursor !== null) {
          this.restoreCursorAfter(
            () => editText(nodeRoot(this.node), input, cursor),
            cursor + input.length
          );
        }
      });
    }

    input() {
      return this.shadowRoot.querySelector("span").childNodes[0];
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "text")
        this.shadowRoot.querySelector("span").textContent = newValue;
    }
    getRange() {
      return this.node.range;
    }

    viewParentThat(cb) {
      let parent = this.parentElement;
      while (parent) {
        if (["SB-BLOCK", "SB-TEXT"].includes(parent.tagName) && cb(parent))
          return parent;
        parent = parent.parentElement;
      }
    }

    restoreCursorAfter(cb, cursor) {
      const parents = [];
      for (let p = this.parentElement; p; p = p.parentElement) {
        parents.push(p);
      }

      cb();

      // find the first parent that is still in the document and contains
      // the cursor, then find the text node that contains the cursor
      let textNode;
      for (const parent of parents) {
        if (parent.isConnected) {
          const [start, end] = parent.getRange();
          if (start <= cursor && end >= cursor) {
            textNode = parent.findTextForCursor(cursor);
            break;
          }
        }
      }

      const root = textNode.input().getRootNode();

      const range = document.createRange();
      range.setStart(textNode.input(), cursor - textNode.node.range[0]);
      range.setEnd(textNode.input(), cursor - textNode.node.range[0]);

      const selection = getSelection(root);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
);
