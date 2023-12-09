import { SBParser } from "./model.js";
import { Editor } from "./editor.js";
import { Block, Text, Shard } from "./view.js";

import {} from "./extensions/base.js";
import {} from "./extensions/smalltalk.js";
import {} from "./extensions/javascript.js";

await SBParser.init();
customElements.define("sb-shard", Shard);
customElements.define("sb-block", Block);
customElements.define("sb-text", Text);
customElements.define("sb-editor", Editor);

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
