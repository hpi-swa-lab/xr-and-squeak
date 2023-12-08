import { Extension } from "../extension.js";

Extension.register(
  "base",
  new Extension()
    .registerQuery("shortcut", (e) => [
      (x) => e.registerShortcut(x, "undo", ([x, view]) => view.editor.undo()),
    ])
    .registerQuery("shortcut", (e) => [
      (x) =>
        e.registerShortcut(x, "selectNodeUp", ([x, view]) =>
          x.parent.select(view)
        ),
    ])
);
