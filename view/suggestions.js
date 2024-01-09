import { clamp, getSelection } from "../utils.js";

customElements.define(
  "sb-suggestions",
  class extends HTMLElement {
    connectedCallback() {
      this.classList.add("suggestions");
    }

    // node selection in the editor changed
    onSelected(selected) {
      if (selected !== this.anchor) this.remove();
    }

    use(div = null) {
      div ??= this.querySelector("div[active]");
      if (div.item.use) div.item.use(this.anchor.node);
      else this.anchor.node.replaceWith(div.item.insertText ?? div.item.label);
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
      this.setActiveIndex(newIndex);
    }

    showDetail(entry) {
      entry.querySelector(".detail").innerText =
        entry.item.detail?.replace(/\n/g, " ") ?? "";
      entry.querySelector(".detail").title = entry.item.detail;
    }

    setActiveIndex(index) {
      if (index === -1) return;

      this.entries.forEach((x) => x.removeAttribute("active"));
      const entry = this.entries[index];
      entry.setAttribute("active", "true");

      // show detail
      if (entry.item.detail) {
        this.showDetail(entry);
      } else {
        if (entry.item.fetchDetail)
          entry.item.fetchDetail().then((detail) => {
            entry.item.detail = detail;
            this.showDetail(entry);
          });
      }

      // scroll to entry
      const rect = entry.getBoundingClientRect();
      const parentRect = this.getBoundingClientRect();
      if (rect.top < parentRect.top) {
        entry.scrollIntoView({ block: "start" });
      } else if (rect.bottom > parentRect.bottom) {
        entry.scrollIntoView({ block: "end" });
      }
    }

    get active() {
      return this.isConnected;
    }

    get entries() {
      return this.querySelectorAll("div");
    }

    get activeEntry() {
      return this.querySelector("div[active]");
    }

    get activeIndex() {
      return [...this.entries].indexOf(this.activeEntry);
    }

    clear() {
      this.innerHTML = "";
      this.remove();
    }

    icon(name) {
      const span = document.createElement("span");
      span.classList.add("material-symbols-outlined");
      span.innerText = name;
      return span;
    }

    add(view, list) {
      if (list.length === 0) return;

      this.anchor = view;
      for (const item of list) {
        const entry = document.createElement("div");
        entry.item = item;
        entry.appendChild(this.icon(item.icon ?? "code"));
        entry.appendChild(
          document.createTextNode(item.label ?? item.insertText)
        );

        const detail = document.createElement("span");
        detail.className = "detail";
        entry.appendChild(detail);

        entry.addEventListener("click", () => {
          this.use(entry);
        });
        this.appendChild(entry);
      }

      this.setActiveIndex(0);
      this.show();
    }

    show() {
      this.style.display = "block";
      const rect = getSelection().getRangeAt(0).getClientRects()[0];
      this.style.top = `${rect.bottom + 5}px`;
      this.style.left = `${rect.left}px`;
      document.body.appendChild(this);
    }
  }
);
