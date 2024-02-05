import { Extension } from "../core/extension.js";
import { choose, openComponentInWindow } from "../sandblocks/window.js";
import { h, icon, replacement, useDebouncedEffect, useJSONComparedState, Component } from "../view/widgets.js";
import { AutoSizeTextArea } from "../view/widgets/auto-size-text-area.js";
import { ShardArray } from "../view/widgets/shard-array.js";
import {
  cascadedConstructorFor,
  cascadedConstructorShardsFor,
} from "./smalltalk.js";
import { makeUUID, pluralString } from "../utils.js";
import { signal, useComputed } from "../external/preact-signals.mjs"

const cssLink = document.createElement("link");
cssLink.setAttribute("rel", "stylesheet");
cssLink.setAttribute("href", "extensions/oragle.css");
document.head.appendChild(cssLink);

const highlightedModules = signal([]);
const selectedModule = signal(null)

const formatPrice = (cents, options = {}) => {
  const minDigits = options.minDigits ?? 2;
  return cents > 100
    ? `$${(cents / 100).toFixed(minDigits)}`
    : `¢${cents.toFixed(
      cents > 0.01 || cents === 0
        ? minDigits
        : Math.min(
          Math.max(0, Math.min(-Math.floor(Math.log10(cents))), minDigits - 2),
            100
          )
      )}`;
};

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


const PromptContainer = (prompt, promptIndex) => {
  const [hoverOver, setHoverOver] = useState(false)
  const moduleIDs = prompt.modules.map(module => module.uuid);
  const shouldHighlight = useComputed(() => selectedModule.value ? moduleIDs.includes(selectedModule.value): false)

  const onEnter = () => {
    setHoverOver(true)
    highlightedModules.value = moduleIDs
  }

  const onLeave = () => {
    setHoverOver(false)
    highlightedModules.value = []
  }

  return h("div",{},...prompt.outputs.map((output, outputIndex) =>
    h("div",{
        onMouseEnter: () => onEnter(),
        onMouseLeave: () => onLeave(),
        style: {
          "color": hoverOver ? "white" : undefined,
          "background-color": hoverOver || shouldHighlight.value ? "blue": undefined
        }
      },

      // Prompt Container content
      h("strong", {}, `Prompt #${promptIndex + 1} - Output #${outputIndex + 1}`),
      h("pre", { style: { whiteSpace: "pre-wrap" } }, output)
    ))
  )
}

class OutputWindow extends Component {
  constructor(props) {
    super(props);
    this.projectId = props.projectId;

    this.state = {
      prompts: [],
      hover: false
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

    this.setState({ ...this.state, prompts })
  }

  render() {
    return h(
      "div",{style: {overflowY: "scroll"}},
        ...this.state.prompts.map((prompt, promptIndex) => PromptContainer(prompt, promptIndex))
      )
  }

  logOutputs() {
    console.group("Prompts");
    this.state.prompts.forEach((prompt, i) => {
      console.group(`Prompt #${i + 1}`);
      prompt.outputs.forEach((output, j) => {
        console.group(`Output #${j + 1}`);
        console.log(output);
        console.groupEnd();
      });
      console.groupEnd();
    });
  };
}

// TODO: remove global state - memory leak!
const allOutputWindows = {};
const allProjects = {};
const cachedProjectMetrics = {};

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
      const [bufferedMetrics, setMetrics] = useJSONComparedState(null);

      const projectId = uuid.get().replace(/'/g, "");

      const editorShard = replacement.editor?.children[0];
      const editorSourceString = editorShard?.sourceString;
      useDebouncedEffect(
        500,
        async () => {
          const editorShard = replacement.editor?.children[0];
          const editorSourceString = editorShard?.sourceString;

          // trim initial selector and optional pragmas
          const input = editorSourceString.replace(/^[^\s]+/, "").replace(/<[^>]+>/, "").trim();

          const promptsObj = await sqQuery(
            `| project |
              project := Compiler evaluate: '${sqEscapeString(input)}'.
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

          const metrics = {
            numberOfPrompts: prompts.length,
            // single number if all prompts have the same number of outputs, otherwise `null`
            defaultNumberOfOutputs: prompts.every(
              (prompt) =>
                prompt.defaultNumberOfOutputs ===
                prompts[0].defaultNumberOfOutputs
            )
              ? prompts[0]?.defaultNumberOfOutputs
              : null,
            totalPrice: totalPrice,
            totalPriceFormatted: formatPrice(totalPrice),
          };

          cachedProjectMetrics[projectId] = metrics;
          setMetrics({
            editorSourceString,
            ...metrics,
          });
        },
        [editorSourceString]
      );

      // check if we're still up-to-date
      const metrics =
        bufferedMetrics?.editorSourceString === editorSourceString
          ? bufferedMetrics
          : cachedProjectMetrics[projectId] ?? null;

      // WORKAROUND: lifecycle of replacements is too short
      const outputWindows = allOutputWindows[projectId] ??= [];

      // Project object definition
      // TODO: Refactor this
      const project = allProjects[projectId] = {
        assureOutputWindow: () => {
          for (let i = outputWindows.length - 1; i >= 0; i--) {
            const [component, window] = outputWindows[i];
            if (!document.body.contains(window)) {
              outputWindows.splice(i, 1);
            }
          }

          if (outputWindows.length) return;

          return project.openOutputWindow();
        },

        openOutputWindow: () => {
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
        },

        updateOutputWindows: async () => {
          await Promise.all(outputWindows.map(([component, window]) => component.update()))
        },
      };
      replacement.project = project;
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
              (() => {
                let metricsText;
                const button = h(
                  "button",
                  {
                    className: "oragle-project-save-button",
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

                      project.assureOutputWindow();
                      await project.updateOutputWindows();
                    },
                  },
                  icon("play_arrow"),
                  "Save",
                  metricsText = metrics
                    ? ` (${pluralString("prompt", metrics.numberOfPrompts)}${!metrics.numberOfPrompts ? `` : ` × ${
                        metrics.defaultNumberOfOutputs !== null
                          ? pluralString("output", metrics.defaultNumberOfOutputs)
                          : "<variable>"
                      }`} = ${metrics.totalPriceFormatted})`
                    : null
                );
                // force re-rendering when text changes to restart animation
                button.key = metricsText;
                return button;
              })(),
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
        uuid: { mode: "literal", default: makeUUID() },
        separator: { prefix: "'", placeholder: "separator", suffix: "'" },
        label: { prefix: "'", placeholder: "label", suffix: "'" },
        children: { mode: "array" },
      }),
    replacement(
      e,
      "oragle-sequence-module",
      ({ uuid, separator, label, children, replacement }) => {
        const moduleId = uuid.get().replace(/'/g, "");

        return h(
          OragleModule,
          { node: replacement.node, type: "OragleSequenceModule" },
          h(
            "div",
            { class: "sb-insert-button-container sb-column" },
            h(
              "span",
              {
                class: "sb-row",
                style: { justifyContent: "space-between" },
              },
              icon("table_rows"),
              label?.key && h("span", { style: { fontWeight: "bold" } }, label),
              h(
                "span",
                {
                  style: {
                    flexGrow: 1,
                    display: "flex",
                    justifyContent: "flex-end",
                  },
                },
                h(ModulePriceTag, { replacement, moduleId }),
              ),
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
        uuid: { mode: "literal", default: makeUUID() },
        children: { mode: "array" },
      }),
    replacement(e, "oragle-script-module", ({ uuid, children, replacement }) => {
      const moduleId = uuid.get().replace(/'/g, "");

      return h(
        OragleModule,
        { node: replacement.node, type: "OragleScriptModule" },
        h(
          "div",
          { class: "sb-insert-button-container sb-column" },
          h("span", { class: "sb-row" }, icon("code"), "Script"),
          h(ShardArray, {
            elements: children.elements,
            onInsert: (i) => insertModule(children, i),
          }),
          h(
            "span",
            {
              class: "sb-row",
              style: { justifyContent: "space-between" },
            },
            h(ModulePriceTag, { replacement, moduleId }),
          ),
        )
      );
    }),
  ])

  .registerReplacement((e) => [
    (x) =>
      cascadedConstructorShardsFor(x, "OragleAlternation", {
        uuid: { mode: "literal", default: makeUUID() },
        children: { mode: "array" },
      }),
    replacement(e, "oragle-alternation-module", ({ uuid, children, replacement }) => {
      const moduleId = uuid.get().replace(/'/g, "");

      return h(
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
          }),
          h(
            "span",
            {
              class: "sb-row",
              style: { justifyContent: "space-between" },
            },
            h(ModulePriceTag, { replacement, moduleId }),
          ),
        )
      );
    }),
  ])

  .registerReplacement((e) => [
    (x) =>
      cascadedConstructorShardsFor(x, "OragleLeafModule", {
        uuid: { mode: "literal", default: makeUUID() },
        label: { prefix: "'", suffix: "'", placeholder: "label" },
        content: { prefix: "'", suffix: "'", placeholder: "content" },
        state: { mode: "literal", default: "#enabled" },
      }),
    replacement(
      e,
      "oragle-leaf-module",
      ({ uuid, label, content, state, replacement }) => {
        const moduleId = uuid.get().replace(/'/g, "");

        const project = (() => {
          let node = replacement;
          while (node) {
            if (node.project) return node.project;
            node = node.parentElement;
          }
        })();

        const saveAndUpdateProject = async () => {
          const shard = replacement.editor.children[0];
          await shard.save();

          const selector = shard.sourceString.split(/\s/)[0];
          await sqQuery(`OragleProjects updateProjectNamed: #${selector}`);

          await project.updateOutputWindows();
        };
        // debugger;
        return h(
          OragleModule,
          { uuid: uuid, node: replacement.node, type: "OragleLeafModule" },
          h(
            "div",
            { class: "sb-column", id: uuid.get().slice(1, -1)},
            h(
              "span",
              {
                class: "sb-row",
                style: { justifyContent: "space-between" },
              },
              h("span", { style: { fontWeight: "bold" } }, label),
              h(ModulePriceTag, { replacement, moduleId }),
            ),
            content,
            h(
              "div",
              { class: "sb-row" },
              h(
                "button",
                {
                  class: state.get() === "#solo" && "sb-button-pressed",
                  onClick: async () => {
                    state.set(state.get() === "#solo" ? "#enabled" : "#solo");
                    await saveAndUpdateProject();
                  },
                },
                "S"
              ),
              h(
                "button",
                {
                  class: state.get() === "#mute" && "sb-button-pressed",
                  onClick: async () => {
                    state.set(state.get() === "#mute" ? "#enabled" : "#mute"),
                    await saveAndUpdateProject();
                  },
                },
                "M"
              )
            )
          )
        );
      },
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
function OragleModule({ uuid, children, node, type }) {
  const highlighted = useComputed(() => {
    if (uuid) {
      return highlightedModules.value.includes(uuid.get().slice(1,-1))
    }
    return false
  });

  return h(
    "div",
    {
      onMouseEnter: () => {
        if (uuid){
          selectedModule.value = uuid.get().slice(1,-1);
        }
      },
      onMouseLeave: () => {
        if (uuid){
          selectedModule.value = null;
        }
      },
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
        borderColor: highlighted.value == true ? "red" : undefined,
        padding: "0.5rem",
      },
    },
    children
  );
}

function insertModule({ insert }, i) {
  insert(i, `OragleLeafModule new uuid: '${makeUUID()}'`);
}

const cachedModuleMetrics = {};

function ModulePriceTag( { replacement, moduleId }) {
  const [bufferedMetrics, setMetrics] = useJSONComparedState(null);

  // As the resolved content of the module might depend on earlier script modules or configuration modules, metrics depend on the whole project
  // FIXME: Typing into one leaf module should not rebuild the entire project UI - this is NOT due to our effects but seems to come from sandblocks!
  const editorShard = replacement.editor?.children[0];
  const editorSourceString = editorShard?.sourceString;
  useDebouncedEffect(
    500,
    async () => {
      const editorShard = replacement.editor.children[0];
      const editorSourceString = editorShard.sourceString;

      // trim initial selector and optional pragmas
      const input = editorSourceString.replace(/^[^\s]+/, "").replace(/<[^>]+>/, "").trim();

      const _metrics = await sqQuery(
        `| project |
        project := Compiler evaluate: '${sqEscapeString(input)}'.
        ^ project metricsForModule: (project moduleForId: '${moduleId}')`,
        {
          "minPrice": "self minPrice maxCents",
          "maxPrice": "self maxPrice maxCents",
          "minTokens": "minTokens",
          "maxTokens": "maxTokens",
        }
      );

      _metrics.minPriceFormatted = formatPrice(_metrics.minPrice);
      _metrics.maxPriceFormatted = formatPrice(_metrics.maxPrice);
      _metrics.minPriceFormattedLong = formatPrice(_metrics.minPrice, { minDigits: 4 });
      _metrics.maxPriceFormattedLong = formatPrice(_metrics.maxPrice, { minDigits: 4 });

      cachedModuleMetrics[moduleId] = _metrics;
      setMetrics({
        editorSourceString,
        ..._metrics
      });
    },
    [editorSourceString]
  );

  const metrics =
    bufferedMetrics?.editorSourceString === editorSourceString
      ? bufferedMetrics
      : cachedModuleMetrics[moduleId] ?? null;

  const span = metrics === null
    ? null
    : h(
      "span",
      {
        className: "oragle-module-price-tag",
        title:
`Tokens: ${metrics === null
  ? "(computing...)"
  : metrics.minTokens == metrics.maxTokens
    ? `${metrics.minTokens}`
    : `${metrics.minTokens} – ${metrics.maxTokens}`}
Price for one request: ${metrics === null
  ? "(computing...)"
  : metrics.minPriceFormattedLong == metrics.maxPriceFormattedLong
    ? `${metrics.minPriceFormattedLong}`
    : `${metrics.minPriceFormattedLong} – ${metrics.maxPriceFormattedLong}`}`,
      },
      metrics.minPriceFormatted === metrics.maxPriceFormatted
       ? `${metrics.minPriceFormatted}`
       //: `${metrics.minPriceFormatted} – ${metrics.maxPriceFormatted}`
       : `≤${metrics.maxPriceFormatted}`
      );

  if (span)
    // force re-rendering when text changes to restart animation
    span.key = span.props?.children;

  return span;
}
