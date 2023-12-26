import { Editor } from "../editor.js";
import { config } from "../core/config.js";
import { button, el, editor, useAsyncEffect } from "../widgets.js";
import { render, h } from "../widgets.js";
import { useState } from "../external/preact-hooks.mjs";
import { Window } from "./base.js";
import { Workspace } from "./workspace.js";
import { languageForExtension } from "../core/languages.js";

Editor.init();

config.baseURL = "/";

const socket = io();

render(h(Sandblocks), document.body);

function request(name, data) {
  return new Promise((resolve, reject) => {
    socket.emit(name, data, (ret) => {
      if (ret.error) reject(ret.error);
      else resolve(ret);
    });
  });
}

function Sandblocks() {
  const [project, setProject] = useState(localStorage.lastProject);
  const [root, setRoot] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);

  useAsyncEffect(async () => {
    setRoot(project ? await request("openProject", { path: project }) : null);
    if (project) localStorage.lastProject = project;
  }, [project]);

  return [
    button("Open Project", () => setProject(prompt())),
    button("Install Language", () =>
      request("installLanguage", {
        repo: prompt("Repo?"),
        branch: prompt("Branch?"),
        path: prompt("Path?"),
      }).then(() => alert("Installed!"))
    ),
    h(Workspace),
    root &&
      el(
        "sb-project-file-list",
        h(File, {
          file: root,
          path: project,
          isRoot: true,
          onOpen: (path) => setOpenFiles((f) => [...f, path]),
        })
      ),
    el(
      "sb-open-files",
      openFiles.map((path) =>
        h(FileEditor, {
          key: path,
          path,
          onClose: () => setOpenFiles((f) => f.filter((p) => p !== path)),
        })
      )
    ),
  ];
}

function File({ file, onOpen, path, isRoot }) {
  const isFolder = file.children;
  const [open, setOpen] = useState(isRoot);
  return el("sb-file" + (isFolder ? " sb-folder" : ""), [
    h(
      "div",
      {
        onclick: () => (isFolder ? setOpen((o) => !o) : onOpen(path)),
        class: "sb-file-name",
      },
      file.name
    ),
    open &&
      isFolder &&
      el(
        "sb-file-list",
        file.children.map((child) =>
          h(File, {
            file: child,
            onOpen,
            path: path + "/" + child.name,
          })
        )
      ),
  ]);
}

function FileEditor({ path, onClose }) {
  const [sourceString, setSourceString] = useState("");
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useAsyncEffect(async () => {
    setSourceString(await request("readFile", { path }));
    setUnsavedChanges(false);
  }, [path]);

  const ext = path.split(".").slice(-1)[0].toLowerCase();
  const language = languageForExtension(ext);

  return h(
    Window,
    { onClose, barChildren: [unsavedChanges ? "Unsaved." : "Saved."] },
    [
      h(
        "div",
        { style: { padding: "12px" } },
        editor({
          extensions: ["base:base", ...language.defaultExtensions],
          sourceString,
          language: language.name,
          onSave: async (data) => {
            await request("writeFile", { path, data });
            setUnsavedChanges(false);
          },
          onChange: () => setUnsavedChanges(true),
        })
      ),
    ]
  );
}
