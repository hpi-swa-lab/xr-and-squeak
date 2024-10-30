import { SqueakProject, ensureSystemChangeCallback, sqCompile } from "../squeak-project/main.js";
import { button, h } from "../../view/widgets.js";
import { useState } from "../../external/preact-hooks.mjs";

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
  }

  async open() {
    console.info("Opening XRProject...")
    await super.open();
    await ensureSystemChangeCallback(true);
    await this.updateFromRemote();

    // TODO: find nicer way to access external objects like this from within squeak (instead of importing like this and using `JS VRButton`)
    window.THREE = await import("/_m/three/build/three.module.js");
    window.VRButton = (await import("/_m/three/examples/jsm/webxr/VRButton.js")).VRButton;
    // window.THREE = await import(
    //   "https://unpkg.com/three@0.160.0/build/three.module.js"
    // );
    // // TODO: find nicer way to access external objects like this from within squeak (instead of importing like this and using `JS VRButton`)
    // window.VRButton = (
    //   await import(
    //     "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js"
    //   )
    // ).VRButton;

    window.CodeMirror = await import("/_m/codemirror/dist/index.js");

    this.container = document.createElement("div");
    this.container.setAttribute("id", "xr-container")
    document.body.appendChild(this.container);

    this.startWorld();
  }

  async updateFromRemote() {
    console.info("Fetching sources...");

    const {packageSources, extensionMethods} = await fetch("/xrRemoteService/source")
      .then(response => response.json());


    for (const cls of packageSources) {
      sqEval(cls.definition);
    }
    
    let i = 1;
    for (const cls of packageSources) {
      console.info(`(${i++}/${packageSources.length}) Compiling ${cls.name}...`);

      for (const method of cls.instanceMethods) {
        sqCompile(cls.name, method);
      }

      const metaclass = cls.name + " class";
      for (const method of cls.classMethods) {
        sqCompile(metaclass, method);
      }
    }

    i = 1;
    for (const [cls, methods] of Object.entries(extensionMethods)) {
      console.info(`(${i++}/${Object.entries(extensionMethods).length}) Compiling extension methods in ${cls}`);

      for (const method of methods) {
        sqCompile(cls, method);
      }
    }

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
