import { Extension } from "../core/extension.js";
import { choose, openComponentInWindow } from "../sandblocks/window.js";
import { h, icon, replacement, useDebouncedEffect } from "../view/widgets.js";
import { AutoSizeTextArea } from "../view/widgets/auto-size-text-area.js";
import { ShardArray } from "../view/widgets/shard-array.js";
import {
  cascadedConstructorFor,
  cascadedConstructorShardsFor,
} from "./smalltalk.js";
import { makeUUID, pluralString } from "../utils.js";
import { Component } from "../external/preact.mjs";
import { useEffect, useState } from "../external/preact-hooks.mjs";

const parseSqArray = (obj) => {
  if (Array.isArray(obj)) return obj; // this happens on subsequent sqUpdate calls

  const arr = new Array(
    Math.max(
      0,
      Math.max(
        ...Object.keys(obj)
          .map((k) => parseInt(k))
          .filter((i) => !isNaN(i))
      )
    )
  );
  for (const [k, v] of Object.entries(obj)) {
    if (!isNaN(parseInt(k))) arr[k - 1] = v;
  }
  return arr;
};

class OutputWindow extends Component {
  constructor(props) {
    super(props);
    this.projectId = props.projectId;

    this.state = {
      prompts: []
    }
  }

  async update() {
    const promptsObj = await sqQuery(`OragleProjects promptsForProjectId: '${this.projectId}'`,{
      "[]": {
        modules: [{
          "[]": ["uuid"],
        }],
        outputs: `outputs`,
      },
    });
    const prompts = parseSqArray(promptsObj);
    prompts.forEach((prompt) => {
      prompt.modules &&= parseSqArray(prompt.modules);
      prompt.outputs &&= parseSqArray(prompt.outputs);
    });

    this.setState({ prompts })
  }

  render() {
    return h(
      "div",
      {
        style: {
          overflowY: "scroll",
        },
      },
      ...this.state.prompts.map((prompt, promptIndex) =>
        h(
          "div",
          { },
          ...prompt.outputs.map((output, outputIndex) =>
            h(
              "div",
              {},
              h("div", {}, `Prompt #${promptIndex + 1} - Output #${outputIndex + 1}`),
              h("pre", { style: { whiteSpace: "pre-wrap" } }, output)
            ))
        ))
    );
  }
}

const allOutputWindows = {};

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
        // TODO @ tom: avoid naming clashes with default props (we wanted to capture instvar named 'id' or 'key' here, but it clashes with default props)
        uuid: { mode: "literal", default: makeUUID() },
        label: { prefix: "'", placeholder: "label", suffix: "'" },
        rootModule: { default: `OragleSequenceModule new uuid: '${makeUUID()}'` },
      }),
    replacement(e, "oragle-project", ({ uuid, label, rootModule, replacement }) => {
      const [bufferedMetrics, setMetrics] = useState(null);
      const [promptsObj, setPromptsObj] = useState(null);

      useDebouncedEffect(
        500,
        async () => {
          // TODO: get rid of separate compilation?; support token counting/price estimation per module
          const input = sqEscapeString(replacement.sourceString);
          const promptsObj = await sqQuery(
            `| project |
              project := Compiler evaluate: '${input}'.
              project expand.
          `,
            {
              "[]": {
                input: "input",
                defaultNumberOfOutputs: "defaultNumberOfOutputs",
                priceToGenerateOutputs: ["maxCents"],
              },
            }
          );

          const prompts = parseSqArray(promptsObj);

          const totalPrice = prompts.reduce(
            (acc, prompt) => acc + prompt.priceToGenerateOutputs.maxCents,
            0
          );

          setPromptsObj(promptsObj);
          setMetrics({
            sourceString: replacement.sourceString,
            numberOfPrompts: prompts.length,
            // single number if all prompts have the same number of outputs, otherwise `null`
            defaultNumberOfOutputs: prompts.every(
              (prompt) =>
                prompt.defaultNumberOfOutputs ===
                prompts[0].defaultNumberOfOutputs
            )
              ? prompts[0].defaultNumberOfOutputs
              : null,
            totalPrice: totalPrice,
            totalPriceFormatted:
              totalPrice > 100
                ? `$${(totalPrice / 100).toFixed(2)}`
                : `¢${totalPrice.toFixed(
                    totalPrice > 0.01 || totalPrice === 0
                      ? 2
                      : Math.min(
                          Math.max(0, -Math.floor(Math.log10(totalPrice))),
                          100
                        )
                  )}`,
          });
        },
        [replacement.sourceString]
      );

      // check if we're still up-to-date
      const metrics =
        bufferedMetrics?.sourceString === replacement.sourceString
          ? bufferedMetrics
          : null;

      const projectId = uuid.get().replace(/'/g, "");
      // WORKAROUND: lifecycle of replacements is too short
      const outputWindows = allOutputWindows[projectId] ??= [];

      const assureOutputWindow = () => {
        for (let i = outputWindows.length - 1; i >= 0; i--) {
          const [component, window] = outputWindows[i];
          if (!document.body.contains(window)) {
            outputWindows.splice(i, 1);
          }
        }

        if (outputWindows.length) return;

        return openOutputWindow();
      };

      const openOutputWindow = () => {
        const [component, window] = openComponentInWindow(
          OutputWindow,
          { projectId },
          {
            doNotStartAttached: true,
            initialPosition: { x: 210, y: 10 },
            initialSize: { x: 300, y: 400 },
          }
        );
        outputWindows.push([component, window]);
        return [component, window];
      };

      const updateOutputWindows = async () => {
        await Promise.all(outputWindows.map(([component, window]) => component.update()))
      };

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
                    if (metrics) {
                      // price has been seen by user, so we can use it
                    } else {
                      if (
                        !confirm(
                          `About to spend ${
                            metrics.totalPriceFormatted
                          } to generate ${metrics.numberOfPrompts} prompts × ${
                            metrics.defaultNumberOfOutputs ?? "<variable>"
                          } outputs. Continue?`
                        )
                      )
                        return;
                    }

                    const shard = replacement.editor.children[0];
                    await shard.save();

                    const selector = shard.sourceString.split(/\s/)[0];
                    await sqQuery(`OragleProjects updateProjectNamed: #${selector} approvedPrice: ${metrics.totalPrice}`);

                    assureOutputWindow();
                    await updateOutputWindows();

                    /* await promptsObj._sqUpdateQuery({
                      "[]": {
                        outputs: `self approvedPrice: ${metrics.totalPrice}; assureOutputs`,
                      },
                    });
                    const prompts = parseSqArray(promptsObj);
                    prompts.forEach((prompt) => {
                      prompt.outputs &&= parseSqArray(prompt.outputs);
                    });

                    const logOutputs = (prompts) => {
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
                    };

                    const showOutputs = async (prompts) => {
                      openComponentInWindow(
                        OutputExplorer,
                        { prompts },
                        {
                          doNotStartAttached: true,
                          initialPosition: { x: 10, y: 10 },
                          initialSize: { x: 300, y: 400 },
                        }
                      );
                    };

                    logOutputs(prompts);
                    await showOutputs(prompts); */
                  },
                },
                icon("play_arrow"),
                "Save",
                metrics
                  ? ` (${pluralString("prompt", metrics.numberOfPrompts)} × ${
                      metrics.defaultNumberOfOutputs !== null
                        ? pluralString("output", metrics.defaultNumberOfOutputs)
                        : "<variable>"
                    } = ${metrics.totalPriceFormatted})`
                  : null
              )
            )
          ),
          // FIXME: [low] should not display brackets (`()`) around the root module
          rootModule
        )
      );
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
              alignItems: "start",
            },
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
          action: () => node.wrapWith(`${cls} new uuid: '${makeUUID()}'; children: {`, "}"),
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
  insert(i, `OragleLeafModule new uuid: '${makeUUID()}'`);
}
