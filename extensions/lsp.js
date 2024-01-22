import { Extension } from "../core/extension.js";
import { Semantics } from "../sandblocks/semantics.js";
import { openComponentInWindow } from "../sandblocks/window.js";
import { Process } from "../sandblocks/host.js";
import { FileEditor } from "../sandblocks/file-project/file-editor.js";
import { sequenceMatch } from "../utils.js";

const LSP_SYMBOL_KIND = {
  file: 1,
  module: 2,
  namespace: 3,
  package: 4,
  class: 5,
  method: 6,
  property: 7,
  field: 8,
  constructor: 9,
  enum: 10,
  interface: 11,
  function: 12,
  variable: 13,
  constant: 14,
  string: 15,
  number: 16,
  boolean: 17,
  array: 18,
  object: 19,
  key: 20,
  null: 21,
  enumMember: 22,
  struct: 23,
  event: 24,
  operator: 25,
  typeParameter: 26,
};

const lspSymbolKindIcons = {
  [LSP_SYMBOL_KIND.file]: "draft",
  [LSP_SYMBOL_KIND.module]: "description",
  [LSP_SYMBOL_KIND.namespace]: "category",
  [LSP_SYMBOL_KIND.package]: "package_2",
  [LSP_SYMBOL_KIND.class]: "account_tree",
  [LSP_SYMBOL_KIND.method]: "crisis_alert",
  [LSP_SYMBOL_KIND.property]: "line_start_circle",
  [LSP_SYMBOL_KIND.field]: "line_start_circle",
  [LSP_SYMBOL_KIND.constructor]: "star",
  [LSP_SYMBOL_KIND.enum]: "list",
  [LSP_SYMBOL_KIND.interface]: "new_releases",
  [LSP_SYMBOL_KIND.function]: "target",
  [LSP_SYMBOL_KIND.variable]: "timeline",
  [LSP_SYMBOL_KIND.constant]: "circle",
  [LSP_SYMBOL_KIND.string]: "abc",
  [LSP_SYMBOL_KIND.number]: "123",
  [LSP_SYMBOL_KIND.boolean]: "done",
  [LSP_SYMBOL_KIND.array]: "data_array",
  [LSP_SYMBOL_KIND.object]: "data_object",
  [LSP_SYMBOL_KIND.key]: "key",
  [LSP_SYMBOL_KIND.null]: "check_box_outline_blank",
  [LSP_SYMBOL_KIND.enumMember]: "chevron_right",
  [LSP_SYMBOL_KIND.struct]: "event_list",
  [LSP_SYMBOL_KIND.event]: "flag",
  [LSP_SYMBOL_KIND.operator]: "plus",
  [LSP_SYMBOL_KIND.typeParameter]: "play_shapes",
};

const LSP_TEXT_DOCUMENT_SYNC_KIND = {
  none: 0,
  full: 1,
  incremental: 2,
};

const configuration = [
  {
    handles(path) {
      return (
        path.endsWith(".ts") ||
        path.endsWith(".js") ||
        path.endsWith(".tsx") ||
        path.endsWith(".jsx")
      );
    },
    create(project, handles) {
      return new LanguageClient(
        project,
        handles,
        new StdioTransport(
          "typescript-language-server",
          ["--stdio"],
          project.root.path
        )
      );
    },
  },
];

function sem(x) {
  return x.context?.project.semanticsForPath(x.context.path, configuration);
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
  .registerChangesApplied((changes, oldSource, newSource, root, _diff) => {
    sem(root)?.didChange(root, oldSource, newSource, changes);
  });

export const formatting = new Extension().registerPreSave((e) => [
  (x) => x.isRoot,
  (x) => sem(x)?.formatting(x),
]);

export const suggestions = new Extension().registerType((e) => [
  async (x) => {
    if (!sem(x)) return;
    // always re-add our old suggestions while we wait for fresh ones
    // to come in, to prevent a brief flash during wait
    const current = e.data("lsp-current-completion") ?? [];
    e.addSuggestions(x, current);

    const promise = sem(x).completion(x);
    e.setData("lsp-completion", promise);
    const suggestions = await promise;
    // check that no other completion has been started since
    if (e.data("lsp-completion") === promise) {
      const list = suggestions
        .sort((a, b) => a.sortText.localeCompare(b.sortText))
        .filter((b) =>
          sequenceMatch(
            b.filterText?.toLowerCase() ?? x.text.toLowerCase(),
            b.label.toLowerCase()
          )
        )
        .slice(0, 30)
        .map((b) => ({
          insertText: b.insertText,
          label: b.label,
          icon: lspSymbolKindIcons[b.kind],
          fetchDetail: async () => {
            const full = await sem(x)?.completionItemResolve(b);
            // update our old item with all info
            Object.assign(b, full);
            return full.detail;
          },
          use: (x) => {
            x.replaceWith(b.insertText ?? b.label);
            if (b.additionalTextEdits) {
              const selection = x.editor.selectionRange;
              const shard = x.editor.selectedShard;

              const edits = b.additionalTextEdits.map((e) => convertEdit(x, e));
              x.editor.applyChanges(edits, [0, 0]);

              // potentially shift selection to accommodate inserts before the cursor
              for (const edit of edits) {
                if (edit.to < selection[0]) {
                  selection[0] += edit.insert.length - (edit.to - edit.from);
                  selection[1] += edit.insert.length - (edit.to - edit.from);
                }
              }

              x.editor.selectRange(...selection, shard, false);
            }
          },
        }));

      e.setData("lsp-current-completion", list);
      x.editor.clearSuggestions();
      e.addSuggestions(x, list);
    }
  },
]);

function convertEdit(node, edit) {
  return {
    from: positionToIndex(node.root.sourceString, edit.range.start),
    to: positionToIndex(node.root.sourceString, edit.range.end),
    insert: edit.newText,
  };
}

function positionToIndex(sourceString, { line, character }) {
  let index = 0;
  for (let i = 0; i < line; i++) {
    index = sourceString.indexOf("\n", index) + 1;
  }
  return index + character;
}
function indexToPosition(sourceString, index) {
  let line = 0;
  let character = 0;
  for (let i = 0; i < index; i++) {
    if (sourceString[i] === "\n") {
      line++;
      character = 0;
    } else {
      character++;
    }
  }
  return { line, character };
}

async function browseLocation(project, { uri, range: { start, end } }) {
  const path = uri.slice("file://".length);
  // FIXME loading the file twice this way...
  const position = positionToIndex(await project.readFile(path), start);

  openComponentInWindow(FileEditor, {
    initialSelection: [position, position],
    project,
    path,
  });
}

export const browse = new Extension().registerShortcut(
  "browseIt",
  async (node, view, e) => {
    const symbols = await sem(node)?.workspaceSymbols(node.text);
    const top = symbols
      .filter((sym) => sym.name === node.text)
      .sort((a, b) => a.kind - b.kind)[0];

    if (top) browseLocation(node.context.project, top.location);
  }
);

export const diagnostics = new Extension().registerQuery(
  "lsp-diagnostics",
  (e) => [
    (x) => x.isRoot,
    (x) => {
      for (const diagnostic of sem(x)?.diagnosticsFor(x.context.path) ?? []) {
        const start = positionToIndex(x.sourceString, diagnostic.range.start);
        const end = positionToIndex(x.sourceString, diagnostic.range.end);
        const target = x.childEncompassingRange([start, end]);
        const severity = ["", "error", "warning", "info", "hint"][
          diagnostic.severity
        ];
        e.ensureClass(target, `diagnostic-${severity}`);
        for (const tag of diagnostic.tags ?? []) {
          const t = ["", "unnecessary", "deprecated"][tag];
          e.ensureClass(target, `diagnostic-${t}`);
        }
        e.attachData(
          target,
          "diagnostic",
          (v) => (v.title = diagnostic.message),
          (v) => (v.title = null)
        );
      }
    },
  ]
);

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
    this.buffer = new Uint8Array();
  }

  appendData(data) {
    const newBuffer = new Uint8Array(this.buffer.length + data.length);
    newBuffer.set(this.buffer);
    newBuffer.set(data, this.buffer.length);
    this.buffer = newBuffer;
  }

  async start() {
    this.process = new Process()
      .onClose(this.onClose)
      .onStdout((data) => {
        this.appendData(data);
        this._processBuffer();
      })
      .onStderr(this.onStderr);
    await this.process.start(this.command, this.args, this.cwd, true);
  }

  _processBuffer() {
    const headerEnd = this.buffer.indexOf(13); // \r for \r\n\r\n sequence
    const prefix = new TextDecoder().decode(this.buffer.slice(0, headerEnd));
    const size = prefix?.match(/Content-Length: (\d+)/i)?.[1];

    if (size) {
      const length = parseInt(size, 10);
      const start = headerEnd + 4;
      const end = start + length;

      if (this.buffer.length >= end) {
        const data = this.buffer.slice(start, end);
        this.onMessage(JSON.parse(new TextDecoder().decode(data)));
        this.buffer = this.buffer.slice(end);
        this._processBuffer();
      }
    }
  }

  async write(data) {
    const payload = new TextEncoder().encode(data);
    const header = `Content-Length: ${payload.length}\r\n\r\n`;
    const full = new Uint8Array(header.length + payload.length);
    full.set(new TextEncoder().encode(header));
    full.set(payload, header.length);
    await this.process.write(full);
  }
}

export class LanguageClient extends Semantics {
  lastRequestId = 0;
  pending = new Map();
  textDocumentVersions = new Map();
  diagnostics = new Map();
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
        window: { workDoneProgress: true },
        textDocument: {
          hover: {},
          synchronization: {
            didSave: true,
            dynamicRegistration: true,
          },
          completion: {
            dynamicRegistration: true,
            completionItem: {
              documentationFormat: ["markdown", "plaintext"],
              preselectSupport: true,
              insertReplaceSupport: true,
              labelDetailsSupport: true,
              resolveSupport: {
                properties: ["documentation", "detail", "additionalTextEdits"],
              },
            },
          },
          documentSymbol: {
            tagSupport: { valueSet: [1] },
          },
        },
        workspace: {
          applyEdit: true,
          workspaceEdit: {
            documentChanges: true,
          },
        },
      },
      workDoneToken: "1d546990-40a3-4b77-b134-46622995f6ae",
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
        languageId:
          node.language.name === "tsx" ? "typescriptreact" : node.language.name,
        version: 1,
        text: node.sourceString,
      },
    });
  }

  get serverChangeKind() {
    if (
      typeof this.serverCapabilities?.textDocumentSync?.change === "undefined"
    )
      return this.serverCapabilities?.textDocumentSync;
    return this.serverCapabilities?.textDocumentSync?.change;
  }

  async didChange(node, oldSource, newSource, changes) {
    if (this.serverChangeKind === LSP_TEXT_DOCUMENT_SYNC_KIND.none) return;

    const version = this.textDocumentVersions.get(node.context) + 1;
    this.textDocumentVersions.set(node.context, version);

    await this._notification("textDocument/didChange", {
      textDocument: {
        uri: `file://${node.context.path}`,
        version,
      },
      contentChanges:
        this.serverChangeKind === LSP_TEXT_DOCUMENT_SYNC_KIND.full
          ? [{ text: newSource }]
          : changes.map((change) => ({
              range: {
                start: indexToPosition(oldSource, change.from),
                end: indexToPosition(oldSource, change.to),
              },
              rangeLength: change.to - change.from,
              text: change.insert ?? "",
            })),
    });
  }

  async didClose(node) {
    this.textDocumentVersions.delete(node.context);
    this.diagnostics.delete(node.context.path);

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
    node.editor.applyChanges(
      edits.map((e) => convertEdit(node, e)),
      [0, 0]
    );
  }

  async completion(node) {
    const res = await this._request("textDocument/completion", {
      textDocument: {
        uri: `file://${node.context.path}`,
      },
      position: indexToPosition(
        node.root.sourceString,
        node.editor.selectionRange[0]
      ),
    });
    // TODO incomplete flag
    return res.items;
  }

  async completionItemResolve(item) {
    return await this._request("completionItem/resolve", item);
  }

  async workspaceSymbols(query = "") {
    return await this._request("workspace/symbol", { query });
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
      const startIndex = positionToIndex(sourceString, start);
      const endIndex = positionToIndex(sourceString, end);
      sourceString =
        sourceString.slice(0, startIndex + offset) +
        newText +
        sourceString.slice(endIndex + offset);
      offset += newText.length - (endIndex - startIndex);
    }
    return sourceString;
  }

  diagnosticsFor(path) {
    return this.diagnostics.get(path) ?? [];
  }

  async _handleServerMessage(message) {
    switch (message.method) {
      case "window/logMessage":
        console.log(message.params.message);
        break;
      case "textDocument/publishDiagnostics":
        this.diagnostics.set(
          message.params.uri.slice("file://".length),
          message.params.diagnostics
        );
        for (const [context] of this.textDocumentVersions.entries()) {
          if (context.path === message.params.uri.slice("file://".length)) {
            context.editor.updateExtension(diagnostics, "lsp-diagnostics");
          }
        }
        break;
      case "window/workDoneProgress/create":
        this._response(message.id, null);
        break;
      default:
        // if (!message.method.startsWith("$/"))
        if (message.id)
          throw new Error("No response for server request", message);
        console.log("Unhandled server message", message);
        break;
    }
  }

  async _response(id, result) {
    await this.transport.write(JSON.stringify({ jsonrpc: "2.0", id, result }));
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
