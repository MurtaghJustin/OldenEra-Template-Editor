import { Handle, Position, type NodeProps } from "@xyflow/react";
import { tierColor } from "../../core/preview";
import { useEditorStore } from "../../state/store";
import type { TreasureTier } from "../../core/graph";
import "./zoneNode.css";

export interface ZoneNodeData extends Record<string, unknown> {
  label: string;
  playerSlot?: number;
  hasTown: boolean;
  tier: TreasureTier;
  selected?: boolean;
}

// Handles are a transparent 1px POINT pinned to the disc centre, so straight edges anchor exactly
// centre-to-centre (React Flow puts an endpoint at the handle box edge — for a 1px box that's the
// centre — and the line is hidden under the disc, which draws above the edge layer). The grabbable
// area comes from the .zone-connect-handle ::before in zoneNode.css, which expands the hit target
// over the whole disc WITHOUT changing the measured 1px box. So dragging anywhere on a node starts
// a connection while the rendering stays identical.
//
// By default the handle does NOT intercept pointer events, so the disc body drags to MOVE the node
// (and plain clicks select it). Only while a connect modifier is held (Shift/Alt) does the handle
// become grabbable so a drag starts a connection. Either way the edge anchors at the centre.
function centreHandle(grab: boolean) {
  return {
    left: "50%", top: "50%", right: "auto", bottom: "auto", transform: "translate(-50%, -50%)",
    width: 1, height: 1, minWidth: 0, minHeight: 0, border: "none", background: "transparent", opacity: 0,
    pointerEvents: (grab ? "auto" : "none") as "auto" | "none",
  };
}

// IMPORTANT: the node root is a FIXED 52×52 box (just the disc); the label is absolutely positioned
// below it and does NOT affect the box size, so wide labels can't shift the disc off its computed
// position and skew the layout.
export function ZoneNode({ data }: NodeProps) {
  const d = data as ZoneNodeData;
  const connectMode = useEditorStore((s) => s.connectMode);
  const grab = connectMode !== "none"; // only grabbable (to connect) while a connect modifier is held
  const bg = d.playerSlot !== undefined ? "#6b3f1d" : tierColor(d.tier);
  return (
    <div style={{ position: "relative", width: 52, height: 52, borderRadius: "50%", background: bg,
      border: "3px solid #2b1d0e", display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: "bold", color: "#f4e7c8", fontSize: 22,
      // Bright outer ring when selected so the clicked node is obvious in the graph.
      boxShadow: d.selected ? "0 0 0 3px #ffd54a, 0 0 10px 2px rgba(255,213,74,0.6)" : "none" }}>
      <Handle type="target" position={Position.Top} className="zone-connect-handle" style={centreHandle(grab)} />
      <Handle type="source" position={Position.Bottom} className="zone-connect-handle" style={centreHandle(grab)} />
      {d.playerSlot !== undefined ? d.playerSlot : (d.hasTown ? "⌂" : "")}
      <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
        marginTop: 2, fontSize: 11, whiteSpace: "nowrap", pointerEvents: "none", color: "#e0e0e0" }}>
        {d.label}
      </div>
    </div>
  );
}
