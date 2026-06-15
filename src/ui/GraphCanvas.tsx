import { useMemo } from "react";
import { ReactFlow, Background, Controls, type Node, type Edge, type Connection as RfConn } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEditorStore } from "../state/store";
import { displayEdges } from "../core/graph";
import { ZoneNode } from "./nodes/ZoneNode";

const nodeTypes = { zone: ZoneNode };

export function GraphCanvas() {
  const graph = useEditorStore((s) => s.graph);
  const select = useEditorStore((s) => s.select);
  const addConn = useEditorStore((s) => s.addConn);

  const nodes: Node[] = useMemo(() => (graph?.nodes ?? []).map((n) => ({
    id: n.id, type: "zone", position: { x: n.x, y: n.y },
    data: { label: n.id, playerSlot: n.playerSlot, hasTown: n.hasTown, tier: n.tier },
  })), [graph]);

  const edges: Edge[] = useMemo(() => (graph ? displayEdges(graph) : []).map((e) => ({
    id: e.id, source: e.from, target: e.to,
    style: { stroke: e.connection.connectionType === "Portal" ? "#5b8fb9" : "#caa84a", strokeWidth: 2 },
  })), [graph]);

  return (
    <div style={{ height: "100%" }}>
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        onNodeClick={(_, n) => select({ kind: "zone", id: n.id })}
        onEdgeClick={(_, e) => select({ kind: "connection", id: e.id })}
        onConnect={(c: RfConn) => { if (c.source && c.target) addConn({ from: c.source, to: c.target, connectionType: "Direct", road: true }); }}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
