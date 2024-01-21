import { Extension } from "../core/extension.js";
import { objectToMap } from "../extensions/javascript.js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "../external/preact-hooks.mjs";
import { orParentThat, withDo } from "../utils.js";
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
      console.log(getPathLength());

      let currentWave = 0;
      const waveInterval = 60000
      let spawnCounter = 0;
      const editor = x.editor;
      let beginWave = () => {
        ++currentWave;
        spawnCounter = currentWave;
        console.log("wave ", currentWave);
      };
      beginWave();
      setInterval(beginWave, waveInterval);

      setInterval(() => {
        const selectionRange = editor.selectionRange;

        const currentEnemies = [];
        const removeEnemies = [];
        x.allNodesDo((n) =>
          n.exec(
            (n) => n.extract("new Enemy($data)"),
            ([n, { data }]) => [n, objectToMap(data)],
            ([n, data]) => {
              let progress = parseInt(data.progress.sourceString);
              progress += 1000;
              if (progress >= getPathLength()) {
                removeEnemies.push(n)
                damage(100);
              } else {
                data.progress.replaceWith(progress + 10);
                currentEnemies.push({ ...data, node: n });
              }
            }
          )
        );

        x.allNodesDo((n) =>
          n.exec(
            (n) => n.query("new Tower($data)")?.data,
            (data) => {
              try {
                return [data, eval(`(${data.sourceString})`)];
              } catch (e) {
                reportErrorAtNode(data, e);
                return null;
              }
            },
            ([node, data]) => {
              try {
                data.loop?.apply(towerApi(data, currentEnemies));
              } catch (e) {
                reportErrorAtNode(node, e);
              }
            }
          )
        );

        let now = Date.now();
        let timeSinceLastSpawn = now - lastSpawnTime;
        if (timeSinceLastSpawn >= spawnInterval && spawnCounter > 0) {
          const list = x.findQuery("let enemies = $list").list;
          list.insert(
            `new Enemy({ progress: 0, hp: 100 })`,
            "expression",
            list.childBlocks.length
          );

          lastSpawnTime = now;
          spawnCounter--;
        }

        editor.selectRange(...selectionRange);

        for (const enemy of removeEnemies) {
          enemy.removeFull();
        }
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

function reportErrorAtNode(node, error) {
  console.error(error);
  addParticle(
    ...withDo(node.debugView.getBoundingClientRect(), (r) => [
      r.x + r.width / 2,
      r.y + r.height / 2,
    ]),
    "🔥",
    error.message,
    18
  );
}

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
    _pathPoints = [...enemyPath.matchAll(/\w\s*(\d+)\s+(\d+)/g)].map(
      ([_, x, y]) => [parseInt(x), parseInt(y)]
    );
  }

  return _pathPoints;
}

let _pathLength;
function getPathLength() {
  if (_pathLength == null) {
    _pathLength = 0;
    const pathPoints = getPathPoints();
    let currentPoint = pathPoints[0];
    for (let i = 1; i < pathPoints.length; ++i) {
      let nextPoint = pathPoints[i];
      _pathLength += Math.abs(currentPoint[0] - nextPoint[0] + currentPoint[1] - nextPoint[1]);
      currentPoint = nextPoint;
    }
  }

  return _pathLength;
}

function getPointOnPath(distance) {
  let pathPoints = getPathPoints();

  let currentDistance = 0;
  let currentPoint = pathPoints[0];
  for (let i = 1; i < pathPoints.length; ++i) {
    const nextPoint = pathPoints[i];
    const segmentLength = Math.abs(
      currentPoint[0] - nextPoint[0] + currentPoint[1] - nextPoint[1]
    );
    if (currentDistance + segmentLength < distance) {
      currentDistance += segmentLength;
      currentPoint = nextPoint;
      continue;
    }

    const remainingDistance = distance - currentDistance;
    const direction = [
      Math.sign(nextPoint[0] - currentPoint[0]),
      Math.sign(nextPoint[1] - currentPoint[1]),
    ];
    const newPoint = [
      currentPoint[0] + remainingDistance * direction[0],
      currentPoint[1] + remainingDistance * direction[1],
    ];

    return newPoint;
  }

  return pathPoints[pathPoints.length - 1];
}

function damage(amount) {
  let { value } = document
    .querySelector("sb-editor")
    .source.findQuery("let hp = $value");
  const newHp = parseInt(value.sourceString) - amount;
  value.replaceWith(newHp);
  if (newHp <= 0) {
    alert("you done goofed");
  }
}

let spawnInterval = 2000;
let lastSpawnTime = -spawnInterval;
