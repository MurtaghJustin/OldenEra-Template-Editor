import { Handle, Position, type NodeProps } from "@xyflow/react";
import { tierColor } from "../../core/preview";
import type { TreasureTier } from "../../core/graph";

export interface ZoneNodeData extends Record<string, unknown> {
  label: string;
  playerSlot?: number;
  hasTown: boolean;
  tier: TreasureTier;
}

// Handles are pinned to the DISC CENTRE so straight edges run centre-to-centre. They're invisible
// and tiny; the disc is drawn above the edge layer, so the line is hidden beneath the disc.
const centreHandle = {
  left: "50%", top: "50%", transform: "translate(-50%, -50%)",
  width: 1, height: 1, minWidth: 0, minHeight: 0, border: "none",
  background: "transparent", opacity: 0,
} as const;

// IMPORTANT: the node root is a FIXED 52×52 box (just the disc); the label is absolutely
// positioned below it and does NOT affect the box size. React Flow positions nodes by their
// top-left corner, so if the box width varied with label length the discs would shift by their
// label widths and skew the layout. A fixed box keeps every disc centred exactly on its computed
// position, so the layout's geometry (perfect diamonds, even rings, etc.) renders faithfully.
export function ZoneNode({ data }: NodeProps) {
  const d = data as ZoneNodeData;
  const bg = d.playerSlot !== undefined ? "#6b3f1d" : tierColor(d.tier);
  return (
    <div style={{ position: "relative", width: 52, height: 52, borderRadius: "50%", background: bg,
      border: "3px solid #2b1d0e", display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: "bold", color: "#f4e7c8", fontSize: 22 }}>
      <Handle type="target" position={Position.Top} style={centreHandle} />
      <Handle type="source" position={Position.Bottom} style={centreHandle} />
      {d.playerSlot !== undefined ? d.playerSlot : (d.hasTown ? "⌂" : "")}
      <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
        marginTop: 2, fontSize: 11, whiteSpace: "nowrap", pointerEvents: "none", color: "#e0e0e0" }}>
        {d.label}
      </div>
    </div>
  );
}
