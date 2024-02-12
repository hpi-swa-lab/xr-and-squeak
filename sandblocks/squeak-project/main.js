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

// Install Yaros from: https://github.com/LinqLover/yaros
// Use Yaros with:
/*
  yaros1 := YarosServer new
    connector: (YarosHTTPPollingServerConnector remoteName: 'localhost' clientPort: 8084 serverPort: 8085);
    yourself.
  "optional"
  yaros1 debugLog: Transcript.
  yaros1 start.

  "to stop"
  yaros1 stop.
*/

export class SqueakProject extends Project {
  static deserialize({ sqType, connectionOptions, restore }) {
    return new SqueakProject({
      type: sqType,
      connectionOptions,
      restore
    });
  }

  serialize() {
    return {
      sqType: this.type,
      connectionOptions: this.connectionOptions,
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

  constructor(options) {
    super();

    ({
      type: this.type,
      connectionOptions: this.connectionOptions,
      restore: this.restore
    } = options);
  }

  get name() {
    return ({
      browser: () => this.connectionOptions.path,
      rpc: () => `Squeak RPC ${this.connectionOptions.port}`,
      yaros: () => `Yaros ${this.connectionOptions.path} (${this.connectionOptions.ports.join('/')})`,
    }[this.type]());
  }

  async open() {
    await ({
      browser: () => this.openBrowser(),
      rpc: () => this.openRPC(),
      yaros: () => this.openYaros(),
    }[this.type]());

    // performance measurements
    const _sqEval = window.sqEval;
    window.sqEval = async (x) => {
      const start = performance.now();
      const res = await _sqEval(x);
      const end = performance.now();
      (window.times ??= []).push(end - start);
      console.debug(`sqEval ${x} took ${end - start}ms`);
      return res;
    };
    await ensureSystemChangeCallback(this.type === 'browser');

    window.sqEscapeString = (string) => string.replaceAll("'", "''");

    window.sqQuery = async (sqObjectOrExpression, query) => {
      if (query?._sqId) query = (({ _sqId }) => ({ _sqId }))(query); // optimization
      const result = JSON.parse(await sqEval(`
        | object result |
        object := '${sqEscapeString(JSON.stringify(sqObjectOrExpression))}' withSqueakLineEndings parseAsJson.
        object ifNotNil:
          [object := (object respondsTo: #_sqId)
            ifTrue: [OragleProjects objectForId: object _sqId]
            ifFalse: [Compiler evaluate: object]].
        query := '${sqEscapeString(JSON.stringify(query ?? null))}' withSqueakLineEndings parseAsJson.
        result := OragleProjects resolveQuery: query for: object.
        ^ result asJsonString copyReplaceAll: '\\r' with: '\\r\\n'
      `));
      Object.assign(result, {
        _sqQuery: async (query) => await sqQuery(result, query),
        // FIXME: update should deep merge new values and abort for all nested objects not explicitly requested by query
        _sqUpdateQuery: async (query) => Object.assign(result, await result._sqQuery(
          // top-level structure must equal existing object
          typeof query !== 'object' ? [query] : query)),
      });
      return result;
    };

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

  async openBrowser() {
    await runHeadless(config.baseURL + this.connectionOptions.path);
    await wait(1000);
    // sqEval is now bootstrapped from the start-up logic in the image
    // E.g., the image could contain the following in a startUp method or at the bottom of REPLCleaner class>>#cleanupImage (using https://github.com/hpi-swa-lab/cloud-squeak):
    // JS window at: #sqEval put: [:text | Compiler evaluate: text].
  }

  async openRPC() {
    window.sqEval = async (x) => {
      const res = await fetch(`http://localhost:${this.connectionOptions.port}/sbEval`, {
        method: "POST",
        body: x,
      });
      return await res.text();
    };
  }

  async openYaros() {
    await this.openBrowser();

    window.sqEvalBrowser = window.sqEval;
    await window.sqEval(`
      Transcript showln: 'Starting yaros...'.
      Smalltalk at: #Yaros2 put: (YarosServer new
        connector:
          ((YarosHTTPPollingClientConnector remoteName: 'localhost' clientPort: ${this.connectionOptions.ports[0]} serverPort: ${this.connectionOptions.ports[1]})
            webClientFactory: (MessageSend receiver: YarosJSWebClient selector: #new));
        yourself).
      Yaros2 start.
      Transcript showln: 'Started ' , Yaros2.
      JS Promise new: [:startResolve :startReject |
        [[| remoteCompiler |
        remoteCompiler := Yaros2 remoteObjectNamed: #Compiler.
        Transcript showln: 'yaros: found remote compiler'.
        startResolve call: nil with:
          (JS window at: #sqEval put: [:text |
            JS Promise new: [:resolve :reject |
              [[resolve call: nil with: (remoteCompiler evaluate: text)]
                on: Error do: [:ex | reject call: nil with: ex asString]]
                  fork]])]
          on: Error do: [:ex | startReject call: nil with: ex asString]]
            fork].
    `);
    await wait(1000);
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
async function ensureSystemChangeCallback(needsPatches) {
  if (!systemChangeCallbackInit) {
    systemChangeCallbackInit = true;

    // FIXME temporarily disabled, rpc does not support it
    if (false)
      await sqEval(`SystemChangeNotifier uniqueInstance
      notify: JS window
      ofAllSystemChangesUsing: #sqSystemChangeCallback:`);

    if (needsPatches) {
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

// TODO: Fix order of entries inside panes (yes, valueList and filterMap answer correctly sorted data, order seems to be destroyed later)
// TODO: Add true instance/class button instead of 'class@' prefixes, add support for meta class definitions
function SqueakBrowserComponent({ initialClass, initialSelector }) {
  const evJson = async (x) => JSON.parse(await ev(x));
  const ev = async (x) => {
    const res = await sqEval(x);
    if (res instanceof Error) {
      throw res;
    }
    return res;
  };

  const [initialized, setInitialized] = useState(false);
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
  }, []);

  useEffect(async () => {
    if (selectedClass) {
      const map = await evJson(
        `((Smalltalk at: #${selectedClass}) organization elementCategoryDict , ((Smalltalk at: #${selectedClass}) class organization elementCategoryDict associations collect: [:assoc | 'class@' , assoc key -> ('class@' , assoc value)] as: Dictionary)) asJsonString`
      );
      setSelectorCategoryMap(map);

      let category;
      if (initialSelector && !initialized) {
        setInitialized(true);
        category = map[initialSelector];
      }
      setSelectedCategory(category ?? map[Object.keys(map).sort()[0]]);
      setSelectedSelector(initialSelector);
    } else {
      setSelectorCategoryMap(null);
    }
  }, [selectedClass]);

  useEffect(async () => {
    if (selectedSelector) {
      const source = await evJson(
        `| selector string |
        "selectedClass and selectedSelector are sometimes out of sync"
        string := (((Smalltalk at: #${selectedClass}) ${selectedSelector.startsWith('class@') ? ' class' : ''}) sourceCodeAt: #${selectedSelector.startsWith('class@') ? selectedSelector.slice(6) : selectedSelector} ifAbsent: [])
          ifNil: ['missing']
          ifNotNil: [:source | source asString].
        string withUnixLineEndings asJsonString`
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
              `(Smalltalk at: #${selectedClass}) ${selectedSelector.startsWith('class@') ? ' class' : ''}
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
      await sqEval(`
        [| result |
        result := Compiler evaluate: '${sqEscapeString(x.editor.textForShortcut)}'.
        [result printString asJsonString]
          on: Error , Warning , Halt do: [:ex | ('<print error: {1}>' format: {ex}) asJsonString]]
            on: UndeclaredVariableNotification do: [:ex | ('⚡ undeclared: ' , (ex instVarNamed: 'name')) asJsonString]
            on: Error , Warning , Halt do: [:ex | ('⚡ ' , ex) asJsonString]`
      )
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
