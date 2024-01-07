import { Extension } from "../core/extension.js";
import { config } from "../core/config.js";
import { ToggleableMutationObserver } from "../utils.js";
import {
  Widget,
  ul,
  li,
  shard,
  div,
  Replacement,
  editor,
  h,
} from "../view/widgets.js";
import {} from "../view/widget-utils.js";

customElements.define(
  "sb-outline",
  class extends Widget {
    connectedCallback() {
      this.style.display = "flex";
      this.style.flexDirection = "column";
    }

    noteProcessed(trigger, source) {
      if (trigger !== "replacement") return;

      const DECL_TYPES = ["class_declaration", "function_declaration"];
      this.render(
        div(
          "Outline",
          ul(
            source.root.children
              .filter((x) => DECL_TYPES.includes(x.type))
              .map((x) =>
                li(
                  shard(x.atField("name")),
                  ul(
                    x
                      .atField("body")
                      .children.filter((c) => c.type === "method_definition")
                      .map((x) => li(shard(x.atField("name"))))
                  )
                )
              )
          )
        )
      );
    }
  }
);

customElements.define(
  "sb-js-language-box",
  class extends Replacement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<style>
      :host {
        border: 1px solid #ccc;
        padding: 0.25rem;
        display: inline-block;
        border-radius: 4px;
      }
      </style><slot></slot>`;
    }

    update(source) {
      this.render(
        div(
          div(
            h("img", {
              width: 16,
              src: `${config.baseURL}/assets/smalltalk.png`,
              style: "margin-right: 0.25rem;",
            }),
            shard(source.atField("arguments").childBlock(0))
          ),
          editor({
            extensions: ["smalltalk:base"],
            sourceString: source
              .atField("arguments")
              .childBlock(1)
              .childBlock(0).text,
            language: "smalltalk",
          })
        )
      );
    }
  }
);

async function asyncEval(str) {
  // TODO need to analyze the resulting tree an insert a return stmt for the last expression
  // return await eval("(async () => {" + str + "})()");
  return eval(str);
}

export const print = new Extension().registerShortcut(
  "printIt",
  async (x, view, e) => {
    const widget = e.createWidget("sb-print-result");
    const value = await asyncEval(x.sourceString);

    let str;
    if (value === undefined) str = "undefined";
    else if (value === null) str = "null";
    else str = value.toString();

    widget.result = str;
    view.after(widget);
    widget.focus();
  }
);

export const outline = new Extension().registerExtensionConnected((e) => [
  (x) => x.type === "program",
  (x) => x.editor.appendChild(e.createWidget("sb-outline")),
]);

export const multilingual = new Extension().registerReplacement((e) => [
  (x) => x.type === "call_expression",
  (x) => x.atField("function").text === "sqCompile",
  (x) => e.ensureReplacement(x, "sb-js-language-box"),
]);

export const base = new Extension()
  .registerDoubleClick((e) => [
    (x) => x.type === "true" || x.type === "false",
    (x) => x.replaceWith(x.type === "true" ? "false" : "true"),
  ])

  // syntax highlighting
  .registerAlways((e) => [
    (x) =>
      [
        "identifier",
        "shorthand_property_identifier",
        "shorthand_property_identifier_pattern",
      ].includes(x.type),
    (x) => !!x.text.match(/^[A-Z_][A-Z\d_]+$/),
    (x) => e.applySyntaxHighlighting(x, "constant"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "identifier",
    (x) => !!x.text.match(/^[A-Z]$/),
    (x) => e.applySyntaxHighlighting(x, "constructor"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "identifier",
    (x) => e.applySyntaxHighlighting(x, "variable"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "property_identifier",
    (x) => e.applySyntaxHighlighting(x, "property"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "this" || x.type === "super",
    (x) => e.applySyntaxHighlighting(x, "variable", "builtin"),
  ])
  .registerAlways((e) => [
    (x) => ["true", "false", "null", "undefined"].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "constant", "builtin"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "comment",
    (x) => e.applySyntaxHighlighting(x, "comment"),
  ])
  .registerAlways((e) => [
    (x) => ["string", "template_string"].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "string"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "regex",
    (x) => e.applySyntaxHighlighting(x, "string", "special"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "number",
    (x) => e.applySyntaxHighlighting(x, "number"),
  ])
  .registerAlways((e) => [
    (x) => ["(", ")", "[", "]", "{", "}"].includes(x.text),
    (x) => e.applySyntaxHighlighting(x, "punctuation", "bracket"),
  ])
  .registerAlways((e) => [
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
  .registerAlways((e) => [
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
  ]);
