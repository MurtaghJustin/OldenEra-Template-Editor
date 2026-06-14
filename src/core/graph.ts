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
