import { Language } from "./language.js";

export let config = {
  baseURL: "",
  languages: [
    new Language({
      repo: "tree-sitter/tree-sitter-javascript",
      branch: "0c0b18de798a90cd22819cec4802a27b914e395c",
      extensions: ["js"],
      defaultExtensions: ["javascript:base"],
    }),
    new Language({
      repo: "tree-sitter/tree-sitter-json",
      branch: "3fef30de8aee74600f25ec2e319b62a1a870d51e",
      extensions: ["json"],
      defaultExtensions: ["json:base"],
    }),
    new Language({
      repo: "tom95/tree-sitter-smalltalk",
      branch: "fd6a5a256f831f0882b435d976c9baab04fb9e2b",
      extensions: ["st"],
    }),
    new Language({
      repo: "tlaplus-community/tree-sitter-tlaplus",
      branch: "c5fae9e4ad9f483fb6232a8688a2c940be6b496b",
      extensions: ["tla"],
    }),
    new Language({
      repo: "MDeiml/tree-sitter-markdown",
      branch: "f9820b2db958228f9be339b67d2de874d065866e",
      path: "/tree-sitter-markdown/",
      extensions: ["md"],
      defaultExtensions: ["markdown:base"],
    }),
  ],
};

export function setConfig(options) {
  Object.assign(config, options);
}
