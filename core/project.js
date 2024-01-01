import { config } from "./config.js";

export class Project {
  async open() {}

  // array of { path: string, hash: string }
  get allSources() {}

  async writeFile(path, source) {}

  async readFile(path) {
    return (await this.readFiles([path]))[0].data;
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
        console.log(event);
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
}
