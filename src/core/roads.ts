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

// (Re)derive `roads[]` for the zones this editor created, leaving loaded zones exactly as they were.
// A zone present in the loaded `original` is preserved (keeps hand-authored/official routing and a
// lossless round-trip); a zone NOT in the original is editor-created, so its roads are derived from
// the current connection graph on every save (fresh, never stale). Deciding per zone — rather than
// per whole variant — is what makes a mixed template correct: e.g. a shape built by hand plus a
// pasted copy still gets roads on the hand-built zones (the earlier per-variant check skipped them
// once the paste had added any roads). Mutates `root` in place.
export function generateRoads(root: TemplateRoot, original: TemplateRoot | null): void {
  (root.variants ?? []).forEach((v, vi) => {
    const loaded = new Set(((original?.variants?.[vi]?.zones ?? []) as Zone[]).map((z) => z.name));
    for (const z of (v.zones ?? []) as Zone[]) {
      if (loaded.has(z.name)) continue;        // loaded zone → preserve exactly
      z.roads = buildZoneRoads(z, v);           // editor-created zone → derive from the current graph
    }
  });
}
