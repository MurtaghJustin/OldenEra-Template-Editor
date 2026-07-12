import { useId, useState } from "react";
import { Combobox } from "../Combobox";
import { variantsFor } from "../../core/variants";

// A field label with an optional info marker — hover the ⓘ for a documentation-sourced tooltip.
// The marker is aria-hidden so it never alters a control's accessible name (tests/screen readers).
function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span style={{ fontSize: 12, opacity: 0.7 }}>
      {label}
      {hint && <span aria-hidden title={hint} style={{ marginLeft: 4, opacity: 0.65, cursor: "help" }}>ⓘ</span>}
    </span>
  );
}

export function NumberField({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint?: string; }) {
  const id = useId();
  return (
    <label htmlFor={id} style={{ display: "grid", gap: 2, marginBottom: 6 }}>
      <FieldLabel label={label} hint={hint} />
      <input id={id} aria-label={label} type="number" step="any" value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  );
}

export function TextField({ label, value, onChange, hint }: { label: string; value: string; onChange: (s: string) => void; hint?: string; }) {
  const id = useId();
  return (
    <label htmlFor={id} style={{ display: "grid", gap: 2, marginBottom: 6 }}>
      <FieldLabel label={label} hint={hint} />
      <input id={id} aria-label={label} type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// Editable dropdown: a type-to-search combo-box that lets users pick a known value or type a custom
// one. Uses the shared Combobox so opening an already-filled field shows the full option list.
export function SelectField({ label, value, options, onChange, hint, labelFor }: { label: string; value: string; options: string[]; onChange: (s: string) => void; hint?: string; labelFor?: (v: string) => string; }) {
  return (
    <div style={{ display: "grid", gap: 2, marginBottom: 6 }}>
      <FieldLabel label={label} hint={hint} />
      <Combobox value={value} options={options} onChange={onChange} ariaLabel={label} labelFor={labelFor} />
    </div>
  );
}

// A list of string references (e.g. a zone's mandatoryContent group names): current entries shown
// as removable pills, with a combo-box (type-to-search) to add a known name. `onAddNew` (creating a
// brand-new group) is disabled until a handler is supplied. `minWidth: 0` throughout keeps long
// names from widening the panel.
export function ReferenceListField({ label, values, options, onChange, onAddNew, onOpen, hint }:
  { label: string; values: string[]; options: string[]; onChange: (next: string[]) => void; onAddNew?: () => void; onOpen?: (name: string) => void; hint?: string; }) {
  const [draft, setDraft] = useState("");
  const available = options.filter((o) => !values.includes(o));
  const tryAdd = (v: string) => { if (available.includes(v)) { onChange([...values, v]); setDraft(""); } };
  const nameStyle = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;
  return (
    <div style={{ display: "grid", gap: 4, marginBottom: 8, minWidth: 0 }}>
      <FieldLabel label={label} hint={hint} />
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
export function EnumField({ label, value, options, onChange, allowNone, hint }:
  { label: string; value: string; options: readonly string[]; onChange: (v: string) => void; allowNone?: boolean; hint?: string; }) {
  const id = useId();
  return (
    <label htmlFor={id} style={{ display: "grid", gap: 2, marginBottom: 6 }}>
      <FieldLabel label={label} hint={hint} />
      <select id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {allowNone && <option value="">(none)</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

// The six guard-reaction weights (tier 0 = always fight … tier 5 = always join). Shown as six
// labeled inputs with each tier's % share, instead of an error-prone comma-separated text field.
export function ReactionDistributionField({ label, value, onChange, hint }:
  { label: string; value: number[]; onChange: (v: number[]) => void; hint?: string; }) {
  const w = Array.from({ length: 6 }, (_, i) => value[i] ?? 0);
  const sum = w.reduce((a, b) => a + b, 0);
  const set = (i: number, n: number) => onChange(w.map((x, j) => (j === i ? n : x)));
  return (
    <div style={{ marginBottom: 8 }}>
      <FieldLabel label={label} hint={hint} />
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
        {w.map((x, i) => (
          <div key={i} style={{ flex: 1, display: "grid", gap: 2, textAlign: "center" }}>
            <span style={{ fontSize: 10, opacity: 0.6 }}>T{i}{i === 0 ? " · fight" : i === 5 ? " · join" : ""}</span>
            <input type="number" min={0} step="any" aria-label={`${label} tier ${i}`} value={x}
              style={{ textAlign: "center" }} onChange={(e) => set(i, parseFloat(e.target.value) || 0)} />
            <span style={{ fontSize: 10, opacity: 0.5 }}>{sum ? Math.round((x / sum) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Variant picker for an object. When the object has named variants (dragon utopia, pandora box,
// monty hall) it's a dropdown of "Any / 0: Name / …"; otherwise a plain number input. An existing
// value outside the known set (e.g. pandora variant 45) is preserved as an "(unknown)" option.
export function VariantField({ sid, value, onChange, ariaLabel }: { sid?: string; value?: number; onChange: (v: number | undefined) => void; ariaLabel?: string }) {
  const opts = variantsFor(sid);
  if (opts.length === 0) {
    return <input type="number" aria-label={ariaLabel} value={value ?? ""} placeholder="none"
      onChange={(e) => { const n = parseInt(e.target.value, 10); onChange(Number.isFinite(n) ? n : undefined); }} />;
  }
  const known = new Set(opts.map((o) => o.value));
  return (
    <select aria-label={ariaLabel} value={value === undefined ? "" : String(value)}
      onChange={(e) => onChange(e.target.value === "" ? undefined : parseInt(e.target.value, 10))}>
      <option value="">(none)</option>
      <option value="-1">Any</option>
      {value !== undefined && value !== -1 && !known.has(value) && <option value={value}>{value}: (unknown)</option>}
      {opts.map((o) => <option key={o.value} value={o.value}>{o.value}: {o.label}</option>)}
    </select>
  );
}

export function CheckboxField({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (b: boolean) => void; hint?: string; }) {
  const id = useId();
  return (
    <label htmlFor={id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
      <input id={id} aria-label={label} type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <FieldLabel label={label} hint={hint} />
    </label>
  );
}
