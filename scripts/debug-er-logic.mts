// Debug script: tests if Pathfinder reaches "OOT Kokiri Forest Near Deku Tree" for child
// with Kokiri Sword + Deku Shield (to diagnose the ER "in logic" bug).
import { Items, makePlayerItem, makeSettings, Monitor, Random } from '@ootmm/core';
import { logicPassWorld, Pathfinder, exprAge, exprAnd, exprEvent, exprTrue } from '@ootmm/logic';
import type { World } from '@ootmm/logic/world/types';
import type { PlayerItems } from '@ootmm/core';

const AGE_CHILD = 0 as const;
const AGE_ADULT = 1 as const;

function addItem(result: PlayerItems, itemId: string, count: number) {
  const item = (Items as any)[itemId];
  if (!item) { console.warn('  Unknown item:', itemId); return; }
  const pi = makePlayerItem(item, 0);
  const prev = result.get(pi) ?? 0;
  result.set(pi, Math.max(prev, count));
}

function patchWorld(worlds: World[]): World[] {
  const patched = worlds.map(w => ({ ...w, areas: { ...w.areas } }));
  for (const world of patched) {
    const spawn = world.areas['OOT SPAWN'];
    if (spawn) {
      world.areas['OOT SPAWN'] = {
        ...spawn,
        exits: {
          ...spawn.exits,
          'OOT SPAWN CHILD': exprAge(AGE_CHILD),
          'OOT SPAWN ADULT': exprAnd([exprAge(AGE_ADULT), exprEvent('OOT_DOOR_OF_TIME_OPEN')]),
        },
      };
    }
    const global = world.areas['OOT GLOBAL'];
    if (global) {
      world.areas['OOT GLOBAL'] = {
        ...global,
        exits: {
          ...global.exits,
          'MM SOARING': exprTrue(),
          'MM Clock Town South': exprTrue(),
        },
      };
    }
  }
  return patched;
}

async function main() {
  // Test 1: default settings (dekuTree: 'open')
  console.log('\n=== Test 1: default settings (dekuTree=open) + no items ===');
  await runTest({}, {});

  // Test 2: dekuTree=closed, no items
  console.log('\n=== Test 2: dekuTree=closed, no items ===');
  await runTest({ dekuTree: 'closed' }, {});

  // Test 3: dekuTree=closed, kokiri sword + deku shield
  console.log('\n=== Test 3: dekuTree=closed, kokiri sword + deku shield ===');
  await runTest({ dekuTree: 'closed' }, {
    OOT_SWORD_KOKIRI: 1,
    OOT_SWORD: 1,
    OOT_SHIELD_DEKU: 1,
    OOT_SHIELD: 1,
  });

  // Test 4: dekuTree=closed, + ocarina + song of time
  console.log('\n=== Test 4: dekuTree=closed, kokiri sword + deku shield + ocarina + SoT ===');
  await runTest({ dekuTree: 'closed' }, {
    OOT_SWORD_KOKIRI: 1,
    OOT_SWORD: 1,
    OOT_SHIELD_DEKU: 1,
    OOT_SHIELD: 1,
    OOT_OCARINA: 1,
    OOT_SONG_TIME: 1,
  });
}

async function runTest(extraSettings: Record<string, any>, itemIds: Record<string, number>) {
  const settingsPartial: any = {
    mode: 'single',
    players: 1,
    games: 'ootmm',
    ageChange: 'always',
    ...extraSettings,
  };

  const settings = makeSettings(settingsPartial);
  console.log('  dekuTree:', (settings as any).dekuTree);
  console.log('  progressiveSwordsOot:', (settings as any).progressiveSwordsOot);

  const monitor = new Monitor({});
  const random = new Random();
  await random.seed('debug-test');
  const { worlds } = logicPassWorld({ monitor, settings, random });
  const patched = patchWorld(worlds);

  const playerItems: PlayerItems = new Map();
  for (const [id, count] of Object.entries(itemIds)) {
    addItem(playerItems, id, count);
  }

  const pathfinder = new Pathfinder(patched, settings, new Map());
  const state = pathfinder.run(null, { assumedItems: playerItems });

  const childAreas = state.ws[0].ages[AGE_CHILD].areas;
  const adultAreas = state.ws[0].ages[AGE_ADULT].areas;

  const target = 'OOT Kokiri Forest Near Deku Tree';
  console.log(`  Child has "${target}": ${childAreas.has(target)}`);
  console.log(`  Adult has "${target}": ${adultAreas.has(target)}`);

  // Also check some intermediate areas
  for (const area of ['OOT SPAWN CHILD', 'OOT Link\'s House', 'OOT Kokiri Forest']) {
    console.log(`  Child has "${area}": ${childAreas.has(area)}`);
  }
}

main().catch(console.error);
