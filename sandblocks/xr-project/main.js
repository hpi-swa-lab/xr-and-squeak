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
      port: this.connectionOptions.port,
    };
  }

  get name() {
    return "[XR] " + super.name;
  }

  constructor({path, port}) {
    console.log(path, port);
    super({
      type: "browser",
      connectionOptions: {path, port},
    });
  }

  async open() {
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

    sqEval('XRWorld start');
  }

  async updateFromRemote() {
    const source = await fetch(`http://localhost:${this.connectionOptions.port}/source`)
      .then(response => response.json());

    for (const cls of source) {
      sqEval(cls.definition);
    }
    
    for (const cls of source) {
      for (const method of cls.instanceMethods) {
        sqCompile(cls.name, method);
      }

      const metaclass = cls.name + " class";
      for (const method of cls.classMethods) {
        sqCompile(metaclass, method);
      }
    }
  }

  renderBackground() {
    const [isLoading, setIsLoading] = useState(false);
    return h("Fragment", {}, [
      super.renderBackground(),
      button("Update SqueakXR", async () => {
        setIsLoading(true);
        await this.updateFromRemote();
        setIsLoading(false);
      }),
      isLoading ? h("p", null, "Updating SqueakXR") : null,
    ]);
  }
}
