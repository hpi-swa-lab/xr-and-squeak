import { useState, useEffect, useRef } from "../external/preact-hooks.mjs";
import { h } from "../widgets.js";
import { button } from "../widgets.js";
import { registerPreactElement } from "../utils.js";

export function Window({
  children,
  title,
  onClose,
  initialPosition,
  initialSize,
  barChildren,
}) {
  const [position, setPosition] = useState(initialPosition ?? { x: 0, y: 0 });
  const [size, setSize] = useState(initialSize ?? { x: 500, y: 200 });
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
                  console.assert(root.tagName === "SB-WINDOW");
                  root.remove();
                })
            ),
            barChildren,
          ]
        ),
        h("div", { class: "sb-window-content" }, children, h("slot")),
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

function MoveHandle({ onMove, children, ...props }) {
  const [moving, setMoving] = useState(false);

  const lastPosRef = useRef(null);

  useEffect(() => {
    if (moving) {
      const moveHandler = (e) => {
        e.preventDefault();
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
        if (e.button !== 0) return;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        setMoving(true);
      },
      ...props,
    },
    children
  );
}
