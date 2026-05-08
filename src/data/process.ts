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

function parseLocalPool(filePath: string, gamePrefix: string, scenePrefix: string): T.RawPoolEntry[] {
    const content = readFileSync(filePath, 'utf-8');
    const records: Record<string, string>[] = parseCsv(content, { columns: true, skip_empty_lines: true, trim: true, delimiter: ';' });
    const seen = new Set<string>();
    const entries: T.RawPoolEntry[] = [];
    for (const record of records) {
        if (!record.type || record.type === 'none') continue;
        if (!(record.type in T.CheckType)) continue;
        const raw = record.location.replace(new RegExp(`^${gamePrefix} `), '');
        const location = LOCATION_CORRECTIONS[raw] ?? raw;
        if (seen.has(location)) continue;
        seen.add(location);
        entries.push({
            location,
            type: record.type as keyof typeof T.CheckType,
            hint: '',
            scene: record.scene.replace(new RegExp(`^${scenePrefix}_`), ''),
            id: record.id ?? '',
            item: '',
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

    return { shortName, name: poolEntry.location, type: T.CheckType[poolEntry.type], game, canBeMq, isMq, canHaveVariant, variantNumber, tags, scene: poolEntry.scene, item: poolEntry.item, id: poolEntry.id };
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

        // Apply exclusions to both sceneEntries and otherEntries
        const poolEntries = [...sceneEntries, ...otherEntries]
            .filter(x => !excluded.has(x.location));

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