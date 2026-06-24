import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NumberField, SelectField, TextField } from "./fields";

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

  it("TextField round-trips strings", () => {
    const onChange = vi.fn();
    render(<TextField label="Name" value="x" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "y" } });
    expect(onChange).toHaveBeenCalledWith("y");
  });
});
