import { useEditorStore } from "../../state/store";
import { connectionsForPair } from "../../core/graph";
import { CONNECTION_TYPES } from "../../core/types";
import { NumberField, SelectField, CheckboxField } from "./fields";

export function ConnectionPanel({ connId }: { connId: string }) {
  const root = useEditorStore((s) => s.root);
  const vi = useEditorStore((s) => s.variantIndex);
  const removeConn = useEditorStore((s) => s.removeConn);
  const refresh = useEditorStore((s) => s.refresh);
  const v = root?.variants[vi];
  const conn = v?.connections.find((c, i) => (c.name || `${c.from}-${c.to}-${i}`) === connId);
  if (!root || !conn) return null;
  // A displayed connection is one logical link; the template may store it as several duplicate
  // records. Apply edits to every record of the pair so they stay consistent.
  const set = (patch: Record<string, unknown>) => {
    for (const c of connectionsForPair(root, vi, connId)) Object.assign(c, patch);
    useEditorStore.setState({ dirty: true }); refresh();
  };

  return (
    <div>
      <h3>Connection</h3>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{conn.from} → {conn.to}</div>
      <SelectField label="Type" value={conn.connectionType} options={[...CONNECTION_TYPES]}
        hint="Direct/Default = road; Portal = teleport (doesn't affect layout); Proximity = adjacency hint only."
        onChange={(val) => set({ connectionType: val })} />
      <NumberField label="Guard value" value={conn.guardValue ?? 0} onChange={(n) => set({ guardValue: n })}
        hint="Strength of the border guard army on this connection." />
      <NumberField label="Guard weekly increment" value={conn.guardWeeklyIncrement ?? 0} onChange={(n) => set({ guardWeeklyIncrement: n })}
        hint="Compounding weekly guard growth (0.10 = +10% per week)." />
      <CheckboxField label="Road" value={!!conn.road} onChange={(b) => set({ road: b })}
        hint="Whether a visible road is drawn along the connection." />
      <button style={{ marginTop: 12, color: "#e88" }} onClick={() => removeConn(connId)}>Delete connection</button>
    </div>
  );
}
