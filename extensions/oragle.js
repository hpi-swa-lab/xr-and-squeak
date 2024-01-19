import { Extension } from "../core/extension.js";
import {
  useEffect,
  useReducer,
  useRef,
  useState,
} from "../external/preact-hooks.mjs";
import { mapSeparated, withDo } from "../utils.js";
import { ensureReplacementPreact, h, shard } from "../view/widgets.js";
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

function AddButton({ onClick }) {
  return h(
    "button",
    {
      onClick,
      style: {
        background: "#eee",
        border: "1px solid #ccc",
        borderRadius: "6px",
        padding: "0 0.5rem",
      },
    },
    "+"
  );
}

function DynamicArray({ elements }) {
  return [
    h(AddButton),
    mapSeparated(
      elements,
      (c) => shard(c),
      () => h(AddButton)
    ),
    h(AddButton),
  ];
}

function AutoSizeTextArea({ value, onChange }) {
  const style = {
    padding: 0,
    lineHeight: "inherit",
    border: "none",
  };
  return h(
    "span",
    { style: { display: "inline-grid" } },
    h(
      "textarea",
      {
        rows: 1,
        style: {
          ...style,
          overflow: "hidden",
          resize: "none",
          gridArea: "1 / 1 / 2 / 2",
        },
        onInput: onChange,
      },
      value
    ),
    h(
      "span",
      {
        style: {
          ...style,
          whiteSpace: "pre-wrap",
          visibility: "hidden",
          gridArea: "1 / 1 / 2 / 2",
        },
      },
      value
    )
  );
}

export const base = new Extension()
  .registerReplacement((e) => [
    (x) => x.type === "string",
    (x) =>
      ensureReplacementPreact(e, x, "oragle-string", ({ replacement }) =>
        h(AutoSizeTextArea, {
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
        ({ children, label }) => {
          return h(
            OragleModule,
            {},
            h(
              "div",
              { style: { display: "flex", flexDirection: "column" } },
              label,
              h("hr"),
              h(DynamicArray, { elements: children.elements })
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
        ({ children }) =>
          h(
            OragleModule,
            {},
            h(
              "div",
              { style: { display: "flex", flexDirection: "column" } },
              "SCRIPT",
              h("hr"),
              h(DynamicArray, { elements: children.elements })
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
        ({ children }) =>
          h(
            OragleModule,
            {},
            h(
              "div",
              { style: { display: "flex", flexDirection: "row" } },
              h(DynamicArray, { elements: children.elements })
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
        state: { prefix: "#", suffix: "", placeholder: "enabled" },
      }),
    ([x, data]) =>
      ensureReplacementPreact(
        e,
        x,
        "oragle-leaf-module",
        ({ label, content, state }) =>
          h(
            OragleModule,
            {},
            h(
              "div",
              { style: { display: "flex", flexDirection: "column" } },
              label,
              h("hr"),
              content,
              state
            )
          ),
        data
      ),
  ]);
