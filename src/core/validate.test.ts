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

  it("warns (not errors) on an unknown layout SID", () => {
    const root = fresh();
    root.variants[0].zones[0].layout = "zone_layout_made_up";
    const issues = validateTemplate(root);
    expect(issues.some((i) => i.severity === "warning" && /layout/.test(i.message))).toBe(true);
    expect(issues.some((i) => i.severity === "error" && /layout/.test(i.message))).toBe(false);
  });
});
