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
  erOwls: boolean;
  erWallmasters: boolean;
  erMixed: boolean;
  erAlterLw: boolean;
}

export const defaultErSettings: ErSettings = {
  erBoss: false,
  erDungeons: false,
  erGrottos: false,
  erIndoors: false,
  erOverworld: false,
  erOneWays: false,
  erOwls: false,
  erWallmasters: false,
  erMixed: false,
  erAlterLw: false,
};

export interface SeedInfo {
  hash: string;
  version: string;
  mode: string;
  games: string;
  settingsString: string;
}

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
  locations: Record<string, string>;
  entrances: Record<string, string>;
  spheres: SpoilerSphere[];
  erSettings: ErSettings;
  OOTMM: 'both' | 'oot' | 'mm';
  OOTMMDungeons: 'both' | 'ootdungeons' | 'mmdungeons';
  seedInfo: SeedInfo | null;
}

function parseValue(spoilerKey: string, rawValue: string): any {
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;
  if (valueMap[spoilerKey]) return valueMap[spoilerKey][rawValue] ?? rawValue;
  return rawValue;
}

export function parseSpoilerLog(text: string): SpoilerData {
  const lines = text.split('\n');

  const settings: Record<string, any> = {};
  const locations: Record<string, string> = {};
  const entrances: Record<string, string> = {};
  const spheres: SpoilerSphere[] = [];
  const rawEr: Record<string, string> = {};

  let inSettings = false;
  let inLocations = false;
  let inEntrances = false;
  let inSpheres = false;
  let currentSphere: SpoilerSphere | null = null;

  for (const line of lines) {
    if (line.trim() === 'Settings') { inSettings = true; inLocations = false; inEntrances = false; continue; }
    if (line.trim() === 'Entrances') { inEntrances = true; inSettings = false; inLocations = false; continue; }
    if (line.startsWith('Special Conditions') || line.startsWith('Tricks') || line.startsWith('World Flags') || line.startsWith('Hints') || line.startsWith('Paths')) {
      inSettings = false; inEntrances = false;
    }
    if (line.startsWith('Location List')) { inLocations = true; inSettings = false; inEntrances = false; inSpheres = false; currentSphere = null; continue; }
    if (line.trim() === 'Spheres') { inSpheres = true; inSettings = false; inLocations = false; inEntrances = false; currentSphere = null; continue; }
    if (inEntrances && line && !line.startsWith(' ')) { inEntrances = false; }

    if (inSettings) {
      const match = line.match(/^  ([a-zA-Z][a-zA-Z0-9_]+):\s*(.+)$/);
      if (match) {
        const [, key, rawValue] = match;
        const trackerKey = settingsMap[key];
        if (trackerKey) settings[trackerKey] = parseValue(key, rawValue.trim());
        else if (key.startsWith('shared') || directBoolKeys.has(key)) settings[key] = rawValue.trim() === 'true';
        if (key.startsWith('er')) rawEr[key] = rawValue.trim();
        if (key === 'owlShuffle') settings['owlShuffleEnabled'] = rawValue.trim() !== 'none';
        if (key === 'bossKeyShuffleOot') settings['bossKeyOotEnabled'] = rawValue.trim() !== 'removed';
        if (key === 'bossKeyShuffleMm') settings['bossKeyMmEnabled'] = rawValue.trim() !== 'removed';
        if (key === 'ganonBossKey') settings['ganonBossKeyEnabled'] = rawValue.trim() !== 'removed';
      }
    }

    if (inEntrances) {
      const match = line.match(/^  .+?\(([^)]+)\)\s*->\s*(.+?)\s*\([^)]+\)\s*$/);
      if (match) {
        const [, fromId, toName] = match;
        entrances[fromId.trim()] = toName.trim();
      }
    }

    if (inLocations) {
      const match = line.match(/^    (.+?):\s*(.+)$/);
      if (match) {
        const [, locationName, itemName] = match;
        if (!locationName.match(/\(\d+\)$/)) locations[locationName.trim()] = itemName.trim();
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
        currentSphere.entries.push({ type: 'Location', location: locationMatch[1].trim(), item: locationMatch[2].trim() });
        continue;
      }
      const eventMatch = line.match(/^\s*Event\s+-\s+(.+)$/);
      if (eventMatch && currentSphere) {
        currentSphere.entries.push({ type: 'Event', event: eventMatch[1].trim() });
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
    erOverworld:  isErActive(rawEr['erOverworld']),
    erOneWays:    isErActive(rawEr['erOneWays']),
    erOwls:       rawEr['erOneWaysOwls'] === 'true',
    erWallmasters: isErActive(rawEr['erWallmasters']),
    erMixed:      isErActive(rawEr['erMixed']) || rawEr['erMixed'] === 'dungeon',
    erAlterLw:    rawEr['alterLostWoodsExits'] === 'true',
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
    'erOneWaysWoods', 'erOneWaysWaterVoids', 'erOneWaysAnywhere',
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

  return { settings, locations, entrances, spheres, erSettings, OOTMM, OOTMMDungeons, seedInfo };
}
