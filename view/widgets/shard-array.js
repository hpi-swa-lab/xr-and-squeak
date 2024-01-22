import { useState } from "../../external/preact-hooks.mjs";
import { mapSeparated } from "../../utils.js";
import { h, shard } from "../widgets.js";

export function ShardArray({ elements, onInsert }) {
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

function AddButton({ onClick }) {
  return h(
    "span",
    { class: "sb-insert-button-anchor" },
    h("button", { onClick, class: "sb-insert-button" }, "+")
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
