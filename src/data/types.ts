// jq '.oot+.mm | map(.type) | unique' < src/data/input/data-pool.json
export enum CheckType {
    chest,
    collectible,
    cow,
    fairy,
    fairy_spot,
    fish,
    grass,
    gs,
    heart,
    npc,
    pot,
    rupee,
    scrub,
    sf,
    shop,
    sr,
    crate,
    barrel,
    butterfly,
    hive,
    rock,
    tree,
    bush,
    soil,
    wonder,
    snowball,
    redboulder,
    icicle,
    redice,
    
}

export interface RawPoolEntry {
    location: string;
    type: keyof typeof CheckType;
    hint: string;
    scene: string;
    id: string;
    item: string;
}

export type RawPoolData = {
    [index: string]: RawPoolEntry[];
};

export interface ExtraCheck {
    name: string;
    type: string;
    scene: string;
}

export interface GroupingEntry {
    canBeMq?: boolean;
    canBeVariant?: boolean;
    replacements?: [string, string][];
    scenes: string[];
    checks?: string[];
    exclude?: string[];
    extraChecks?: ExtraCheck[];
}

export type GroupingData = {
    [index: string]: {
        [index: string]: GroupingEntry;
    };
};

// ---------

export enum Game {
    oot = 'oot',
    mm = 'mm',
}

export enum Tag {
    special_scrub,
    setting_tcg,
    setting_hideout_shuffle,
    boss,
}

export interface Check {
    shortName: string;
    name: string;
    type: CheckType;
    game: Game;
    canBeMq: boolean;
    canHaveVariant: boolean;
    isMq: boolean;
    variantNumber: number;
    tags: Tag[];
    scene: string;
    item: string;
    id: string;
}

export enum CheckState {
    unchecked, // No information about the check
    marked, // The check should be emphasized (seen but unreachable, hinted, etc.)
    checked, // The check has been gotten
}

export interface CheckGroup {
    groupName: string;
    canHaveMq: boolean;
    canHaveVariant: boolean;
    maxVariant?: number;
    checks: Check[];
}