import type { Connection, TemplateRoot, Zone } from "./types";

export type TreasureTier = "low" | "medium" | "high";

export interface GraphNode {
  id: string;            // zone name
  zone: Zone;
  playerSlot?: number;   // 1..8 if a Spawn main object exists
  hasTown: boolean;      // City main object present
  tier: TreasureTier;
  x: number;             // filled by layout (Task 9); 0 here
  y: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  connection: Connection;
}

export interface Graph { nodes: GraphNode[]; edges: GraphEdge[]; }

export function treasureTierFromLayout(layout: string): TreasureTier {
  const l = layout.toLowerCase();
  if (l.includes("supertreasure") || l.includes("treasures") || l.includes("treasure")) return "high";
  if (l.includes("center")) return "medium";
  return "low";
}

function slotNumber(spawn?: string): number | undefined {
  if (!spawn) return undefined;
  const m = /^Player(\d)$/.exec(spawn);
  return m ? Number(m[1]) : undefined;
}

export function extractGraph(root: TemplateRoot, variantIndex: number): Graph {
  const variant = root.variants[variantIndex];
  const nodes: GraphNode[] = (variant.zones || []).map((zone) => {
    const spawn = (zone.mainObjects || []).find((m) => m.type === "Spawn");
    const hasTown = (zone.mainObjects || []).some((m) => m.type === "City");
    return {
      id: zone.name,
      zone,
      playerSlot: slotNumber(spawn?.spawn),
      hasTown,
      tier: treasureTierFromLayout(zone.layout),
      x: 0,
      y: 0,
    };
  });
  const edges: GraphEdge[] = (variant.connections || []).map((c, i) => ({
    id: c.name || `${c.from}-${c.to}-${i}`,
    from: c.from,
    to: c.to,
    connection: c,
  }));
  return { nodes, edges };
}

export function addZone(root: TemplateRoot, vi: number, zone: Zone): void {
  root.variants[vi].zones.push(zone);
}

export function removeZone(root: TemplateRoot, vi: number, name: string): void {
  const v = root.variants[vi];
  v.zones = v.zones.filter((z) => z.name !== name);
  v.connections = v.connections.filter((c) => c.from !== name && c.to !== name);
}

export function renameZone(root: TemplateRoot, vi: number, oldName: string, newName: string): void {
  const v = root.variants[vi];
  for (const z of v.zones) if (z.name === oldName) z.name = newName;
  for (const c of v.connections) {
    if (c.from === oldName) c.from = newName;
    if (c.to === oldName) c.to = newName;
  }
}

export function addConnection(root: TemplateRoot, vi: number, conn: Connection): void {
  const c: Connection = { name: conn.name ?? `${conn.from}-${conn.to}`, ...conn };
  root.variants[vi].connections.push(c);
}

export function removeConnection(root: TemplateRoot, vi: number, id: string): void {
  const v = root.variants[vi];
  v.connections = v.connections.filter((c, i) => (c.name || `${c.from}-${c.to}-${i}`) !== id);
}
