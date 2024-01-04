import { Extension } from "../core/extension.js";
import { Widget, Replacement } from "../view/widgets.js";

customElements.define(
  "sb-markdown-math-result",
  class extends Widget {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<style>
      span {
        padding: 0.1rem;
        background: #333;
        color: #fff;
        border-radius: 3px;
        margin-left: 0.5rem;
      }
      </style><span>2</span>`;
    }

    update(node) {
      let result;
      try {
        result = math.evaluate(node.sourceString);
      } catch (e) {
        result = "---";
      }
      this.shadowRoot.querySelector("span").textContent = result;
    }
  }
);

export const calc = new Extension().registerReplacement((e) => [
  (x) => x.type === "inline" && x.parent?.type === "paragraph",
  (x) => x.sourceString.split("\n").length === 1,
  (x) => {
    return e.attachData(
      x,
      "math-eval",
      (v) => {
        const el = document.createElement("sb-markdown-math-result");
        v.after(el);
        return el;
      },
      (v, widget) => widget.remove(),
      (v, node, widget) => widget.update(node)
    );
  },
]);

customElements.define(
  "sb-markdown-task",
  class extends Replacement {
    init(source) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.addEventListener("input", (e) => {
        this.source.replaceWith(`[${e.target.checked ? "x" : " "}]`);
      });
      checkbox.checked = source.type === "task_list_marker_checked";
      this.appendChild(checkbox);
    }
  }
);

export const taskList = new Extension().registerReplacement((e) => [
  (x) =>
    x.type === "task_list_marker_unchecked" ||
    x.type === "task_list_marker_checked",
  (x) => e.ensureReplacement(x, "sb-markdown-task"),
]);

export const base = new Extension()
  // [ (link_label) ] @text.reference
  .registerAlways((e) => [
    (x) => x.type === "link_label",
    (x) => e.applySyntaxHighlighting(x, "text", "reference"),
  ])

  // (atx_heading (inline) @text.title)
  .registerAlways((e) => [
    (x) => x.type === "inline" && x.parent?.type === "atx_heading",
    (x) => e.applySyntaxHighlighting(x, "text", "title"),
  ])

  // (setext_heading (paragraph) @text.title)
  .registerAlways((e) => [
    (x) => x.type === "paragraph" && x.parent?.type === "setext_heading",
    (x) => e.applySyntaxHighlighting(x, "text", "title"),
  ])

  // [ (atx_h1_marker) (atx_h2_marker) (atx_h3_marker) (atx_h4_marker) (atx_h5_marker) (atx_h6_marker) (setext_h1_underline) (setext_h2_underline) ] @punctuation.special
  .registerAlways((e) => [
    (x) =>
      [
        "atx_h1_marker",
        "atx_h2_marker",
        "atx_h3_marker",
        "atx_h4_marker",
        "atx_h5_marker",
        "atx_h6_marker",
        "setext_h1_underline",
        "setext_h2_underline",
      ].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "punctuation", "special"),
  ])

  // [ (link_title) (indented_code_block) (fenced_code_block) ] @text.literal
  .registerAlways((e) => [
    (x) =>
      ["link_title", "indented_code_block", "fenced_code_block"].includes(
        x.type
      ),
    (x) => e.applySyntaxHighlighting(x, "text", "literal"),
  ])

  // [ (fenced_code_block_delimiter) ] @punctuation.delimiter
  .registerAlways((e) => [
    (x) => x.type === "fenced_code_block_delimiter",
    (x) => e.applySyntaxHighlighting(x, "punctuation", "delimiter"),
  ])

  // (code_fence_content) @none
  .registerAlways((e) => [
    (x) => x.type === "code_fence_content",
    (x) => e.applySyntaxHighlighting(x, "none"),
  ])

  // [ (link_destination) ] @text.uri
  .registerAlways((e) => [
    (x) => x.type === "link_destination",
    (x) => e.applySyntaxHighlighting(x, "text", "uri"),
  ])

  // [ (link_label) ] @text.reference
  .registerAlways((e) => [
    (x) => x.type === "link_label",
    (x) => e.applySyntaxHighlighting(x, "text", "reference"),
  ])

  // [ (list_marker_plus) (list_marker_minus) (list_marker_star) (list_marker_dot) (list_marker_parenthesis) (thematic_break) ] @punctuation.special
  .registerAlways((e) => [
    (x) =>
      [
        "list_marker_plus",
        "list_marker_minus",
        "list_marker_star",
        "list_marker_dot",
        "list_marker_parenthesis",
        "thematic_break",
      ].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "punctuation", "special"),
  ])

  // [ (block_continuation) (block_quote_marker) ] @punctuation.special
  .registerAlways((e) => [
    (x) => ["block_continuation", "block_quote_marker"].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "punctuation", "special"),
  ])

  // [ (backslash_escape) ] @string.escape
  .registerAlways((e) => [
    (x) => x.type === "backslash_escape",
    (x) => e.applySyntaxHighlighting(x, "string", "escape"),
  ]);

export const inline = new Extension()
  // [ (code_span) (link_title) ] @text.literal
  .registerAlways((e) => [
    (x) => ["code_span", "link_title"].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "text", "literal"),
  ])
  // [ (emphasis_delimiter) (code_span_delimiter) ] @punctuation.delimiter
  .registerAlways((e) => [
    (x) => ["emphasis_delimiter", "code_span_delimiter"].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "punctuation", "delimiter"),
  ])
  // (emphasis) @text.emphasis
  .registerAlways((e) => [
    (x) => x.type === "emphasis",
    (x) => e.applySyntaxHighlighting(x, "text", "emphasis"),
  ])
  // (strong_emphasis) @text.strong
  .registerAlways((e) => [
    (x) => x.type === "strong_emphasis",
    (x) => e.applySyntaxHighlighting(x, "text", "strong"),
  ])
  // [ (link_destination) (uri_autolink) ] @text.uri
  .registerAlways((e) => [
    (x) => ["link_destination", "uri_autolink"].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "text", "uri"),
  ])
  // [ (link_label) (link_text) (image_description) ] @text.reference
  .registerAlways((e) => [
    (x) => ["link_label", "link_text", "image_description"].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "text", "reference"),
  ])
  // [ (backslash_escape) (hard_line_break) ] @string.escape
  .registerAlways((e) => [
    (x) => ["backslash_escape", "hard_line_break"].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "string", "escape"),
  ])
  // (image ["!" "[" "]" "("] @punctuation.delimiter)
  .registerAlways((e) => [
    (x) => x.text.includes(["!", "[", "]", "("]),
    (x) =>
      ["image", "inline_link", "shortcut_link", "wiki_link"].includes(
        x.parent?.type
      ),
    (x) => e.applySyntaxHighlighting(x, "punctuation", "delimiter"),
  ]);
