import { Editor } from "../editor.js";
import { config } from "../core/config.js";
import { button, el, useAsyncEffect } from "../widgets.js";
import { render, h } from "../widgets.js";
import { useEffect, useState } from "../external/preact-hooks.mjs";
import { Workspace } from "./workspace.js";
import { Project } from "../core/project.js";
import { matchesKey } from "../utils.js";
import { openComponentInWindow } from "./window.js";
import { FileEditor } from "./file-editor.js";

Editor.init();

config.baseURL = "/";

export const socket = io();

class SBProject extends Project {
  static deserialize(str) {
    if (!str) return null;
    try {
      const res = JSON.parse(str);
      if (typeof res.path !== "string") return null;
      return new SBProject(res.path);
    } catch (e) {
      return null;
    }
  }

  constructor(path) {
    super();
    this.path = path;
  }

  async open() {
    this.root = await request("openProject", { path: this.path });
  }

  async writeFile(path, data) {
    await request("writeFile", { path, data });
  }

  async readFiles(paths) {
    return await request("readFiles", { paths });
  }

  get allSources() {
    const out = [];
    const recurse = (file, path) => {
      if (file.children) {
        file.children.forEach((child) =>
          recurse(child, path + "/" + file.name)
        );
      } else {
        out.push({
          path: path + "/" + file.name,
          hash: file.hash,
        });
      }
    };
    for (const child of this.root.children) recurse(child, this.path);
    return out;
  }

  serialize() {
    return JSON.stringify({ path: this.path });
  }
}

render(h(Sandblocks), document.body);

export function request(name, data) {
  return new Promise((resolve, reject) => {
    socket.emit(name, data, (ret) => {
      if (ret.error) reject(ret.error);
      else resolve(ret);
    });
  });
}

function useRebuild() {
  const [_, setNum] = useState(0);
  return () => setNum((n) => n + 1);
}

function Sandblocks() {
  const [project, setProject] = useState(() =>
    SBProject.deserialize(localStorage.lastProject)
  );
  const rebuild = useRebuild();

  useEffect(() => {
    const handler = (e) => {
      if (matchesKey(e, "Ctrl-g")) {
        openComponentInWindow(Workspace, {});
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.body.addEventListener("keydown", handler);
    return () => document.body.removeEventListener("keydown", handler);
  }, []);

  useAsyncEffect(async () => {
    if (project) {
      await project.open();
      rebuild();
      localStorage.lastProject = project.serialize();
    }
  }, [project]);

  return [
    button("Open Project", () => setProject(new SBProject(prompt()))),
    button("Install Language", () =>
      request("installLanguage", {
        repo: prompt("Repo?"),
        branch: prompt("Branch?"),
        path: prompt("Path?"),
      }).then(() => alert("Installed!"))
    ),
    button("Open Workspace (Ctrl-g)", () =>
      openComponentInWindow(Workspace, {})
    ),
    project?.root &&
      el(
        "sb-project-file-list",
        h(File, {
          file: project.root,
          path: project.path,
          isRoot: true,
          onOpen: (path) =>
            openComponentInWindow(FileEditor, { project, path }),
        })
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
      `${isFolder ? (open ? "▼ " : "▶ ") : ""}${file.name}`
    ),
    open &&
      isFolder &&
      el(
        "sb-file-list",
        file.children
          .sort((a, b) =>
            !!a.children === !!b.children
              ? a.name.localeCompare(b.name)
              : !!b.children - !!a.children
          )
          .map((child) =>
            h(File, {
              file: child,
              onOpen,
              path: path + "/" + child.name,
            })
          )
      ),
  ]);
}
