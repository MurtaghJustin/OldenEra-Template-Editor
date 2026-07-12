import type { Selector } from "./types";

// Friendly, bidirectional model over the raw biome/faction Selector ({type, args}). The UI edits the
// friendly state; parse/build translate to and from the on-disk shape. Reading is lenient (handles
// every arg variant seen in official templates); writing emits one clean canonical form.

// A "differentFrom" exclusion: avoid the value chosen for main-object `index` of `zone`. The index is
// optional for biomes (bare "differentFrom: Spawn-A"), and present (0/1) for factions.
export interface Exclusion { zone: string; index?: number }

// Parse one FromList arg ELEMENT into exclusions. One element may pack several clauses joined by
// commas (e.g. Symphony writes "differentFrom: Spawn-A, differentFrom: Zone-2 "); split and trim.
export function parseDifferentFrom(element: string): Exclusion[] {
  return element.split(",").map((s) => s.trim()).filter(Boolean).flatMap((tok) => {
    const m = /^differentFrom:\s*(?:(\d+)\s+)?(.+?)\s*$/i.exec(tok);
    return m ? [{ zone: m[2], index: m[1] !== undefined ? Number(m[1]) : undefined }] : [];
  });
}

export function formatDifferentFrom(e: Exclusion): string {
  return `differentFrom: ${e.index !== undefined ? `${e.index} ` : ""}${e.zone}`;
}

// Split a FromList's args into plain names (biome names; empty for factions) and exclusions.
export function splitFromListArgs(args: string[] | undefined): { names: string[]; exclusions: Exclusion[] } {
  const names: string[] = []; const exclusions: Exclusion[] = [];
  for (const a of args ?? []) {
    if (/differentFrom:/i.test(a)) exclusions.push(...parseDifferentFrom(a));
    else if (a.trim()) names.push(a.trim());
  }
  return { names, exclusions };
}

export function buildFromList(names: string[], exclusions: Exclusion[]): Selector {
  return { type: "FromList", args: [...names, ...exclusions.map(formatDifferentFrom)] };
}

const toIndex = (a: string | undefined): number => (a !== undefined && /^\d+$/.test(a) ? Number(a) : 0);
const isNumeric = (a: string | undefined): boolean => a !== undefined && /^\d+$/.test(a);

// ---- Biome selector ------------------------------------------------------------------------------

export type BiomeMode = "any" | "list" | "followMainObject" | "sameAsZone" | "custom";
export interface BiomeState {
  mode: BiomeMode;
  biomes: string[];        // for "list"
  exclusions: Exclusion[]; // for "any"/"list"
  index: number;           // for "followMainObject"
  zone: string;            // for "sameAsZone"
  raw: Selector;           // preserved for "custom"
}

export function parseBiome(sel: Selector | undefined): BiomeState {
  const raw = sel ?? { type: "FromList", args: [] };
  const base: BiomeState = { mode: "any", biomes: [], exclusions: [], index: 0, zone: "", raw };
  switch (raw.type) {
    case "FromList": {
      const { names, exclusions } = splitFromListArgs(raw.args);
      return { ...base, mode: names.length ? "list" : "any", biomes: names, exclusions };
    }
    case "MatchMainObject":
      return { ...base, mode: "followMainObject", index: toIndex(raw.args?.[0]) };
    case "MatchZone":
      return { ...base, mode: "sameAsZone", zone: raw.args?.[0] ?? "" };
    case "Match":
      // For biomes, a bare (non-numeric) first arg is a zone name (behaves like MatchZone); a numeric
      // first arg follows a main object.
      return isNumeric(raw.args?.[0]) || raw.args?.[0] === undefined
        ? { ...base, mode: "followMainObject", index: toIndex(raw.args?.[0]) }
        : { ...base, mode: "sameAsZone", zone: raw.args![0] };
    default:
      return { ...base, mode: "custom" };
  }
}

export function buildBiome(st: BiomeState): Selector {
  switch (st.mode) {
    case "any": return buildFromList([], st.exclusions);
    case "list": return buildFromList(st.biomes, st.exclusions);
    case "followMainObject": return { type: "MatchMainObject", args: [String(st.index || 0)] };
    case "sameAsZone": return { type: "MatchZone", args: st.zone ? [st.zone] : [] };
    case "custom": return st.raw;
  }
}

// ---- Faction selector ----------------------------------------------------------------------------

export type FactionMode = "any" | "random" | "match" | "custom";
export interface FactionState {
  mode: FactionMode;
  exclusions: Exclusion[]; // for "any"
  index: number;           // for "match"
  zone: string;            // for "match" (optional target zone; "" = this zone)
  raw: Selector;
}

export function parseFaction(sel: Selector | undefined): FactionState {
  const raw = sel ?? { type: "FromList", args: [] };
  const base: FactionState = { mode: "any", exclusions: [], index: 0, zone: "", raw };
  switch (raw.type) {
    case "FromList":
      return { ...base, mode: "any", exclusions: splitFromListArgs(raw.args).exclusions };
    case "Random":
      return { ...base, mode: "random" };
    case "Match":
    case "MatchMainObject":
      return { ...base, mode: "match", index: toIndex(raw.args?.[0]), zone: raw.args?.[1] ?? "" };
    default:
      return { ...base, mode: "custom" };
  }
}

export function buildFaction(st: FactionState): Selector {
  switch (st.mode) {
    case "any": return buildFromList([], st.exclusions);
    case "random": return { type: "Random", args: [] };
    case "match": return { type: "Match", args: st.zone ? [String(st.index || 0), st.zone] : [String(st.index || 0)] };
    case "custom": return st.raw;
  }
}
