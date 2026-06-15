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

  it("serializeForSave applies round-trip merge", () => {
    useEditorStore.getState().addZoneOfType("Z", "side", {});
    const text = useEditorStore.getState().serializeForSave();
    expect(text).toContain("\"Z\"");
    expect(text.endsWith("\n")).toBe(true);
  });
});
