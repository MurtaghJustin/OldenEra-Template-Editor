import { describe, it, expect, beforeEach, afterEach } from "vitest";
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

  it("shows the full option list (not just the current value) when an already-filled field is opened", () => {
    render(
      <Combobox value="mine_wood" options={["tree_of_abundance", "mine_wood", "mine_gold"]} labelFor={objectName}
        ariaLabel="Object" onChange={() => {}} />
    );
    fireEvent.focus(screen.getByLabelText("Object"));
    // All options visible despite mine_wood being selected — not pre-filtered to the selection.
    expect(screen.getByText("Arborcopia", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Gold Mine", { exact: false })).toBeInTheDocument();
  });
});

describe("Combobox render props", () => {
  it("uses renderOption for row content instead of the default label", () => {
    render(<Combobox value="" options={["alpha", "beta"]} ariaLabel="Pick" onChange={() => {}}
      renderOption={(v) => <span>OPT:{v}</span>} />);
    fireEvent.focus(screen.getByLabelText("Pick"));
    expect(screen.getByText("OPT:alpha")).toBeInTheDocument();
    expect(screen.getByText("OPT:beta")).toBeInTheDocument();
  });

  it("renders the detail panel for the highlighted row (first row until arrowed)", () => {
    render(<Combobox value="" options={["alpha", "beta", "gamma"]} ariaLabel="Pick" onChange={() => {}}
      renderDetail={(v) => <span>DETAIL:{v}</span>} />);
    const input = screen.getByLabelText("Pick");
    fireEvent.focus(input);
    expect(screen.getByText("DETAIL:alpha")).toBeInTheDocument(); // defaults to first while hi = -1
    fireEvent.keyDown(input, { key: "ArrowDown" }); // hi 0
    fireEvent.keyDown(input, { key: "ArrowDown" }); // hi 1
    expect(screen.getByText("DETAIL:beta")).toBeInTheDocument();
  });

  it("shows valueAdornment only when a value is set", () => {
    const { rerender } = render(<Combobox value="" options={["alpha"]} ariaLabel="Pick" onChange={() => {}}
      valueAdornment={(v) => <span>ADORN:{v}</span>} />);
    expect(screen.queryByText(/^ADORN:/)).toBeNull();
    rerender(<Combobox value="alpha" options={["alpha"]} ariaLabel="Pick" onChange={() => {}}
      valueAdornment={(v) => <span>ADORN:{v}</span>} />);
    expect(screen.getByText("ADORN:alpha")).toBeInTheDocument();
  });
});

describe("Combobox menu placement", () => {
  const originalRect = Element.prototype.getBoundingClientRect;
  const originalHeight = window.innerHeight;
  const mockInputRect = (top: number, bottom: number) => {
    Element.prototype.getBoundingClientRect = function () {
      return { left: 20, right: 220, top, bottom, width: 200, height: bottom - top, x: 20, y: top, toJSON: () => {} } as DOMRect;
    };
  };
  afterEach(() => {
    Element.prototype.getBoundingClientRect = originalRect;
    (window as { innerHeight: number }).innerHeight = originalHeight;
  });

  it("drops the menu downward when there is room below the input", () => {
    (window as { innerHeight: number }).innerHeight = 800;
    mockInputRect(40, 60); // near the top of a tall viewport
    render(<Combobox value="" options={["alpha", "beta", "gamma"]} ariaLabel="Pick" onChange={() => {}} />);
    fireEvent.focus(screen.getByLabelText("Pick"));
    const menu = screen.getByRole("listbox");
    expect(menu.style.top).toBe("60px");   // anchored just below the input
    expect(menu.style.bottom).toBe("");    // not flipped
  });

  it("flips the menu upward when the input is near the bottom of the viewport", () => {
    (window as { innerHeight: number }).innerHeight = 500;
    mockInputRect(470, 490); // little room below (only ~10px)
    render(<Combobox value="" options={["alpha", "beta", "gamma"]} ariaLabel="Pick" onChange={() => {}} />);
    fireEvent.focus(screen.getByLabelText("Pick"));
    const menu = screen.getByRole("listbox");
    expect(menu.style.bottom).toBe("30px"); // 500 - 470: pinned to the input's top, growing upward
    expect(menu.style.top).toBe("");        // not dropped downward
  });
});
