import { useEditorStore } from "../state/store";
import { openFileText, saveText, exportPng } from "../state/fileio";
import { renderPreview, PREVIEW_SIZE } from "../core/preview";

export function Toolbar() {
  const dirty = useEditorStore((s) => s.dirty);
  const fileName = useEditorStore((s) => s.fileName);
  const root = useEditorStore((s) => s.root);
  const select = useEditorStore((s) => s.select);

  const onOpen = async () => {
    const res = await openFileText();
    if (res) useEditorStore.getState().loadFromText(res.text, res.name);
  };
  const onSave = async () => {
    // Saving re-runs auto-layout (resetting the canvas to it) so the document and preview reflect
    // a clean computed arrangement rather than a hand-dragged scratch layout.
    useEditorStore.getState().computeLayout();
    const text = useEditorStore.getState().serializeForSave();
    await saveText(text, fileName);
    useEditorStore.setState({ dirty: false });
  };
  const onExport = async () => {
    useEditorStore.getState().computeLayout(); // PNG always renders the canonical auto-layout
    const graph = useEditorStore.getState().graph;
    if (!graph) return;
    const canvas = document.createElement("canvas");
    canvas.width = PREVIEW_SIZE; canvas.height = PREVIEW_SIZE;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    renderPreview(ctx, graph, { width: PREVIEW_SIZE, height: PREVIEW_SIZE, style: "parchment" });
    await exportPng(canvas, fileName.replace(/\.rmg\.json$/, "").replace(/\.json$/, "") + ".png");
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 8, borderBottom: "1px solid #333" }}>
      <button onClick={() => useEditorStore.getState().newTemplate()}>New</button>
      <button onClick={onOpen}>Open</button>
      <button onClick={onSave} disabled={!root}>Save</button>
      <button onClick={onExport} disabled={!root}>Export PNG</button>
      <span style={{ width: 16 }} />
      <button onClick={() => useEditorStore.getState().computeLayout()} disabled={!root}>Compute layout</button>
      <span style={{ width: 16 }} />
      <button onClick={() => select({ kind: "gameRules" })}>Game rules</button>
      <button onClick={() => select({ kind: "globalBans" })}>Global bans</button>
      <button onClick={() => select({ kind: "nodeTypes" })}>Node types</button>
      <span style={{ marginLeft: "auto", opacity: 0.7 }}>
        {fileName}{dirty ? " • unsaved" : ""}
      </span>
    </div>
  );
}
