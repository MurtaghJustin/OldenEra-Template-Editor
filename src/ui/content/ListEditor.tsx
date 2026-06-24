import { Fragment, useId } from "react";
import { catalogs } from "../../core/catalogs";
import type { ContentDef } from "../../core/content";

type Entry = { sid?: string; weight?: number; variant?: number; biome?: string };

const num = (v: string): number | undefined => { const n = parseFloat(v); return Number.isFinite(n) ? n : undefined; };

// Editor for a contentLists definition: a weighted, optionally biome-filtered table of objects.
export function ListEditor({ draft, onChange }: { draft: ContentDef; onChange: (d: ContentDef) => void }) {
  const sidsList = useId();
  const biomesList = useId();
  const content = (draft.content as Entry[] | undefined) ?? [];
  const setContent = (next: Entry[]) => onChange({ ...draft, content: next });
  const setEntry = (i: number, patch: Partial<Entry>) => setContent(content.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  return (
    <div>
      <div className="content-section-label">Objects</div>
      <div className="ct-grid" style={{ gridTemplateColumns: "minmax(0,1fr) 64px 64px 120px 22px" }}>
        <div className="ct-head">Object SID</div><div className="ct-head">Weight</div><div className="ct-head">Variant</div><div className="ct-head">Biome</div><div />
        {content.map((e, i) => (
          <Fragment key={i}>
            <input list={sidsList} value={e.sid ?? ""} placeholder="search SIDs…" onChange={(ev) => setEntry(i, { sid: ev.target.value })} />
            <input type="number" value={e.weight ?? ""} onChange={(ev) => setEntry(i, { weight: num(ev.target.value) })} />
            <input type="number" value={e.variant ?? ""} placeholder="none" onChange={(ev) => setEntry(i, { variant: num(ev.target.value) })} />
            <input list={biomesList} value={e.biome ?? ""} placeholder="any" onChange={(ev) => setEntry(i, { biome: ev.target.value || undefined })} />
            <button className="ct-iconbtn" aria-label="Remove object" onClick={() => setContent(content.filter((_, j) => j !== i))}>✕</button>
          </Fragment>
        ))}
      </div>
      <datalist id={sidsList}>{(catalogs.sids ?? []).map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id={biomesList}>{(catalogs.biomes ?? []).map((b) => <option key={b} value={b} />)}</datalist>
      <button className="ct-addbtn" onClick={() => setContent([...content, { sid: "", weight: 100 }])}>+ Add object</button>
    </div>
  );
}
