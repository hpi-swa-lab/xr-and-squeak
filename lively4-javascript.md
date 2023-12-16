# JavaScript

<script>
  import {Parser} from "src/client/tree-sitter.js"
  window.TreeSitter = Parser
  import md5 from "./external/md5.js"
  ""
</script>

<script>
  var pane = <div><button click={async () => {
    console.warn("CREATE----")
    var ui = await (
      <sb-editor text={`3 + 4`} language="javascript" extensions="javascriptBase base"></sb-editor>
    console.warn("APPEND----")
    pane.appendChild(ui) 

  
  }}>start</button></div>


  pane
</script>
