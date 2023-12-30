import { useState, useEffect, useRef } from "../external/preact-hooks.mjs";
import { h, button, registerPreactElement, render } from "../widgets.js";

let globalMousePos;
document.addEventListener("mousemove", (e) => {
  globalMousePos = { x: e.clientX, y: e.clientY };
});

export function openComponentInWindow(component, props) {
  const window = document.createElement("sb-window");
  render(h(component, props), window);
  document.body.appendChild(window);
}

export function Window({
  children,
  title,
  onClose,
  initialPosition,
  initialSize,
  barChildren,
}) {
  initialSize ??= { x: 500, y: 200 };
  const [position, setPosition] = useState(
    initialPosition ?? {
      x: globalMousePos.x - initialSize.x / 2,
      y: globalMousePos.y - initialSize.y / 2,
    }
  );
  const [size, setSize] = useState(initialSize);
  const [initialPlacement, setInitialPlacement] = useState(true);
  const windowRef = useRef(null);

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
  justify-content: space-between;
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
  overflow: auto;
  flex-grow: 1;
}
  `
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
      },
      [
        h(
          MoveHandle,
          {
            class: "sb-window-bar",
            startAttached: true,
            onMove: (delta) =>
              setPosition((p) => ({ x: p.x + delta.x, y: p.y + delta.y })),
          },
          [
            title,
            button(
              "x",
              onClose ??
                (() => {
                  const root = windowRef.current.getRootNode().host;
                  // should only use DOM mutation if we are not inside of
                  // a preact component
                  // FIXME console.assert(root.tagName === "SB-WINDOW");
                  root?.remove();
                })
            ),
            barChildren,
          ]
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
