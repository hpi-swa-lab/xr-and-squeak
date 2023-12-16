# Hello CodeMirror!

<script>
  import {Parser} from "src/client/tree-sitter.js"
  window.TreeSitter = Parser
  import md5 from "./../external/md5.js"
   
  ""
</script>

<script>
  import  {SBParser, setConfig} from "../model.js"

  var baseDir = lively.query(this, "lively-container").getDir()
  setConfig({baseURL: baseDir + '../'})

  // await System.import(baseDir + "/main.js");
  await SBParser.init();
</script>

<script>

import {} from './cm-editor.js';

await (<cm-dc-editor text="asd" language="javascript" extensions="javascript:base"></cm-dc-editor>)

</script>