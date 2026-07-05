import type { ReactNode } from "react";
import { mapObjectInfo, mapObjectIcon, objectName } from "../core/catalogs";

// Rich rendering for map-object SID pickers, shared by all five object editors (content pools/lists,
// mandatory content, count limits, value overrides). Spread `objectComboProps` into a <Combobox> that
// already has `labelFor={objectName}`. Objects catalogued on oldenera.th.gl show an icon, value, guard
// flag, group chip, and a full description in the detail panel; the ~26 uncatalogued SIDs
// (random_hire_*, resource_*, …) degrade to name + dimmed SID with no icon/meta.

// Short chips for the six display groups (see Documentation/05).
const GROUP_ABBR: Record<string, string> = {
  "Dwellings": "Dwl",
  "Resource Sites": "Res",
  "Adventure Sites": "Adv",
  "Magic Sites": "Mag",
  "Military": "Mil",
  "Special": "Spc",
};

function ObjectIcon({ sid, size }: { sid: string; size: number }) {
  const src = mapObjectIcon(sid);
  if (!src) return null;
  return <img src={src} width={size} height={size} alt=""
    style={{ flexShrink: 0, borderRadius: 4, objectFit: "contain" }} />;
}

// One-line row: icon · name · value · guard · group chip. Uncatalogued SIDs keep the plain
// "name + dimmed sid" form (there's no icon/value/chip to show).
function renderOption(sid: string): ReactNode {
  const info = mapObjectInfo(sid);
  if (!info) {
    return <>{objectName(sid)} <span style={{ opacity: 0.4, fontSize: 11 }}>{sid}</span></>;
  }
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <ObjectIcon sid={sid} size={28} />
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {info.name}
      </span>
      <span style={{ fontSize: 11, opacity: 0.65, fontVariantNumeric: "tabular-nums" }}>
        {info.value.toLocaleString()}
      </span>
      {info.guardUnits && <span title="Guarded" style={{ color: "#d9a066", fontSize: 12 }}>⚔</span>}
      <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "#ffffff1a", opacity: 0.7 }}>
        {GROUP_ABBR[info.groupLabel] ?? info.groupLabel}
      </span>
    </span>
  );
}

// Pinned detail panel: larger icon, name, a meta line, the dimmed SID, and the full description.
function renderDetail(sid: string): ReactNode {
  const info = mapObjectInfo(sid);
  if (!info) {
    return (
      <div style={{ padding: "8px 10px", fontSize: 11 }}>
        <div style={{ fontWeight: 600, color: "#eee", fontSize: 12 }}>{objectName(sid)}</div>
        <div style={{ opacity: 0.4, marginTop: 2 }}>{sid}</div>
        <div style={{ opacity: 0.5, marginTop: 4, fontStyle: "italic" }}>Not in the map-object catalog.</div>
      </div>
    );
  }
  const meta = [
    info.groupLabel,
    `value ${info.value.toLocaleString()}`,
    info.guardUnits ? "Guarded" : null,
    info.visitType && info.visitType !== "None" ? info.visitType : null,
  ].filter(Boolean).join(" · ");
  return (
    <div style={{ display: "flex", gap: 10, padding: "8px 10px" }}>
      <ObjectIcon sid={sid} size={48} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: "#eee", fontSize: 12 }}>{info.name}</div>
        <div style={{ fontSize: 11, color: "#8fae6f", marginTop: 1 }}>{meta}</div>
        <div style={{ fontSize: 10, opacity: 0.4 }}>{sid}</div>
        <div style={{ fontSize: 11, color: "#bbb", marginTop: 4, lineHeight: 1.4 }}>{info.description}</div>
      </div>
    </div>
  );
}

// Small icon shown inside a filled field (left of the name).
function valueAdornment(sid: string): ReactNode {
  if (!mapObjectIcon(sid)) return null;
  return <ObjectIcon sid={sid} size={18} />;
}

export const objectComboProps = { renderOption, renderDetail, valueAdornment };
