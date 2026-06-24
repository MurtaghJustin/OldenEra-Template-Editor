import { useState } from "react";
import { useEditorStore } from "../../state/store";
import { TextField } from "./fields";
import { ZoneFields } from "./ZoneFields";
import type { Zone } from "../../core/types";
import type { NodeType } from "../../core/nodeTypes";

// Lists built-in and custom node types. Custom types can be created, edited (label + the full zone
// via the shared ZoneFields editor) and deleted; built-ins are read-only but can be duplicated into
// an editable custom type. Custom types persist in localStorage (see the store).
export function NodeTypesPanel() {
  const nodeTypes = useEditorStore((s) => s.nodeTypes);
  const createCustomType = useEditorStore((s) => s.createCustomType);
  const updateCustomType = useEditorStore((s) => s.updateCustomType);
  const removeCustomType = useEditorStore((s) => s.removeCustomType);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = editingId ? nodeTypes.find((t) => t.id === editingId && !t.builtin) : null;

  if (editing) {
    // The type's data is a Zone minus its name; give ZoneFields a name-less Zone view.
    const zone = { name: "", ...editing.zone } as Zone;
    const addRef = (field: keyof Zone, name: string) => {
      const t = useEditorStore.getState().nodeTypes.find((x) => x.id === editing.id);
      const cur = ((t?.zone as Record<string, unknown> | undefined)?.[field] as string[] | undefined) ?? [];
      if (!cur.includes(name)) updateCustomType(editing.id, { zone: { ...t!.zone, [field]: [...cur, name] } });
    };
    return (
      <div>
        <button onClick={() => setEditingId(null)}>← All types</button>
        <h3>Edit type</h3>
        <TextField label="Label" value={editing.label} onChange={(label) => updateCustomType(editing.id, { label })} />
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>id: {editing.id}</div>
        <ZoneFields zone={zone}
          onPatch={(patch) => { const { name: _n, ...rest } = { name: "", ...editing.zone, ...patch }; updateCustomType(editing.id, { zone: rest as NodeType["zone"] }); }}
          onAddRef={addRef} />
        <button style={{ marginTop: 12, color: "#e88" }} onClick={() => { removeCustomType(editing.id); setEditingId(null); }}>Delete type</button>
      </div>
    );
  }

  return (
    <div>
      <h3>Node Types</h3>
      <button onClick={() => setEditingId(createCustomType())}>+ New custom type</button>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
        {nodeTypes.map((t) => (
          <li key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid #2a2a2a" }}>
            <span style={{ flex: 1 }}>
              <strong>{t.label}</strong> <span style={{ opacity: 0.5, fontSize: 12 }}>({t.id})</span>
              {t.builtin && <em style={{ opacity: 0.5, fontSize: 12 }}> built-in</em>}
            </span>
            {t.builtin
              ? <button onClick={() => setEditingId(createCustomType(t.id))}>Duplicate</button>
              : <>
                  <button onClick={() => setEditingId(t.id)}>Edit</button>
                  <button style={{ color: "#e88" }} onClick={() => removeCustomType(t.id)}>Delete</button>
                </>}
          </li>
        ))}
      </ul>
    </div>
  );
}
