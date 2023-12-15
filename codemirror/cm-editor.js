import { SBParser } from '../model.js';

customElements.define("cm-dc-editor", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
          <div style="border: 1px solid gray">
          <lively-code-mirror></lively-code-mirror>
          <slot></slot></div>
        `;
  }

  static observedAttributes = ["text", "language"]
  
  attributeChangedCallback() {
    const text = this.getAttribute("text");
    const language = this.getAttribute("language");
    // make sure both are set
    if (
      text !== undefined &&
      text !== null &&
      language !== undefined &&
      language !== null
    ) {
      const livelyCM = this.shadowRoot.querySelector('lively-code-mirror')
      livelyCM.value = text
      livelyCM.addEventListener("change", e => {
        SBParser.updateModelAndView(livelyCM.value, null, this.root);
        
        // TODO process extensions, which will update the shards as well
      })
      
      this.root = SBParser.initModelAndView(
          text,
          language,
          this.root
      );
    }
  }
})
