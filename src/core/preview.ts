import { displayEdges, type Graph, type TreasureTier } from "./graph";

export const PREVIEW_SIZE = 512;
const DISC_R = 26;

export interface PreviewOptions { width: number; height: number; style: "parchment" | "dark"; }

export function tierColor(tier: TreasureTier): string {
  switch (tier) {
    case "high": return "#d4af37";   // gold
    case "medium": return "#c0c0c0"; // silver
    default: return "#cd7f32";       // bronze
  }
}

function bounds(g: Graph) {
  const xs = g.nodes.map((n) => n.x), ys = g.nodes.map((n) => n.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

export function renderPreview(ctx: CanvasRenderingContext2D, g: Graph, opt: PreviewOptions): void {
  const { width, height, style } = opt;
  // Background.
  ctx.fillStyle = style === "parchment" ? "#cdb892" : "#1e1c18";
  ctx.fillRect(0, 0, width, height);
  if (g.nodes.length === 0) return;

  // Fit graph coords into the canvas with padding.
  const pad = DISC_R * 2;
  const b = bounds(g);
  const gw = Math.max(1, b.maxX - b.minX), gh = Math.max(1, b.maxY - b.minY);
  const scale = Math.min((width - 2 * pad) / gw, (height - 2 * pad) / gh);
  const ox = (width - gw * scale) / 2, oy = (height - gh * scale) / 2;
  const tx = (x: number) => ox + (x - b.minX) * scale;
  const ty = (y: number) => oy + (y - b.minY) * scale;

  // Edges first (deduped road links only — see displayEdges).
  for (const e of displayEdges(g)) {
    const a = g.nodes.find((n) => n.id === e.from), c = g.nodes.find((n) => n.id === e.to);
    if (!a || !c) continue;
    ctx.strokeStyle = e.connection.connectionType === "Portal"
      ? "#5b8fb9"
      : (style === "parchment" ? "#5a3c20" : "#caa84a");
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(tx(a.x), ty(a.y)); ctx.lineTo(tx(c.x), ty(c.y)); ctx.stroke();
  }

  // Nodes.
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const n of g.nodes) {
    const cx = tx(n.x), cy = ty(n.y);
    ctx.beginPath(); ctx.arc(cx, cy, DISC_R, 0, Math.PI * 2);
    ctx.fillStyle = n.playerSlot !== undefined ? "#6b3f1d" : tierColor(n.tier);
    ctx.fill();
    ctx.strokeStyle = "#2b1d0e"; ctx.lineWidth = 3; ctx.stroke();

    if (n.playerSlot !== undefined) {
      ctx.fillStyle = "#f4e7c8"; ctx.font = `bold ${DISC_R}px system-ui, sans-serif`;
      ctx.fillText(String(n.playerSlot), cx, cy + 1);
    } else if (n.hasTown) {
      ctx.fillStyle = "#2b1d0e"; ctx.font = `bold ${DISC_R}px system-ui, sans-serif`;
      ctx.fillText("⌂", cx, cy + 2); // house glyph
    }
  }
}
