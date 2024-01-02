import { Extension } from "../extension.js";
import { Process } from "../sandblocks/process.js";
import { Semantics } from "../sandblocks/semantics.js";

function sem(x) {
  return x.context.project.semanticsForPath(x.context.path);
}

export const base = new Extension()
  .registerQuery("extensionConnected", (e) => [
    (x) => x.isRoot,
    (x) => sem(x)?.didOpen(x),
  ])
  .registerQuery("extensionDisconnected", (e) => [
    (x) => x.isRoot,
    (x) => sem(x)?.didClose(x),
  ])
  .registerQuery("save", (e) => [(x) => x.isRoot, (x) => sem(x)?.didSave(x)])
  .registerQuery("type", (e) => [(x) => sem(x)?.didChange(x)]);

export const formatting = new Extension().registerQuery("presave", (e) => [
  (x) => x.isRoot,
  (x) => sem(x)?.formatting(x),
]);

class Transport {
  constructor(request) {
    this.request = request;
  }
  async start() {}
  async write() {}
}

export class StdioTransport extends Transport {
  constructor(command, args, cwd) {
    super();
    this.command = command;
    this.args = args;
    this.cwd = cwd;
    this.buffer = "";
  }

  async start() {
    this.process = new Process()
      .onClose(this.onClose)
      .onStdout((data) => {
        this.buffer += data;
        this._processBuffer();
      })
      .onStderr(this.onStderr);
    await this.process.start(this.command, this.args, this.cwd);
  }

  _processBuffer() {
    const headerEnd = this.buffer.indexOf("\r\n\r\n");
    const header = headerEnd > 0 ? this.buffer.slice(0, headerEnd) : null;
    const size = header?.match(/Content-Length: (\d+)/i)?.[1];

    if (size) {
      const length = parseInt(size, 10);
      const start = headerEnd + 4;
      const end = start + length;
      if (this.buffer.length >= end) {
        const data = this.buffer.slice(start, end);
        this.buffer = this.buffer.slice(end);
        this.onMessage(JSON.parse(data));
        this._processBuffer();
      }
    }
  }

  async write(data) {
    await this.process.write(`Content-Length: ${data.length}\r\n\r\n${data}`);
  }
}

export class LanguageClient extends Semantics {
  lastRequestId = 0;
  pending = new Map();
  textDocumentVersions = new Map();
  queuedRequests = [];
  initialized = false;

  constructor(project, handles, transport) {
    super(project, handles);

    this.transport = transport;
    transport.onMessage = (message) => {
      if (message.method) {
        this._handleServerMessage(message);
      } else {
        const [resolve, reject] = this.pending.get(message.id);
        if (message.error) {
          reject(message.error);
        } else {
          resolve(message.result);
        }
        this.pending.delete(message.id);
      }
    };
    transport.onStderr = (data) => {
      console.error(data);
    };
    transport.onClose = (code) => {
      console.log("process closed", code);
    };
  }

  async initialize() {
    const res = await this._request("initialize", {
      rootUri: `file://${this.project.path}`,
      capabilities: {
        textDocument: {
          hover: {},
          synchronization: {
            didSave: true,
            dynamicRegistration: true,
          },
        },
        workspace: {
          applyEdit: true,
          workspaceEdit: {
            documentChanges: true,
          },
        },
      },
    });

    this.serverCapabilities = res.capabilities;

    await this._notification("initialized", {});

    this.initialized = true;
    for (const request of this.queuedRequests) {
      await this.transport.write(JSON.stringify(request));
    }
  }

  async didSave(node) {
    await this._notification("textDocument/didSave", {
      textDocument: {
        uri: `file://${node.context.path}`,
      },
      text: node.sourceString,
    });
  }

  async didOpen(node) {
    this.textDocumentVersions.set(node.context, 1);

    await this._notification("textDocument/didOpen", {
      textDocument: {
        uri: `file://${node.context.path}`,
        languageId: node.language.name,
        version: 1,
        text: node.sourceString,
      },
    });
  }

  async didChange(node) {
    const version = this.textDocumentVersions.get(node.context) + 1;
    this.textDocumentVersions.set(node.context, version);

    await this._notification("textDocument/didChange", {
      textDocument: {
        uri: `file://${node.context.path}`,
        version,
      },
      contentChanges: [{ text: node.root.sourceString }],
    });
  }

  async didClose(node) {
    this.textDocumentVersions.delete(node.context);

    await this._notification("textDocument/didClose", {
      textDocument: { uri: `file://${node.context.path}` },
    });
  }

  async formatting(node) {
    const edits = await this._request("textDocument/formatting", {
      textDocument: {
        uri: `file://${node.context.path}`,
      },
      options: { tabSize: 2 },
    });
    node.editor.setTextTracked(
      this.applyEdits(node.sourceString, edits),
      null,
      [0, 0]
    );
  }

  async start() {
    await this.transport.start();
    await this.initialize();
  }

  applyEdits(sourceString, edits) {
    let offset = 0;
    for (const {
      newText,
      range: { start, end },
    } of edits) {
      const startIndex = this.positionToIndex(sourceString, start);
      const endIndex = this.positionToIndex(sourceString, end);
      sourceString =
        sourceString.slice(0, startIndex + offset) +
        newText +
        sourceString.slice(endIndex + offset);
      offset += newText.length - (endIndex - startIndex);
    }
    return sourceString;
  }

  positionToIndex(sourceString, { line, character }) {
    let index = 0;
    for (let i = 0; i < line; i++) {
      index = sourceString.indexOf("\n", index) + 1;
    }
    return index + character;
  }

  async _handleServerMessage(message) {
    switch (message.method) {
      case "window/logMessage":
        console.log(message.params.message);
        break;
      case "textDocument/publishDiagnostics":
        console.log(message.params);
        break;
      default:
        console.log("Unhandled server message", message);
        break;
    }
  }

  _request(method, params) {
    return new Promise(async (resolve, reject) => {
      const id = ++this.lastRequestId;
      const payload = { jsonrpc: "2.0", id, method, params };

      this.pending.set(id, [resolve, reject]);

      if (!this.initialized && method !== "initialize")
        this.queuedRequests.push(payload);
      else this.transport.write(JSON.stringify(payload));
    });
  }

  async _notification(method, params) {
    const payload = { jsonrpc: "2.0", method, params };
    if (!this.initialized && method !== "initialized")
      this.queuedRequests.push(payload);
    else this.transport.write(JSON.stringify(payload));
  }
}
