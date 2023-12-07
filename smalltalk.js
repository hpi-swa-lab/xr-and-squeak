const smalltalkTools = new Extension()
  .registerQuery("always", [
    (x) => false,
    (x) => x.type === "unary_message",
    (x) => nodeText(nodeChildNode(x, 1)) === "sbWatch",
    (x) => installReplacement(x, "sb-watch"),
  ])
  .registerQuery("always", []);
