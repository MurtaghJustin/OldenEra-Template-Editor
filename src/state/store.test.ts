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

  it("serializeForSave applies round-trip merge", () => {
    useEditorStore.getState().addZoneOfType("Z", "side", {});
    const text = useEditorStore.getState().serializeForSave();
    expect(text).toContain("\"Z\"");
    expect(text.endsWith("\n")).toBe(true);
  });
});
