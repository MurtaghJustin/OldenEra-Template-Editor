import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Path to the game's map templates — the install's
// `…/HeroesOldenEra_Data/StreamingAssets/map_templates` folder (templates live directly in it), or
// any folder holding the `*.rmg.json` templates (a `Templates/` subfolder is also accepted, e.g. the
// dev repo layout). Set it via the first CLI arg (`npm run catalogs -- <path>`) or the
// OLDEN_ERA_GAME_FILES env var. The editor ships with pre-generated catalogs (src/generated/*.json);
// this only re-mines them, a maintainer task run when the game's templates change.
const GAME_FILES = process.argv[2] || process.env.OLDEN_ERA_GAME_FILES;
if (!GAME_FILES || !existsSync(GAME_FILES)) {
  console.error(GAME_FILES
    ? `Templates path not found: ${GAME_FILES}`
    : "Set the templates path: `npm run catalogs -- <path>` (the game's map_templates folder), or set OLDEN_ERA_GAME_FILES.");
  process.exit(1);
}
// Reference data vendored in the editor (the game's map_templates folder doesn't carry these):
// SID display names, and the generic zone_layout_default fallback base.
const REFERENCE = join(__dirname, "..", "reference", "05-id-reference.md");
const ZONE_LAYOUT_DEFAULTS = join(__dirname, "..", "reference", "default_zone_layouts.json");
const OUT = join(__dirname, "..", "src", "generated", "catalogs.json");
const OUT_LAYOUTS = join(__dirname, "..", "src", "generated", "zoneLayoutDefaults.json");

// Doc-05 seed values that may not all appear in the corpus.
const SEED = {
  layouts: [
    "zone_layout_spawns","zone_layout_spawn","zone_layout_player_spawn","zone_layout_second_spawn",
    "zone_layout_ai_spawn","zone_layout_center","zone_layout_center_zone","zone_layout_sides",
    "zone_layout_side_zone","zone_layout_side_spawn_zone","zone_layout_treasure_zone",
    "zone_layout_treasures","zone_layout_treasure","zone_layout_supertreasure_zone",
    "zone_layout_start_zone","zone_layout_back","zone_layout_leaf","zone_layout_wincondition_zone",
  ],
  constructionSids: [
    "extra_poor_buildings_construction","poor_buildings_construction","medium_buildings_construction",
    "default_buildings_construction","rich_buildings_construction","extra_rich_buildings_construction",
    "ultra_rich_buildings_construction","full_buildings_construction","army_buildings_construction",
    "siege_buildings_construction",
  ],
  biomes: ["Grass","Lava","Snow","Dirt","Deathland","Autumn","Sand"],
  winConditions: ["win_condition_1","win_condition_2","win_condition_3","win_condition_4","win_condition_5","win_condition_6"],
  bonusSids: ["add_bonus_res","add_bonus_hero_spell","add_bonus_hero_stat","add_bonus_hero_item","add_bonus_hero_unit_multipler"],
};

function collectFiles() {
  // Accept either the templates folder itself (the game's map_templates) or a parent with a
  // Templates/ subfolder (the dev repo layout) — whichever actually holds *.rmg.json files.
  for (const dir of [GAME_FILES, join(GAME_FILES, "Templates")]) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith(".rmg.json"));
    if (files.length) return files.map((f) => join(dir, f));
  }
  console.error(`No *.rmg.json templates found in ${GAME_FILES} (or a Templates/ subfolder).`);
  process.exit(1);
}

const sets = {
  layouts: new Set(), pools: new Set(), contentLists: new Set(), sids: new Set(),
  constructionSids: new Set(), factions: new Set(), biomes: new Set(),
  spells: new Set(), artifacts: new Set(), winConditions: new Set(),
  mandatoryContentNames: new Set(), countLimitNames: new Set(), bonusSids: new Set(),
};

function addPool(arr) { for (const p of arr || []) sets.pools.add(p); }
function walkContentItems(items) {
  for (const it of items || []) {
    if (it?.sid) sets.sids.add(it.sid);
    for (const l of it?.includeLists || []) sets.contentLists.add(l);
    if (Array.isArray(it?.content)) walkContentItems(it.content);
    for (const g of it?.groups || []) { for (const l of g?.includeLists || []) sets.contentLists.add(l); walkContentItems(g?.content); }
  }
}
function addSelectorFactions(sel) {
  if (sel?.type === "FromList") for (const a of sel.args || []) if (!a.startsWith("differentFrom")) sets.factions.add(a);
}

for (const file of collectFiles()) {
  let d; try { d = JSON.parse(readFileSync(file, "utf-8")); } catch { continue; }
  if (d.displayWinCondition) sets.winConditions.add(d.displayWinCondition);
  const bans = d.globalBans || d.gameRules?.globalBans || {};
  for (const m of bans.magics || []) sets.spells.add(m);
  for (const i of bans.items || []) sets.artifacts.add(i);
  for (const b of [].concat(d.gameRules?.bonuses || [])) {
    if (b.sid) sets.bonusSids.add(b.sid);
    const p = b.parameters || [];
    if (b.sid === "add_bonus_hero_spell") for (const s of p) sets.spells.add(s);
    if (b.sid === "add_bonus_hero_item") for (const a of p) sets.artifacts.add(a);
  }
  for (const mc of d.mandatoryContent || []) { if (mc.name) sets.mandatoryContentNames.add(mc.name); walkContentItems(mc.content); }
  for (const cl of d.contentCountLimits || []) { if (cl.name) sets.countLimitNames.add(cl.name); for (const l of cl.limits || []) if (l.sid) sets.sids.add(l.sid); }
  for (const vo of d.valueOverrides || []) if (vo.sid) sets.sids.add(vo.sid);
  walkContentItems(d.contentPools);
  walkContentItems(d.contentLists);
  for (const v of d.variants || []) {
    for (const z of v.zones || []) {
      if (z.layout) sets.layouts.add(z.layout);
      addPool(z.guardedContentPool); addPool(z.unguardedContentPool); addPool(z.resourcesContentPool);
      for (const sel of [z.zoneBiome, z.contentBiome, z.metaObjectsBiome]) {
        if (sel?.type === "FromList") for (const a of sel.args || []) if (!a.startsWith("differentFrom")) sets.biomes.add(a);
      }
      for (const mo of z.mainObjects || []) {
        if (mo.buildingsConstructionSid) sets.constructionSids.add(mo.buildingsConstructionSid);
        addSelectorFactions(mo.faction);
      }
    }
  }
}

// Authentic per-name zone-layout defaults: the game's built-in `zone_layout_default` plus, for each
// named layout (zone_layout_sides, …), the most-common inline definition across the templates — so
// a node type's auto-seeded layout starts from real role-appropriate values, not a generic guess.
function buildZoneLayoutDefaults() {
  const out = {};
  const dfl = ZONE_LAYOUT_DEFAULTS;
  if (existsSync(dfl)) {
    try { const j = JSON.parse(readFileSync(dfl, "utf-8")); const list = Array.isArray(j) ? j : (j.zoneLayouts || []); for (const d of list) if (d?.name) out[d.name] = d; } catch { /* ignore */ }
  }
  const counts = {}; // name -> { canonicalJSON: { count, def } }
  for (const file of collectFiles()) {
    let d; try { d = JSON.parse(readFileSync(file, "utf-8")); } catch { continue; }
    for (const z of d.zoneLayouts || []) {
      if (!z?.name) continue;
      const { name, ...rest } = z;
      const key = JSON.stringify(rest);
      (counts[name] ??= {});
      (counts[name][key] ??= { count: 0, def: z }).count++;
    }
  }
  for (const [name, variants] of Object.entries(counts)) {
    let best = null;
    for (const e of Object.values(variants)) if (!best || e.count > best.count) best = e;
    if (best) out[name] = best.def; // most-common template definition wins for named layouts
  }
  return out;
}

function merge(name) { return Array.from(new Set([...(SEED[name] || []), ...sets[name]])).sort(); }

// Documented SID → display name, parsed from the clean two-column table rows in the vendored
// reference/05-id-reference.md (e.g. `tree_of_abundance` → "Arborcopia"). Rows that are ranges
// or prose ("…", "/", "–") are skipped — the editor derives a title-case name for those at runtime.
function buildSidNames() {
  // Names for SIDs the doc only documents as ranges/prose (so the table parser can't reach them),
  // but which appear in real templates. Parsed table rows below take precedence over these.
  const out = {
    random_hire_1: "Random Hire Tier 1", random_hire_2: "Random Hire Tier 2",
    random_hire_3: "Random Hire Tier 3", random_hire_4: "Random Hire Tier 4",
    random_hire_5: "Random Hire Tier 5", random_hire_6: "Random Hire Tier 6",
    random_hire_7: "Random Hire Tier 7",
  };
  const path = REFERENCE;
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const m = /^\|\s*`([a-z0-9_]+)`\s*\|\s*(.+?)\s*\|\s*$/.exec(line);
    if (!m) continue;
    const name = m[2]
      .replace(/\*+/g, "")                        // bold/italic markers
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")     // flatten markdown links → their text (avoids nested parens)
      .replace(/\s*\([^)]*\)/g, "")                // drop parenthetical notes
      .trim();
    if (!name || /[/…–]/.test(name) || name.toLowerCase() === "name") continue;
    out[m[1]] = name;
  }
  return out;
}

const catalogs = {
  layouts: merge("layouts"),
  pools: Array.from(sets.pools).sort(),
  contentLists: Array.from(sets.contentLists).sort(),
  sids: Array.from(sets.sids).sort(),
  constructionSids: merge("constructionSids"),
  factions: Array.from(sets.factions).sort(),
  biomes: merge("biomes"),
  spells: Array.from(sets.spells).sort(),
  artifacts: Array.from(sets.artifacts).sort(),
  winConditions: merge("winConditions"),
  bonusSids: merge("bonusSids"),
  mandatoryContentNames: Array.from(sets.mandatoryContentNames).sort(),
  countLimitNames: Array.from(sets.countLimitNames).sort(),
  sidNames: buildSidNames(),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(catalogs, null, 2) + "\n");
const zoneLayoutDefaults = buildZoneLayoutDefaults();
writeFileSync(OUT_LAYOUTS, JSON.stringify(zoneLayoutDefaults, null, 2) + "\n");
console.log("Wrote", OUT_LAYOUTS, "—", Object.keys(zoneLayoutDefaults).length, "layout defaults");
console.log("Wrote", OUT);
for (const [k, v] of Object.entries(catalogs)) console.log(`  ${k}: ${Array.isArray(v) ? v.length : Object.keys(v).length}`);
