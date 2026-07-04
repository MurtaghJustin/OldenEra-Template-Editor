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

## Object / encounter SIDs

Rich catalog mirrored from the community database ([oldenera.th.gl/db/map_objects](https://oldenera.th.gl/db/map_objects)), which carries the
authentic in-game display **name**, adventure **value**, **guard** flag, and flavour **description**.
The machine-readable copy (all fields incl. `visitType`, `totalChance`, and icon-atlas rect) is vendored
at `editor/reference/map_objects.json`; a **64×64 icon** per object lives in
`editor/reference/map_object_icons/<sid>.webp` and is inlined into the built editor. Grouped as the
database groups them. `Guard` = the object is defended by a stack that must be beaten before use.

> These names supersede the editor's earlier title-cased guesses — e.g. all `barracks_*` are real
> dwelling names (`barracks_human_3` = *Griffin Rookery*), and confirmed prior notes hold
> (`the_gorge` = *Carrion Pile*, `tree_of_abundance` = *Arborcopia*).

### Dwellings

| SID | Name | Value | Guard | Description |
|-----|------|-------|-------|-------------|
| `barracks_unfrozen_3` | Aga'Shoth Stables | 8,000 | – | You can recruit Aga'Shoth Riders in this dwelling. Their weekly growth increases by {0}. |
| `barracks_dungeon_3` | Amphitheater | 8,000 | – | You can recruit Onyx Dancers in this dwelling. Their weekly growth increases by {0}. |
| `barracks_demon_5` | Apex | 12,000 | ✓ | You can recruit Reavers in this dwelling. Their weekly growth increases by {0}. |
| `barracks_neutral_13` | Battlefield | 8,000 | ✓ | You can recruit Animated Armors in this dwelling. |
| `barracks_unfrozen_6` | Bloated Mansion | 12,000 | ✓ | You can recruit Arbitrators in this dwelling. Their weekly growth increases by {0}. |
| `barracks_neutral_7` | Blooming Marsh | 12,000 | ✓ | You can recruit Giant Toads in this dwelling. |
| `barracks_nature_4` | Blooming Pond | 10,000 | ✓ | You can recruit Naiads in this dwelling. Their weekly growth increases by {0}. |
| `barracks_necropolis_4` | Bone Exchange | 10,000 | ✓ | You can recruit Graverobbers in this dwelling. Their weekly growth increases by {0}. |
| `barracks_demon_6` | Burning Soul Burrows | 12,000 | ✓ | You can recruit Waurmos in this dwelling. Their weekly growth increases by {0}. |
| `barracks_neutral_15` | Burrow | 6,000 | ✓ | You can recruit Halflings in this dwelling. |
| `barracks_demon_2` | Carrion Lair | 6,000 | – | You can recruit Locusts in this dwelling. Their weekly growth increases by {0}. |
| `barracks_dungeon_7` | Cave Palace | 16,000 | ✓ | You can recruit Cave Dragons in this dwelling. Their weekly growth increases by {0}. |
| `barracks_necropolis_7` | Chateau of Feasts | 16,000 | ✓ | You can recruit Vampires in this dwelling. Their weekly growth increases by {0}. |
| `barracks_demon_4` | Chitinous Ziggurat | 10,000 | ✓ | You can recruit Scorpions in this dwelling. Their weekly growth increases by {0}. |
| `barracks_dungeon_6` | Chthonic Home | 12,000 | ✓ | You can recruit Hydras in this dwelling. Their weekly growth increases by {0}. |
| `barracks_necropolis_1` | Crypts and Graves | 4,000 | – | You can recruit Skeletons in this dwelling. Their weekly growth increases by {0}. |
| `barracks_neutral_10` | Crystal Nest | 10,000 | ✓ | You can recruit Kittenhorns in this dwelling. |
| `barracks_unfrozen_2` | Cultist Spire | 6,000 | – | You can recruit Cultists in this dwelling. Their weekly growth increases by {0}. |
| `barracks_unfrozen_4` | Disturbing Summoning Rite | 10,000 | ✓ | You can recruit Grand Shoth in this dwelling. Their weekly growth increases by {0}. |
| `barracks_neutral_6` | Dragon Eggshells | 12,000 | ✓ | You can recruit Faerie Dragons in this dwelling. |
| `barracks_neutral_9` | Dragonslayer Base | 12,000 | ✓ | You can recruit Dragonslayers in this dwelling. |
| `barracks_unfrozen_7` | Eerie Summoning Rite | 16,000 | ✓ | You can recruit Abyssal Envoys in this dwelling. Their weekly growth increases by {0}. |
| `barracks_nature_1` | Faun Huts | 4,000 | – | You can recruit Fauns in this dwelling. Their weekly growth increases by {0}. |
| `barracks_human_1` | Garrison | 4,000 | – | You can recruit Swordsmen in this dwelling. Their weekly growth increases by {0}. |
| `barracks_human_3` | Griffin Rookery | 8,000 | – | You can recruit Griffins in this dwelling. Their weekly growth increases by {0}. |
| `barracks_human_5` | Hippodrome | 12,000 | ✓ | You can recruit Cavalry in this dwelling. Their weekly growth increases by {0}. |
| `barracks_nature_2` | Hop Patch | 6,000 | – | You can recruit Hoplets in this dwelling. Their weekly growth increases by {0}. |
| `barracks_unfrozen_5` | House of Chains | 12,000 | ✓ | You can recruit Concubi in this dwelling. Their weekly growth increases by {0}. |
| `barracks_necropolis_3` | Kennel | 8,000 | – | You can recruit Undead Pets in this dwelling. Their weekly growth increases by {0}. |
| `barracks_dungeon_4` | Labyrinth | 10,000 | ✓ | You can recruit Minotaurs in this dwelling. Their weekly growth increases by {0}. |
| `barracks_unfrozen_1` | Lesser Summoning Rite | 4,000 | – | You can recruit Ra'Shoth in this dwelling. Their weekly growth increases by {0}. |
| `barracks_nature_3` | Menhir Circle | 8,000 | – | You can recruit Vine Iriyads in this dwelling. Their weekly growth increases by {0}. |
| `mercenary_guild` | Mercenary Guild | 7,500 | – | Allows the hero to recruit up to {0} random units. Refreshes every week. |
| `barracks_human_2` | Mews | 6,000 | – | You can recruit Crossbowmen in this dwelling. Their weekly growth increases by {0}. |
| `barracks_demon_1` | Neglected Housing | 4,000 | – | You can recruit Parasites in this dwelling. Their weekly growth increases by {0}. |
| `barracks_demon_3` | Paper Nest | 8,000 | – | You can recruit Hornets in this dwelling. Their weekly growth increases by {0}. |
| `barracks_neutral_17` | Pixie Tower | 4,000 | ✓ | You can recruit Pixies in this dwelling. |
| `barracks_neutral_4` | Pyramid | 12,000 | ✓ | You can recruit Couatls in this dwelling. |
| `barracks_nature_7` | Pyre | 16,000 | ✓ | You can recruit Phoenixes in this dwelling. Their weekly growth increases by {0}. |
| `barracks_necropolis_2` | Quiet Pavilion | 6,000 | – | You can recruit Wights in this dwelling. Their weekly growth increases by {0}. |
| `barracks_human_7` | Radiant Forge | 16,000 | ✓ | You can recruit Angels in this dwelling. Their weekly growth increases by {0}. |
| `barracks_dungeon_2` | Safe House | 6,000 | – | You can recruit Infiltrators in this dwelling. Their weekly growth increases by {0}. |
| `barracks_nature_5` | Shroomwood Shack | 12,000 | ✓ | You can recruit Herbomancers in this dwelling. Their weekly growth increases by {0}. |
| `barracks_neutral_11` | Starshard | 10,000 | ✓ | You can recruit Starchildren in this dwelling. |
| `barracks_dungeon_5` | Stilled Voices | 12,000 | ✓ | You can recruit Medusae in this dwelling. Their weekly growth increases by {0}. |
| `barracks_neutral_12` | Sundew Thicket | 10,000 | ✓ | You can recruit Primal Remnants in this dwelling. |
| `barracks_human_4` | Sundrop Chapel | 10,000 | ✓ | You can recruit Lightweavers in this dwelling. Their weekly growth increases by {0}. |
| `barracks_neutral_1` | Temple of the Four Scholars | 16,000 | ✓ | You can recruit Sentinels of Glory in this dwelling. |
| `barracks_neutral_14` | Terror Wood | 8,000 | ✓ | You can recruit Grolls in this dwelling. |
| `barracks_human_6` | Threshold Basilica | 12,000 | ✓ | You can recruit Inquisitors in this dwelling. Their weekly growth increases by {0}. |
| `barracks_nature_6` | Thunder Lair | 12,000 | ✓ | You can recruit Qilins in this dwelling. Their weekly growth increases by {0}. |
| `barracks_necropolis_5` | Timeless Mansion | 12,000 | ✓ | You can recruit Liches in this dwelling. Their weekly growth increases by {0}. |
| `barracks_necropolis_6` | Tomb of Warriors | 12,000 | ✓ | You can recruit Dread Knights in this dwelling. Their weekly growth increases by {0}. |
| `barracks_demon_7` | Tower of Love | 16,000 | ✓ | You can recruit Hive Queens in this dwelling. Their weekly growth increases by {0}. |
| `barracks_neutral_8` | Unicorn Vale | 12,000 | ✓ | You can recruit Unicorns in this dwelling. |
| `barracks_neutral_16` | Village Hut | 6,000 | ✓ | You can recruit Peasants in this dwelling. |
| `barracks_dungeon_1` | Warren | 4,000 | – | You can recruit Troglodytes in this dwelling. Their weekly growth increases by {0}. |
| `barracks_neutral_3` | Watcher Platform | 12,000 | ✓ | You can recruit Worldwatchers in this dwelling. |

### Resource Sites

| SID | Name | Value | Guard | Description |
|-----|------|-------|-------|-------------|
| `mine_crystals` | Crystal Vein | 2,000 | – | Produces {0} Crystals daily. |
| `mine_gemstones` | Gem Mound | 2,000 | – | Produces {0} Gems daily. |
| `mine_gold` | Gold Mine | 2,500 | – | Produces {0} Gold daily. |
| `mine_mercury` | Mercury Fissure | 2,000 | – | Produces {0} Mercury daily. |
| `mine_ore` | Ore Mine | 1,500 | – | Produces {0} Ore daily. |
| `mine_wood` | Sawmill | 1,500 | – | Produces {0} Wood daily. |

### Adventure Sites

| SID | Name | Value | Guard | Description |
|-----|------|-------|-------|-------------|
| `abandoned_mansion` | Abandoned Mansion | 1,500 | ✓ | Grants Gold and possibly also valuable artifacts after defeating its guard. |
| `abnormal_structure` | Abnormal Structure | 6,250 | ✓ | Gives valuable artifacts after defeating its guard. |
| `alvars_eye` | Alvar Outpost | 2,500 | ✓ | Gives common and valuable resources after defeating its guard. |
| `overgrown_grave` | Ancient Crypt | 7,000 | ✓ | Gives Gold and possibly also valuable artifacts after defeating its guard. |
| `black_tower` | Black Tower | 5,000 | ✓ | Gives a valuable artifact, some Gold, or resources after defeating its guard. |
| `boreal_call` | Boreal Call | 4,000 | ✓ | Defeat its guard to obtain Abyssal Envoys. |
| `the_gorge` | Carrion Pile | 4,000 | ✓ | Defeat its guard to obtain Waurmos. |
| `circle_of_life` | Circle of Life | 3,000 | ✓ | Gives Gold and Crystals after defeating its guard. |
| `jousting_range` | Colosseum | 4,000 | ✓ | Defeat its guard to obtain Cavalry. |
| `cursed_old_house` | Cursed Old House | 5,250 | ✓ | Gives valuable artifacts after defeating its guard. |
| `dragon_utopia` | Dragon Utopia | 13,750 | ✓ | Gives a very large amount of Gold and valuable artifacts after defeating its guard. |
| `orb_observatory` | Four Scholars Observatory | 7,500 | – | Permanently increases each visiting hero's Spell Power or Knowledge by {0} for {1} Gold. |
| `infernal_cirque` | Infernal Cirque | 20,000 | – | Allows each visiting hero to learn up to {0} random Expert skills or level them up. |
| `iridescent_abbey` | Iridescent Abbey | 3,000 | ✓ | Gives Gold and Gems after defeating its guard. |
| `knowledge_garden` | Knowledge Garden | 3,000 | – | Permanently increases each visiting hero's Knowledge by {0}. |
| `learning_stone` | Learning Stone | 2,000 | – | Gives +{0} XP to each visiting hero. |
| `legions_memorial` | Legion's Memorial | 2,500 | ✓ | Gives Gold, Wood, and Ore after defeating its guard. |
| `maze` | Living Maze | 9,500 | – | Permanently increases each visiting hero's chosen attribute by {0}. |
| `lost_library` | Lost Library | 12,000 | – | Gives the first visiting hero {0} XP. |
| `magic_wheel` | Magic Wheel | 3,000 | – | Permanently increases each visiting hero's Spell Power by {0}. |
| `mereas_shrine` | Mearea's Altar | 3,000 | ✓ | Grants Gold after defeating its guard. |
| `college_of_wonder` | Mountain Monastery | 20,000 | – | Permanently increases each visiting hero's Attack, Defense, Spell Power, and Knowledge by {0} for {1} Gold. |
| `unstable_ruins` | Overgrown Vori Ruins | 13,200 | ✓ | Gives a very large amount of Gold and resources after defeating its guard. |
| `fort` | Pauper Knight Order | 7,500 | – | Permanently increases each visiting hero's Attack or Defense by {0} for {1} Gold. |
| `petrified_memorial` | Petrified Memorial | 4,000 | ✓ | Defeat its guard to obtain Medusae. |
| `point_of_balance` | Point of Balance | 5,000 | ✓ | Defeat its guard to obtain Sentinels of Glory. |
| `prismatic_lair` | Prismatic Nest | 7,000 | ✓ | Gives Gems, Crystals, and Mercury after defeating its guard. |
| `raiders_camp` | Raiders' Camp | 4,000 | ✓ | Gives Gold and possibly also valuable artifacts after defeating its guard. |
| `research_laboratory` | Research Laboratory | 16,750 | ✓ | Gives a very large amount of Gold and valuable artifacts after defeating its guard. |
| `ritual_pyre` | Ritual Pyre | 4,000 | ✓ | Defeat its guard to obtain Phoenixes. |
| `trial_scales` | Scales of Worth | 30,000 | – | Permanently increases each visiting hero's chosen attribute by {0}. |
| `stinging_sword` | Stinging Sword | 3,000 | – | Permanently increases each visiting hero's Attack by {0}. |
| `armory_automaton` | Summit Automaton | 3,000 | – | Permanently increases each visiting hero's Defense by {0}. |
| `unforgotten_grave` | Tomb of Vigilance | 4,000 | ✓ | Defeat its guard to obtain Dread Knights. |
| `circus` | Travelling Circus | 4,000 | – | Levels up a random skill for each visiting hero. |
| `tree_of_knowledge` | Tree of Knowledge | 17,500 | – | Gives one level to each visiting hero. |
| `troglodyte_throne` | Troglodyte Throne | 6,000 | ✓ | Gives a very large amount of Gold after defeating its guard. |
| `shady_den` | Trophy Hunter's Den | 3,000 | ✓ | Once per week, gives the first visiting hero a random reward. |
| `twilight_bloom` | Twilight Bloom | 9,000 | ✓ | Gives Gold and a valuable artifact after defeating its guard. |
| `uncanny_rite` | Uncanny Rite | 3,000 | ✓ | Gives Gold and Mercury after defeating its guard. |
| `underground_lair` | Underground Labyrinth | 50,000 | ✓ | Defeat its guards to obtain Basilisks. Guards and Basilisks respawn every week. |
| `university` | University | 7,500 | – | Allows each visiting hero to learn up to {0} random skills for {1} Gold each. |
| `wise_owl` | Wise Owl | 3,750 | – | Teaches a random skill to each visiting hero. If they already know this skill, levels it up instead. |

### Magic Sites

| SID | Name | Value | Guard | Description |
|-----|------|-------|-------|-------------|
| `peasant_cart` | Abandoned Cart | 1,500 | – | Once per game, grants a random small reward. |
| `storage_dust` | Alchemical Dust Storage | 3,000 | – | Once per week, gives {0} Alchemical Dust to the first visiting hero. |
| `alchemy_lab` | Alchemical Lab | 5,000 | – | Allows Gems, Crystals and Mercury to be converted into Alchemical Dust. |
| `mystical_tower` | Altar of Insight | 15,000 | – | Grants {0} Insight(s) to the first visiting hero. It can be used as usual to learn or upgrade Global Map spells. |
| `altar_of_magic_3` | Arcane Shrine | 12,000 | – | Allows the hero to pick and learn {0} out of {1} random Arcane spells. |
| `beer_fountain` | Beer Fountain | 2,500 | – | Increases each visiting hero's Luck by {0} until the end of the week. |
| `camp_fire` | Campfire | 1,000 | – | Gives a small amount of random resources. |
| `crow_nest` | Crow Nest | 2,000 | – | Once per game, grants a random small reward. |
| `unit_trade_lab_kitten_horn` | Crystal Nest | 5,000 | – |  |
| `storage_crystals` | Crystal Storage | 3,000 | – | Once per week, gives {0} Crystals to the first visiting hero. |
| `altar_of_magic_2` | Daylight Shrine | 12,000 | – | Allows the hero to pick and learn {0} out of {1} random Daylight spells. |
| `crystal_trail` | Dragon Step | 17,500 | – | Once per week for each hero, fully restores each visiting hero's mana, then doubles it. |
| `enchanted_scroll_box` | Enchanted Magic Scroll | 3,000 | – | Allows the hero to use a specific spell at its maximum level. |
| `huntsmans_camp` | Explorer's Camp | 6,500 | – | Restores {0}% of hero's maximum Movement points and {1}% maximum mana. |
| `forge` | Forge of the Second Man | 10,000 | – | Allows visiting heroes to trade resources for artifacts. |
| `abandoned_corpse` | Forgotten Remains | 500 | – | Once per game, grants a random small reward. |
| `fountain` | Fountain | 3,750 | – | Gives +{0} Movement points this turn. |
| `fountain_2` | Fountain | 3,750 | – | Gives +{0} Movement points this turn. |
| `fickle_shrine` | Four Scholars Shrine | 30,000 | – | Resets all skills and attributes gained from levels, allowing one to re‑train the hero. Only once per hero. |
| `storage_gemstones` | Gem Storage | 3,000 | – | Once per week, gives {0} Gems to the first visiting hero. |
| `gingerbread_house` | Gingerbread House | 3,000 | – | Once per week, gives the first visiting hero a valuable resource of their choice. |
| `goblin_cache` | Goblin Cache | 1,500 | – | Once per game, grants a random small reward. |
| `storage_gold` | Gold Storage | 3,000 | – | Once per week, gives {0} Gold to the first visiting hero. |
| `gardener` | Magic Garden | 750 | – | Once per week, gives Gold or valuable resources to the first visiting hero. |
| `scroll_box` | Magic Scroll | 1,500 | – | Allows the hero to use a specific spell. |
| `market` | Marketplace | 5,000 | – | Allows visiting heroes to exchange their resources for different ones. |
| `storage_mercury` | Mercury Storage | 3,000 | – | Once per week, gives {0} Mercury to the first visiting hero. |
| `mythic_scroll_box` | Mythic Magic Scroll | 30,000 | – | Allows the hero to use a special global map spell. |
| `unit_trade_lab_gnat` | Neglected Housing | 5,000 | – |  |
| `altar_of_magic_1` | Nightshade Shrine | 12,000 | – | Allows the hero to pick and learn {0} out of {1} random Nightshade spells. |
| `storage_ore` | Ore Storage | 3,000 | – | Once per week, gives {0} Ore to the first visiting hero. |
| `pandora_box` | Pandora's Box | 5,000 | – | Gives an unpredictable but great reward. |
| `pile_of_books` | Pile of Books | 3,750 | – | Increases XP gained by each visiting hero by {0}% until the end of the week. |
| `pocket_dimension` | Pocket Dimension | 5,000 | – | Allows heroes to leave creatures and artifacts here and immediately transfer them to any Remote Foothold or Pocket Dimension you control. |
| `portal_1` | Portal | 0 | – | Teleports the visiting hero to a paired portal. |
| `altar_of_magic_4` | Primal Shrine | 12,000 | – | Allows the hero to pick and learn {0} out of {1} random Primal spells. |
| `quixs_path` | Quix's Altar | 2,500 | – | Increases each visiting hero's Morale by {0} until the end of the week. |
| `watchtower` | Redwood Observatory | 2,500 | – | Removes the fog of war in a huge radius around it. |
| `sacrificial_shrine` | Sacrificial Shrine | 10,000 | – | Allows visiting heroes to sacrifice artifacts and creatures for experience. |
| `stables` | Stables | 3,750 | – | Restores {0}% of hero's maximum Movement points and grants +{0}% until the end of the week. |
| `tear_of_truth` | Tear of Truth | 7,500 | – | Once per week for each hero, fully restores the hero's Movement points. |
| `monty_hall` | The Monty Hall | 3,500 | – | Once per game, offers a choice of {0} among {1} random artifacts. |
| `town_gate` | Town Gate | 15,000 | – | Teleports the visiting hero to any chosen city under your control. |
| `chest` | Treasure Chest | 500 | – | Gives a choice of either {0} Gold or half that amount in XP. |
| `village` | Village | 2,250 | – | Once per week, gives the first visiting hero a common resource of their choice. |
| `mana_well` | Well | 3,750 | – | Fully restores each visiting hero's mana. |
| `mysterious_stone` | Whispering Stones | 3,750 | – | Increases each visiting hero's maximum mana by {0}% until the end of the week. |
| `wind_rose` | Wind Rose | 75,000 | – | Fully reveals the whole map. |
| `windmill` | Windmill | 1,500 | – | Once per week, gives the first visiting hero a small amount of random resources. |
| `storage_wood` | Wood Storage | 3,000 | – | Once per week, gives {0} Wood to the first visiting hero. |
| `flattering_mirror` | World Mirror | 20,000 | – | Removes the fog of war in a small radius around each Mirror on the map. |

### Military

| SID | Name | Value | Guard | Description |
|-----|------|-------|-------|-------------|
| `gladiator_arena` | Hell Light Arena | 2,500 | – | The Arena of Champions! After it's visited and a few days pass, a battle will occur. The winner of the battle wins the game. If the enemy does not appear, you win by default. |
| `arena` | Pit of Glory | 15,000 | – | Allows visiting heroes to upgrade their creatures for Gold. |
| `remote_foothold` | Remote Foothold | 5,000 | – | Allows heroes to leave creatures and artifacts here and immediately transfer them to another Remote Foothold you control. |

### Special

| SID | Name | Value | Guard | Description |
|-----|------|-------|-------|-------------|
| `abandoned_outpost` | Abandoned Outpost | 2,500 | ✓ | Defeat its guard to transform this outpost into a city of your starting faction. |
| `tree_of_abundance` | Arborcopia | 40,000 | – | Once per game, triggers one week of creature growth in all cities under the player's control. |
| `celestial_sphere` | Celestial Spire | 7,500 | – | Allows the study of all spells contained within the magical observatory. |
| `chimerologist` | Chimerologist | 7,500 | – | Allows visiting heroes to trade creatures for other, random creatures. |
| `eternal_dragon` | Eternal Dragon | 35,000 | – | Allows visiting heroes to transform their dragons into very powerful Lich Dragons. |
| `prison` | Hero Cage | 2,500 | – | Unlock to release a friendly hero. |
| `insaras_eye` | Insara's Eye | 2,500 | – | Gives the owner an additional level of knowledge about their opponents, as well as {0} Law points daily. |
| `mirage` | Mirage | 50,000 | – | Defeat your better self to coalesce the illusion into a Grail. This treasure will allow the hero to build a unique and wondrous building in a city. |
| `tavern` | Tavern | 2,500 | – | Allows visiting heroes to recruit additional heroes. |
| `heros_crypt` | Tomb of a Nameless Hero | 2,000 | – | Once per game, grants a random artifact. Curses its plunderer. |

### Objects not in the web database

Placed via built-in content lists or generator meta-objects; the community DB doesn't catalogue
them, so they have no scraped icon/value/description. Names are the editor's (documented or derived).

| SID | Name |
|-----|------|
| `barracks_neutral_2` | Barracks Neutral 2 |
| `barracks_neutral_5` | Barracks Neutral 5 |
| `barracks_neutral_dragon_lich` | Barracks Neutral Dragon Lich |
| `magic_amplifier_1` | Nightshade Amplifier |
| `magic_amplifier_2` | Daylight Amplifier |
| `magic_amplifier_3` | Arcane Amplifier |
| `magic_amplifier_4` | Primal Amplifier |
| `random_hire_1` | Random Hire Tier 1 |
| `random_hire_2` | Random Hire Tier 2 |
| `random_hire_3` | Random Hire Tier 3 |
| `random_hire_4` | Random Hire Tier 4 |
| `random_hire_5` | Random Hire Tier 5 |
| `random_hire_6` | Random Hire Tier 6 |
| `random_hire_7` | Random Hire Tier 7 |
| `random_item_common` | Random Item Common |
| `random_item_epic` | Random Item Epic |
| `random_item_legendary` | Random Item Legendary |
| `random_item_rare` | Random Item Rare |
| `resource_crystals` | Resource Crystals |
| `resource_dust` | Resource Dust |
| `resource_gemstones` | Resource Gemstones |
| `resource_gold` | Resource Gold |
| `resource_mercury` | Resource Mercury |
| `resource_ore` | Resource Ore |
| `resource_wood` | Resource Wood |
| `vanguard` | Vanguard |

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
