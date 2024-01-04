import {
  useEffect,
  useRef,
  useState,
  useMemo,
} from "../external/preact-hooks.mjs";
import { h } from "../view/widgets.js";

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

function wrapIndex(index, dir, max) {
  if (dir === -1 && index === 0) return max - 1;
  if (dir === 1 && index === max - 1) return 0;
  return index + dir;
}

export function List({
  items,
  labelFunc,
  setSelected,
  selected,
  height,
  onConfirm,
  autofocus,
}) {
  const selectedRef = useRef(null);

  const [filterString, setFilterString] = useState("");

  const visibleItems = useMemo(() => {
    return items
      .filter((item) => labelFunc(item).toLowerCase().includes(filterString))
      .sort((a, b) => labelFunc(a).length - labelFunc(b).length);
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
      autofocus,
      style: { maxHeight: height },
      onkeydown: (e) => {
        if (e.key === "ArrowDown") {
          const index = visibleItems.indexOf(selected);
          setSelected(visibleItems[wrapIndex(index, 1, visibleItems.length)]);
        } else if (e.key === "ArrowUp") {
          const index = visibleItems.indexOf(selected);
          setSelected(visibleItems[wrapIndex(index, -1, visibleItems.length)]);
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
