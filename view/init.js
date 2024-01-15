// Include this file to automatically init any sb-editor
// instances in your html. Also loads the required CSS.

import { Editor } from "./editor.js";
Editor.init();

const css = document.createElement("link");
css.href = "view/editor-style.css";
css.rel = "stylesheet";
document.head.appendChild(css);
