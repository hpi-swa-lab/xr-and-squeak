import { Extension, ensureReplacement, Replacement } from "./extension.js";

customElements.define(
  "sb-watch",
  class Watch extends Replacement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<span>WATCH[</span><slot></slot><span>]WATCH</span>`;
    }

    init(source) {
      super.init(source);
      this.appendChild(this.createShard((source) => source.childNode(0)));
    }
  }
);

Extension.register(
  "smalltalkBase",
  new Extension()
    .registerQuery("always", [
      (x) => true,
      (x) => x.type === "unary_message",
      (x) => x.childNode(1).text === "sbWatch",
      (x) => ensureReplacement(x, "sb-watch"),
    ])
    .registerQuery("always", [])
);
