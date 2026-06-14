import { describe, it, expect } from "vitest";
import { extractGraph, treasureTierFromLayout } from "./graph";
import { parseTemplate } from "./parse";
import minimal from "../test-fixtures/minimal.rmg.json";

describe("extractGraph", () => {
  const root = parseTemplate(JSON.stringify(minimal));
  const g = extractGraph(root, 0);

  it("creates a node per zone and an edge per connection", () => {
    expect(g.nodes.map((n) => n.id).sort()).toEqual(["Hub", "Spawn-A", "Spawn-B"]);
    expect(g.edges).toHaveLength(2);
  });

  it("flags player spawns with their slot number", () => {
    const a = g.nodes.find((n) => n.id === "Spawn-A")!;
    expect(a.playerSlot).toBe(1);
    expect(a.hasTown).toBe(false);
    const hub = g.nodes.find((n) => n.id === "Hub")!;
    expect(hub.playerSlot).toBeUndefined();
  });

  it("derives treasure tier from layout name", () => {
    expect(treasureTierFromLayout("zone_layout_treasures")).toBe("high");
    expect(treasureTierFromLayout("zone_layout_sides")).toBe("low");
    expect(treasureTierFromLayout("zone_layout_supertreasure_zone")).toBe("high");
  });
});
