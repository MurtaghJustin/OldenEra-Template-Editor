import { describe, it, expect } from "vitest";
import { validateTemplate } from "./validate";
import { parseTemplate } from "./parse";
import minimal from "../test-fixtures/minimal.rmg.json";

function fresh() { return parseTemplate(JSON.stringify(minimal)); }

describe("validate", () => {
  it("passes the clean minimal template (no errors)", () => {
    const issues = validateTemplate(fresh());
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("errors when a connection references a missing zone", () => {
    const root = fresh();
    root.variants[0].connections[0].to = "Ghost";
    const issues = validateTemplate(root);
    expect(issues.some((i) => i.severity === "error" && /Ghost/.test(i.message))).toBe(true);
  });

  it("errors on duplicate zone names", () => {
    const root = fresh();
    root.variants[0].zones[1].name = "Spawn-A";
    const issues = validateTemplate(root);
    expect(issues.some((i) => i.severity === "error" && /duplicate/i.test(i.message))).toBe(true);
  });

  it("errors on duplicate player slots", () => {
    const root = fresh();
    (root.variants[0].zones[1].mainObjects![0]).spawn = "Player1";
    const issues = validateTemplate(root);
    expect(issues.some((i) => i.severity === "error" && /Player1/.test(i.message))).toBe(true);
  });

  it("errors on an out-of-enum connectionType", () => {
    const root = fresh();
    (root.variants[0].connections[0] as any).connectionType = "Bogus";
    const issues = validateTemplate(root);
    expect(issues.some((i) => i.severity === "error" && /connectionType/.test(i.message))).toBe(true);
  });

  it("errors when a zone is missing any content pool (the generation-hang root cause)", () => {
    const root = fresh();
    expect(validateTemplate(root).some((i) => /content pool/i.test(i.message))).toBe(false);
    root.variants[0].zones[0].unguardedContentPool = [];
    const issues = validateTemplate(root);
    expect(issues.some((i) => i.severity === "error" && /unguarded content pool/i.test(i.message))).toBe(true);
    // guarded and resources are checked too
    root.variants[0].zones[1].guardedContentPool = [];
    root.variants[0].zones[2].resourcesContentPool = [];
    const all = validateTemplate(root);
    expect(all.some((i) => /guarded content pool/i.test(i.message))).toBe(true);
    expect(all.some((i) => /resources content pool/i.test(i.message))).toBe(true);
  });

  it("errors when no win condition is set (required for generation)", () => {
    const root = fresh();
    expect(validateTemplate(root).some((i) => /win condition/i.test(i.message))).toBe(false);
    delete (root as { displayWinCondition?: string }).displayWinCondition;
    const issues = validateTemplate(root);
    expect(issues.some((i) => i.severity === "error" && /win condition/i.test(i.message))).toBe(true);
  });

  it("errors on a biome selector using Match with a non-numeric first arg (the ungenerateable case)", () => {
    const root = fresh();
    // The exact Warlords bug: a biome name where Match expects a main-object index.
    (root.variants[0].zones[0] as any).zoneBiome = { type: "Match", args: ["Sand"] };
    const issues = validateTemplate(root);
    expect(issues.some((i) => i.severity === "error" && /Match/.test(i.message) && /index/.test(i.message))).toBe(true);
  });

  it("errors on a main-object FACTION selector using Match with a non-numeric first arg", () => {
    const root = fresh();
    const spawn = root.variants[0].zones[0].mainObjects![0];
    (spawn as any).faction = { type: "Match", args: ["human"] }; // faction name where an index is required
    const issues = validateTemplate(root);
    expect(issues.some((i) => i.severity === "error" && /faction/.test(i.message) && /index/.test(i.message))).toBe(true);
  });

  it("does not flag a Random faction selector (valid, no index needed)", () => {
    const root = fresh();
    (root.variants[0].zones[0].mainObjects![0] as any).faction = { type: "Random", args: [] };
    expect(validateTemplate(root).some((i) => /faction/.test(i.message))).toBe(false);
  });

  it("accepts Match/MatchMainObject with a numeric index (no false positive)", () => {
    const root = fresh();
    (root.variants[0].zones[0] as any).zoneBiome = { type: "Match", args: ["0", "Spawn-A"] };
    (root.variants[0].zones[1] as any).contentBiome = { type: "MatchMainObject", args: ["0"] };
    // minimal already uses MatchMainObject ["0"] for zoneBiome — all should be clean.
    expect(validateTemplate(root).some((i) => /Match/.test(i.message))).toBe(false);
  });

  it("warns on a mandatory item with neither an object nor include-lists, but not on a list-only item", () => {
    const root = fresh();
    (root as any).mandatoryContent = [
      { name: "good_list_only", content: [{ includeLists: ["some_list"], isGuarded: false }] },
      { name: "blank", content: [{ isGuarded: false }] },
    ];
    const issues = validateTemplate(root);
    expect(issues.some((i) => i.severity === "warning" && /blank/.test(i.message))).toBe(true);
    expect(issues.some((i) => /good_list_only/.test(i.message))).toBe(false);
  });

  it("warns (not errors) on an unknown layout SID", () => {
    const root = fresh();
    root.variants[0].zones[0].layout = "zone_layout_made_up";
    const issues = validateTemplate(root);
    expect(issues.some((i) => i.severity === "warning" && /layout/.test(i.message))).toBe(true);
    expect(issues.some((i) => i.severity === "error" && /layout/.test(i.message))).toBe(false);
  });
});
