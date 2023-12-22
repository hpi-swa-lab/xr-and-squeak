import { Editor } from "../editor.js";
import { config } from "../model.js";
import { button, el, editor, useAsyncEffect } from "../widgets.js";
import { render, h } from "../widgets.js";
import { useState, useEffect, useRef } from "../external/preact-hooks.mjs";

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
  const language = config.languages.find((l) => l.extensions.includes(ext));

  return h(
    Window,
    { onClose, barChildren: [unsavedChanges ? "Unsaved." : "Saved."] },
    [
      editor({
        extensions: ["base:base"],
        sourceString,
        language: language.languageName,
        onSave: async (data) => {
          await request("writeFile", { path, data });
          setUnsavedChanges(false);
        },
        onChange: () => setUnsavedChanges(true),
      }),
    ]
  );
}

function Window({
  children,
  title,
  onClose,
  initialPosition,
  initialSize,
  barChildren,
}) {
  const [position, setPosition] = useState(initialPosition ?? { x: 0, y: 0 });
  const [size, setSize] = useState(initialSize ?? { x: 500, y: 200 });

  return h(
    "div",
    {
      class: "sb-window",
      style: {
        left: position.x,
        top: position.y,
        width: size.x,
        height: size.y,
      },
    },
    [
      h(
        MoveHandle,
        {
          class: "sb-window-bar",
          onMove: (delta) =>
            setPosition((p) => ({ x: p.x + delta.x, y: p.y + delta.y })),
        },
        [title, button("x", onClose), barChildren]
      ),
      h("div", { class: "sb-window-content" }, children),
      h(MoveHandle, {
        class: "sb-window-resize",
        onMove: (delta) =>
          setSize((p) => ({ x: p.x + delta.x, y: p.y + delta.y })),
      }),
    ]
  );
}

function MoveHandle({ onMove, children, ...props }) {
  const [moving, setMoving] = useState(false);

  const lastPosRef = useRef(null);

  useEffect(() => {
    if (moving) {
      const moveHandler = (e) => {
        onMove({
          x: e.clientX - lastPosRef.current.x,
          y: +e.clientY - lastPosRef.current.y,
        });
        lastPosRef.current = { x: e.clientX, y: e.clientY };
      };
      const upHandler = () => setMoving(false);
      document.addEventListener("mousemove", moveHandler);
      document.addEventListener("mouseup", upHandler);
      return () => {
        document.removeEventListener("mousemove", moveHandler);
        document.removeEventListener("mouseup", upHandler);
      };
    }
  }, [moving]);

  return h(
    "div",
    {
      onmousedown: (e) => {
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        setMoving(true);
      },
      ...props,
    },
    children
  );
}
