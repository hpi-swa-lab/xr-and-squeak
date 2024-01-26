import { Extension } from "../core/extension.js";
import { socket } from "../sandblocks/host.js";
import { Replacement, h, shard } from "../view/widgets.js";

function makeWatchExtension(config) {
  return new Extension()
    .registerReplacement((e) => [
      (x) => x.extract(config.query),
      ([x, { id, expr }]) =>
        e.ensureReplacement(x, "sb-watch", { config, id, expr }),
    ])
    .registerShortcut("wrapWithWatch", (x) => {
      let current = x;
      for (let i = 0; i < config.exprNesting; i++) current = current?.parent;

      const currentWatch = current?.exec(...config.matcher);
      if (currentWatch) {
        currentWatch.replaceWith(x.sourceString);
      } else {
        config.wrap(x, randomId());
      }
    });
}

export const javascriptInline = makeWatchExtension({
  query: `sbWatch($expr, $id)`,
  exprNesting: 2,
  wrap: (x, id) => x.wrapWith("sbWatch(", `, ${id})`),
});

export const javascript = makeWatchExtension({
  query: `["sbWatch",
    ((e) => (
      fetch("http://localhost:3000/sb-watch", {
        method: "POST",
        body: JSON.stringify({ id: $id, e: e }),
        headers: { "Content-Type": "application/json" },
      }), e))($expr),][1]`,
  exprNesting: 4,
  wrap: (x, id) => {
    const url = `${window.location.origin}/sb-watch`;
    const headers = `headers: {"Content-Type": "application/json"}`;
    const opts = `{method: "POST", body: JSON.stringify({"id": ${id}, "e": e}), ${headers}}`;
    x.wrapWith(`['sbWatch',((e) => (fetch("${url}", ${opts}), e))(`, `)][1]`);
  },
});

customElements.define(
  "sb-watch",
  class extends Replacement {
    static registry = new Map();

    count = 0;
    lastValue = "";

    init(source) {
      super.init(source);
      this.watchId = parseInt(this.id.text, 10);
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
          h(
            "div",
            { style: { background: "#fff", padding: "0.1rem" } },
            shard(this.expr)
          ),
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
  window.sbWatch.registry.get(id)?.reportValue(value);
  return value;
};
window.sbWatch.registry = new Map();

function randomId() {
  return Math.floor(Math.random() * 1e9);
}
