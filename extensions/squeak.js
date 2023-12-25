import { Extension } from "../extension.js";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "../external/preact-hooks.mjs";
import { render } from "../external/preact.mjs";
import { ToggleableMutationObserver } from "../utils.js";
import { div, editor, h } from "../widgets.js";
import { config } from "../core/config.js";

class ToolBuilder {
  createElement(tag) {
    return document.createElement(tag);
  }

  addChild(child, parent) {
    parent.appendChild(child);
  }
}

function List({ items, onSelect, selected }) {
  return h(
    "div",
    {
      style: {
        overflow: "auto",
        maxHeight: "200px",
        minWidth: "100px",
        border: "1px solid black",
        flex: 1,
      },
    },
    items.map((item) =>
      h(
        "div",
        {
          style: {
            background: item === selected ? "#ccc" : "none",
            padding: "0.1rem",
          },
          onclick: () => onSelect(item),
        },
        item
      )
    )
  );
}

function valueList(map) {
  return map ? [...new Set(Object.values(map))].sort() : [];
}
function filterMap(map, filter) {
  if (!map) return [];
  return Object.entries(map)
    .filter(([_, cat]) => cat === filter)
    .map(([item, _]) => item)
    .sort();
}
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function saveString(s) {
  s = JSON.stringify(s).replace(/'/g, "''");
  return `(Json readFrom: '${s}' readStream) withSqueakLineEndings`;
}

async function sqCompile(cls, source) {
  await sqEval(`${cls} compile: ${saveString(source)}`);
}

let systemChangeSubscribers = [];
let systemChangeCallbackInit = false;
async function ensureSystemChangeCallback() {
  if (!systemChangeCallbackInit) {
    systemChangeCallbackInit = true;
    await sqCompile(
      "Behavior",
      `asJSArgument
        ^ {#name -> self name}`
    );
    await sqCompile(
      "AbstractEvent",
      `asJSArgument
        ^ (self class allInstVarNames collect: [:n | n asJSArgument -> (self instVarNamed: n) asJSArgument]),
          {#class -> self className}`
    );
    await sqCompile(
      "Character",
      // in this version, we are unloading the charset
      `canBeGlobalVarInitial ^ self isUppercase`
    );
    await sqCompile(
      "CompiledMethod",
      `asJSArgument
        ^ {#selector -> self selector. #class -> self methodClass asJSArgument}`
    );
    // FIXME hacks to better understand what errors are triggering
    await sqCompile(
      "Parser",
      `notify: string at: location self error: string, '' '', source contents`
    );
    await sqCompile(
      "JSObjectProxy class",
      `handleCallback
	| block args result |
	block := self primGetActiveCallbackBlock.
	args := self primGetActiveCallbackArgs.
	[result := block valueWithArguments: args]
		on: Error do: [:err | | messageStream ctx i |
			messageStream := WriteStream on: (String new: 1500).
      messageStream nextPutAll: err asString; cr; cr.

			i := 0.
			ctx := err signalerContext.
			[ctx notNil and: [i < 6]] whileTrue: [
				ctx printDetails: messageStream.
				messageStream cr.
				i := i + 1.
				ctx := ctx sender].
			result := JS Error: "err asString" messageStream contents withUnixLineEndings squeakToUtf8].
	self primReturnFromCallback: result.`
    );

    await sqEval(`SystemChangeNotifier uniqueInstance
      notify: JS window
      ofAllSystemChangesUsing: #sqSystemChangeCallback:`);
  }
}
window.sqSystemChangeCallback = function (e) {
  systemChangeSubscribers.forEach((s) => s(e));
};

function SqueakBrowserComponent({ initialClass }) {
  const evJson = async (x) => JSON.parse(await ev(x));
  const ev = async (x) => {
    const res = await sqEval(x);
    if (res instanceof Error) {
      throw res;
    }
    return res;
  };

  const [selectedSystemCategory, setSelectedSystemCategory] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSelector, setSelectedSelector] = useState(null);
  const [sourceString, setSourceString] = useState(null);

  const [systemCategoryMap, setSystemCategoryMap] = useState(null);
  const [selectorCategoryMap, setSelectorCategoryMap] = useState(null);

  const selectedClassRef = useRef(null);
  selectedClassRef.current = selectedClass;

  useEffect(() => {
    const s = (e) => {
      console.log(e);
      if (e.class === "AddedEvent" && e.itemKind === "class") {
        setSystemCategoryMap((m) => ({
          ...m,
          [e.item.name]: e.environment.category,
        }));
      } else if (e.class == "RemovedEvent" && e.itemKind === "class") {
        setSystemCategoryMap((m) => {
          const newMap = { ...m };
          delete newMap[e.item.name];
          return newMap;
        });
      } else if (
        e.class === "AddedEvent" &&
        e.itemKind === "method" &&
        e.item.class === selectedClassRef.current
      ) {
        e.environment.protocol;
      }
    };
    systemChangeSubscribers.push(s);
    return () =>
      systemChangeSubscribers.splice(systemChangeSubscribers.indexOf(s), 1);
  }, []);

  useEffect(async () => {
    const map = await evJson(
      `SystemOrganization elementCategoryDict asJsonString`
    );
    setSystemCategoryMap(map);
    if (initialClass) {
      setSelectedSystemCategory(map[initialClass]);
      setSelectedClass(initialClass);
    }

    await ensureSystemChangeCallback();
  }, []);

  useEffect(async () => {
    if (selectedClass) {
      const map = await evJson(
        `(Smalltalk at: #${selectedClass}) organization elementCategoryDict asJsonString`
      );
      setSelectorCategoryMap(map);
      setSelectedCategory(map[Object.keys(map).sort()[0]]);
    } else {
      setSelectorCategoryMap(null);
    }
  }, [selectedClass]);

  useEffect(async () => {
    if (selectedSelector) {
      const source = await evJson(
        `((Smalltalk at: #${selectedClass}) sourceCodeAt: #${selectedSelector}) withUnixLineEndings asJsonString`
      );
      setSourceString(source);
    } else if (selectedClass) {
      const source = await evJson(
        `(Smalltalk at: #${selectedClass}) definition withUnixLineEndings asJsonString`
      );
      setSourceString(source);
    } else {
      setSourceString(null);
    }
  }, [selectedSelector, selectedClass]);

  const systemCategories = useMemo(
    () => valueList(systemCategoryMap),
    [systemCategoryMap]
  );
  const classes = useMemo(
    () => filterMap(systemCategoryMap, selectedSystemCategory),
    [selectedSystemCategory, systemCategoryMap]
  );
  const selectorCategories = useMemo(
    () => valueList(selectorCategoryMap),
    [selectorCategoryMap]
  );
  const selectors = useMemo(
    () => filterMap(selectorCategoryMap, selectedCategory),
    [selectedCategory, selectorCategoryMap]
  );

  return div(
    h(
      "div",
      { style: { display: "flex" } },
      List({
        items: systemCategories,
        selected: selectedSystemCategory,
        onSelect: (i) => {
          setSelectedSystemCategory(i);
          setSelectedClass(null);
          setSelectedCategory(null);
          setSelectedSelector(null);
          setSourceString(null);
        },
      }),
      List({
        items: classes,
        selected: selectedClass,
        onSelect: (i) => {
          setSelectedClass(i);
          setSelectedCategory(null);
          setSelectedSelector(null);
          setSourceString(null);
        },
      }),
      List({
        items: selectorCategories,
        selected: selectedCategory,
        onSelect: (i) => {
          setSelectedCategory(i);
          setSelectedSelector(null);
          setSourceString(null);
        },
      }),
      List({
        items: selectors,
        selected: selectedSelector,
        onSelect: setSelectedSelector,
      })
    ),
    h(
      "div",
      { style: { border: "1px solid black" } },
      editor({
        extensions: ["smalltalk:base", "squeak:base", "base:base"],
        sourceString,
        language: "smalltalk",
        onSave: async (source) => {
          if (selectedSelector) {
            await ev(
              `(Smalltalk at: #${selectedClass})
              compile: ${saveString(source)}
              classified: ${saveString(selectedCategory)}`
            );
          } else {
            await ev(`(Smalltalk at: #${selectedClass}) subclassDefinerClass
                evaluate: ${saveString(source)}
                in: nil environment
                notifying: nil
                logged: false`);
          }
        },
      })
    )
  );
}

class SqueakBrowser extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<style>
    :host {
      font-family: DejaVu Sans;
      font-size: 0.9em;
      min-height: 300px;
    }
    </style>
    <div id="browser"></div>`;
    render(
      h(SqueakBrowserComponent, { initialClass: "SequenceableCollection" }),
      this.shadowRoot.querySelector("#browser")
    );
  }
}

export const base = new Extension()
  .registerSave((e) => [
    (x) => x.type === "method",
    (x) =>
      x.editor.dispatchEvent(
        new CustomEvent("save", { detail: x.editor.sourceString })
      ),
  ])
  .registerShortcut("printIt", async (x, view, e) => {
    const widget = e.createWidget("sb-js-print-result");
    console.log(x.editor.textForShortcut);
    widget.result = await sqEval(x.editor.textForShortcut);
    ToggleableMutationObserver.ignoreMutation(() => {
      view.after(widget);
      widget.focus();
    });
  })
  .registerShortcut("browseIt", async (x, view, e) => {
    const widget = document.createElement("squeak-browser");
    widget.initialClass = x.editor.textForShortcut;
    const windowComponent = document.createElement("lively-window");
    windowComponent.appendChild(widget);
    document.body.appendChild(windowComponent);
    windowComponent.focus();
    // widget.scrollIntoView({
    //   behavior: "smooth",
    //   block: "center",
    //   inline: "center",
    // });
  })
  .registerShortcut("resetContents", async (x, view, e) => {
    const editor = x.editor;
    editor.setAttribute("text", x.editor.getAttribute("text"));
    editor.shard.focus();
  });

let init = false;
if (!init) {
  init = true;
  const module = await import(
    "../external/squeak_headless_with_plugins_bundle.js"
  );
  runHeadless(config.baseURL + "/external/squeak-minimal.image");
  await wait(1000);
  customElements.define("squeak-browser", SqueakBrowser);
  // x.editor.shadowRoot.appendChild(e.createWidget("squeak-browser"));
}

async function runHeadless(imageUrl) {
  const imageData = await (
    await fetch(imageUrl, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
    })
  ).arrayBuffer();

  const image = new Squeak.Image("minimal");
  image.readFromBuffer(imageData, function startRunning() {
    const display = { vmOptions: ["-vm-display-null", "-nodisplay"] };
    const vm = new Squeak.Interpreter(image, display);
    function run() {
      try {
        vm.interpret(50, function (ms) {
          if (!display.quitFlag) {
            setTimeout(run, ms === "sleep" ? 10 : 100);
          }
        });
      } catch (e) {
        console.error("Failure during Squeak run: ", e);
      }
    }
    run();
  });
}

async function setupTHREEJS() {
  console.log("SETUP");
  window.THREE = await import(
    "https://unpkg.com/three@0.160.0/build/three.module.js"
  );
  window.VRButton = (
    await import(
      "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js"
    )
  ).VRButton;
  window.Scene = THREE.Scene;
  window.PerspectiveCamera = THREE.PerspectiveCamera;
  window.WebGLRenderer = THREE.WebGLRenderer;
  window.Mesh = THREE.Mesh;
  window.Geometry = THREE.Geometry;
  window.BoxGeometry = THREE.BoxGeometry;
  window.MeshBasicMaterial = THREE.MeshBasicMaterial;
  window.Vector3 = THREE.Vector3;
  window.Euler = THREE.Euler;
  window.Quaternion = THREE.Quaternion;
  window.Matrix4 = THREE.Matrix4;
  window.Color = THREE.Color;

  console.log(
    await sqEval(`
    | cam scene renderer geometry material cube block |
    cam := JS PerspectiveCamera new: 75 aspect: JS window innerWidth asFloat / JS window innerHeight near: 0.1 far: 1000.
    scene := JS Scene new.
    renderer := JS WebGLRenderer new.
    renderer xr enabled: true.
    renderer setAnimationLoop: [
      cam position y: cam position y + 0.01.
      renderer render: scene camera: cam].
  
    JS window document body appendChild: renderer domElement.

    geometry := JS BoxGeometry new: 1 y: 1 z: 1.
    material := JS MeshBasicMaterial new: ({#color -> 16r00ff00} as: Dictionary).
    cube := JS Mesh new: geometry material: material.
    scene add: cube.

    cam position z: 5.

    JS window document body appendChild: (JS VRButton createButton: renderer).
    `)
  );
  console.log("SETUP");
}

// await setupTHREEJS();
