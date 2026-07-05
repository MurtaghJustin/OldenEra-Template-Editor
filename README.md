# Olden Era — RMG Template Editor

A local, offline web editor for Heroes: Olden Era `.rmg.json` map-generation templates.

## Run (development)
```
npm install
npm run dev
```
On localhost, Open/Save use the File System Access API where supported.

## Build (static, double-click to run)
```
npm run build
```
This produces `dist/index.html` with **JS + CSS inlined** (via `vite-plugin-singlefile`) plus the **map-object icons as separate `*.webp` files beside it** in `dist/`. Open `index.html` directly by double-clicking (`file://`) — no server needed. External module scripts are blocked over `file://`, so JS/CSS are inlined; images are *not* blocked, so the ~140 icons are kept external (they'd add ~400 KB of base64 to the HTML otherwise) and load by relative path. **Distribute the whole `dist/` folder together** — the icons must travel with `index.html`. Loading uses a file picker; Save and Export PNG download files.

## Regenerate catalogs
The editor ships with pre-generated catalogs (`src/generated/*.json`), so this is only needed when the game's templates change. Point it at the game's **map templates folder** — `…\HeroesOldenEra_Data\StreamingAssets\map_templates` (the `*.rmg.json` templates live directly in it; a folder with a `Templates/` subfolder also works) — either as a CLI argument:
```
npm run catalogs -- "G:\SteamLibrary\steamapps\common\Heroes of Might and Magic Olden Era\HeroesOldenEra_Data\StreamingAssets\map_templates"
```
…or via the `OLDEN_ERA_GAME_FILES` environment variable:

PowerShell
```powershell
$env:OLDEN_ERA_GAME_FILES = "G:\SteamLibrary\steamapps\common\Heroes of Might and Magic Olden Era\HeroesOldenEra_Data\StreamingAssets\map_templates"
npm run catalogs
```
Bash
```bash
export OLDEN_ERA_GAME_FILES="/g/SteamLibrary/steamapps/common/Heroes of Might and Magic Olden Era/HeroesOldenEra_Data/StreamingAssets/map_templates"
npm run catalogs
```
It scans every `*.rmg.json` in that folder and unions in the doc-05 seed lists. SID display names and the zone-layout default come from the vendored `reference/` files.

## Tests
```
npm run test
```

## Notes / limitations (v1)
- Edits **variant 0**; other variants are preserved untouched on save.
- Node positions are not part of the format — the editor auto-lays-out the graph deterministically and the preview PNG renders from that layout.
- Save preserves all unmodeled/unknown fields and the original placement of `globalBans` (root vs inside `gameRules`).
- Multi-variant editing (currently variant 0 only), symmetry/`guardMatchGroup` auto-wiring, a hover-revealed connect handle, and dark-style PNG export are planned for v2. (Content-pool/list editing and custom node-type authoring shipped after v1.)
