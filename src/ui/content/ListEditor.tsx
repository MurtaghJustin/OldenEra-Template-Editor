import { Fragment } from "react";
import { catalogs } from "../../core/catalogs";
import { Combobox } from "../Combobox";
import type { ContentDef } from "../../core/content";

type Entry = { sid?: string; weight?: number; variant?: number; biome?: string };

const num = (v: string): number | undefined => { const n = parseFloat(v); return Number.isFinite(n) ? n : undefined; };

// Editor for a contentLists definition: a weighted, optionally biome-filtered table of objects.
export function ListEditor({ draft, onChange }: { draft: ContentDef; onChange: (d: ContentDef) => void }) {
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
            <Combobox value={e.sid ?? ""} options={catalogs.sids ?? []} ariaLabel="Object SID" placeholder="search SIDs…"
              onChange={(v) => setEntry(i, { sid: v })} />
            <input type="number" value={e.weight ?? ""} onChange={(ev) => setEntry(i, { weight: num(ev.target.value) })} />
            <input type="number" value={e.variant ?? ""} placeholder="none" onChange={(ev) => setEntry(i, { variant: num(ev.target.value) })} />
            <Combobox value={e.biome ?? ""} options={catalogs.biomes ?? []} ariaLabel="Biome" placeholder="any"
              onChange={(v) => setEntry(i, { biome: v || undefined })} />
            <button className="ct-iconbtn" aria-label="Remove object" onClick={() => setContent(content.filter((_, j) => j !== i))}>✕</button>
          </Fragment>
        ))}
      </div>
      <button className="ct-addbtn" onClick={() => setContent([...content, { sid: "", weight: 100 }])}>+ Add object</button>
    </div>
  );
}
