import { SBParser } from "./model.js";
import { Editor } from "./editor.js";
import { Block, Text, Shard } from "./view.js";

import {} from "./extensions/base.js";
import {} from "./extensions/smalltalk.js";
import {} from "./extensions/javascript.js";
import {} from "./extensions/editorConfig.js";
import { ExtensionScope } from "./extension.js";

await SBParser.init();
customElements.define("sb-extension-scope", ExtensionScope);
customElements.define("sb-shard", Shard);
customElements.define("sb-block", Block);
customElements.define("sb-text", Text);
customElements.define("sb-editor", Editor);

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
});

const reload = document.createElement("button");
document.body.appendChild(reload);
reload.innerText = "Reload";
reload.onclick = () =>
  (document.body.innerHTML = `<sb-extension-scope extensions="smalltalkBase base">
      <sb-editor text="init" language="smalltalk"></sb-editor>
    </sb-extension-scope>`);
