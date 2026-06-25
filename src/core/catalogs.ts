import data from "../generated/catalogs.json";
import {
  CONNECTION_TYPES, GAME_MODES, MAIN_OBJECT_TYPES, PLACEMENTS,
  ORIENTATION_MODES, SELECTOR_TYPES, PLAYER_SLOTS,
} from "./types";

const raw = data as Record<string, unknown>;
export const catalogs = raw as unknown as Record<string, string[]>;
// Documented object display names (SID → name), built from Documentation/05 at catalog-build time.
export const sidNames = (raw.sidNames as Record<string, string> | undefined) ?? {};

const ENUMS: Record<string, readonly string[]> = {
  gameMode: GAME_MODES,
  connectionType: CONNECTION_TYPES,
  mainObjectType: MAIN_OBJECT_TYPES,
  placement: PLACEMENTS,
  orientationMode: ORIENTATION_MODES,
  selectorType: SELECTOR_TYPES,
  spawn: PLAYER_SLOTS,
};

export function isKnownEnum(enumName: keyof typeof ENUMS | string, value: string): boolean {
  const e = ENUMS[enumName];
  return !!e && e.includes(value);
}

export function sidDisplayName(sid: string): string {
  return sid
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Human-readable name for an object SID: the documented name when known (e.g. tree_of_abundance →
// "Arborcopia"), otherwise a title-cased fallback derived from the SID.
export function objectName(sid: string): string {
  if (!sid) return "";
  return sidNames[sid] || sidDisplayName(sid);
}

// Display names for the headline win-condition IDs (Documentation/02 & 05).
const WIN_CONDITION_NAMES: Record<string, string> = {
  win_condition_1: "Standard",
  win_condition_2: "Capital Capture",
  win_condition_3: "Lost Starting City",
  win_condition_4: "Gladiator Arena",
  win_condition_5: "Hold City",
  win_condition_6: "Tournament",
};
export function winConditionName(id: string): string {
  if (!id) return "";
  return WIN_CONDITION_NAMES[id] || id;
}
