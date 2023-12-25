# Hello CodeMirror!

<script>
  import {Parser} from "src/client/tree-sitter.js"
  window.TreeSitter = Parser
  import md5 from "./../external/md5.js"
   
  ""
</script>

<script>
  import {setConfig} from "../core/config.js"

  var baseDir = lively.query(this, "lively-container").getDir()
  setConfig({baseURL: baseDir + '../'})
</script>

<script>

import {} from './cm-editor.js';

await (<cm-dc-editor text="asd" language="javascript" extensions="javascript:base javascript:workspace"></cm-dc-editor>)

</script>
