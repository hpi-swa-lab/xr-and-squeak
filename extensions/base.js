import { LoadOp, RemoveOp, UpdateOp } from "../core/diff.js";
import { Extension } from "../extension.js";
import { Widget } from "../widgets.js";

class DetachedShard extends Widget {
  noteProcessed(trigger, node) {
    if (trigger === "replacement") this.shard.update(this.shard.source);
  }
  get shard() {
    return this.childNodes[0];
  }
  set shard(value) {
    this.appendChild(value);
  }
}
customElements.define("sb-detached-shard", DetachedShard);

const BRACE_PAIRS = {
  "{": "}",
  "[": "]",
  "(": ")",
  '"': '"',
  "'": "'",
};
const REVERSED_BRACE_PAIRS = Object.fromEntries(
  Object.entries(BRACE_PAIRS).map(([a, b]) => [b, a])
);

function indexOfLastNewLine(string, index) {
  let i = index;
  while (i >= 0 && string[i] !== "\n") i--;
  return i;
}

function indexOfNextNewLine(string, index) {
  let i = index;
  while (i <= string.length && string[i] !== "\n") i++;
  return i;
}

function indexOfIndentEnd(string, index) {
  let i = indexOfLastNewLine(string, index) + 1;
  while (i <= index && string[i].match(/[ \t]/)) i++;
  return i;
}

export const base = new Extension()
  .registerShortcut("undo", (x, view) => view.editor.undo())

  // AST-select up-down
  .registerShortcut("selectNodeUp", (x, view, e) => {
    (!view.isFullySelected() ? x : x.parent).select(view);
    if (!x.isRoot) e.data("selectionDownList", () => []).push(x);
  })
  .registerShortcut("selectNodeDown", (x, view, e) => {
    const target = e.data("selectionDownList")?.pop();
    (target ?? x.childBlock(0) ?? x.childNode(0))?.select(view);
  })
  .registerShortcut("popNodeOut", (x, view, e) => {
    const window = document.createElement("sb-window");
    const detached = e.createWidget("sb-detached-shard");
    detached.shard = x.editor.createShardFor(x);
    window.appendChild(detached);
    x.editor.after(window);
  })
  .registerSelection((e) => [
    (x) => {
      if (!x.children.some((c) => e.data("selectionDownList")?.includes(c)))
        e.setData("selectionDownList", []);
    },
  ])

  .registerShortcut("indentLess", (x, view, e) => {
    debugger;
  })

  .registerShortcut("indentMore", (x, view, e) => {
    if (x.editor.suggestions.active) {
      x.editor.suggestions.use();
    } else {
      // TODO if we have a selection, shift whole selection
      document.execCommand("insertText", false, "\t");
    }
  })

  // insert matching parentheses
  .registerChangeFilter((change, sourceString) => {
    if (BRACE_PAIRS[change.insert]) {
      const match = BRACE_PAIRS[change.insert];
      if (change.from === change.to) change.insert += match;
      else {
        change.insert = `${change.insert}${sourceString.slice(
          change.from,
          change.to
        )}${match}`;
        change.selectionRange = [change.from + 1, change.to + 1];
      }
    }
  })

  // skip over closing parentheses
  // FIXME may want to do this only for auto-inserted parentheses
  .registerChangeFilter((change, sourceString) => {
    if (
      REVERSED_BRACE_PAIRS[change.insert] &&
      sourceString[change.from] === change.insert
    ) {
      change.insert = "";
    }
  })

  // delete matching parentheses together
  .registerChangeFilter((change, sourceString) => {
    const match = BRACE_PAIRS[change.delete];
    if (match && sourceString[change.from + 1] === match) {
      change.delete += match;
      change.to++;
    }
  })

  // indent on newline
  .registerChangeFilter((change, sourceString) => {
    if (change.insert === "\n") {
      function findLastIndent(string, index) {
        return string.slice(
          indexOfLastNewLine(string, index) + 1,
          indexOfIndentEnd(string, index)
        );
      }

      let indent = findLastIndent(sourceString, change.from - 1);
      if (BRACE_PAIRS[sourceString[change.from - 1]]) indent += "\t";
      change.insert += indent;
      change.selectionRange[0] += indent.length;
      change.selectionRange[1] += indent.length;
    }
  })

  .registerQuery("shortcut", (e) => [
    (x) => {
      function callback(shift) {
        return function (node, view) {
          const selection = node.editor.selectionRange;
          const src = node.root.sourceString;
          const start = indexOfNextNewLine(src, selection[0]);
          let index = indexOfIndentEnd(src, start - 1);
          if (index === selection[0])
            index = indexOfLastNewLine(src, start - 1) + 1;
          node.editor.selectRange(
            index,
            shift ? selection[1] : index,
            view.shard,
            false
          );
        };
      }
      e.registerShortcut(x, "home", callback(false));
      e.registerShortcut(x, "homeSelect", callback(true));
    },
  ])

  .registerSelection((e) => [
    (x) => false,
    (x) => x.isSelected,
    (x) => {
      for (const n of x.removalNodes) e.ensureClass(n, "removal-range");
    },
  ])

  .registerSelection((e) => [
    (x) => x.isSelected,
    (x) => e.ensureClass(x, "selected"),
  ])

  .registerSelection((e) => [
    (x) => x.isText,
    (x) =>
      x.root.allNodesDo(
        (n) => n.isText && n.text === x.text && e.ensureClass(n, "highlight")
      ),
  ]);

function sequenceMatch(query, word) {
  if (query.length < 2) return false;
  if (word.length < query.length) return false;
  if (query[0] !== word[0]) return false;
  if (query[1] !== word[1]) return false;

  let i = 0;
  for (const char of word.toLowerCase()) {
    if (char === query[i]) i++;
    if (i === query.length) return true;
  }
  return false;
}

const words = new Map();
function noteWord(word) {
  if (word.match(/[A-Za-z][A-Za-z_-]+/))
    words.set(word, (words.get(word) ?? 0) + 1);
}
function forgetWord(word) {
  const count = words.get(word);
  if (count === undefined) return;
  if (count <= 1) words.delete(word);
  else words.set(word, count - 1);
}
export const identifierSuggestions = new Extension()
  .registerType((e) => [
    (x) => x.isText,
    (x) => {
      const candidates = [...words.keys()];
      const query = x.text.toLowerCase();
      const exactMatches = candidates
        .filter((w) => w.toLowerCase().startsWith(query))
        .sort((a, b) => a.length - b.length);
      const fuzzyMatches = candidates
        .filter((w) => !exactMatches.includes(w) && sequenceMatch(query, w))
        .sort((a, b) => a.length - b.length);
      return e.addSuggestions(
        [...exactMatches, ...fuzzyMatches]
          .slice(0, 10)
          .filter((w) => w.toLowerCase() !== query)
      );
    },
  ])
  .registerExtensionConnected((e) => [(x) => x.isText, (x) => noteWord(x.text)])
  .registerDiffFilter((diff) => {
    diff.opsDo((op) => {
      if (op instanceof UpdateOp && op.node.isText) {
        forgetWord(op.node.text);
        noteWord(op.text);
      }
      if (op instanceof RemoveOp && op.node.isText) {
        forgetWord(op.node.text);
      }
      if (op instanceof LoadOp && op.node.isText) {
        noteWord(op.node.text);
      }
    });
  });

function insert(string, index, extra) {
  return string.substring(0, index) + extra + string.substring(index);
}
