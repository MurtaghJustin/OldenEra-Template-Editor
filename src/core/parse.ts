import type { TemplateRoot } from "./types";

export function parseTemplate(text: string): TemplateRoot {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    throw new Error("Invalid template: root must be a JSON object");
  }
  return obj as TemplateRoot;
}

// Official files use tabs + trailing newline. Match that convention.
export function serializeTemplate(root: TemplateRoot): string {
  return JSON.stringify(root, null, "\t") + "\n";
}
