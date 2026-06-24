import { catalogs } from "../../core/catalogs";
import { MAIN_OBJECT_TYPES, PLACEMENTS, PLAYER_SLOTS, type MainObject } from "../../core/types";
import { NumberField, CheckboxField, TextField, EnumField, SelectorField } from "./fields";

// Full editor for a zone's (or node type's) main objects: towns (City), player spawns, gladiator
// arenas, abandoned outposts. Every field is editable so a town can be fully configured here
// instead of only via applying a node type. Unknown keys on an object are preserved (spread).
export function MainObjectsEditor({ objects, onChange }: { objects: MainObject[]; onChange: (o: MainObject[]) => void }) {
  const setObj = (i: number, patch: Partial<MainObject>) => onChange(objects.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const owner = (o: MainObject) => (typeof o.owner === "string" ? o.owner : "");

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Main objects</div>
      {objects.length === 0 && <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>None.</div>}
      {objects.map((o, i) => (
        <div key={i} style={{ border: "1px solid #333", borderRadius: 6, padding: 8, marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <select aria-label="Object type" value={o.type} onChange={(e) => setObj(i, { type: e.target.value as MainObject["type"] })} style={{ flex: 1 }}>
              {MAIN_OBJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={() => onChange(objects.filter((_, j) => j !== i))}
              style={{ border: "none", background: "transparent", color: "#e88", cursor: "pointer" }}>Remove</button>
          </div>
          {o.type === "Spawn" && <EnumField label="Player slot" value={o.spawn ?? ""} options={PLAYER_SLOTS} allowNone onChange={(v) => setObj(i, { spawn: v || undefined })} />}
          {o.type === "City" && <CheckboxField label="Hold-city win condition" value={!!o.holdCityWinCon} onChange={(b) => setObj(i, { holdCityWinCon: b })} />}
          <EnumField label="Owner" value={owner(o)} options={PLAYER_SLOTS} allowNone onChange={(v) => setObj(i, { owner: v || null })} />
          <SelectorField label="Faction" value={o.faction} argOptions={catalogs.factions ?? []} onChange={(f) => setObj(i, { faction: f })} />
          <EnumField label="Construction template" value={o.buildingsConstructionSid ?? ""} options={catalogs.constructionSids ?? []} allowNone
            onChange={(v) => setObj(i, { buildingsConstructionSid: v || undefined })} />
          <EnumField label="Placement" value={o.placement ?? ""} options={PLACEMENTS} allowNone onChange={(v) => setObj(i, { placement: (v || undefined) as MainObject["placement"] })} />
          <TextField label="Placement args (comma-separated)" value={(o.placementArgs ?? []).map(String).join(", ")}
            onChange={(v) => setObj(i, { placementArgs: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
          <NumberField label="Guard chance" value={o.guardChance ?? 0} onChange={(n) => setObj(i, { guardChance: n })} />
          <NumberField label="Guard value" value={o.guardValue ?? 0} onChange={(n) => setObj(i, { guardValue: n })} />
          <NumberField label="Guard weekly increment" value={o.guardWeeklyIncrement ?? 0} onChange={(n) => setObj(i, { guardWeeklyIncrement: n })} />
          <CheckboxField label="Remove guard if has owner" value={!!o.removeGuardIfHasOwner} onChange={(b) => setObj(i, { removeGuardIfHasOwner: b })} />
        </div>
      ))}
      <button onClick={() => onChange([...objects, { type: "City", placement: "Center", placementArgs: [] }])}>+ Add object</button>
    </div>
  );
}
