import { h, useAsyncEffect } from "../widgets.js";
import { useState } from "../external/preact-hooks.mjs";
import { Extension } from "../extension.js";
import { openComponentInWindow } from "./window.js";

export const references = new Extension()
  .registerShortcut("browseSenders", (x, view) => {
    openComponentInWindow(References, {
      project: x.editor.parentNode.project,
      symbol: x.text,
      sourcePath: x.editor.parentNode.path,
      type: "senders",
    });
  })
  .registerShortcut("browseImplementors", (x, view) => {
    openComponentInWindow(References, {
      project: x.editor.parentNode.project,
      symbol: x.text,
      sourcePath: x.editor.parentNode.path,
      type: "implementors",
    });
  });

function References({ project, symbol, sourcePath, type }) {
  const [references, setReferences] = useState([]);

  useAsyncEffect(async () => {
    setReferences(
      await project.inAllFilesDo(
        (path) => path.endsWith(".js"),
        (file, source) => {
          const senders = [];
          const implementors = [];
          source.allNodesDo((node) => {
            node.exec(
              (x) => x.type === "member_expression",
              (x) => x.atField("property"),
              (x) => senders.push(x.text)
            );
            node.exec(
              (x) =>
                [
                  "function",
                  "method_definition",
                  "function_declaration",
                ].includes(x.type),
              (x) => x.atField("name"),
              (x) => implementors.push(x.text)
            );
          });
          return { senders, implementors };
        },
        (map, symbol, type) => {
          return Object.entries(map)
            .filter(([_, types]) => types[type].includes(symbol))
            .map(([path, _]) => path);
        },
        [symbol, type]
      )
    );
  }, [project]);

  return h(
    "div",
    {},
    references.map((path) => h("div", {}, path.slice(project.path.length)))
  );
}
