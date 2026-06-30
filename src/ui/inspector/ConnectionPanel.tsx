import { useState } from "react";
import { useEditorStore } from "../../state/store";
import { connectionsForPair } from "../../core/graph";
import { CONNECTION_TYPES, type Connection } from "../../core/types";
import { NumberField, SelectField, CheckboxField } from "./fields";

export function ConnectionPanel({ connId }: { connId: string }) {
  const root = useEditorStore((s) => s.root);
  const vi = useEditorStore((s) => s.variantIndex);
  const removeConn = useEditorStore((s) => s.removeConn);
  const addConn = useEditorStore((s) => s.addConn);
  const select = useEditorStore((s) => s.select);
  const refresh = useEditorStore((s) => s.refresh);
  // All parallel connections of this pair — a "wide" link is stored as several connections between
  // the same two zones (collapsed to one drawn line). Proximity hints aren't part of this: they're
  // not drawn and carry no guards. The component is keyed by connId, so this state resets per link.
  const group = root ? connectionsForPair(root, vi, connId).filter((c) => c.connectionType !== "Proximity") : [];
  const [sel, setSel] = useState(() => Math.max(0, group.findIndex((c) => c.name === connId)));
  const [matchAll, setMatchAll] = useState(false);
  if (!root || group.length === 0) return null;

  const idx = Math.min(sel, group.length - 1);
  const conn = group[idx];
  // Edit just the selected connection — or, with "Match all" on, every parallel connection of the
  // pair at once (they're usually meant to be identical, but can legitimately differ in guards).
  const set = (patch: Record<string, unknown>) => {
    for (const c of matchAll ? group : [conn]) Object.assign(c, patch);
    useEditorStore.setState({ dirty: true }); refresh();
  };

  // Add another parallel connection between the same two zones, cloned from the selected one (so it
  // starts identical, then you tweak it). Names must stay unique so each is individually selectable.
  const addParallel = () => {
    const taken = new Set(root.variants[vi].connections.map((c) => c.name).filter(Boolean));
    let k = group.length + 1, name = `${conn.from}-${conn.to}-${k}`;
    while (taken.has(name)) name = `${conn.from}-${conn.to}-${++k}`;
    addConn({ ...structuredClone(conn), name } as Connection);
    setSel(group.length); // the appended connection becomes the new last group member
  };

  // Delete just the selected connection (not the whole pair). If it was the one the selection points
  // at, re-point to a surviving connection of the pair so the panel stays put; else clear.
  const deleteSelected = () => {
    const conns = root.variants[vi].connections;
    const i = conns.indexOf(conn);
    if (i >= 0) conns.splice(i, 1);
    if (connectionsForPair(root, vi, connId).length === 0) {
      const samePair = (c: Connection) =>
        c.connectionType !== "Proximity" &&
        ((c.from === conn.from && c.to === conn.to) || (c.from === conn.to && c.to === conn.from));
      const survivor = conns.find(samePair);
      if (survivor) select({ kind: "connection", id: survivor.name || `${survivor.from}-${survivor.to}-${conns.indexOf(survivor)}` });
      else useEditorStore.setState({ selection: null });
    }
    setSel(Math.max(0, idx - 1)); // step to the previous parallel (ignored if the selection re-pointed)
    useEditorStore.setState({ dirty: true }); refresh();
  };

  return (
    <div>
      <h3>Connection</h3>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{conn.from} → {conn.to}</div>

      {group.length > 1 && (
        <div style={{ marginBottom: 12, padding: 8, border: "1px solid #2e2e2e", borderRadius: 6, display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{group.length} parallel connections</div>
          <label style={{ display: "grid", gap: 2 }}>
            <span style={{ fontSize: 11, opacity: 0.7 }}>Editing</span>
            <select aria-label="Connection to edit" value={idx} disabled={matchAll}
              onChange={(e) => setSel(Number(e.target.value))}>
              {group.map((c, i) => (
                <option key={i} value={i}>
                  {`#${i + 1}${c.name ? " · " + c.name : ""} — ${c.connectionType}, guard ${c.guardValue ?? 0}`}
                </option>
              ))}
            </select>
          </label>
          <CheckboxField label="Match all connections" value={matchAll} onChange={setMatchAll}
            hint="Apply every edit below to all of this pair's parallel connections at once, instead of just the selected one." />
        </div>
      )}

      <SelectField label="Type" value={conn.connectionType} options={[...CONNECTION_TYPES]}
        hint="Direct/Default = road; Portal = teleport (doesn't affect layout); Proximity = adjacency hint only."
        onChange={(val) => set({ connectionType: val })} />
      <NumberField label="Guard value" value={conn.guardValue ?? 0} onChange={(n) => set({ guardValue: n })}
        hint="Strength of the border guard army on this connection." />
      <NumberField label="Guard weekly increment" value={conn.guardWeeklyIncrement ?? 0} onChange={(n) => set({ guardWeeklyIncrement: n })}
        hint="Compounding weekly guard growth (0.10 = +10% per week)." />
      <CheckboxField label="Road" value={!!conn.road} onChange={(b) => set({ road: b })}
        hint="Whether a visible road is drawn along the connection." />

      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={addParallel} title="Add another connection between these two zones">+ Add parallel connection</button>
        <button style={{ color: "#e88" }} onClick={deleteSelected}>
          {group.length > 1 ? "Delete this connection" : "Delete connection"}
        </button>
        {group.length > 1 && (
          <button style={{ color: "#e88", opacity: 0.85 }} onClick={() => removeConn(connId)}>Delete all {group.length}</button>
        )}
      </div>
    </div>
  );
}
