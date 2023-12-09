# Sandblocks Text

<script>
  import "src/client/tree-sitter.js"
  import md5 from "./md5.min.js"
  
  window.md5 = md5
  
  // await lively.loadJavaScriptThroughDOM("md5x", lively4url + '/../sandblocks-text/md5.min.js')
                                                                 
  // window.md5= md5
  ""
</script>

<script>
  import  {SBParser, setConfig} from "./model.js"
  import {} from "./view.js";
  import {} from "./smalltalk.js";
  import {} from "./javascript.js";

//   // initialize language.... 
  var baseDir = lively.query(this, "lively-container").getDir()
  setConfig({baseURL: baseDir})
 
  var ui = await (
    <sb-extension-scope enable="smalltalkTools" disable="">
      <sb-editor text={`initialize

  true ifTrue: [2 + 2]`} language="smalltalk"></sb-editor>
    </sb-extension-scope>)
  ui 
  
  // var inspector = await lively.create("lively-inspector")
  // inspector.inspect(node)
  // inspector
</script>

## JavaScript

<script>
  var ui = await (
    <sb-extension-scope enable="smalltalkTools" disable="">
      <sb-editor text={`function foo(a) { return a * 2}`} language="javascript"></sb-editor>
    </sb-extension-scope>)
  ui 
  
  // var inspector = await lively.create("lively-inspector")
  // inspector.inspect(node)
  // inspector
</script>