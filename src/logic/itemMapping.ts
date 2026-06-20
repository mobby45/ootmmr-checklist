// Maps our tracker item IDs (+ level) to OoTMM logic item IDs.
// Returns an array of [ootmmId, count] pairs to merge into LogicState.items.
//
// OoTMM uses both progressive counters (SWORD → count) and named items
// (SWORD_MASTER → 0|1). We emit both when relevant.

export type ItemGrant = [id: string, count: number];

export function trackerItemToLogic(id: string, level: number, notesMode = false): ItemGrant[] {
  if (level <= 0) return [];
  switch (id) {
    // ─── OoT swords ──────────────────────────────────────────────────────────
    case 'sword_kokiri':    return [['OOT_SWORD_KOKIRI', 1], ['OOT_SWORD', 1]];
    case 'sword_master':    return [['OOT_SWORD_MASTER', 1], ['OOT_SWORD', 2]];
    case 'sword_biggoron':  return [['OOT_SWORD_BIGGORON', 1], ['OOT_GREAT_FAIRY_SWORD', 1]];
    case 'giant_knife':     return [['OOT_SWORD_BIGGORON', 1]];

    // ─── OoT equipment ───────────────────────────────────────────────────────
    case 'shield_mirror':   return [['OOT_SHIELD_MIRROR', 1], ['OOT_SHIELD', 3]];
    case 'deku_shield':     return [['OOT_SHIELD_DEKU', 1],   ['OOT_SHIELD', 1]];
    case 'hyrule_shield':   return [['OOT_SHIELD_HYRULE', 1], ['OOT_SHIELD', 2]];
    case 'boots_iron':      return [['OOT_BOOTS_IRON', 1]];
    case 'boots_hover':     return [['OOT_BOOTS_HOVER', 1]];
    case 'tunic_goron':     return [['OOT_TUNIC_GORON', 1]];
    case 'tunic_zora':      return [['OOT_TUNIC_ZORA', 1]];

    // OoT progressive swords — macros use has(SWORD, N) when progressiveSwordsOot=progressive
    case 'oot_sword_progressive':
      return [['OOT_SWORD', level]];

    // Progressive Giant's Knife → Biggoron (used alongside separate kokiri/master)
    case 'oot_sword_progressive_giantbiggoron':
      if (level === 1) return [['OOT_SWORD_BIGGORON', 1]];
      return              [['OOT_SWORD_BIGGORON', 1], ['OOT_GREAT_FAIRY_SWORD', 1]];

    // OoT progressive shields — macros use has(SHIELD, N) when progressiveShieldsOot=progressive
    case 'oot_shield_progressive':
      return [['OOT_SHIELD', level]];

    // Strength: level 1 = Silver Gauntlets, 2 = Gold Gauntlets, 3 = progressive max
    case 'strength':
      if (level === 1) return [['OOT_STRENGTH', 1]];
      if (level === 2) return [['OOT_STRENGTH', 2], ['OOT_STRENGTH_SILVER', 1]];
      return              [['OOT_STRENGTH', 3], ['OOT_STRENGTH_SILVER', 1], ['OOT_STRENGTH_GOLD', 1]];

    // Scale: level 1 = silver, level 2 = gold, level 3 = bronze (no scale / swim check)
    case 'scale':
      if (level === 1) return [['OOT_SCALE', 1]];
      if (level === 2) return [['OOT_SCALE', 2], ['OOT_SCALE_SILVER', 1]];
      return              [['OOT_SCALE', 3], ['OOT_SCALE_SILVER', 1], ['OOT_SCALE_GOLDEN', 1]];

    // ─── OoT items ───────────────────────────────────────────────────────────
    case 'hookshot':
      if (level === 1) return [['OOT_HOOKSHOT', 1]];
      return              [['OOT_HOOKSHOT', 1], ['OOT_LONGSHOT', 1]];

    case 'ocarina':
      // has_ocarina checks has(OCARINA); has_ocarina_of_time checks has(OCARINA, 2)
      if (level === 1) return [['OCARINA', 1]];
      return              [['OCARINA', 2]];

    case 'bow':       return [['OOT_BOW', 1], ['OOT_BOW_AMMO', level * 10]];
    case 'slingshot': return [['OOT_SLINGSHOT', 1], ['OOT_SLINGSHOT_AMMO', level * 10]];
    case 'bomb':      return [['OOT_BOMB_BAG', 1]];
    case 'bombchu':   return [['OOT_BOMBCHU', 1], ['license_BOMBCHU_5', 1]];
    case 'boomerang': return [['OOT_BOOMERANG', 1]];
    case 'hammer':    return [['OOT_HAMMER', 1]];
    case 'lens':      return [['OOT_LENS', 1]];
    case 'bean':      return [['OOT_MAGIC_BEAN', 1], ['MAGIC_BEAN', 1], ['license_MAGIC_BEAN', 1]];
    case 'agony':     return [['OOT_STONE_OF_AGONY', 1]];
    case 'gerudo_card': return [['OOT_GERUDO_CARD', 1]];
    case 'din':       return [['OOT_SPELL_FIRE', 1]];
    case 'farore':    return [['OOT_SPELL_WIND', 1]];
    case 'nayru':     return [['OOT_SPELL_LOVE', 1]];
    case 'magic_oot': return [['OOT_MAGIC_UPGRADE', level]];
    case 'sticks_oot': return [['OOT_STICKS', 1], ['OOT_STICK', 1]];
    case 'nuts_oot':   return [['OOT_NUTS', 1],  ['OOT_NUTS_5', 1]];

    // Arrows (OoT)
    case 'arrow_fire_oot':  return [['OOT_ARROW_FIRE', 1]];
    case 'arrow_ice_oot':   return [['OOT_ARROW_ICE', 1]];
    case 'arrow_light_oot': return [['OOT_ARROW_LIGHT', 1]];

    // Wallet: level 1 = 99, 2 = 200, 3 = 500
    case 'wallet':    return [['OOT_WALLET', level]];

    // Bottles (OoT)
    case 'bottle_1':
    case 'bottle_2':
    case 'bottle_3':  return [['OOT_BOTTLE', 1]];

    case 'bottle_letter': return [['OOT_BOTTLE', 1], ['OOT_RUTOS_LETTER', 1]];
    case 'scarecrow_oot': return [['OOT_SCARECROW', 1]];
    case 'key_skeleton':  return [['OOT_SKELETON_KEY', 1]];

    // OoT dungeon boss keys
    case 'oot_bk_forest': return [['OOT_BOSS_KEY_FOREST', 1]];
    case 'oot_bk_fire':   return [['OOT_BOSS_KEY_FIRE', 1]];
    case 'oot_bk_water':  return [['OOT_BOSS_KEY_WATER', 1]];
    case 'oot_bk_shadow': return [['OOT_BOSS_KEY_SHADOW', 1]];
    case 'oot_bk_spirit': return [['OOT_BOSS_KEY_SPIRIT', 1]];
    case 'oot_bk_ganon':  return [['OOT_BOSS_KEY_GANON', 1]];

    // OoT dungeon small keys (countable — emit level as count)
    case 'forest_sk': return [['OOT_SMALL_KEY_FOREST', level]];
    case 'fire_sk':   return [['OOT_SMALL_KEY_FIRE',   level]];
    case 'water_sk':  return [['OOT_SMALL_KEY_WATER',  level]];
    case 'spirit_sk': return [['OOT_SMALL_KEY_SPIRIT', level]];
    case 'shadow_sk': return [['OOT_SMALL_KEY_SHADOW', level]];
    case 'gc_sk':     return [['OOT_SMALL_KEY_GANON',  level]];
    case 'gtg_sk':    return [['OOT_SMALL_KEY_GTG',    level]];
    case 'th_sk':     return [['OOT_SMALL_KEY_GF',     level]];
    case 'botw_sk':   return [['OOT_SMALL_KEY_BOTW',   level]];

    // OoT trade items
    case 'trade_c_egg':       return [['OOT_WEIRD_EGG', 1]];
    case 'trade_c_cucco':     return [['OOT_CUCCO', 1]];
    case 'trade_c_letter':    return [['OOT_ZELDAS_LETTER', 1]];
    case 'trade_a_cojiro':    return [['OOT_COJIRO', 1]];
    case 'trade_a_cucco':     return [['OOT_POCKET_CUCCO', 1]];
    case 'trade_a_mushroom':  return [['OOT_ODD_MUSHROOM', 1]];
    case 'trade_a_potion':    return [['OOT_ODD_POTION', 1]];
    case 'trade_a_saw':       return [['OOT_POACHER_SAW', 1]];
    case 'trade_a_broken':    return [['OOT_BROKEN_GORON_SWORD', 1]];
    case 'trade_a_rx':        return [['OOT_PRESCRIPTION', 1]];
    case 'trade_a_drops':     return [['OOT_EYE_DROPS', 1]];
    case 'trade_a_claim':     return [['OOT_CLAIM_CHECK', 1]];
    case 'trade_a_frog':      return [['OOT_EYEBALL_FROG', 1]];

    // OoT rewards
    case 'stone_emerald':     return [['OOT_STONE_EMERALD', 1]];
    case 'stone_ruby':        return [['OOT_STONE_RUBY', 1]];
    case 'stone_sapphire':    return [['OOT_STONE_SAPPHIRE', 1]];
    case 'medal_forest':      return [['OOT_MEDALLION_FOREST', 1], ['OOT_MEDALLION', 1]];
    case 'medal_fire':        return [['OOT_MEDALLION_FIRE', 1],   ['OOT_MEDALLION', 1]];
    case 'medal_water':       return [['OOT_MEDALLION_WATER', 1],  ['OOT_MEDALLION', 1]];
    case 'medal_shadow':      return [['OOT_MEDALLION_SHADOW', 1], ['OOT_MEDALLION', 1]];
    case 'medal_spirit':      return [['OOT_MEDALLION_SPIRIT', 1], ['OOT_MEDALLION', 1]];
    case 'medal_light':       return [['OOT_MEDALLION_LIGHT', 1],  ['OOT_MEDALLION', 1]];

    // OoT songs — game-prefixed so they only satisfy OoT logic (not MM and vice-versa)
    case 'oot_song_zelda':    return notesMode ? [['OOT_SONG_NOTE_ZELDA', level]]     : [['OOT_SONG_ZELDA', 1]];
    case 'oot_song_epona':    return notesMode ? [['OOT_SONG_NOTE_EPONA', level]]     : [['OOT_SONG_EPONA', 1]];
    case 'oot_song_saria':    return notesMode ? [['OOT_SONG_NOTE_SARIA', level]]     : [['OOT_SONG_SARIA', 1]];
    case 'oot_song_sun':      return notesMode ? [['OOT_SONG_NOTE_SUN', level]]       : [['OOT_SONG_SUN', 1]];
    case 'oot_song_time':     return notesMode ? [['OOT_SONG_NOTE_TIME', level]]      : [['OOT_SONG_TIME', 1]];
    case 'oot_song_storms':   return notesMode ? [['OOT_SONG_NOTE_STORMS', level]]    : [['OOT_SONG_STORMS', 1]];
    case 'oot_song_minuet':   return notesMode ? [['OOT_SONG_NOTE_TP_FOREST', level]] : [['OOT_SONG_TP_FOREST', 1]];
    case 'oot_song_bolero':   return notesMode ? [['OOT_SONG_NOTE_TP_FIRE', level]]   : [['OOT_SONG_TP_FIRE', 1]];
    case 'oot_song_serenade': return notesMode ? [['OOT_SONG_NOTE_TP_WATER', level]]  : [['OOT_SONG_TP_WATER', 1]];
    case 'oot_song_requiem':  return notesMode ? [['OOT_SONG_NOTE_TP_SPIRIT', level]] : [['OOT_SONG_TP_SPIRIT', 1]];
    case 'oot_song_nocturne': return notesMode ? [['OOT_SONG_NOTE_TP_SHADOW', level]] : [['OOT_SONG_TP_SHADOW', 1]];
    case 'oot_song_prelude':  return notesMode ? [['OOT_SONG_NOTE_TP_LIGHT', level]]  : [['OOT_SONG_TP_LIGHT', 1]];
    case 'oot_elegy':         return notesMode ? [['OOT_SONG_NOTE_EMPTINESS', level]]  : [['OOT_SONG_EMPTINESS', 1]];
    // MM-origin songs placed in OoT's item pool — satisfy both games since the song is physically obtained
    case 'oot_song_healing':  return notesMode ? [['OOT_SONG_NOTE_HEALING', level], ['MM_SONG_NOTE_HEALING', level]]   : [['OOT_SONG_HEALING', 1], ['MM_SONG_HEALING', 1]];
    case 'oot_song_soaring':  return notesMode ? [['OOT_SONG_NOTE_SOARING', level], ['MM_SONG_NOTE_SOARING', level]]   : [['OOT_SONG_SOARING', 1], ['MM_SONG_SOARING', 1]];
    case 'oot_song_sonata':   return notesMode ? [['OOT_SONG_NOTE_AWAKENING', level], ['MM_SONG_NOTE_AWAKENING', level]] : [['OOT_SONG_AWAKENING', 1], ['MM_SONG_AWAKENING', 1]];
    case 'oot_song_lullaby':
      if (notesMode) return [['OOT_SONG_NOTE_GORON', level], ['MM_SONG_NOTE_GORON', level]];
      return level === 2 ? [['OOT_SONG_GORON_HALF', 1], ['OOT_SONG_GORON', 1], ['MM_SONG_GORON_HALF', 1], ['MM_SONG_GORON', 1]] : [['OOT_SONG_GORON_HALF', 1], ['MM_SONG_GORON_HALF', 1]];
    case 'oot_song_nova':     return notesMode ? [['OOT_SONG_NOTE_ZORA', level], ['MM_SONG_NOTE_ZORA', level]]      : [['OOT_SONG_ZORA', 1], ['MM_SONG_ZORA', 1]];
    case 'oot_song_oath':     return notesMode ? [['OOT_SONG_NOTE_ORDER', level], ['MM_SONG_NOTE_ORDER', level]]     : [['OOT_SONG_ORDER', 1], ['MM_SONG_ORDER', 1]];

    // Skulltula
    case 'skulltula_token':   return [['OOT_GS_TOKEN', level]];

    // OoT collectibles with logic impact
    case 'skulltula_platinum':
    case 'oot_platinum_token': return [['OOT_PLATINUM_TOKEN', 1]];
    case 'oot_rupee_magical':  return [['RUPEE_MAGICAL', 1]];
    case 'oot_spin_upgrade':   return [['OOT_SPIN_UPGRADE', 1]];

    // ─── MM items ────────────────────────────────────────────────────────────
    case 'mm_ocarina':        return [['OCARINA', 1]];
    // MM songs — game-prefixed so they only satisfy MM logic (not OoT and vice-versa)
    case 'mm_song_healing':   return notesMode ? [['MM_SONG_NOTE_HEALING', level]]   : [['MM_SONG_HEALING', 1]];
    case 'mm_song_soaring':   return notesMode ? [['MM_SONG_NOTE_SOARING', level]]   : [['MM_SONG_SOARING', 1]];
    case 'mm_song_storms':    return notesMode ? [['MM_SONG_NOTE_STORMS', level]]    : [['MM_SONG_STORMS', 1]];
    case 'mm_song_sonata':    return notesMode ? [['MM_SONG_NOTE_AWAKENING', level]]  : [['MM_SONG_AWAKENING', 1]];
    case 'mm_song_lullaby':
      if (notesMode) return [['MM_SONG_NOTE_GORON', level]];
      return level === 2 ? [['MM_SONG_GORON_HALF', 1], ['MM_SONG_GORON', 1]] : [['MM_SONG_GORON_HALF', 1]];
    case 'mm_song_nova':      return notesMode ? [['MM_SONG_NOTE_ZORA', level]]      : [['MM_SONG_ZORA', 1]];
    case 'mm_song_oath':      return notesMode ? [['MM_SONG_NOTE_ORDER', level]]     : [['MM_SONG_ORDER', 1]];
    case 'mm_song_elegy':     return notesMode ? [['MM_SONG_NOTE_EMPTINESS', level]]  : [['MM_SONG_EMPTINESS', 1]];
    case 'mm_song_time':      return notesMode ? [['MM_SONG_NOTE_TIME', level]]      : [['MM_SONG_TIME', 1]];
    case 'mm_song_epona':     return notesMode ? [['MM_SONG_NOTE_EPONA', level]]     : [['MM_SONG_EPONA', 1]];
    case 'mm_song_saria':     return notesMode ? [['MM_SONG_NOTE_SARIA', level]]     : [['MM_SONG_SARIA', 1]];
    case 'mm_song_zelda':     return notesMode ? [['MM_SONG_NOTE_ZELDA', level]]     : [['MM_SONG_ZELDA', 1]];
    case 'mm_song_minuet':    return notesMode ? [['MM_SONG_NOTE_TP_FOREST', level]] : [['MM_SONG_TP_FOREST', 1]];
    case 'mm_song_bolero':    return notesMode ? [['MM_SONG_NOTE_TP_FIRE', level]]   : [['MM_SONG_TP_FIRE', 1]];
    case 'mm_song_serenade':  return notesMode ? [['MM_SONG_NOTE_TP_WATER', level]]  : [['MM_SONG_TP_WATER', 1]];
    case 'mm_song_requiem':   return notesMode ? [['MM_SONG_NOTE_TP_SPIRIT', level]] : [['MM_SONG_TP_SPIRIT', 1]];
    case 'mm_song_nocturne':  return notesMode ? [['MM_SONG_NOTE_TP_SHADOW', level]] : [['MM_SONG_TP_SHADOW', 1]];
    case 'mm_song_prelude':   return notesMode ? [['MM_SONG_NOTE_TP_LIGHT', level]]  : [['MM_SONG_TP_LIGHT', 1]];
    case 'mm_song_sun':       return notesMode ? [['MM_SONG_NOTE_SUN', level]]       : [['MM_SONG_SUN', 1]];

    case 'mm_bow':            return [['MM_BOW', 1]];
    case 'mm_bomb':           return [['MM_BOMB_BAG', 1]];
    case 'mm_bombchu':        return [['MM_BOMBCHU', 1], ['license_BOMBCHU', 1], ['license_BOMBCHU_5', 1]];
    case 'mm_hookshot':       return [['MM_HOOKSHOT', 1]];
    case 'mm_lens':           return [['MM_LENS', 1]];
    case 'mm_magic':          return [['MM_MAGIC_UPGRADE', level]];

    case 'mm_arrow_fire':     return [['MM_ARROW_FIRE', 1]];
    case 'mm_arrow_ice':      return [['MM_ARROW_ICE', 1]];
    case 'mm_arrow_light':    return [['MM_ARROW_LIGHT', 1]];

    case 'mm_sword':
      if (level === 1) return [['MM_SWORD_KOKIRI', 1], ['MM_SWORD', 1]];
      if (level === 2) return [['MM_SWORD_RAZOR', 1],  ['MM_SWORD', 2]];
      return              [['MM_SWORD_GILDED', 1],  ['MM_SWORD', 3]];

    // MM shields (individual, non-progressive mode)
    case 'mm_shield':         return [['MM_SHIELD_HERO', 1]];
    case 'mm_mirror':         return [['MM_SHIELD_MIRROR', 1]];
    // MM progressive shield: level 1 = Hero's Shield, level 2 = Mirror Shield
    case 'mm_shield_progressive':
      if (level === 1) return [['MM_SHIELD_HERO', 1]];
      return              [['MM_SHIELD_HERO', 1], ['MM_SHIELD_MIRROR', 1]];
    // Starting-item variants (from spoiler import)
    case 'mm_shield_hero':    return [['MM_SHIELD_HERO', 1]];
    case 'mm_shield_zora':    return [['MM_SHIELD_ZORA', 1]];

    case 'mm_boots_iron':     return [['MM_BOOTS_IRON', 1]];
    case 'mm_boots_hover':    return [['MM_BOOTS_HOVER', 1]];
    case 'mm_tunic_goron':    return [['MM_TUNIC_GORON', 1]];
    case 'mm_tunic_zora':     return [['MM_TUNIC_ZORA', 1]];
    case 'mm_shield_deku':    return [['MM_SHIELD_DEKU', 1], ['MM_SHIELD', 1]];
    case 'mm_hammer':         return [['MM_HAMMER', 1]];
    case 'mm_spell_fire':     return [['MM_SPELL_FIRE', 1]];
    case 'mm_spell_wind':     return [['MM_SPELL_WIND', 1]];
    case 'mm_spell_love':     return [['MM_SPELL_LOVE', 1]];
    case 'mm_stone_of_agony': return [['MM_STONE_OF_AGONY', 1]];

    case 'mm_stick':          return [['MM_STICKS', 1], ['MM_STICK', 1]];
    case 'mm_nuts':           return [['MM_NUTS', 1],  ['MM_NUTS_5', 1]];

    case 'mm_strength':       return [['MM_STRENGTH', level]];
    case 'mm_scale':          return [['MM_SCALE', level]];

    case 'mm_wallet':         return [['MM_WALLET', level]];

    case 'mm_bottle_1':
    case 'mm_bottle_2':
    case 'mm_bottle_3':
    case 'mm_bottle_4':       return [['MM_BOTTLE', 1]];

    case 'mm_powder_keg':     return [['MM_POWDER_KEG', 1]];
    case 'mm_pictograph':     return [['MM_PICTOGRAPH_BOX', 1]];
    case 'mm_logic_access':   return [['MM_LOGIC_ACCESS', 1]];
    case 'mm_fairysword':     return [['MM_GREAT_FAIRY_SWORD', 1]];
    case 'mm_skeleton_key':   return [['MM_SKELETON_KEY', 1]];

    // MM dungeon boss keys
    case 'mm_bk_wf': return [['MM_BOSS_KEY_WF', 1]];
    case 'mm_bk_sh': return [['MM_BOSS_KEY_SH', 1]];
    case 'mm_bk_gb': return [['MM_BOSS_KEY_GB', 1]];
    case 'mm_bk_st': return [['MM_BOSS_KEY_ST', 1]];

    // MM dungeon small keys (countable — emit level as count)
    case 'mm_sk_wf': return [['MM_SMALL_KEY_WF', level]];
    case 'mm_sk_sh': return [['MM_SMALL_KEY_SH', level]];
    case 'mm_sk_gb': return [['MM_SMALL_KEY_GB', level]];
    case 'mm_sk_st': return [['MM_SMALL_KEY_ST', level]];

    // MM collectibles with logic impact
    case 'skulltula_platinum_mm': return [['MM_PLATINUM_TOKEN', 1]];
    case 'mm_spin_upgrade':       return [['MM_SPIN_UPGRADE', 1]];
    case 'mm_transcendent_fairy': return [['TRANSCENDENT_FAIRY', 1]];

    // MM owl statues
    case 'mm_owl_clock_town':       return [['MM_OWL_CLOCK_TOWN', 1]];
    case 'mm_owl_southern_swamp':   return [['MM_OWL_SOUTHERN_SWAMP', 1]];
    case 'mm_owl_woodfall':         return [['MM_OWL_WOODFALL', 1]];
    case 'mm_owl_milk_road':        return [['MM_OWL_MILK_ROAD', 1]];
    case 'mm_owl_mountain_village': return [['MM_OWL_MOUNTAIN_VILLAGE', 1]];
    case 'mm_owl_snowhead':         return [['MM_OWL_SNOWHEAD', 1]];
    case 'mm_owl_great_bay':        return [['MM_OWL_GREAT_BAY', 1]];
    case 'mm_owl_zora_cape':        return [['MM_OWL_ZORA_CAPE', 1]];
    case 'mm_owl_ikana_canyon':     return [['MM_OWL_IKANA_CANYON', 1]];
    case 'mm_owl_stone_tower':      return [['MM_OWL_STONE_TOWER', 1]];

    // MM trade/quest items
    case 'mm_tear':           return [['MOON_TEAR', 1]];
    case 'mm_deed1':          return [['DEED_LAND', 1]];
    case 'mm_deed2':          return [['DEED_SWAMP', 1]];
    case 'mm_deed3':          return [['DEED_MOUNTAIN', 1]];
    case 'mm_deed4':          return [['DEED_OCEAN', 1]];
    case 'mm_roomkey':        return [['ROOM_KEY', 1]];
    case 'mm_pendant':        return [['PENDANT_OF_MEMORIES', 1]];
    case 'mm_letter':         return [['LETTER_TO_KAFEI', 1]];
    case 'mm_delivery':       return [['LETTER_TO_MAMA', 1]];
    // Clock items for MM clock randomization (clocks setting).
    // macros.json ordering: CLOCK1=Day1, CLOCK2=Night1, CLOCK3=Day2, CLOCK4=Night2, CLOCK5=Day3, CLOCK6=Night3
    // Tracker ordering (itemData.ts):  mm_clock1=Day1, mm_clock2=Day2, mm_clock3=Day3,
    //                                  mm_clock4=Night1, mm_clock5=Night2, mm_clock6=Night3
    // The CLOCK progressive counter accumulates for ascending/descending mode (count = #clocks owned).
    case 'mm_clock1': return [['CLOCK1', 1], ['CLOCK', 1]]; // Day 1
    case 'mm_clock2': return [['CLOCK3', 1], ['CLOCK', 1]]; // Day 2 → CLOCK3
    case 'mm_clock3': return [['CLOCK5', 1], ['CLOCK', 1]]; // Day 3 → CLOCK5
    case 'mm_clock4': return [['CLOCK2', 1], ['CLOCK', 1]]; // Night 1 → CLOCK2
    case 'mm_clock5': return [['CLOCK4', 1], ['CLOCK', 1]]; // Night 2 → CLOCK4
    case 'mm_clock6': return [['CLOCK6', 1], ['CLOCK', 1]]; // Night 3

    case 'mm_clocktown_stray_fairy':  return [['MM_STRAY_FAIRY_TOWN', 1]];
    case 'mm_woodfall_stray_fairy':   return [['MM_STRAY_FAIRY_WF', level]];
    case 'mm_snowhead_stray_fairy':   return [['MM_STRAY_FAIRY_SH', level]];
    case 'mm_greatbay_stray_fairy':   return [['MM_STRAY_FAIRY_GB', level]];
    case 'mm_stonetower_stray_fairy': return [['MM_STRAY_FAIRY_ST', level]];

    // OoT masks (tracker IDs use _oot suffix)
    case 'mask_bunny_oot':       return [['OOT_MASK_BUNNY', 1]];
    case 'mask_keaton_oot':      return [['OOT_MASK_KEATON', 1]];
    case 'mask_skull_oot':       return [['OOT_MASK_SKULL', 1]];
    case 'mask_spooky_oot':      return [['OOT_MASK_SPOOKY', 1]];
    case 'mask_truth_oot':       return [['OOT_MASK_TRUTH', 1]];
    case 'mask_goron_oot':       return [['OOT_MASK_GORON', 1]];
    case 'mask_zora_oot':        return [['OOT_MASK_ZORA', 1]];
    case 'mask_gerudo_oot':      return [['OOT_MASK_GERUDO', 1]];
    // OoT child trade masks
    case 'trade_c_skull':        return [['OOT_MASK_SKULL', 1]];
    case 'trade_c_spooky':       return [['OOT_MASK_SPOOKY', 1]];
    case 'trade_c_bunny':        return [['OOT_MASK_BUNNY', 1]];
    case 'trade_c_truth':        return [['OOT_MASK_TRUTH', 1]];

    // MM masks — spoiler-import path (importSettings writes mm_mask_* into yItems)
    case 'mm_mask_deku':         return [['MM_MASK_DEKU', 1]];
    case 'mm_mask_goron':        return [['MM_MASK_GORON', 1]];
    case 'mm_mask_zora':         return [['MM_MASK_ZORA', 1]];
    case 'mm_mask_fierce_deity': return [['MM_MASK_FIERCE_DEITY', 1]];
    case 'mm_mask_truth':        return [['MM_MASK_TRUTH', 1]];
    case 'mm_mask_kafei':        return [['MM_MASK_KAFEI', 1]];
    case 'mm_mask_all_night':    return [['MM_MASK_ALL_NIGHT', 1]];
    case 'mm_mask_bunny':        return [['MM_MASK_BUNNY', 1]];
    case 'mm_mask_keaton':       return [['MM_MASK_KEATON', 1]];
    case 'mm_mask_romani':       return [['MM_MASK_ROMANI', 1]];
    case 'mm_mask_circus':       return [['MM_MASK_CIRCUS', 1]];
    case 'mm_mask_postman':      return [['MM_MASK_POSTMAN', 1]];
    case 'mm_mask_couple':       return [['MM_MASK_COUPLE', 1]];
    case 'mm_mask_great_fairy':  return [['MM_MASK_GREAT_FAIRY', 1]];
    case 'mm_mask_gibdo':        return [['MM_MASK_GIBDO', 1]];
    case 'mm_mask_don_gero':     return [['MM_MASK_DON_GERO', 1]];
    case 'mm_mask_kamaro':       return [['MM_MASK_KAMARO', 1]];
    case 'mm_mask_captain':      return [['MM_MASK_CAPTAIN', 1]];
    case 'mm_mask_stone':        return [['MM_MASK_STONE', 1]];
    case 'mm_mask_bremen':       return [['MM_MASK_BREMEN', 1]];
    case 'mm_mask_blast':        return [['MM_MASK_BLAST', 1]];
    case 'mm_mask_scents':       return [['MM_MASK_SCENTS', 1]];
    case 'mm_mask_giant':        return [['MM_MASK_GIANT', 1]];

    // MM masks — manual-click path (itemData IDs have no mm_ prefix)
    case 'mask_deku':            return [['MM_MASK_DEKU', 1]];
    case 'mask_goron':           return [['MM_MASK_GORON', 1]];
    case 'mask_zora':            return [['MM_MASK_ZORA', 1]];
    case 'mask_fierce_deity':    return [['MM_MASK_FIERCE_DEITY', 1]];
    case 'mask_truth_mm':        return [['MM_MASK_TRUTH', 1]];
    case 'mask_kafei':           return [['MM_MASK_KAFEI', 1]];
    case 'mask_all_night':       return [['MM_MASK_ALL_NIGHT', 1]];
    case 'mask_bunny':           return [['MM_MASK_BUNNY', 1]];
    case 'mask_keaton':          return [['MM_MASK_KEATON', 1]];
    case 'mask_romani':          return [['MM_MASK_ROMANI', 1]];
    case 'mask_circus_leader':   return [['MM_MASK_CIRCUS', 1]];
    case 'mask_postman':         return [['MM_MASK_POSTMAN', 1]];
    case 'mask_couple':          return [['MM_MASK_COUPLE', 1]];
    case 'mask_great_fairy':     return [['MM_MASK_GREAT_FAIRY', 1]];
    case 'mask_gibdo':           return [['MM_MASK_GIBDO', 1]];
    case 'mask_don_gero':        return [['MM_MASK_DON_GERO', 1]];
    case 'mask_kamaro':          return [['MM_MASK_KAMARO', 1]];
    case 'mask_captain_hat':     return [['MM_MASK_CAPTAIN', 1]];
    case 'mask_stone':           return [['MM_MASK_STONE', 1]];
    case 'mask_bremen':          return [['MM_MASK_BREMEN', 1]];
    case 'mask_blast':           return [['MM_MASK_BLAST', 1]];
    case 'mask_scents':          return [['MM_MASK_SCENTS', 1]];
    case 'mask_giant':           return [['MM_MASK_GIANT', 1]];
    case 'mask_garo':            return [['MM_MASK_GARO', 1]];
    case 'mask_spooky_mm':       return [['MM_MASK_SPOOKY', 1]];

    // MM rewards
    case 'remains_odolwa':
    case 'mm_remains_odolwa':   return [['MM_REMAINS_ODOLWA', 1],   ['MM_REMAINS', 1]];
    case 'remains_goht':
    case 'mm_remains_goht':     return [['MM_REMAINS_GOHT', 1],     ['MM_REMAINS', 1]];
    case 'remains_gyorg':
    case 'mm_remains_gyorg':    return [['MM_REMAINS_GYORG', 1],    ['MM_REMAINS', 1]];
    case 'remains_twinmold':
    case 'mm_remains_twinmold': return [['MM_REMAINS_TWINMOLD', 1], ['MM_REMAINS', 1]];

    // Shared songs — in notes mode use SHARED_SONG_NOTE_* so both OoT and MM checks are satisfied
    case 'sh_song_epona':    return notesMode ? [['SHARED_SONG_NOTE_EPONA', level]]     : [['SHARED_SONG_EPONA', 1]];
    case 'sh_song_storms':   return notesMode ? [['SHARED_SONG_NOTE_STORMS', level]]    : [['SHARED_SONG_STORMS', 1]];
    case 'sh_song_time':     return notesMode ? [['SHARED_SONG_NOTE_TIME', level]]      : [['SHARED_SONG_TIME', 1]];
    case 'sh_song_sun':      return notesMode ? [['SHARED_SONG_NOTE_SUN', level]]       : [['SHARED_SONG_SUN', 1]];
    case 'sh_song_elegy':    return notesMode ? [['SHARED_SONG_NOTE_EMPTINESS', level]]  : [['SHARED_SONG_EMPTINESS', 1]];
    case 'sh_song_healing':  return notesMode ? [['SHARED_SONG_NOTE_HEALING', level]]   : [['SHARED_SONG_HEALING', 1]];
    case 'sh_song_soaring':  return notesMode ? [['SHARED_SONG_NOTE_SOARING', level]]   : [['SHARED_SONG_SOARING', 1]];
    case 'sh_song_sonata':   return notesMode ? [['SHARED_SONG_NOTE_AWAKENING', level]]  : [['SHARED_SONG_AWAKENING', 1]];
    case 'sh_song_lullaby':
      if (notesMode) return [['SHARED_SONG_NOTE_GORON', level]];
      return level === 2 ? [['SHARED_SONG_GORON_HALF', 1], ['SHARED_SONG_GORON', 1]] : [['SHARED_SONG_GORON_HALF', 1]];
    case 'sh_song_nova':     return notesMode ? [['SHARED_SONG_NOTE_ZORA', level]]      : [['SHARED_SONG_ZORA', 1]];
    case 'sh_song_oath':     return notesMode ? [['SHARED_SONG_NOTE_ORDER', level]]     : [['SHARED_SONG_ORDER', 1]];
    case 'sh_song_zelda':    return notesMode ? [['SHARED_SONG_NOTE_ZELDA', level]]     : [['SHARED_SONG_ZELDA', 1]];
    case 'sh_song_saria':    return notesMode ? [['SHARED_SONG_NOTE_SARIA', level]]     : [['SHARED_SONG_SARIA', 1]];
    case 'sh_song_minuet':   return notesMode ? [['SHARED_SONG_NOTE_TP_FOREST', level]] : [['SHARED_SONG_TP_FOREST', 1]];
    case 'sh_song_bolero':   return notesMode ? [['SHARED_SONG_NOTE_TP_FIRE', level]]   : [['SHARED_SONG_TP_FIRE', 1]];
    case 'sh_song_serenade': return notesMode ? [['SHARED_SONG_NOTE_TP_WATER', level]]  : [['SHARED_SONG_TP_WATER', 1]];
    case 'sh_song_requiem':  return notesMode ? [['SHARED_SONG_NOTE_TP_SPIRIT', level]] : [['SHARED_SONG_TP_SPIRIT', 1]];
    case 'sh_song_nocturne': return notesMode ? [['SHARED_SONG_NOTE_TP_SHADOW', level]] : [['SHARED_SONG_TP_SHADOW', 1]];
    case 'sh_song_prelude':  return notesMode ? [['SHARED_SONG_NOTE_TP_LIGHT', level]]  : [['SHARED_SONG_TP_LIGHT', 1]];

    // Shared items (cross-game) — use SHARED_ keys where macros check them explicitly;
    // plain keys are used as fallback by the game-prefixed eval for truly shared items.
    case 'shared_bow':        return [['SHARED_BOW', 1]];
    case 'shared_bomb':       return [['SHARED_BOMB_BAG', 1]];
    case 'shared_arrow_fire': return [['ARROW_FIRE', 1], ['SHARED_ARROW_FIRE', 1]];
    case 'shared_arrow_ice':  return [['ARROW_ICE', 1], ['SHARED_ARROW_ICE', 1]];
    case 'shared_arrow_light':return [['ARROW_LIGHT', 1], ['SHARED_ARROW_LIGHT', 1]];
    case 'shared_magic':      return [['MAGIC_UPGRADE', level]];
    case 'shared_hookshot':   return level === 2 ? [['SHARED_HOOKSHOT', 1], ['LONGSHOT', 1]] : [['SHARED_HOOKSHOT', 1]];
    case 'shared_lens':       return [['LENS', 1]];
    case 'shared_ocarina':    return [['OCARINA', level]];
    case 'shared_wallet':     return [['WALLET', level]];
    case 'shared_bombchu':    return [['BOMBCHU', 1], ['license_SHARED_BOMBCHU', 1], ['license_BOMBCHU_5', 1]];
    case 'shared_scale':      return [['SCALE', level]];
    case 'shared_strength':   return [['STRENGTH', level]];
    case 'shared_boots_iron': return [['BOOTS_IRON', 1]];
    case 'shared_boots_hover':return [['BOOTS_HOVER', 1]];
    case 'shared_sword':
      if (level === 1) return [['SWORD_KOKIRI', 1], ['SWORD', 1]];
      if (level === 2) return [['SWORD_MASTER', 1], ['SWORD', 2]];
      return              [['SWORD_BIGGORON', 1], ['SWORD', 3]];
    case 'shared_shield_mirror': return [['SHIELD_MIRROR', 1], ['SHIELD', 3]];
    case 'sh_spin_upgrade':      return [['SHARED_SPIN_UPGRADE', 1]];

    // ─── OoT silver rupees (countable — emit level as count) ─────────────────
    case 'oot_sr_dc':              return [['OOT_RUPEE_SILVER_DC',             level]];
    case 'oot_sr_ic_block':        return [['OOT_RUPEE_SILVER_IC_BLOCK',       level]];
    case 'oot_sr_ic_scythe':       return [['OOT_RUPEE_SILVER_IC_SCYTHE',      level]];
    case 'oot_sr_gtg_lava':        return [['OOT_RUPEE_SILVER_GTG_LAVA',       level]];
    case 'oot_sr_gtg_slopes':      return [['OOT_RUPEE_SILVER_GTG_SLOPES',     level]];
    case 'oot_sr_gtg_water':       return [['OOT_RUPEE_SILVER_GTG_WATER',      level]];
    case 'oot_sr_shadow_blades':   return [['OOT_RUPEE_SILVER_SHADOW_BLADES',  level]];
    case 'oot_sr_shadow_pit':      return [['OOT_RUPEE_SILVER_SHADOW_PIT',     level]];
    case 'oot_sr_shadow_scythe':   return [['OOT_RUPEE_SILVER_SHADOW_SCYTHE',  level]];
    case 'oot_sr_shadow_spikes':   return [['OOT_RUPEE_SILVER_SHADOW_SPIKES',  level]];
    case 'oot_sr_spirit_adult':    return [['OOT_RUPEE_SILVER_SPIRIT_ADULT',   level]];
    case 'oot_sr_spirit_boulders': return [['OOT_RUPEE_SILVER_SPIRIT_BOULDERS',level]];
    case 'oot_sr_spirit_child':    return [['OOT_RUPEE_SILVER_SPIRIT_CHILD',   level]];
    case 'oot_sr_spirit_lobby':    return [['OOT_RUPEE_SILVER_SPIRIT_LOBBY',   level]];
    case 'oot_sr_spirit_sun':      return [['OOT_RUPEE_SILVER_SPIRIT_SUN',     level]];
    case 'oot_sr_ganon_fire':      return [['OOT_RUPEE_SILVER_GANON_FIRE',     level]];
    case 'oot_sr_ganon_forest':    return [['OOT_RUPEE_SILVER_GANON_FOREST',   level]];
    case 'oot_sr_ganon_light':     return [['OOT_RUPEE_SILVER_GANON_LIGHT',    level]];
    case 'oot_sr_ganon_shadow':    return [['OOT_RUPEE_SILVER_GANON_SHADOW',   level]];
    case 'oot_sr_ganon_spirit':    return [['OOT_RUPEE_SILVER_GANON_SPIRIT',   level]];
    case 'oot_sr_ganon_water':     return [['OOT_RUPEE_SILVER_GANON_WATER',    level]];

    // ─── OoT pond fish (pondFishShuffle) ─────────────────────────────────────
    case 'oot_child_fish':  return [['CHILD_FISH',  level]];
    case 'oot_child_loach': return [['CHILD_LOACH', level]];
    case 'oot_adult_fish':  return [['ADULT_FISH',  level]];
    case 'oot_adult_loach': return [['ADULT_LOACH', level]];

    // ─── OoT rusty keys ──────────────────────────────────────────────────────
    case 'oot_rk_windmill':               return [['RUSTY_KEY_WINDMILL', 1]];
    case 'oot_rk_impa_house':             return [['RUSTY_KEY_IMPA_HOUSE', 1]];
    case 'oot_rk_graveyard':              return [['RUSTY_KEY_GRAVEYARD', 1]];
    case 'oot_rk_skulltula_house':        return [['RUSTY_KEY_SKULLTULA_HOUSE', 1]];
    case 'oot_rk_guard_house':            return [['RUSTY_KEY_GUARD_HOUSE', 1]];
    case 'oot_rk_carpenter_house':        return [['RUSTY_KEY_CARPENTER_HOUSE', 1]];
    case 'oot_rk_mask_shop':              return [['RUSTY_KEY_MASK_SHOP', 1]];
    case 'oot_rk_child_bazaar':           return [['RUSTY_KEY_CHILD_BAZAAR', 1]];
    case 'oot_rk_child_potion_shop':      return [['RUSTY_KEY_CHILD_POTION_SHOP', 1]];
    case 'oot_rk_child_shooting_gallery': return [['RUSTY_KEY_CHILD_SHOOTING_GALLERY', 1]];
    case 'oot_rk_bombchu_bowling':        return [['RUSTY_KEY_BOMBCHU_BOWLING', 1]];
    case 'oot_rk_treasure_chest_game':    return [['RUSTY_KEY_TREASURE_CHEST_GAME', 1]];
    case 'oot_rk_dog_lady_house':         return [['RUSTY_KEY_DOG_LADY_HOUSE', 1]];
    case 'oot_rk_bombchu_shop':           return [['RUSTY_KEY_BOMBCHU_SHOP', 1]];
    case 'oot_rk_back_alley_house':       return [['RUSTY_KEY_BACK_ALLEY_HOUSE', 1]];
    case 'oot_rk_adult_bazaar':           return [['RUSTY_KEY_ADULT_BAZAAR', 1]];
    case 'oot_rk_adult_potion_shop':      return [['RUSTY_KEY_ADULT_POTION_SHOP', 1]];
    case 'oot_rk_adult_potion_shop_back': return [['RUSTY_KEY_ADULT_POTION_SHOP_BACK', 1]];
    case 'oot_rk_adult_shooting_gallery': return [['RUSTY_KEY_ADULT_SHOOTING_GALLERY', 1]];
    case 'oot_rk_granny_potion_shop':     return [['RUSTY_KEY_GRANNY_POTION_SHOP', 1]];
    case 'oot_rk_laboratory':             return [['RUSTY_KEY_LABORATORY', 1]];
    case 'oot_rk_fishing_pond':           return [['RUSTY_KEY_FISHING_POND', 1]];
    case 'oot_rk_ranch_house':            return [['RUSTY_KEY_RANCH_HOUSE', 1]];
    case 'oot_rk_ranch_house_room':       return [['RUSTY_KEY_RANCH_HOUSE_ROOM', 1]];
    case 'oot_rk_ranch_stable':           return [['RUSTY_KEY_RANCH_STABLE', 1]];
    case 'oot_rk_silo':                   return [['RUSTY_KEY_SILO', 1]];

    // ─── MM rusty keys ───────────────────────────────────────────────────────
    case 'mm_rk_bomb_shop':               return [['RUSTY_KEY_BOMB_SHOP', 1]];
    case 'mm_rk_trading_post':            return [['RUSTY_KEY_TRADING_POST', 1]];
    case 'mm_rk_curiosity_shop':          return [['RUSTY_KEY_CURIOSITY_SHOP', 1]];
    case 'mm_rk_post_office':             return [['RUSTY_KEY_POST_OFFICE', 1]];
    case 'mm_rk_swordsman_school':        return [['RUSTY_KEY_SWORDSMAN_SCHOOL', 1]];
    case 'mm_rk_lottery':                 return [['RUSTY_KEY_LOTTERY', 1]];
    case 'mm_rk_mayor_residence':         return [['RUSTY_KEY_MAYOR_RESIDENCE', 1]];
    case 'mm_rk_mayor_residence_office':  return [['RUSTY_KEY_MAYOR_RESIDENCE_OFFICE', 1]];
    case 'mm_rk_mayor_residence_salon':   return [['RUSTY_KEY_MAYOR_RESIDENCE_SALON', 1]];
    case 'mm_rk_mayor_residence_kafei':   return [['RUSTY_KEY_MAYOR_RESIDENCE_KAFEI', 1]];
    case 'mm_rk_town_archery':            return [['RUSTY_KEY_TOWN_ARCHERY', 1]];
    case 'mm_rk_honey_darling':           return [['RUSTY_KEY_HONEY_DARLING', 1]];
    case 'mm_rk_inn_guest_room':          return [['RUSTY_KEY_STOCK_POT_INN', 1]];
    case 'mm_rk_stock_pot_inn_roof':      return [['RUSTY_KEY_STOCK_POT_INN_ROOF', 1]];
    case 'mm_rk_stock_pot_inn_staff_room':return [['RUSTY_KEY_STOCK_POT_INN_STAFF_ROOM', 1]];
    case 'mm_rk_stock_pot_inn_dormitory': return [['RUSTY_KEY_STOCK_POT_INN_DORMITORY', 1]];
    case 'mm_rk_grandma_room':            return [['RUSTY_KEY_GRANDMA_ROOM', 1]];
    case 'mm_rk_milk_bar':                return [['RUSTY_KEY_MILK_BAR', 1]];
    case 'mm_rk_kafei_hideout':           return [['RUSTY_KEY_KAFEI_HIDEOUT', 1]];
    case 'mm_rk_observatory':             return [['RUSTY_KEY_OBSERVATORY', 1]];
    case 'mm_rk_beneath_graveyard':       return [['RUSTY_KEY_BENEATH_GRAVEYARD', 1]];
    case 'mm_rk_dampe_house':             return [['RUSTY_KEY_DAMPE_HOUSE', 1]];
    case 'mm_rk_music_house':             return [['RUSTY_KEY_MUSIC_HOUSE', 1]];
    case 'mm_rk_blacksmith':              return [['RUSTY_KEY_BLACKSMITH', 1]];
    case 'mm_rk_swamp_archery':           return [['RUSTY_KEY_SWAMP_ARCHERY', 1]];
    case 'mm_rk_cucco_shack':             return [['RUSTY_KEY_CUCCO_SHACK', 1]];
    case 'mm_rk_dog_racetrack':           return [['RUSTY_KEY_DOG_RACETRACK', 1]];
    case 'mm_rk_ranch_barn':              return [['RUSTY_KEY_RANCH_BARN', 1]];
    case 'mm_rk_tourist_information':     return [['RUSTY_KEY_TOURIST_INFORMATION', 1]];
    case 'mm_rk_potion_shop':             return [['RUSTY_KEY_POTION_SHOP', 1]];
    case 'mm_rk_zora_shop':               return [['RUSTY_KEY_ZORA_SHOP', 1]];
    case 'mm_rk_zora_tijo_room':          return [['RUSTY_KEY_ZORA_TIJO_ROOM', 1]];
    case 'mm_rk_zora_japas_room':         return [['RUSTY_KEY_ZORA_JAPAS_ROOM', 1]];
    case 'mm_rk_zora_evan_room':          return [['RUSTY_KEY_ZORA_EVAN_ROOM', 1]];
    case 'mm_rk_zora_lulu_room':          return [['RUSTY_KEY_ZORA_LULU_ROOM', 1]];
    case 'mm_rk_laboratory':              return [['RUSTY_KEY_LABORATORY', 1]];
    case 'mm_rk_ranch_house':             return [['RUSTY_KEY_RANCH_HOUSE', 1]];
    case 'mm_rk_ranch_house_room':        return [['RUSTY_KEY_RANCH_HOUSE_ROOM', 1]];
    case 'mm_rk_treasure_chest_game':     return [['RUSTY_KEY_TREASURE_CHEST_GAME', 1]];

    default: {
      // Souls: oot_oot_soul_* → SOUL_* (unprefixed — macros use them without game prefix)
      //        mm_soul_*      → SOUL_* (same pool, cross-game via soul_boss/soul_enemy macros)
      // Known spelling fix: itemData writes 'dinalfos', logic writes 'DINOLFOS'.
      if (id.startsWith('oot_oot_soul_')) {
        const raw = id.slice('oot_oot_'.length).toUpperCase().replace('DINALFOS', 'DINOLFOS');
        return [[raw, 1]];
      }
      if (id.startsWith('mm_soul_')) {
        const raw = id.slice('mm_'.length).toUpperCase().replace('DINALFOS', 'DINOLFOS');
        return [[raw, 1]];
      }
      return [];
    }
  }
}

// Build the full items Map from a yItems snapshot
export function buildItemsMap(yItemsSnapshot: Map<string, number>, notesMode = false): Map<string, number> {
  const result = new Map<string, number>();

  function add(id: string, count: number) {
    result.set(id, (result.get(id) ?? 0) + count);
  }

  for (const [trackerId, level] of yItemsSnapshot) {
    for (const [ootmmId, count] of trackerItemToLogic(trackerId, level, notesMode)) {
      add(ootmmId, count);
    }
  }
  return result;
}
