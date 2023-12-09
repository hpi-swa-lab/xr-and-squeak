# Sandblocks Text

<script>
  import {Parser} from "src/client/tree-sitter.js"
  window.TreeSitter = Parser
  import md5 from "./md5.js"
  ""
</script>

<script>
  import  {setConfig} from "./model.js"

  var baseDir = lively.query(this, "lively-container").getDir()
  setConfig({baseURL: baseDir})

  await System.import(baseDir + "/main.js");

  var ui = await (
    <sb-extension-scope enable="smalltalkTools" disable="">
      <sb-editor text={`initialize

  true ifTrue: [2 + 2]`} language="smalltalk"></sb-editor>
    </sb-extension-scope>)
  ui 
</script>

## JavaScript

<script>
  var ui = await (
    <sb-extension-scope enable="smalltalkTools" disable="">
      <sb-editor text={`function foo(a) { return a * 2}`} language="javascript"></sb-editor>
    </sb-extension-scope>)
  ui 
</script>