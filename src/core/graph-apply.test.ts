import { describe, it, expect } from "vitest";
import { extractGraph, addZone, removeZone, addConnection, removeConnection, renameZone } from "./graph";
import { parseTemplate, serializeTemplate } from "./parse";
import minimal from "../test-fixtures/minimal.rmg.json";

function fresh() { return parseTemplate(JSON.stringify(minimal)); }

describe("graph apply", () => {
  it("adds a zone to the variant", () => {
    const root = fresh();
    addZone(root, 0, { name: "Side-A1", size: 1, layout: "zone_layout_sides" });
    expect(root.variants[0].zones.map((z) => z.name)).toContain("Side-A1");
  });

  it("removes a zone and its incident connections", () => {
    const root = fresh();
    removeZone(root, 0, "Hub");
    expect(root.variants[0].zones.find((z) => z.name === "Hub")).toBeUndefined();
    expect(root.variants[0].connections).toHaveLength(0); // both connected to Hub
  });

  it("renames a zone and updates connection endpoints", () => {
    const root = fresh();
    renameZone(root, 0, "Hub", "Center");
    expect(root.variants[0].zones.find((z) => z.name === "Center")).toBeDefined();
    expect(root.variants[0].connections.every((c) => c.from !== "Hub" && c.to !== "Hub")).toBe(true);
    expect(root.variants[0].connections.some((c) => c.to === "Center")).toBe(true);
  });

  it("adds and removes connections", () => {
    const root = fresh();
    addConnection(root, 0, { from: "Spawn-A", to: "Spawn-B", connectionType: "Proximity" });
    const before = root.variants[0].connections.length;
    expect(before).toBe(3);
    removeConnection(root, 0, "Spawn-A-Hub");
    expect(root.variants[0].connections.length).toBe(before - 1);
  });

  it("produces serializable output after edits", () => {
    const root = fresh();
    addZone(root, 0, { name: "Z", size: 1, layout: "zone_layout_sides" });
    expect(() => serializeTemplate(root)).not.toThrow();
    expect(extractGraph(root, 0).nodes.some((n) => n.id === "Z")).toBe(true);
  });
});
