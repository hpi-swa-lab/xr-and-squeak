import { Extension } from "../core/extension.js";
import { objectToMap } from "../extensions/javascript.js";
import { withDo } from "../utils.js";
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

  .registerReplacement((e) => [
    (x) => x.extract("new Enemy($arg)"),
    ([x, { arg }]) =>
      ensureReplacementPreact(
        e,
        x,
        "scrower-enemy",
        ({ arg }) => {
          const args = objectToMap(arg);
          return h(
            "div",
            {
              class: "sb-column enemy",
              style: {
                left: parseInt(args.x.sourceString),
                top: parseInt(args.y.sourceString),
              },
            },
            "Enemy",
            shard(arg)
          );
        },
        { arg }
      ),
  ])

  .registerExtensionConnected((e) => [
    (x) => false,
    (x) => x.isRoot,
    (x) =>
      setInterval(() => {
        x.allNodesDo((n) => {
          n.exec(
            (n) => n.query("new Enemy($data)")?.data,
            (d) => objectToMap(d),
            (data) => {
              data.x.replaceWith(parseInt(data.x.sourceString) - 20);
              data.y.replaceWith(parseInt(data.y.sourceString) - 30);
            }
          );
        });
      }, 500),
  ]);
