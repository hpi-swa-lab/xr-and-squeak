import { Extension } from "../extension.js";

export const base = new Extension()
  // tla+ keywords
  .registerAlways((e) => [
    (x) =>
      [
        "ASSUME",
        "ASSUMPTION",
        "AXIOM",
        "AXIOMS",
        "CASE",
        "CHOOSE",
        "CONSTANT",
        "CONSTANTS",
        "CONSTRAINT",
        "CONSTRAINTS",
        "ELSE",
        "ENABLED",
        "EXCEPT",
        "EXTENDS",
        "IF",
        "IN",
        "INSTANCE",
        "LET",
        "LOCAL",
        "MODULE",
        "OTHER",
        "SF_",
        "SUBSET",
        "SUBSET_OF",
        "THEN",
        "THEOREM",
        "UNCHANGED",
        "UNION",
        "VARIABLE",
        "VARIABLES",
        "WF_",
        "WITH",
      ].includes(x.text),
    (x) => e.applySyntaxHighlighting(x, "keyword"),
  ])
  .registerAlways((e) => [
    (x) =>
      [
        "address",
        "all_map_to",
        "assign",
        "case_arrow",
        "case_box",
        "def_eq",
        "exists",
        "forall",
        "gets",
        "label_as",
        "maps_to",
        "set_in",
        "temporal_exists",
        "temporal_forall",
      ].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "keyword"),
  ])

  // literals
  .registerAlways((e) => [
    (x) =>
      x.type === "format" &&
      ["binary_number", "hex_number", "octal_number"].includes(x.parent?.type),
    (x) => e.applySyntaxHighlighting(x, "keyword"),
  ])
  .registerAlways((e) => [
    (x) =>
      x.type === "value" &&
      ["binary_number", "hex_number", "octal_number"].includes(x.parent?.type),
    (x) => e.applySyntaxHighlighting(x, "number"),
  ])
  .registerAlways((e) => [
    (x) =>
      ["boolean", "int_number", "nat_number", "real_number"].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "number"),
  ])
  .registerAlways((e) => [
    (x) =>
      [
        "boolean_set",
        "int_number_set",
        "nat_number_set",
        "real_number_set",
        "string_set",
      ].includes(x.type),
    (x) => e.applySyntaxHighlighting(x, "type"),
  ])

  // namespaces and includes
  .registerAlways((e) => [
    (x) => x.type === "identifier_ref" && x.parent?.type === "extends",
    (x) => e.applySyntaxHighlighting(x, "module"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "identifier_ref" && x.parent?.type === "instance",
    (x) => e.applySyntaxHighlighting(x, "module"),
  ])
  .registerAlways((e) => [
    (x) => x.parent?.type === "module" && x.field === "name",
    (x) => e.applySyntaxHighlighting(x, "module"),
  ])

  // constants and variables
  .registerAlways((e) => [
    (x) => x.type === "identifier" && x.parent?.type === "constant_declaration",
    (x) => e.applySyntaxHighlighting(x, "constant"),
  ])
  .registerAlways((e) => [
    (x) =>
      x.field === "name" &&
      x.parent?.type === "operator_declaration" &&
      x.parent?.parent?.type === "constant_declaration",
    (x) => e.applySyntaxHighlighting(x, "constant"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "identifier" && x.previousSiblingNode?.text === ".",
    (x) => e.applySyntaxHighlighting(x, "attribute"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "identifier" && x.parent?.type === "record_literal",
    (x) => e.applySyntaxHighlighting(x, "attribute"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "identifier" && x.parent?.type === "set_of_records",
    (x) => e.applySyntaxHighlighting(x, "attribute"),
  ])
  .registerAlways((e) => [
    (x) => x.type === "identifier" && x.parent?.type === "variable_declaration",
    (x) => e.applySyntaxHighlighting(x, "variable", "builtin"),
  ])

  // parameters
  // (choose (identifier) @variable.parameter)
  .registerAlways((e) => [
    (x) => x.type === "identifier" && x.parent?.type === "choose",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])
  // (choose (tuple_of_identifiers (identifier) @variable.parameter))
  .registerAlways((e) => [
    (x) => x.type === "identifier" && x.parent?.type === "tuple_of_identifiers",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])
  // (lambda (identifier) @variable.parameter)
  .registerAlways((e) => [
    (x) => x.type === "identifier" && x.parent?.type === "lambda",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])
  // (module_definition (operator_declaration name: (_) @variable.parameter))
  .registerAlways((e) => [
    (x) =>
      x.field === "name" &&
      x.parent?.type === "operator_declaration" &&
      x.parent?.parent?.type === "module_definition",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])
  // (module_definition parameter: (identifier) @variable.parameter)
  .registerAlways((e) => [
    (x) =>
      x.type === "identifier" &&
      x.parent.type === "module_definition" &&
      x.parent?.field === "parameter",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])
  // (operator_definition (operator_declaration name: (_) @variable.parameter))
  .registerAlways((e) => [
    (x) =>
      x.field === "name" &&
      x.parent.type === "operator_declaration" &&
      x.parent?.parent?.type === "operator_definition",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])
  // (operator_definition parameter: (identifier) @variable.parameter)
  .registerAlways((e) => [
    (x) =>
      x.type === "identifier" &&
      x.parent.type === "operator_definition" &&
      x.parent?.field === "parameter",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])
  // (quantifier_bound (identifier) @variable.parameter)
  .registerAlways((e) => [
    (x) => x.type === "identifier" && x.parent.type === "quantifier_bound",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])
  // (quantifier_bound (tuple_of_identifiers (identifier) @variable.parameter))
  .registerAlways((e) => [
    (x) => x.type === "identifier" && x.parent.type === "tuple_of_identifiers",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])
  // (unbounded_quantification (identifier) @variable.parameter)
  .registerAlways((e) => [
    (x) =>
      x.type === "identifier" && x.parent.type === "unbounded_quantification",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])

  // Operators, functions, and macros
  // (function_definition name: (identifier) @function)
  .registerAlways((e) => [
    (x) =>
      x.type === "identifier" &&
      x.parent.type === "function_definition" &&
      x.parent?.field === "name",
    (x) => e.applySyntaxHighlighting(x, "function"),
  ])
  // (module_definition name: (_) @module)
  .registerAlways((e) => [
    (x) =>
      x.field === "name" &&
      x.parent.type === "module_definition" &&
      x.parent?.field === "name",
    (x) => e.applySyntaxHighlighting(x, "module"),
  ])
  // (operator_definition name: (_) @operator)
  .registerAlways((e) => [
    (x) =>
      x.field === "name" &&
      x.parent.type === "operator_definition" &&
      x.parent?.field === "name",
    (x) => e.applySyntaxHighlighting(x, "operator"),
  ])
  // (recursive_declaration (identifier) @operator)
  .registerAlways((e) => [
    (x) =>
      x.type === "identifier" &&
      x.parent.type === "recursive_declaration" &&
      x.parent?.field === "name",
    (x) => e.applySyntaxHighlighting(x, "operator"),
  ])
  // (recursive_declaration (operator_declaration name: (_) @operator))
  .registerAlways((e) => [
    (x) =>
      x.field === "name" &&
      x.parent.type === "operator_declaration" &&
      x.parent?.parent?.type === "recursive_declaration",
    (x) => e.applySyntaxHighlighting(x, "operator"),
  ])

  .registerAlways((e) => [
    (x) => ["(", ")", "[", "]", "{", "}"].includes(x.text),
    (x) => e.applySyntaxHighlighting(x, "punctuation", "bracket"),
  ])
  .registerAlways((e) => [
    (x) =>
      ["langle_bracket", "rangle_bracket", "rangle_bracket_sub"].includes(
        x.type
      ),
    (x) => e.applySyntaxHighlighting(x, "punctuation", "bracket"),
  ])

  .registerAlways((e) => [
    (x) =>
      ["bullet_conj", "bullet_disj", "prev_func_val", "placeholder"].includes(
        x.type
      ),
    (x) => e.applySyntaxHighlighting(x, "punctuation", "delimiter"),
  ])
  .registerAlways((e) => [
    (x) => [",", ":", ".", "!", ";"].includes(x.text),
    (x) => e.applySyntaxHighlighting(x, "punctuation", "delimiter"),
  ])

  // ; Proofs
  // (assume_prove (new (identifier) @variable.parameter))
  .registerAlways((e) => [
    (x) =>
      x.type === "identifier" &&
      x.parent.type === "assume_prove" &&
      x.parent?.field === "new",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])
  // (assume_prove (new (operator_declaration name: (_) @variable.parameter)))
  .registerAlways((e) => [
    (x) =>
      x.field === "name" &&
      x.parent.type === "operator_declaration" &&
      x.parent?.parent?.type === "assume_prove" &&
      x.parent?.parent?.field === "new",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])
  // (assumption name: (identifier) @constant)
  .registerAlways((e) => [
    (x) =>
      x.field === "name" &&
      x.parent.type === "assumption" &&
      x.parent?.field === "name",
    (x) => e.applySyntaxHighlighting(x, "constant"),
  ])
  // (pick_proof_step (identifier) @variable.parameter)
  .registerAlways((e) => [
    (x) =>
      x.type === "identifier" &&
      x.parent.type === "pick_proof_step" &&
      x.parent?.field === "parameter",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])
  // (proof_step_id "<" @punctuation.bracket)
  .registerAlways((e) => [
    (x) => x.type === "proof_step_id",
    (x) => e.applySyntaxHighlighting(x, "punctuation", "bracket"),
  ])
  // (proof_step_id (level) @tag)
  .registerAlways((e) => [
    (x) => x.type === "proof_step_id" && x.field === "level",
    (x) => e.applySyntaxHighlighting(x, "tag"),
  ])
  // (proof_step_id (name) @tag)
  .registerAlways((e) => [
    (x) => x.type === "proof_step_id" && x.field === "name",
    (x) => e.applySyntaxHighlighting(x, "tag"),
  ])
  // (proof_step_id ">" @punctuation.bracket)
  .registerAlways((e) => [
    (x) => x.type === "proof_step_id",
    (x) => e.applySyntaxHighlighting(x, "punctuation", "bracket"),
  ])
  // (proof_step_ref "<" @punctuation.bracket)
  .registerAlways((e) => [
    (x) => x.type === "proof_step_ref",
    (x) => e.applySyntaxHighlighting(x, "punctuation", "bracket"),
  ])
  // (proof_step_ref (level) @tag)
  .registerAlways((e) => [
    (x) => x.type === "proof_step_ref" && x.field === "level",
    (x) => e.applySyntaxHighlighting(x, "tag"),
  ])
  // (proof_step_ref (name) @tag)
  .registerAlways((e) => [
    (x) => x.type === "proof_step_ref" && x.field === "name",
    (x) => e.applySyntaxHighlighting(x, "tag"),
  ])
  // (proof_step_ref ">" @punctuation.bracket)
  .registerAlways((e) => [
    (x) => x.type === "proof_step_ref",
    (x) => e.applySyntaxHighlighting(x, "punctuation", "bracket"),
  ])
  // (take_proof_step (identifier) @variable.parameter)
  .registerAlways((e) => [
    (x) =>
      x.type === "identifier" &&
      x.parent.type === "take_proof_step" &&
      x.parent?.field === "parameter",
    (x) => e.applySyntaxHighlighting(x, "variable", "parameter"),
  ])
  // (theorem name: (identifier) @constant)
  .registerAlways((e) => [
    (x) =>
      x.field === "name" &&
      x.parent.type === "theorem" &&
      x.parent?.field === "name",
    (x) => e.applySyntaxHighlighting(x, "constant"),
  ])
  // ; Comments and tags
  // (block_comment "(*" @comment)
  .registerAlways((e) => [
    (x) => x.parent?.type === "block_comment" && x.text === "(*",
    (x) => e.applySyntaxHighlighting(x, "comment"),
  ])
  // (block_comment "*)" @comment)
  .registerAlways((e) => [
    (x) => x.parent?.type === "block_comment" && x.text === "*)",
    (x) => e.applySyntaxHighlighting(x, "comment"),
  ])
  // (block_comment_text) @comment
  .registerAlways((e) => [
    (x) => x.type === "block_comment_text",
    (x) => e.applySyntaxHighlighting(x, "comment"),
  ])
  // (comment) @comment
  .registerAlways((e) => [
    (x) => x.type === "comment",
    (x) => e.applySyntaxHighlighting(x, "comment"),
  ])
  // (single_line) @comment
  .registerAlways((e) => [
    (x) => x.type === "single_line",
    (x) => e.applySyntaxHighlighting(x, "comment"),
  ])
  // (_ label: (identifier) @tag)
  .registerAlways((e) => [
    (x) => x.type === "identifier" && x.field === "label",
    (x) => e.applySyntaxHighlighting(x, "tag"),
  ])
  // (label name: (_) @tag)
  .registerAlways((e) => [
    (x) => x.field === "name" && x.parent.type === "label",
    (x) => e.applySyntaxHighlighting(x, "tag"),
  ]);

// TODO
// ; Put these last so they are overridden by everything else
// (bound_infix_op symbol: (_) @function.builtin)
// (bound_nonfix_op symbol: (_) @function.builtin)
// (bound_postfix_op symbol: (_) @function.builtin)
// (bound_prefix_op symbol: (_) @function.builtin)
// ((prefix_op_symbol) @function.builtin)
// ((infix_op_symbol) @function.builtin)
// ((postfix_op_symbol) @function.builtin)
//
// ; Reference highlighting
// (identifier_ref) @variable.reference
// ((prefix_op_symbol) @variable.reference)
// (bound_prefix_op symbol: (_) @variable.reference)
// ((infix_op_symbol) @variable.reference)
// (bound_infix_op symbol: (_) @variable.reference)
// ((postfix_op_symbol) @variable.reference)
// (bound_postfix_op symbol: (_) @variable.reference)
// (bound_nonfix_op symbol: (_) @variable.reference)
