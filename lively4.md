# Sandblocks Text

<script>
  import  {setConfig} from "./core/config.js"
  import {Editor} from "./view/editor.js";
  
  var baseDir = lively.query(this, "lively-container").getDir()
  setConfig({baseURL: baseDir})

   Editor.init()

  // await System.import(baseDir + "/main.js");

//   var ui = await (
//       <sb-editor
//         extensions="smalltalk:base base:base"
//         text={`initialize

//   true ifTrue: [2 + 2]`}
//         language="smalltalk"></sb-editor>)
//   ui 

 "loaded editor"

</script>

## JavaScript

<script>
  var ui = await (<sb-editor
    extensions="javascript:base base:base base:identifierSuggestions editorConfig:base"
    text={`console.log(sbWatch(hello, 12398482))

function a() {
}`}
    language="javascript"></sb-editor>)
    
  let style = <link href="https://lively-kernel.org/lively4/sandblocks-text/view/editor-style.css" rel="stylesheet" />
  let pane = <div>{style}{ui}</div> 
  pane
</script>
