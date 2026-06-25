import { Fragment } from "react";
import { catalogs, objectName } from "../../core/catalogs";
import { Combobox } from "../Combobox";
import { ColHead } from "../content/ColHead";

// Root valueOverrides: per-object guard-value overrides applied wherever that object spawns.
type Override = { sid?: string; variant?: number; guardValue?: number };
const num = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

export function ValueOverridesEditor({ overrides, onChange }: { overrides: Override[]; onChange: (o: Override[]) => void }) {
  const set = (i: number, patch: Partial<Override>) => onChange(overrides.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  return (
    <div>
      {overrides.length === 0 && <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>No overrides.</div>}
      <div className="ct-grid" style={{ gridTemplateColumns: "minmax(0,1fr) 80px 110px 22px" }}>
        <ColHead label="Object" hint="Object whose guard value is overridden, wherever it spawns on the map." />
        <ColHead label="Variant" hint="Must match the object's concrete variant — unlike elsewhere, -1 is NOT a wildcard here." />
        <ColHead label="Guard value" hint="Overriding guard-army strength." />
        <div />
        {overrides.map((o, i) => (
          <Fragment key={i}>
            <Combobox value={o.sid ?? ""} options={catalogs.sids ?? []} labelFor={objectName} ariaLabel="Override object" placeholder="search objects…"
              onChange={(v) => set(i, { sid: v })} />
            <input type="number" value={o.variant ?? ""} onChange={(e) => set(i, { variant: num(e.target.value) })} />
            <input type="number" value={o.guardValue ?? ""} onChange={(e) => set(i, { guardValue: num(e.target.value) })} />
            <button className="ct-iconbtn" aria-label="Remove override" onClick={() => onChange(overrides.filter((_, j) => j !== i))}>✕</button>
          </Fragment>
        ))}
      </div>
      <button className="ct-addbtn" onClick={() => onChange([...overrides, { sid: "", variant: 0, guardValue: 0 }])}>+ Add override</button>
    </div>
  );
}
