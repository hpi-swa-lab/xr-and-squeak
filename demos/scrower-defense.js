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
          const position = getPointOnPath(parseInt(args.progress.sourceString));
          return h(
            "div",
            {
              class: "sb-column enemy",
              style: {
                left: position[0],
                top: position[1],
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
    (x) => false,
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
    (x) => {
      let spawnCounter = 0;

      setInterval(() => {
        const element = document.getElementById("test");
        d += 10;
        const newPoint = getPointOnPath(d);
        // element.setAttribute("cx", newPoint[0]);
        // element.setAttribute("cy", newPoint[1]);

        const currentEnemies = [];
        x.allNodesDo((n) =>
          n.exec(
            (n) => n.extract("new Enemy($data)"),
            ([n, { data }]) => [n, objectToMap(data)],
            ([n, data]) => {
              data.progress.replaceWith(d);
              // data.x.replaceWith(newPoint[0]);
              // data.y.replaceWith(newPoint[1]);
              // data.x.replaceWith(parseInt(data.x.sourceString) - 20);
              // data.y.replaceWith(parseInt(data.y.sourceString) - 30);
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

        if (spawnCounter <= 0) {
          const list = x.findQuery("let enemies = $list").list;
          list.insert(
            `new Enemy({ x: 600, y: 600, hp: 100 })`,
            "expression",
            list.childBlocks.length
          );
          spawnCounter = 10;
        }
        spawnCounter--;
      }, 500);
    },
  ]);

const towerApi = (tower, enemies) => ({
  shoot: (range, damage) => {
    for (const enemy of enemies) {
      const [x, y] = getPointOnPath(parseInt(enemy.progress.sourceString));
      const distance = Math.sqrt((x - tower.x) ** 2 + (y - tower.y) ** 2);
      if (distance <= range) {
        withCostDo(
          10,
          () => {
            addParticle(x, y, "💥", damage, 18);
            enemy.hp.replaceWith(parseInt(enemy.hp.sourceString) - damage);
            if (parseInt(enemy.hp.sourceString) <= 0) enemy.node.removeFull();
          },
          () => addParticle(tower.x, tower.y, "🔋", "", 30)
        );
      }
    }
  },
});

function withCostDo(num, action, noEnergy) {
  const { value } = document
    .querySelector("sb-editor")
    .source.findQuery("let energy = $value");
  if (parseInt(value.sourceString) >= num) {
    value.replaceWith(parseInt(value.sourceString) - num);
    action();
  } else noEnergy?.();
}

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

let _pathPoints;
function getPathPoints() {
  if (_pathPoints == null) {
    const enemyPath = document.getElementById("enemy-path").getAttribute("d");
    _pathPoints = [...enemyPath.matchAll(/\w\s*(\d+)\s+(\d+)/g)]
      .map(([_, x, y]) => [parseInt(x), parseInt(y)]);
  }

  return _pathPoints;
}

function getPointOnPath(distance) {
  let pathPoints = getPathPoints();

  let currentDistance = 0;
  let currentPoint = pathPoints[0];
  for (let i = 1; i < pathPoints.length; ++i) {
    const nextPoint = pathPoints[i];
    const segmentLength = Math.abs(currentPoint[0] - nextPoint[0] + currentPoint[1] - nextPoint[1]);
    if (currentDistance + segmentLength < distance) {
      currentDistance += segmentLength;
      currentPoint = nextPoint;
      continue;
    }

    const remainingDistance = distance - currentDistance;
    const direction = [
      Math.sign(nextPoint[0] - currentPoint[0]),
      Math.sign(nextPoint[1] - currentPoint[1])];
    const newPoint = [
      currentPoint[0] + remainingDistance * direction[0],
      currentPoint[1] + remainingDistance * direction[1]];

    return newPoint;
  }
}

        let d = 0;
