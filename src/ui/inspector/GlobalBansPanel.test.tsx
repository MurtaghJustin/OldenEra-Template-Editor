import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GlobalBansPanel } from "./GlobalBansPanel";
import { useEditorStore } from "../../state/store";
import minimal from "../../test-fixtures/minimal.rmg.json";

describe("GlobalBansPanel placement", () => {
  it("reads bans from gameRules.globalBans and preserves that placement", () => {
    const t = structuredClone(minimal) as any;
    delete t.globalBans;
    t.gameRules.globalBans = { magics: ["neutral_magic_town_portal"], items: [] };
    useEditorStore.getState().loadFromText(JSON.stringify(t), "G.rmg.json");

    render(<GlobalBansPanel />);
    // The ban that lives in gameRules is visible (not hidden by an empty root-level object).
    expect(screen.getByText(/neutral_magic_town_portal/)).toBeInTheDocument();

    const root = useEditorStore.getState().root! as any;
    // No spurious root-level globalBans was created merely by rendering.
    expect(root.globalBans).toBeUndefined();
    expect(root.gameRules.globalBans.magics).toContain("neutral_magic_town_portal");
  });

  it("does not create root.globalBans just by rendering when none exists", () => {
    const t = structuredClone(minimal) as any;
    delete t.globalBans;
    useEditorStore.getState().loadFromText(JSON.stringify(t), "N.rmg.json");

    render(<GlobalBansPanel />);
    expect((useEditorStore.getState().root as any).globalBans).toBeUndefined();
  });

  it("adds a new ban into the existing gameRules location (preserves placement)", () => {
    const t = structuredClone(minimal) as any;
    delete t.globalBans;
    t.gameRules.globalBans = { magics: [], items: [] };
    useEditorStore.getState().loadFromText(JSON.stringify(t), "G2.rmg.json");

    render(<GlobalBansPanel />);
    fireEvent.change(screen.getByLabelText("Add banned spell"), { target: { value: "neutral_magic_dimension_door" } });
    fireEvent.click(screen.getByText("Add spell"));

    const root = useEditorStore.getState().root! as any;
    expect(root.globalBans).toBeUndefined(); // still not at root
    expect(root.gameRules.globalBans.magics).toContain("neutral_magic_dimension_door");
  });
});
