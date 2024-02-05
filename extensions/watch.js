import { Extension } from "../core/extension.js";
import { socket } from "../sandblocks/host.js";
import { randomId } from "../utils.js";
import { Replacement, h, shard } from "../view/widgets.js";

function makeWatchExtension(config) {
  return new Extension()
    .registerReplacement((e) => [
      (x) => x.extract(config.query),
      ([x, { identifier, expr }]) =>
        e.ensureReplacement(x, "sb-watch", { config, identifier, expr }),
    ])
    .registerShortcut("wrapWithWatch", (x) => {
      let current = x;
      for (let i = 0; i < config.exprNesting; i++) current = current?.parent;

      if (current?.matches(config.query)) {
        current.viewsDo(
          (view) => view.tagName === "SB-WATCH" && (view.sticky = false)
        );
        current.replaceWith(x.sourceString);
      } else {
        config.wrap(x, randomId());
      }
    });
}

export const javascriptInline = makeWatchExtension({
  query: `sbWatch($expr, $identifier)`,
  exprNesting: 2,
  wrap: (x, id) => x.wrapWith("sbWatch(", `, ${id})`),
});

export const javascript = makeWatchExtension({
  query: `["sbWatch",
    ((e) => (
      fetch("http://localhost:3000/sb-watch", {
        method: "POST",
        body: JSON.stringify({ id: $identifier, e }),
        headers: { "Content-Type": "application/json" },
      }), e))($expr),][1]`,

  exprNesting: 4,
  wrap: (x, id) => {
    const url = `${window.location.origin}/sb-watch`;
    const headers = `headers: {"Content-Type": "application/json"}`;
    const opts = `{method: "POST", body: JSON.stringify({id: ${id}, e}), ${headers},}`;
    x.wrapWith(`["sbWatch",((e) => (fetch("${url}", ${opts}), e))(`, `),][1]`);
  },
});

customElements.define(
  "sb-watch",
  class extends Replacement {
    static registry = new Map();

    sticky = true;
    count = 0;
    lastValue = "";

    init(source) {
      super.init(source);
      this.watchId = parseInt(this.identifier.text, 10);
      window.sbWatch.registry.set(this.watchId, this);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      window.sbWatch.registry.delete(this.watchId);
    }

    update() {
      this.render(
        h(
          "div",
          {
            style: {
              padding: "0.25rem",
              background: "#333",
              display: "inline-block",
              borderRadius: "4px",
            },
          },
          shard(this.expr, { style: { padding: "0.1rem" } }),
          h(
            "div",
            { style: { color: "#fff", display: "flex", marginTop: "0.25rem" } },
            h(
              "div",
              {
                style: {
                  padding: "0.1rem 0.4rem",
                  marginRight: "0.25rem",
                  background: "#999",
                  borderRadius: "100px",
                },
              },
              this.count
            ),
            this.lastValue
          )
        )
      );
    }

    reportValue(value) {
      this.count++;
      this.lastValue = value.toString();
      this.update(this.source);
    }
  }
);

socket?.on("sb-watch", ({ id, e }) => window.sbWatch(e, id));
window.sbWatch = function (value, id) {
  sbWatch.registry.get(id)?.reportValue(value);
  return value;
};
window.sbWatch.registry = new Map();
