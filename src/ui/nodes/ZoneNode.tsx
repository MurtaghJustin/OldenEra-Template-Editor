import { Handle, Position, type NodeProps } from "@xyflow/react";
import { tierColor } from "../../core/preview";
import type { TreasureTier } from "../../core/graph";

export interface ZoneNodeData extends Record<string, unknown> {
  label: string;
  playerSlot?: number;
  hasTown: boolean;
  tier: TreasureTier;
}

export function ZoneNode({ data }: NodeProps) {
  const d = data as ZoneNodeData;
  const bg = d.playerSlot !== undefined ? "#6b3f1d" : tierColor(d.tier);
  return (
    <div style={{ textAlign: "center" }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: bg,
        border: "3px solid #2b1d0e", display: "flex", alignItems: "center",
        justifyContent: "center", fontWeight: "bold", color: "#f4e7c8", fontSize: 22 }}>
        {d.playerSlot !== undefined ? d.playerSlot : (d.hasTown ? "⌂" : "")}
      </div>
      <div style={{ fontSize: 11, marginTop: 2 }}>{d.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
