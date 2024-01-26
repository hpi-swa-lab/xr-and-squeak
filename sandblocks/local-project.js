import { Project } from "../core/project.js";

class LocalStorageProject extends Project {
  path = ".";

  async readFiles(list) {
    return list.map((path) => ({
      path,
      data: localStorage.getItem(path) ?? "",
    }));
  }

  async writeFile(path, source) {
    localStorage.setItem(path, source);
  }
}

export const localStorageProject = new LocalStorageProject();
