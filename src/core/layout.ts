import type { Graph } from "./graph";
import type { Variant } from "./types";

const RING_STEP = 220;
const CENTER = { x: 600, y: 600 };

function degrees(g: Graph): Map<string, number> {
  const d = new Map<string, number>();
  for (const n of g.nodes) d.set(n.id, 0);
  for (const e of g.edges) {
    d.set(e.from, (d.get(e.from) ?? 0) + 1);
    d.set(e.to, (d.get(e.to) ?? 0) + 1);
  }
  return d;
}

// BFS distance (in edges) from the set of spawn nodes.
function distanceFromSpawns(g: Graph): Map<string, number> {
  const adj = new Map<string, string[]>();
  for (const n of g.nodes) adj.set(n.id, []);
  for (const e of g.edges) { adj.get(e.from)?.push(e.to); adj.get(e.to)?.push(e.from); }
  const dist = new Map<string, number>();
  const queue: string[] = [];
  for (const n of g.nodes) if (n.playerSlot !== undefined) { dist.set(n.id, 0); queue.push(n.id); }
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nb of adj.get(cur) ?? []) if (!dist.has(nb)) { dist.set(nb, (dist.get(cur) ?? 0) + 1); queue.push(nb); }
  }
  let maxD = 0;
  for (const v of dist.values()) maxD = Math.max(maxD, v);
  for (const n of g.nodes) if (!dist.has(n.id)) dist.set(n.id, maxD + 1); // disconnected -> outermost
  return dist;
}

export function autoLayout(g: Graph, variant: Variant): Graph {
  if (g.nodes.length === 0) return g;
  const deg = degrees(g);
  const dist = distanceFromSpawns(g);
  const maxD = Math.max(...g.nodes.map((n) => dist.get(n.id) ?? 0), 0);

  // Hub = highest degree (ties broken by name for determinism); placed at center.
  const hub = [...g.nodes].sort((a, b) =>
    (deg.get(b.id)! - deg.get(a.id)!) || a.id.localeCompare(b.id))[0];

  const zeroZone = (variant.orientation as Record<string, unknown> | undefined)?.zeroAngleZone as string | undefined;

  // Group nodes by ring (distance), each ring evenly spaced on a circle.
  const rings = new Map<number, typeof g.nodes>();
  for (const n of g.nodes) {
    if (n.id === hub.id) continue;
    const d = dist.get(n.id) ?? 0;
    if (!rings.has(d)) rings.set(d, []);
    rings.get(d)!.push(n);
  }

  // Hub at center.
  hub.x = CENTER.x; hub.y = CENTER.y;

  for (const [d, members] of [...rings.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = [...members].sort((a, b) => {
      const sa = a.playerSlot ?? 99, sb = b.playerSlot ?? 99;
      return sa - sb || a.id.localeCompare(b.id);
    });
    // Anchor angle so zeroAngleZone (or slot 1) sits at the top (-90deg).
    const anchorIdx = sorted.findIndex((n) => n.id === zeroZone);
    const baseIdx = anchorIdx >= 0 ? anchorIdx : 0;
    const radius = RING_STEP * (maxD === 0 ? 1 : d / 1 + 0.5);
    const count = sorted.length;
    sorted.forEach((n, i) => {
      const k = (i - baseIdx + count) % count;
      const angle = -Math.PI / 2 + (2 * Math.PI * k) / count;
      n.x = CENTER.x + radius * Math.cos(angle);
      n.y = CENTER.y + radius * Math.sin(angle);
    });
  }
  return g;
}
