import { useEditorStore } from "../../state/store";
import { catalogs } from "../../core/catalogs";
import { NumberField, SelectField, ReferenceListField, SelectorField, TextField } from "./fields";
import { MainObjectsEditor } from "./MainObjectsEditor";
import type { ContentKind } from "../../core/content";
import type { Zone, MainObject, Selector } from "../../core/types";

// The full set of zone-level fields, shared by the zone inspector (editing one zone) and node-type
// authoring (editing a type's default zone) — so anything editable in a type is editable per zone.
// `onPatch` merges a partial; `onAddRef` appends one reference name to a string[] field (the parent
// reads the latest value so an async "+ New" commit can't clobber concurrent edits).
export function ZoneFields({ zone, onPatch, onAddRef }: {
  zone: Zone;
  onPatch: (patch: Partial<Zone>) => void;
  onAddRef: (field: keyof Zone, name: string) => void;
}) {
  const openContentDrawer = useEditorStore((s) => s.openContentDrawer);
  const createContentDraft = useEditorStore((s) => s.createContentDraft);

  const refPicker = (label: string, field: keyof Zone, kind: ContentKind, options: string[]) => (
    <ReferenceListField label={label} values={(zone[field] as string[] | undefined) ?? []} options={options}
      onChange={(next) => onPatch({ [field]: next } as Partial<Zone>)}
      onOpen={(name) => openContentDrawer(kind, name)}
      onAddNew={() => createContentDraft(kind, (name) => onAddRef(field, name))} />
  );
  const reaction = (zone.guardReactionDistribution ?? []).map(String).join(", ");

  return (
    <>
      <NumberField label="Size" value={zone.size ?? 1} onChange={(n) => onPatch({ size: n })} />
      <SelectField label="Layout" value={zone.layout ?? ""} options={catalogs.layouts} onChange={(v) => onPatch({ layout: v })} />
      <NumberField label="Crossroads position" value={zone.crossroadsPosition ?? 0} onChange={(n) => onPatch({ crossroadsPosition: n })} />
      <NumberField label="Diplomacy modifier" value={zone.diplomacyModifier ?? 0} onChange={(n) => onPatch({ diplomacyModifier: n })} />

      <div style={{ fontSize: 12, opacity: 0.7, margin: "10px 0 2px" }}>Guards</div>
      <NumberField label="Guard cutoff" value={zone.guardCutoffValue ?? 0} onChange={(n) => onPatch({ guardCutoffValue: n })} />
      <NumberField label="Guard multiplier" value={zone.guardMultiplier ?? 1} onChange={(n) => onPatch({ guardMultiplier: n })} />
      <NumberField label="Guard randomization" value={zone.guardRandomization ?? 0} onChange={(n) => onPatch({ guardRandomization: n })} />
      <NumberField label="Guard weekly increment" value={zone.guardWeeklyIncrement ?? 0} onChange={(n) => onPatch({ guardWeeklyIncrement: n })} />
      <TextField label="Guard reaction distribution (comma-separated)" value={reaction}
        onChange={(v) => onPatch({ guardReactionDistribution: v.split(",").map((s) => parseFloat(s.trim())).filter((n) => Number.isFinite(n)) })} />

      <div style={{ fontSize: 12, opacity: 0.7, margin: "10px 0 2px" }}>Content budgets</div>
      <NumberField label="Guarded value" value={zone.guardedContentValue ?? 0} onChange={(n) => onPatch({ guardedContentValue: n })} />
      <NumberField label="Guarded value / area" value={zone.guardedContentValuePerArea ?? 0} onChange={(n) => onPatch({ guardedContentValuePerArea: n })} />
      <NumberField label="Unguarded value" value={zone.unguardedContentValue ?? 0} onChange={(n) => onPatch({ unguardedContentValue: n })} />
      <NumberField label="Unguarded value / area" value={zone.unguardedContentValuePerArea ?? 0} onChange={(n) => onPatch({ unguardedContentValuePerArea: n })} />
      <NumberField label="Resources value" value={zone.resourcesValue ?? 0} onChange={(n) => onPatch({ resourcesValue: n })} />
      <NumberField label="Resources value / area" value={zone.resourcesValuePerArea ?? 0} onChange={(n) => onPatch({ resourcesValuePerArea: n })} />

      <div style={{ fontSize: 12, opacity: 0.7, margin: "10px 0 2px" }}>Biomes</div>
      <SelectorField label="Zone biome" value={zone.zoneBiome as Selector | undefined} argOptions={catalogs.biomes ?? []} onChange={(s) => onPatch({ zoneBiome: s })} />
      <SelectorField label="Content biome" value={zone.contentBiome as Selector | undefined} argOptions={catalogs.biomes ?? []} onChange={(s) => onPatch({ contentBiome: s })} />
      <SelectorField label="Meta-objects biome" value={zone.metaObjectsBiome as Selector | undefined} argOptions={catalogs.biomes ?? []} onChange={(s) => onPatch({ metaObjectsBiome: s })} />

      <div style={{ fontSize: 12, opacity: 0.7, margin: "10px 0 2px" }}>Objects &amp; content</div>
      <MainObjectsEditor objects={(zone.mainObjects as MainObject[] | undefined) ?? []} onChange={(next) => onPatch({ mainObjects: next })} />
      {refPicker("Guarded content pool", "guardedContentPool", "pools", catalogs.pools ?? [])}
      {refPicker("Unguarded content pool", "unguardedContentPool", "pools", catalogs.pools ?? [])}
      {refPicker("Resources content pool", "resourcesContentPool", "pools", catalogs.pools ?? [])}
      {refPicker("Mandatory content", "mandatoryContent", "mandatory", catalogs.mandatoryContentNames ?? [])}
      {refPicker("Content count limits", "contentCountLimits", "countLimits", catalogs.countLimitNames ?? [])}
    </>
  );
}
