import fs from "fs";
import { promisify } from "util";
import * as fsPath from "path";
import { fileURLToPath } from "url";
import http from "http";
import express from "express";
import { Server } from "socket.io";

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
  handler(
    socket,
    "writeFile",
    async ({ path, data }) => await promisify(fs.writeFile)(path, data)
  );

  handler(socket, "readFile", async ({ path, data }) =>
    (await promisify(fs.readFile)(path, "utf-8")).toString()
  );

  handler(socket, "openProject", async ({ path }) => {
    const recurse = async (path) => {
      const files = await promisify(fs.readdir)(path, { withFileTypes: true });
      const output = [];
      for (const file of files) {
        const out = { name: file.name };
        if (file.isDirectory()) {
          out.children = await recurse(fsPath.join(path, file.name));
        }
        output.push(out);
      }
      return output;
    };
    return { name: fsPath.basename(path), children: await recurse(path) };
  });
});

server.listen(3000, () => console.log("listening on *:3000"));
