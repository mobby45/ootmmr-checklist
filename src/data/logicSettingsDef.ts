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
    options: [{ value: 'cycle', label: 'Cycle reset' }, { value: 'spirit', label: 'Spirit' }] },
  { group: 'Open', key: 'skipZelda',      label: 'Skip Zelda',        type: 'bool',   default: false },
  { group: 'Open', key: 'moon',           label: 'Moon',              type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'open', label: 'Open' }] },

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

  // ─── Ageless items ───────────────────────────────────────────────────────────
  { group: 'Ageless', key: 'agelessSwords',    label: 'Swords',    type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessHookshot',  label: 'Hookshot',  type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessBoots',     label: 'Boots',     type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessBow',       label: 'Bow',       type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessBoomerang', label: 'Boomerang', type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessStrength',  label: 'Strength',  type: 'bool', default: false },
  { group: 'Ageless', key: 'agelessShields',   label: 'Shields',   type: 'bool', default: false },

  // ─── Shared items (cross-game) ───────────────────────────────────────────────
  { group: 'Shared', key: 'sharedBows',        label: 'Bows',          type: 'bool', default: false },
  { group: 'Shared', key: 'sharedBombBags',    label: 'Bomb Bags',     type: 'bool', default: false },
  { group: 'Shared', key: 'sharedBombchu',     label: 'Bombchus',      type: 'bool', default: false },
  { group: 'Shared', key: 'sharedBoomerang',   label: 'Boomerang',     type: 'bool', default: false },
  { group: 'Shared', key: 'sharedHookshot',    label: 'Hookshot',      type: 'bool', default: false },
  { group: 'Shared', key: 'sharedMagic',       label: 'Magic',         type: 'bool', default: false },
  { group: 'Shared', key: 'sharedSwords',      label: 'Swords',        type: 'bool', default: false },
  { group: 'Shared', key: 'sharedStrength',    label: 'Strength',      type: 'bool', default: false },
  { group: 'Shared', key: 'sharedBootsIron',   label: 'Iron Boots',    type: 'bool', default: false },
  { group: 'Shared', key: 'sharedBootsHover',  label: 'Hover Boots',   type: 'bool', default: false },
  { group: 'Shared', key: 'sharedTunicGoron',  label: 'Goron Tunic',   type: 'bool', default: false },
  { group: 'Shared', key: 'sharedTunicZora',   label: 'Zora Tunic',    type: 'bool', default: false },
  { group: 'Shared', key: 'sharedSpellFire',   label: 'Din\'s Fire',   type: 'bool', default: false },
  { group: 'Shared', key: 'sharedSpellWind',   label: 'Farore\'s Wind',type: 'bool', default: false },
  { group: 'Shared', key: 'sharedSpellLove',   label: 'Nayru\'s Love', type: 'bool', default: false },
  { group: 'Shared', key: 'sharedMagicArrowIce',   label: 'Ice Arrows',   type: 'bool', default: false },
  { group: 'Shared', key: 'sharedMagicArrowLight',  label: 'Light Arrows', type: 'bool', default: false },
  { group: 'Shared', key: 'sharedNutsSticks',  label: 'Nuts & Sticks', type: 'bool', default: false },
  { group: 'Shared', key: 'sharedBottles',     label: 'Bottles',       type: 'bool', default: false },
  { group: 'Shared', key: 'sharedScales',      label: 'Scales',        type: 'bool', default: false },
  { group: 'Shared', key: 'sharedShields',     label: 'Shields',       type: 'bool', default: false },
  { group: 'Shared', key: 'sharedGFS',         label: 'Great Fairy Sword', type: 'bool', default: false },
  { group: 'Shared', key: 'sharedHammer',      label: 'Hammer',        type: 'bool', default: false },
  { group: 'Shared', key: 'sharedWallets',     label: 'Wallets',       type: 'bool', default: false },

  // ─── Special logic ───────────────────────────────────────────────────────────
  { group: 'Special', key: 'bronzeScale',         label: 'Bronze Scale (always swim)', type: 'bool', default: false },
  { group: 'Special', key: 'blueFireArrows',      label: 'Blue Fire Arrows',           type: 'bool', default: false },
  { group: 'Special', key: 'sunlightArrows',      label: 'Sunlight Arrows',            type: 'bool', default: false },
  { group: 'Special', key: 'freeScarecrowOot',    label: 'Free Scarecrow (OoT)',       type: 'bool', default: false },
  { group: 'Special', key: 'freeScarecrowMm',     label: 'Free Scarecrow (MM)',        type: 'bool', default: false },
  { group: 'Special', key: 'swordlessAdult',      label: 'Swordless Adult',            type: 'bool', default: false },
  { group: 'Special', key: 'ageChange',           label: 'Age Change',                 type: 'select', default: 'oot',
    options: [{ value: 'oot', label: 'OoT only' }, { value: 'none', label: 'No age change' }] },
  { group: 'Special', key: 'hookshotAnywhereOot', label: 'Hookshot Anywhere (OoT)',   type: 'select', default: 'off',
    options: [{ value: 'off', label: 'Off' }, { value: 'logical', label: 'Logical' }] },
  { group: 'Special', key: 'climbMostSurfacesOot',label: 'Climb Most Surfaces (OoT)', type: 'select', default: 'off',
    options: [{ value: 'off', label: 'Off' }, { value: 'logical', label: 'Logical' }] },
  { group: 'Special', key: 'rainbowBridge',       label: 'Rainbow Bridge',            type: 'select', default: 'vanilla',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'open', label: 'Open' }, { value: 'medallions', label: 'Medallions' }] },
  { group: 'Special', key: 'ganonTrials',         label: 'Ganon Trials',              type: 'select', default: 'all',
    options: [{ value: 'all', label: 'All 6' }, { value: 'none', label: 'None (open)' }] },
  { group: 'Special', key: 'rustyKeysOot',        label: 'Rusty Keys (OoT)',          type: 'bool', default: false },
];

export const SETTING_GROUPS = [...new Set(LOGIC_SETTINGS_DEFS.map(s => s.group))];

export function defaultLogicSettings(): Record<string, any> {
  const out: Record<string, any> = {};
  for (const def of LOGIC_SETTINGS_DEFS) out[def.key] = def.default;
  return out;
}
