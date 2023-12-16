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
      <sb-editor
        extensions="smalltalk:base base:base"
        text={`initialize

  true ifTrue: [2 + 2]`}
        language="smalltalk"></sb-editor>)
  ui 
</script>

## JavaScript

<script>
  var ui = await (<sb-editor
    extensions="javascript:base javascript:outline javascript:workspace base:base base:identifierSuggestions editorConfig:base"
    text={`console.log(sbWatch(hello, 12398482))

function a() {
}`}
    language="javascript"></sb-editor>)
  ui 
</script>
