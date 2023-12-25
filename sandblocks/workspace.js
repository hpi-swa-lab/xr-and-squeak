import { Window } from "./base.js";
import { Replacement, div, editor, h, shard } from "../widgets.js";
import { Extension } from "../extension.js";
import { config } from "../core/config.js";

const extraExtensions = {
  markdown: ["markdown:calc"],
};

customElements.define(
  "sb-workspace-block",
  class extends Replacement {
    update(node) {
      const language = config.languages.find(
        (l) =>
          l.languageName ===
          node.childBlocks
            .find((b) => b.atField("key").childBlock(0).text === "language")
            .atField("value")
            .childBlock(0).text
      );

      const sourceString = JSON.parse(
        node.childBlocks
          .find((b) => b.atField("key").childBlock(0).text === "text")
          .atField("value").sourceString
      );

      this.render(
        h(
          "div",
          { style: "padding: 0.5rem" },
          editor({
            extensions: [
              "base:base",
              ...language.defaultExtensions,
              ...(extraExtensions[language.languageName] ?? []),
            ],
            inlineExtensions: [nestedWorkspaceShortcuts],
            sourceString,
            language: language.languageName,
          })
        )
      );
    }
  }
);

customElements.define(
  "sb-workspace",
  class extends Replacement {
    update(node) {
      const list = [];
      let first = true;
      for (const block of node.childBlock(0).childBlocks.map((x) => shard(x))) {
        if (!first) {
          list.push(h("hr"));
        }
        list.push(block);
        first = false;
      }
      this.render([div(list), h("style", {}, "hr { margin: 0; }")]);
    }
  }
);

const jsonWorkspace = new Extension()
  .registerReplacement((e) => [
    (x) => x.type === "object",
    (x) => true,
    (x) => e.ensureReplacement(x, "sb-workspace-block"),
  ])
  .registerReplacement((e) => [
    (x) => true,
    (x) => x.type === "document",
    (x) => e.ensureReplacement(x, "sb-workspace"),
  ]);

const workspaceShortcuts = new Extension().registerShortcut(
  "addNewBlock",
  (x) => {
    x.orAnyParent((x) => x.parent?.type === "array").insertAfter(
      '{"language":"markdown", "text": "text"}',
      "_value"
    );
  }
);
const nestedWorkspaceShortcuts = new Extension().registerShortcut(
  "addNewBlock",
  (x) => {
    x.editor.parentNode.parentNode.parentNode.source
      .orAnyParent((x) => x.parent?.type === "array")
      .insertAfter('{"language":"markdown", "text": "text"}', "_value");
  }
);

export function Workspace() {
  return h(Window, {}, [
    editor({
      inlineExtensions: [jsonWorkspace, workspaceShortcuts],
      extensions: [],
      sourceString: JSON.stringify(
        [
          { text: "text", language: "javascript" },
          { text: '{"language": 2}', language: "json" },
          {
            text: `# hi\n\n2+2\n`,
            language: "markdown",
          },
        ],
        null,
        2
      ),
      language: "json",
    }),
  ]);
}
