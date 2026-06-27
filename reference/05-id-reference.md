# 05 — ID Reference

Catalogs of the string IDs that appear in templates. Object/list names are taken from the
editor's `SidMapping`/`KnownValues` tables (the author notes these match the in-game display
names). Lists here are **known/observed values**, not necessarily exhaustive of everything the
game supports.

---

## Enumerations (closed-ish sets)

| Field | Values |
|-------|--------|
| `gameMode` | `Classic`, `SingleHero` |
| Orientation `mode` | `BoundingCircle`, `MinimalBoundingSquare` |
| `connectionType` | `Direct`, `Default`, `Portal`, `Proximity`, `GladiatorArena` |
| `gatePlacement` | `Center` |
| Road `type` | `Stone`, `Dirt` |
| Road endpoint `type` | `MainObject`, `Connection`, `Crossroads`, `MandatoryContent` |
| MainObject `type` | `Spawn`, `City`, `AbandonedOutpost`, `GladiatorArena` |
| MainObject `placement` | `Uniform`, `Center`, `Connection`, `NearZone` |
| `spawn` (player slots) | `Player1` … `Player8` |
| Selector `type` (biome/faction) | `FromList`, `Match`, `MatchMainObject`, `MatchZone` |
| Placement rule `type` | `MainObject`, `Road`, `Crossroads` |
| `waterType` | `water grass` |
| `championSelectRule` | `StartHero` |
| Bonus `receiverFilter` | `start_hero`, `all_heroes` |
| Bonus `sid` | `add_bonus_res`, `add_bonus_hero_spell`, `add_bonus_hero_stat`, `add_bonus_hero_item`, `add_bonus_hero_unit_multipler` |

## Biomes

`Grass`, `Lava`, `Snow`, `Dirt`, `Deathland`, `Autumn`, `Sand`.
(Empty `FromList` args = any biome. `differentFrom: <Zone>` = any biome other than that zone's.)

## Win-condition display IDs

| ID | Label |
|----|-------|
| `win_condition_1` | Standard |
| `win_condition_2` | **Capital Capture** *(confirmed in-game; unused by official templates)* |
| `win_condition_3` | Lost Starting City |
| `win_condition_4` | Gladiator Arena *(editor label, commented out in source)* |
| `win_condition_5` | Hold City |
| `win_condition_6` | Tournament |

## Building construction SIDs

Generic richness ladder for towns (`buildingsConstructionSid`):
`extra_poor_buildings_construction`, `poor_buildings_construction`, `medium_buildings_construction`,
`default_buildings_construction`, `rich_buildings_construction`, `extra_rich_buildings_construction`,
`ultra_rich_buildings_construction`, `full_buildings_construction`, `army_buildings_construction`,
`siege_buildings_construction`.

Template-specific sets (with `_up_1/2/3` upgrade variants where shown):
`arcade_buildings_construction`, `chosen_one_buildings_construction(_up_1/2/3)`,
`massacre_buildings_construction(_up_1/2/3)`, and the Jebus Cross family
(`jebus_cross_center_buildings_construction`, `jebus_cross_side_buildings_construction`,
`jebus_cross_side_center_buildings_construction`, `jebus_cross_side_main_buildings_construction`).

## Zone layout names

`zone_layout_spawns`, `zone_layout_spawn`, `zone_layout_player_spawn`, `zone_layout_second_spawn`,
`zone_layout_ai_spawn`, `zone_layout_center`, `zone_layout_center_zone`, `zone_layout_sides`,
`zone_layout_side_zone`, `zone_layout_side_spawn_zone`, `zone_layout_treasure_zone`,
`zone_layout_treasures`, `zone_layout_treasure`, `zone_layout_supertreasure_zone`,
`zone_layout_start_zone`, `zone_layout_back`, `zone_layout_leaf`, `zone_layout_wincondition_zone`.
(Roles in [03](03-variants-zones-connections.md#zone-layouts).)

---

## Object / encounter SIDs → display names

These appear as `sid` in mandatory content, content lists/pools, count limits, and value
overrides. Grouped for readability.

### Mines & resource production
| SID | Name |
|-----|------|
| `mine_wood` | Sawmill |
| `mine_ore` | Ore Mine |
| `mine_gold` | Gold Mine |
| `mine_mercury` | Mercury Fissure |
| `mine_crystals` | Crystal Vein |
| `mine_gemstones` | Gem Mound |
| `alchemy_lab` | Alchemy Lab |
| `windmill` | Windmill |
| `gardener` | Gardener |

### Resource storage banks
`storage_wood` (Wood Storage), `storage_ore`, `storage_gold`, `storage_mercury`,
`storage_crystals`, `storage_gemstones`, `storage_dust` (Dust Storage).

### Towns / military
| SID | Name |
|-----|------|
| `fort` | Fort |
| `town_gate` | Town Gate |
| `village` | Village |
| `tavern` | Tavern |
| `market` | Market |
| `stables` | Stables |
| `forge` | Forge |
| `mercenary_guild` | Mercenary Guild |
| `random_hire_1`…`random_hire_7` | Random Hire Tier 1–7 |

### Magic buildings
| SID | Name |
|-----|------|
| `altar_of_magic_1`–`_4` | Nightshade / Daylight / Arcane / Primal **Shrine** |
| `magic_amplifier_1`–`_4` | Nightshade / Daylight / Arcane / Primal **Amplifier** |
| `mystical_tower` | Mystical Tower |
| `celestial_sphere` | Celestial Sphere |
| `mana_well` | Mana Well |
| `college_of_wonder` | College Of Wonder |
| `orb_observatory` | Orb Observatory |

### Hero improvement / skills / stats
| SID | Name |
|-----|------|
| `university` | University |
| `circus` | Circus |
| `infernal_cirque` | Infernal Cirque |
| `learning_stone` | Learning Stone |
| `lost_library` | Lost Library |
| `tree_of_knowledge` | Tree Of Knowledge |
| `pile_of_books` | Pile Of Books |
| `knowledge_garden` | Knowledge Garden |
| `magic_wheel` | Magic Wheel |
| `wise_owl` | Wise Owl |
| `trial_scales` | Trial Scales |
| `armory_automaton` | Armory Automaton |
| `stinging_sword` | Stinging Sword |
| `wind_rose` | Wind Rose |
| `watchtower` | Watchtower |
| `huntsmans_camp` | Huntsman's Camp |
| `jousting_range` | Jousting Range |

### Pickups / treasure / reward objects
| SID | Name |
|-----|------|
| `pandora_box` | Pandora Box *(variants → [04](04-content-and-placement.md#content-variants))* |
| `monty_hall` | Monty Hall *(variant = artifact rarity)* |
| `scroll_box` | Magic Scroll |
| `enchanted_scroll_box` | Enchanted Scroll |
| `mythic_scroll_box` | Mythic Scroll |
| `random_item_common` / `_rare` / `_epic` / `_legendary` | Random Item by rarity |
| `prison` | Prison *(captured hero)* |
| `mirage` | Mirage |
| `crystal_trail` | Crystal Trail |
| `tear_of_truth` | Tear Of Truth |
| `tree_of_abundance` | **Arborcopia** *(in-game name; editor table says "Tree Of Abundance" — SID/display mismatch like `the_gorge`)* |
| `point_of_balance` | Point Of Balance |
| `quixs_path` | Quix's Path |
| `insaras_eye` | Insara's Eye |
| `mysterious_stone` | Mysterious Stone |
| `petrified_memorial` | Petrified Memorial |
| `flattering_mirror` | Flattering Mirror |
| `fickle_shrine` | Fickle Shrine |
| `sacrificial_shrine` | Sacrificial Shrine |
| `ritual_pyre` | Ritual Pyre |
| `beer_fountain` | Beer Fountain |
| `fountain` / `fountain_2` | Fountain / Fountain 2 |
| `peasant_cart` | Peasant Cart |
| `gingerbread_house` | Gingerbread House |
| `goblin_cache` | Goblin Cache |

### Guarded banks / dwellings / utopias
| SID | Name |
|-----|------|
| `dragon_utopia` | Dragon Utopia *(variant = guard tier)* |
| `eternal_dragon` | Eternal Dragon |
| `unstable_ruins` | Unstable Ruins |
| `research_laboratory` | Research Laboratory |
| `troglodyte_throne` | Troglodyte Throne |
| `twilight_bloom` | Twilight Bloom |
| `boreal_call` | Boreal Call |
| `the_gorge` | Carrion Pile *(name intentionally differs from SID)* |
| `unforgotten_grave` | Unforgotten Grave |
| `overgrown_grave` | Overgrown Grave |
| `heros_crypt` | Hero's Crypt |
| `black_tower` | Black Tower |
| `abandoned_mansion` | Abandoned Mansion |
| `abandoned_corpse` | Abandoned Corpse |
| `cursed_old_house` | Cursed Old House |
| `crow_nest` | Crow Nest |
| `raiders_camp` | Raiders Camp |
| `legions_memorial` | Legions Memorial |
| `alvars_eye` | Alvar's Eye |
| `mereas_shrine` | Merea's Shrine |
| `iridescent_abbey` | Iridescent Abbey |
| `prismatic_lair` | Prismatic Lair |
| `circle_of_life` | Circle Of Life |
| `uncanny_rite` | Uncanny Rite |
| `abnormal_structure` | Abnormal Structure |
| `shady_den` | Shady Den |
| `chimerologist` | Chimerologist |
| `arena` | Arena |
| `maze` | Maze |
| `remote_foothold` | Remote Foothold |
| `troglodyte_throne` | Troglodyte Throne |

> The above is the editor's catalog; the game certainly contains more objects than the editor
> enumerates. Treat unfamiliar SIDs in templates as "an object the editor didn't catalog", and use
> `KnownValues.SidToDisplayName` style fallback (snake_case → Title Case) to read them.

### Content lists (include-lists)

IDs usable in `includeLists` (name in parentheses), from the editor's `IncludeListIds`:

`content_list_building_random_hires_low_tier` (Random Hires Low Tier),
`content_list_building_random_hires_high_tier` (High Tier),
`basic_content_list_building_random_hires` (Any Tier),
`content_list_building_random_hires` (Any Tier, Weighted),
`basic_content_list_building_guarded_resource_banks_tier_1/2/3` (Guarded/Resource Banks T1–T3),
`basic_content_list_basic_storage` (Basic Storage),
`basic_content_list_rare_mines` / `_by_biome` (Rare Mine / biome-restricted),
`basic_content_list_building_guarded_units_banks` (Guarded Unit Bank),
`basic_content_list_building_guarded_units_banks_only_biome_restriction` / `_no_biome_restriction`,
`basic_content_list_building_hero_buff_tier_1`, `basic_content_list_building_hero_exp_tier_2`,
`basic_content_list_building_hero_stats_and_skills_tier_1/2/3`,
`basic_content_list_building_magic_tier_1/2`,
`content_list_building_uncommon_hero_banks` (Uncommon Hero Improvement),
`basic_content_list_vision_buildings_tier_1`,
`basic_content_list_pickup_random_items`,
`content_list_building_utopia` (Dragon/Unstable/Lab),
`content_list_building_epic_guarded_resource_banks`,
`basic_content_list_pickup_mythic_scroll_box`,
`content_list_pickup_pandora_box_army_low_tier` / `_high_tier`,
`basic_content_list_pickup_pandora_box_gold` / `_exp` / `_units` / `_all_stats` /
`_magic_school` / `_magic_tier`.

---

## Spells

Spell SIDs (used in `globalBans.magics` and `add_bonus_hero_spell`). Format is
`<school>_<n>_magic_<name>` (or `neutral_magic_<name>`). School ∈ neutral, day, night, primal,
space. Tier 1–5.

**Neutral:** `neutral_magic_pocket_dimension` (Pocket Dimension, T2),
`neutral_magic_second_sight` (Second Sight, T2), `neutral_magic_shadow_form` (Shadowflight, T3),
`neutral_magic_town_portal` (Town Portal, T3), `neutral_magic_dimension_door` (Dimension Door, T4),
`neutral_magic_light_gate` (Gate of Light, T4).

The full learnable-spell catalog (Day / Night / Primal / Space schools, ~18 each, with tiers and
display names) lives in the game's spell data. A few examples: `primal_4_magic_fire_globe` = Fireball (Primal T2),
`night_8_magic_sleep` = Sleep (Night T3), `space_13_magic_black_hole` = Black Hole (Space T5),
`day_3_magic_haste` = Haste (Day T1). Note display names often differ from the SID stem.

## Bannable artifacts

Artifact SIDs (used in `globalBans.items`) end in `_artifact`. The editor categorises them as
Movement, Diplomacy, Combat, Magic, Misc, and **Set** items. Commonly banned in competitive/duel
templates:

- **Movement:** `pole_star_artifact`, `seven_league_boots_artifact`, `swamp_boots_artifact`,
  `warlord_boots_artifact`, `magic_key_ring_artifact`, `legions_step_artifact`,
  `fallen_angel_wings_artifact`, `banner_of_four_winds_artifact`, `spyglass_artifact`,
  `wanderers_way_boots_of_travel_artifact`, `wanderers_way_backpack_artifact`.
- **Diplomacy:** `voodoosh_doll_artifact`, `flag_of_truce_artifact`, `ring_of_neutrality_artifact`.
- **Combat:** `shackles_of_war_artifact`, plus many others.

The complete artifact catalog (≈170 entries, including all set pieces such as Angelic Alliance,
Power of the Dragon Father, Holy Sigils, etc.) is in `KnownValues.BannableItems` (same file,
lines ~343–558). For any artifact SID, a human name can be derived by stripping `_artifact` and
title-casing.
