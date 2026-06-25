import { useEditorStore } from "../../state/store";
import { catalogs, winConditionName } from "../../core/catalogs";
import { GAME_MODES } from "../../core/types";
import { NumberField, SelectField, CheckboxField, TextField } from "./fields";
import { TournamentRounds } from "./TournamentRounds";
import { BonusesEditor } from "./BonusesEditor";
import { ValueOverridesEditor } from "./ValueOverridesEditor";

export function GameRulesPanel() {
  const root = useEditorStore((s) => s.root);
  const refresh = useEditorStore((s) => s.refresh);
  if (!root) return null;
  const setRoot = (patch: Record<string, unknown>) => { Object.assign(root, patch); useEditorStore.setState({ dirty: true }); refresh(); };
  const setRules = (patch: Record<string, unknown>) => { Object.assign(root.gameRules, patch); useEditorStore.setState({ dirty: true }); refresh(); };
  const gr = root.gameRules as Record<string, unknown>;
  const wc = (gr.winConditions ?? {}) as Record<string, unknown>;
  const setWC = (patch: Record<string, unknown>) => { gr.winConditions = { ...wc, ...patch }; useEditorStore.setState({ dirty: true }); refresh(); };
  const b = (k: string) => !!wc[k];
  const n = (k: string) => (typeof wc[k] === "number" ? (wc[k] as number) : 0);

  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", columnGap: 16, alignItems: "start" };
  const span: React.CSSProperties = { gridColumn: "1 / -1" };
  const head = (t: string) => <div style={{ ...span, fontSize: 12, opacity: 0.7, margin: "12px 0 2px", borderBottom: "1px solid #2e2e2e", paddingBottom: 2 }}>{t}</div>;

  return (
    <div>
      <h3>Game Rules</h3>
      <div style={grid}>
        {head("Match")}
        <div style={span}>
          <TextField label="Map name" value={(root.name as string) ?? ""} onChange={(v) => setRoot({ name: v })}
            hint="The generated map's name — what the game uses to identify the template. Edit it here instead of hand-editing the file." />
        </div>
        <SelectField label="Game mode" value={root.gameMode} options={[...GAME_MODES]} onChange={(v) => setRoot({ gameMode: v })}
          hint="Classic (multiple heroes per player) or SingleHero (one hero each)." />
        <SelectField label="Win condition" value={root.displayWinCondition ?? ""} options={catalogs.winConditions} labelFor={winConditionName}
          onChange={(v) => setRoot({ displayWinCondition: v })}
          hint="Headline victory condition (e.g. Standard, Hold City, Tournament). Can set the actual mechanic, not just a label." />
        <NumberField label="Map size X" value={root.sizeX} onChange={(v) => setRoot({ sizeX: v })} hint="Map width in tiles." />
        <NumberField label="Map size Z" value={root.sizeZ} onChange={(v) => setRoot({ sizeZ: v })} hint="Map height in tiles." />
        <NumberField label="Hero count min" value={(gr.heroCountMin as number) ?? 0} onChange={(v) => setRules({ heroCountMin: v })}
          hint="Minimum heroes per player (1 for SingleHero, 4 for Classic)." />
        <NumberField label="Hero count max" value={(gr.heroCountMax as number) ?? 0} onChange={(v) => setRules({ heroCountMax: v })}
          hint="Maximum heroes per player (1 for SingleHero, 8 for Classic)." />
        <CheckboxField label="Hero hire ban" value={!!gr.heroHireBan} onChange={(v) => setRules({ heroHireBan: v })}
          hint="If on, players can't hire additional heroes from taverns." />
        <CheckboxField label="Encounter holes" value={!!gr.encounterHoles} onChange={(v) => setRules({ encounterHoles: v })}
          hint="Enables pits/gaps within encounter footprints." />

        {head("Win conditions")}
        <CheckboxField label="Classic (defeat all opponents)" value={b("classic")} onChange={(v) => setWC({ classic: v })}
          hint="Standard 'defeat all opponents' victory. Nearly always on." />
        <CheckboxField label="Lost starting city" value={b("lostStartCity")} onChange={(v) => setWC({ lostStartCity: v })}
          hint="Player loses if their starting city is captured." />
        <CheckboxField label="Lost starting hero" value={b("lostStartHero")} onChange={(v) => setWC({ lostStartHero: v })}
          hint="Player loses if their starting hero dies." />
        <CheckboxField label="City hold" value={b("cityHold")} onChange={(v) => setWC({ cityHold: v })}
          hint="Hold a designated city (flagged holdCityWinCon) for N days to win." />
        <NumberField label="City hold days" value={n("cityHoldDays")} onChange={(v) => setWC({ cityHoldDays: v })}
          hint="Days the hold-city must be retained." />
        <CheckboxField label="Desertion" value={b("desertion")} onChange={(v) => setWC({ desertion: v })}
          hint="Enables an army-desertion mechanic." />
        <NumberField label="Desertion day" value={n("desertionDay")} onChange={(v) => setWC({ desertionDay: v })} hint="Day desertion checks begin." />
        <NumberField label="Desertion value" value={n("desertionValue")} onChange={(v) => setWC({ desertionValue: v })} hint="Army-value threshold for desertion." />

        {head("Gladiator arena")}
        <CheckboxField label="Gladiator arena win" value={b("gladiatorArena")} onChange={(v) => setWC({ gladiatorArena: v })} hint="Enables the Gladiator Arena win path." />
        <CheckboxField label="Register at start work" value={b("gladiatorArenaRegistrationStartWork")} onChange={(v) => setWC({ gladiatorArenaRegistrationStartWork: v })} hint="Registration opens at 'start work'." />
        <CheckboxField label="Register at start fight" value={b("gladiatorArenaRegistrationStartFight")} onChange={(v) => setWC({ gladiatorArenaRegistrationStartFight: v })} hint="Registration opens at 'start fight'." />
        <NumberField label="Days delay before opening" value={n("gladiatorArenaDaysDelayStart")} onChange={(v) => setWC({ gladiatorArenaDaysDelayStart: v })} hint="Days before the arena opens." />
        <NumberField label="Combat cadence (days)" value={n("gladiatorArenaCountDay")} onChange={(v) => setWC({ gladiatorArenaCountDay: v })} hint="How often arena combats occur, in days." />

        {head("Tournament")}
        <CheckboxField label="Tournament win" value={b("tournament")} onChange={(v) => setWC({ tournament: v })}
          hint="This is what makes a tournament template (e.g. Exodus): win by points across scheduled rounds." />
        <CheckboxField label="Tournament rules" value={!!gr.tournamentRules} onChange={(v) => setRules({ tournamentRules: v })}
          hint="Separate engine-level toggle; rarely set — most tournament templates (incl. Exodus) only use Tournament win above." />
        <CheckboxField label="Save army between fights" value={b("tournamentSaveArmy")} onChange={(v) => setWC({ tournamentSaveArmy: v })} hint="Whether the army is preserved between tournament fights." />
        <div style={span}>
          <TournamentRounds pointsToWin={n("tournamentPointsToWin")} advances={(wc.tournamentDays as number[]) ?? []}
            announceDays={(wc.tournamentAnnounceDays as number[]) ?? []} onChange={setWC} />
        </div>

        {head("Starting bonuses")}
        <div style={span}>
          <BonusesEditor bonuses={(gr.bonuses as Parameters<typeof BonusesEditor>[0]["bonuses"]) ?? []} onChange={(bonuses) => setRules({ bonuses })} />
        </div>

        {head("Value overrides")}
        <div style={span}>
          <ValueOverridesEditor overrides={(root.valueOverrides as Parameters<typeof ValueOverridesEditor>[0]["overrides"]) ?? []}
            onChange={(valueOverrides) => setRoot({ valueOverrides })} />
        </div>
      </div>
    </div>
  );
}
