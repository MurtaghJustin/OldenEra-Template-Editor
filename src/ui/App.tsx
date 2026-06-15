import { Toolbar } from "./Toolbar";
import { GraphCanvas } from "./GraphCanvas";
import { NodeTypePalette } from "./NodeTypePalette";
import { InteractionHints } from "./InteractionHints";
import { Inspector } from "./inspector/Inspector";
import { useEditorStore } from "../state/store";

function IssuesBanner() {
  const issues = useEditorStore((s) => s.issues);
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  if (errors.length === 0 && warnings.length === 0) return null;
  return (
    <div style={{ padding: 6, fontSize: 12, background: errors.length ? "#3a1d1d" : "#33301d", borderTop: "1px solid #333", maxHeight: 120, overflow: "auto" }}>
      {errors.map((e, i) => <div key={`e${i}`} style={{ color: "#f3a" }}>✗ {e.message} <span style={{ opacity: 0.5 }}>({e.path})</span></div>)}
      {warnings.map((w, i) => <div key={`w${i}`} style={{ color: "#fd6" }}>⚠ {w.message} <span style={{ opacity: 0.5 }}>({w.path})</span></div>)}
    </div>
  );
}

export default function App() {
  const root = useEditorStore((s) => s.root);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {root ? <GraphCanvas /> : <div style={{ padding: 24, opacity: 0.6 }}>Click <b>New</b> to start a blank template, or <b>Open</b> a .rmg.json.</div>}
        </div>
        <div style={{ width: 320, borderLeft: "1px solid #333", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <NodeTypePalette />
          <InteractionHints />
          <div style={{ flex: 1, overflow: "auto" }}>
            <Inspector />
          </div>
        </div>
      </div>
      <IssuesBanner />
    </div>
  );
}
