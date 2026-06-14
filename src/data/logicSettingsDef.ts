// Logic settings that affect check reachability (not pool composition).
// Ordered by frequency of use in the OoTMM world/macro files.

export type SettingType = 'bool' | 'select' | 'multicheck';

export interface LogicSettingOption { value: string; label: string }

export interface LogicSettingDef {
  key: string;
  label: string;
  type: SettingType;
  default: any;
  desc?: string;
  /** For 'select' type — list of options */
  options?: LogicSettingOption[];
  /** For 'multicheck' — each value is a possible flag in a space-separated string */
  flags?: LogicSettingOption[];
  group: string;
}

export const LOGIC_SETTINGS_DEFS: LogicSettingDef[] = [
  // ─── Open areas ──────────────────────────────────────────────────────────────
  { group: 'Open', key: 'startingAge',    label: 'Starting Age',      type: 'select', default: 'child',
    desc: 'Starting age in OoT.',
    options: [{ value: 'child', label: 'Child' }, { value: 'adult', label: 'Adult' }] },
  { group: 'Open', key: 'beneathWell',    label: 'Beneath the Well',  type: 'select', default: 'vanilla',
    desc: 'Open: removes the barrier to access Bottom of the Well and Shadow Temple entrance.',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'open', label: 'Open' }] },
  { group: 'Open', key: 'doorOfTime',     label: 'Door of Time',      type: 'select', default: 'vanilla',
    desc: 'Vanilla: requires Ocarina + Song of Time + 3 Spiritual Stones. Open: always open.',
    options: [{ value: 'vanilla', label: 'Closed' }, { value: 'open', label: 'Open' }] },
  { group: 'Open', key: 'dekuTree',       label: 'Deku Tree',         type: 'select', default: 'vanilla',
    desc: 'Open: enter the Deku Tree without needing Kokiri Sword + Deku Shield.',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'open', label: 'Open' }] },
  { group: 'Open', key: 'kakarikoGate',   label: 'Kakariko Gate',     type: 'select', default: 'closed',
    desc: 'Open: Kakariko Village gate is open from the start without Zelda\'s letter.',
    options: [{ value: 'closed', label: 'Closed' }, { value: 'open', label: 'Open' }] },
  { group: 'Open', key: 'gerudoFortress', label: 'Gerudo Fortress',   type: 'select', default: 'normal',
    desc: 'How many carpenters must be rescued to unlock the Gerudo Fortress gate.',
    options: [{ value: 'normal', label: 'Normal' }, { value: 'single', label: '1 Carpenter' }, { value: 'open', label: 'Open' }] },
  { group: 'Open', key: 'zoraKing',       label: "Zora's Domain",     type: 'select', default: 'vanilla',
    desc: 'Adult/Open: skip thawing King Zora — Zora\'s Fountain accessible without Blue Fire.',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'adult', label: 'Adult' }, { value: 'open', label: 'Open' }] },
  { group: 'Open', key: 'moonCrash',      label: 'Moon Crash',        type: 'select', default: 'cycle',
    desc: 'Behavior when the moon falls: return to last save file, or start a fresh cycle.',
    options: [{ value: 'reset', label: 'Last Save' }, { value: 'cycle', label: 'New Cycle' }] },
  { group: 'Open', key: 'skipZelda',           label: 'Skip Zelda',          type: 'bool',   default: false,
    desc: 'Skip the opening Zelda cutscene sequence in OoT.' },
  { group: 'Open', key: 'moon',                label: 'Moon',                type: 'select', default: 'vanilla',
    desc: 'Vanilla: reach the Moon with 4 Remains + Oath to Order. Open: always accessible. Custom: uses Conditions setting.',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'open', label: 'Open' }, { value: 'custom', label: 'Custom' }] },
  { group: 'Open', key: 'alterLostWoodsExits', label: 'Alternate LW Exits',  type: 'bool',   default: false,
    desc: 'Alternate Lost Woods exits are enabled (ER setting — affects logic paths through the Lost Woods).' },
  { group: 'Open', key: 'openMaskShop',        label: 'Open Mask Shop',      type: 'bool',   default: false,
    desc: 'The Happy Mask Shop is open from the start without needing to complete the child trade sequence.' },

  // ─── Open dungeons OoT ───────────────────────────────────────────────────────
  { group: 'Open Dungeons OoT', key: 'openDungeonsOot', label: 'Open Dungeons OoT', type: 'multicheck', default: '',
    desc: 'Selected OoT dungeons are open: skip their boss key or entry requirements.',
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
    desc: 'Selected MM dungeons are open: skip their boss key or entry requirements.',
    flags: [
      { value: 'WF', label: 'Woodfall Temple' },
      { value: 'SH', label: 'Snowhead Temple' },
      { value: 'GB', label: 'Great Bay Temple' },
      { value: 'ST', label: 'Stone Tower Temple' },
    ]},
  { group: 'Open Dungeons MM', key: 'clearStateDungeonsMm', label: 'Clear State Dungeons', type: 'multicheck', default: '',
    desc: 'Start with the swamp/ocean already cleared, unlocking related content without defeating the boss.',
    flags: [
      { value: 'WF', label: 'Woodfall (swamp cleared)' },
      { value: 'GB', label: 'Great Bay (ocean cleared)' },
    ]},

  // ─── MM Access ───────────────────────────────────────────────────────────────
  { group: 'MM Access', key: 'regionState',  label: 'Region State',    type: 'select', default: 'dungeonBeaten',
    desc: 'What unlocks MM regional access. Free: always open. Dungeon Beaten: boss defeated. Reward: dungeon reward obtained.',
    options: [{ value: 'free', label: 'Free' }, { value: 'dungeonBeaten', label: 'Dungeon Beaten' }, { value: 'reward', label: 'Reward' }] },
  { group: 'MM Access', key: 'openMoon',     label: 'Open Moon',       type: 'bool',   default: false,
    desc: 'The Moon is always accessible without needing Oath to Order.' },
  { group: 'MM Access', key: 'majoraChild',  label: 'Majora Child',    type: 'select', default: 'none',
    desc: 'Custom: Majora can be reached as a child (uses Conditions setting for requirements).',
    options: [{ value: 'none', label: 'Off' }, { value: 'custom', label: 'Custom' }] },
  { group: 'MM Access', key: 'bossWarpPads', label: 'Boss Warp Pads',  type: 'select', default: 'remains',
    desc: 'Free: boss warp pads are active from the start without needing the corresponding Remains.',
    options: [{ value: 'remains', label: 'Requires Remains' }, { value: 'free', label: 'Free' }] },

  // ─── Ageless items ───────────────────────────────────────────────────────────
  { group: 'Ageless', key: 'agelessSwords',      label: 'Swords',            type: 'bool', default: false,
    desc: 'Swords can be used regardless of age (e.g. Biggoron Sword as Child).' },
  { group: 'Ageless', key: 'agelessHookshot',    label: 'Hookshot',          type: 'bool', default: false,
    desc: 'Hookshot/Longshot usable regardless of age.' },
  { group: 'Ageless', key: 'agelessBoots',       label: 'Boots',             type: 'bool', default: false,
    desc: 'Iron/Hover Boots usable regardless of age.' },
  { group: 'Ageless', key: 'agelessBow',         label: 'Bow',               type: 'bool', default: false,
    desc: 'Bow usable regardless of age.' },
  { group: 'Ageless', key: 'agelessBoomerang',   label: 'Boomerang',         type: 'bool', default: false,
    desc: 'Boomerang usable regardless of age (usable as Adult).' },
  { group: 'Ageless', key: 'agelessStrength',    label: 'Strength',          type: 'bool', default: false,
    desc: 'Strength upgrades usable regardless of age.' },
  { group: 'Ageless', key: 'agelessShields',     label: 'Shields',           type: 'bool', default: false,
    desc: 'Shields usable regardless of age (e.g. Deku Shield as Adult).' },
  { group: 'Ageless', key: 'agelessHammer',      label: 'Hammer',            type: 'bool', default: false,
    desc: 'Megaton Hammer usable regardless of age.' },
  { group: 'Ageless', key: 'agelessTunics',      label: 'Tunics',            type: 'bool', default: false,
    desc: 'Goron/Zora Tunics usable regardless of age.' },
  { group: 'Ageless', key: 'agelessSlingshot',   label: 'Slingshot',         type: 'bool', default: false,
    desc: 'Slingshot usable regardless of age (usable as Adult).' },
  { group: 'Ageless', key: 'agelessSticks',      label: 'Sticks',            type: 'bool', default: false,
    desc: 'Deku Sticks usable regardless of age.' },
  { group: 'Ageless', key: 'agelessSoaring',     label: 'Soaring',           type: 'bool', default: false,
    desc: 'Farore\'s Wind / Requiem of Spirit / Prelude of Light usable regardless of age.' },
  { group: 'Ageless', key: 'agelessGFS',         label: 'Great Fairy Sword', type: 'bool', default: false,
    desc: 'Great Fairy Sword usable regardless of age.' },
  { group: 'Ageless', key: 'agelessChildTrade',  label: 'Child Trade',       type: 'bool', default: false,
    desc: 'Child trade items (Weird Egg chain) usable regardless of age.' },

  // ─── Souls OoT — default false; also auto-bridged from item tracker soul visibility ──
  { group: 'Souls OoT', key: 'soulsBossOot',   label: 'Boss Souls',   type: 'bool', default: false,
    desc: 'OoT boss souls are shuffled — defeating bosses requires their soul item.' },
  { group: 'Souls OoT', key: 'soulsEnemyOot',  label: 'Enemy Souls',  type: 'bool', default: false,
    desc: 'OoT enemy souls are shuffled — defeating enemies requires their soul item.' },
  { group: 'Souls OoT', key: 'soulsNpcOot',    label: 'NPC Souls',    type: 'bool', default: false,
    desc: 'OoT NPC souls are shuffled — interacting with NPCs requires their soul item.' },
  { group: 'Souls OoT', key: 'soulsAnimalOot', label: 'Animal Souls', type: 'bool', default: false,
    desc: 'OoT animal souls are shuffled (Malon\'s horse, bugs, fish…).' },
  { group: 'Souls OoT', key: 'soulsMiscOot',   label: 'Misc Souls',   type: 'bool', default: false,
    desc: 'OoT miscellaneous souls are shuffled.' },

  // ─── Souls MM — default false ─────────────────────────────────────────────────────
  { group: 'Souls MM', key: 'soulsBossMm',   label: 'Boss Souls',   type: 'bool', default: false,
    desc: 'MM boss souls are shuffled — defeating bosses requires their soul item.' },
  { group: 'Souls MM', key: 'soulsEnemyMm',  label: 'Enemy Souls',  type: 'bool', default: false,
    desc: 'MM enemy souls are shuffled — defeating enemies requires their soul item.' },
  { group: 'Souls MM', key: 'soulsNpcMm',    label: 'NPC Souls',    type: 'bool', default: false,
    desc: 'MM NPC souls are shuffled — interacting with NPCs requires their soul item.' },
  { group: 'Souls MM', key: 'soulsAnimalMm', label: 'Animal Souls', type: 'bool', default: false,
    desc: 'MM animal souls are shuffled.' },
  { group: 'Souls MM', key: 'soulsMiscMm',   label: 'Misc Souls',   type: 'bool', default: false,
    desc: 'MM miscellaneous souls are shuffled.' },

  // ─── Shared souls — cross-game soul sharing ───────────────────────────────────────
  { group: 'Shared Souls', key: 'sharedSoulsEnemy',  label: 'Enemy Souls', type: 'bool', default: false,
    desc: 'Enemy soul items are shared between OoT and MM (one soul unlocks both games\' enemies).' },
  { group: 'Shared Souls', key: 'sharedSoulsNpc',    label: 'NPC Souls',   type: 'bool', default: false,
    desc: 'NPC soul items are shared between OoT and MM.' },
  { group: 'Shared Souls', key: 'sharedSoulsAnimal', label: 'Animal Souls',type: 'bool', default: false,
    desc: 'Animal soul items are shared between OoT and MM.' },
  { group: 'Shared Souls', key: 'sharedSoulsMisc',   label: 'Misc Souls',  type: 'bool', default: false,
    desc: 'Miscellaneous soul items are shared between OoT and MM.' },

  // ─── Special logic ───────────────────────────────────────────────────────────
  { group: 'Special', key: 'rustyKeysOot',         label: 'Rusty Keys (OoT)',               type: 'bool',   default: false,
    desc: 'Rusty Keys are shuffled in OoT — keys can be found in any location.' },
  { group: 'Special', key: 'rustyKeysMm',          label: 'Rusty Keys (MM)',                type: 'bool',   default: false,
    desc: 'Rusty Keys are shuffled in MM — keys can be found in any location.' },
  { group: 'Special', key: 'lacs',                 label: 'Light Arrow Cutscene',           type: 'select', default: 'vanilla',
    desc: 'Vanilla: LACS triggers after Spirit + Shadow medallions. Custom: uses the Conditions tab.',
    options: [{ value: 'vanilla', label: 'Vanilla (Spirit+Shadow)' }, { value: 'custom', label: 'Custom' }] },
  { group: 'Special', key: 'bombchuBehaviorOot',   label: 'Bombchu Behavior (OoT)',         type: 'select', default: 'bagFirst',
    desc: 'Bag First: need a Bombchu Bag before using them. Bomb Bag: Bomb Bag unlocks Bombchus. Free: usable from the start.',
    options: [{ value: 'bagFirst', label: 'Bag First' }, { value: 'bagSeparate', label: 'Bag Separate' }, { value: 'bombBag', label: 'Bomb Bag' }, { value: 'free', label: 'Free' }] },
  { group: 'Special', key: 'bronzeScale',          label: 'Bronze Scale (always swim)', type: 'bool',   default: false,
    desc: 'Bronze Scale allows swimming to any depth — treated as a Silver Scale in logic.' },
  { group: 'Special', key: 'blueFireArrows',       label: 'Blue Fire Arrows',           type: 'bool',   default: false,
    desc: 'Ice Arrows can melt red ice, acting as Blue Fire.' },
  { group: 'Special', key: 'sunlightArrows',       label: 'Sunlight Arrows',            type: 'bool',   default: false,
    desc: 'Light Arrows can activate sunlight reflectors (e.g. in Spirit Temple).' },
  { group: 'Special', key: 'freeScarecrowOot',     label: 'Free Scarecrow (OoT)',       type: 'bool',   default: false,
    desc: 'Pierre the Scarecrow appears at hookshot spots without needing to learn the Scarecrow\'s Song.' },
  { group: 'Special', key: 'freeScarecrowMm',      label: 'Free Scarecrow (MM)',        type: 'bool',   default: false,
    desc: 'The Scarecrow in MM appears without needing to learn the song.' },
  { group: 'Special', key: 'swordlessAdult',       label: 'Swordless Adult',            type: 'bool',   default: false,
    desc: 'Adult Link can use all items without having a sword equipped.' },
  { group: 'Special', key: 'timeTravelSword',      label: 'Time Travel Sword',          type: 'bool',   default: false,
    desc: 'Pulling the Master Sword from the pedestal counts as a time travel event in logic.' },
  { group: 'Special', key: 'iceArrowPlatformsOot', label: 'Ice Arrow Platforms (OoT)',  type: 'bool',   default: false,
    desc: 'Ice Arrows can create platforms on water surfaces in OoT.' },
  { group: 'Special', key: 'ageChange',            label: 'Age Change',                 type: 'select', default: 'oot',
    desc: 'Where Link can change age. OoT only: Temple of Time. None: age changes disabled.',
    options: [{ value: 'oot', label: 'OoT only' }, { value: 'none', label: 'No age change' }] },
  { group: 'Special', key: 'hookshotAnywhereOot',  label: 'Hookshot Anywhere (OoT)',    type: 'select', default: 'off',
    desc: 'Logical: the Hookshot/Longshot can latch onto any hookable surface in OoT logic.',
    options: [{ value: 'off', label: 'Off' }, { value: 'logical', label: 'Logical' }] },
  { group: 'Special', key: 'hookshotAnywhereMm',   label: 'Hookshot Anywhere (MM)',     type: 'select', default: 'off',
    desc: 'Logical: the Hookshot/Longshot can latch onto any hookable surface in MM logic.',
    options: [{ value: 'off', label: 'Off' }, { value: 'logical', label: 'Logical' }] },
  { group: 'Special', key: 'climbMostSurfacesOot', label: 'Climb Most Surfaces (OoT)', type: 'select', default: 'off',
    desc: 'Logical: Link can climb most wall surfaces in OoT without specific items.',
    options: [{ value: 'off', label: 'Off' }, { value: 'logical', label: 'Logical' }] },
  { group: 'Special', key: 'rainbowBridge',        label: 'Rainbow Bridge',             type: 'select', default: 'vanilla',
    desc: 'What unlocks the Rainbow Bridge to Ganon\'s Castle. Custom: uses the Conditions tab.',
    options: [{ value: 'vanilla', label: 'Vanilla' }, { value: 'open', label: 'Open' }, { value: 'medallions', label: 'Medallions' }, { value: 'custom', label: 'Custom' }] },
  { group: 'Special', key: 'goal',                  label: 'Goal',                        type: 'select',     default: 'ganon',
    desc: 'Win condition. Ganon: defeat Ganon. Triforce: collect all Triforce pieces. Triforce (3): collect any 3 pieces.',
    options: [{ value: 'ganon', label: 'Ganon' }, { value: 'triforce', label: 'Triforce' }, { value: 'triforce3', label: 'Triforce (3 pieces)' }] },
  { group: 'Special', key: 'autoInvert',            label: 'Auto-Invert Time',            type: 'select',     default: 'never',
    desc: 'Whether the game automatically inverts the Song of Time effect at clock milestones.',
    options: [{ value: 'never', label: 'Never' }, { value: 'always', label: 'Always' }] },
  { group: 'Special', key: 'progressiveSwordsOot',  label: 'Progressive Swords (OoT)',    type: 'select',     default: 'separate',
    desc: 'How OoT swords are distributed. Separate: individual items. Progressive: single progressive sword item. Goron: Goron Sword replaces Biggoron Sword.',
    options: [{ value: 'separate', label: 'Separate' }, { value: 'progressive', label: 'Progressive' }, { value: 'goron', label: 'Goron' }] },
  { group: 'Special', key: 'progressiveShieldsOot', label: 'Progressive Shields (OoT)',   type: 'select',     default: 'separate',
    desc: 'How OoT shields are distributed. Separate: individual items. Progressive: single progressive shield item.',
    options: [{ value: 'separate', label: 'Separate' }, { value: 'progressive', label: 'Progressive' }] },
  { group: 'Special', key: 'progressiveClocks',     label: 'Progressive Clocks (MM)',     type: 'select',     default: 'separate',
    desc: 'How MM clock items are distributed. Separate: Sun/Moon/Half-Day clocks individually. Ascending/Descending: single progressive clock.',
    options: [{ value: 'separate', label: 'Separate' }, { value: 'ascending', label: 'Ascending' }, { value: 'descending', label: 'Descending' }] },
  { group: 'Special', key: 'erDungeons',            label: 'ER Dungeons',                 type: 'select',     default: 'none',
    desc: 'Full: all dungeon types (major, minor, Ganon) are entrance-randomized.',
    options: [{ value: 'none', label: 'None' }, { value: 'full', label: 'Full' }] },
  { group: 'Special', key: 'ganonTrials',          label: 'Ganon Trials',               type: 'multicheck', default: 'Fire Forest Light Shadow Spirit Water',
    desc: 'Which trials are active inside Ganon\'s Castle. Unchecked trials are skipped.',
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
