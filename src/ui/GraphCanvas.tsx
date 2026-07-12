import { useEffect, useRef } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, ConnectionMode, SelectionMode, useNodesState, useReactFlow,
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

const DISC_R = 26; // half the 52px disc — node positions are top-left, edges run centre-to-centre
const INSERT_THRESHOLD = 30; // how close (flow units) a dropped node must be to a line to split it

// Distance from point P to segment A–B.
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay; const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function Flow() {
  const graph = useEditorStore((s) => s.graph);
  const select = useEditorStore((s) => s.select);
  const selection = useEditorStore((s) => s.selection);
  const addConn = useEditorStore((s) => s.addConn);
  const setNodePosition = useEditorStore((s) => s.setNodePosition);
  const connectMode = useEditorStore((s) => s.connectMode);
  const selectedZoneIds = useEditorStore((s) => s.selectedZoneIds);
  const clipboardCount = useEditorStore((s) => s.clipboard?.zones.length ?? 0);
  const { screenToFlowPosition, getViewport, setViewport } = useReactFlow();
  const paneRef = useRef<HTMLDivElement>(null);
  // After a programmatic selection change (paste/duplicate), React Flow briefly reports its OLD
  // internal selection via onSelectionChange. Ignore those events until RF catches up to the store's
  // selection — otherwise the stale event overwrites the store back to the source zones and you end
  // up dragging the originals (old names) instead of the pasted copies.
  const skipSelSync = useRef(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);

  // When a zone is selected, pan it to the centre of the VISIBLE canvas — i.e. the strip not covered
  // by the inspector slide-out (≈960px on the left) — so the node you're editing stays in view.
  useEffect(() => {
    if (selection?.kind !== "zone") return;
    const node = (useEditorStore.getState().graph?.nodes ?? []).find((n) => n.id === selection.id);
    const el = paneRef.current;
    if (!node || !el) return;
    const { width, height } = el.getBoundingClientRect();
    const cover = Math.min(960, width);                                  // inspector overlay width
    const centerX = width - cover > 120 ? (cover + width) / 2 : width / 2; // visible-strip centre
    const { zoom } = getViewport();
    const cx = node.x + 26, cy = node.y + 26;                            // disc centre (52px node)
    setViewport({ x: centerX - cx * zoom, y: height / 2 - cy * zoom, zoom }, { duration: 250 });
  }, [selection, getViewport, setViewport]);

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

  // Ctrl/Cmd + C/V/D: copy the selected zones, paste an offset copy, or duplicate (copy+paste).
  // Ignored while typing in a field so it doesn't hijack text copy/paste.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const st = useEditorStore.getState();
      const k = e.key.toLowerCase();
      if (k === "c" && st.selectedZoneIds.length) { e.preventDefault(); st.copySelection(); }
      else if (k === "v" && st.clipboard?.zones.length) { e.preventDefault(); skipSelSync.current = true; st.paste(); }
      else if (k === "d" && st.selectedZoneIds.length) { e.preventDefault(); skipSelSync.current = true; st.duplicateSelection(); }
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
    setNodes((graph?.nodes ?? []).map((n) => {
      const sel = selectedZoneIds.includes(n.id);
      return {
        id: n.id, type: "zone", position: { x: n.x, y: n.y }, selected: sel,
        data: { label: n.id, playerSlot: n.playerSlot, hasTown: n.hasTown, tier: n.tier, selected: sel },
      };
    }));
  }, [graph, selectedZoneIds, setNodes]);

  const edges: Edge[] = (graph ? displayEdges(graph) : []).map((e) => {
    const sel = selection?.kind === "connection" && selection.id === e.id;
    const portal = e.connection.connectionType === "Portal";
    const base = portal ? "#5b8fb9" : "#caa84a";
    return {
      id: e.id, source: e.from, target: e.to, type: "straight",
      // Wide invisible hit area so the thin line (mostly hidden under the discs) is still easy to
      // click to select and edit the connection.
      interactionWidth: 24,
      // A pair can hold several parallel connections (drawn as one line). Badge the count when >1 so
      // the multiplicity is visible — they may differ in guards, and are edited individually in the
      // inspector. Single connections get no badge.
      label: e.count > 1 ? `×${e.count}` : undefined,
      labelStyle: { fill: "#1e1c18", fontSize: 11, fontWeight: 700 },
      labelBgStyle: { fill: portal ? "#9ecbe8" : "#e6cf7a", fillOpacity: 0.95 },
      labelBgPadding: [5, 2] as [number, number], labelBgBorderRadius: 9,
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
    <div ref={paneRef} style={{ height: "100%", position: "relative" }} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={onDrop}>
      {selectedZoneIds.length > 0 && (
        <div style={{ position: "absolute", top: 8, left: 8, zIndex: 5, display: "flex", gap: 6, alignItems: "center",
          background: "#1e1e1e", border: "1px solid #3a3a3a", borderRadius: 6, padding: "4px 8px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
          <span style={{ opacity: 0.7 }}>{selectedZoneIds.length} zone{selectedZoneIds.length === 1 ? "" : "s"} selected</span>
          <button onClick={() => useEditorStore.getState().copySelection()} title="Copy (Ctrl+C)">Copy</button>
          <button onClick={() => { skipSelSync.current = true; useEditorStore.getState().duplicateSelection(); }} title="Duplicate (Ctrl+D)">Duplicate</button>
          {clipboardCount > 0 && <button onClick={() => { skipSelSync.current = true; useEditorStore.getState().paste(); }} title="Paste (Ctrl+V)">Paste ({clipboardCount})</button>}
        </div>
      )}
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={null}                 // we handle Delete ourselves (see effect above)
        selectionKeyCode={null}              // Shift is our connect modifier, not RF's selection key
        multiSelectionKeyCode={null}         // Shift is taken; marquee is the way to multi-select
        selectionOnDrag                      // left-drag on empty canvas draws a selection box...
        panOnDrag={[1, 2]}                   // ...so panning moves to middle/right-drag (+ scroll/Controls)
        selectionMode={SelectionMode.Partial} // a zone touching the box is selected (forgiving)
        onSelectionChange={({ nodes: sel }) => {
          const ids = sel.map((n) => n.id);
          const cur = useEditorStore.getState().selectedZoneIds;
          const same = ids.length === cur.length && ids.every((x) => cur.includes(x));
          // While a paste's programmatic selection settles, ignore RF's stale events; clear the guard
          // once RF reports the same selection the store already holds.
          if (skipSelSync.current) { if (same) skipSelSync.current = false; return; }
          if (same) return;                     // no change → avoid a render loop
          useEditorStore.getState().setSelectedZones(ids);
          if (ids.length >= 2) select(null);    // multi-select: close the single-zone inspector
        }}
        onSelectionDragStop={(_, sel) => { for (const n of sel) setNodePosition(n.id, n.position.x, n.position.y); }}
        connectOnClick={false}               // connections require a drag; click-then-click must not wire
        nodesDraggable={connectMode === "none"}    // default: drag moves a node...
        nodesConnectable={connectMode !== "none"}  // ...Shift/Alt: drag draws a connection
        onNodesChange={onNodesChange}
        onNodeDragStop={(_, n) => {
          setNodePosition(n.id, n.position.x, n.position.y);
          // If an UNCONNECTED node is dropped onto a road connection, split it: A↔B → A↔node↔B.
          const g = useEditorStore.getState().graph; if (!g) return;
          const hasRoad = g.edges.some((e) => e.connection.connectionType !== "Proximity" && (e.from === n.id || e.to === n.id));
          if (hasRoad) return;
          const cx = n.position.x + DISC_R, cy = n.position.y + DISC_R;
          const center = (id: string) => { const nn = g.nodes.find((x) => x.id === id); return nn ? { x: nn.x + DISC_R, y: nn.y + DISC_R } : null; };
          let best: string | null = null, bestD = INSERT_THRESHOLD;
          for (const e of displayEdges(g)) {
            const t = e.connection.connectionType;
            if ((t !== "Direct" && t !== "Default") || e.from === n.id || e.to === n.id) continue; // road only
            const a = center(e.from), b = center(e.to); if (!a || !b) continue;
            const d = distToSegment(cx, cy, a.x, a.y, b.x, b.y);
            if (d < bestD) { bestD = d; best = e.id; }
          }
          if (best) useEditorStore.getState().insertNodeOnConnection(n.id, best);
        }}
        onSelectionStart={() => { skipSelSync.current = false; }} // a fresh user box-select always registers
        onNodeClick={(_, n) => { skipSelSync.current = false; select({ kind: "zone", id: n.id }); }}
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
