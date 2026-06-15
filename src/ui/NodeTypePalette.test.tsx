import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NodeTypePalette, DND_NODETYPE } from "./NodeTypePalette";
import { useEditorStore } from "../state/store";
import minimal from "../test-fixtures/minimal.rmg.json";

beforeEach(() => useEditorStore.getState().loadFromText(JSON.stringify(minimal), "M.rmg.json"));

describe("NodeTypePalette", () => {
  it("renders a draggable chip per node type", () => {
    render(<NodeTypePalette />);
    for (const t of useEditorStore.getState().nodeTypes) {
      expect(screen.getByText(t.label)).toBeInTheDocument();
    }
  });

  it("dragging a chip publishes its node-type id for the canvas to consume", () => {
    render(<NodeTypePalette />);
    const setData = vi.fn();
    const spawn = useEditorStore.getState().nodeTypes[0];
    fireEvent.dragStart(screen.getByText(spawn.label), { dataTransfer: { setData, effectAllowed: "" } });
    expect(setData).toHaveBeenCalledWith(DND_NODETYPE, spawn.id);
  });
});
