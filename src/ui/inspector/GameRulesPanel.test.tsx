import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameRulesPanel } from "./GameRulesPanel";
import { winConditionName } from "../../core/catalogs";
import { useEditorStore } from "../../state/store";
import minimal from "../../test-fixtures/minimal.rmg.json";

describe("win condition names", () => {
  it("maps win_condition IDs to their display names", () => {
    expect(winConditionName("win_condition_6")).toBe("Tournament");
    expect(winConditionName("win_condition_1")).toBe("Standard");
    expect(winConditionName("win_condition_99")).toBe("win_condition_99"); // unknown → passthrough
  });
});

describe("GameRulesPanel", () => {
  beforeEach(() => useEditorStore.getState().loadFromText(JSON.stringify(minimal), "M.rmg.json"));

  it("shows the win condition by name and toggles tournament rules into winConditions/gameRules", () => {
    render(<GameRulesPanel />);
    fireEvent.click(screen.getByLabelText("Tournament win"));
    fireEvent.click(screen.getByLabelText("Tournament rules"));
    const gr = useEditorStore.getState().root!.gameRules as Record<string, unknown>;
    expect((gr.winConditions as Record<string, unknown>).tournament).toBe(true);
    expect(gr.tournamentRules).toBe(true);
  });

  const wcOf = () => (useEditorStore.getState().root!.gameRules as Record<string, unknown>).winConditions as Record<string, unknown>;

  it("derives rounds from points-to-win; battle day + days-ahead store the lead/announce arrays", () => {
    render(<GameRulesPanel />);
    fireEvent.change(screen.getByLabelText("Points to win"), { target: { value: "2" } }); // 2 → 3 rounds
    fireEvent.change(screen.getByLabelText("Round 1 battle day"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Round 1 announce days ahead"), { target: { value: "3" } });
    expect(wcOf().tournamentPointsToWin).toBe(2);
    expect((wcOf().tournamentDays as number[]).length).toBe(3);
    expect((wcOf().tournamentDays as number[])[0]).toBe(3);          // lead (days ahead)
    expect((wcOf().tournamentAnnounceDays as number[])[0]).toBe(7);  // battle 10 − 3 days
  });

  it("caps the announcement so it can't fall before the previous battle", () => {
    render(<GameRulesPanel />);
    fireEvent.change(screen.getByLabelText("Points to win"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Round 1 battle day"), { target: { value: "10" } }); // round 1 battle = day 10
    fireEvent.change(screen.getByLabelText("Round 2 battle day"), { target: { value: "19" } });
    fireEvent.change(screen.getByLabelText("Round 2 announce days ahead"), { target: { value: "50" } }); // would be day -31
    expect((wcOf().tournamentDays as number[])[1]).toBe(9);          // capped: 19 − 10
    expect((wcOf().tournamentAnnounceDays as number[])[1]).toBe(10); // not before round 1's battle (day 10)
  });
});
