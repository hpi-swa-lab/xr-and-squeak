import { Extension } from "../extension.js";

Extension.register(
  "base",
  new Extension()
    .registerShortcut("undo", (x, view) => view.editor.undo())
    .registerShortcut("selectNodeUp", (x, view) =>
      !view.isFullySelected() ? x.select(view) : x.parent.select(view)
    )
    .registerChangeFilter((change, text) => {
      if (change.op === "insert" && change.string === "(")
        return insert(text, change.index + 1, ")");
      return text;
    })
);

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
Extension.register(
  "identifierSuggestions",
  new Extension()
    .registerQuery("type", (e) => [
      (x) => x.isText,
      (x) => {
        const candidates = [...words];
        const query = x.text.toLowerCase();
        const exactMatches = candidates
          .filter((word) => word.startsWith(x.text))
          .sort((a, b) => a.length - b.length);
        const fuzzyMatches = candidates
          .filter(
            (word) => !exactMatches.includes(word) && sequenceMatch(query, word)
          )
          .sort((a, b) => a.length - b.length);
        return e.addSuggestions(
          [...exactMatches, ...fuzzyMatches].slice(0, 10)
        );
      },
    ])
    .registerQuery("open", (e) => [
      (x) => x.isText,
      (x) => x.text.match(/[A-Za-z].+/) && words.add(x.text.trim()),
    ])
);

function insert(string, index, extra) {
  return string.substring(0, index) + extra + string.substring(index);
}
