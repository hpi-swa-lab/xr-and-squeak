import { h, render } from "./external/preact.mjs";
import { nextHash } from "./utils.js";

export { h } from "./external/preact.mjs";
export const li = (...children) => h("li", {}, ...children);
export const ul = (...children) => h("ul", {}, ...children);
export const div = (...children) => h("div", {}, ...children);
export const table = (...children) => h("table", {}, ...children);
export const tr = (...children) => h("tr", {}, ...children);
export const td = (...children) => h("td", {}, ...children);
export const shard = (node) => h("sb-shard", { initNode: [node], key: node });

export class Widget extends HTMLElement {
  disconnectedCallback() {
    this.dispatchEvent(new Event("disconnect"));
  }

  connectedCallback() {
    this.setAttribute("contenteditable", "false");
  }

  noteProcessed(trigger, node) {
    // subclasses may perform actions here
  }

  render(vdom) {
    render(vdom, this);
  }

  get editor() {
    const editor = this.getRootNode().host.editor;
    console.assert(editor.tagName === "SB-EDITOR");
    return editor;
  }

  // polymorphic with Block
  findTextForCursor(cursor) {
    for (const [_, shard] of this.shards) {
      const result = shard.root.findTextForCursor(cursor);
      if (result) return result;
    }
    return null;
  }
}

export class Replacement extends Widget {
  shards = [];

  constructor() {
    super();
    this.hash = nextHash();
  }

  update(source) {
    for (const [locator, shard] of this.shards) {
      const node = locator(source);
      if (!node) throw new Error("shard locator returned null");
      if (node !== shard.source) {
        shard.update(node);
      }
    }
  }

  init(source) {
    // subclasses may perform initialization here, such as creating shards
  }

  createShard(locator) {
    const shard = document.createElement("sb-shard");
    this.shards.push([locator, shard]);
    return shard;
  }

  get sourceString() {
    return this.editor.sourceString.slice(
      this.source.range[0],
      this.source.range[1]
    );
  }
}
