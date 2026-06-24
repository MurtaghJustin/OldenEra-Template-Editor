import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContentDrawer } from "./ContentDrawer";
import { useEditorStore } from "../../state/store";
import minimal from "../../test-fixtures/minimal.rmg.json";

describe("ContentDrawer", () => {
  beforeEach(() => useEditorStore.getState().loadFromText(JSON.stringify(minimal), "M.rmg.json"));

  it("is closed until opened", () => {
    const { container } = render(<ContentDrawer />);
    expect(container.querySelector(".drawer-panel")).toBeNull();
  });

  it("browses, creates a definition, and commits it on Accept", () => {
    useEditorStore.getState().openContentDrawer("countLimits");
    render(<ContentDrawer />);
    expect(screen.getByText("Content count limits")).toBeInTheDocument();

    fireEvent.click(screen.getByText("+ New"));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "limits_test" } });
    // nothing committed yet (draft only)
    expect(useEditorStore.getState().root!.contentCountLimits).toEqual([]);

    fireEvent.click(screen.getByText("Accept"));
    expect((useEditorStore.getState().root!.contentCountLimits as { name: string }[]).map((d) => d.name)).toEqual(["limits_test"]);
  });

  it("pool editor: New, add a group, Accept commits the group", () => {
    useEditorStore.getState().openContentDrawer("pools");
    render(<ContentDrawer />);
    fireEvent.click(screen.getByText("+ New"));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "my_pool" } });
    fireEvent.click(screen.getByText("+ Add group"));
    fireEvent.click(screen.getByText("Accept"));
    const pool = (useEditorStore.getState().root!.contentPools as { name: string; groups: unknown[] }[])[0];
    expect(pool.name).toBe("my_pool");
    expect(pool.groups).toHaveLength(1);
  });

  it("mandatory editor: New, add an item, Accept commits it", () => {
    useEditorStore.getState().openContentDrawer("mandatory");
    render(<ContentDrawer />);
    fireEvent.click(screen.getByText("+ New"));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "my_group" } });
    fireEvent.click(screen.getByText("+ Add item"));
    fireEvent.click(screen.getByText("Accept"));
    const grp = (useEditorStore.getState().root!.mandatoryContent as { name: string; content: unknown[] }[]).find((d) => d.name === "my_group")!;
    expect(grp.content).toHaveLength(1);
  });

  it("discards an in-progress edit on Cancel", () => {
    useEditorStore.getState().upsertContentDef("lists", { name: "keep_me", content: [] });
    useEditorStore.getState().openContentDrawer("lists", "keep_me");
    render(<ContentDrawer />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "renamed" } });
    fireEvent.click(screen.getByText("Cancel"));
    expect((useEditorStore.getState().root!.contentLists as { name: string }[]).map((d) => d.name)).toEqual(["keep_me"]);
  });
});
