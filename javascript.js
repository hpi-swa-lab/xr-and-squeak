import { Extension } from "./extension.js";

Extension.register(
  "javascriptBase",
  new Extension()
    .registerQuery("doubleClick", (e) => [
      (x) => x.type === "true" || x.type === "false",
      (x) => x.replaceWith(x.type === "true" ? "false" : "true"),
    ])

    // syntax highlighting
    .registerQuery("always", (e) => [
      (x) =>
        [
          "identifier",
          "shorthand_property_identifier",
          "shorthand_property_identifier_pattern",
        ].includes(x.type),
      (x) => !!x.text.match(/^[A-Z_][A-Z\d_]+$/),
      (x) => e.applySyntaxHighlighting(x, "constant"),
    ])
    .registerQuery("always", (e) => [
      (x) => x.type === "identifier",
      (x) => !!x.text.match(/^[A-Z]$/),
      (x) => e.applySyntaxHighlighting(x, "constructor"),
    ])
    .registerQuery("always", (e) => [
      (x) => x.type === "identifier",
      (x) => e.applySyntaxHighlighting(x, "variable"),
    ])
    .registerQuery("always", (e) => [
      (x) => x.type === "property_identifier",
      (x) => e.applySyntaxHighlighting(x, "property"),
    ])
    .registerQuery("always", (e) => [
      (x) => x.type === "this" || x.type === "super",
      (x) => e.applySyntaxHighlighting(x, "variable", "builtin"),
    ])
    .registerQuery("always", (e) => [
      (x) => ["true", "false", "null", "undefined"].includes(x.type),
      (x) => e.applySyntaxHighlighting(x, "constant", "builtin"),
    ])
    .registerQuery("always", (e) => [
      (x) => x.type === "comment",
      (x) => e.applySyntaxHighlighting(x, "comment"),
    ])
    .registerQuery("always", (e) => [
      (x) => ["string", "template_string"].includes(x.type),
      (x) => e.applySyntaxHighlighting(x, "string"),
    ])
    .registerQuery("always", (e) => [
      (x) => x.type === "regex",
      (x) => e.applySyntaxHighlighting(x, "string", "special"),
    ])
    .registerQuery("always", (e) => [
      (x) => x.type === "number",
      (x) => e.applySyntaxHighlighting(x, "number"),
    ])
    .registerQuery("always", (e) => [
      (x) => ["(", ")", "[", "]", "{", "}"].includes(x.text),
      (x) => e.applySyntaxHighlighting(x, "punctuation", "bracket"),
    ])
    .registerQuery("always", (e) => [
      (x) =>
        [
          "-",
          "--",
          "-=",
          "+",
          "++",
          "+=",
          "*",
          "*=",
          "**",
          "**=",
          "/",
          "/=",
          "%",
          "%=",
          "<",
          "<=",
          "<<",
          "<<=",
          "=",
          "==",
          "===",
          "!",
          "!=",
          "!==",
          "=>",
          ">",
          ">=",
          ">>",
          ">>=",
          ">>>",
          ">>>=",
          "~",
          "^",
          "&",
          "|",
          "^=",
          "&=",
          "|=",
          "&&",
          "||",
          "??",
          "&&=",
          "||=",
          "??=",
        ].includes(x.text),
      (x) => e.applySyntaxHighlighting(x, "operator"),
    ])
    .registerQuery("always", (e) => [
      (x) =>
        [
          "as",
          "async",
          "await",
          "break",
          "case",
          "catch",
          "class",
          "const",
          "continue",
          "debugger",
          "default",
          "delete",
          "do",
          "else",
          "export",
          "extends",
          "finally",
          "for",
          "from",
          "function",
          "get",
          "if",
          "import",
          "in",
          "instanceof",
          "let",
          "new",
          "of",
          "return",
          "set",
          "static",
          "switch",
          "target",
          "throw",
          "try",
          "typeof",
          "var",
          "void",
          "while",
          "with",
          "yield",
        ].includes(x.text),
      (x) => e.applySyntaxHighlighting(x, "keyword"),
    ])
);
