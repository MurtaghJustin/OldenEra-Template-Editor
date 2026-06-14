// Closed enums (hard-validated). Values mined from all official templates.
export const GAME_MODES = ["Classic", "SingleHero"] as const;
export const CONNECTION_TYPES = ["Direct", "Default", "Portal", "Proximity", "GladiatorArena"] as const;
export const MAIN_OBJECT_TYPES = ["Spawn", "City", "AbandonedOutpost", "GladiatorArena"] as const;
export const PLACEMENTS = ["Uniform", "Center", "Connection", "NearZone"] as const;
export const ORIENTATION_MODES = ["MinimalBoundingSquare", "BoundingCircle"] as const;
export const SELECTOR_TYPES = ["FromList", "Match", "MatchMainObject", "MatchZone"] as const;
export const PLAYER_SLOTS = ["Player1","Player2","Player3","Player4","Player5","Player6","Player7","Player8"] as const;

export type GameMode = (typeof GAME_MODES)[number];
export type ConnectionType = (typeof CONNECTION_TYPES)[number];
export type MainObjectType = (typeof MAIN_OBJECT_TYPES)[number];
export type Placement = (typeof PLACEMENTS)[number];
export type SelectorType = (typeof SELECTOR_TYPES)[number];

export interface Selector { type: SelectorType; args: string[]; }

export interface MainObject {
  type: MainObjectType;
  spawn?: string;                 // Player1..8 (Spawn only)
  guardChance?: number;
  guardValue?: number;
  guardWeeklyIncrement?: number;
  removeGuardIfHasOwner?: boolean;
  buildingsConstructionSid?: string;
  faction?: Selector;
  placement?: Placement;
  placementArgs?: unknown[];
  holdCityWinCon?: boolean;
  [k: string]: unknown;           // preserve owner, factions, isKeyObject, ...
}

export interface Zone {
  name: string;
  size: number;
  layout: string;
  crossroadsPosition?: number;
  diplomacyModifier?: number;
  guardCutoffValue?: number;
  guardRandomization?: number;
  guardMultiplier?: number;
  guardWeeklyIncrement?: number;
  guardReactionDistribution?: number[];
  guardedContentPool?: string[];
  unguardedContentPool?: string[];
  resourcesContentPool?: string[];
  guardedContentValue?: number;
  guardedContentValuePerArea?: number;
  unguardedContentValue?: number;
  unguardedContentValuePerArea?: number;
  resourcesValue?: number;
  resourcesValuePerArea?: number;
  mandatoryContent?: string[];
  contentCountLimits?: string[];
  zoneBiome?: Selector;
  contentBiome?: Selector;
  metaObjectsBiome?: Selector;
  mainObjects?: MainObject[];
  roads?: unknown[];
  [k: string]: unknown;           // preserve encounterHolesSettings, randomHire*, ...
}

export interface Connection {
  name?: string;
  from: string;
  to: string;
  connectionType: ConnectionType;
  road?: boolean;
  guardValue?: number;
  guardWeeklyIncrement?: number;
  guardZone?: string;
  guardMatchGroup?: string;
  [k: string]: unknown;           // preserve guardEscape, simTurnSquad, length, portal rules, ...
}

export interface Variant {
  orientation?: Record<string, unknown>;
  border?: Record<string, unknown>;
  zones: Zone[];
  connections: Connection[];
  [k: string]: unknown;
}

export interface GameRules {
  heroCountMin?: number;
  heroCountMax?: number;
  heroCountIncrement?: number;
  heroHireBan?: boolean;
  encounterHoles?: boolean;
  winConditions?: Record<string, unknown>;
  bonuses?: unknown[];
  [k: string]: unknown;
}

export interface GlobalBans { magics: string[]; items: string[]; }

export interface TemplateRoot {
  name: string;
  gameMode: GameMode;
  description?: string;
  displayWinCondition?: string;
  sizeX: number;
  sizeZ: number;
  gameRules: GameRules;
  globalBans?: GlobalBans;
  variants: Variant[];
  [k: string]: unknown;
}
