import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "./Toolbar";
import { useEditorStore } from "../state/store";
import minimal from "../test-fixtures/minimal.rmg.json";

beforeEach(() => useEditorStore.getState().loadFromText(JSON.stringify(minimal), "M.rmg.json"));

describe("Toolbar", () => {
  it("Compute layout recomputes node positions", () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByText("Compute layout"));
    const positions = useEditorStore.getState().positions;
    expect(Object.keys(positions).length).toBe(3); // one per zone in the minimal fixture
  });

  it("shows a dirty indicator after an edit", () => {
    useEditorStore.getState().addZoneOfType("Z", "side", {});
    render(<Toolbar />);
    expect(screen.getByText(/unsaved/i)).toBeInTheDocument();
  });
});
