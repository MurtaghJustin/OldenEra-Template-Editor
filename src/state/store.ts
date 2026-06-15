import { create } from "zustand";
import type { TemplateRoot, Zone } from "../core/types";
import { parseTemplate, serializeTemplate } from "../core/parse";
import { cloneRaw, mergeEdits } from "../core/roundtrip";
import {
  extractGraph,
  addZone,
  removeZone,
  addConnection,
  removeConnection,
  renameZone,
  type Graph,
} from "../core/graph";
import { autoLayout } from "../core/layout";
import { BUILTIN_NODE_TYPES, resolveZone, type NodeType } from "../core/nodeTypes";
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
  selection: Selection;
  dirty: boolean;
  issues: Issue[];
  nodeTypes: NodeType[];

  loadFromText(text: string, fileName: string): void;
  select(sel: Selection): void;
  refresh(): void;
  addZoneOfType(name: string, typeId: string, overrides: Partial<Zone>): void;
  removeZoneById(name: string): void;
  renameZoneById(oldName: string, newName: string): void;
  addConn(conn: Connection): void;
  removeConn(id: string): void;
  updateZone(name: string, patch: Partial<Zone>): void;
  serializeForSave(): string;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  original: null, root: null, fileName: "untitled.rmg.json",
  variantIndex: 0, graph: null, selection: null, dirty: false, issues: [],
  nodeTypes: BUILTIN_NODE_TYPES,

  loadFromText(text, fileName) {
    const root = parseTemplate(text);
    set({ original: cloneRaw(root), root, fileName, variantIndex: 0, dirty: false, selection: null, issues: [] });
    get().refresh();
  },

  select(selection) { set({ selection }); },

  refresh() {
    const { root, variantIndex } = get();
    if (!root || !root.variants[variantIndex]) return;
    const graph = autoLayout(extractGraph(root, variantIndex), root.variants[variantIndex]);
    // Bump the `root` reference (shallow clone) so components subscribing to `s.root`
    // re-render after in-place mutations. Every mutation path funnels through refresh(),
    // including the inspector panels that mutate root directly. Nested data is shared, so
    // serializeForSave's mergeEdits still sees the edits; `original` stays a separate clone.
    set({ root: { ...root }, graph, issues: validateTemplate(root, variantIndex) });
  },

  addZoneOfType(name, typeId, overrides) {
    const { root, variantIndex, nodeTypes } = get(); if (!root) return;
    const type = nodeTypes.find((t) => t.id === typeId) ?? nodeTypes[0];
    addZone(root, variantIndex, resolveZone(name, type, overrides));
    set({ dirty: true }); get().refresh();
  },

  removeZoneById(name) {
    const { root, variantIndex } = get(); if (!root) return;
    removeZone(root, variantIndex, name);
    set({ dirty: true, selection: null }); get().refresh();
  },

  renameZoneById(oldName, newName) {
    const { root, variantIndex } = get(); if (!root) return;
    renameZone(root, variantIndex, oldName, newName);
    set({ dirty: true, selection: { kind: "zone", id: newName } }); get().refresh();
  },

  addConn(conn) {
    const { root, variantIndex } = get(); if (!root) return;
    addConnection(root, variantIndex, conn);
    set({ dirty: true }); get().refresh();
  },

  removeConn(id) {
    const { root, variantIndex } = get(); if (!root) return;
    removeConnection(root, variantIndex, id);
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
