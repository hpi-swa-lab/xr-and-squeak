import { Extension } from "../extension.js";
import { Replacement } from "../widgets.js";

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

Extension.register(
  "smalltalkBase",
  new Extension()
    .registerQuery("always", (e) => [
      (x) => true,
      (x) => x.type === "unary_message",
      (x) => x.childNode(1).text === "sbWatch",
      (x) => e.ensureReplacement(x, "sb-watch"),
    ])

    .registerQuery("doubleClick", (e) => [
      (x) => x.type === "true" || x.type === "false",
      (x) => x.replaceWith(x.type === "true" ? "false" : "true"),
    ])

    .registerQuery("shortcut", (e) => [
      (x) => {
        const indices = ["First", "Second", "Third", "Fourth", "Fifth"];
        for (let i = 0; i < indices.length; i++)
          e.registerShortcut(x, `insert${indices[i]}Arg`, ([x, view]) =>
            x.exec(
              ...smalltalkMethodArguments,
              (args) => args[i] && view.editor.replaceSelection(args[i].text)
            )
          );
      },
    ])

    // syntax highlighting
    .registerQuery("always", (e) => [
      (x) => ["identifier", "block_argument"].includes(x.type),
      (x) => e.applySyntaxHighlighting(x, "variable"),
    ])
    .registerQuery("always", (e) => [
      (x) =>
        ["self", "true", "false", "thisContext", "super", "nil"].includes(
          x.type
        ),
      (x) => e.applySyntaxHighlighting(x, "keyword"),
    ])
    .registerQuery("always", (e) => [
      (x) => x.type === "pragma",
      (x) => e.applySyntaxHighlighting(x, "annotation"),
    ])
    .registerQuery("always", (e) => [
      (x) => x.type === "unary_identifier" && x.parent.type === "pragma",
      (x) => e.applySyntaxHighlighting(x, "structure", "part"),
    ])
    .registerQuery("always", (e) => [
      (x) => x.type === "number",
      (x) => e.applySyntaxHighlighting(x, "number"),
    ])
    .registerQuery("always", (e) => [
      (x) => ["string", "symbol", "character"].includes(x.type),
      (x) => e.applySyntaxHighlighting(x, "number"),
    ])
    .registerQuery("always", (e) => [
      (x) => x.type === "comment",
      (x) => e.applySyntaxHighlighting(x, "comment"),
    ])
    .registerQuery("always", (e) => [
      (x) => x.text === "|" && x.parent.type === "block",
      (x) => e.applySyntaxHighlighting(x, "punctuation"),
    ])
    .registerQuery("always", (e) => [
      (x) => [";", ".", "(", ")"].includes(x.text),
      (x) => e.applySyntaxHighlighting(x, "punctuation"),
    ])
    .registerQuery("always", (e) => [
      (x) =>
        ["unary_identifier", "binary_operator", "keyword"].includes(x.type),
      (x) => e.applySyntaxHighlighting(x, "variable", "part"),
    ])
    .registerQuery("always", (e) => [
      (x) => ["^", "[", "]", "{", "}"].includes(x.text),
      (x) => e.applySyntaxHighlighting(x, "important"),
    ])
    .registerQuery("always", (e) => [
      (x) =>
        (x.type === "keyword" && x.parent.type === "keyword_selector") ||
        (x.type === "binary_operator" && x.parent.type === "binary_selector") ||
        (x.type === "unary_identifier" && x.parent.type === "unary_selector"),
      (x) => e.applySyntaxHighlighting(x, "major_declaration", "part"),
    ])
    .registerQuery("always", (e) => [
      (x) =>
        [
          "pragma_keyword_selector",
          "pragma_unary_selector",
          "pragma_binary_selector",
        ].includes(x.type),
      (x) => e.applySyntaxHighlighting(x, "structure", "part"),
    ])
    .registerQuery("always", (e) => [
      (x) => x.type === "temporaries",
      (x) => e.applySyntaxHighlighting(x, "punctuation"),
    ])
    .registerQuery("always", (e) => [
      (x) => x.type === "identifier" && x.parent.type === "temporaries",
      (x) => e.applySyntaxHighlighting(x, "punctuation"),
    ])
);
