import { useEditorStore } from "../../state/store";
import { catalogs } from "../../core/catalogs";
import { NumberField, SelectField, ReferenceListField, SelectorField, ReactionDistributionField } from "./fields";
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

  const refPicker = (label: string, field: keyof Zone, kind: ContentKind, options: string[], hint: string) => (
    <ReferenceListField label={label} hint={hint} values={(zone[field] as string[] | undefined) ?? []} options={options}
      onChange={(next) => onPatch({ [field]: next } as Partial<Zone>)}
      onOpen={(name) => openContentDrawer(kind, name)}
      onAddNew={() => createContentDraft(kind, (name) => onAddRef(field, name))} />
  );
  // Flow fields into as many columns as fit (the inspector is wide); section headers and the wide
  // editors span the full row.
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", columnGap: 16, alignItems: "start" };
  const span: React.CSSProperties = { gridColumn: "1 / -1" };
  const head = (t: string) => <div style={{ ...span, fontSize: 12, opacity: 0.7, margin: "12px 0 2px", borderBottom: "1px solid #2e2e2e", paddingBottom: 2 }}>{t}</div>;

  return (
    <div style={grid}>
      {head("Basics")}
      <NumberField label="Size" value={zone.size ?? 1} onChange={(n) => onPatch({ size: n })}
        hint="Relative area weight; 1.0 is baseline. Scales the zone's share of the map and its content budget." />
      <SelectField label="Layout" value={zone.layout ?? ""} options={catalogs.layouts} onChange={(v) => onPatch({ layout: v })}
        hint="Terrain/obstacle/encounter profile — a built-in name or one defined in zoneLayouts." />
      <NumberField label="Crossroads position" value={zone.crossroadsPosition ?? 0} onChange={(n) => onPatch({ crossroadsPosition: n })}
        hint="0 = no crossroads; 1 = the zone has a central road junction." />
      <NumberField label="Diplomacy modifier" value={zone.diplomacyModifier ?? 0} onChange={(n) => onPatch({ diplomacyModifier: n })}
        hint="Adjusts neutral-creature join odds; negative makes recruiting harder." />

      {head("Guards")}
      <NumberField label="Guard cutoff" value={zone.guardCutoffValue ?? 0} onChange={(n) => onPatch({ guardCutoffValue: n })}
        hint="Minimum guard value to keep; guards weaker than this are dropped entirely (often 1500)." />
      <NumberField label="Guard multiplier" value={zone.guardMultiplier ?? 1} onChange={(n) => onPatch({ guardMultiplier: n })}
        hint="Scales this zone's content guard values; doesn't affect border/connection guards." />
      <NumberField label="Guard randomization" value={zone.guardRandomization ?? 0} onChange={(n) => onPatch({ guardRandomization: n })}
        hint="Per-guard random variance as a fraction (0.05 = ±5%); ~0.05–0.25 typical." />
      <NumberField label="Guard weekly increment" value={zone.guardWeeklyIncrement ?? 0} onChange={(n) => onPatch({ guardWeeklyIncrement: n })}
        hint="Compounding weekly guard growth (0.10 = +10% per week)." />
      <div style={span}>
        <ReactionDistributionField label="Guard reaction distribution" value={zone.guardReactionDistribution ?? []}
          hint="Six weights spreading guards across disposition tiers (0 = fight … 5 = join)."
          onChange={(v) => onPatch({ guardReactionDistribution: v })} />
      </div>

      {head("Content budgets")}
      <NumberField label="Guarded value" value={zone.guardedContentValue ?? 0} onChange={(n) => onPatch({ guardedContentValue: n })}
        hint="Total value budget of guarded content (absolute amount)." />
      <NumberField label="Guarded value / area" value={zone.guardedContentValuePerArea ?? 0} onChange={(n) => onPatch({ guardedContentValuePerArea: n })}
        hint="Guarded-content value budget, scaled by zone size." />
      <NumberField label="Unguarded value" value={zone.unguardedContentValue ?? 0} onChange={(n) => onPatch({ unguardedContentValue: n })}
        hint="Total value budget of freely-accessible content (absolute)." />
      <NumberField label="Unguarded value / area" value={zone.unguardedContentValuePerArea ?? 0} onChange={(n) => onPatch({ unguardedContentValuePerArea: n })}
        hint="Unguarded-content value budget, scaled by zone size." />
      <NumberField label="Resources value" value={zone.resourcesValue ?? 0} onChange={(n) => onPatch({ resourcesValue: n })}
        hint="Total value budget for resource pickups/mines (absolute)." />
      <NumberField label="Resources value / area" value={zone.resourcesValuePerArea ?? 0} onChange={(n) => onPatch({ resourcesValuePerArea: n })}
        hint="Resource value budget, scaled by zone size." />

      {head("Biomes")}
      <SelectorField label="Zone biome" value={zone.zoneBiome as Selector | undefined} argOptions={catalogs.biomes ?? []} onChange={(s) => onPatch({ zoneBiome: s })}
        hint="Selects the zone's terrain biome (FromList / Match / MatchMainObject / MatchZone)." />
      <SelectorField label="Content biome" value={zone.contentBiome as Selector | undefined} argOptions={catalogs.biomes ?? []} onChange={(s) => onPatch({ contentBiome: s })}
        hint="Biome theme used when choosing content objects." />
      <SelectorField label="Meta-objects biome" value={zone.metaObjectsBiome as Selector | undefined} argOptions={catalogs.biomes ?? []} onChange={(s) => onPatch({ metaObjectsBiome: s })}
        hint="Biome theme for meta/decoration objects." />

      {head("Objects & content")}
      <div style={span}>
        <MainObjectsEditor objects={(zone.mainObjects as MainObject[] | undefined) ?? []} onChange={(next) => onPatch({ mainObjects: next })} />
      </div>
      {/* Reference pickers each take a full row — long pool/group names overflow a narrow column. */}
      <div style={span}>{refPicker("Guarded content pool", "guardedContentPool", "pools", catalogs.pools ?? [], "Pool(s) the guarded objects (banks, dwellings, strong buildings) are drawn from.")}</div>
      <div style={span}>{refPicker("Unguarded content pool", "unguardedContentPool", "pools", catalogs.pools ?? [], "Pool(s) the freely-accessible objects are drawn from.")}</div>
      <div style={span}>{refPicker("Resources content pool", "resourcesContentPool", "pools", catalogs.pools ?? [], "Pool(s) the resource pickups/mines are drawn from.")}</div>
      <div style={span}>{refPicker("Mandatory content", "mandatoryContent", "mandatory", catalogs.mandatoryContentNames ?? [], "Mandatory-content groups guaranteed to spawn in this zone.")}</div>
      <div style={span}>{refPicker("Content count limits", "contentCountLimits", "countLimits", catalogs.countLimitNames ?? [], "Per-object cap-sets limiting how many of an object can appear here.")}</div>
    </div>
  );
}
