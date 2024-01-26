import { Extension } from "../core/extension.js";
import { ToggleableMutationObserver } from "../utils.js";

async function tryFormat(string, cursorOffset, filepath, parser, deps, config) {
  try {
    const prettier = await import("https://esm.sh/prettier@3.1.1/standalone");

    return await prettier.formatWithCursor(string, {
      cursorOffset,
      filepath,
      parser,
      plugins: (await Promise.all(deps.map((x) => import(x)))).map(
        (x) => x.default
      ),
      arrowParens: "always",
      bracketSpacing: true,
      endOfLine: "lf",
      htmlWhitespaceSensitivity: "css",
      insertPragma: false,
      singleAttributePerLine: false,
      bracketSameLine: false,
      jsxBracketSameLine: false,
      jsxSingleQuote: false,
      printWidth: 80,
      proseWrap: "preserve",
      quoteProps: "as-needed",
      requirePragma: false,
      semi: true,
      singleQuote: false,
      tabWidth: 2,
      trailingComma: "es5",
      useTabs: false,
      embeddedLanguageFormatting: "auto",
      vueIndentScriptAndStyle: false,
      ...(config ?? {}),
    });
  } catch (error) {
    console.error("[prettier]", error);
    return null;
  }
}

function extensionWith(parser, deps, config) {
  return new Extension().registerPreSave((e) => [
    (x) => x.isRoot,
    async (x) => {
      const result = await tryFormat(
        x.sourceString,
        x.editor.selectionRange[0],
        x.context.path,
        parser,
        deps,
        config
      );
      if (result) {
        const { formatted, cursorOffset } = result;
        const delta = cursorOffset - x.editor.selectionRange[0];
        if (formatted !== x.sourceString)
          ToggleableMutationObserver.ignoreMutation(() =>
            x.editor.replaceFullTextFromCommand(formatted, [
              x.editor.selectionRange[0] + delta,
              x.editor.selectionRange[1] + delta,
            ])
          );
      }
    },
  ]);
}

export const javascript = extensionWith("babel", [
  "https://esm.sh/prettier@3.1.1/plugins/estree",
  "https://esm.sh/prettier@3.1.1/plugins/babel",
]);
export const typescript = extensionWith("typescript", [
  "https://esm.sh/prettier@3.1.1/plugins/estree",
  "https://esm.sh/prettier@3.1.1/plugins/typescript",
]);
