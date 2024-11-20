import { SqueakProject, ensureSystemChangeCallback, sqCompile } from "../squeak-project/main.js";
import { button, h } from "../../view/widgets.js";
import { useState } from "../../external/preact-hooks.mjs";

class Sources {
  constructor() {
    this.classDefinitions = new Map();
    this.methodSources = new Map();
  }

  loadFromRemote(sources, force = false) {
    const startTime = Date.now();

    let i = 1;
    const progressCounter = (arr) => `(${i++}/${arr.length})`;
    const {packageSources, extensionMethods} = sources;

    console.info("Loading class definitions...")
    for (const cls of packageSources) {
      if (force || this.doesClassDefinitionDiffer(cls.name, cls.definition)) {
        console.info(`${progressCounter(packageSources)} Loading class definition for ${cls.name}`);
        this.loadClassDefinition(cls.name, cls.definition);
      } else {
        console.info(`${progressCounter(packageSources)} Skipping class definition for ${cls.name} (already loaded)`);
      }
    } 

    for (const cls of packageSources) {
      i = 1;
      console.info(`Compiling methods of ${cls.name}...`);

      let skippedCount = 0;
      for (const method of cls.instanceMethods) {
        const methodName = `${cls.name}>>${method.selector}`;
        if (force || this.doesMethodDefinitionDiffer(methodName, method.source)) {
          console.info(`${progressCounter(cls.instanceMethods)} Compiling ${methodName}`);
          this.loadMethodDefinition(cls.name, methodName, method.source);
        } else {
          ++skippedCount;
        }
      }
      

      i = 1;
      const metaclass = cls.name + " class";
      for (const method of cls.classMethods) {
        const methodName = `${metaclass}>>${method.selector}`;
        if (force || this.doesMethodDefinitionDiffer(methodName, method.source)) {
          console.info(`${progressCounter(cls.classMethods)} Compiling ${methodName}`);
          this.loadMethodDefinition(metaclass, methodName, method.source);
        } else {
          ++skippedCount;
        }
      }
      

      if (skippedCount !==  0) {
        console.info(`(Skipped ${skippedCount}/${cls.instanceMethods.length + cls.classMethods.length})`);
      }
    }

    for (const [cls, methods] of Object.entries(extensionMethods)) {
      console.info(`Compiling extension methods in ${cls}`);

      i = 1;
      let skippedCount = 0;
      for (const method of methods) {
        const methodName = `${cls}>>${method.selector}`;
        if (force || this.doesMethodDefinitionDiffer(methodName, method.source)) {
          console.info(`${progressCounter(methods)} Compiling ${methodName}`);
          this.loadMethodDefinition(cls, methodName, method.source);
        } else {
          ++skippedCount;
        }
      }
      
      if (skippedCount !== 0) {
        console.log(`(Skipped ${skippedCount}/${methods.length})`);
      }
    }


    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor(elapsed / 1000 - minutes * 60);
    console.info(`Time to update from remote sources: ${minutes}m ${seconds}s`)
  }

  doesClassDefinitionDiffer(className, definition) {
    return this.classDefinitions.get(className) !== definition;
  }

  doesMethodDefinitionDiffer(methodName, methodSource) {
    return this.methodSources.get(methodName) !== methodSource;
  }

  loadClassDefinition(className, definition) {
    sqEval(definition);
    this.classDefinitions.set(className, definition);
  }

  loadMethodDefinition(className, methodName, methodSource) {
    sqCompile(className, methodSource);
    this.methodSources.set(methodName, methodSource);
  }
}

export class XRProject extends SqueakProject {
  static deserialize(options) {
    return new XRProject(options);
  }

  serialize() {
    return {
      path: this.connectionOptions.path,
    };
  }

  get name() {
    return "[XR] " + super.name;
  }

  constructor({path}) {
    super({
      type: "browser",
      connectionOptions: {path},
    });

    this.sources = new Sources();
  }

  async open() {
    console.info("Opening XRProject...")
    // TODO: find nicer way to access external objects like this from within squeak (instead of importing like this and using `JS VRButton`)
    window.THREE = await import("/_m/three/build/three.module.js");
    window.VRButton = (await import("/_m/three/examples/jsm/webxr/VRButton.js")).VRButton;
    window.CodeMirror = await import("/_m/codemirror/dist/index.js");

    await super.open();
    await ensureSystemChangeCallback(true);
    await this.updateFromRemote();

    this.container = document.createElement("div");
    this.container.setAttribute("id", "xr-container")
    document.body.appendChild(this.container);

    this.startWorld();
  }

  async updateFromRemote() {
    console.info("Fetching sources...");

    const sources = await fetch("/xrRemoteService/source")
      .then(response => response.json());

    console.info("Loading sources...");

    this.sources.loadFromRemote(sources);
    console.info("Finished compiling!");
  }

  async startWorld() {
    const result = await sqEval('XRWorld start');
    if (result instanceof Error) {
      console.error("An error occurred while starting the XR world.", result);
    }
  }

  renderBackground() {
    const [isLoading, setIsLoading] = useState(false);
    return h("div", {}, [
      super.renderBackground(),
      button("Update SqueakXR", async () => {
        setIsLoading(true);
        await this.updateFromRemote();
        setIsLoading(false);
      }),
      button("Restart world", () => {
        this.container.innerHTML = "";
        this.startWorld();
      }),
      isLoading ? h("p", null, "Updating SqueakXR") : null,
    ]);
  }
}

// Utilities

window.decodeByteSymbol = (selector) => {
  return Array.from(selector.bytes).map(b => String.fromCharCode(b)).join("");
}

window.printCallStack = (context) => {
  console.log(_printCallStack(context));
}

window._printCallStack = (context) => {
  try {
    return decodeByteSymbol(context.pointers[Squeak.Context_method].pointers.at(-2)) + "\n" + _printCallStack(context.pointers[Squeak.Context_sender]);
  } catch (e) {
    return "(error while retrieving selector)"
  }
}
