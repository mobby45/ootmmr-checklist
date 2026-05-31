// Decodes an OoTMM randomizer settings string (v2.x format) and maps it to app settings.
// Format: "v2." + base64url(deflateRaw(JSON.stringify(settingsDiff)))

const KEY_MAP: Record<string, string> = {
  goldSkulltulaTokens:          'goldSkulltulaShuffleOOT',
  silverRupeeShuffle:           'SilverRupeeShuffleOOT',
  smallKeyShuffleChestGame:     'TreasureChestShuffleOOT',
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
  shuffleMasterSword:           'shuffleMasterSword',
  shuffleGerudoCard:            'shuffleGerudoCard',
  shuffleOcarinasOot:           'shuffleOcarinasOot',
  // MM extensions (OoT items in MM pool)
  spellFireMm:          'spellFireMm',
  spellWindMm:          'spellWindMm',
  spellLoveMm:          'spellLoveMm',
  stoneAgonyMm:         'stoneAgonyMm',
  hammerMm:             'hammerMm',
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
  // OoT behavior/pool extensions
  sunlightArrows:       'sunlightArrows',
  blueFireArrows:       'blueFireArrows',
  bronzeScale:          'bronzeScale',
  childWallets:         'childWallets',
  colossalWallets:      'colossalWallets',
  bottomlessWallets:    'bottomlessWallets',
  bottleContentShuffle: 'bottleContentShuffle',
  sticksNutsUpgradesMm: 'sticksNutsUpgradesMm',
  sharedBottles:        'sharedBottles',
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
  songMinuetMm:         'songMinuetMm',
  songBoleroMm:         'songBoleroMm',
  songSerenadeMm:       'songSerenadeMm',
  songRequiemMm:        'songRequiemMm',
  songNocturneMm:       'songNocturneMm',
  songPreludeMm:        'songPreludeMm',
  // Souls (OoTMM key → tracker key rename)
  soulsEnemyOot:        'enemySoulsOot',
  soulsBossOot:         'bossSoulsOot',
  soulsNpcOot:          'npcSoulsOot',
  soulsAnimalOot:       'animalSoulsOot',
  soulsMiscOot:         'miscSoulsOot',
  soulsEnemyMm:         'enemySoulsMm',
  soulsBossMm:          'bossSoulsMm',
  soulsNpcMm:           'npcSoulsMm',
  soulsAnimalMm:        'animalSoulsMm',
  soulsMiscMm:          'miscSoulsMm',
  // Cross-game songs (MM songs in OoT pool)
  crossGameSongHealing:            'crossGameSongHealing',
  crossGameSongSoaring:            'crossGameSongSoaring',
  crossGameSongSonata:             'crossGameSongSonata',
  crossGameSongLullaby:            'crossGameSongLullaby',
  crossGameSongNova:               'crossGameSongNova',
  crossGameSongOath:               'crossGameSongOath',
  // Cross-game songs (OoT songs in MM pool)
  crossGameSongZelda:       'crossGameSongZelda',
  crossGameSongSaria:              'crossGameSongSaria',
  crossGameSongMinuet:             'crossGameSongMinuet',
  crossGameSongBolero:             'crossGameSongBolero',
  crossGameSongSerenade:           'crossGameSongSerenade',
  crossGameSongRequiem:            'crossGameSongRequiem',
  crossGameSongNocturne:           'crossGameSongNocturne',
  crossGameSongPrelude:            'crossGameSongPrelude',
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
};

// camelCase value → snake_case, plus special-case overrides
function translateValue(ootmmKey: string, value: unknown): unknown {
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
  'mapCompassShuffle', 'smallKeyShuffleOot', 'smallKeyShuffleMm', 'smallKeyShuffleHideout',
  'dungeonRewardShuffle', 'priceOotShops', 'priceOotScrubs', 'priceOotMerchants', 'priceMmShops',
  'csmcCow', 'openMaskShop', 'ocarinaButtonsShuffleOot', 'ocarinaButtonsShuffleMm',
]);

// Returns {appSettings, clearedKeys, unmapped}
// clearedKeys = mapped tracker keys absent from the hash → should be deleted (reset to default)
export async function importRandomizerSettings(str: string): Promise<{
  appSettings: Record<string, unknown>;
  clearedKeys: string[];
  unmapped: string[];
}> {
  const raw = await decodeRandomizerSettings(str);
  const appSettings: Record<string, unknown> = {};
  const unmapped: string[] = [];
  for (const [ootmmKey, value] of Object.entries(raw)) {
    const appKey = KEY_MAP[ootmmKey];
    if (appKey) {
      appSettings[appKey] = translateValue(ootmmKey, value);
    } else if (ootmmKey === 'bossKeyShuffleOot') {
      appSettings['bossKeyOotEnabled'] = value !== 'removed';
    } else if (ootmmKey === 'bossKeyShuffleMm') {
      appSettings['bossKeyMmEnabled'] = value !== 'removed';
    } else if (!KNOWN_UNTRACKED.has(ootmmKey)) {
      const isShuffleLike = /shuffle|cow|scrub|shop|fairy|egg|fish|frog|merchant|lottery|actor|zelda/i.test(ootmmKey);
      if (isShuffleLike) unmapped.push(ootmmKey);
    }
  }
  if (raw['songEventsShuffleOot'] === true || raw['songEventsShuffleMm'] === true) {
    appSettings['songEventShuffle'] = true;
  }

  // Keys mapped in KEY_MAP but absent from the hash = OoTMM default = disabled
  // Return them so the caller can delete them from ySettings
  const setAppKeys = new Set(Object.keys(appSettings));
  const clearedKeys = Object.values(KEY_MAP).filter(k => !setAppKeys.has(k));
  // Also clear derived keys if their source keys are absent
  if (!('bossKeyOotEnabled' in appSettings)) clearedKeys.push('bossKeyOotEnabled');
  if (!('bossKeyMmEnabled' in appSettings)) clearedKeys.push('bossKeyMmEnabled');
  if (!('songEventShuffle' in appSettings)) clearedKeys.push('songEventShuffle');

  return { appSettings, clearedKeys, unmapped };
}
