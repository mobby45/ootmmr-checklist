// ==========================================
// ITEM TRACKER DATA — OoTMM
// Layout reproduces EmoTracker row structure
// ==========================================

export type ItemGame = 'oot' | 'mm' | 'shared';
export type ItemCategory =
  | 'equipment' | 'items' | 'songs' | 'rewards'
  | 'masks' | 'bottles' | 'souls_boss' | 'souls_enemy' | 'souls_npc' | 'misc' | 'label' | 'button' | 'keys';

export interface TrackerItem {
  id: string;
  name: string;
  icon: string;
  game: ItemGame;
  category: ItemCategory;
  maxLevel: number;
  settingKey?: string;
  levelLabels?: string[];
  levelIcons?: string[];
  showCount?: boolean;
  startUndimmed?: boolean;
  startLabel?: string;
}

export const allTrackerItems: TrackerItem[] = [

  // --- OOT items ---
  { id: 'slingshot', name: "Slingshot", icon: 'slingshot', game: 'oot', category: 'items', maxLevel: 3, levelLabels: ['30', '40', '50'], showCount: true },
  { id: 'bomb', name: "Bomb Bag", icon: 'bomb', game: 'oot', category: 'items', maxLevel: 3, levelLabels: ['20', '30', '40'], showCount: true },
  { id: 'bombchu', name: "Bombchu", icon: 'bombchu', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'bow', name: "Bow", icon: 'bow', game: 'oot', category: 'items', maxLevel: 3, levelLabels: ['30', '40', '50'], showCount: true },
  { id: 'arrow_fire_oot', name: "Fire Arrows", icon: 'arrow_fire', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'arrow_ice_oot', name: "Ice Arrows", icon: 'arrow_ice', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'arrow_light_oot', name: "Light Arrows", icon: 'arrow_light', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'agony', name: "Stone of Agony", icon: 'agony', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'hookshot', name: "Hookshot", icon: 'hookshot', game: 'oot', category: 'items', maxLevel: 2, levelIcons: ['hookshot', 'longshot'] },
  { id: 'boots_iron', name: "Iron Boots", icon: 'boots_iron', game: 'oot', category: 'equipment', maxLevel: 1 },
  { id: 'boots_hover', name: "Hover Boots", icon: 'boots_hover', game: 'oot', category: 'equipment', maxLevel: 1 },
  { id: 'hammer', name: "Megaton Hammer", icon: 'hammer', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'strength', name: "Strength", icon: 'lift1', game: 'oot', category: 'equipment', maxLevel: 3, levelIcons: ['lift1', 'lift2', 'lift3'] },
  { id: 'sword_kokiri', name: "Kokiri Sword", icon: 'sword1', game: 'oot', category: 'equipment', maxLevel: 1 },
  { id: 'sword_master', name: "Master Sword", icon: 'sword2', game: 'oot', category: 'equipment', maxLevel: 1 },
  { id: 'sword_biggoron', name: "Biggoron Sword", icon: 'sword3', game: 'oot', category: 'equipment', maxLevel: 1 },
  { id: 'shield_mirror', name: "Mirror Shield", icon: 'shield3', game: 'oot', category: 'equipment', maxLevel: 1 },
  { id: 'gerudo_card', name: "Gerudo Card", icon: 'gerudocard', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'lens', name: "Lens of Truth", icon: 'lens', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'din', name: "Din's Fire", icon: 'din', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'farore', name: "Farore's Wind", icon: 'farore', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'nayru', name: "Nayru's Love", icon: 'nayru', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'magic_oot', name: "Magic", icon: 'magic1', game: 'oot', category: 'items', maxLevel: 2, levelIcons: ['magic1', 'magic2'] },
  { id: 'boomerang', name: "Boomerang", icon: 'boomerang', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'tunic_goron', name: "Goron Tunic", icon: 'redtunic', game: 'oot', category: 'equipment', maxLevel: 1 },
  { id: 'tunic_zora', name: "Zora Tunic", icon: 'bluetunic', game: 'oot', category: 'equipment', maxLevel: 1 },
  { id: 'scale', name: "Scale", icon: 'scale1', game: 'oot', category: 'equipment', maxLevel: 3, levelIcons: ['scale_bronze', 'scale1', 'scale2'] },
  { id: 'scarecrow_oot', name: "Scarecrow", icon: 'scarecrow', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'bean', name: "Magic Bean", icon: 'bean', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'nuts_oot', name: "Nuts", icon: 'nut', game: 'oot', category: 'items', levelLabels: ['20', '30', '40'], maxLevel: 3, showCount: true },
  { id: 'sticks_oot', name: "Deku Sticks", icon: 'deku_stick', game: 'oot', category: 'items', levelLabels: ['10', '20', '30'], maxLevel: 3, showCount: true },
  { id: 'wallet', name: "Wallet", icon: 'wallet', game: 'oot', category: 'items', maxLevel: 3, levelIcons: ['wallet1', 'wallet2', 'wallet3'], levelLabels: [], startUndimmed: true },
  { id: 'ocarina', name: "Ocarina", icon: 'fairyocarina', game: 'oot', category: 'items', maxLevel: 2, levelIcons: ['fairyocarina', 'ocarina'] },
  { id: 'deku_shield', name: "Deku Shield", icon: 'deku_shield', game: 'oot', category: 'items', maxLevel: 1, },
  { id: 'hyrule_shield', name: "Hyrule Shield", icon: 'hyrule_shield', game: 'oot', category: 'items', maxLevel: 1, },
  { id: 'giant_knife', name: "Giant Knife", icon: 'giant_knife', game: 'oot', category: 'items', maxLevel: 1, },
  { id: 'bottle_letter', name: "Ruto's Letter", icon: 'bottle_letter', game: 'oot', category: 'items', maxLevel: 1, },
  { id: 'key_skeleton', name: "Skeleton Key", icon: 'key_skeleton', game: 'oot', category: 'items', maxLevel: 1, },
  { id: 'skulltula_platinum', name: "Platinum Token", icon: 'skulltula_platinum', game: 'oot', category: 'items', maxLevel: 1, },

  // --- OOT bottles ---
  { id: 'bottle_1', name: "Bottle 1", icon: 'bottle', game: 'oot', category: 'bottles', maxLevel: 1 },
  { id: 'bottle_2', name: "Bottle 2", icon: 'bottle', game: 'oot', category: 'bottles', maxLevel: 1 },
  { id: 'bottle_3', name: "Bottle 3", icon: 'bottle', game: 'oot', category: 'bottles', maxLevel: 1 },

  // --- OOT songs ---
  { id: 'oot_song_zelda', name: "Zelda's Lullaby", icon: 'song_zelda', game: 'oot', category: 'songs', maxLevel: 1 },
  { id: 'oot_song_epona', name: "Epona's Song", icon: 'song_epona', game: 'oot', category: 'songs', maxLevel: 1 },
  { id: 'oot_song_saria', name: "Saria's Song", icon: 'song_saria', game: 'oot', category: 'songs', maxLevel: 1 },
  { id: 'oot_song_sun', name: "Sun's Song", icon: 'song_sun', game: 'oot', category: 'songs', maxLevel: 1 },
  { id: 'oot_song_time', name: "Song of Time", icon: 'song_time', game: 'oot', category: 'songs', maxLevel: 1 },
  { id: 'oot_song_storms', name: "Song of Storms", icon: 'song_storms', game: 'oot', category: 'songs', maxLevel: 1 },
  { id: 'oot_song_minuet', name: "Minuet of Forest", icon: 'song_minuet', game: 'oot', category: 'songs', maxLevel: 1 },
  { id: 'oot_song_bolero', name: "Bolero of Fire", icon: 'song_bolero', game: 'oot', category: 'songs', maxLevel: 1 },
  { id: 'oot_song_serenade', name: "Serenade of Water", icon: 'song_serenade', game: 'oot', category: 'songs', maxLevel: 1 },
  { id: 'oot_song_requiem', name: "Requiem of Spirit", icon: 'song_requiem', game: 'oot', category: 'songs', maxLevel: 1 },
  { id: 'oot_song_nocturne', name: "Nocturne of Shadow", icon: 'song_nocturne', game: 'oot', category: 'songs', maxLevel: 1 },
  { id: 'oot_song_prelude', name: "Prelude of Light", icon: 'song_prelude', game: 'oot', category: 'songs', maxLevel: 1 },
  { id: 'oot_elegy', name: "Elegy of Emptiness", icon: 'mm_elegy', game: 'oot', category: 'songs', maxLevel: 1 },
  

  //Label Dungeons
  { id: 'label_forest', name: "Forest Temple", icon: 'label_forest', game: 'oot', category: 'label', maxLevel: 0 },
  { id: 'label_fire', name: "Fire Temple", icon: 'label_fire', game: 'oot', category: 'label', maxLevel: 0 },
  { id: 'label_water', name: "Water Temple", icon: 'label_water', game: 'oot', category: 'label', maxLevel: 0 },
  { id: 'label_spirit', name: "Spirit Temple", icon: 'label_spirit', game: 'oot', category: 'label', maxLevel: 0 },
  { id: 'label_shadow', name: "Shadow Temple", icon: 'label_shadow', game: 'oot', category: 'label', maxLevel: 0 },
  { id: 'label_gc', name: "Ganon Castle", icon: 'label_gc', game: 'oot', category: 'label', maxLevel: 0 },
  { id: 'label_gtg', name: "Gerudo Training Grounds", icon: 'label_gtg', game: 'oot', category: 'label', maxLevel: 0 },
  { id: 'label_th', name: "Gerudo Fortress", icon: 'label_th', game: 'oot', category: 'label', maxLevel: 0 },
  { id: 'label_botw', name: "Bottom of the Well", icon: 'label_botw', game: 'oot', category: 'label', maxLevel: 0 },


  // --- OOT masks & trade ---
  { id: 'skulltula_token', name: "Gold Skulltula", icon: 'skulltula_token', game: 'oot', category: 'misc', maxLevel: 100, showCount: true },
  { id: 'mask_keaton_oot', name: "Keaton Mask", icon: 'keaton', game: 'oot', category: 'masks', maxLevel: 1 },
  { id: 'mask_skull_oot', name: "Skull Mask", icon: 'skull', game: 'oot', category: 'masks', maxLevel: 1 },
  { id: 'mask_spooky_oot', name: "Spooky Mask", icon: 'spooky', game: 'oot', category: 'masks', maxLevel: 1 },
  { id: 'mask_bunny_oot', name: "Bunny Hood", icon: 'bunny', game: 'oot', category: 'masks', maxLevel: 1 },
  { id: 'mask_truth_oot', name: "Mask of Truth", icon: 'truth', game: 'oot', category: 'masks', maxLevel: 1 },
  { id: 'mask_goron_oot', name: "Goron Mask", icon: 'mm_goron', game: 'oot', category: 'masks', maxLevel: 1 },
  { id: 'mask_zora_oot', name: "Zora Mask", icon: 'mm_zora', game: 'oot', category: 'masks', maxLevel: 1 },
  { id: 'mask_gerudo_oot', name: "Gerudo Mask", icon: 'gerudo', game: 'oot', category: 'masks', maxLevel: 1 },
  
  // Child trade sequence — each item checkable individually
  { id: 'trade_c_egg', name: "Weird Egg", icon: 'egg', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_c_cucco', name: "Child Cucco", icon: 'cucco', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_c_letter', name: "Zelda's Letter", icon: 'letter', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_c_skull', name: "Skull Mask", icon: 'skull', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_c_spooky', name: "Spooky Mask", icon: 'spooky', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_c_bunny', name: "Bunny Hood", icon: 'bunny', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_c_truth', name: "Mask of Truth", icon: 'truth', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_a_cojiro', name: "Cojiro", icon: 'cojiro', game: 'oot', category: 'misc', maxLevel: 1 },
  // Adult trade sequence — each item checkable individually
  { id: 'trade_a_cucco', name: "Adult Cucco", icon: 'cucco', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_a_mushroom', name: "Odd Mushroom", icon: 'mushroom', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_a_potion', name: "Odd Potion", icon: 'medicine', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_a_saw', name: "Poacher's Saw", icon: 'saw', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_a_broken', name: "Broken Goron Sword", icon: 'broken_sword', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_a_rx', name: "Prescription", icon: 'perscription', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_a_drops', name: "Eyedrops", icon: 'eyedrops', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_a_claim', name: "Claim Check", icon: 'claim', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_a_frog', name: "Frog", icon: 'frog', game: 'oot', category: 'misc', maxLevel: 1 },
  { id: 'trade_a_biggoron', name: "Biggoron's Sword", icon: 'sword3', game: 'oot', category: 'misc', maxLevel: 1 },

  // --- OOT rewards ---
  { id: 'stone_emerald', name: "Kokiri's Emerald", icon: 'emerald', game: 'oot', category: 'rewards', maxLevel: 1 },
  { id: 'stone_ruby', name: "Goron's Ruby", icon: 'ruby', game: 'oot', category: 'rewards', maxLevel: 1 },
  { id: 'stone_sapphire', name: "Zora's Sapphire", icon: 'sapphire', game: 'oot', category: 'rewards', maxLevel: 1 },
  { id: 'medal_forest', name: "Forest Medallion", icon: 'forestmedallion', game: 'oot', category: 'rewards', maxLevel: 1 },
  { id: 'medal_fire', name: "Fire Medallion", icon: 'firemedallion', game: 'oot', category: 'rewards', maxLevel: 1 },
  { id: 'medal_water', name: "Water Medallion", icon: 'watermedallion', game: 'oot', category: 'rewards', maxLevel: 1 },
  { id: 'medal_spirit', name: "Spirit Medallion", icon: 'spiritmedallion', game: 'oot', category: 'rewards', maxLevel: 1 },
  { id: 'medal_shadow', name: "Shadow Medallion", icon: 'shadowmedallion', game: 'oot', category: 'rewards', maxLevel: 1 },
  { id: 'medal_light', name: "Light Medallion", icon: 'lightmedallion', game: 'oot', category: 'rewards', maxLevel: 1 },

  // --- OoT Button ---
  { id: 'button_a', name: "A Button", icon: 'button_a', game: 'oot', category: 'button', maxLevel: 1 },
  { id: 'button_down', name: "C-Down Button", icon: 'button_down', game: 'oot', category: 'button', maxLevel: 1 },
  { id: 'button_up', name: "C-Up Button", icon: 'button_up', game: 'oot', category: 'button', maxLevel: 1 },
  { id: 'button_left', name: "C-Left Button", icon: 'button_left', game: 'oot', category: 'button', maxLevel: 1 },
  { id: 'button_right', name: "C-Right Button", icon: 'button_right', game: 'oot', category: 'button', maxLevel: 1 },

  // --- OoT Dungeon Items
  { id: 'forest_sk', name: "Small Key (Forest Temple)", icon: 'small_key', game: 'oot', category: 'keys', maxLevel: 5, showCount: true },
  { id: 'fire_sk', name: "Small Key (Fire Temple)", icon: 'small_key', game: 'oot', category: 'keys', maxLevel: 7, showCount: true },
  { id: 'water_sk', name: "Small Key (Water Temple)", icon: 'small_key', game: 'oot', category: 'keys', maxLevel: 5, showCount: true },
  { id: 'spirit_sk', name: "Small Key (Spirit Temple)", icon: 'small_key', game: 'oot', category: 'keys', maxLevel: 5, showCount: true },
  { id: 'shadow_sk', name: "Small Key (Shadow Temple)", icon: 'small_key', game: 'oot', category: 'keys', maxLevel: 5, showCount: true },
  { id: 'gc_sk', name: "Small Key (Ganon's Castle)", icon: 'small_key', game: 'oot', category: 'keys', maxLevel: 2, showCount: true },
  { id: 'gtg_sk', name: "Small Key (Gerudo Training Grounds)", icon: 'small_key', game: 'oot', category: 'keys', maxLevel: 9, showCount: true },
  { id: 'th_sk', name: "Small Key (Thieves Hideout)", icon: 'small_key', game: 'oot', category: 'keys', maxLevel: 4, showCount: true },
  { id: 'botw_sk', name: "Small Key (Bottom of the Well)", icon: 'small_key', game: 'oot', category: 'keys', maxLevel: 3, showCount: true },

  // --- OOT boss keys ---
  { id: 'oot_bk_forest', name: "Boss Key (Forest Temple)", icon: 'boss_key', game: 'oot', category: 'keys', maxLevel: 1 },
  { id: 'oot_bk_fire', name: "Boss Key (Fire Temple)", icon: 'boss_key', game: 'oot', category: 'keys', maxLevel: 1 },
  { id: 'oot_bk_water', name: "Boss Key (Water Temple)", icon: 'boss_key', game: 'oot', category: 'keys', maxLevel: 1 },
  { id: 'oot_bk_shadow', name: "Boss Key (Shadow Temple)", icon: 'boss_key', game: 'oot', category: 'keys', maxLevel: 1 },
  { id: 'oot_bk_spirit', name: "Boss Key (Spirit Temple)", icon: 'boss_key', game: 'oot', category: 'keys', maxLevel: 1 },
  { id: 'oot_bk_ganon', name: "Boss Key (Ganon's Castle)", icon: 'boss_key', game: 'oot', category: 'keys', maxLevel: 1 },

  // --- OoT extras ---
  { id: 'oot_sword', name: "Kokiri Sword", icon: 'sword1', game: 'oot', category: 'equipment', maxLevel: 1 },
  { id: 'oot_spin_upgrade', name: "Great Spin", icon: 'mm_spin', game: 'oot', category: 'items', maxLevel: 1 },
  { id: 'oot_rupee_magical', name: "Magical Rupee", icon: 'rupee', game: 'oot', category: 'misc', maxLevel: 1 },

  // --- OOT boss souls ---
  { id: 'oot_oot_soul_boss_queen_gohma', name: "Soul: Queen Gohma", icon: 'oot_soul_boss_queen_gohma', game: 'oot', category: 'souls_boss', maxLevel: 1 },
  { id: 'oot_oot_soul_boss_king_dodongo', name: "Soul: King Dodongo", icon: 'oot_soul_boss_king_dodongo', game: 'oot', category: 'souls_boss', maxLevel: 1 },
  { id: 'oot_oot_soul_boss_barinade', name: "Soul: Barinade", icon: 'oot_soul_boss_barinade', game: 'oot', category: 'souls_boss', maxLevel: 1 },
  { id: 'oot_oot_soul_boss_phantom_ganon', name: "Soul: Phantom Ganon", icon: 'oot_soul_boss_phantom_ganon', game: 'oot', category: 'souls_boss', maxLevel: 1 },
  { id: 'oot_oot_soul_boss_volvagia', name: "Soul: Volvagia", icon: 'oot_soul_boss_volvagia', game: 'oot', category: 'souls_boss', maxLevel: 1 },
  { id: 'oot_oot_soul_boss_morpha', name: "Soul: Morpha", icon: 'oot_soul_boss_morpha', game: 'oot', category: 'souls_boss', maxLevel: 1 },
  { id: 'oot_oot_soul_boss_bongo_bongo', name: "Soul: Bongo Bongo", icon: 'oot_soul_boss_bongo_bongo', game: 'oot', category: 'souls_boss', maxLevel: 1 },
  { id: 'oot_oot_soul_boss_twinrova', name: "Soul: Twinrova", icon: 'oot_soul_boss_twinrova', game: 'oot', category: 'souls_boss', maxLevel: 1 },

  // --- OOT enemy souls ---
  { id: 'oot_oot_soul_enemy_anubis', name: "Soul: Anubis", icon: 'oot_soul_enemy_anubis', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_armos', name: "Soul: Armos", icon: 'oot_soul_enemy_armos', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_baby_dodongo', name: "Soul: Baby Dodongo", icon: 'oot_soul_enemy_baby_dodongo', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_beamos', name: "Soul: Beamos", icon: 'oot_soul_enemy_beamos', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_biri_bari', name: "Soul: Biri/Bari", icon: 'oot_soul_enemy_biri_bari', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_bubble', name: "Soul: Bubble", icon: 'oot_soul_enemy_bubble', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_dark_link', name: "Soul: Dark Link", icon: 'oot_soul_enemy_dark_link', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_dead_hand', name: "Soul: Dead Hand", icon: 'oot_soul_enemy_dead_hand', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_deku_baba', name: "Soul: Deku Baba", icon: 'oot_soul_enemy_deku_baba', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_deku_scrub', name: "Soul: Deku Scrub", icon: 'oot_soul_enemy_deku_scrub', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_dodongo', name: "Soul: Dodongo", icon: 'oot_soul_enemy_dodongo', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_flare_dancer', name: "Soul: Flare Dancer", icon: 'oot_soul_enemy_flare_dancer', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_floormaster', name: "Soul: Floormaster", icon: 'oot_soul_enemy_floormaster', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_flying_pot', name: "Soul: Flying Pot", icon: 'oot_soul_enemy_flying_pot', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_freezard', name: "Soul: Freezard", icon: 'oot_soul_enemy_freezard', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_gohma_larva', name: "Soul: Gohma Larva", icon: 'oot_soul_enemy_gohma_larva', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_guay', name: "Soul: Guay", icon: 'oot_soul_enemy_guay', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_iron_knuckle', name: "Soul: Iron Knuckle", icon: 'oot_soul_enemy_iron_knuckle', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_keese', name: "Soul: Keese", icon: 'oot_soul_enemy_keese', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_leever', name: "Soul: Leever", icon: 'oot_soul_enemy_leever', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_like_like', name: "Soul: Like Like", icon: 'oot_soul_enemy_like_like', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_lizalfos_dinalfos', name: "Soul: Lizalfos", icon: 'oot_soul_enemy_lizalfos_dinalfos', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_moblin', name: "Soul: Moblin", icon: 'oot_soul_enemy_moblin', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_octorok', name: "Soul: Octorok", icon: 'oot_soul_enemy_octorok', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_parasite', name: "Soul: Parasite", icon: 'oot_soul_enemy_parasite', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_peahat', name: "Soul: Peahat", icon: 'oot_soul_enemy_peahat', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_redead_gibdo', name: "Soul: Redead/Gibdo", icon: 'oot_soul_enemy_redead_gibdo', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_shabom', name: "Soul: Shabom", icon: 'oot_soul_enemy_shabom', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_shell_blade', name: "Soul: Shell Blade", icon: 'oot_soul_enemy_shell_blade', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_skulltula', name: "Soul: Skulltula", icon: 'oot_soul_enemy_skulltula', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_skullwalltula', name: "Soul: Skullwalltula", icon: 'oot_soul_enemy_skullwalltula', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_skull_kid', name: "Soul: Skull Kid", icon: 'oot_soul_enemy_skull_kid', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_spike', name: "Soul: Spike", icon: 'oot_soul_enemy_spike', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_stalchild', name: "Soul: Stalchild", icon: 'oot_soul_enemy_stalchild', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_stalfos', name: "Soul: Stalfos", icon: 'oot_soul_enemy_stalfos', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_stinger', name: "Soul: Stinger", icon: 'oot_soul_enemy_stinger', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_tailpasarn', name: "Soul: Tailpasarn", icon: 'oot_soul_enemy_tailpasarn', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_tektite', name: "Soul: Tektite", icon: 'oot_soul_enemy_tektite', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_thieves', name: "Soul: Thieves", icon: 'oot_soul_enemy_thieves', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_torch_slug', name: "Soul: Torch Slug", icon: 'oot_soul_enemy_torch_slug', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_wallmaster', name: "Soul: Wallmaster", icon: 'oot_soul_enemy_wallmaster', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_enemy_wolfos', name: "Soul: Wolfos", icon: 'oot_soul_enemy_wolfos', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_misc_business_scrub', name: "Soul: Business Scrub", icon: 'oot_soul_misc_business_scrub', game: 'oot', category: 'souls_enemy', maxLevel: 1 },
  { id: 'oot_oot_soul_misc_gs', name: "Soul: Gold Skulltula", icon: 'oot_soul_misc_gs', game: 'oot', category: 'souls_enemy', maxLevel: 1 },

  // --- OOT npc souls ---
  { id: 'oot_oot_soul_npc_anju', name: "Soul: Anju", icon: 'oot_soul_npc_anju', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_astronomer', name: "Soul: Astronomer", icon: 'oot_soul_npc_astronomer', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_banker', name: "Soul: Banker", icon: 'oot_soul_npc_banker', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_bazaar_shopkeeper', name: "Soul: Bazaar", icon: 'oot_soul_npc_bazaar_shopkeeper', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_bean_salesman', name: "Soul: Bean Salesman", icon: 'oot_soul_npc_bean_salesman', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_biggoron', name: "Soul: Biggoron", icon: 'oot_soul_npc_biggoron', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_bombchu_bowling_lady', name: "Soul: Chu Bowling", icon: 'oot_soul_npc_bombchu_bowling_lady', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_bombchu_shopkeeper', name: "Soul: Chu Shop", icon: 'oot_soul_npc_bombchu_shopkeeper', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_bombers', name: "Soul: Bombers", icon: 'oot_soul_npc_bombers', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_carpenters', name: "Soul: Carpenters", icon: 'oot_soul_npc_carpenters', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_carpet_man', name: "Soul: Carpet Man", icon: 'oot_soul_npc_carpet_man', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_chest_game_owner', name: "Soul: Chest Game", icon: 'oot_soul_npc_chest_game_owner', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_citizen', name: "Soul: Citizen", icon: 'oot_soul_npc_citizen', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_composer_bros', name: "Soul: Composer Bros", icon: 'oot_soul_npc_composer_bros', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_dampe', name: "Soul: Dampé", icon: 'oot_soul_npc_dampe', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_darunia', name: "Soul: Darunia", icon: 'oot_soul_npc_darunia', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_dog_lady', name: "Soul: Dog Lady", icon: 'oot_soul_npc_dog_lady', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_fishing_pond_owner', name: "Soul: Fishing", icon: 'oot_soul_npc_fishing_pond_owner', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_gorman', name: "Soul: Gorman", icon: 'oot_soul_npc_gorman', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_goron', name: "Soul: Goron", icon: 'oot_soul_npc_goron', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_goron_child', name: "Soul: Goron Child", icon: 'oot_soul_npc_goron_child', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_goron_shopkeeper', name: "Soul: Goron Shop", icon: 'oot_soul_npc_goron_shopkeeper', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_grog', name: "Soul: Grog", icon: 'oot_soul_npc_grog', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_guru_guru', name: "Soul: Guru-Guru", icon: 'oot_soul_npc_guru_guru', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_honey_darling', name: "Soul: Honey & Darling", icon: 'oot_soul_npc_honey_darling', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_hylian_guard', name: "Soul: Hylian Guard", icon: 'oot_soul_npc_hylian_guard', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_king_zora', name: "Soul: King Zora", icon: 'oot_soul_npc_king_zora', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_kokiri', name: "Soul: Kokiri", icon: 'oot_soul_npc_kokiri', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_kokiri_shopkeeper', name: "Soul: Kokiri Shop", icon: 'oot_soul_npc_kokiri_shopkeeper', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_malon', name: "Soul: Malon", icon: 'oot_soul_npc_malon', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_medigoron', name: "Soul: Medigoron", icon: 'oot_soul_npc_medigoron', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_mido', name: "Soul: Mido", icon: 'oot_soul_npc_mido', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_old_hag', name: "Soul: Old Hag", icon: 'oot_soul_npc_old_hag', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_poe_collector', name: "Soul: Poe Collector", icon: 'oot_soul_npc_poe_collector', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_potion_shopkeeper', name: "Soul: Potion Shop", icon: 'oot_soul_npc_potion_shopkeeper', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_rooftop_man', name: "Soul: Rooftop Man", icon: 'oot_soul_npc_rooftop_man', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_ruto', name: "Soul: Ruto", icon: 'oot_soul_npc_ruto', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_saria', name: "Soul: Saria", icon: 'oot_soul_npc_saria', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_scientist', name: "Soul: Scientist", icon: 'oot_soul_npc_scientist', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_sheik', name: "Soul: Sheik", icon: 'oot_soul_npc_sheik', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_shooting_gallery_owner', name: "Soul: Shooting Gallery", icon: 'oot_soul_npc_shooting_gallery_owner', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_talon', name: "Soul: Talon", icon: 'oot_soul_npc_talon', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_thieves', name: "Soul: Thieves", icon: 'oot_soul_npc_thieves', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_zelda', name: "Soul: Zelda", icon: 'oot_soul_npc_zelda', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_zora', name: "Soul: Zora", icon: 'oot_soul_npc_zora', game: 'oot', category: 'souls_npc', maxLevel: 1 },
  { id: 'oot_oot_soul_npc_zora_shopkeeper', name: "Soul: Zora Shop", icon: 'oot_soul_npc_zora_shopkeeper', game: 'oot', category: 'souls_npc', maxLevel: 1 },

  // --- MM items ---
  { id: 'mm_bow', name: "Bow", icon: 'mm_bow', game: 'mm', category: 'items', maxLevel: 3, levelLabels: ['30', '40', '50'], showCount: true },
  { id: 'mm_hookshot', name: "Hookshot", icon: 'mm_hookshot', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_bomb', name: "Bomb Bag", icon: 'mm_bomb', game: 'mm', category: 'items', maxLevel: 3, levelLabels: ['20', '30', '40'] },
  { id: 'mm_bombchu', name: "Bombchu", icon: 'mm_bombchu', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_lens', name: "Lens of Truth", icon: 'mm_lens', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_magic', name: "Magic", icon: 'mm_magic1', game: 'mm', category: 'items', maxLevel: 2, levelIcons: ['mm_magic1', 'mm_magic2'] },
  { id: 'mm_arrow_fire', name: "Fire Arrows", icon: 'mm_firearrow', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_arrow_ice', name: "Ice Arrows", icon: 'mm_icearrow', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_arrow_light', name: "Light Arrows", icon: 'mm_lightarrow', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_boots_iron', name: "Iron Boots", icon: 'boots_iron', game: 'mm', category: 'equipment', maxLevel: 1 },
  { id: 'mm_boots_hover', name: "Hover Boots", icon: 'boots_hover', game: 'mm', category: 'equipment', maxLevel: 1 },
  { id: 'mm_tunic_goron', name: "Goron Tunic", icon: 'redtunic', game: 'mm', category: 'equipment', maxLevel: 1 },
  { id: 'mm_tunic_zora', name: "Zora Tunic", icon: 'bluetunic', game: 'mm', category: 'equipment', maxLevel: 1 },
  { id: 'mm_scale', name: "Scale", icon: 'scale1', game: 'mm', category: 'equipment', maxLevel: 2, levelIcons: ['scale1', 'scale2'] },
  { id: 'mm_strength', name: "Strength", icon: 'lift1', game: 'mm', category: 'equipment', maxLevel: 3, levelIcons: ['lift1', 'lift2', 'lift3'] },
  { id: 'mm_hammer', name: "Hammer", icon: 'hammer', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_wallet', name: "Wallet", icon: 'mm_wallet99', game: 'mm', category: 'items', maxLevel: 3, levelLabels: ['200', '500', '999'], levelIcons: ['mm_wallet', 'mm_giantwallet', 'mm_giantwallet'], startUndimmed: true, startLabel: '99' },
  { id: 'mm_sword', name: "Sword", icon: 'mm_kokiri', game: 'mm', category: 'equipment', maxLevel: 3, levelIcons: ['mm_kokiri', 'mm_razor', 'mm_gilded'] },
  { id: 'mm_shield', name: "Hero's Shield", icon: 'mm_shield', game: 'mm', category: 'equipment', maxLevel: 1,},
  { id: 'mm_mirror', name: "Mirror Shield", icon: 'mm_mirror', game: 'mm', category: 'equipment', maxLevel: 1,},
  { id: 'mm_scarecrow', name: "Scarecrow", icon: 'scarecrow', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_nuts', name: "Nuts", icon: 'mm_nut', game: 'mm', category: 'items', maxLevel: 3, levelLabels: ['10', '20', '30'], showCount: true },
  { id: 'mm_ocarina', name: "Ocarina of Time", icon: 'mm_ocarina', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_spin_upgrade', name: "Spin Upgrade", icon: 'mm_spin', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_stick', name: "Sticks", icon: 'mm_stick', game: 'mm', category: 'items', maxLevel: 3, levelLabels: ['10', '20', '30'], showCount: true },
  { id: 'mm_bean', name: "Beans", icon: 'mm_bean', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_bomber', name: "Bomber's Notebook", icon: 'mm_bomber', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_keg', name: "Powder's Keg", icon: 'mm_keg', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_pictobox', name: "Pictograph Box", icon: 'mm_box', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_fairysword', name: "Great Fairy Sword", icon: 'mm_fairysword', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_tear', name: "Moon's Tear", icon: 'mm_tear', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_deed1', name: "Land Title Deed", icon: 'mm_deed1', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_deed2', name: "Swamp Title Deed", icon: 'mm_deed2', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_deed3', name: "Mountain Title Deed", icon: 'mm_deed3', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_deed4', name: "Ocean Title Deed", icon: 'mm_deed4', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_clocktown_stray_fairy', name: "Stray Fairy (Clock Town)", icon: 'mm_clocktown_stray_fairy', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_woodfall_stray_fairy', name: "Stray Fairy (Woodfall)", icon: 'mm_woodfall_stray_fairy', game: 'mm', category: 'items', maxLevel: 15, showCount: true },
  { id: 'mm_snowhead_stray_fairy', name: "Stray Fairy (Snowhead)", icon: 'mm_snowhead_stray_fairy', game: 'mm', category: 'items', maxLevel: 15, showCount: true },
  { id: 'mm_greatbay_stray_fairy', name: "Stray Fairy (Great Bay)", icon: 'mm_greatbay_stray_fairy', game: 'mm', category: 'items', maxLevel: 15, showCount: true },
  { id: 'mm_stonetower_stray_fairy', name: "Stray Fairy (Stone Tower)", icon: 'mm_stonetower_stray_fairy', game: 'mm', category: 'items', maxLevel: 15, showCount: true },
  { id: 'mm_roomkey', name: "Room Key", icon: 'mm_roomkey', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_pendant', name: "Pendant of Memories", icon: 'mm_pendant', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_letter', name: "Letter to Kafei", icon: 'mm_letter', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_delivery', name: "Letter to Mama", icon: 'mm_delivery', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_skulltulla_woodfall', name: "Swamp Skulltule Token", icon: 'mm_skulltulla_woodfall', game: 'mm', category: 'items', maxLevel: 30 ,showCount: true},
  { id: 'mm_skulltulla_greatbay', name: "Ocean Skulltule Token", icon: 'mm_skulltulla_greatbay', game: 'mm', category: 'items', maxLevel: 30 ,showCount: true},
  { id: 'skulltula_platinum_mm', name: "Platinum Token", icon: 'skulltula_platinum', game: 'mm', category: 'items', maxLevel: 1, },

  // --- MM Labels ---
  { id: 'mm_label_woodfall', name: "Woodfall Temple", icon: 'mm_label_woodfall', game: 'mm', category: 'label', maxLevel: 0 },
  { id: 'mm_label_snowhead', name: "Snowhead Temple", icon: 'mm_label_snowhead', game: 'mm', category: 'label', maxLevel: 0 },
  { id: 'mm_label_greatbay', name: "Great Bay Temple", icon: 'mm_label_greatbay', game: 'mm', category: 'label', maxLevel: 0 },
  { id: 'mm_label_stonetower', name: "Stone Tower Temple", icon: 'mm_label_stonetower', game: 'mm', category: 'label', maxLevel: 0 },

  

  // --- MM bottles ---
  { id: 'mm_bottle_1', name: "Bottle 1", icon: 'mm_bottle', game: 'mm', category: 'bottles', maxLevel: 1 },
  { id: 'mm_bottle_2', name: "Bottle 2", icon: 'mm_bottle', game: 'mm', category: 'bottles', maxLevel: 1 },
  { id: 'mm_bottle_3', name: "Bottle 3", icon: 'mm_bottle', game: 'mm', category: 'bottles', maxLevel: 1 },
  { id: 'mm_bottle_4', name: "Bottle 4", icon: 'mm_bottle', game: 'mm', category: 'bottles', maxLevel: 1 },
  { id: 'mm_bottle_5', name: "Bottle 5", icon: 'mm_bottle', game: 'mm', category: 'bottles', maxLevel: 1 },
  { id: 'mm_dust', name: "Bottle of Gold Dust", icon: 'mm_dust', game: 'mm', category: 'bottles', maxLevel: 1 },

  // --- MM songs ---
  { id: 'mm_song_time', name: "Song of Time", icon: 'mm_songoftime', game: 'mm', category: 'songs', maxLevel: 1 },
  { id: 'mm_song_epona', name: "Epona's Song", icon: 'mm_epona', game: 'mm', category: 'songs', maxLevel: 1 },
  { id: 'mm_song_storms', name: "Song of Storms", icon: 'mm_songofstorms', game: 'mm', category: 'songs', maxLevel: 1 },
  { id: 'mm_song_sun', name: "Sun's Song", icon: 'song_sun', game: 'mm', category: 'songs', maxLevel: 1 },
  { id: 'mm_song_healing', name: "Song of Healing", icon: 'mm_healing', game: 'mm', category: 'songs', maxLevel: 1 },
  { id: 'mm_song_soaring', name: "Song of Soaring", icon: 'mm_soaring', game: 'mm', category: 'songs', maxLevel: 1 },
  { id: 'mm_song_sonata', name: "Sonata of Awakening", icon: 'mm_sonata', game: 'mm', category: 'songs', maxLevel: 1 },
  { id: 'mm_song_lullaby', name: "Goron's Lullaby", icon: 'mm_half_lullaby', game: 'mm', category: 'songs', maxLevel: 2, levelIcons: ['mm_half_lullaby', 'mm_lullaby'] },
  { id: 'mm_song_nova', name: "New Wave Bossa Nova", icon: 'mm_bossanova', game: 'mm', category: 'songs', maxLevel: 1 },
  { id: 'mm_song_elegy', name: "Elegy of Emptiness", icon: 'mm_elegy', game: 'mm', category: 'songs', maxLevel: 1 },
  { id: 'mm_song_oath', name: "Oath to Order", icon: 'mm_oath', game: 'mm', category: 'songs', maxLevel: 1 },

  // --- MM transformation masks ---
  { id: 'mask_deku', name: "Deku Mask", icon: 'mm_deku', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_goron', name: "Goron Mask", icon: 'mm_goron', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_zora', name: "Zora Mask", icon: 'mm_zora', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_fierce_deity', name: "Fierce Deity", icon: 'mm_fiercedeity', game: 'mm', category: 'masks', maxLevel: 1 },

  // --- MM regular masks ---
  { id: 'mask_postman', name: "Postman Hat", icon: 'mm_postman', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_all_night', name: "All-Night Mask", icon: 'mm_allnight', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_blast', name: "Blast Mask", icon: 'mm_blast', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_stone', name: "Stone Mask", icon: 'mm_stone', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_great_fairy', name: "Great Fairy Mask", icon: 'mm_greatfairy', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_keaton', name: "Keaton Mask", icon: 'mm_keaton', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_bremen', name: "Bremen Mask", icon: 'mm_bremen', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_bunny', name: "Bunny Hood", icon: 'mm_bunny', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_don_gero', name: "Don Gero's Mask", icon: 'mm_dongero', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_circus_leader', name: "Circus Leader Mask", icon: 'mm_troupe', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_kafei', name: "Kafei's Mask", icon: 'mm_kafeimask', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_couple', name: "Couple Mask", icon: 'mm_couple', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_truth_mm', name: "Mask of Truth", icon: 'mm_maskoftruth', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_romani', name: "Romani Mask", icon: 'mm_romanimask', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_kamaro', name: "Kamaro's Mask", icon: 'mm_kamaro', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_gibdo', name: "Gibdo Mask", icon: 'mm_gibdo', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_garo', name: "Garo Mask", icon: 'mm_garo', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_captain_hat', name: "Captain's Hat", icon: 'mm_captain', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_giant', name: "Giant Mask", icon: 'mm_giant', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_scents', name: "Mask of Scents", icon: 'mm_scents', game: 'mm', category: 'masks', maxLevel: 1 },
  { id: 'mask_spooky_mm', name: "Spooky Mask", icon: 'spooky', game: 'mm', category: 'masks', maxLevel: 1 },

  // --- MM rewards (Boss Remains) ---
  { id: 'remains_odolwa', name: "Odolwa's Remains", icon: 'mm_odolwa', game: 'mm', category: 'rewards', maxLevel: 1 },
  { id: 'remains_goht', name: "Goht's Remains", icon: 'mm_goht', game: 'mm', category: 'rewards', maxLevel: 1 },
  { id: 'remains_gyorg', name: "Gyorg's Remains", icon: 'mm_gyorg', game: 'mm', category: 'rewards', maxLevel: 1 },
  { id: 'remains_twinmold', name: "Twinmold's Remains", icon: 'mm_twinmold', game: 'mm', category: 'rewards', maxLevel: 1 },

  // --- MM boss souls ---
  { id: 'mm_soul_boss_odolwa', name: "Soul: Odolwa", icon: 'mm_soul_boss_odolwa', game: 'mm', category: 'souls_boss', maxLevel: 1 },
  { id: 'mm_soul_boss_goht', name: "Soul: Goht", icon: 'mm_soul_boss_goht', game: 'mm', category: 'souls_boss', maxLevel: 1 },
  { id: 'mm_soul_boss_gyorg', name: "Soul: Gyorg", icon: 'mm_soul_boss_gyorg', game: 'mm', category: 'souls_boss', maxLevel: 1 },
  { id: 'mm_soul_boss_twinmold', name: "Soul: Twinmold", icon: 'mm_soul_boss_twinmold', game: 'mm', category: 'souls_boss', maxLevel: 1 },
  { id: 'mm_soul_boss_igos', name: "Soul: Igos", icon: 'mm_soul_boss_igos', game: 'mm', category: 'souls_boss', maxLevel: 1 },

  // --- MM enemy souls ---
  { id: 'mm_soul_enemy_armos', name: "Soul: Armos", icon: 'mm_soul_enemy_armos', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_bad_bat', name: "Soul: Bad Bat", icon: 'mm_soul_enemy_bad_bat', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_beamos', name: "Soul: Beamos", icon: 'mm_soul_enemy_beamos', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_bio_baba', name: "Soul: Bio Baba", icon: 'mm_soul_enemy_bio_baba', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_boe', name: "Soul: Boe", icon: 'mm_soul_enemy_boe', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_bubble', name: "Soul: Bubble", icon: 'mm_soul_enemy_bubble', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_captain_keeta', name: "Soul: Cpt Keeta", icon: 'mm_soul_enemy_captain_keeta', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_chuchu', name: "Soul: ChuChu", icon: 'mm_soul_enemy_chuchu', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_deep_python', name: "Soul: Deep Python", icon: 'mm_soul_enemy_deep_python', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_deku_baba', name: "Soul: Deku Baba", icon: 'mm_soul_enemy_deku_baba', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_deku_scrub', name: "Soul: Deku Scrub", icon: 'mm_soul_enemy_deku_scrub', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_dexihand', name: "Soul: Dexihand", icon: 'mm_soul_enemy_dexihand', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_dodongo', name: "Soul: Dodongo", icon: 'mm_soul_enemy_dodongo', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_dragonfly', name: "Soul: Dragonfly", icon: 'mm_soul_enemy_dragonfly', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_eeno', name: "Soul: Eeno", icon: 'mm_soul_enemy_eeno', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_eyegore', name: "Soul: Eyegore", icon: 'mm_soul_enemy_eyegore', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_floormaster', name: "Soul: Floormaster", icon: 'mm_soul_enemy_floormaster', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_flying_pot', name: "Soul: Flying Pot", icon: 'mm_soul_enemy_flying_pot', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_freezard', name: "Soul: Freezard", icon: 'mm_soul_enemy_freezard', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_garo', name: "Soul: Garo", icon: 'mm_soul_enemy_garo', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_gekko', name: "Soul: Gekko", icon: 'mm_soul_enemy_gekko', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_gomess', name: "Soul: Gomess", icon: 'mm_soul_enemy_gomess', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_guay', name: "Soul: Guay", icon: 'mm_soul_enemy_guay', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_hiploop', name: "Soul: Hiploop", icon: 'mm_soul_enemy_hiploop', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_iron_knuckle', name: "Soul: Iron Knuckle", icon: 'mm_soul_enemy_iron_knuckle', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_keese', name: "Soul: Keese", icon: 'mm_soul_enemy_keese', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_leever', name: "Soul: Leever", icon: 'mm_soul_enemy_leever', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_like_like', name: "Soul: Like Like", icon: 'mm_soul_enemy_like_like', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_lizalfos_dinalfos', name: "Soul: Lizalfos", icon: 'mm_soul_enemy_lizalfos_dinalfos', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_nejiron', name: "Soul: Nejiron", icon: 'mm_soul_enemy_nejiron', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_octorok', name: "Soul: Octorok", icon: 'mm_soul_enemy_octorok', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_peahat', name: "Soul: Peahat", icon: 'mm_soul_enemy_peahat', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_real_bombchu', name: "Soul: Bombchu", icon: 'mm_soul_enemy_real_bombchu', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_redead_gibdo', name: "Soul: Redead", icon: 'mm_soul_enemy_redead_gibdo', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_shell_blade', name: "Soul: Shell Blade", icon: 'mm_soul_enemy_shell_blade', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_skullfish', name: "Soul: Skullfish", icon: 'mm_soul_enemy_skullfish', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_skulltula', name: "Soul: Skulltula", icon: 'mm_soul_enemy_skulltula', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_skullwalltula', name: "Soul: Skullwall", icon: 'mm_soul_enemy_skullwalltula', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_snapper', name: "Soul: Snapper", icon: 'mm_soul_enemy_snapper', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_stalchild', name: "Soul: Stalchild", icon: 'mm_soul_enemy_stalchild', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_takkuri', name: "Soul: Takkuri", icon: 'mm_soul_enemy_takkuri', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_tektite', name: "Soul: Tektite", icon: 'mm_soul_enemy_tektite', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_thieves', name: "Soul: Thieves", icon: 'mm_soul_enemy_thieves', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_wallmaster', name: "Soul: Wallmaster", icon: 'mm_soul_enemy_wallmaster', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_wart', name: "Soul: Wart", icon: 'mm_soul_enemy_wart', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_wizzrobe', name: "Soul: Wizzrobe", icon: 'mm_soul_enemy_wizzrobe', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_enemy_wolfos', name: "Soul: Wolfos", icon: 'mm_soul_enemy_wolfos', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_misc_business_scrub', name: "Soul: Business Scrub", icon: 'mm_soul_misc_business_scrub', game: 'mm', category: 'souls_enemy', maxLevel: 1 },
  { id: 'mm_soul_misc_gs', name: "Soul: Gold Skulltula", icon: 'mm_soul_misc_gs', game: 'mm', category: 'souls_enemy', maxLevel: 1 },

  // --- MM npc souls ---
  { id: 'mm_soul_npc_anju', name: "Soul: Anju", icon: 'mm_soul_npc_anju', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_aroma', name: "Soul: Aroma", icon: 'mm_soul_npc_aroma', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_astronomer', name: "Soul: Astronomer", icon: 'mm_soul_npc_astronomer', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_banker', name: "Soul: Banker", icon: 'mm_soul_npc_banker', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_bazaar_shopkeeper', name: "Soul: Bazaar", icon: 'mm_soul_npc_bazaar_shopkeeper', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_bean_salesman', name: "Soul: Bean Salesman", icon: 'mm_soul_npc_bean_salesman', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_biggoron', name: "Soul: Biggoron", icon: 'mm_soul_npc_biggoron', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_blacksmiths', name: "Soul: Blacksmiths", icon: 'mm_soul_npc_blacksmiths', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_bombchu_bowling_lady', name: "Soul: Chu Bowling", icon: 'mm_soul_npc_bombchu_bowling_lady', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_bombchu_shopkeeper', name: "Soul: Chu Shop", icon: 'mm_soul_npc_bombchu_shopkeeper', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_bombers', name: "Soul: Bombers", icon: 'mm_soul_npc_bombers', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_butler_deku', name: "Soul: Deku Butler", icon: 'mm_soul_npc_butler_deku', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_carpenters', name: "Soul: Carpenters", icon: 'mm_soul_npc_carpenters', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_carpet_man', name: "Soul: Carpet Man", icon: 'mm_soul_npc_carpet_man', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_chest_game_owner', name: "Soul: Chest Game", icon: 'mm_soul_npc_chest_game_owner', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_citizen', name: "Soul: Citizen", icon: 'mm_soul_npc_citizen', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_composer_bros', name: "Soul: Composer Bros", icon: 'mm_soul_npc_composer_bros', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_dampe', name: "Soul: Dampé", icon: 'mm_soul_npc_dampe', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_deku_king', name: "Soul: Deku King", icon: 'mm_soul_npc_deku_king', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_deku_princess', name: "Soul: Deku Princess", icon: 'mm_soul_npc_deku_princess', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_dog_lady', name: "Soul: Dog Lady", icon: 'mm_soul_npc_dog_lady', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_fishing_pond_owner', name: "Soul: Fishing", icon: 'mm_soul_npc_fishing_pond_owner', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_gorman', name: "Soul: Gorman", icon: 'mm_soul_npc_gorman', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_goron', name: "Soul: Goron", icon: 'mm_soul_npc_goron', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_goron_child', name: "Soul: Goron Child", icon: 'mm_soul_npc_goron_child', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_goron_elder', name: "Soul: Goron Elder", icon: 'mm_soul_npc_goron_elder', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_goron_shopkeeper', name: "Soul: Goron Shop", icon: 'mm_soul_npc_goron_shopkeeper', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_grog', name: "Soul: Grog", icon: 'mm_soul_npc_grog', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_guru_guru', name: "Soul: Guru-Guru", icon: 'mm_soul_npc_guru_guru', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_honey_darling', name: "Soul: Honey & Darling", icon: 'mm_soul_npc_honey_darling', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_kafei', name: "Soul: Kafei", icon: 'mm_soul_npc_kafei', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_keaton', name: "Soul: Keaton", icon: 'mm_soul_npc_keaton', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_koume_kotake', name: "Soul: Koume/Kotake", icon: 'mm_soul_npc_koume_kotake', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_malon', name: "Soul: Malon", icon: 'mm_soul_npc_malon', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_mayor_dotour', name: "Soul: Mayor", icon: 'mm_soul_npc_mayor_dotour', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_medigoron', name: "Soul: Medigoron", icon: 'mm_soul_npc_medigoron', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_moon_children', name: "Soul: Moon Children", icon: 'mm_soul_npc_moon_children', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_old_hag', name: "Soul: Old Hag", icon: 'mm_soul_npc_old_hag', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_playground_scrubs', name: "Soul: Playground Scrubs", icon: 'mm_soul_npc_playground_scrubs', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_poe_collector', name: "Soul: Poe Collector", icon: 'mm_soul_npc_poe_collector', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_rooftop_man', name: "Soul: Rooftop Man", icon: 'mm_soul_npc_rooftop_man', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_ruto', name: "Soul: Ruto", icon: 'mm_soul_npc_ruto', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_scientist', name: "Soul: Scientist", icon: 'mm_soul_npc_scientist', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_shooting_gallery_owner', name: "Soul: Gallery", icon: 'mm_soul_npc_shooting_gallery_owner', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_talon', name: "Soul: Talon", icon: 'mm_soul_npc_talon', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_thieves', name: "Soul: Thieves", icon: 'mm_soul_npc_thieves', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_tingle', name: "Soul: Tingle", icon: 'mm_soul_npc_tingle', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_toilet_hand', name: "Soul: Toilet Hand", icon: 'mm_soul_npc_toilet_hand', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_toto', name: "Soul: Toto", icon: 'mm_soul_npc_toto', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_tourist_center', name: "Soul: Tourist Center", icon: 'mm_soul_npc_tourist_center', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_zora', name: "Soul: Zora", icon: 'mm_soul_npc_zora', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_zora_musicians', name: "Soul: Zora Musicians", icon: 'mm_soul_npc_zora_musicians', game: 'mm', category: 'souls_npc', maxLevel: 1 },
  { id: 'mm_soul_npc_zora_shopkeeper', name: "Soul: Zora Shop", icon: 'mm_soul_npc_zora_shopkeeper', game: 'mm', category: 'souls_npc', maxLevel: 1 },


  // --- MM Clocks ---
  { id: 'mm_clock1', name: "Day 1", icon: 'clock_1', game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_clock2', name: "Day 2", icon: 'clock_2', game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_clock3', name: "Day 3", icon: 'clock_3', game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_clock4', name: "Night 1", icon: 'clock_4', game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_clock5', name: "Night 2", icon: 'clock_5', game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_clock6', name: "Night 3", icon: 'clock_6', game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_skeleton_key', name: "Skeleton Key (MM)", icon: 'key_skeleton', game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'oot_platinum_token', name: "Platinum Token (OoT)", icon: 'skulltula_platinum', game: 'oot', category: 'misc', maxLevel: 1 },

  // --- MM OoT Extensions ---
  { id: 'mm_spell_fire', name: "Din's Fire (MM)", icon: 'din', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_spell_wind', name: "Farore's Wind (MM)", icon: 'farore', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_spell_love', name: "Nayru's Love (MM)", icon: 'nayru', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_stone_of_agony', name: "Stone of Agony (MM)", icon: 'agony', game: 'mm', category: 'items', maxLevel: 1 },
  { id: 'mm_shield_deku', name: "Deku Shield (MM)", icon: 'deku_shield', game: 'mm', category: 'items', maxLevel: 1 },

  // --- MM Dungeon Keys ---
  { id: 'mm_sk_wf', name: "Small Key (Woodfall)", icon: 'mm_small_key', game: 'mm', category: 'keys', maxLevel: 1, showCount: true },
  { id: 'mm_sk_sh', name: "Small Key (Snowhead)", icon: 'mm_small_key', game: 'mm', category: 'keys', maxLevel: 3, showCount: true },
  { id: 'mm_sk_gb', name: "Small Key (Great Bay)", icon: 'mm_small_key', game: 'mm', category: 'keys', maxLevel: 1, showCount: true },
  { id: 'mm_sk_st', name: "Small Key (Stone Tower)", icon: 'mm_small_key', game: 'mm', category: 'keys', maxLevel: 4, showCount: true },
  { id: 'mm_bk_wf', name: "Boss Key (Woodfall)", icon: 'mm_bosskey_woodfall', game: 'mm', category: 'keys', maxLevel: 1 },
  { id: 'mm_bk_sh', name: "Boss Key (Snowhead)", icon: 'mm_boss_key', game: 'mm', category: 'keys', maxLevel: 1 },
  { id: 'mm_bk_gb', name: "Boss Key (Great Bay)", icon: 'mm_bosskey_greatbay', game: 'mm', category: 'keys', maxLevel: 1 },
  { id: 'mm_bk_st', name: "Boss Key (Stone Tower)", icon: 'mm_bosskey_stonetower', game: 'mm', category: 'keys', maxLevel: 1 },

  // --- MM Buttons ---
  { id: 'mm_button_a', name: "A Button (MM)", icon: 'button_a', game: 'mm', category: 'button', maxLevel: 1 },
  { id: 'mm_button_down', name: "C-Down (MM)", icon: 'button_down', game: 'mm', category: 'button', maxLevel: 1 },
  { id: 'mm_button_left', name: "C-Left (MM)", icon: 'button_left', game: 'mm', category: 'button', maxLevel: 1 },
  { id: 'mm_button_right', name: "C-Right (MM)", icon: 'button_right', game: 'mm', category: 'button', maxLevel: 1 },
  { id: 'mm_button_up', name: "C-Up (MM)", icon: 'button_up', game: 'mm', category: 'button', maxLevel: 1 },

  // --- MM Transcendent Fairy ---
  { id: 'mm_transcendent_fairy', name: "Transcendent Fairy", icon: 'mm_stray_fairy', game: 'mm', category: 'misc', maxLevel: 1 },

  // --- MM Owl Statues ---
  { id: 'mm_owl_clock_town',      name: "Owl (Clock Town)",      icon: 'deactivated_owl_statue_town',     levelIcons: ['activated_owl_statue_town'],     game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_owl_southern_swamp',  name: "Owl (Southern Swamp)",  icon: 'deactivated_owl_statue_swamp',    levelIcons: ['activated_owl_statue_swamp'],    game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_owl_woodfall',        name: "Owl (Woodfall)",        icon: 'deactivated_owl_statue_woodfall', levelIcons: ['activated_owl_statue_wood'],     game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_owl_milk_road',       name: "Owl (Milk Road)",       icon: 'deactivated_owl_statue_milk',     levelIcons: ['activated_owl_statue_milk'],     game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_owl_mountain_village',name: "Owl (Mountain Village)",icon: 'deactivated_owl_statue_mountain', levelIcons: ['activated_owl_statue_mountain'], game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_owl_snowhead',        name: "Owl (Snowhead)",        icon: 'deactivated_owl_statue_snow',     levelIcons: ['activated_owl_statue_snow'],     game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_owl_great_bay',       name: "Owl (Great Bay)",       icon: 'deactivated_owl_statue_bay',      levelIcons: ['activated_owl_statue_bay'],      game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_owl_zora_cape',       name: "Owl (Zora Cape)",       icon: 'deactivated_owl_statue_cape',     levelIcons: ['activated_owl_statue_cape'],     game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_owl_ikana_canyon',    name: "Owl (Ikana Canyon)",    icon: 'deactivated_owl_statue_ikana',    levelIcons: ['activated_owl_statue_ikana'],    game: 'mm', category: 'misc', maxLevel: 1 },
  { id: 'mm_owl_stone_tower',     name: "Owl (Stone Tower)",     icon: 'deactivated_owl_statue_stone',    levelIcons: ['activated_owl_statue_stone'],    game: 'mm', category: 'misc', maxLevel: 1 },

  // --- SHARED items ---
  { id: 'sh_hookshot', name: "Hookshot", icon: 'hookshot', game: 'shared', category: 'items', maxLevel: 2, settingKey: 'sharedHookshot', levelIcons: ['hookshot', 'longshot'] },
  { id: 'sh_bomb', name: "Bomb Bag", icon: 'bomb', game: 'shared', category: 'items', maxLevel: 3, settingKey: 'sharedBombBags', levelLabels: ['20', '30', '40'] },
  { id: 'sh_bottle', name: "Bottle", icon: 'mm_bottle', game: 'shared', category: 'bottles', maxLevel: 1, settingKey: 'sharedHealth' },
  { id: 'sh_nuts_sticks', name: "Nuts & Sticks", icon: 'nut', game: 'shared', category: 'items', maxLevel: 1, settingKey: 'sharedNutsSticks' },
  { id: 'sh_bombchu', name: "Bombchu", icon: 'bombchu', game: 'shared', category: 'items', maxLevel: 1, settingKey: 'sharedBombchuBags' },
  { id: 'sh_strength', name: "Strength", icon: 'lift1', game: 'shared', category: 'equipment', maxLevel: 3, settingKey: 'sharedStrength', levelIcons: ['lift1', 'lift2', 'lift3'] },
  { id: 'sh_hammer', name: "Hammer", icon: 'hammer', game: 'shared', category: 'items', maxLevel: 1, settingKey: 'sharedHammer' },
  { id: 'sh_bow', name: "Bow", icon: 'bow', game: 'shared', category: 'items', maxLevel: 1, settingKey: 'sharedBows' },
  { id: 'sh_magic', name: "Magic", icon: 'magic1', game: 'shared', category: 'items', maxLevel: 2, settingKey: 'sharedMagic', levelIcons: ['magic1', 'magic2'] },
  { id: 'sh_arrow_fire', name: "Fire Arrows", icon: 'arrow_fire', game: 'shared', category: 'items', maxLevel: 1, settingKey: 'sharedMagicArrowFire' },
  { id: 'sh_arrow_ice', name: "Ice Arrows", icon: 'arrow_ice', game: 'shared', category: 'items', maxLevel: 1, settingKey: 'sharedMagicArrowIce' },
  { id: 'sh_arrow_light', name: "Light Arrows", icon: 'arrow_light', game: 'shared', category: 'items', maxLevel: 1, settingKey: 'sharedMagicArrowLight' },
  { id: 'sh_lens', name: "Lens of Truth", icon: 'lens', game: 'shared', category: 'items', maxLevel: 1, settingKey: 'sharedLens' },
  { id: 'sh_ocarina', name: "Ocarina", icon: 'ocarina', game: 'shared', category: 'items', maxLevel: 1, settingKey: 'sharedOcarina' },
  { id: 'sh_boots_iron', name: "Iron Boots", icon: 'boots_iron', game: 'shared', category: 'equipment', maxLevel: 1, settingKey: 'sharedBootsIron' },
  { id: 'sh_boots_hover', name: "Hover Boots", icon: 'boots_hover', game: 'shared', category: 'equipment', maxLevel: 1, settingKey: 'sharedBootsHover' },
  { id: 'sh_tunic_goron', name: "Goron Tunic", icon: 'redtunic', game: 'shared', category: 'equipment', maxLevel: 1, settingKey: 'sharedTunicGoron' },
  { id: 'sh_tunic_zora', name: "Zora Tunic", icon: 'bluetunic', game: 'shared', category: 'equipment', maxLevel: 1, settingKey: 'sharedTunicZora' },
  { id: 'sh_scale', name: "Scale", icon: 'scale1', game: 'shared', category: 'equipment', maxLevel: 3, settingKey: 'sharedScales', levelIcons: ['scale_bronze', 'scale1', 'scale2'] },
  { id: 'sh_wallet', name: "Wallet", icon: 'wallet', game: 'shared', category: 'items', maxLevel: 3, settingKey: 'sharedWallets', levelLabels: [], levelIcons: ['wallet1', 'wallet2', 'wallet3'] },
  { id: 'sh_sword', name: "Child Swords", icon: 'sword1', game: 'shared', category: 'equipment', maxLevel: 2, settingKey: 'sharedSwords', levelIcons: ['sword1', 'sword2'] },
  { id: 'sh_shield', name: "Shield", icon: 'shield1', game: 'shared', category: 'equipment', maxLevel: 3, settingKey: 'sharedShields', levelIcons: ['shield1', 'shield2', 'shield3'] },
  { id: 'sh_din', name: "Din's Fire", icon: 'din', game: 'shared', category: 'items', maxLevel: 1, settingKey: 'sharedSpellFire' },
  { id: 'sh_farore', name: "Farore's Wind", icon: 'farore', game: 'shared', category: 'items', maxLevel: 1, settingKey: 'sharedSpellWind' },
  { id: 'sh_nayru', name: "Nayru's Love", icon: 'nayru', game: 'shared', category: 'items', maxLevel: 1, settingKey: 'sharedSpellLove' },
  { id: 'sh_mask_goron', name: "Goron Mask", icon: 'mm_goron', game: 'shared', category: 'masks', maxLevel: 1, settingKey: 'sharedMaskGoron' },
  { id: 'sh_mask_zora', name: "Zora Mask", icon: 'mm_zora', game: 'shared', category: 'masks', maxLevel: 1, settingKey: 'sharedMaskZora' },
  { id: 'sh_mask_keaton', name: "Keaton Mask", icon: 'mm_keaton', game: 'shared', category: 'masks', maxLevel: 1, settingKey: 'sharedMaskKeaton' },
  { id: 'sh_mask_blast', name: "Blast Mask", icon: 'mm_blast', game: 'shared', category: 'masks', maxLevel: 1, settingKey: 'sharedMaskBlast' },
  { id: 'sh_mask_stone', name: "Stone Mask", icon: 'mm_stone', game: 'shared', category: 'masks', maxLevel: 1, settingKey: 'sharedMaskStone' },
  { id: 'sh_mask_bunny', name: "Bunny Hood", icon: 'mm_bunny', game: 'shared', category: 'masks', maxLevel: 1, settingKey: 'sharedMaskBunny' },
  { id: 'sh_mask_truth', name: "Mask of Truth", icon: 'mm_maskoftruth', game: 'shared', category: 'masks', maxLevel: 1, settingKey: 'sharedMaskTruth' },
  { id: 'sh_song_epona', name: "Epona's Song", icon: 'song_epona', game: 'shared', category: 'songs', maxLevel: 1, settingKey: 'sharedSongEpona' },
  { id: 'sh_song_storms', name: "Song of Storms", icon: 'song_storms', game: 'shared', category: 'songs', maxLevel: 1, settingKey: 'sharedSongStorms' },
  { id: 'sh_song_time', name: "Song of Time", icon: 'song_time', game: 'shared', category: 'songs', maxLevel: 1, settingKey: 'sharedSongTime' },
  { id: 'sh_song_sun', name: "Sun's Song", icon: 'song_sun', game: 'shared', category: 'songs', maxLevel: 1, settingKey: 'sharedSongSun' },
  { id: 'sh_song_elegy', name: "Elegy of Emptiness", icon: 'mm_elegy', game: 'shared', category: 'songs', maxLevel: 1, settingKey: 'sharedSongElegy' },

  // --- SHARED bottles ---
  { id: 'sh_bottle_ruto', name: "Ruto's Letter", icon: 'bottle_letter', game: 'shared', category: 'bottles', maxLevel: 1, settingKey: 'sharedBottleRuto' },
  { id: 'sh_bottle_gold_dust', name: "Gold Dust Bottle", icon: 'mm_dust', game: 'shared', category: 'bottles', maxLevel: 1, settingKey: 'sharedBottleGoldDust' },

  // --- SHARED extras ---
  { id: 'sh_spin_upgrade', name: "Spin Upgrade", icon: 'mm_spin', game: 'shared', category: 'items', maxLevel: 1, settingKey: 'sharedSpinUpgrade' },
  { id: 'sh_shield_deku', name: "Deku Shield", icon: 'deku_shield', game: 'shared', category: 'equipment', maxLevel: 1, settingKey: 'sharedShieldDeku' },
  { id: 'sh_shield_hylian', name: "Hylian Shield", icon: 'hyrule_shield', game: 'shared', category: 'equipment', maxLevel: 1, settingKey: 'sharedShieldHylian' },
  { id: 'sh_stone_of_agony', name: "Stone of Agony", icon: 'agony', game: 'shared', category: 'items', maxLevel: 1, settingKey: 'sharedStoneOfAgony' },

  // --- SHARED Triforce ---
  { id: 'sh_triforce', name: "Triforce", icon: 'triforce_piece', game: 'shared', category: 'misc', maxLevel: 1, settingKey: 'sharedTriforce' },
  { id: 'sh_triforce_courage', name: "Triforce of Courage", icon: 'triforce_piece', game: 'shared', category: 'misc', maxLevel: 1, settingKey: 'sharedTriforceCourage' },
  { id: 'sh_triforce_power', name: "Triforce of Power", icon: 'triforce_piece', game: 'shared', category: 'misc', maxLevel: 1, settingKey: 'sharedTriforcePower' },
  { id: 'sh_triforce_wisdom', name: "Triforce of Wisdom", icon: 'triforce_piece', game: 'shared', category: 'misc', maxLevel: 1, settingKey: 'sharedTriforceWisdom' },

  // --- Progressive items (shown when setting === 'progressive') ---
  { id: 'oot_shield_progressive',               name: "Progressive Shield (OoT)",      icon: 'deku_shield', game: 'oot', category: 'equipment', maxLevel: 3, levelIcons: ['deku_shield', 'hyrule_shield', 'shield3'] },
  { id: 'oot_sword_progressive',                name: "Progressive Sword (OoT)",       icon: 'sword1',      game: 'oot', category: 'equipment', maxLevel: 4, levelIcons: ['sword1', 'sword2', 'giant_knife', 'sword3'] },
  { id: 'oot_sword_progressive_giantbiggoron',  name: "Progressive Knife/Biggoron",    icon: 'giant_knife', game: 'oot', category: 'equipment', maxLevel: 2, levelIcons: ['giant_knife', 'sword3'] },
  { id: 'mm_shield_progressive',                name: "Progressive Shield (MM)",       icon: 'mm_shield',   game: 'mm',  category: 'equipment', maxLevel: 2, levelIcons: ['mm_shield', 'mm_mirror'] },

  // --- Coins (affichés dans les deux jeux, même compteur) ---
  { id: 'coin_red',    name: "Red Coin",    icon: 'coin_red',    game: 'oot', category: 'misc', maxLevel: 999, showCount: true },
  { id: 'coin_green',  name: "Green Coin",  icon: 'coin_green',  game: 'oot', category: 'misc', maxLevel: 999, showCount: true },
  { id: 'coin_blue',   name: "Blue Coin",   icon: 'coin_blue',   game: 'oot', category: 'misc', maxLevel: 999, showCount: true },
  { id: 'coin_yellow', name: "Yellow Coin", icon: 'coin_yellow', game: 'oot', category: 'misc', maxLevel: 999, showCount: true },
];

export const itemById = Object.fromEntries(allTrackerItems.map(i => [i.id, i]));
export const ootItems    = allTrackerItems.filter(i => i.game === 'oot');
export const mmItems     = allTrackerItems.filter(i => i.game === 'mm');
export const sharedItems = allTrackerItems.filter(i => i.game === 'shared');

// ==========================================
// LAYOUT ROWS — fixed grid matching EmoTracker
// null = empty placeholder cell
// ==========================================

export const ootLayout: (string | null)[][] = [
  ['sticks_oot','nuts_oot','bomb','bow','arrow_fire_oot','din','sword_kokiri','deku_shield',null],

  ['slingshot', 'ocarina', 'bombchu', 'hookshot', 'arrow_ice_oot', 'farore', 'sword_master', 'hyrule_shield', null],

  ['boomerang', 'lens', 'bean', 'hammer', 'arrow_light_oot', 'nayru', 'giant_knife', 'sword_biggoron', 'shield_mirror'],

  ['oot_song_zelda', 'oot_song_epona', 'oot_song_saria', 'oot_song_sun', 'oot_song_time', 'oot_song_storms','boots_iron', 'boots_hover', null],

  ['oot_song_minuet', 'oot_song_bolero', 'oot_song_serenade', 'oot_song_requiem', 'oot_song_nocturne', 'oot_song_prelude', 'tunic_goron', 'tunic_zora', null],

  ['bottle_letter', 'bottle_1', 'bottle_2', 'bottle_3', 'scale', 'magic_oot', 'strength', 'wallet', null],

  ['key_skeleton', 'skulltula_token', 'skulltula_platinum','agony', 'gerudo_card', null, null, null, null, null, null],

  ['oot_elegy','button_a','button_up', 'button_down','button_left','button_right'],

  ['trade_c_cucco', 'trade_c_letter', 'mask_keaton_oot', 'trade_c_skull', 'trade_c_spooky', 'trade_c_bunny', 'trade_c_truth', 'mask_goron_oot', 'mask_zora_oot', 'mask_gerudo_oot'],

  ['trade_a_cucco', 'trade_a_cojiro', 'trade_a_mushroom', 'trade_a_potion', 'trade_a_saw', 'trade_a_rx', 'trade_a_frog', 'trade_a_drops', 'trade_a_claim'],

  ['stone_emerald', 'stone_ruby', 'stone_sapphire', null, null, null, null, null, null],

  ['medal_forest', 'medal_fire', 'medal_water', 'medal_shadow', 'medal_spirit', 'medal_light', null, null, null],

  ['label_forest', 'forest_sk', null, 'label_fire', 'fire_sk', null, 'label_water', 'water_sk', null],

  ['label_spirit', 'spirit_sk', null, 'label_shadow', 'shadow_sk', null, 'label_gc', 'gc_sk', null],

  ['label_gtg', 'gtg_sk', 'label_th', 'th_sk', 'label_botw', 'botw_sk', null, null, null],
];
  

export const mmLayout: (string | null)[][] = [
  ['mm_ocarina', 'mm_bow', 'mm_arrow_fire', 'mm_arrow_ice', 'mm_arrow_light', 'mm_sword', 'mm_shield', 'mm_mirror', 'mm_spin_upgrade'],
  ['mm_bomb', 'mm_bombchu', 'mm_stick', 'mm_nuts', 'mm_bean', 'mm_dust', 'mm_bottle_1', 'mm_bottle_2', 'mm_bomber'],
  [ 'mm_keg', 'mm_pictobox', 'mm_lens' , 'mm_hookshot', 'mm_fairysword', 'mm_bottle_3', 'mm_bottle_4', 'mm_bottle_5'],
  ['mm_song_time', 'mm_song_healing', 'mm_song_epona', 'mm_song_soaring', 'mm_song_storms', 'mm_song_sun', 'mm_wallet', 'mm_magic', 'mm_tear'],
  ['mm_song_sonata', 'mm_song_lullaby', 'mm_song_nova', 'mm_song_elegy', 'mm_song_oath', 'mm_clocktown_stray_fairy', 'mm_roomkey', 'mm_deed1', null],
  ['mask_postman', 'mask_all_night', 'mask_blast', 'mask_stone', 'mask_great_fairy', 'mask_deku', 'mm_pendant', 'mm_deed2', null],
  ['mask_keaton', 'mask_bremen', 'mask_bunny', 'mask_don_gero', 'mask_scents', 'mask_goron', 'mm_letter', 'mm_deed3', null],
  ['mask_romani', 'mask_circus_leader', 'mask_kafei', 'mask_couple', 'mask_truth_mm', 'mask_zora', 'mm_delivery', 'mm_deed4'],
  ['mask_kamaro', 'mask_gibdo', 'mask_garo', 'mask_captain_hat', 'mask_giant', 'mask_fierce_deity', null, 'mm_skulltulla_woodfall', 'mm_skulltulla_greatbay', 'skulltula_platinum_mm'],
  ['remains_odolwa', 'remains_goht', 'remains_gyorg', 'remains_twinmold', null, null, null, null, null],

  ['mm_label_woodfall', null, null, null, 'mm_label_snowhead', null, null, null, null],
  ['mm_label_greatbay', null, null, null, 'mm_label_stonetower', null, null, null, null],

];

export const sharedLayout: (string | null)[][] = [
  ['sh_hookshot', 'sh_bomb', 'sh_bottle', 'sh_nuts_sticks', 'sh_bombchu', null, 'sh_strength'],
  ['sh_hammer', null, 'sh_bow', 'sh_magic', 'sh_arrow_fire', 'sh_arrow_ice', 'sh_arrow_light'],
  ['sh_wallet', 'sh_lens', 'sh_ocarina', 'sh_scale', 'sh_boots_iron', 'sh_boots_hover', null],
  ['sh_sword', 'sh_shield', 'sh_tunic_goron', 'sh_tunic_zora', 'sh_din', 'sh_farore', 'sh_nayru'],
  ['sh_mask_goron', 'sh_mask_zora', 'sh_mask_keaton', 'sh_mask_blast', 'sh_mask_stone', 'sh_mask_bunny', 'sh_mask_truth'],
  ['sh_song_epona', 'sh_song_storms', 'sh_song_time', 'sh_song_sun', 'sh_song_elegy', null, null],
];