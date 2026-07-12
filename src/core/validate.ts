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

  // A selector of type Match/MatchMainObject resolves against a main-object INDEX (a number),
  // optionally a zone name — e.g. args ["0"] or ["0","Spawn-A"]. A non-numeric first arg (e.g. a
  // biome/faction name) is unparseable: the generator logs `Couldn't parse rule type 'Match'`, leaves
  // an empty config, and crashes when it places an object (NullReferenceException in MapObjectDesc).
  // To pick a value by NAME, the selector type must be FromList. Applies to every selector the editor
  // exposes — zone biomes AND main-object factions — since the arg-suggestion mistake affected both.
  const checkSelector = (sel: unknown, owner: string, label: string, path: string) => {
    const s = sel as { type?: string; args?: unknown[] } | undefined;
    if (!s || (s.type !== "Match" && s.type !== "MatchMainObject")) return;
    const first = (s.args ?? [])[0];
    if (first !== undefined && !/^\d+$/.test(String(first)))
      issues.push({ severity: "error", path,
        message: `${owner} ${label} uses ${s.type} with a non-numeric first argument "${String(first)}" — it must be a main-object index (e.g. 0), so the map won't generate. To choose a value by name, set the selector type to FromList.` });
  };

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

    // Every zone must carry all three content pools. An empty guarded/unguarded/resources pool hangs
    // the generator (no official template ever omits one) — this was the cause of editor-made
    // templates failing to generate.
    for (const [field, label] of [["guardedContentPool", "guarded"], ["unguardedContentPool", "unguarded"], ["resourcesContentPool", "resources"]] as const) {
      const pool = (z as Record<string, unknown>)[field];
      if (!Array.isArray(pool) || pool.length === 0)
        issues.push({ severity: "error", message: `Zone "${z.name}" has no ${label} content pool — the map can't generate. Every zone needs guarded, unguarded and resources pools.`, path: `${p}.${field}` });
    }

    // A crossroads converges the zone's roads at a main object: crossroadsPosition is 1-based
    // (1 = main object #0). If it exceeds the main-object count, the generator reports "crossroads
    // main object index is out of range" and the map fails. (The editor's Crossroads dropdown can't
    // produce this, but a hand-edited or imported template can.)
    if (z.crossroadsPosition && z.crossroadsPosition > ((z.mainObjects as unknown[] | undefined)?.length ?? 0))
      issues.push({ severity: "error", path: `${p}.crossroadsPosition`,
        message: `Zone "${z.name}" has crossroadsPosition ${z.crossroadsPosition} but only ${((z.mainObjects as unknown[] | undefined)?.length ?? 0)} main object(s) — the crossroads anchors to a missing object (index out of range) and the map won't generate. Pick an existing main object, or set it to None.` });

    checkSelector(z.zoneBiome, `Zone "${z.name}"`, "zone biome", `${p}.zoneBiome`);
    checkSelector(z.contentBiome, `Zone "${z.name}"`, "content biome", `${p}.contentBiome`);
    checkSelector(z.metaObjectsBiome, `Zone "${z.name}"`, "meta-objects biome", `${p}.metaObjectsBiome`);

    (z.mainObjects || []).forEach((mo, mi) => checkSelector(mo.faction, `Zone "${z.name}"`, `main object #${mi} faction`, `${p}.mainObjects[${mi}].faction`));

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

  // Content items that name neither an object nor any include-lists can't resolve to anything — at
  // best they're ignored, at worst they leave an empty object descriptor that crashes generation.
  // (A stray empty-string sid is auto-cleaned on save; this catches an item left entirely blank.)
  const hasSid = (it: { sid?: unknown }) => typeof it.sid === "string" && it.sid.trim() !== "";
  const usable = (it: { sid?: unknown; includeLists?: unknown[] }) =>
    hasSid(it) || (Array.isArray(it.includeLists) && it.includeLists.length > 0);
  for (const grp of (root.mandatoryContent as { name?: string; content?: { sid?: unknown; includeLists?: unknown[] }[] }[] | undefined) ?? [])
    if ((grp.content ?? []).some((it) => !usable(it)))
      issues.push({ severity: "warning", message: `Mandatory group "${grp.name}" has an item with no object and no include lists — it will be ignored or may break generation.`, path: `mandatoryContent.${grp.name}` });
  for (const pool of (root.contentPools as { name?: string; groups?: { content?: { sid?: unknown }[] }[] }[] | undefined) ?? [])
    if ((pool.groups ?? []).some((g) => (g.content ?? []).some((c) => !hasSid(c))))
      issues.push({ severity: "warning", message: `Content pool "${pool.name}" has an inline object with no SID — fill it in or remove it.`, path: `contentPools.${pool.name}` });

  v.connections.forEach((c, ci) => {
    const p = `variants[${variantIndex}].connections[${ci}]`;
    if (!names.has(c.from)) issues.push({ severity: "error", message: `Connection references missing zone "${c.from}"`, path: p });
    if (!names.has(c.to)) issues.push({ severity: "error", message: `Connection references missing zone "${c.to}"`, path: p });
    if (!isKnownEnum("connectionType", c.connectionType))
      issues.push({ severity: "error", message: `Invalid connectionType "${c.connectionType}" (must be one of ${CONNECTION_TYPES.join(", ")})`, path: `${p}.connectionType` });
  });

  return issues;
}
