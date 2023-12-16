import { Extension } from "../extension.js";

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
  .registerSelection((e) => [
    (x) => {
      if (!x.children.some((c) => e.data("selectionDownList")?.includes(c)))
        e.setData("selectionDownList", []);
    },
  ])

  .registerChangeFilter((change, text) => {
    // FIXME disabled until we can reliably type-over closing braces
    if (false && change.op === "insert" && change.string === "(")
      return insert(text, change.index + 1, ")");
    return text;
  });

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
