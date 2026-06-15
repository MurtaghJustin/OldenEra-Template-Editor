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
      <SelectField label="Game mode" value={root.gameMode} options={[...GAME_MODES]} onChange={(v) => setRoot({ gameMode: v })} />
      <SelectField label="Display win condition" value={root.displayWinCondition ?? ""} options={catalogs.winConditions} onChange={(v) => setRoot({ displayWinCondition: v })} />
      <NumberField label="Map size X" value={root.sizeX} onChange={(n) => setRoot({ sizeX: n })} />
      <NumberField label="Map size Z" value={root.sizeZ} onChange={(n) => setRoot({ sizeZ: n })} />
      <NumberField label="Hero count min" value={root.gameRules.heroCountMin ?? 0} onChange={(n) => setRules({ heroCountMin: n })} />
      <NumberField label="Hero count max" value={root.gameRules.heroCountMax ?? 0} onChange={(n) => setRules({ heroCountMax: n })} />
      <CheckboxField label="Hero hire ban" value={!!root.gameRules.heroHireBan} onChange={(b) => setRules({ heroHireBan: b })} />
      <CheckboxField label="Encounter holes" value={!!root.gameRules.encounterHoles} onChange={(b) => setRules({ encounterHoles: b })} />
    </div>
  );
}
