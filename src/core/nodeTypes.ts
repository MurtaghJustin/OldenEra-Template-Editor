import type { Zone } from "./types";

export interface NodeType {
  id: string;
  label: string;
  builtin: boolean;
  zone: Omit<Zone, "name">; // defaults applied to a node, minus identity
}

// Guard settings shared across roles, taken from Exodus (the most-used template). The reaction
// distribution and randomization are constant there; cutoff/multiplier/weekly vary per role.
function guard(cutoff: number, multiplier: number, weekly: number) {
  return {
    guardCutoffValue: cutoff, guardRandomization: 0.05, guardMultiplier: multiplier,
    guardWeeklyIncrement: weekly, guardReactionDistribution: [120, 60, 20, 10, 4, 0],
  };
}

// Content pools/values modelled on Exodus's real zones so a freshly added node looks like a popular
// template, not an invented stub. CRITICAL: every zone must carry all three pools (guarded,
// unguarded AND resources) — an empty pool hangs the generator (no official-corpus zone omits one;
// this was the root cause of editor-made templates failing to generate). All pool names below are
// the game-global `template_pool_exodus_*` / `content_pool_general_resources_*` pools (verified to
// exist in the game data). Mandatory-content / count-limit refs are left empty on purpose: Exodus's
// (mandatory_content_spawn, …) are template-inline definitions, not game-global, so referencing
// them from a fresh template would dangle — and they aren't required for generation.
function pools(role: "start" | "treasure" | "supertreasure", gVal: number, uVal: number, rVal: number) {
  const guarded = `template_pool_exodus_guarded_${role}_zone`;
  const unguarded = `template_pool_exodus_unguarded_${role}_zone`;
  const resources = role === "start"
    ? "content_pool_general_resources_start_zone_rich"
    : "content_pool_general_resources_treasure_zone_rich_no_scrolls";
  return {
    guardedContentPool: [guarded], guardedContentValue: gVal, guardedContentValuePerArea: 0,
    unguardedContentPool: [unguarded], unguardedContentValue: uVal, unguardedContentValuePerArea: 0,
    resourcesContentPool: [resources], resourcesValue: rVal, resourcesValuePerArea: 0,
    mandatoryContent: [] as string[], contentCountLimits: [] as string[], roads: [] as unknown[],
  };
}
const anyBiome = { type: "FromList" as const, args: [] as string[] };
const biomes = { zoneBiome: anyBiome, contentBiome: anyBiome, metaObjectsBiome: anyBiome };

export const BUILTIN_NODE_TYPES: NodeType[] = [
  {
    // Exodus Spawn (zone_layout_start_zone): a town spawn with guarded/unguarded start content.
    id: "player_spawn", label: "Player Spawn", builtin: true,
    zone: {
      size: 1.0, layout: "zone_layout_spawns", ...guard(3500, 1, 0.15),
      ...pools("start", 400000, 100000, 50000), ...biomes,
      zoneBiome: { type: "MatchMainObject", args: ["0"] },
      contentBiome: { type: "MatchMainObject", args: ["0"] },
      metaObjectsBiome: { type: "MatchMainObject", args: ["0"] },
      mainObjects: [{ type: "Spawn", spawn: "Player1", removeGuardIfHasOwner: true, guardChance: 1,
        guardValue: 10000, guardWeeklyIncrement: 0.1,
        buildingsConstructionSid: "default_buildings_construction",
        placement: "Uniform", placementArgs: ["true", "0.0", "2"] }],
    },
  },
  {
    // Exodus Center-Treasure (zone_layout_treasure_zone): the central guarded treasure zone.
    id: "hub", label: "Hub / Center", builtin: true,
    zone: { size: 1.5, layout: "zone_layout_center", ...guard(2500, 1.5, 0.15),
      ...pools("treasure", 500000, 50000, 25000), ...biomes,
      crossroadsPosition: 1, mainObjects: [] },
  },
  {
    // A neutral side zone: Exodus's treasure-zone content scaled down for a minor zone.
    id: "side", label: "Side / Neutral", builtin: true,
    zone: { size: 1.0, layout: "zone_layout_sides", ...guard(2500, 1.5, 0.15),
      ...pools("treasure", 200000, 25000, 15000), ...biomes,
      mainObjects: [] },
  },
  {
    // Exodus Center-SuperTreasure (zone_layout_supertreasure_zone): the richest guarded zone.
    id: "treasure", label: "Treasure", builtin: true,
    zone: { size: 1.0, layout: "zone_layout_treasures", ...guard(2500, 2, 0.15),
      ...pools("supertreasure", 750000, 75000, 25000), ...biomes,
      mainObjects: [] },
  },
  {
    id: "hold_city", label: "Hold-City Objective", builtin: true,
    zone: { size: 1.0, layout: "zone_layout_wincondition_zone", ...guard(2500, 1.5, 0.15),
      ...pools("treasure", 500000, 50000, 25000), ...biomes,
      mainObjects: [{ type: "City", guardChance: 1, guardValue: 20000,
        buildingsConstructionSid: "rich_buildings_construction",
        faction: { type: "FromList", args: [] }, placement: "Center",
        placementArgs: [], holdCityWinCon: true }] },
  },
  {
    id: "arena", label: "Gladiator Arena", builtin: true,
    zone: { size: 1.0, layout: "zone_layout_center", ...guard(2500, 1.5, 0.15),
      ...pools("treasure", 300000, 30000, 15000), ...biomes,
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
