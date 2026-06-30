import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { displayEdges, extractGraph, removeConnectionsForPair, connectionsForPair, type Graph, type GraphEdge } from "./graph";
import { parseTemplate } from "./parse";

function e(from: string, to: string, type: string, name?: string): GraphEdge {
  return { id: name ?? `${from}-${to}-${type}`, from, to, connection: { from, to, connectionType: type, name } as any };
}

describe("displayEdges", () => {
  it("collapses duplicate road connections to one line per pair and drops Proximity", () => {
    const g: Graph = {
      nodes: [],
      edges: [
        e("Center", "Spawn-A", "Direct", "main"),
        e("Center", "Spawn-A", "Direct"),
        e("Center", "Spawn-A", "Direct"),
        e("Center", "Spawn-B", "Direct"),
        e("Spawn-A", "Spawn-B", "Proximity"),
        e("Center", "Side-C", "Proximity"),
      ],
    };
    const out = displayEdges(g);
    // 2 road pairs (Center-Spawn-A, Center-Spawn-B); the 3 duplicates collapse to 1; Proximity dropped.
    expect(out).toHaveLength(2);
    const pairs = out.map((x) => [x.from, x.to].sort().join("-")).sort();
    expect(pairs).toEqual(["Center-Spawn-A", "Center-Spawn-B"]);
    // ...but each edge reports how many connections it represents (for the count badge).
    const count = Object.fromEntries(out.map((x) => [[x.from, x.to].sort().join("-"), x.count]));
    expect(count["Center-Spawn-A"]).toBe(3);
    expect(count["Center-Spawn-B"]).toBe(1);
  });

  it("prefers a Portal connection as the representative for a pair", () => {
    const g: Graph = {
      nodes: [],
      edges: [e("A", "B", "Direct"), e("A", "B", "Portal", "portal-rep")],
    };
    const out = displayEdges(g);
    expect(out).toHaveLength(1);
    expect(out[0].connection.connectionType).toBe("Portal");
    expect(out[0].count).toBe(2); // Direct + Portal both counted toward the pair
  });

  it("Jebus Outcast renders exactly 4 connections (the cross)", () => {
    const root = parseTemplate(readFileSync(join(__dirname, "..", "..", "..", "Templates", "Jebus Outcast.rmg.json"), "utf-8"));
    const out = displayEdges(extractGraph(root, 0));
    expect(out).toHaveLength(4);
  });
});

describe("connection pair operations", () => {
  it("removeConnectionsForPair removes ALL duplicate connections of a pair", () => {
    const root = parseTemplate(readFileSync(join(__dirname, "..", "..", "..", "Templates", "Jebus Outcast.rmg.json"), "utf-8"));
    const before = root.variants[0].connections.length;
    // The first connection is the named Center-A-Main (Center <-> Spawn-A).
    const dupCount = connectionsForPair(root, 0, "Center-A-Main").length;
    expect(dupCount).toBeGreaterThan(1); // there are several duplicates
    removeConnectionsForPair(root, 0, "Center-A-Main");
    expect(root.variants[0].connections.length).toBe(before - dupCount);
    expect(connectionsForPair(root, 0, "Center-A-Main")).toHaveLength(0);
  });
});
