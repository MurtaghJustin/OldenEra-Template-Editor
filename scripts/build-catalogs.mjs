import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT = join(__dirname, "..", "src", "generated", "catalogs.json");

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
  const dirs = [join(ROOT, "Templates"), join(ROOT, "Documentation", "test-templates")];
  const out = [];
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) if (f.endsWith(".rmg.json")) out.push(join(d, f));
  }
  return out;
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

function merge(name) { return Array.from(new Set([...(SEED[name] || []), ...sets[name]])).sort(); }

// Documented SID → display name, parsed from the clean two-column table rows in
// Documentation/05-id-reference.md (e.g. `tree_of_abundance` → "Arborcopia"). Rows that are ranges
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
  const path = join(ROOT, "Documentation", "05-id-reference.md");
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
console.log("Wrote", OUT);
for (const [k, v] of Object.entries(catalogs)) console.log(`  ${k}: ${Array.isArray(v) ? v.length : Object.keys(v).length}`);
