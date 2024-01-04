import { clamp } from "../utils.js";

customElements.define(
  "sb-suggestions",
  class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            position: absolute;
            z-index: 100;
            background: #f5f5f5;
            color: #000;
            padding: 0.25rem;
            border-radius: 0.25rem;
            white-space: nowrap;
            cursor: pointer;
            user-select: none;
            font-family: monospace;
            line-height: 1.5;
            box-shadow: 0 3px 15px rgba(0, 0, 0, 0.3);
            border: 1px solid #aaa;
            min-width: 200px;
            display: none;
          }
          #entries > div[active] {
            background: #ceddfe;
            border-radius: 0.25rem;
          }
          #entries > div {
            padding: 0.15rem 1rem;
          }
        </style>
        <div id="entries"><slot></slot></div>
      `;
    }

    onSelected(selected) {
      if (selected !== this.anchor) this.remove();
    }

    use() {
      this.anchor.node.replaceWith(
        this.shadowRoot.querySelector("div[active]").textContent
      );
    }

    canMove(delta) {
      if (!this.active) return false;
      const index = this.activeIndex;
      if (index === -1) return false;
      return index + delta >= 0 && index + delta < this.entries.length;
    }

    moveSelected(delta) {
      const index = this.activeIndex;
      if (index === -1) return;
      const newIndex = clamp(index + delta, 0, this.entries.length - 1);
      this.entries[index].removeAttribute("active");
      this.entries[newIndex].setAttribute("active", "true");
    }

    get active() {
      return this.isConnected;
    }

    get entries() {
      return this.shadowRoot.querySelector("#entries").querySelectorAll("div");
    }

    get activeEntry() {
      return this.shadowRoot.querySelector("div[active]");
    }

    get activeIndex() {
      return [...this.entries].indexOf(this.activeEntry);
    }

    clear() {
      this.shadowRoot.querySelector("#entries").innerHTML = "";
      this.remove();
    }

    add(view, list) {
      if (list.length === 0) return;

      this.anchor = view;
      for (const item of list) {
        const entry = document.createElement("div");
        entry.textContent = item;
        entry.addEventListener("click", () => {
          this.dispatchEvent(new CustomEvent("select", { detail: item }));
        });
        this.shadowRoot.querySelector("#entries").appendChild(entry);
      }
      this.entries[0].setAttribute("active", "true");
      this.shadowRoot.host.style.display = "block";
      const rect = view.getBoundingClientRect();
      this.shadowRoot.host.style.top = `${rect.bottom + 5}px`;
      this.shadowRoot.host.style.left = `${rect.left}px`;
      document.body.appendChild(this);
    }
  }
);
