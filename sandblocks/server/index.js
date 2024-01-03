import fs from "fs";
import { promisify } from "util";
import * as fsPath from "path";
import { fileURLToPath } from "url";
import http from "http";
import express from "express";
import { Server } from "socket.io";
import { exec, spawn } from "child_process";
import Gitignore from "gitignore-fs";
import crypto from "crypto";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(
  express.static(
    fsPath.join(fsPath.dirname(fileURLToPath(import.meta.url)), "../../")
  )
);

function callback(cb) {
  return async (data, send) => {
    // try {
    const ret = await cb(data);
    send(ret);
    // } catch (e) { send({ error: e.toString() }); }
  };
}

function handler(socket, name, cb) {
  socket.on(name, callback(cb));
}

io.on("connection", (socket) => {
  const cleanup = [];

  socket.on("disconnect", () => {
    cleanup.forEach((cb) => cb());
  });

  handler(socket, "writeFile", async ({ path, data }) => {
    await promisify(fs.writeFile)(path, data);
    return {};
  });

  // TODO handle file deleted --> skip
  handler(
    socket,
    "readFiles",
    async ({ paths }) =>
      await Promise.all(
        paths.map((path) =>
          promisify(fs.readFile)(path, "utf-8").then((b) => ({
            path,
            hash: crypto.createHash("sha1").update(b).digest("hex"),
            data: b.toString(),
          }))
        )
      )
  );

  // TODO handle path does not exist
  handler(socket, "openProject", async ({ path }) => {
    const recurse = async (path, relPath, ignore) => {
      const files = await promisify(fs.readdir)(path, { withFileTypes: true });
      const output = [];
      for (const file of files) {
        const myAbsPath = fsPath.join(path, file.name);
        const myRelPath =
          fsPath.join(relPath, file.name) + (file.isDirectory() ? "/" : "");
        if (await ignore.ignores(myRelPath)) continue;

        const out = {
          name: file.name,
        };
        if (file.isDirectory()) {
          out.children = await recurse(myAbsPath, myRelPath, ignore);
        } else {
          const data = await promisify(fs.readFile)(myAbsPath, "utf-8");
          out.hash = crypto.createHash("sha1").update(data).digest("hex");
        }
        output.push(out);
      }
      return output;
    };

    const ignore = new Gitignore();
    return {
      name: fsPath.basename(path),
      children: await recurse(path, "", ignore),
    };
  });

  handler(socket, "installLanguage", async ({ repo, branch, path }) => {
    const repoName = repo.split("/")[1];
    const upToRoot = path
      .split("/")
      .map(() => "..")
      .join("/");

    return await promisify(exec)(`bash -c "mkdir -p languages
cd languages
wget https://github.com/${repo}/archive/${branch}.zip
unzip ${branch}.zip
cd ${repoName}-${branch}/${path}
npm install
npx tree-sitter generate
npx tree-sitter build-wasm
cp ${repoName}.wasm ${upToRoot}/../../../external/${repoName}.wasm"`);
  });

  handler(socket, "startProcess", async ({ command, args, cwd }) => {
    const proc = spawn(command, args, { cwd, shell: true });
    const pid = proc.pid;

    const weakProc = new WeakRef(proc);
    cleanup.push(() => weakProc.deref()?.kill());

    const writeCallback = (req) => {
      if (req.pid === pid) proc.stdin.write(req.data);
    };
    const closeCallback = (req) => {
      if (req.pid === pid) proc.stdin.end();
    };

    socket.on("writeProcess", writeCallback);
    socket.on("closeProcess", closeCallback);
    proc.stdout.on("data", (data) => {
      socket.emit("process", { type: "stdout", data: data.toString(), pid });
    });
    proc.stderr.on("data", (data) => {
      console.log(data.toString());
      socket.emit("process", { type: "stderr", data: data.toString(), pid });
    });
    proc.on("close", (code) => {
      socket.emit("process", { type: "close", code, pid });
      socket.off("writeProcess", writeCallback);
      socket.off("closeProcess", closeCallback);
    });
    return { pid };
  });
});

server.listen(3000, () => console.log("listening on *:3000"));
