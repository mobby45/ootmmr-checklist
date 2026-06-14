// ==========================================
// SPOILER LOG PARSER
// ==========================================

import { settingsMap, valueMap, directBoolKeys } from '../data/spoilerMappings';

export interface ErSettings {
  erBoss: boolean;
  erDungeons: boolean;
  erGrottos: boolean;
  erIndoors: boolean;
  erOverworld: boolean;
  erOneWays: boolean;
  erWallmasters: boolean;
  erMixed: boolean;
  erAlterLw: boolean;
  erDecoupled: boolean;
  erSpawns: boolean;
  // Sub-types
  erMajorDungeons: boolean;
  erMinorDungeons: boolean;
  erGanonCastle: boolean;
  erGanonTower: boolean;
  erMoon: boolean;
  erSpiderHouses: boolean;
  erPirateFortress: boolean;
  erBeneathWell: boolean;
  erIkanaCastle: boolean;
  erSecretShrine: boolean;
  erIndoorsMajor: boolean;
  erIndoorsExtra: boolean;
  erIndoorsGameLinks: boolean;
  erOneWaysMajor: boolean;
  erOneWaysIkana: boolean;
  erOneWaysSongs: boolean;
  erOneWaysStatues: boolean;
  erOneWaysWoods: boolean;
  erOneWaysWaterVoids: boolean;
  erOneWaysAnywhere: boolean;
  erOneWaysOwls: boolean;
}

export const defaultErSettings: ErSettings = {
  erBoss: false,
  erDungeons: false,
  erGrottos: false,
  erIndoors: false,
  erOverworld: false,
  erOneWays: false,
  erWallmasters: false,
  erMixed: false,
  erAlterLw: false,
  erDecoupled: false,
  erSpawns: false,
  erMajorDungeons: false,
  erMinorDungeons: false,
  erGanonCastle: false,
  erGanonTower: false,
  erMoon: false,
  erSpiderHouses: false,
  erPirateFortress: false,
  erBeneathWell: false,
  erIkanaCastle: false,
  erSecretShrine: false,
  erIndoorsMajor: false,
  erIndoorsExtra: false,
  erIndoorsGameLinks: false,
  erOneWaysMajor: false,
  erOneWaysIkana: false,
  erOneWaysSongs: false,
  erOneWaysStatues: false,
  erOneWaysWoods: false,
  erOneWaysWaterVoids: false,
  erOneWaysAnywhere: false,
  erOneWaysOwls: false,
};

export interface SeedInfo {
  hash: string;
  version: string;
  mode: string;
  games: string;
  settingsString: string;
}

export interface SpecialCondition {
  count: number;
  stones: boolean;
  medallions: boolean;
  remains: boolean;
  skullsGold: boolean;
  skullsSwamp: boolean;
  skullsOcean: boolean;
  fairiesWF: boolean;
  fairiesSH: boolean;
  fairiesGB: boolean;
  fairiesST: boolean;
  fairyTown: boolean;
  masksRegular: boolean;
  masksTransform: boolean;
  masksOot: boolean;
  triforce: boolean;
  coinsRed: boolean;
  coinsGreen: boolean;
  coinsBlue: boolean;
  coinsYellow: boolean;
}

export type SpecialConditionsMap = Record<string, SpecialCondition>;

export interface SpoilerSphereEntryLocation {
  type: 'Location';
  location: string;
  item: string;
}

export interface SpoilerSphereEntryEvent {
  type: 'Event';
  event: string;
}

export type SpoilerSphereEntry = SpoilerSphereEntryLocation | SpoilerSphereEntryEvent;

export interface SpoilerSphere {
  sphere: number;
  entries: SpoilerSphereEntry[];
}

export interface SpoilerData {
  settings: Record<string, any>;
  startingItems: Record<string, number>;
  locations: Record<string, string>;
  entrances: Record<string, string>;
  spheres: SpoilerSphere[];
  erSettings: ErSettings;
  OOTMM: 'both' | 'oot' | 'mm';
  OOTMMDungeons: 'both' | 'ootdungeons' | 'mmdungeons';
  seedInfo: SeedInfo | null;
  specialConditions: SpecialConditionsMap;
  players: number;
  worldLocations: Record<number, Record<string, string>>;
  worldEntrances: Record<number, Record<string, string>>;
  junkLocations: string[];
}

function parseValue(spoilerKey: string, rawValue: string): any {
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;
  if (valueMap[spoilerKey]) return valueMap[spoilerKey][rawValue] ?? rawValue;
  return rawValue;
}

export function parseSpoilerLog(text: string): SpoilerData {
  const lines = text.split('\n');

  const playersLine = lines.find(l => /^  players:\s/.test(l));
  const players = playersLine ? parseInt(playersLine.split(':')[1].trim(), 10) : 1;
  const isMultiworld = players > 1;

  const settings: Record<string, any> = {};
  const rawStartingItems: Record<string, number> = {};
  const locations: Record<string, string> = {};
  const entrances: Record<string, string> = {};
  const spheres: SpoilerSphere[] = [];
  const rawEr: Record<string, string> = {};

  const worldLocations: Record<number, Record<string, string>> = {};
  const worldEntrances: Record<number, Record<string, string>> = {};
  for (let i = 1; i <= players; i++) { worldLocations[i] = {}; worldEntrances[i] = {}; }
  let currentLocationWorld = 1;
  let currentEntranceWorld = 1;

  let inSettings = false;
  let inLocations = false;
  let inEntrances = false;
  let inSpheres = false;
  let currentSphere: SpoilerSphere | null = null;
  let inSpecialConditions = false;
  let currentCondition: string | null = null;
  const specialConditions: Record<string, Record<string, any>> = {};
  let inJunkLocations = false;
  const junkLocations: string[] = [];

  for (const line of lines) {
    if (line.trim() === 'Settings') { inSettings = true; inLocations = false; inEntrances = false; inSpecialConditions = false; inJunkLocations = false; continue; }
    if (line.trim() === 'Entrances') { inEntrances = true; inSettings = false; inLocations = false; inSpecialConditions = false; inJunkLocations = false; continue; }
    if (line.startsWith('Special Conditions')) {
      inSettings = false; inEntrances = false; inSpecialConditions = true; currentCondition = null; inJunkLocations = false; continue;
    }
    if (line.startsWith('Junk Locations')) {
      inSettings = false; inEntrances = false; inSpecialConditions = false; currentCondition = null; inJunkLocations = true; continue;
    }
    if (line.startsWith('Tricks') || line.startsWith('World Flags') || line.startsWith('Hints') || line.startsWith('Paths') || line.startsWith('Plando')) {
      inSettings = false; inEntrances = false; inSpecialConditions = false; currentCondition = null; inJunkLocations = false;
    }

    if (inJunkLocations) {
      const loc = line.trim();
      if (loc) junkLocations.push(loc);
    }
    if (line.startsWith('Location List')) { inLocations = true; inSettings = false; inEntrances = false; inSpheres = false; currentSphere = null; inSpecialConditions = false; continue; }
    if (line.trim() === 'Spheres') { inSpheres = true; inSettings = false; inLocations = false; inEntrances = false; currentSphere = null; inSpecialConditions = false; continue; }
    if (inEntrances && line && !line.startsWith(' ')) { inEntrances = false; }

    if (inSettings) {
      const match = line.match(/^  ([a-zA-Z][a-zA-Z0-9_]+):\s*(.+)$/);
      if (match) {
        const [, key, rawValue] = match;
        const trackerKey = settingsMap[key];
        if (key === 'startingItems') {
          for (const id of rawValue.trim().split(/\s+/).filter(Boolean))
            rawStartingItems[id] = (rawStartingItems[id] ?? 0) + 1;
        } else if (trackerKey) settings[trackerKey] = parseValue(key, rawValue.trim());
        else if (key.startsWith('shared') || directBoolKeys.has(key)) settings[key] = rawValue.trim() === 'true';
        if (key.startsWith('er')) rawEr[key] = rawValue.trim();
        if (key === 'owlShuffle') settings['owlShuffleEnabled'] = rawValue.trim() !== 'none';
        if (key === 'bossKeyShuffleOot') settings['bossKeyOotEnabled'] = rawValue.trim() !== 'removed';
        if (key === 'bossKeyShuffleMm') settings['bossKeyMmEnabled'] = rawValue.trim() !== 'removed';
        if (key === 'ganonBossKey') settings['ganonBossKeyEnabled'] = rawValue.trim() !== 'removed';
        if (key.startsWith('coins')) {
          const val = rawValue.trim();
          settings[key] = val === 'true' ? true : val === 'false' ? false : Number(val);
        }
      }
    }

    if (inEntrances) {
      if (isMultiworld) {
        const worldMatch = line.match(/^  World (\d+)\s*$/);
        if (worldMatch) { currentEntranceWorld = parseInt(worldMatch[1], 10); }
        const match = line.match(/^    .+?\(([^)]+)\)\s*->\s*(.+?)\s*\([^)]+\)\s*$/);
        if (match) {
          const [, fromId, toName] = match;
          worldEntrances[currentEntranceWorld][fromId.trim()] = toName.trim();
        }
      } else {
        const match = line.match(/^  .+?\(([^)]+)\)\s*->\s*(.+?)\s*\([^)]+\)\s*$/);
        if (match) {
          const [, fromId, toName] = match;
          entrances[fromId.trim()] = toName.trim();
        }
      }
    }

    if (inLocations) {
      if (isMultiworld) {
        const worldMatch = line.match(/^  World (\d+)/);
        if (worldMatch) { currentLocationWorld = parseInt(worldMatch[1], 10); }
        const match = line.match(/^      (.+?):\s*(.+)$/);
        if (match) {
          const [, locationName, rawItem] = match;
          if (!locationName.match(/\(\d+\)$/)) {
            const item = rawItem.trim().replace(/^Player \d+ /, '');
            worldLocations[currentLocationWorld][locationName.trim()] = item;
          }
        }
      } else {
        const match = line.match(/^    (.+?):\s*(.+)$/);
        if (match) {
          const [, locationName, itemName] = match;
          if (!locationName.match(/\(\d+\)$/)) locations[locationName.trim()] = itemName.trim();
        }
      }
    }

    if (inSpecialConditions) {
      const condMatch = line.match(/^  ([A-Z_]+):$/);
      if (condMatch) {
        currentCondition = condMatch[1];
        specialConditions[currentCondition] = {};
        continue;
      }
      if (currentCondition) {
        const kvMatch = line.match(/^    ([a-zA-Z]+):\s*(.+)$/);
        if (kvMatch) {
          let val: any = kvMatch[2].trim();
          if (val === 'true') val = true;
          else if (val === 'false') val = false;
          else if (!isNaN(Number(val)) && val !== '') val = Number(val);
          specialConditions[currentCondition][kvMatch[1]] = val;
        }
      }
    }

    if (inSpheres) {
      const sphereHeaderMatch = line.match(/^\s*Sphere\s+(\d+)$/);
      if (sphereHeaderMatch) {
        if (currentSphere) spheres.push(currentSphere);
        currentSphere = { sphere: parseInt(sphereHeaderMatch[1], 10), entries: [] };
        continue;
      }
      const locationMatch = line.match(/^\s*Location\s+-\s+(.+):\s*(.+)$/);
      if (locationMatch && currentSphere) {
        const loc = locationMatch[1].trim().replace(/^World \d+ /, '');
        const item = locationMatch[2].trim().replace(/^Player \d+ /, '');
        currentSphere.entries.push({ type: 'Location', location: loc, item });
        continue;
      }
      const eventMatch = line.match(/^\s*Event\s+-\s+(.+)$/);
      if (eventMatch && currentSphere) {
        const ev = eventMatch[1].trim().replace(/^World \d+ /, '');
        currentSphere.entries.push({ type: 'Event', event: ev });
        continue;
      }
    }
  }

  if (currentSphere) spheres.push(currentSphere);

  function isErActive(val: string | undefined): boolean {
    return val === 'full' || val === 'ownGame' || val === 'dungeon';
  }

  const erSettings: ErSettings = {
    erBoss:       isErActive(rawEr['erBoss']),
    erDungeons:   isErActive(rawEr['erDungeons']),
    erGrottos:    isErActive(rawEr['erGrottos']),
    erIndoors:    isErActive(rawEr['erIndoors']),
    erOverworld:  isErActive(rawEr['erOverworld']) || isErActive(rawEr['erRegions']),
    erOneWays:    isErActive(rawEr['erOneWays']) || rawEr['erOneWaysOwls'] === 'true',
    erWallmasters: isErActive(rawEr['erWallmasters']),
    erMixed:      isErActive(rawEr['erMixed']) || rawEr['erMixed'] === 'dungeon',
    erAlterLw:    rawEr['alterLostWoodsExits'] === 'true',
    erDecoupled:  rawEr['erDecoupled'] === 'true',
    erSpawns:     rawEr['erSpawns'] !== undefined && rawEr['erSpawns'] !== 'none',
    erMajorDungeons:     rawEr['erMajorDungeons'] === 'true',
    erMinorDungeons:     rawEr['erMinorDungeons'] === 'true',
    erGanonCastle:       rawEr['erGanonCastle'] === 'true',
    erGanonTower:        rawEr['erGanonTower'] === 'true',
    erMoon:              rawEr['erMoon'] === 'true',
    erSpiderHouses:      rawEr['erSpiderHouses'] === 'true',
    erPirateFortress:    rawEr['erPirateFortress'] === 'true',
    erBeneathWell:       rawEr['erBeneathWell'] === 'true',
    erIkanaCastle:       rawEr['erIkanaCastle'] === 'true',
    erSecretShrine:      rawEr['erSecretShrine'] === 'true',
    erIndoorsMajor:      rawEr['erIndoorsMajor'] === 'true',
    erIndoorsExtra:      rawEr['erIndoorsExtra'] === 'true',
    erIndoorsGameLinks:  rawEr['erIndoorsGameLinks'] === 'true',
    erOneWaysMajor:      rawEr['erOneWaysMajor'] === 'true',
    erOneWaysIkana:      rawEr['erOneWaysIkana'] === 'true',
    erOneWaysSongs:      rawEr['erOneWaysSongs'] === 'true',
    erOneWaysStatues:    rawEr['erOneWaysStatues'] === 'true',
    erOneWaysWoods:      rawEr['erOneWaysWoods'] === 'true',
    erOneWaysWaterVoids: rawEr['erOneWaysWaterVoids'] === 'true',
    erOneWaysAnywhere:   rawEr['erOneWaysAnywhere'] === 'true',
    erOneWaysOwls:       rawEr['erOneWaysOwls'] === 'true',
  };

  // Store sub-type / extra ER settings in general settings record
  const extraErSettings = [
    'erSelfLoops', 'erNoPolarity', 'erDecoupled',
    'erMajorDungeons', 'erMinorDungeons', 'erGanonCastle', 'erGanonTower', 'erMoon',
    'erSpiderHouses', 'erPirateFortress', 'erBeneathWell', 'erIkanaCastle', 'erSecretShrine',
    'erIndoorsMajor', 'erIndoorsExtra', 'erIndoorsGameLinks',
    'erRegions', 'erRegionsExtra', 'erRegionsShortcuts', 'erPiratesWorld',
    'erSpawns', 'erWarps',
    'erMixedDungeons', 'erMixedGrottos', 'erMixedIndoors', 'erMixedRegions', 'erMixedOverworld',
    'erOneWaysMajor', 'erOneWaysIkana', 'erOneWaysSongs', 'erOneWaysStatues',
    'erOneWaysWoods', 'erOneWaysWaterVoids', 'erOneWaysAnywhere', 'erOneWaysOwls',
  ];
  for (const key of extraErSettings) {
    if (rawEr[key] !== undefined) {
      settings[key] = rawEr[key] === 'true' ? true : rawEr[key] === 'false' ? false : rawEr[key];
    }
  }

  const gamesLine = lines.find(l => l.trim().startsWith('games:'));
  const games = gamesLine ? gamesLine.split(':')[1].trim() : 'ootmm';
  const OOTMM = games === 'oot' ? 'oot' : games === 'mm' ? 'mm' : 'both';
  const OOTMMDungeons = games === 'oot' ? 'ootdungeons' : games === 'mm' ? 'mmdungeons' : 'both';

  const seedHashLine = lines.find(l => l.startsWith('Seed:'));
  const versionLine = lines.find(l => l.startsWith('Version:'));
  const settingsStringLine = lines.find(l => l.startsWith('SettingsString:'));
  const modeLine = lines.find(l => /^  mode:/.test(l));

  const seedInfo: SeedInfo | null = seedHashLine ? {
    hash: seedHashLine.replace('Seed:', '').trim(),
    version: versionLine ? versionLine.replace('Version:', '').trim() : '',
    mode: modeLine ? modeLine.replace(/^  mode:\s*/, '').trim() : '',
    games,
    settingsString: settingsStringLine ? settingsStringLine.replace('SettingsString:', '').trim() : '',
  } : null;

  if (isMultiworld) {
    Object.assign(locations, worldLocations[1]);
    Object.assign(entrances, worldEntrances[1]);
  }

  // Propagate combined goron lullaby setting to per-game keys used in logic
  if (settings['progressiveGoronLullaby'] !== undefined) {
    if (settings['progressiveGoronLullabyOot'] === undefined) settings['progressiveGoronLullabyOot'] = settings['progressiveGoronLullaby'];
    if (settings['progressiveGoronLullabyMm'] === undefined) settings['progressiveGoronLullabyMm'] = settings['progressiveGoronLullaby'];
  }

  return { settings, startingItems: rawStartingItems, locations, entrances, spheres, erSettings, OOTMM, OOTMMDungeons, seedInfo, specialConditions: specialConditions as SpecialConditionsMap, players, worldLocations, worldEntrances, junkLocations };
}
