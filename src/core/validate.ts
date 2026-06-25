import { isKnownEnum } from "./catalogs";
import { CONNECTION_TYPES } from "./types";
import type { TemplateRoot } from "./types";

export interface Issue {
  severity: "error" | "warning";
  message: string;
  path: string; // e.g. "variants[0].connections[2]"
}

export function validateTemplate(root: TemplateRoot, variantIndex = 0): Issue[] {
  const issues: Issue[] = [];

  // A win condition is required — the map generator won't run without one. Every official template
  // sets displayWinCondition; a template missing it (e.g. a freshly created one) is invalid.
  if (!(root as { displayWinCondition?: string }).displayWinCondition)
    issues.push({ severity: "error", message: "No win condition set — the map can't generate. Set one in Game Rules → Win condition.", path: "displayWinCondition" });

  const v = root.variants[variantIndex];
  if (!v) return issues;

  const names = new Set<string>();
  const slots = new Map<number, string>();
  // A zone's layout must be defined in the template's zoneLayouts — referencing an undefined layout
  // hangs the generator (there are no usable built-in layout defaults; see OctoJebus Outcast).
  const definedLayouts = new Set(((root.zoneLayouts as { name?: string }[] | undefined) ?? []).map((z) => z.name).filter(Boolean));

  v.zones.forEach((z, zi) => {
    const p = `variants[${variantIndex}].zones[${zi}]`;
    if (names.has(z.name)) issues.push({ severity: "error", message: `Duplicate zone name "${z.name}"`, path: p });
    names.add(z.name);

    if (z.layout && !definedLayouts.has(z.layout))
      issues.push({ severity: "warning", message: `Layout "${z.layout}" is not defined in this template's Zone layouts — the generator may hang`, path: `${p}.layout` });

    for (const mo of z.mainObjects || []) {
      if (mo.type === "Spawn" && mo.spawn) {
        const m = /^Player(\d)$/.exec(mo.spawn);
        if (m) {
          const slot = Number(m[1]);
          if (slots.has(slot)) issues.push({ severity: "error", message: `Duplicate player slot ${mo.spawn} (zones "${slots.get(slot)}" and "${z.name}")`, path: p });
          slots.set(slot, z.name);
        }
      }
    }
  });

  v.connections.forEach((c, ci) => {
    const p = `variants[${variantIndex}].connections[${ci}]`;
    if (!names.has(c.from)) issues.push({ severity: "error", message: `Connection references missing zone "${c.from}"`, path: p });
    if (!names.has(c.to)) issues.push({ severity: "error", message: `Connection references missing zone "${c.to}"`, path: p });
    if (!isKnownEnum("connectionType", c.connectionType))
      issues.push({ severity: "error", message: `Invalid connectionType "${c.connectionType}" (must be one of ${CONNECTION_TYPES.join(", ")})`, path: `${p}.connectionType` });
  });

  return issues;
}
