import { create } from "zustand";
import type { TemplateRoot, Zone } from "../core/types";
import { parseTemplate, serializeTemplate } from "../core/parse";
import { cloneRaw, mergeEdits } from "../core/roundtrip";
import {
  extractGraph,
  addZone,
  removeZone,
  addConnection,
  removeConnectionsForPair,
  renameZone,
  type Graph,
} from "../core/graph";
import { autoLayout } from "../core/layout";
import { BUILTIN_NODE_TYPES, resolveZone, deriveNodeTypes, type NodeType } from "../core/nodeTypes";
import { validateTemplate, type Issue } from "../core/validate";
import { CONTENT_ROOT_FIELD, defaultZoneLayout, renameContentReferences, type ContentKind, type ContentDef } from "../core/content";
import { stripEmptySids } from "../core/normalize";
import { generateRoads } from "../core/roads";
import type { Connection } from "../core/types";

export type Selection =
  | { kind: "zone"; id: string }
  | { kind: "connection"; id: string }
  | { kind: "gameRules" }
  | { kind: "globalBans" }
  | { kind: "nodeTypes" }
  | null;

interface EditorState {
  original: TemplateRoot | null; // pristine, for merge
  root: TemplateRoot | null;     // working model
  fileName: string;
  variantIndex: number;
  graph: Graph | null;
  // Canvas node positions, keyed by zone name. These are SESSION-only — the .rmg.json format
  // stores no positions, so they're never saved. They're seeded by computeLayout() on load,
  // preserved across topology edits (adding/removing zones or connections never reshuffles), and
  // updated as the user drags. computeLayout() (and Save) overwrites them with a fresh auto-layout.
  positions: Record<string, { x: number; y: number }>;
  selection: Selection;
  dirty: boolean;
  issues: Issue[];
  nodeTypes: NodeType[];
  // Transient canvas drag mode, driven by held modifier keys. "none" = drag moves nodes (default);
  // "direct"/"portal" = drag draws a connection of that type (Shift = direct, Alt = portal).
  connectMode: "none" | "direct" | "portal";
  setConnectMode(m: "none" | "direct" | "portal"): void;
  // The content-library slide-out. null = closed; itemName present = open straight to that
  // definition (e.g. from a zone reference), absent = open the browse list for the kind.
  contentDrawer: { kind: ContentKind; itemName?: string; createNew?: boolean; referenceBack?: (name: string) => void } | null;
  openContentDrawer(kind: ContentKind, itemName?: string): void;
  // Open the drawer straight into a NEW draft. referenceBack (if given) runs when that draft is
  // accepted — used by zone pickers so "+ New" creates a definition and references it on the zone.
  createContentDraft(kind: ContentKind, referenceBack?: (name: string) => void): void;
  closeContentDrawer(): void;
  // Commit a content definition (add, or replace by name). originalName handles a rename — the old
  // entry is dropped so the rename doesn't leave a duplicate.
  upsertContentDef(kind: ContentKind, def: ContentDef, originalName?: string): void;
  removeContentDef(kind: ContentKind, name: string): void;

  loadFromText(text: string, fileName: string): void;
  newTemplate(): void;
  select(sel: Selection): void;
  refresh(): void;
  computeLayout(): void;
  setNodePosition(id: string, x: number, y: number): void;
  addZoneOfType(name: string, typeId: string, overrides: Partial<Zone>, position?: { x: number; y: number }): void;
  removeZoneById(name: string): void;
  duplicateZoneById(name: string): void;
  renameZoneById(oldName: string, newName: string): void;
  addConn(conn: Connection): void;
  removeConn(id: string): void;
  // Split a connection by inserting a node between its endpoints: A↔B becomes A↔node↔B, with the
  // original connection's properties (guard, type, road) copied to both halves.
  insertNodeOnConnection(nodeName: string, edgeId: string): void;
  updateZone(name: string, patch: Partial<Zone>): void;
  serializeForSave(): string;
  // Custom node-type authoring (persisted in localStorage; merged into nodeTypes alongside builtins).
  createCustomType(fromId?: string): string; // returns the new type's id
  createTypeFromZone(zoneName: string): string; // make a custom type from an existing zone's settings
  updateCustomType(id: string, patch: { label?: string; zone?: NodeType["zone"] }): void;
  removeCustomType(id: string): void;
}

// Custom node types are an editor convenience, not part of the .rmg.json — they persist in the
// browser (localStorage) so they survive reloads and follow you across templates. Built-ins are
// derived from the open template; customs are appended.
const CUSTOM_TYPES_KEY = "rmg.nodeTypes.custom";
function loadCustomTypes(): NodeType[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TYPES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((t) => t && t.builtin === false && typeof t.id === "string") : [];
  } catch { return []; }
}
function saveCustomTypes(types: NodeType[]): void {
  try { localStorage.setItem(CUSTOM_TYPES_KEY, JSON.stringify(types.filter((t) => !t.builtin))); } catch { /* e.g. storage disabled */ }
}
function withCustoms(builtins: NodeType[]): NodeType[] { return [...builtins, ...loadCustomTypes()]; }

// Ensure a zone-layout name is defined in the template's zoneLayouts — node types carry layout
// names (zone_layout_sides, …) but referencing one that isn't defined inline hangs the generator,
// so adding a zone of that type seeds a default definition. Mutates root; caller refreshes.
function ensureLayoutDefined(root: TemplateRoot, name: string | undefined): void {
  if (!name) return;
  const r = root as Record<string, unknown>;
  const arr = Array.isArray(r.zoneLayouts) ? (r.zoneLayouts as { name?: string }[]) : [];
  if (!arr.some((z) => z.name === name)) { arr.push(defaultZoneLayout(name)); r.zoneLayouts = arr; }
}

// Factor the auto-layout is spread by for display (canvas + preview), so edges read longer relative
// to the fixed-size discs. Pure scale → shapes unchanged.
const LAYOUT_SCALE = 1.5;

export const useEditorStore = create<EditorState>((set, get) => ({
  original: null, root: null, fileName: "untitled.rmg.json",
  variantIndex: 0, graph: null, positions: {}, selection: null, dirty: false, issues: [],
  nodeTypes: withCustoms(BUILTIN_NODE_TYPES), connectMode: "none", contentDrawer: null,

  setConnectMode(m) { if (get().connectMode !== m) set({ connectMode: m }); },

  openContentDrawer(kind, itemName) { set({ contentDrawer: { kind, itemName } }); },
  createContentDraft(kind, referenceBack) { set({ contentDrawer: { kind, createNew: true, referenceBack } }); },
  closeContentDrawer() { set({ contentDrawer: null }); },

  upsertContentDef(kind, def, originalName) {
    const { root } = get(); if (!root) return;
    const field = CONTENT_ROOT_FIELD[kind];
    const r = root as Record<string, unknown>;
    const arr = (Array.isArray(r[field]) ? r[field] : []) as ContentDef[];
    if (originalName && originalName !== def.name) {
      const j = arr.findIndex((d) => d.name === originalName);
      if (j >= 0) arr.splice(j, 1);
      // Cascade the rename into zones (and pool includeLists) so nothing is left referencing the
      // old name — a dangling pool/layout/etc. reference breaks generation.
      renameContentReferences(root, kind, originalName, def.name);
    }
    const i = arr.findIndex((d) => d.name === def.name);
    if (i >= 0) arr[i] = def; else arr.push(def);
    r[field] = arr;
    set({ dirty: true }); get().refresh();
  },

  removeContentDef(kind, name) {
    const { root } = get(); if (!root) return;
    const field = CONTENT_ROOT_FIELD[kind];
    const r = root as Record<string, unknown>;
    const arr = (Array.isArray(r[field]) ? r[field] : []) as ContentDef[];
    r[field] = arr.filter((d) => d.name !== name);
    set({ dirty: true }); get().refresh();
  },

  loadFromText(text, fileName) {
    const root = parseTemplate(text);
    // Adopt the template's own zone settings as the palette defaults, so adding e.g. a player spawn
    // copies what the existing spawns already use.
    const nodeTypes = withCustoms(deriveNodeTypes(root.variants[0]?.zones ?? []));
    set({ original: cloneRaw(root), root, fileName, variantIndex: 0, positions: {}, dirty: false, selection: null, issues: [], nodeTypes });
    get().computeLayout(); // seed canvas positions from a fresh auto-layout
  },

  newTemplate() {
    // A minimal but valid blank template so the canvas opens and zones can be dragged in from
    // scratch — the normal "start a new map" flow. `original` is an empty-variant clone so the
    // round-trip merge has a base to merge dragged-in zones onto.
    const root: TemplateRoot = {
      // A win condition is required for the map to generate, so a new template defaults to the
      // standard "defeat all opponents" win (win_condition_1); description mirrors the corpus shape.
      name: "Untitled", description: "", displayWinCondition: "win_condition_1",
      gameMode: "Classic", sizeX: 96, sizeZ: 96,
      gameRules: {
        heroCountMin: 4, heroCountMax: 8, heroCountIncrement: 1, heroHireBan: false,
        encounterHoles: false, winConditions: { classic: true }, bonuses: [],
      },
      globalBans: { magics: [], items: [] },
      variants: [{
        orientation: { mode: "MinimalBoundingSquare", baseAngleMin: 0, baseAngleMax: 360, randomAngleAmplitude: 45, randomAngleStep: 90 },
        border: { obstaclesWidth: 3, waterWidth: 0, waterType: "water grass" },
        zones: [], connections: [],
      }],
      zoneLayouts: [], mandatoryContent: [], contentCountLimits: [], contentPools: [], contentLists: [],
    };
    set({ original: cloneRaw(root), root, fileName: "untitled.rmg.json", variantIndex: 0, positions: {}, dirty: false, selection: null, issues: [], nodeTypes: withCustoms(BUILTIN_NODE_TYPES) });
    get().computeLayout();
  },

  select(selection) { set({ selection }); },

  refresh() {
    const { root, variantIndex, positions } = get();
    if (!root || !root.variants[variantIndex]) return;
    // Rebuild graph topology from the model, then APPLY the stored session positions — never
    // auto-layout here, so editing (add/remove zone or connection) leaves the arrangement put.
    // A node with no stored position yet (e.g. a freshly added zone with no drop point) is parked
    // at the centroid of the placed nodes so it lands on-screen rather than off in the void.
    const graph = extractGraph(root, variantIndex);
    const placed = graph.nodes.filter((n) => positions[n.id]);
    const cx = placed.length ? placed.reduce((s, n) => s + positions[n.id].x, 0) / placed.length : 100;
    const cy = placed.length ? placed.reduce((s, n) => s + positions[n.id].y, 0) / placed.length : 100;
    for (const n of graph.nodes) { const p = positions[n.id] ?? { x: cx, y: cy }; n.x = p.x; n.y = p.y; }
    // Bump the `root` reference (shallow clone) so components subscribing to `s.root`
    // re-render after in-place mutations. Nested data is shared, so serializeForSave's mergeEdits
    // still sees the edits; `original` stays a separate clone.
    set({ root: { ...root }, graph, issues: validateTemplate(root, variantIndex) });
  },

  computeLayout() {
    const { root, variantIndex } = get();
    if (!root || !root.variants[variantIndex]) return;
    const graph = autoLayout(extractGraph(root, variantIndex), root.variants[variantIndex]);
    // Uniformly spread the computed layout so connection lines read longer relative to the
    // fixed-size discs. A pure scale preserves every shape exactly. Applied here (render layer) so
    // autoLayout and its shape tests stay in their natural units.
    const positions: Record<string, { x: number; y: number }> = {};
    for (const n of graph.nodes) { n.x *= LAYOUT_SCALE; n.y *= LAYOUT_SCALE; positions[n.id] = { x: n.x, y: n.y }; }
    set({ root: { ...root }, graph, positions, issues: validateTemplate(root, variantIndex) });
  },

  setNodePosition(id, x, y) {
    const { graph, positions } = get();
    const next = { ...positions, [id]: { x, y } };
    // Update the matching graph node in place and bump the graph reference for re-render. Dragging
    // does NOT mark the document dirty — positions aren't part of the saved file.
    const nextGraph = graph ? { ...graph, nodes: graph.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) } : graph;
    set({ positions: next, graph: nextGraph });
  },

  addZoneOfType(name, typeId, overrides, position) {
    const { root, variantIndex, nodeTypes, positions } = get(); if (!root) return;
    const type = nodeTypes.find((t) => t.id === typeId) ?? nodeTypes[0];
    const zone = resolveZone(name, type, overrides);
    // A player-spawn zone defaults to a NEW player: take the lowest Player slot not already used by
    // an existing spawn, so dropping several spawns produces Player1, Player2, Player3, … rather
    // than three copies of Player1. (Skip if the caller explicitly set the spawn via overrides.)
    const spawn = (zone.mainObjects ?? []).find((m) => m.type === "Spawn");
    if (spawn && spawn.spawn) {
      const used = new Set<number>();
      for (const z of root.variants[variantIndex].zones)
        for (const m of z.mainObjects ?? []) {
          const mm = /^Player(\d+)$/.exec(typeof m.spawn === "string" ? m.spawn : "");
          if (mm) used.add(Number(mm[1]));
        }
      let n = 1; while (used.has(n)) n++;
      spawn.spawn = `Player${n}`;
    }
    ensureLayoutDefined(root, zone.layout); // the type's layout must exist in zoneLayouts
    addZone(root, variantIndex, zone);
    if (position) set({ positions: { ...positions, [name]: position } });
    set({ dirty: true }); get().refresh();
  },

  removeZoneById(name) {
    const { root, variantIndex, positions } = get(); if (!root) return;
    removeZone(root, variantIndex, name);
    const { [name]: _drop, ...rest } = positions;
    set({ dirty: true, selection: null, positions: rest }); get().refresh();
  },

  duplicateZoneById(name) {
    const { root, variantIndex, positions } = get(); if (!root) return;
    const v = root.variants[variantIndex];
    const src = v.zones.find((z) => z.name === name); if (!src) return;
    const taken = new Set(v.zones.map((z) => z.name));
    let newName = `${name}-copy`; for (let i = 2; taken.has(newName); i++) newName = `${name}-copy-${i}`;
    const clone = structuredClone(src) as Zone;
    clone.name = newName;
    clone.roads = []; // roads reference this zone's specific connections — the copy starts unwired
    // Reassign any Spawn slots to the next free players so the copy isn't a duplicate player start.
    const used = new Set<number>();
    for (const z of v.zones) for (const m of z.mainObjects ?? []) {
      const mm = /^Player(\d+)$/.exec(typeof m.spawn === "string" ? m.spawn : ""); if (mm) used.add(Number(mm[1]));
    }
    for (const m of clone.mainObjects ?? []) if (m.type === "Spawn" && typeof m.spawn === "string" && /^Player\d+$/.test(m.spawn)) {
      let n = 1; while (used.has(n)) n++; used.add(n); m.spawn = `Player${n}`;
    }
    addZone(root, variantIndex, clone);
    const sp = positions[name];
    const nextPos = sp ? { ...positions, [newName]: { x: sp.x + 48, y: sp.y + 48 } } : positions;
    set({ dirty: true, selection: { kind: "zone", id: newName }, positions: nextPos });
    get().refresh();
  },

  renameZoneById(oldName, newName) {
    const { root, variantIndex, positions } = get(); if (!root) return;
    renameZone(root, variantIndex, oldName, newName);
    // Carry the node's position across the rename so it doesn't jump.
    const rest = { ...positions };
    if (rest[oldName]) { rest[newName] = rest[oldName]; delete rest[oldName]; }
    set({ dirty: true, selection: { kind: "zone", id: newName }, positions: rest }); get().refresh();
  },

  addConn(conn) {
    const { root, variantIndex } = get(); if (!root) return;
    addConnection(root, variantIndex, conn);
    set({ dirty: true }); get().refresh();
  },

  removeConn(id) {
    const { root, variantIndex } = get(); if (!root) return;
    removeConnectionsForPair(root, variantIndex, id);
    set({ dirty: true, selection: null }); get().refresh();
  },

  insertNodeOnConnection(nodeName, edgeId) {
    const { root, variantIndex } = get(); if (!root) return;
    const v = root.variants[variantIndex];
    const target = v.connections.find((c, i) => (c.name || `${c.from}-${c.to}-${i}`) === edgeId);
    if (!target || target.from === nodeName || target.to === nodeName) return;
    const a = target.from, b = target.to;
    const { from: _f, to: _t, name: _n, ...rest } = target; // copy guard/type/road to both halves
    removeConnectionsForPair(root, variantIndex, edgeId);
    addConnection(root, variantIndex, { ...structuredClone(rest), from: a, to: nodeName });
    addConnection(root, variantIndex, { ...structuredClone(rest), from: nodeName, to: b });
    set({ dirty: true, selection: { kind: "zone", id: nodeName } }); get().refresh();
  },

  updateZone(name, patch) {
    const { root, variantIndex } = get(); if (!root) return;
    const z = root.variants[variantIndex].zones.find((zz) => zz.name === name);
    // Renames must go through renameZoneById (it also rewrites connection endpoints);
    // strip any `name` from the patch so updateZone can't silently break the graph.
    if (z) { const { name: _ignore, ...safe } = patch; Object.assign(z, safe); }
    if (typeof patch.layout === "string") ensureLayoutDefined(root, patch.layout); // e.g. "Apply type"
    set({ dirty: true }); get().refresh();
  },

  serializeForSave() {
    const { original, root } = get();
    if (!root) return "";
    // mergeEdits returns a fresh clone; when there's no original, clone `root` so the normalization
    // pass never mutates the live working model. stripEmptySids drops invalid empty-string sids that
    // would crash generation (see normalize.ts).
    const merged = original ? mergeEdits(original, root) : cloneRaw(root);
    generateRoads(merged);        // fill in road paths for editor-made (unrouted) templates
    return serializeTemplate(stripEmptySids(merged));
  },

  createCustomType(fromId) {
    const { nodeTypes } = get();
    const ids = new Set(nodeTypes.map((t) => t.id));
    let n = 1; while (ids.has(`custom_${n}`)) n++;
    const id = `custom_${n}`;
    const base = nodeTypes.find((t) => t.id === fromId) ?? nodeTypes.find((t) => t.id === "side") ?? nodeTypes[0];
    const label = base && fromId ? `${base.label} copy` : "Custom type";
    const type: NodeType = { id, label, builtin: false, zone: structuredClone(base!.zone) };
    const next = [...nodeTypes, type];
    set({ nodeTypes: next }); saveCustomTypes(next);
    return id;
  },

  createTypeFromZone(zoneName) {
    const { root, variantIndex, nodeTypes } = get();
    const zone = root?.variants[variantIndex]?.zones.find((z) => z.name === zoneName);
    if (!zone) return "";
    const ids = new Set(nodeTypes.map((t) => t.id));
    let n = 1; while (ids.has(`custom_${n}`)) n++;
    const id = `custom_${n}`;
    const clone = structuredClone(zone) as Record<string, unknown>;
    delete clone.name;
    clone.roads = []; // per-zone wiring isn't part of a reusable type
    const type: NodeType = { id, label: zoneName, builtin: false, zone: clone as NodeType["zone"] };
    const next = [...nodeTypes, type];
    set({ nodeTypes: next }); saveCustomTypes(next);
    return id;
  },

  updateCustomType(id, patch) {
    const next = get().nodeTypes.map((t) =>
      t.id === id && !t.builtin
        ? { ...t, ...(patch.label !== undefined ? { label: patch.label } : {}), ...(patch.zone !== undefined ? { zone: patch.zone } : {}) }
        : t);
    set({ nodeTypes: next }); saveCustomTypes(next);
  },

  removeCustomType(id) {
    const next = get().nodeTypes.filter((t) => !(t.id === id && !t.builtin));
    set({ nodeTypes: next }); saveCustomTypes(next);
  },
}));
