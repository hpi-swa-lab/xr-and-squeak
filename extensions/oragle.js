import { Extension } from "../core/extension.js";
import { choose } from "../sandblocks/window.js";
import { h, icon, replacement } from "../view/widgets.js";
import { AutoSizeTextArea } from "../view/widgets/auto-size-text-area.js";
import { ShardArray } from "../view/widgets/shard-array.js";
import {
  cascadedConstructorFor,
  cascadedConstructorShardsFor,
} from "./smalltalk.js";
import { pluralString } from "../utils.js";
import { useState, useEffect } from "../external/preact-hooks.mjs";

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
    replacement(e, "oragle-project", ({ label, rootModule, replacement }) => {
      const [metrics, setMetrics] = useState(0);

      const asyncPromptObj = (async () => {
        // TODO: debounce!
        // FIXME: this is just to keep at least short inputs responsive ... no debounce yet
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await sqQuery(
          `
          | project |
          project := Compiler evaluate: '${sqEscapeString(replacement.sourceString)}'.
          project expand.
          `,
          {
            '[]': {
              input: 'input',
              defaultNumberOfOutputs: 'defaultNumberOfOutputs',
              priceToGenerateOutputs: ['maxCents']
            }
          });
      })();
      const parseSqArray = (obj) => {
        const arr = new Array(Math.max(0, Math.max(...Object.keys(obj).map(k => parseInt(k)).filter(i => !isNaN(i)))));
        for (const [k, v] of Object.entries(obj)) {
          if (!isNaN(parseInt(k))) arr[k - 1] = v;
        }
        return arr;
      };
      const asyncMetrics = (async () => {
        const promptsObj = await asyncPromptObj;
        const prompts = parseSqArray(promptsObj);

        const totalPrice = prompts.reduce((acc, prompt) => acc + prompt.priceToGenerateOutputs.maxCents, 0);
        return {
          numberOfPrompts: prompts.length,
          defaultNumberOfOutputs: // single number if all prompts have the same number of outputs, otherwise `null`
            prompts.every(prompt => prompt.defaultNumberOfOutputs === prompts[0].defaultNumberOfOutputs)
              ? prompts[0].defaultNumberOfOutputs
              : null,
          totalPrice: totalPrice,
          totalPriceFormatted: totalPrice > 100
            ? `$${(totalPrice / 100).toFixed(2)}`
            : `¢${totalPrice.toFixed(
              totalPrice > 0.01 || totalPrice === 0
                ? 2
                : Math.min(Math.max(0, -Math.floor(Math.log10(totalPrice))), 100)
            )}`
        };
      })();
      useEffect(async () => {
        setMetrics(await asyncMetrics);
      });

      return h(
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
                    const promptsObj = await asyncPromptObj;
                    if (metrics) {
                      // price has been seen by user, so we can use it
                    } else {
                      const metrics = await asyncMetrics;
                      if (!confirm(`About to spend ${metrics.totalPriceFormatted} to generate ${metrics.numberOfPrompts} prompts × ${metrics.defaultNumberOfOutputs ?? "<variable>"} outputs. Continue?`)) return;
                    }

                    await promptsObj._sqUpdateQuery({
                      '[]': {
                        'outputs': `self approvedPrice: ${metrics.totalPrice}; assureOutputs`,
                      }
                    });
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
                "Generate",
                metrics
                  ? ` (${
                    pluralString("prompt", metrics.numberOfPrompts)
                  } × ${
                    metrics.defaultNumberOfOutputs !== null
                      ? pluralString("output", metrics.defaultNumberOfOutputs)
                      : "<variable>"
                  } = ${
                    metrics.totalPriceFormatted
                  })`
                  : null
              )
            )
          ),
          // FIXME: [low] should not display brackets (`()`) around the root module
          rootModule,
        )
      )
    }),
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
