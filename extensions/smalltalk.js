import { Extension } from "../core/extension.js";
import { caseOf, exec, mapSeparated, withDo } from "../utils.js";
import { ExpandToShard, Replacement, h, shard } from "../view/widgets.js";

export const smalltalkMethodSelector = [
  (x) => x.orAnyParent((y) => y.type === "method"),
  (x) =>
    x.children.find((y) =>
      ["keyword_selector", "unary_selector", "binary_selector"].includes(y.type)
    ),
];

export const smalltalkMethodArguments = [
  ...smalltalkMethodSelector,
  (x) => x.children.filter((y) => y.type === "identifier"),
];

export function selectorAndArgs(node) {
  return {
    selector: node.childBlocks
      .filter((s) =>
        ["keyword", "binary_operator", "unary_identifier"].includes(s.type)
      )
      .map((s) => s.sourceString)
      .join(""),
    arguments: node.childBlocks.filter(
      (s) => s.compatibleWith("expression") && s.field !== "receiver"
    ),
  };
}

export function cascadedMessages(cascade) {
  return [cascade.childBlock(0), ...cascade.childBlocks.slice(1)].map(
    selectorAndArgs
  );
}

// assume unique one-arg messages
export function cascadedConstructorFor(node, name) {
  const c = `${name} new`;

  if (node.matches(c)) {
    if (node.parent?.parent?.type === "cascade") {
      return {
        receiver: node,
        messages: cascadeToMap(node.parent.parent),
        root: node.parent.parent,
      };
    }

    if (node.parent?.type === "keyword_message") {
      return {
        receiver: node,
        messages: Object.fromEntries([
          withDo(selectorAndArgs(node.parent), (x) => [
            x.selector.replace(":", ""),
            x.arguments[0],
          ]),
        ]),
        root: node.parent,
      };
    }

    return { receiver: node, messages: [], root: node };
  }

  return null;
}

export function cascadedConstructorShardsFor(node, name, defaults) {
  const d = cascadedConstructorFor(node, name);
  if (d === null) return null;

  const { receiver, messages: fields, root } = d;
  return [
    root,
    Object.fromEntries(
      Object.entries(defaults).map(([field, v]) => {
        if (!(field in fields))
          return [
            field,
            caseOf(v.mode ?? "shard", {
              literal: () => ({
                get: () => v.default,
                set: (value) => addCascadedMessageTo(receiver, field, value),
              }),
              array: () => console.assert(false, "not yet impl"),
              shard: () =>
                h(ExpandToShard, {
                  field: field,
                  expandCallback: (input) => {
                    addCascadedMessageTo(receiver, field, input);
                    const position = receiver.editor.selection.range[0];
                    receiver.editor.selectRange(position - 1, position - 1);
                  },
                  ...v,
                }),
            }),
          ];
        else {
          const node = fields[field];
          return [
            field,
            caseOf(v.mode ?? "shard", {
              literal: () => ({
                get: () => node.sourceString,
                set: (value) => node.replaceWith(value),
              }),
              shard: () => shard(node),
              array: () => ({
                elements: node.query("{$$$elements}").elements,
                insert: (i, value) => node.insert(value, "expression", i),
                delete: (i) =>
                  node
                    .query("{$$$elements}")
                    .elements[i].removalNodes.forEach((n) => n.replaceWith("")),
              }),
            }),
          ];
        }
      })
    ),
  ];
}

// assumes cascade of unique one-arg messages
function cascadeToMap(cascade) {
  return cascadedMessages(cascade).reduce(
    (acc, { selector, arguments: [arg] }) => {
      acc[selector.replace(":", "")] = arg;
      return acc;
    },
    {}
  );
}

// FIXME limited to one-arg messages
function addCascadedMessageTo(node, message, arg) {
  if (node.parent.parent.type === "cascade") {
    node.parent.parent.wrapWith("", `; ${message}: ${arg}`);
    return;
  }
  if (
    ["keyword_message", "binary_message", "unary_message"].includes(
      node.parent.type
    )
  ) {
    node.parent.wrapWith("", `; ${message}: ${arg}`);
    return;
  }
  node.wrapWith("", ` ${message}: ${arg}`);
}

export const base = new Extension()
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

  .registerExtensionConnected((e) => [
    (x) => x.query("<sandblocksExtensions: #($$$extensions)>"),
    (x) => x.extensions.forEach((e) => e.editor.addExtension(e.text)),
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
    (x) => e.applySyntaxHighlighting(x, "string"),
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
