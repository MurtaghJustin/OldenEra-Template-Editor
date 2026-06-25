import { Fragment } from "react";
import { NumberField } from "../inspector/fields";
import { ColHead } from "./ColHead";
import type { ContentDef } from "../../core/content";

const num = (v: string): number => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

type Mode = { weight?: number; minElevatedFraction?: number; maxElevatedFraction?: number };
type Fractions = { countBounds?: number[]; fractions?: number[] };
type Ambient = { repulsion?: number; noise?: number; roadAttraction?: number; obstacleAttraction?: number; groupSizeWeights?: number[] };

// A short add/removable row of number inputs (count bounds, fractions, group-size weights).
function NumberList({ label, hint, values, onChange }: { label: string; hint?: string; values: number[]; onChange: (v: number[]) => void }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <ColHead label={label} hint={hint} />
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        {values.map((v, i) => (
          <span key={i} style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
            <input type="number" step="any" style={{ width: 76 }} value={Number.isFinite(v) ? v : ""}
              onChange={(e) => onChange(values.map((x, j) => (j === i ? num(e.target.value) : x)))} />
            <button className="ct-iconbtn" aria-label="Remove" onClick={() => onChange(values.filter((_, j) => j !== i))}>✕</button>
          </span>
        ))}
        <button type="button" onClick={() => onChange([...values, 0])}>+</button>
      </div>
    </div>
  );
}

// Editor for a root zoneLayouts definition (terrain/obstacle/encounter profile). Shape per
// Documentation/04 — confirmed identical across all shipped templates.
export function ZoneLayoutEditor({ draft, onChange }: { draft: ContentDef; onChange: (d: ContentDef) => void }) {
  const set = (patch: Partial<ContentDef>) => onChange({ ...draft, ...patch });
  const num0 = (k: string) => (typeof draft[k] === "number" ? (draft[k] as number) : 0);
  const modes = (draft.elevationModes as Mode[] | undefined) ?? [];
  const frac = (draft.guardedEncounterResourceFractions as Fractions | undefined) ?? {};
  const amb = (draft.ambientPickupDistribution as Ambient | undefined) ?? {};
  const setFrac = (patch: Partial<Fractions>) => set({ guardedEncounterResourceFractions: { ...frac, ...patch } });
  const setAmb = (patch: Partial<Ambient>) => set({ ambientPickupDistribution: { ...amb, ...patch } });
  const setMode = (i: number, patch: Partial<Mode>) => set({ elevationModes: modes.map((m, j) => (j === i ? { ...m, ...patch } : m)) });

  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", columnGap: 14, alignItems: "start" };

  return (
    <div>
      <div className="content-section-label">Terrain</div>
      <div style={grid}>
        <NumberField label="Obstacles fill" value={num0("obstaclesFill")} onChange={(v) => set({ obstaclesFill: v })} hint="Obstacle density over normal terrain (0–1)." />
        <NumberField label="Obstacles fill (void)" value={num0("obstaclesFillVoid")} onChange={(v) => set({ obstaclesFillVoid: v })} hint="Obstacle density over void/unused terrain (0–1)." />
        <NumberField label="Lakes fill" value={num0("lakesFill")} onChange={(v) => set({ lakesFill: v })} hint="Water density (0–1)." />
        <NumberField label="Min lake area" value={num0("minLakeArea")} onChange={(v) => set({ minLakeArea: v })} hint="Smallest lake size, in tiles." />
        <NumberField label="Road cluster area" value={num0("roadClusterArea")} onChange={(v) => set({ roadClusterArea: v })} hint="Target area for road clustering." />
        <NumberField label="Elevation cluster scale" value={num0("elevationClusterScale")} onChange={(v) => set({ elevationClusterScale: v })} hint="Scale of the elevation-clustering noise." />
      </div>

      <div className="content-section-label">Elevation modes</div>
      <div className="ct-grid" style={{ gridTemplateColumns: "70px 1fr 1fr 22px" }}>
        <ColHead label="Weight" hint="Relative weight of this elevation profile." />
        <ColHead label="Min elevated" hint="Minimum fraction of the zone that is elevated (0–1)." />
        <ColHead label="Max elevated" hint="Maximum fraction of the zone that is elevated (0–1)." />
        <div />
        {modes.map((m, i) => (
          <Fragment key={i}>
            <input type="number" step="any" aria-label={`Mode ${i + 1} weight`} value={m.weight ?? ""} onChange={(e) => setMode(i, { weight: num(e.target.value) })} />
            <input type="number" step="any" value={m.minElevatedFraction ?? ""} onChange={(e) => setMode(i, { minElevatedFraction: num(e.target.value) })} />
            <input type="number" step="any" value={m.maxElevatedFraction ?? ""} onChange={(e) => setMode(i, { maxElevatedFraction: num(e.target.value) })} />
            <button className="ct-iconbtn" aria-label="Remove mode" onClick={() => set({ elevationModes: modes.filter((_, j) => j !== i) })}>✕</button>
          </Fragment>
        ))}
      </div>
      <button className="ct-addbtn" onClick={() => set({ elevationModes: [...modes, { weight: 1, minElevatedFraction: 0, maxElevatedFraction: 0 }] })}>+ Add mode</button>

      <div className="content-section-label">Guarded encounter resources</div>
      <NumberList label="Count bounds" hint="Encounter-count thresholds for the fractions below." values={frac.countBounds ?? []} onChange={(v) => setFrac({ countBounds: v })} />
      <NumberList label="Resource fractions" hint="Share of guarded encounters that are resources (0–1), per count band." values={frac.fractions ?? []} onChange={(v) => setFrac({ fractions: v })} />

      <div className="content-section-label">Ambient pickups</div>
      <div style={grid}>
        <NumberField label="Repulsion" value={amb.repulsion ?? 0} onChange={(v) => setAmb({ repulsion: v })} hint="Minimum spacing between scattered pickups." />
        <NumberField label="Noise" value={amb.noise ?? 0} onChange={(v) => setAmb({ noise: v })} hint="Randomness in pickup placement." />
        <NumberField label="Road attraction" value={amb.roadAttraction ?? 0} onChange={(v) => setAmb({ roadAttraction: v })} hint="How strongly pickups cluster toward roads." />
        <NumberField label="Obstacle attraction" value={amb.obstacleAttraction ?? 0} onChange={(v) => setAmb({ obstacleAttraction: v })} hint="How strongly pickups cluster toward obstacles." />
      </div>
      <NumberList label="Group size weights" hint="Weights for pickup cluster sizes (1, 2, 3, …)." values={amb.groupSizeWeights ?? []} onChange={(v) => setAmb({ groupSizeWeights: v })} />
    </div>
  );
}
