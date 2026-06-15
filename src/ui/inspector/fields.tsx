import { useId } from "react";

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

export function CheckboxField({ label, value, onChange }: { label: string; value: boolean; onChange: (b: boolean) => void; }) {
  const id = useId();
  return (
    <label htmlFor={id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
      <input id={id} aria-label={label} type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontSize: 12, opacity: 0.7 }}>{label}</span>
    </label>
  );
}
