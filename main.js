import { Editor } from "./editor.js";
import {} from "./extensions/base.js";
import {} from "./extensions/smalltalk.js";
import {} from "./extensions/javascript.js";

Editor.registerKeyMap({
  selectNodeUp: "Ctrl-ArrowUp",
  undo: "Ctrl-z",
  redo: "Ctrl-Z",
  insertFirstArg: "Alt-1",
  insertSecondArg: "Alt-2",
  insertThirdArg: "Alt-3",
  insertFourthArg: "Alt-4",
  insertFifthArg: "Alt-5",
});
