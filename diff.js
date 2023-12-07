class SubtreeShare {
  constructor() {
    this.availableTrees = new Map();
    this.preferredTrees = null;
  }
  registerAvailableTree(node) {
    this.availableTrees.set(node, node);
  }
  deregisterAvailableTree(node, registry) {
    if (node.share) {
      node.share.availableTrees.delete(node);
      node.share = null;
      for (const child of node.children) {
        this.deregisterAvailableTree(child, registry);
      }
    } else {
      if (node.assigned) {
        const b = node.assigned;
        this.unassignTree(node);
        b.allNodesDo((n) => {
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
    this.preferredTrees = new Map();
    for (const tree of this.availableTrees.values()) {
      this.preferredTrees.set(tree.literalHash, tree);
    }
    return this.preferredTrees;
  }
  hasPreferredTrees() {
    return !!this.preferredTrees;
  }
  takeAvailableTree(b, takePreferred, registry) {
    let a;
    if (takePreferred) {
      a = this.getPreferredTrees().get(b.literalHash);
    } else {
      // pick any
      a = [...this.availableTrees.values()][0];
    }
    if (a) this.takeTree(a, b, registry);
    return a;
  }
  takeTree(a, b, registry) {
    a.share.availableTrees.delete(a);
    if (a.share.hasPreferredTrees()) {
      a.share.preferredTrees.delete(b.literalHash);
    }
    a.share = null;
    for (const child of a.children) {
      this.deregisterAvailableTree(child, registry);
    }
    b.allChildrenDo((n) => {
      if (n.assigned) {
        registry.assignShareAndRegisterTree(n.assigned);
      }
    });
    return a;
  }
}

function assert(condition) {
  if (!condition) {
    throw new Error("Assertion failed");
  }
}

class SubtreeRegistry {
  constructor() {
    this.subtrees = new Map();
  }
  assignShare(node) {
    node.assigned = null;
    if (this.subtrees.has(node.structureHash)) {
      return (node.share = this.subtrees.get(node.structureHash));
    } else {
      node.share = new SubtreeShare();
      this.subtrees.set(node.structureHash, node.share);
      return node.share;
    }
  }
  assignShareAndRegisterTree(node) {
    const share = this.assignShare(node);
    share.registerAvailableTree(node);
    return share;
  }
}

class FakeWeakRef {
  constructor(value) {
    this.value = value;
  }
  deref() {
    return this.value;
  }
}

class TrueDiff {
  applyEdits(a, b) {
    const registry = new SubtreeRegistry();

    this.assignShares(a, b, registry);
    this.assignSubtrees(a, b, registry);

    const buffer = new EditBuffer();
    const root = this.computeEditScript(a, b, null, 0, buffer);
    buffer.apply();
    this.cleanData(root);

    return root;
  }

  cleanData(node) {
    node._structureHash = null;
    node._literalHash = null;
    node.share = null;
    node.assigned = null;
    node.literalMatch = null;
    for (const child of node.children) {
      this.cleanData(child);
    }
  }

  // SHARES
  assignShares(a, b, registry) {
    const aShare = registry.assignShare(a);
    const bShare = registry.assignShare(b);
    if (aShare === bShare && a.literalHash === b.literalHash) {
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
    if (a.type === b.type) {
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
            a.allNodesDo((n) => registry.assignShareAndRegisterTree(n));
          }
        } else {
          b.allNodesDo((n) => registry.assignShare(n));
        }
      });
    } else {
      a.allChildrenDo((n) => registry.assignShareAndRegisterTree(n));
      b.allChildrenDo((n) => registry.assignShare(n));
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
      return b.treeHeight - a.treeHeight;
    });
    queue.insert(b);

    while (queue.array.length > 0) {
      const level = queue.array[0].treeHeight;
      const nextNodes = [];
      while (queue.array.length > 0 && queue.array[0].treeHeight === level) {
        const next = queue.array.shift();
        if (!next.assigned) nextNodes.push(next);
      }

      let unassigned = nextNodes;
      unassigned = this.selectAvailableTree(unassigned, true, registry);
      unassigned = this.selectAvailableTree(unassigned, false, registry);
      for (const node of unassigned) {
        for (const child of node.children) {
          queue.insert(child);
        }
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

  // edit script
  computeEditScript(a, b, parent, link, editBuffer) {
    if (a.assigned && a.assigned === b) {
      const newTree = a.literalMatch
        ? a
        : this.updateLiterals(a, b, editBuffer);
      a.assigned = null;
      newTree._range = b.range;
      return newTree;
    }

    if (!a.assigned && !b.assigned) {
      const newTree = this.computeEditScriptRecurse(
        a,
        b,
        parent,
        link,
        editBuffer
      );
      if (newTree) return newTree;
    }

    if (a.type === b.type && !a.assigned && !b.assigned) {
      for (const child of a.children) {
        editBuffer.detach(child);
        this.unloadUnassigned(child, editBuffer);
      }
      let index = 0;
      for (const child of b.children) {
        const newTree = this.loadUnassigned(child, editBuffer);
        editBuffer.attach(newTree, a, index);
        index++;
      }
      a._range = b.range;
      return a;
    }

    editBuffer.detach(a);
    this.unloadUnassigned(a, editBuffer);
    const newTree = this.loadUnassigned(b, editBuffer);
    editBuffer.attach(newTree, parent, link);
    return newTree;
  }
  computeEditScriptRecurse(a, b, parent, link, editBuffer) {
    if (a.type === b.type && a.children.length === b.children.length) {
      a._range = b.range;
      for (let i = 0; i < a.children.length; i++) {
        this.computeEditScript(a.children[i], b.children[i], a, i, editBuffer);
      }
      return a;
    } else {
      return null;
    }
  }
  updateLiterals(a, b, editBuffer) {
    a._range = b.range;
    if (a.text !== b.text) editBuffer.update(a, b.text);
    for (let i = 0; i < a.children.length; i++) {
      this.updateLiterals(a.children[i], b.children[i], editBuffer);
    }
    return a;
  }
  unloadUnassigned(a, editBuffer) {
    if (a.assigned) {
      a.assigned = null;
    } else {
      editBuffer.remove(a);
      for (const child of a.children) {
        this.unloadUnassigned(child, editBuffer);
      }
    }
  }
  loadUnassigned(b, editBuffer) {
    if (b.assigned) {
      return this.updateLiterals(b.assigned, b, editBuffer);
    } else {
      const newTree = b.shallowClone();
      b.children.forEach((child, index) => {
        const newChild = this.loadUnassigned(child, editBuffer);
        editBuffer.attach(newChild, newTree, index);
      });
      return newTree;
    }
  }
}

class DetachOp {
  constructor(node) {
    this.node = node;
  }
  apply() {
    this.node.parent?.removeChild(this.node);
    this.node.viewsDo((view) => {
      view.parentElement?.removeChild(view);
    });
  }
}
class AttachOp {
  constructor(node, parent, index) {
    this.node = node;
    this.parent = parent;
    this.index = index;
  }
  apply() {
    this.parent?.insertChild(this.node, this.index);
    this.parent?.viewsDo((parentView) => {
      parentView.insertBefore(
        this.node.toHTML(),
        parentView.childNodes[this.index]
      );
    });
  }
}
class UpdateOp {
  constructor(node, text) {
    this.node = node;
    this.text = text;
  }
  apply() {
    this.node._text = this.text;
    this.node.viewsDo((view) => {
      view.setAttribute("text", this.text);
    });
  }
}
class RemoveOp {
  constructor(node) {
    this.node = node;
  }
  apply() {}
}

class EditBuffer {
  constructor() {
    this.posBuf = [];
    this.negBuf = [];
  }
  attach(node, parent, link) {
    assert(node !== parent);
    assert(link >= 0);
    assert(node);

    this.log(
      "attach",
      node.type ?? `"${node.text}"`,
      parent?.type ?? "root",
      link
    );
    this.posBuf.push(new AttachOp(node, parent, link));
  }
  detach(node) {
    this.log("detach", node.type ?? node.text);
    this.negBuf.push(new DetachOp(node));
  }
  remove(node) {
    this.log("remove", node.type ?? node.text);
    this.negBuf.push(new RemoveOp(node));
  }
  update(node, text) {
    assert(node.views.length > 0);
    this.log("update", node.type ?? node.text, text);
    this.posBuf.push(new UpdateOp(node, text));
  }
  apply() {
    this.negBuf.forEach((f) => f.apply(this));
    this.posBuf.forEach((f) => f.apply(this));
  }
  log(...op) {
    console.log(...op);
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

function zipOrNullDo(a, b, cb) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    cb(a[i], b[i]);
  }
}
