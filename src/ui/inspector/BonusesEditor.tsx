import { catalogs } from "../../core/catalogs";
import { Combobox } from "../Combobox";
import { HintMark } from "../content/ColHead";

// Start-of-game bonuses (gameRules.bonuses). Parameters are type-specific, so each bonus type shows
// the right control: a spell/artifact picker, a resource + amount, a multiplier, or — for the
// freeform stat bonus — an editable parameter list. See Documentation/02.
const BONUS_TYPES: { sid: string; label: string }[] = [
  { sid: "add_bonus_res", label: "Starting resources" },
  { sid: "add_bonus_hero_spell", label: "Grant spell" },
  { sid: "add_bonus_hero_item", label: "Grant artifact" },
  { sid: "add_bonus_hero_stat", label: "Hero stat / spell cost" },
  { sid: "add_bonus_hero_unit_multipler", label: "Army multiplier" },
];
const RESOURCES = ["gold", "wood", "ore", "mercury", "crystals", "gemstones"];
const FILTERS = ["start_hero", "all_heroes"];

type Bonus = { sid?: string; receiverSide?: number; receiverFilter?: string; parameters?: string[] };

export function BonusesEditor({ bonuses, onChange }: { bonuses: Bonus[]; onChange: (b: Bonus[]) => void }) {
  const setBonus = (i: number, patch: Partial<Bonus>) => onChange(bonuses.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const setParams = (i: number, params: string[]) => setBonus(i, { parameters: params });

  const params = (b: Bonus, i: number) => {
    const p = b.parameters ?? [];
    switch (b.sid) {
      case "add_bonus_res":
        return (
          <div style={{ display: "flex", gap: 8 }}>
            <label className="ct-field" style={{ flex: 1 }}>Resource
              <select value={p[0] ?? ""} onChange={(e) => setParams(i, [e.target.value, p[1] ?? ""])}>
                <option value="">(choose)</option>{RESOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select></label>
            <label className="ct-field" style={{ flex: 1 }}>Amount
              <input type="number" value={p[1] ?? ""} onChange={(e) => setParams(i, [p[0] ?? "gold", e.target.value])} /></label>
          </div>
        );
      case "add_bonus_hero_spell":
        return <div className="ct-field">Spell<Combobox value={p[0] ?? ""} options={catalogs.spells ?? []} ariaLabel="Spell" placeholder="search spells…" onChange={(v) => setParams(i, [v])} /></div>;
      case "add_bonus_hero_item":
        return <div className="ct-field">Artifact<Combobox value={p[0] ?? ""} options={catalogs.artifacts ?? []} ariaLabel="Artifact" placeholder="search artifacts…" onChange={(v) => setParams(i, [v])} /></div>;
      case "add_bonus_hero_unit_multipler":
        return <label className="ct-field">Multiplier<input type="number" step="any" value={p[0] ?? ""} onChange={(e) => setParams(i, [e.target.value])} /></label>;
      default: // add_bonus_hero_stat / unknown — freeform parameter list
        return (
          <div>
            <div className="ct-head">Parameters<HintMark hint='e.g. ["movementBonus", "5"] or ["magicCostSidSet", "<spell>", "-999", "0"] to make a spell free.' /></div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
              {p.map((a, k) => (
                <span key={k} style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
                  <input style={{ width: 130 }} value={a} onChange={(e) => setParams(i, p.map((x, m) => (m === k ? e.target.value : x)))} />
                  <button className="ct-iconbtn" aria-label="Remove parameter" onClick={() => setParams(i, p.filter((_, m) => m !== k))}>✕</button>
                </span>
              ))}
              <button type="button" onClick={() => setParams(i, [...p, ""])}>+ param</button>
            </div>
          </div>
        );
    }
  };

  return (
    <div>
      {bonuses.length === 0 && <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>No bonuses.</div>}
      {bonuses.map((b, i) => (
        <div className="content-row" key={i}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label className="ct-field" style={{ flex: "1 1 160px" }}>Bonus type
              <select value={b.sid ?? ""} onChange={(e) => setBonus(i, { sid: e.target.value })}>
                {BONUS_TYPES.map((t) => <option key={t.sid} value={t.sid}>{t.label}</option>)}
              </select></label>
            <label className="ct-field">Receiver side<HintMark hint="-1 = all players; otherwise a specific side index." />
              <input type="number" style={{ width: 80 }} value={b.receiverSide ?? -1} onChange={(e) => setBonus(i, { receiverSide: parseInt(e.target.value, 10) })} /></label>
            <label className="ct-field">Applies to
              <select value={b.receiverFilter ?? "start_hero"} onChange={(e) => setBonus(i, { receiverFilter: e.target.value })}>
                {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select></label>
            <button className="ct-iconbtn" style={{ marginLeft: "auto" }} onClick={() => onChange(bonuses.filter((_, j) => j !== i))}>Remove</button>
          </div>
          <div style={{ marginTop: 6 }}>{params(b, i)}</div>
        </div>
      ))}
      <button className="ct-addbtn" onClick={() => onChange([...bonuses, { sid: "add_bonus_res", receiverSide: -1, receiverFilter: "start_hero", parameters: ["gold", "10000"] }])}>+ Add bonus</button>
    </div>
  );
}
