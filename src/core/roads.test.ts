import { describe, it, expect } from "vitest";
import { buildZoneRoads, generateRoads } from "./roads";
import type { TemplateRoot, Variant, Zone } from "./types";

const zone = (p: Partial<Zone> & { name: string }): Zone => ({ size: 1, layout: "l", ...p } as Zone);
const rc = (name: string, from: string, to: string) => ({ name, from, to, connectionType: "Direct" as const, road: true });

describe("buildZoneRoads", () => {
  const variant = (zones: Zone[], connections: ReturnType<typeof rc>[]): Variant => ({ zones, connections } as unknown as Variant);

  it("main object, no crossroads → MainObject 0 → each road-connection", () => {
    const z = zone({ name: "Spawn", mainObjects: [{ type: "Spawn" }] as unknown as Zone["mainObjects"] });
    const v = variant([z], [rc("c1", "Spawn", "Hub"), rc("c2", "Spawn", "Side")]);
    expect(buildZoneRoads(z, v)).toEqual([
      { type: "Stone", from: { type: "MainObject", args: ["0"] }, to: { type: "Connection", args: ["c1"] } },
      { type: "Stone", from: { type: "MainObject", args: ["0"] }, to: { type: "Connection", args: ["c2"] } },
    ]);
  });

  it("main object + crossroadsPosition 1 → MainObject → Crossroads, then Crossroads → each", () => {
    const z = zone({ name: "Town", crossroadsPosition: 1, mainObjects: [{ type: "City" }] as unknown as Zone["mainObjects"] });
    const v = variant([z], [rc("a", "Town", "X"), rc("b", "Town", "Y")]);
    expect(buildZoneRoads(z, v)).toEqual([
      { type: "Stone", from: { type: "MainObject", args: ["0"] }, to: { type: "Crossroads" } },
      { type: "Stone", from: { type: "Crossroads" }, to: { type: "Connection", args: ["a"] } },
      { type: "Stone", from: { type: "Crossroads" }, to: { type: "Connection", args: ["b"] } },
    ]);
  });

  it("no main object (junction) → chains the connections", () => {
    const z = zone({ name: "Hub" });
    const v = variant([z], [rc("c1", "A", "Hub"), rc("c2", "B", "Hub"), rc("c3", "C", "Hub")]);
    expect(buildZoneRoads(z, v)).toEqual([
      { type: "Stone", from: { type: "Connection", args: ["c1"] }, to: { type: "Connection", args: ["c2"] } },
      { type: "Stone", from: { type: "Connection", args: ["c2"] }, to: { type: "Connection", args: ["c3"] } },
    ]);
  });

  it("leaf (no main object, one connection) and no-road-connection zones → no segments", () => {
    const leaf = zone({ name: "Leaf" });
    expect(buildZoneRoads(leaf, variant([leaf], [rc("c", "Leaf", "Hub")]))).toEqual([]);
    const isolated = zone({ name: "Iso" });
    expect(buildZoneRoads(isolated, variant([isolated], [{ ...rc("c", "Iso", "Hub"), road: false }]))).toEqual([]);
  });
});

describe("generateRoads", () => {
  const root = (v: Variant): TemplateRoot => ({ name: "T", gameMode: "Classic", sizeX: 96, sizeZ: 96, gameRules: {}, variants: [v] } as unknown as TemplateRoot);

  it("derives roads for editor-created zones (not in the original) and preserves loaded ones", () => {
    // A hand-built shape (Spawn+Hub, no roads) plus a "pasted" copy that already has roads — the exact
    // mixed case that broke before: the copy having roads must not stop the originals being filled.
    const spawn = zone({ name: "Spawn", mainObjects: [{ type: "Spawn" }] as unknown as Zone["mainObjects"], roads: [] });
    const hub = zone({ name: "Hub", roads: [] });
    const copy = zone({ name: "Spawn-copy", mainObjects: [{ type: "Spawn" }] as unknown as Zone["mainObjects"],
      roads: [{ type: "Stone", from: { type: "MainObject", args: ["0"] }, to: { type: "Connection", args: ["c2"] } }] });
    const r = root({ zones: [spawn, hub, copy], connections: [rc("c1", "Spawn", "Hub"), rc("c2", "Spawn-copy", "Hub")] } as unknown as Variant);
    generateRoads(r, null);   // no original → every zone is editor-created
    expect((r.variants[0].zones[0].roads as unknown[]).length).toBe(1);   // Spawn → its connection (now filled)
    expect((r.variants[0].zones[1].roads as unknown[]).length).toBe(1);   // Hub → junction chains its two connections
    expect((r.variants[0].zones[2].roads as unknown[]).length).toBe(1);   // copy re-derived from c2
  });

  it("leaves a zone that exists in the loaded original untouched (lossless)", () => {
    const loadedRoads = [{ type: "Stone", from: { type: "MainObject", args: ["0"] }, to: { type: "Crossroads" } }];
    const loaded = zone({ name: "L", mainObjects: [{ type: "Spawn" }] as unknown as Zone["mainObjects"], roads: [] }); // in original, empty
    const withAuthored = zone({ name: "K", mainObjects: [{ type: "Spawn" }] as unknown as Zone["mainObjects"], roads: loadedRoads });
    const added = zone({ name: "New", mainObjects: [{ type: "Spawn" }] as unknown as Zone["mainObjects"], roads: [] });
    const r = root({ zones: [loaded, withAuthored, added], connections: [rc("c1", "L", "New"), rc("c2", "K", "New")] } as unknown as Variant);
    const original = root({ zones: [zone({ name: "L", roads: [] }), zone({ name: "K", roads: loadedRoads })], connections: [] } as unknown as Variant);
    generateRoads(r, original);
    expect(r.variants[0].zones[0].roads).toEqual([]);       // "L" in original with empty roads → preserved
    expect(r.variants[0].zones[1].roads).toBe(loadedRoads); // "K" in original with roads → preserved (same ref)
    expect((r.variants[0].zones[2].roads as unknown[]).length).toBe(2); // "New" (added, 2 connections) → derived
  });
});
