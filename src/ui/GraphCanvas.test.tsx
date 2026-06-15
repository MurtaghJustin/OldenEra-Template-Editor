import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GraphCanvas } from "./GraphCanvas";
import { useEditorStore } from "../state/store";
import minimal from "../test-fixtures/minimal.rmg.json";

// React Flow needs layout APIs jsdom lacks; stub ResizeObserver.
beforeEach(() => {
  (global as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  // React Flow uses DOMMatrixReadOnly internally.
  if (!(global as any).DOMMatrixReadOnly) {
    (global as any).DOMMatrixReadOnly = class { constructor() {} };
  }
  // React Flow may call getContext on canvas elements.
  if (!HTMLCanvasElement.prototype.getContext) {
    HTMLCanvasElement.prototype.getContext = () => null as any;
  }
  // matchMedia stub
  if (!window.matchMedia) {
    (window as any).matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false });
  }
  useEditorStore.getState().loadFromText(JSON.stringify(minimal), "M.rmg.json");
});

describe("GraphCanvas", () => {
  it("renders without crashing and shows zone labels", () => {
    render(<GraphCanvas />);
    expect(screen.getByText("Hub")).toBeInTheDocument();
    expect(screen.getByText("Spawn-A")).toBeInTheDocument();
  });

  it("Delete removes the selected zone", () => {
    render(<GraphCanvas />);
    useEditorStore.getState().select({ kind: "zone", id: "Hub" });
    fireEvent.keyDown(window, { key: "Delete" });
    expect(useEditorStore.getState().graph?.nodes.some((n) => n.id === "Hub")).toBe(false);
  });

  it("Delete is ignored while focus is in a text field", () => {
    render(<GraphCanvas />);
    const input = document.createElement("input");
    document.body.appendChild(input);
    useEditorStore.getState().select({ kind: "zone", id: "Hub" });
    fireEvent.keyDown(input, { key: "Delete" });
    expect(useEditorStore.getState().graph?.nodes.some((n) => n.id === "Hub")).toBe(true);
    input.remove();
  });
});
