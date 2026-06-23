import { writable, type Readable } from 'svelte/store';
import type { Map as YMap } from 'yjs';

// ─── Save buffer offsets ────────────────────────────────────────────────────
// All offsets are byte indices into the 0x200-byte Read() result that starts
// at the game's gSaveContext address.

// OoT: gSaveContext = 0x8011A5D0 (OotSaveContext / OotSave at offset 0)
// ASSERT_OFFSET sources: include/combo/oot/save.h
const OOT = {
  MAGIC:     0x1C, // "ZELDAZ" — OotSave.info.playerData.newf
  ITEMS:     0x74, // u8[24]  — OotInventory.items
  AMMO:      0x8C, // u8[15]  — OotInventory.ammo
  EQUIP:     0x9C, // u16     — OotEquipment (boots:4,tunics:4,shields:4,swords:4, MSB-first)
  UPGRADES:  0xA0, // u32     — OotSaveUpgrades bitfield
  QUEST:     0xA4, // u32     — OotSaveQuest bitfield
  DUNG_ITEMS:0xA8, // u8[20]  — OotDungeonItems[20]
  DUNG_KEYS: 0xBC, // s8[19]  — dungeonKeys[19]
};

// MM: gSaveContext = 0x801EF670 (MmSaveContext with MmSave at offset 0)
// ASSERT_OFFSET sources: include/combo/mm/save.h
// MmSave.info (MmSaveInfo) at 0x24; playerData=0x28, itemEquips=0x22 (+2pad), inventory at info+0x4C
const MM = {
  MAGIC:     0x24, // "ZELDA3" — MmSave.info.playerData.newf
  EQUIP:     0x6C, // u16     — MmItemEquips bitfield (boots:4,tunic:4,shield:4,sword:4, MSB-first)
  ITEMS:     0x70, // u8[48]  — MmInventory.items
  AMMO:      0xA0, // s8[24]  — MmInventory.ammo
  UPGRADES:  0xB8, // u32     — MmUpgrades bitfield
  QUEST:     0xBC, // u32     — MmQuestItems bitfield
  DUNG_ITEMS:0xC0, // u8[10]  — MmDungeonItems[10]
  DUNG_KEYS: 0xCA, // s8[9]
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
  MASK_POSTMAN: 0x3E,
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
// These perm slots store MM state even before the player visits MM.
const OOT_EXTRA = {
  MM_BOSS:   0x138, // MmExtraBoss   (index 3)
  MM_ITEMS:  0x154, // MmExtraItems  (index 4)
  MM_FLAGS:  0x18C, // MmExtraFlags  (index 6)
  MM_FLAGS2: 0x1A8, // MmExtraFlags2 (index 7)
};

// Reads MM items embedded in the OoT perm flags (SAVE_EXTRA_RECORD).
// Uses raise() — only increases item levels, never clears.
// applyMmSave() is authoritative once "ZELDA3" is present; this supplements it.
function applyOotSaveExtra(buf: Uint8Array, yItems: YMap<number>): void {
  function raise(id: string, level: number): void {
    if (level > (yItems.get(id) ?? 0)) yItems.set(id, level);
  }

  // MmExtraBoss: boss is a plain u8 at the first byte.
  // Bits set in dungeon.c: bit 0=Odolwa, 1=Goht, 2=Gyorg, 3=Twinmold.
  const boss = buf[OOT_EXTRA.MM_BOSS];
  raise('remains_odolwa',   (boss >> 0) & 1);
  raise('remains_goht',     (boss >> 1) & 1);
  raise('remains_gyorg',    (boss >> 2) & 1);
  raise('remains_twinmold', (boss >> 3) & 1);

  // MmExtraItems — u32 bitfield, first-declared = bit 0 (LSB-first, same as quest items).
  // hookshot:2 (0=none,1=hookshot,2=longshot), ocarina:2, goldDust:1, hammerGFS:2,
  // boomPicto:2 (2=pictobox), bowSlingshot:2
  const mxi = u32be(buf, OOT_EXTRA.MM_ITEMS);
  raise('mm_hookshot', mxi & 3);                    // bits 1:0
  raise('mm_ocarina',  ((mxi >> 2) & 3) >= 1 ? 1 : 0); // bits 3:2
  raise('mm_pictobox', ((mxi >> 7) & 3) === 2 ? 1 : 0); // bits 8:7

  // MmExtraFlags — u32 bitfield, first-declared = bit 0.
  const mxf = u32be(buf, OOT_EXTRA.MM_FLAGS);
  raise('mm_song_soaring', (mxf >> 1)  & 1);
  raise('mm_song_epona',   (mxf >> 3)  & 1);
  raise('mask_romani',     (mxf >> 4)  & 1);
  raise('mask_garo',       (mxf >> 5)  & 1);
  raise('mask_zora',       (mxf >> 6)  & 1);
  raise('mask_goron',      (mxf >> 10) & 1);
  // MM sword tiers obtained in OoT: razor=2, gilded=3
  raise('mm_sword', (mxf >> 9) & 1 ? 3 : (mxf >> 8) & 1 ? 2 : 0);
  raise('mm_keg',          (mxf >> 20) & 1);
  raise('mm_song_storms',  (mxf >> 22) & 1);
  raise('mm_song_elegy',   (mxf >> 23) & 1);

  // MmExtraFlags2 — u32 bitfield, first-declared = bit 0.
  const mxf2 = u32be(buf, OOT_EXTRA.MM_FLAGS2);
  raise('mask_kafei',         (mxf2 >> 3)  & 1);
  raise('mm_roomkey',         (mxf2 >> 5)  & 1);
  raise('mm_letter',          (mxf2 >> 6)  & 1);
  raise('mm_pendant',         (mxf2 >> 7)  & 1);
  raise('mm_delivery',        (mxf2 >> 8)  & 1);
  raise('mask_postman',       (mxf2 >> 14) & 1);
  raise('mask_circus_leader', (mxf2 >> 15) & 1);
  raise('mask_fierce_deity',  (mxf2 >> 16) & 1);
  raise('mm_song_oath',       (mxf2 >> 18) & 1);
  raise('mask_truth_mm',      (mxf2 >> 24) & 1);
  raise('mm_tear',            (mxf2 >> 25) & 1);
  raise('mm_song_healing',    (mxf2 >> 26) & 1);
}

// ─── OoT save parser ─────────────────────────────────────────────────────────

function applyOotSave(buf: Uint8Array, yItems: YMap<number>): void {
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

  function set(id: string, level: number) {
    if (level !== (yItems.get(id) ?? 0)) yItems.set(id, level);
  }

  // ── Inventory items (scan whole array for item ID) ──
  set('sticks_oot', hasItem(items, OOT_ITEM.STICK)  ? Math.max(1, dekuStick) : 0);
  set('nuts_oot',   hasItem(items, OOT_ITEM.NUT)    ? Math.max(1, dekuNut)   : 0);
  set('bomb',       hasItem(items, OOT_ITEM.BOMB)   ? Math.max(1, bombBag)   : 0);
  set('bombchu',    hasItem(items, OOT_ITEM.BOMBCHU) ? 1 : 0);
  set('din',        hasItem(items, OOT_ITEM.DINS_FIRE) ? 1 : 0);
  set('farore',     hasItem(items, OOT_ITEM.FARORE_WIND) ? 1 : 0);
  set('nayru',      hasItem(items, OOT_ITEM.NAYRU_LOVE) ? 1 : 0);
  set('boomerang',  hasItem(items, OOT_ITEM.BOOMERANG) ? 1 : 0);
  set('lens',       hasItem(items, OOT_ITEM.LENS) ? 1 : 0);
  set('bean',       hasItem(items, OOT_ITEM.BEANS) ? 1 : 0);
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

  // ── Equipment (tracks what is equipped, not owned) ──
  set('sword_kokiri',  swords >= 1 ? 1 : 0);
  set('sword_master',  swords >= 2 ? 1 : 0);
  set('sword_biggoron',swords >= 3 ? 1 : 0);
  set('deku_shield',   shields >= 1 ? 1 : 0);
  set('hyrule_shield', shields >= 2 ? 1 : 0);
  set('shield_mirror', shields >= 3 ? 1 : 0);
  set('tunic_goron',   tunics >= 2 ? 1 : 0);
  set('tunic_zora',    tunics >= 3 ? 1 : 0);
  set('boots_iron',    boots >= 2 ? 1 : 0);
  set('boots_hover',   boots >= 3 ? 1 : 0);

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

  // MM items embedded in OoT perm flags (visible before first MM visit).
  applyOotSaveExtra(buf, yItems);
}

// ─── MM save parser ───────────────────────────────────────────────────────────

function applyMmSave(buf: Uint8Array, yItems: YMap<number>): void {
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

  function set(id: string, level: number) {
    if (level !== (yItems.get(id) ?? 0)) yItems.set(id, level);
  }

  // ── Inventory scan ──
  set('mm_ocarina',    hasItem(items, MM_ITEM.OCARINA_TIME) ? 1 : 0);
  set('mm_bow',        hasItem(items, MM_ITEM.BOW) ? Math.max(1, mmQuiver) : 0);
  set('mm_arrow_fire', hasItem(items, MM_ITEM.ARROW_FIRE)  ? 1 : 0);
  set('mm_arrow_ice',  hasItem(items, MM_ITEM.ARROW_ICE)   ? 1 : 0);
  set('mm_arrow_light',hasItem(items, MM_ITEM.ARROW_LIGHT) ? 1 : 0);
  set('mm_bomb',       hasItem(items, MM_ITEM.BOMB)   ? Math.max(1, mmBombBag) : 0);
  set('mm_bombchu',    hasItem(items, MM_ITEM.BOMBCHU) ? 1 : 0);
  set('mm_stick',      hasItem(items, MM_ITEM.STICK)  ? Math.max(1, mmDekuStick) : 0);
  set('mm_nuts',       hasItem(items, MM_ITEM.NUT)    ? Math.max(1, mmDekuNut)   : 0);
  set('mm_bean',       hasItem(items, MM_ITEM.BEANS) ? 1 : 0);
  set('mm_keg',        hasItem(items, MM_ITEM.POWDER_KEG) ? 1 : 0);
  set('mm_pictobox',   hasItem(items, MM_ITEM.PICTOBOX)   ? 1 : 0);
  set('mm_lens',       hasItem(items, MM_ITEM.LENS)        ? 1 : 0);
  set('mm_hookshot',   hasItem(items, MM_ITEM.HOOKSHOT)    ? 1 : 0);
  set('mm_fairysword', hasItem(items, MM_ITEM.FAIRY_SWORD) ? 1 : 0);
  set('mm_tear',       hasItem(items, MM_ITEM.MOON_TEAR)   ? 1 : 0);
  set('mm_deed1',      hasItem(items, MM_ITEM.DEED_LAND)    ? 1 : 0);
  set('mm_deed2',      hasItem(items, MM_ITEM.DEED_SWAMP)   ? 1 : 0);
  set('mm_deed3',      hasItem(items, MM_ITEM.DEED_MOUNTAIN)? 1 : 0);
  set('mm_deed4',      hasItem(items, MM_ITEM.DEED_OCEAN)   ? 1 : 0);
  set('mm_roomkey',    hasItem(items, MM_ITEM.ROOM_KEY)     ? 1 : 0);
  set('mm_delivery',   hasItem(items, MM_ITEM.LETTER_MAMA)  ? 1 : 0);
  set('mm_letter',     hasItem(items, MM_ITEM.LETTER_KAFEI) ? 1 : 0);
  set('mm_pendant',    hasItem(items, MM_ITEM.PENDANT)      ? 1 : 0);

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

  // ── Equipment ──
  set('mm_sword',      mmSword);   // 1=Kokiri, 2=Razor, 3=Gilded
  set('mm_shield',     mmShield >= 1 ? 1 : 0);
  set('mm_mirror',     mmShield >= 2 ? 1 : 0);
  set('mm_tunic_goron',mmTunic >= 2 ? 1 : 0);
  set('mm_tunic_zora', mmTunic >= 3 ? 1 : 0);
  set('mm_boots_iron', mmBoots >= 2 ? 1 : 0);
  set('mm_boots_hover',mmBoots >= 3 ? 1 : 0);

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
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type AutotrackStatus = 'disconnected' | 'connecting' | 'connected';

const _status = writable<AutotrackStatus>('disconnected');
export const autotrackStatus: Readable<AutotrackStatus> = _status;

const WS_URL = 'ws://localhost:8338/';
const RECONNECT_DELAY_MS = 3000;

export function initAutotrack(yItems: YMap<number>): () => void {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  function connect(): void {
    if (stopped) return;
    _status.set('connecting');
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      _status.set('connected');
    };

    ws.onmessage = (ev: MessageEvent) => {
      let msg: { type: string; data?: string; game?: string; value?: number };
      try { msg = JSON.parse(ev.data as string); } catch { return; }

      if (msg.type === 'connected') {
        _status.set('connected');
      } else if (msg.type === 'disconnected') {
        _status.set('connecting');
      } else if (msg.type === 'oot_save' && msg.data) {
        const raw = atob(msg.data);
        const buf = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
        applyOotSave(buf, yItems);
      } else if (msg.type === 'mm_save' && msg.data) {
        const raw = atob(msg.data);
        const buf = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
        applyMmSave(buf, yItems);
      }
    };

    ws.onerror = () => {};

    ws.onclose = () => {
      _status.set('disconnected');
      ws = null;
      if (!stopped) {
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };
  }

  connect();

  return () => {
    stopped = true;
    if (reconnectTimer !== null) clearTimeout(reconnectTimer);
    ws?.close();
    _status.set('disconnected');
  };
}
