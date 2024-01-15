import { Extension } from "../core/extension.js";
import { useEffect, useState } from "../external/preact-hooks.mjs";
import { mapSeparated } from "../utils.js";
import { button, ensureReplacementPreact, h, shard } from "../view/widgets.js";
import { complete } from "./copilot.js";

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

const Module = ({ title, text, onUpdate, id }) =>
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
      onInput: (e) => onUpdate({ title: e.target.value, text, id }),
    }),
    h("textarea", {
      placeholder: "Text",
      value: text,
      onInput: (e) => onUpdate({ title, text: e.target.value, id }),
    })
  );

const Alternative = ({ modules, onUpdate }) =>
  h(
    "div",
    { style: { display: "flex", gap: "0.25rem" } },
    modules.map((module, i) =>
      h(Module, {
        key: module.id,
        ...module,
        onUpdate: (newModule) =>
          onUpdate({
            modules: modules.map((m, mi) => (mi === i ? newModule : m)),
          }),
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
        onUpdate: (newAlternatives) =>
          onUpdate({
            title,
            alternatives: alternatives.map((a, ai) =>
              ai === i ? newAlternatives : a
            ),
          }),
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

  const [generated, setGenerated] = useState([]);

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
      const all = [];
      generateCombinations(data.lanes[0].alternatives, all);

      setGenerated(
        await Promise.all(
          all.map((permutation) => {
            const prompt = permutation.map((p) => p.text).join("\n\n");
            const title = permutation.map((p) => p.title).join(" - ");
            return complete(prompt, "").then((r) => ({
              title,
              response: r.choices[0].text,
            }));
          })
        )
      );
    }),
    h(
      "table",
      {},
      generated.map((g) =>
        h(
          "tr",
          {},
          h("td", {}, g.title),
          h(
            "td",
            {},
            h("pre", { style: { whiteSpace: "pre-wrap" } }, g.response)
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
    currentCombination.push(rows[currentIndex].modules[i]);
    generateCombinations(rows, all, currentIndex + 1, currentCombination);
    currentCombination.pop();
  }
}
