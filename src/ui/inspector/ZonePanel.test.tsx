import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
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

  it("shows 'Apply settings to all player spawns' only on a spawn zone (with >1 spawn)", () => {
    const { unmount } = render(<ZonePanel zoneName="Spawn-A" />); // spawn zone, minimal has 2 spawns
    expect(screen.getByText(/Apply settings to all player spawns/)).toBeInTheDocument();
    unmount();
    render(<ZonePanel zoneName="Hub" />); // Hub has no Spawn main object
    expect(screen.queryByText(/Apply settings to all player spawns/)).toBeNull();
  });

  it("crossroads is a main-object dropdown that sets crossroadsPosition (1-based)", () => {
    render(<ZonePanel zoneName="Spawn-A" />); // Spawn-A has a Spawn (Player1) main object
    const sel = screen.getByLabelText("Crossroads") as HTMLSelectElement;
    const opts = [...sel.querySelectorAll("option")].map((o) => ({ v: o.value, t: o.textContent ?? "" }));
    expect(opts[0]).toMatchObject({ v: "0", t: "None" });
    expect(opts.some((o) => o.v === "1" && /Spawn/.test(o.t))).toBe(true);
    fireEvent.change(sel, { target: { value: "1" } });
    expect(useEditorStore.getState().root!.variants[0].zones.find((z) => z.name === "Spawn-A")!.crossroadsPosition).toBe(1);
  });

  it("crossroads dropdown offers only None when the zone has no main objects", () => {
    render(<ZonePanel zoneName="Hub" />); // Hub has no main objects
    const sel = screen.getByLabelText("Crossroads") as HTMLSelectElement;
    expect([...sel.querySelectorAll("option")].map((o) => o.textContent)).toEqual(["None"]);
  });

  it("'+ New' on a pool picker opens a draft that references back to the zone on Accept", () => {
    render(<ZonePanel zoneName="Hub" />);
    fireEvent.click(screen.getByText(/Show advanced/)); // pickers live under the advanced disclosure
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

  it("offers pools added to this template (not just the build-time catalog) in a pool picker search", () => {
    render(<ZonePanel zoneName="Hub" />);
    fireEvent.click(screen.getByText(/Show advanced/)); // pickers live under the advanced disclosure
    const zone = () => useEditorStore.getState().root!.variants[0].zones.find((z) => z.name === "Hub")!;
    // Author a brand-new pool in this template — it is NOT in the static build-time catalog.
    const fresh = "session_only_pool";
    expect(catalogs.pools ?? []).not.toContain(fresh);
    act(() => useEditorStore.getState().upsertContentDef("pools", { name: fresh, groups: [] }));
    // It must be selectable in the guarded-pool picker: typing its name adds the reference.
    fireEvent.change(screen.getByLabelText("Add Guarded content pool"), { target: { value: fresh } });
    expect((zone().guardedContentPool as string[]) ?? []).toContain(fresh);
  });

  it("adds and removes a mandatory content reference via the store", () => {
    render(<ZonePanel zoneName="Hub" />);
    fireEvent.click(screen.getByText(/Show advanced/)); // pickers live under the advanced disclosure
    const zone = () => useEditorStore.getState().root!.variants[0].zones.find((z) => z.name === "Hub")!;
    const name = (catalogs.mandatoryContentNames ?? [])[0];
    fireEvent.change(screen.getByLabelText("Add Mandatory content"), { target: { value: name } });
    expect(zone().mandatoryContent).toContain(name);
    fireEvent.click(screen.getByLabelText(`Remove ${name}`));
    expect(zone().mandatoryContent).not.toContain(name);
  });
});
