import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BUILTIN_NODE_TYPES, resolveZone, deriveNodeTypes, classifyZone } from "./nodeTypes";
import { parseTemplate } from "./parse";
import type { Zone } from "./types";

function zone(over: Partial<Zone>): Zone {
  return { name: "z", size: 1, layout: "zone_layout_sides", ...over } as Zone;
}

describe("node types", () => {
  it("ships the six built-in archetypes", () => {
    const ids = BUILTIN_NODE_TYPES.map((t) => t.id).sort();
    expect(ids).toEqual(["arena", "hold_city", "hub", "player_spawn", "side", "treasure"]);
  });

  it("resolves a zone from a type with per-node overrides", () => {
    const type = BUILTIN_NODE_TYPES.find((t) => t.id === "treasure")!;
    const zone = resolveZone("Treasure-1", type, { size: 0.8 });
    expect(zone.name).toBe("Treasure-1");
    expect(zone.layout).toBe(type.zone.layout);     // from type
    expect(zone.size).toBe(0.8);                     // override wins
  });

  it("player_spawn type seeds a Spawn main object", () => {
    const type = BUILTIN_NODE_TYPES.find((t) => t.id === "player_spawn")!;
    const zone = resolveZone("Spawn-A", type, {});
    expect(zone.mainObjects?.[0].type).toBe("Spawn");
  });

  it("every built-in type carries all three content pools (empty ones hang the generator)", () => {
    for (const t of BUILTIN_NODE_TYPES) {
      const z = t.zone as unknown as Zone;
      expect(z.guardedContentPool?.length, `${t.id} guarded`).toBeGreaterThan(0);
      expect(z.unguardedContentPool?.length, `${t.id} unguarded`).toBeGreaterThan(0);
      expect(z.resourcesContentPool?.length, `${t.id} resources`).toBeGreaterThan(0);
    }
  });
});

describe("deriveNodeTypes", () => {
  it("adopts a real template's spawn settings when its spawns are uniform", () => {
    // The minimal fixture's two spawns are identical apart from the player slot, so the derived
    // player_spawn default should match them (name aside) rather than the generic built-in.
    const root = parseTemplate(readFileSync(join(__dirname, "..", "test-fixtures", "minimal.rmg.json"), "utf-8"));
    const zones = root.variants[0].zones;
    const derived = deriveNodeTypes(zones).find((t) => t.id === "player_spawn")!;
    const templateSpawn = zones.find((z) => classifyZone(z) === "player_spawn")!;
    const { name: _n, ...expected } = structuredClone(templateSpawn) as any;
    expect(derived.zone).toEqual(expected);
  });

  it("adopts spawn content for Jebus Cross (spawns differ only in per-zone wiring) and clears wiring", () => {
    const root = parseTemplate(readFileSync(join(__dirname, "..", "..", "..", "Templates", "Jebus Cross.rmg.json"), "utf-8"));
    const builtin = BUILTIN_NODE_TYPES.find((t) => t.id === "player_spawn")!;
    const derived = deriveNodeTypes(root.variants[0].zones).find((t) => t.id === "player_spawn")!;
    const z = derived.zone as unknown as Zone; // Omit<Zone> collapses property types via the index sig
    expect(derived.zone).not.toBe(builtin.zone);                       // it adopted from the template
    expect(z.mainObjects?.[0].guardValue).toBe(5000);                  // the template spawn's value
    expect(z.roads).toEqual([]);                                       // per-zone wiring neutralised
    expect(z.mandatoryContent).toEqual([]);
  });

  it("preserves a per-zone reference when all siblings share it, but clears it when they differ", () => {
    const base = (mc: string[]) => zone({
      layout: "zone_layout_sides", guardedContentPool: ["p"], mandatoryContent: mc,
    });
    // Shared across both → preserved.
    const shared = deriveNodeTypes([base(["mc_shared"]), base(["mc_shared"])]).find((t) => t.id === "side")!;
    expect((shared.zone as unknown as Zone).mandatoryContent).toEqual(["mc_shared"]);
    // Different per zone → cleared.
    const perZone = deriveNodeTypes([base(["mc_side_A"]), base(["mc_side_B"])]).find((t) => t.id === "side")!;
    expect((perZone.zone as unknown as Zone).mandatoryContent).toEqual([]);
  });

  it("falls back to the built-in when a template's spawns genuinely differ (Jebus)", () => {
    // Jebus Outcast's two spawns differ in real settings (guardMultiplier, a sub-object's weekly
    // increment) on top of per-player identity, so they are NOT "all the same" → keep the built-in.
    const root = parseTemplate(readFileSync(join(__dirname, "..", "..", "..", "Templates", "Jebus Outcast.rmg.json"), "utf-8"));
    const builtin = BUILTIN_NODE_TYPES.find((t) => t.id === "player_spawn")!;
    const derived = deriveNodeTypes(root.variants[0].zones).find((t) => t.id === "player_spawn")!;
    expect(derived.zone).toBe(builtin.zone);
  });

  it("keeps the built-in default when zones of a type disagree", () => {
    const builtinSide = BUILTIN_NODE_TYPES.find((t) => t.id === "side")!;
    const zones: Zone[] = [
      zone({ name: "S1", layout: "zone_layout_sides", guardedContentValuePerArea: 1200 }),
      zone({ name: "S2", layout: "zone_layout_sides", guardedContentValuePerArea: 9999 }), // differs
    ];
    const derived = deriveNodeTypes(zones).find((t) => t.id === "side")!;
    expect(derived.zone).toBe(builtinSide.zone); // unchanged built-in
  });

  it("ignores the player slot when judging uniformity", () => {
    const zones: Zone[] = [
      zone({ name: "A", layout: "zone_layout_spawns", mainObjects: [{ type: "Spawn", spawn: "Player1", placement: "Center" }] }),
      zone({ name: "B", layout: "zone_layout_spawns", mainObjects: [{ type: "Spawn", spawn: "Player2", placement: "Center" }] }),
    ];
    const derived = deriveNodeTypes(zones).find((t) => t.id === "player_spawn")!;
    expect(derived.zone.layout).toBe("zone_layout_spawns"); // adopted, not the built-in
  });
});
