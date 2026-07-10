import { writable, type Readable } from 'svelte/store';
import type { ErSettings } from '../util/spoilerParser';
import type { Map as YMap, Array as YArray } from 'yjs';
import type { CheckGroup } from '../data/types';
import { entranceSubTypes, entranceById } from '../data/entranceData';
import SCENES from '../data/dist/data-scenes.json';
import structuredChecksUrl from '../data/dist/structured-checks-lite.json?url';
import { OOT_NPC_SLOTS, MM_NPC_SLOTS } from '../data/npcSlots';
import giDataUrl        from '../../OoTMM/packages/core/dist/data-gi.json?url';
import entrancesDataUrl from '../../OoTMM/packages/core/dist/data-entrances.json?url';
import ootXflagScenesUrl from '../../OoTMM/packages/generator/data/static/xflag_table_oot_scenes.bin?url';
import ootXflagSetupsUrl from '../../OoTMM/packages/generator/data/static/xflag_table_oot_setups.bin?url';
import ootXflagRoomsUrl  from '../../OoTMM/packages/generator/data/static/xflag_table_oot_rooms.bin?url';
import mmXflagScenesUrl  from '../../OoTMM/packages/generator/data/static/xflag_table_mm_scenes.bin?url';
import mmXflagSetupsUrl  from '../../OoTMM/packages/generator/data/static/xflag_table_mm_setups.bin?url';
import mmXflagRoomsUrl   from '../../OoTMM/packages/generator/data/static/xflag_table_mm_rooms.bin?url';

// ─── Save buffer offsets ────────────────────────────────────────────────────
// All offsets are byte indices into the 0x200-byte Read() result that starts
// at the game's gSaveContext address.

// OoT: gSaveContext = 0x8011A5D0 (OotSaveContext / OotSave at offset 0)
// ASSERT_OFFSET sources: include/combo/oot/save.h
const OOT = {
  MAGIC:          0x1C, // "ZELDAZ" — OotSave.info.playerData.newf
  MAGIC_ACQUIRED: 0x3A, // u8      — OotSavePlayerData.isMagicAcquired (0=none, 1=half)
  DOUBLE_MAGIC:   0x3C, // u8      — OotSavePlayerData.isDoubleMagicAcquired
  ITEMS:          0x74, // u8[24]  — OotInventory.items
  AMMO:           0x8C, // u8[15]  — OotInventory.ammo
  EQUIP:          0x9C, // u16     — OotEquipment (boots:4,tunics:4,shields:4,swords:4, MSB-first)
  UPGRADES:       0xA0, // u32     — OotSaveUpgrades bitfield
  QUEST:          0xA4, // u32     — OotSaveQuest bitfield
  DUNG_ITEMS:     0xA8, // u8[20]  — OotDungeonItems[20]
  DUNG_KEYS:      0xBC, // s8[19]  — dungeonKeys[19]
  GOLD_TOKENS:    0xD0, // u16     — gold skulltula count
  TRIFORCE:       0x2F8,// u32     — gTriforceCount (requires 0x300 save read)
};

// MM: gSaveContext = 0x801EF670 (MmSaveContext with MmSave at offset 0)
// ASSERT_OFFSET sources: include/combo/mm/save.h
// MmSave.info (MmSaveInfo) at 0x24; playerData=0x28, itemEquips=0x22 (+2pad), inventory at info+0x4C
const MM = {
  MAGIC:          0x24, // "ZELDA3" — MmSave.info.playerData.newf
  MAGIC_ACQUIRED: 0x40, // u8      — MmSavePlayerData.isMagicAcquired
  DOUBLE_MAGIC:   0x41, // u8      — MmSavePlayerData.isDoubleMagicAcquired
  EQUIP:          0x6C, // u16     — MmItemEquips bitfield (boots:4,tunic:4,shield:4,sword:4, MSB-first)
  ITEMS:          0x70, // u8[48]  — MmInventory.items
  AMMO:           0xA0, // s8[24]  — MmInventory.ammo
  UPGRADES:       0xB8, // u32     — MmUpgrades bitfield
  QUEST:          0xBC, // u32     — MmQuestItems bitfield
  DUNG_ITEMS:     0xC0, // u8[10]  — MmDungeonItems[10]
  DUNG_KEYS:      0xCA, // s8[9]
  STRAY_FAIRIES:  0xD4, // s8[10]  — per-dungeon stray fairy counts (0=WF,1=SH,2=GB,3=ST,4=Town)
};

// ─── ITEM_OOT_* constants (include/combo/data/items.h) ──────────────────────
const OOT_ITEM: Record<string, number> = {
  STICK: 0x00, NUT: 0x01, BOMB: 0x02, BOW: 0x03,
  ARROW_FIRE: 0x04, DINS_FIRE: 0x05, SLINGSHOT: 0x06,
  OCARINA_FAIRY: 0x07, OCARINA_TIME: 0x08, BOMBCHU: 0x09,
  HOOKSHOT: 0x0A, LONGSHOT: 0x0B, ARROW_ICE: 0x0C,
  FARORE_WIND: 0x0D, BOOMERANG: 0x0E, LENS: 0x0F,
  BEANS: 0x10, HAMMER: 0x11, ARROW_LIGHT: 0x12, NAYRU_LOVE: 0x13,
  BOTTLE_EMPTY: 0x14,
};

// ─── ITEM_MM_* constants (include/combo/data/items.h) ───────────────────────
const MM_ITEM: Record<string, number> = {
  OCARINA_TIME: 0x00, BOW: 0x01, ARROW_FIRE: 0x02, ARROW_ICE: 0x03,
  ARROW_LIGHT: 0x04, OCARINA_FAIRY: 0x05, BOMB: 0x06, BOMBCHU: 0x07,
  STICK: 0x08, NUT: 0x09, BEANS: 0x0A, POWDER_KEG: 0x0C,
  PICTOBOX: 0x0D, LENS: 0x0E, HOOKSHOT: 0x0F, FAIRY_SWORD: 0x10,
  BOTTLE_EMPTY: 0x12,
  MOON_TEAR: 0x28, DEED_LAND: 0x29, DEED_SWAMP: 0x2A,
  DEED_MOUNTAIN: 0x2B, DEED_OCEAN: 0x2C, ROOM_KEY: 0x2D,
  LETTER_MAMA: 0x2E, LETTER_KAFEI: 0x2F, PENDANT: 0x30,
  MASK_DEKU: 0x32, MASK_GORON: 0x33, MASK_ZORA: 0x34,
  MASK_FD: 0x35, MASK_TRUTH: 0x36, MASK_KAFEI: 0x37,
  MASK_ALL_NIGHT: 0x38, MASK_BUNNY: 0x39, MASK_KEATON: 0x3A,
  MASK_GARO: 0x3B, MASK_ROMANI: 0x3C, MASK_TROUPE_LEADER: 0x3D,
  MASK_POSTMAN: 0x3E, MASK_COUPLE: 0x3F, MASK_GREAT_FAIRY: 0x40,
  MASK_GIBDO: 0x41, MASK_DON_GERO: 0x42, MASK_KAMARO: 0x43,
  MASK_CAPTAIN: 0x44, MASK_STONE: 0x45, MASK_BREMEN: 0x46,
  MASK_BLAST: 0x47, MASK_SCENTS: 0x48, MASK_GIANT: 0x49,
  BIG_POE: 0x1E,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function u32be(buf: Uint8Array, off: number): number {
  return (((buf[off] << 24) | (buf[off+1] << 16) | (buf[off+2] << 8) | buf[off+3]) >>> 0);
}

function u16be(buf: Uint8Array, off: number): number {
  return ((buf[off] << 8) | buf[off+1]) & 0xFFFF;
}

function hasItem(items: Uint8Array, id: number): boolean {
  for (let i = 0; i < items.length; i++) if (items[i] === id) return true;
  return false;
}

// ─── SAVE_EXTRA_RECORD offsets in the OoT buffer ─────────────────────────────
// Formula: OotSave.SceneFlags (0xD4) + index * 0x1C + 0x10
// These perm slots store both OoT and MM state permanently (never cleared on reset).
const OOT_EXTRA = {
  OOT_TRADE: 0x0E4, // OotExtraTrade  (index 0) — u16 child + u16 adult, bits = XITEM_OOT_CHILD/ADULT_*
  OOT_ITEMS: 0x100, // OotExtraItems  (index 1) — rutoLetter:1(bit15), hookshot:2, shield:2, ocarina:2, ...
  MM_BOSS:   0x138, // MmExtraBoss    (index 3)
  MM_ITEMS:  0x154, // MmExtraItems   (index 4)
  MM_TRADE:  0x170, // MmExtraTrade   (index 5) — tradeObtained1 tracks trade items given via item_add.c
  MM_FLAGS:  0x18C, // MmExtraFlags   (index 6)
  MM_FLAGS2: 0x1A8, // MmExtraFlags2  (index 7)
};

// Reads MM items embedded in the OoT perm flags (SAVE_EXTRA_RECORD).
// Uses raise() — only increases item levels, never clears.
// applyMmSave() is authoritative once "ZELDA3" is present; this supplements it.
//
// Scope: only the flags set by item_add.c (the randomizer item-give path) are reliable.
// MmExtraFlags/MmExtraFlags2 mask/song bits are set only by MM NPC actors,
// not by item_add.c, so they won't fire when items are found in OoT. Excluded.
function applyOotSaveExtra(buf: Uint8Array, yItems: YMap<number>): void {
  function raise(id: string, level: number): void {
    if (level > (yItems.get(id) ?? 0)) yItems.set(id, level);
  }

  // MmExtraBoss: boss is a plain u8 at the first byte (set by dungeon.c on boss defeat).
  // Bits: 0=Odolwa, 1=Goht, 2=Gyorg, 3=Twinmold.
  const boss = buf[OOT_EXTRA.MM_BOSS];
  raise('remains_odolwa',   (boss >> 0) & 1);
  raise('remains_goht',     (boss >> 1) & 1);
  raise('remains_gyorg',    (boss >> 2) & 1);
  raise('remains_twinmold', (boss >> 3) & 1);

  // MmExtraItems — u32 bitfield, set by item_add.c whenever the MM item is received in OoT.
  // GCC big-endian MIPS: first declared field = MSB.
  // Layout: hookshot:2(31-30), ocarina:2(29-28), goldDust:1(27), hammerGFS:2(26-25),
  //         boomPicto:2(24-23), bowSlingshot:2(22-21), unused:21(20-0).
  // hookshot/ocarina use |=(1<<level-1): level1=bit0 of field, level2=bit1 of field.
  // boomPicto/hammerGFS/bowSlingshot use |=(1<<param): param bit = field LSB + param.
  const mxi = u32be(buf, OOT_EXTRA.MM_ITEMS);
  raise('mm_hookshot',   ((mxi >> 30) & 3) >= 1 ? 1 : 0); // hookshot:2 at bits 31-30
  raise('mm_ocarina',    ((mxi >> 28) & 3) >= 1 ? 1 : 0); // ocarina:2 at bits 29-28
  // goldDust:1(bit27) — set when bottled gold dust obtained in OoT (affects MM smithy quest)
  // boomPicto:2(24-23): param0=pictobox(bit23), param1=boomerang(bit24)
  raise('mm_pictobox',   (mxi >> 23) & 1);
  raise('mm_boomerang',  (mxi >> 24) & 1);
  // hammerGFS:2(26-25): param0=GFS(bit25), param1=hammer(bit26)
  raise('mm_fairysword', (mxi >> 25) & 1);
  raise('mm_hammer',     (mxi >> 26) & 1);
  // bowSlingshot:2(22-21): param0=bow(bit21), param1=slingshot(bit22)
  raise('mm_bow',        (mxi >> 21) & 1);
  raise('mm_slingshot',  (mxi >> 22) & 1);

  // OotExtraTrade — u16 child + u16 adult, set by item_add.c when OoT trade items are received.
  // child/adult are plain u16 values; XITEM_OOT_CHILD/ADULT_N = bit N (1 << N) of the respective u16.
  // These bits are never cleared, so raise() is correct — items stay tracked after being given away.
  const child = u16be(buf, OOT_EXTRA.OOT_TRADE);
  const adult = u16be(buf, OOT_EXTRA.OOT_TRADE + 2);
  // Child trade sequence (XITEM_OOT_CHILD_*):
  raise('trade_c_egg',    (child >> 0) & 1);  // WEIRD_EGG = 0
  raise('trade_c_cucco',  (child >> 1) & 1);  // CHICKEN = 1
  raise('trade_c_letter', (child >> 2) & 1);  // ZELDA_LETTER = 2
  // Mask shop sequence (obtained as part of child trade):
  raise('mask_keaton_oot', (child >> 3) & 1); // KEATON_MASK = 3
  raise('mask_skull_oot',  (child >> 4) & 1); // SKULL_MASK = 4
  raise('mask_spooky_oot', (child >> 5) & 1); // SPOOKY_MASK = 5
  raise('mask_bunny_oot',  (child >> 6) & 1); // BUNNY_HOOD = 6
  raise('mask_goron_oot',  (child >> 7) & 1); // GORON_MASK = 7
  raise('mask_zora_oot',   (child >> 8) & 1); // ZORA_MASK = 8
  raise('mask_gerudo_oot', (child >> 9) & 1); // GERUDO_MASK = 9
  raise('mask_truth_oot',  (child >> 10) & 1);// MASK_OF_TRUTH = 10
  // Adult trade sequence (XITEM_OOT_ADULT_*):
  raise('trade_a_cucco',    (adult >> 1) & 1); // POCKET_CUCCO = 1 (pocket egg has no tracker ID)
  raise('trade_a_cojiro',   (adult >> 2) & 1); // COJIRO = 2
  raise('trade_a_mushroom', (adult >> 3) & 1); // ODD_MUSHROOM = 3
  raise('trade_a_potion',   (adult >> 4) & 1); // ODD_POTION = 4
  raise('trade_a_saw',      (adult >> 5) & 1); // POACHER_SAW = 5
  raise('trade_a_broken',   (adult >> 6) & 1); // BROKEN_GORON_SWORD = 6
  raise('trade_a_rx',       (adult >> 7) & 1); // PRESCRIPTION = 7
  raise('trade_a_frog',     (adult >> 8) & 1); // EYEBALL_FROG = 8
  raise('trade_a_drops',    (adult >> 9) & 1); // EYE_DROPS = 9
  raise('trade_a_claim',    (adult >> 10) & 1);// CLAIM_CHECK = 10

  // OotExtraItems — big-endian bitfield u16; rutoLetter is the first (MSB) bit at position 15.
  // Set when Ruto's Letter is received; persists even after delivering to King Zora.
  const oxi = u16be(buf, OOT_EXTRA.OOT_ITEMS);
  raise('bottle_letter', (oxi >> 15) & 1); // rutoLetter:1

  // MmExtraTrade — u32 bitfield set by item_add.c when MM trade items are received.
  // Big-endian MIPS layout: trade1:6(31-26), trade2:5(25-21), trade3:5(20-16),
  //   tradeObtained1:6(15-10), tradeObtained2:5(9-5), tradeObtained3:5(4-0).
  // tradeObtained1 bits (XITEM_MM_TRADE1_*): 0=SpellFire, 1=MoonTear, 2=DeedLand,
  //   3=DeedSwamp, 4=DeedMountain, 5=DeedOcean.
  // bit N of tradeObtained1 = bit (10+N) of u32 value.
  const mxt = u32be(buf, OOT_EXTRA.MM_TRADE);
  raise('mm_tear',  (mxt >> 11) & 1); // XITEM_MM_TRADE1_MOON_TEAR = 1
  raise('mm_deed1', (mxt >> 12) & 1); // XITEM_MM_TRADE1_DEED_LAND = 2
  raise('mm_deed2', (mxt >> 13) & 1); // XITEM_MM_TRADE1_DEED_SWAMP = 3
  raise('mm_deed3', (mxt >> 14) & 1); // XITEM_MM_TRADE1_DEED_MOUNTAIN = 4
  raise('mm_deed4', (mxt >> 15) & 1); // XITEM_MM_TRADE1_DEED_OCEAN = 5
  // XITEM_MM_TRADE1_SPELL_FIRE=0 → bit10, TRADE2_SPELL_WIND=0 → bit5, TRADE3_SPELL_LOVE=0 → bit0
  raise('mm_spell_fire', (mxt >> 10) & 1);
  raise('mm_spell_wind', (mxt >>  5) & 1);
  raise('mm_spell_love',  mxt        & 1);
  // UI aliases: trade_c_skull/spooky/bunny/truth mirror the mask_*_oot bits
  raise('trade_c_skull',  (child >>  4) & 1);
  raise('trade_c_spooky', (child >>  5) & 1);
  raise('trade_c_bunny',  (child >>  6) & 1);
  raise('trade_c_truth',  (child >> 10) & 1);
}

// ─── OoT dungeon item lookups (scene ID → OoTMM item ID) ─────────────────────
// OotDungeonItems[scene] bitfield (big-endian MIPS, MSB-first): bossKey=bit0, compass=bit1, map=bit2.
// dungeonKeys[scene] is the current small key count for that dungeon (s8, always >= 0 in practice).

const OOT_SCENE_SMALL_KEY: Record<number, string> = {
   3: 'OOT_SMALL_KEY_FOREST',  4: 'OOT_SMALL_KEY_FIRE',  5: 'OOT_SMALL_KEY_WATER',
   6: 'OOT_SMALL_KEY_SPIRIT',  7: 'OOT_SMALL_KEY_SHADOW', 8: 'OOT_SMALL_KEY_BOTW',
  11: 'OOT_SMALL_KEY_GTG',    12: 'OOT_SMALL_KEY_GF',    13: 'OOT_SMALL_KEY_GANON',
  16: 'OOT_SMALL_KEY_TCG',
};
const OOT_SCENE_BOSS_KEY: Record<number, string> = {
   3: 'OOT_BOSS_KEY_FOREST', 4: 'OOT_BOSS_KEY_FIRE', 5: 'OOT_BOSS_KEY_WATER',
   6: 'OOT_BOSS_KEY_SPIRIT', 7: 'OOT_BOSS_KEY_SHADOW', 10: 'OOT_BOSS_KEY_GANON',
};
const OOT_SCENE_MAP: Record<number, string> = {
  0: 'OOT_MAP_DT', 1: 'OOT_MAP_DC', 2: 'OOT_MAP_JJ',
  3: 'OOT_MAP_FOREST', 4: 'OOT_MAP_FIRE', 5: 'OOT_MAP_WATER',
  6: 'OOT_MAP_SPIRIT', 7: 'OOT_MAP_SHADOW', 8: 'OOT_MAP_BOTW', 9: 'OOT_MAP_IC',
};
const OOT_SCENE_COMPASS: Record<number, string> = {
  0: 'OOT_COMPASS_DT', 1: 'OOT_COMPASS_DC', 2: 'OOT_COMPASS_JJ',
  3: 'OOT_COMPASS_FOREST', 4: 'OOT_COMPASS_FIRE', 5: 'OOT_COMPASS_WATER',
  6: 'OOT_COMPASS_SPIRIT', 7: 'OOT_COMPASS_SHADOW', 8: 'OOT_COMPASS_BOTW', 9: 'OOT_COMPASS_IC',
};

// UI key aliases: boss keys, small keys (scene → UI id differs from OoTMM internal key)
const OOT_SCENE_BK_UI: Record<number, string> = {
   3: 'oot_bk_forest', 4: 'oot_bk_fire',  5: 'oot_bk_water',
   6: 'oot_bk_spirit', 7: 'oot_bk_shadow', 10: 'oot_bk_ganon',
};
const OOT_SCENE_SK_UI: Record<number, string> = {
   3: 'forest_sk', 4: 'fire_sk',  8: 'botw_sk',
  11: 'gtg_sk',   12: 'th_sk',  13: 'gc_sk',
};

// ─── MM dungeon item lookups (index 0=WF, 1=SH, 2=GB, 3=ST) ─────────────────
const MM_IDX_SMALL_KEY  = ['MM_SMALL_KEY_WF', 'MM_SMALL_KEY_SH', 'MM_SMALL_KEY_GB', 'MM_SMALL_KEY_ST'];
const MM_IDX_BOSS_KEY   = ['MM_BOSS_KEY_WF',  'MM_BOSS_KEY_SH',  'MM_BOSS_KEY_GB',  'MM_BOSS_KEY_ST'];
const MM_IDX_MAP        = ['MM_MAP_WF',        'MM_MAP_SH',        'MM_MAP_GB',        'MM_MAP_ST'];
const MM_IDX_COMPASS    = ['MM_COMPASS_WF',    'MM_COMPASS_SH',    'MM_COMPASS_GB',    'MM_COMPASS_ST'];
const MM_IDX_STRAY_FAIRY= ['MM_STRAY_FAIRY_WF','MM_STRAY_FAIRY_SH','MM_STRAY_FAIRY_GB','MM_STRAY_FAIRY_ST','MM_STRAY_FAIRY_TOWN'];
// UI key aliases for MM dungeon items
const MM_IDX_BK_UI = ['mm_bk_wf', 'mm_bk_sh', 'mm_bk_gb', 'mm_bk_st'];
const MM_IDX_SK_UI = ['mm_sk_wf', 'mm_sk_sh', 'mm_sk_gb', 'mm_sk_st'];
const MM_IDX_SF_UI = ['mm_woodfall_stray_fairy','mm_snowhead_stray_fairy','mm_greatbay_stray_fairy','mm_stonetower_stray_fairy','mm_clocktown_stray_fairy'];

// ─── Souls lookup (data-gi.json → 41-byte souls buffer bit positions) ────────
// Byte offsets within the 41-byte souls block for each soul type array:
//   OoT: enemy=0x00(8B), boss=0x10(2B), npc=0x13(8B), animal=0x23(2B), misc=0x27(1B)
//   MM:  enemy=0x08(8B), boss=0x12(1B), npc=0x1B(8B), animal=0x25(2B), misc=0x28(1B)
const SOULS_OOT_OFF: Record<number, number> = { 0: 0x00, 1: 0x10, 2: 0x13, 3: 0x23, 4: 0x27 };
const SOULS_MM_OFF:  Record<number, number> = { 0: 0x08, 1: 0x12, 2: 0x1B, 3: 0x25, 4: 0x28 };

// Maps (bufByteOffset * 8 + bitPos) → OoTMM item ID for every soul GI entry.
let _soulLookupPromise: Promise<Map<number, string>> | null = null;

function getSoulLookup(): Promise<Map<number, string>> {
  if (_soulLookupPromise) return _soulLookupPromise;
  _soulLookupPromise = fetch(giDataUrl)
    .then(r => r.json())
    .then((entries: Array<{ id: string; type?: string; add?: unknown }>) => {
      const map = new Map<number, string>();
      for (const entry of entries) {
        if (entry.type !== 'SOUL' || !Array.isArray(entry.add) || entry.add.length < 2) continue;
        const soulType = entry.add[0] as string;
        const param    = entry.add[1] as number;
        const type     = (param >> 12) & 0xF;
        const bitIndex = param & 0xFFF;
        const arrOff   = soulType === 'OOT_SOUL' ? SOULS_OOT_OFF[type] : SOULS_MM_OFF[type];
        if (arrOff === undefined) continue;
        const bufBit = (arrOff + (bitIndex >> 3)) * 8 + (bitIndex & 7);
        map.set(bufBit, entry.id);
      }
      return map;
    });
  return _soulLookupPromise;
}

// ─── Rusty key bitmap → tracker item maps ────────────────────────────────────
// DOORID_OOT_* enum (doors.h) bit index → oot_rk_* tracker item (null = no tracker item).
const DOORID_OOT_ITEMS: ReadonlyArray<string | null> = [
  'oot_rk_treasure_chest_game',    // 0  DOORID_OOT_TREASURE_CHEST_GAME
  'oot_rk_guard_house',            // 1  DOORID_OOT_GUARD_HOUSE
  null,                            // 2  DOORID_OOT_HYRULE_CASTLE (no tracker item)
  'oot_rk_dog_lady_house',         // 3  DOORID_OOT_DOG_LADY_HOUSE
  'oot_rk_back_alley_house',       // 4  DOORID_OOT_BACK_ALLEY_HOUSE
  'oot_rk_bombchu_shop',           // 5  DOORID_OOT_BOMBCHU_SHOP
  'oot_rk_mask_shop',              // 6  DOORID_OOT_MASK_SHOP
  'oot_rk_child_bazaar',           // 7  DOORID_OOT_CHILD_BAZAAR
  'oot_rk_child_potion_shop',      // 8  DOORID_OOT_CHILD_POTION_SHOP
  'oot_rk_child_shooting_gallery', // 9  DOORID_OOT_CHILD_SHOOTING_GALLERY
  'oot_rk_bombchu_bowling',        // 10 DOORID_OOT_BOMBCHU_BOWLING
  'oot_rk_laboratory',             // 11 DOORID_OOT_LABORATORY
  'oot_rk_fishing_pond',           // 12 DOORID_OOT_FISHING_POND
  'oot_rk_silo',                   // 13 DOORID_OOT_SILO
  'oot_rk_ranch_stable',           // 14 DOORID_OOT_RANCH_STABLE
  'oot_rk_ranch_house',            // 15 DOORID_OOT_RANCH_HOUSE
  'oot_rk_ranch_house_room',       // 16 DOORID_OOT_RANCH_HOUSE_ROOM
  'oot_rk_graveyard',              // 17 DOORID_OOT_GRAVEYARD
  'oot_rk_windmill',               // 18 DOORID_OOT_WINDMILL
  'oot_rk_impa_house',             // 19 DOORID_OOT_IMPA_HOUSE
  'oot_rk_carpenter_house',        // 20 DOORID_OOT_CARPENTER_HOUSE
  'oot_rk_granny_potion_shop',     // 21 DOORID_OOT_GRANNY_POTION_SHOP
  'oot_rk_adult_shooting_gallery', // 22 DOORID_OOT_ADULT_SHOOTING_GALLERY
  'oot_rk_skulltula_house',        // 23 DOORID_OOT_SKULLTULA_HOUSE
  'oot_rk_adult_bazaar',           // 24 DOORID_OOT_ADULT_BAZAAR
  'oot_rk_adult_potion_shop',      // 25 DOORID_OOT_ADULT_POTION_SHOP
  'oot_rk_adult_potion_shop_back', // 26 DOORID_OOT_ADULT_POTION_SHOP_BACK
];

// DOORID_MM_* enum (doors.h) bit index → mm_rk_* tracker item.
const DOORID_MM_ITEMS: ReadonlyArray<string> = [
  'mm_rk_tourist_information',     // 0  DOORID_MM_TOURIST_INFORMATION
  'mm_rk_potion_shop',             // 1  DOORID_MM_POTION_SHOP
  'mm_rk_post_office',             // 2  DOORID_MM_POST_OFFICE
  'mm_rk_swordsman_school',        // 3  DOORID_MM_SWORDSMAN_SCHOOL
  'mm_rk_lottery',                 // 4  DOORID_MM_LOTTERY
  'mm_rk_bomb_shop',               // 5  DOORID_MM_BOMB_SHOP
  'mm_rk_trading_post',            // 6  DOORID_MM_TRADING_POST
  'mm_rk_curiosity_shop',          // 7  DOORID_MM_CURIOSITY_SHOP
  'mm_rk_kafei_hideout',           // 8  DOORID_MM_KAFEI_HIDEOUT
  'mm_rk_town_archery',            // 9  DOORID_MM_TOWN_ARCHERY
  'mm_rk_swamp_archery',           // 10 DOORID_MM_SWAMP_ARCHERY
  'mm_rk_observatory',             // 11 DOORID_MM_OBSERVATORY
  'mm_rk_blacksmith',              // 12 DOORID_MM_BLACKSMITH
  'mm_rk_music_house',             // 13 DOORID_MM_MUSIC_HOUSE
  'mm_rk_laboratory',              // 14 DOORID_MM_LABORATORY
  'mm_rk_beneath_graveyard',       // 15 DOORID_MM_BENEATH_GRAVEYARD
  'mm_rk_dampe_house',             // 16 DOORID_MM_DAMPE_HOUSE
  'mm_rk_mayor_residence',         // 17 DOORID_MM_MAYOR_RESIDENCE
  'mm_rk_mayor_residence_office',  // 18 DOORID_MM_MAYOR_RESIDENCE_OFFICE
  'mm_rk_mayor_residence_salon',   // 19 DOORID_MM_MAYOR_RESIDENCE_SALON
  'mm_rk_mayor_residence_kafei',   // 20 DOORID_MM_MAYOR_RESIDENCE_KAFEI
  'mm_rk_treasure_chest_game',     // 21 DOORID_MM_TREASURE_CHEST_GAME
  'mm_rk_honey_darling',           // 22 DOORID_MM_HONEY_DARLING
  'mm_rk_milk_bar',                // 23 DOORID_MM_MILK_BAR
  'mm_rk_dog_racetrack',           // 24 DOORID_MM_DOG_RACETRACK
  'mm_rk_cucco_shack',             // 25 DOORID_MM_CUCCO_SHACK
  'mm_rk_ranch_house',             // 26 DOORID_MM_RANCH_HOUSE
  'mm_rk_ranch_barn',              // 27 DOORID_MM_RANCH_BARN
  'mm_rk_ranch_house_room',        // 28 DOORID_MM_RANCH_HOUSE_ROOM
  'mm_rk_zora_shop',               // 29 DOORID_MM_ZORA_SHOP
  'mm_rk_zora_japas_room',         // 30 DOORID_MM_ZORA_JAPAS_ROOM
  'mm_rk_zora_tijo_room',          // 31 DOORID_MM_ZORA_TIJO_ROOM
  'mm_rk_zora_lulu_room',          // 32 DOORID_MM_ZORA_LULU_ROOM
  'mm_rk_zora_evan_room',          // 33 DOORID_MM_ZORA_EVAN_ROOM
  'mm_rk_inn_guest_room',          // 34 DOORID_MM_STOCK_POT_INN
  'mm_rk_stock_pot_inn_roof',      // 35 DOORID_MM_STOCK_POT_INN_ROOF
  'mm_rk_grandma_room',            // 36 DOORID_MM_GRANDMA_ROOM
  'mm_rk_stock_pot_inn_staff_room',// 37 DOORID_MM_STOCK_POT_INN_STAFF_ROOM
  'mm_rk_stock_pot_inn_dormitory', // 38 DOORID_MM_STOCK_POT_INN_DORMITORY
];

// ─── OoT silver rupee sets (SR index 0-17 → OoTMM logic item ID) ─────────────
// Packing: gOotSilverRupeeCounts{n} = SAVE_EXTRA_RECORD(u32, 14+n-1).
// count = (u32be(buf, SR_COUNT_OFFS[id >> 2]) >>> ((id & 3) * 8)) & 0xFF
// Source: OoTMM/packages/generator/src/common/sr.c + defs.ts
const SR_ITEMS: readonly string[] = [
  'OOT_RUPEE_SILVER_DC',
  'OOT_RUPEE_SILVER_BOTW',
  'OOT_RUPEE_SILVER_SPIRIT_CHILD',
  'OOT_RUPEE_SILVER_SPIRIT_SUN',
  'OOT_RUPEE_SILVER_SPIRIT_BOULDERS',
  'OOT_RUPEE_SILVER_SHADOW_SCYTHE',
  'OOT_RUPEE_SILVER_SHADOW_PIT',
  'OOT_RUPEE_SILVER_SHADOW_SPIKES',
  'OOT_RUPEE_SILVER_SHADOW_BLADES',
  'OOT_RUPEE_SILVER_IC_SCYTHE',
  'OOT_RUPEE_SILVER_IC_BLOCK',
  'OOT_RUPEE_SILVER_GTG_SLOPES',
  'OOT_RUPEE_SILVER_GTG_LAVA',
  'OOT_RUPEE_SILVER_GTG_WATER',
  'OOT_RUPEE_SILVER_GANON_SPIRIT',
  'OOT_RUPEE_SILVER_GANON_LIGHT',
  'OOT_RUPEE_SILVER_GANON_FIRE',
  'OOT_RUPEE_SILVER_GANON_FOREST',
];
// SAVE_EXTRA_RECORD(u32, 14..18) = 0xD4 + index*0x1C + 0x10
const SR_COUNT_OFFS: readonly number[] = [0x26C, 0x288, 0x2A4, 0x2C0, 0x2DC];

// ─── OoT save parser ─────────────────────────────────────────────────────────

function applyOotSave(buf: Uint8Array, yItems: YMap<number>, strict = false): void {
  // Verify "ZELDAZ" magic — if absent the save slot is empty.
  const magic = String.fromCharCode(...buf.slice(OOT.MAGIC, OOT.MAGIC + 6));
  if (magic !== 'ZELDAZ') return;

  const items = buf.slice(OOT.ITEMS, OOT.ITEMS + 24);
  const equip = u16be(buf, OOT.EQUIP);
  const upg   = u32be(buf, OOT.UPGRADES);
  const quest = u32be(buf, OOT.QUEST);

  // OotEquipment u16 — big-endian, MSB-first bitfield packing (N64 GCC MIPS):
  //   boots:4 (bits 15-12), tunics:4 (11-8), shields:4 (7-4), swords:4 (3-0)
  const swords  = equip & 0xF;
  const shields = (equip >> 4) & 0xF;
  const tunics  = (equip >> 8) & 0xF;
  const boots   = (equip >> 12) & 0xF;

  // OotSaveUpgrades u32 — big-endian, MSB-first:
  //   unused:9, nut:3(22-20), stick:3(19-17), bullet:3(16-14),
  //   wallet:2(13-12), dive:3(11-9), strength:3(8-6), bomb:3(5-3), quiver:3(2-0)
  const quiver   = upg & 7;
  const bombBag  = (upg >> 3) & 7;
  const strength = (upg >> 6) & 7;
  const dive     = (upg >> 9) & 7;   // scale upgrade
  const wallet   = (upg >> 12) & 3;
  const bulletBag= (upg >> 14) & 7;
  const dekuStick= (upg >> 17) & 7;
  const dekuNut  = (upg >> 20) & 7;

  // strict=true (active game): use authoritative overwrite — clears stale items.
  // strict=false (non-active / payload): raise-only to avoid racing with the active save.
  function set(id: string, level: number) {
    if (strict) {
      if (level === 0) yItems.delete(id); else yItems.set(id, level);
    } else {
      if (level > (yItems.get(id) ?? 0)) yItems.set(id, level);
    }
  }
  function raise(id: string, level: number): void {
    if (level > (yItems.get(id) ?? 0)) yItems.set(id, level);
  }

  // ── Inventory items (scan whole array for item ID) ──
  const _sticksOotVal = hasItem(items, OOT_ITEM.STICK) ? Math.max(1, dekuStick) : 0;
  set('sticks_oot', _sticksOotVal);
  set('nuts_oot',   hasItem(items, OOT_ITEM.NUT)    ? Math.max(1, dekuNut)   : 0);
  set('bomb',       hasItem(items, OOT_ITEM.BOMB)   ? Math.max(1, bombBag)   : 0);
  set('bombchu',    hasItem(items, OOT_ITEM.BOMBCHU) ? 1 : 0);
  set('din',        hasItem(items, OOT_ITEM.DINS_FIRE) ? 1 : 0);
  set('farore',     hasItem(items, OOT_ITEM.FARORE_WIND) ? 1 : 0);
  set('nayru',      hasItem(items, OOT_ITEM.NAYRU_LOVE) ? 1 : 0);
  set('boomerang',  hasItem(items, OOT_ITEM.BOOMERANG) ? 1 : 0);
  set('lens',       hasItem(items, OOT_ITEM.LENS) ? 1 : 0);
  set('bean',       buf[OOT.AMMO + 0x0E] ?? 0); // ammo[ITS_OOT_MAGIC_BEAN=0x0E]
  set('hammer',     hasItem(items, OOT_ITEM.HAMMER) ? 1 : 0);

  // Bow: level = quiver upgrade (tracks arrow capacity). Fire/ice/light are separate.
  const hasBow = hasItem(items, OOT_ITEM.BOW) || hasItem(items, OOT_ITEM.ARROW_FIRE)
              || hasItem(items, OOT_ITEM.ARROW_ICE) || hasItem(items, OOT_ITEM.ARROW_LIGHT);
  set('bow',           hasBow ? Math.max(1, quiver) : 0);
  set('arrow_fire_oot', hasItem(items, OOT_ITEM.ARROW_FIRE)  ? 1 : 0);
  set('arrow_ice_oot',  hasItem(items, OOT_ITEM.ARROW_ICE)   ? 1 : 0);
  set('arrow_light_oot',hasItem(items, OOT_ITEM.ARROW_LIGHT) ? 1 : 0);

  // Slingshot: level = bullet bag size
  set('slingshot', hasItem(items, OOT_ITEM.SLINGSHOT) ? Math.max(1, bulletBag) : 0);

  // Hookshot vs Longshot
  set('hookshot', hasItem(items, OOT_ITEM.HOOKSHOT) ? 1
                : hasItem(items, OOT_ITEM.LONGSHOT)  ? 2 : 0);

  // Ocarina: Fairy=1, Time=2
  set('ocarina', hasItem(items, OOT_ITEM.OCARINA_TIME)  ? 2
               : hasItem(items, OOT_ITEM.OCARINA_FAIRY) ? 1 : 0);

  // Bottles: count slots with a bottle value (0x14..0x1F)
  let bottleCount = 0;
  for (let i = 0; i < 24; i++) {
    const v = items[i];
    if (v >= 0x14 && v <= 0x1F) bottleCount++;
  }
  set('bottle_1', bottleCount >= 1 ? 1 : 0);
  set('bottle_2', bottleCount >= 2 ? 1 : 0);
  set('bottle_3', bottleCount >= 3 ? 1 : 0);

  // ── Equipment — OotEquipment is a bitmask per equipment.h:
  //   swords:  KOKIRI=0x01, MASTER=0x02, KNIFE(Biggoron)=0x04, KNIFE_BROKEN(Giant)=0x08
  //   shields: DEKU=0x01,   HYLIAN=0x02, MIRROR=0x04
  //   tunics:  KOKIRI=0x01, GORON=0x02,  ZORA=0x04
  //   boots:   KOKIRI=0x01, IRON=0x02,   HOVER=0x04
  // Multiple bits can be set simultaneously (e.g. Deku+Hylian at start = 0x03).
  // Using >= would falsely trigger the higher-tier item — always use bit checks.
  // Magic: level 0=none, 1=half bar, 2=full double bar
  set('magic_oot', buf[OOT.MAGIC_ACQUIRED] ? (buf[OOT.DOUBLE_MAGIC] ? 2 : 1) : 0);

  set('sword_kokiri',  (swords  & 0x01) ? 1 : 0);
  set('sword_master',  (swords  & 0x02) ? 1 : 0);
  set('sword_biggoron',(swords  & 0x04) ? 1 : 0); // EQ_OOT_SWORD_KNIFE
  set('giant_knife',   (swords  & 0x08) ? 1 : 0); // EQ_OOT_SWORD_KNIFE_BROKEN
  set('trade_a_biggoron', (swords & 0x04) ? 1 : 0); // UI alias: broken goron sword / biggoron sword
  set('deku_shield',   (shields & 0x01) ? 1 : 0);
  set('hyrule_shield', (shields & 0x02) ? 1 : 0);
  set('shield_mirror', (shields & 0x04) ? 1 : 0);
  set('tunic_goron',   (tunics  & 0x02) ? 1 : 0);
  set('tunic_zora',    (tunics  & 0x04) ? 1 : 0);
  set('boots_iron',    (boots   & 0x02) ? 1 : 0);
  set('boots_hover',   (boots   & 0x04) ? 1 : 0);

  // ── Upgrades ──
  set('strength', strength);   // 1=Goron Bracelet, 2=Silver, 3=Gold
  set('scale',    dive);       // 1=Silver Scale, 2=Gold Scale
  set('wallet',   wallet);     // 0=starter(undimmed), 1=Adult, 2=Giant, 3=Tycoon

  // ── Quest items (OotSaveQuest bitfield, bit 0 = MSB in struct = LSB of u32 value) ──
  // bit 0 = medallionForest, 1 = medallionFire, ... 5 = medallionLight,
  // 6 = songTpForest (Minuet), ... 17 = songStorms,
  // 18 = stoneEmerald, 19 = stoneRuby, 20 = stoneSapphire, 21 = agony, 22 = gerudoCard
  set('medal_forest',    (quest >> 0)  & 1);
  set('medal_fire',      (quest >> 1)  & 1);
  set('medal_water',     (quest >> 2)  & 1);
  set('medal_spirit',    (quest >> 3)  & 1);
  set('medal_shadow',    (quest >> 4)  & 1);
  set('medal_light',     (quest >> 5)  & 1);
  set('oot_song_minuet', (quest >> 6)  & 1);
  set('oot_song_bolero', (quest >> 7)  & 1);
  set('oot_song_serenade',(quest >> 8) & 1);
  set('oot_song_requiem', (quest >> 9) & 1);
  set('oot_song_nocturne',(quest >> 10)& 1);
  set('oot_song_prelude', (quest >> 11)& 1);
  set('oot_song_zelda',   (quest >> 12)& 1);
  set('oot_song_epona',   (quest >> 13)& 1);
  set('oot_song_saria',   (quest >> 14)& 1);
  set('oot_song_sun',     (quest >> 15)& 1);
  set('oot_song_time',    (quest >> 16)& 1);
  set('oot_song_storms',  (quest >> 17)& 1);
  set('stone_emerald',    (quest >> 18)& 1);
  set('stone_ruby',       (quest >> 19)& 1);
  set('stone_sapphire',   (quest >> 20)& 1);
  set('agony',            (quest >> 21)& 1);
  set('gerudo_card',      (quest >> 22)& 1);

  // ── Dungeon items: OotDungeonItems[20] at 0xA8 ──
  // Bitfield (big-endian MIPS, MSB-first): bossKey=bit0, compass=bit1, map=bit2.
  for (let scene = 0; scene < 20 && OOT.DUNG_ITEMS + scene < buf.length; scene++) {
    const b = buf[OOT.DUNG_ITEMS + scene];
    if (OOT_SCENE_BOSS_KEY[scene])   { set(OOT_SCENE_BOSS_KEY[scene],   b & 1); }
    if (OOT_SCENE_BK_UI[scene])      { set(OOT_SCENE_BK_UI[scene],      b & 1); }
    if (OOT_SCENE_COMPASS[scene])    set(OOT_SCENE_COMPASS[scene],   (b >> 1) & 1);
    if (OOT_SCENE_MAP[scene])        set(OOT_SCENE_MAP[scene],       (b >> 2) & 1);
  }
  // ── Dungeon keys: dungeonKeys[19] at 0xBC ──
  // s8 array: -1 (0xFF) = dungeon not yet visited → clamp to 0.
  for (const [sceneStr, id] of Object.entries(OOT_SCENE_SMALL_KEY)) {
    const off = OOT.DUNG_KEYS + Number(sceneStr);
    if (off < buf.length) {
      const raw = buf[off];
      const keyCount = Math.max(0, raw > 127 ? raw - 256 : raw);
      set(id, keyCount);
      const uiId = OOT_SCENE_SK_UI[Number(sceneStr)];
      if (uiId) set(uiId, keyCount);
    }
  }

  // ── Gold skulltulas ──
  if (OOT.GOLD_TOKENS + 1 < buf.length) {
    const gsCount = u16be(buf, OOT.GOLD_TOKENS);
    set('OOT_GS_TOKEN', gsCount);
    set('skulltula_token', gsCount);
  }

  // ── Big Poe (ITEM_OOT_BIG_POE = 0x1E in any bottle slot) ──
  set('OOT_BIG_POE', hasItem(items, 0x1E) ? 1 : 0);

  // ── Triforce pieces (requires 0x300 buffer) ──
  if (buf.length >= OOT.TRIFORCE + 4) {
    const tf = u32be(buf, OOT.TRIFORCE);
    set('OOT_TRIFORCE', tf);
    raise('sh_triforce', tf);
  }

  // ── OoT silver rupees: 18 sets, counts packed as u8 in 5 u32 SAVE_EXTRA_RECORD values ──
  // All offsets (0x26C–0x2DF) are within the 0x300 buffer expanded earlier.
  if (buf.length >= SR_COUNT_OFFS[4] + 4) {
    for (let id = 0; id < SR_ITEMS.length; id++) {
      const u32val = u32be(buf, SR_COUNT_OFFS[id >> 2]);
      set(SR_ITEMS[id], (u32val >>> ((id & 3) * 8)) & 0xFF);
    }
  }

  // Cross-game equipment sync: OoT equipment → MM equivalents.
  // OoTMM's item_add.c does not write boots/tunics/shields/magic/upgrades
  // to the payload MM save, so we mirror them here so MM tracker checks see them.
  raise('mm_boots_iron',  (boots   & 0x02) ? 1 : 0);
  raise('mm_boots_hover', (boots   & 0x04) ? 1 : 0);
  raise('mm_tunic_goron', (tunics  & 0x02) ? 1 : 0);
  raise('mm_tunic_zora',  (tunics  & 0x04) ? 1 : 0);
  raise('mm_mirror',      (shields & 0x04) ? 1 : 0);
  // Shared upgrade equivalents (for logic engine's SHARED_* keys)
  raise('shared_wallet',   wallet);
  raise('shared_strength', strength);
  raise('shared_scale',    dive);
  raise('shared_magic',    buf[OOT.MAGIC_ACQUIRED] ? (buf[OOT.DOUBLE_MAGIC] ? 2 : 1) : 0);
  // Mirror OoT equipment upgrades to MM tracker keys — item_add.c writes to gMmSave
  // directly for shared settings, so mm_wallet and mm_magic are handled by applyMmSave.
  // Boots/tunics/mirror use raise because the EQUIP field only records what's currently
  // equipped, not all owned items; gMmSave.upgrades/playerData are reliable for the rest.
  raise('mm_strength', strength);
  raise('mm_scale',    dive);

  // MM items embedded in OoT perm flags (visible before first MM visit).
  applyOotSaveExtra(buf, yItems);
}

// Parses the payload copy of gMmSave (items obtained in OoT, before sync to native MM save).
// Uses raise semantics — supplements applyMmSave without overriding it.
function applyPayloadMmSave(buf: Uint8Array, yItems: YMap<number>): void {
  const magic = String.fromCharCode(...buf.slice(MM.MAGIC, MM.MAGIC + 6));
  if (magic !== 'ZELDA3') return;
  applyMmSave(buf, yItems);
}

// Reads gSharedCustomSave.oot.hasSong* — set by item_add.c when MM songs are found in OoT.
// b0 = byte at offset 0x362, b1 = byte at offset 0x363 within SharedCustomSave.
// GCC big-endian MIPS allocates u8 bitfields from MSB: first field = bit 7, last = bit 0.
// OotCustomSave layout: hasElegy(7), chateauActive(6), hasSongHealing(5), hasSongSoaring(4),
// hasSongAwakening(3), hasSongGoronHalf(2), hasSongGoron(1), hasSongZora(0) — b1 bit7 = hasSongOrder.
// raise semantics: songs set here can also come from native MM save; we must not clear them.
function applySharedCustomSave(b0: number, b1: number, yItems: YMap<number>): void {
  function raise(id: string, level: number): void {
    if (level > (yItems.get(id) ?? 0)) yItems.set(id, level);
  }
  raise('mm_song_elegy',   (b0 >> 7) & 1);   // hasElegy
  raise('mm_song_healing', (b0 >> 5) & 1);   // hasSongHealing
  raise('mm_song_soaring', (b0 >> 4) & 1);   // hasSongSoaring
  raise('mm_song_sonata',  (b0 >> 3) & 1);   // hasSongAwakening (Sonata of Awakening)
  // Goron's Lullaby: hasSongGoron(bit1)=full(level 2), hasSongGoronHalf(bit2)=intro(level 1)
  const lullabyLevel = ((b0 >> 1) & 1) ? 2 : ((b0 >> 2) & 1) ? 1 : 0;
  raise('mm_song_lullaby', lullabyLevel);
  raise('mm_song_nova',    (b0 >> 0) & 1);   // hasSongZora (New Wave Bossa Nova)
  raise('mm_song_oath',    (b1 >> 7) & 1);   // hasSongOrder
}

// ─── MM save parser ───────────────────────────────────────────────────────────

function applyMmSave(buf: Uint8Array, yItems: YMap<number>, strict = false): void {
  const magic = String.fromCharCode(...buf.slice(MM.MAGIC, MM.MAGIC + 6));
  if (magic !== 'ZELDA3') return;

  const items = buf.slice(MM.ITEMS, MM.ITEMS + 48);
  const equip = u16be(buf, MM.EQUIP);
  const upg   = u32be(buf, MM.UPGRADES);
  const quest = u32be(buf, MM.QUEST);

  // MmItemEquips u16 — big-endian, MSB-first:
  //   boots:4 (15-12), tunic:4 (11-8), shield:4 (7-4), sword:4 (3-0)
  const mmSword  = equip & 0xF;
  const mmShield = (equip >> 4) & 0xF;
  const mmTunic  = (equip >> 8) & 0xF;
  const mmBoots  = (equip >> 12) & 0xF;

  // MmUpgrades u32 — same layout as OotSaveUpgrades but with scale instead of dive:
  //   unused:9, nut:3(22-20), stick:3(19-17), bullet:3(16-14),
  //   wallet:2(13-12), scale:3(11-9), strength:3(8-6), bomb:3(5-3), quiver:3(2-0)
  const mmQuiver   = upg & 7;
  const mmBombBag  = (upg >> 3) & 7;
  const mmStrength = (upg >> 6) & 7;
  const mmScale    = (upg >> 9) & 7;
  const mmWallet   = (upg >> 12) & 3;
  const mmBulletBag= (upg >> 14) & 7;
  const mmDekuStick= (upg >> 17) & 7;
  const mmDekuNut  = (upg >> 20) & 7;

  // strict=true (active game): authoritative overwrite — clears stale items.
  // strict=false (non-active / payload): raise-only to avoid racing with the active save.
  function set(id: string, level: number) {
    if (strict) {
      if (level === 0) yItems.delete(id); else yItems.set(id, level);
    } else {
      if (level > (yItems.get(id) ?? 0)) yItems.set(id, level);
    }
  }
  // Trade items leave inventory when given — never let the tracker remove them once obtained.
  function raise(id: string, level: number): void {
    if (level > (yItems.get(id) ?? 0)) yItems.set(id, level);
  }

  // ── Inventory scan ──
  raise('mm_ocarina',    hasItem(items, MM_ITEM.OCARINA_TIME) ? 1 : 0);
  raise('mm_bow',        hasItem(items, MM_ITEM.BOW) || hasItem(items, 0xB7) ? Math.max(1, mmQuiver) : 0);
  set('mm_arrow_fire', hasItem(items, MM_ITEM.ARROW_FIRE)  ? 1 : 0);
  set('mm_arrow_ice',  hasItem(items, MM_ITEM.ARROW_ICE)   ? 1 : 0);
  set('mm_arrow_light',hasItem(items, MM_ITEM.ARROW_LIGHT) ? 1 : 0);
  set('mm_bomb',       hasItem(items, MM_ITEM.BOMB)   ? Math.max(1, mmBombBag) : 0);
  set('mm_bombchu',    hasItem(items, MM_ITEM.BOMBCHU) ? 1 : 0);
  const _mmStickVal = hasItem(items, MM_ITEM.STICK) ? Math.max(1, mmDekuStick) : 0;
  set('mm_stick', _mmStickVal);
  set('mm_nuts',       hasItem(items, MM_ITEM.NUT)    ? Math.max(1, mmDekuNut)   : 0);
  set('mm_bean',       hasItem(items, MM_ITEM.BEANS) ? 1 : 0);
  set('mm_keg',        hasItem(items, MM_ITEM.POWDER_KEG) ? 1 : 0);
  raise('mm_pictobox',   hasItem(items, MM_ITEM.PICTOBOX) || hasItem(items, 0xB6) ? 1 : 0);
  raise('mm_hookshot',   hasItem(items, MM_ITEM.HOOKSHOT)    ? 1 : 0);
  raise('mm_fairysword', hasItem(items, MM_ITEM.FAIRY_SWORD) ? 1 : 0);
  raise('mm_hammer',     hasItem(items, 0xB5)                ? 1 : 0);
  raise('mm_tear',     hasItem(items, MM_ITEM.MOON_TEAR)    ? 1 : 0);
  raise('mm_deed1',    hasItem(items, MM_ITEM.DEED_LAND)    ? 1 : 0);
  raise('mm_deed2',    hasItem(items, MM_ITEM.DEED_SWAMP)   ? 1 : 0);
  raise('mm_deed3',    hasItem(items, MM_ITEM.DEED_MOUNTAIN)? 1 : 0);
  raise('mm_deed4',    hasItem(items, MM_ITEM.DEED_OCEAN)   ? 1 : 0);
  raise('mm_roomkey',  hasItem(items, MM_ITEM.ROOM_KEY)     ? 1 : 0);
  raise('mm_delivery', hasItem(items, MM_ITEM.LETTER_MAMA)  ? 1 : 0);
  raise('mm_letter',   hasItem(items, MM_ITEM.LETTER_KAFEI) ? 1 : 0);
  raise('mm_pendant',  hasItem(items, MM_ITEM.PENDANT)      ? 1 : 0);

  // Transformation masks
  set('mask_deku',         hasItem(items, MM_ITEM.MASK_DEKU)  ? 1 : 0);
  set('mask_goron',        hasItem(items, MM_ITEM.MASK_GORON) ? 1 : 0);
  set('mask_zora',         hasItem(items, MM_ITEM.MASK_ZORA)  ? 1 : 0);
  set('mask_fierce_deity', hasItem(items, MM_ITEM.MASK_FD)    ? 1 : 0);

  // Regular masks
  set('mask_truth_mm',    hasItem(items, MM_ITEM.MASK_TRUTH)         ? 1 : 0);
  set('mask_kafei',       hasItem(items, MM_ITEM.MASK_KAFEI)         ? 1 : 0);
  set('mask_all_night',   hasItem(items, MM_ITEM.MASK_ALL_NIGHT)     ? 1 : 0);
  set('mask_bunny',       hasItem(items, MM_ITEM.MASK_BUNNY)         ? 1 : 0);
  set('mask_keaton',      hasItem(items, MM_ITEM.MASK_KEATON)        ? 1 : 0);
  set('mask_garo',        hasItem(items, MM_ITEM.MASK_GARO)          ? 1 : 0);
  set('mask_romani',      hasItem(items, MM_ITEM.MASK_ROMANI)        ? 1 : 0);
  set('mask_circus_leader',hasItem(items, MM_ITEM.MASK_TROUPE_LEADER)? 1 : 0);
  set('mask_postman',     hasItem(items, MM_ITEM.MASK_POSTMAN)       ? 1 : 0);
  set('mm_mask_couple',    hasItem(items, MM_ITEM.MASK_COUPLE)       ? 1 : 0);
  set('mask_couple',       hasItem(items, MM_ITEM.MASK_COUPLE)       ? 1 : 0);
  set('mm_mask_great_fairy',hasItem(items, MM_ITEM.MASK_GREAT_FAIRY) ? 1 : 0);
  set('mask_great_fairy',  hasItem(items, MM_ITEM.MASK_GREAT_FAIRY)  ? 1 : 0);
  set('mm_mask_gibdo',    hasItem(items, MM_ITEM.MASK_GIBDO)         ? 1 : 0);
  set('mask_gibdo',        hasItem(items, MM_ITEM.MASK_GIBDO)        ? 1 : 0);
  set('mm_mask_don_gero', hasItem(items, MM_ITEM.MASK_DON_GERO)      ? 1 : 0);
  set('mask_don_gero',     hasItem(items, MM_ITEM.MASK_DON_GERO)     ? 1 : 0);
  set('mm_mask_kamaro',   hasItem(items, MM_ITEM.MASK_KAMARO)        ? 1 : 0);
  set('mask_kamaro',       hasItem(items, MM_ITEM.MASK_KAMARO)       ? 1 : 0);
  set('mm_mask_captain',  hasItem(items, MM_ITEM.MASK_CAPTAIN)       ? 1 : 0);
  set('mask_captain_hat',  hasItem(items, MM_ITEM.MASK_CAPTAIN)      ? 1 : 0);
  set('mm_mask_stone',    hasItem(items, MM_ITEM.MASK_STONE)         ? 1 : 0);
  set('mask_stone',        hasItem(items, MM_ITEM.MASK_STONE)        ? 1 : 0);
  set('mm_mask_bremen',   hasItem(items, MM_ITEM.MASK_BREMEN)        ? 1 : 0);
  set('mask_bremen',       hasItem(items, MM_ITEM.MASK_BREMEN)       ? 1 : 0);
  set('mm_mask_blast',    hasItem(items, MM_ITEM.MASK_BLAST)         ? 1 : 0);
  set('mask_blast',        hasItem(items, MM_ITEM.MASK_BLAST)        ? 1 : 0);
  set('mm_mask_scents',   hasItem(items, MM_ITEM.MASK_SCENTS)        ? 1 : 0);
  set('mask_scents',       hasItem(items, MM_ITEM.MASK_SCENTS)       ? 1 : 0);
  set('mm_mask_giant',    hasItem(items, MM_ITEM.MASK_GIANT)         ? 1 : 0);
  set('mask_giant',        hasItem(items, MM_ITEM.MASK_GIANT)        ? 1 : 0);

  // Bottles
  let mmBottles = 0;
  for (let i = 0; i < 48; i++) {
    const v = items[i];
    if (v >= MM_ITEM.BOTTLE_EMPTY && v <= 0x27) mmBottles++;
  }
  set('mm_bottle_1', mmBottles >= 1 ? 1 : 0);
  set('mm_bottle_2', mmBottles >= 2 ? 1 : 0);
  set('mm_bottle_3', mmBottles >= 3 ? 1 : 0);
  set('mm_bottle_4', mmBottles >= 4 ? 1 : 0);
  set('mm_bottle_5', mmBottles >= 5 ? 1 : 0);
  // Big Poe (ITEM_MM_BIG_POE = 0x1E in any bottle slot)
  set('MM_BIG_POE', hasItem(items, MM_ITEM.BIG_POE) ? 1 : 0);

  // Magic: item_add.c writes gMmSave.isMagicAcquired directly (for both own and shared-magic),
  // so the native MM save is authoritative. Use set() so non-shared seeds correctly clear mm_magic.
  set('mm_magic', buf[MM.MAGIC_ACQUIRED] ? (buf[MM.DOUBLE_MAGIC] ? 2 : 1) : 0);

  // ── Equipment ──
  // In strict mode (active MM game): use set() so the native EQUIP register authoritatively
  // clears items that were raised by applyOotSave cross-sync but aren't present in MM.
  // oot_save is always emitted before mm_save, so mm_save wins on every poll cycle.
  // In non-strict mode (payload / OoT raise-only): set() degrades to raise (same behaviour).
  set('mm_sword',      mmSword);
  set('mm_shield',      mmShield >= 1 ? 1 : 0);
  set('mm_mirror',      mmShield >= 2 ? 1 : 0);
  set('mm_tunic_goron', mmTunic >= 2 ? 1 : 0);
  set('mm_tunic_zora',  mmTunic >= 3 ? 1 : 0);
  set('mm_boots_iron',  mmBoots >= 2 ? 1 : 0);
  set('mm_boots_hover', mmBoots >= 3 ? 1 : 0);

  // ── Upgrades ──
  set('mm_strength', mmStrength);
  set('mm_scale',    mmScale);
  set('mm_wallet',   mmWallet);

  // ── Quest items (MmQuestItems bitfield) ──
  // bit 0 = remainsOdolwa, 1 = remainsGoht, 2 = remainsGyorg, 3 = remainsTwinmold
  // bit 6 = songAwakening, 7 = songLullaby(full), 8 = songNewWave, 9 = songEmpty,
  // 10 = songOrder, 11 = songSaria, 12 = songTime, 13 = songHealing,
  // 14 = songEpona, 15 = songSoaring, 16 = songStorms, 17 = songSun, 18 = notebook
  // bit 24 = songLullabyIntro
  set('remains_odolwa',  (quest >> 0)  & 1);
  set('remains_goht',    (quest >> 1)  & 1);
  set('remains_gyorg',   (quest >> 2)  & 1);
  set('remains_twinmold',(quest >> 3)  & 1);
  set('mm_song_sonata',  (quest >> 6)  & 1);
  // Goron's Lullaby: level 1 = intro, level 2 = full
  set('mm_song_lullaby', (quest >> 7) & 1 ? 2 : (quest >> 24) & 1 ? 1 : 0);
  set('mm_song_nova',    (quest >> 8)  & 1);
  set('mm_song_elegy',   (quest >> 9)  & 1);
  set('mm_song_oath',    (quest >> 10) & 1);
  set('mm_song_saria',   (quest >> 11) & 1);
  set('mm_song_time',    (quest >> 12) & 1);
  set('mm_song_healing', (quest >> 13) & 1);
  set('mm_song_epona',   (quest >> 14) & 1);
  set('mm_song_soaring', (quest >> 15) & 1);
  set('mm_song_storms',  (quest >> 16) & 1);
  set('mm_song_sun',     (quest >> 17) & 1);
  set('mm_bomber',       (quest >> 18) & 1);

  // ── Dungeon items: MmDungeonItems[10] at 0xC0 (indices 0-3 = WF/SH/GB/ST) ──
  for (let i = 0; i < 4 && MM.DUNG_ITEMS + i < buf.length; i++) {
    const b = buf[MM.DUNG_ITEMS + i];
    set(MM_IDX_BOSS_KEY[i],  b & 1);
    set(MM_IDX_BK_UI[i],     b & 1);
    set(MM_IDX_COMPASS[i],  (b >> 1) & 1);
    set(MM_IDX_MAP[i],      (b >> 2) & 1);
  }
  // ── Dungeon keys: dungeonKeys[9] at 0xCA — s8, -1 = not visited → clamp to 0 ──
  for (let i = 0; i < 4 && MM.DUNG_KEYS + i < buf.length; i++) {
    const raw = buf[MM.DUNG_KEYS + i];
    const keyCount = Math.max(0, raw > 127 ? raw - 256 : raw);
    set(MM_IDX_SMALL_KEY[i], keyCount);
    set(MM_IDX_SK_UI[i],     keyCount);
  }
  // ── Stray fairies: strayFairies[10] at 0xD4 (0=WF,1=SH,2=GB,3=ST,4=Town) ──
  for (let i = 0; i < 5 && MM.STRAY_FAIRIES + i < buf.length; i++) {
    set(MM_IDX_STRAY_FAIRY[i], buf[MM.STRAY_FAIRIES + i]);
    set(MM_IDX_SF_UI[i], buf[MM.STRAY_FAIRIES + i]);
  }
}

// ─── CONFVAR bit-index tables (dev vs release) ─────────────────────────────────
// These arrays map CONFVAR name → bit index within config[0x40] at offset 0xEC.
// Dev (HEAD) has 291 entries; Release (v30.1) has 241 entries with different indices
// due to ~50 entry insertions/removals between versions.
// Generated from OoTMM/packages/generator/lib/combo/confvars.ts

const CONFVAR_DEV: readonly string[] = [
  'GANON_NO_BOSS_KEY','SMALL_KEY_SHUFFLE','CSMC','CSMC_SKULLTULA','CSMC_COW',
  'OOT_PROGRESSIVE_SHIELDS','OOT_PROGRESSIVE_SWORDS','OOT_PROGRESSIVE_SWORDS_GORON',
  'MM_PROGRESSIVE_SHIELDS','MM_PROGRESSIVE_LULLABY','OOT_PROGRESSIVE_LULLABY',
  'DOOR_OF_TIME_OPEN','ER_DUNGEONS','ER_MAJOR_DUNGEONS','SHARED_SWORDS',
  'SHARED_BOWS','SHARED_BOMB_BAGS','SHARED_MAGIC','SHARED_MAGIC_ARROW_FIRE',
  'SHARED_MAGIC_ARROW_ICE','SHARED_MAGIC_ARROW_LIGHT','SHARED_SONG_EPONA',
  'SHARED_SONG_STORMS','SHARED_SONG_TIME','SHARED_SONG_ZELDA','SHARED_SONG_SARIA',
  'SHARED_SONG_SUN','SHARED_SONG_TP_FOREST','SHARED_SONG_TP_FIRE',
  'SHARED_SONG_TP_WATER','SHARED_SONG_TP_SPIRIT','SHARED_SONG_TP_SHADOW',
  'SHARED_SONG_TP_LIGHT','SHARED_NUTS_STICKS','SHARED_HOOKSHOT','SHARED_LENS',
  'SHARED_OCARINA','SHARED_MASK_GORON','SHARED_MASK_ZORA','SHARED_MASK_BUNNY',
  'SHARED_MASK_TRUTH','SHARED_MASK_KEATON','SHARED_WALLETS','SHARED_HEALTH',
  'SHARED_SOULS_ENEMY','SHARED_SOULS_NPC','SHARED_SOULS_ANIMAL','SHARED_SOULS_MISC',
  'SHARED_OCARINA_BUTTONS','SHARED_SHIELDS','SHARED_SPELL_FIRE','SHARED_SPELL_WIND',
  'SHARED_SPELL_LOVE','SHARED_BOOTS_IRON','SHARED_BOOTS_HOVER','SHARED_TUNIC_GORON',
  'SHARED_TUNIC_ZORA','SHARED_SCALES','SHARED_STRENGTH','SHARED_BOTTLES',
  'MM_CROSS_AGE','MM_OCARINA_FAIRY','MM_HOOKSHOT_SHORT','MM_SONG_ZELDA',
  'MM_SONG_SARIA','MM_SONG_SUN','MM_SONG_TP_FOREST','MM_SONG_TP_FIRE',
  'MM_SONG_TP_WATER','MM_SONG_TP_SPIRIT','MM_SONG_TP_SHADOW','MM_SONG_TP_LIGHT',
  'OOT_SKIP_ZELDA','OOT_ADULT_KAKARIKO_GATE','OOT_OPEN_KAKARIKO_GATE','ER_ANY',
  'OOT_LACS_CUSTOM','OOT_GANON_BK_CUSTOM','OOT_KZ_OPEN','OOT_KZ_OPEN_ADULT',
  'GOAL_GANON','GOAL_MAJORA','GOAL_TRIFORCE','MM_MAJORA_CHILD_CUSTOM',
  'FILL_WALLETS','CHILD_WALLET',
  'OOT_OPEN_DEKU','OOT_CLOSED_DEKU','OOT_ADULT_DEKU','OOT_ADULT_WELL',
  'COLOSSAL_WALLET','BOTTOMLESS_WALLET',
  'OOT_AGELESS_STICKS','OOT_AGELESS_BOW','OOT_AGELESS_SLINGSHOT','OOT_AGELESS_BOOTS',
  'OOT_AGELESS_STRENGTH','OOT_AGELESS_SWORDS','OOT_AGELESS_HAMMER',
  'OOT_AGELESS_GREAT_FAIRY_SWORD','OOT_AGELESS_SOARING',
  'MM_OWL_SHUFFLE','CSMC_AGONY',
  'OOT_CARPENTERS_ONE','OOT_CARPENTERS_NONE',
  'OOT_NO_BOSS_KEY','OOT_NO_SMALL_KEY','MM_NO_BOSS_KEY','MM_NO_SMALL_KEY',
  'CSMC_HEARTS','CSMC_MAP_COMPASS',
  'OOT_BLUE_FIRE_ARROWS','OOT_SUNLIGHT_ARROWS','ER_BOSS','OOT_SILVER_RUPEE_SHUFFLE',
  'OOT_FREE_SCARECROW',
  'OOT_SOULS_ENEMY','MM_SOULS_ENEMY','OOT_SOULS_BOSS','MM_SOULS_BOSS',
  'OOT_SOULS_NPC','MM_SOULS_NPC','OOT_SOULS_ANIMAL','MM_SOULS_ANIMAL',
  'OOT_SOULS_MISC','MM_SOULS_MISC',
  'MM_REMOVED_FAIRIES','SHARED_SKELETON_KEY','SHARED_PLATINUM_TOKEN',
  'OOT_SHUFFLE_MASK_TRADES','MENU_NOTEBOOK',
  'OOT_AGELESS_CHILD_TRADE','OOT_START_ADULT','HINT_IMPORTANCE','GOAL_TRIFORCE3',
  'OOT_OCARINA_BUTTONS','MM_OCARINA_BUTTONS','OOT_AGE_CHANGE','OOT_AGE_CHANGE_NEEDS_OOT',
  'OOT_TRIAL_LIGHT','OOT_TRIAL_FOREST','OOT_TRIAL_FIRE','OOT_TRIAL_WATER',
  'OOT_TRIAL_SHADOW','OOT_TRIAL_SPIRIT',
  'MM_PROGRESSIVE_GFS','OOT_CHEST_GAME_SHUFFLE','MM_CLIMB_MOST_SURFACES','ER_MOON',
  'MM_OPEN_MOON','NO_BROKEN_ACTORS','SHARED_BOMBCHU','ER_WALLMASTERS',
  'OOT_OPEN_MASK_SHOP',
  'OOT_BRIDGE_VANILLA','OOT_BRIDGE_MEDALLIONS','OOT_BRIDGE_CUSTOM',
  'MULTIPLAYER',
  'MM_OPEN_WF','MM_OPEN_SH','MM_OPEN_GB','MM_OPEN_ST',
  'MM_CLEAR_OPEN_WF','MM_CLEAR_OPEN_GB',
  'MM_SPELL_FIRE','MM_SPELL_WIND','MM_SPELL_LOVE','MM_BOOTS_IRON','MM_BOOTS_HOVER',
  'MM_TUNIC_GORON','MM_TUNIC_ZORA','MM_SCALES','MM_STRENGTH','MM_KEG_STRENGTH_3',
  'OOT_GANON_BOSS_KEY_HINT',
  'BLAST_MASK_DELAY_INSTANT','BLAST_MASK_DELAY_VERYSHORT','BLAST_MASK_DELAY_SHORT',
  'BLAST_MASK_DELAY_LONG','BLAST_MASK_DELAY_VERYLONG',
  'OOT_MASK_BLAST','OOT_MASK_STONE','OOT_MASK_KAMARO',
  'OOT_SONG_EMPTINESS','OOT_SONG_HEALING','OOT_SONG_SOARING',
  'OOT_SONG_AWAKENING','OOT_SONG_GORON','OOT_SONG_ZORA','OOT_SONG_ORDER',
  'SHARED_MASK_BLAST','SHARED_MASK_STONE','SHARED_MASK_KAMARO',
  'SHARED_SONG_EMPTINESS','SHARED_SONG_HEALING','SHARED_SONG_SOARING',
  'SHARED_SONG_AWAKENING','SHARED_SONG_GORON','SHARED_SONG_ZORA','SHARED_SONG_ORDER',
  'OOT_POWDER_KEG','SHARED_POWDER_KEG',
  'MM_FD_ANYWHERE',
  'MM_CLOCK_SPEED_VERYSLOW','MM_CLOCK_SPEED_SLOW','MM_CLOCK_SPEED_FAST',
  'MM_CLOCK_SPEED_VERYFAST','MM_CLOCK_SPEED_SUPERFAST',
  'MM_AUTO_INVERT_ALWAYS','MM_AUTO_INVERT_FIRST_CYCLE','MM_MOON_CRASH_CYCLE',
  'OOT_OPEN_ZD_SHORTCUT',
  'MM_CLOCKS','MM_CLOCKS_PROGRESSIVE','MM_CLOCKS_PROGRESSIVE_REVERSE',
  'ER_GROTTOS','ER_OVERWORLD','ER_INDOORS','ER_REGIONS_OVERWORLD',
  'CROSS_GAME_FW','RUPEE_SCALING',
  'OOT_SWORDLESS_ADULT','OOT_TIME_TRAVEL_REQUIRES_MS','OOT_EXTRA_CHILD_SWORDS',
  'MM_DEKU_SHIELD','BRONZE_SCALE',
  'ONLY_OOT','ONLY_MM',
  'MM_KEEP_ITEMS_RESET','MM_KEEP_BOTTLES_RESET','MM_FAST_MASKS',
  'OOT_PLANTED_BEANS',
  'OOT_OPEN_JABU_JABU','OOT_OPEN_SHADOW_TEMPLE','OOT_OPEN_DODONGO_CAVERN',
  'OOT_OPEN_WATER_TEMPLE','OOT_OPEN_WELL',
  'OOT_SONG_OF_DOUBLE_TIME',
  'MM_PRE_ACTIVATED_OWL_CT','MM_PRE_ACTIVATED_OWL_MR','MM_PRE_ACTIVATED_OWL_SS',
  'MM_PRE_ACTIVATED_OWL_WF','MM_PRE_ACTIVATED_OWL_MV','MM_PRE_ACTIVATED_OWL_SH',
  'MM_PRE_ACTIVATED_OWL_GB','MM_PRE_ACTIVATED_OWL_ZC','MM_PRE_ACTIVATED_OWL_IC',
  'MM_PRE_ACTIVATED_OWL_ST',
  'MM_WELL_OPEN',
  'MM_HAMMER','SHARED_HAMMER','MM_BOOMERANG','SHARED_BOOMERANG',
  'OOT_GREAT_FAIRY_SWORD','SHARED_GREAT_FAIRY_SWORD',
  'MM_SLINGSHOT','SHARED_SLINGSHOT',
  'MM_MASK_GERUDO','SHARED_MASK_GERUDO','MM_MASK_SKULL','SHARED_MASK_SKULL','MM_MASK_SPOOKY','SHARED_MASK_SPOOKY',
  'MM_UPGRADES_STICKS_NUTS','OOT_SHUFFLE_EGGS',
  'MM_STONE_OF_AGONY','SHARED_STONE_OF_AGONY',
  'OOT_MUST_START_WITH_MS','OOT_SPIN_UPGRADE','SHARED_SPIN_UPGRADE',
  'MM_JP_LAYOUT_DEKU_PALACE',
  'REGION_STATE_DUNGEONS','REGION_STATE_REWARDS','REGION_STATE_FREE',
  'MM_EASY_LIGHTBLOCKS','SONG_NOTES','OOT_ICE_ARROW_PLATFORMS',
  'OOT_SONG_EVENTS_SHUFFLE','MM_SONG_EVENTS_SHUFFLE',
  'OOT_DMG_MULT_2','OOT_DMG_MULT_4','OOT_DMG_MULT_8',
  'OOT_DMG_MULT_OHKO','MM_DMG_MULT_2','MM_DMG_MULT_4','MM_DMG_MULT_8','MM_DMG_MULT_OHKO',
  'MM_MOON_COND_OPEN','MM_MOON_COND_VANILLA','MM_MOON_COND_CUSTOM',
  'OOT_AIR_PHYSICS_MM','OOT_RUSTY_KEYS','MM_RUSTY_KEYS','MM_TELESCOPE_ER',
  'OOT_HYPER_ENEMIES','MM_HYPER_ENEMIES','OOT_BOW_SLINGSHOT_BREAK_HIVES',
];

// Matches OoTMM releases/v31 (identical to master as of 2026-07).
const CONFVAR_RELEASE: readonly string[] = [
  'GANON_NO_BOSS_KEY','SMALL_KEY_SHUFFLE','CSMC','CSMC_SKULLTULA','CSMC_COW',
  'OOT_PROGRESSIVE_SHIELDS','OOT_PROGRESSIVE_SWORDS','OOT_PROGRESSIVE_SWORDS_GORON',
  'MM_PROGRESSIVE_SHIELDS','MM_PROGRESSIVE_LULLABY','OOT_PROGRESSIVE_LULLABY',
  'DOOR_OF_TIME_OPEN','ER_DUNGEONS','ER_MAJOR_DUNGEONS',
  'SHARED_SWORDS','SHARED_BOWS','SHARED_BOMB_BAGS','SHARED_MAGIC',
  'SHARED_MAGIC_ARROW_FIRE','SHARED_MAGIC_ARROW_ICE','SHARED_MAGIC_ARROW_LIGHT',
  'SHARED_SONG_EPONA','SHARED_SONG_STORMS','SHARED_SONG_TIME','SHARED_SONG_ZELDA','SHARED_SONG_SARIA',
  'SHARED_SONG_SUN','SHARED_SONG_TP_FOREST','SHARED_SONG_TP_FIRE',
  'SHARED_SONG_TP_WATER','SHARED_SONG_TP_SPIRIT','SHARED_SONG_TP_SHADOW','SHARED_SONG_TP_LIGHT',
  'SHARED_NUTS_STICKS','SHARED_HOOKSHOT','SHARED_LENS','SHARED_OCARINA',
  'SHARED_MASK_GORON','SHARED_MASK_ZORA','SHARED_MASK_BUNNY','SHARED_MASK_TRUTH',
  'SHARED_MASK_KEATON','SHARED_WALLETS','SHARED_HEALTH','SHARED_SOULS_ENEMY',
  'SHARED_SOULS_NPC','SHARED_SOULS_ANIMAL','SHARED_SOULS_MISC',
  'SHARED_OCARINA_BUTTONS','SHARED_SHIELDS','SHARED_SPELL_FIRE','SHARED_SPELL_WIND',
  'SHARED_SPELL_LOVE','SHARED_BOOTS_IRON','SHARED_BOOTS_HOVER','SHARED_TUNIC_GORON',
  'SHARED_TUNIC_ZORA','SHARED_SCALES','SHARED_STRENGTH','SHARED_BOTTLES',
  'MM_CROSS_AGE','MM_OCARINA_FAIRY','MM_HOOKSHOT_SHORT',
  'MM_SONG_ZELDA','MM_SONG_SARIA','MM_SONG_SUN',
  'MM_SONG_TP_FOREST','MM_SONG_TP_FIRE','MM_SONG_TP_WATER',
  'MM_SONG_TP_SPIRIT','MM_SONG_TP_SHADOW','MM_SONG_TP_LIGHT',
  'OOT_SKIP_ZELDA','OOT_ADULT_KAKARIKO_GATE','OOT_OPEN_KAKARIKO_GATE','ER_ANY',
  'OOT_LACS_CUSTOM','OOT_GANON_BK_CUSTOM','OOT_KZ_OPEN','OOT_KZ_OPEN_ADULT',
  'GOAL_GANON','GOAL_MAJORA','GOAL_TRIFORCE','MM_MAJORA_CHILD_CUSTOM',
  'FILL_WALLETS','CHILD_WALLET',
  'OOT_OPEN_DEKU','OOT_CLOSED_DEKU','OOT_ADULT_DEKU','OOT_ADULT_WELL',
  'COLOSSAL_WALLET','BOTTOMLESS_WALLET',
  'OOT_AGELESS_STICKS','OOT_AGELESS_BOW','OOT_AGELESS_SLINGSHOT','OOT_AGELESS_BOOTS',
  'OOT_AGELESS_STRENGTH','OOT_AGELESS_SWORDS','OOT_AGELESS_HAMMER',
  'OOT_AGELESS_GREAT_FAIRY_SWORD','OOT_AGELESS_SOARING',
  'MM_OWL_SHUFFLE','CSMC_AGONY',
  'OOT_CARPENTERS_ONE','OOT_CARPENTERS_NONE',
  'OOT_NO_BOSS_KEY','OOT_NO_SMALL_KEY','MM_NO_BOSS_KEY','MM_NO_SMALL_KEY',
  'CSMC_HEARTS','CSMC_MAP_COMPASS',
  'OOT_BLUE_FIRE_ARROWS','OOT_SUNLIGHT_ARROWS','ER_BOSS','OOT_SILVER_RUPEE_SHUFFLE',
  'OOT_FREE_SCARECROW',
  'OOT_SOULS_ENEMY','MM_SOULS_ENEMY','OOT_SOULS_BOSS','MM_SOULS_BOSS',
  'OOT_SOULS_NPC','MM_SOULS_NPC','OOT_SOULS_ANIMAL','MM_SOULS_ANIMAL',
  'OOT_SOULS_MISC','MM_SOULS_MISC',
  'MM_REMOVED_FAIRIES','SHARED_SKELETON_KEY','SHARED_PLATINUM_TOKEN',
  'OOT_SHUFFLE_MASK_TRADES','MENU_NOTEBOOK',
  'OOT_AGELESS_CHILD_TRADE','OOT_START_ADULT','HINT_IMPORTANCE','GOAL_TRIFORCE3',
  'OOT_OCARINA_BUTTONS','MM_OCARINA_BUTTONS','OOT_AGE_CHANGE','OOT_AGE_CHANGE_NEEDS_OOT',
  'OOT_TRIAL_LIGHT','OOT_TRIAL_FOREST','OOT_TRIAL_FIRE','OOT_TRIAL_WATER',
  'OOT_TRIAL_SHADOW','OOT_TRIAL_SPIRIT',
  'MM_PROGRESSIVE_GFS','OOT_CHEST_GAME_SHUFFLE','MM_CLIMB_MOST_SURFACES','ER_MOON',
  'MM_OPEN_MOON','NO_BROKEN_ACTORS','SHARED_BOMBCHU','ER_WALLMASTERS',
  'OOT_OPEN_MASK_SHOP',
  'OOT_BRIDGE_VANILLA','OOT_BRIDGE_MEDALLIONS','OOT_BRIDGE_CUSTOM',
  'MULTIPLAYER',
  'MM_OPEN_WF','MM_OPEN_SH','MM_OPEN_GB','MM_OPEN_ST',
  'MM_CLEAR_OPEN_WF','MM_CLEAR_OPEN_GB',
  'MM_SPELL_FIRE','MM_SPELL_WIND','MM_SPELL_LOVE','MM_BOOTS_IRON','MM_BOOTS_HOVER',
  'MM_TUNIC_GORON','MM_TUNIC_ZORA','MM_SCALES','MM_STRENGTH','MM_KEG_STRENGTH_3',
  'OOT_GANON_BOSS_KEY_HINT',
  'BLAST_MASK_DELAY_INSTANT','BLAST_MASK_DELAY_VERYSHORT','BLAST_MASK_DELAY_SHORT',
  'BLAST_MASK_DELAY_LONG','BLAST_MASK_DELAY_VERYLONG',
  'OOT_MASK_BLAST','OOT_MASK_STONE','OOT_MASK_KAMARO',
  'OOT_SONG_EMPTINESS','OOT_SONG_HEALING','OOT_SONG_SOARING',
  'OOT_SONG_AWAKENING','OOT_SONG_GORON','OOT_SONG_ZORA','OOT_SONG_ORDER',
  'SHARED_MASK_BLAST','SHARED_MASK_STONE','SHARED_MASK_KAMARO',
  'SHARED_SONG_EMPTINESS','SHARED_SONG_HEALING','SHARED_SONG_SOARING',
  'SHARED_SONG_AWAKENING','SHARED_SONG_GORON','SHARED_SONG_ZORA','SHARED_SONG_ORDER',
  'OOT_POWDER_KEG','SHARED_POWDER_KEG',
  'MM_FD_ANYWHERE',
  'MM_CLOCK_SPEED_VERYSLOW','MM_CLOCK_SPEED_SLOW','MM_CLOCK_SPEED_FAST',
  'MM_CLOCK_SPEED_VERYFAST','MM_CLOCK_SPEED_SUPERFAST',
  'MM_AUTO_INVERT_ALWAYS','MM_AUTO_INVERT_FIRST_CYCLE','MM_MOON_CRASH_CYCLE',
  'OOT_OPEN_ZD_SHORTCUT',
  'MM_CLOCKS','MM_CLOCKS_PROGRESSIVE','MM_CLOCKS_PROGRESSIVE_REVERSE',
  'ER_GROTTOS','ER_OVERWORLD','ER_INDOORS','ER_REGIONS_OVERWORLD',
  'CROSS_GAME_FW','RUPEE_SCALING',
  'OOT_SWORDLESS_ADULT','OOT_TIME_TRAVEL_REQUIRES_MS','OOT_EXTRA_CHILD_SWORDS',
  'MM_DEKU_SHIELD','BRONZE_SCALE',
  'ONLY_OOT','ONLY_MM',
  'MM_KEEP_ITEMS_RESET','MM_KEEP_BOTTLES_RESET','MM_FAST_MASKS',
  'OOT_PLANTED_BEANS',
  'OOT_OPEN_JABU_JABU','OOT_OPEN_SHADOW_TEMPLE','OOT_OPEN_DODONGO_CAVERN',
  'OOT_OPEN_WATER_TEMPLE','OOT_OPEN_WELL',
  'OOT_SONG_OF_DOUBLE_TIME',
  'MM_PRE_ACTIVATED_OWL_CT','MM_PRE_ACTIVATED_OWL_MR','MM_PRE_ACTIVATED_OWL_SS',
  'MM_PRE_ACTIVATED_OWL_WF','MM_PRE_ACTIVATED_OWL_MV','MM_PRE_ACTIVATED_OWL_SH',
  'MM_PRE_ACTIVATED_OWL_GB','MM_PRE_ACTIVATED_OWL_ZC','MM_PRE_ACTIVATED_OWL_IC',
  'MM_PRE_ACTIVATED_OWL_ST',
  'MM_WELL_OPEN',
  'MM_HAMMER','SHARED_HAMMER','MM_BOOMERANG','SHARED_BOOMERANG',
  'OOT_GREAT_FAIRY_SWORD','SHARED_GREAT_FAIRY_SWORD',
  'MM_SLINGSHOT','SHARED_SLINGSHOT',
  'MM_MASK_GERUDO','SHARED_MASK_GERUDO','MM_MASK_SKULL','SHARED_MASK_SKULL','MM_MASK_SPOOKY','SHARED_MASK_SPOOKY',
  'MM_UPGRADES_STICKS_NUTS','OOT_SHUFFLE_EGGS',
  'MM_STONE_OF_AGONY','SHARED_STONE_OF_AGONY',
  'OOT_MUST_START_WITH_MS','OOT_SPIN_UPGRADE','SHARED_SPIN_UPGRADE',
  'MM_JP_LAYOUT_DEKU_PALACE',
  'REGION_STATE_DUNGEONS','REGION_STATE_REWARDS','REGION_STATE_FREE',
  'MM_EASY_LIGHTBLOCKS','SONG_NOTES','OOT_ICE_ARROW_PLATFORMS',
  'OOT_SONG_EVENTS_SHUFFLE','MM_SONG_EVENTS_SHUFFLE',
  'OOT_DMG_MULT_2','OOT_DMG_MULT_4','OOT_DMG_MULT_8',
  'OOT_DMG_MULT_OHKO','MM_DMG_MULT_2','MM_DMG_MULT_4','MM_DMG_MULT_8','MM_DMG_MULT_OHKO',
  'MM_MOON_COND_OPEN','MM_MOON_COND_VANILLA','MM_MOON_COND_CUSTOM',
  'OOT_AIR_PHYSICS_MM','OOT_RUSTY_KEYS','MM_RUSTY_KEYS','MM_TELESCOPE_ER',
  'OOT_HYPER_ENEMIES','MM_HYPER_ENEMIES','OOT_BOW_SLINGSHOT_BREAK_HIVES',
];

// Lazy-built: for each dev index, the corresponding release index (-1 if dev-only).
let _devToRelease: number[] | null = null;
function buildDevToRelease(): void {
  if (_devToRelease) return;
  _devToRelease = CONFVAR_DEV.map(name => CONFVAR_RELEASE.indexOf(name));
}

// ─── ComboConfig auto-apply (settings + dungeon ER) ──────────────────────────
// buf: the 0x12C-byte ComboConfig header from RDRAM.
//   dungeonEntrances[26] u32[26] at offset 52    → dungeon ER connections
//   config[0x40]         u8[64]  at offset 0xEC  → all confvar bits (settings)
// romVersion: "dev" or "release" — controls CONFVAR index translation.

const DUNGEON_ENTRANCES = [
  'OOT_DEKU_TREE',    'OOT_DODONGO_CAVERN',    'OOT_JABU_JABU',
  'OOT_TEMPLE_FOREST','OOT_TEMPLE_FIRE',        'OOT_TEMPLE_WATER',
  'OOT_TEMPLE_SHADOW','OOT_TEMPLE_SPIRIT',
  'MM_TEMPLE_WOODFALL','MM_TEMPLE_SNOWHEAD',     'MM_TEMPLE_GREAT_BAY',
  'MM_TEMPLE_STONE_TOWER_INVERTED','MM_TEMPLE_STONE_TOWER',
  'MM_SPIDER_HOUSE_SWAMP','MM_SPIDER_HOUSE_OCEAN',
  'OOT_BOTTOM_OF_THE_WELL','OOT_ICE_CAVERN','OOT_GERUDO_TRAINING_GROUNDS',
  'MM_BENEATH_THE_WELL','MM_IKANA_CASTLE','MM_SECRET_SHRINE',
  'MM_BENEATH_THE_WELL_BACK','MM_PIRATE_FORTRESS',
  'OOT_GANON_CASTLE','OOT_GANON_TOWER','MM_MOON',
] as const;

// Reads dungeonEntrances[26] from the ComboConfig header and sets yEntrances for
// all 26 dungeon connections. Only applies when dungeon ER is actually enabled —
// when disabled, dungeonEntrances[] is zero-filled (all entries → index 0 = OOT_DEKU_TREE).
function applyDungeonEntrances(buf: Uint8Array, yEntrances: YMap<string>, romVersion?: string): void {
  // Check ER_DUNGEONS (dev idx 12) and ER_MAJOR_DUNGEONS (dev idx 13) confvar bits.
  const CFG = 0xEC;
  const isDev = romVersion !== 'release';
  if (!isDev) buildDevToRelease();
  const confBit = (devIdx: number): boolean => {
    const idx = isDev ? devIdx : (_devToRelease![devIdx] ?? -1);
    if (idx === -1) return false;
    const off = CFG + (idx >> 3);
    return off < buf.length && (buf[off] & (1 << (idx & 7))) !== 0;
  };
  if (!confBit(12) && !confBit(13)) return;

  // Dungeon connections are now tracked via player_entrance events (one at a time as the player visits).
}

function applyComboConfig(buf: Uint8Array, ySettings: YMap<unknown>, romVersion?: string): void {
  // Version-adaptive CONFVAR bit lookup.
  // In dev mode, bit(X) reads directly at index X.
  // In release mode, translates dev index X → release index via precomputed mapping.
  // Dev-only settings (not in release confvars) return false.
  const isDev = romVersion !== 'release';
  if (!isDev) buildDevToRelease();
  // config[0x40] starts at byte 0xEC (236) within the 0x12C-byte header.
  const CFG = 0xEC;
  function bit(devIdx: number): boolean {
    const idx = isDev ? devIdx : (_devToRelease![devIdx] ?? -1);
    if (idx === -1) return false;
    const byteOff = CFG + (idx >> 3);
    return byteOff < buf.length && (buf[byteOff] & (1 << (idx & 7))) !== 0;
  }
  function set(key: string, val: unknown = true): void { ySettings.set(key, val); }
  function del(key: string): void { ySettings.delete(key); }
  function toggle(key: string, v: boolean): void {
    if (v) _comboConfigTruePersist.add(key);
    const effective = v || _comboConfigTruePersist.has(key);
    effective ? set(key) : del(key);
  }

  // ── Shared items (indices 14-59, 127-128, 151, 190-201, 250-263) ──────────
  toggle('sharedSwords',          bit(14));
  toggle('sharedBows',            bit(15));
  toggle('sharedBombBags',        bit(16));
  toggle('sharedMagic',           bit(17));
  toggle('sharedMagicArrowFire',  bit(18));
  toggle('sharedMagicArrowIce',   bit(19));
  toggle('sharedMagicArrowLight', bit(20));
  toggle('sharedNutsSticks',      bit(33));
  toggle('sharedHookshot',        bit(34));
  toggle('sharedLens',            bit(35));
  toggle('sharedOcarina',         bit(36));
  toggle('sharedMaskGoron',       bit(37));
  toggle('sharedMaskZora',        bit(38));
  toggle('sharedMaskBunny',       bit(39));
  toggle('sharedMaskTruth',       bit(40));
  toggle('sharedMaskKeaton',      bit(41));
  toggle('sharedWallets',         bit(42));
  toggle('sharedHealth',          bit(43));
  toggle('sharedSoulsEnemy',      bit(44));
  toggle('sharedSoulsNpc',        bit(45));
  toggle('sharedSoulsAnimal',     bit(46));
  toggle('sharedSoulsMisc',       bit(47));
  toggle('sharedOcarinaButtons',  bit(48));
  toggle('sharedShields',         bit(49));
  toggle('sharedSpellFire',       bit(50));
  toggle('sharedSpellWind',       bit(51));
  toggle('sharedSpellLove',       bit(52));
  toggle('sharedBootsIron',       bit(53));
  toggle('sharedBootsHover',      bit(54));
  toggle('sharedTunicGoron',      bit(55));
  toggle('sharedTunicZora',       bit(56));
  toggle('sharedScales',          bit(57));
  toggle('sharedStrength',        bit(58));
  toggle('sharedBottles',         bit(59));
  toggle('sharedSkeletonKey',     bit(127));
  toggle('sharedPlatinumToken',   bit(128));
  toggle('sharedBombchuBags',     bit(151));
  toggle('sharedMaskBlast',       bit(190));
  toggle('sharedMaskStone',       bit(191));
  toggle('sharedMaskKamaro',      bit(192));
  toggle('sharedPowderKeg',       bit(201));
  toggle('sharedHammer',          bit(250));
  toggle('sharedBoomerang',       bit(252));
  toggle('sharedGFS',             bit(254));
  toggle('sharedSlingshot',       bit(256));
  toggle('sharedStoneAgony',      bit(266));
  toggle('sharedSpinUpgrade',     bit(269));

  // ── Shared OoT songs (indices 21-32) ─────────────────────────────────────
  toggle('sharedSongEpona',        bit(21));
  toggle('sharedSongStorms',       bit(22));
  toggle('sharedSongTime',         bit(23));
  toggle('sharedSongZeldaLullaby', bit(24));
  toggle('sharedSongSaria',        bit(25));
  toggle('sharedSongSun',          bit(26));
  toggle('sharedSongMinuet',       bit(27));
  toggle('sharedSongBolero',       bit(28));
  toggle('sharedSongSerenade',     bit(29));
  toggle('sharedSongRequiem',      bit(30));
  toggle('sharedSongNocturne',     bit(31));
  toggle('sharedSongPrelude',      bit(32));

  // ── Shared MM songs (193-199) — Emptiness/Healing/Soaring/Awakening/Goron/Zora/Order
  toggle('sharedSongElegy',   bit(193));
  toggle('sharedSongHealing', bit(194));
  toggle('sharedSongSoaring', bit(195));
  toggle('sharedSongSonata',  bit(196));  // SHARED_SONG_AWAKENING = Sonata of Awakening
  toggle('sharedSongLullaby', bit(197));  // SHARED_SONG_GORON = Goron's Lullaby
  toggle('sharedSongNova',    bit(198));  // SHARED_SONG_ZORA = New Wave Bossa Nova
  toggle('sharedSongOath',    bit(199));  // SHARED_SONG_ORDER = Oath to Order

  // ── MM songs in OoT pool (183-189) ───────────────────────────────────────
  toggle('crossGameSongElegy', bit(183));  // OOT_SONG_EMPTINESS = Elegy of Emptiness in OoT
  toggle('songHealingOot',     bit(184));
  toggle('songSoaringOot',     bit(185));
  toggle('songAwakeningOot',   bit(186));
  toggle('songGoronOot',       bit(187));
  toggle('songZoraOot',        bit(188));
  toggle('songOrderOot',       bit(189));

  // ── OoT songs in MM pool (63-71) ─────────────────────────────────────────
  toggle('songZeldaLullabyMm', bit(63));
  toggle('songSariasMm',       bit(64));
  toggle('songSunMm',          bit(65));
  toggle('songMinuetMm',       bit(66));
  toggle('songBoleroMm',       bit(67));
  toggle('songSerenadeMm',     bit(68));
  toggle('songRequiemMm',      bit(69));
  toggle('songNocturneMm',     bit(70));
  toggle('songPreludeMm',      bit(71));

  // Derived: crossGameSongs = any cross-game song is enabled
  const crossGameSongKeys: string[] = [
    'crossGameSongElegy','songHealingOot','songSoaringOot','songAwakeningOot',
    'songGoronOot','songZoraOot','songOrderOot',
    'songZeldaLullabyMm','songSariasMm','songSunMm','songMinuetMm',
    'songBoleroMm','songSerenadeMm','songRequiemMm','songNocturneMm','songPreludeMm',
  ];
  toggle('crossGameSongs', crossGameSongKeys.some(k => ySettings.get(k) === true));

  // ── MM extensions: OoT items available in MM pool (164-173, 180-182, 200, 224, 249-263) ──
  toggle('spellFireMm',    bit(164));
  toggle('spellWindMm',    bit(165));
  toggle('spellLoveMm',    bit(166));
  toggle('bootsIronMm',    bit(167));
  toggle('bootsHoverMm',   bit(168));
  toggle('tunicGoronMm',   bit(169));
  toggle('tunicZoraMm',    bit(170));
  toggle('scalesMm',       bit(171));
  toggle('strengthMm',     bit(172));
  toggle('kegStrength3',   bit(173));
  toggle('blastMaskOot',   bit(180));
  toggle('stoneMaskOot',   bit(181));
  toggle('kamaroMaskOot',  bit(182));
  toggle('powderKegOot',   bit(200));
  toggle('dekuShieldMm',   bit(224));
  toggle('hammerMm',       bit(249));
  toggle('boomerangMm',    bit(251));
  toggle('gfsOot',         bit(253));
  toggle('slingshotMm',    bit(255));
  toggle('spinUpgradeOot', bit(268));
  toggle('stoneAgonyMm',   bit(265));
  toggle('fairyOcarinaMm', bit(61));
  toggle('shortHookshotMm',bit(62));

  // ── ER settings ───────────────────────────────────────────────────────────
  toggle('erDungeons',      bit(12));
  toggle('erMajorDungeons', bit(13));
  toggle('erBoss',          bit(113));
  toggle('erMoon',          bit(148));
  toggle('erWallmasters',   bit(152));
  toggle('erGrottos',       bit(215));
  toggle('erOverworld',     bit(216));  // ER_OVERWORLD
  toggle('erIndoors',       bit(217));  // ER_INDOORS
  toggle('erRegions',       bit(218));  // ER_REGIONS_OVERWORLD

  // ── Goal (select from bits 80-82, 134) ───────────────────────────────────
  {
    const ganon = bit(80), majora = bit(81), triforce = bit(82), t3 = bit(134);
    if (t3)                    set('goal', 'triforce3');
    else if (triforce)         set('goal', 'triforce');
    else if (ganon && majora)  set('goal', 'both');
    else if (ganon)            set('goal', 'ganon');
    else if (majora)           set('goal', 'majora');
    else                       set('goal', 'both');  // default = both ganon+majora
  }

  // ── Starting age (select, 132) ────────────────────────────────────────────
  if (bit(132)) set('startingAge', 'adult');
  else          del('startingAge');

  // ── Door of Time (select, 11) ─────────────────────────────────────────────
  if (bit(11))  set('doorOfTime', 'open');
  else          del('doorOfTime');

  // ── Kakariko gate (select, 73-74) ────────────────────────────────────────
  if (bit(74))       set('kakarikoGate', 'open');
  else if (bit(73))  set('kakarikoGate', 'adult');
  else               del('kakarikoGate');

  // ── Moon crash (select, 210) ──────────────────────────────────────────────
  if (bit(210)) set('moonCrash', 'cycle');
  else          del('moonCrash');

  // ── Open moon (bool, 149) ─────────────────────────────────────────────────
  toggle('openMoon', bit(149));

  // ── MM moon condition (select, 287-289) ───────────────────────────────────
  if (bit(289))      set('moon', 'custom');
  else if (bit(288)) set('moon', 'vanilla');
  else if (bit(287)) set('moon', 'open');
  else               del('moon');

  // ── Per-game souls (116-125) ──────────────────────────────────────────────
  toggle('soulsEnemyOot',  bit(116));
  toggle('soulsBossOot',   bit(118));
  toggle('soulsNpcOot',    bit(120));
  toggle('soulsAnimalOot', bit(122));
  toggle('soulsMiscOot',   bit(124));
  toggle('soulsEnemyMm',   bit(117));
  toggle('soulsBossMm',    bit(119));
  toggle('soulsNpcMm',     bit(121));
  toggle('soulsAnimalMm',  bit(123));
  toggle('soulsMiscMm',    bit(125));

  // ── OoT special (111-115, 221-223, 231, 270) ─────────────────────────────
  toggle('blueFireArrows',      bit(111));
  toggle('sunlightArrows',      bit(112));
  toggle('freeScarecrowOot',    bit(115));
  toggle('ootPreplantedBeans',  bit(231));
  toggle('swordlessAdult',      bit(221));
  toggle('timeTravelSword',     bit(222));
  toggle('extraChildSwordsOot', bit(223));
  toggle('bronzeScale',         bit(225));
  toggle('iceArrowPlatformsOot',bit(276));
  toggle('openZdShortcut',      bit(211));

  // ── Shuffles that have dedicated CONFVAR bits ─────────────────────────────
  toggle('SilverRupeeShuffleOOT',   bit(114));
  // Display checks `=== 'anywhere'`, so set a string value, not boolean.
  if (bit(146)) set('TreasureChestShuffleOOT', 'anywhere');
  else          del('TreasureChestShuffleOOT');
  toggle('OwlStatueShuffleMM',      bit(101));
  toggle('rustyKeysOot',            bit(291));
  toggle('rustyKeysMm',             bit(292));

  // ── MM misc (101, 145, 202, 212-213, 257, 264, 287) ─────────────────────
  toggle('progressiveGFS',       bit(145));
  toggle('transcendentFairy',    bit(202));
  toggle('clocks',               bit(212));
  toggle('progressiveClocks',    bit(213));
  toggle('sticksNutsUpgradesMm', bit(263));
  toggle('jpLayouts',            bit(270));
  toggle('erIndoorsTelescopes',  bit(293));  // MM_TELESCOPE_ER

  // ── Ageless items (92-100, 131) ───────────────────────────────────────────
  toggle('agelessSticks',     bit(92));
  toggle('agelessBow',        bit(93));
  toggle('agelessSlingshot',  bit(94));
  toggle('agelessBoots',      bit(95));
  toggle('agelessStrength',   bit(96));
  toggle('agelessSwords',     bit(97));
  toggle('agelessHammer',     bit(98));
  toggle('agelessGFS',        bit(99));
  toggle('agelessSoaring',    bit(100));
  toggle('agelessChildTrade', bit(131));
  toggle('menuNotebook',      bit(130));

  // ── Ganon trials (139-144): space-separated list of required trial names ──
  {
    const trialNames = [
      [139, 'Light'], [140, 'Forest'], [141, 'Fire'],
      [142, 'Water'], [143, 'Shadow'], [144, 'Spirit'],
    ] as const;
    const active = trialNames.filter(([i]) => bit(i)).map(([, n]) => n);
    if (active.length > 0) set('ganonTrials', active.join(' '));
    else                   del('ganonTrials');
  }

  // ── MM open dungeons (158-163): space-separated dungeon tags ─────────────
  {
    const mmOpen: string[] = [];
    if (bit(158)) mmOpen.push('WF');
    if (bit(159)) mmOpen.push('SH');
    if (bit(160)) mmOpen.push('GB');
    if (bit(161)) mmOpen.push('ST');
    if (mmOpen.length > 0) set('openDungeonsMm', mmOpen.join(' '));
    else                   del('openDungeonsMm');
    const mmClear: string[] = [];
    if (bit(162)) mmClear.push('WF');
    if (bit(163)) mmClear.push('GB');
    if (mmClear.length > 0) set('clearStateDungeonsMm', mmClear.join(' '));
    else                    del('clearStateDungeonsMm');
  }

  // ── OoT open dungeon shortcuts (232-236) + deku (86-88) + well (89) ─────
  {
    const ootOpen: string[] = [];
    if (bit(232)) ootOpen.push('JJ');
    if (bit(233)) ootOpen.push('Shadow');
    if (bit(234)) ootOpen.push('DC');
    if (bit(235)) ootOpen.push('Water');
    if (bit(236)) ootOpen.push('BotW');
    if (bit(88))  ootOpen.push('dekuTreeAdult');
    if (bit(89))  ootOpen.push('wellAdult');
    if (ootOpen.length > 0) set('openDungeonsOot', ootOpen.join(' '));
    else                    del('openDungeonsOot');
  }

  // ── Region state (271-273) ────────────────────────────────────────────────
  if (bit(273))      set('regionState', 'free');
  else if (bit(272)) set('regionState', 'rewards');
  else if (bit(271)) set('regionState', 'dungeons');
  else               del('regionState');

  // ── Key shuffle modes (0-1, 76-77, 83, 107-110) ──────────────────────────
  {
    const skAnywhere    = bit(1);
    const skRemovedOot  = bit(108);
    const skRemovedMm   = bit(110);
    if (skAnywhere) {
      set('smallKeyShuffleOot', 'anywhere');
      set('smallKeyShuffleMm',  'anywhere');
    } else {
      if (skRemovedOot)  set('smallKeyShuffleOot', 'removed');
      else               del('smallKeyShuffleOot');
      if (skRemovedMm)   set('smallKeyShuffleMm',  'removed');
      else               del('smallKeyShuffleMm');
    }
  }
  {
    const bkGanonRemoved = bit(0);
    const bkRemovedOot   = bit(107);
    const bkRemovedMm    = bit(109);
    const bkGanonCustom  = bit(77);
    if (bkGanonRemoved) {
      set('bossKeyShuffleOot', 'removed');
      set('ganonBossKey',      'removed');
    } else if (bkGanonCustom) {
      set('ganonBossKey', 'custom');
      if (bkRemovedOot) set('bossKeyShuffleOot', 'removed');
      else              del('bossKeyShuffleOot');
    } else {
      if (bkRemovedOot) set('bossKeyShuffleOot', 'removed');
      else              del('bossKeyShuffleOot');
      del('ganonBossKey');
    }
    if (bkRemovedMm) set('bossKeyShuffleMm', 'removed');
    else             del('bossKeyShuffleMm');
  }
  if (bit(76)) set('lacs', 'custom');
  else         del('lacs');
  if (bit(83)) set('majoraChild', 'custom');
  else         del('majoraChild');

  // ── Bridge rainbow requirement (154-156) ─────────────────────────────────
  if (bit(156))      set('rainbowBridge', 'custom');
  else if (bit(155)) set('rainbowBridge', 'medallions');
  else if (bit(154)) set('rainbowBridge', 'vanilla');
  else               del('rainbowBridge');

  // ── Deku Tree mode (86-88) ───────────────────────────────────────────────
  if (bit(88))       set('dekuTree', 'adult');
  else if (bit(86))  set('dekuTree', 'open');
  else               del('dekuTree');

  // ── Progressive equipment (5-10) ─────────────────────────────────────────
  toggle('progressiveShieldsOot',         bit(5));
  {
    const swProg = bit(6), swGoron = bit(7);
    if (swProg && swGoron) set('progressiveSwordsOot', 'goron');
    else if (swProg)       set('progressiveSwordsOot', 'progressive');
    else                   del('progressiveSwordsOot');
  }
  toggle('progressiveShieldsMm',          bit(8));
  toggle('progressiveGoronLullabyMm',     bit(9));
  toggle('progressiveGoronLullabyOot',    bit(10));

  // ── Gerudo Fortress carpenters (103-104) ─────────────────────────────────
  if (bit(104))      set('gerudoFortress', 'open');
  else if (bit(103)) set('gerudoFortress', 'single');
  else               del('gerudoFortress');

  // ── Age change (137-138) ─────────────────────────────────────────────────
  if (bit(138))      set('ageChange', 'oot');
  else if (bit(137)) set('ageChange', 'always');
  else               del('ageChange');

  // ── Ocarina button shuffle (135-136) ─────────────────────────────────────
  toggle('ocarinaButtonsShuffleOot',      bit(135));
  toggle('ocarinaButtonsShuffleMm',       bit(136));

  // ── Song events shuffle (277-278) ────────────────────────────────────────
  toggle('songEventShuffle',              bit(277) || bit(278));

  // ── Song note shuffle (275) ──────────────────────────────────────────────
  if (bit(275)) set('songShuffle', 'notes');
  else          del('songShuffle');

  // ── Misc OoT settings (72, 230, 237, 290) ────────────────────────────────
  toggle('skipZelda',             bit(72));
  toggle('plantedBeansOot',       bit(231));  // OOT_PLANTED_BEANS
  toggle('songOfDoubleTimeOot',   bit(237));
  toggle('bowSlingshotBreakHives',bit(296));

  // ── Misc settings (147, 150, 153, 264, 268) ───────────────────────────────
  // climbMostSurfacesOot: bit 147 = MM_CLIMB_MOST_SURFACES
  // Logic checks !setting(climbMostSurfacesOot, off); set to true to enable.
  if (bit(147)) set('climbMostSurfacesOot', true);
  else          del('climbMostSurfacesOot');
  // restoreBrokenActors: bit 150 = NO_BROKEN_ACTORS (inverted)
  toggle('restoreBrokenActors',   bit(150));
  toggle('openMaskShop',          bit(153));

  // ── Bombchu behavior (read directly from combo config; offset varies by version) ──
  // Dev: bombchuOot=0x2C8, bombchuMm=0x2C9.  Release: bombchuOot=0x2C7, bombchuMm=0x2C8.
  {
    const BEHAVIOR: Record<number, string> = { 0:'free', 1:'bombbag', 2:'bagFirst', 3:'bagSeparate' };
    const boOff = isDev ? 0x2C8 : 0x2C7;
    const bmOff = isDev ? 0x2C9 : 0x2C8;
    const vOot = buf[boOff];
    if (vOot >= 0 && vOot <= 3) set('bombchuBehaviorOot', BEHAVIOR[vOot]);
    else                        del('bombchuBehaviorOot');
    const vMm = buf[bmOff];
    if (vMm >= 0 && vMm <= 3) set('bombchuBehaviorMm', BEHAVIOR[vMm]);
    else                      del('bombchuBehaviorMm');
  }

  // ── Stray fairy reward count (offset: dev=0x2C7, release=0x2C6) ─────────────
  // Stored as u8 in combo config; HIDDEN_DEFAULTS seeds '15'.
  // The bridge code converts the string to number for strayFairyRewardCount.
  {
    const sfOff = isDev ? 0x2C7 : 0x2C6;
    const n = buf[sfOff];
    if (n > 0) set('STRAY_FAIRY_COUNT', String(n));
    else       del('STRAY_FAIRY_COUNT');
  }

  // ── Wallet size (85, 90-91) ──────────────────────────────────────────────
  toggle('childWallets',          bit(85));
  toggle('colossalWallets',       bit(90));
  toggle('bottomlessWallets',     bit(91));

  // ── CSMC sub-settings (2-4, 102, 109-110) ────────────────────────────────
  toggle('csmc',                  bit(2));
  toggle('housesSkulltulaTokens', bit(3));
  {
    const cow = bit(4);
    toggle('CowShuffleOOT', cow);
    toggle('CowShuffleMM',  cow);
  }
  toggle('csmcAgony',            bit(102));
  toggle('csmcHearts',           bit(109));
  toggle('csmcMapCompass',       bit(110));

  // ── Only one game (226-227) ──────────────────────────────────────────────
  toggle('onlyOot', bit(226));
  toggle('onlyMm',  bit(227));

  // ── Damage multipliers (279-286) ─────────────────────────────────────────
  if (bit(282))      set('damageMultiplierOot', 'ohko');
  else if (bit(281)) set('damageMultiplierOot', 'x8');
  else if (bit(280)) set('damageMultiplierOot', 'x4');
  else if (bit(279)) set('damageMultiplierOot', 'x2');
  else               del('damageMultiplierOot');
  if (bit(286))      set('damageMultiplierMm', 'ohko');
  else if (bit(285)) set('damageMultiplierMm', 'x8');
  else if (bit(284)) set('damageMultiplierMm', 'x4');
  else if (bit(283)) set('damageMultiplierMm', 'x2');
  else               del('damageMultiplierMm');

  // ── Coins auto-detect: enable coins setting if any maxCoins > 0 ───────────
  // maxCoins[4] at offset 0x154 (u16[4], big-endian). Non-zero means the seed
  // has randomized coin quantities, so the tracker should show coin items.
  {
    const OFF = 0x154;
    if (buf.length >= OFF + 8) {
      const m = (o: number) => (buf[OFF + o] << 8) | buf[OFF + o + 1];
      const mc = [m(0), m(2), m(4), m(6)];
      console.log('[autotrack] maxCoins:', mc);
      if (mc.some(v => v > 0)) set('coins');
    }
  }
}

// ─── All item keys managed by the autotracker ────────────────────────────────
// Used to reset state on (re)connect so stale data from prior sessions is cleared.
// Soul item keys (OOT_SOUL_* / MM_SOUL_*) are too numerous to list; they are cleared
// separately by scanning yItems in resetAutotrackItems.
const AUTOTRACK_KEYS: readonly string[] = [
  // OoT inventory
  'sticks_oot','nuts_oot','bomb','bombchu','din','farore','nayru','boomerang','lens','bean','hammer',
  'bow','arrow_fire_oot','arrow_ice_oot','arrow_light_oot','slingshot','hookshot','ocarina',
  'bottle_1','bottle_2','bottle_3',
  // OoT equipment
  'magic_oot',
  'sword_kokiri','sword_master','sword_biggoron','giant_knife','deku_shield','hyrule_shield','shield_mirror',
  'tunic_goron','tunic_zora','boots_iron','boots_hover',
  'trade_a_biggoron',
  // OoT upgrades + quest
  'strength','scale','wallet',
  'medal_forest','medal_fire','medal_water','medal_spirit','medal_shadow','medal_light',
  'oot_song_minuet','oot_song_bolero','oot_song_serenade','oot_song_requiem','oot_song_nocturne','oot_song_prelude',
  'oot_song_zelda','oot_song_epona','oot_song_saria','oot_song_sun','oot_song_time','oot_song_storms',
  'stone_emerald','stone_ruby','stone_sapphire','agony','gerudo_card',
  // OoT dungeon items
  'OOT_SMALL_KEY_FOREST','OOT_SMALL_KEY_FIRE','OOT_SMALL_KEY_WATER',
  'OOT_SMALL_KEY_SPIRIT','OOT_SMALL_KEY_SHADOW','OOT_SMALL_KEY_BOTW',
  'OOT_SMALL_KEY_GTG','OOT_SMALL_KEY_GF','OOT_SMALL_KEY_GANON','OOT_SMALL_KEY_TCG',
  'OOT_BOSS_KEY_FOREST','OOT_BOSS_KEY_FIRE','OOT_BOSS_KEY_WATER',
  'OOT_BOSS_KEY_SPIRIT','OOT_BOSS_KEY_SHADOW','OOT_BOSS_KEY_GANON',
  'oot_bk_forest','oot_bk_fire','oot_bk_water','oot_bk_spirit','oot_bk_shadow','oot_bk_ganon',
  'OOT_MAP_DT','OOT_MAP_DC','OOT_MAP_JJ',
  'OOT_MAP_FOREST','OOT_MAP_FIRE','OOT_MAP_WATER','OOT_MAP_SPIRIT','OOT_MAP_SHADOW',
  'OOT_MAP_BOTW','OOT_MAP_IC',
  'OOT_COMPASS_DT','OOT_COMPASS_DC','OOT_COMPASS_JJ',
  'OOT_COMPASS_FOREST','OOT_COMPASS_FIRE','OOT_COMPASS_WATER','OOT_COMPASS_SPIRIT','OOT_COMPASS_SHADOW',
  'OOT_COMPASS_BOTW','OOT_COMPASS_IC',
  'forest_sk','fire_sk','botw_sk','gtg_sk','th_sk','gc_sk',
  'OOT_GS_TOKEN','skulltula_token',
  'OOT_TRIFORCE',
  // OoT silver rupee sets (SR indices 0-17)
  'OOT_RUPEE_SILVER_DC','OOT_RUPEE_SILVER_BOTW',
  'OOT_RUPEE_SILVER_SPIRIT_CHILD','OOT_RUPEE_SILVER_SPIRIT_SUN','OOT_RUPEE_SILVER_SPIRIT_BOULDERS',
  'OOT_RUPEE_SILVER_SHADOW_SCYTHE','OOT_RUPEE_SILVER_SHADOW_PIT','OOT_RUPEE_SILVER_SHADOW_SPIKES','OOT_RUPEE_SILVER_SHADOW_BLADES',
  'OOT_RUPEE_SILVER_IC_SCYTHE','OOT_RUPEE_SILVER_IC_BLOCK',
  'OOT_RUPEE_SILVER_GTG_SLOPES','OOT_RUPEE_SILVER_GTG_LAVA','OOT_RUPEE_SILVER_GTG_WATER',
  'OOT_RUPEE_SILVER_GANON_SPIRIT','OOT_RUPEE_SILVER_GANON_LIGHT','OOT_RUPEE_SILVER_GANON_FIRE','OOT_RUPEE_SILVER_GANON_FOREST',
  // OoT trade + OoT extra (raise-only — listed so reconnect reset clears them)
  'trade_c_egg','trade_c_cucco','trade_c_letter',
  'mask_keaton_oot','mask_skull_oot','mask_spooky_oot','mask_bunny_oot','mask_goron_oot',
  'mask_zora_oot','mask_gerudo_oot','mask_truth_oot',
  'trade_c_skull','trade_c_spooky','trade_c_bunny','trade_c_truth',
  'trade_a_cucco','trade_a_cojiro','trade_a_mushroom','trade_a_potion','trade_a_saw',
  'trade_a_broken','trade_a_rx','trade_a_frog','trade_a_drops','trade_a_claim',
  'bottle_letter',
  'mm_spell_fire','mm_spell_wind','mm_spell_love',
  // Remains (both OoT Extra and MM native save)
  'remains_odolwa','remains_goht','remains_gyorg','remains_twinmold',
  // Coins
  'coin_red','coin_green','coin_blue','coin_yellow',
  // MM inventory
  'mm_ocarina','mm_bow','mm_arrow_fire','mm_arrow_ice','mm_arrow_light',
  'mm_bomb','mm_bombchu','mm_stick','mm_nuts','mm_bean','mm_keg','mm_pictobox','mm_lens','mm_hookshot','mm_fairysword',
  'mm_hammer','mm_boomerang','mm_slingshot',
  'mm_tear','mm_deed1','mm_deed2','mm_deed3','mm_deed4','mm_roomkey','mm_delivery','mm_letter','mm_pendant',
  'mask_deku','mask_goron','mask_zora','mask_fierce_deity',
  'mask_truth_mm','mask_kafei','mask_all_night','mask_bunny','mask_keaton','mask_garo','mask_romani','mask_circus_leader','mask_postman',
  'mm_mask_couple','mm_mask_great_fairy','mm_mask_gibdo','mm_mask_don_gero','mm_mask_kamaro',
  'mm_mask_captain','mm_mask_stone','mm_mask_bremen','mm_mask_blast','mm_mask_scents','mm_mask_giant',
  'mask_couple','mask_great_fairy','mask_gibdo','mask_don_gero','mask_kamaro',
  'mask_captain_hat','mask_stone','mask_bremen','mask_blast','mask_scents','mask_giant',
  'mm_bottle_1','mm_bottle_2','mm_bottle_3','mm_bottle_4','mm_bottle_5',
  // MM equipment + upgrades
  'mm_magic',
  'mm_sword','mm_shield','mm_mirror','mm_tunic_goron','mm_tunic_zora','mm_boots_iron','mm_boots_hover',
  'mm_strength','mm_scale','mm_wallet',
  'shared_wallet','shared_strength','shared_scale','shared_magic',
  // MM dungeon items
  'MM_SMALL_KEY_WF','MM_SMALL_KEY_SH','MM_SMALL_KEY_GB','MM_SMALL_KEY_ST',
  'mm_sk_wf','mm_sk_sh','mm_sk_gb','mm_sk_st',
  'MM_BOSS_KEY_WF','MM_BOSS_KEY_SH','MM_BOSS_KEY_GB','MM_BOSS_KEY_ST',
  'mm_bk_wf','mm_bk_sh','mm_bk_gb','mm_bk_st',
  'MM_MAP_WF','MM_MAP_SH','MM_MAP_GB','MM_MAP_ST',
  'MM_COMPASS_WF','MM_COMPASS_SH','MM_COMPASS_GB','MM_COMPASS_ST',
  'MM_STRAY_FAIRY_WF','MM_STRAY_FAIRY_SH','MM_STRAY_FAIRY_GB','MM_STRAY_FAIRY_ST','MM_STRAY_FAIRY_TOWN',
  'mm_woodfall_stray_fairy','mm_snowhead_stray_fairy','mm_greatbay_stray_fairy','mm_stonetower_stray_fairy','mm_clocktown_stray_fairy',
  // MM spider house tokens
  'MM_GS_TOKEN_SWAMP','MM_GS_TOKEN_OCEAN',
  // Big Poe (bottled, for Poe Collector logic)
  'OOT_BIG_POE','MM_BIG_POE',
  // MM songs
  'mm_song_sonata','mm_song_lullaby','mm_song_nova','mm_song_elegy','mm_song_oath',
  'mm_song_saria','mm_song_time','mm_song_healing','mm_song_epona','mm_song_soaring','mm_song_storms','mm_song_sun',
  'mm_bomber',
  // OoT rusty keys (26 doors — DOORID_OOT_HYRULE_CASTLE has no tracker item)
  'oot_rk_treasure_chest_game','oot_rk_guard_house','oot_rk_dog_lady_house','oot_rk_back_alley_house',
  'oot_rk_bombchu_shop','oot_rk_mask_shop','oot_rk_child_bazaar','oot_rk_child_potion_shop',
  'oot_rk_child_shooting_gallery','oot_rk_bombchu_bowling','oot_rk_laboratory','oot_rk_fishing_pond',
  'oot_rk_silo','oot_rk_ranch_stable','oot_rk_ranch_house','oot_rk_ranch_house_room',
  'oot_rk_graveyard','oot_rk_windmill','oot_rk_impa_house','oot_rk_carpenter_house',
  'oot_rk_granny_potion_shop','oot_rk_adult_shooting_gallery','oot_rk_skulltula_house',
  'oot_rk_adult_bazaar','oot_rk_adult_potion_shop','oot_rk_adult_potion_shop_back',
  // MM rusty keys (39 doors)
  'mm_rk_tourist_information','mm_rk_potion_shop','mm_rk_post_office','mm_rk_swordsman_school',
  'mm_rk_lottery','mm_rk_bomb_shop','mm_rk_trading_post','mm_rk_curiosity_shop','mm_rk_kafei_hideout',
  'mm_rk_town_archery','mm_rk_swamp_archery','mm_rk_observatory','mm_rk_blacksmith','mm_rk_music_house',
  'mm_rk_laboratory','mm_rk_beneath_graveyard','mm_rk_dampe_house',
  'mm_rk_mayor_residence','mm_rk_mayor_residence_office','mm_rk_mayor_residence_salon','mm_rk_mayor_residence_kafei',
  'mm_rk_treasure_chest_game','mm_rk_honey_darling','mm_rk_milk_bar','mm_rk_dog_racetrack',
  'mm_rk_cucco_shack','mm_rk_ranch_house','mm_rk_ranch_barn','mm_rk_ranch_house_room',
  'mm_rk_zora_shop','mm_rk_zora_japas_room','mm_rk_zora_tijo_room','mm_rk_zora_lulu_room','mm_rk_zora_evan_room',
  'mm_rk_inn_guest_room','mm_rk_stock_pot_inn_roof','mm_rk_grandma_room',
  'mm_rk_stock_pot_inn_staff_room','mm_rk_stock_pot_inn_dormitory',
];

// ─── Scene flag lookup ────────────────────────────────────────────────────────
// Maps "game:sceneId:bit" → full check name (yChecks key) for chest type only.
// Built from structured-checks-lite.json; MQ-aware: picks vanilla or MQ checks
// per-scene based on the mq bitmask from ComboConfig.

// MQ bit index (from dungeon.h MQ_* constants) → OoT scene index.
// Bits 0-9 happen to equal their scene index; GTG and Ganon Castle diverge.
const MQ_BIT_TO_SCENE: ReadonlyArray<number> = [
  0,  // MQ_DEKU_TREE (bit 0) → OOT_DEKU_TREE (scene 0)
  1,  // MQ_DODONGOS_CAVERN (bit 1) → OOT_DODONGO_CAVERN (scene 1)
  2,  // MQ_JABU_JABU (bit 2) → OOT_INSIDE_JABU_JABU (scene 2)
  3,  // MQ_TEMPLE_FOREST (bit 3) → OOT_TEMPLE_FOREST (scene 3)
  4,  // MQ_TEMPLE_FIRE (bit 4) → OOT_TEMPLE_FIRE (scene 4)
  5,  // MQ_TEMPLE_WATER (bit 5) → OOT_TEMPLE_WATER (scene 5)
  6,  // MQ_TEMPLE_SPIRIT (bit 6) → OOT_TEMPLE_SPIRIT (scene 6)
  7,  // MQ_TEMPLE_SHADOW (bit 7) → OOT_TEMPLE_SHADOW (scene 7)
  8,  // MQ_BOTTOM_OF_THE_WELL (bit 8) → OOT_BOTTOM_OF_THE_WELL (scene 8)
  9,  // MQ_ICE_CAVERN (bit 9) → OOT_ICE_CAVERN (scene 9)
  11, // MQ_GERUDO_TRAINING_GROUNDS (bit 10) → OOT_GERUDO_TRAINING_GROUND (scene 11)
  13, // MQ_GANON_CASTLE (bit 11) → OOT_INSIDE_GANON_CASTLE (scene 13)
];

// Offset of ComboConfig.mq u32 within the 0x12C-byte buffer:
//   playerId(1)+pad(3) + dungeonWarps[12](48) + dungeonEntrances[26](104) = 156
const COMBO_CONFIG_MQ_OFF = 156;

// Set of OoT scene indices that are MQ for a given mq bitmask.
function mqSceneSet(mqBitmask: number): Set<number> {
  const s = new Set<number>();
  for (let bit = 0; bit < MQ_BIT_TO_SCENE.length; bit++) {
    if ((mqBitmask >>> bit) & 1) s.add(MQ_BIT_TO_SCENE[bit]);
  }
  return s;
}

let _sceneFlagLookupPromise: Promise<Map<string, string>> | null = null;
let _sceneFlagLookupMq = -1; // mq bitmask the current promise was built for

async function buildSceneFlagLookup(mqBitmask: number): Promise<Map<string, string>> {
  const res = await fetch(structuredChecksUrl);
  const groups: CheckGroup[] = await res.json();
  const mqScenes = mqSceneSet(mqBitmask);
  const lookup = new Map<string, string>();

  // OotPermanentSceneFlags / MmPermanentSceneFlags layout (0x1C bytes = 7 u32s per scene):
  //   OoT: chests(0) | switches(1) | roomClear(2) | collectibles(3) | unused(4) | visitedRooms(5) | visitedFloors(6)
  //   MM:  chest(0)  | switch0(1)  | switch1(2)   | clearedRoom(3)  | collectible(4) | clearedFloors(5) | rooms(6)
  // globalBit = u32Idx * 32 + localBit (0..223).

  for (const group of groups) {
    for (const check of group.checks) {
      const sceneKey = `${check.game.toUpperCase()}_${check.scene}`;
      const sceneId = (SCENES as Record<string, number>)[sceneKey];
      if (sceneId === undefined) continue;
      const expectedMq = check.game === 'oot' && mqScenes.has(sceneId);
      if (check.isMq !== expectedMq) continue;

      let globalBit: number;
      const t = check.type;

      if (t === 0 /* chest: OV_CHEST → chests word (u32Idx=0 for both OoT and MM) */) {
        const localBit = parseInt(check.id, 16);
        if (isNaN(localBit) || localBit < 0 || localBit >= 32) continue;
        globalBit = localBit;
      } else if (t === 1 /* collectible: OV_COLLECTIBLE → OoT u32Idx=3, MM u32Idx=4 */) {
        const localBit = parseInt(check.id, 16);
        if (isNaN(localBit) || localBit < 0 || localBit >= 32) continue;
        globalBit = (check.game === 'oot' ? 3 : 4) * 32 + localBit;
      } else if (t === 13 /* stray_fairy: OV_SF, MM only — setStrayFairyMarkMm id-range encoding */) {
        if (check.game !== 'mm') continue;
        const sfId = parseInt(check.id, 16);
        if (isNaN(sfId) || sfId < 0) continue;
        const flagId = sfId & 0x1f;
        // id >= 0x30 → collectible (u32Idx=4); id >= 0x20 → switch1 (u32Idx=2); else → switch0 (u32Idx=1)
        if (sfId >= 0x30) globalBit = 4 * 32 + flagId;
        else if (sfId >= 0x20) globalBit = 2 * 32 + flagId;
        else globalBit = 1 * 32 + flagId;
      } else {
        // All other types (pot/grass/crate → OV_XFLAG, npc_reward → OV_NPC, shop → OV_SHOP, etc.)
        // are not tracked via permanent scene flags — skip to avoid false positives.
        continue;
      }

      lookup.set(`${check.game}:${sceneId}:${globalBit}`, `${check.age ?? 'both'}|${check.name}`);
    }
  }
  return lookup;
}

function getSceneFlagLookup(mqBitmask: number): Promise<Map<string, string>> {
  if (_sceneFlagLookupMq !== mqBitmask) {
    _sceneFlagLookupMq = mqBitmask;
    _sceneFlagLookupPromise = buildSceneFlagLookup(mqBitmask);
  }
  return _sceneFlagLookupPromise!;
}

function applySceneFlags(
  buf: Uint8Array,
  game: 'oot' | 'mm',
  sceneCount: number,
  lookup: Map<string, string>,
  yChecks: YMap<number>,
  tracked?: Set<string>
): void {
  // Permanent scene flags: 7 × u32 per scene = 0x1C bytes.
  // OoT: chests(0) | switches(1) | roomClear(2) | collectibles(3) | unused(4) | visitedRooms(5) | visitedFloors(6)
  // MM:  chest(0)  | switch0(1)  | switch1(2)   | clearedRoom(3)  | collectible(4) | clearedFloors(5) | rooms(6)
  const SCENE_SIZE = 0x1C;
  // Read age filter once per batch. Default 'both' means no filtering.
  const ageFilter: string = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('logicAgeFilter') ?? 'both') : 'both';
  const changes: Array<[string, number]> = [];
  for (let sceneId = 0; sceneId < sceneCount; sceneId++) {
    const baseOff = sceneId * SCENE_SIZE;
    for (let u32Idx = 0; u32Idx < 7; u32Idx++) {
      const off = baseOff + u32Idx * 4;
      if (off + 4 > buf.length) break;
      const flags = u32be(buf, off);
      if (flags === 0) continue;
      for (let bit = 0; bit < 32; bit++) {
        if (!((flags >>> bit) & 1)) continue;
        const globalBit = u32Idx * 32 + bit;
        const raw = lookup.get(`${game}:${sceneId}:${globalBit}`);
        if (!raw) continue;
        // Value format: "age|name" — parse and filter by age
        const pipe = raw.indexOf('|');
        const checkAge = raw.slice(0, pipe);
        const checkName = raw.slice(pipe + 1);
        if (ageFilter !== 'both' && checkAge !== 'both' && checkAge !== ageFilter) continue;
        if ((yChecks.get(checkName) ?? 0) < 2 /* CheckState.checked */) changes.push([checkName, 2]);
      }
    }
  }
  if (changes.length > 0) {
    yChecks.doc!.transact(() => {
      for (const [n, s] of changes) {
        yChecks.set(n, s);
        tracked?.add(n);
      }
    });
  }
}

// ─── NPC reward flag tracking ─────────────────────────────────────────────────
// npc_reward checks (type=9) are tracked via a 256-bit bitmap at
// gSharedCustomSave.oot.npc[32]. Each bit corresponds to an NPC slot from
// data/defs/npc.yml. The structured-check `id` (e.g. "LIGHT_MEDALLION") is
// prefixed with "OOT_" or "MM_" and looked up in OOT_NPC_SLOTS / MM_NPC_SLOTS.

let _npcFlagLookupPromise: Promise<Map<string, string>> | null = null;
let _npcFlagLookupMq = -1;

async function buildNpcFlagLookup(mqBitmask: number): Promise<Map<string, string>> {
  const res = await fetch(structuredChecksUrl);
  const groups: CheckGroup[] = await res.json();
  const mqScenes = mqSceneSet(mqBitmask);
  const lookup = new Map<string, string>();

  for (const group of groups) {
    for (const check of group.checks) {
      if (check.type !== 9) continue; // npc_reward only
      const slots = check.game === 'oot' ? OOT_NPC_SLOTS : MM_NPC_SLOTS;
      const key = `${check.game.toUpperCase()}_${check.id}`;
      const slot = slots[key];
      if (slot === undefined) continue;
      // Filter MQ/Vanilla duplicates (same NPC slot used for both variants)
      const expectedMq = check.game === 'oot' && mqScenes.has((SCENES as Record<string, number>)[`${check.game.toUpperCase()}_${check.scene}`]);
      if (check.isMq !== expectedMq) continue;
      lookup.set(`${check.game}:npc:${slot}`, `${check.age ?? 'both'}|${check.name}`);
    }
  }
  return lookup;
}

function getNpcFlagLookup(mqBitmask: number): Promise<Map<string, string>> {
  if (_npcFlagLookupMq !== mqBitmask) {
    _npcFlagLookupMq = mqBitmask;
    _npcFlagLookupPromise = buildNpcFlagLookup(mqBitmask);
  }
  return _npcFlagLookupPromise!;
}

function applyNpcFlags(
  buf: Uint8Array,
  game: 'oot' | 'mm',
  lookup: Map<string, string>,
  yChecks: YMap<number>,
  tracked?: Set<string>
): void {
  const ageFilter: string = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('logicAgeFilter') ?? 'both') : 'both';
  const changes: Array<[string, number]> = [];

  // 32 bytes = 256 bits
  for (let byteIdx = 0; byteIdx < 32 && byteIdx < buf.length; byteIdx++) {
    const byteVal = buf[byteIdx];
    if (byteVal === 0) continue;
    for (let bit = 0; bit < 8; bit++) {
      if (!((byteVal >>> bit) & 1)) continue;
      const slot = byteIdx * 8 + bit;
      const raw = lookup.get(`${game}:npc:${slot}`);
      if (!raw) continue;
      const pipe = raw.indexOf('|');
      const checkAge = raw.slice(0, pipe);
      const checkName = raw.slice(pipe + 1);
      if (ageFilter !== 'both' && checkAge !== 'both' && checkAge !== ageFilter) continue;
      if ((yChecks.get(checkName) ?? 0) < 2) changes.push([checkName, 2]);
    }
  }

  if (changes.length > 0) {
    yChecks.doc!.transact(() => {
      for (const [n, s] of changes) {
        yChecks.set(n, s);
        tracked?.add(n);
      }
    });
  }
}

// ─── Xflag tracking (pots, grass, crates, barrels, etc.) ─────────────────────
// Checks that go through comboXflagsSetOot/Mm are stored in gSharedCustomSave.oot.xflags
// (744 bytes) or gSharedCustomSave.mm.xflags (842 bytes) as flat bitmaps.
//
// The bit position for a given actor is computed from three lookup tables embedded in the
// ROM (xflag_table_{game}_{scenes/setups/rooms}.bin). The formula (from xflags.c):
//   setupIndex = table_scenes[sceneId]   + setupId
//   roomIndex  = table_setups[setupIndex] + roomId * 12 + sliceId
//   bitPos     = table_rooms[roomIndex]  + localId        (i16, can be negative)
//
// Tables are big-endian u16 (scenes, setups) and i16 (rooms).
// CheckType values that use xflags (all resolve to OV_XFLAG0+sliceId in mark.c):
const XFLAG_TYPES = new Set([
  4,  // fairy_spot
  6,  // grass
  8,  // heart
  10, // pot
  11, // rupee
  16, // crate
  17, // barrel
  18, // butterfly
  19, // beehive
  20, // rock
  21, // tree
  22, // bush
  23, // soft_soil
  24, // wonder_item
  25, // snowball
  26, // red_boulder
  27, // icicle
  28, // red_ice
]);

// ID encoding for xflag checks in structured-checks:
//   bits [19:16] = sliceId  (xflag type, 0–11)
//   bits [15:14] = setupId  (setup index within the scene, 0–3)
//   bits [13:8]  = roomId   (room index within the scene, 0–63)
//   bits [7:0]   = localId  (actor's actorIndex within the room)

let _xflagLookupPromise: Promise<{ oot: Map<number, string>; mm: Map<number, string> }> | null = null;
let _xflagLookupMq = -1;

async function buildXflagLookup(mqBitmask: number): Promise<{ oot: Map<number, string>; mm: Map<number, string> }> {
  const [groups, ootScenesBuf, ootSetupsBuf, ootRoomsBuf, mmScenesBuf, mmSetupsBuf, mmRoomsBuf] = await Promise.all([
    fetch(structuredChecksUrl).then(r => r.json()) as Promise<CheckGroup[]>,
    fetch(ootXflagScenesUrl).then(r => r.arrayBuffer()),
    fetch(ootXflagSetupsUrl).then(r => r.arrayBuffer()),
    fetch(ootXflagRoomsUrl).then(r => r.arrayBuffer()),
    fetch(mmXflagScenesUrl).then(r => r.arrayBuffer()),
    fetch(mmXflagSetupsUrl).then(r => r.arrayBuffer()),
    fetch(mmXflagRoomsUrl).then(r => r.arrayBuffer()),
  ]);

  const tables = {
    oot: { scenes: new DataView(ootScenesBuf), setups: new DataView(ootSetupsBuf), rooms: new DataView(ootRoomsBuf) },
    mm:  { scenes: new DataView(mmScenesBuf),  setups: new DataView(mmSetupsBuf),  rooms: new DataView(mmRoomsBuf)  },
  };

  // All tables are big-endian (N64 native byte order).
  function computeBitPos(game: 'oot' | 'mm', sceneId: number, setupId: number, roomId: number, sliceId: number, localId: number): number {
    const t = tables[game];
    const setupIndex = t.scenes.getUint16(sceneId * 2, false) + setupId;
    const roomIndex  = t.setups.getUint16(setupIndex * 2, false) + roomId * 12 + sliceId;
    return t.rooms.getInt16(roomIndex * 2, false) + localId;
  }

  const mqScenes = mqSceneSet(mqBitmask);
  const ootLookup = new Map<number, string>();
  const mmLookup  = new Map<number, string>();

  for (const group of groups) {
    for (const check of group.checks) {
      if (!XFLAG_TYPES.has(check.type)) continue;

      const sceneKey = `${check.game.toUpperCase()}_${check.scene}`;
      const sceneId = (SCENES as Record<string, number>)[sceneKey];
      if (sceneId === undefined) continue;

      const expectedMq = check.game === 'oot' && mqScenes.has(sceneId);
      if (check.isMq !== expectedMq) continue;

      const rawId = parseInt(check.id, 16);
      if (isNaN(rawId)) continue;

      const sliceId  = (rawId >> 16) & 0xf;
      const roomByte = (rawId >> 8) & 0xff;
      const setupId  = (roomByte >> 6) & 0x3;
      const roomId   = roomByte & 0x3f;
      const localId  = rawId & 0xff;

      try {
        const bitPos = computeBitPos(check.game as 'oot' | 'mm', sceneId, setupId, roomId, sliceId, localId);
        if (bitPos < 0) continue; // defensive: negative bit position is invalid
        const lookup = check.game === 'oot' ? ootLookup : mmLookup;
        lookup.set(bitPos, `${check.age ?? 'both'}|${check.name}`);
      } catch {
        // out-of-bounds table access — skip this check
      }
    }
  }

  return { oot: ootLookup, mm: mmLookup };
}

function getXflagLookup(mqBitmask: number): Promise<{ oot: Map<number, string>; mm: Map<number, string> }> {
  if (_xflagLookupMq !== mqBitmask || _xflagLookupPromise === null) {
    _xflagLookupMq = mqBitmask;
    _xflagLookupPromise = buildXflagLookup(mqBitmask).catch(err => {
      _xflagLookupPromise = null;
      _xflagLookupMq    = -1;
      throw err;
    });
  }
  return _xflagLookupPromise!;
}

function applyXflags(
  buf: Uint8Array,
  lookup: Map<number, string>,
  yChecks: YMap<number>
): void {
  const ageFilter: string = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('logicAgeFilter') ?? 'both') : 'both';
  const changes: Array<string> = [];

  for (let byteIdx = 0; byteIdx < buf.length; byteIdx++) {
    const byteVal = buf[byteIdx];
    if (byteVal === 0) continue;
    for (let bit = 0; bit < 8; bit++) {
      if (!((byteVal >>> bit) & 1)) continue;
      const bitPos = byteIdx * 8 + bit;
      const raw = lookup.get(bitPos);
      if (!raw) continue;
      const pipe = raw.indexOf('|');
      const checkAge = raw.slice(0, pipe);
      const checkName = raw.slice(pipe + 1);
      if (ageFilter !== 'both' && checkAge !== 'both' && checkAge !== ageFilter) continue;
      if ((yChecks.get(checkName) ?? 0) < 2) changes.push(checkName);
    }
  }

  if (changes.length > 0) {
    yChecks.doc!.transact(() => {
      for (const n of changes) yChecks.set(n, 2);
    });
  }
}

// ─── Shop GI → item name lookup ──────────────────────────────────────────────

let _giNamesPromise: Promise<Map<number, string>> | null = null;

function getGiNames(): Promise<Map<number, string>> {
  if (_giNamesPromise) return _giNamesPromise;
  _giNamesPromise = fetch(giDataUrl)
    .then(r => r.json())
    .then((entries: Array<{ id: string; name?: string }>) => {
      const map = new Map<number, string>();
      for (let i = 0; i < entries.length; i++) {
        const raw = entries[i].name;
        if (raw) {
          const name = raw.replace(/<[^>]+>/g, '').trim().replace(/^(?:a|an|the)\s+/i, '');
          map.set(i + 1, name);
        }
      }
      return map;
    });
  return _giNamesPromise;
}

// ─── Entrance ID→name lookup (lazy, fetched once) ────────────────────────────
type EntranceMaps = { oot: Map<number, string>; mm: Map<number, string> };
let _entranceMapsPromise: Promise<EntranceMaps> | null = null;
// Reverse gEntrances maps: dst_id → src_id (per game). Built from entrance_table messages.
// Used by player_entrance handler to look up which source entrance led to the current scene.
let _ootEntranceRevMap: Map<number, number> = new Map();
let _mmEntranceRevMap:  Map<number, number> = new Map();
// Forward gEntrances map: src_id → dstRaw (with bit31 set for cross-game entries).
// Used to resolve OoT→MM or MM→OoT cross-game exits detected via gComboCtx.entrance change.
let _entranceFwdMap:    Map<number, number> = new Map();

// gComboConfig.entrancesSpawns[2]: child/adult spawn destinations (set from combo_config buf).
// Spawns are NOT in the gEntrances table — they go through gComboConfig directly.
// These are injected into the revMap so player_entrance can resolve them.
let _ootSpawnChildDst: number | null = null;
let _ootSpawnAdultDst: number | null = null;

function applySpawnMappings(): void {
  const OOT_SPAWN_CHILD_ID = 187;  // data-entrances.json id for OOT_SPAWN_CHILD
  const OOT_SPAWN_ADULT_ID = 3872; // data-entrances.json id for OOT_SPAWN_ADULT
  if (_ootSpawnChildDst != null) _ootEntranceRevMap.set(_ootSpawnChildDst, OOT_SPAWN_CHILD_ID);
  if (_ootSpawnAdultDst != null) _ootEntranceRevMap.set(_ootSpawnAdultDst, OOT_SPAWN_ADULT_ID);
}

// Persistence for combo_config boolean settings: once a setting is confirmed true from any
// game session (OoT or MM), it stays true for the life of the connection. This guards against
// gComboConfig false-positive addresses in OoT mode that return all-zero bits, which would
// otherwise reset souls, ER types, and shared-item flags to false. Cleared on true disconnect.
const _comboConfigTruePersist: Set<string> = new Set();

// All dstIds seen via player_entrance events, keyed by game.
// Persisted in localStorage so that entrance_table rebuilds on resync or page reload
// can re-resolve only the physically visited entrances (not the full seed mapping).
const _VISITED_STORAGE_KEY = 'autotrack_visited_entrances';
const _visitedOotDsts: Set<number> = new Set();
const _visitedMmDsts:  Set<number> = new Set();
try {
  const raw = localStorage.getItem(_VISITED_STORAGE_KEY);
  if (raw) {
    const data = JSON.parse(raw) as { oot?: number[]; mm?: number[] };
    data.oot?.forEach(n => _visitedOotDsts.add(n));
    data.mm?.forEach(n =>  _visitedMmDsts.add(n));
  }
} catch {}

function _saveVisited(): void {
  try {
    localStorage.setItem(_VISITED_STORAGE_KEY, JSON.stringify({
      oot: [..._visitedOotDsts],
      mm:  [..._visitedMmDsts],
    }));
  } catch {}
}

// Call from App.svelte on full reset, new seed import, or slot load to invalidate
// the visited history so resync doesn't re-apply entrances from a different seed.
export function clearVisitedEntrances(): void {
  _visitedOotDsts.clear();
  _visitedMmDsts.clear();
  try { localStorage.removeItem(_VISITED_STORAGE_KEY); } catch {}
}

function resolveAndRecordEntrance(game: 'oot' | 'mm', dstId: number, srcId: number, yEntrances: YMap<string>): void {
  getEntranceMaps()
    .then(maps => {
      const srcMap  = game === 'oot' ? maps.oot : maps.mm;
      const dstMap  = maps.oot.has(dstId) ? maps.oot : maps.mm; // dst may be cross-game
      const srcName = srcMap.get(srcId);
      const dstKey  = dstMap.get(dstId);
      const dstName = entranceById[dstKey ?? '']?.name;
      console.log(`[autotrack] resolveEntrance (${game}) src=0x${srcId.toString(16)}→${srcName ?? '?'} dst=0x${dstId.toString(16)}→${dstKey ?? '?'}(${dstName ?? '?'})`);
      if (srcName && dstName) {
        yEntrances.set(srcName, dstName);
        // Activate the ER sub-type for this entrance so the tracker enables the right category.
        const erType = entranceById[srcName]?.erType;
        if (erType) autotrackErSubTypes.update(prev => ({ ...(prev ?? {}), [erType]: true }));
      }
    })
    .catch(err => console.error('[autotrack] player_entrance lookup failed:', err));
}

function getEntranceMaps(): Promise<EntranceMaps> {
  if (_entranceMapsPromise) return _entranceMapsPromise;
  _entranceMapsPromise = fetch(entrancesDataUrl)
    .then(r => r.json())
    .then((data: Record<string, { game: string; id: number }>) => {
      const oot = new Map<number, string>();
      const mm  = new Map<number, string>();
      for (const [name, entry] of Object.entries(data)) {
        if (entry.game === 'oot') oot.set(entry.id, name);
        else                      mm.set(entry.id, name);
      }
      return { oot, mm };
    })
    .catch(err => {
      _entranceMapsPromise = null; // allow retry on next call
      throw err;
    });
  return _entranceMapsPromise;
}

// Scans a gEntrances buffer and updates autotrackErSubTypes with every sub-type that has
// at least one source entrance present in the table (i.e. is actually shuffled this seed).
function inferErSubTypesFromTable(buf: Uint8Array, srcMap: Map<number, string>): void {
  const srcNames = new Set<string>();
  for (let i = 0; i + 8 <= buf.length; i += 8) {
    const key = u32be(buf, i);
    if (key === 0xFFFFFFFF) break;
    const name = srcMap.get(key);
    if (name) srcNames.add(name);
  }
  const found: Record<string, boolean> = {};
  // Sub-types from entranceSubTypes groups
  for (const [subType, ids] of Object.entries(entranceSubTypes)) {
    if (ids.some(id => srcNames.has(id))) found[subType] = true;
  }
  // Parent ER types from each entrance's erType field — covers erBoss, erGrottos,
  // erOverworld, erWallmasters, erSpawns, erDungeons, erIndoors, erOneWays directly.
  for (const name of srcNames) {
    const entry = entranceById[name];
    if (entry?.erType) found[entry.erType] = true;
  }
  if (Object.keys(found).length > 0) {
    autotrackErSubTypes.update(prev => ({ ...(prev ?? {}), ...found }));
  }
}

// Parses the gEntrances table (8-byte key/value u32 pairs, 0xFFFFFFFF terminator) and
// applies each shuffled connection to yEntrances using entrance names from the lookup.
// dstId may have bit 31 set to indicate a cross-game destination (strip bit before lookup).
// The combined table (stored in OoT payload BSS) contains both OoT and MM pairs, so both
// maps are tried for every key/value regardless of which game emitted the message.
function applyEntranceTable(buf: Uint8Array, _game: 'oot' | 'mm', maps: EntranceMaps, yEntrances: YMap<string>): void {
  yEntrances.doc!.transact(() => {
    for (let i = 0; i + 8 <= buf.length; i += 8) {
      const key = u32be(buf, i);
      if (key === 0xFFFFFFFF) break;
      const valRaw  = u32be(buf, i + 4);
      const val     = valRaw & 0x7FFFFFFF;
      const srcName = maps.oot.get(key) ?? maps.mm.get(key);
      const dstKey  = maps.oot.get(val) ?? maps.mm.get(val);
      const dstName = dstKey ? (entranceById[dstKey]?.name ?? dstKey) : undefined;
      if (srcName && dstName) yEntrances.set(srcName, dstName);
    }
  });
}

// shopId → check name for OoT shops
// Ranges: Kokiri(0x00-0x07) Bombchu(0x08-0x0F) Zora(0x10-0x17) Goron(0x18-0x1F)
//   MarketBazaar(0x20-0x27) MarketPotion(0x28-0x2F) KakBazaar(0x30-0x37) KakPotion(0x38-0x3F)
// shopId → check name for OoT shops.
// Items 1-5: shopId N → "Item N+1" (1:1 sequential).
// Items 6-8: shopId+5/+6/+7 map to storage keys "Item 8"/"Item 6"/"Item 7" (not 6/7/8) so
// they align with ootShopItemKey() in App.svelte which remaps visual checks 6→'Item 8',
// 7→'Item 6', 8→'Item 7' before reading yShopItems. Writing directly to those storage keys
// means both autotracker writes and manual-edit reads address the same slot.
const OOT_SHOPID_TO_CHECK: Record<number, string> = {
  0x00: 'OOT Kokiri Shop Item 1',         0x01: 'OOT Kokiri Shop Item 2',
  0x02: 'OOT Kokiri Shop Item 3',         0x03: 'OOT Kokiri Shop Item 4',
  0x04: 'OOT Kokiri Shop Item 5',         0x05: 'OOT Kokiri Shop Item 8',
  0x06: 'OOT Kokiri Shop Item 6',         0x07: 'OOT Kokiri Shop Item 7',
  0x08: 'OOT Market Bombchu Shop Item 1', 0x09: 'OOT Market Bombchu Shop Item 2',
  0x0A: 'OOT Market Bombchu Shop Item 3', 0x0B: 'OOT Market Bombchu Shop Item 4',
  0x0C: 'OOT Market Bombchu Shop Item 5', 0x0D: 'OOT Market Bombchu Shop Item 6',
  0x0E: 'OOT Market Bombchu Shop Item 7', 0x0F: 'OOT Market Bombchu Shop Item 8',
  0x10: 'OOT Zora Shop Item 1',           0x11: 'OOT Zora Shop Item 2',
  0x12: 'OOT Zora Shop Item 3',           0x13: 'OOT Zora Shop Item 4',
  0x14: 'OOT Zora Shop Item 5',           0x15: 'OOT Zora Shop Item 6',
  0x16: 'OOT Zora Shop Item 7',           0x17: 'OOT Zora Shop Item 8',
  0x18: 'OOT Goron Shop Item 1',          0x19: 'OOT Goron Shop Item 2',
  0x1A: 'OOT Goron Shop Item 3',          0x1B: 'OOT Goron Shop Item 4',
  0x1C: 'OOT Goron Shop Item 5',          0x1D: 'OOT Goron Shop Item 6',
  0x1E: 'OOT Goron Shop Item 7',          0x1F: 'OOT Goron Shop Item 8',
  0x20: 'OOT Market Bazaar Item 1',       0x21: 'OOT Market Bazaar Item 2',
  0x22: 'OOT Market Bazaar Item 3',       0x23: 'OOT Market Bazaar Item 4',
  0x24: 'OOT Market Bazaar Item 5',       0x25: 'OOT Market Bazaar Item 6',
  0x26: 'OOT Market Bazaar Item 7',       0x27: 'OOT Market Bazaar Item 8',
  0x28: 'OOT Market Potion Shop Item 1',  0x29: 'OOT Market Potion Shop Item 2',
  0x2A: 'OOT Market Potion Shop Item 3',  0x2B: 'OOT Market Potion Shop Item 4',
  0x2C: 'OOT Market Potion Shop Item 5',  0x2D: 'OOT Market Potion Shop Item 6',
  0x2E: 'OOT Market Potion Shop Item 7',  0x2F: 'OOT Market Potion Shop Item 8',
  0x30: 'OOT Kakariko Bazaar Item 1',     0x31: 'OOT Kakariko Bazaar Item 2',
  0x32: 'OOT Kakariko Bazaar Item 3',     0x33: 'OOT Kakariko Bazaar Item 4',
  0x34: 'OOT Kakariko Bazaar Item 5',     0x35: 'OOT Kakariko Bazaar Item 6',
  0x36: 'OOT Kakariko Bazaar Item 7',     0x37: 'OOT Kakariko Bazaar Item 8',
  0x38: 'OOT Kakariko Potion Shop Item 1',0x39: 'OOT Kakariko Potion Shop Item 2',
  0x3A: 'OOT Kakariko Potion Shop Item 3',0x3B: 'OOT Kakariko Potion Shop Item 4',
  0x3C: 'OOT Kakariko Potion Shop Item 5',0x3D: 'OOT Kakariko Potion Shop Item 6',
  0x3E: 'OOT Kakariko Potion Shop Item 7',0x3F: 'OOT Kakariko Potion Shop Item 8',
};

// shopId → check name for MM shops
// Ranges: BombShop(0x00-0x03) Curiosity(0x04) TradingPost(0x05-0x0C)
//   PotionShop(0x0D-0x0F) GoronShop(0x10-0x12) ZoraHall(0x13-0x15)
const MM_SHOPID_TO_CHECK: Record<number, string> = {
  0x00: 'MM Bomb Shop Item 1',              0x01: 'MM Bomb Shop Item 2',
  0x02: 'MM Bomb Shop Bomb Bag',            0x03: 'MM Bomb Shop Bomb Bag 2',
  0x04: 'MM Curiosity Shop All-Night Mask',
  0x05: 'MM Trading Post Item 1',           0x06: 'MM Trading Post Item 2',
  0x07: 'MM Trading Post Item 3',           0x08: 'MM Trading Post Item 4',
  0x09: 'MM Trading Post Item 5',           0x0A: 'MM Trading Post Item 6',
  0x0B: 'MM Trading Post Item 7',           0x0C: 'MM Trading Post Item 8',
  0x0D: 'MM Swamp Potion Shop Item 1',      0x0E: 'MM Swamp Potion Shop Item 2',
  0x0F: 'MM Swamp Potion Shop Item 3',
  0x10: 'MM Goron Shop Item 1',             0x11: 'MM Goron Shop Item 2',
  0x12: 'MM Goron Shop Item 3',
  0x13: 'MM Zora Shop Item 1',              0x14: 'MM Zora Shop Item 2',
  0x15: 'MM Zora Shop Item 3',
};

// ─── Region names (from kRegionNamesOot/kRegionNamesMm in text.c) ────────────
// Index 0 = region ID 1 (OoT) or 129/0x81 (MM). Color escape codes stripped.

const OOT_REGION_NAMES: readonly string[] = [
  'the Sacred Realm',         // 1
  'the Deku Tree',            // 2
  "Dodongo's Cavern",         // 3
  'Jabu-Jabu',                // 4
  'the Forest Temple',        // 5
  'the Fire Temple',          // 6
  'the Water Temple',         // 7
  'the Spirit Temple',        // 8
  'the Shadow Temple',        // 9
  'the Bottom of the Well',   // 10
  'the Ice Cavern',           // 11
  'Gerudo Training Grounds',  // 12
  "the Thieve's Hideout",     // 13
  "Ganon's Castle",           // 14
  'the Kokiri Forest',        // 15
  'Hyrule Field',             // 16
  "Hyrule's Market",          // 17
  'Lon Lon Ranch',            // 18
  "Hyrule's Castle",          // 19
  "Ganon's Castle Exterior",  // 20
  'the Lost Woods',           // 21
  'the Sacred Meadow',        // 22
  'Kakariko',                 // 23
  "Kakariko's Graveyard",     // 24
  "Death Mountain's Trail",   // 25
  "Death Mountain's Crater",  // 26
  'Goron City',               // 27
  "Zora's River",             // 28
  "Zora's Domain",            // 29
  "Zora's Fountain",          // 30
  'Lake Hylia',               // 31
  'the Temple of Time',       // 32
  'Gerudo Valley',            // 33
  'Gerudo Fortress',          // 34
  'the Haunted Wastelands',   // 35
  'the Desert Colossus',      // 36
  'an Egg',                   // 37
  "Ganon's Castle Tower",     // 38
];

const MM_REGION_NAMES: readonly string[] = [
  'Woodfall Temple',                  // 129
  'Snowhead Temple',                  // 130
  'Great Bay Temple',                 // 131
  'Stone Tower Temple',               // 132
  'South Clock Town',                 // 133
  'North Clock Town',                 // 134
  'East Clock Town',                  // 135
  'West Clock Town',                  // 136
  'the Laundry Pool',                 // 137
  "the Giant's Dream",                // 138
  'Clock Tower Roof',                 // 139
  'the Stock Pot Inn',                // 140
  'Termina Field',                    // 141
  'the Road to the Swamp',            // 142
  'the Southern Swamp',               // 143
  'Deku Palace',                      // 144
  'Woodfall',                         // 145
  'the Path to Mountain Village',     // 146
  'the Mountain Village',             // 147
  'the Path to Snowhead',             // 148
  'Twin Islands',                     // 149
  'Goron Village',                    // 150
  'Snowhead',                         // 151
  'the Milk Road',                    // 152
  'Romani Ranch',                     // 153
  'Great Bay Coast',                  // 154
  "the Pirate's Fortress Exterior",   // 155
  "the Pirate's Fortress Sewers",     // 156
  "the Pirate's Fortress Interior",   // 157
  'Zora Cape',                        // 158
  'Zora Hall',                        // 159
  'Pinnacle Rock',                    // 160
  'the Road to Ikana',                // 161
  "Ikana's Graveyard",                // 162
  'Ikana Canyon',                     // 163
  'the Ancient Castle of Ikana',      // 164
  'Beneath The Well',                 // 165
  'a Secret Shrine',                  // 166
  'the Stone Tower',                  // 167
  'the Moon',                         // 168
  'the Swamp Spider House',           // 169
  'the Ocean Spider House',           // 170
  'Tingle',                           // 171
  'Inverted Stone Tower Temple',      // 172
  'the Butler Race',                  // 173
  'the Goron Racetrack',              // 174
];

// ─── Check names for ITEM_EXACT hints (kCheckNamesOot/kCheckNamesMm in text.c) ─
// Index 0 = checkId 1 (OoT) or 0x81 (MM), same bit-7 encoding as region IDs.

const OOT_CHECK_NAMES: readonly string[] = [
  'the Frogs Ocarina Game',                           // 0x01
  'Fishing',                                          // 0x02
  'a Ravaged Village',                                // 0x03
  'King Zora',                                        // 0x04
  "the Great Fairy outside of Ganon's Castle",        // 0x05
  'the Fire Temple Hammer Chest',                     // 0x06
  'the Fire Temple Scarecrow Chest',                  // 0x07
  'the Gerudo Training Grounds Water Room',           // 0x08
  'the Haunted Wastelands Chest',                     // 0x09
  'the Gerudo Archery',                               // 0x0A
  "the Cow in Link's house",                          // 0x0B
  'Biggoron',                                         // 0x0C
  'the Ice Cavern Final Chest',                       // 0x0D
  'the Market Treasure Game',                         // 0x0E
  'Shooting at the Sun',                              // 0x0F
  'the Floormaster in the Forest Temple',             // 0x10
  'bombing a fiery skull pot',                        // 0x11
  'a Stalfos duel near spikes',                       // 0x12
  'the Water Temple River chest',                     // 0x13
  'trading a bird and a mixture in the Lost Woods',   // 0x14
  "Stingers in Jabu-Jabu's Belly",                   // 0x15
  'playing a symphony in Spirit Temple',              // 0x16
  'a chest hidden by a time block in Deku Tree',      // 0x17
  'a singular scrub in Death Mountain Crater',        // 0x18
  'a spider deep within Deku Tree',                   // 0x19
];

const MM_CHECK_NAMES: readonly string[] = [
  'the Ranch Defense',                    // 0x81
  'the Butler Race',                      // 0x82
  'Anju and Kafei',                       // 0x83
  "Don Gero's Choir",                     // 0x84
  'the Goron Race',                       // 0x85
  'the Beneath the Graveyard Night 3 Chest', // 0x86
  'the Termina Field Musical Stones',     // 0x87
  "the Bank's Final Reward",              // 0x88
  'the Milk Bar Performance',             // 0x89
  'the Boat Archery',                     // 0x8A
  'the Ocean Spider House Chest',         // 0x8B
  'the Pinnacle Rock Seahorses',          // 0x8C
  "the Fisherman's Game",                 // 0x8D
  'Igos du Ikana',                        // 0x8E
  'the Secret Shrine Wart and Final Chest', // 0x8F
  'the Cow Beneath The Well',             // 0x90
  'the Blacksmith',                       // 0x91
  'the Midnight Meeting',                 // 0x92
  'Madame Aroma in the Bar',              // 0x93
  'Marching for Cuccos',                  // 0x94
  'Finding Kafei',                        // 0x95
  'an Invisible Soldier',                 // 0x96
  'the Great Bay Temple Wart',            // 0x97
  'the second Snowhead Wizzrobe',         // 0x98
  'the Woodfall Temple Gekko',            // 0x99
  'defeating Gomess',                     // 0x9A
  'feeding a freezing Goron',             // 0x9B
  'healing Kamaro',                       // 0x9C
  'the Woodfall Temple Dark Room',        // 0x9D
  'winning the Lottery',                  // 0x9E
];

function checkName(checkId: number): string {
  const idx = (checkId & 0x7F) - 1;
  if (checkId & 0x80) return MM_CHECK_NAMES[idx] ?? `MM check #${checkId}`;
  return OOT_CHECK_NAMES[idx] ?? `OoT check #${checkId}`;
}

const IMPORTANCE_TEXT = ['(unreachable)', '(not required)', '(sometimes required)', '(required)'] as const;

function regionName(regionId: number): string {
  if (regionId === 0x00) return 'nowhere';
  if (regionId === 0xFE) return 'a Nameless Place';
  if (regionId === 0xFF) return "Link's Pocket";
  const idx = (regionId & 0x7F) - 1;
  if (regionId & 0x80) return MM_REGION_NAMES[idx] ?? `MM region #${regionId}`;
  return OOT_REGION_NAMES[idx] ?? `OoT region #${regionId}`;
}

// ─── Altar hint store ─────────────────────────────────────────────────────────
// Populated from gComboConfig.hints.dungeonRewards[0-12] in each combo_config message.
// dungeonRewards order: [0-2]=stones(emerald,ruby,sapphire), [3-8]=medallions(light,forest,fire,water,spirit,shadow), [9-12]=remains(odolwa,goht,gyorg,twinmold)

export type AltarHintEntry = { regionId: number; world: number; name: string };
export type AltarHints = {
  stones: AltarHintEntry[];       // 3 entries (child altar)
  medallions: AltarHintEntry[];   // 6 entries (adult altar)
  remains: AltarHintEntry[];      // 4 entries (MM boss remains panel)
  lightArrows?: AltarHintEntry;   // offset 13 in ComboDataHints
  ganonBossKey?: AltarHintEntry;  // offset 20 in ComboDataHints (after oathToOrder[6])
};

export const altarHints = writable<AltarHints | null>(null);

// Which altar signs the player has physically read in-game.
// Gates altarHintForItem display in ItemTracker — prevents spoilers before reading.
export const altarRead = writable({ ootChild: false, ootAdult: false, mm: false, ganonBoss: false });

// ─── Public API ──────────────────────────────────────────────────────────────

export type AutotrackStatus = 'disconnected' | 'connecting' | 'connected';
export type AutotrackScene  = { game: 'oot' | 'mm'; sceneId: number };

const _status = writable<AutotrackStatus>('disconnected');
export const autotrackStatus: Readable<AutotrackStatus> = _status;

export const currentAutotrackScene = writable<AutotrackScene | null>(null);

export const autotrackEnabled = writable<boolean>(
  localStorage.getItem('autotrack_enabled') !== 'false'
);
autotrackEnabled.subscribe(v => localStorage.setItem('autotrack_enabled', String(v)));

// ER sub-types inferred from the gEntrances runtime table.
// Updated whenever an entrance_table message is processed; null until first connection.
export const autotrackErSubTypes = writable<Record<string, boolean> | null>(null);

// ER type settings detected from the ROM's gComboConfig confvars (set on each combo_config).
// Covers keys from confvar bits + erSpawns (inferred from entrancesSpawns). erOneWays/erAlterLw are excluded (entrance-table only).
export const autotrackErSettings = writable<Partial<ErSettings> | null>(null);

let _resyncFn: (() => void) | null = null;
export function resyncAutotrack(): void { _resyncFn?.(); }

const WS_URL = 'ws://localhost:8338/';
const RECONNECT_DELAY_BASE = 1000; // 1s, doubles with backoff, max 30s

// Maps song index (0-19) → canonical item ID string used by the logic engine.
// Order matches SONG_EVENT_SONG_IDS in OoTMM/packages/core/src/song-events.ts.
const SONG_IDX_TO_ITEM: Record<number, string> = {
  0: 'oot_song_zelda', 1: 'oot_song_epona', 2: 'oot_song_saria',
  3: 'oot_song_storms', 4: 'oot_song_sun', 5: 'oot_song_time',
  6: 'oot_song_minuet', 7: 'oot_song_bolero', 8: 'oot_song_serenade',
  9: 'oot_song_requiem', 10: 'oot_song_nocturne', 11: 'oot_song_prelude',
  12: 'mm_song_healing', 13: 'mm_song_soaring', 14: 'mm_song_sonata',
  15: 'mm_song_lullaby', 16: 'mm_song_lullaby_half', 17: 'mm_song_nova',
  18: 'mm_song_elegy', 19: 'mm_song_oath',
};

let _onIndexeddbSynced: (() => void) | null = null;

// Called by App.svelte after IndexedDB persistence has finished syncing on page load,
// so that gossip_hint_read re-emissions don't race with IndexedDB restoring yHints.
export function setIndexeddbSynced(): void {
  _onIndexeddbSynced?.();
}

export function initAutotrack(yItems: YMap<number>, ySettings: YMap<unknown>, yEntrances: YMap<string>, yChecks: YMap<number>, yShopItems: YMap<string>, yShopPrices: YMap<number>, yHints: YArray<unknown>, ySongEvents: YMap<string>): () => void {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let stopped = false;
  let enabled = true;
  let activeGame: 'oot' | 'mm' | null = null;
  let mmSaveValidated = false;  // true once C# has validated gMmSave for this session
  let comboPlayerId = 0;        // byte 0 of gComboConfig: 0=singleplayer, 1-8=multiworld
  let _indexeddbSynced = false;
  const _deferredHints: Array<() => void> = [];
  // Raw gHints data keyed by "game:key" — populated from gossip_hints, used by gossip_hint_read.
  type RawHintEntry = { type: number; regionId: number; gi: number; gi2: number; gi3: number; player: number; player2: number; player3: number; importance: number; importance2: number; importance3: number };
  const gossipHintsRawCache = new Map<string, RawHintEntry>();
  // Keys for hints already added to yHints this session (not cleared on 'connected' since C#
  // re-emits gossip_hint_read for all seen keys on reconnect, which re-adds them cleanly).
  const seenGossipHintIds = new Set<string>();
  // Keys received via gossip_hint_read before gossip_hints populated the cache (timing guard).
  const pendingHintReadKeys = new Set<string>();

  function dedupAndRebuildSeenHints(): void {
    // Remove duplicate gossip entries from yHints (IndexedDB may have stored
    // duplicates from previous sessions before the upsert+defer fixes).
    // Keeps the LAST occurrence of each id.
    const seen = new Set<string>();
    yHints.doc!.transact(() => {
      for (let i = yHints.length - 1; i >= 0; i--) {
        const h = yHints.get(i) as any;
        if (h?.id && typeof h.id === 'string' && h.id.startsWith('gossip:')) {
          if (seen.has(h.id)) {
            yHints.delete(i, 1);
          } else {
            seen.add(h.id);
          }
        }
      }
    });
    // Rebuild seenGossipHintIds from the deduplicated set
    seenGossipHintIds.clear();
    for (const id of seen) seenGossipHintIds.add(id);
  }

  _onIndexeddbSynced = () => {
    _indexeddbSynced = true;
    dedupAndRebuildSeenHints();
    // Process all deferred hint reads
    for (const fn of _deferredHints) fn();
    _deferredHints.length = 0;
  };
  // hasVisitedMm: set true when activeGame first becomes 'mm'.
  // MM scene flags at SaveContextMm+0xF6 are only initialised when the player enters MM for the
  // first time. Before that, RDRAM at that address holds stale data from a prior session.
  let hasVisitedMm = false;
  // mqBitmask: null until combo_config received; scene flags are buffered until then.
  let mqBitmask: number | null = null;
  let pendingOotFlags: Uint8Array | null = null;
  let pendingMmFlags: Uint8Array | null = null;
  let pendingOotNpcFlags: Uint8Array | null = null;
  let pendingOotXflags: Uint8Array | null = null;
  let pendingMmXflags: Uint8Array | null = null;
  // oot_save received before activeGame is known; applied when first 'game' message arrives.
  let pendingOotSave: Uint8Array | null = null;

  function resetAutotrackItems(): void {
    yItems.doc!.transact(() => {
      for (const key of AUTOTRACK_KEYS) yItems.delete(key);
      for (const key of yItems.keys()) {
        if (key.startsWith('OOT_SOUL_') || key.startsWith('MM_SOUL_')) yItems.delete(key);
      }
    });
  }

  function decode(data: string): Uint8Array {
    const raw = atob(data);
    const buf = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
    return buf;
  }

  // Formats a single item for display: "ItemName (importance) for P2"
  function fmtGossipItem(gi: number, player: number, importance: number, giNames: Map<number, string>): string {
    let s = (gi > 0 ? giNames.get(gi) : null) ?? `item #${gi}`;
    if (importance >= 0 && importance <= 3) s += ` ${IMPORTANCE_TEXT[importance]}`;
    if (comboPlayerId > 0 && player !== 0 && player !== 0xFF) s += ` for P${player}`;
    return s;
  }

  // Adds a gossip hint (identified by "game:key") to yHints, idempotent.
  // Reads from gossipHintsRawCache — caller must ensure the key is present before calling.
  function applyGossipHintRead(cacheKey: string): void {
    const hintId = `gossip:${cacheKey}`;
    seenGossipHintIds.add(hintId); // kept for reconnect tracking / dedupAndRebuildSeenHints
    const entry = gossipHintsRawCache.get(cacheKey)!;
    const { type, regionId, gi, gi2, gi3, player, player2, player3, importance, importance2, importance3 } = entry;
    // Helper: add hint only if not already present in yHints.
    // Skips if shown (re-reading a visible stone does nothing),
    // but adds if cleared via "x" (allowing the user to re-read and restore it).
    function pushHint(h: Record<string, unknown>) {
      yHints.doc!.transact(() => {
        for (let i = 0; i < yHints.length; i++) {
          if ((yHints.get(i) as any)?.id === h.id) return; // already visible
        }
        yHints.push([h]);
      });
    }
    if (type === 0 || type === 1) {
      pushHint({ id: hintId, type: type === 0 ? 'woth' as const : 'barren' as const, text: regionName(regionId), ts: Date.now() });
    } else if (type === 2) {
      getGiNames().then(giNames => {
        const parts: string[] = [];
        parts.push(fmtGossipItem(gi, player, importance, giNames));
        // items[2] != -1 ⇒ 3 items total; show items[1] as middle element
        if (gi3 !== -1 && gi3 >= 0) {
          parts.push(fmtGossipItem(gi2, player2, importance2, giNames));
        }
        // items[1] != -1 ⇒ show last item (items[2] for 3 items, items[1] for 2 items)
        if (gi2 !== -1 && gi2 >= 0) {
          const lastIdx = gi3 !== -1 && gi3 >= 0 ? gi3 : gi2;
          const lastPlayer = gi3 !== -1 && gi3 >= 0 ? player3 : player2;
          const lastImp = gi3 !== -1 && gi3 >= 0 ? importance3 : importance2;
          parts.push(fmtGossipItem(lastIdx, lastPlayer, lastImp, giNames));
        }
        let itemText: string;
        if (parts.length === 2) itemText = parts.join(' and ');
        else if (parts.length >= 3) itemText = `${parts[0]}, ${parts[1]} and ${parts[2]}`;
        else itemText = parts[0];
        const text = `${checkName(regionId)} gives ${itemText}`;
        pushHint({ id: hintId, type: 'item' as const, text, ts: Date.now() });
      }).catch(err => console.error('[autotrack] gossip hint GI lookup failed:', err));
    } else if (type === 3) {
      getGiNames().then(giNames => {
        const itemText = (gi > 0 ? giNames.get(gi) : null) ?? `item #${gi}`;
        const impText = importance >= 0 && importance <= 3 ? ` ${IMPORTANCE_TEXT[importance]}` : '';
        const playerSuffix = (comboPlayerId > 0 && player !== 0 && player !== 0xFF) ? ` for P${player}` : '';
        const text = regionId > 0
          ? `${itemText}${impText} can be found in ${regionName(regionId)}${playerSuffix}`
          : `${itemText}${impText}${playerSuffix}`;
        pushHint({ id: hintId, type: 'item' as const, text, ts: Date.now() });
      }).catch(err => console.error('[autotrack] gossip hint GI lookup failed:', err));
    }
  }

  function connect(): void {
    if (stopped || !enabled || ws !== null) return;
    _status.set('connecting');
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      _status.set('connected');
      reconnectAttempt = 0;
    };

    ws.onmessage = (ev: MessageEvent) => {
      let msg: { type: string; data?: string; game?: string; age?: string; value?: number; b0?: number; b1?: number; sceneId?: number; swamp?: number; ocean?: number; key?: number; slots?: Array<{ shopId: number; gi: number; player: number; price: number }>; trackerKey?: string; songIdx?: number; max?: string; romVersion?: string; saveEntrance?: number; cowShuffle?: boolean; scrubShuffle?: boolean; shopShuffle?: boolean; gsShuffle?: boolean; sfShuffle?: boolean; fishShuffle?: boolean; xflagShuffle?: boolean; potShuffleOot?: string|null; potShuffleMm?: string|null; crateShuffleOot?: string|null; crateShuffleMm?: string|null; barrelsShuffleMm?: string|null; grassShuffleOot?: string|null; grassShuffleMm?: string|null; treeShuffleMm?: string|null; soilShuffleMm?: string|null; rupeeShuffleOot?: string|null; rupeeShuffleMm?: string|null; heartsShuffleOot?: string|null; snowballShuffleMm?: string|null; bushShuffleMm?: string|null; wonderShuffleOot?: string|null; rockShuffleMm?: string|null; hivesShuffleOot?: boolean; hivesShuffleMm?: boolean; rockShuffleOot?: boolean; treeShuffleOot?: boolean; soilShuffleOot?: boolean; heartShuffleMm?: boolean; wonderShuffleMm?: boolean; butterflyShuffleOot?: boolean; butterflyShuffleMm?: boolean; redBoulderShuffleOot?: boolean; redBoulderShuffleMm?: boolean; iciclesShuffleOot?: boolean; iciclesShuffleMm?: boolean; fairySpotShuffleOot?: boolean; fairyFountainShuffleOot?: boolean; fairyFountainShuffleMm?: boolean; bushShuffleOot?: boolean; redIceShuffleOot?: boolean };
      try { msg = JSON.parse(ev.data as string); } catch { return; }
      if (!msg.type) { console.warn('[autotrack] message has no type:', ev.data?.toString().slice(0, 120)); return; }
      if (msg.type === 'coins_data' || msg.type === 'oot_npc_flags' || msg.type === 'combo_config') console.log('[autotrack] rx', msg.type, msg);

      if (msg.type === 'connected') {
        // Game confirmed running with OoT+MM<3 magic.
        // On first connection: clear all stale state from a previous session.
        // On reconnect/resync: preserve manually-set checks; only reset volatile state.
        _status.set('connected');
        activeGame = null;
        mmSaveValidated = false;
        hasVisitedMm = false;
        mqBitmask = null;
        pendingOotFlags = null;
        pendingMmFlags = null;
        pendingOotNpcFlags = null;
        pendingOotXflags = null;
        pendingMmXflags = null;
        pendingOotSave = null;

        // autotrackErSubTypes intentionally NOT reset here — it's seed-specific and valid
        // across OoT↔MM game switches (same gEntrances table, same seed). Clearing it would
        // cause the OR-merge to produce all-false on every reconnect until the entrance table
        // re-arrives (≤5s), causing the ER tracker to momentarily disable all settings.
        _ootEntranceRevMap.clear();
        _mmEntranceRevMap.clear();
        // _visitedOotDsts / _visitedMmDsts intentionally NOT cleared — persisted for resync re-resolve.
        gossipHintsRawCache.clear();
        pendingHintReadKeys.clear();
        if (_indexeddbSynced) {
          dedupAndRebuildSeenHints();
        } else {
          // yHints may not be fully restored from IndexedDB yet —
          // defer the rebuild until setIndexeddbSynced() is called.
          _deferredHints.push(() => dedupAndRebuildSeenHints());
        }
        altarHints.set(null);
        altarRead.set({ ootChild: false, ootAdult: false, mm: false, ganonBoss: false });
        currentAutotrackScene.set(null);

        resetAutotrackItems();
        yShopItems.doc!.transact(() => { for (const k of [...yShopItems.keys()]) { if ((yChecks.get(k) ?? 0) < 2) yShopItems.delete(k); } });
        yShopPrices.doc!.transact(() => { for (const k of [...yShopPrices.keys()]) yShopPrices.delete(k); });
      } else if (msg.type === 'disconnected') {
        _status.set('connecting');
        activeGame = null;
        _comboConfigTruePersist.clear();
      } else if (msg.type === 'game' && msg.game) {
        if (msg.game === 'unknown') { activeGame = null; return; }
        const wasNull = activeGame === null;
        activeGame = msg.game as 'oot' | 'mm';
        if (activeGame === 'mm' && !hasVisitedMm) {
          hasVisitedMm = true;
          // Flush MM scene flags and xflags buffered while waiting for first MM visit.
          if (mqBitmask !== null) {
            const mq = mqBitmask;
            if (pendingMmFlags) {
              const f = pendingMmFlags; pendingMmFlags = null;
              getSceneFlagLookup(mq).then(lookup => applySceneFlags(f, 'mm', 120, lookup, yChecks));
            }
            if (pendingMmXflags) {
              const f = pendingMmXflags; pendingMmXflags = null;
              getXflagLookup(mq).then(({ mm }) => applyXflags(f, mm, yChecks)).catch(err => console.error('[autotrack] mm xflags first-mm flush failed:', err));
            }
          }
        }
        if (wasNull) {
          if (pendingOotSave) {
            const _save = pendingOotSave;
            yItems.doc!.transact(() => {
              applyOotSave(_save, yItems, activeGame === 'oot');
            });
            pendingOotSave = null;
          }
          // Flush any scene flags that were buffered because activeGame was null but mqBitmask was known.
          if (mqBitmask !== null) {
            const mq = mqBitmask;
            if (pendingOotFlags) {
              const f = pendingOotFlags; pendingOotFlags = null;
              getSceneFlagLookup(mq).then(lookup => applySceneFlags(f, 'oot', 124, lookup, yChecks));
            }
            if (pendingMmFlags && hasVisitedMm) {
              const f = pendingMmFlags; pendingMmFlags = null;
              getSceneFlagLookup(mq).then(lookup => applySceneFlags(f, 'mm', 120, lookup, yChecks));
            }
            if (pendingOotNpcFlags) {
              const f = pendingOotNpcFlags; pendingOotNpcFlags = null;
              getNpcFlagLookup(mq).then(lookup => applyNpcFlags(f, 'oot', lookup, yChecks));
            }
            if (pendingOotXflags) {
              const f = pendingOotXflags; pendingOotXflags = null;
              getXflagLookup(mq).then(({ oot }) => applyXflags(f, oot, yChecks)).catch(err => console.error('[autotrack] oot xflags flush failed:', err));
            }
            if (pendingMmXflags && hasVisitedMm) {
              const f = pendingMmXflags; pendingMmXflags = null;
              getXflagLookup(mq).then(({ mm }) => applyXflags(f, mm, yChecks)).catch(err => console.error('[autotrack] mm xflags flush failed:', err));
            }
          }
        }
      } else if (msg.type === 'oot_save' && msg.data) {
        // Guard: activeGame null means the game hasn't started yet (title screen / ROM init).
        // Stale RDRAM from a prior session can have a valid "ZELDAZ" at gSaveContext before
        // the new ROM overwrites it — buffer until the first 'game' message confirms gameplay.
        const data = msg.data;
        if (activeGame === null) { pendingOotSave = decode(data); }
        else { yItems.doc!.transact(() => { applyOotSave(decode(data), yItems, activeGame === 'oot'); }); }
      } else if (msg.type === 'mm_validated') {
        // Native gMmSave validated by C# (magic + player name match against OoT save).
        // Unlocks mm_save reading in OoT so starting items are tracked before any MM visit.
        mmSaveValidated = true;
      } else if (msg.type === 'mm_save' && msg.data) {
        // Native MM save (0x801EF670).
        // In MM: strict (authoritative overwrite).
        // In OoT, once validated: raise-only — picks up starting items the payload copy lacks.
        // Before validation: skip (may contain stale data from a prior seed).
        const data = msg.data;
        if (activeGame === 'mm') {
          yItems.doc!.transact(() => { applyMmSave(decode(data), yItems, true); });
        } else if (activeGame === 'oot' && mmSaveValidated) {
          yItems.doc!.transact(() => { applyMmSave(decode(data), yItems, false); });
        }
      } else if (msg.type === 'payload_mm_save' && msg.data) {
        // C# validates the gMmSave candidate (playerForm==4 or player name match) before
        // emitting this message, so stale PJ64 RDRAM data is already filtered out.
        // Once received, native mm_save is also safe to use in OoT (raise-only).
        mmSaveValidated = true;
        // Skip while in MM — native mm_save (strict) is authoritative there.
        const dataPmm = msg.data;
        if (activeGame !== 'mm') yItems.doc!.transact(() => { applyPayloadMmSave(decode(dataPmm), yItems); });
      } else if (msg.type === 'payload_oot_save' && msg.data) {
        // Payload gOotSave (MM BSS) tracks OoT items obtained while playing MM.
        // When in OoT, native oot_save already covers this — skip.
        // Guard on mmSaveValidated: TryScanMmPayload has no cross-validation, so the address
        // may point to stale RDRAM until gMmSave is confirmed (which sets mmSaveValidated).
        if (activeGame === null || activeGame === 'oot' || !mmSaveValidated) return;
        const dataPoot = msg.data;
        yItems.doc!.transact(() => { applyOotSave(decode(dataPoot), yItems, false); });
      } else if (msg.type === 'shared_custom_save' && typeof msg.b0 === 'number') {
        if (activeGame === null) return;
        applySharedCustomSave(msg.b0, msg.b1 ?? 0, yItems);
      } else if (msg.type === 'souls_data' && msg.data) {
        if (activeGame === null) return;
        const buf = decode(msg.data);
        getSoulLookup().then(lookup => {
          yItems.doc!.transact(() => {
            for (const [bufBit, itemId] of lookup) {
              const byteOff = bufBit >> 3;
              const bitPos  = bufBit & 7;
              if (byteOff >= buf.length) continue;
              if (((buf[byteOff] >> bitPos) & 1) === 1) {
                if ((yItems.get(itemId) ?? 0) < 1) yItems.set(itemId, 1);
              }
            }
          });
        }).catch(err => console.error('[autotrack] souls lookup failed:', err));
      } else if (msg.type === 'mm_skull_tokens' && typeof msg.swamp === 'number') {
        if (activeGame === null) return;
        yItems.doc!.transact(() => {
          const sw = msg.swamp ?? 0;
          const oc = msg.ocean ?? 0;
          if (sw > (yItems.get('MM_GS_TOKEN_SWAMP') ?? 0)) yItems.set('MM_GS_TOKEN_SWAMP', sw);
          if (oc > (yItems.get('MM_GS_TOKEN_OCEAN') ?? 0)) yItems.set('MM_GS_TOKEN_OCEAN', oc);
        });
      } else if (msg.type === 'rusty_keys' && msg.data) {
        if (activeGame === null) return;
        const rk = decode(msg.data);
        yItems.doc!.transact(() => {
          // OoT: 4 bytes = 32 bits for DOORID_OOT_MAX (27) doors
          for (let bit = 0; bit < 27; bit++) {
            const item = DOORID_OOT_ITEMS[bit];
            if (!item) continue;
            const isSet = (rk[bit >> 3] >> (bit & 7)) & 1;
            if (isSet > (yItems.get(item) ?? 0)) yItems.set(item, isSet);
          }
          // MM: 5 bytes = 40 bits for DOORID_MM_MAX (39) doors
          for (let bit = 0; bit < 39; bit++) {
            const item = DOORID_MM_ITEMS[bit];
            const isSet = (rk[4 + (bit >> 3)] >> (bit & 7)) & 1;
            if (isSet > (yItems.get(item) ?? 0)) yItems.set(item, isSet);
          }
        });
      } else if (msg.type === 'coins_data' && msg.data) {
        console.log('[autotrack] coins_data received', { dataLen: msg.data.length, max: !!msg.max });
        if (activeGame === null) { console.log('[autotrack] coins_data: activeGame null, skipping'); return; }
        const coins = decode(msg.data);
        if (coins.length < 8) { console.log('[autotrack] coins_data: short buf', coins.length); return; }
        const r = (coins[0] << 8) | coins[1];
        const g = (coins[2] << 8) | coins[3];
        const b = (coins[4] << 8) | coins[5];
        const y = (coins[6] << 8) | coins[7];
        // Auto-enable coins setting from maxCoins (bypasses combo_config signature dedup)
        if (!ySettings.get('coins') && msg.max) {
          const mc = decode(msg.max);
          if (mc.length >= 8) {
            const maxR = (mc[0] << 8) | mc[1];
            const maxG = (mc[2] << 8) | mc[3];
            const maxB = (mc[4] << 8) | mc[5];
            const maxY = (mc[6] << 8) | mc[7];
            if (maxR > 0 || maxG > 0 || maxB > 0 || maxY > 0) {
              ySettings.set('coins', true);
              console.log('[autotrack] coins auto-enabled from maxCoins:', { maxR, maxG, maxB, maxY });
            }
          }
        }
        // Fallback: enable if any coin count > 0
        if (!ySettings.get('coins') && (r || g || b || y)) ySettings.set('coins', true);
        yItems.doc!.transact(() => {
          function raiseCoin(id: string, val: number) {
            if (val > (yItems.get(id) as number ?? 0)) yItems.set(id, val);
          }
          raiseCoin('coin_red',    r);
          raiseCoin('coin_green',  g);
          raiseCoin('coin_blue',   b);
          raiseCoin('coin_yellow', y);
        });
      } else if (msg.type === 'combo_config' && msg.data) {
        const buf = decode(msg.data);
        // gComboConfig.entrancesSpawns[2] at offset 0xE4 (child=0, adult=1).
        // Spawns bypass gEntrances and go through gComboConfig directly — inject into revMap here.
        const SPAWNS_OFF = 0xE4;
        if (buf.length >= SPAWNS_OFF + 8) {
          const adultDst = u32be(buf, SPAWNS_OFF)     & 0x7FFFFFFF; // [0] = AGE_ADULT = 0
          const childDst = u32be(buf, SPAWNS_OFF + 4) & 0x7FFFFFFF; // [1] = AGE_CHILD = 1
          if (adultDst !== 0 && adultDst !== 0x7FFFFFFF) _ootSpawnAdultDst = adultDst;
          if (childDst !== 0 && childDst !== 0x7FFFFFFF) _ootSpawnChildDst = childDst;
          if (_ootEntranceRevMap.size > 0) {
            applySpawnMappings();
            for (const dst of [_ootSpawnChildDst, _ootSpawnAdultDst]) {
              if (dst != null && _visitedOotDsts.has(dst)) {
                const srcId = _ootEntranceRevMap.get(dst);
                if (srcId != null) resolveAndRecordEntrance('oot', dst, srcId, yEntrances);
              }
            }
          }
        }
        const newMq = u32be(buf, COMBO_CONFIG_MQ_OFF);
        mqBitmask = newMq;
        ySettings.doc!.transact(() => {
          applyComboConfig(buf, ySettings, msg.romVersion as string | undefined);
          applyDungeonEntrances(buf, yEntrances, msg.romVersion as string | undefined);
        });
        comboPlayerId = buf[0];
        const detectedEr = {
          erDungeons:          !!ySettings.get('erDungeons'),
          erMajorDungeons:     !!ySettings.get('erMajorDungeons'),
          erBoss:              !!ySettings.get('erBoss'),
          erMoon:              !!ySettings.get('erMoon'),
          erWallmasters:       !!ySettings.get('erWallmasters'),
          erGrottos:           !!ySettings.get('erGrottos'),
          erOverworld:         !!ySettings.get('erOverworld'),
          erIndoors:           !!ySettings.get('erIndoors'),
          erIndoorsTelescopes: !!ySettings.get('erIndoorsTelescopes'),
          // erSpawns has no confvar bit, and entrancesSpawns is always non-null in OoTMM
          // (spawn addresses exist even on non-ER seeds). Spawns also bypass gEntrances so
          // inferErSubTypesFromTable can't detect them. Excluded from detectedEr — erSpawns
          // is zeroed explicitly in App.svelte to prevent stale localStorage from bleeding through.
        };
        console.log('[autotrack] combo_config ER detected:', detectedEr, 'playerId:', comboPlayerId);
        // Reset subTypes so stale entrance-table data from a previous seed doesn't
        // OR-merge with the newly-detected confvars and force all ER flags to true.
        autotrackErSubTypes.set(null);
        autotrackErSettings.set(detectedEr);
        // gComboConfig.hints: ComboDataHints at offset 0x27A (42 bytes total)
        // dungeonRewards[13] at +0, lightArrows at +26, oathToOrder[6] at +28, ganonBossKey at +40
        // dungeonRewards order: [0-2] stones (emerald,ruby,sapphire), [3-8] medallions (light,forest,fire,water,spirit,shadow), [9-12] remains
        const HINTS_OFF = 0x27A;
        if (buf.length >= HINTS_OFF + 26) {
          const stones: AltarHintEntry[] = [];
          const medallions: AltarHintEntry[] = [];
          const remains: AltarHintEntry[] = [];
          for (let i = 0; i < 13; i++) {
            const off = HINTS_OFF + i * 2;
            const rid = buf[off];
            const world = buf[off + 1];
            const entry: AltarHintEntry = { regionId: rid, world, name: regionName(rid) };
            if (i < 3) stones.push(entry);
            else if (i < 9) medallions.push(entry);
            else remains.push(entry);
          }
          let lightArrows: AltarHintEntry | undefined;
          let ganonBossKey: AltarHintEntry | undefined;
          if (buf.length >= HINTS_OFF + 28) {
            const rid = buf[HINTS_OFF + 26]; const world = buf[HINTS_OFF + 27];
            if (rid !== 0) lightArrows = { regionId: rid, world, name: regionName(rid) };
          }
          if (buf.length >= HINTS_OFF + 42) {
            const rid = buf[HINTS_OFF + 40]; const world = buf[HINTS_OFF + 41];
            if (rid !== 0) ganonBossKey = { regionId: rid, world, name: regionName(rid) };
          }
          altarHints.set({ stones, medallions, remains, lightArrows, ganonBossKey });
        }
        // Apply any scene flags that arrived before combo_config.
        const mq = mqBitmask;
        if (pendingOotFlags) {
          const f = pendingOotFlags; pendingOotFlags = null;
          getSceneFlagLookup(mq).then(lookup => applySceneFlags(f, 'oot', 124, lookup, yChecks));
        }
        if (pendingMmFlags && hasVisitedMm) {
          const f = pendingMmFlags; pendingMmFlags = null;
          getSceneFlagLookup(mq).then(lookup => applySceneFlags(f, 'mm', 120, lookup, yChecks));
        }
        if (pendingOotNpcFlags) {
          const f = pendingOotNpcFlags; pendingOotNpcFlags = null;
          getNpcFlagLookup(mq).then(lookup => applyNpcFlags(f, 'oot', lookup, yChecks));
        }
        if (pendingOotXflags) {
          const f = pendingOotXflags; pendingOotXflags = null;
          getXflagLookup(mq).then(({ oot }) => applyXflags(f, oot, yChecks)).catch(err => console.error('[autotrack] oot xflags combo_config flush failed:', err));
        }
        if (pendingMmXflags && hasVisitedMm) {
          const f = pendingMmXflags; pendingMmXflags = null;
          getXflagLookup(mq).then(({ mm }) => applyXflags(f, mm, yChecks)).catch(err => console.error('[autotrack] mm xflags combo_config flush failed:', err));
        }
      } else if (msg.type === 'gossip_hints' && msg.data && msg.game) {
        // Parse 16-byte Hint structs into the raw cache — display is gated on gossip_hint_read.
        // type: 0=PATH(WotH), 1=FOOLISH(barren), 2=ITEM_EXACT, 3=ITEM_REGION
        const buf = decode(msg.data);
        for (let i = 0; i + 16 <= buf.length; i += 16) {
          if (buf[i] === 0xFF) break;
          const key = buf[i];
          const type = buf[i + 1];
          const rid  = buf[i + 2];
          const giRaw = (buf[i + 4] << 8) | buf[i + 5];
          const gi = giRaw >= 0x8000 ? giRaw - 0x10000 : giRaw;
          const gi2Raw = (buf[i + 6] << 8) | buf[i + 7];
          const gi2 = gi2Raw >= 0x8000 ? gi2Raw - 0x10000 : gi2Raw;
          const gi3Raw = (buf[i + 8] << 8) | buf[i + 9];
          const gi3 = gi3Raw >= 0x8000 ? gi3Raw - 0x10000 : gi3Raw;
          const player = buf[i + 10];
          const player2 = buf[i + 11];
          const player3 = buf[i + 12];
          const importance = buf[i + 13];
          const importance2 = buf[i + 14];
          const importance3 = buf[i + 15];
          gossipHintsRawCache.set(`${msg.game}:${key}`, { type, regionId: rid, gi, gi2, gi3, player, player2, player3, importance, importance2, importance3 });
        }
        // Flush any keys that arrived via gossip_hint_read before the cache was populated.
        if (pendingHintReadKeys.size > 0) {
          for (const cacheKey of [...pendingHintReadKeys]) {
            if (gossipHintsRawCache.has(cacheKey)) {
              applyGossipHintRead(cacheKey);
              pendingHintReadKeys.delete(cacheKey);
            }
          }
        }
      } else if (msg.type === 'altar_read' && msg.game && msg.age) {
        altarRead.update(r => ({
          ootChild:  r.ootChild  || (msg.game === 'oot' && msg.age === 'child'),
          ootAdult:  r.ootAdult  || (msg.game === 'oot' && msg.age === 'adult'),
          mm:        r.mm        || (msg.game === 'mm'),
          ganonBoss: r.ganonBoss || (msg.game === 'oot' && msg.age === 'ganon'),
        }));
        console.log(`[autotrack] altar_read game=${msg.game} age=${msg.age}`);
      } else if (msg.type === 'gossip_hint_read' && msg.game !== undefined && msg.key !== undefined) {
        const key = msg.key;
        const cacheKey = `${msg.game}:${key}`;
        console.log(`[autotrack] gossip_hint_read key=${cacheKey} cached=${gossipHintsRawCache.has(cacheKey)} cacheSize=${gossipHintsRawCache.size} entry=`, gossipHintsRawCache.get(cacheKey));
        if (!_indexeddbSynced) {
          // Defer until IndexedDB has restored yHints, so seenGossipHintIds
          // is correct before we decide whether to skip this hint.
          _deferredHints.push(() => {
            if (gossipHintsRawCache.has(cacheKey)) {
              applyGossipHintRead(cacheKey);
            } else {
              pendingHintReadKeys.add(cacheKey);
            }
          });
        } else if (gossipHintsRawCache.has(cacheKey)) {
          applyGossipHintRead(cacheKey);
        } else {
          // Cache not yet populated (gossip_hints not yet received) — defer.
          pendingHintReadKeys.add(cacheKey);
        }
      } else if (msg.type === 'entrance_table' && msg.data && msg.game) {
        const buf = decode(msg.data);
        const game = msg.game as 'oot' | 'mm';
        // Always infer ER sub-types first — this is the detection step that enables ER.
        // (Running only when erActive would cause a chicken-and-egg deadlock.)
        getEntranceMaps()
          .then(maps => inferErSubTypesFromTable(buf, game === 'oot' ? maps.oot : maps.mm))
          .catch(err => console.error('[autotrack] entrance_table lookup failed:', err));
        // Always build BOTH revMaps — there is a single combined gEntrances table (OoT payload BSS)
        // that contains both OoT and MM entrance pairs. A separate MM table is never emitted.
        // Gating behind erActive caused a deadlock: the table is only re-emitted on content change
        // (fixed for the seed), so the revMap was never built after OR-merge.
        _ootEntranceRevMap.clear();
        _mmEntranceRevMap.clear();
        _entranceFwdMap.clear();
        let crossGameCount = 0;
        for (let i = 0; i + 8 <= buf.length; i += 8) {
          const srcId = u32be(buf, i);
          if (srcId === 0xFFFFFFFF) break;
          const dstRaw = u32be(buf, i + 4);
          const dstId  = dstRaw & 0x7FFFFFFF;
          // Non-identity mapping always wins: spawn entrance (187→828) must not be overwritten
          // by an identity interior-exit row (828→828) that shares the same dstId.
          if (!_ootEntranceRevMap.has(dstId) || srcId !== dstId) _ootEntranceRevMap.set(dstId, srcId);
          if (!_mmEntranceRevMap.has(dstId) || srcId !== dstId) _mmEntranceRevMap.set(dstId, srcId);
          _entranceFwdMap.set(srcId, dstRaw); // preserve bit31 for cross-game detection
          if (dstRaw & 0x80000000) crossGameCount++;
        }
        // Inject spawn pairs (not in gEntrances — derived from gComboConfig.entrancesSpawns).
        applySpawnMappings();
        console.log(`[autotrack] entrance_table (${game}) revMap built: ${_ootEntranceRevMap.size} entries (${crossGameCount} cross-game)`);
        // Re-resolve all visited player_entrances (covers both initial race condition and resync).
        for (const g of ['oot', 'mm'] as const) {
          const revMap  = g === 'oot' ? _ootEntranceRevMap : _mmEntranceRevMap;
          const visited = g === 'oot' ? _visitedOotDsts    : _visitedMmDsts;
          for (const dstId of visited) {
            const srcId = revMap.get(dstId);
            if (srcId != null) resolveAndRecordEntrance(g, dstId, srcId, yEntrances);
          }
        }
      } else if (msg.type === 'entrance' && msg.game && msg.saveEntrance != null) {
        // gComboCtx.entrance changed — may indicate a cross-game transition.
        // saveEntrance = gSave.entrance of the current game, captured on the same poll.
        // For OoT→MM: gSave.entrance in OoT is the OoT exit (srcId); forward map gives the MM dstId.
        // This fires before RDRAM relocation, so it's the only window to capture cross-game exits.
        const comboEntr = (msg.value ?? 0) & 0x7FFFFFFF;
        const saveEntr  = (msg.saveEntrance as number) & 0x7FFFFFFF;
        // Check both gComboCtx.entrance (comboEntr) and gSave.entrance (saveEntr) in the fwdMap.
        // gSave.entrance stays as the arrival entrance of the current scene; comboEntr is the target.
        const dstRawFromSave  = saveEntr !== 0 ? _entranceFwdMap.get(saveEntr)  : undefined;
        const dstRawFromCombo = comboEntr !== 0 ? _entranceFwdMap.get(comboEntr) : undefined;
        const revLookup = _ootEntranceRevMap.get(comboEntr) ?? _mmEntranceRevMap.get(comboEntr);
        console.log(`[autotrack] entrance event game=${msg.game} comboEntr=0x${comboEntr.toString(16)} saveEntr=0x${saveEntr.toString(16)} fwdSave=${dstRawFromSave != null ? '0x' + dstRawFromSave.toString(16) : 'miss'} fwdCombo=${dstRawFromCombo != null ? '0x' + dstRawFromCombo.toString(16) : 'miss'} revCombo=${revLookup != null ? '0x' + revLookup.toString(16) : 'miss'}`);
        // Cross-game via revMap: gComboCtx.entrance is set to the MM destination while still in OoT.
        // The OoT session revMap (built before RDRAM relocation) has comboEntr as a dstId.
        // After MM reattach the revMap is rebuilt from the MM table which drops this entry.
        // So we must record the cross-game connection NOW, during this OoT entrance event.
        if (revLookup != null && comboEntr !== 0) {
          console.log(`[autotrack] cross-game exit via revCombo: game=${msg.game} srcId=0x${revLookup.toString(16)} dstId=0x${comboEntr.toString(16)}`);
          resolveAndRecordEntrance(msg.game as 'oot' | 'mm', comboEntr, revLookup, yEntrances);
        } else if (saveEntr !== 0 && saveEntr !== 0x7FFFFFFF) {
          // Fallback: look up gSave.entrance in the forward map (cross-game when bit31 set).
          const dstRaw = dstRawFromSave;
          if (dstRaw != null && (dstRaw & 0x80000000) !== 0) {
            const dstId      = dstRaw & 0x7FFFFFFF;
            const targetGame = (msg.game as string) === 'oot' ? 'mm' : 'oot';
            console.log(`[autotrack] cross-game exit via fwdMap: ${msg.game}→${targetGame} srcId=0x${saveEntr.toString(16)} dstId=0x${dstId.toString(16)}`);
            resolveAndRecordEntrance(targetGame, dstId, saveEntr, yEntrances);
          }
        }
      } else if (msg.type === 'player_entrance' && msg.game && msg.value != null) {
        // Player entered a new scene — look up the entrance value in the reverse gEntrances map.
        // The value is gSave.entrance (destination after transition); reverse lookup gives the source.
        const game  = msg.game as 'oot' | 'mm';
        const dstId  = (msg.value as number) & 0x7FFFFFFF;
        const visited = game === 'oot' ? _visitedOotDsts : _visitedMmDsts;
        visited.add(dstId);
        _saveVisited();
        const revMap = game === 'oot' ? _ootEntranceRevMap : _mmEntranceRevMap;
        const srcId  = revMap.get(dstId);
        console.log(`[autotrack] player_entrance (${game}) dst=0x${dstId.toString(16)} src=${srcId != null ? `0x${srcId.toString(16)}` : 'not in revMap (size=' + revMap.size + ')'}`);
        if (srcId == null) return;
        resolveAndRecordEntrance(game, dstId, srcId, yEntrances);
      } else if (msg.type === 'shuffle_settings') {
        // Override-table scan result: set tracker settings for each detected shuffle type.
        // xflag sub-types (pot/crate/grass/etc.) are resolved separately via the xflag_keys message.
        ySettings.doc!.transact(() => {
          if (msg.cowShuffle) {
            ySettings.set('CowShuffleOOT', true);
            ySettings.set('CowShuffleMM',  true);
          }
          if (msg.scrubShuffle) {
            ySettings.set('ScrubsOOT', true);
            ySettings.set('ScrubsMM',  true);
          }
          if (msg.shopShuffle) {
            ySettings.set('ShopShuffleOOT', 'anywhere');
            ySettings.set('ShopShuffleMM',  'anywhere');
          }
          if (msg.gsShuffle) {
            ySettings.set('goldSkulltulaShuffleOOT', 'anywhere');
          }
          if (msg.sfShuffle) {
            ySettings.set('strayFairyChestShuffle', 'anywhere');
            ySettings.set('strayFairyOtherShuffle', 'anywhere');
          }
          if (msg.fishShuffle) {
            ySettings.set('pondFishShuffle', true);
          }
        });
        console.log('[autotrack] shuffle_settings applied:', {
          cow:   msg.cowShuffle,
          scrub: msg.scrubShuffle,
          shop:  msg.shopShuffle,
          gs:    msg.gsShuffle,
          sf:    msg.sfShuffle,
          fish:  msg.fishShuffle,
          xflag: msg.xflagShuffle,
        });
        // Apply per-type xflag fields resolved by C# (null = not detected → skip).
        ySettings.doc!.transact(() => {
          const s = (k: string, v: string | null | undefined) => { if (v != null) ySettings.set(k, v); };
          const b = (k: string, v: boolean | null | undefined) => { if (v) ySettings.set(k, true); };
          s('PotShuffleOOT',           msg.potShuffleOot);
          s('PotShuffleMM',            msg.potShuffleMm);
          s('CrateShuffleOOT',         msg.crateShuffleOot);
          s('CrateShuffleMM',          msg.crateShuffleMm);
          s('BarrelsShuffleMM',        msg.barrelsShuffleMm);
          s('GrassShuffleOOT',         msg.grassShuffleOot);
          s('GrassShuffleMM',          msg.grassShuffleMm);
          s('TreeShuffleMM',           msg.treeShuffleMm);
          s('SoilShuffleMM',           msg.soilShuffleMm);
          s('RupeeShuffleOOT',         msg.rupeeShuffleOot);
          s('RupeeShuffleMM',          msg.rupeeShuffleMm);
          s('HeartsShuffleOOT',        msg.heartsShuffleOot);
          s('SnowballShuffleMM',       msg.snowballShuffleMm);
          s('BushShuffleMM',           msg.bushShuffleMm);
          s('WonderShuffleOOT',        msg.wonderShuffleOot);
          s('RockShuffleMM',           msg.rockShuffleMm);
          b('HivesShuffleOOT',         msg.hivesShuffleOot);
          b('HivesShuffleMM',          msg.hivesShuffleMm);
          b('RockShuffleOOT',          msg.rockShuffleOot);
          b('TreeShuffleOOT',          msg.treeShuffleOot);
          b('SoilShuffleOOT',          msg.soilShuffleOot);
          b('HeartsShuffleMM',         msg.heartShuffleMm);
          b('WonderShuffleMM',         msg.wonderShuffleMm);
          b('ButterflyShuffleOOT',     msg.butterflyShuffleOot);
          b('ButterflyShuffleMM',      msg.butterflyShuffleMm);
          b('RedBoulderShuffleOOT',    msg.redBoulderShuffleOot);
          b('RedBoulderShuffleMM',     msg.redBoulderShuffleMm);
          b('IciclesShuffleOOT',       msg.iciclesShuffleOot);
          b('IciclesShuffleMM',        msg.iciclesShuffleMm);
          b('FairySpotShuffleOOT',     msg.fairySpotShuffleOot);
          b('FairyFountainShuffleOOT', msg.fairyFountainShuffleOot);
          b('FairyFountainShuffleMM',  msg.fairyFountainShuffleMm);
          b('BushShuffleOOT',          msg.bushShuffleOot);
          b('RedIceShuffleOOT',        msg.redIceShuffleOot);
        });
      } else if (msg.type === 'oot_scene_flags' && msg.data) {
        const buf = decode(msg.data);
        if (activeGame === null || mqBitmask === null) { pendingOotFlags = buf; }
        else {
          const mq = mqBitmask;
          getSceneFlagLookup(mq)
            .then(lookup => applySceneFlags(buf, 'oot', 124, lookup, yChecks))
            .catch(err => console.error('[autotrack] oot scene lookup failed:', err));
        }
      } else if (msg.type === 'mm_scene_flags' && msg.data) {
        const buf = decode(msg.data);
        // hasVisitedMm guards against stale RDRAM: SaveContextMm scene flags are only
        // initialised when the player first enters MM. Before that, the address holds data
        // from a prior session.
        if (!hasVisitedMm || activeGame === null || mqBitmask === null) { pendingMmFlags = buf; }
        else {
          const mq = mqBitmask;
          getSceneFlagLookup(mq)
            .then(lookup => applySceneFlags(buf, 'mm', 120, lookup, yChecks))
            .catch(err => console.error('[autotrack] mm scene lookup failed:', err));
        }
      } else if (msg.type === 'oot_npc_flags' && msg.data) {
        console.log('[autotrack] oot_npc_flags received', { dataLen: msg.data.length, activeGame, mqBitmask });
        const buf = decode(msg.data);
        console.log('[autotrack] oot_npc_flags decoded', { bufLen: buf.length, nonZero: buf.filter(b => b !== 0).length });
        if (activeGame === null || mqBitmask === null) { console.log('[autotrack] oot_npc_flags: buffering', { activeGame, mqBitmask }); pendingOotNpcFlags = buf; }
        else {
          const mq = mqBitmask;
          getNpcFlagLookup(mq)
            .then(lookup => applyNpcFlags(buf, 'oot', lookup, yChecks))
            .catch(err => console.error('[autotrack] oot npc lookup failed:', err));
        }
      } else if (msg.type === 'oot_xflags' && msg.data) {
        const buf = decode(msg.data);
        if (activeGame === null || mqBitmask === null) { pendingOotXflags = buf; }
        else {
          const mq = mqBitmask;
          getXflagLookup(mq)
            .then(({ oot }) => applyXflags(buf, oot, yChecks))
            .catch(err => console.error('[autotrack] oot xflags failed:', err));
        }
      } else if (msg.type === 'mm_xflags' && msg.data) {
        const buf = decode(msg.data);
        if (!hasVisitedMm || activeGame === null || mqBitmask === null) { pendingMmXflags = buf; }
        else {
          const mq = mqBitmask;
          getXflagLookup(mq)
            .then(({ mm }) => applyXflags(buf, mm, yChecks))
            .catch(err => console.error('[autotrack] mm xflags failed:', err));
        }
      } else if (msg.type === 'scene_change' && msg.game && typeof msg.sceneId === 'number') {
        if (activeGame !== null) currentAutotrackScene.set({ game: msg.game as 'oot' | 'mm', sceneId: msg.sceneId });
      } else if (msg.type === 'song_event_slot' && msg.trackerKey && msg.songIdx !== undefined) {
        const itemId = SONG_IDX_TO_ITEM[msg.songIdx];
        if (itemId) ySongEvents.set(msg.trackerKey, itemId);
      } else if (msg.type === 'shop_data' && msg.game && Array.isArray(msg.slots)) {
        const idToCheck = msg.game === 'oot' ? OOT_SHOPID_TO_CHECK : MM_SHOPID_TO_CHECK;
        const slots = msg.slots;
        getGiNames().then(giNames => {
          yShopItems.doc!.transact(() => {
            for (const slot of slots) {
              const checkName = idToCheck[slot.shopId];
              if (!checkName) continue;
              if (slot.price > 0) yShopPrices.set(checkName, slot.price);
              if (slot.gi > 0 && (yChecks.get(checkName) ?? 0) < 2) {
                const itemName = giNames.get(slot.gi) ?? `GI#${slot.gi}`;
                const display = slot.player > 1 ? `P${slot.player} ${itemName}` : itemName;
                yShopItems.set(checkName, display);
              }
            }
          });
        }).catch(err => console.error('[autotrack] shop GI lookup failed:', err));
      }
    };

    ws.onerror = () => {};

    ws.onclose = () => {
      _status.set('disconnected');
      ws = null;
      if (!stopped && enabled) {
        const delay = Math.min(RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttempt), 30000) + Math.random() * 1000;
        reconnectAttempt++;
        reconnectTimer = setTimeout(connect, delay);
      }
    };
  }

  const unsubEnabled = autotrackEnabled.subscribe(val => {
    enabled = val;
    if (!val) {
      if (reconnectTimer !== null) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      ws?.close();
    } else if (!ws && !stopped) {
      connect();
    }
  });

  _resyncFn = () => {
    if (ws?.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ type: 'resync' }));
  };

  connect();

  return () => {
    stopped = true;
    _resyncFn = null;
    unsubEnabled();
    if (reconnectTimer !== null) clearTimeout(reconnectTimer);
    ws?.close();
    _status.set('disconnected');
  };
}
