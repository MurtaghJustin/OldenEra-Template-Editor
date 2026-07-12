import { useState } from "react";
import { useEditorStore } from "../../state/store";
import { contentDefs, type ContentDef } from "../../core/content";
import {
  resolveZoneItems, countZonesReferencing, editablePoolsForCategory, editableMandatoryGroups,
  addObjectToPoolDef, patchPoolObjectInDef, removePoolObjectFromDef,
  addItemToMandatoryDef, patchMandatoryItemInDef, removeMandatoryItemFromDef,
  makeZonePoolDef, makeZoneMandatoryDef, POOL_CATEGORY_FIELD,
  type ItemCategory, type ObjectRow, type ZoneItemRow,
} from "../../core/zoneItems";
import { catalogs, objectName } from "../../core/catalogs";
import { Combobox } from "../Combobox";
import { objectComboProps } from "../objectPickerProps";
import { VariantField } from "../inspector/fields";
import { HintMark } from "./ColHead";
import type { Zone } from "../../core/types";

const num = (v: string): number | undefined => { const n = parseFloat(v); return Number.isFinite(n) ? n : undefined; };

const CATS: { key: ItemCategory; label: string; color: string; poolCat?: "guarded" | "unguarded" | "resources" }[] = [
  { key: "guarded", label: "Guarded", color: "#e88ad0", poolCat: "guarded" },
  { key: "unguarded", label: "Unguarded", color: "#6cc4f5", poolCat: "unguarded" },
  { key: "resources", label: "Resources", color: "#e6c25a", poolCat: "resources" },
  { key: "mandatory", label: "Mandatory", color: "#8fd88f" },
];

// The friendly, item-centric view of a zone's content: a flat, marked list of what spawns, plus
// direct "add" buttons. It's a layer over the pool/mandatory reference model (still editable under
// "Show advanced") — every write here goes through the normal content-def store actions.
export function ZoneItemsPanel({ zone }: { zone: Zone }) {
  const root = useEditorStore((s) => s.root);
  const openContentDrawer = useEditorStore((s) => s.openContentDrawer);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [createFor, setCreateFor] = useState<ItemCategory | null>(null);

  const rows = resolveZoneItems(root, zone);
  const byCat: Record<ItemCategory, ZoneItemRow[]> = { guarded: [], unguarded: [], resources: [], mandatory: [] };
  for (const r of rows) byCat[r.category].push(r);

  const poolDef = (name: string): ContentDef | undefined => contentDefs(useEditorStore.getState().root, "pools").find((d) => d.name === name);
  const mandDef = (name: string): ContentDef | undefined => contentDefs(useEditorStore.getState().root, "mandatory").find((d) => d.name === name);
  const zoneRefs = (field: keyof Zone): string[] => {
    const z = useEditorStore.getState().root?.variants[useEditorStore.getState().variantIndex]?.zones.find((zz) => zz.name === zone.name);
    return ((z?.[field] as string[] | undefined) ?? []);
  };

  // ---- writes ----------------------------------------------------------------------------------
  const upsertPool = (def: ContentDef) => useEditorStore.getState().upsertContentDef("pools", def, def.name);
  const upsertMand = (def: ContentDef) => useEditorStore.getState().upsertContentDef("mandatory", def, def.name);

  const addToCategory = (cat: ItemCategory) => {
    if (cat === "mandatory") {
      const groups = editableMandatoryGroups(root, zone);
      if (groups.length === 0) { setCreateFor("mandatory"); return; }
      const def = mandDef(groups[0]); if (def) upsertMand(addItemToMandatoryDef(def, { sid: "" }));
      return;
    }
    const pools = editablePoolsForCategory(root, zone, cat);
    if (pools.length === 0) { setCreateFor(cat); return; }
    const def = poolDef(pools[0]); if (def) upsertPool(addObjectToPoolDef(def, { sid: "", weight: 100 }));
  };

  const createAndAdd = (cat: ItemCategory) => {
    const st = useEditorStore.getState();
    if (cat === "mandatory") {
      const def = addItemToMandatoryDef(makeZoneMandatoryDef(st.root, zone.name), { sid: "" });
      st.upsertContentDef("mandatory", def);
      st.updateZone(zone.name, { mandatoryContent: [...zoneRefs("mandatoryContent"), def.name] });
    } else {
      const field = POOL_CATEGORY_FIELD[cat];
      const def = addObjectToPoolDef(makeZonePoolDef(st.root, zone.name, cat), { sid: "", weight: 100 });
      st.upsertContentDef("pools", def);
      st.updateZone(zone.name, { [field]: [...zoneRefs(field), def.name] } as Partial<Zone>);
    }
    setCreateFor(null);
  };

  const editRow = (row: ObjectRow, patch: Record<string, unknown>) => {
    if (row.source.defKind === "pools") {
      const def = poolDef(row.source.poolName); if (def) upsertPool(patchPoolObjectInDef(def, row.source.groupIndex, row.source.contentIndex, patch));
    } else {
      const def = mandDef(row.source.groupName); if (def) upsertMand(patchMandatoryItemInDef(def, row.source.itemIndex, patch));
    }
  };
  const removeRow = (row: ObjectRow) => {
    if (row.source.defKind === "pools") {
      const def = poolDef(row.source.poolName); if (def) upsertPool(removePoolObjectFromDef(def, row.source.groupIndex, row.source.contentIndex));
    } else {
      const def = mandDef(row.source.groupName); if (def) upsertMand(removeMandatoryItemFromDef(def, row.source.itemIndex));
    }
  };
  // Move a pool object to another pool the zone references in the same category.
  const moveRow = (row: ObjectRow, target: string) => {
    if (row.source.defKind !== "pools" || target === row.source.poolName) return;
    const src = poolDef(row.source.poolName); if (!src) return;
    upsertPool(removePoolObjectFromDef(src, row.source.groupIndex, row.source.contentIndex));
    const tgt = poolDef(target); if (!tgt) return;
    upsertPool(addObjectToPoolDef(tgt, { sid: row.sid, weight: row.weight, variant: row.variant }));
  };

  const toggleExpand = (key: string) =>
    setExpanded((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <strong style={{ fontSize: 13 }}>Items in this zone</strong>
        <HintMark hint="Everything that can spawn here, flattened from the zone's pools and mandatory groups. Add objects directly; edits write to the underlying definitions (see Show advanced)." />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {CATS.map((c) => (
          <button key={c.key} onClick={() => addToCategory(c.key)} style={{ fontSize: 12 }}>+ Add {c.label.toLowerCase()}</button>
        ))}
      </div>

      {createFor && (
        <div className="content-row" style={{ borderColor: "#5a4", background: "#1e2a1e" }}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>
            This zone has no editable {createFor} {createFor === "mandatory" ? "group" : "pool"} to add into
            (it references only built-in or no definitions).
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => createAndAdd(createFor)} style={{ fontWeight: "bold" }}>
              Create a {createFor === "mandatory" ? "mandatory group" : "pool"} for this zone & add
            </button>
            <button onClick={() => setCreateFor(null)}>Cancel</button>
          </div>
        </div>
      )}

      {rows.length === 0 && !createFor && (
        <div style={{ opacity: 0.6, fontSize: 12, marginBottom: 8 }}>No items yet — use the add buttons above.</div>
      )}

      {CATS.filter((c) => byCat[c.key].length > 0).map((c) => (
        <div key={c.key} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: c.color, margin: "6px 0 3px" }}>
            {c.label}{c.key === "mandatory" ? " · always spawns" : " · random from pool"}
          </div>
          {byCat[c.key].map((row, i) => (
            <Row key={i} row={row} zone={zone} root={root}
              onEdit={editRow} onRemove={removeRow} onMove={moveRow}
              onOpenRef={(kind, name) => openContentDrawer(kind, name)}
              expanded={expanded} onToggleExpand={toggleExpand} />
          ))}
        </div>
      ))}
    </div>
  );
}

function CategoryDot({ color }: { color: string }) {
  return <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />;
}

function Row({ row, zone, root, onEdit, onRemove, onMove, onOpenRef, expanded, onToggleExpand }: {
  row: ZoneItemRow;
  zone: Zone;
  root: ReturnType<typeof useEditorStore.getState>["root"];
  onEdit: (row: ObjectRow, patch: Record<string, unknown>) => void;
  onRemove: (row: ObjectRow) => void;
  onMove: (row: ObjectRow, target: string) => void;
  onOpenRef: (kind: "pools" | "lists" | "mandatory", name: string) => void;
  expanded: Set<string>;
  onToggleExpand: (key: string) => void;
}) {
  const color = CATS.find((c) => c.key === row.category)!.color;
  const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "3px 0", flexWrap: "wrap", fontSize: 12 };

  if (row.kind === "builtinRef") {
    return (
      <div style={rowStyle}>
        <CategoryDot color={color} />
        <button onClick={() => onOpenRef(row.refKind, row.name)} style={{ background: "none", border: "none", color: "#9bb", textDecoration: "underline", cursor: "pointer", padding: 0, font: "inherit" }}>{row.name}</button>
        <span style={{ opacity: 0.5 }}>· built-in {row.refKind === "pools" ? "pool" : "group"} (read-only here)</span>
      </div>
    );
  }

  if (row.kind === "list") {
    const key = `${row.category}:${row.listName}`;
    const isOpen = expanded.has(key);
    const listContent = ((contentDefs(root, "lists").find((d) => d.name === row.listName)?.content as { sid?: string }[] | undefined) ?? []);
    return (
      <div>
        <div style={rowStyle}>
          <CategoryDot color={color} />
          <button onClick={() => onToggleExpand(key)} aria-label={isOpen ? "Collapse list" : "Expand list"} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", padding: 0, font: "inherit" }}>{isOpen ? "▾" : "▸"}</button>
          <span>List: <b>{row.listName}</b></span>
          <span style={{ opacity: 0.5 }}>· {row.objectCount == null ? "built-in" : `${row.objectCount} object${row.objectCount === 1 ? "" : "s"}`} · shared</span>
          <button onClick={() => onOpenRef("lists", row.listName)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#9bb", textDecoration: "underline", cursor: "pointer", padding: 0, font: "inherit" }}>open →</button>
        </div>
        {isOpen && (
          <div style={{ margin: "2px 0 4px 22px", fontSize: 11, opacity: 0.75 }}>
            {listContent.length === 0 ? <span>(no objects{row.objectCount == null ? " — defined outside this template" : ""})</span>
              : listContent.map((e, i) => <span key={i}>{objectName(e.sid ?? "")}{i < listContent.length - 1 ? ", " : ""}</span>)}
          </div>
        )}
      </div>
    );
  }

  // Editable object row.
  const refKind = row.source.defKind === "pools" ? "pools" : "mandatory";
  const defName = row.source.defKind === "pools" ? row.source.poolName : row.source.groupName;
  const sharedCount = countZonesReferencing(root, refKind, defName);
  const movePools = row.category !== "mandatory" ? editablePoolsForCategory(root, zone, row.category) : [];

  return (
    <div style={rowStyle}>
      <CategoryDot color={color} />
      <div style={{ flex: "1 1 150px", minWidth: 120 }}>
        <Combobox value={row.sid} options={catalogs.sids ?? []} labelFor={objectName} {...objectComboProps} ariaLabel="Object" placeholder="search objects…"
          onChange={(v) => onEdit(row, { sid: v })} />
      </div>

      {row.category !== "mandatory" ? (
        <label style={{ display: "inline-flex", gap: 3, alignItems: "center", opacity: 0.8 }} title="Selection weight within its pool group">
          w<input type="number" aria-label="Weight" style={{ width: 56 }} value={row.weight ?? ""} onChange={(e) => onEdit(row, { weight: num(e.target.value) })} />
        </label>
      ) : (
        <>
          <select aria-label="Guarding" title="Force guarded / unguarded (Default = pool decides)" value={row.guarded === undefined ? "" : row.guarded ? "yes" : "no"}
            onChange={(e) => onEdit(row, { isGuarded: e.target.value === "" ? undefined : e.target.value === "yes" })}>
            <option value="">Default</option><option value="yes">Guarded</option><option value="no">Unguarded</option>
          </select>
          <label style={{ display: "inline-flex", gap: 3, alignItems: "center", opacity: 0.8 }} title="Treat as a resource mine">
            <input type="checkbox" checked={!!row.isMine} onChange={(e) => onEdit(row, { isMine: e.target.checked || undefined })} />mine</label>
          <label style={{ display: "inline-flex", gap: 3, alignItems: "center", opacity: 0.8 }} title="Place alone, not clustered">
            <input type="checkbox" checked={!!row.soloEncounter} onChange={(e) => onEdit(row, { soloEncounter: e.target.checked || undefined })} />solo</label>
        </>
      )}

      <div style={{ width: 76 }}>
        <VariantField sid={row.sid} value={row.variant} ariaLabel="Variant" onChange={(v) => onEdit(row, { variant: v })} />
      </div>

      {movePools.length > 1 && (
        <select aria-label="Pool" title="Which pool this object lives in" value={row.source.defKind === "pools" ? row.source.poolName : ""}
          onChange={(e) => onMove(row, e.target.value)}>
          {movePools.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      )}

      {row.category === "mandatory" && (
        <button title="Edit placement rules" onClick={() => onOpenRef("mandatory", defName)} style={{ background: "none", border: "none", color: "#9bb", textDecoration: "underline", cursor: "pointer", padding: 0, font: "inherit" }}>rules →</button>
      )}

      {sharedCount > 1 && <span title={`This ${refKind === "pools" ? "pool" : "group"} is used by ${sharedCount} zones — editing changes all of them`} style={{ color: "#e6c25a", fontSize: 11 }}>⚠ shared ×{sharedCount}</span>}

      <button className="ct-iconbtn" aria-label="Remove item" style={{ marginLeft: "auto" }} onClick={() => onRemove(row)}>✕</button>
    </div>
  );
}
