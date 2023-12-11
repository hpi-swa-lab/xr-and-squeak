import { Extension } from "../extension.js";
import { ToggleableMutationObserver, exec } from "../utils.js";
import { Widget, ul, li, shard, div, Replacement } from "../widgets.js";

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
  "sb-js-print-result",
  class extends Widget {
    connectedCallback() {
      this.style.display = "inline-block";
      this.style.padding = "0.25rem";
      this.style.background = "#333";
      this.style.color = "#fff";
      this.style.marginLeft = "0.25rem";
      this.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" || e.key === "Escape") {
          e.stopPropagation();
          e.preventDefault();
          this.close();
        }
      });
      this.addEventListener("click", (e) => this.close());
      this.setAttribute("contenteditable", "false");
      this.setAttribute("tabindex", "-1");
    }

    set result(value) {
      let str;
      if (value === undefined) str = "undefined";
      else if (value === null) str = "null";
      else str = value.toString();
      this.innerHTML = str;
    }
    close() {
      this.shard.focus();
      ToggleableMutationObserver.ignoreMutation(() => this.remove());
    }
  }
);

customElements.define(
  "sb-js-watch",
  class extends Replacement {
    static registry = new Map();

    count = 0;

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML =
        `<div style="padding: 0.25rem; background: #333; display: inline-block; border-radius: 4px;">` +
        `<div style="background: #fff; padding: 0.1rem;">` +
        `<slot></slot>` +
        `</div>` +
        `<div style="color: #fff; display: flex; margin-top: 0.25rem;">` +
        `<div id="count" style="padding: 0.1rem 0.4rem; margin-right: 0.25rem; background: #999; border-radius: 100px;">0</div>` +
        `<div id="output"></div>` +
        `</div>` +
        `</div>`;
    }

    init(source) {
      super.init(source);
      this.watchId = parseInt(source.atField("arguments").childBlock(1).text);
      window.sbWatch.registry.set(this.watchId, this);
      this.appendChild(
        this.createShard((source) => source.atField("arguments").childBlock(0))
      );
    }

    reportValue(value) {
      this.count++;
      this.shadowRoot.getElementById("output").innerHTML = value.toString();
      this.shadowRoot.getElementById("output").style.marginTop = "2px";
      this.shadowRoot.getElementById("count").innerHTML = this.count.toString();
    }
  }
);

window.sbWatch = function (value, id) {
  window.sbWatch.registry.get(id)?.reportValue(value);
  return value;
};
window.sbWatch.registry = new Map();

function randomId() {
  return Math.floor(Math.random() * 1e9);
}

const jsWatch = [
  (x) => x.type === "call_expression",
  (x) => x.atField("function").text === "sbWatch",
];

Extension.register(
  "javascriptWorkspace",
  new Extension()
    .registerQuery("save", (e) => [
      (x) => x.type === "program",
      (x) => eval(x.editor.sourceString),
    ])
    .registerQuery("replacement", (e) => [
      ...jsWatch,
      (x) => e.ensureReplacement(x, "sb-js-watch"),
    ])
    .registerShortcut("wrapWithWatch", (x) => {
      const currentWatch = exec(x.parent?.parent, ...jsWatch);
      if (currentWatch) {
        currentWatch.replaceWith(x.sourceString);
      } else {
        x.wrapWith("sbWatch(", `, ${randomId()})`);
      }
    })
    .registerShortcut("printIt", (x, view, e) => {
      const widget = e.createWidget("sb-js-print-result");
      widget.result = eval(x.sourceString);
      view.after(widget);
      widget.focus();
    })
);

Extension.register(
  "javascriptOutline",
  new Extension().registerQuery("open", (e) => [
    (x) => x.type === "program",
    (x) => x.editor.shadowRoot.appendChild(e.createWidget("sb-outline")),
  ])
);

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
