import { useState } from "react";
import { useEditorStore } from "../../state/store";
import { catalogs } from "../../core/catalogs";
import { SelectField } from "./fields";

export function GlobalBansPanel() {
  const root = useEditorStore((s) => s.root);
  const refresh = useEditorStore((s) => s.refresh);
  const [spell, setSpell] = useState("");
  const [item, setItem] = useState("");
  if (!root) return null;
  if (!root.globalBans) root.globalBans = { magics: [], items: [] };
  const bans = root.globalBans;
  const commit = () => { useEditorStore.setState({ dirty: true }); refresh(); };

  return (
    <div>
      <h3>Global Bans</h3>
      <h4>Spells</h4>
      <ul>{bans.magics.map((m) => <li key={m}>{m} <button onClick={() => { bans.magics = bans.magics.filter((x) => x !== m); commit(); }}>×</button></li>)}</ul>
      <SelectField label="Add banned spell" value={spell} options={catalogs.spells} onChange={setSpell} />
      <button onClick={() => { if (spell && !bans.magics.includes(spell)) { bans.magics.push(spell); setSpell(""); commit(); } }}>Add spell</button>
      <h4>Artifacts</h4>
      <ul>{bans.items.map((m) => <li key={m}>{m} <button onClick={() => { bans.items = bans.items.filter((x) => x !== m); commit(); }}>×</button></li>)}</ul>
      <SelectField label="Add banned artifact" value={item} options={catalogs.artifacts} onChange={setItem} />
      <button onClick={() => { if (item && !bans.items.includes(item)) { bans.items.push(item); setItem(""); commit(); } }}>Add artifact</button>
    </div>
  );
}
