import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "./store";
import minimal from "../test-fixtures/minimal.rmg.json";

describe("store", () => {
  beforeEach(() => useEditorStore.getState().loadFromText(JSON.stringify(minimal), "Minimal.rmg.json"));

  it("loads a template and clears the dirty flag", () => {
    const s = useEditorStore.getState();
    expect(s.fileName).toBe("Minimal.rmg.json");
    expect(s.root?.name).toBe("Minimal");
    expect(s.dirty).toBe(false);
    expect(s.graph?.nodes.length).toBe(3);
  });

  it("selecting a node updates selection", () => {
    useEditorStore.getState().select({ kind: "zone", id: "Hub" });
    expect(useEditorStore.getState().selection).toEqual({ kind: "zone", id: "Hub" });
  });

  it("adding a zone marks dirty and refreshes the graph", () => {
    useEditorStore.getState().addZoneOfType("Side-A1", "side", {});
    const s = useEditorStore.getState();
    expect(s.dirty).toBe(true);
    expect(s.graph?.nodes.some((n) => n.id === "Side-A1")).toBe(true);
  });

  it("adding a node type auto-defines its zone layout (so the generator can't be left dangling)", () => {
    useEditorStore.getState().newTemplate(); // blank template: zoneLayouts is empty
    useEditorStore.getState().addZoneOfType("S", "side", {}); // the "side" type uses zone_layout_sides
    const defs = useEditorStore.getState().root!.zoneLayouts as { name: string; obstaclesFill?: number }[];
    const sides = defs.find((z) => z.name === "zone_layout_sides")!;
    expect(sides).toBeTruthy();
    expect(typeof sides.obstaclesFill).toBe("number"); // seeded with real authentic values, not empty
    // applying a type via updateZone also seeds its layout
    useEditorStore.getState().updateZone("S", { layout: "zone_layout_treasures" });
    expect((useEditorStore.getState().root!.zoneLayouts as { name: string }[]).map((z) => z.name)).toContain("zone_layout_treasures");
  });

  it("a new player spawn defaults to the next free player slot", () => {
    // The minimal fixture already has Player1 and Player2; the next spawn should be Player3.
    useEditorStore.getState().addZoneOfType("Spawn-C", "player_spawn", {});
    const node = useEditorStore.getState().graph!.nodes.find((n) => n.id === "Spawn-C");
    expect(node?.playerSlot).toBe(3);
    useEditorStore.getState().addZoneOfType("Spawn-D", "player_spawn", {});
    expect(useEditorStore.getState().graph!.nodes.find((n) => n.id === "Spawn-D")?.playerSlot).toBe(4);
  });

  it("newTemplate opens a blank template you can add zones to", () => {
    useEditorStore.getState().newTemplate();
    const s = useEditorStore.getState();
    expect(s.root).not.toBeNull();
    expect(s.graph?.nodes.length).toBe(0);
    useEditorStore.getState().addZoneOfType("Spawn-A", "player_spawn", {}, { x: 50, y: 50 });
    const after = useEditorStore.getState();
    expect(after.graph?.nodes.some((n) => n.id === "Spawn-A")).toBe(true);
    expect(after.positions["Spawn-A"]).toEqual({ x: 50, y: 50 });
  });

  it("creates, edits, and removes a custom node type and persists it to localStorage", () => {
    localStorage.clear();
    const s = useEditorStore.getState();
    const id = s.createCustomType();
    expect(useEditorStore.getState().nodeTypes.some((t) => t.id === id && !t.builtin)).toBe(true);
    s.updateCustomType(id, { label: "My Town Type" });
    expect(useEditorStore.getState().nodeTypes.find((t) => t.id === id)!.label).toBe("My Town Type");
    expect(JSON.parse(localStorage.getItem("rmg.nodeTypes.custom")!).some((t: { id: string }) => t.id === id)).toBe(true);
    s.removeCustomType(id);
    expect(useEditorStore.getState().nodeTypes.some((t) => t.id === id)).toBe(false);
    localStorage.clear();
  });

  it("inserting a node on a connection splits it and copies the guard to both halves", () => {
    const s = useEditorStore.getState();
    s.addZoneOfType("Mid", "side", {}); // an unconnected zone
    s.insertNodeOnConnection("Mid", "Spawn-A-Hub"); // minimal has Spawn-A↔Hub @ guardValue 3000
    const conns = useEditorStore.getState().root!.variants[0].connections;
    const pair = (a: string, b: string) => conns.find((c) => (c.from === a && c.to === b) || (c.from === b && c.to === a));
    expect(pair("Spawn-A", "Hub")).toBeUndefined();             // original split out
    expect(pair("Spawn-A", "Mid")).toBeTruthy();                // A↔Mid
    expect(pair("Mid", "Hub")).toBeTruthy();                    // Mid↔Hub
    expect(pair("Spawn-A", "Mid")!.guardValue).toBe(3000);      // guard copied to both halves
    expect(pair("Mid", "Hub")!.guardValue).toBe(3000);
  });

  it("makes a custom type from an existing zone (settings copied, roads cleared, persisted)", () => {
    localStorage.clear();
    const s = useEditorStore.getState();
    // Give Hub a distinctive setting + some road wiring to confirm copy/clear behavior.
    s.updateZone("Hub", { size: 2.5, roads: [{ from: 1 }] } as never);
    const id = s.createTypeFromZone("Hub");
    const type = useEditorStore.getState().nodeTypes.find((t) => t.id === id)!;
    expect(type.builtin).toBe(false);
    expect(type.label).toBe("Hub");
    expect((type.zone as { size: number }).size).toBe(2.5);   // settings carried over
    expect((type.zone as { roads: unknown[] }).roads).toEqual([]); // per-zone wiring cleared
    expect("name" in type.zone).toBe(false);
    expect(JSON.parse(localStorage.getItem("rmg.nodeTypes.custom")!).some((t: { id: string }) => t.id === id)).toBe(true);
    localStorage.clear();
  });

  it("upserts, renames and removes content definitions; opens/closes the drawer", () => {
    const s = useEditorStore.getState();
    s.upsertContentDef("pools", { name: "my_pool", groups: [] });
    expect(useEditorStore.getState().root!.contentPools).toEqual([{ name: "my_pool", groups: [] }]);
    // rename via originalName: old entry dropped, not duplicated
    s.upsertContentDef("pools", { name: "renamed_pool", groups: [] }, "my_pool");
    expect((useEditorStore.getState().root!.contentPools as { name: string }[]).map((d) => d.name)).toEqual(["renamed_pool"]);
    s.openContentDrawer("pools", "renamed_pool");
    expect(useEditorStore.getState().contentDrawer).toEqual({ kind: "pools", itemName: "renamed_pool" });
    s.removeContentDef("pools", "renamed_pool");
    expect(useEditorStore.getState().root!.contentPools).toEqual([]);
    s.closeContentDrawer();
    expect(useEditorStore.getState().contentDrawer).toBeNull();
  });

  it("renaming a content pool updates every zone that referenced it", () => {
    const s = useEditorStore.getState();
    s.upsertContentDef("pools", { name: "my_pool", groups: [] });
    // Point two zones at the pool across the guarded / unguarded / resources fields.
    const zones = () => useEditorStore.getState().root!.variants[0].zones;
    const hub = zones().find((z) => z.name === "Hub")!;
    hub.guardedContentPool = ["my_pool"];
    hub.unguardedContentPool = ["classic_template_pool_random_unguarded_t4_base", "my_pool"];
    zones().find((z) => z.name === "Spawn-A")!.resourcesContentPool = ["my_pool"];
    // Rename it.
    s.upsertContentDef("pools", { name: "renamed_pool", groups: [] }, "my_pool");
    // No zone should still point at the old name; each should now reference the new one.
    const after = zones();
    const hubAfter = after.find((z) => z.name === "Hub")!;
    expect(hubAfter.guardedContentPool).toEqual(["renamed_pool"]);
    expect(hubAfter.unguardedContentPool).toEqual(["classic_template_pool_random_unguarded_t4_base", "renamed_pool"]);
    expect(after.find((z) => z.name === "Spawn-A")!.resourcesContentPool).toEqual(["renamed_pool"]);
    // Nothing anywhere still references the stale name.
    const stillStale = after.some((z) =>
      [z.guardedContentPool, z.unguardedContentPool, z.resourcesContentPool].some((f) => (f ?? []).includes("my_pool")));
    expect(stillStale).toBe(false);
  });

  it("renaming a content list updates includeLists inside content pools that reference it", () => {
    const s = useEditorStore.getState();
    s.upsertContentDef("lists", { name: "my_list", content: [] });
    s.upsertContentDef("pools", { name: "p", groups: [{ weight: 1, includeLists: ["my_list"], content: [] }] });
    s.upsertContentDef("lists", { name: "renamed_list", content: [] }, "my_list");
    const pool = (useEditorStore.getState().root!.contentPools as { name: string; groups: { includeLists?: string[] }[] }[]).find((d) => d.name === "p")!;
    expect(pool.groups[0].includeLists).toEqual(["renamed_list"]);
  });

  it("serializeForSave applies round-trip merge", () => {
    useEditorStore.getState().addZoneOfType("Z", "side", {});
    const text = useEditorStore.getState().serializeForSave();
    expect(text).toContain("\"Z\"");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("serializeForSave auto-authors roads for an unrouted (editor-made) template", () => {
    // minimal's zones all have roads: [] and its connections are road:true — so it's "unrouted".
    const out = JSON.parse(useEditorStore.getState().serializeForSave());
    const spawnA = out.variants[0].zones.find((z: { name: string }) => z.name === "Spawn-A");
    // Spawn-A has a Spawn main object and the road-connection "Spawn-A-Hub" → MainObject 0 → that connection.
    expect(spawnA.roads).toEqual([
      { type: "Stone", from: { type: "MainObject", args: ["0"] }, to: { type: "Connection", args: ["Spawn-A-Hub"] } },
    ]);
  });

  it("serializeForSave strips empty-string sids (which would crash generation)", () => {
    // A list-only mandatory item authored with sid:"" — the exact shape that broke the Warlords map.
    useEditorStore.getState().upsertContentDef("mandatory", {
      name: "mg", content: [{ sid: "", includeLists: ["some_list"], isGuarded: false }],
    });
    const out = JSON.parse(useEditorStore.getState().serializeForSave());
    const item = (out.mandatoryContent as { name: string; content: Record<string, unknown>[] }[]).find((d) => d.name === "mg")!.content[0];
    expect("sid" in item).toBe(false);                 // empty sid dropped
    expect(item.includeLists).toEqual(["some_list"]);  // rest preserved
    // The in-memory working model is untouched (normalization happens only on the serialized copy).
    const live = (useEditorStore.getState().root!.mandatoryContent as { name: string; content: { sid?: string }[] }[]).find((d) => d.name === "mg")!;
    expect(live.content[0].sid).toBe("");
  });
});
