import { Extension } from "../../core/extension.js";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "../../external/preact-hooks.mjs";
import { render } from "../../external/preact.mjs";
import { ToggleableMutationObserver, orParentThat, wait } from "../../utils.js";
import { button, editor, h } from "../../view/widgets.js";
import { config } from "../../core/config.js";
import { Project } from "../../core/project.js";
import { runHeadless } from "../../external/squeak_headless_with_plugins_bundle.js";
import { List } from "../list.js";
import { openComponentInWindow } from "../window.js";
import {} from "../../view/widget-utils.js";

// Use RPC with:
/*
  server := WebServer new
 	  listenOn: 9823;
 	  addService: '/sbEval' action: [:req |
 	  	req
 	  		send200Response: (Compiler evaluate: req content)
 	  		contentType: 'text/plain'
 	  		do: [:res | res headerAt: 'Access-Control-Allow-Origin' put: '*']];
 	  errorHandler: [:err :request | ToolSet debugException: err];
 	  yourself.
  "server destroy"
*/

export class SqueakProject extends Project {
  static deserialize({ sqType, portOrPath, restore }) {
    return new SqueakProject(sqType, portOrPath, restore);
  }

  serialize() {
    return {
      sqType: this.type,
      portOrPath: this.port ?? this.path,
      restore: [...document.body.querySelectorAll("[sq-restore]")].map((e) => {
        // TODO filter for windows that belong to this project
        const window = orParentThat(e, (p) => p.tagName === "SB-WINDOW");
        return {
          ...JSON.parse(e.getAttribute("sq-restore")),
          initialSize: window?.size,
          initialPosition: window?.position,
        };
      }),
    };
  }

  constructor(type, portOrPath, restore) {
    super();

    this.type = type;
    if (this.type === "rpc") this.port = portOrPath;
    else this.path = portOrPath;

    this.restore = restore;
  }

  get name() {
    return this.type === "rpc" ? `Squeak RPC ${this.port}` : this.path;
  }

  async open() {
    if (this.type === "rpc") {
      window.sqEval = async (x) => {
        const res = await fetch(`http://localhost:${this.port}/sbEval`, {
          method: "POST",
          body: x,
        });
        return await res.text();
      };
    } else {
      await runHeadless(config.baseURL + this.path);
      await wait(1000);
    }

    for (const window of (this.restore ?? [])) {
      console.assert(window.type === "browser");
      openComponentInWindow(
        SqueakBrowserComponent,
        {
          initialClass: window.initialClass,
          initialSelector: window.initialSelector,
        },
        {
          doNotStartAttached: true,
          initialSize: window.initialSize,
          initialPosition: window.initialPosition,
        }
      );
    }
  }

  renderBackground() {
    return button("Open Browser", () => {
      openComponentInWindow(SqueakBrowserComponent, {
        initialClass: "SequenceableCollection",
      });
    });
  }
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

    // FIXME temporarily disabled, rpc does not support it
    if (false)
      await sqEval(`SystemChangeNotifier uniqueInstance
      notify: JS window
      ofAllSystemChangesUsing: #sqSystemChangeCallback:`);

    const SQUEAK_JS_HACKS = false;
    if (SQUEAK_JS_HACKS) {
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
    }
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
        `((Smalltalk at: #${selectedClass}) sourceCodeAt: #${selectedSelector}) string withUnixLineEndings asJsonString`
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

  const listStyles = {
    flex: 1,
    minHeight: 120,
  };
  return h(
    "div",
    {
      style: { display: "flex", flexDirection: "column", flex: "1 1" },
      "sq-restore": JSON.stringify({
        type: "browser",
        initialClass: selectedClass,
        initialSelector: selectedSelector,
      }),
    },
    h(
      "div",
      { style: { display: "flex" } },
      List({
        style: listStyles,
        items: systemCategories,
        selected: selectedSystemCategory,
        setSelected: (i) => {
          setSelectedSystemCategory(i);
          setSelectedClass(null);
          setSelectedCategory(null);
          setSelectedSelector(null);
          setSourceString(null);
        },
      }),
      List({
        style: listStyles,
        items: classes,
        selected: selectedClass,
        setSelected: (i) => {
          setSelectedClass(i);
          setSelectedCategory(null);
          setSelectedSelector(null);
          setSourceString(null);
        },
      }),
      List({
        style: listStyles,
        items: selectorCategories,
        selected: selectedCategory,
        setSelected: (i) => {
          setSelectedCategory(i);
          setSelectedSelector(null);
          setSourceString(null);
        },
      }),
      List({
        style: listStyles,
        items: selectors,
        selected: selectedSelector,
        setSelected: setSelectedSelector,
      })
    ),
    h(
      "div",
      { style: { overflowY: "auto", flexGrow: 1, height: 0 } },
      editor({
        style: { minHeight: "100%" },
        extensions: ["smalltalk:base", "base:base"],
        inlineExtensions: [base],
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

const base = new Extension()
  .registerSave((e) => [
    (x) => x.type === "method",
    (x) =>
      x.editor.dispatchEvent(
        new CustomEvent("save", { detail: x.editor.sourceString })
      ),
  ])
  .registerShortcut("printIt", async (x, view, e) => {
    const widget = e.createWidget("sb-print-result");
    widget.result = JSON.parse(
      await sqEval(`(${x.editor.textForShortcut}) printString asJsonString`)
    );
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

customElements.define("squeak-browser", SqueakBrowser);
