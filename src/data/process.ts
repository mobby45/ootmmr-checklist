import { readFileSync, writeFileSync } from 'fs';
import * as yaml from 'yaml';
import { join } from 'path';
import { fileURLToPath } from 'url';
import * as T from './types';
import { parse as parseCsv } from 'csv-parse/sync';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Correct known typos / name differences in the local CSV vs what OoTMM spoiler output uses
const LOCATION_CORRECTIONS: Record<string, string> = {
    'Secret Shrine Dinalfos Chest': 'Secret Shrine Dinolfos Chest',
};

// CSV uses short type names; map to proper CheckType member names
const TYPE_ALIASES: Record<string, keyof typeof T.CheckType> = {
    scrub: 'deku_scrub',
    gs: 'gold_skulltula',
    sf: 'stray_fairy',
    sr: 'silver_rupee',
    hive: 'beehive',
    npc: 'npc_reward',
    soil: 'soft_soil',
    wonder: 'wonder_item',
    redboulder: 'red_boulder',
    redice: 'red_ice',
    fairy: 'fairy_fountain',
};

function parseLocalPool(filePath: string, gamePrefix: string, scenePrefix: string): T.RawPoolEntry[] {
    const content = readFileSync(filePath, 'utf-8');
    const records: Record<string, string>[] = parseCsv(content, { columns: true, skip_empty_lines: true, trim: true, delimiter: ';' });
    const seen = new Set<string>();
    const entries: T.RawPoolEntry[] = [];
    for (const record of records) {
        if (!record.type || record.type === 'none') continue;
        const mappedType = TYPE_ALIASES[record.type] ?? record.type;
        if (!(mappedType in T.CheckType)) continue;
        const raw = record.location.replace(new RegExp(`^${gamePrefix} `), '');
        const location = LOCATION_CORRECTIONS[raw] ?? raw;
        if (seen.has(location)) continue;
        seen.add(location);
        const ctx = (record.context ?? '').toLowerCase();
        const age: T.RawPoolEntry['age'] = ctx === 'child' ? 'child' : ctx === 'adult' ? 'adult' : 'both';
        entries.push({
            location,
            type: mappedType,
            hint: '',
            scene: record.scene.replace(new RegExp(`^${scenePrefix}_`), ''),
            id: record.id ?? '',
            item: '',
            age,
        });
    }
    return entries;
}

const POOL: T.RawPoolData = {
    oot: parseLocalPool(join(__dirname, 'pool_oot.csv'), 'OOT', 'OOT'),
    mm:  parseLocalPool(join(__dirname, 'pool_mm.csv'),  'MM',  'MM'),
};

// This is a human-constructed/human-readable description of how to process
// and organize the checks in the pool
const groupingFile = readFileSync(join(__dirname, 'grouping.yaml'), 'utf-8');
const GROUPING: T.GroupingData = yaml.parse(groupingFile);

// The all-sanity checks to exclude for the lite version
const liteBlacklist: T.CheckType[] = [];

const structuredChecks: T.CheckGroup[] = [];
const liteChecks: T.CheckGroup[] = [];

function createCheckEntry(
    poolEntry: T.RawPoolEntry,
    game: T.Game,
    groupName: string,
    group: T.GroupingEntry,
    mqScene: string | null,
): T.Check {
    // mqScene is the scene capable of having both MQ and Vanilla verisons of checks
    const canBeMq = mqScene != null && poolEntry.scene == mqScene;
    const isMq = poolEntry.location.startsWith('MQ');

    // JP Line variant detection — ONLY for Deku Palace
    // Variant 0 (US): Normal Deku Palace Grottos (NO JP Line)
    // Variant 1 (JP): Deku Palace JP Line Grotto (NO normal ones)
    let canHaveVariant = false;
    let variantNumber = 0;

    // Check whether this is a Deku Palace JP Line check
    const isDekuPalaceJpLine = /^Deku Palace JP Line Grotto/.test(poolEntry.location);

    if (isDekuPalaceJpLine) {
        canHaveVariant = true;
        variantNumber = 1; // JP Line checks use variant 1 (JP)
     } 

    const tags: T.Tag[] = [];
    if (/^Lost Woods.*Scrub.*Upgrade/.test(poolEntry.location)) tags.push(T.Tag.special_scrub);
    if (/^Hyrule Field Grotto Scrub HP/.test(poolEntry.location)) tags.push(T.Tag.special_scrub);

    let shortName = poolEntry.location;

    // Always replacements and tweaks
    shortName = shortName.replace('MQ ', '');
    shortName = shortName.replace('HP', 'Heart Piece');
    shortName = shortName.replace('HC', 'Heart Container');
    shortName = shortName.replace('SR', 'Silver Rupee');

    // If the entry has specified replacements, use those.
    // Otherwise, it is assumed by default that we will remove the group's name
    // from any checks that start with it.
    const replacements = group?.replacements ?? [[`^${groupName}`, '']];
    for (const [r, s] of replacements) {
        shortName = shortName.replace(new RegExp(r), s);
    }

    shortName = shortName.trim();

    const checkType = poolEntry.type === 'none' ? T.CheckType.chest : T.CheckType[poolEntry.type as keyof typeof T.CheckType];
    const gamePrefix = game === T.Game.oot ? 'OOT' : 'MM';
    // Prefix name with game to guarantee uniqueness across OoT/MM (e.g. "Zora Shop Item 1" exists in both)
    const name = `${gamePrefix} ${poolEntry.location}`;
    return { shortName, name, type: checkType, game, canBeMq, isMq, canHaveVariant, variantNumber, tags, scene: poolEntry.scene, item: poolEntry.item, id: poolEntry.id, age: poolEntry.age };
}

for (let game in T.Game) {
    for (const [groupName, group] of Object.entries(GROUPING[game])) {
        const gamePool = POOL[game as T.Game];

        let sceneEntries: T.RawPoolEntry[] = [];

        let firstScene = group.scenes[0];
        let tailScenes = group.scenes.slice(1);

        // All checks from the pool that have one of the listed scenes are in this group
        // The first scene is chosen to be the only one capable of having checks that have
        // MQ or Vanilla versions; for ordering reasons, grab all such checks FIRST.
        sceneEntries = [
            ...gamePool.filter(x => x.scene == firstScene),
            ...gamePool.filter(x => tailScenes.includes(x.scene)),
        ];

        // Other checks that match one of the regex in 'checks' belong in this group
        let otherEntries =
            group.checks?.flatMap(c => {
                const rx = new RegExp(c);
                return gamePool.filter(x => rx.test(x.location));
            }) ?? [];

        // Build the excluded set from 'exclude' patterns
        const excludePatterns = group.exclude ?? [];
        const excluded = new Set(
            excludePatterns.flatMap((pattern: string) =>
                gamePool.filter(x => new RegExp(pattern).test(x.location)).map(x => x.location)
            )
        );

        // Deduplicate: if the same location appears in both sceneEntries and otherEntries,
        // or in both firstScene and tailScenes, prefer the entry with a real type (not 'none').
        // 'none' entries are placeholder cross-references; the real entry with type+coords is in tailScenes.
        const _seenByLoc = new Map<string, T.RawPoolEntry>();
        for (const x of [...sceneEntries, ...otherEntries]) {
            if (excluded.has(x.location)) continue;
            const existing = _seenByLoc.get(x.location);
            if (!existing || existing.type === 'none') {
                _seenByLoc.set(x.location, x);
            }
        }
        const poolEntries = [..._seenByLoc.values()];

        poolEntries.sort((a, b) => {
            const aIsTingle = a.location.startsWith('Tingle Map');
            const bIsTingle = b.location.startsWith('Tingle Map');
            if (aIsTingle && !bIsTingle) return -1;
            if (!aIsTingle && bIsTingle) return 1;
            return 0;
        });

        const extraEntries = (group.extraChecks ?? []).map(extra => ({
            shortName: extra.name.replace(new RegExp(group.replacements?.[0]?.[0] ?? `^${groupName}`), group.replacements?.[0]?.[1] ?? '').trim(),
            name: extra.name,
            type: T.CheckType[extra.type as keyof typeof T.CheckType],
            game: T.Game[game as T.Game],
            canBeMq: false,
            isMq: false,
            canHaveVariant: false,
            variantNumber: 0,
            tags: [],
            scene: extra.scene,
            item: '',
            id: extra.name.replace(/\s+/g, '_').toUpperCase(),
        }));

        const mqScene = group.canBeMq ? firstScene : null;
        let entries = [
            ...poolEntries.map(c => createCheckEntry(c, T.Game[game as T.Game], groupName, group, mqScene)),
            ...extraEntries,
        ];

        const canHaveMq = entries.some(c => c.canBeMq);
        const canHaveVariant = entries.some(c => c.canHaveVariant);
        // For US/JP, maxVariant is always 1 (0=US, 1=JP)
        const maxVariant = canHaveVariant ? 1 : 0;

        const liteEntries = entries.filter(x => !liteBlacklist.includes(x.type));

        structuredChecks.push({ groupName, canHaveMq, canHaveVariant, maxVariant, checks: entries });
        liteChecks.push({ groupName, canHaveMq, canHaveVariant, maxVariant, checks: liteEntries });
    }
}

writeFileSync(join(__dirname, 'dist', 'structured-checks.json'), JSON.stringify(structuredChecks));
writeFileSync(join(__dirname, 'dist', 'structured-checks-lite.json'), JSON.stringify(liteChecks));

// --- xflag type index: key32 → "game:csvtype:layout" ---
// Built from OoTMM generator CSVs (same source as the override table) so key32 values match.
// key32 = ((0x10 + sliceId) << 24) | (sceneId << 16) | (id & 0xffff), matching checks.ts formula.
// Type names are the generator's own names (hive/soil/wonder/boulder-red/fairy/redice).
// layout = "dungeon"|"overworld" from a hardcoded scene set; lets C# emit overworld vs anywhere.
const XFLAG_TYPES = new Set([
    'pot', 'crate', 'barrel', 'hive', 'rock', 'grass', 'tree', 'soil',
    'rupee', 'heart', 'wonder', 'snowball', 'butterfly', 'boulder-red',
    'icicle', 'fairy_spot', 'fairy', 'bush', 'redice',
]);
const OOT_DUNGEON_SCENES = new Set([
    'DEKU_TREE', 'DODONGO_CAVERN', 'INSIDE_JABU_JABU',
    'TEMPLE_FOREST', 'TEMPLE_FIRE', 'TEMPLE_WATER', 'TEMPLE_SPIRIT', 'TEMPLE_SHADOW',
    'BOTTOM_OF_THE_WELL', 'ICE_CAVERN', 'GERUDO_TRAINING_GROUND',
    'INSIDE_GANON_CASTLE', 'GANON_TOWER',
    'LAIR_GOHMA', 'LAIR_KING_DODONGO', 'LAIR_BARINADE', 'LAIR_PHANTOM_GANON',
    'LAIR_VOLVAGIA', 'LAIR_MORPHA', 'LAIR_BONGO_BONGO', 'LAIR_TWINROVA',
]);
const MM_DUNGEON_SCENES = new Set([
    'TEMPLE_WOODFALL', 'TEMPLE_SNOWHEAD', 'TEMPLE_GREAT_BAY',
    'TEMPLE_STONE_TOWER', 'TEMPLE_STONE_TOWER_INVERTED',
    'BENEATH_THE_WELL', 'BENEATH_THE_GRAVEYARD', 'CASTLE_IKANA', 'SAKON_HIDEOUT', 'SECRET_SHRINE',
    'LAIR_ODOLWA', 'LAIR_GOHT', 'LAIR_GYORG', 'LAIR_TWINMOLD', 'LAIR_IKANA', 'LAIR_MAJORA',
]);
const scenesRaw: Record<string, number> = JSON.parse(
    readFileSync(join(__dirname, '../../OoTMM/packages/core/dist/data-scenes.json'), 'utf-8')
);
const xflagTypeIndex: Record<number, string> = {};

function buildXflagIndex(csvPath: string, game: string, dungeonScenes: Set<string>) {
    const content = readFileSync(csvPath, 'utf-8');
    const recs = parseCsv(content, { columns: true, skip_empty_lines: true, trim: true, delimiter: ',' }) as Record<string, string>[];
    for (const rec of recs) {
        if (!XFLAG_TYPES.has(rec.type)) continue;
        const rawId = rec.id;
        if (!rawId) continue;
        const id = Number(rawId);
        if (!Number.isFinite(id) || !Number.isInteger(id)) continue;
        // Generator CSV uses bare scene names (e.g. LINK_HOUSE); data-scenes.json has OOT_LINK_HOUSE.
        const sceneKey = `${game.toUpperCase()}_${rec.scene}`;
        const sceneId = scenesRaw[sceneKey];
        if (sceneId === undefined) continue;
        const sliceId = (id >> 16) & 0xf;
        const key32 = (((0x10 + sliceId) << 24) | (sceneId << 16) | (id & 0xffff)) >>> 0;
        const layout = dungeonScenes.has(rec.scene) ? 'dungeon' : 'overworld';
        xflagTypeIndex[key32] = `${game}:${rec.type}:${layout}`;
    }
}

const genPool = join(__dirname, '../../OoTMM/data/pool');
buildXflagIndex(join(genPool, 'pool_oot.csv'), 'oot', OOT_DUNGEON_SCENES);
buildXflagIndex(join(genPool, 'pool_mm.csv'), 'mm', MM_DUNGEON_SCENES);
writeFileSync(join(__dirname, 'dist', 'xflag-type-index.json'), JSON.stringify(xflagTypeIndex));
console.log(`[process] xflag-type-index: ${Object.keys(xflagTypeIndex).length} entries`);