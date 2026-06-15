import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useEditorStore } from "./state/store";
import { parseTemplate } from "./core/parse";

const SPIDER = join(__dirname, "..", "..", "Templates", "Spider.rmg.json");

describe("integration: edit a real template and save", () => {
  it("preserves everything except the single edited field", () => {
    const text = readFileSync(SPIDER, "utf-8");
    useEditorStore.getState().loadFromText(text, "Spider.rmg.json");

    const firstZone = useEditorStore.getState().root!.variants[0].zones[0].name;
    useEditorStore.getState().updateZone(firstZone, { size: 1.234 });

    const out = parseTemplate(useEditorStore.getState().serializeForSave());
    const orig = parseTemplate(text);

    // The edit is present.
    expect(out.variants[0].zones[0].size).toBe(1.234);

    // Everything else is identical: compare with the edit reverted.
    out.variants[0].zones[0].size = orig.variants[0].zones[0].size;
    expect(out).toEqual(orig);
  });
});
