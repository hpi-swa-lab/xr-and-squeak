import { Extension } from "../core/extension.js";
import { markAsEditableElement } from "../core/focus.js";
import { useState } from "../external/preact-hooks.mjs";
import { choose } from "../sandblocks/window.js";
import { mapSeparated } from "../utils.js";
import { ensureReplacementPreact, h, icon, shard } from "../view/widgets.js";
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

function Dropdown({ choices, value, onChange }) {
  return h(
    "button",
    {
      onClick: async () => {
        const choice = await choose(choices, (v) => v.label);
        if (choice) onChange?.(choice.value);
      },
    },
    choices.find((c) => c.value === value).label
  );
}

function DeletableShard({ node }) {
  const [hover, setHover] = useState(false);
  return h(
    "span",
    {
      onmouseenter: () => setHover(true),
      onmouseleave: () => setHover(false),
      class: "sb-deletable-shard",
    },
    shard(node),
    hover &&
      h(
        "button",
        {
          class: "sb-delete-button",
          onClick: () => node.removeFull(),
          title: "Delete",
        },
        "x"
      )
  );
}

function AddButton({ onClick }) {
  return h(
    "span",
    { class: "sb-insert-button-anchor" },
    h("button", { onClick, class: "sb-insert-button" }, "+")
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
    fontWeight: "inherit",
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
        onInput: (e) => {
          const range = [e.target.selectionStart, e.target.selectionEnd];
          onChange(e);
          e.target.selectionStart = range[0];
          e.target.selectionEnd = range[1];
        },
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
        ({ children, label }) => {
          return h(
            OragleModule,
            {},
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
        ({ children }) =>
          h(
            OragleModule,
            {},
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
        ({ children }) =>
          h(
            OragleModule,
            {},
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
        ({ label, content, state }) =>
          h(
            OragleModule,
            {},
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
        data
      ),
  ]);
