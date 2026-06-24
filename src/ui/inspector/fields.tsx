import { useId, useState } from "react";
import { Combobox } from "../Combobox";
import { SELECTOR_TYPES, type Selector } from "../../core/types";

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

// Editable dropdown: a type-to-search combo-box that lets users pick a known value or type a custom
// one. Uses the shared Combobox so opening an already-filled field shows the full option list.
export function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (s: string) => void; }) {
  return (
    <div style={{ display: "grid", gap: 2, marginBottom: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>
      <Combobox value={value} options={options} onChange={onChange} ariaLabel={label} />
    </div>
  );
}

// A list of string references (e.g. a zone's mandatoryContent group names): current entries shown
// as removable pills, with a combo-box (type-to-search) to add a known name. `onAddNew` (creating a
// brand-new group) is disabled until a handler is supplied. `minWidth: 0` throughout keeps long
// names from widening the panel.
export function ReferenceListField({ label, values, options, onChange, onAddNew, onOpen }:
  { label: string; values: string[]; options: string[]; onChange: (next: string[]) => void; onAddNew?: () => void; onOpen?: (name: string) => void; }) {
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
      <div style={{ display: "flex", gap: 4, minWidth: 0, alignItems: "stretch" }}>
        <Combobox value={draft} options={available} ariaLabel={`Add ${label}`} placeholder="Type to search…"
          onChange={(v) => { setDraft(v); tryAdd(v); }} onSelect={tryAdd} />
        <button type="button" disabled={!onAddNew} title={onAddNew ? "Create a new definition" : "Creating new — coming soon"}
          onClick={onAddNew} style={{ flexShrink: 0 }}>+ New</button>
      </div>
    </div>
  );
}

// A closed-set native dropdown (no free typing) — for enums like player slot, placement, type.
export function EnumField({ label, value, options, onChange, allowNone }:
  { label: string; value: string; options: readonly string[]; onChange: (v: string) => void; allowNone?: boolean; }) {
  const id = useId();
  return (
    <label htmlFor={id} style={{ display: "grid", gap: 2, marginBottom: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>
      <select id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {allowNone && <option value="">(none)</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

// A Selector ({type, args}) editor: a type dropdown plus a free, add/removable list of string args
// (faction names, indices, zone names…). `argOptions` provides type-ahead suggestions for the args.
export function SelectorField({ label, value, onChange, argOptions }:
  { label: string; value?: Selector; onChange: (s: Selector) => void; argOptions?: string[]; }) {
  const id = useId(); const listId = id + "-args";
  const sel: Selector = value ?? { type: "FromList", args: [] };
  const setArgs = (args: string[]) => onChange({ ...sel, args });
  return (
    <div style={{ display: "grid", gap: 2, marginBottom: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
        <select aria-label={`${label} type`} value={sel.type} onChange={(e) => onChange({ ...sel, type: e.target.value as Selector["type"] })} style={{ flex: "0 0 140px" }}>
          {SELECTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {sel.args.map((a, i) => (
          <span key={i} style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
            <input list={listId} value={a} style={{ width: 110 }} onChange={(e) => setArgs(sel.args.map((x, j) => (j === i ? e.target.value : x)))} />
            <button aria-label="Remove arg" onClick={() => setArgs(sel.args.filter((_, j) => j !== i))}
              style={{ border: "none", background: "transparent", color: "#e88", cursor: "pointer", padding: 0 }}>✕</button>
          </span>
        ))}
        <button type="button" onClick={() => setArgs([...sel.args, ""])}>+ arg</button>
      </div>
      <datalist id={listId}>{(argOptions ?? []).map((o) => <option key={o} value={o} />)}</datalist>
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
