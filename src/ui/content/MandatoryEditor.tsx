import { Fragment, useId } from "react";
import { catalogs } from "../../core/catalogs";
import { ReferenceListField } from "../inspector/fields";
import type { ContentDef, ContentKind } from "../../core/content";

type Rule = { type?: string; args?: string[]; targetMin?: number; targetMax?: number; weight?: number };
type Item = {
  name?: string; sid?: string; variant?: number; isGuarded?: boolean; isMine?: boolean;
  soloEncounter?: boolean; includeLists?: string[]; rules?: Rule[];
};

// Distance presets (Documentation/04). A rule whose band doesn't match a preset shows as "Custom",
// which reveals the raw min/max/weight inputs (the "advanced" escape hatch).
const BANDS = [
  { label: "Next-to", min: 0.05, max: 0.1 },
  { label: "Near", min: 0.1, max: 0.25 },
  { label: "Medium", min: 0.25, max: 0.5 },
  { label: "Far", min: 0.5, max: 0.75 },
  { label: "Very far", min: 0.75, max: 0.9 },
];
const near = (a?: number, b?: number) => Math.abs((a ?? -9) - (b ?? 99)) < 0.001;
const bandFor = (min?: number, max?: number) => BANDS.find((b) => near(b.min, min) && near(b.max, max))?.label ?? "custom";
const num = (v: string): number | undefined => { const n = parseFloat(v); return Number.isFinite(n) ? n : undefined; };

function RulesEditor({ rules, onChange }: { rules: Rule[]; onChange: (r: Rule[]) => void }) {
  const setRule = (i: number, patch: Partial<Rule>) => onChange(rules.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const applyPreset = (i: number, label: string) => {
    if (label === "custom") return; // keep current min/max; advanced inputs appear
    const b = BANDS.find((x) => x.label === label)!;
    setRule(i, { targetMin: b.min, targetMax: b.max });
  };
  return (
    <div>
      <div className="ct-grid" style={{ gridTemplateColumns: "110px 70px 110px 60px 22px" }}>
        <div className="ct-head">Frame</div><div className="ct-head">Main obj #</div><div className="ct-head">Distance</div><div className="ct-head">Weight</div><div />
        {rules.map((r, i) => {
          const preset = bandFor(r.targetMin, r.targetMax);
          return (
            <Fragment key={i}>
              <select value={r.type ?? "MainObject"} onChange={(e) => setRule(i, { type: e.target.value })}>
                <option value="MainObject">Main object</option><option value="Road">Road</option><option value="Crossroads">Crossroads</option>
              </select>
              <input type="number" disabled={!!r.type && r.type !== "MainObject"} value={r.args?.[0] ?? ""}
                onChange={(e) => setRule(i, { args: [e.target.value] })} />
              <select value={preset} onChange={(e) => applyPreset(i, e.target.value)}>
                {BANDS.map((b) => <option key={b.label} value={b.label}>{b.label}</option>)}
                <option value="custom">Custom…</option>
              </select>
              <input type="number" value={r.weight ?? ""} onChange={(e) => setRule(i, { weight: num(e.target.value) })} />
              <button className="ct-iconbtn" aria-label="Remove rule" onClick={() => onChange(rules.filter((_, j) => j !== i))}>✕</button>
              {preset === "custom" && (
                <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, padding: "0 0 6px", fontSize: 11, opacity: 0.85, alignItems: "center" }}>
                  <label style={{ display: "flex", gap: 4, alignItems: "center" }}>target min
                    <input type="number" step="0.05" style={{ width: 64 }} value={r.targetMin ?? ""} onChange={(e) => setRule(i, { targetMin: num(e.target.value) })} /></label>
                  <label style={{ display: "flex", gap: 4, alignItems: "center" }}>target max
                    <input type="number" step="0.05" style={{ width: 64 }} value={r.targetMax ?? ""} onChange={(e) => setRule(i, { targetMax: num(e.target.value) })} /></label>
                  <span style={{ opacity: 0.5 }}>0 = at the reference, 1 = far</span>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
      <button className="ct-addbtn" onClick={() => onChange([...rules, { type: "MainObject", args: ["0"], targetMin: 0.1, targetMax: 0.25, weight: 1 }])}>+ Add rule</button>
    </div>
  );
}

// Editor for a mandatoryContent group: a list of guaranteed items, each a fixed SID and/or a pull
// from content lists, with guarding/mine/solo flags and placement rules.
export function MandatoryEditor({ draft, onChange, onOpenRef }:
  { draft: ContentDef; onChange: (d: ContentDef) => void; onOpenRef: (kind: ContentKind, name: string) => void }) {
  const sidsList = useId();
  const items = (draft.content as Item[] | undefined) ?? [];
  const setItems = (next: Item[]) => onChange({ ...draft, content: next });
  const setItem = (i: number, patch: Partial<Item>) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  return (
    <div>
      <div className="content-section-label">Items</div>
      {items.map((it, i) => (
        <div className="content-row" key={i}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label className="ct-field" style={{ flex: "1 1 160px" }}>Object SID
              <input list={sidsList} value={it.sid ?? ""} placeholder="(or use include lists)" onChange={(e) => setItem(i, { sid: e.target.value || undefined })} /></label>
            <label className="ct-field">Variant
              <input type="number" value={it.variant ?? ""} placeholder="none" onChange={(e) => setItem(i, { variant: num(e.target.value) })} /></label>
            <label className="ct-field">Guarding
              <select value={it.isGuarded === undefined ? "" : it.isGuarded ? "yes" : "no"}
                onChange={(e) => setItem(i, { isGuarded: e.target.value === "" ? undefined : e.target.value === "yes" })}
                style={{ padding: "4px", background: "#222", color: "#ddd", border: "1px solid #3a3a3a", borderRadius: 4 }}>
                <option value="">Default</option><option value="yes">Guarded</option><option value="no">Unguarded</option>
              </select></label>
          </div>
          <div style={{ display: "flex", gap: 14, margin: "6px 0", fontSize: 12, opacity: 0.85, alignItems: "center" }}>
            <label style={{ display: "flex", gap: 4, alignItems: "center" }}><input type="checkbox" checked={!!it.isMine} onChange={(e) => setItem(i, { isMine: e.target.checked || undefined })} />Mine</label>
            <label style={{ display: "flex", gap: 4, alignItems: "center" }}><input type="checkbox" checked={!!it.soloEncounter} onChange={(e) => setItem(i, { soloEncounter: e.target.checked || undefined })} />Solo encounter</label>
            <button className="ct-iconbtn" style={{ marginLeft: "auto" }} onClick={() => setItems(items.filter((_, j) => j !== i))}>Remove item</button>
          </div>
          <ReferenceListField label="Include lists (instead of, or with, a fixed SID)" values={it.includeLists ?? []} options={catalogs.contentLists ?? []}
            onChange={(next) => setItem(i, { includeLists: next })} onOpen={(name) => onOpenRef("lists", name)} />
          <div className="ct-head" style={{ marginTop: 6 }}>Placement rules</div>
          <RulesEditor rules={it.rules ?? []} onChange={(rules) => setItem(i, { rules })} />
        </div>
      ))}
      <button className="ct-addbtn" onClick={() => setItems([...items, { sid: "" }])}>+ Add item</button>
      <datalist id={sidsList}>{(catalogs.sids ?? []).map((s) => <option key={s} value={s} />)}</datalist>
    </div>
  );
}
