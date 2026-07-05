import { Fragment } from "react";
import { catalogs, objectName } from "../../core/catalogs";
import { Combobox } from "../Combobox";
import { objectComboProps } from "../objectPickerProps";
import { VariantField } from "../inspector/fields";
import { ColHead, HintMark } from "./ColHead";
import type { ContentDef } from "../../core/content";

type Limit = { sid?: string; variant?: number; maxCount?: number };

const num = (v: string): number | undefined => { const n = parseFloat(v); return Number.isFinite(n) ? n : undefined; };

// Editor for a contentCountLimits cap-set: optional player-count gating + a table of per-SID caps.
export function CountLimitsEditor({ draft, onChange }: { draft: ContentDef; onChange: (d: ContentDef) => void }) {
  const limits = (draft.limits as Limit[] | undefined) ?? [];
  const setLimits = (next: Limit[]) => onChange({ ...draft, limits: next });
  const setLimit = (i: number, patch: Partial<Limit>) => setLimits(limits.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div>
      <div className="ct-playerrow">
        <label className="ct-field">Player min<HintMark hint="Only apply this cap-set at or above this player count; blank = any." />
          <input type="number" value={(draft.playerMin as number | null) ?? ""}
            onChange={(e) => onChange({ ...draft, playerMin: e.target.value === "" ? null : (num(e.target.value) ?? null) })} /></label>
        <label className="ct-field">Player max<HintMark hint="Only apply this cap-set at or below this player count; blank = any." />
          <input type="number" value={(draft.playerMax as number | null) ?? ""}
            onChange={(e) => onChange({ ...draft, playerMax: e.target.value === "" ? null : (num(e.target.value) ?? null) })} /></label>
        <span style={{ fontSize: 11, opacity: 0.5, paddingBottom: 4 }}>blank = applies to any player count</span>
      </div>

      <div className="content-section-label">Limits</div>
      <div className="ct-grid" style={{ gridTemplateColumns: "minmax(0,1fr) 72px 72px 22px" }}>
        <ColHead label="Object" hint="Object the cap applies to." />
        <ColHead label="Variant" hint="Variant the cap applies to; blank/-1 = any." />
        <ColHead label="Max" hint="Maximum occurrences allowed in the zone." />
        <div />
        {limits.map((l, i) => (
          <Fragment key={i}>
            <Combobox value={l.sid ?? ""} options={catalogs.sids ?? []} labelFor={objectName} {...objectComboProps} ariaLabel="Object" placeholder="search objects…"
              onChange={(v) => setLimit(i, { sid: v })} />
            <VariantField sid={l.sid} value={l.variant} ariaLabel="Variant" onChange={(v) => setLimit(i, { variant: v })} />
            <input type="number" value={l.maxCount ?? ""} onChange={(e) => setLimit(i, { maxCount: num(e.target.value) })} />
            <button className="ct-iconbtn" aria-label="Remove limit" onClick={() => setLimits(limits.filter((_, j) => j !== i))}>✕</button>
          </Fragment>
        ))}
      </div>
      <button className="ct-addbtn" onClick={() => setLimits([...limits, { sid: "", maxCount: 1 }])}>+ Add limit</button>
    </div>
  );
}
