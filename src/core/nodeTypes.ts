import type { Zone } from "./types";

export interface NodeType {
  id: string;
  label: string;
  builtin: boolean;
  zone: Omit<Zone, "name">; // defaults applied to a node, minus identity
}

const baseGuard = {
  guardCutoffValue: 1500,
  guardRandomization: 0.05,
  guardMultiplier: 1.0,
  guardWeeklyIncrement: 0.1,
  guardReactionDistribution: [60, 20, 10, 5, 2, 0],
};
const emptyPools = {
  guardedContentPool: [], unguardedContentPool: [], resourcesContentPool: [],
  guardedContentValue: 0, guardedContentValuePerArea: 0,
  unguardedContentValue: 0, unguardedContentValuePerArea: 0,
  resourcesValue: 0, resourcesValuePerArea: 0,
  mandatoryContent: [], contentCountLimits: [], roads: [],
};
const anyBiome = { type: "FromList" as const, args: [] as string[] };
const biomes = { zoneBiome: anyBiome, contentBiome: anyBiome, metaObjectsBiome: anyBiome };

export const BUILTIN_NODE_TYPES: NodeType[] = [
  {
    id: "player_spawn", label: "Player Spawn", builtin: true,
    zone: {
      size: 1.0, layout: "zone_layout_spawns", ...baseGuard, ...emptyPools, ...biomes,
      zoneBiome: { type: "MatchMainObject", args: ["0"] },
      mainObjects: [{ type: "Spawn", spawn: "Player1", owner: null, guardChance: 0,
        guardValue: 0, removeGuardIfHasOwner: true,
        buildingsConstructionSid: "poor_buildings_construction",
        faction: { type: "FromList", args: [] }, placement: "Center", placementArgs: [] }],
    },
  },
  {
    id: "hub", label: "Hub / Center", builtin: true,
    zone: { size: 1.5, layout: "zone_layout_center", ...baseGuard, ...emptyPools, ...biomes,
      crossroadsPosition: 1, guardedContentPool: ["classic_template_pool_random_t4_base"],
      guardedContentValuePerArea: 2000, mainObjects: [] },
  },
  {
    id: "side", label: "Side / Neutral", builtin: true,
    zone: { size: 1.0, layout: "zone_layout_sides", ...baseGuard, ...emptyPools, ...biomes,
      guardedContentPool: ["classic_template_pool_random_t2_base"],
      guardedContentValuePerArea: 1200, mainObjects: [] },
  },
  {
    id: "treasure", label: "Treasure", builtin: true,
    zone: { size: 1.0, layout: "zone_layout_treasures", ...baseGuard, ...emptyPools, ...biomes,
      guardedContentPool: ["classic_template_pool_random_t5_base"],
      guardedContentValuePerArea: 3000, mainObjects: [] },
  },
  {
    id: "hold_city", label: "Hold-City Objective", builtin: true,
    zone: { size: 1.0, layout: "zone_layout_wincondition_zone", ...baseGuard, ...emptyPools, ...biomes,
      mainObjects: [{ type: "City", guardChance: 1, guardValue: 20000,
        buildingsConstructionSid: "rich_buildings_construction",
        faction: { type: "FromList", args: [] }, placement: "Center",
        placementArgs: [], holdCityWinCon: true }] },
  },
  {
    id: "arena", label: "Gladiator Arena", builtin: true,
    zone: { size: 1.0, layout: "zone_layout_center", ...baseGuard, ...emptyPools, ...biomes,
      mainObjects: [{ type: "GladiatorArena", placement: "Center", placementArgs: [] }] },
  },
];

export function resolveZone(name: string, type: NodeType, overrides: Partial<Zone>): Zone {
  return { name, ...structuredClone(type.zone), ...structuredClone(overrides) } as Zone;
}

// Map an existing template zone onto one of the built-in node-type ids, mirroring how extractGraph
// reads a zone: main objects decide spawn/arena/hold-city; otherwise the layout name decides.
export function classifyZone(zone: Zone): string {
  const main = zone.mainObjects ?? [];
  if (main.some((m) => m.type === "Spawn")) return "player_spawn";
  if (main.some((m) => m.type === "GladiatorArena")) return "arena";
  if (main.some((m) => m.type === "City")) return "hold_city";
  const l = (zone.layout || "").toLowerCase();
  if (l.includes("treasure")) return "treasure";
  if (l.includes("side")) return "side";
  if (l.includes("center")) return "hub";
  return "side";
}

// Stable, key-order-independent JSON so two zones authored with different property orders still
// compare equal.
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) out[k] = canonical((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}

// Per-zone identity / wiring that legitimately differs between sibling zones of the same type and
// must NOT count toward "are these the same?" nor be copied to a new node: the zone's own road
// wiring and its mandatory-content list (which usually references a specific side). The name and a
// spawn's player slot are handled separately.
const ZONE_IDENTITY = ["roads", "mandatoryContent"] as const;

// A zone's "settings fingerprint": its content/properties with identity stripped — name, the
// per-zone identity fields above, and a spawn's player slot. Two zones that differ only in those
// (e.g. Jebus Cross's two spawns) share a fingerprint and so count as "the same".
function settingsFingerprint(zone: Zone): string {
  const c = structuredClone(zone) as Record<string, unknown>;
  delete c.name;
  for (const k of ZONE_IDENTITY) delete c[k];
  for (const m of (c.mainObjects as Array<Record<string, unknown>> | undefined) ?? []) delete m.spawn;
  return JSON.stringify(canonical(c));
}

// The default zone adopted for a node type: the template zone's shared settings with per-zone
// wiring CLEARED (a per-zone identity field is restored afterwards if all siblings share it — see
// deriveNodeTypes). The spawn slot is kept — addZoneOfType reassigns it to the next free player.
function templateDefaultZone(zone: Zone): Omit<Zone, "name"> {
  const c = structuredClone(zone) as Record<string, unknown>;
  delete c.name;
  for (const k of ZONE_IDENTITY) c[k] = [];
  return c as Omit<Zone, "name">;
}

// True if every zone has the identical value for `key` (so it's a shared reference, not per-zone).
function allSiblingsShare(zones: Zone[], key: string): boolean {
  const c = (z: Zone) => JSON.stringify(canonical((z as Record<string, unknown>)[key] ?? null));
  const first = c(zones[0]);
  return zones.every((z) => c(z) === first);
}

/**
 * Build the session's node-type palette from a loaded template: for each built-in type, if the
 * template's zones of that type all share identical settings (ignoring name + spawn slot), adopt
 * those settings as the type's default so a newly added node copies what's already there. Types
 * with no matching zones, or whose zones disagree, keep the built-in default.
 */
export function deriveNodeTypes(zones: Zone[], builtins: NodeType[] = BUILTIN_NODE_TYPES): NodeType[] {
  const byType = new Map<string, Zone[]>();
  for (const z of zones) {
    const id = classifyZone(z);
    (byType.get(id) ?? byType.set(id, []).get(id)!).push(z);
  }
  return builtins.map((bt) => {
    const matches = byType.get(bt.id);
    if (!matches || matches.length === 0) return bt;
    const fp = settingsFingerprint(matches[0]);
    if (!matches.every((z) => settingsFingerprint(z) === fp)) return bt; // not all the same → keep default
    const zone = templateDefaultZone(matches[0]) as Record<string, unknown>;
    // Restore a per-zone field if it's IDENTICAL across every sibling (a shared reference, e.g.
    // Jebus Outcast's common mandatory_content_spawn_1); keep it cleared when it's zone-specific
    // (e.g. Jebus Cross's side_A vs side_B), since that wouldn't fit a fresh node.
    for (const k of ZONE_IDENTITY) {
      const v0 = (matches[0] as Record<string, unknown>)[k];
      if (v0 !== undefined && allSiblingsShare(matches, k)) zone[k] = structuredClone(v0);
    }
    return { ...bt, zone: zone as Omit<Zone, "name"> };
  });
}
