import { Extension } from "../../core/extension.js";
import { useEffect, useMemo, useState } from "../../external/preact-hooks.mjs";
import { mapSeparated, withDo } from "../../utils.js";
import {
  button,
  ensureReplacementPreact,
  h,
  installReplacementPreact,
} from "../../view/widgets.js";
import { chat, complete } from "../../extensions/copilot.js";
import { cascadedConstructorShardsFor } from "../../extensions/smalltalk.js";

export const base = new Extension().registerReplacement((e) => [
  (x) =>
    cascadedConstructorShardsFor(x, "Module", {
      disabled: { default: "false", noShard: true },
      title: { prefix: "'", placeholder: "title", suffix: "'" },
      text: { prefix: "'", placeholder: "text", suffix: "'" },
    }),
  ([x, data]) =>
    ensureReplacementPreact(
      e,
      x,
      "rag-module",
      ({ title, text, disabled, replacement }) =>
        h(
          "div",
          {
            style: {
              display: "inline-flex",
              border: "2px solid #333",
              borderRadius: "2px",
              minWidth: "200px",
              flexDirection: "column",
              padding: "0.25rem",
              gap: "0.25rem",
            },
          },
          title,
          h("hr"),
          text,
          h(
            "div",
            { style: { display: "flex" } },
            h("input", {
              type: "checkbox",
              checked: disabled.get() === "true",
              onChange: (e) => disabled.set(e.target.checked.toString()),
            }),
            "Disable ",
            button("Delete", () => replacement.node.replaceWith(""))
          )
        ),
      data
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
