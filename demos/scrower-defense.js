import { Extension } from "../core/extension.js";
import { objectToMap } from "../extensions/javascript.js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "../external/preact-hooks.mjs";
import { orParentThat } from "../utils.js";
import { ensureReplacementPreact, h, render, shard } from "../view/widgets.js";

export const towers = new Extension()
  .registerReplacement((e) => [
    (x) => x.extract("new Tower($arg)"),
    ([x, { arg }]) =>
      ensureReplacementPreact(
        e,
        x,
        "scrower-tower",
        ({ arg }) => {
          const args = objectToMap(arg);
          return h(
            "div",
            {
              class: "sb-column tower",
              style: {
                left: parseInt(args.x.sourceString),
                top: parseInt(args.y.sourceString),
              },
            },
            "Tower",
            shard(arg)
          );
        },
        { arg }
      ),
  ])

  .registerReplacement((e) => [
    (x) => x.extract("new Enemy($arg)"),
    ([x, { arg }]) =>
      ensureReplacementPreact(
        e,
        x,
        "scrower-enemy",
        ({ arg }) => {
          const args = objectToMap(arg);
          return h(
            "div",
            {
              class: "sb-column enemy",
              style: {
                left: parseInt(args.x.sourceString),
                top: parseInt(args.y.sourceString),
              },
            },
            "Enemy",
            shard(arg)
          );
        },
        { arg }
      ),
  ])

  .registerAlways((e) => [
    (x) => x.type === "number",
    (x) =>
      e.attachData(x, "scrubbing-event-listeners", (view) => {
        let transition;
        const tower = orParentThat(view, (p) => p.classList.contains("tower"));
        const scrub = (e) => {
          e.preventDefault();
          x.replaceWith(parseInt(x.text) + e.movementX);
        };
        const removeScrub = () => {
          window.removeEventListener("mousemove", scrub);
          window.removeEventListener("mouseup", removeScrub);
          tower.style.transition = transition;
        };
        view.addEventListener("mousedown", (e) => {
          transition = tower.style.transition;
          tower.style.transition = "none";
          window.addEventListener("mousemove", scrub);
          window.addEventListener("mouseup", removeScrub);
        });
      }),
  ])

  .registerExtensionConnected((e) => [
    (x) => true,
    (x) => x.isRoot,
    (x) =>
      setInterval(() => {
        const currentEnemies = [];
        x.allNodesDo((n) =>
          n.exec(
            (n) => n.extract("new Enemy($data)"),
            ([n, { data }]) => [n, objectToMap(data)],
            ([n, data]) => {
              data.x.replaceWith(parseInt(data.x.sourceString) - 20);
              data.y.replaceWith(parseInt(data.y.sourceString) - 30);
              currentEnemies.push({ ...data, node: n });
            }
          )
        );

        x.allNodesDo((n) =>
          n.exec(
            (n) => n.query("new Tower($data)")?.data,
            (data) => eval(`(${data.sourceString})`),
            (data) => data.loop?.apply(towerApi(data, currentEnemies))
          )
        );
      }, 500),
  ]);

const towerApi = (tower, enemies) => ({
  shoot: (range, damage) => {
    for (const enemy of enemies) {
      const x = parseInt(enemy.x.sourceString);
      const y = parseInt(enemy.y.sourceString);
      const distance = Math.sqrt((x - tower.x) ** 2 + (y - tower.y) ** 2);
      if (distance <= range) {
        addParticle(x, y, "💥", damage, 18);
        enemy.hp.replaceWith(parseInt(enemy.hp.sourceString) - damage);
        if (parseInt(enemy.hp.sourceString) <= 0) enemy.node.removeFull();
      }
    }
  },
});

render(h(Particles), document.querySelector("#particles"));

function Particles() {
  const [particles, setParticles] = useState([]);
  const idRef = useRef(0);

  window.addParticle = useCallback((x, y, icon, text, size) => {
    setParticles((p) => [
      ...p,
      { x, y, icon, text, size, id: idRef.current++ },
    ]);
  });

  return particles.map((p) =>
    h(Particle, {
      key: p.id,
      ...p,
      onExpired: () =>
        setParticles((list) => list.filter((x) => x.id !== p.id)),
    })
  );
}

function Particle({ x, y, icon, text, size, onExpired }) {
  size ??= 18;

  const [position, setPosition] = useState([x, y]);

  const direction = useMemo(() => {
    const angle = Math.random() * Math.PI * 2;
    return [Math.cos(angle), Math.sin(angle)];
  });

  const lifeTimeRef = useRef(0);

  useEffect(() => {
    const update = () => {
      setPosition(([x, y]) => [x + direction[0], y + direction[1]]);
      lifeTimeRef.current++;
      if (lifeTimeRef.current > 20) onExpired();
      else requestAnimationFrame(update);
    };
    const id = requestAnimationFrame(update);
    () => cancelAnimationFrame(id);
  }, []);

  return h(
    "div",
    {
      class: "particle",
      style: {
        left: position[0],
        top: position[1],
        fontSize: size,
      },
    },
    icon,
    text && h("span", {}, text)
  );
}
