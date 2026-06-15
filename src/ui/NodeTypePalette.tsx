import { useEditorStore } from "../state/store";
import { treasureTierFromLayout } from "../core/graph";
import { tierColor } from "../core/preview";
import type { NodeType } from "../core/nodeTypes";
import type { Zone } from "../core/types";

// dataTransfer key carrying the dragged node-type id from the palette to the canvas drop handler.
export const DND_NODETYPE = "application/rmg-nodetype";

// A node type's canvas appearance, derived exactly as extractGraph does so the palette icon matches
// the disc the dropped zone will render as.
function previewDisc(type: NodeType): { bg: string; glyph: string } {
  // Zone's index signature collapses Omit<Zone,"name"> property types, so read through a Zone view.
  const zone = type.zone as unknown as Zone;
  const main = zone.mainObjects ?? [];
  const isSpawn = main.some((m) => m.type === "Spawn");
  const hasTown = main.some((m) => m.type === "City");
  if (isSpawn) return { bg: "#6b3f1d", glyph: "#" };
  return { bg: tierColor(treasureTierFromLayout(zone.layout)), glyph: hasTown ? "⌂" : "" };
}

export function NodeTypePalette() {
  const nodeTypes = useEditorStore((s) => s.nodeTypes);
  const root = useEditorStore((s) => s.root);

  return (
    <div style={{ borderBottom: "1px solid #333", padding: 8, flexShrink: 0 }}>
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Drag onto canvas to add
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {nodeTypes.map((t) => {
          const { bg, glyph } = previewDisc(t);
          return (
            <div
              key={t.id}
              draggable={!!root}
              onDragStart={(e) => { e.dataTransfer.setData(DND_NODETYPE, t.id); e.dataTransfer.effectAllowed = "move"; }}
              title={root ? `Drag onto the canvas to add a ${t.label}` : "Open a template first"}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "4px 8px 4px 4px", borderRadius: 16,
                border: "1px solid #333", cursor: root ? "grab" : "not-allowed",
                opacity: root ? 1 : 0.4, userSelect: "none",
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: "50%", background: bg, border: "2px solid #2b1d0e",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#f4e7c8",
                fontWeight: "bold", fontSize: 13, flexShrink: 0,
              }}>{glyph}</div>
              <span style={{ fontSize: 11 }}>{t.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
