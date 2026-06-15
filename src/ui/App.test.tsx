import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { useEditorStore } from "../state/store";
import minimal from "../test-fixtures/minimal.rmg.json";

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

describe("App", () => {
  it("renders toolbar, canvas, and inspector regions", () => {
    render(<App />);
    expect(screen.getByText("Open")).toBeInTheDocument();        // toolbar
    expect(screen.getByText("Hub")).toBeInTheDocument();          // canvas
    expect(screen.getByText(/Select a zone/i)).toBeInTheDocument(); // inspector empty state
  });

  it("shows a validation error banner when present", () => {
    const root = useEditorStore.getState().root!;
    root.variants[0].connections[0].to = "Ghost";
    useEditorStore.getState().refresh();
    render(<App />);
    expect(screen.getByText(/Ghost/)).toBeInTheDocument();
  });
});
