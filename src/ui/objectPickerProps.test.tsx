import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Combobox } from "./Combobox";
import { objectName } from "../core/catalogs";
import { objectComboProps } from "./objectPickerProps";

beforeEach(() => {
  if (!Element.prototype.getBoundingClientRect) (Element.prototype as any).getBoundingClientRect = () => ({ left: 0, top: 0, bottom: 0, width: 0, right: 0, height: 0 });
});

// dragon_utopia is catalogued (rich data + icon); random_hire_1 is a generator meta-SID with no
// map-object entry — it must degrade gracefully.
const opts = ["dragon_utopia", "random_hire_1"];

describe("objectComboProps", () => {
  it("renders a rich row for a catalogued object: name, value, group chip, and an icon", () => {
    render(
      <Combobox value="" options={opts} labelFor={objectName} ariaLabel="Object" onChange={() => {}} {...objectComboProps} />
    );
    fireEvent.focus(screen.getByLabelText("Object"));
    // Name appears in both the row and the detail panel — scope to the option rows.
    const row = screen.getAllByRole("option").find((r) => r.textContent?.includes("Dragon Utopia"))!;
    expect(row).toBeTruthy();
    expect(row.textContent).toContain("13,750"); // value, thousands-separated
    expect(row.textContent).toContain("Adv");     // group chip (Adventure Sites)
    expect(row.querySelector("img")).toBeTruthy(); // inlined icon
  });

  it("shows the full description and meta in the detail panel for the highlighted object", () => {
    render(
      <Combobox value="" options={opts} labelFor={objectName} ariaLabel="Object" onChange={() => {}} {...objectComboProps} />
    );
    fireEvent.focus(screen.getByLabelText("Object"));
    // highlight defaults to the first row (dragon_utopia)
    expect(screen.getByText(/Gives a very large amount of Gold/)).toBeInTheDocument();
    expect(screen.getByText(/Adventure Sites/)).toBeInTheDocument();
  });

  it("degrades for an uncatalogued SID: name + SID, no icon, 'not in catalog' detail", () => {
    render(
      <Combobox value="" options={["random_hire_1"]} labelFor={objectName} ariaLabel="Object" onChange={() => {}} {...objectComboProps} />
    );
    fireEvent.focus(screen.getByLabelText("Object"));
    const row = screen.getByRole("option"); // only one option here
    expect(row.textContent).toContain("Random Hire Tier 1"); // documented name
    expect(row.textContent).toContain("random_hire_1");      // dimmed SID kept
    expect(row.querySelector("img")).toBeNull();             // no icon box
    expect(screen.getByText(/Not in the map-object catalog/)).toBeInTheDocument();
  });

  it("shows an icon adornment in a filled field for a catalogued object, none for an uncatalogued one", () => {
    const { container, rerender } = render(
      <Combobox value="dragon_utopia" options={opts} labelFor={objectName} ariaLabel="Object" onChange={() => {}} {...objectComboProps} />
    );
    expect(container.querySelector("img")).toBeTruthy();
    rerender(
      <Combobox value="random_hire_1" options={opts} labelFor={objectName} ariaLabel="Object" onChange={() => {}} {...objectComboProps} />
    );
    expect(container.querySelector("img")).toBeNull();
  });
});
