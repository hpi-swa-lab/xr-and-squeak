import { Extension } from "../core/extension.js";
import { markAsEditableElement } from "../core/focus.js";
import { useState } from "../external/preact-hooks.mjs";
import { mapSeparated } from "../utils.js";
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

function DeletableShard({ node }) {
  const [hover, setHover] = useState(false);
  return h(
    "span",
    {
      onmouseenter: () => setHover(true),
      onmouseleave: () => setHover(false),
      style: { position: "relative" },
    },
    shard(node),
    hover &&
      h(
        "button",
        {
          style: { position: "absolute", top: 0, left: 0 },
          onClick: () => node.removeFull(),
        },
        "x"
      )
  );
}

function ShardArray({ elements, onInsert }) {
  let i = 0;
  const nextProps = () => {
    let index = i++;
    return { key: `insert-${i}`, onClick: () => onInsert(index) };
  };

  return [
    h(AddButton, nextProps()),
    mapSeparated(
      elements,
      (c) => h(DeletableShard, { node: c, key: c?.id }),
      () => h(AddButton, nextProps())
    ),
    elements.length > 0 && h(AddButton, nextProps()),
  ];
}

function AutoSizeTextArea({ range, value, onChange }) {
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
        ref: (current) => {
          if (current) {
            markAsEditableElement(current);
            current.range = range;
          }
        },
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

function insertModule({ insert }, i) {
  insert(i, "OragleLeafModule new");
}

export const base = new Extension()
  .registerReplacement((e) => [
    (x) => x.type === "string",
    (x) =>
      ensureReplacementPreact(e, x, "oragle-string", ({ replacement }) =>
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
        ({ children, label }) => {
          return h(
            OragleModule,
            {},
            h(
              "div",
              { style: { display: "flex", flexDirection: "column" } },
              label,
              h("hr"),
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
        ({ children }) =>
          h(
            OragleModule,
            {},
            h(
              "div",
              { style: { display: "flex", flexDirection: "column" } },
              "SCRIPT",
              h("hr"),
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
        ({ children }) =>
          h(
            OragleModule,
            {},
            h(
              "div",
              { style: { display: "flex", flexDirection: "row" } },
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
