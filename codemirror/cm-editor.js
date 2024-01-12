import { SBParser } from "../core/model.js";
import { Extension } from "../extension.js";

customElements.define(
  "cm-dc-editor",
  class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
          <div style="border: 1px solid gray">
          <lively-code-mirror></lively-code-mirror>
          <slot></slot></div>
        `;

      this.extensions = [];

      const livelyCM = this.shadowRoot.querySelector("lively-code-mirror");
      livelyCM.addEventListener("change", (e) => {
        if (this.initializing) return;
        SBParser.updateModelAndView(livelyCM.value, this.root);

        // TODO trigger "type" for selected node not root
        this.extensions.forEach((e) =>
          e.process(["replacement", "type", "always"], this.root)
        );
      });
    }

    static observedAttributes = ["text", "language", "extensions"];

    lastText = null;
    lastLanguage = null;
    lastExtensions = null;
    initializing = false;

    createShardFor(node) {
      // TODO
    }

    attributeChangedCallback(name, oldValue, newValue) {
      const text = this.getAttribute("text");
      const language = this.getAttribute("language");
      const extensions = this.getAttribute("extensions");

      if (
        text !== undefined &&
        text !== null &&
        language !== undefined &&
        language !== null &&
        extensions !== undefined &&
        extensions !== null &&
        (text !== this.lastText ||
          language !== this.lastLanguage ||
          extensions !== this.lastExtensions)
      ) {
        this.lastLanguage = language;
        this.lastText = text;
        this.lastExtensions = extensions;

        this.initEditor(
          text,
          language,
          extensions.split(" ").filter((n) => n.length > 0)
        );
      }
    }

    async initEditor(text, language, extensions) {
      if (this.initializing) throw new Error("overlapping initialize");
      this.initializing = true;
      const livelyCM = this.shadowRoot.querySelector("lively-code-mirror");
      livelyCM.value = text;
      // FIXME does not consider overlapping updates (async!)
      this.root = await SBParser.initModelAndView(text, language);
      await this.loadExtensions(extensions);
      this.initializing = false;
    }

    async loadExtensions(list) {
      const exts = await Promise.all(list.map((name) => Extension.get(name)));
      this.extensions = exts.map((e) => e.instance());

      this.extensions.forEach((e) =>
        e.process(["extensionConnected", "replacement", "always"], this.root)
      );
    }
  }
);
