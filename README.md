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
```
npm run catalogs
```
Mines `../Templates` + `../Documentation/test-templates` and unions doc-05 seed lists into `src/generated/catalogs.json`. Re-run after adding templates. If the `Olden-Era---Template-Generator` source folder is added to the repo, extend `scripts/build-catalogs.mjs` to read the authoritative `KnownValues.cs` spell/artifact catalogs.

## Tests
```
npm run test
```

## Notes / limitations (v1)
- Edits **variant 0**; other variants are preserved untouched on save.
- Node positions are not part of the format — the editor auto-lays-out the graph deterministically and the preview PNG renders from that layout.
- Save preserves all unmodeled/unknown fields and the original placement of `globalBans` (root vs inside `gameRules`).
- Deep editing of content pools/lists, multi-variant editing, and symmetry/`guardMatchGroup` helpers are planned for v2.
