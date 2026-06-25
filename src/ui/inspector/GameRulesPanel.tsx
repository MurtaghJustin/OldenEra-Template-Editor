import { useEditorStore } from "../../state/store";
import { catalogs } from "../../core/catalogs";
import { GAME_MODES } from "../../core/types";
import { NumberField, SelectField, CheckboxField } from "./fields";

export function GameRulesPanel() {
  const root = useEditorStore((s) => s.root);
  const refresh = useEditorStore((s) => s.refresh);
  if (!root) return null;
  const setRoot = (patch: Record<string, unknown>) => { Object.assign(root, patch); useEditorStore.setState({ dirty: true }); refresh(); };
  const setRules = (patch: Record<string, unknown>) => { Object.assign(root.gameRules, patch); useEditorStore.setState({ dirty: true }); refresh(); };

  return (
    <div>
      <h3>Game Rules</h3>
      <SelectField label="Game mode" value={root.gameMode} options={[...GAME_MODES]} onChange={(v) => setRoot({ gameMode: v })}
        hint="Classic (multiple heroes per player) or SingleHero (one hero each)." />
      <SelectField label="Display win condition" value={root.displayWinCondition ?? ""} options={catalogs.winConditions} onChange={(v) => setRoot({ displayWinCondition: v })}
        hint="Headline victory condition shown to players (win_condition_N)." />
      <NumberField label="Map size X" value={root.sizeX} onChange={(n) => setRoot({ sizeX: n })} hint="Map width in tiles." />
      <NumberField label="Map size Z" value={root.sizeZ} onChange={(n) => setRoot({ sizeZ: n })} hint="Map height in tiles." />
      <NumberField label="Hero count min" value={root.gameRules.heroCountMin ?? 0} onChange={(n) => setRules({ heroCountMin: n })}
        hint="Minimum heroes per player (e.g. 1 for SingleHero, 4 for Classic)." />
      <NumberField label="Hero count max" value={root.gameRules.heroCountMax ?? 0} onChange={(n) => setRules({ heroCountMax: n })}
        hint="Maximum heroes per player (e.g. 1 for SingleHero, 8 for Classic)." />
      <CheckboxField label="Hero hire ban" value={!!root.gameRules.heroHireBan} onChange={(b) => setRules({ heroHireBan: b })}
        hint="If on, players can't hire additional heroes mid-game." />
      <CheckboxField label="Encounter holes" value={!!root.gameRules.encounterHoles} onChange={(b) => setRules({ encounterHoles: b })}
        hint="If on, some encounters spawn with holes/gaps." />
    </div>
  );
}
