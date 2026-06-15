import { useState } from "react";
import { useEditorStore } from "../../state/store";
import { catalogs } from "../../core/catalogs";
import { SelectField } from "./fields";
import type { GlobalBans } from "../../core/types";

export function GlobalBansPanel() {
  const root = useEditorStore((s) => s.root);
  const refresh = useEditorStore((s) => s.refresh);
  const [spell, setSpell] = useState("");
  const [item, setItem] = useState("");
  if (!root) return null;

  // globalBans may live at the root OR inside gameRules — both occur in official templates.
  // Read from wherever it actually exists and preserve that placement on write. Crucially, do
  // NOT create it as a render side-effect (that would inject a spurious root-level key and hide
  // bans that live in gameRules); only materialize it when the user actually adds a ban.
  const inGameRules = root.gameRules?.globalBans as GlobalBans | undefined;
  const existing = (root.globalBans ?? inGameRules) as GlobalBans | undefined;
  const magics = existing?.magics ?? [];
  const items = existing?.items ?? [];

  // Returns the live bans object, creating it at the root (the more common convention) only if
  // neither location has one yet. If one already exists, its placement is preserved.
  const ensureBans = (): GlobalBans => {
    if (root.globalBans) return root.globalBans;
    if (inGameRules) return inGameRules;
    root.globalBans = { magics: [], items: [] };
    return root.globalBans;
  };

  const commit = () => { useEditorStore.setState({ dirty: true }); refresh(); };

  return (
    <div>
      <h3>Global Bans</h3>
      <h4>Spells</h4>
      <ul>{magics.map((m) => <li key={m}>{m} <button onClick={() => { const b = ensureBans(); b.magics = b.magics.filter((x) => x !== m); commit(); }}>×</button></li>)}</ul>
      <SelectField label="Add banned spell" value={spell} options={catalogs.spells} onChange={setSpell} />
      <button onClick={() => { if (spell) { const b = ensureBans(); if (!b.magics.includes(spell)) { b.magics.push(spell); setSpell(""); commit(); } } }}>Add spell</button>
      <h4>Artifacts</h4>
      <ul>{items.map((m) => <li key={m}>{m} <button onClick={() => { const b = ensureBans(); b.items = b.items.filter((x) => x !== m); commit(); }}>×</button></li>)}</ul>
      <SelectField label="Add banned artifact" value={item} options={catalogs.artifacts} onChange={setItem} />
      <button onClick={() => { if (item) { const b = ensureBans(); if (!b.items.includes(item)) { b.items.push(item); setItem(""); commit(); } } }}>Add artifact</button>
    </div>
  );
}
