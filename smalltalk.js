import { Extension, ensureReplacement, Replacement } from "./extension.js";

customElements.define(
  "sb-watch",
  class Watch extends Replacement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<span>WATCH</span>`;
    }

    init(source) {
      super.init(source);
      this.shadowRoot.appendChild(
        this.createShard((source) => nodeChildNode(source, 0))
      );
    }
  }
);

Extension.register(
  "smalltalkBase",
  new Extension()
    .registerQuery("always", [
      (x) => {
        debugger;
        return x.type === "unary_message";
      },
      (x) => x.children.text === "sbWatch",
      (x) => ensureReplacement(x, "sb-watch"),
    ])
    .registerQuery("always", [])
);
