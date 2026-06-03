import { bossExitIds, entranceSubTypes, type EntranceInfo, type ErSettingKey } from '../data/entranceData';
import type { ErSettings } from './spoilerParser';

export const erSubTypeGroups = [
  { parent: 'erDungeons', keys: ['erMajorDungeons','erMinorDungeons','erGanonCastle','erGanonTower','erMoon','erSpiderHouses','erPirateFortress','erBeneathWell','erIkanaCastle','erSecretShrine'] },
  { parent: 'erIndoors',  keys: ['erIndoorsMajor','erIndoorsExtra','erIndoorsGameLinks'] },
  { parent: 'erOneWays',  keys: ['erOneWaysMajor','erOneWaysIkana','erOneWaysSongs','erOneWaysStatues','erOneWaysWaterVoids','erOneWaysAnywhere','erOneWaysOwls'] },
] as const;

const subTypeIdSets: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(entranceSubTypes).map(([k, ids]) => [k, new Set(ids)])
);

function hasSubTypeGroup(erType: string): boolean {
  return erSubTypeGroups.some(g => g.parent === erType);
}

export function erMatchesSubTypes(id: string, erType: ErSettingKey, settings: ErSettings): boolean {
  if (!hasSubTypeGroup(erType)) return true;
  const group = erSubTypeGroups.find(g => g.parent === erType);
  if (!group) return true;
  if (!group.keys.some(k => (settings as any)[k])) return false;
  for (const key of group.keys) {
    if ((settings as any)[key] && subTypeIdSets[key]?.has(id)) return true;
  }
  return false;
}

export function erActiveTypes(settings: ErSettings): Set<ErSettingKey> {
  return new Set(
    (Object.keys(settings) as ErSettingKey[]).filter(k => settings[k as keyof ErSettings])
  );
}

export function filterEntrances(entrances: EntranceInfo[], settings: ErSettings): EntranceInfo[] {
  const active = erActiveTypes(settings);
  return entrances.filter(e => {
    if (bossExitIds.has(e.id)) return false;
    if (!active.has(e.erType)) return false;
    if (!erMatchesSubTypes(e.id, e.erType, settings)) return false;
    return true;
  });
}
