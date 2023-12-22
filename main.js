import { Editor } from "./editor.js";
import {} from "./extensions/squeak.js";

Editor.registerKeyMap({
  undo: "Ctrl-z",
  redo: "Ctrl-Z",
  save: "Ctrl-s",
  cut: "Ctrl-x",
  copy: "Ctrl-c",
  dismiss: "Escape",

  selectNodeUp: "Ctrl-ArrowUp",
  selectNodeDown: "Ctrl-ArrowDown",

  insertFirstArg: "Alt-1",
  insertSecondArg: "Alt-2",
  insertThirdArg: "Alt-3",
  insertFourthArg: "Alt-4",
  insertFifthArg: "Alt-5",

  wrapWithWatch: "Ctrl-q",
  printIt: "Ctrl-p",
  browseIt: "Ctrl-b",
  resetContents: "Ctrl-l",
});

await Editor.init();
