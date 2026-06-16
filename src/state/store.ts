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

  loadFromText(text: string, fileName: string): void;
  newTemplate(): void;
  select(sel: Selection): void;
  refresh(): void;
  computeLayout(): void;
  setNodePosition(id: string, x: number, y: number): void;
  addZoneOfType(name: string, typeId: string, overrides: Partial<Zone>, position?: { x: number; y: number }): void;
  removeZoneById(name: string): void;
  renameZoneById(oldName: string, newName: string): void;
  addConn(conn: Connection): void;
  removeConn(id: string): void;
  updateZone(name: string, patch: Partial<Zone>): void;
  serializeForSave(): string;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  original: null, root: null, fileName: "untitled.rmg.json",
  variantIndex: 0, graph: null, positions: {}, selection: null, dirty: false, issues: [],
  nodeTypes: BUILTIN_NODE_TYPES, connectMode: "none",

  setConnectMode(m) { if (get().connectMode !== m) set({ connectMode: m }); },

  loadFromText(text, fileName) {
    const root = parseTemplate(text);
    // Adopt the template's own zone settings as the palette defaults, so adding e.g. a player spawn
    // copies what the existing spawns already use.
    const nodeTypes = deriveNodeTypes(root.variants[0]?.zones ?? []);
    set({ original: cloneRaw(root), root, fileName, variantIndex: 0, positions: {}, dirty: false, selection: null, issues: [], nodeTypes });
    get().computeLayout(); // seed canvas positions from a fresh auto-layout
  },

  newTemplate() {
    // A minimal but valid blank template so the canvas opens and zones can be dragged in from
    // scratch — the normal "start a new map" flow. `original` is an empty-variant clone so the
    // round-trip merge has a base to merge dragged-in zones onto.
    const root: TemplateRoot = {
      name: "Untitled", gameMode: "Classic", sizeX: 96, sizeZ: 96,
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
    set({ original: cloneRaw(root), root, fileName: "untitled.rmg.json", variantIndex: 0, positions: {}, dirty: false, selection: null, issues: [], nodeTypes: BUILTIN_NODE_TYPES });
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
    const positions: Record<string, { x: number; y: number }> = {};
    for (const n of graph.nodes) positions[n.id] = { x: n.x, y: n.y };
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

  updateZone(name, patch) {
    const { root, variantIndex } = get(); if (!root) return;
    const z = root.variants[variantIndex].zones.find((zz) => zz.name === name);
    // Renames must go through renameZoneById (it also rewrites connection endpoints);
    // strip any `name` from the patch so updateZone can't silently break the graph.
    if (z) { const { name: _ignore, ...safe } = patch; Object.assign(z, safe); }
    set({ dirty: true }); get().refresh();
  },

  serializeForSave() {
    const { original, root } = get();
    if (!root) return "";
    const merged = original ? mergeEdits(original, root) : root;
    return serializeTemplate(merged);
  },
}));
