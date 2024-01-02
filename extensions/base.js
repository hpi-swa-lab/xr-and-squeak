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
        let i = index;
        while (i >= 0 && string[i] !== "\n") i--;
        i++;
        const start = i;
        while (i <= index && string[i].match(/[ \t]/)) i++;
        return string.slice(start, i);
      }

      let indent = findLastIndent(sourceString, change.from - 1);
      if (BRACE_PAIRS[sourceString[change.from - 1]]) indent += "\t";
      change.insert += indent;
      change.selectionRange[0] += indent.length;
      change.selectionRange[1] += indent.length;
    }
  })

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

const words = new Set();
export const identifierSuggestions = new Extension()
  .registerType((e) => [
    (x) => x.isText,
    (x) => {
      const candidates = [...words];
      const query = x.text.toLowerCase();
      const exactMatches = candidates
        .filter((word) => word.toLowerCase().startsWith(query))
        .sort((a, b) => a.length - b.length);
      const fuzzyMatches = candidates
        .filter(
          (word) => !exactMatches.includes(word) && sequenceMatch(query, word)
        )
        .sort((a, b) => a.length - b.length);
      return e.addSuggestions([...exactMatches, ...fuzzyMatches].slice(0, 10));
    },
  ])
  .registerExtensionConnected((e) => [
    (x) => x.isText,
    (x) => x.text.match(/[A-Za-z].+/) && words.add(x.text.trim()),
  ]);

function insert(string, index, extra) {
  return string.substring(0, index) + extra + string.substring(index);
}
