import { Fragment } from "react";
import { catalogs, objectName } from "../../core/catalogs";
import { ReferenceListField } from "../inspector/fields";
import { Combobox } from "../Combobox";
import { ColHead, HintMark } from "./ColHead";
import type { ContentDef, ContentKind } from "../../core/content";

type ContentEntry = { sid?: string; weight?: number; variant?: number };
type Group = { weight?: number; includeLists?: string[]; content?: ContentEntry[] };
type Ban = { sid?: string };
type ValueDist = { priceBounds?: number[]; weights?: number[] };

const num = (v: string): number | undefined => { const n = parseFloat(v); return Number.isFinite(n) ? n : undefined; };

// A short row of number inputs (used for the value-distribution buckets).
function NumberRow({ values, onChange, fixedLen }: { values: number[]; onChange: (v: number[]) => void; fixedLen?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
      {values.map((v, i) => (
        <span key={i} style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
          <input type="number" style={{ width: 72 }}
            value={Number.isFinite(v) ? v : ""} onChange={(e) => onChange(values.map((x, j) => (j === i ? (num(e.target.value) ?? 0) : x)))} />
          {!fixedLen && <button className="ct-iconbtn" aria-label="Remove" onClick={() => onChange(values.filter((_, j) => j !== i))}>✕</button>}
        </span>
      ))}
      {!fixedLen && <button onClick={() => onChange([...values, 0])}>+</button>}
    </div>
  );
}

// Editor for a contentPools definition: optional value-tier bias, weighted groups (each combining
// content-list references + inline objects), and bans. Group include-lists drill through to the
// list editor via onOpenRef.
export function PoolEditor({ draft, onChange, onOpenRef }:
  { draft: ContentDef; onChange: (d: ContentDef) => void; onOpenRef: (kind: ContentKind, name: string) => void }) {
  const groups = (draft.groups as Group[] | undefined) ?? [];
  const bans = (draft.bans as Ban[] | undefined) ?? [];
  const vd = draft.valueDistribution as ValueDist | undefined;

  const setGroups = (next: Group[]) => onChange({ ...draft, groups: next });
  const setGroup = (i: number, patch: Partial<Group>) => setGroups(groups.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const setBans = (next: Ban[]) => onChange({ ...draft, bans: next });
  const setBounds = (bounds: number[]) => {
    const w = (vd?.weights ?? []).slice();              // weights must be one longer than bounds
    while (w.length < bounds.length + 1) w.push(0);
    w.length = bounds.length + 1;
    onChange({ ...draft, valueDistribution: { priceBounds: bounds, weights: w } });
  };

  return (
    <div>
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, opacity: 0.85, margin: "4px 0" }}>
        <input type="checkbox" checked={!!vd}
          onChange={(e) => onChange({ ...draft, valueDistribution: e.target.checked ? { priceBounds: [], weights: [0] } : undefined })} />
        Bias selection by value tier<HintMark hint="Weight how often cheap vs. expensive content is drawn, using price buckets." />
      </label>
      {vd && (
        <div className="content-row">
          <ColHead label="Price bounds (ascending)" hint="Ascending value thresholds defining the price buckets." />
          <NumberRow values={vd.priceBounds ?? []} onChange={setBounds} />
          <div style={{ marginTop: 6 }}><ColHead label="Weights (one per bucket — one more than bounds)" hint="Selection weight per price bucket; controls cheap vs. expensive balance." /></div>
          <NumberRow values={vd.weights ?? []} fixedLen onChange={(w) => onChange({ ...draft, valueDistribution: { priceBounds: vd.priceBounds ?? [], weights: w } })} />
        </div>
      )}

      <div className="content-section-label">Groups</div>
      {groups.map((g, i) => (
        <div className="content-row" key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label className="ct-field" style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>Weight<HintMark hint="Relative chance of drawing from this group within the pool." />
              <input type="number" style={{ width: 64 }} value={g.weight ?? ""} onChange={(e) => setGroup(i, { weight: num(e.target.value) })} /></label>
            <button className="ct-iconbtn" onClick={() => setGroups(groups.filter((_, j) => j !== i))}>Remove group</button>
          </div>
          <ReferenceListField label="Include lists" hint="Content lists this group pulls objects from." values={g.includeLists ?? []} options={catalogs.contentLists ?? []}
            onChange={(next) => setGroup(i, { includeLists: next })} onOpen={(name) => onOpenRef("lists", name)} />
          <div style={{ marginTop: 4 }}><ColHead label="Inline objects" hint="Objects placed directly by this group (besides the include lists)." /></div>
          <div className="ct-grid" style={{ gridTemplateColumns: "minmax(0,1fr) 64px 64px 22px" }}>
            <ColHead label="Object" hint="Object SID placed by this group." />
            <ColHead label="Weight" hint="Selection weight relative to sibling entries." />
            <ColHead label="Variant" hint="Variant index; blank = none." />
            <div />
            {(g.content ?? []).map((c, k) => {
              const patchContent = (p: Partial<ContentEntry>) => setGroup(i, { content: (g.content ?? []).map((x, m) => (m === k ? { ...x, ...p } : x)) });
              return (
                <Fragment key={k}>
                  <Combobox value={c.sid ?? ""} options={catalogs.sids ?? []} labelFor={objectName} ariaLabel="Object" placeholder="search objects…"
                    onChange={(v) => patchContent({ sid: v })} />
                  <input type="number" value={c.weight ?? ""} onChange={(e) => patchContent({ weight: num(e.target.value) })} />
                  <input type="number" value={c.variant ?? ""} placeholder="none" onChange={(e) => patchContent({ variant: num(e.target.value) })} />
                  <button className="ct-iconbtn" aria-label="Remove object" onClick={() => setGroup(i, { content: (g.content ?? []).filter((_, m) => m !== k) })}>✕</button>
                </Fragment>
              );
            })}
          </div>
          <button className="ct-addbtn" onClick={() => setGroup(i, { content: [...(g.content ?? []), { sid: "", weight: 100 }] })}>+ Add object</button>
        </div>
      ))}
      <button className="ct-addbtn" onClick={() => setGroups([...groups, { weight: 1, includeLists: [], content: [] }])}>+ Add group</button>

      <div className="content-section-label">Bans</div>
      <div className="ct-grid" style={{ gridTemplateColumns: "minmax(0,1fr) 22px" }}>
        <ColHead label="Banned object" hint="Objects removed from this pool's candidate set." />
        <div />
        {bans.map((b, i) => (
          <Fragment key={i}>
            <Combobox value={b.sid ?? ""} options={catalogs.sids ?? []} labelFor={objectName} ariaLabel="Banned object"
              onChange={(v) => setBans(bans.map((x, j) => (j === i ? { sid: v } : x)))} />
            <button className="ct-iconbtn" aria-label="Remove ban" onClick={() => setBans(bans.filter((_, j) => j !== i))}>✕</button>
          </Fragment>
        ))}
      </div>
      <button className="ct-addbtn" onClick={() => setBans([...bans, { sid: "" }])}>+ Add ban</button>
    </div>
  );
}
