import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "./Toolbar";
import { useEditorStore } from "../state/store";
import minimal from "../test-fixtures/minimal.rmg.json";

beforeEach(() => useEditorStore.getState().loadFromText(JSON.stringify(minimal), "M.rmg.json"));

describe("Toolbar", () => {
  it("adds a zone of the selected type", () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByText("Add zone"));
    const names = useEditorStore.getState().root!.variants[0].zones.map((z) => z.name);
    expect(names.some((n) => /^zone_/.test(n))).toBe(true);
  });

  it("shows a dirty indicator after an edit", () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByText("Add zone"));
    expect(screen.getByText(/unsaved/i)).toBeInTheDocument();
  });
});
