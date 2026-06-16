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
