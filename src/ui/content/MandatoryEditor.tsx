import { Fragment, useState } from "react";
import { catalogs, objectName } from "../../core/catalogs";
import { ReferenceListField, VariantField } from "../inspector/fields";
import { Combobox } from "../Combobox";
import { objectComboProps } from "../objectPickerProps";
import { ColHead, HintMark } from "./ColHead";
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
  // Which rows are pinned to "Custom" mode. The preset is otherwise derived from min/max, so a row
  // whose band matches a preset still needs this to stay in custom mode when the user picks it.
  const [customRows, setCustomRows] = useState<Set<number>>(() => new Set());
  const setRule = (i: number, patch: Partial<Rule>) => onChange(rules.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const applyPreset = (i: number, label: string) => {
    if (label === "custom") { setCustomRows((s) => new Set(s).add(i)); return; }
    setCustomRows((s) => { const n = new Set(s); n.delete(i); return n; });
    const b = BANDS.find((x) => x.label === label)!;
    setRule(i, { targetMin: b.min, targetMax: b.max });
  };
  const removeRule = (i: number) => {
    onChange(rules.filter((_, j) => j !== i));
    setCustomRows((s) => { const n = new Set<number>(); s.forEach((x) => { if (x < i) n.add(x); else if (x > i) n.add(x - 1); }); return n; });
  };
  return (
    <div>
      <div className="ct-grid" style={{ gridTemplateColumns: "110px 70px 110px 60px 22px" }}>
        <ColHead label="Frame" hint="Reference point the distance is measured from." />
        <ColHead label="Main obj #" hint="Index of the main object to measure from (for the Main object frame)." />
        <ColHead label="Distance" hint="Target distance band from the reference (Next-to … Very far, or Custom)." />
        <ColHead label="Weight" hint="Relative importance when several rules combine." />
        <div />
        {rules.map((r, i) => {
          // A row is custom if the user chose Custom, or its stored band doesn't match any preset.
          const custom = customRows.has(i) || bandFor(r.targetMin, r.targetMax) === "custom";
          return (
            <Fragment key={i}>
              <select value={r.type ?? "MainObject"} onChange={(e) => setRule(i, { type: e.target.value })}>
                <option value="MainObject">Main object</option><option value="Road">Road</option><option value="Crossroads">Crossroads</option>
              </select>
              <input type="number" disabled={!!r.type && r.type !== "MainObject"} value={r.args?.[0] ?? ""}
                onChange={(e) => setRule(i, { args: [e.target.value] })} />
              <select aria-label="Distance preset" value={custom ? "custom" : bandFor(r.targetMin, r.targetMax)} onChange={(e) => applyPreset(i, e.target.value)}>
                {BANDS.map((b) => <option key={b.label} value={b.label}>{b.label}</option>)}
                <option value="custom">Custom…</option>
              </select>
              <input type="number" value={r.weight ?? ""} onChange={(e) => setRule(i, { weight: num(e.target.value) })} />
              <button className="ct-iconbtn" aria-label="Remove rule" onClick={() => removeRule(i)}>✕</button>
              {custom && (
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
  const items = (draft.content as Item[] | undefined) ?? [];
  const setItems = (next: Item[]) => onChange({ ...draft, content: next });
  const setItem = (i: number, patch: Partial<Item>) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  return (
    <div>
      <div className="content-section-label">Items</div>
      {items.map((it, i) => (
        <div className="content-row" key={i}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="ct-field" style={{ flex: "1 1 160px" }}>Object<HintMark hint="Object guaranteed in the zone — or leave blank and use include lists." />
              <Combobox value={it.sid ?? ""} options={catalogs.sids ?? []} labelFor={objectName} {...objectComboProps} ariaLabel="Object" placeholder="(or use include lists)"
                onChange={(v) => setItem(i, { sid: v || undefined })} /></div>
            <label className="ct-field">Variant<HintMark hint="Object sub-type; named for utopias/pandora/etc., -1 = any, blank = none." />
              <VariantField sid={it.sid} value={it.variant} ariaLabel="Variant" onChange={(v) => setItem(i, { variant: v })} /></label>
            <label className="ct-field">Guarding<HintMark hint="Force this item guarded or unguarded (Default = the pool decides)." />
              <select value={it.isGuarded === undefined ? "" : it.isGuarded ? "yes" : "no"}
                onChange={(e) => setItem(i, { isGuarded: e.target.value === "" ? undefined : e.target.value === "yes" })}>
                <option value="">Default</option><option value="yes">Guarded</option><option value="no">Unguarded</option>
              </select></label>
          </div>
          <div style={{ display: "flex", gap: 14, margin: "6px 0", fontSize: 12, opacity: 0.85, alignItems: "center" }}>
            <label style={{ display: "flex", gap: 4, alignItems: "center" }} title="Treat this object as a resource mine."><input type="checkbox" checked={!!it.isMine} onChange={(e) => setItem(i, { isMine: e.target.checked || undefined })} />Mine</label>
            <label style={{ display: "flex", gap: 4, alignItems: "center" }} title="Place this object alone, not clustered with other content."><input type="checkbox" checked={!!it.soloEncounter} onChange={(e) => setItem(i, { soloEncounter: e.target.checked || undefined })} />Solo encounter</label>
            <button className="ct-iconbtn" style={{ marginLeft: "auto" }} onClick={() => setItems(items.filter((_, j) => j !== i))}>Remove item</button>
          </div>
          <ReferenceListField label="Include lists (instead of, or with, a fixed SID)"
            hint="Pull one object per list mention; repeat a list to request several."
            values={it.includeLists ?? []} options={catalogs.contentLists ?? []}
            onChange={(next) => setItem(i, { includeLists: next })} onOpen={(name) => onOpenRef("lists", name)} />
          <div style={{ marginTop: 6 }}><ColHead label="Placement rules" hint="Constrain where the object spawns relative to a reference point." /></div>
          <RulesEditor rules={it.rules ?? []} onChange={(rules) => setItem(i, { rules })} />
        </div>
      ))}
      <button className="ct-addbtn" onClick={() => setItems([...items, { sid: "" }])}>+ Add item</button>
    </div>
  );
}
