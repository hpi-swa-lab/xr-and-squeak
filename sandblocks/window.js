import { useState, useEffect, useRef } from "../external/preact-hooks.mjs";
import { matchesKey, orParentThat } from "../utils.js";
import { h, button, registerPreactElement, render } from "../widgets.js";

function wantsMouseOverFocus(e) {
  return (
    e.getAttribute("focusable") ||
    e.tagName === "INPUT" ||
    e.tagName === "TEXTAREA"
  );
}

let globalMousePos = { x: 0, y: 0 };
document.addEventListener("mousemove", (e) => {
  globalMousePos = { x: e.clientX, y: e.clientY };

  let target = e.target;
  while (target?.shadowRoot) {
    const inner = target.shadowRoot.elementFromPoint(e.clientX, e.clientY);
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

  const findTopWindow = () =>
    [...document.querySelectorAll("sb-window")].reduce((window, best) =>
      parseInt(window.zIndex) > parseInt(best.zIndex) ? window : best
    );

  const close =
    onClose ??
    (() => {
      const root = windowRef.current.getRootNode().host;
      // should only use DOM mutation if we are not inside of
      // a preact component
      // FIXME console.assert(root.tagName === "SB-WINDOW");
      root?.remove();
    });

  const raise = () => {
    const top = findTopWindow();
    if (top) top.style.zIndex = 0;
    windowRef.current.getRootNode().host.style.zIndex = 1;
  };

  useEffect(() => {
    raise();
  }, []);

  return [
    h("link", {
      rel: "stylesheet",
      href: "widgets.css",
    }),
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
            startAttached: true,
            onMove: (delta) =>
              setPosition((p) => ({ x: p.x + delta.x, y: p.y + delta.y })),
          },
          [title, button("x", close), barChildren]
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
