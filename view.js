import { ExtensionScope, Replacement } from "./extension.js";
import { SBParser } from "./model.js";
import {
  ToggleableMutationObserver,
  WeakArray,
  getSelection,
  nextHash,
} from "./utils.js";

customElements.define(
  "sb-editor",
  class Editor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<link rel="stylesheet" href="style.css"><slot></slot>`;
    }

    connectedCallback() {
      this.style.display = "block";
      this.style.margin = "1rem";
      SBParser.parseText(
        this.getAttribute("text"),
        this.getAttribute("language")
      ).then((node) => {
        if (node) {
          this.shadowRoot.appendChild(node.createView());
        }
      });
    }

    get sourceString() {
      return this.shadowRoot.querySelector("sb-shard").sourceString;
    }
  }
);

export class Shard extends HTMLElement {
  static observers = new WeakArray();
  static ignoreMutation(cb) {
    this.observers.forEach((observer) => observer.disconnect());
    try {
      cb();
    } finally {
      this.observers.forEach((observer) => observer.connect());
    }
  }

  source = null;

  connectedCallback() {
    for (const [key, value] of Object.entries({
      spellcheck: "false",
      autocorrect: "off",
      autocapitalize: "off",
      translate: "no",
      contenteditable: "true",
      role: "textbox",
      "aria-multiline": "true",
    }))
      this.setAttribute(key, value);

    // TODO use queue
    // this.addEventListener("compositionstart", () => {
    //   this.constructor.observers.forEach((observer) => observer.disconnect());
    // });
    // this.addEventListener("compositionend", () => {
    //   this.constructor.observers.forEach((observer) => observer.connect());
    // });

    this.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        document.execCommand("insertText", false, "\t");
      }
    });

    this.observer = new ToggleableMutationObserver(this, (mutations) => {
      mutations = [...mutations, ...this.observer.takeRecords()].reverse();
      if (!mutations.some((m) => this.isMyMutation(m))) return;

      this.constructor.ignoreMutation(() => {
        this.restoreCursorAfter(() => {
          const newText = this.sourceString;
          for (const mutation of mutations) {
            this.undoMutation(mutation);
          }

          SBParser.replaceText(this.source.root, this.source.range, newText);
        });
      });
    });
    this.constructor.observers.push(this.observer);
    this.processTriggers("always", "open");
  }

  processTriggers(...triggers) {
    this.constructor.ignoreMutation(() => {
      let current = this.getRootNode().host;
      while (current) {
        if (current instanceof ExtensionScope) {
          current.processTriggers(this.source, ...triggers);
          break;
        }
        current = current.parentElement;
      }
    });
  }

  get sourceString() {
    let buffer = { text: "" };
    this.serialize(this, buffer);
    return buffer.text;
  }

  serialize(node, buffer) {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        buffer.text += child.textContent.replace(/\u00A0/g, " ");
      } else if (child.tagName === "BR") {
        buffer.text += "\n";
      } else if (
        ["SB-TEXT", "SB-BLOCK", "SPAN", "FONT"].includes(child.tagName)
      ) {
        this.serialize(child, buffer);
      } else if (child instanceof Replacement) {
        buffer.text += child.sourceString;
      } else {
        debugger;
      }
    }
  }

  undoMutation(mutation) {
    switch (mutation.type) {
      case "characterData":
        mutation.target.textContent = mutation.oldValue;
        break;
      case "childList":
        for (const node of mutation.removedNodes) {
          mutation.target.insertBefore(node, mutation.nextSibling);
        }
        for (const node of mutation.addedNodes) {
          mutation.target.removeChild(node);
        }
        break;
      default:
        debugger;
    }
  }

  destroy() {
    this.observer.disconnect();
    this.parentElement?.removeChild(this);
  }

  isMyMutation(mutation) {
    let current = mutation.target;
    while (current) {
      if (current === this) return true;
      // in another shard
      if (current.tagName === "SB-SHARD") return false;
      // in a replacement
      if (current instanceof Replacement) return false;
      current = current.parentElement;
    }
    throw new Error("Mutation is not in shard");
  }

  update(node) {
    if (!this.source) {
      this.appendChild(node.toHTML());
      this.source = node;
    } else if (this.source !== node) {
      this.source = node;
    }
  }
  restoreCursorAfter(cb) {
    let [textField, cursor] = getGlobalCursorPosition(this.getRootNode()) ?? [
      null,
      null,
    ];

    const parents = [];
    for (let p = textField; p; p = p.parentElement) {
      if (p.tagName === "SB-BLOCK") parents.push(p);
    }

    cb();

    // find the first parent that is still in the document and contains
    // the cursor, then find the text node that contains the cursor
    let textNode;
    cursor = Math.min(cursor, this.source.range[1]);
    if (parents.length === 0) parents.push(this.childNodes[0]);
    for (const parent of parents) {
      if (parent.isConnected) {
        const [start, end] = parent.getRange();
        if (start <= cursor && end >= cursor) {
          textNode = parent.findTextForCursor(cursor);
          break;
        }
      }
    }

    if (textNode) {
      textNode.placeCursorAt(cursor);
    }
  }
  get root() {
    return this.childNodes[0];
  }
  placeCursorAt(index) {
    this.root.findTextForCursor(index).placeCursorAt(index);
  }
}
customElements.define("sb-shard", Shard);

customElements.define(
  "sb-block",
  class Block extends HTMLElement {
    _node = null;
    constructor() {
      super();
      this.hash = nextHash();
    }
    set node(v) {
      this._node = v;
      this.setAttribute("type", v.type);
      if (v.type === "ERROR") {
        this.classList.add("has-error");
      }
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
    get shard() {
      let current = this.parentElement;
      while (current) {
        if (current.tagName === "SB-SHARD") return current;
        current = current.parentElement;
      }
      return current;
    }
    connectedCallback() {
      this.addEventListener("dblclick", this.onDoubleClick);
    }
    disconnectedCallback() {
      this.removeEventListener("dblclick", this.onDoubleClick);
    }
    onDoubleClick(e) {
      e.stopPropagation();
      this.shard.processTriggers("doubleClick");
    }
  }
);

customElements.define(
  "sb-text",
  class Text extends HTMLElement {
    static observedAttributes = ["text"];
    constructor() {
      super();
      this.hash = nextHash();
    }
    input() {
      return this.childNodes[0].childNodes[0];
    }
    isLineBreak() {
      return this.childNodes.length > 0 && this.childNodes[0].tagName === "BR";
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "text") {
        if (this.childNodes.length === 0) {
          this.appendChild(document.createElement("span"));
        }
        if (newValue === "\n" && !this.isLineBreak()) {
          this.removeChild(this.childNodes[0]);
          this.appendChild(document.createElement("br"));
        } else if (newValue !== "\n" && this.isLineBreak()) {
          this.removeChild(this.childNodes[0]);
          this.appendChild(document.createElement("span"));
        }
        if (newValue !== "\n")
          this.querySelector("span").textContent = newValue;
      }
    }

    get shard() {
      let current = this.parentElement;
      while (current) {
        if (current.tagName === "SB-SHARD") return current;
        current = current.parentElement;
      }
      return current;
    }

    placeCursorAt(index) {
      index -= this.node.range[0];
      console.assert(index >= 0);

      const range = document.createRange();
      const target = this.isLineBreak() ? this : this.input();
      range.setStart(target, index);
      range.setEnd(target, index);

      const selection = getSelection(this.getRootNode());
      selection.removeAllRanges();
      selection.addRange(range);
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
  }
);

function getGlobalCursorPosition(root) {
  function textFor(node) {
    let current = node;
    while (current && current.tagName !== "SB-TEXT") {
      current = current.parentElement;
    }
    return current;
  }

  const selection = getSelection(root.getRootNode());
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const text = textFor(container);

    if (container.nodeType === Node.TEXT_NODE) {
      if (!text) return [null, range.startOffset];
      if (container === container.parentElement.firstChild) {
        return [text, text.getRange()[0] + range.startOffset];
      } else {
        let cursor = text.getRange()[0];
        for (const child of container.parentElement.childNodes) {
          if (child === container) break;
          if (child.nodeType === Node.TEXT_NODE || child.tagName === "SPAN") {
            cursor += child.textContent.length;
          } else if (child.tagName === "BR") {
            cursor++;
          } else {
            debugger;
          }
        }
        return [text, cursor];
      }
    }

    let cursor = text.getRange()[0];
    for (let i = 0; i <= range.startOffset; i++) {
      const child = container.childNodes[i];
      if (!child) continue;
      if (child?.nodeType === Node.TEXT_NODE) {
        cursor += child.textContent.length;
      } else if (child.tagName === "BR") {
        cursor++;
      } else {
        debugger;
      }
    }
    return [text, cursor];
  }
  return null;
}
