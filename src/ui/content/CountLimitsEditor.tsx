import { Fragment, useId } from "react";
import { catalogs } from "../../core/catalogs";
import type { ContentDef } from "../../core/content";

type Limit = { sid?: string; variant?: number; maxCount?: number };

const num = (v: string): number | undefined => { const n = parseFloat(v); return Number.isFinite(n) ? n : undefined; };

// Editor for a contentCountLimits cap-set: optional player-count gating + a table of per-SID caps.
export function CountLimitsEditor({ draft, onChange }: { draft: ContentDef; onChange: (d: ContentDef) => void }) {
  const sidsList = useId();
  const limits = (draft.limits as Limit[] | undefined) ?? [];
  const setLimits = (next: Limit[]) => onChange({ ...draft, limits: next });
  const setLimit = (i: number, patch: Partial<Limit>) => setLimits(limits.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div>
      <div className="ct-playerrow">
        <label className="ct-field">Player min
          <input type="number" value={(draft.playerMin as number | null) ?? ""}
            onChange={(e) => onChange({ ...draft, playerMin: e.target.value === "" ? null : (num(e.target.value) ?? null) })} /></label>
        <label className="ct-field">Player max
          <input type="number" value={(draft.playerMax as number | null) ?? ""}
            onChange={(e) => onChange({ ...draft, playerMax: e.target.value === "" ? null : (num(e.target.value) ?? null) })} /></label>
        <span style={{ fontSize: 11, opacity: 0.5, paddingBottom: 4 }}>blank = applies to any player count</span>
      </div>

      <div className="content-section-label">Limits</div>
      <div className="ct-grid" style={{ gridTemplateColumns: "minmax(0,1fr) 72px 72px 22px" }}>
        <div className="ct-head">Object SID</div><div className="ct-head">Variant</div><div className="ct-head">Max</div><div />
        {limits.map((l, i) => (
          <Fragment key={i}>
            <input list={sidsList} value={l.sid ?? ""} placeholder="search SIDs…" onChange={(e) => setLimit(i, { sid: e.target.value })} />
            <input type="number" value={l.variant ?? ""} placeholder="any" onChange={(e) => setLimit(i, { variant: num(e.target.value) })} />
            <input type="number" value={l.maxCount ?? ""} onChange={(e) => setLimit(i, { maxCount: num(e.target.value) })} />
            <button className="ct-iconbtn" aria-label="Remove limit" onClick={() => setLimits(limits.filter((_, j) => j !== i))}>✕</button>
          </Fragment>
        ))}
      </div>
      <datalist id={sidsList}>{(catalogs.sids ?? []).map((s) => <option key={s} value={s} />)}</datalist>
      <button className="ct-addbtn" onClick={() => setLimits([...limits, { sid: "", maxCount: 1 }])}>+ Add limit</button>
    </div>
  );
}
