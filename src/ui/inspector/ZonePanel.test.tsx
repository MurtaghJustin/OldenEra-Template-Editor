import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ZonePanel } from "./ZonePanel";
import { useEditorStore } from "../../state/store";
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
    fireEvent.blur(screen.getByLabelText("Name"));
    expect(useEditorStore.getState().root!.variants[0].zones.some((z) => z.name === "Center")).toBe(true);
  });
});
