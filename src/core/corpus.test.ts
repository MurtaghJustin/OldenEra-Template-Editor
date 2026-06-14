import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseTemplate, serializeTemplate } from "./parse";
import { mergeEdits } from "./roundtrip";

const TEMPLATES_DIR = join(__dirname, "..", "..", "..", "Templates");
const files = readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".rmg.json"));

describe("corpus round-trip", () => {
  it("has 61 official templates", () => {
    expect(files.length).toBe(61);
  });

  it.each(files)("%s: parse -> serialize -> parse is semantically identical", (file) => {
    const text = readFileSync(join(TEMPLATES_DIR, file), "utf-8");
    const a = parseTemplate(text);
    const b = parseTemplate(serializeTemplate(a));
    expect(b).toEqual(a);
  });

  it.each(files)("%s: no-op mergeEdits is identity", (file) => {
    const text = readFileSync(join(TEMPLATES_DIR, file), "utf-8");
    const root = parseTemplate(text);
    expect(mergeEdits(root, root)).toEqual(root);
  });
});
