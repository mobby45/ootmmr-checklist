// Logic settings that affect check reachability.
// Groups mirror the OoTMM generator structure:
//   Main       → goal, win conditions (Settings tab)
//   Shuffle    → keys, stray fairies (Settings tab)
//   Price      → prices (Settings tab)
//   Events     → world access, dungeon states (Settings tab)
//   Cross-Game → cross-age, ER dungeons (Settings tab)
//   Misc       → QoL, hookshot/climb mechanics (Settings tab)
//   Progressive→ progressive item types (Items tab)
//   Extensions → optional/shuffled items (Items tab)
//   Ageless    → age restrictions removed (Items tab)
//   Shared Items → rendered in Items > Shared tab

export type SettingType = 'bool' | 'select' | 'multicheck' | 'number';

export interface LogicSettingOption { value: string; label: string }

export interface LogicSettingDef {
  key: string;
  label: string;
  type: SettingType;
  default: any;
  desc?: string;
  options?: LogicSettingOption[];
  flags?: LogicSettingOption[];
  group: string;
  section?: string;
  min?: number;
  max?: number;
  /** Hide this setting unless this returns true */
  showIf?: (get: (key: string) => any) => boolean;
}

export const LOGIC_SETTINGS_DEFS: LogicSettingDef[] = [

  // ─── Main ────────────────────────────────────────────────────────────────────
  { group: 'Main', section: 'Goal', key: 'goal', label: 'Goal', type: 'select', default: 'ganon',
    options: [
      { value: 'any',       label: 'Any Final Boss' },
      { value: 'ganon',     label: 'Ganon' },
      { value: 'majora',    label: 'Majora' },
      { value: 'both',      label: 'Ganon & Majora' },
      { value: 'triforce',  label: 'Triforce Hunt' },
      { value: 'triforce3', label: 'Triforce Quest (3 pieces)' },
    ] },
  { group: 'Main', section: 'Goal', key: 'triforceGoal',   label: 'Triforce Goal',   type: 'number', default: 20, min: 1,
    desc: 'Triforce Hunt: pieces needed to win.',
    showIf: get => get('goal') === 'triforce' },
  { group: 'Main', section: 'Goal', key: 'triforcePieces', label: 'Triforce Pieces', type: 'number', default: 30, min: 1,
    desc: 'Triforce Hunt: total pieces in the pool.',
    showIf: get => get('goal') === 'triforce' },
  { group: 'Main', section: 'Goal', key: 'rainbowBridge', label: 'Rainbow Bridge', type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'open', label: 'Open' }, { value: 'medallions', label: 'Medallions' }, { value: 'custom', label: 'Custom' }] },
  { group: 'Main', section: 'Goal', key: 'lacs', label: 'Light Arrow Cutscene', type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla (Spirit+Shadow)' }, { value: 'custom', label: 'Custom' }] },

  // ─── Shuffle ─────────────────────────────────────────────────────────────────
  { group: 'Shuffle', section: 'Keys', key: 'smallKeyShuffleOot', label: 'Small Keys (OoT)', type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'removed', label: 'Removed' }, { value: 'dungeon', label: 'Dungeon' }, { value: 'overworld', label: 'Overworld' }, { value: 'anywhere', label: 'Anywhere' }] },
  { group: 'Shuffle', section: 'Keys', key: 'smallKeyShuffleMm', label: 'Small Keys (MM)', type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'removed', label: 'Removed' }, { value: 'dungeon', label: 'Dungeon' }, { value: 'overworld', label: 'Overworld' }, { value: 'anywhere', label: 'Anywhere' }] },
  { group: 'Shuffle', section: 'Keys', key: 'bossKeyShuffleOot', label: 'Boss Keys (OoT)', type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'removed', label: 'Removed' }, { value: 'dungeon', label: 'Dungeon' }, { value: 'overworld', label: 'Overworld' }, { value: 'anywhere', label: 'Anywhere' }] },
  { group: 'Shuffle', section: 'Keys', key: 'bossKeyShuffleMm', label: 'Boss Keys (MM)', type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'removed', label: 'Removed' }, { value: 'dungeon', label: 'Dungeon' }, { value: 'overworld', label: 'Overworld' }, { value: 'anywhere', label: 'Anywhere' }] },
  { group: 'Shuffle', section: 'Keys', key: 'ganonBossKey', label: "Ganon's Boss Key", type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'removed', label: 'Removed' }, { value: 'lacs', label: 'LACS' }, { value: 'dungeon', label: 'Dungeon' }, { value: 'overworld', label: 'Overworld' }, { value: 'anywhere', label: 'Anywhere' }] },
  { group: 'Shuffle', section: 'Keys', key: 'smallKeyShuffleChestGame', label: 'Chest Game Small Key', type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'removed', label: 'Removed' }] },
  { group: 'Shuffle', section: 'Keys', key: 'smallKeyRingOot', label: 'Key Rings (OoT)', type: 'multicheck', default: '',
    flags: [
      { value: 'Forest',  label: 'Forest Temple' }, { value: 'Fire',    label: 'Fire Temple' },
      { value: 'Water',   label: 'Water Temple' },  { value: 'Shadow',  label: 'Shadow Temple' },
      { value: 'Spirit',  label: 'Spirit Temple' }, { value: 'BotW',    label: 'Bottom of the Well' },
      { value: 'GTG',     label: 'Gerudo Training Grounds' }, { value: 'Ganon', label: "Ganon's Castle" },
    ]},
  { group: 'Shuffle', section: 'Keys', key: 'smallKeyRingMm', label: 'Key Rings (MM)', type: 'multicheck', default: '',
    flags: [
      { value: 'WF', label: 'Woodfall Temple' }, { value: 'SH', label: 'Snowhead Temple' },
      { value: 'GB', label: 'Great Bay Temple' }, { value: 'ST', label: 'Stone Tower Temple' },
    ]},
  { group: 'Shuffle', section: 'Keys', key: 'silverRupeePouches', label: 'Silver Rupee Pouches', type: 'multicheck', default: '',
    flags: [
      { value: 'DC',              label: "Dodongo's Cavern" },        { value: 'IC_Block',        label: 'Ice Cavern (Block)' },
      { value: 'IC_Scythe',       label: 'Ice Cavern (Scythe)' },     { value: 'GTG_Slopes',      label: 'Gerudo Training (Slopes)' },
      { value: 'GTG_Lava',        label: 'Gerudo Training (Lava)' },  { value: 'GTG_Water',       label: 'Gerudo Training (Water)' },
      { value: 'Shadow_Blades',   label: 'Shadow Temple (Blades)' },  { value: 'Shadow_Pit',      label: 'Shadow Temple (Pit)' },
      { value: 'Shadow_Scythe',   label: 'Shadow Temple (Scythe)' },  { value: 'Shadow_Spikes',   label: 'Shadow Temple (Spikes)' },
      { value: 'Spirit_Adult',    label: 'Spirit Temple (Adult)' },   { value: 'Spirit_Boulders', label: 'Spirit Temple (Boulders)' },
      { value: 'Spirit_Child',    label: 'Spirit Temple (Child)' },   { value: 'Spirit_Lobby',    label: 'Spirit Temple (Lobby)' },
      { value: 'Spirit_Sun',      label: 'Spirit Temple (Sun)' },     { value: 'Ganon_Fire',      label: "Ganon's Castle (Fire)" },
      { value: 'Ganon_Forest',    label: "Ganon's Castle (Forest)" }, { value: 'Ganon_Light',     label: "Ganon's Castle (Light)" },
      { value: 'Ganon_Shadow',    label: "Ganon's Castle (Shadow)" }, { value: 'Ganon_Spirit',    label: "Ganon's Castle (Spirit)" },
      { value: 'Ganon_Water',     label: "Ganon's Castle (Water)" },
    ]},
  { group: 'Shuffle', section: 'Keys', key: 'shuffleMasterSword', label: 'Shuffle Master Sword', type: 'bool', default: false,
    desc: 'The Master Sword is shuffled into the item pool instead of being at the Pedestal of Time.' },

  { group: 'Shuffle', section: 'Stray Fairies', key: 'STRAY_FAIRY_COUNT', label: 'Fairies per dungeon', type: 'select', default: '15',
    desc: 'Number of stray fairies required per dungeon to claim the Great Fairy reward.',
    options: [{ value: '5', label: '5' }, { value: '10', label: '10' }, { value: '15', label: '15 (default)' }] },
  { group: 'Shuffle', section: 'Stray Fairies', key: 'strayFairyChestShuffle', label: 'Dungeon Chest Fairies', type: 'select', default: 'own_dungeon',
    desc: 'Where MM stray fairies found in chests are shuffled.',
    options: [
      { value: 'own_dungeon',    label: 'Own Dungeon' }, { value: 'anywhere',       label: 'Anywhere' },
      { value: 'starting',       label: 'Starting Items' }, { value: 'starting_items', label: 'Starting (pool)' },
      { value: 'vanilla',        label: 'Vanilla' },
    ] },
  { group: 'Shuffle', section: 'Stray Fairies', key: 'strayFairyOtherShuffle', label: 'Dungeon Freestanding Fairies', type: 'select', default: 'vanilla',
    desc: 'Where MM freestanding stray fairies are shuffled.',
    options: [
      { value: 'vanilla',    label: 'Vanilla' }, { value: 'own_dungeon', label: 'Own Dungeon' },
      { value: 'anywhere',   label: 'Anywhere' }, { value: 'starting',   label: 'Starting Items' },
    ] },
  { group: 'Shuffle', section: 'Stray Fairies', key: 'pondFishShuffle', label: 'Pond Fish Shuffle', type: 'bool', default: false,
    desc: 'Fish items are shuffled into the item pool — collecting them unlocks Fishing Pond rewards.' },

  // ─── Price ───────────────────────────────────────────────────────────────────
  { group: 'Price', section: 'OoT Prices', key: 'priceOotShops',     label: 'Shop Prices (OoT)',     type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'affordable', label: 'Affordable (10r)' }, { value: 'weighted', label: 'Weighted Random' }, { value: 'random', label: 'Random' }] },
  { group: 'Price', section: 'OoT Prices', key: 'priceOotScrubs',    label: 'Scrub Prices (OoT)',    type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'affordable', label: 'Affordable (10r)' }, { value: 'weighted', label: 'Weighted Random' }, { value: 'random', label: 'Random' }] },
  { group: 'Price', section: 'OoT Prices', key: 'priceOotMerchants', label: 'Merchant Prices (OoT)', type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'affordable', label: 'Affordable (10r)' }, { value: 'weighted', label: 'Weighted Random' }, { value: 'random', label: 'Random' }] },
  { group: 'Price', section: 'MM Prices', key: 'priceMmShops',       label: 'Shop Prices (MM)',      type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'affordable', label: 'Affordable (10r)' }, { value: 'weighted', label: 'Weighted Random' }, { value: 'random', label: 'Random' }] },
  { group: 'Price', section: 'MM Prices', key: 'priceMmTingle',      label: 'Tingle Prices (MM)',    type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'affordable', label: 'Affordable (10r)' }, { value: 'weighted', label: 'Weighted Random' }, { value: 'random', label: 'Random' }] },

  // ─── Events ──────────────────────────────────────────────────────────────────
  { group: 'Events', section: 'World Access', key: 'startingAge', label: 'Starting Age', type: 'select', default: 'child',
    options: [{ value: 'child', label: 'Child' }, { value: 'adult', label: 'Adult' }, { value: 'random', label: 'Random' }] },
  { group: 'Events', section: 'World Access', key: 'doorOfTime', label: 'Door of Time', type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Closed' }, { value: 'open', label: 'Open' }] },
  { group: 'Events', section: 'World Access', key: 'dekuTree', label: 'Deku Tree', type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'open', label: 'Open' }] },
  { group: 'Events', section: 'World Access', key: 'kakarikoGate', label: 'Kakariko Gate', type: 'select', default: 'closed',
    options: [{ value: 'closed', label: 'Closed' }, { value: 'open', label: 'Open' }] },
  { group: 'Events', section: 'World Access', key: 'gerudoFortress', label: 'Gerudo Fortress', type: 'select', default: 'normal',
    options: [{ value: 'normal', label: 'Normal' }, { value: 'single', label: '1 Carpenter' }, { value: 'open', label: 'Open' }] },
  { group: 'Events', section: 'World Access', key: 'zoraKing', label: "Zora's Domain", type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'adult', label: 'Adult' }, { value: 'open', label: 'Open' }] },
  { group: 'Events', section: 'World Access', key: 'openZdShortcut', label: "ZD Shortcut", type: 'bool', default: false,
    desc: "The underwater shortcut in Zora's Domain is open from the start." },
  { group: 'Events', section: 'World Access', key: 'beneathWell', label: 'Beneath the Well', type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'open', label: 'Open' }, { value: 'remorseless', label: 'Remorseless' }] },
  { group: 'Events', section: 'World Access', key: 'moon', label: 'Moon', type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'open', label: 'Open' }, { value: 'custom', label: 'Custom' }] },
  { group: 'Events', section: 'World Access', key: 'moonCrash', label: 'Moon Crash', type: 'select', default: 'cycle',
    options: [{ value: 'reset', label: 'Last Save' }, { value: 'cycle', label: 'New Cycle' }] },
  { group: 'Events', section: 'World Access', key: 'skipZelda', label: 'Skip Zelda', type: 'bool', default: false },
  { group: 'Events', section: 'World Access', key: 'openMaskShop', label: 'Open Mask Shop', type: 'bool', default: false },
  { group: 'Events', section: 'World Access', key: 'alterLostWoodsExits', label: 'Alternate LW Exits', type: 'bool', default: false },

  { group: 'Events', section: 'Age & Combat', key: 'ageChange', label: 'Age Change', type: 'select', default: 'oot',
    options: [{ value: 'oot', label: 'OoT only' }, { value: 'none', label: 'No age change' }] },
  { group: 'Events', section: 'Age & Combat', key: 'swordlessAdult', label: 'Swordless Adult', type: 'bool', default: false,
    desc: 'Adult Link can use all items without having a sword equipped.' },
  { group: 'Events', section: 'Age & Combat', key: 'timeTravelSword', label: 'Time Travel Sword', type: 'bool', default: false,
    desc: 'Pulling the Master Sword from the pedestal counts as a time travel event in logic.' },

  { group: 'Events', section: 'Pregame', key: 'freeScarecrowOot', label: 'Free Scarecrow (OoT)', type: 'bool', default: false },
  { group: 'Events', section: 'Pregame', key: 'freeScarecrowMm',  label: 'Free Scarecrow (MM)',  type: 'bool', default: false },
  { group: 'Events', section: 'Pregame', key: 'ootPreplantedBeans', label: 'Pre-planted Beans (OoT)', type: 'bool', default: false,
    desc: 'Magic Bean spots in OoT are already planted at the start.' },

  { group: 'Events', section: 'OoT Dungeons', key: 'openDungeonsOot', label: 'Open Dungeons (OoT)', type: 'multicheck', default: '',
    flags: [
      { value: 'DC', label: "Dodongo's Cavern" }, { value: 'JJ', label: "Jabu-Jabu" },
      { value: 'Shadow', label: "Shadow Temple" }, { value: 'BotW', label: "Bottom of the Well" },
      { value: 'Water', label: "Water Temple" }, { value: 'fireChild', label: "Fire Temple (Child)" },
      { value: 'wellAdult', label: "Well (Adult)" }, { value: 'dekuTreeAdult', label: "Deku Tree (Adult)" },
    ]},
  { group: 'Events', section: 'OoT Dungeons', key: 'ganonTrials', label: "Ganon Trials", type: 'multicheck', default: 'Fire Forest Light Shadow Spirit Water',
    flags: [
      { value: 'Fire', label: 'Fire' }, { value: 'Forest', label: 'Forest' }, { value: 'Light', label: 'Light' },
      { value: 'Shadow', label: 'Shadow' }, { value: 'Spirit', label: 'Spirit' }, { value: 'Water', label: 'Water' },
    ]},

  { group: 'Events', section: 'MM Dungeons', key: 'openDungeonsMm', label: 'Open Dungeons (MM)', type: 'multicheck', default: '',
    flags: [
      { value: 'WF', label: 'Woodfall Temple' }, { value: 'SH', label: 'Snowhead Temple' },
      { value: 'GB', label: 'Great Bay Temple' }, { value: 'ST', label: 'Stone Tower Temple' },
    ]},
  { group: 'Events', section: 'MM Dungeons', key: 'clearStateDungeonsMm', label: 'Clear State Dungeons', type: 'multicheck', default: '',
    flags: [{ value: 'WF', label: 'Woodfall (swamp cleared)' }, { value: 'GB', label: 'Great Bay (ocean cleared)' }]},

  { group: 'Events', section: 'MM Access', key: 'openMoon',    label: 'Open Moon',    type: 'bool', default: false },
  { group: 'Events', section: 'MM Access', key: 'regionState', label: 'Region State', type: 'select', default: 'dungeonBeaten',
    options: [{ value: 'free', label: 'Free' }, { value: 'dungeonBeaten', label: 'Dungeon Beaten' }, { value: 'reward', label: 'Reward' }] },
  { group: 'Events', section: 'MM Access', key: 'majoraChild', label: 'Majora Child', type: 'select', default: 'none',
    options: [{ value: 'none', label: 'Off' }, { value: 'custom', label: 'Custom' }] },
  { group: 'Events', section: 'MM Access', key: 'bossWarpPads', label: 'Boss Warp Pads', type: 'select', default: 'remains',
    options: [{ value: 'remains', label: 'Requires Remains' }, { value: 'free', label: 'Free' }] },

  // ─── Cross-Game ───────────────────────────────────────────────────────────────
  { group: 'Cross-Game', key: 'crossAge',  label: 'Cross-Age',    type: 'bool',   default: false,
    desc: 'Link can change age in both OoT and MM.' },
  { group: 'Cross-Game', key: 'erDungeons', label: 'ER Dungeons', type: 'select', default: 'none',
    options: [{ value: 'none', label: 'None' }, { value: 'full', label: 'Full' }] },

  // ─── Misc ─────────────────────────────────────────────────────────────────────
  { group: 'Misc', section: 'Quality of Life', key: 'autoInvert', label: 'Auto-Invert Time', type: 'select', default: 'never',
    options: [{ value: 'never', label: 'Never' }, { value: 'always', label: 'Always' }] },
  { group: 'Misc', section: 'Mechanics', key: 'hookshotAnywhereOot', label: 'Hookshot Anywhere (OoT)', type: 'select', default: 'off',
    options: [{ value: 'off', label: 'Off' }, { value: 'logical', label: 'Logical' }] },
  { group: 'Misc', section: 'Mechanics', key: 'hookshotAnywhereMm', label: 'Hookshot Anywhere (MM)', type: 'select', default: 'off',
    options: [{ value: 'off', label: 'Off' }, { value: 'logical', label: 'Logical' }] },
  { group: 'Misc', section: 'Mechanics', key: 'climbMostSurfacesOot', label: 'Climb Most Surfaces (OoT)', type: 'select', default: 'off',
    options: [{ value: 'off', label: 'Off' }, { value: 'logical', label: 'Logical' }] },

  // ─── Progressive (Items tab) ──────────────────────────────────────────────────
  { group: 'Progressive', key: 'progressiveSwordsOot',       label: 'OoT Swords',         type: 'select', default: 'separate',
    options: [{ value: 'separate', label: 'Separate' }, { value: 'progressive', label: 'Progressive' }, { value: 'progressiveknifebiggoron', label: 'Progressive (Knife+Biggoron)' }, { value: 'goron', label: 'Goron' }] },
  { group: 'Progressive', key: 'progressiveShieldsOot',      label: 'OoT Shields',         type: 'select', default: 'separate',
    options: [{ value: 'separate', label: 'Separate' }, { value: 'progressive', label: 'Progressive' }] },
  { group: 'Progressive', key: 'progressiveShieldsMm',       label: 'MM Shields',          type: 'select', default: 'separate',
    options: [{ value: 'separate', label: 'Separate' }, { value: 'progressive', label: 'Progressive' }] },
  { group: 'Progressive', key: 'progressiveGFS',             label: 'MM Great Fairy Sword',type: 'select', default: 'separate',
    options: [{ value: 'separate', label: 'Separate' }, { value: 'progressive', label: 'Progressive' }] },
  { group: 'Progressive', key: 'progressiveGoronLullabyOot', label: "OoT Goron's Lullaby", type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'intro', label: 'Intro only' }] },
  { group: 'Progressive', key: 'progressiveGoronLullabyMm',  label: "MM Goron's Lullaby",  type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'intro', label: 'Intro only' }] },
  { group: 'Progressive', key: 'progressiveClocks',          label: 'Progressive Clocks (MM)', type: 'select', default: 'separate',
    options: [{ value: 'separate', label: 'Separate' }, { value: 'ascending', label: 'Ascending' }, { value: 'descending', label: 'Descending' }] },

  // ─── Extensions (Items tab) ───────────────────────────────────────────────────
  // OoT extras — opt-in logic+visibility
  { group: 'Extensions', section: 'OoT', key: 'gfsOot',         label: 'Great Fairy Sword',    type: 'bool', default: false },
  { group: 'Extensions', section: 'OoT', key: 'powderKegOot',   label: 'Powder Keg License',   type: 'bool', default: false },
  { group: 'Extensions', section: 'OoT', key: 'spinUpgradeOot', label: 'Spin Attack Upgrade',  type: 'bool', default: false },
  { group: 'Extensions', section: 'OoT', key: 'stoneMaskOot',   label: 'Stone Mask',           type: 'bool', default: false },
  { group: 'Extensions', section: 'OoT', key: 'blastMaskOot',   label: 'Blast Mask',           type: 'bool', default: false },
  { group: 'Extensions', section: 'OoT', key: 'magicalRupee',   label: 'Magical Rupee',        type: 'bool', default: false },
  { group: 'Extensions', section: 'OoT', key: 'rustyKeysOot',   label: 'Rusty Keys',           type: 'bool', default: false },
  // MM extras — all opt-in (OoT items in MM pool, MM-only extras)
  { group: 'Extensions', section: 'MM', key: 'boomerangMm',    label: 'Boomerang',            type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'hammerMm',       label: 'Megaton Hammer',       type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'scalesMm',       label: 'Scales',               type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'strengthMm',     label: 'Strength',             type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'tunicGoronMm',   label: 'Goron Tunic',          type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'tunicZoraMm',    label: 'Zora Tunic',           type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'bootsIronMm',    label: 'Iron Boots',           type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'bootsHoverMm',   label: 'Hover Boots',          type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'spellFireMm',    label: "Din's Fire",           type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'spellWindMm',    label: "Farore's Wind",        type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'spellLoveMm',    label: "Nayru's Love",         type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'dekuShieldMm',   label: 'Deku Shield',          type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'fairyOcarinaMm', label: 'Fairy Ocarina',        type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'stoneAgonyMm',   label: 'Stone of Agony',       type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'shortHookshotMm',label: 'Short Hookshot',        type: 'bool', default: false },
  { group: 'Extensions', section: 'MM', key: 'rustyKeysMm',    label: 'Rusty Keys',           type: 'bool', default: false },
  // Wallets
  { group: 'Extensions', section: 'Wallets', key: 'childWallets',      label: 'Child Wallets',      type: 'bool', default: false },
  { group: 'Extensions', section: 'Wallets', key: 'colossalWallets',   label: 'Colossal Wallets',   type: 'bool', default: false },
  { group: 'Extensions', section: 'Wallets', key: 'bottomlessWallets', label: 'Bottomless Wallets', type: 'bool', default: false },
  // Souls OoT
  { group: 'Extensions', section: 'Souls OoT', key: 'soulsBossOot',   label: 'Boss Souls',   type: 'bool', default: false },
  { group: 'Extensions', section: 'Souls OoT', key: 'soulsEnemyOot',  label: 'Enemy Souls',  type: 'bool', default: false },
  { group: 'Extensions', section: 'Souls OoT', key: 'soulsNpcOot',    label: 'NPC Souls',    type: 'bool', default: false },
  { group: 'Extensions', section: 'Souls OoT', key: 'soulsAnimalOot', label: 'Animal Souls', type: 'bool', default: false },
  { group: 'Extensions', section: 'Souls OoT', key: 'soulsMiscOot',   label: 'Misc Souls',   type: 'bool', default: false },
  // Souls MM
  { group: 'Extensions', section: 'Souls MM', key: 'soulsBossMm',   label: 'Boss Souls',   type: 'bool', default: false },
  { group: 'Extensions', section: 'Souls MM', key: 'soulsEnemyMm',  label: 'Enemy Souls',  type: 'bool', default: false },
  { group: 'Extensions', section: 'Souls MM', key: 'soulsNpcMm',    label: 'NPC Souls',    type: 'bool', default: false },
  { group: 'Extensions', section: 'Souls MM', key: 'soulsAnimalMm', label: 'Animal Souls', type: 'bool', default: false },
  { group: 'Extensions', section: 'Souls MM', key: 'soulsMiscMm',   label: 'Misc Souls',   type: 'bool', default: false },
  // Shared Souls
  { group: 'Extensions', section: 'Shared Souls', key: 'sharedSoulsEnemy',  label: 'Enemy Souls',  type: 'bool', default: false },
  { group: 'Extensions', section: 'Shared Souls', key: 'sharedSoulsNpc',    label: 'NPC Souls',    type: 'bool', default: false },
  { group: 'Extensions', section: 'Shared Souls', key: 'sharedSoulsAnimal', label: 'Animal Souls', type: 'bool', default: false },
  { group: 'Extensions', section: 'Shared Souls', key: 'sharedSoulsMisc',   label: 'Misc Souls',   type: 'bool', default: false },
  // Misc mechanics
  { group: 'Extensions', section: 'Mechanics', key: 'bronzeScale',        label: 'Bronze Scale',          type: 'bool', default: false,
    desc: 'Bronze Scale allows swimming to any depth — treated as Silver Scale in logic.' },
  { group: 'Extensions', section: 'Mechanics', key: 'blueFireArrows',     label: 'Blue Fire Arrows',      type: 'bool', default: false,
    desc: 'Ice Arrows can melt red ice, acting as Blue Fire.' },
  { group: 'Extensions', section: 'Mechanics', key: 'iceArrowPlatformsOot',label: 'Ice Arrow Platforms',  type: 'bool', default: false,
    desc: 'Ice Arrows can create platforms on water surfaces in OoT.' },
  { group: 'Extensions', section: 'Mechanics', key: 'sunlightArrows',     label: 'Sunlight Arrows',       type: 'bool', default: false,
    desc: 'Light Arrows can activate sunlight reflectors.' },
  // Bombchu
  { group: 'Extensions', section: 'Bombchu', key: 'bombchuBehaviorOot', label: 'Bombchu Behavior (OoT)', type: 'select', default: 'bagFirst',
    options: [{ value: 'bagFirst', label: 'Bag First' }, { value: 'bagSeparate', label: 'Bag Separate' }, { value: 'bombBag', label: 'Bomb Bag' }, { value: 'free', label: 'Free' }] },
  { group: 'Extensions', section: 'Bombchu', key: 'bombchuBehaviorMm',  label: 'Bombchu Behavior (MM)',  type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla (MM)' }, { value: 'bagFirst', label: 'Bag (First Pack)' }, { value: 'bagSeparate', label: 'Bag (Separate Items)' }] },
  { group: 'Extensions', section: 'Bombchu', key: 'kegStrength3', label: 'Keg Strength (3rd Upgrade)', type: 'bool', default: false,
    desc: 'Using a Powder Keg requires the 3rd Bomb Bag upgrade instead of the standard bag.' },

  // ─── Ageless (Items tab) ──────────────────────────────────────────────────────
  { group: 'Ageless', key: 'agelessSwords',     label: 'Swords',            type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessHookshot',   label: 'Hookshot',          type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessBoots',      label: 'Boots',             type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessBow',        label: 'Bow',               type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessBoomerang',  label: 'Boomerang',         type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessStrength',   label: 'Strength',          type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessShields',    label: 'Shields',           type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessHammer',     label: 'Hammer',            type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessTunics',     label: 'Tunics',            type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessSlingshot',  label: 'Slingshot',         type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessSticks',     label: 'Sticks',            type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessSoaring',    label: 'Soaring',           type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessGFS',        label: 'Great Fairy Sword', type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessChildTrade', label: 'Child Trade',       type: 'bool', default: false },

  // ─── Shared Items (Items > Shared tab) ───────────────────────────────────────
  { group: 'Shared Items', key: 'sharedSwords',          label: 'Swords',              type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedBows',            label: 'Bows',                type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedBombBags',        label: 'Bomb Bags',           type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedBombchu',         label: 'Bombchus',            type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedMagic',           label: 'Magic',               type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedBottles',         label: 'Bottles',             type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedBoomerang',       label: 'Boomerang',           type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedHammer',          label: 'Megaton Hammer',      type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedStrength',        label: 'Strength',            type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedScales',          label: 'Scales',              type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedBootsIron',       label: 'Iron Boots',          type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedBootsHover',      label: 'Hover Boots',         type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedShields',         label: 'Shields',             type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedNutsSticks',      label: 'Nuts & Sticks',       type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedSlingshot',       label: 'Slingshot',           type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedOcarina',         label: 'Ocarinas',            type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedWallets',         label: 'Wallets',             type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedSpellFire',       label: "Din's Fire",          type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedSpellWind',       label: "Farore's Wind",       type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedSpellLove',       label: "Nayru's Love",        type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedMagicArrowIce',   label: 'Ice Arrows',          type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedMagicArrowLight', label: 'Light Arrows',        type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedSpinUpgrade',     label: 'Spin Attack Upgrade', type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedTunicGoron',      label: 'Goron Tunic',         type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedTunicZora',       label: 'Zora Tunic',          type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedGFS',             label: 'Great Fairy Sword',   type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedMaskBlast',       label: 'Blast Mask',          type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedMaskStone',       label: 'Stone Mask',          type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedStoneAgony',      label: 'Stone of Agony',      type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedPowderKeg',       label: 'Powder Keg License',  type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedSongElegy',       label: 'Elegy of Emptiness',  type: 'bool', default: false },
  { group: 'Shared Items', key: 'sharedOcarinaButtons',  label: 'Ocarina Buttons',     type: 'bool', default: false },
];

export const SETTING_GROUPS = [...new Set(LOGIC_SETTINGS_DEFS.map(s => s.group))];

export function defaultLogicSettings(): Record<string, any> {
  const out: Record<string, any> = {};
  for (const def of LOGIC_SETTINGS_DEFS) out[def.key] = def.default;
  return out;
}
