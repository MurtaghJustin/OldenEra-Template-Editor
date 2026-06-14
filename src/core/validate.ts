import { catalogs, isKnownEnum } from "./catalogs";
import { CONNECTION_TYPES } from "./types";
import type { TemplateRoot } from "./types";

export interface Issue {
  severity: "error" | "warning";
  message: string;
  path: string; // e.g. "variants[0].connections[2]"
}

export function validateTemplate(root: TemplateRoot, variantIndex = 0): Issue[] {
  const issues: Issue[] = [];
  const v = root.variants[variantIndex];
  if (!v) return issues;

  const names = new Set<string>();
  const slots = new Map<number, string>();

  v.zones.forEach((z, zi) => {
    const p = `variants[${variantIndex}].zones[${zi}]`;
    if (names.has(z.name)) issues.push({ severity: "error", message: `Duplicate zone name "${z.name}"`, path: p });
    names.add(z.name);

    if (!catalogs.layouts.includes(z.layout))
      issues.push({ severity: "warning", message: `Unknown layout "${z.layout}" (not in catalog)`, path: `${p}.layout` });

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
