import { useState, useEffect, useRef } from "../external/preact-hooks.mjs";
import { h } from "../widgets.js";
import { button } from "../widgets.js";

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
