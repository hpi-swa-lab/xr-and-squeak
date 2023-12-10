import { exec, rangeEqual } from "./utils.js";

// An extension groups a set of functionality, such as syntax highlighting,
// shortcuts, or key modifiers. Extensions are only instantiated once. They
// store their runtime data in separate ExtensionInstances, per editor.
export class Extension {
  static extensionRegistry = new Map();

  static register(name, extension) {
    extension.name = name;
    this.extensionRegistry.set(name, extension);
  }

  static get(name) {
    const extension = this.extensionRegistry.get(name);
    if (!extension) throw new Error(`No extension registered for ${name}`);
    return extension;
  }

  constructor() {
    this.queries = new Map();
    this.changeFilters = [];
  }

  registerQuery(trigger, query) {
    if (!this.queries.has(trigger)) this.queries.set(trigger, []);
    this.queries.get(trigger).push(query);
    return this;
  }

  registerChangeFilter(filter) {
    this.changeFilters.push(filter);
    return this;
  }

  registerShortcut(identifier, callback, filter = []) {
    this.registerQuery("shortcut", (e) => [
      ...filter,
      (x) => e.registerShortcut(x, identifier, callback),
    ]);
    return this;
  }

  instance() {
    return new ExtensionInstance(this);
  }
}

// An "instance" of an Extension that holds all data of an extension that
// is needed per editor.
class ExtensionInstance {
  attachedDataPerTrigger = new Map();
  queuedUpdates = [];
  widgets = [];

  constructor(extension) {
    this.extension = extension;
  }

  filterChange(change, text) {
    this.extension.changeFilters.forEach(
      (filter) => (text = filter(change, text))
    );
    return text;
  }

  createWidget(tag) {
    const widget = document.createElement(tag);
    widget.addEventListener("disconnect", (e) =>
      this.widgets.splice(this.widgets.indexOf(widget), 1)
    );
    this.widgets.push(widget);
    return widget;
  }

  ensureReplacement(node, tag) {
    node.viewsDo((view) => {
      if (view.tagName.toLowerCase() === tag) {
        view.update(node);
      } else {
        // FIXME not intended, should work without
        if (!view.shard) return;

        const replacement = document.createElement(tag);
        replacement.source = node;
        replacement.init(node);
        replacement.update(node);
        view.replaceWith(replacement);
        node.allNodesDo((node) => node.views.remove(view));
        node.views.push(replacement);
      }
    });
  }

  applySyntaxHighlighting(node, ...cls) {
    node.viewsDo((view) => {
      console.assert(view.hash, "view has no hash");
      const hash = `${view.hash}:syntax:${cls.join(":")}`;
      if (!this.currentAttachedData.has(hash)) {
        for (const c of cls) view.classList.add(c);
        this.newAttachedData.set(hash, () => view.classList.remove(cls));
      } else {
        this.newAttachedData.set(hash, this.currentAttachedData.get(hash));
      }
    });
  }

  get currentlyProcessingTrigger() {
    return !!this.currentAttachedData;
  }

  propagationType(trigger) {
    return (
      {
        always: "all",
        doubleClick: "parents",
        shortcut: "parents",
        open: "subtree",
        type: "selection",
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

  _processTrigger(trigger, node) {
    if (this.currentlyProcessingTrigger) {
      this.queuedUpdates.push([trigger, node]);
      return;
    }

    if (trigger === "type") this.suggestions = [];

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
        case "selection":
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
          this.currentAttachedData.get(key)();
        }
      }
    }

    for (const widget of this.widgets) {
      widget.noteProcessed(trigger, node);
    }

    if (trigger === "type")
      node.editor.selected?.shard.showSuggestions(this.suggestions);

    this.attachedDataPerTrigger.set(trigger, this.newAttachedData);
    this.currentAttachedData = null;
    this.newAttachedData = null;

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
  dispatchShortcut(identifier, selected) {
    this.currentShortcut = identifier;
    this.currentShortcutView = selected;
    this._processTrigger("shortcut", selected.node);
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

  addSuggestions(suggestions) {
    for (const suggestion of suggestions) {
      this.suggestions.push(suggestion);
    }
  }
}

// An ExtensionScope is added as a parent of an editor.
// When extension functionality is required by the editor, it will
// traverse up the DOM, calling each extension that is registered
// in the visited scopes.
export class ExtensionScope extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<slot></slot>`;
  }

  connectedCallback() {
    this.extensions = [];
    queueMicrotask(() =>
      this.getAttribute("extensions")
        ?.split(" ")
        ?.filter((name) => name.length > 0)
        ?.forEach((name) => {
          this.extensions.push(Extension.get(name));
        })
    );
  }

  extensionsDo(cb) {
    for (const extension of this.extensions) {
      cb(extension);
    }
  }
}

customElements.define("sb-extension-scope", ExtensionScope);
