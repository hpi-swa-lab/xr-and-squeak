var tree;
let language;

function getGlobalCursorPosition() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      const parentElement = container.getRootNode().host;
      if (parentElement?.tagName === "SB-TEXT") {
        return parentElement.tsRange[0] + range.startOffset;
      }
    }
  }
  return null;
}

customElements.define(
  "sb-snippet",
  class Snippet extends HTMLElement {
    static observedAttributes = ["text"];

    currentTree = null;

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<slot></slot>`;
      this.shadowRoot.addEventListener("keydown", (event) => {
        event.stopPropagation();
        event.preventDefault();
        const input = event.key;
        const cursor = getGlobalCursorPosition();
        if (cursor !== null) {
          const currentText = this.getAttribute("text");
          const newText =
            currentText.slice(0, cursor) + input + currentText.slice(cursor);
          console.log(newText);
        }
      });
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "text") {
        const parser = new TreeSitter();
        parser.setLanguage(language);

        const text = newValue;
        const newTree = parser.parse(text, this.currentTree);

        if (this.currentTree) {
          this.currentTree.delete();
        } else {
          this.appendChild(blocksFromCursor(newTree.walk(), text));
        }

        this.currentTree = newTree;
      }
    }
  }
);

customElements.define(
  "sb-block",
  class Block extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: inline-block;
                padding: 0px;
                display: flex;
                border: 1px solid #eee;
            }
        </style>
        <slot></slot>
        `;
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
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "text")
        this.shadowRoot.querySelector("span").textContent = newValue;
    }
  }
);

(async () => {
  await TreeSitter.init();
  language = await TreeSitter.Language.load("tree-sitter-smalltalk.wasm");

  const snippet = document.createElement("sb-snippet");
  snippet.setAttribute("text", "a 1 + 2");
  document.body.appendChild(snippet);
})();

/* converting cursor to blocks */
function addTextFromCursor(cursor, block, isLeaf) {
  const gap = currentText.slice(lastLeafIndex, cursor.startIndex);
  if (gap) {
    const text = document.createElement("sb-text");
    text.tsRange = [lastLeafIndex, cursor.startIndex];

    text.setAttribute("text", gap.replace(/\s/g, "\u00A0"));
    block.appendChild(text);
  }

  lastLeafIndex = cursor.endIndex;

  if (isLeaf) {
    const text = document.createElement("sb-text");
    text.tsRange = [cursor.startIndex, cursor.endIndex];
    text.setAttribute("text", cursor.nodeText);
    block.appendChild(text);
  }
}

let lastLeafIndex;
let currentText;
function blocksFromCursor(cursor, text) {
  lastLeafIndex = 0;
  currentText = text;
  return _blocksFromCursor(cursor);
}

function _blocksFromCursor(cursor) {
  const block = document.createElement("sb-block");
  block.setAttribute("type", cursor.nodeType);
  block.setAttribute("field", cursor.nodeField);
  block.tsNode = cursor.currentNode();

  if (cursor.gotoFirstChild()) {
    do {
      addTextFromCursor(cursor, block, false);
      block.appendChild(_blocksFromCursor(cursor));
    } while (cursor.gotoNextSibling());
    addTextFromCursor(cursor, block, false);
    cursor.gotoParent();
  } else {
    addTextFromCursor(cursor, block, true);
  }

  return block;
}

/* diffing two ts trees */
function hashString(str) {}
function nodeStructureHash(node) {}
function nodeLiteralHash(node) {}
function nodeUri(node) {}
function nodeAllDo(node, cb) {
  cb(node);
  for (const child of node.children) {
    nodeAllDo(child, cb);
  }
}
function nodeAllChildrenDo(node, cb) {
  for (const child of node.children) {
    nodeAllDo(child, cb);
  }
}
function zipOrNullDo(a, b, cb) {
  for (let i = 0; i < a.length; i++) {
    cb(a[i], b[i]);
  }
}
function nodeTreeHeight(node) {
  let height = 0;
  for (const child of node.children) {
    height = Math.max(height, nodeTreeHeight(child));
  }
  return height + 1;
}

class SubtreeShare {
  constructor() {
    this.availableTrees = {};
    this.preferredTrees = null;
  }
  registerAvailableTree(node) {
    this.availableTrees[nodeUri(node)] = node;
  }
  deregisterAvailableTree(node, registry) {
    if (node.share) {
      delete node.share.availableTrees[nodeUri(node)];
      node.share = null;
      for (const child of node.children) {
        this.deregisterAvailableTree(child, registry);
      }
    } else {
      if (node.assigned) {
        const b = node.assigned;
        this.unassignTree(node);
        nodeAllDo(b, (n) => {
          registry.assignShare(n);
        });
      }
    }
  }
  unassignTree(node) {
    node.assigned.assigned = null;
    node.assigned = null;
  }
  getPreferredTrees() {
    if (this.preferredTrees) {
      return this.preferredTrees;
    }
    this.preferredTrees = {};
    for (const tree of Object.values(this.availableTrees)) {
      this.preferredTrees[nodeLiteralHash(tree)] = tree;
    }
  }
  hasPreferredTrees() {
    return !!this.preferredTrees;
  }
  takeAvailableTree(b, takePreferred, registry) {
    let a;
    if (takePreferred) {
      a = this.getPreferredTrees()[nodeLiteralHash(node)];
    } else {
      // pick any
      a = Object.values(this.availableTrees)[0];
    }
    if (a) this.takeTree(a, b, registry);
  }
  takeTree(a, b, registry) {
    delete a.share.availableTrees[nodeUri(a)];
    if (a.share.hasPreferredTrees()) {
      delete a.share.preferredTrees[nodeLiteralHash(b)];
    }
    a.share = null;
    for (const child of a.children) {
      this.deregisterAvailableTree(child, registry);
    }
    nodeAllChildrenDo(b, (n) => {
      if (n.assigned) {
        registry.assignShareAndRegisterTree(n.assigned);
      }
    });
  }
}

class SubtreeRegistry {
  constructor() {
    this.subtrees = {};
  }
  assignShare(node) {
    node.assigned = null;
    node.share = this.subtrees[nodeStructureHash(node)] ??= new SubtreeShare();
    return node.share;
  }
  assignShareAndRegisterTree(node) {
    const share = this.assignShare(node);
    share.registerAvailableTree(node);
    return share;
  }
}

class TrueDiff {
  compare(a, b) {
    const registry = new SubtreeRegistry();
    this.assignShares(a, b, registry);
    this.assignSubtrees(a, b, registry);
  }

  // SHARES
  assignShares(a, b, registry) {
    const aShare = registry.assignShare(a);
    const bShare = registry.assignShare(b);
    if (aShare === bShare && nodeLiteralHash(a) === nodeLiteralHash(b)) {
      this.assignTree(a, b, true);
    } else {
      this.assignSharesRecurse(a, b, registry);
    }
  }
  assignTree(a, b, literalMatch) {
    a.share = null;
    a.literalMatch = literalMatch;
    if (literalMatch) {
      a.assigned = b;
      b.assigned = a;
    } else {
      this.assignTreeRecurse(a, b);
    }
  }
  assignTreeRecurse(a, b) {
    a.assigned = b;
    b.assigned = a;
    // iterate over both children arrays
    for (let i = 0; i < a.children.length; i++) {
      this.assignTreeRecurse(a.children[i], b.children[i]);
    }
  }
  assignSharesRecurse(a, b, registry) {
    if (a.nodeType === b.nodeType) {
      const aList = [...a.children];
      const bList = [...b.children];
      this.assignSharesList(aList, bList, registry);
      this.assignSharesList(aList.reverse(), bList.reverse(), registry);
      zipOrNullDo(aList, bList, (a, b) => {
        if (a) {
          if (b) {
            registry.assignShareAndRegisterTree(a);
            registry.assignShare(b);
            this.assignSharesRecurse(a, b, registry);
          } else {
            nodeAllDo(a, (n) => registry.assignShareAndRegisterTree(n));
          }
        } else {
          nodeAllDo(b, (n) => registry.assignShare(n));
        }
      });
    } else {
      nodeAllChildrenDo(a, (n) => registry.assignShareAndRegisterTree(n));
      nodeAllChildrenDo(b, (n) => registry.assignShare(n));
    }
  }
  assignSharesList(aList, bList, registry) {
    while (aList.length > 0 && bList.length > 0) {
      const aShare = registry.assignShare(aList[0]);
      const bShare = registry.assignShare(bList[0]);
      if (aShare === bShare) {
        this.assignTree(aList.shift(), bList.shift(), false);
      } else {
        break;
      }
    }
  }

  // SUBTREES
  assignSubtrees(a, b, registry) {
    const queue = new SortedArray((a, b) => {
      return nodeTreeHeight(a) - nodeTreeHeight(b);
    });
    queue.insert(b);

    while (queue.array.length > 0) {
      const level = nodeTreeHeight(queue.array[0]);
      const nextNodes = [];
      while (
        queue.array.length > 0 &&
        nodeTreeHeight(queue.array[0]) === level
      ) {
        const next = queue.array.shift();
        if (!next.assigned) nextNodes.push(next);
      }

      let unassigned = nextNodes;
      unassigned = this.selectAvailableTree(unassigned, true, registry);
      unassigned = this.selectAvailableTree(unassigned, false, registry);
      for (const node of unassigned) {
        queue.insert(node);
      }
    }
  }
  selectAvailableTree(unassigned, literalMatch, registry) {
    return unassigned.filter((b) => {
      if (b.assigned) {
        return false;
      } else {
        const a = b.share.takeAvailableTree(b, literalMatch, registry);
        if (a) {
          this.assignTree(a, b, literalMatch);
          return false;
        } else {
          return true;
        }
      }
    });
  }
}

class SortedArray {
  constructor(compare) {
    this.array = [];
    this.compare = compare;
  }

  insert(value) {
    const index = this.array.findIndex((v) => this.compare(v, value) > 0);
    if (index === -1) {
      this.array.push(value);
    } else {
      this.array.splice(index, 0, value);
    }
  }
}
