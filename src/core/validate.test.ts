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

  it("warns (not errors) on an unknown layout SID", () => {
    const root = fresh();
    root.variants[0].zones[0].layout = "zone_layout_made_up";
    const issues = validateTemplate(root);
    expect(issues.some((i) => i.severity === "warning" && /layout/.test(i.message))).toBe(true);
    expect(issues.some((i) => i.severity === "error" && /layout/.test(i.message))).toBe(false);
  });
});
