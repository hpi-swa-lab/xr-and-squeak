function testInsertSpace() {
  const snippet = document.createElement("sb-snippet");
  snippet.setAttribute("text", "a 2+3");
  snippet.edit(" ", 3);
}
function testInsertSpaces() {
  const snippet = document.createElement("sb-snippet");
  snippet.setAttribute("text", "a 2+3");
  snippet.edit(" ", 3);
  snippet.edit(" ", 5);
  console.log(snippet.getAttribute("text"));
}
function testAll() {
  testInsertSpaces();
}

window.addEventListener("load", async () => {
  const smalltalkMethod = await parseText("a 2+43", "smalltalk");
  document.body.appendChild(createView(smalltalkMethod));

  // testInsertSpaces();
  // testAll();
});
