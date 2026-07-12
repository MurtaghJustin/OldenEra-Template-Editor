import { useId } from "react";
import { catalogs } from "../../core/catalogs";
import type { Selector } from "../../core/types";
import {
  parseBiome, buildBiome, parseFaction, buildFaction,
  type BiomeState, type FactionState, type Exclusion,
} from "../../core/selectors";

// A friendly, field-aware editor for a biome or faction Selector. Instead of exposing the raw
// {type, args} vocabulary, it offers plain-language modes with guided controls (biome chips, zone
// pickers, an object-index input, a "different from these zones" builder) and translates to/from the
// on-disk Selector via core/selectors.ts. `zones` supplies the names for the zone pickers.
export function SelectorField({ label, kind, value, zones, onChange, hint }: {
  label: string; kind: "biome" | "faction"; value?: Selector; zones: string[];
  onChange: (s: Selector) => void; hint?: string;
}) {
  return kind === "biome"
    ? <BiomeSelector label={label} value={value} zones={zones} onChange={onChange} hint={hint} />
    : <FactionSelector label={label} value={value} zones={zones} onChange={onChange} hint={hint} />;
}

function Head({ label, hint }: { label: string; hint?: string }) {
  return (
    <span style={{ fontSize: 12, opacity: 0.7 }}>{label}
      {hint && <span aria-hidden title={hint} style={{ marginLeft: 4, opacity: 0.65, cursor: "help" }}>ⓘ</span>}
    </span>
  );
}

function Radio({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", flex: 1, minWidth: 0 }}>{children}</span>
    </label>
  );
}

function ZonePicker({ value, zones, ariaLabel, onChange }: { value: string; zones: string[]; ariaLabel: string; onChange: (z: string) => void }) {
  return (
    <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} style={{ minWidth: 0, maxWidth: 160 }}>
      <option value="">(choose zone)</option>
      {zones.map((z) => <option key={z} value={z}>{z}</option>)}
    </select>
  );
}

// "Different from" exclusion builder: one row per zone (with an object-# index for factions).
function ExclusionEditor({ exclusions, zones, withIndex, onChange }: {
  exclusions: Exclusion[]; zones: string[]; withIndex: boolean; onChange: (e: Exclusion[]) => void;
}) {
  const set = (i: number, patch: Partial<Exclusion>) => onChange(exclusions.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  return (
    <div style={{ display: "grid", gap: 4, marginTop: 2, marginLeft: 20 }}>
      {exclusions.map((e, i) => (
        <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <ZonePicker value={e.zone} zones={zones} ariaLabel="Different-from zone" onChange={(z) => set(i, { zone: z })} />
          {withIndex && <label style={{ fontSize: 10, opacity: 0.6, display: "flex", gap: 2, alignItems: "center" }} title="Main-object index in that zone">obj #
            <input type="number" min={0} aria-label="Object index" style={{ width: 48 }} value={e.index ?? 0} onChange={(ev) => set(i, { index: Number(ev.target.value) || 0 })} /></label>}
          <button className="ct-iconbtn" aria-label="Remove exclusion" onClick={() => onChange(exclusions.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" style={{ fontSize: 11, alignSelf: "start" }}
        onClick={() => onChange([...exclusions, { zone: zones[0] ?? "", ...(withIndex ? { index: 0 } : {}) }])}>+ zone</button>
    </div>
  );
}

function BiomeSelector({ label, value, zones, onChange, hint }:
  { label: string; value?: Selector; zones: string[]; onChange: (s: Selector) => void; hint?: string }) {
  const name = useId();
  const st = parseBiome(value);
  const biomeOptions = catalogs.biomes ?? [];
  const emit = (patch: Partial<BiomeState>) => onChange(buildBiome({ ...st, ...patch }));
  const fromList = st.mode === "any" || st.mode === "list";
  const toggle = (b: string) => emit({ mode: "list", biomes: st.biomes.includes(b) ? st.biomes.filter((x) => x !== b) : [...st.biomes, b] });

  return (
    <div style={{ display: "grid", gap: 5, marginBottom: 8 }}>
      <Head label={label} hint={hint} />
      {st.mode === "custom" && (
        <div style={{ fontSize: 11, opacity: 0.7, background: "#2a2a1e", borderRadius: 4, padding: "2px 6px" }}>
          Custom: {st.raw.type} [{st.raw.args.join(", ")}] — pick a mode below to replace it.
        </div>
      )}

      <Radio name={name} checked={fromList} onChange={() => emit({ mode: "list" })}>Pick biome(s)</Radio>
      {fromList && (
        <div style={{ marginLeft: 20, display: "grid", gap: 4 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {biomeOptions.map((b) => {
              const on = st.biomes.includes(b);
              return <button key={b} type="button" aria-pressed={on} onClick={() => toggle(b)}
                style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, cursor: "pointer",
                  border: `1px solid ${on ? "#6a8" : "#444"}`, background: on ? "#2b3a1d" : "transparent", color: on ? "#cfe8a0" : "#aaa" }}>{b}</button>;
            })}
          </div>
          <span style={{ fontSize: 10, opacity: 0.5 }}>{st.biomes.length === 0 ? "None selected = any biome." : "Random among the selected biomes."}</span>
          <details open={st.exclusions.length > 0}>
            <summary style={{ fontSize: 11, opacity: 0.7, cursor: "pointer" }}>…and a different biome from other zones</summary>
            <ExclusionEditor exclusions={st.exclusions} zones={zones} withIndex={false} onChange={(ex) => emit({ mode: st.biomes.length ? "list" : "any", exclusions: ex })} />
          </details>
        </div>
      )}

      <Radio name={name} checked={st.mode === "followMainObject"} onChange={() => emit({ mode: "followMainObject" })}>
        Follow a main object here
        {st.mode === "followMainObject" && <>object #
          <input type="number" min={0} aria-label="Main object index" style={{ width: 48 }} value={st.index}
            onChange={(e) => emit({ mode: "followMainObject", index: Number(e.target.value) || 0 })} /></>}
      </Radio>

      <Radio name={name} checked={st.mode === "sameAsZone"} onChange={() => emit({ mode: "sameAsZone" })}>
        Same as another zone
        {st.mode === "sameAsZone" && <ZonePicker value={st.zone} zones={zones} ariaLabel="Same-as zone" onChange={(z) => emit({ mode: "sameAsZone", zone: z })} />}
      </Radio>
    </div>
  );
}

function FactionSelector({ label, value, zones, onChange, hint }:
  { label: string; value?: Selector; zones: string[]; onChange: (s: Selector) => void; hint?: string }) {
  const name = useId();
  const st = parseFaction(value);
  const emit = (patch: Partial<FactionState>) => onChange(buildFaction({ ...st, ...patch }));

  return (
    <div style={{ display: "grid", gap: 5, marginBottom: 8 }}>
      <Head label={label} hint={hint} />
      {st.mode === "custom" && (
        <div style={{ fontSize: 11, opacity: 0.7, background: "#2a2a1e", borderRadius: 4, padding: "2px 6px" }}>
          Custom: {st.raw.type} [{st.raw.args.join(", ")}] — pick a mode below to replace it.
        </div>
      )}

      <Radio name={name} checked={st.mode === "any"} onChange={() => emit({ mode: "any" })}>
        Any faction{st.exclusions.length > 0 ? " (excluding zones below)" : ""}
      </Radio>
      {st.mode === "any" && (
        <div style={{ marginLeft: 20 }}>
          <span style={{ fontSize: 10, opacity: 0.55 }}>Optionally require it to differ from other zones' factions:</span>
          <ExclusionEditor exclusions={st.exclusions} zones={zones} withIndex onChange={(ex) => emit({ mode: "any", exclusions: ex })} />
        </div>
      )}

      <Radio name={name} checked={st.mode === "match"} onChange={() => emit({ mode: "match" })}>
        Match a main object's faction
        {st.mode === "match" && <>object #
          <input type="number" min={0} aria-label="Main object index" style={{ width: 48 }} value={st.index}
            onChange={(e) => emit({ mode: "match", index: Number(e.target.value) || 0 })} />
          in <ZonePicker value={st.zone} zones={zones} ariaLabel="Match zone" onChange={(z) => emit({ mode: "match", zone: z })} />
          <span style={{ fontSize: 10, opacity: 0.5 }}>(blank zone = this zone)</span></>}
      </Radio>

      <Radio name={name} checked={st.mode === "random"} onChange={() => emit({ mode: "random" })}>Random faction</Radio>
    </div>
  );
}
