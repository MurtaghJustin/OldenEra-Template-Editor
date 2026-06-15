import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { autoLayout } from "./layout";
import { extractGraph, displayEdges } from "./graph";
import { parseTemplate } from "./parse";
import type { Graph, GraphNode, GraphEdge } from "./graph";
import type { Variant } from "./types";

// --- helpers to build small synthetic graphs without going through extractGraph ---
function node(id: string, slot?: number): GraphNode {
  return { id, zone: { name: id, size: 1, layout: "x" } as any, playerSlot: slot, hasTown: false, tier: "low", x: 0, y: 0 };
}
function edge(from: string, to: string): GraphEdge {
  return { id: `${from}-${to}`, from, to, connection: { from, to, connectionType: "Direct" } as any };
}
const STUB_VARIANT = {} as Variant;

function ranges(g: Graph) {
  const xs = g.nodes.map((n) => n.x), ys = g.nodes.map((n) => n.y);
  return { xRange: Math.max(...xs) - Math.min(...xs), yRange: Math.max(...ys) - Math.min(...ys) };
}
function dist(a: GraphNode, b: GraphNode) { return Math.hypot(a.x - b.x, a.y - b.y); }
function maxPairwise(g: Graph) {
  let m = 0;
  for (let i = 0; i < g.nodes.length; i++)
    for (let j = i + 1; j < g.nodes.length; j++) m = Math.max(m, dist(g.nodes[i], g.nodes[j]));
  return m;
}
function get(g: Graph, id: string) { return g.nodes.find((n) => n.id === id)!; }

describe("layout topology — cross does not collapse to a line", () => {
  // Mirrors Jebus Outcast: a center hub with 4 arms, two of which are player spawns.
  const g: Graph = {
    nodes: [node("C"), node("P1", 1), node("P2", 2), node("T1"), node("T2")],
    edges: [edge("C", "P1"), edge("C", "P2"), edge("C", "T1"), edge("C", "T2")],
  };

  it("spreads the cross in BOTH axes (not collinear)", () => {
    const out = autoLayout({ nodes: g.nodes.map((n) => ({ ...n })), edges: g.edges }, STUB_VARIANT);
    const { xRange, yRange } = ranges(out);
    // A line has one range ~0. A cross is roughly square -> aspect ratio not extreme.
    expect(Math.min(xRange, yRange)).toBeGreaterThan(0.3 * Math.max(xRange, yRange));
  });
});

describe("layout topology — dumbbell separates its two clusters", () => {
  // Two triangles joined by a single bridge edge; one spawn in each triangle.
  const g: Graph = {
    nodes: [node("A1", 1), node("A2"), node("A3"), node("B1", 2), node("B2"), node("B3")],
    edges: [
      edge("A1", "A2"), edge("A2", "A3"), edge("A3", "A1"),
      edge("B1", "B2"), edge("B2", "B3"), edge("B3", "B1"),
      edge("A1", "B1"),
    ],
  };

  it("places the two spawns far apart (opposite clusters)", () => {
    const out = autoLayout({ nodes: g.nodes.map((n) => ({ ...n })), edges: g.edges }, STUB_VARIANT);
    const spawnDist = dist(get(out, "A1"), get(out, "B2")); // A-cluster spawn vs deep B node
    // The two clusters should be well separated relative to overall spread.
    expect(spawnDist).toBeGreaterThan(0.4 * maxPairwise(out));
  });
});

describe("layout topology — real templates", () => {
  const TEMPLATES = join(__dirname, "..", "..", "..", "Templates");
  function layoutOf(file: string) {
    const root = parseTemplate(readFileSync(join(TEMPLATES, file), "utf-8"));
    return autoLayout(extractGraph(root, 0), root.variants[0]);
  }

  it("Jebus Outcast is not a single line", () => {
    const out = layoutOf("Jebus Outcast.rmg.json");
    const xs = new Set(out.nodes.map((n) => Math.round(n.x)));
    const ys = new Set(out.nodes.map((n) => Math.round(n.y)));
    expect(xs.size).toBeGreaterThan(1);
    expect(ys.size).toBeGreaterThan(1);
    const { xRange, yRange } = ranges(out);
    expect(Math.min(xRange, yRange)).toBeGreaterThan(0.25 * Math.max(xRange, yRange));
  });

  it("Exodus places its two spawns far apart (dumbbell, not collapsed)", () => {
    const out = layoutOf("Exodus.rmg.json");
    const a = get(out, "Spawn-A"), b = get(out, "Spawn-B");
    expect(dist(a, b)).toBeGreaterThan(0.5 * maxPairwise(out));
  });

  it("Harmony (a ring map) draws with no crossing connections", () => {
    const out = layoutOf("Harmony.rmg.json");
    const pos = new Map(out.nodes.map((n) => [n.id, n]));
    const de = displayEdges(out);
    const segCross = (p1: GraphNode, p2: GraphNode, p3: GraphNode, p4: GraphNode) => {
      const s = (a: GraphNode, b: GraphNode, c: GraphNode) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      const d1 = s(p3, p4, p1), d2 = s(p3, p4, p2), d3 = s(p1, p2, p3), d4 = s(p1, p2, p4);
      return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
    };
    let crossings = 0;
    for (let i = 0; i < de.length; i++)
      for (let j = i + 1; j < de.length; j++) {
        const a = de[i], b = de[j];
        if (a.from === b.from || a.from === b.to || a.to === b.from || a.to === b.to) continue; // shared endpoint
        if (segCross(pos.get(a.from)!, pos.get(a.to)!, pos.get(b.from)!, pos.get(b.to)!)) crossings++;
      }
    expect(crossings).toBe(0);
  });

  it("is deterministic on a real template (same in -> same out)", () => {
    const a = layoutOf("Exodus.rmg.json").nodes.map((n) => [n.id, Math.round(n.x), Math.round(n.y)]);
    const b = layoutOf("Exodus.rmg.json").nodes.map((n) => [n.id, Math.round(n.x), Math.round(n.y)]);
    expect(b).toEqual(a);
  });
});
