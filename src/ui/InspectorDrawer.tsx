import { useEffect } from "react";
import { useEditorStore } from "../state/store";
import { Inspector } from "./inspector/Inspector";

const TITLES: Record<string, string> = {
  zone: "Zone", connection: "Connection", gameRules: "Game rules", globalBans: "Global bans", nodeTypes: "Node types",
};

// Non-modal left slide-out hosting the inspector. Open whenever something is selected; closing it
// (✕ or Esc) clears the selection and reclaims the canvas. The content drawer layers above it.
export function InspectorDrawer() {
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);

  // Esc closes the inspector — but only when the content drawer isn't open (it owns Esc when above).
  useEffect(() => {
    if (!selection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || useEditorStore.getState().contentDrawer) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
      useEditorStore.getState().select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection]);

  if (!selection) return null;
  return (
    <div className="inspector-drawer">
      <div className="inspector-drawer-header">
        <span style={{ fontWeight: "bold", flex: 1 }}>{TITLES[selection.kind] ?? "Details"}</span>
        <button aria-label="Close inspector" title="Close" onClick={() => select(null)}>✕</button>
      </div>
      <div className="inspector-drawer-body">
        <Inspector />
      </div>
    </div>
  );
}
