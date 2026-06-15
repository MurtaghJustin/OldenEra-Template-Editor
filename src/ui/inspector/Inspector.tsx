import { useEditorStore } from "../../state/store";
import { ZonePanel } from "./ZonePanel";
import { ConnectionPanel } from "./ConnectionPanel";
import { GameRulesPanel } from "./GameRulesPanel";
import { GlobalBansPanel } from "./GlobalBansPanel";
import { NodeTypesPanel } from "./NodeTypesPanel";

export function Inspector() {
  const selection = useEditorStore((s) => s.selection);
  if (!selection) return <div style={{ padding: 12, opacity: 0.6 }}>Select a zone or connection.</div>;
  switch (selection.kind) {
    case "zone": return <div style={{ padding: 12 }}><ZonePanel key={selection.id} zoneName={selection.id} /></div>;
    case "connection": return <div style={{ padding: 12 }}><ConnectionPanel key={selection.id} connId={selection.id} /></div>;
    case "gameRules": return <div style={{ padding: 12 }}><GameRulesPanel /></div>;
    case "globalBans": return <div style={{ padding: 12 }}><GlobalBansPanel /></div>;
    case "nodeTypes": return <div style={{ padding: 12 }}><NodeTypesPanel /></div>;
  }
}
