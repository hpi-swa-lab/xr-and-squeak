let pathPoints;

window.onload = (event) => {
  const enemyPath = document.getElementById("enemy-path").getAttribute("d");
  pathPoints = [...enemyPath.matchAll(/\w\s*(\d+)\s+(\d+)/g)]
    .map(([_, x, y]) => [parseInt(x), parseInt(y)]);

  let d = 0;
  let f = () => {
    placeElementOnPath(document.getElementById("test"), d);
    d += 10;
    setTimeout(f, 100)
  };
  f()
};

function placeElementOnPath(element, distance) {
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
    const direction = [Math.sign(nextPoint[0] - currentPoint[0]), Math.sign(nextPoint[1] - currentPoint[1])];
    const newPoint = [currentPoint[0] + remainingDistance * direction[0], currentPoint[1] + remainingDistance * direction[1]];

    element.setAttribute("cx", newPoint[0]);
    element.setAttribute("cy", newPoint[1]);

    break;
  }
}

