# Matches

<script>

//   import  {setConfig} from "../core/config.js"
//   import {Editor} from "../view/editor.js";
//   var baseDir = lively.query(this, "lively-container").getDir()

//   debugger
//   setConfig({baseURL: baseDir + "/../"})
//   Editor.init()


  import { TrueDiff } from "../core/diff.js";
  import {languageFor} from "../core/languages.js"

  let editor1 = await (<lively-code-mirror style="display:inline-block; width: 400px; height: 200px; border: 1px solid gray"></lively-code-mirror>)
  let editor2 = await (<lively-code-mirror style="display:inline-block; width: 400px; height: 200px; border: 1px solid gray"></lively-code-mirror>)


  const language = languageFor("javascript")
  
  await language.ready()
  
  
  var vis = await (<sandblocks-tree-matches></sandblocks-tree-matches>)

  // editor1.value =  `let a = 3 + 4`   
  editor1.value =  `class Test { 
  foo(i) { 
    if (i == 0) return "Foo!"
  } 
}`   
  editor2.value = `let a = 3 + 4\na++`      
  editor2.value = `class Test { 
  foo(i) { 
    if (i == 0) return "Bar"
    else if (i == -1) return "Foo!"
  } 
}`      

  editor1.editor.on("change", (() => update()).debounce(500));
  editor2.editor.on("change", (() => update()).debounce(500));

  function update() {
    vis.tree2 = language.parse(editor2.value )._tree;
    vis.tree1 = language.parse(editor1.value)._tree;
    // vis.matches = match(vis.tree1.rootNode, vis.tree2.rootNode, 0, 100)
    
    vis.matches = []
    
    // lively.openInspector(vis.tree2)
    
    vis.update()
  }
  
  update()
  
  let pane = <div>
    {editor1}{editor2}
    {vis}
  </div>
  
  
  pane
</script>