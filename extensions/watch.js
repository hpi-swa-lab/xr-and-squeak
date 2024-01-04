import { Extension } from "../core/extension.js";
import { socket } from "../sandblocks/host.js";
import { Replacement, h, shard } from "../view/widgets.js";

function makeWatchExtension(config) {
  return new Extension()
    .registerReplacement((e) => [
      ...config.matcher,
      (x) => e.ensureReplacement(x, "sb-js-watch", { config }),
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
  matcher: [
    (x) => x.type === "call_expression",
    (x) => x.atField("function").text === "sbWatch",
    (x) => x.atField("arguments").childBlocks.length === 2,
    (x) => x.atField("arguments")?.childBlock(0)?.type === "number",
  ],
  id: [(x) => x.atField("arguments").childBlock(1)],
  expr: [(x) => x.atField("arguments").childBlock(0)],
  exprNesting: 2,
  wrap: (x, id) => x.wrapWith("sbWatch(", `, ${id})`),
});

export const javascript = makeWatchExtension({
  matcher: [
    (x) => x.type === "subscript_expression",
    (x) => x.childBlock(0),
    (a) => a.type === "array",
    (a) => a.childBlock(0)?.childBlock(0).text === "sbWatch",
    (a) => a.parent,
  ],
  id: [
    (x) =>
      x
        .childBlock(0)
        .childBlock(1)
        .childBlock(0)
        .childBlock(0)
        .childBlock(1)
        .childBlock(0)
        .childBlock(0)
        .atField("arguments")
        .childBlock(1)
        .childBlock(1)
        .atField("value")
        .atField("arguments")
        .childBlock(0)
        .childBlock(0)
        .atField("value"),
  ],
  expr: [
    (x) => x.childBlock(0).childBlock(1).atField("arguments").childBlock(0),
  ],
  exprNesting: 4,
  wrap: (x, id) => {
    const url = `${window.location.origin}/sb-watch`;
    const headers = `headers: {"Content-Type": "application/json"}`;
    const opts = `{method: "POST", body: JSON.stringify({"id": ${id}, "e": e}), ${headers}}`;
    x.wrapWith(`['sbWatch',((e) => (fetch("${url}", ${opts}), e))(`, `)][1]`);
  },
});

customElements.define(
  "sb-js-watch",
  class extends Replacement {
    static registry = new Map();

    count = 0;
    lastValue = "";

    init(source) {
      super.init(source);
      this.watchId = parseInt(source.exec(...this.config.id).text, 10);
      window.sbWatch.registry.set(this.watchId, this);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      window.sbWatch.registry.delete(this.watchId);
    }

    update(source) {
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
            shard(source.exec(...this.config.expr))
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

socket.on("sb-watch", ({ id, e }) => window.sbWatch(e, id));
window.sbWatch = function (value, id) {
  window.sbWatch.registry.get(id)?.reportValue(value);
  return value;
};
window.sbWatch.registry = new Map();

function randomId() {
  return Math.floor(Math.random() * 1e9);
}
