import { describe, it, expect } from "vitest";
import { BUILTIN_NODE_TYPES, resolveZone } from "./nodeTypes";

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
});
