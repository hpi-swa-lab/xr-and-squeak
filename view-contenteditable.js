"use strict";

document.body.innerHTML += `<style>
sb-block {
  display: inline;
  background: rgba(0.4, 0.4, 0.4, 0.05);
  margin: 0;
  padding: 0;
  font-family: monospace;
}
sb-shard {
  outline: none;
}
</style>`;

const observeOptions = {
  childList: true,
  characterData: true,
  subtree: true,
  attributes: true,
  characterDataOldValue: true,
};

customElements.define(
  "sb-shard",
  class Shard extends HTMLElement {
    source = null;
    connectedCallback() {
      this.setAttribute("contenteditable", "true");
      this.observer = new MutationObserver((mutations) => {
        mutations = [...mutations, ...this.observer.takeRecords()].reverse();
        this.ignoreMutation(() => {
          this.restoreCursorAfter(() => {
            const newText = this.innerText.replace(/\u00A0/g, " ");
            for (const mutation of mutations) {
              this.undoMutation(mutation);
            }
            this.update(SBParser.setNewText(this.source, newText));
          });
        });
      });
      this.observer.observe(this, observeOptions);
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
      const [textField, cursor] = getGlobalCursorPosition(this.getRootNode());

      const parents = [];
      for (let p = textField.parentElement; p; p = p.parentElement) {
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

      const range = document.createRange();
      range.setStart(textNode.input(), cursor - textNode.node.range[0]);
      range.setEnd(textNode.input(), cursor - textNode.node.range[0]);

      const selection = document.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
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
          this.removeChild(this.shadowRoot.childNodes[0]);
          this.appendChild(document.createElement("br"));
        } else if (newValue !== "\n" && this.isLineBreak()) {
          this.removeChild(this.shadowRoot.childNodes[0]);
          this.appendChild(document.createElement("span"));
        }
        if (newValue !== "\n")
          this.querySelector("span").textContent = newValue;
      }
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
  const selection = document.getSelection(root);
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      const parentElement = container.parentElement.parentElement;
      if (parentElement?.tagName === "SB-TEXT") {
        return [parentElement, parentElement.getRange()[0] + range.startOffset];
      }
    }
  }
  return null;
}
