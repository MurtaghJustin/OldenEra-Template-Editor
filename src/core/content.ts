import type { TemplateRoot } from "./types";

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

// A "<base>-N" name not already used among definitions of this kind.
export function uniqueContentName(root: TemplateRoot | null, kind: ContentKind, base: string): string {
  const taken = new Set(contentDefs(root, kind).map((d) => d.name));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) { const n = `${base}-${i}`; if (!taken.has(n)) return n; }
}
