import { Extension } from "../core/extension.js";
import { ensureReplacementPreact } from "../view/widgets.js";
import { cascadedConstructorShardsFor } from "./smalltalk.js";

function OragleModule({ children }) {
  return h(
    "div",
    {
      style: {
        display: "inline-flex",
        border: "2px solid #333",
        borderRadius: "6px",
        padding: "0.5rem",
      },
    },
    children
  );
}

export const base = new Extension().registerReplacement((e) => [
  (x) =>
    cascadedConstructorShardsFor(x, "OragleSequenceModule", {
      separator: { prefix: "'", placeholder: "separator", suffix: "'" },
      children: { prefix: "{", suffix: "}" },
    }),
  (x) =>
    ensureReplacementPreact(e, x, "oragle-sequence-module", ({ children }) =>
      h(
        OragleModule,
        {},
        h(
          "div",
          { style: { display: "flex", flexDirection: "column" } },
          children
        )
      )
    ),
]);
