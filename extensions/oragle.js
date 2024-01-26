import { Extension } from "../core/extension.js";
import { choose } from "../sandblocks/window.js";
import { h, icon, replacement } from "../view/widgets.js";
import { AutoSizeTextArea } from "../view/widgets/auto-size-text-area.js";
import { ShardArray } from "../view/widgets/shard-array.js";
import {
  cascadedConstructorFor,
  cascadedConstructorShardsFor,
} from "./smalltalk.js";

export const base = new Extension()

  // String as a textarea: supports copy-paste without escaping
  .registerReplacement((e) => [
    (x) => x.type === "string",
    replacement(e, "oragle-string", ({ replacement }) =>
      // TODO need to translate range select requests by delimiters and escapes
      h(AutoSizeTextArea, {
        node: replacement.node,
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
      cascadedConstructorShardsFor(x, "OragleProject", {
        label: { prefix: "'", placeholder: "label", suffix: "'" },
        rootModule: { default: "OragleSequenceModule new" },
      }),
    replacement(e, "oragle-project", ({ label, rootModule, replacement }) =>
      h(
        OragleProject,
        { node: replacement.node, type: "OragleProject" },
        h(
          "div",
          { class: "sb-column" },
          h(
            "span",
            { class: "sb-row" },
            icon("draft"),
            h("span", { style: { fontWeight: "bold" } }, label),
            h(
              "span",
              {
                style: {
                  flexGrow: 1,
                  display: "flex",
                  justifyContent: "flex-end",
                },
              },
              h(
                "button",
                {
                  style: {
                    padding: "0.25rem 0.5rem",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    border: "1px solid #333",
                    borderRadius: "6px",
                  },
                  onClick: async () => {
                    const promptsObj = await sqQuery(`
                      | project |
                      project := Compiler evaluate: '${sqEscapeString(replacement.sourceString)}'.
                      project expand.
                    `, {"[]": {"input": null, "outputs": "self assureOutputs"}});
                    const parseSqArray = (obj) => {
                      const arr = new Array(Math.min(0, Math.max(...Object.keys(obj).map(k => parseInt(k)).filter(i => !isNaN(i)))));
                      for (const [k, v] of Object.entries(obj)) {
                        if (!isNaN(parseInt(k))) arr[k - 1] = v;
                      }
                      return arr;
                    }
                    const prompts = parseSqArray(promptsObj);
                    prompts.forEach(prompt => {
                      prompt.outputs &&= parseSqArray(prompt.outputs);
                    });

                    console.group("Prompts");
                    prompts.forEach((prompt, i) => {
                      console.group(`Prompt #${i + 1}`);
                      prompt.outputs.forEach((output, j) => {
                        console.group(`Output #${j + 1}`);
                        console.log(output);
                        console.groupEnd();
                      });
                      console.groupEnd();
                    });
                  },
                },
                icon("play_arrow"),
              )
            )
          ),
          // FIXME: [low] should not display brackets (`()`) around the root module
          rootModule,
        )
      )
    ),
  ])

  .registerReplacement((e) => [
    (x) =>
      cascadedConstructorShardsFor(x, "OragleSequenceModule", {
        separator: { prefix: "'", placeholder: "separator", suffix: "'" },
        label: { prefix: "'", placeholder: "label", suffix: "'" },
        children: { mode: "array" },
      }),
    replacement(
      e,
      "oragle-sequence-module",
      ({ separator, label, children, replacement }) => {
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
              label?.key && h("span", { style: { fontWeight: "bold" } }, label)
            ),
            h(ShardArray, {
              elements: children.elements,
              onInsert: (i) => insertModule(children, i),
            })
          )
        );
      }
    ),
  ])

  .registerReplacement((e) => [
    (x) =>
      cascadedConstructorShardsFor(x, "OragleScriptModule", {
        children: { mode: "array" },
      }),
    replacement(e, "oragle-script-module", ({ children, replacement }) =>
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
      )
    ),
  ])

  .registerReplacement((e) => [
    (x) =>
      cascadedConstructorShardsFor(x, "OragleAlternation", {
        children: { mode: "array" },
      }),
    replacement(e, "oragle-alternation-module", ({ children, replacement }) =>
      h(
        OragleModule,
        { node: replacement.node, type: "OragleAlternation" },
        h(
          "div",
          {
            class: "sb-insert-button-container sb-row",
            style: {
              alignItems: "start"
            }
          },
          icon("alt_route"),
          h(ShardArray, {
            elements: children.elements,
            onInsert: (i) => insertModule(children, i),
          })
        )
      )
    ),
  ])

  .registerReplacement((e) => [
    (x) =>
      cascadedConstructorShardsFor(x, "OragleLeafModule", {
        label: { prefix: "'", suffix: "'", placeholder: "label" },
        content: { prefix: "'", suffix: "'", placeholder: "content" },
        state: { mode: "literal", default: "#enabled" },
      }),
    replacement(
      e,
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
      { selectable: true }
    ),
  ]);

function OragleProject({ children }) {
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

// Container component for modules that supports wrapping / unwrapping
// children of that module.
function OragleModule({ children, node, type }) {
  return h(
    "div",
    {
      oncontextmenu: (e) => {
        e.stopPropagation();
        e.preventDefault();

        const wrapItem = (name, cls) => ({
          label: `Wrap in ${name}`,
          action: () => node.wrapWith(`${cls} new children: {`, "}"),
        });

        choose([
          wrapItem("Sequence", "OragleSequenceModule"),
          wrapItem("Alternative", "OragleAlternation"),
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
        ]).then((a) => a?.action());
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
