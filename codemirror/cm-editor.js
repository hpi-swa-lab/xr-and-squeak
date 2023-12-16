import { SBParser } from '../model.js';
import { Extension } from '../extension.js';

customElements.define("cm-dc-editor", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
          <div style="border: 1px solid gray">
          <lively-code-mirror></lively-code-mirror>
          <slot></slot></div>
        `;
    
    this.extensions = []
    
    const livelyCM = this.shadowRoot.querySelector('lively-code-mirror')
    livelyCM.addEventListener("change", e => {
        SBParser.updateModelAndView(livelyCM.value, null, this.root);
        
        // TODO trigger "type" for selected node not root
        this.extensions.forEach(e => e.process(["replacement", "type", "always"], this.root))
      })
  }

  static observedAttributes = ["text", "language", "extensions"]
  
  attributeChangedCallback(name, oldValue, newValue) {
    const text = this.getAttribute("text");
    const language = this.getAttribute("language");
    // make sure both are set
    if (
      (name === 'text' || name === 'language') &&
      text !== undefined &&
      text !== null &&
      language !== undefined &&
      language !== null
    ) {
      const livelyCM = this.shadowRoot.querySelector('lively-code-mirror')
      livelyCM.value = text
      this.root = SBParser.initModelAndView(
          text,
          language,
          this.root
      );
    } else if (name === 'extensions') {
      this.loadExtensions(newValue.split(' ').filter(n => n.length > 0))
    }
  }

  async loadExtensions(list) {
    const exts = await Promise.all(list.map(name => Extension.get(name)))
    this.extensions = exts.map(e => e.instance())
    
    this.extensions.forEach(e => e.process(["extensionConnected", "replacement", "always"], this.root))
  }
})
