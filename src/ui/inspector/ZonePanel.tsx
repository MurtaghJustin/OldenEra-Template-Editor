import { useState } from "react";
import { useEditorStore } from "../../state/store";
import { SelectField, TextField } from "./fields";
import { ZoneFields } from "./ZoneFields";
import type { Zone } from "../../core/types";

export function ZonePanel({ zoneName }: { zoneName: string }) {
  const root = useEditorStore((s) => s.root);
  const vi = useEditorStore((s) => s.variantIndex);
  const updateZone = useEditorStore((s) => s.updateZone);
  const renameZoneById = useEditorStore((s) => s.renameZoneById);
  const removeZoneById = useEditorStore((s) => s.removeZoneById);
  const nodeTypes = useEditorStore((s) => s.nodeTypes);
  const zone = root?.variants[vi].zones.find((z) => z.name === zoneName);
  const [nameDraft, setNameDraft] = useState(zoneName);
  if (!zone) return null;

  // Append a reference to a zone's string[] field, reading the latest value so an async "+ New"
  // commit doesn't clobber concurrent edits.
  const addRef = (field: keyof Zone, name: string) => {
    const z = useEditorStore.getState().root?.variants[vi].zones.find((zz) => zz.name === zoneName);
    const cur = (z?.[field] as string[] | undefined) ?? [];
    if (!cur.includes(name)) updateZone(zoneName, { [field]: [...cur, name] } as Partial<Zone>);
  };

  return (
    <div>
      <h3>Zone</h3>
      <TextField label="Name" value={nameDraft} onChange={setNameDraft} />
      <button onClick={() => nameDraft !== zoneName && renameZoneById(zoneName, nameDraft)}>Apply name</button>

      <SelectField label="Apply type" value="" options={nodeTypes.map((t) => t.id)}
        onChange={(id) => {
          const t = nodeTypes.find((tt) => tt.id === id); if (!t) return;
          const { name: _drop, ...rest } = { name: "", ...structuredClone(t.zone) };
          updateZone(zoneName, rest);
        }} />

      <ZoneFields zone={zone} onPatch={(patch) => updateZone(zoneName, patch)} onAddRef={addRef} />

      <button style={{ marginTop: 12, color: "#e88" }} onClick={() => removeZoneById(zoneName)}>Delete zone</button>
    </div>
  );
}
