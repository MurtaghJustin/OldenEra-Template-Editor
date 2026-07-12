import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SelectorField } from "./SelectorField";
import type { Selector } from "../../core/types";

describe("SelectorField (biome)", () => {
  it("toggles biome chips on and emits a FromList", () => {
    const onChange = vi.fn();
    render(<SelectorField label="Zone biome" kind="biome" value={{ type: "FromList", args: [] }} zones={["Spawn-A"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Sand" }));
    expect(onChange).toHaveBeenCalledWith({ type: "FromList", args: ["Sand"] });
  });

  it("switching to 'Follow a main object' emits MatchMainObject", () => {
    const onChange = vi.fn();
    render(<SelectorField label="Zone biome" kind="biome" value={{ type: "FromList", args: [] }} zones={["Spawn-A"]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/Follow a main object/));
    expect(onChange).toHaveBeenCalledWith({ type: "MatchMainObject", args: ["0"] });
  });

  it("'Same as another zone' shows a zone picker and emits MatchZone", () => {
    const onChange = vi.fn();
    render(<SelectorField label="Zone biome" kind="biome" value={{ type: "MatchZone", args: [] }} zones={["Spawn-A", "Side-B"]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Same-as zone"), { target: { value: "Side-B" } });
    expect(onChange).toHaveBeenCalledWith({ type: "MatchZone", args: ["Side-B"] });
  });

  it("does not offer biome-name inputs as free text (chips only)", () => {
    render(<SelectorField label="Zone biome" kind="biome" value={{ type: "FromList", args: ["Sand"] }} zones={[]} onChange={() => {}} />);
    // The 7 fixed biomes render as toggle buttons; Sand is pressed.
    expect(screen.getByRole("button", { name: "Sand" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Grass" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("SelectorField (faction)", () => {
  it("'Match a main object's faction' emits Match with index + zone", () => {
    const onChange = vi.fn();
    const { rerender } = render(<SelectorField label="Faction" kind="faction" value={{ type: "FromList", args: [] }} zones={["Spawn-A"]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/Match a main object/));
    expect(onChange).toHaveBeenCalledWith({ type: "Match", args: ["0"] });
    // With the mode active, choosing a target zone adds the second arg.
    rerender(<SelectorField label="Faction" kind="faction" value={{ type: "Match", args: ["0"] }} zones={["Spawn-A"]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Match zone"), { target: { value: "Spawn-A" } });
    expect(onChange).toHaveBeenLastCalledWith({ type: "Match", args: ["0", "Spawn-A"] });
  });

  it("adds a different-from exclusion with a zone and object index", () => {
    const onChange = vi.fn();
    render(<SelectorField label="Faction" kind="faction" value={{ type: "FromList", args: [] }} zones={["Spawn-A"]} onChange={onChange} />);
    fireEvent.click(screen.getByText("+ zone"));                     // adds a row defaulting to the first zone
    expect(onChange).toHaveBeenCalledWith({ type: "FromList", args: ["differentFrom: 0 Spawn-A"] } as Selector);
  });

  it("offers a Random option", () => {
    const onChange = vi.fn();
    render(<SelectorField label="Faction" kind="faction" value={{ type: "FromList", args: [] }} zones={[]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/Random faction/));
    expect(onChange).toHaveBeenCalledWith({ type: "Random", args: [] });
  });
});
