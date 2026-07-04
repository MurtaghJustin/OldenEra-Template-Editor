import type { TemplateRoot } from "./types";
import zoneLayoutDefaults from "../generated/zoneLayoutDefaults.json";

const LAYOUT_DEFAULTS = zoneLayoutDefaults as Record<string, Record<string, unknown>>;

// The four root-level content definition collections a template can author. Each is an array of
// named definitions that zones reference by name. Shapes follow Documentation/04.
export type ContentKind = "pools" | "lists" | "mandatory" | "countLimits" | "layouts";

export const CONTENT_ROOT_FIELD: Record<ContentKind, string> = {
  pools: "contentPools",
  lists: "contentLists",
  mandatory: "mandatoryContent",
  countLimits: "contentCountLimits",
  layouts: "zoneLayouts",
};

export const CONTENT_KIND_LABEL: Record<ContentKind, string> = {
  pools: "Content pools",
  lists: "Content lists",
  mandatory: "Mandatory content",
  countLimits: "Content count limits",
  layouts: "Zone layouts",
};

// Loosely typed: definitions carry many optional/nested fields (see Documentation/04). Only `name`
// is guaranteed — it's the ID zones reference.
export type ContentDef = { name: string; [k: string]: unknown };

export function contentDefs(root: TemplateRoot | null, kind: ContentKind): ContentDef[] {
  if (!root) return [];
  const arr = (root as Record<string, unknown>)[CONTENT_ROOT_FIELD[kind]];
  return Array.isArray(arr) ? (arr as ContentDef[]) : [];
}

// Minimal valid skeleton for a brand-new definition of each kind.
export function newContentDef(kind: ContentKind, name: string): ContentDef {
  switch (kind) {
    case "pools": return { name, groups: [] };
    case "lists": return { name, content: [] };
    case "mandatory": return { name, content: [] };
    case "countLimits": return { name, playerMin: null, playerMax: null, limits: [] };
    case "layouts": return {
      name, obstaclesFill: 0.5, obstaclesFillVoid: 0.5, lakesFill: 0.3, minLakeArea: 10,
      elevationClusterScale: 0.128, elevationModes: [{ weight: 1, minElevatedFraction: 0, maxElevatedFraction: 0 }],
      roadClusterArea: 128, guardedEncounterResourceFractions: { countBounds: [], fractions: [0.5] },
      ambientPickupDistribution: { repulsion: 1, noise: 0.3, roadAttraction: 0.25, obstacleAttraction: 0, groupSizeWeights: [4, 1, 1] },
    };
  }
}

// A zone-layout definition seeded with authentic values: the named role layout's real default when
// known (mined from the templates / game data), else the game's built-in zone_layout_default, else a
// generic skeleton. Used when a node type's layout must be auto-added to the template.
export function defaultZoneLayout(name: string): ContentDef {
  const base = LAYOUT_DEFAULTS[name] ?? LAYOUT_DEFAULTS["zone_layout_default"];
  if (base) return structuredClone({ ...base, name }) as ContentDef;
  return newContentDef("layouts", name);
}

// Zone fields (arrays of names) that reference each content kind. Used to cascade a definition
// rename into the zones that use it, so a rename never leaves a zone pointing at a name that no
// longer exists. `layouts` isn't here because a zone's `layout` is a single string, not an array
// (it's handled separately below); `lists` aren't referenced by zones at all, only by pool groups.
export const ZONE_REF_FIELDS: Record<ContentKind, string[]> = {
  pools: ["guardedContentPool", "unguardedContentPool", "resourcesContentPool"],
  lists: [],
  mandatory: ["mandatoryContent"],
  countLimits: ["contentCountLimits"],
  layouts: [],
};

// Cascade a definition rename through every place its name is referenced: the zone fields above
// across all variants, the single-string zone `layout`, and content-pool group `includeLists`
// (which point at content lists). Mutates `root` in place; no-op when the name is unchanged.
export function renameContentReferences(root: TemplateRoot | null, kind: ContentKind, oldName: string, newName: string): void {
  if (!root || oldName === newName) return;
  const swap = (arr: unknown): string[] | undefined =>
    Array.isArray(arr) ? (arr as string[]).map((n) => (n === oldName ? newName : n)) : undefined;
  const variants = (root as { variants?: unknown }).variants;
  for (const v of Array.isArray(variants) ? variants : []) {
    for (const z of ((v as { zones?: Record<string, unknown>[] }).zones ?? [])) {
      for (const f of ZONE_REF_FIELDS[kind]) { const next = swap(z[f]); if (next) z[f] = next; }
      if (kind === "layouts" && z.layout === oldName) z.layout = newName;
    }
  }
  if (kind === "lists") {
    for (const pool of contentDefs(root, "pools")) {
      for (const g of ((pool.groups as { includeLists?: unknown }[] | undefined) ?? [])) {
        const next = swap(g.includeLists); if (next) g.includeLists = next;
      }
    }
  }
}

// A "<base>-N" name not already used among definitions of this kind.
export function uniqueContentName(root: TemplateRoot | null, kind: ContentKind, base: string): string {
  const taken = new Set(contentDefs(root, kind).map((d) => d.name));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) { const n = `${base}-${i}`; if (!taken.has(n)) return n; }
}
