import { Extension } from "../core/extension.js";
import { useState } from "../external/preact-hooks.mjs";
import { choose } from "../sandblocks/window.js";
import { mapSeparated } from "../utils.js";
import { ensureReplacementPreact, h, icon, shard } from "../view/widgets.js";
import { AutoSizeTextArea } from "../view/widgets/auto-size-text-area.js";
import { ShardArray } from "../view/widgets/shard-array.js";
import {
  cascadedConstructorFor,
  cascadedConstructorShardsFor,
} from "./smalltalk.js";

// Container component for modules that supports wrapping / unwrapping
// children of that module.
function OragleModule({ children, node, type }) {
  return h(
    "div",
    {
      oncontextmenu: async (e) => {
        e.stopPropagation();
        e.preventDefault();
        (
          await choose([
            {
              label: "Wrap in Sequence",
              action: () =>
                node.wrapWith("OragleSequenceModule new children: {", "}"),
            },
            {
              label: "Wrap in Alternative",
              action: () =>
                node.wrapWith("OragleAlternation new children: {", "}"),
            },
            {
              label: "Unwrap children",
              action: () => {
                const {
                  messages: { children },
                } = cascadedConstructorFor(
                  node.findQuery(`${type} new`).root,
                  type
                );
                if (children)
                  node.replaceWith(
                    children.childBlocks.map((c) => c.sourceString).join(". ")
                  );
                else node.removeFull();
              },
            },
          ])
        )?.action();
      },
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

function insertModule({ insert }, i) {
  insert(i, "OragleLeafModule new");
}

export const base = new Extension()

  // String as a textarea: supports copy-paste without escaping
  .registerReplacement((e) => [
    (x) => x.type === "string",
    (x) =>
      ensureReplacementPreact(e, x, "oragle-string", ({ replacement }) =>
        // TODO need to translate range select requests by delimiters and escapes
        h(AutoSizeTextArea, {
          range: replacement.node.range,
          value: replacement.node.sourceString.slice(1, -1).replace(/''/g, "'"),
          onChange: (e) =>
            replacement.node.replaceWith(
              "'" + e.target.value.replace(/'/g, "''") + "'"
            ),
        })
      ),
  ])

  .registerReplacement((e) => [
    (x) =>
      cascadedConstructorShardsFor(x, "OragleSequenceModule", {
        separator: { prefix: "'", placeholder: "separator", suffix: "'" },
        label: { prefix: "'", placeholder: "label", suffix: "'" },
        children: { mode: "array" },
      }),
    ([x, data]) =>
      ensureReplacementPreact(
        e,
        x,
        "oragle-sequence-module",
        ({ children, label, replacement }) => {
          return h(
            OragleModule,
            { node: replacement.node, type: "OragleSequenceModule" },
            h(
              "div",
              { class: "sb-insert-button-container sb-column" },
              h(
                "span",
                { class: "sb-row" },
                icon("table_rows"),
                h("span", { style: { fontWeight: "bold" } }, label)
              ),
              h(ShardArray, {
                elements: children.elements,
                onInsert: (i) => insertModule(children, i),
              })
            )
          );
        },
        data
      ),
  ])

  .registerReplacement((e) => [
    (x) =>
      cascadedConstructorShardsFor(x, "OragleScriptModule", {
        children: { mode: "array" },
      }),
    ([x, data]) =>
      ensureReplacementPreact(
        e,
        x,
        "oragle-script-module",
        ({ children, replacement }) =>
          h(
            OragleModule,
            { node: replacement.node, type: "OragleScriptModule" },
            h(
              "div",
              { class: "sb-insert-button-container sb-column" },
              h("span", { class: "sb-row" }, icon("code"), "Script"),
              h(ShardArray, {
                elements: children.elements,
                onInsert: (i) => insertModule(children, i),
              })
            )
          ),
        data
      ),
  ])

  .registerReplacement((e) => [
    (x) =>
      cascadedConstructorShardsFor(x, "OragleAlternation", {
        children: { mode: "array" },
      }),
    ([x, data]) =>
      ensureReplacementPreact(
        e,
        x,
        "oragle-alternation-module",
        ({ children, replacement }) =>
          h(
            OragleModule,
            { node: replacement.node, type: "OragleAlternation" },
            h(
              "div",
              { class: "sb-insert-button-container sb-row" },
              icon("alt_route"),
              h(ShardArray, {
                elements: children.elements,
                onInsert: (i) => insertModule(children, i),
              })
            )
          ),
        data
      ),
  ])

  .registerReplacement((e) => [
    (x) =>
      cascadedConstructorShardsFor(x, "OragleLeafModule", {
        label: { prefix: "'", suffix: "'", placeholder: "label" },
        content: { prefix: "'", suffix: "'", placeholder: "content" },
        state: { mode: "literal", default: "#enabled" },
      }),
    ([x, data]) =>
      ensureReplacementPreact(
        e,
        x,
        "oragle-leaf-module",
        ({ label, content, state, replacement }) =>
          h(
            OragleModule,
            { node: replacement.node, type: "OragleLeafModule" },
            h(
              "div",
              { class: "sb-column" },
              h("span", { style: { fontWeight: "bold" } }, label),
              content,
              h(
                "div",
                { class: "sb-row" },
                h(
                  "button",
                  {
                    class: state.get() === "#solo" && "sb-button-pressed",
                    onClick: () =>
                      state.set(state.get() === "#solo" ? "#enabled" : "#solo"),
                  },
                  "S"
                ),
                h(
                  "button",
                  {
                    class: state.get() === "#mute" && "sb-button-pressed",
                    onClick: () =>
                      state.set(state.get() === "#mute" ? "#enabled" : "#mute"),
                  },
                  "M"
                )
              )
            )
          ),
        data,
        { selectable: true }
      ),
  ]);
