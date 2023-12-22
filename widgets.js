import { Extension } from "./extension.js";
import { h, render } from "./external/preact.mjs";
import { nextHash, parentWithTag } from "./utils.js";
import { useEffect } from "../external/preact-hooks.mjs";

export { h, render } from "./external/preact.mjs";
export const li = (...children) => h("li", {}, ...children);
export const ul = (...children) => h("ul", {}, ...children);
export const div = (...children) => h("div", {}, ...children);
export const el = (cls, ...children) => h("div", { class: el }, ...children);
export const table = (...children) => h("table", {}, ...children);
export const button = (label, onclick) => h("button", { onclick }, label);
export const tr = (...children) => h("tr", {}, ...children);
export const td = (...children) => h("td", {}, ...children);
export const shard = (node) =>
  h(Extension.SHARD_TAG, { initNode: [node], key: node });
export const editor = ({
  extensions,
  sourceString,
  onSave,
  onChange,
  language,
}) =>
  h("sb-editor", {
    extensions: extensions.join(" "),
    text: sourceString ?? "",
    language,
    onsave: (e) => onSave(e.detail),
    onchange: (e) => onChange(e.detail),
  });
export const useAsyncEffect = (fn, deps) => {
  useEffect(() => {
    fn();
  }, deps);
};

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

  get shard() {
    return parentWithTag(this, "SB-SHARD");
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

  destroy() {
    // TODO reuse shards instead of re-creating the entire subtree by
    // passing a map of node=>view to toHTML
    this.replaceWith(this.source.toHTML());
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

customElements.define("sb-hidden", class extends Replacement {});
