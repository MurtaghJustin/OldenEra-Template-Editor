import data from "../generated/catalogs.json";
import {
  CONNECTION_TYPES, GAME_MODES, MAIN_OBJECT_TYPES, PLACEMENTS,
  ORIENTATION_MODES, SELECTOR_TYPES, PLAYER_SLOTS,
} from "./types";

export const catalogs = data as Record<string, string[]>;

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
