import { button } from "../view/widgets.js";
import { config } from "./config.js";

export class Project extends EventTarget {
  async open() {}

  // array of { path: string, hash: string }
  get allSources() {}

  get name() {}

  async writeFile(path, source) {
    throw new Error("writeFile not implemented");
  }

  async readFile(path) {
    return (await this.readFiles([path]))[0].data;
  }

  _data = new Map();
  data(key, ifAbsent) {
    if (this._data.has(key)) return this._data.get(key);
    const value = ifAbsent();
    this._data.set(key, value);
    return value;
  }
  clearData(key) {
    this._data.delete(key);
  }

  activeSemantics = [];
  semanticsForPath(path, configuration) {
    for (const semantics of this.activeSemantics) {
      if (semantics.handles(path)) return semantics;
    }

    for (const { handles, create } of configuration) {
      if (handles(path)) {
        const instance = create(this, handles);
        instance.start();
        this.activeSemantics.push(instance);
        return instance;
      }
    }

    return null;
  }

  // return an array of { path: string, data: string }
  async readFiles(paths) {}

  inAllFilesDo(filterScript, mapScript, reduceScript, reduceArgs) {
    return new Promise((resolve) => {
      const worker = new Worker(config.url("core/background.js"), {
        type: "module",
      });
      worker.onerror = (event) => {
        console.error(event);
      };
      worker.postMessage({
        type: "run_script",
        mapScript: mapScript.toString(),
        reduceScript: reduceScript.toString(),
        reduceArgs,
        fileHashes: this.allSources.filter((file) => filterScript(file.path)),
      });
      worker.addEventListener("message", async (event) => {
        switch (event.data.type) {
          case "request_files":
            worker.postMessage({
              type: "respond_files",
              files: await this.readFiles(event.data.files),
            });
            break;
          case "done":
            worker.terminate();
            resolve(event.data.result);
            break;
        }
      });
    });
  }

  renderItem({ onClose }) {
    return [this.name, button("Close", onClose)];
  }

  renderBackground() {
    return null;
  }

  serialize() {}

  fullSerialize() {
    return {
      ...this.serialize(),
      type: this.constructor.name,
    };
  }
}
