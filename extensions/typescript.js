import { Extension } from "../core/extension.js";
import { StdioTransport, registerLsp } from "./lsp.js";
import { base as jsBase } from "./javascript.js";

export const lsp = new Extension();
registerLsp(
  lsp,
  "tsLSP",
  (project) =>
    new StdioTransport("typescript-language-server", ["--stdio"], project.path)
);

export const base = new Extension()
  // (type_identifier) @type
  .registerAlways((e) => [
    (x) => x.type === "type_identifier",
    (x) => e.applySyntaxHighlighting(x, "type"),
  ])
  // (predefined_type) @type.builtin
  .registerAlways((e) => [
    (x) => x.type === "predefined_type",
    (x) => e.applySyntaxHighlighting(x, "type", "builtin"),
  ])
  // ((identifier) @type
  //  (#match? @type "^[A-Z]"))
  .registerAlways((e) => [
    (x) => x.type === "identifier",
    (x) => !!x.text.match(/^[A-Z]$/),
    (x) => e.applySyntaxHighlighting(x, "type"),
  ])
  // (type_arguments
  //   "<" @punctuation.bracket
  //   ">" @punctuation.bracket)
  .registerAlways((e) => [
    (x) => x.parent?.type === "type_arguments",
    (x) => x.text === "<" || x.text === ">",
    (x) => e.applySyntaxHighlighting(x, "bracket"),
  ])
  .registerAlways((e) => [
    (x) =>
      x.parent?.type === "required_parameter" ||
      x.parent?.type === "optional_parameter",
    (x) => x.type === "identifier",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])
  // [ "abstract"
  //   "declare"
  //   "enum"
  //   "export"
  //   "implements"
  //   "interface"
  //   "keyof"
  //   "namespace"
  //   "private"
  //   "protected"
  //   "public"
  //   "type"
  //   "readonly"
  //   "override"
  //   "satisfies"
  // ] @keyword
  .registerAlways((e) => [
    (x) =>
      [
        "abstract",
        "declare",
        "enum",
        "export",
        "implements",
        "interface",
        "keyof",
        "namespace",
        "private",
        "protected",
        "public",
        "type",
        "readonly",
        "override",
        "satisfies",
      ].includes(x.text),
    (x) => e.applySyntaxHighlighting(x, "keyword"),
  ]);

jsBase.copyTo(base);
