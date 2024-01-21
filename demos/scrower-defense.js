import { Extension } from "../core/extension.js";
import { objectToMap } from "../extensions/javascript.js";
import { ensureReplacementPreact, h, shard } from "../view/widgets.js";

export const towers = new Extension()
  .registerReplacement((e) => [
    (x) => x.extract("new Tower($arg)"),
    ([x, { arg }]) =>
      ensureReplacementPreact(
        e,
        x,
        "scrower-tower",
        ({ arg }) => {
          const args = objectToMap(arg);
          return h(
            "div",
            {
              class: "sb-column tower",
              style: {
                left: parseInt(args.x.sourceString),
                top: parseInt(args.y.sourceString),
              },
            },
            "Tower",
            shard(arg)
          );
        },
        { arg }
      ),
  ])
  .registerExtensionConnected((e) => [
    (x) => x.isRoot,
    (_) =>
      setInterval(() => {
        // console.log("Game tick");
      }, 500),
  ]);
