import { describe, it, expect } from "vitest";
import { autoLayout } from "./layout";
import { extractGraph } from "./graph";
import { parseTemplate } from "./parse";
import minimal from "../test-fixtures/minimal.rmg.json";

describe("autoLayout", () => {
  const root = parseTemplate(JSON.stringify(minimal));
  const g = autoLayout(extractGraph(root, 0), root.variants[0]);

  it("assigns finite, distinct positions", () => {
    const pts = g.nodes.map((n) => `${n.x},${n.y}`);
    expect(new Set(pts).size).toBe(g.nodes.length);
    for (const n of g.nodes) { expect(Number.isFinite(n.x)).toBe(true); expect(Number.isFinite(n.y)).toBe(true); }
  });

  it("places the highest-degree zone near the centroid", () => {
    const hub = g.nodes.find((n) => n.id === "Hub")!;
    const cx = g.nodes.reduce((s, n) => s + n.x, 0) / g.nodes.length;
    const cy = g.nodes.reduce((s, n) => s + n.y, 0) / g.nodes.length;
    const hubDist = Math.hypot(hub.x - cx, hub.y - cy);
    const spawnA = g.nodes.find((n) => n.id === "Spawn-A")!;
    expect(hubDist).toBeLessThan(Math.hypot(spawnA.x - cx, spawnA.y - cy));
  });

  it("is deterministic (same input -> same output)", () => {
    const g2 = autoLayout(extractGraph(root, 0), root.variants[0]);
    expect(g2.nodes.map((n) => [n.id, n.x, n.y])).toEqual(g.nodes.map((n) => [n.id, n.x, n.y]));
  });
});
