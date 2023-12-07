window.addEventListener("load", async () => {
  const smalltalkMethod = await SBParser.parseText(
    true
      ? "init"
      : `initialize

  super initialize.
  
  self
    addMorphBack: (Morph new
      color: Color red;
      extent: 30 @ 20;
      yourself);
    addMorphBack: (Morph new color: Color green)`,
    "smalltalk"
  );
  document.body.appendChild(smalltalkMethod.createView());
});
