import { useState } from "react";
import { useEditorStore } from "../state/store";
import { openFileText, saveText, exportPng } from "../state/fileio";
import { renderPreview, PREVIEW_SIZE } from "../core/preview";

export function Toolbar() {
  const dirty = useEditorStore((s) => s.dirty);
  const fileName = useEditorStore((s) => s.fileName);
  const nodeTypes = useEditorStore((s) => s.nodeTypes);
  const graph = useEditorStore((s) => s.graph);
  const select = useEditorStore((s) => s.select);
  const [typeId, setTypeId] = useState(nodeTypes[0].id);
  let counter = 0;

  const onOpen = async () => {
    const res = await openFileText();
    if (res) useEditorStore.getState().loadFromText(res.text, res.name);
  };
  const onSave = async () => {
    const text = useEditorStore.getState().serializeForSave();
    await saveText(text, fileName);
    useEditorStore.setState({ dirty: false });
  };
  const onExport = async () => {
    if (!graph) return;
    const canvas = document.createElement("canvas");
    canvas.width = PREVIEW_SIZE; canvas.height = PREVIEW_SIZE;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    renderPreview(ctx, graph, { width: PREVIEW_SIZE, height: PREVIEW_SIZE, style: "parchment" });
    await exportPng(canvas, fileName.replace(/\.rmg\.json$/, "").replace(/\.json$/, "") + ".png");
  };
  const onAddZone = () => {
    const name = `zone_${Date.now().toString(36)}_${counter++}`;
    useEditorStore.getState().addZoneOfType(name, typeId, {});
    select({ kind: "zone", id: name });
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 8, borderBottom: "1px solid #333" }}>
      <button onClick={onOpen}>Open</button>
      <button onClick={onSave}>Save</button>
      <button onClick={onExport}>Export PNG</button>
      <span style={{ width: 16 }} />
      <select aria-label="New zone type" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
        {nodeTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <button onClick={onAddZone}>Add zone</button>
      <button onClick={() => select({ kind: "gameRules" })}>Game rules</button>
      <button onClick={() => select({ kind: "globalBans" })}>Global bans</button>
      <span style={{ marginLeft: "auto", opacity: 0.7 }}>
        {fileName}{dirty ? " • unsaved" : ""}
      </span>
    </div>
  );
}
