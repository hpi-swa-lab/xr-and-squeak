import { Extension } from "../core/extension.js";
import { shard } from "../view/widgets.js";
import { replacement, h } from "../view/widgets.js";
import { asyncEval } from "./javascript.js";

const example = (x) =>
  x.extract(`() => ({sbExample: $name, args: $args, self: $self})`);

export const javascript = new Extension()
  .registerReplacement((e) => [
    example,
    replacement(
      e,
      "sb-example",
      ({ name, args, self }) =>
        h(
          "div",
          {
            style: {
              backgroundColor: "#333",
              display: "inline-flex",
              gap: "0.25rem",
              padding: "0.25rem",
              borderRadius: "4px",
              color: "#fff",
            },
          },
          shard(name.childBlock(0), {
            style: { padding: "0.1rem", color: "#000" },
          }),
          "args:",
          shard(args, { style: { padding: "0.1rem" } }),
          "self:",
          shard(self, { style: { padding: "0.1rem" } })
        ),
      { sticky: true }
    ),
  ])
  .registerSave((e) => [
    example,
    ([x, { args, self }]) => {
      const funcName = x
        .orParentCompatibleWith("function_declaration")
        .atField("name").text;
      asyncEval(
        `${x.root.sourceString}\n\n${
          self.type !== "null" ? self.sourceString + "." : ""
        }${funcName}(${args.childBlocks.map((x) => x.sourceString).join(",")})`
      );
    },
  ]);
