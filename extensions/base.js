import { Extension } from "../extension.js";

Extension.register(
  "base",
  new Extension()
    .registerQuery("shortcut", (e) => [
      (x) => e.registerShortcut(x, "undo", ([x, view]) => view.editor.undo()),
    ])
    .registerQuery("shortcut", (e) => [
      (x) =>
        e.registerShortcut(x, "selectNodeUp", ([x, view]) => {
          if (!view.isFullySelected()) x.select(view);
          else x.parent.select(view);
        }),
    ])
    .registerChangeFilter((change, text) => {
      if (change.op === "insert" && change.string === "(")
        return insert(text, change.index + 1, ")");
      return text;
    })
);

function insert(string, index, extra) {
  return string.substring(0, index) + extra + string.substring(index);
}
