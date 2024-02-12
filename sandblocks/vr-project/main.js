import { SqueakProject } from "../squeak-project/main.js";

export class VRProject extends SqueakProject {
  static deserialize({ path }) {
    return new VRProject(path);
  }

  serialize() {
    return { path: this.connectionOptions.path };
  }

  get name() {
    return "[VR] " + super.name;
  }

  constructor(path) {
    super({
      type: "browser",
      connectionOptions: { path },
    });
  }

  async open() {
    await super.open();
    // ...
  }
}
