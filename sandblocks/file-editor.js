import { h } from "../widgets.js";
import { editor, useAsyncEffect } from "../widgets.js";
import { languageForExtension } from "../core/languages.js";
import { useState } from "../external/preact-hooks.mjs";
import { references } from "./references.js";

export function FileEditor({ project, path }) {
  const [sourceString, setSourceString] = useState("");
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useAsyncEffect(async () => {
    setSourceString(await project.readFile(path));
    setUnsavedChanges(false);
  }, [path]);

  const ext = path.split(".").slice(-1)[0].toLowerCase();
  const language = languageForExtension(ext);

  return h(
    "sb-file-editor",
    { style: { padding: "12px", display: "block" }, project, path },
    editor({
      extensions: ["base:base", ...language.defaultExtensions],
      inlineExtensions: [references],
      sourceString,
      language: language.name,
      onSave: async (data) => {
        await request("writeFile", { path, data });
        setUnsavedChanges(false);
      },
      onChange: () => setUnsavedChanges(true),
    })
  );
}

// custom element for locating file editor props in the tree hierarchy
customElements.define(
  "sb-file-editor",
  class extends HTMLElement {
    set project(project) {
      this._project = project;
    }
    set path(path) {
      this._path = path;
    }
    get project() {
      return this._project;
    }
    get path() {
      return this._path;
    }
  }
);
