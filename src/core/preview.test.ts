import { describe, it, expect } from "vitest";
import { renderPreview, PREVIEW_SIZE, tierColor } from "./preview";
import { autoLayout } from "./layout";
import { extractGraph } from "./graph";
import { parseTemplate } from "./parse";
import minimal from "../test-fixtures/minimal.rmg.json";

// Minimal recording stub for CanvasRenderingContext2D.
function makeCtx() {
  const calls: { fn: string; args: unknown[] }[] = [];
  const rec = (fn: string) => (...args: unknown[]) => { calls.push({ fn, args }); };
  const ctx: any = {
    calls, fillStyle: "", strokeStyle: "", lineWidth: 0, font: "", textAlign: "", textBaseline: "",
    save: rec("save"), restore: rec("restore"), beginPath: rec("beginPath"),
    arc: rec("arc"), moveTo: rec("moveTo"), lineTo: rec("lineTo"), fill: rec("fill"),
    stroke: rec("stroke"), fillRect: rec("fillRect"), fillText: rec("fillText"),
    closePath: rec("closePath"),
  };
  return ctx;
}

describe("renderPreview", () => {
  const root = parseTemplate(JSON.stringify(minimal));
  const g = autoLayout(extractGraph(root, 0), root.variants[0]);

  it("maps tiers to bronze/silver/gold", () => {
    expect(tierColor("low")).toMatch(/^#/);
    expect(tierColor("high")).not.toBe(tierColor("low"));
  });

  it("draws a background, one arc per node, and edges", () => {
    const ctx = makeCtx();
    renderPreview(ctx, g, { width: PREVIEW_SIZE, height: PREVIEW_SIZE, style: "parchment" });
    const arcs = ctx.calls.filter((c: any) => c.fn === "arc").length;
    expect(arcs).toBeGreaterThanOrEqual(g.nodes.length); // at least one disc per node
    expect(ctx.calls.some((c: any) => c.fn === "fillRect")).toBe(true); // background
    expect(ctx.calls.filter((c: any) => c.fn === "stroke").length).toBeGreaterThanOrEqual(g.edges.length);
  });

  it("writes the player slot number for spawns", () => {
    const ctx = makeCtx();
    renderPreview(ctx, g, { width: PREVIEW_SIZE, height: PREVIEW_SIZE, style: "parchment" });
    const texts = ctx.calls.filter((c: any) => c.fn === "fillText").map((c: any) => String(c.args[0]));
    expect(texts).toContain("1");
    expect(texts).toContain("2");
  });
});
