import { useState } from "react";
import { useEditorStore } from "../../state/store";
import { catalogs } from "../../core/catalogs";
import { NumberField, SelectField, TextField, ReferenceListField } from "./fields";

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

      <NumberField label="Size" value={zone.size} onChange={(n) => updateZone(zoneName, { size: n })} />
      <SelectField label="Layout" value={zone.layout} options={catalogs.layouts}
        onChange={(v) => updateZone(zoneName, { layout: v })} />
      <NumberField label="Guard cutoff" value={zone.guardCutoffValue ?? 0}
        onChange={(n) => updateZone(zoneName, { guardCutoffValue: n })} />
      <NumberField label="Guard multiplier" value={zone.guardMultiplier ?? 1}
        onChange={(n) => updateZone(zoneName, { guardMultiplier: n })} />
      <NumberField label="Guard randomization" value={zone.guardRandomization ?? 0}
        onChange={(n) => updateZone(zoneName, { guardRandomization: n })} />
      <NumberField label="Guarded value / area" value={zone.guardedContentValuePerArea ?? 0}
        onChange={(n) => updateZone(zoneName, { guardedContentValuePerArea: n })} />

      <ReferenceListField label="Mandatory content" values={zone.mandatoryContent ?? []}
        options={catalogs.mandatoryContentNames ?? []}
        onChange={(next) => updateZone(zoneName, { mandatoryContent: next })} />
      <ReferenceListField label="Content count limits" values={zone.contentCountLimits ?? []}
        options={catalogs.countLimitNames ?? []}
        onChange={(next) => updateZone(zoneName, { contentCountLimits: next })} />

      <button style={{ marginTop: 12, color: "#e88" }} onClick={() => removeZoneById(zoneName)}>Delete zone</button>
    </div>
  );
}
