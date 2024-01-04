import { Extension } from "../core/extension.js";

export const base = new Extension()
  // syntax highlighting

  // (comment) @comment
  .registerAlways((e) => [
    (x) => x.type === "comment",
    (x) => e.applySyntaxHighlighting(x, "comment"),
  ])
  // (tag_name) @tag
  .registerAlways((e) => [
    (x) => x.type === "tag_name",
    (x) => e.applySyntaxHighlighting(x, "tag"),
  ])
  // (nesting_selector) @tag
  .registerAlways((e) => [
    (x) => x.type === "nesting_selector",
    (x) => e.applySyntaxHighlighting(x, "tag"),
  ])
  // (universal_selector) @tag
  .registerAlways((e) => [
    (x) => x.type === "universal_selector",
    (x) => e.applySyntaxHighlighting(x, "tag"),
  ])

  // "~" @operator
  // ">" @operator
  // "+" @operator
  // "-" @operator
  // "*" @operator
  // "/" @operator
  // "=" @operator
  // "^=" @operator
  // "|=" @operator
  // "~=" @operator
  // "$=" @operator
  // "*=" @operator
  //
  // "and" @operator
  // "or" @operator
  // "not" @operator
  // "only" @operator
  .registerAlways((e) => [
    (x) =>
      [
        "~",
        ">",
        "+",
        "-",
        "*",
        "/",
        "=",
        "^=",
        "|=",
        "~=",
        "$=",
        "*=",
        "and",
        "or",
        "not",
        "only",
      ].includes(x.text),
    (x) => e.applySyntaxHighlighting(x, "operator"),
  ])
  // (attribute_selector (plain_value) @string)
  .registerAlways((e) => [
    (x) => x.parent?.type === "attribute_selector" && x.type === "plain_value",
    (x) => e.applySyntaxHighlighting(x, "string"),
  ])
  // (pseudo_element_selector (tag_name) @attribute)
  .registerAlways((e) => [
    (x) =>
      x.parent?.type === "pseudo_element_selector" && x.type === "tag_name",
    (x) => e.applySyntaxHighlighting(x, "attribute"),
  ])
  // (pseudo_class_selector (class_name) @attribute)
  .registerAlways((e) => [
    (x) =>
      x.parent?.type === "pseudo_class_selector" && x.type === "class_name",
    (x) => e.applySyntaxHighlighting(x, "attribute"),
  ])

  // (class_name) @property
  // (id_name) @property
  // (namespace_name) @property
  // (property_name) @property
  // (feature_name) @property
  .registerAlways((e) => [
    (x) =>
      [
        "class_name",
        "id_name",
        "namespace_name",
        "property_name",
        "feature_name",
      ].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "property"),
  ])
  // (attribute_name) @attribute
  .registerAlways((e) => [
    (x) => x.type === "attribute_name",
    (x) => e.applySyntaxHighlighting(x, "attribute"),
  ])
  // (function_name) @function
  .registerAlways((e) => [
    (x) => x.type === "function_name",
    (x) => e.applySyntaxHighlighting(x, "function"),
  ])
  //
  // ((property_name) @variable
  //  (#match? @variable "^--"))
  // ((plain_value) @variable
  //  (#match? @variable "^--"))
  .registerAlways((e) => [
    (x) =>
      ["property_name", "plain_value"].includes(x.type) &&
      x.text.startsWith("--"),
    (x) => e.applySyntaxHighlighting(x, "variable"),
  ])
  // "@media" @keyword
  // "@import" @keyword
  // "@charset" @keyword
  // "@namespace" @keyword
  // "@supports" @keyword
  // "@keyframes" @keyword
  // (at_keyword) @keyword
  // (to) @keyword
  // (from) @keyword
  // (important) @keyword
  .registerAlways((e) => [
    (x) =>
      [
        "@media",
        "@import",
        "@charset",
        "@namespace",
        "@supports",
        "@keyframes",
      ].includes(x.text) ||
      ["at_keyword", "to", "from", "important"].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "keyword"),
  ])
  // (string_value) @string
  .registerAlways((e) => [
    (x) => x.type === "string_value",
    (x) => e.applySyntaxHighlighting(x, "string"),
  ])
  // (color_value) @string.special
  .registerAlways((e) => [
    (x) => x.type === "color_value",
    (x) => e.applySyntaxHighlighting(x, "string.special"),
  ])
  // (integer_value) @number
  .registerAlways((e) => [
    (x) => x.type === "integer_value",
    (x) => e.applySyntaxHighlighting(x, "number"),
  ])
  // (float_value) @number
  .registerAlways((e) => [
    (x) => x.type === "float_value",
    (x) => e.applySyntaxHighlighting(x, "number"),
  ])
  // (unit) @type
  .registerAlways((e) => [
    (x) => x.type === "unit",
    (x) => e.applySyntaxHighlighting(x, "type"),
  ])
  // "#" @punctuation.delimiter
  // "," @punctuation.delimiter
  // ":" @punctuation.delimiter
  .registerAlways((e) => [
    (x) => ["#", ",", ":"].includes(x.text),
    (x) => e.applySyntaxHighlighting(x, "punctuation.delimiter"),
  ]);
