import { Extension, ExtensionInstance } from "../core/extension.js";
import { languageFor } from "../core/languages.js";

import {
  parentWithTag,
  rangeContains,
} from "../utils.js";


/* globals queueMicrotask */

export class CodeMirrorExtensionInstance extends ExtensionInstance {
  
  constructor(...args) {
    super(...args)
    this.attachedDataPerTrigger = new Map();
    this.queuedUpdates = [];
    this.widgets = [];
    this.replacementMap = new Map()
  }
  
  shardsForNodeDo(node, cb) {
    for (const shard of node.editor.allShards) {
      if (rangeContains(shard.range, node.range))
        cb(shard)
    }
  }

  ensureReplacement(node, tag, props) {
    console.log(node)
    this.shardsForNodeDo(node, async shard => {
      const pos = [shard.livelyCM.posFromIndex(node.range[0]), 
          shard.livelyCM.posFromIndex(node.range[1])]
      const currentMarks = shard.livelyCM.editor.findMarksAt(pos[0])
      
      // FIXME need to handle multiple marks?
      console.assert(currentMarks.length <= 1);
      
      if (currentMarks.length > 0) {
        const currentReplacement = currentMarks[0].replacedWith.childNodes[0]
        console.assert(currentReplacement.tagName === tag.toUpperCase());
        currentReplacement.props = props
        currentReplacement.update(node);
        this.newReplacements.add(currentReplacement)
        return;
      }
      
      let replacement
      if (!replacement) {
        replacement = shard.livelyCM.wrapWidgetSync(tag, ...pos)
        replacement.props = props
        replacement.init()
      }
     replacement.update(node)
      this.newReplacements.add(replacement);
   })
  }

  attachData(node, identifier, add, remove, update = null) {
    
  }
  processStickyReplacements(node) {
   
  }
  
  destroyReplacement(replacement) {
    replacement.marker.clear()
  }
}


export class SCMShard extends HTMLElement {
  
  get editor() {
    return parentWithTag(this, "SCM-EDITOR");
  }
  
  get range() {
    return this.source.range;
  }
  
  set initNode([node]) {
    this.update(node)
  }
  
  async update(node) {
    this.source = node
    if (!this.livelyCM) {
      this.livelyCM = await (<lively-code-mirror 
                               style="display:inline-block; border: 1px solid gray" 
                               class={node == node.root ? "" : "shard"}></lively-code-mirror>)
      if(node === node.root) {
        this.livelyCM.style.width = "100%"
        this.livelyCM.style.height = "100%"
      }
      
      
      this.livelyCM.addEventListener("change", (e) => {
        if (!this.editor || this.nextSource === this.livelyCM.value) return;
        this.editor.replaceTextFromTyping({
          range: this.range,
          text: this.livelyCM.value,
        });
      });      
      this.appendChild(this.livelyCM)
    }
    lively.showElement(this.livelyCM).innnerHTML = "update"
    
    this.nextSource = node.sourceString
    this.livelyCM.value = node.sourceString
  }  
  
}

customElements.define("scm-shard", SCMShard);

export class SCMEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
          <div style="border: 1px solid gray">
          <slot></slot></div>
        `;

      this.extensions = [];

     
      this.lastText = null;
      this.lastLanguage = null;
      this.lastExtensions = null;
      this.initializing = false;
    }

    static observedAttributes = ["text", "language", "extensions"];

    get shardTag() {
      return "scm-shard"
    }

    get allShards() {
      // TODO need to collect recursively across shadow DOMs
      return this.querySelectorAll("scm-shard")
    }
  
    async createShardFor(node) {
      const shard = document.createElement("scm-shard");
      shard._editor = this;
      await shard.update(node);
      return shard;
    }

  replaceTextFromTyping({ text, range: [start, end] }) {
    const old = this.source.sourceString;
    const newText = old.slice(0, start) + text + old.slice(end)
    this.source.updateModelAndView(newText)
    this.extensionsDo((e) => e.process(["replacement"], this.source));
    
    // TODO these also have to trigger
    // if (this.selected)
    //     this.extensionsDo((e) => e.process(["type"], this.selected.node));
    //   this.extensionsDo((e) =>
    //     e.process(["always"], this.selected?.node ?? this.source)
    //   );
    //   this.extensionsDo((e) =>
    //     e.changesApplied(changes, oldSource, newSource, this.source, diff)
    //   );
  }

    disconnectedCallback() {
      // document.removeEventListener("selectionchange", this.selectionHandler);
      // this.extensionsDo((e) => e.process(["extensionDisconnected"], this.source));
    }

    get source() {
      return this.childNodes[0].source;
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (!this._queued) {
        this._queued = true;
        queueMicrotask(async () => {
          this._queued = false;
          await this.updateEditor();
        });
      }
    }

    extensionsDo(cb) { 
      for (const e of [
        ...this.extensionInstances,
        ...(this.inlineExtensions ?? []),
      ]) {
        cb(e);
      }
    }

    async updateEditor() {
      await this.load(
        this.getAttribute("text"),
        this.getAttribute("language"),
        this.getAttribute("extensions").split(" ").filter(Boolean)
      );
    }

    async load(text, language, extensionNames) {
      if (this.initializing) {
        this.queuedUpdate = arguments;
        return;
      }
      this.initializing = true;

      if (this.shard) {
        this.extensionsDo((e) =>
          e.process(["extensionDisconnected"], this.source)
        );
        this.extensionInstances.forEach((e) => e.destroy());
        this.shard.source.destroy();
        this.shard.remove();
      }

      const [root, ...extensions] = await Promise.all([
        languageFor(language).initModelAndView(text, language, this.root),
        ...extensionNames.map((e) => Extension.get(e)),
      ]);
      
      root._editor = this

      this.appendChild(await this.createShardFor(root));

      this.extensionInstances = extensions.map((e) =>
        e.instance(CodeMirrorExtensionInstance)
      );
      this.extensionsDo((e) => e.process(["extensionConnected"], this.source));
      this.extensionsDo((e) => e.process(["replacement"], this.source));
      this.extensionsDo((e) => e.process(["always"], this.source));
      this.initializing = false;

      if (this.queuedUpdate) {
        let update = this.queuedUpdate;
        this.queuedUpdate = null;
        await this.load(...update);
      }

      queueMicrotask(() => this.dispatchEvent(new CustomEvent("loaded")));
    }

    async loadExtensions(list) {
      const exts = await Promise.all(list.map((name) => Extension.get(name)));
      this.extensions = exts.map((e) => e.instance());

      this.extensions.forEach((e) =>
        e.process(["extensionConnected", "replacement", "always"], this.root)
      );
    }
  }

customElements.define("scm-editor", SCMEditor);
