import { Extension } from "../core/extension.js";
import { useEffect, useMemo, useState } from "../external/preact-hooks.mjs";
import { mapSeparated } from "../utils.js";
import { button, ensureReplacementPreact, h, shard } from "../view/widgets.js";
import { chat, complete } from "./copilot.js";

function selectorAndArgs(node) {
  return {
    selector: node.childBlocks
      .filter((s) =>
        ["keyword", "binary_operator", "unary_identifier"].includes(s.type)
      )
      .map((s) => s.sourceString)
      .join(""),
    arguments: node.childBlocks.filter(
      (s) => s.compatibleWith("expression") && s.field !== "receiver"
    ),
  };
}

function cascadedMessages(cascade) {
  return [cascade.childBlock(0), ...cascade.childBlocks.slice(1)].map(
    selectorAndArgs
  );
}

// assumes cascade of unique one-arg messages
function cascadeToMap(cascade) {
  return cascadedMessages(cascade).reduce(
    (acc, { selector, arguments: [arg] }) => {
      acc[selector.replace(":", "")] = arg;
      return acc;
    },
    {}
  );
}

export const base = new Extension()
  .registerReplacement((e) => [
    (x) => x.query("$name := $constructor"),
    ({ constructor }) => constructor.type === "cascade",
    ({ constructor }) =>
      constructor.childBlock(0).childBlock(0).matches("Lane new"),
    ({ name }) =>
      ensureReplacementPreact(e, name.parent, "sb-rag-lane", ({ node }) =>
        h(
          "span",
          {
            style: {
              display: "inline-block",
              border: "2px solid #333",
              borderRadius: "2px",
              padding: "0.25rem",
            },
          },
          shard(node.childBlock(0)),
          h("hr"),
          mapSeparated(
            cascadedMessages(node.childBlock(1)),
            ({ arguments: [arg] }) => shard(arg),
            () => h("br")
          )
        )
      ),
  ])
  .registerReplacement((e) => [
    (x) => x.matches("Module new"),
    (x) => x.orParentCompatibleWith("cascade"),
    (x) =>
      ensureReplacementPreact(e, x, "sb-rag-module", ({ node }) => {
        const module = cascadeToMap(node);
        return h(
          "span",
          {
            style: {
              display: "inline-block",
              border: "2px solid #333",
              borderRadius: "2px",
            },
          },
          shard(module.title),
          h("hr"),
          shard(module.text)
        );
      }),
  ])
  .registerReplacement((e) => [
    (x) => x.type === "dynamic_array",
    (x) =>
      ensureReplacementPreact(e, x, "sb-rag-array", ({ node }) =>
        node.childBlocks.map(shard)
      ),
  ]);

let id = 0;

const Module = ({ title, text, disable, onUpdate, id }) =>
  h(
    "div",
    {
      style: {
        display: "flex",
        border: "2px solid #333",
        borderRadius: "2px",
        width: "200px",
        flexDirection: "column",
        padding: "0.25rem",
        gap: "0.25rem",
      },
    },
    h("input", {
      placeholder: "Module Title",
      type: "text",
      value: title,
      onInput: (e) => onUpdate({ title: e.target.value, disable, text, id }),
    }),
    h("textarea", {
      placeholder: "Text",
      value: text,
      onInput: (e) => onUpdate({ title, text: e.target.value, disable, id }),
    }),
    h(
      "div",
      { style: { display: "flex" } },
      h("input", {
        type: "checkbox",
        onChange: (e) =>
          onUpdate({ title, text, disable: e.target.checked, id }),
      }),
      "Disable ",
      button("Delete", () => onUpdate(null))
    )
  );

const Alternative = ({ modules, onUpdate }) =>
  h(
    "div",
    { style: { display: "flex", gap: "0.25rem" } },
    modules.map((module, i) =>
      h(Module, {
        key: module.id,
        ...module,
        onUpdate: (newModule) => {
          if (!newModule)
            return onUpdate({ modules: modules.filter((_, mi) => mi !== i) });
          return onUpdate({
            modules: modules.map((m, mi) => (mi === i ? newModule : m)),
          });
        },
      })
    ),
    h(
      "button",
      {
        onClick: () =>
          onUpdate({
            modules: [...modules, { id: id++, title: "", text: "" }],
          }),
      },
      "+ Module"
    ),
    h(
      "button",
      {
        onClick: () => onUpdate(null),
      },
      "Delete"
    )
  );

const Lane = ({ title, alternatives, onUpdate }) =>
  h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: "0.5rem" } },
    h("input", {
      type: "text",
      value: title,
      onInput: (e) => onUpdate({ title: e.target.value, alternatives }),
    }),
    alternatives.map((alternative, i) => [
      h("hr"),
      h(Alternative, {
        key: i,
        ...alternative,
        onUpdate: (newAlternatives) => {
          if (!newAlternatives)
            return onUpdate({
              title,
              alternatives: alternatives.filter((_, ai) => ai !== i),
            });
          else
            return onUpdate({
              title,
              alternatives: alternatives.map((a, ai) =>
                ai === i ? newAlternatives : a
              ),
            });
        },
      }),
    ]),
    h("hr"),
    h(
      "button",
      {
        onClick: () =>
          onUpdate({ title, alternatives: [...alternatives, { modules: [] }] }),
      },
      "+ Row"
    )
  );

const Data = ({ lanes, onUpdate }) =>
  h(
    "div",
    { style: { display: "flex", gap: "0.5rem" } },
    lanes.map((lane, i) =>
      h(Lane, {
        key: i,
        ...lane,
        onUpdate: (newLane) =>
          onUpdate(lanes.map((l, li) => (li === i ? newLane : l))),
      })
    ),
    h(
      "button",
      { onClick: () => onUpdate([...lanes, { title: "", alternatives: [] }]) },
      "+ Lane"
    )
  );

export const RAGApp = () => {
  const [data, setData] = useState(() => {
    return localStorage.ragData
      ? JSON.parse(localStorage.ragData)
      : {
          lanes: [{ title: "Copilot", alternatives: [{ modules: [] }] }],
        };
  });

  const [generated, setGenerated] = useState({});
  const [useCompleteAPI, setUseCompleteAPI] = useState(false);
  const model = [
    {
      name: "gpt-3.5-turbo-1106",
      maxTokens: 16385,
    },
    {
      name: "gpt-4",
      maxTokens: 8192,
    },
  ][1];

  const permutations = useMemo(() => {
    const all = [];
    generateCombinations(data.lanes[0].alternatives, all);
    return all;
  }, [data.lanes[0].alternatives]);

  // save in localstorage
  useEffect(() => {
    localStorage.ragData = JSON.stringify(data);
  }, [data]);

  return [
    h(Data, {
      lanes: data.lanes,
      onUpdate: (newLanes) => {
        return setData({ lanes: newLanes });
      },
    }),
    button("Generate all", async () => {
      setGenerated(
        Object.fromEntries(
          await Promise.all(
            permutations.map(async (permutation) => {
              const prompt = permutation.map((p) => p.text).join("\n\n");
              if (!useCompleteAPI)
                return [
                  permutation,
                  (await chat([{ role: "user", content: prompt }], model.name))
                    .choices[0].message.content,
                ];
              else
                return [
                  permutation,
                  (await complete(prompt, "")).choices[0].text,
                ];
            })
          )
        )
      );
    }),
    h(
      "table",
      {},
      h(
        "tr",
        {},
        h("td", {}, "Name"),
        h("td", {}, "Tokens"),
        h("td", {}, "Response")
      ),
      permutations.map((g) =>
        h(
          "tr",
          {},
          h(
            "td",
            {},
            mapSeparated(
              g,
              (g) => g.title,
              () => " - "
            )
          ),
          h(
            "td",
            {},
            `${Math.floor(g.map((g) => g.text).join("\n\n").length / 3)} / ${
              model.maxTokens
            }`
          ),
          h(
            "td",
            {},
            h("pre", { style: { whiteSpace: "pre-wrap" } }, generated[g] ?? "")
          )
        )
      )
    ),
  ];
};

function generateCombinations(
  rows,
  all,
  currentIndex = 0,
  currentCombination = []
) {
  if (currentIndex === rows.length) {
    all.push([...currentCombination]);
    return;
  }

  for (let i = 0; i < rows[currentIndex].modules.length; i++) {
    if (rows[currentIndex].modules[i].disable) continue;
    currentCombination.push(rows[currentIndex].modules[i]);
    generateCombinations(rows, all, currentIndex + 1, currentCombination);
    currentCombination.pop();
  }
}
