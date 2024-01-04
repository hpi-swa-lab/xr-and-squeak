import { Extension } from "../core/extension.js";
import { exec, mapSeparated } from "../utils.js";
import { Replacement, shard } from "../view/widgets.js";

customElements.define(
  "sb-watch",
  class Watch extends Replacement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<span>WATCH[</span><slot></slot><span>]WATCH</span>`;
    }

    init(source) {
      super.init(source);
      this.appendChild(this.createShard((source) => source.childNode(0)));
    }
  }
);

const smalltalkMethodSelector = [
  (x) => x.orAnyParent((y) => y.type === "method"),
  (x) =>
    x.children.find((y) =>
      ["keyword_selector", "unary_selector", "binary_selector"].includes(y.type)
    ),
];

const smalltalkMethodArguments = [
  ...smalltalkMethodSelector,
  (x) => x.children.filter((y) => y.type === "identifier"),
];

export const base = new Extension()
  .registerReplacement((e) => [
    (x) => true,
    (x) => x.type === "unary_message",
    (x) => x.childNode(1).text === "sbWatch",
    (x) => e.ensureReplacement(x, "sb-watch"),
  ])

  .registerDoubleClick((e) => [
    (x) => x.type === "true" || x.type === "false",
    (x) => x.replaceWith(x.type === "true" ? "false" : "true"),
  ])

  .registerQuery("shortcut", (e) => [
    (x) => {
      const indices = ["First", "Second", "Third", "Fourth", "Fifth"];
      for (let i = 0; i < indices.length; i++)
        e.registerShortcut(x, `insert${indices[i]}Arg`, (x, view) =>
          x.exec(
            ...smalltalkMethodArguments,
            (args) => args[i] && view.editor.replaceSelection(args[i].text)
          )
        );
    },
  ])

  // syntax highlighting
  .registerAlways((e) => [
    (x) => ["identifier", "block_argument"].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "variable"),
  ])
  .registerAlways((e) => [
    (x) =>
      ["self", "true", "false", "thisContext", "super", "nil"].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "keyword"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "pragma",
    (x) => e.applySyntaxHighlighting(x, "annotation"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "unary_identifier" && x.parent.type === "pragma",
    (x) => e.applySyntaxHighlighting(x, "structure", "part"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "number",
    (x) => e.applySyntaxHighlighting(x, "number"),
  ])
  .registerAlways((e) => [
    (x) => ["string", "symbol", "character"].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "number"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "comment",
    (x) => e.applySyntaxHighlighting(x, "comment"),
  ])
  .registerAlways((e) => [
    (x) => x.text === "|" && x.parent.type === "block",
    (x) => e.applySyntaxHighlighting(x, "punctuation"),
  ])
  .registerAlways((e) => [
    (x) => [";", ".", "(", ")"].includes(x.text),
    (x) => e.applySyntaxHighlighting(x, "punctuation"),
  ])
  .registerAlways((e) => [
    (x) => ["unary_identifier", "binary_operator", "keyword"].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "variable", "part"),
  ])
  .registerAlways((e) => [
    (x) => ["^", "[", "]", "{", "}"].includes(x.text),
    (x) => e.applySyntaxHighlighting(x, "important"),
  ])
  .registerAlways((e) => [
    (x) =>
      (x.type === "keyword" && x.parent.type === "keyword_selector") ||
      (x.type === "binary_operator" && x.parent.type === "binary_selector") ||
      (x.type === "unary_identifier" && x.parent.type === "unary_selector"),
    (x) => e.applySyntaxHighlighting(x, "major_declaration", "part"),
  ])
  .registerAlways((e) => [
    (x) =>
      [
        "pragma_keyword_selector",
        "pragma_unary_selector",
        "pragma_binary_selector",
      ].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "structure", "part"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "temporaries",
    (x) => e.applySyntaxHighlighting(x, "punctuation"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "identifier" && x.parent.type === "temporaries",
    (x) => e.applySyntaxHighlighting(x, "punctuation"),
  ]);

customElements.define(
  "sb-smalltalk-destructuring-assignment",
  class extends Replacement {
    update(source) {
      const assignments = destructuredAssignments(source);
      this.render([
        "{ ",
        mapSeparated(
          assignments,
          (a) => shard(a.childBlock(0).childBlock(0)),
          () => ". "
        ),
        " }",
        " := ",
        shard(source.childBlock(1)),
      ]);
    }
  }
);

function destructuredAssignments(x) {
  const statement = x.parent;
  const name = x.childBlock(0).text;
  const assignments = [];
  const selectors = ["first", "second", "third", "fourth", "fifth"];
  let current = statement;
  do {
    current = current.nextSiblingBlock;
  } while (
    exec(
      current,
      (x) => x.childBlock(0),
      (x) => x.type === "assignment",
      (x) => x.childBlock(1),
      (x) => x.type === "unary_message",
      (x) => x.atField("receiver").text === name,
      (x) => x.childBlock(1).text === selectors[assignments.length],
      (x) => (assignments.push(x.parent.parent), true)
    )
  );
  return assignments;
}

export const destructuringAssignment = new Extension().registerReplacement(
  (e) => [
    (x) => x.type === "assignment" && x.parent.type === "statement",
    (x) => {
      const assignments = destructuredAssignments(x);
      return assignments.length > 0 ? [x, assignments] : null;
    },
    ([x, assignments]) => {
      e.ensureReplacement(x, "sb-smalltalk-destructuring-assignment");
      for (const a of assignments) {
        e.ensureHidden(a.previousSiblingChild);
        e.ensureHidden(a);
        e.ensureHidden(a.nextSiblingNode);
      }
    },
  ]
);
