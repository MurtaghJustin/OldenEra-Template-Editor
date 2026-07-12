import type { Connection, Variant, Zone } from "./types";
import { buildZoneRoads } from "./roads";

// Copy/paste of a selected sub-graph (zones + the connections internal to them).

export interface ClipZone { zone: Zone; position?: { x: number; y: number } }
export interface Clipboard { zones: ClipZone[]; connections: Connection[] }

// Connections whose BOTH endpoints are in the selected set — the edges internal to a selection.
// Edges with one foot outside are dropped (standard copy behavior).
export function internalConnections(connections: Connection[], selected: Set<string>): Connection[] {
  return connections.filter((c) => selected.has(c.from) && selected.has(c.to));
}

// Build the paste: renamed zones (de-duped vs existing), reassigned player-spawn slots, offset
// positions, internal connections re-created between the copies (fresh names), and roads rebuilt
// from those new connections. Pure — returns what to add; the caller mutates the model.
export function buildPaste(clip: Clipboard, opts: {
  takenZoneNames: Set<string>;
  takenConnNames: Set<string>;
  usedSlots: Set<number>;
  offset: { x: number; y: number };
}): { zones: Zone[]; connections: Connection[]; positions: Record<string, { x: number; y: number }>; names: string[] } {
  const taken = new Set(opts.takenZoneNames);
  const uniqueZone = (base: string): string => {
    let n = `${base}-copy`;
    for (let i = 2; taken.has(n); i++) n = `${base}-copy-${i}`;
    taken.add(n); return n;
  };
  const slots = new Set(opts.usedSlots);
  const nextSlot = (): number | undefined => { for (let i = 1; i <= 8; i++) if (!slots.has(i)) { slots.add(i); return i; } return undefined; };

  const nameMap = new Map<string, string>();
  const zones: Zone[] = [];
  const positions: Record<string, { x: number; y: number }> = {};
  for (const { zone, position } of clip.zones) {
    const newName = uniqueZone(zone.name);
    nameMap.set(zone.name, newName);
    const clone = structuredClone(zone) as Zone;
    clone.name = newName;
    for (const mo of (clone.mainObjects ?? [])) {
      if (mo.type === "Spawn" && typeof mo.spawn === "string" && /^Player\d+$/.test(mo.spawn)) {
        const s = nextSlot(); if (s) mo.spawn = `Player${s}`;   // else leave it (validation flags dup)
      }
    }
    clone.roads = [];                                            // rebuilt below from the new connections
    zones.push(clone);
    if (position) positions[newName] = { x: position.x + opts.offset.x, y: position.y + opts.offset.y };
  }

  const connTaken = new Set(opts.takenConnNames);
  const uniqueConn = (base: string): string => { let n = base; for (let i = 2; connTaken.has(n); i++) n = `${base}-${i}`; connTaken.add(n); return n; };
  const connections: Connection[] = [];
  for (const c of clip.connections) {
    const from = nameMap.get(c.from), to = nameMap.get(c.to);
    if (!from || !to) continue;                                  // both endpoints must be in the copy
    const clone = structuredClone(c) as Connection;
    clone.from = from; clone.to = to;
    clone.name = uniqueConn(`${from}-${to}`);
    connections.push(clone);
  }

  // Re-derive roads for the copies from their new connections (names/zones changed).
  const variantLike = { zones, connections } as unknown as Variant;
  for (const z of zones) { const r = buildZoneRoads(z, variantLike); if (r.length) z.roads = r; }

  return { zones, connections, positions, names: zones.map((z) => z.name) };
}
