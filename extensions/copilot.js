import { Extension } from "../extension.js";

async function invoke(messages) {
  const key = localStorage.openAIKey ?? window.prompt("Key?");
  localStorage.openAIKey = key;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      response_format: { type: "json_object" },
      model: "gpt-3.5-turbo-1106",
      messages,
    }),
  });

  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return parsed;
}

export const base = new Extension().registerShortcut(
  "autocompleteAI",
  async (x) => {
    const res = await invoke([
      {
        role: "system",
        content: `You are an expert code completion agent. You receive a JSON object with the following properties:
- prefix, suffix: strings containing the prefix and suffix, res., of the code to be completed
- language: name of the code snippet's language

You reply with a JSON object with the following properties:
- content: the code snippet to be inserted

You never explain code. You never add comments.
Do not elide any code from your output. Do not insert comments or TODOs for blocks that are empty.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          prefix: x.root.sourceString.slice(0, x.end),
          suffix: x.root.sourceString.slice(x.end),
          language: x.language.name,
        }),
      },
    ]);

    // strip markdown prefix and suffix if present
    const code = res.content.replace(/(^```.+?\n)|(\n```$)/, "");
    x.editor.insertTextFromCommand(x.range[1], code);
  }
);
