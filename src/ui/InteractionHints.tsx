import { useEditorStore } from "../state/store";

// Compact legend in the RHS dock describing the drag interaction model, with the row matching the
// currently-held modifier highlighted so the active mode is obvious.
export function InteractionHints() {
  const connectMode = useEditorStore((s) => s.connectMode);
  const activeRow = connectMode === "none" ? "move" : connectMode;

  const rows: { key: string; keys: string; label: string }[] = [
    { key: "move", keys: "Drag", label: "Move node" },
    { key: "direct", keys: "Shift + Drag", label: "Connect (Direct)" },
    { key: "portal", keys: "Alt + Drag", label: "Connect (Portal)" },
  ];

  // Selection / clipboard: not modifier-driven, so shown as a static second group.
  const selectRows = [
    { keys: "Drag (empty)", label: "Select box" },
    { keys: "Right-drag", label: "Pan" },
    { keys: "Ctrl C / V / D", label: "Copy / Paste / Duplicate" },
  ];

  const kbd = { fontSize: 10, fontFamily: "monospace", padding: "1px 6px", borderRadius: 4, border: "1px solid #444", background: "#1c1c1c", whiteSpace: "nowrap" } as const;

  return (
    <div style={{ borderBottom: "1px solid #333", padding: 8, flexShrink: 0 }}>
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Drag between nodes
      </div>
      {rows.map((r) => {
        const active = r.key === activeRow;
        return (
          <div key={r.key} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "2px 4px", borderRadius: 4,
            background: active ? "#2b3a1d" : "transparent", color: active ? "#cfe8a0" : "#bbb",
          }}>
            <kbd style={kbd}>{r.keys}</kbd>
            <span style={{ fontSize: 12 }}>{r.label}</span>
          </div>
        );
      })}
      <div style={{ fontSize: 11, opacity: 0.6, margin: "8px 0 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Select &amp; copy
      </div>
      {selectRows.map((r) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px", color: "#bbb" }}>
          <kbd style={kbd}>{r.keys}</kbd>
          <span style={{ fontSize: 12 }}>{r.label}</span>
        </div>
      ))}
    </div>
  );
}
