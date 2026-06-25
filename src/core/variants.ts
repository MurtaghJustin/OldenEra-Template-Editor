// Authoritative object-variant tables. The first three (dragon_utopia, monty_hall, pandora_box
// 0–27) are from the community editor's Services/ContentManagement/VariantMapping.cs; the rest were
// reverse-engineered from the game-data dump (Data/DB/objects_logic/.../<obj>.json `variants`
// arrays). Maps an object SID → { variant index → display name }. Objects not listed here use a
// plain number, where variant -1 means "any/random".
export const VARIANT_NAMES: Record<string, Record<number, string>> = {
  dragon_utopia: { 0: "Small Guard", 1: "Medium Guard", 2: "Large Guard", 3: "Maximum Guard" },
  monty_hall: { 0: "Common Artifact", 1: "Rare Artifact", 2: "Epic Artifact", 3: "Legendary Artifact" },
  pandora_box: {
    0: "Gold T1 (Low)", 1: "Gold T2", 2: "Gold T3", 3: "Gold T4 (High)",
    4: "Experience T1 (Low)", 5: "Experience T2", 6: "Experience T3", 7: "Experience T4 (High)",
    8: "Units T1 (Low)", 9: "Units T2", 10: "Units T3", 11: "Units T4", 12: "Units T5", 13: "Units T6", 14: "Units T7 (High)",
    15: "All Stats T1 (Low)", 16: "All Stats T2", 17: "All Stats T3", 18: "All Stats T4 (High)",
    19: "Magic School Spells: Daylight", 20: "Magic School Spells: Nightshade", 21: "Magic School Spells: Arcane", 22: "Magic School Spells: Primal",
    23: "Spells T1", 24: "Spells T2", 25: "Spells T3", 26: "Spells T4", 27: "Spells T5",
    45: "Any spell (any school/tier)", // jackpot variant in the game data, beyond the editor's 0–27
  },
  // From Data/DB/objects_logic/event_banks/guarded_res_banks/research_laboratory.json
  research_laboratory: { 0: "T1 — 20k gold + epic", 1: "T2 — 30k + 2 epic", 2: "T3 — 40k + epic + legendary", 3: "T4 — 50k + 2 legendary" },
  // From .../guarded_res_banks/unstable_ruins.json (sentinel-guarded resource bank)
  unstable_ruins: { 0: "T1 — 15k + resources", 1: "T2 — 20k + resources", 2: "T3 — 25k + resources", 3: "T4 — 30k + resources" },
  // From Data/DB/objects_logic/prisons/prison.json (hero level reward)
  prison: { 0: "+1 level", 1: "+5 levels", 2: "+10 levels", 3: "+15 levels", 4: "+20 levels", 5: "+25 levels" },
  // From .../event_banks/tree_of_abundance.json and .../vision_banks/watchtower.json
  tree_of_abundance: { 0: "Unit growth +1/turn" },
  watchtower: { 0: "Fog reveal (range 15)" },
};

export function variantsFor(sid: string | undefined): { value: number; label: string }[] {
  const m = sid ? VARIANT_NAMES[sid] : undefined;
  if (!m) return [];
  return Object.entries(m).map(([k, v]) => ({ value: Number(k), label: v })).sort((a, b) => a.value - b.value);
}

export function variantLabel(sid: string, v: number): string | undefined {
  return VARIANT_NAMES[sid]?.[v];
}
