import "../external/preact-debug.js";
import { h, render } from "../external/preact.mjs";
import { nextHash, orParentThat, parentWithTag } from "../utils.js";
import { useEffect } from "../external/preact-hooks.mjs";
import { useMemo } from "../external/preact-hooks.mjs";
import { SBList } from "../core/model.js";
import { SandblocksExtensionInstance } from "./extension-instance.js";
import { markAsEditableElement } from "../core/focus.js";

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
export const shard = (node) =>
  h(node.editor.shardTag, { initNode: [node], key: node.id });
export const shardList = (list) => {
  const node = new SBList(list);
  return h(node.editor.shardTag, { initNode: [node], key: node.id });
};
export const icon = (name) =>
  h("span", { class: "material-symbols-outlined" }, name);

function _Editor({ inlineExtensions, editorRef, ...props }) {
  const i = useMemo(
    () =>
      inlineExtensions?.map((e) => e.instance(SandblocksExtensionInstance)) ??
      [],
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
export const useLocalState = (key, initialValue) => {
  const [value, setValue] = useState(localStorage.getItem(key) ?? initialValue);
  useEffect(() => {
    localStorage.setItem(key, value);
  }, [value]);
  return [value, setValue];
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

  // isSticky = true;

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
    this.uninstall().setAllowReplacement(this.tagName, false);
  }

  uninstall() {
    const source = this.source.toHTML();
    this.editor.changeDOM(() => this.replaceWith(source));
    return source;
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

  get range() {
    return this.source.range;
  }

  get node() {
    return this.source;
  }

  init(source) {
    // subclasses may perform initialization here, such as creating shards
  }

  destroy(e) {
    // TODO reuse shards instead of re-creating the entire subtree by
    // passing a map of node=>view to toHTML
    e.destroyReplacement(this);
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

function ensureReplacementTagDefined(tag) {
  if (!customElements.get(tag)) {
    customElements.define(
      tag,
      class extends Replacement {
        update(node) {
          // needs to be a stable reference, otherwise we keep rebuilding the
          // entire replacement
          this._component ??= (...args) => this.component(...args);
          this.render(
            h(this._component, { node, replacement: this, ...this.props })
          );
        }
      }
    );
  }
}

// can be used in place of a shard. provide a callback that will be called
// once the user starts typing in the field, in which the callback should
// add the necessary code to the source.
export function ExpandToShard({ prefix, suffix, placeholder, expandCallback }) {
  return h(
    "span",
    { style: { display: "inline-flex" } },
    prefix,
    h("input", {
      style: { border: "none" },
      placeholder,
      ref: markAsEditableElement,
      oninput: (e) => expandCallback(`${prefix}${e.target.value}${suffix}`),
    }),
    suffix
  );
}

// Define a replacement by providing a Preact component
// instead of just the name of a custom element. Note that
// this function will define a custom element for you.
//
// The component receives the node and the replacement as props.
export function ensureReplacementPreact(
  extension,
  node,
  tag,
  component,
  props
) {
  ensureReplacementTagDefined(tag);
  extension.ensureReplacement(node, tag, { props, component });
}

export function installReplacementPreact(
  extension,
  node,
  tag,
  component,
  props
) {
  ensureReplacementTagDefined(tag);
  extension.installReplacement(node, tag, { props, component });
}

// Define a widget by providing a Preact component.
// You may either provide a shouldReRender function that is called
// whenever a trigger is processed and should return true, if we should
// re-render. Alternatively, if you do not provide a shouldReRender function,
// the component will only be rendered once, when it is first connected.
export function createWidgetPreact(
  extension,
  tag,
  component,
  shouldReRender = null
) {
  if (!customElements.get(tag)) {
    customElements.define(
      tag,
      class extends Widget {
        connectedCallback() {
          super.connectedCallback();
          if (!shouldReRender) this.updateView({});
        }
        noteProcessed(trigger, node) {
          if (shouldReRender?.(trigger, node))
            this.updateView({ trigger, node });
        }
        updateView(props) {
          this.render(h(component, { ...props, widget: this }));
        }
      }
    );
  }
  return extension.createWidget(tag);
}

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

// an empty replacement that can we use to hide elements
customElements.define("sb-hidden", class extends Replacement {});
