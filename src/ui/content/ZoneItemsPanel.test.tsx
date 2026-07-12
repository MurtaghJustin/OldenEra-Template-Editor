import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ZoneItemsPanel } from "./ZoneItemsPanel";
import { useEditorStore } from "../../state/store";
import { contentDefs } from "../../core/content";
import minimal from "../../test-fixtures/minimal.rmg.json";
import type { Zone } from "../../core/types";

// Mirror ZonePanel: re-derive the zone from the store each render so the panel picks up store
// updates (a fixed zone prop would go stale after a write).
function Harness({ name }: { name: string }) {
  const root = useEditorStore((s) => s.root);
  const zone = root?.variants[0].zones.find((z) => z.name === name);
  return zone ? <ZoneItemsPanel zone={zone as Zone} /> : null;
}

const poolNamed = (name: string) =>
  contentDefs(useEditorStore.getState().root, "pools").find((d) => d.name === name) as
    { name: string; groups: { content: { sid?: string; weight?: number }[] }[] } | undefined;

describe("ZoneItemsPanel", () => {
  beforeEach(() => useEditorStore.getState().loadFromText(JSON.stringify(minimal), "M.rmg.json"));

  it("shows a built-in pool reference as read-only (minimal's pools aren't defined in-template)", () => {
    render(<Harness name="Spawn-A" />);
    expect(screen.getByText("classic_template_pool_random_t2_base")).toBeInTheDocument();
    expect(screen.getAllByText(/built-in/).length).toBeGreaterThan(0);
  });

  it("adds a guarded object into the zone's template-defined pool", () => {
    useEditorStore.getState().upsertContentDef("pools", { name: "tpl_g", groups: [{ weight: 1, includeLists: [], content: [] }] });
    useEditorStore.getState().updateZone("Spawn-A", { guardedContentPool: ["tpl_g"] });
    render(<Harness name="Spawn-A" />);

    fireEvent.click(screen.getByText("+ Add guarded"));
    expect(poolNamed("tpl_g")!.groups[0].content).toHaveLength(1);
    expect(screen.getByLabelText("Remove item")).toBeInTheDocument();
  });

  it("edits weight inline and removes the object", () => {
    useEditorStore.getState().upsertContentDef("pools", { name: "tpl_g", groups: [{ content: [{ sid: "bank", weight: 100 }] }] });
    useEditorStore.getState().updateZone("Spawn-A", { guardedContentPool: ["tpl_g"] });
    render(<Harness name="Spawn-A" />);

    fireEvent.change(screen.getByLabelText("Weight"), { target: { value: "42" } });
    expect(poolNamed("tpl_g")!.groups[0].content[0].weight).toBe(42);

    fireEvent.click(screen.getByLabelText("Remove item"));
    expect(poolNamed("tpl_g")!.groups[0].content).toHaveLength(0);
  });

  it("offers to create a pool when the zone has no editable pool, then adds into it", () => {
    // Spawn-A references only built-in pools → no editable target.
    render(<Harness name="Spawn-A" />);
    fireEvent.click(screen.getByText("+ Add guarded"));
    fireEvent.click(screen.getByText(/Create a pool for this zone & add/));

    const z = useEditorStore.getState().root!.variants[0].zones.find((zz) => zz.name === "Spawn-A")!;
    const newRef = (z.guardedContentPool as string[]).find((n) => n === "Spawn-A_guarded");
    expect(newRef).toBe("Spawn-A_guarded");
    expect(poolNamed("Spawn-A_guarded")!.groups[0].content).toHaveLength(1);
  });

  it("warns when the target pool is shared by multiple zones", () => {
    useEditorStore.getState().upsertContentDef("pools", { name: "shared_g", groups: [{ content: [{ sid: "bank", weight: 100 }] }] });
    useEditorStore.getState().updateZone("Spawn-A", { guardedContentPool: ["shared_g"] });
    useEditorStore.getState().updateZone("Spawn-B", { guardedContentPool: ["shared_g"] });
    render(<Harness name="Spawn-A" />);
    expect(screen.getByText(/shared ×2/)).toBeInTheDocument();
  });

  it("renders a mandatory item's guarding control and flags", () => {
    useEditorStore.getState().upsertContentDef("mandatory", { name: "mg", content: [{ sid: "dragon_utopia", isGuarded: true }] });
    useEditorStore.getState().updateZone("Spawn-A", { mandatoryContent: ["mg"] });
    render(<Harness name="Spawn-A" />);

    const guarding = screen.getByLabelText("Guarding") as HTMLSelectElement;
    expect(guarding.value).toBe("yes");
    expect(screen.getByText("rules →")).toBeInTheDocument();
  });
});
