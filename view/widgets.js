import { h, render } from "../external/preact.mjs";
import { nextHash, orParentThat, parentWithTag } from "../utils.js";
import { useEffect } from "../external/preact-hooks.mjs";
import { useMemo } from "../external/preact-hooks.mjs";

export { h, render } from "../external/preact.mjs";
export const li = (...children) => h("li", {}, ...children);
export const ul = (...children) => h("ul", {}, ...children);
export const div = (...children) => h("div", {}, ...children);
export const el = (cls, ...children) => h("div", { class: cls }, ...children);
export const table = (...children) => h("table", {}, ...children);
export const button = (label, onclick, autofocus) =>
  h("button", { onclick, autofocus }, label);
export const tr = (...children) => h("tr", {}, ...children);
export const td = (...children) => h("td", {}, ...children);
export const shard = (node) => h("sb-shard", { initNode: [node], key: node });

function _Editor({ inlineExtensions, editorRef, ...props }) {
  const i = useMemo(
    () => inlineExtensions?.map((e) => e.instance()) ?? [],
    // use array directly for content-compare
    inlineExtensions ?? []
  );
  return h("sb-editor", { ...props, inlineExtensions: i, ref: editorRef });
}
export const editor = ({
  extensions,
  sourceString,
  onSave,
  onChange,
  ...props
}) =>
  h(_Editor, {
    extensions: extensions.join(" "),
    text: sourceString ?? "",
    onsave: (e) => onSave?.(e.detail),
    onchange: (e) => onChange?.(e.detail),
    ...props,
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
    return orParentThat(this, (p) => p.tagName === "SB-EDITOR");
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

  anyTextForCursor() {
    const recurse = (n) => {
      for (const child of n.shadowRoot?.children ?? n.children) {
        if (child.tagName === "SB-TEXT") return child;
        else {
          const ret = recurse(child);
          if (ret) return ret;
        }
      }
    };
    return recurse(this);
  }
}

export class Replacement extends Widget {
  shards = [];

  constructor() {
    super();
    this.hash = nextHash();
  }

  handleClick(e) {
    if (e.button === 0 && e.altKey) {
      this.uninstallAndMark();
    }
  }

  isReplacementAllowed(tagName) {
    // only confirm that we may stay being this replacement but
    // don't allow another replacement to take our place
    return this.tagName === tagName.toUpperCase();
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("click", this.handleClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("click", this.handleClick);
  }

  uninstallAndMark() {
    const source = this.source.toHTML();
    source.setAllowReplacement(this.tagName, false);
    this.editor.changeDOM(() => this.replaceWith(source));
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

  // see AttachOp>>apply()
  insertNode(node, index) {}
}

customElements.define("sb-hidden", class extends Replacement {});

// An alternative to https://github.com/preactjs/preact-custom-element
// PreactCustomElement works by copying slotted nodes into the VDOM.
// I think we want to preserve node identity, so the below approach seems
// more promising. (Sidenote: if we want to use PreactCustomElement, we
// will need to patch its VDOM-ization to also copy the node's ownProperties).
export function registerPreactElement(name, preactComponent) {
  customElements.define(
    name,
    class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: "open" });
      }

      connectedCallback() {
        render(
          h(preactComponent, { ...this.props, root: this }),
          this.shadowRoot
        );
      }

      disconnectedCallback() {
        render(null, this.shadowRoot);
      }
    }
  );
}
