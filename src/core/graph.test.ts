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

  it("derives treasure tier from layout name (still used for palette swatches)", () => {
    expect(treasureTierFromLayout("zone_layout_treasures")).toBe("high");
    expect(treasureTierFromLayout("zone_layout_sides")).toBe("low");
    expect(treasureTierFromLayout("zone_layout_supertreasure_zone")).toBe("high");
  });

  it("colours a zone by total content value relative to the map's richest zone, not its layout", () => {
    const mk = (name: string, gv: number, layout = "zone_layout_sides") =>
      ({ name, size: 1, layout, guardedContentValue: gv, mainObjects: [] });
    const root = { variants: [{ zones: [mk("Rich", 1000), mk("Mid", 750), mk("Poor", 500)], connections: [] }] } as any;
    const nodes = extractGraph(root, 0).nodes;
    const tier = (id: string) => nodes.find((n) => n.id === id)!.tier;
    expect(tier("Rich")).toBe("high");    // ratio 1.00 ≥ 0.85 → gold
    expect(tier("Mid")).toBe("medium");   // ratio 0.75 ∈ [0.65,0.85) → silver
    expect(tier("Poor")).toBe("low");     // ratio 0.50 < 0.65 → bronze
    // layout no longer dictates colour: a high-value "side" zone is gold, a low-value "treasure" isn't.
    const root2 = { variants: [{ zones: [mk("BigSide", 1000, "zone_layout_sides"), mk("TinyTreasure", 50, "zone_layout_treasures")], connections: [] }] } as any;
    const n2 = extractGraph(root2, 0).nodes;
    expect(n2.find((n) => n.id === "BigSide")!.tier).toBe("high");
    expect(n2.find((n) => n.id === "TinyTreasure")!.tier).toBe("low");
  });
});
