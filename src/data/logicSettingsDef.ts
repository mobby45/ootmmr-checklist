// Logic settings that affect check reachability (not pool composition).
// Ordered by frequency of use in the OoTMM world/macro files.

export type SettingType = 'bool' | 'select' | 'multicheck';

export interface LogicSettingOption { value: string; label: string }

export interface LogicSettingDef {
  key: string;
  label: string;
  type: SettingType;
  default: any;
  /** For 'select' type — list of options */
  options?: LogicSettingOption[];
  /** For 'multicheck' — each value is a possible flag in a space-separated string */
  flags?: LogicSettingOption[];
  group: string;
}

export const LOGIC_SETTINGS_DEFS: LogicSettingDef[] = [
  // ─── Open areas ──────────────────────────────────────────────────────────────
  { group: 'Open', key: 'startingAge',    label: 'Starting Age',      type: 'select', default: 'child',
    options: [{ value: 'child', label: 'Child' }, { value: 'adult', label: 'Adult' }] },
  { group: 'Open', key: 'beneathWell',    label: 'Beneath the Well',  type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'open', label: 'Open' }] },
  { group: 'Open', key: 'doorOfTime',     label: 'Door of Time',      type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Closed' }, { value: 'open', label: 'Open' }] },
  { group: 'Open', key: 'dekuTree',       label: 'Deku Tree',         type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'open', label: 'Open' }] },
  { group: 'Open', key: 'kakarikoGate',   label: 'Kakariko Gate',     type: 'select', default: 'closed',
    options: [{ value: 'closed', label: 'Closed' }, { value: 'open', label: 'Open' }] },
  { group: 'Open', key: 'gerudoFortress', label: 'Gerudo Fortress',   type: 'select', default: 'normal',
    options: [{ value: 'normal', label: 'Normal' }, { value: 'single', label: '1 Carpenter' }, { value: 'open', label: 'Open' }] },
  { group: 'Open', key: 'zoraKing',       label: "Zora's Domain",     type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'adult', label: 'Adult' }, { value: 'open', label: 'Open' }] },
  { group: 'Open', key: 'moonCrash',      label: 'Moon Crash',        type: 'select', default: 'cycle',
    options: [{ value: 'reset', label: 'Last Save' }, { value: 'cycle', label: 'New Cycle' }] },
  { group: 'Open', key: 'skipZelda',           label: 'Skip Zelda',          type: 'bool',   default: false },
  { group: 'Open', key: 'moon',                label: 'Moon',                type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'open', label: 'Open' }, { value: 'custom', label: 'Custom' }] },
  { group: 'Open', key: 'alterLostWoodsExits', label: 'Alternate LW Exits',  type: 'bool',   default: false },
  { group: 'Open', key: 'openMaskShop',        label: 'Open Mask Shop',      type: 'bool',   default: false },

  // ─── Open dungeons OoT ───────────────────────────────────────────────────────
  { group: 'Open Dungeons OoT', key: 'openDungeonsOot', label: 'Open Dungeons OoT', type: 'multicheck', default: '',
    flags: [
      { value: 'DC',            label: "Dodongo's Cavern" },
      { value: 'JJ',            label: "Jabu-Jabu" },
      { value: 'Shadow',        label: "Shadow Temple" },
      { value: 'BotW',          label: "Bottom of the Well" },
      { value: 'Water',         label: "Water Temple" },
      { value: 'fireChild',     label: "Fire Temple (Child)" },
      { value: 'wellAdult',     label: "Well (Adult)" },
      { value: 'dekuTreeAdult', label: "Deku Tree (Adult)" },
    ]},

  // ─── Open dungeons MM ────────────────────────────────────────────────────────
  { group: 'Open Dungeons MM', key: 'openDungeonsMm', label: 'Open Dungeons MM', type: 'multicheck', default: '',
    flags: [
      { value: 'WF', label: 'Woodfall Temple' },
      { value: 'SH', label: 'Snowhead Temple' },
      { value: 'GB', label: 'Great Bay Temple' },
      { value: 'ST', label: 'Stone Tower Temple' },
    ]},
  { group: 'Open Dungeons MM', key: 'clearStateDungeonsMm', label: 'Clear State Dungeons', type: 'multicheck', default: '',
    flags: [
      { value: 'WF', label: 'Woodfall (swamp cleared)' },
      { value: 'GB', label: 'Great Bay (ocean cleared)' },
    ]},

  // ─── MM Access ───────────────────────────────────────────────────────────────
  { group: 'MM Access', key: 'regionState',  label: 'Region State',    type: 'select', default: 'dungeonBeaten',
    options: [{ value: 'free', label: 'Free' }, { value: 'dungeonBeaten', label: 'Dungeon Beaten' }, { value: 'reward', label: 'Reward' }] },
  { group: 'MM Access', key: 'openMoon',     label: 'Open Moon',       type: 'bool',   default: false },
  { group: 'MM Access', key: 'majoraChild',  label: 'Majora Child',    type: 'select', default: 'none',
    options: [{ value: 'none', label: 'Off' }, { value: 'custom', label: 'Custom' }] },
  { group: 'MM Access', key: 'bossWarpPads', label: 'Boss Warp Pads',  type: 'select', default: 'remains',
    options: [{ value: 'remains', label: 'Requires Remains' }, { value: 'free', label: 'Free' }] },

  // ─── Ageless items ───────────────────────────────────────────────────────────
  { group: 'Ageless', key: 'agelessSwords',      label: 'Swords',            type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessHookshot',    label: 'Hookshot',          type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessBoots',       label: 'Boots',             type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessBow',         label: 'Bow',               type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessBoomerang',   label: 'Boomerang',         type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessStrength',    label: 'Strength',          type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessShields',     label: 'Shields',           type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessHammer',      label: 'Hammer',            type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessTunics',      label: 'Tunics',            type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessSlingshot',   label: 'Slingshot',         type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessSticks',      label: 'Sticks',            type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessSoaring',     label: 'Soaring',           type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessGFS',         label: 'Great Fairy Sword', type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessChildTrade',  label: 'Child Trade',       type: 'bool', default: false },

  // ─── Souls OoT — default false; also auto-bridged from item tracker soul visibility ──
  { group: 'Souls OoT', key: 'soulsBossOot',   label: 'Boss Souls',   type: 'bool', default: false },
  { group: 'Souls OoT', key: 'soulsEnemyOot',  label: 'Enemy Souls',  type: 'bool', default: false },
  { group: 'Souls OoT', key: 'soulsNpcOot',    label: 'NPC Souls',    type: 'bool', default: false },
  { group: 'Souls OoT', key: 'soulsAnimalOot', label: 'Animal Souls', type: 'bool', default: false },
  { group: 'Souls OoT', key: 'soulsMiscOot',   label: 'Misc Souls',   type: 'bool', default: false },

  // ─── Souls MM — default false ─────────────────────────────────────────────────────
  { group: 'Souls MM', key: 'soulsBossMm',   label: 'Boss Souls',   type: 'bool', default: false },
  { group: 'Souls MM', key: 'soulsEnemyMm',  label: 'Enemy Souls',  type: 'bool', default: false },
  { group: 'Souls MM', key: 'soulsNpcMm',    label: 'NPC Souls',    type: 'bool', default: false },
  { group: 'Souls MM', key: 'soulsAnimalMm', label: 'Animal Souls', type: 'bool', default: false },
  { group: 'Souls MM', key: 'soulsMiscMm',   label: 'Misc Souls',   type: 'bool', default: false },

  // ─── Shared souls — cross-game soul sharing ───────────────────────────────────────
  { group: 'Shared Souls', key: 'sharedSoulsEnemy',  label: 'Enemy Souls', type: 'bool', default: false },
  { group: 'Shared Souls', key: 'sharedSoulsNpc',    label: 'NPC Souls',   type: 'bool', default: false },
  { group: 'Shared Souls', key: 'sharedSoulsAnimal', label: 'Animal Souls',type: 'bool', default: false },
  { group: 'Shared Souls', key: 'sharedSoulsMisc',   label: 'Misc Souls',  type: 'bool', default: false },

  // ─── Special logic ───────────────────────────────────────────────────────────
  { group: 'Special', key: 'rustyKeysOot',         label: 'Rusty Keys (OoT)',               type: 'bool',   default: false },
  { group: 'Special', key: 'rustyKeysMm',          label: 'Rusty Keys (MM)',                type: 'bool',   default: false },
  { group: 'Special', key: 'lacs',                 label: 'Light Arrow Cutscene',           type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla (Spirit+Shadow)' }, { value: 'custom', label: 'Custom' }] },
  { group: 'Special', key: 'bombchuBehaviorOot',   label: 'Bombchu Behavior (OoT)',         type: 'select', default: 'bagFirst',
    options: [{ value: 'bagFirst', label: 'Bag First' }, { value: 'bagSeparate', label: 'Bag Separate' }, { value: 'bombBag', label: 'Bomb Bag' }, { value: 'free', label: 'Free' }] },
  { group: 'Special', key: 'bronzeScale',          label: 'Bronze Scale (always swim)', type: 'bool',   default: false },
  { group: 'Special', key: 'blueFireArrows',       label: 'Blue Fire Arrows',           type: 'bool',   default: false },
  { group: 'Special', key: 'sunlightArrows',       label: 'Sunlight Arrows',            type: 'bool',   default: false },
  { group: 'Special', key: 'freeScarecrowOot',     label: 'Free Scarecrow (OoT)',       type: 'bool',   default: false },
  { group: 'Special', key: 'freeScarecrowMm',      label: 'Free Scarecrow (MM)',        type: 'bool',   default: false },
  { group: 'Special', key: 'swordlessAdult',       label: 'Swordless Adult',            type: 'bool',   default: false },
  { group: 'Special', key: 'timeTravelSword',      label: 'Time Travel Sword',          type: 'bool',   default: false },
  { group: 'Special', key: 'iceArrowPlatformsOot', label: 'Ice Arrow Platforms (OoT)',  type: 'bool',   default: false },
  { group: 'Special', key: 'ageChange',            label: 'Age Change',                 type: 'select', default: 'oot',
    options: [{ value: 'oot', label: 'OoT only' }, { value: 'none', label: 'No age change' }] },
  { group: 'Special', key: 'hookshotAnywhereOot',  label: 'Hookshot Anywhere (OoT)',    type: 'select', default: 'off',
    options: [{ value: 'off', label: 'Off' }, { value: 'logical', label: 'Logical' }] },
  { group: 'Special', key: 'hookshotAnywhereMm',   label: 'Hookshot Anywhere (MM)',     type: 'select', default: 'off',
    options: [{ value: 'off', label: 'Off' }, { value: 'logical', label: 'Logical' }] },
  { group: 'Special', key: 'climbMostSurfacesOot', label: 'Climb Most Surfaces (OoT)', type: 'select', default: 'off',
    options: [{ value: 'off', label: 'Off' }, { value: 'logical', label: 'Logical' }] },
  { group: 'Special', key: 'rainbowBridge',        label: 'Rainbow Bridge',             type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'open', label: 'Open' }, { value: 'medallions', label: 'Medallions' }, { value: 'custom', label: 'Custom' }] },
  { group: 'Special', key: 'ganonTrials',          label: 'Ganon Trials',               type: 'multicheck', default: 'Fire Forest Light Shadow Spirit Water',
    flags: [
      { value: 'Fire',   label: 'Fire' },
      { value: 'Forest', label: 'Forest' },
      { value: 'Light',  label: 'Light' },
      { value: 'Shadow', label: 'Shadow' },
      { value: 'Spirit', label: 'Spirit' },
      { value: 'Water',  label: 'Water' },
    ]},
];

export const SETTING_GROUPS = [...new Set(LOGIC_SETTINGS_DEFS.map(s => s.group))];

export function defaultLogicSettings(): Record<string, any> {
  const out: Record<string, any> = {};
  for (const def of LOGIC_SETTINGS_DEFS) out[def.key] = def.default;
  return out;
}
