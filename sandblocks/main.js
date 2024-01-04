import { Editor } from "../view/editor.js";
import { button, useAsyncEffect } from "../view/widgets.js";
import { render, h } from "../view/widgets.js";
import { useEffect, useState } from "../external/preact-hooks.mjs";
import { Workspace } from "./workspace.js";
import { matchesKey } from "../utils.js";
import { choose, openComponentInWindow } from "./window.js";
import {} from "./file-project/search.js";

const PROJECT_TYPES = {
  FileProject: {
    path: "./file-project/main.js",
    name: "FileProject",
    label: "Open Folder",
    createArgs: () => [prompt()],
  },
  SqueakProject: {
    path: "./squeak-project/main.js",
    name: "SqueakProject",
    label: "Squeak Image",
    createArgs: () => [],
  },
};

Editor.init();

function Sandblocks() {
  const [openProjects, setOpenProjects] = useState([]);

  useAsyncEffect(async () => {
    const lastProjects = JSON.parse(localStorage.lastProjects ?? "[]");
    for (const info of lastProjects) {
      const desc = PROJECT_TYPES[info.type];
      const Project = (await import(desc.path))[desc.name];
      const project = Project.deserialize(info);
      await project.open();
      setOpenProjects((p) => [...p, project]);
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (matchesKey(e, "Ctrl-g")) {
        openComponentInWindow(Workspace, {});
      } else if (matchesKey(e, "Ctrl-0")) {
        const search = document.createElement("sb-search");
        // FIXME
        search.project = openProjects[0];
        document.body.appendChild(search);
      } else {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };
    document.body.addEventListener("keydown", handler);
    return () => document.body.removeEventListener("keydown", handler);
  }, [openProjects]);

  useEffect(() => {
    localStorage.lastProjects = JSON.stringify(
      openProjects.map((p) => p.fullSerialize())
    );
  }, [openProjects]);

  return [
    h(
      "div",
      { style: "flex" },
      button("Open Project", async () => {
        const desc = await choose(Object.values(PROJECT_TYPES), (i) => i.label);
        if (!desc) return;
        const Project = (await import(desc.path))[desc.name];
        const project = new Project(...(await desc.createArgs()));
        await project.open();

        setOpenProjects((p) => [...p, project]);
      }),
      openProjects.map((project) =>
        project.renderItem({
          onClose: () => setOpenProjects((p) => p.filter((x) => x !== project)),
        })
      )
    ),
    openProjects.map((project) => project.renderBackground?.()),
  ];
}

render(h(Sandblocks), document.body);
