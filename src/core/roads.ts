import type { TemplateRoot, Zone, Variant } from "./types";

// Auto-authoring of a zone's `roads[]` — the per-zone road segments that actually lay out roads on
// the map. Connection `road: true` marks that a road should exist; the PATH lives here (from the
// town / crossroads to each connection entry). This editor never used to author them, so its
// templates generated with no roads. Patterns mirror official templates:
//   - zone with a main object, no crossroads  → MainObject 0 → each road-connection
//   - zone with a main object + crossroadsPosition 1 → MainObject 0 → Crossroads, then Crossroads → each
//   - zone with no main object (junction)      → chain its connections (Connection → Connection)
//   - leaf (single connection, no main object) → nothing (the road just enters)

interface RoadEndpoint { type: "MainObject" | "Connection" | "Crossroads"; args?: string[] }
export interface Road { type: "Stone" | "Dirt"; from: RoadEndpoint; to: RoadEndpoint }

const seg = (from: RoadEndpoint, to: RoadEndpoint): Road => ({ type: "Stone", from, to });
const mainObj = (i: number): RoadEndpoint => ({ type: "MainObject", args: [String(i)] });
const crossroads = (): RoadEndpoint => ({ type: "Crossroads" });
const conn = (name: string): RoadEndpoint => ({ type: "Connection", args: [name] });

// The named, road-carrying connections touching this zone (deduped, in variant order).
function roadConnectionNames(zone: Zone, variant: Variant): string[] {
  const names: string[] = [];
  for (const c of variant.connections ?? []) {
    if (c.road && (c.from === zone.name || c.to === zone.name) && typeof c.name === "string" && c.name && !names.includes(c.name))
      names.push(c.name);
  }
  return names;
}

export function buildZoneRoads(zone: Zone, variant: Variant): Road[] {
  const names = roadConnectionNames(zone, variant);
  if (names.length === 0) return [];
  const hasMain = ((zone.mainObjects as unknown[] | undefined)?.length ?? 0) > 0;
  const roads: Road[] = [];
  if (hasMain) {
    // A crossroads only anchors to a main object; without one it's invalid (see validate.ts).
    if (zone.crossroadsPosition === 1) {
      roads.push(seg(mainObj(0), crossroads()));
      for (const n of names) roads.push(seg(crossroads(), conn(n)));
    } else {
      for (const n of names) roads.push(seg(mainObj(0), conn(n)));
    }
  } else {
    // No main object: chain the connection entries through the zone. A single connection (a leaf)
    // needs no segment — the road simply enters.
    for (let i = 0; i < names.length - 1; i++) roads.push(seg(conn(names[i]), conn(names[i + 1])));
  }
  return roads;
}

// Derive `roads[]` for every zone in any variant that currently has NO road segments at all — i.e.
// an editor-made / unrouted template. A variant that already has roads (every official template) is
// left completely untouched, preserving hand-authored routing and lossless round-trips. Only assigns
// when a zone actually yields segments, so a road-less variant (no road-connections) is unchanged.
// Mutates `root` in place.
export function generateRoads(root: TemplateRoot): void {
  for (const v of root.variants ?? []) {
    const hasAnyRoads = (v.zones ?? []).some((z) => Array.isArray((z as Zone).roads) && ((z as Zone).roads as unknown[]).length > 0);
    if (hasAnyRoads) continue;
    for (const z of v.zones ?? []) {
      const roads = buildZoneRoads(z, v);
      if (roads.length) (z as Zone).roads = roads;
    }
  }
}
