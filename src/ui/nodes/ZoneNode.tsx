import { Handle, Position, type NodeProps } from "@xyflow/react";
import { tierColor } from "../../core/preview";
import type { TreasureTier } from "../../core/graph";

export interface ZoneNodeData extends Record<string, unknown> {
  label: string;
  playerSlot?: number;
  hasTown: boolean;
  tier: TreasureTier;
}

// Handles are pinned to the DISC CENTRE (not the node bbox) so straight edges run
// centre-to-centre. They're invisible and tiny; the disc is drawn above the edge layer,
// so the line is hidden beneath the disc and the node is never obscured by a connection.
const centreHandle = {
  left: "50%", top: "50%", transform: "translate(-50%, -50%)",
  width: 1, height: 1, minWidth: 0, minHeight: 0, border: "none",
  background: "transparent", opacity: 0,
} as const;

export function ZoneNode({ data }: NodeProps) {
  const d = data as ZoneNodeData;
  const bg = d.playerSlot !== undefined ? "#6b3f1d" : tierColor(d.tier);
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: 52, height: 52, borderRadius: "50%", background: bg,
        border: "3px solid #2b1d0e", display: "flex", alignItems: "center",
        justifyContent: "center", fontWeight: "bold", color: "#f4e7c8", fontSize: 22 }}>
        <Handle type="target" position={Position.Top} style={centreHandle} />
        <Handle type="source" position={Position.Bottom} style={centreHandle} />
        {d.playerSlot !== undefined ? d.playerSlot : (d.hasTown ? "⌂" : "")}
      </div>
      <div style={{ fontSize: 11, marginTop: 2, whiteSpace: "nowrap", pointerEvents: "none" }}>{d.label}</div>
    </div>
  );
}
