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

  it("serializeForSave applies round-trip merge", () => {
    useEditorStore.getState().addZoneOfType("Z", "side", {});
    const text = useEditorStore.getState().serializeForSave();
    expect(text).toContain("\"Z\"");
    expect(text.endsWith("\n")).toBe(true);
  });
});
