import type { LogicState } from './types';
import { buildItemsMap } from './itemMapping';

// ER tracker: entrance name → destination area name (from yEntrances)
// We need to convert from "OoT X to OoT Y" names → region names
// This mapping will be filled in once we have the world graph loaded
export function buildLogicState(
  yItemsSnapshot: Map<string, number>,
  ySettingsSnapshot: Map<string, any>,
  yEntrancesSnapshot: Map<string, string>,
  age: 'child' | 'adult',
  enabledTricks: Set<string> = new Set(),
): LogicState {
  const items = buildItemsMap(yItemsSnapshot);

  // Settings: flatten the Yjs settings map
  const settings = new Map<string, string | boolean | number>();
  for (const [k, v] of ySettingsSnapshot) {
    settings.set(k, v);
  }

  // ER overrides: map entrance ID → destination region name
  // yEntrances stores: entranceId → destination entrance name (full OoTMM name)
  // The engine will resolve these against the world graph
  const erOverrides = new Map<string, string>();
  for (const [entranceId, destName] of yEntrancesSnapshot) {
    erOverrides.set(entranceId, destName);
  }

  return {
    items,
    age,
    events: new Set(), // populated during BFS
    settings,
    erOverrides,
    tricks: enabledTricks,
    flags: new Set(),  // flags populated during BFS if needed
  };
}
