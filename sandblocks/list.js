import {
  useEffect,
  useRef,
  useState,
  useMemo,
} from "../external/preact-hooks.mjs";
import { h } from "../widgets.js";

function highlightSubstring(string, search) {
  if (!search) return string;

  const index = string.toLowerCase().indexOf(search.toLowerCase());
  return [
    string.slice(0, index),
    h(
      "span",
      { class: "search-result" },
      string.slice(index, index + search.length)
    ),
    string.slice(index + search.length),
  ];
}

export function List({
  items,
  labelFunc,
  setSelected,
  selected,
  height,
  onConfirm,
}) {
  const selectedRef = useRef(null);

  const [filterString, setFilterString] = useState("");

  const visibleItems = useMemo(() => {
    return items.filter((item) =>
      labelFunc(item).toLowerCase().includes(filterString)
    );
  }, [items, filterString]);

  useEffect(() => {
    setSelected(visibleItems[0]);
  }, [visibleItems, filterString]);

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
      style: { maxHeight: height },
      onkeydown: (e) => {
        if (e.key === "ArrowDown") {
          const index = visibleItems.indexOf(selected);
          if (index < visibleItems.length - 1) {
            setSelected(visibleItems[index + 1]);
          }
        } else if (e.key === "ArrowUp") {
          const index = visibleItems.indexOf(selected);
          if (index > 0) {
            setSelected(visibleItems[index - 1]);
          }
        } else if (e.key === "Enter") {
          selected && onConfirm?.(selected);
        } else if (e.key === "Backspace") {
          setFilterString("");
        } else if (e.key.length === 1 && !e.ctrlKey) {
          setFilterString((s) => s + e.key);
        } else {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
      },
    },
    visibleItems.map((item) =>
      h(
        "div",
        {
          class: `sb-list-item ${selected === item ? "selected" : ""}`,
          ref: selected === item ? selectedRef : null,
          onClick: () => {
            setSelected(item);
            onConfirm?.(item);
          },
        },
        highlightSubstring(labelFunc(item), filterString)
      )
    )
  );
}
