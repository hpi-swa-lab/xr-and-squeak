import { LanguageClient, StdioTransport } from "../extensions/lsp.js";

export class Semantics {
  static handles(path) {}

  constructor(project, handles) {
    this.project = project;
    this.handlesPath = handles;
  }

  handles(path) {
    return path.startsWith(this.project.path) && this.handlesPath(path);
  }

  didOpen(path) {}
  didClose(path) {}
  didChange(path) {}
}
