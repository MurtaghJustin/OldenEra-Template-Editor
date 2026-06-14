import { describe, it, expect } from "vitest";
import { cloneRaw, mergeEdits } from "./roundtrip";
import type { TemplateRoot } from "./types";

const base: any = {
  name: "T",
  gameMode: "Classic",
  sizeX: 96,
  sizeZ: 96,
  gameRules: { heroCountMin: 4, futureField: 42 },
  variants: [
    { zones: [{ name: "A", size: 1, layout: "x", customZoneField: "keep" }], connections: [] },
    { zones: [{ name: "OTHER", size: 1, layout: "y" }], connections: [] },
  ],
  unknownTopLevel: { keep: true },
};

describe("mergeEdits", () => {
  it("preserves untouched variants, unknown fields, and field placement", () => {
    const original = cloneRaw(base) as TemplateRoot;
    const edited = cloneRaw(base) as any;
    edited.variants[0].zones[0].size = 2; // the only edit
    const out = mergeEdits(original, edited) as any;
    expect(out.variants[0].zones[0].size).toBe(2);
    expect(out.variants[0].zones[0].customZoneField).toBe("keep"); // unknown preserved
    expect(out.variants[1].zones[0].name).toBe("OTHER");           // other variant intact
    expect(out.gameRules.futureField).toBe(42);                    // unknown preserved
    expect(out.unknownTopLevel).toEqual({ keep: true });           // top-level unknown preserved
  });

  it("does not mutate the original", () => {
    const original = cloneRaw(base) as TemplateRoot;
    const edited = cloneRaw(base) as any;
    edited.name = "Changed";
    mergeEdits(original, edited);
    expect((original as any).name).toBe("T");
  });

  it("removes a key when the edited model deletes it", () => {
    const original = cloneRaw(base) as any;
    const edited = cloneRaw(base) as any;
    delete edited.variants[0].zones[0].customZoneField;
    const out = mergeEdits(original, edited) as any;
    expect("customZoneField" in out.variants[0].zones[0]).toBe(false);
  });
});
