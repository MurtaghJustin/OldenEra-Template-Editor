import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseTemplate, serializeTemplate } from "./parse";
import { mergeEdits } from "./roundtrip";

// Round-trip every real game template, when available. Resolve the templates from the game-files
// path (OLDEN_ERA_GAME_FILES, a folder containing Templates/); fall back to the monorepo layout if
// present. Skipped when neither exists, so the suite passes in a standalone checkout without the
// game files.
const TEMPLATES_DIR = [
  process.env.OLDEN_ERA_GAME_FILES ? join(process.env.OLDEN_ERA_GAME_FILES, "Templates") : "",
  join(__dirname, "..", "..", "..", "Templates"),
].find((d) => d && existsSync(d)) ?? "";
const files = TEMPLATES_DIR ? readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".rmg.json")) : [];

describe.skipIf(files.length === 0)("corpus round-trip", () => {
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
