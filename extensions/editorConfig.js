import { useState } from "../external/preact-hooks.mjs";
import { Extension } from "../core/extension.js";
import { Replacement, shard, div, table, td, tr, h } from "../view/widgets.js";

function KeyInputPrompt({ node, onClose }) {
  const style = {
    position: "fixed",
    background: "rgba(255, 255, 255, 0.9)",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
  };
  return h("div", { style }, [
    "Press a shortcut.",
    h("input", {
      ref: (e) => e && e.focus(),
      value: node.text,
      onkeydown: (e) => {
        e.stopPropagation();
        e.preventDefault();

        // FIXME not a good heuristic
        if (e.key.length === 1) {
          let key = "";
          key += e.ctrlKey ? "Ctrl-" : "";
          key += e.altKey ? "Alt-" : "";
          key += e.key;
          node.replaceWith(`"${key}"`);
          onClose();
        }
      },
    }),
  ]);
}

function ConfigurableKey({ node }) {
  const [pending, setPending] = useState(false);

  return [
    td(node.type === "string" ? node.childBlock(0).text : shard(node)),
    td(h("button", { title: "Choose", onclick: () => setPending(true) }, "o")),
    pending && h(KeyInputPrompt, { node, onClose: () => setPending(false) }),
  ];
}

customElements.define(
  "sb-editor-config",
  class extends Replacement {
    update(node) {
      this.render(
        div(
          h("h3", {}, "Key Map"),
          table(
            node
              .atField("arguments")
              .childBlock(0)
              .childBlocks.map((pair) =>
                tr(
                  td(pair.atField("key").text),
                  h(ConfigurableKey, { node: pair.atField("value") })
                )
              )
          )
        )
      );
    }
  }
);

export const base = new Extension().registerReplacement((e) => [
  (x) => x.type === "call_expression",
  (x) => !!x.atField("function").editor,
  (x) => x.atField("function").sourceString === "Editor.registerKeyMap",
  (x) => e.ensureReplacement(x, "sb-editor-config"),
]);
