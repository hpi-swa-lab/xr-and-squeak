import { Project } from "../core/project.js";
import { FileEditor } from "./file-project/file-editor.js";
import { openComponentInWindow } from "./window.js";

class LocalStorageProject extends Project {
  path = "localStorage://";

  async readFiles(list) {
    return list.map((path) => ({
      path,
      data: localStorage.getItem(path) ?? "",
    }));
  }

  async writeFile(path, source) {
    localStorage.setItem(path, source);
    console.log(path, source);
  }
}

export function openPreferences() {
  openComponentInWindow(FileEditor, {
    project: new LocalStorageProject(),
    path: "localStorage:///preferences.js",
  });
}
