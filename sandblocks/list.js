import { useEffect, useRef } from "../external/preact-hooks.mjs";
import { h } from "../widgets.js";

export function List({ items, labelFunc, setSelected, selected }) {
  const selectedRef = useRef(null);

  // scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: "nearest",
      });
    }
  }, [selected]);

  return h(
    "div",
    {
      class: "sb-list",
      tabIndex: -1,
      focusable: true,
      onkeydown: (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const index = items.indexOf(selected);
          if (index < items.length - 1) {
            setSelected(items[index + 1]);
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const index = items.indexOf(selected);
          if (index > 0) {
            setSelected(items[index - 1]);
          }
        }
      },
    },
    items.map((item) =>
      h(
        "div",
        {
          class: `sb-list-item ${selected === item ? "selected" : ""}`,
          ref: selected === item ? selectedRef : null,
          onClick: () => setSelected(item),
        },
        labelFunc(item)
      )
    )
  );
}
