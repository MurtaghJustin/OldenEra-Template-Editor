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
This produces a **single self-contained `dist/index.html`** (JS + CSS inlined via `vite-plugin-singlefile`). Open it directly in a browser by double-clicking (`file://`) — no server needed; external module scripts are blocked over `file://`, so inlining is what makes double-click work. Loading uses a file picker; Save and Export PNG download files.

## Regenerate catalogs
The editor ships with pre-generated catalogs (`src/generated/*.json`), so this is only needed when the game's templates/data change. Point it at your extracted **game files** — a folder containing `Templates/` and `Data/`:
```
npm run catalogs -- /path/to/game-files
```
(or set the `OLDEN_ERA_GAME_FILES` env var). It mines the official templates and game data and unions in the doc-05 seed lists. SID display names come from the vendored `reference/05-id-reference.md`.

## Tests
```
npm run test
```

## Notes / limitations (v1)
- Edits **variant 0**; other variants are preserved untouched on save.
- Node positions are not part of the format — the editor auto-lays-out the graph deterministically and the preview PNG renders from that layout.
- Save preserves all unmodeled/unknown fields and the original placement of `globalBans` (root vs inside `gameRules`).
- Multi-variant editing (currently variant 0 only), symmetry/`guardMatchGroup` auto-wiring, a hover-revealed connect handle, and dark-style PNG export are planned for v2. (Content-pool/list editing and custom node-type authoring shipped after v1.)
