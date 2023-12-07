window.addEventListener("load", async () => {
  // await testAll();
});

const tests = [
  async function testTrailingLineBreaks() {
    const root = await SBParser.parseText(
      `a

`,
      "smalltalk"
    );
    expectEqual(root.children.length, 3);
  },
  async function testConsecutiveRanges() {
    const root = await SBParser.parseText(
      `a

  2 + 3`,
      "smalltalk"
    );
    let current = 0;
    const leafs = root.allLeafs();
    for (const leaf of leafs) {
      console.assert(leaf.range[0] === current, "range start is wrong");
      current = leaf.range[1];
    }
  },
  async function testInsertSpace() {
    const root = await SBParser.parseText(`abc`, "smalltalk");
    const el = root.createView();
    mountDuring(el, () => {
      el.placeCursorAt(1);
      document.execCommand("insertText", false, " ");
      expectEqual(el.sourceString, "a bc");
    });
  },
  async function testInsertNewLine() {
    const root = await SBParser.parseText(`abc`, "smalltalk");
    const el = root.createView();
    mountDuring(el, () => {
      el.placeCursorAt(3);
      document.execCommand("insertText", false, "\nd");
      expectEqual(el.sourceString, "abc\nd\n");
    });
  },
  async function testReplaceRootNode() {
    const root = await SBParser.parseText(`abc`, "smalltalk");
    const el = root.createView();
    mountDuring(el, () => {
      el.placeCursorAt(3);
      // causes the method to become an ERROR node
      document.execCommand("insertText", false, "(a[");
    });
  },
];

function expectEqual(a, b) {
  if (a !== b) {
    throw new Error(`Expected ${a} to equal ${b}`);
  }
}
function mountDuring(el, cb) {
  document.body.appendChild(el);
  cb();
  el.destroy();
}

async function testAll() {
  for (const test of tests) {
    await test();
  }
}
