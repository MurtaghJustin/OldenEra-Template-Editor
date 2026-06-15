import { useEffect } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, ConnectionMode, useNodesState, useReactFlow,
  type Node, type Edge, type Connection as RfConn,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEditorStore } from "../state/store";
import { displayEdges } from "../core/graph";
import { ZoneNode } from "./nodes/ZoneNode";
import { DND_NODETYPE } from "./NodeTypePalette";

const nodeTypes = { zone: ZoneNode };

// First "<typeId>-N" name not already used by a zone — keeps dropped zones uniquely named.
function uniqueZoneName(typeId: string, taken: Set<string>): string {
  for (let i = 1; ; i++) { const name = `${typeId}-${i}`; if (!taken.has(name)) return name; }
}

function Flow() {
  const graph = useEditorStore((s) => s.graph);
  const select = useEditorStore((s) => s.select);
  const selection = useEditorStore((s) => s.selection);
  const addConn = useEditorStore((s) => s.addConn);
  const setNodePosition = useEditorStore((s) => s.setNodePosition);
  const connectMode = useEditorStore((s) => s.connectMode);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);

  // Delete key removes the selected zone or connection — unless focus is in a text field/select,
  // where Delete must edit the text instead. (React Flow's own delete key is disabled below so it
  // can't delete RF-selected elements behind the store's back.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
      const sel = useEditorStore.getState().selection;
      if (sel?.kind === "zone") { e.preventDefault(); useEditorStore.getState().removeZoneById(sel.id); }
      else if (sel?.kind === "connection") { e.preventDefault(); useEditorStore.getState().removeConn(sel.id); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Track held modifiers globally to set the drag mode: default drags MOVE a node; Shift+drag draws
  // a Direct connection; Alt+drag draws a Portal. Any key change (or losing focus) refreshes it.
  useEffect(() => {
    const sync = (e: KeyboardEvent) => useEditorStore.getState().setConnectMode(e.altKey ? "portal" : e.shiftKey ? "direct" : "none");
    const clear = () => useEditorStore.getState().setConnectMode("none");
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    window.addEventListener("blur", clear);
    return () => { window.removeEventListener("keydown", sync); window.removeEventListener("keyup", sync); window.removeEventListener("blur", clear); };
  }, []);

  // Mirror the store graph into React Flow's local node state. Dragging mutates the local state
  // live (onNodesChange) for smooth motion; the final position is persisted on drag stop, which
  // bumps the store graph and re-syncs here to the same coordinates.
  useEffect(() => {
    setNodes((graph?.nodes ?? []).map((n) => ({
      id: n.id, type: "zone", position: { x: n.x, y: n.y },
      selected: selection?.kind === "zone" && selection.id === n.id,
      data: { label: n.id, playerSlot: n.playerSlot, hasTown: n.hasTown, tier: n.tier,
        selected: selection?.kind === "zone" && selection.id === n.id },
    })));
  }, [graph, selection, setNodes]);

  const edges: Edge[] = (graph ? displayEdges(graph) : []).map((e) => {
    const sel = selection?.kind === "connection" && selection.id === e.id;
    const base = e.connection.connectionType === "Portal" ? "#5b8fb9" : "#caa84a";
    return {
      id: e.id, source: e.from, target: e.to, type: "straight",
      // Wide invisible hit area so the thin line (mostly hidden under the discs) is still easy to
      // click to select and edit the connection.
      interactionWidth: 24,
      // Selected connection lights up bright and thick so it stands out from under the discs.
      style: { stroke: sel ? "#ffd54a" : base, strokeWidth: sel ? 4 : 2 },
    };
  });

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const typeId = event.dataTransfer.getData(DND_NODETYPE);
    if (!typeId) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const taken = new Set((useEditorStore.getState().graph?.nodes ?? []).map((n) => n.id));
    const name = uniqueZoneName(typeId, taken);
    useEditorStore.getState().addZoneOfType(name, typeId, {}, position);
    select({ kind: "zone", id: name });
  };

  return (
    <div style={{ height: "100%" }} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={null}                 // we handle Delete ourselves (see effect above)
        selectionKeyCode={null}              // Shift is our connect modifier, not RF's selection key
        connectOnClick={false}               // connections require a drag; click-then-click must not wire
        nodesDraggable={connectMode === "none"}    // default: drag moves a node...
        nodesConnectable={connectMode !== "none"}  // ...Shift/Alt: drag draws a connection
        onNodesChange={onNodesChange}
        onNodeDragStop={(_, n) => setNodePosition(n.id, n.position.x, n.position.y)}
        onNodeClick={(_, n) => select({ kind: "zone", id: n.id })}
        onEdgeClick={(_, e) => select({ kind: "connection", id: e.id })}
        onConnect={(c: RfConn) => {
          if (!c.source || !c.target || c.source === c.target) return;
          // Mode at drop time picks the type: Portal (doesn't affect layout) vs Direct road.
          const portal = useEditorStore.getState().connectMode === "portal";
          addConn(portal
            ? { from: c.source, to: c.target, connectionType: "Portal" }
            : { from: c.source, to: c.target, connectionType: "Direct", road: true });
        }}
        defaultEdgeOptions={{ type: "straight" }}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
