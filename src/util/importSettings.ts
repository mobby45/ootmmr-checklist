// Decodes an OoTMM randomizer settings string (v2.x format) and maps it to app settings.
// Format: "v2." + base64url(deflateRaw(JSON.stringify(settingsDiff)))

const KEY_MAP: Record<string, string> = {
  goldSkulltulaTokens:          'goldSkulltulaShuffleOOT',
  silverRupeeShuffle:           'SilverRupeeShuffleOOT',
  smallKeyShuffleChestGame:     'TreasureChestShuffleOOT',
  smallKeyShuffleOot:           'smallKeyShuffleOot',
  smallKeyShuffleMm:            'smallKeyShuffleMm',
  ganonBossKey:                 'GanonBKShuffleOOT',
  scrubShuffleOot:              'ScrubsOOT',
  cowShuffleOot:                'CowShuffleOOT',
  shopShuffleOot:               'ShopShuffleOOT',
  shufflePotsOot:               'PotShuffleOOT',
  shuffleCratesOot:             'CrateShuffleOOT',
  shuffleHivesOot:              'HivesShuffleOOT',
  shuffleGrassOot:              'GrassShuffleOOT',
  shuffleRocksOot:              'RockShuffleOOT',
  shuffleTreesOot:              'TreeShuffleOOT',
  shuffleBushOot:               'BushShuffleOOT',
  shuffleSoilOot:               'SoilShuffleOOT',
  shuffleFreeRupeesOot:         'RupeeShuffleOOT',
  shuffleFreeHeartsOot:         'HeartsShuffleOOT',
  shuffleWonderItemsOot:        'WonderShuffleOOT',
  shuffleButterfliesOot:        'ButterflyShuffleOOT',
  shuffleRedBouldersOot:        'RedBoulderShuffleOOT',
  shuffleFrogsRupeesOot:        'FrogRupeesShuffleOOT',
  shuffleIciclesOot:            'IciclesShuffleOOT',
  shuffleRedIceOot:             'RedIceShuffleOOT',
  shuffleMaskTrades:            'MaskTradeShuffleOOT',
  shuffleMerchantsOot:          'MerchantShuffleOOT',
  pondFishShuffle:              'FishPondShuffleOOT',
  divingGameRupeeShuffle:       'DiveGameShuffleOOT',
  fairyFountainFairyShuffleOot: 'FairyFountainShuffleOOT',
  fairySpotShuffleOot:          'FairySpotShuffleOOT',
  eggShuffle:                   'WeirdPocketEggShuffle',
  tingleShuffle:                'TingleMapShuffleMM',
  townFairyShuffle:             'TownSFShuffleMM',
  strayFairyChestShuffle:       'DungeonChestSFShuffleMM',
  strayFairyOtherShuffle:       'DungeonFreeSFShuffleMM',
  scrubShuffleMm:               'ScrubsMM',
  cowShuffleMm:                 'CowShuffleMM',
  shopShuffleMm:                'ShopShuffleMM',
  owlShuffle:                   'OwlStatueShuffleMM',
  shufflePotsMm:                'PotShuffleMM',
  shuffleCratesMm:              'CrateShuffleMM',
  shuffleBarrelsMm:             'BarrelsShuffleMM',
  shuffleHivesMm:               'HivesShuffleMM',
  shuffleGrassMm:               'GrassShuffleMM',
  shuffleTFGrassMm:             'TerminaGrassShuffleMM',
  shuffleRocksMm:               'RockShuffleMM',
  shuffleTreesMm:               'TreeShuffleMM',
  shuffleBushMm:                'BushShuffleMM',
  shuffleSoilMm:                'SoilShuffleMM',
  shuffleFreeRupeesMm:          'RupeeShuffleMM',
  shuffleFreeHeartsMm:          'HeartsShuffleMM',
  shuffleWonderItemsMm:         'WonderShuffleMM',
  shuffleSnowballsMm:           'SnowballShuffleMM',
  shuffleButterfliesMm:         'ButterflyShuffleMM',
  shuffleRedBouldersMm:         'RedBoulderShuffleMM',
  shuffleLotteryMm:             'LotteryShuffleMM',
  shuffleIciclesMm:             'IciclesShuffleMM',
  shuffleMerchantsMm:           'MerchantShuffleMM',
  fairyFountainFairyShuffleMm:  'FairyFountainShuffleMM',
  restoreBrokenActors:          'BrokenActorsOOT',
  skipZelda:                    'SkipChildZeldaOOT',
  housesSkulltulaTokens:        'housesSkulltulaTokens',
  // Open world / access settings (select)
  startingAge:            'startingAge',
  doorOfTime:             'doorOfTime',
  beneathWell:            'beneathWell',
  dekuTree:               'dekuTree',
  kakarikoGate:           'kakarikoGate',
  gerudoFortress:         'gerudoFortress',
  zoraKing:               'zoraKing',
  moon:                   'moon',
  moonCrash:              'moonCrash',
  openMaskShop:           'openMaskShop',
  alterLostWoodsExits:    'alterLostWoodsExits',
  // MM access (select/bool)
  regionState:            'regionState',
  openMoon:               'openMoon',
  majoraChild:            'majoraChild',
  bossWarpPads:           'bossWarpPads',
  // Win condition
  goal:                   'goal',
  // Special logic (select/bool)
  ageChange:              'ageChange',
  autoInvert:             'autoInvert',
  ootPreplantedBeans:     'ootPreplantedBeans',
  hookshotAnywhereOot:    'hookshotAnywhereOot',
  hookshotAnywhereMm:     'hookshotAnywhereMm',
  climbMostSurfacesOot:   'climbMostSurfacesOot',
  rainbowBridge:          'rainbowBridge',
  lacs:                   'lacs',
  freeScarecrowOot:       'freeScarecrowOot',
  freeScarecrowMm:        'freeScarecrowMm',
  swordlessAdult:         'swordlessAdult',
  timeTravelSword:        'timeTravelSword',
  iceArrowPlatformsOot:   'iceArrowPlatformsOot',
  openZdShortcut:         'openZdShortcut',
  // Open dungeons (multicheck — space-separated flags, same key)
  openDungeonsOot:        'openDungeonsOot',
  openDungeonsMm:         'openDungeonsMm',
  clearStateDungeonsMm:   'clearStateDungeonsMm',
  ganonTrials:            'ganonTrials',
  // Ageless items (bool)
  agelessSwords:          'agelessSwords',
  agelessHookshot:        'agelessHookshot',
  agelessBoots:           'agelessBoots',
  agelessBow:             'agelessBow',
  agelessBoomerang:       'agelessBoomerang',
  agelessStrength:        'agelessStrength',
  agelessShields:         'agelessShields',
  agelessHammer:          'agelessHammer',
  agelessTunics:          'agelessTunics',
  agelessSlingshot:       'agelessSlingshot',
  agelessSticks:          'agelessSticks',
  agelessSoaring:         'agelessSoaring',
  agelessGFS:             'agelessGFS',
  agelessChildTrade:      'agelessChildTrade',
  // Key rings (select — value = dungeon type identifier)
  smallKeyRingOot:        'smallKeyRingOot',
  smallKeyRingMm:         'smallKeyRingMm',
  // Silver rupee pouches (select)
  silverRupeePouches:     'silverRupeePouches',
  // Progressive Goron Lullaby — release uses single key, dev splits per-game
  progressiveGoronLullaby:    'progressiveGoronLullabyOot', // release alias (fan-out handled below)
  progressiveGoronLullabyOot: 'progressiveGoronLullabyOot',
  shuffleMasterSword:           'shuffleMasterSword',
  shuffleGerudoCard:            'shuffleGerudoCard',
  shuffleOcarinasOot:           'shuffleOcarinasOot',
  // MM extensions (OoT items in MM pool)
  spellFireMm:          'spellFireMm',
  spellWindMm:          'spellWindMm',
  spellLoveMm:          'spellLoveMm',
  stoneAgonyMm:         'stoneAgonyMm',
  hammerMm:             'hammerMm',
  kegStrength3:         'kegStrength3',
  strengthMm:           'strengthMm',
  scalesMm:             'scalesMm',
  dekuShieldMm:         'dekuShieldMm',
  bootsIronMm:          'bootsIronMm',
  bootsHoverMm:         'bootsHoverMm',
  tunicGoronMm:         'tunicGoronMm',
  tunicZoraMm:          'tunicZoraMm',
  boomerangMm:          'boomerangMm',
  shortHookshotMm:      'shortHookshotMm',
  fairyOcarinaMm:       'fairyOcarinaMm',
  transcendentFairy:    'transcendentFairy',
  clocks:               'clocks',
  skeletonKeyMm:        'skeletonKeyMm',
  platinumTokenMm:      'platinumTokenMm',
  // OoT extensions (MM items in OoT pool)
  elegyOot:             'crossGameSongElegy',
  spinUpgradeOot:       'spinUpgradeOot',
  extraChildSwordsOot:  'extraChildSwordsOot',
  blastMaskOot:         'blastMaskOot',
  stoneMaskOot:         'stoneMaskOot',
  kamaroMaskOot:        'kamaroMaskOot',
  skeletonKeyOot:       'skeletonKeyOot',
  platinumTokenOot:     'platinumTokenOot',
  magicalRupee:         'magicalRupee',
  gfsOot:               'gfsOot',
  powderKegOot:         'powderKegOot',
  // OoT behavior/pool extensions
  sunlightArrows:       'sunlightArrows',
  blueFireArrows:       'blueFireArrows',
  bronzeScale:          'bronzeScale',
  childWallets:         'childWallets',
  colossalWallets:      'colossalWallets',
  bottomlessWallets:    'bottomlessWallets',
  bottleContentShuffle: 'bottleContentShuffle',
  sticksNutsUpgradesMm: 'sticksNutsUpgradesMm',
  slingshotMm:          'slingshotMm',
  menuNotebook:         'menuNotebook',
  rustyKeysOot:         'rustyKeysOot',
  rustyKeysMm:          'rustyKeysMm',
  bombchuBehaviorOot:   'bombchuBehaviorOot',
  bombchuBehaviorMm:    'bombchuBehaviorMm',
  progressiveShieldsOot:     'progressiveShieldsOot',
  progressiveSwordsOot:      'progressiveSwordsOot',
  progressiveShieldsMm:      'progressiveShieldsMm',
  progressiveGFS:            'progressiveGFS',
  progressiveGoronLullabyMm:  'progressiveGoronLullabyMm',
  progressiveClocks:         'progressiveClocks',
  sharedBottles:        'sharedBottles',
  // Shared items between OoT and MM (control item tracker visibility)
  sharedHookshot:       'sharedHookshot',
  sharedBombBags:       'sharedBombBags',
  sharedHealth:         'sharedHealth',
  sharedNutsSticks:     'sharedNutsSticks',
  sharedBombchuBags:    'sharedBombchuBags',
  sharedBombchu:        'sharedBombchuBags', // OoTMM uses sharedBombchu, tracker uses sharedBombchuBags
  sharedStrength:       'sharedStrength',
  sharedHammer:         'sharedHammer',
  sharedBows:           'sharedBows',
  sharedMagic:          'sharedMagic',
  sharedMagicArrowFire: 'sharedMagicArrowFire',
  sharedMagicArrowIce:  'sharedMagicArrowIce',
  sharedMagicArrowLight:'sharedMagicArrowLight',
  sharedLens:           'sharedLens',
  sharedOcarina:        'sharedOcarina',
  sharedBootsIron:      'sharedBootsIron',
  sharedBootsHover:     'sharedBootsHover',
  sharedTunicGoron:     'sharedTunicGoron',
  sharedTunicZora:      'sharedTunicZora',
  sharedScales:         'sharedScales',
  sharedWallets:        'sharedWallets',
  sharedSwords:         'sharedSwords',
  sharedShields:        'sharedShields',
  sharedShieldDeku:     'sharedShieldDeku',
  sharedShieldHylian:   'sharedShieldHylian',
  sharedSpellFire:      'sharedSpellFire',
  sharedSpellWind:      'sharedSpellWind',
  sharedSpellLove:      'sharedSpellLove',
  sharedMaskGoron:      'sharedMaskGoron',
  sharedMaskZora:       'sharedMaskZora',
  sharedMaskKeaton:     'sharedMaskKeaton',
  sharedMaskBlast:      'sharedMaskBlast',
  sharedMaskStone:      'sharedMaskStone',
  sharedMaskBunny:      'sharedMaskBunny',
  sharedMaskTruth:      'sharedMaskTruth',
  sharedMaskKamaro:     'sharedMaskKamaro',
  sharedBoomerang:      'sharedBoomerang',
  sharedGFS:            'sharedGFS',
  sharedSlingshot:      'sharedSlingshot',
  sharedPowderKeg:      'sharedPowderKeg',
  sharedSkeletonKey:    'sharedSkeletonKey',
  sharedPlatinumToken:  'sharedPlatinumToken',
  sharedSoulsEnemy:     'sharedSoulsEnemy',
  sharedSoulsNpc:       'sharedSoulsNpc',
  sharedSoulsAnimal:    'sharedSoulsAnimal',
  sharedSoulsMisc:      'sharedSoulsMisc',
  sharedOcarinaButtons: 'sharedOcarinaButtons',
  sharedSpinUpgrade:    'sharedSpinUpgrade',
  sharedStoneAgony:     'sharedStoneAgony',
  sharedSongElegy:      'sharedSongElegy',
  sharedTriforce:       'sharedTriforce',
  triforceSharedMulti:  'sharedTriforce',
  coins:                'coins',
  triforceGoal:         'triforceGoal',
  triforcePieces:       'triforcePieces',
  // Individual song pool extensions (MM songs in OoT)
  songSoaringOot:       'songSoaringOot',
  songHealingOot:       'songHealingOot',
  songAwakeningOot:     'songAwakeningOot',
  songGoronOot:         'songGoronOot',
  songZoraOot:          'songZoraOot',
  songOrderOot:         'songOrderOot',
  songOfDoubleTimeOot:  'songOfDoubleTimeOot',
  // Individual song pool extensions (OoT songs in MM)
  songZeldaLullabyMm:   'songZeldaLullabyMm',
  songSariasMm:         'songSariasMm',
  songSunMm:            'songSunMm',
  sunSongMm:            'songSunMm', // OoTMM hash uses sunSongMm, tracker uses songSunMm
  songMinuetMm:         'songMinuetMm',
  songBoleroMm:         'songBoleroMm',
  songSerenadeMm:       'songSerenadeMm',
  songRequiemMm:        'songRequiemMm',
  songNocturneMm:       'songNocturneMm',
  songPreludeMm:        'songPreludeMm',
  // Souls — store under the same key as logic engine and ItemTracker expect
  soulsEnemyOot:        'soulsEnemyOot',
  soulsBossOot:         'soulsBossOot',
  soulsNpcOot:          'soulsNpcOot',
  soulsAnimalOot:       'soulsAnimalOot',
  soulsMiscOot:         'soulsMiscOot',
  soulsEnemyMm:         'soulsEnemyMm',
  soulsBossMm:          'soulsBossMm',
  soulsNpcMm:           'soulsNpcMm',
  soulsAnimalMm:        'soulsAnimalMm',
  soulsMiscMm:          'soulsMiscMm',
  // Cross-game songs (MM songs in OoT pool)
  // OoTMM uses different key names; both old and new keys map to the same tracker slot
  sharedSongHealing:            'sharedSongHealing',
  sharedSongSoaring:            'sharedSongSoaring',
  sharedSongSonata:             'sharedSongSonata',
  sharedSongAwakening:          'sharedSongSonata',   // OoTMM name for Sonata of Awakening
  sharedSongLullaby:            'sharedSongLullaby',
  sharedSongGoron:              'sharedSongLullaby',  // OoTMM name for Goron's Lullaby
  sharedSongNova:               'sharedSongNova',
  sharedSongZora:               'sharedSongNova',     // OoTMM name for New Wave Bossa Nova
  sharedSongOath:               'sharedSongOath',
  sharedSongOrder:              'sharedSongOath',     // OoTMM name for Oath to Order
  // Cross-game songs (OoT songs in MM pool)
  sharedSongZeldaLullaby:       'sharedSongZeldaLullaby',
  sharedSongSaria:              'sharedSongSaria',
  sharedSongSarias:             'sharedSongSaria',    // OoTMM uses plural 's'
  sharedSongMinuet:             'sharedSongMinuet',
  sharedSongBolero:             'sharedSongBolero',
  sharedSongSerenade:           'sharedSongSerenade',
  sharedSongRequiem:            'sharedSongRequiem',
  sharedSongNocturne:           'sharedSongNocturne',
  sharedSongPrelude:            'sharedSongPrelude',
  // Songs shared between games (same song in both pools, not cross-game shuffled)
  sharedSongEpona:              'sharedSongEpona',
  sharedSongStorms:             'sharedSongStorms',
  sharedSongTime:               'sharedSongTime',
  sharedSongSun:                'sharedSongSun',
  crossGameSongElegy:              'crossGameSongElegy',
  // Entrance Randomizer
  erSelfLoops:          'erSelfLoops',
  erNoPolarity:         'erNoPolarity',
  erDecoupled:          'erDecoupled',
  erBoss:               'erBoss',
  erDungeons:           'erDungeons',
  erMajorDungeons:      'erMajorDungeons',
  erMinorDungeons:      'erMinorDungeons',
  erGanonCastle:        'erGanonCastle',
  erGanonTower:         'erGanonTower',
  erMoon:               'erMoon',
  erSpiderHouses:       'erSpiderHouses',
  erPirateFortress:     'erPirateFortress',
  erBeneathWell:        'erBeneathWell',
  erIkanaCastle:        'erIkanaCastle',
  erSecretShrine:       'erSecretShrine',
  erGrottos:            'erGrottos',
  erIndoors:            'erIndoors',
  erIndoorsMajor:       'erIndoorsMajor',
  erIndoorsExtra:       'erIndoorsExtra',
  erIndoorsGameLinks:   'erIndoorsGameLinks',
  erRegions:            'erRegions',
  erRegionsExtra:       'erRegionsExtra',
  erRegionsShortcuts:   'erRegionsShortcuts',
  erPiratesWorld:       'erPiratesWorld',
  erMixed:              'erMixed',
  erMixedDungeons:      'erMixedDungeons',
  erMixedGrottos:       'erMixedGrottos',
  erMixedIndoors:       'erMixedIndoors',
  erMixedRegions:       'erMixedRegions',
  erSpawns:             'erSpawns',
  erWallmasters:        'erWallmasters',
  erWarps:              'erWarps',
  erOneWays:            'erOneWays',
  erOneWaysMajor:       'erOneWaysMajor',
  erOneWaysIkana:       'erOneWaysIkana',
  erOneWaysOwls:        'erOneWaysOwls',
  erOneWaysWaterVoids:  'erOneWaysWaterVoids',
  erOneWaysAnywhere:    'erOneWaysAnywhere',
  // Stray fairy count per dungeon (OoTMM key is strayFairyRewardCount, tracker uses STRAY_FAIRY_COUNT)
  strayFairyRewardCount: 'STRAY_FAIRY_COUNT',
  // Price settings
  priceOotShops:     'priceOotShops',
  priceOotScrubs:    'priceOotScrubs',
  priceOotMerchants: 'priceOotMerchants',
  priceMmShops:      'priceMmShops',
  priceMmTingle:     'priceMmTingle',
};

// Maps OoTMM generator item IDs (used in startingItems) to tracker item IDs + levels.
// level = -1 means "use the OoTMM count as the tracker level" (progressive items like MM_SWORD).
const OOTMM_STARTING_ITEM_MAP: Record<string, { id: string; level: number }[]> = {
  // ─── OoT weapons ───────────────────────────────────────────────────────────
  OOT_BOW:              [{ id: 'bow',           level: 1 }],
  OOT_BOMB_BAG:         [{ id: 'bomb',          level: 1 }],
  OOT_BOMBCHU:          [{ id: 'bombchu',       level: 1 }],
  OOT_HOOKSHOT:         [{ id: 'hookshot',      level: 1 }],
  OOT_LONGSHOT:         [{ id: 'hookshot',      level: 2 }],
  OOT_HAMMER:           [{ id: 'hammer',        level: 1 }],
  OOT_LENS:             [{ id: 'lens',          level: 1 }],
  OOT_SLINGSHOT:        [{ id: 'slingshot',     level: 1 }],
  OOT_BOOMERANG:        [{ id: 'boomerang',     level: 1 }],
  OOT_MAGIC_BEAN:       [{ id: 'bean',          level: 1 }],
  OOT_STONE_OF_AGONY:   [{ id: 'agony',         level: 1 }],
  OOT_GERUDO_CARD:      [{ id: 'gerudo_card',   level: 1 }],
  OOT_SPELL_FIRE:       [{ id: 'din',           level: 1 }],
  OOT_SPELL_WIND:       [{ id: 'farore',        level: 1 }],
  OOT_SPELL_LOVE:       [{ id: 'nayru',         level: 1 }],
  OOT_ARROW_FIRE:       [{ id: 'arrow_fire_oot',level: 1 }],
  OOT_ARROW_ICE:        [{ id: 'arrow_ice_oot', level: 1 }],
  OOT_ARROW_LIGHT:      [{ id: 'arrow_light_oot',level: 1}],
  // OoT swords
  OOT_SWORD_KOKIRI:     [{ id: 'sword_kokiri',  level: 1 }],
  OOT_SWORD_MASTER:     [{ id: 'sword_master',  level: 1 }],
  OOT_SWORD_BIGGORON:   [{ id: 'sword_biggoron',level: 1 }],
  // OoT equipment
  OOT_OCARINA:          [{ id: 'ocarina',       level: 1 }],
  OOT_OCARINA_FAIRY:    [{ id: 'ocarina',       level: 1 }],
  OOT_OCARINA_OF_TIME:  [{ id: 'ocarina',       level: 2 }],
  OOT_SHIELD_DEKU:      [{ id: 'deku_shield',   level: 1 }],
  OOT_SHIELD_HYRULE:    [{ id: 'hyrule_shield', level: 1 }],
  OOT_SHIELD_MIRROR:    [{ id: 'shield_mirror', level: 1 }],
  OOT_BOOTS_IRON:       [{ id: 'boots_iron',    level: 1 }],
  OOT_BOOTS_HOVER:      [{ id: 'boots_hover',   level: 1 }],
  OOT_TUNIC_GORON:      [{ id: 'tunic_goron',   level: 1 }],
  OOT_TUNIC_ZORA:       [{ id: 'tunic_zora',    level: 1 }],
  OOT_STRENGTH:         [{ id: 'strength',      level: 1 }],
  OOT_STRENGTH_SILVER:  [{ id: 'strength',      level: 2 }],
  OOT_STRENGTH_GOLD:    [{ id: 'strength',      level: 3 }],
  OOT_SCALE:            [{ id: 'scale',         level: 1 }],
  OOT_SCALE_GOLDEN:     [{ id: 'scale',         level: 2 }],
  OOT_MAGIC_UPGRADE:    [{ id: 'magic_oot',     level: 1 }],
  OOT_WALLET:           [{ id: 'wallet',        level: 1 }],
  OOT_WALLET_BIG:       [{ id: 'wallet',        level: 2 }],
  OOT_WALLET_GIANT:     [{ id: 'wallet',        level: 3 }],
  // OoT sticks/nuts — count is quantity, tracker level is always 1
  OOT_STICK:            [{ id: 'sticks_oot',    level: 1 }],
  OOT_STICK_10:         [{ id: 'sticks_oot',    level: 1 }],
  OOT_NUTS:             [{ id: 'nuts_oot',      level: 1 }],
  OOT_NUTS_5:           [{ id: 'nuts_oot',      level: 1 }],
  OOT_NUTS_10:          [{ id: 'nuts_oot',      level: 1 }],
  // OoT masks
  OOT_MASK_BUNNY:       [{ id: 'mask_bunny_oot',level: 1 }],
  // OoT rewards
  OOT_STONE_EMERALD:    [{ id: 'stone_emerald', level: 1 }],
  OOT_STONE_RUBY:       [{ id: 'stone_ruby',    level: 1 }],
  OOT_STONE_SAPPHIRE:   [{ id: 'stone_sapphire',level: 1 }],
  OOT_MEDALLION_FOREST: [{ id: 'medal_forest',  level: 1 }],
  OOT_MEDALLION_FIRE:   [{ id: 'medal_fire',    level: 1 }],
  OOT_MEDALLION_WATER:  [{ id: 'medal_water',   level: 1 }],
  OOT_MEDALLION_SHADOW: [{ id: 'medal_shadow',  level: 1 }],
  OOT_MEDALLION_SPIRIT: [{ id: 'medal_spirit',  level: 1 }],
  OOT_MEDALLION_LIGHT:  [{ id: 'medal_light',   level: 1 }],
  // OoT songs
  OOT_SONG_ZELDA:       [{ id: 'oot_song_zelda',   level: 1 }],
  OOT_SONG_EPONA:       [{ id: 'oot_song_epona',   level: 1 }],
  OOT_SONG_SARIA:       [{ id: 'oot_song_saria',   level: 1 }],
  OOT_SONG_SUN:         [{ id: 'oot_song_sun',     level: 1 }],
  OOT_SONG_TIME:        [{ id: 'oot_song_time',    level: 1 }],
  OOT_SONG_STORMS:      [{ id: 'oot_song_storms',  level: 1 }],
  OOT_SONG_MINUET:      [{ id: 'oot_song_minuet',  level: 1 }],
  OOT_SONG_BOLERO:      [{ id: 'oot_song_bolero',  level: 1 }],
  OOT_SONG_SERENADE:    [{ id: 'oot_song_serenade',level: 1 }],
  OOT_SONG_TP_WATER:    [{ id: 'oot_song_serenade',level: 1 }], // teleport variant = same song
  OOT_SONG_REQUIEM:     [{ id: 'oot_song_requiem', level: 1 }],
  OOT_SONG_NOCTURNE:    [{ id: 'oot_song_nocturne',level: 1 }],
  OOT_SONG_PRELUDE:     [{ id: 'oot_song_prelude', level: 1 }],
  OOT_SONG_TP_LIGHT:    [{ id: 'oot_song_prelude', level: 1 }], // teleport variant = same song
  OOT_SONG_SOARING:     [{ id: 'oot_song_soaring', level: 1 }],
  OOT_SONG_HEALING:     [{ id: 'oot_song_healing', level: 1 }],

  // ─── MM weapons ────────────────────────────────────────────────────────────
  MM_BOW:               [{ id: 'mm_bow',        level: 1 }],
  MM_BOMB_BAG:          [{ id: 'mm_bomb',       level: 1 }],
  MM_BOMBCHU:           [{ id: 'mm_bombchu',    level: 1 }],
  MM_HOOKSHOT:          [{ id: 'mm_hookshot',   level: 1 }],
  MM_LENS:              [{ id: 'mm_lens',       level: 1 }],
  MM_POWDER_KEG:        [{ id: 'mm_powder_keg', level: 1 }],
  MM_PICTOGRAPH:        [{ id: 'mm_pictograph', level: 1 }],
  MM_ARROW_FIRE:        [{ id: 'mm_arrow_fire', level: 1 }],
  MM_ARROW_ICE:         [{ id: 'mm_arrow_ice',  level: 1 }],
  MM_ARROW_LIGHT:       [{ id: 'mm_arrow_light',level: 1 }],
  MM_MAGIC_UPGRADE:     [{ id: 'mm_magic',      level: 1 }],
  // MM swords — level -1: use OoTMM count as tracker level (1=Kokiri, 2=Razor, 3=Gilded)
  MM_SWORD:             [{ id: 'mm_sword',      level: -1 }],
  MM_SWORD_KOKIRI:      [{ id: 'mm_sword',      level: 1 }],
  MM_SWORD_RAZOR:       [{ id: 'mm_sword',      level: 2 }],
  MM_SWORD_GILDED:      [{ id: 'mm_sword',      level: 3 }],
  // MM equipment
  MM_OCARINA:           [{ id: 'mm_ocarina',    level: 1 }],
  MM_SHIELD_HERO:       [{ id: 'mm_shield_hero',level: 1 }],
  MM_SHIELD_ZORA:       [{ id: 'mm_shield_zora',level: 1 }],
  MM_BOOTS_IRON:        [{ id: 'mm_boots_iron', level: 1 }],
  MM_BOOTS_HOVER:       [{ id: 'mm_boots_hover',level: 1 }],
  MM_STRENGTH:          [{ id: 'mm_strength',   level: 1 }],
  MM_SCALE:             [{ id: 'mm_scale',      level: 1 }],
  MM_WALLET:            [{ id: 'mm_wallet',     level: 1 }],
  MM_STICK:             [{ id: 'mm_stick',      level: 1 }],
  MM_STICK_10:          [{ id: 'mm_stick',      level: 1 }],
  MM_NUTS:              [{ id: 'mm_nuts',       level: 1 }],
  MM_NUTS_5:            [{ id: 'mm_nuts',       level: 1 }],
  MM_NUTS_10:           [{ id: 'mm_nuts',       level: 1 }],
  // MM masks
  MM_MASK_DEKU:         [{ id: 'mm_mask_deku',  level: 1 }],
  MM_MASK_GORON:        [{ id: 'mm_mask_goron', level: 1 }],
  MM_MASK_ZORA:         [{ id: 'mm_mask_zora',  level: 1 }],
  MM_MASK_FIERCE_DEITY: [{ id: 'mm_mask_fierce_deity', level: 1 }],
  MM_MASK_BUNNY:        [{ id: 'mm_mask_bunny', level: 1 }],
  MM_MASK_TRUTH:        [{ id: 'mm_mask_truth', level: 1 }],
  MM_MASK_KAFEI:        [{ id: 'mm_mask_kafei', level: 1 }],
  MM_MASK_KEATON:       [{ id: 'mm_mask_keaton',level: 1 }],
  MM_MASK_ROMANI:       [{ id: 'mm_mask_romani',level: 1 }],
  MM_MASK_CAPTAIN:      [{ id: 'mm_mask_captain',level:1 }],
  MM_MASK_GIANT:        [{ id: 'mm_mask_giant', level: 1 }],
  MM_MASK_BLAST:        [{ id: 'mm_mask_blast', level: 1 }],
  MM_MASK_STONE:        [{ id: 'mm_mask_stone', level: 1 }],
  MM_MASK_GREAT_FAIRY:  [{ id: 'mm_mask_great_fairy', level: 1 }],
  MM_MASK_DON_GERO:     [{ id: 'mm_mask_don_gero', level: 1 }],
  MM_MASK_KAMARO:       [{ id: 'mm_mask_kamaro',level: 1 }],
  MM_MASK_GIBDO:        [{ id: 'mm_mask_gibdo', level: 1 }],
  MM_MASK_CIRCUS:       [{ id: 'mm_mask_circus',level: 1 }],
  MM_MASK_POSTMAN:      [{ id: 'mm_mask_postman',level:1 }],
  MM_MASK_COUPLE:       [{ id: 'mm_mask_couple',level: 1 }],
  MM_MASK_ALL_NIGHT:    [{ id: 'mm_mask_all_night', level: 1 }],
  MM_MASK_SCENTS:       [{ id: 'mm_mask_scents',level: 1 }],
  MM_MASK_BREMEN:       [{ id: 'mm_mask_bremen',level: 1 }],
  // MM rewards
  MM_REMAINS_ODOLWA:    [{ id: 'mm_remains_odolwa',   level: 1 }],
  MM_REMAINS_GOHT:      [{ id: 'mm_remains_goht',     level: 1 }],
  MM_REMAINS_GYORG:     [{ id: 'mm_remains_gyorg',    level: 1 }],
  MM_REMAINS_TWINMOLD:  [{ id: 'mm_remains_twinmold', level: 1 }],
  // MM songs
  MM_SONG_TIME:         [{ id: 'mm_song_time',   level: 1 }],
  MM_SONG_EPONA:        [{ id: 'mm_song_epona',  level: 1 }],
  MM_SONG_SOARING:      [{ id: 'mm_song_soaring',level: 1 }],
  MM_SONG_HEALING:      [{ id: 'mm_song_healing',level: 1 }],
  MM_SONG_STORMS:       [{ id: 'mm_song_storms', level: 1 }],
  MM_SONG_SONATA:       [{ id: 'mm_song_sonata', level: 1 }],
  MM_SONG_LULLABY:      [{ id: 'mm_song_lullaby',level: 1 }],
  MM_SONG_NOVA:         [{ id: 'mm_song_nova',   level: 1 }],
  MM_SONG_OATH:         [{ id: 'mm_song_oath',   level: 1 }],
  MM_SONG_ORDER:        [{ id: 'mm_song_oath',   level: 1 }], // OoTMM alias for Oath to Order
  MM_SONG_ELEGY:        [{ id: 'mm_song_elegy',  level: 1 }],
  MM_SONG_ZELDA:        [{ id: 'mm_song_zelda',  level: 1 }],
  MM_SONG_SARIA:        [{ id: 'mm_song_saria',  level: 1 }],
  MM_SONG_SUN:          [{ id: 'mm_song_sun',    level: 1 }],
  MM_SONG_MINUET:       [{ id: 'mm_song_minuet', level: 1 }],
  MM_SONG_BOLERO:       [{ id: 'mm_song_bolero', level: 1 }],
  MM_SONG_SERENADE:     [{ id: 'mm_song_serenade',level:1 }],
  MM_SONG_REQUIEM:      [{ id: 'mm_song_requiem',level: 1 }],
  MM_SONG_NOCTURNE:     [{ id: 'mm_song_nocturne',level:1 }],
  MM_SONG_PRELUDE:      [{ id: 'mm_song_prelude',level: 1 }],

  // ─── Shared items → apply to both OoT and MM tracker items ─────────────────
  SHARED_BOW:           [{ id: 'bow',           level: 1 }, { id: 'mm_bow',       level: 1 }],
  SHARED_BOMB_BAG:      [{ id: 'bomb',          level: 1 }, { id: 'mm_bomb',      level: 1 }],
  SHARED_BOMBCHU:       [{ id: 'bombchu',       level: 1 }, { id: 'mm_bombchu',   level: 1 }],
  SHARED_HOOKSHOT:      [{ id: 'hookshot',      level: 1 }, { id: 'mm_hookshot',  level: 1 }],
  SHARED_LENS:          [{ id: 'lens',          level: 1 }, { id: 'mm_lens',      level: 1 }],
  SHARED_OCARINA:       [{ id: 'ocarina',       level: 1 }, { id: 'mm_ocarina',   level: 1 }],
  SHARED_MAGIC_UPGRADE: [{ id: 'magic_oot',     level: 1 }, { id: 'mm_magic',     level: 1 }],
  SHARED_ARROW_FIRE:    [{ id: 'arrow_fire_oot',level: 1 }, { id: 'mm_arrow_fire',level: 1 }],
  SHARED_ARROW_ICE:     [{ id: 'arrow_ice_oot', level: 1 }, { id: 'mm_arrow_ice', level: 1 }],
  SHARED_ARROW_LIGHT:   [{ id: 'arrow_light_oot',level:1 }, { id: 'mm_arrow_light',level:1 }],
  SHARED_STICK:         [{ id: 'sticks_oot',    level: 1 }],
  SHARED_NUTS_10:       [{ id: 'nuts_oot',      level: 1 }],
  SHARED_SHIELD_DEKU:   [{ id: 'deku_shield',   level: 1 }],
  SHARED_SHIELD_HYLIAN: [{ id: 'hyrule_shield', level: 1 }],
  SHARED_BOOTS_IRON:    [{ id: 'boots_iron',    level: 1 }, { id: 'mm_boots_iron',level: 1 }],
  SHARED_BOOTS_HOVER:   [{ id: 'boots_hover',   level: 1 }, { id: 'mm_boots_hover',level:1 }],
  SHARED_STRENGTH:      [{ id: 'strength',      level: 1 }, { id: 'mm_strength',  level: 1 }],
  SHARED_SCALE:         [{ id: 'scale',         level: 1 }, { id: 'mm_scale',     level: 1 }],
  SHARED_STONE_OF_AGONY:[{ id: 'agony',         level: 1 }, { id: 'mm_stone_of_agony', level: 1 }],
  SHARED_WALLET:        [{ id: 'wallet',        level: 1 }, { id: 'mm_wallet',    level: 1 }],
  SHARED_SONG_SOARING:  [{ id: 'oot_song_soaring',level:1 },{ id: 'mm_song_soaring',level:1}],
  SHARED_SONG_EPONA:    [{ id: 'oot_song_epona',level: 1 }, { id: 'mm_song_epona',level: 1 }],
  SHARED_SONG_TIME:     [{ id: 'oot_song_time', level: 1 }, { id: 'mm_song_time', level: 1 }],
  SHARED_SONG_STORMS:   [{ id: 'oot_song_storms',level:1 }, { id: 'mm_song_storms',level:1 }],
  SHARED_SONG_SUN:      [{ id: 'oot_song_sun',  level: 1 }, { id: 'mm_song_sun',  level: 1 }],
  SHARED_SWORD:         [{ id: 'sword_kokiri',  level: 1 }, { id: 'mm_sword',     level: 1 }],
};

/** Converts OoTMM startingItems (generator item IDs + counts) to tracker item levels. */
export function mapOotmmStartingItems(startingItems: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [ootmmId, count] of Object.entries(startingItems)) {
    const grants = OOTMM_STARTING_ITEM_MAP[ootmmId];
    if (!grants) continue;
    for (const { id, level } of grants) {
      const effectiveLevel = level === -1 ? Math.max(1, count) : level;
      result[id] = Math.max(result[id] ?? 0, effectiveLevel);
    }
  }
  return result;
}

// Multicheck settings whose value is an array of flags → join with spaces
const MULTICHECK_KEYS = new Set(['openDungeonsOot', 'openDungeonsMm', 'clearStateDungeonsMm', 'ganonTrials']);

// camelCase value → snake_case, plus special-case overrides
function translateValue(ootmmKey: string, value: unknown): unknown {
  // Multicheck: generator stores as array, tracker expects space-separated string
  if (MULTICHECK_KEYS.has(ootmmKey) && Array.isArray(value)) return (value as string[]).join(' ');
  // Key rings: release uses {type:"specific", values:[...]} object; extract the values array
  if ((ootmmKey === 'smallKeyRingOot' || ootmmKey === 'smallKeyRingMm') && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as { type?: string; values?: string[] };
    if (obj.type === 'specific' && Array.isArray(obj.values)) return obj.values.join(' ');
    if (obj.type === 'all') return 'all';
    return '';
  }
  // strayFairyRewardCount is a number in OoTMM, tracker expects a string for the select
  if (ootmmKey === 'strayFairyRewardCount') return String(value);
  if (typeof value !== 'string') return value;
  // goldSkulltulaTokens 'none' means "no shuffle" in the app
  if (ootmmKey === 'goldSkulltulaTokens' && value === 'none') return 'no_shuffle';
  // shop shuffle: OoTMM uses 'all', app uses 'full'
  if ((ootmmKey === 'shopShuffleOot' || ootmmKey === 'shopShuffleMm') && value === 'all') return 'full';
  // smallKeyShuffleChestGame: camelCase value own_minigame pass-through
  if (ootmmKey === 'smallKeyShuffleChestGame') return value.replace(/([A-Z])/g, c => `_${c.toLowerCase()}`);
  // camelCase → snake_case (ownDungeon → own_dungeon, startingItems → starting_items…)
  return value.replace(/([A-Z])/g, c => `_${c.toLowerCase()}`);
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  writer.write(bytes as BufferSource);
  writer.close();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value!);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

export async function decodeRandomizerSettings(str: string): Promise<Record<string, unknown>> {
  str = str.trim();
  if (!str.startsWith('v2.')) throw new Error('Unsupported format — only v2.x is supported');
  const b64 = str.slice(3).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const inflated = await inflateRaw(bytes);
  return JSON.parse(new TextDecoder().decode(inflated));
}

// Settings that don't affect check visibility — silenced from unmapped report
const KNOWN_UNTRACKED = new Set([
  'mapCompassShuffle', 'smallKeyShuffleHideout',
  'dungeonRewardShuffle',
  'csmcCow', 'openMaskShop', 'ocarinaButtonsShuffleOot', 'ocarinaButtonsShuffleMm',
]);

// Returns {appSettings, clearedKeys, startingItems, unmapped, junkLocations}
// clearedKeys = mapped tracker keys absent from the hash → should be deleted (reset to default)
export async function importRandomizerSettings(str: string): Promise<{
  appSettings: Record<string, unknown>;
  clearedKeys: string[];
  startingItems: Record<string, number>;
  tricks: string[];
  unmapped: string[];
  junkLocations: string[];
}> {
  const raw = await decodeRandomizerSettings(str);
  const appSettings: Record<string, unknown> = {};
  const unmapped: string[] = [];
  const junkLocations: string[] = Array.isArray(raw['junkLocations']) ? (raw['junkLocations'] as string[]) : [];
  // Extract tricks array before iterating settings
  const tricks: string[] = Array.isArray(raw['tricks']) ? (raw['tricks'] as string[]) : [];
  // Extract and convert starting items before iterating settings
  const rawStartingItems = raw['startingItems'] as Record<string, number> | undefined;
  const startingItems = rawStartingItems ? mapOotmmStartingItems(rawStartingItems) : {};
  for (const [ootmmKey, value] of Object.entries(raw)) {
    if (ootmmKey === 'startingItems' || ootmmKey === 'tricks') continue; // handled separately
    const appKey = KEY_MAP[ootmmKey];
    if (appKey) {
      const v = translateValue(ootmmKey, value);
      appSettings[appKey] = v;
      // Some keys are stored under a legacy tracker alias AND under their OoTMM name for the logic engine
      if (ootmmKey === 'ganonBossKey')             appSettings['ganonBossKey'] = v;
      if (ootmmKey === 'smallKeyShuffleChestGame') appSettings['smallKeyShuffleChestGame'] = v;
      // Release uses a single progressiveGoronLullaby key — fan out to both Oot and Mm
      if (ootmmKey === 'progressiveGoronLullaby')  appSettings['progressiveGoronLullabyMm'] = v;
    } else if (ootmmKey === 'bossKeyShuffleOot') {
      appSettings['bossKeyShuffleOot'] = translateValue(ootmmKey, value); // logic engine
      appSettings['bossKeyOotEnabled'] = value !== 'removed'; // item tracker badge
    } else if (ootmmKey === 'bossKeyShuffleMm') {
      appSettings['bossKeyShuffleMm'] = translateValue(ootmmKey, value); // logic engine
      appSettings['bossKeyMmEnabled'] = value !== 'removed'; // item tracker badge
    } else if (!KNOWN_UNTRACKED.has(ootmmKey)) {
      const isShuffleLike = /shuffle|cow|scrub|shop|fairy|egg|fish|frog|merchant|lottery|actor|zelda/i.test(ootmmKey);
      if (isShuffleLike) unmapped.push(ootmmKey);
    }
  }
  // Auto-enable UI toggles derived from multiple OoTMM settings
  const crossGameKeys = [
    // Shared-pool cross-game songs (appear in both OoT and MM)
    'sharedSongHealing','sharedSongSoaring','sharedSongSonata','sharedSongLullaby','sharedSongNova','sharedSongOath',
    'sharedSongZeldaLullaby','sharedSongSaria','sharedSongMinuet','sharedSongBolero',
    'sharedSongSerenade','sharedSongRequiem','sharedSongNocturne','sharedSongPrelude',
    'crossGameSongElegy',
    // One-directional: MM songs added to OoT pool (shows OoT cross-game song row)
    'songHealingOot','songSoaringOot','songAwakeningOot','songGoronOot','songZoraOot','songOrderOot',
    // One-directional: OoT songs added to MM pool (shows MM cross-game song row)
    'songZeldaLullabyMm','songSariasMm','songMinuetMm','songBoleroMm',
    'songSerenadeMm','songRequiemMm','songNocturneMm','songPreludeMm',
  ];
  if (crossGameKeys.some(k => appSettings[k] === true)) {
    appSettings['crossGameSongs'] = true;
  }
  if (raw['songEventsShuffleOot'] === true || raw['songEventsShuffleMm'] === true) {
    appSettings['songEventShuffle'] = true;
  }

  // Keys mapped in KEY_MAP but absent from the hash = OoTMM default = disabled
  // Return them so the caller can delete them from ySettings
  const setAppKeys = new Set(Object.keys(appSettings));
  const clearedKeys = [...new Set(Object.values(KEY_MAP).filter(k => !setAppKeys.has(k)))];
  // Also clear derived keys if their source keys are absent
  if (!('bossKeyOotEnabled' in appSettings)) clearedKeys.push('bossKeyOotEnabled');
  if (!('bossKeyMmEnabled' in appSettings)) clearedKeys.push('bossKeyMmEnabled');
  if (!('songEventShuffle' in appSettings)) clearedKeys.push('songEventShuffle');

  return { appSettings, clearedKeys, startingItems, tricks, unmapped, junkLocations };
}
