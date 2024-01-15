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

import {} from './scm-editor.js';

await (<scm-editor text="let a = 231" language="javascript" extensions="javascript:base javascript:smileys"></scm-editor>)

</script>
