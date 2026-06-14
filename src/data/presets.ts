// ==========================================
// PRESETS — separate file
// Each preset explicitly contains ALL settings
// ==========================================

export interface PresetData {
  settings: Record<string, any>;
  OOTMM: 'both' | 'oot' | 'mm';
  OOTMMDungeons: 'both' | 'ootdungeons' | 'mmdungeons';
  /** Starting items applied to the item tracker when this preset is loaded.
   *  Keys are tracker item IDs (from itemData.ts), values are levels (1 = first level). */
  startingItems?: Record<string, number>;
}

const base: Record<string, any> = {
  goldSkulltulaShuffleOOT: 'no_shuffle',
  SilverRupeeShuffleOOT: 'vanilla',
  TreasureChestShuffleOOT: 'vanilla',
  GanonBKShuffleOOT: 'removed',
  ScrubsOOT: false,
  CowShuffleOOT: false,
  ShopShuffleOOT: 'none',
  PotShuffleOOT: 'none',
  CrateShuffleOOT: 'none',
  HivesShuffleOOT: false,
  GrassShuffleOOT: 'none',
  RockShuffleOOT: false,
  TreeShuffleOOT: false,
  BushShuffleOOT: false,
  SoilShuffleOOT: false,
  RupeeShuffleOOT: 'none',
  HeartsShuffleOOT: 'none',
  WonderShuffleOOT: 'none',
  ButterflyShuffleOOT: false,
  RedBoulderShuffleOOT: false,
  FrogRupeesShuffleOOT: false,
  IciclesShuffleOOT: false,
  RedIceShuffleOOT: false,
  MaskTradeShuffleOOT: false,
  MerchantShuffleOOT: false,
  FishPondShuffleOOT: false,
  DiveGameShuffleOOT: false,
  FairyFountainShuffleOOT: false,
  FairySpotShuffleOOT: false,
  WeirdPocketEggShuffle: false,
  TingleMapShuffleMM: 'vanilla',
  TownSFShuffleMM: 'vanilla',
  DungeonChestSFShuffleMM: 'own_dungeon',
  DungeonFreeSFShuffleMM: 'vanilla',
  ScrubsMM: false,
  CowShuffleMM: false,
  ShopShuffleMM: 'none',
  OwlStatueShuffleMM: 'none',
  PotShuffleMM: 'none',
  CrateShuffleMM: 'none',
  BarrelsShuffleMM: 'none',
  HivesShuffleMM: false,
  GrassShuffleMM: 'none',
  TerminaGrassShuffleMM: false,
  RockShuffleMM: 'none',
  TreeShuffleMM: 'none',
  BushShuffleMM: 'none',
  SoilShuffleMM: 'none',
  RupeeShuffleMM: 'none',
  HeartsShuffleMM: false,
  WonderShuffleMM: false,
  SnowballShuffleMM: 'none',
  ButterflyShuffleMM: false,
  RedBoulderShuffleMM: false,
  LotteryShuffleMM: false,
  IciclesShuffleMM: false,
  MerchantShuffleMM: false,
  FairyFountainShuffleMM: false,
  BrokenActorsOOT: false,
  SkipChildZeldaOOT: false,
  // Logic-relevant settings — must use logicSettingsDef keys and valid values
  startingAge: 'child',
  doorOfTime: 'vanilla',    // 'vanilla' = closed (requires Master Sword), 'open' = always open
  rainbowBridge: 'medallions',
  goal: 'both',
  itemPool: 'normal',
  logic: 'allLocations',
  gerudoFortress: 'normal', // 'normal' | 'single' | 'open'
  zoraKing: 'vanilla',
  kakarikoGate: 'closed',   // 'closed' | 'open'
  dekuTree: 'vanilla',      // 'vanilla' | 'open'
  housesSkulltulaTokens: 'none',
  shuffleMasterSword: true,
  shuffleGerudoCard: true,
  shuffleOcarinasOot: true,
};

export const presetBaseSettings = base;

/** Open-world logic settings common to Blitz-style presets */
const blitzLogic: Record<string, any> = {
  dekuTree:       'open',
  doorOfTime:     'open',
  gerudoFortress: 'open',
  kakarikoGate:   'open',
  rainbowBridge:  'medallions',
  skipZelda:      true,
  SkipChildZeldaOOT: true,
};

const allsanityPool: Record<string, any> = {
  goldSkulltulaShuffleOOT: 'all',
  SilverRupeeShuffleOOT: 'anywhere',
  TreasureChestShuffleOOT: 'anywhere',
  GanonBKShuffleOOT: 'anywhere',
  ScrubsOOT: true,
  CowShuffleOOT: true,
  ShopShuffleOOT: 'full',
  PotShuffleOOT: 'all',
  CrateShuffleOOT: 'all',
  HivesShuffleOOT: true,
  GrassShuffleOOT: 'all',
  RockShuffleOOT: true,
  TreeShuffleOOT: true,
  BushShuffleOOT: true,
  SoilShuffleOOT: true,
  RupeeShuffleOOT: 'all',
  HeartsShuffleOOT: 'all',
  WonderShuffleOOT: 'all',
  ButterflyShuffleOOT: true,
  RedBoulderShuffleOOT: true,
  FrogRupeesShuffleOOT: true,
  IciclesShuffleOOT: true,
  RedIceShuffleOOT: true,
  MaskTradeShuffleOOT: true,
  MerchantShuffleOOT: true,
  FishPondShuffleOOT: true,
  DiveGameShuffleOOT: true,
  FairyFountainShuffleOOT: true,
  FairySpotShuffleOOT: true,
  WeirdPocketEggShuffle: true,
  TingleMapShuffleMM: 'anywhere',
  TownSFShuffleMM: 'anywhere',
  DungeonChestSFShuffleMM: 'anywhere',
  DungeonFreeSFShuffleMM: 'anywhere',
  ScrubsMM: true,
  CowShuffleMM: true,
  ShopShuffleMM: 'full',
  OwlStatueShuffleMM: 'anywhere',
  PotShuffleMM: 'all',
  CrateShuffleMM: 'all',
  BarrelsShuffleMM: 'all',
  HivesShuffleMM: true,
  GrassShuffleMM: 'all',
  TerminaGrassShuffleMM: true,
  RockShuffleMM: 'all',
  TreeShuffleMM: 'all',
  BushShuffleMM: 'all',
  SoilShuffleMM: 'all',
  RupeeShuffleMM: 'all',
  HeartsShuffleMM: true,
  WonderShuffleMM: true,
  SnowballShuffleMM: 'all',
  ButterflyShuffleMM: true,
  RedBoulderShuffleMM: true,
  LotteryShuffleMM: true,
  IciclesShuffleMM: true,
  MerchantShuffleMM: true,
  FairyFountainShuffleMM: true,
  BrokenActorsOOT: true,
};

export const defaultPresets: Record<string, PresetData> = {
  Default: {
    settings: { ...base },
    OOTMM: 'both',
    OOTMMDungeons: 'both',
  },

  Beginner: {
    settings: {
      ...base,
      ...blitzLogic,
      DungeonChestSFShuffleMM: 'starting',
      TingleMapShuffleMM: 'starting_items',
    },
    OOTMM: 'both',
    OOTMMDungeons: 'both',
    startingItems: {
      nuts_oot:        1,
      deku_shield:     1,
      sticks_oot:      1,
      hyrule_shield:   1,
      ocarina:         1,
      mm_ocarina:      1,
      mm_sword:        2,
      oot_song_soaring: 1,
      mm_song_soaring: 1,
    },
  },

  Blitz: {
    settings: {
      ...base,
      ...blitzLogic,
      DungeonChestSFShuffleMM: 'starting',
      TingleMapShuffleMM: 'starting_items',
    },
    OOTMM: 'both',
    OOTMMDungeons: 'both',
    startingItems: {
      nuts_oot:        1,
      deku_shield:     1,
      sticks_oot:      1,
      ocarina:         1,
      mm_ocarina:      1,
      mm_song_time:    1,
      mm_song_epona:   1,
      oot_song_soaring: 1,
      mm_song_soaring: 1,
    },
  },

  'Blitz (with pre-completed dungeons)': {
    settings: {
      ...base,
      ...blitzLogic,
      DungeonChestSFShuffleMM: 'starting',
      TingleMapShuffleMM: 'starting_items',
    },
    OOTMM: 'both',
    OOTMMDungeons: 'both',
    startingItems: {
      nuts_oot:        1,
      deku_shield:     1,
      sticks_oot:      1,
      ocarina:         1,
      mm_ocarina:      1,
      mm_song_time:    1,
      mm_song_epona:   1,
      oot_song_soaring: 1,
      mm_song_soaring: 1,
    },
  },

  'Triforce Blitz': {
    settings: {
      ...base,
      ...blitzLogic,
      DungeonChestSFShuffleMM: 'starting',
      TingleMapShuffleMM: 'starting_items',
    },
    OOTMM: 'both',
    OOTMMDungeons: 'both',
    startingItems: {
      nuts_oot:        1,
      deku_shield:     1,
      sticks_oot:      1,
      ocarina:         1,
      mm_ocarina:      1,
      mm_song_time:    1,
      mm_song_epona:   1,
      oot_song_soaring: 1,
      mm_song_soaring: 1,
    },
  },

  Crosskeys: {
    settings: {
      ...base,
      ...blitzLogic,
      BrokenActorsOOT: true,
      GanonBKShuffleOOT: 'anywhere',
      DungeonChestSFShuffleMM: 'starting',
      TingleMapShuffleMM: 'starting_items',
      DungeonFreeSFShuffleMM: 'starting',
    },
    OOTMM: 'both',
    OOTMMDungeons: 'both',
    startingItems: {
      nuts_oot:        1,
      sticks_oot:      1,
      mask_bunny_oot:  1,
      oot_song_soaring: 1,
      mm_song_soaring: 1,
    },
  },

  Allsanity: {
    settings: {
      ...base,
      ...allsanityPool,
      SkipChildZeldaOOT: true,
      skipZelda: true,
    },
    OOTMM: 'both',
    OOTMMDungeons: 'both',
  },

  Hell: {
    settings: {
      ...base,
      ...allsanityPool,
      SkipChildZeldaOOT: false,
    },
    OOTMM: 'both',
    OOTMMDungeons: 'both',
  },

  'Circle 9': {
    settings: {
      ...base,
      ...allsanityPool,
      SkipChildZeldaOOT: false,
    },
    OOTMM: 'both',
    OOTMMDungeons: 'both',
  },

  'Only OoT': {
    settings: {
      ...base,
      ...blitzLogic,
    },
    OOTMM: 'oot',
    OOTMMDungeons: 'ootdungeons',
    startingItems: {
      nuts_oot:      1,
      deku_shield:   1,
      sticks_oot:    1,
      hyrule_shield: 1,
      ocarina:       1,
    },
  },

  'Only MM': {
    settings: {
      ...base,
      DungeonChestSFShuffleMM: 'starting',
      TingleMapShuffleMM: 'starting_items',
    },
    OOTMM: 'mm',
    OOTMMDungeons: 'mmdungeons',
    startingItems: {
      mm_shield_hero: 1,
      mm_ocarina:     1,
      mm_sword:       1,
      mm_song_soaring: 1,
    },
  },
};

export const defaultPresetNames = new Set(Object.keys(defaultPresets));
