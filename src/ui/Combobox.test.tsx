import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Combobox } from "./Combobox";
import { objectName } from "../core/catalogs";

beforeEach(() => {
  if (!Element.prototype.getBoundingClientRect) (Element.prototype as any).getBoundingClientRect = () => ({ left: 0, top: 0, bottom: 0, width: 0, right: 0, height: 0 });
});

describe("objectName", () => {
  it("uses the documented name when known, else derives from the SID", () => {
    expect(objectName("tree_of_abundance")).toBe("Arborcopia"); // documented (differs from SID)
    expect(objectName("totally_made_up_object")).toBe("Totally Made Up Object"); // derived fallback
  });
});

describe("Combobox label mode", () => {
  it("shows the value's name, and selecting an option stores the SID", () => {
    let stored = "tree_of_abundance";
    const { rerender } = render(
      <Combobox value={stored} options={["tree_of_abundance", "mine_wood"]} labelFor={objectName}
        ariaLabel="Object" onChange={(v) => { stored = v; }} />
    );
    const input = screen.getByLabelText("Object") as HTMLInputElement;
    expect(input.value).toBe("Arborcopia"); // shows name, not the SID

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "saw" } }); // search by name
    fireEvent.mouseDown(screen.getByText("Sawmill", { exact: false }));
    expect(stored).toBe("mine_wood"); // committed the SID, not the name

    rerender(<Combobox value={stored} options={["tree_of_abundance", "mine_wood"]} labelFor={objectName} ariaLabel="Object" onChange={(v) => { stored = v; }} />);
    expect((screen.getByLabelText("Object") as HTMLInputElement).value).toBe("Sawmill");
  });
});
