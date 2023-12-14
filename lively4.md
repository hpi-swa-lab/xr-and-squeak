# Sandblocks Text

<script>
  import {Parser} from "src/client/tree-sitter.js"
  window.TreeSitter = Parser
  import md5 from "./external/md5.js"
  ""
</script>

<script>
  import  {setConfig} from "./model.js"

  var baseDir = lively.query(this, "lively-container").getDir()
  setConfig({baseURL: baseDir})

  await System.import(baseDir + "/main.js");

  var ui = await (
    <sb-extension-scope extensions="smalltalkBase base">
      <sb-editor text={`initialize

  true ifTrue: [2 + 2]`} language="smalltalk"></sb-editor>
    </sb-extension-scope>)
  ui 
</script>

## JavaScript

<script>
  var ui = await (
    <sb-extension-scope extensions="javascriptBase javascriptOutline javascriptWorkspace base identifierSuggestions editorConfig">
      <sb-editor text={`console.log(sbWatch(hello, 12398482))

function a() {
}`} language="javascript"></sb-editor>
    </sb-extension-scope>)
  ui 
</script>


## Squeak


<script>
  var ui = await (<squeak-browser></squeak-browser>)
  ui 
</script>
