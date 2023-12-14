# Custome Component Example

<script>
  customElements.define(
    "custom-element",
    class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
          <div>CUSTOM ELEMENT<slot></slot></div>
        `;
      }
  })

  var pane = <div><button click={async () => {
    console.warn("CREATE----")
    var ui = await (<custom-element></custom-element>)
    console.warn("APPEND----")
    pane.appendChild(ui) 
  }}>start</button></div>


  pane
</script>