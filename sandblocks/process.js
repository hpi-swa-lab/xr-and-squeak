import { request, socket } from "./main.js";

export class Process {
  static complete(command, args, cwd, input) {
    return new Promise(async (resolve) => {
      const process = new Process();
      await process.start(command, args, cwd);
      await process.write(input);
      await process.close();

      const out = [];
      const err = [];
      process.onStdout((data) => out.push(data));
      process.onStderr((data) => err.push(data));
      process.onClose(() => resolve(out.join("")));
    });
  }

  async start(command, args, cwd) {
    const res = await request("startProcess", { command, args, cwd });
    this.pid = res.pid;

    socket.on("process", (data) => {
      if (data.pid === this.pid) {
        switch (data.type) {
          case "close":
            this._onClose?.(data.code);
            break;
          case "stderr":
            this._onStderr?.(data.data);
            break;
          case "stdout":
            this._onStdout?.(data.data);
            break;
        }
      }
    });
  }

  onStdout(cb) {
    this._onStdout = cb;
    return this;
  }

  onStderr(cb) {
    this._onStderr = cb;
    return this;
  }

  onClose(cb) {
    this._onClose = cb;
    return this;
  }

  async write(data) {
    console.assert(!!this.pid);
    await request("writeProcess", { pid: this.pid, data });
  }

  async close() {
    console.assert(!!this.pid);
    await request("closeProcess", { pid: this.pid });
  }
}
