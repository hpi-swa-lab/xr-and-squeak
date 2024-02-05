import { markAsEditableElement } from "../../core/focus.js";
import { h } from "../widgets.js";

export function AutoSizeTextArea({ node, value, onChange }) {
  const style = {
    padding: 0,
    lineHeight: "inherit",
    fontWeight: "inherit",
    fontSize: "inherit",
    border: "none",
  };
  return h(
    "span",
    { style: { display: "inline-grid" } },
    h(
      "textarea",
      {
        ref: (current) => {
          if (current) {
            markAsEditableElement(current);
            current.range = node.range;
            current.node = node;
          }
        },
        rows: 1,
        cols: 1,
        style: {
          ...style,
          overflow: "hidden",
          resize: "none",
          gridArea: "1 / 1 / 2 / 2",
        },
        onInput: (e) => {
          const range = [e.target.selectionStart, e.target.selectionEnd];
          onChange(e);
          e.target.selectionStart = range[0];
          e.target.selectionEnd = range[1];
        },
      },
      value
    ),
    h(
      "span",
      {
        style: {
          ...style,
          whiteSpace: "pre-wrap",
          visibility: "hidden",
          gridArea: "1 / 1 / 2 / 2",
        },
      },
      value
    )
  );
}
