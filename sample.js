"enable sandblocks";

let a = 12;

function hello() {
  const a = [
    "sbWatch",
    ((e) => (
      fetch("http://localhost:3000/sb-watch", {
        method: "POST",
        body: JSON.stringify({ id: 412842763, e: e }),
        headers: { "Content-Type": "application/json" },
      }),
      e
    ))("asdadsd"),
  ][1];

  sbWatch("adasd", 12);
  return a;
}

hello();
