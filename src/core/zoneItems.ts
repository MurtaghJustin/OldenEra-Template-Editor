import type { TemplateRoot, Zone } from "./types";
import { contentDefs, uniqueContentName, type ContentDef } from "./content";

// A friendly, flattened view of everything that spawns in a zone — the item-centric layer that sits
// on top of the pool/mandatory reference model. This module is pure (no store, no React) so the
// projection and every mutation are unit-testable in isolation.

export type ItemCategory = "guarded" | "unguarded" | "resources" | "mandatory";

// Zone field <-> pool category. Mandatory is handled separately (it's a different shape).
export const POOL_CATEGORY_FIELD: Record<"guarded" | "unguarded" | "resources", keyof Zone> = {
  guarded: "guardedContentPool",
  unguarded: "unguardedContentPool",
  resources: "resourcesContentPool",
};
const POOL_CATEGORIES = ["guarded", "unguarded", "resources"] as const;

// Precise write-back locator for a single row, so an edit hits exactly the object it came from.
export type ObjectSource =
  | { defKind: "pools"; poolName: string; groupIndex: number; contentIndex: number }
  | { defKind: "mandatory"; groupName: string; itemIndex: number };

// One inline object drawn from a template-defined pool group, or a mandatory item with a fixed SID.
export interface ObjectRow {
  kind: "object";
  sid: string;
  variant?: number;
  category: ItemCategory;
  guaranteed: boolean;          // true = mandatory (always spawns); false = pool (probabilistic)
  guarded?: boolean;            // pool items: derived from category; mandatory items: explicit isGuarded
  weight?: number;              // pool items only
  isMine?: boolean;             // mandatory items only
  soloEncounter?: boolean;      // mandatory items only
  editable: true;
  source: ObjectSource;
}

// An includeLists reference — a single collapsible chip, never expanded into per-object rows and
// never edited in place (the list is shared; you drill into the list editor to change it).
export interface ListChipRow {
  kind: "list";
  listName: string;
  category: ItemCategory;
  objectCount: number | null;   // null = list not defined in this template (built-in / unknown)
  editable: false;
}

// A referenced pool/mandatory group that isn't defined in this template (a built-in game default).
// We only know its name — its contents live outside the file — so it renders as a read-only marker.
export interface BuiltinRefRow {
  kind: "builtinRef";
  name: string;
  category: ItemCategory;
  refKind: "pools" | "mandatory";
  editable: false;
}

export type ZoneItemRow = ObjectRow | ListChipRow | BuiltinRefRow;

type PoolContent = { sid?: string; weight?: number; variant?: number };
type PoolGroup = { weight?: number; includeLists?: string[]; content?: PoolContent[] };
type MandatoryItem = {
  sid?: string; variant?: number; isGuarded?: boolean; isMine?: boolean;
  soloEncounter?: boolean; includeLists?: string[];
};

const poolGroups = (def: ContentDef): PoolGroup[] => (def.groups as PoolGroup[] | undefined) ?? [];
const mandatoryItems = (def: ContentDef): MandatoryItem[] => (def.content as MandatoryItem[] | undefined) ?? [];
const listSize = (def: ContentDef | undefined): number | null =>
  def ? ((def.content as unknown[] | undefined)?.length ?? 0) : null;

// Flatten a zone's referenced pools + mandatory groups into display rows. Only template-defined defs
// contribute object rows; built-in references (name-only) become BuiltinRefRows.
export function resolveZoneItems(root: TemplateRoot | null, zone: Zone): ZoneItemRow[] {
  if (!root) return [];
  const rows: ZoneItemRow[] = [];
  const poolByName = new Map(contentDefs(root, "pools").map((d) => [d.name, d] as const));
  const listByName = new Map(contentDefs(root, "lists").map((d) => [d.name, d] as const));

  for (const category of POOL_CATEGORIES) {
    const refs = (zone[POOL_CATEGORY_FIELD[category]] as string[] | undefined) ?? [];
    for (const poolName of refs) {
      const def = poolByName.get(poolName);
      if (!def) { rows.push({ kind: "builtinRef", name: poolName, category, refKind: "pools", editable: false }); continue; }
      poolGroups(def).forEach((g, groupIndex) => {
        // Every content slot becomes a row — including a blank one just added via "+ Add", so the
        // user can pick its object inline (skipping empty SIDs would make new rows vanish).
        (g.content ?? []).forEach((c, contentIndex) => {
          rows.push({
            kind: "object", sid: c.sid ?? "", variant: c.variant, category, guaranteed: false,
            guarded: category === "guarded" ? true : category === "unguarded" ? false : undefined,
            weight: c.weight, editable: true,
            source: { defKind: "pools", poolName, groupIndex, contentIndex },
          });
        });
        for (const listName of g.includeLists ?? [])
          rows.push({ kind: "list", listName, category, objectCount: listSize(listByName.get(listName)), editable: false });
      });
    }
  }

  const mandByName = new Map(contentDefs(root, "mandatory").map((d) => [d.name, d] as const));
  for (const groupName of (zone.mandatoryContent as string[] | undefined) ?? []) {
    const def = mandByName.get(groupName);
    if (!def) { rows.push({ kind: "builtinRef", name: groupName, category: "mandatory", refKind: "mandatory", editable: false }); continue; }
    mandatoryItems(def).forEach((it, itemIndex) => {
      const lists = it.includeLists ?? [];
      const hasSid = typeof it.sid === "string" && it.sid.length > 0;
      // Render an object row for a real object (non-empty sid) or a genuinely blank slot with no
      // lists (a freshly added item, to be filled in). An item that only pulls from lists — the
      // common "sid: '' + includeLists" idiom — shows as chips only, with no spurious empty row.
      if (hasSid || lists.length === 0)
        rows.push({
          kind: "object", sid: it.sid ?? "", variant: it.variant, category: "mandatory", guaranteed: true,
          guarded: it.isGuarded, isMine: it.isMine, soloEncounter: it.soloEncounter, editable: true,
          source: { defKind: "mandatory", groupName, itemIndex },
        });
      for (const listName of lists)
        rows.push({ kind: "list", listName, category: "mandatory", objectCount: listSize(listByName.get(listName)), editable: false });
    });
  }
  return rows;
}

// How many zones (across all variants) reference a given def. >1 means editing it here changes other
// zones too — the "shared by N zones" warning.
export function countZonesReferencing(root: TemplateRoot | null, refKind: "pools" | "mandatory", name: string): number {
  if (!root) return 0;
  const fields = refKind === "pools"
    ? [POOL_CATEGORY_FIELD.guarded, POOL_CATEGORY_FIELD.unguarded, POOL_CATEGORY_FIELD.resources]
    : (["mandatoryContent"] as (keyof Zone)[]);
  let n = 0;
  for (const v of root.variants ?? [])
    for (const z of v.zones ?? [])
      if (fields.some((f) => ((z[f] as string[] | undefined) ?? []).includes(name))) n++;
  return n;
}

// Names of the template-defined pools a zone references in a category (built-in names skipped). The
// first is the default add target; the full list feeds the per-row "move to pool" dropdown.
export function editablePoolsForCategory(root: TemplateRoot | null, zone: Zone, category: "guarded" | "unguarded" | "resources"): string[] {
  if (!root) return [];
  const defined = new Set(contentDefs(root, "pools").map((d) => d.name));
  return ((zone[POOL_CATEGORY_FIELD[category]] as string[] | undefined) ?? []).filter((n) => defined.has(n));
}

// The template-defined mandatory groups a zone references (built-in names skipped).
export function editableMandatoryGroups(root: TemplateRoot | null, zone: Zone): string[] {
  if (!root) return [];
  const defined = new Set(contentDefs(root, "mandatory").map((d) => d.name));
  return ((zone.mandatoryContent as string[] | undefined) ?? []).filter((n) => defined.has(n));
}

// ---- Pure mutations (return a NEW def; never mutate the argument) --------------------------------

// Add an inline object to a pool, into its first group (creating a group if it has none).
export function addObjectToPoolDef(def: ContentDef, entry: PoolContent): ContentDef {
  const groups = structuredClone(poolGroups(def));
  if (groups.length === 0) groups.push({ weight: 1, includeLists: [], content: [] });
  groups[0] = { ...groups[0], content: [...(groups[0].content ?? []), { weight: 100, ...entry }] };
  return { ...def, groups };
}

export function patchPoolObjectInDef(def: ContentDef, groupIndex: number, contentIndex: number, patch: Partial<PoolContent>): ContentDef {
  const groups = structuredClone(poolGroups(def));
  const g = groups[groupIndex]; if (!g) return def;
  g.content = (g.content ?? []).map((c, i) => (i === contentIndex ? { ...c, ...patch } : c));
  return { ...def, groups };
}

export function removePoolObjectFromDef(def: ContentDef, groupIndex: number, contentIndex: number): ContentDef {
  const groups = structuredClone(poolGroups(def));
  const g = groups[groupIndex]; if (!g) return def;
  g.content = (g.content ?? []).filter((_, i) => i !== contentIndex);
  return { ...def, groups };
}

export function addItemToMandatoryDef(def: ContentDef, item: MandatoryItem): ContentDef {
  return { ...def, content: [...mandatoryItems(def), item] };
}

export function patchMandatoryItemInDef(def: ContentDef, itemIndex: number, patch: Partial<MandatoryItem>): ContentDef {
  return { ...def, content: mandatoryItems(def).map((it, i) => (i === itemIndex ? { ...it, ...patch } : it)) };
}

export function removeMandatoryItemFromDef(def: ContentDef, itemIndex: number): ContentDef {
  return { ...def, content: mandatoryItems(def).filter((_, i) => i !== itemIndex) };
}

// A fresh, empty zone-local pool (or mandatory group) named after the zone, for when a zone has no
// editable def of a category to add into. Name is de-duplicated against existing defs.
export function makeZonePoolDef(root: TemplateRoot | null, zoneName: string, category: "guarded" | "unguarded" | "resources"): ContentDef {
  const name = uniqueContentName(root, "pools", `${zoneName}_${category}`);
  return { name, groups: [{ weight: 1, includeLists: [], content: [] }] };
}

export function makeZoneMandatoryDef(root: TemplateRoot | null, zoneName: string): ContentDef {
  const name = uniqueContentName(root, "mandatory", `${zoneName}_mandatory`);
  return { name, content: [] };
}
