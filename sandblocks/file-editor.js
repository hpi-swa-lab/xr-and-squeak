import { h } from "../widgets.js";
import { editor, useAsyncEffect } from "../widgets.js";
import { languageForExtension } from "../core/languages.js";
import { useEffect, useState, useRef } from "../external/preact-hooks.mjs";
import { references } from "./references.js";
import { Extension } from "../extension.js";

const search = new Extension()
  .registerShortcut("search", (x) => {
    x.editor.context.startSearch();
  })
  .registerAlways((e) => [
    (_) => !!e.searchString,
    (x) => x.isText,
    (x) =>
      e.searchIsExact
        ? x.text === e.searchString
        : x.text.toLowerCase().includes(e.searchString.toLowerCase()),
    (x) => e.ensureClass(x, "search-result"),
  ]);

export function FileEditor({
  project,
  path,
  style,
  initialSearchString,
  initialSearchExact,
  initialSelection,
}) {
  const [sourceString, setSourceString] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [searchVisible, setSearchVisible] = useState(!!initialSearchString);

  const fileEditorRef = useRef(null);
  const editorRef = useRef(null);
  const searchRef = useRef(null);

  useAsyncEffect(async () => {
    setSourceString(await project.readFile(path));
    setUnsavedChanges(false);
  }, [path]);

  useAsyncEffect(async () => {
    if (sourceString && initialSelection) {
      editorRef.current.addEventListener("loaded", () => {}, { once: true });
    }
  }, [sourceString]);

  const ext = path.split(".").slice(-1)[0].toLowerCase();
  const language = languageForExtension(ext);

  return h(
    "sb-file-editor",
    {
      ref: fileEditorRef,
      style: {
        position: "relative",
        display: "flex",
        flexGrow: 1,
        height: 0,
        ...(style ?? {}),
      },
      project,
      path,
      onstartSearch: () => {
        setSearchVisible(true);
        queueMicrotask(() => {
          searchRef.current?.focus();
        });
      },
    },
    h(
      "div",
      { style: { overflowY: "scroll", padding: "2px", width: "100%" } },
      sourceString !== null &&
        editor({
          extensions: [
            "base:base",
            "base:identifierSuggestions",
            "copilot:base",
            ...language.defaultExtensions,
          ],
          inlineExtensions: [references, search],
          sourceString,
          editorRef,
          context: fileEditorRef.current,
          language: language.name,
          onloaded: () => {
            if (!initialSelection) return;
            debugger;
            editorRef.current.selectRange(...initialSelection);
            editorRef.current.selected?.scrollIntoView();
          },
          onSave: async (data) => {
            await project.writeFile(path, data);
            setUnsavedChanges(false);
          },
          onChange: () => setUnsavedChanges(true),
        })
    ),
    unsavedChanges && h("div", { class: "sb-file-editor-unsaved" }),
    sourceString !== null &&
      searchVisible &&
      h(SearchField, {
        editorRef,
        initialSearchString,
        initialSearchExact,
        focusRef: searchRef,
        onClose: (selectRange, shard) => {
          setSearchVisible(false);
          editorRef.current?.focus();
          if (selectRange)
            editorRef.current?.selectRange(...selectRange, shard);
        },
      })
  );
}

// custom element for locating file editor props in the tree hierarchy
customElements.define(
  "sb-file-editor",
  class extends HTMLElement {
    project = null;
    path = null;

    startSearch() {
      this.dispatchEvent(new CustomEvent("startSearch"));
    }
  }
);

function wrapNumber(n, min, max) {
  if (n < min) return max;
  if (n > max) return min;
  return n;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function SearchField({
  editorRef,
  focusRef,
  initialSearchString,
  initialSearchExact,
  onClose,
}) {
  const [searchString, setSearchString] = useState(initialSearchString);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchExact, setSearchExact] = useState(initialSearchExact);
  const searchRef = useRef(null);

  const matches = () =>
    editorRef.current?.shadowRoot.querySelectorAll(".search-result");

  const close = () => setSearchString(null);

  useAsyncEffect(async () => {
    await wait(0);
    if (initialSearchString) {
      setSelectedIndex(0);
    }
  }, [initialSearchString]);

  useEffect(() => {
    const match = matches()[selectedIndex];

    editorRef.current?.updateExtension(search, "always", (e) => {
      e.searchString = searchString;
      e.searchIsExact = searchExact;
    });
    if (searchString === null) {
      onClose(match?.range, match?.shard);
    }
  }, [searchString, searchExact]);

  useEffect(() => {
    editorRef.current?.shadowRoot
      .querySelector(".search-result.active")
      ?.classList.remove("active");

    const m = matches();
    const match = m[selectedIndex];
    if (match) {
      match.classList.add("active");
      match.scrollIntoView({ block: "center" });
    } else if (m[0]) {
      m[0].scrollIntoView({ block: "center" });
    }
  }, [selectedIndex, searchString]);

  return h(
    "div",
    { style: { position: "absolute", bottom: 2, right: 2 } },
    h("input", {
      ref: (e) => {
        searchRef.current = e;
        if (focusRef) focusRef.current = e;
      },
      placeholder: "Search ...",
      value: searchString,
      type: "text",
      onkeydown: (e) => {
        if (e.key === "Enter") {
          setSelectedIndex(
            wrapNumber(
              selectedIndex + (e.shiftKey ? -1 : 1),
              0,
              matches().length - 1
            )
          );
        } else if (e.key === "Escape") {
          close();
        }
      },
      oninput: (e) => {
        setSelectedIndex(-1);
        setSearchString(e.target.value);
      },
    }),
    h("input", {
      type: "checkbox",
      checked: searchExact,
      title: "Exact Search",
      onchange: (e) => setSearchExact(e.target.checked),
    }),
    h("button", { onclick: close }, "Close")
  );
}
