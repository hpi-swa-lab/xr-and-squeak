import { exec, rangeEqual, sequenceMatch } from "../utils.js";

export class StickyReplacementRemoved extends Error {}

// An extension groups a set of functionality, such as syntax highlighting,
// shortcuts, or key modifiers. Extensions are only instantiated once. They
// store their runtime data in separate ExtensionInstances, per editor.
export class Extension {
  static extensionRegistry = new Map();
  static packageLoaders = new Map();

  static clearRegistry() {
    this.extensionRegistry = new Map();
    this.packageLoaders = new Map();
  }

  static async get(name) {
    let extension = this.extensionRegistry.get(name);
    if (!extension) {
      const [pkg, extName] = name.split(":");
      if (!pkg || !extName) throw new Error(`Invalid extension name ${name}`);
      if (
        [...this.extensionRegistry.keys()].some(
          (ext) => ext.split(":")[0] === pkg
        )
      )
        throw new Error(
          `Package ${pkg} does not include an extension named ${extName}`
        );
      const p = this._loadPackage(name);
      this.packageLoaders.set(pkg, p);
      await p;
      extension = this.extensionRegistry.get(name);
    }
    if (!extension) {
      throw new Error(`No extension registered for ${name}`);
    }
    return extension;
  }

  static async _loadPackage(name) {
    const [pkg, extName] = name.split(":");
    if (this.packageLoaders.has(pkg)) return this.packageLoaders.get(pkg);

    const extensions = await import(`../extensions/${pkg}.js`);
    for (const [name, ext] of Object.entries(extensions)) {
      if (!(ext instanceof Extension)) continue;
      ext.name = `${pkg}:${name}`;
      this.extensionRegistry.set(ext.name, ext);
    }

    if (!this.extensionRegistry.has(name))
      throw new Error(
        `Package ${pkg} does not include an extension named ${extName}`
      );
  }

  constructor() {
    this.queries = new Map();
    this.filters = new Map();
  }

  copyTo(other) {
    for (const [trigger, queries] of this.queries.entries()) {
      for (const query of queries) other.registerQuery(trigger, query);
    }
    for (const [type, filters] of this.filters.entries()) {
      for (const filter of filters) other.registerFilter(type, filter);
    }
  }

  registerQuery(trigger, query) {
    if (!this.queries.has(trigger)) this.queries.set(trigger, []);
    this.queries.get(trigger).push(query);
    return this;
  }

  _registerFilter(type, filter) {
    if (!this.filters.has(type)) this.filters.set(type, []);
    this.filters.get(type).push(filter);
    return this;
  }

  _processFilter(type, ...args) {
    for (const filter of this.filters.get(type) ?? []) {
      filter(...args);
    }
  }

  registerChangeFilter(filter) {
    return this._registerFilter("change", filter);
  }

  registerChangesApplied(filter) {
    return this._registerFilter("changesApplied", filter);
  }

  registerAlways(query) {
    return this.registerQuery("always", query);
  }

  registerType(query) {
    return this.registerQuery("type", query);
  }

  registerExtensionConnected(query) {
    return this.registerQuery("extensionConnected", query);
  }

  registerExtensionDisconnected(query) {
    return this.registerQuery("extensionDisconnected", query);
  }

  registerDoubleClick(query) {
    return this.registerQuery("doubleClick", query);
  }

  registerReplacement(query) {
    return this.registerQuery("replacement", query);
  }

  registerSave(query) {
    return this.registerQuery("save", query);
  }

  registerPreSave(query) {
    return this.registerQuery("preSave", query);
  }

  registerSelection(query) {
    return this.registerQuery("selection", query);
  }

  registerCaret(query) {
    return this.registerQuery("caret", query);
  }

  registerShortcut(identifier, callback, filter = []) {
    this.registerQuery("shortcut", (e) => [
      ...filter,
      (x) => e.registerShortcut(x, identifier, callback),
    ]);
    return this;
  }

  instance(concreteClass) {
    return new concreteClass(this);
  }
}

export class ExtensionInstance {
  constructor(extension) {
    this.extension = extension;
  }

  // opportunity to filter a *user*-entered change
  filterChange(change, sourceString, root) {
    this.extension._processFilter("change", change, sourceString, root);
  }

  // notification just before changes are applied to the text
  changesApplied(changes, oldSource, newSource, root, diff) {
    this.extension._processFilter(
      "changesApplied",
      changes,
      oldSource,
      newSource,
      root,
      diff
    );
  }

  destroy() {
    this.widgets.forEach((w) => w.remove());
  }

  ensureHidden(node) {
    this.ensureReplacement(node, "sb-hidden");
  }

  applySyntaxHighlighting(node, ...cls) {
    this.ensureClass(node, ...cls);
  }

  ensureClass(node, ...cls) {
    this.attachData(
      node,
      `class:${cls.join(":")}`,
      (v) => {
        for (const c of cls) v.classList.add(c);
      },
      (v) => {
        for (const c of cls) v.classList.remove(c);
      }
    );
  }

  get currentlyProcessingTrigger() {
    return !!this.processingNode;
  }

  // type: react to a change in the program initiated by the user
  // always: be always up-to-date
  // replacement: same as always but run earlier, such that the view is already up-to-date
  // open: run each time a new shard is opened, best place to create widgets that are not replacements
  // selection: run when the selected block changes (does not emit for caret changes within a block)
  // caret: run when the caret has moved
  // shortcut: allows you to call registerShortcut
  // doubleClick: an element was double-clicked
  propagationType(trigger) {
    return (
      {
        always: "all",
        doubleClick: "parents",
        shortcut: "parents",
        open: "subtree",
        type: "single",
        selection: "selection",
        caret: "single",
        replacement: "all",
      }[trigger] ?? "all"
    );
  }

  queryShouldStillPropagate(trigger) {
    if (trigger === "shortcut") return !!this.currentShortcut;
    return true;
  }

  process(triggers, node) {
    for (const trigger of triggers) {
      this._processTrigger(trigger, node);
    }
  }

  async processAsync(trigger, node) {
    for (const query of this.extension.queries.get(trigger) ?? []) {
      const res = exec(node, ...query(this));
      if (res?.then) await res;
    }
  }

  _processTrigger(trigger, node) {
    if (this.currentlyProcessingTrigger) {
      this.queuedUpdates.push([trigger, node]);
      return;
    }

    this.currentReplacements ??= new Set();
    this.newReplacements = new Set();

    this.processingTrigger = trigger;
    this.processingNode = node;

    this.currentAttachedData =
      this.attachedDataPerTrigger.get(trigger) ?? new Map();
    this.newAttachedData = new Map();

    if (this.extension.queries.has(trigger)) {
      switch (this.propagationType(trigger)) {
        case "parents":
          node.nodeAndParentsDo(
            (node) =>
              this.queryShouldStillPropagate(trigger) &&
              this.runQueries(trigger, node)
          );
          break;
        case "subtree":
          node.allNodesDo((node) => this.runQueries(trigger, node));
          break;
        case "all":
          node.root.allNodesDo((node) => this.runQueries(trigger, node));
          break;
        case "single":
          this.runQueries(trigger, node);
          break;
        case "selection":
          if (node)
            node.root.allNodesDo((nested) => {
              // pass in all nodes that share the same range. this is important
              // for a stack of nodes such as (expr_stmt (identifier (#text)))
              if (rangeEqual(nested.range, node.range))
                this.runQueries(trigger, nested);
            });
          break;
        default:
          console.assert(false, "invalid type");
      }

      for (const key of this.currentAttachedData.keys()) {
        if (!this.newAttachedData.has(key)) {
          const current = this.currentAttachedData.get(key);
          current.remove(current.customData);
        }
      }
    }

    // diff replacements
    if (trigger === "replacement") {
      for (const view of this.currentReplacements) {
        if (!this.newReplacements.has(view)) {
          view.destroy(this);
        }
      }
      this.currentReplacements = this.newReplacements;
    }

    for (const widget of this.widgets) {
      widget.noteProcessed(trigger, node);
    }

    this.attachedDataPerTrigger.set(trigger, this.newAttachedData);
    this.currentAttachedData = null;
    this.newAttachedData = null;
    this.processingNode = null;
    this.processingTrigger = null;

    let queued = this.queuedUpdates.pop();
    if (queued) {
      this._processTrigger(...queued);
    }
  }

  registerShortcut(node, identifier, callback) {
    if (identifier === this.currentShortcut) {
      callback(node, this.currentShortcutView, this);
      this.stopPropagatingShortcut();
    }
  }

  currentShortcut = null;
  currentShortcutView = null;
  dispatchShortcut(identifier, selected, root) {
    this.currentShortcut = identifier;
    this.currentShortcutView = selected;
    this._processTrigger("shortcut", selected?.node ?? root);
    this.currentShortcut = null;
    this.currentShortcutView = null;
  }

  stopPropagatingShortcut() {
    this.currentShortcut = null;
    this.currentShortcutView = null;
  }

  runQueries(trigger, node) {
    for (const query of this.extension.queries.get(trigger) ?? []) {
      exec(node, ...query(this));
    }
  }

  addSuggestionsAndFilter(node, candidates) {
    const query = node.text.toLowerCase();
    const exactMatches = candidates
      .filter((w) => w.label.toLowerCase().startsWith(query))
      .sort((a, b) => a.label.length - a.label.length);
    const fuzzyMatches = candidates
      .filter((w) => !exactMatches.includes(w) && sequenceMatch(query, w.label))
      .sort((a, b) => a.label.length - b.label.length);
    this.addSuggestions(
      node,
      [...exactMatches, ...fuzzyMatches]
        .slice(0, 10)
        .filter((w) => w.label.toLowerCase() !== query)
    );
  }

  _data = new Map();
  data(key, init) {
    if (init && !this._data.has(key)) this._data.set(key, init());
    return this._data.get(key);
  }

  setData(key, value) {
    this._data.set(key, value);
  }

  createWidget(tag) {
    const widget = document.createElement(tag);
    widget.addEventListener("disconnect", (e) => {
      this.widgets.splice(this.widgets.indexOf(widget), 1);
    });
    this.widgets.push(widget);
    return widget;
  }

  // subclassResponsibility
  ensureReplacement(node, tag, props) {}
  attachData(node, identifier, add, remove, update = null) {}
  processStickyReplacements(node) {}
  addSuggestions(node, suggestions) {}
}
