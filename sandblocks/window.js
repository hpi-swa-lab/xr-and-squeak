import { useState, useEffect, useRef } from "../external/preact-hooks.mjs";
import { matchesKey, orParentThat } from "../utils.js";
import { h, button, registerPreactElement, render } from "../view/widgets.js";

function wantsMouseOverFocus(e) {
  return (
    e.getAttribute("focusable") ||
    (e.tagName === "INPUT" && e.type === "text") ||
    e.tagName === "TEXTAREA"
  );
}

let globalMousePos = { x: 0, y: 0 };
document.addEventListener("mousemove", (e) => {
  globalMousePos = { x: e.clientX, y: e.clientY };
  updateFocus(e.target);
});

function updateFocus(target) {
  target ??= document.elementFromPoint(globalMousePos.x, globalMousePos.y);
  while (target?.shadowRoot) {
    const inner = target.shadowRoot.elementFromPoint(
      globalMousePos.x,
      globalMousePos.y
    );
    if (!inner || inner === target) break;
    target = inner;
  }

  let active = document.activeElement;
  while (active?.shadowRoot) {
    const inner = active.shadowRoot.activeElement;
    if (inner) active = inner;
    else break;
  }

  const f = orParentThat(target, wantsMouseOverFocus);
  if (f && !orParentThat(active, (p) => p === f)) {
    f?.focus();
  }
}

export function openComponentInWindow(component, props, windowProps) {
  const window = document.createElement("sb-window");
  window.props = windowProps ?? {};
  render(h(component, { ...props, window }), window);
  document.body.appendChild(window);
}

export function Window({
  root,
  children,
  initialTitle,
  initialPosition,
  initialSize,
  doNotStartAttached,
}) {
  initialSize ??= { x: 500, y: 200 };
  const [position, setPosition] = useState(
    initialPosition ?? {
      x: globalMousePos.x - initialSize.x / 2,
      y: globalMousePos.y - initialSize.y / 2,
    }
  );
  const [title, setTitle] = useState(initialTitle ?? "");
  const [size, setSize] = useState(initialSize);
  const [initialPlacement, setInitialPlacement] = useState(!doNotStartAttached);

  const windowRef = useRef(null);
  const okToCloseRef = useRef(() => true);

  const findTopWindow = () =>
    [...document.querySelectorAll("sb-window")].reduce((window, best) =>
      parseInt(window.zIndex) > parseInt(best.zIndex) ? window : best
    );

  const close = async () => {
    if (!(await okToCloseRef.current())) return;
    root.remove();
    updateFocus();
  };

  const raise = () => {
    const top = findTopWindow();
    if (top) top.style.zIndex = 0;
    root.style.zIndex = 1;
  };

  useEffect(() => {
    raise();
    const focus = root.querySelector("[autofocus]");
    if (focus) {
      focus.focus();
      const my = windowRef.current.getBoundingClientRect();
      const their = focus.getBoundingClientRect();
      setPosition({
        x: globalMousePos.x - (their.x - my.x) - their.width / 2,
        y: globalMousePos.y - (their.y - my.y) - their.height / 2,
      });
    } else if (initialSize.x === "auto") {
      setPosition({
        x: globalMousePos.x - windowRef.current.offsetWidth / 2,
        y: globalMousePos.y - windowRef.current.offsetHeight / 2,
      });
    }
  }, []);

  root.setTitle = setTitle;
  root.close = close;
  root.raise = raise;
  root.setOkToClose = (f) => (okToCloseRef.current = f);

  return [
    h(
      "style",
      {},
      `
.sb-window {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  border: 1px solid #ccc;
  position: absolute;
  background-color: #fff;
  display: flex;
  flex-direction: column;
}

.sb-window-bar {
  background-color: #ccc;
  cursor: move;
  padding: 2px;
  display: flex;
  gap: 0.25rem;
}

.sb-window-resize {
  width: 16px;
  height: 16px;
  position: absolute;
  bottom: -8px;
  right: -8px;
  background-color: #ccc;
  cursor: nwse-resize;
}

.sb-window-resize-initial {
  width: 16px;
  height: 16px;
  position: absolute;
  left: calc(50% - 8px);
  top: calc(50% - 8px);
  cursor: nwse-resize;
}

.sb-window-content {
  /* overflow: auto; */
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}`
    ),
    h(
      "div",
      {
        ref: windowRef,
        class: "sb-window",
        style: {
          left: position.x,
          top: position.y,
          width: size.x,
          height: size.y,
        },
        onKeyDown: (e) => {
          if (matchesKey(e, "Ctrl-e")) {
            close();
            e.preventDefault();
            e.stopPropagation();
          }
        },
        onMouseDown: raise,
      },
      [
        h(
          MoveHandle,
          {
            class: "sb-window-bar",
            startAttached: !doNotStartAttached,
            onMove: (delta) =>
              setPosition((p) => ({ x: p.x + delta.x, y: p.y + delta.y })),
          },
          [button("x", close), title]
        ),
        h("div", { class: "sb-window-content" }, children, h("slot")),
        initialPlacement &&
          h(MoveHandle, {
            class: "sb-window-resize-initial",
            onFinish: () => setInitialPlacement(false),
            onMove: (delta) =>
              setSize((p) => ({ x: p.x + delta.x, y: p.y + delta.y })),
          }),
        h(MoveHandle, {
          class: "sb-window-resize",
          onMove: (delta) =>
            setSize((p) => ({ x: p.x + delta.x, y: p.y + delta.y })),
        }),
      ]
    ),
  ];
}

registerPreactElement("sb-window", Window);

function MoveHandle({ onMove, onFinish, children, startAttached, ...props }) {
  const [moving, setMoving] = useState(startAttached ?? false);

  const lastPosRef = useRef(globalMousePos);

  useEffect(() => {
    if (moving) {
      const moveHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onMove({
          x: e.clientX - lastPosRef.current.x,
          y: +e.clientY - lastPosRef.current.y,
        });
        lastPosRef.current = { x: e.clientX, y: e.clientY };
      };
      const upHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onFinish?.();
        setMoving(false);
      };
      document.addEventListener("mousemove", moveHandler);
      document.addEventListener("mouseup", upHandler);
      // also connect a down handler to stop moving after a `startAttached`
      document.addEventListener("mousedown", upHandler);
      return () => {
        document.removeEventListener("mousemove", moveHandler);
        document.removeEventListener("mouseup", upHandler);
        document.removeEventListener("mousedown", upHandler);
      };
    }
  }, [moving]);

  return h(
    "div",
    {
      onmousedown: (e) => {
        if (e.button !== 0) return;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        setMoving(true);
      },
      ...props,
    },
    children
  );
}

export function confirmUnsavedChanges() {
  return new Promise((resolve) => {
    openComponentInWindow(
      Dialog,
      {
        message: "Discard unsaved changes?",
        actions: [
          ["Discard", () => resolve(true), true],
          ["Cancel", () => resolve(false)],
        ],
        cancelActionIndex: 1,
      },
      { doNotStartAttached: true, initialSize: { x: "auto", y: "auto" } }
    );
  });
}

export function Dialog({ message, actions, cancelActionIndex, window }) {
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "1rem",
      },
    },
    [
      message,
      h(
        "div",
        {
          style: { display: "flex", gap: "1rem" },
          onkeydown:
            cancelActionIndex !== undefined &&
            ((e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                window.close();
                actions[cancelActionIndex][1]();
              }
            }),
        },
        actions.map(([label, action, autofocus]) =>
          button(
            label,
            () => {
              window.close();
              action();
            },
            autofocus
          )
        )
      ),
    ]
  );
}
