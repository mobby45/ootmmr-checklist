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
  writer.write(bytes);
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

// Returns {appSettings, unmapped} where unmapped lists OoTMM keys we couldn't translate
export async function importRandomizerSettings(str: string): Promise<{
  appSettings: Record<string, unknown>;
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
      // Skip non-shuffle settings (tricks, logic, etc.) silently — only report shuffle ones
      const isShuffleLike = /shuffle|cow|scrub|shop|fairy|egg|fish|frog|merchant|lottery|actor|zelda/i.test(ootmmKey);
      if (isShuffleLike) unmapped.push(ootmmKey);
    }
  }
  return { appSettings, unmapped };
}
