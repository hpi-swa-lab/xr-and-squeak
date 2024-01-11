# Sandblocks Text

<script>
  import  {setConfig} from "./core/config.js"
  import {Editor} from "./view/editor.js";
  
  var baseDir = lively.query(this, "lively-container").getDir()
  setConfig({baseURL: baseDir})

  Editor.init()

  var ui = await (<sb-editor
    extensions="javascript:base javascript:table javascript:smileys javascript:colorstrings base:base base:identifierSuggestions editorConfig:base"
    text={`console.log(sbWatch(hello, 12398482))

let a = 3 + 4, c = 3
const b = a + 1

var color = 'rgba(100,10,10,0.5)'

var foo = 'not a color'

var table = [[1,22],['x' + 4, 'hello']]

function a() {
}`}
    language="javascript"></sb-editor>)
  
  
  
  
  let style = <link href="https://lively-kernel.org/lively4/sandblocks-text/view/editor-style.css" rel="stylesheet" />
  let pane = <div>{style}{ui}</div> 
  pane
</script>
