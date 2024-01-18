import { Editor } from "../view/editor.js";
import { button, useAsyncEffect } from "../view/widgets.js";
import { render, h } from "../view/widgets.js";
import { useEffect, useState } from "../external/preact-hooks.mjs";
import { Workspace } from "./workspace.js";
import { matchesKey } from "../utils.js";
import { choose, openComponentInWindow } from "./window.js";
import { } from "./file-project/search.js";
import { RAGApp } from "../extensions/ragPrototype.js";
import { SequenceDiagram } from "../extensions/tlaSequenceDiagram.js";

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

async function loadProjectType(desc) {
  return (await import(desc.path))[desc.name];
}

async function loadSerializedProject(serialized) {
  return (await loadProjectType(PROJECT_TYPES[serialized.type])).deserialize(
    serialized
  );
}

function projectEqual(a, b) {
  const aInfo = a.fullSerialize();
  const bInfo = b.fullSerialize();
  for (const key of Object.keys(aInfo)) {
    if (aInfo[key] !== bInfo[key]) return false;
  }
  return true;
}

Editor.init();

const startUpOptions = {
  rag: () => {
    openComponentInWindow(
      RAGApp,
      {},
      {
        doNotStartAttached: true,
        initialPosition: { x: 10, y: 10 },
        initialSize: { x: 1000, y: 1000 },
      }
    );
  },
  tla: () => {
    openComponentInWindow(
      SequenceDiagram,
      {},
      {
        doNotStartAttached: true,
        initialPosition: { x: 10, y: 10 },
        initialSize: { x: 1000, y: 600 },
      }
    );
  },
};

function Sandblocks() {
  const [openProjects, setOpenProjects] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);

  // Debugging utility for diffing
  // useEffect(() => {
  //   const e = document.createElement("sb-editor");
  //   document.body.appendChild(e);
  //   e.load("a", "tsx", []);
  //   setTimeout(function () {
  //     e.replaceFullTextFromCommand("b");
  //   }, 1000);
  // }, []);

  useEffect(() => {
    if (location.hash) {
      startUpOptions[location.hash.slice(1)]?.();
    }
  }, []);

  useAsyncEffect(async () => {
    const lastProjects = JSON.parse(localStorage.lastProjects ?? "[]");
    for (const info of lastProjects) {
      const project = await loadSerializedProject(info);
      await project.open();
      setOpenProjects((p) => [...p, project]);
    }
  }, []);

  useAsyncEffect(async () => {
    for (const info of JSON.parse(localStorage.recentProjects ?? "[]")) {
      const project = await loadSerializedProject(info);
      setRecentProjects((p) => [...p, project]);
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
  useEffect(() => {
    localStorage.recentProjects = JSON.stringify(
      recentProjects.map((p) => p.fullSerialize())
    );
  }, [recentProjects]);

  return [
    h(
      "div",
      { style: "flex" },
      button("Open Project", async () => {
        const desc = await choose(Object.values(PROJECT_TYPES), (i) => i.label);
        if (!desc) return;
        const project = new (await loadProjectType(desc))(
          ...(await desc.createArgs())
        );
        await project.open();
        setOpenProjects((p) => [...p, project]);
        setRecentProjects((p) => [
          project,
          ...p.filter((x) => !projectEqual(x, project)),
        ]);
      }),
      button("Open Recent", async () => {
        const project = await choose(recentProjects, (i) => i.name);
        if (!project) return;
        await project.open();
        setOpenProjects((p) => [...p, project]);
      }),
      button("RAG", () => openComponentInWindow(RAGApp)),
      openProjects.map((project) =>
        project.renderItem({
          onClose: () => setOpenProjects((p) => p.filter((x) => x !== project)),
        })
      ),
      button("TLA Sequence Diagram", () => openComponentInWindow(SequenceDiagram)),
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
