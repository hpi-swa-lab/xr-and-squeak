# Sandblocks Text

<script>
  import "src/client/tree-sitter.js"
  import md5 from "https://lively-kernel.org/lively4/sandblocks-text/md5.min.js"
  window.md5= md5
  ""
</script>

<script>
  import  {SBParser} from "./model.js"
  import "./view-contenteditable.js"

  // initialize language.... 
  var baseDir = lively.query(this, "lively-container").getDir()
  await SBParser.parseText(
          "3+4",
          "smalltalk",
          "https://lively-kernel.org/lively4/sandblocks-text/")

  var ui = await (
    <sb-extension-scope enable="smalltalkTools" disable="">
      <sb-editor text="initialize" language="smalltalk"></sb-editor>
    </sb-extension-scope>)
  ui 
</script>

