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
