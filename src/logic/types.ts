// ─── Expression AST ──────────────────────────────────────────────────────────

export type ExprNode =
  | { kind: 'true' }
  | { kind: 'false' }
  | { kind: 'and';     left: ExprNode; right: ExprNode }
  | { kind: 'or';      left: ExprNode; right: ExprNode }
  | { kind: 'not';     expr: ExprNode }
  | { kind: 'has';     item: string; count: number; countVar?: string }
  | { kind: 'event';   name: string }
  | { kind: 'setting'; key: string; value: string | boolean | number }
  | { kind: 'age';     age: 'child' | 'adult' }
  | { kind: 'trick';   name: string }
  | { kind: 'cond';    cond: ExprNode; then: ExprNode; else: ExprNode }
  | { kind: 'oot_time'; time: string }
  | { kind: 'mm_time';  type: string; start: string; end: string }
  | { kind: 'renewable'; item: string }
  | { kind: 'license';   item: string }
  | { kind: 'price';     range: string; id: number; threshold: number }
  | { kind: 'flag_on';   flag: string }
  | { kind: 'flag_off';  flag: string }
  | { kind: 'special';   name: string }
  | { kind: 'macro';     name: string; args: ExprNode[] };

// ─── World Graph ─────────────────────────────────────────────────────────────

export interface WorldLocation {
  name: string;
  rule: ExprNode;
  events?: string[];
}

export interface WorldExit {
  /** Target region name in vanilla logic */
  target: string;
  rule: ExprNode;
  /** OoTMM entrance ID (e.g. OOT_DODONGO_CAVERN) — set by injectEntranceIds at load time */
  entranceId?: string;
  /** ER setting key that gates this entrance (e.g. erDungeons, erBoss) */
  erType?: string;
}

export interface WorldEvent {
  name: string;
  rule: ExprNode;
}

export interface WorldRegion {
  name: string;
  game: 'oot' | 'mm';
  dungeon?: string;
  exits: WorldExit[];
  locations: WorldLocation[];
  events: WorldEvent[];
}

export type WorldGraph = Map<string, WorldRegion>;

// ─── Logic State ─────────────────────────────────────────────────────────────

export interface LogicState {
  /** OoTMM item ID → count */
  items: Map<string, number>;
  /** Game context for the region being evaluated — used for game-prefixed item lookups */
  currentGame?: 'oot' | 'mm';
  age: 'child' | 'adult';
  /** Achieved events (accumulated during BFS) */
  events: Set<string>;
  /** Randomizer settings key → value */
  settings: Map<string, string | boolean | number>;
  /** entranceId → destination region name (from ER tracker) */
  erOverrides: Map<string, string>;
  /** Enabled tricks */
  tricks: Set<string>;
  /** Active world flags */
  flags: Set<string>;
  /** When true, unmapped shuffled entrances block BFS instead of falling back to vanilla */
  erMode: boolean;
  /** Pre-resolved special condition results (BRIDGE, MOON, LACS, GANON_BK, MAJORA) */
  resolvedSpecial: Map<string, boolean>;
  /** Song event assignments: tracker key (oot_0, mm_2…) → song item ID (oot_song_zelda…) */
  songEvents: Map<string, string>;
  /** Manually entered prices for shop checks (check name → rupee cost) */
  shopPrices: Map<string, number>;
}

// ─── BFS Result ──────────────────────────────────────────────────────────────

export interface ReachabilityResult {
  /** Set of reachable region names (union of both ages) */
  regions: Set<string>;
  /** Checks reachable as child */
  childChecks: Set<string>;
  /** Checks reachable as adult */
  adultChecks: Set<string>;
  /** Set of achieved event names */
  events: Set<string>;
}

// ─── Raw compiled world format (output of build script) ──────────────────────

export interface RawWorldLocation {
  name: string;
  rule: string;
}

export interface RawWorldExit {
  target: string;
  rule: string;
  entranceId?: string;
}

export interface RawWorldEvent {
  name: string;
  rule: string;
}

export interface RawWorldRegion {
  name: string;
  game: 'oot' | 'mm';
  dungeon?: string;
  exits: RawWorldExit[];
  locations: RawWorldLocation[];
  events: RawWorldEvent[];
}

export type RawWorld = RawWorldRegion[];
