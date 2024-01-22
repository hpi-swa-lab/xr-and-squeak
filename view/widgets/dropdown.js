import { h } from "../widgets.js";

export function Dropdown({ choices, value, onChange }) {
  return h(
    "button",
    {
      onClick: async () => {
        const choice = await choose(choices, (v) => v.label);
        if (choice) onChange?.(choice.value);
      },
    },
    choices.find((c) => c.value === value).label
  );
}
