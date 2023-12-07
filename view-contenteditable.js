import { ExtensionScope } from "./extension.js";
import { SBParser } from "./model.js";

function getSelection(root) {
  return root.getSelection ? root.getSelection() : document.getSelection();
}

const observeOptions = {
  childList: true,
  characterData: true,
  subtree: true,
  attributes: true,
  characterDataOldValue: true,
};

customElements.define(
  "sb-sandblocks",
  class Sandblocks extends HTMLElement {
    queries = new Map();

    constructor() {
      super();
    }
  }
);

customElements.define(
  "sb-editor",
  class Editor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
     <style>
sb-block {
  display: inline;
  background: rgba(0.4, 0.4, 0.4, 0.05);
  margin: 0;
  padding: 0;
  font-family: monospace;
}
sb-block.has-error {
  border: 1px solid red;
}
sb-shard {
  outline: none;
}
</style><slot></slot>`;
    }

    connectedCallback() {
      SBParser.parseText(
        this.getAttribute("text"),
        this.getAttribute("language")
      ).then((node) => {
        this.shadowRoot.appendChild(node.createView());
      });
    }
  }
);

customElements.define(
  "sb-shard",
  class Shard extends HTMLElement {
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

      this.observer = new MutationObserver((mutations) => {
        mutations = [...mutations, ...this.observer.takeRecords()].reverse();
        this.ignoreMutation(() => {
          this.restoreCursorAfter(() => {
            const newText = this.sourceString;
            for (const mutation of mutations) {
              this.undoMutation(mutation);
            }
            this.update(SBParser.setNewText(this.source, newText));
          });
        });
      });
      this.observer.observe(this, observeOptions);

      this.processTriggers("always", "open");
    }

    processTriggers(...triggers) {
      let current = this.getRootNode().host;
      while (current) {
        if (current instanceof ExtensionScope) {
          current.processTrigger(this.source, ...triggers);
          break;
        }
        current = current.parentElement;
      }
    }

    get sourceString() {
      return this.innerText.replace(/\u00A0/g, " ");
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

    ignoreMutation(cb) {
      this.observer.disconnect();
      cb();
      this.observer.observe(this, observeOptions);
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
      const [textField, cursor] = getGlobalCursorPosition(
        this.getRootNode()
      ) ?? [null, null];

      const parents = [];
      for (let p = textField; p; p = p.parentElement) {
        if (p.tagName === "SB-BLOCK") parents.push(p);
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
);

customElements.define(
  "sb-block",
  class Block extends HTMLElement {
    _node = null;
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
  }
);

customElements.define(
  "sb-text",
  class Text extends HTMLElement {
    static observedAttributes = ["text"];
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
      if (container === container.parentElement.firstChild) {
        return [text, text.getRange()[0] + range.startOffset];
      } else {
        let cursor = text.getRange()[0];
        for (const child of container.parentElement.childNodes) {
          if (child === container) break;
          if (child.nodeType === Node.TEXT_NODE) {
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
