import { useState } from "react";
import { useEditorStore } from "../../state/store";
import { catalogs } from "../../core/catalogs";
import { NumberField, SelectField, TextField, ReferenceListField } from "./fields";
import { MainObjectsEditor } from "./MainObjectsEditor";
import type { ContentKind } from "../../core/content";
import type { Zone, MainObject } from "../../core/types";

export function ZonePanel({ zoneName }: { zoneName: string }) {
  const root = useEditorStore((s) => s.root);
  const vi = useEditorStore((s) => s.variantIndex);
  const updateZone = useEditorStore((s) => s.updateZone);
  const renameZoneById = useEditorStore((s) => s.renameZoneById);
  const removeZoneById = useEditorStore((s) => s.removeZoneById);
  const openContentDrawer = useEditorStore((s) => s.openContentDrawer);
  const createContentDraft = useEditorStore((s) => s.createContentDraft);
  const nodeTypes = useEditorStore((s) => s.nodeTypes);
  const zone = root?.variants[vi].zones.find((z) => z.name === zoneName);
  const [nameDraft, setNameDraft] = useState(zoneName);
  if (!zone) return null;

  // Append a reference to a zone's string[] field, reading the latest value so concurrent edits
  // (e.g. "+ New" committing a definition) don't clobber each other.
  const addRef = (field: keyof Zone, name: string) => {
    const z = useEditorStore.getState().root?.variants[vi].zones.find((zz) => zz.name === zoneName);
    const cur = (z?.[field] as string[] | undefined) ?? [];
    if (!cur.includes(name)) updateZone(zoneName, { [field]: [...cur, name] } as Partial<Zone>);
  };

  // A reference picker wired to the content drawer: pills open the definition, "+ New" creates one
  // and references it back here on Accept.
  const refPicker = (label: string, field: keyof Zone, kind: ContentKind, options: string[]) => (
    <ReferenceListField label={label} values={(zone[field] as string[] | undefined) ?? []} options={options}
      onChange={(next) => updateZone(zoneName, { [field]: next } as Partial<Zone>)}
      onOpen={(name) => openContentDrawer(kind, name)}
      onAddNew={() => createContentDraft(kind, (name) => addRef(field, name))} />
  );

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

      <MainObjectsEditor objects={(zone.mainObjects as MainObject[] | undefined) ?? []}
        onChange={(next) => updateZone(zoneName, { mainObjects: next })} />

      {refPicker("Guarded content pool", "guardedContentPool", "pools", catalogs.pools ?? [])}
      {refPicker("Unguarded content pool", "unguardedContentPool", "pools", catalogs.pools ?? [])}
      {refPicker("Resources content pool", "resourcesContentPool", "pools", catalogs.pools ?? [])}
      {refPicker("Mandatory content", "mandatoryContent", "mandatory", catalogs.mandatoryContentNames ?? [])}
      {refPicker("Content count limits", "contentCountLimits", "countLimits", catalogs.countLimitNames ?? [])}

      <button style={{ marginTop: 12, color: "#e88" }} onClick={() => removeZoneById(zoneName)}>Delete zone</button>
    </div>
  );
}
