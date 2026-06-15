import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Inspector } from "./Inspector";
import { useEditorStore } from "../../state/store";
import minimal from "../../test-fixtures/minimal.rmg.json";

describe("Inspector", () => {
  beforeEach(() => useEditorStore.getState().loadFromText(JSON.stringify(minimal), "M.rmg.json"));

  it("shows the zone panel when a zone is selected", () => {
    useEditorStore.getState().select({ kind: "zone", id: "Hub" });
    render(<Inspector />);
    expect(screen.getByText("Zone")).toBeInTheDocument();
  });

  it("shows the connection panel and edits guardValue", () => {
    useEditorStore.getState().select({ kind: "connection", id: "Spawn-A-Hub" });
    render(<Inspector />);
    fireEvent.change(screen.getByLabelText("Guard value"), { target: { value: "9999" } });
    const c = useEditorStore.getState().root!.variants[0].connections.find((cc) => cc.name === "Spawn-A-Hub")!;
    expect(c.guardValue).toBe(9999);
  });

  it("edits game rules hero counts", () => {
    useEditorStore.getState().select({ kind: "gameRules" });
    render(<Inspector />);
    fireEvent.change(screen.getByLabelText("Hero count max"), { target: { value: "6" } });
    expect(useEditorStore.getState().root!.gameRules.heroCountMax).toBe(6);
  });

  it("adds a banned spell", () => {
    useEditorStore.getState().select({ kind: "globalBans" });
    render(<Inspector />);
    fireEvent.change(screen.getByLabelText("Add banned spell"), { target: { value: "neutral_magic_town_portal" } });
    fireEvent.click(screen.getByText("Add spell"));
    expect(useEditorStore.getState().root!.globalBans!.magics).toContain("neutral_magic_town_portal");
  });
});
