import { TreeSitterLanguage } from "./tree-sitter.js";

const languages = [];

export function registerLanguage(language) {
  languages.push(language);
}

export function languageFor(name) {
  return languages.find((language) => language.name === name);
}

export function languageForExtension(extension) {
  return languages.find((language) => language.extensions.includes(extension));
}

registerLanguage(
  new TreeSitterLanguage({
    repo: "tree-sitter/tree-sitter-javascript",
    branch: "0c0b18de798a90cd22819cec4802a27b914e395c",
    extensions: ["js"],
    defaultExtensions: ["javascript:base"],
  })
);
registerLanguage(
  new TreeSitterLanguage({
    repo: "tree-sitter/tree-sitter-json",
    branch: "3fef30de8aee74600f25ec2e319b62a1a870d51e",
    extensions: ["json"],
    defaultExtensions: ["json:base"],
  })
);
registerLanguage(
  new TreeSitterLanguage({
    repo: "tom95/tree-sitter-smalltalk",
    branch: "fd6a5a256f831f0882b435d976c9baab04fb9e2b",
    extensions: ["st"],
  })
);
registerLanguage(
  new TreeSitterLanguage({
    repo: "tlaplus-community/tree-sitter-tlaplus",
    branch: "c5fae9e4ad9f483fb6232a8688a2c940be6b496b",
    extensions: ["tla"],
  })
);
registerLanguage(
  new TreeSitterLanguage({
    repo: "MDeiml/tree-sitter-markdown",
    branch: "f9820b2db958228f9be339b67d2de874d065866e",
    path: "/tree-sitter-markdown/",
    extensions: ["md"],
    defaultExtensions: ["markdown:base"],
  })
);
