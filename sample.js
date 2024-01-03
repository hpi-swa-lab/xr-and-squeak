"enable sandblocks";

let a = 1;

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
    ))("asdadasdasd"),
  ][1];
}

hello();
