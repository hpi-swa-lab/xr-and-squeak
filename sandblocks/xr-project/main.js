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
    window.THREE = await import(
      "https://unpkg.com/three@0.160.0/build/three.module.js"
    );
    // TODO: find nicer way to access external objects like this from within squeak (instead of importing like this and using `JS VRButton`)
    window.VRButton = (
      await import(
        "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js"
      )
    ).VRButton;
    window.HTMLMesh = (
      await import(
        "/sandblocks/xr-project/external/HTMLMesh.js"
      )
    ).HTMLMesh;

    this.container = document.createElement("div");
    this.container.setAttribute("id", "xr-container")
    document.body.appendChild(this.container);

    this.startWorld();
  }

  async updateFromRemote() {
    const {packageSources, extensionMethods} = await fetch("/source")
      .then(response => response.json());


    for (const cls of packageSources) {
      sqEval(cls.definition);
    }
    
    for (const cls of packageSources) {
      for (const method of cls.instanceMethods) {
        sqCompile(cls.name, method);
      }

      const metaclass = cls.name + " class";
      for (const method of cls.classMethods) {
        sqCompile(metaclass, method);
      }
    }

    for (const [cls, methods] of Object.entries(extensionMethods)) {
      for (const method of methods) {
        sqCompile(cls, method);
      }
    }
  }

  startWorld() {
    sqEval('XRWorld start');
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
