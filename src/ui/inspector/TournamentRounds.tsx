import { Fragment } from "react";
import { NumberField } from "./fields";

const toInt = (v: string) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 0; };
const fit = (arr: number[], len: number) => Array.from({ length: len }, (_, i) => arr[i] ?? 0);

// Tournament rounds editor. The stored data is awkward: `tournamentDays[i]` is actually the LEAD
// (days the battle is announced in advance) and `tournamentAnnounceDays[i]` is the announce day, so
// the battle day is DERIVED (announce + lead). This UI hides that: you set the battle day and how
// many days ahead it's announced; we store the lead + announce day. Round count = points × 2 − 1.
// The announcement is capped so it can't fall before the previous round's battle.
export function TournamentRounds({ pointsToWin, advances, announceDays, onChange }: {
  pointsToWin: number;
  advances: number[];      // tournamentDays — lead time (days announced ahead)
  announceDays: number[];  // tournamentAnnounceDays — the announce day
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const N = Math.max(0, Math.floor(pointsToWin || 0));
  const rounds = Math.max(0, N * 2 - 1);
  const adv = fit(advances, rounds), ann = fit(announceDays, rounds);
  const battleOf = (i: number) => ann[i] + adv[i];
  const floorOf = (i: number) => (i > 0 ? ann[i - 1] + adv[i - 1] : 1); // announce can't precede the previous battle
  const commit = (nextAdv: number[], nextAnn: number[]) => onChange({ tournamentDays: nextAdv, tournamentAnnounceDays: nextAnn });

  const setPoints = (p: number) => {
    const nn = Math.max(0, Math.floor(p || 0)); const r = Math.max(0, nn * 2 - 1);
    onChange({ tournamentPointsToWin: nn, tournamentDays: fit(advances, r), tournamentAnnounceDays: fit(announceDays, r) });
  };
  const setBattle = (i: number, B: number) => {
    const fl = floorOf(i); const b = Math.max(Math.floor(B || 0), fl);
    const a = Math.min(adv[i], b - fl);                 // keep lead, but not past the floor
    commit(adv.map((x, j) => (j === i ? a : x)), ann.map((x, j) => (j === i ? b - a : x)));
  };
  const setAdvance = (i: number, A: number) => {
    const b = battleOf(i), fl = floorOf(i);
    const a = Math.max(0, Math.min(Math.floor(A || 0), b - fl)); // cap so announce day ≥ previous battle
    commit(adv.map((x, j) => (j === i ? a : x)), ann.map((x, j) => (j === i ? b - a : x)));
  };

  const head: React.CSSProperties = { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.55 };
  return (
    <div style={{ marginBottom: 8 }}>
      <NumberField label="Points to win" value={pointsToWin} onChange={setPoints}
        hint="Points needed to win the tournament. It runs (points × 2 − 1) rounds." />
      {rounds > 0 ? (
        <>
          <div style={{ fontSize: 11, opacity: 0.6, margin: "4px 0" }}>{rounds} round{rounds > 1 ? "s" : ""} — set each battle day and how far ahead it's announced.</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr auto", gap: "4px 10px", alignItems: "center" }}>
            <div /><div style={head}>Battle day</div><div style={head}>Announce (days ahead)</div><div style={head}>Announced</div>
            {Array.from({ length: rounds }).map((_, i) => (
              <Fragment key={i}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Round {i + 1}</span>
                <input type="number" min={1} aria-label={`Round ${i + 1} battle day`} value={battleOf(i)} onChange={(e) => setBattle(i, toInt(e.target.value))} />
                <input type="number" min={0} max={battleOf(i) - floorOf(i)} aria-label={`Round ${i + 1} announce days ahead`} value={adv[i]} onChange={(e) => setAdvance(i, toInt(e.target.value))} />
                <span style={{ fontSize: 11, opacity: 0.6 }}>day {ann[i]}</span>
              </Fragment>
            ))}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 11, opacity: 0.5 }}>Set points to win (≥ 1) to configure rounds.</div>
      )}
    </div>
  );
}
