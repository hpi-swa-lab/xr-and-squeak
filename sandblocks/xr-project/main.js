import { SqueakProject, ensureSystemChangeCallback, sqCompile } from "../squeak-project/main.js";

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

    const source = await fetch(`http://localhost:${this.connectionOptions.port}/source`)
      .then(response => response.json());

    for (const cls of source) {
      sqEval(cls.definition);
    }
    
    for (const cls of source) {
      for (const method of cls.methods) {
        sqCompile(cls.name, method);
      }
    }
  }
}
