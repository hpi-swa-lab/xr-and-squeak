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
  const smalltalkMethod = await parseText(
    `initialize

  super initialize.
  
  self
    addMorphBack: (Morph new
      color: Color red;
      extent: 30 @ 20;
      yourself);
    addMorphBack: (Morph new color: Color green)`,
    "smalltalk"
  );
  document.body.appendChild(createView(smalltalkMethod));

  // testInsertSpaces();
  // testAll();
});
