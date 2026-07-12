import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NumberField, SelectField, TextField, VariantField, SelectorField } from "./fields";

describe("fields", () => {
  it("NumberField calls onChange with a number", () => {
    const onChange = vi.fn();
    render(<NumberField label="Size" value={1} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "2.5" } });
    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it("SelectField lists options and allows custom typed entry", () => {
    const onChange = vi.fn();
    render(<SelectField label="Layout" value="a" options={["a", "b"]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Layout"), { target: { value: "b" } });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("VariantField: named dropdown for known objects, number input for the rest", () => {
    const { rerender } = render(<VariantField sid="dragon_utopia" value={1} onChange={() => {}} ariaLabel="V" />);
    const sel = screen.getByLabelText("V");
    expect(sel.tagName).toBe("SELECT");
    expect(sel).toHaveValue("1");
    expect(screen.getByText("2: Large Guard")).toBeInTheDocument();
    rerender(<VariantField sid="the_gorge" value={2} onChange={() => {}} ariaLabel="V" />);
    expect(screen.getByLabelText("V").tagName).toBe("INPUT");
  });

  it("TextField round-trips strings", () => {
    const onChange = vi.fn();
    render(<TextField label="Name" value="x" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "y" } });
    expect(onChange).toHaveBeenCalledWith("y");
  });

  it("SelectorField offers biome suggestions only for FromList, and hints/omits them for Match", () => {
    const { container, rerender } = render(
      <SelectorField label="Zone biome" value={{ type: "FromList", args: [""] }} argOptions={["Sand", "Grass"]} onChange={() => {}} />);
    // FromList: a datalist of biome names backs the arg input.
    expect(container.querySelector("datalist")).not.toBeNull();
    expect(screen.queryByText(/Args:/)).toBeNull(); // no arg hint for FromList

    // Match: no biome datalist, and a hint that the first arg is an index, not a biome name.
    rerender(<SelectorField label="Zone biome" value={{ type: "Match", args: ["Sand"] }} argOptions={["Sand", "Grass"]} onChange={() => {}} />);
    expect(container.querySelector("datalist")).toBeNull();
    expect(screen.getByText(/main-object index/i)).toBeInTheDocument();
    expect(screen.getByText(/not a biome name/i)).toBeInTheDocument();
  });
});
