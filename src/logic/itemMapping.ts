// Maps our tracker item IDs (+ level) to OoTMM logic item IDs.
// Returns an array of [ootmmId, count] pairs to merge into LogicState.items.
//
// OoTMM uses both progressive counters (SWORD → count) and named items
// (SWORD_MASTER → 0|1). We emit both when relevant.

export type ItemGrant = [id: string, count: number];

export function trackerItemToLogic(id: string, level: number): ItemGrant[] {
  if (level <= 0) return [];
  switch (id) {
    // ─── OoT swords ──────────────────────────────────────────────────────────
    case 'sword_kokiri':    return [['SWORD_KOKIRI', 1], ['SWORD', 1]];
    case 'sword_master':    return [['SWORD_MASTER', 1], ['SWORD', 2]];
    case 'sword_biggoron':  return [['SWORD_BIGGORON', 1], ['GREAT_FAIRY_SWORD', 1]];
    case 'giant_knife':     return [['SWORD_BIGGORON', 1]];

    // ─── OoT equipment ───────────────────────────────────────────────────────
    case 'shield_mirror':   return [['SHIELD_MIRROR', 1], ['SHIELD', 3]];
    case 'deku_shield':     return [['SHIELD_DEKU', 1],   ['SHIELD', 1]];
    case 'hyrule_shield':   return [['SHIELD_HYRULE', 1], ['SHIELD', 2]];
    case 'boots_iron':      return [['BOOTS_IRON', 1]];
    case 'boots_hover':     return [['BOOTS_HOVER', 1]];
    case 'tunic_goron':     return [['TUNIC_GORON', 1]];
    case 'tunic_zora':      return [['TUNIC_ZORA', 1]];

    // Strength: level 1 = Silver Gauntlets, 2 = Gold Gauntlets, 3 = progressive max
    case 'strength':
      if (level === 1) return [['STRENGTH', 1]];
      if (level === 2) return [['STRENGTH', 2], ['STRENGTH_SILVER', 1]];
      return              [['STRENGTH', 3], ['STRENGTH_SILVER', 1], ['STRENGTH_GOLD', 1]];

    // Scale: level 1 = silver, level 2 = gold, level 3 = bronze (no scale / swim check)
    case 'scale':
      if (level === 1) return [['SCALE', 1]];
      if (level === 2) return [['SCALE', 2], ['SCALE_SILVER', 1]];
      return              [['SCALE', 3], ['SCALE_SILVER', 1], ['SCALE_GOLDEN', 1]];

    // ─── OoT items ───────────────────────────────────────────────────────────
    case 'hookshot':
      if (level === 1) return [['HOOKSHOT', 1]];
      return              [['HOOKSHOT', 1], ['LONGSHOT', 1]];

    case 'ocarina':
      if (level === 1) return [['OCARINA', 1], ['OCARINA_FAIRY', 1]];
      return              [['OCARINA', 2], ['OCARINA_FAIRY', 1], ['OCARINA_OF_TIME', 1]];

    case 'bow':       return [['BOW', 1], ['BOW_AMMO', level * 10]];
    case 'slingshot': return [['SLINGSHOT', 1], ['SLINGSHOT_AMMO', level * 10]];
    case 'bomb':      return [['BOMB_BAG', 1]];
    case 'bombchu':   return [['BOMBCHU', 1]];
    case 'boomerang': return [['BOOMERANG', 1]];
    case 'hammer':    return [['HAMMER', 1]];
    case 'lens':      return [['LENS', 1]];
    case 'bean':      return [['MAGIC_BEAN', 1]];
    case 'agony':     return [['STONE_OF_AGONY', 1]];
    case 'gerudo_card': return [['GERUDO_CARD', 1]];
    case 'din':       return [['DINS_FIRE', 1]];
    case 'farore':    return [['FARORES_WIND', 1]];
    case 'nayru':     return [['NAYRUS_LOVE', 1]];
    case 'magic_oot': return [['MAGIC_UPGRADE', level]];
    case 'sticks_oot': return [['STICKS', 1], ['STICK', 1]];
    case 'nuts_oot':   return [['NUTS', 1],  ['NUTS_5', 1]];

    // Arrows (OoT)
    case 'arrow_fire_oot':  return [['ARROWS_FIRE', 1]];
    case 'arrow_ice_oot':   return [['ARROWS_ICE', 1]];
    case 'arrow_light_oot': return [['ARROWS_LIGHT', 1]];

    // Wallet: level 1 = 99, 2 = 200, 3 = 500
    case 'wallet':    return [['WALLET', level]];

    // Bottles (OoT)
    case 'bottle_1':
    case 'bottle_2':
    case 'bottle_3':  return [['BOTTLE', 1]];

    case 'bottle_letter': return [['BOTTLE', 1], ['RUTOS_LETTER', 1]];
    case 'scarecrow_oot': return [['SCARECROW', 1]];
    case 'key_skeleton':  return [['SKELETON_KEY', 1]];

    // OoT trade items
    case 'trade_c_egg':       return [['WEIRD_EGG', 1]];
    case 'trade_c_cucco':     return [['CUCCO', 1]];
    case 'trade_c_letter':    return [['ZELDAS_LETTER', 1]];
    case 'trade_a_cojiro':    return [['COJIRO', 1]];
    case 'trade_a_cucco':     return [['ODD_POULTICE', 1]]; // alt name
    case 'trade_a_mushroom':  return [['ODD_MUSHROOM', 1]];
    case 'trade_a_potion':    return [['ODD_POTION', 1]];
    case 'trade_a_saw':       return [['POACHERS_SAW', 1]];
    case 'trade_a_broken':    return [['BROKEN_GORONS_SWORD', 1]];
    case 'trade_a_rx':        return [['PRESCRIPTION', 1]];
    case 'trade_a_drops':     return [['EYEDROPS', 1]];
    case 'trade_a_claim':     return [['CLAIM_CHECK', 1]];
    case 'trade_a_frog':      return [['FROG', 1]];

    // OoT rewards
    case 'stone_emerald':     return [['KOKIRI_EMERALD', 1], ['SPIRITUAL_STONE', 1]];
    case 'stone_ruby':        return [['GORONS_RUBY', 1],    ['SPIRITUAL_STONE', 1]];
    case 'stone_sapphire':    return [['ZORAS_SAPPHIRE', 1], ['SPIRITUAL_STONE', 1]];
    case 'medal_forest':      return [['MEDALLION_FOREST', 1], ['MEDALLION', 1]];
    case 'medal_fire':        return [['MEDALLION_FIRE', 1],   ['MEDALLION', 1]];
    case 'medal_water':       return [['MEDALLION_WATER', 1],  ['MEDALLION', 1]];
    case 'medal_shadow':      return [['MEDALLION_SHADOW', 1], ['MEDALLION', 1]];
    case 'medal_spirit':      return [['MEDALLION_SPIRIT', 1], ['MEDALLION', 1]];
    case 'medal_light':       return [['MEDALLION_LIGHT', 1],  ['MEDALLION', 1]];

    // OoT songs
    case 'oot_song_zelda':    return [['SONG_LULLABY', 1]];
    case 'oot_song_epona':    return [['SONG_EPONA', 1]];
    case 'oot_song_saria':    return [['SONG_SARIA', 1]];
    case 'oot_song_sun':      return [['SONG_SUN', 1]];
    case 'oot_song_time':     return [['SONG_TIME', 1]];
    case 'oot_song_storms':   return [['SONG_STORMS', 1]];
    case 'oot_song_minuet':   return [['SONG_MINUET', 1]];
    case 'oot_song_bolero':   return [['SONG_BOLERO', 1]];
    case 'oot_song_serenade': return [['SONG_SERENADE', 1]];
    case 'oot_song_requiem':  return [['SONG_REQUIEM', 1]];
    case 'oot_song_nocturne': return [['SONG_NOCTURNE', 1]];
    case 'oot_song_prelude':  return [['SONG_PRELUDE', 1]];
    case 'oot_elegy':         return [['SONG_ELEGY', 1]];
    // Cross-game songs in OoT pool
    case 'oot_song_healing':  return [['SONG_HEALING', 1]];
    case 'oot_song_soaring':  return [['SONG_SOARING', 1]];
    case 'oot_song_sonata':   return [['SONG_SONATA', 1]];
    case 'oot_song_lullaby':  return level === 2 ? [['SONG_LULLABY_INTRO', 1], ['SONG_LULLABY_MM', 1]] : [['SONG_LULLABY_INTRO', 1]];
    case 'oot_song_nova':     return [['SONG_BOSSANOVA', 1]];
    case 'oot_song_oath':     return [['SONG_OATH', 1]];

    // Skulltula
    case 'skulltula_token':   return [['GS_TOKEN', level]];

    // ─── MM items ────────────────────────────────────────────────────────────
    case 'mm_ocarina':        return [['OCARINA', 1]]; // shared with OoT in cross-game
    case 'mm_song_healing':   return [['SONG_HEALING', 1]];
    case 'mm_song_soaring':   return [['SONG_SOARING', 1]];
    case 'mm_song_storms':    return [['SONG_STORMS', 1]];
    case 'mm_song_sonata':    return [['SONG_SONATA', 1]];
    case 'mm_song_lullaby':   return level === 2 ? [['SONG_LULLABY_INTRO', 1], ['SONG_LULLABY_MM', 1]] : [['SONG_LULLABY_INTRO', 1]];
    case 'mm_song_nova':      return [['SONG_BOSSANOVA', 1]];
    case 'mm_song_oath':      return [['SONG_OATH', 1]];
    case 'mm_song_elegy':     return [['SONG_ELEGY', 1]];
    case 'mm_song_time':      return [['SONG_TIME', 1]];
    case 'mm_song_epona':     return [['SONG_EPONA', 1]];
    case 'mm_song_saria':     return [['SONG_SARIA', 1]];

    case 'mm_bow':            return [['BOW', 1]];
    case 'mm_bomb':           return [['BOMB_BAG', 1]];
    case 'mm_bombchu':        return [['BOMBCHU', 1]];
    case 'mm_hookshot':       return [['HOOKSHOT', 1]];
    case 'mm_lens':           return [['LENS', 1]];
    case 'mm_magic':          return [['MAGIC_UPGRADE', level]];

    case 'mm_arrow_fire':     return [['ARROWS_FIRE', 1]];
    case 'mm_arrow_ice':      return [['ARROWS_ICE', 1]];
    case 'mm_arrow_light':    return [['ARROWS_LIGHT', 1]];

    case 'mm_sword':
      if (level === 1) return [['SWORD_KOKIRI', 1], ['SWORD', 1]];
      if (level === 2) return [['SWORD_RAZOR', 1],  ['SWORD', 2]];
      return              [['SWORD_GILDED', 1],  ['SWORD', 3]];

    case 'mm_shield_hero':    return [['SHIELD_MIRROR', 1]];
    case 'mm_shield_zora':    return [['SHIELD_ZORA', 1]];

    case 'mm_boots_iron':     return [['BOOTS_IRON', 1]];
    case 'mm_boots_hover':    return [['BOOTS_HOVER', 1]];

    case 'mm_strength':       return [['STRENGTH', level]];
    case 'mm_scale':          return [['SCALE', level]];

    case 'mm_wallet':         return [['WALLET', level]];

    case 'mm_bottle_1':
    case 'mm_bottle_2':
    case 'mm_bottle_3':
    case 'mm_bottle_4':       return [['BOTTLE', 1]];

    case 'mm_powder_keg':     return [['POWDER_KEG', 1]];
    case 'mm_pictograph':     return [['PICTOGRAPH_BOX', 1]];
    case 'mm_logic_access':   return [['LOGIC_ACCESS', 1]];

    // MM masks
    case 'mm_mask_deku':      return [['MASK_DEKU', 1]];
    case 'mm_mask_goron':     return [['MASK_GORON', 1]];
    case 'mm_mask_zora':      return [['MASK_ZORA', 1]];
    case 'mm_mask_fierce_deity': return [['MASK_FIERCE_DEITY', 1]];
    case 'mm_mask_truth':     return [['MASK_TRUTH', 1]];
    case 'mm_mask_kafei':     return [['MASK_KAFEI', 1]];
    case 'mm_mask_all_night': return [['MASK_ALL_NIGHT', 1]];
    case 'mm_mask_bunny':     return [['MASK_BUNNY', 1]];
    case 'mm_mask_keaton':    return [['MASK_KEATON', 1]];
    case 'mm_mask_romani':    return [['MASK_ROMANI', 1]];
    case 'mm_mask_circus':    return [['MASK_CIRCUS_LEADER', 1]];
    case 'mm_mask_postman':   return [['MASK_POSTMAN', 1]];
    case 'mm_mask_couple':    return [["MASK_COUPLE'S", 1]];
    case 'mm_mask_great_fairy': return [['MASK_GREAT_FAIRY', 1]];
    case 'mm_mask_gibdo':     return [['MASK_GIBDO', 1]];
    case 'mm_mask_don_gero':  return [['MASK_DON_GERO', 1]];
    case 'mm_mask_kamaro':    return [['MASK_KAMARO', 1]];
    case 'mm_mask_captain':   return [['MASK_CAPTAIN', 1]];
    case 'mm_mask_stone':     return [['MASK_STONE', 1]];
    case 'mm_mask_bremen':    return [['MASK_BREMEN', 1]];
    case 'mm_mask_blast':     return [['MASK_BLAST', 1]];
    case 'mm_mask_scents':    return [['MASK_SCENTS', 1]];
    case 'mm_mask_giant':     return [['MASK_GIANT', 1]];

    // MM rewards
    case 'mm_remains_odolwa':   return [['REMAINS_ODOLWA', 1],   ['REMAINS', 1]];
    case 'mm_remains_goht':     return [['REMAINS_GOHT', 1],     ['REMAINS', 1]];
    case 'mm_remains_gyorg':    return [['REMAINS_GYORG', 1],    ['REMAINS', 1]];
    case 'mm_remains_twinmold': return [['REMAINS_TWINMOLD', 1], ['REMAINS', 1]];

    // Shared items (cross-game)
    case 'shared_bow':        return [['BOW', 1]];
    case 'shared_bomb':       return [['BOMB_BAG', 1]];
    case 'shared_arrow_fire': return [['ARROWS_FIRE', 1]];
    case 'shared_arrow_ice':  return [['ARROWS_ICE', 1]];
    case 'shared_arrow_light':return [['ARROWS_LIGHT', 1]];
    case 'shared_magic':      return [['MAGIC_UPGRADE', level]];
    case 'shared_hookshot':   return level === 2 ? [['HOOKSHOT', 1], ['LONGSHOT', 1]] : [['HOOKSHOT', 1]];
    case 'shared_lens':       return [['LENS', 1]];
    case 'shared_ocarina':    return [['OCARINA', level]];
    case 'shared_wallet':     return [['WALLET', level]];
    case 'shared_bombchu':    return [['BOMBCHU', 1]];
    case 'shared_scale':      return [['SCALE', level]];
    case 'shared_strength':   return [['STRENGTH', level]];
    case 'shared_boots_iron': return [['BOOTS_IRON', 1]];
    case 'shared_boots_hover':return [['BOOTS_HOVER', 1]];
    case 'shared_sword':
      if (level === 1) return [['SWORD_KOKIRI', 1], ['SWORD', 1]];
      if (level === 2) return [['SWORD_MASTER', 1], ['SWORD', 2]];
      return              [['SWORD_BIGGORON', 1], ['SWORD', 3]];
    case 'shared_shield_mirror': return [['SHIELD_MIRROR', 1], ['SHIELD', 3]];

    default: return [];
  }
}

// Build the full items Map from a yItems snapshot
export function buildItemsMap(yItemsSnapshot: Map<string, number>): Map<string, number> {
  const result = new Map<string, number>();

  function add(id: string, count: number) {
    result.set(id, (result.get(id) ?? 0) + count);
  }

  for (const [trackerId, level] of yItemsSnapshot) {
    for (const [ootmmId, count] of trackerItemToLogic(trackerId, level)) {
      add(ootmmId, count);
    }
  }
  return result;
}
