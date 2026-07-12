import { describe, it, expect } from "vitest";
import { internalConnections, buildPaste, type Clipboard } from "./subgraph";
import type { Connection, Zone } from "./types";

const zone = (p: Partial<Zone> & { name: string }): Zone => ({ size: 1, layout: "l", ...p } as Zone);
const conn = (name: string, from: string, to: string): Connection => ({ name, from, to, connectionType: "Direct", road: true });

describe("internalConnections", () => {
  it("keeps only connections with both endpoints selected", () => {
    const conns = [conn("a", "X", "Y"), conn("b", "Y", "Z"), conn("c", "X", "Out")];
    const kept = internalConnections(conns, new Set(["X", "Y", "Z"]));
    expect(kept.map((c) => c.name)).toEqual(["a", "b"]);            // "c" touches non-selected "Out"
  });
});

describe("buildPaste", () => {
  const clip: Clipboard = {
    zones: [
      { zone: zone({ name: "crossroads-1", mainObjects: [{ type: "City" }] as unknown as Zone["mainObjects"] }), position: { x: 100, y: 100 } },
      { zone: zone({ name: "player_spawn-1", mainObjects: [{ type: "Spawn", spawn: "Player1" }] as unknown as Zone["mainObjects"] }), position: { x: 200, y: 100 } },
    ],
    connections: [conn("player_spawn-1-crossroads-1", "player_spawn-1", "crossroads-1")],
  };

  it("de-dupes names, reassigns spawn slots, offsets positions, and remaps internal connections", () => {
    const out = buildPaste(clip, {
      takenZoneNames: new Set(["crossroads-1", "player_spawn-1"]),
      takenConnNames: new Set(["player_spawn-1-crossroads-1"]),
      usedSlots: new Set([1]),                        // Player1 already in use
      offset: { x: 64, y: 64 },
    });
    expect(out.names).toEqual(["crossroads-1-copy", "player_spawn-1-copy"]);
    // spawn reassigned to the next free slot (2)
    const spawnZone = out.zones.find((z) => z.name === "player_spawn-1-copy")!;
    expect((spawnZone.mainObjects as { type: string; spawn?: string }[])[0].spawn).toBe("Player2");
    // internal connection re-created between the copies, uniquely named
    expect(out.connections).toHaveLength(1);
    expect(out.connections[0]).toMatchObject({ from: "player_spawn-1-copy", to: "crossroads-1-copy" });
    expect(out.connections[0].name).not.toBe("player_spawn-1-crossroads-1");
    // positions offset from the originals
    expect(out.positions["crossroads-1-copy"]).toEqual({ x: 164, y: 164 });
    // roads re-derived for the copies from the new connection (town → its connection)
    const spawnRoads = spawnZone.roads as { from: { type: string }; to: { type: string; args?: string[] } }[];
    expect(spawnRoads[0]).toMatchObject({ from: { type: "MainObject", args: ["0"] }, to: { type: "Connection" } });
    expect(spawnRoads[0].to.args![0]).toBe(out.connections[0].name);
  });

  it("bumps the -copy suffix when the -copy name is already taken", () => {
    const out = buildPaste({ zones: [{ zone: zone({ name: "side-1" }) }], connections: [] }, {
      takenZoneNames: new Set(["side-1", "side-1-copy"]),
      takenConnNames: new Set(), usedSlots: new Set(), offset: { x: 0, y: 0 },
    });
    expect(out.names).toEqual(["side-1-copy-2"]);
  });
});
