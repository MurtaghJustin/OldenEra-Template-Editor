import { useId, useState } from "react";

export function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void; }) {
  const id = useId();
  return (
    <label htmlFor={id} style={{ display: "grid", gap: 2, marginBottom: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>
      <input id={id} aria-label={label} type="number" step="any" value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  );
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void; }) {
  const id = useId();
  return (
    <label htmlFor={id} style={{ display: "grid", gap: 2, marginBottom: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>
      <input id={id} aria-label={label} type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// Editable dropdown: a text input backed by a datalist so users can pick or type a custom value.
export function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (s: string) => void; }) {
  const id = useId(); const listId = id + "-list";
  return (
    <label htmlFor={id} style={{ display: "grid", gap: 2, marginBottom: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>
      <input id={id} aria-label={label} list={listId} value={value} onChange={(e) => onChange(e.target.value)} />
      <datalist id={listId}>{options.map((o) => <option key={o} value={o} />)}</datalist>
    </label>
  );
}

// A list of string references (e.g. a zone's mandatoryContent group names): current entries shown
// as removable pills, with a combo-box (type-to-search input backed by a datalist) to add a known
// name. `onAddNew` (creating a brand-new group) is stubbed for now — the button is disabled until
// that authoring flow lands. `minWidth: 0` throughout keeps long names from widening the panel.
export function ReferenceListField({ label, values, options, onChange, onAddNew, onOpen }:
  { label: string; values: string[]; options: string[]; onChange: (next: string[]) => void; onAddNew?: () => void; onOpen?: (name: string) => void; }) {
  const id = useId(); const listId = id + "-list";
  const [draft, setDraft] = useState("");
  const available = options.filter((o) => !values.includes(o));
  const tryAdd = (v: string) => { if (available.includes(v)) { onChange([...values, v]); setDraft(""); } };
  const nameStyle = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;
  return (
    <div style={{ display: "grid", gap: 4, marginBottom: 8, minWidth: 0 }}>
      <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>
      {values.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {values.map((v) => (
            <span key={v} title={onOpen ? `Open ${v}` : v} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, maxWidth: "100%",
              background: "#2b3a1d", color: "#cfe8a0", borderRadius: 10, padding: "2px 4px 2px 8px" }}>
              {onOpen
                ? <button onClick={() => onOpen(v)} style={{ ...nameStyle, border: "none", background: "transparent", color: "#cfe8a0", cursor: "pointer", padding: 0, font: "inherit", textDecoration: "underline" }}>{v}</button>
                : <span style={nameStyle}>{v}</span>}
              <button aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}
                style={{ border: "none", background: "transparent", color: "#cfe8a0", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 12, flexShrink: 0 }}>✕</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 4, minWidth: 0 }}>
        <input id={id} list={listId} aria-label={`Add ${label}`} placeholder="Type to search…"
          value={draft} style={{ flex: 1, minWidth: 0 }}
          onChange={(e) => { setDraft(e.target.value); tryAdd(e.target.value); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); tryAdd(draft); } }} />
        <datalist id={listId}>{available.map((o) => <option key={o} value={o} />)}</datalist>
        <button type="button" disabled={!onAddNew} title={onAddNew ? "Create a new definition" : "Creating new — coming soon"}
          onClick={onAddNew} style={{ flexShrink: 0 }}>+ New</button>
      </div>
    </div>
  );
}

export function CheckboxField({ label, value, onChange }: { label: string; value: boolean; onChange: (b: boolean) => void; }) {
  const id = useId();
  return (
    <label htmlFor={id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
      <input id={id} aria-label={label} type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>
    </label>
  );
}
