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
  
  
  var vis = await (<sandblocks-tree-matches style="display: inline-block"></sandblocks-tree-matches>)

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

  let operations = <ul style="display: inline-block; width:120px"></ul>

  editor1.editor.on("change", (() => update()).debounce(500));
  editor2.editor.on("change", (() => update()).debounce(500));

  function selectOperation(op) {
    lively.openInspector(op)
  }

  function update() {
    var a = language.parse(editor2.value)
    let b = language.parse(editor1.value)
  
    vis.tree2 = a;
    vis.tree1 = b;
    
    const { root, buffer } = new TrueDiff().detectEdits(a,b)
    
    
    // lively.openInspector(root)
    operations.innerHTML = ""
    
    for (let op of buffer.posBuf) {
      operations.appendChild(<li click={() => selectOperation(op)}>{op.constructor.name} {op.node.id}</li>)
    }
    
    vis.edits = buffer 
    vis.update()
  }
  
  update()
  
  let pane = <div>
    {editor1}{editor2}
    <table>
      <tr><td>{operations}</td>
      <td>{vis}</td>
      </tr>
    </table>
  </div>
  
  
  pane
</script>