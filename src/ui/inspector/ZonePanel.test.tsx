import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ZonePanel } from "./ZonePanel";
import { useEditorStore } from "../../state/store";
import { catalogs } from "../../core/catalogs";
import minimal from "../../test-fixtures/minimal.rmg.json";

describe("ZonePanel", () => {
  beforeEach(() => useEditorStore.getState().loadFromText(JSON.stringify(minimal), "M.rmg.json"));

  it("edits zone size through the store", () => {
    render(<ZonePanel zoneName="Hub" />);
    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "3" } });
    const z = useEditorStore.getState().root!.variants[0].zones.find((zz) => zz.name === "Hub")!;
    expect(z.size).toBe(3);
    expect(useEditorStore.getState().dirty).toBe(true);
  });

  it("renames a zone", () => {
    render(<ZonePanel zoneName="Hub" />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Center" } });
    fireEvent.click(screen.getByText("Apply name"));
    expect(useEditorStore.getState().root!.variants[0].zones.some((z) => z.name === "Center")).toBe(true);
  });

  it("duplicates a zone with a unique name and selects the copy", () => {
    render(<ZonePanel zoneName="Hub" />);
    fireEvent.click(screen.getByText("Duplicate zone"));
    const names = useEditorStore.getState().root!.variants[0].zones.map((z) => z.name);
    expect(names).toContain("Hub-copy");
    expect(useEditorStore.getState().selection).toEqual({ kind: "zone", id: "Hub-copy" });
  });

  it("adds a town (City main object) to a zone and configures its win-condition flag", () => {
    render(<ZonePanel zoneName="Hub" />);
    const zone = () => useEditorStore.getState().root!.variants[0].zones.find((z) => z.name === "Hub")!;
    expect((zone().mainObjects ?? []).length).toBe(0);
    fireEvent.click(screen.getByText("+ Add object")); // defaults to a City (town)
    const main = zone().mainObjects!;
    expect(main).toHaveLength(1);
    expect(main[0].type).toBe("City");
    fireEvent.click(screen.getByLabelText("Hold-city win condition"));
    expect(zone().mainObjects![0].holdCityWinCon).toBe(true);
  });

  it("'+ New' on a pool picker opens a draft that references back to the zone on Accept", () => {
    render(<ZonePanel zoneName="Hub" />);
    // The guarded-pool picker's New button creates a draft and a referenceBack callback.
    const newButtons = screen.getAllByText("+ New");
    fireEvent.click(newButtons[0]); // first picker = Guarded content pool
    const draft = useEditorStore.getState().contentDrawer;
    expect(draft?.kind).toBe("pools");
    expect(draft?.createNew).toBe(true);
    // Simulate the drawer committing the new def and calling referenceBack.
    useEditorStore.getState().upsertContentDef("pools", { name: "fresh_pool", groups: [] });
    draft!.referenceBack!("fresh_pool");
    const zone = useEditorStore.getState().root!.variants[0].zones.find((z) => z.name === "Hub")!;
    expect((zone.guardedContentPool as string[]) ?? []).toContain("fresh_pool");
  });

  it("adds and removes a mandatory content reference via the store", () => {
    render(<ZonePanel zoneName="Hub" />);
    const zone = () => useEditorStore.getState().root!.variants[0].zones.find((z) => z.name === "Hub")!;
    const name = (catalogs.mandatoryContentNames ?? [])[0];
    fireEvent.change(screen.getByLabelText("Add Mandatory content"), { target: { value: name } });
    expect(zone().mandatoryContent).toContain(name);
    fireEvent.click(screen.getByLabelText(`Remove ${name}`));
    expect(zone().mandatoryContent).not.toContain(name);
  });
});
