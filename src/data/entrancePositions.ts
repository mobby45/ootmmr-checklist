// Entrance marker pixel positions extracted from Memych OoTMM Tracker
// (https://github.com/Memych/OoTMMTracker/blob/main/Services/MapRegionsData.cs)
// Coordinates are in the original image pixel space.
// At runtime, convert to: (x / imageWidth) * 100, (y / imageHeight) * 100

export interface EntrancePosition {
  renderscene: string;
  entranceId: string;
  x: number;
  y: number;
  ageFilter?: 'child' | 'adult';
  mqOnly?: string;
  vanillaOnly?: string;
  jpOnly?: string;
  usOnly?: string;
  targetScene?: string; // for one-way entrances with no reverse — navigate directly here
}

export const entrancePositions: EntrancePosition[] = [
  // ========== DEATH MOUNTAIN CRATER ==========
  { renderscene: 'OOT_DEATH_MOUNTAIN_CRATER', entranceId: 'OOT_TRAIL_SUMMIT_FROM_CRATER', x: 602, y: 61 },
  { renderscene: 'OOT_DEATH_MOUNTAIN_CRATER', entranceId: 'OOT_TEMPLE_FIRE', x: 471, y: 552 },
  { renderscene: 'OOT_DEATH_MOUNTAIN_CRATER', entranceId: 'OOT_FAIRY_MAGIC2', x: 677, y: 240 },
  { renderscene: 'OOT_DEATH_MOUNTAIN_CRATER', entranceId: 'OOT_GROTTO_SCRUBS3_DMC', x: 725, y: 471 },
  { renderscene: 'OOT_DEATH_MOUNTAIN_CRATER', entranceId: 'OOT_GROTTO_GENERIC_DMC', x: 423, y: 86 },
  { renderscene: 'OOT_GREAT_FAIRY_MAGIC2', entranceId: 'OOT_DEATH_CRATER_FROM_FAIRY', x: 499, y: 552 },
  { renderscene: 'OOT_GROTTO_DEATH_CRATER_GENERIC', entranceId: 'OOT_GROTTO_EXIT_GENERIC_DMC', x: 671, y: 592 },
  { renderscene: 'OOT_GROTTO_DEATH_CRATER_SCRUBS', entranceId: 'OOT_GROTTO_EXIT_SCRUBS3_DMC', x: 696, y: 712 },

  // ========== DEATH MOUNTAIN TRAIL ==========
  { renderscene: 'OOT_DEATH_MOUNTAIN_TRAIL_ROOM_0', entranceId: 'OOT_DODONGO_CAVERN', x: 117, y: 316 },
  { renderscene: 'OOT_DEATH_MOUNTAIN_TRAIL_ROOM_0', entranceId: 'OOT_KAKARIKO_FROM_DEATH_MOUNTAIN', x: 915, y: 603 },
  { renderscene: 'OOT_DEATH_MOUNTAIN_TRAIL_ROOM_1', entranceId: 'OOT_GROTTO_GENERIC_DMT', x: 741, y: 279 },
  { renderscene: 'OOT_DEATH_MOUNTAIN_TRAIL_ROOM_1', entranceId: 'OOT_GROTTO_TRAIL_COW', x: 519, y: 167 },
  { renderscene: 'OOT_DEATH_MOUNTAIN_TRAIL_ROOM_1', entranceId: 'OOT_GORON_CITY', x: 802, y: 246 },
  { renderscene: 'OOT_DEATH_MOUNTAIN_TRAIL_ROOM_2', entranceId: 'OOT_DEATH_MOUNTAIN_CRATER', x: 476, y: 72 },
  { renderscene: 'OOT_DEATH_MOUNTAIN_TRAIL_ROOM_2', entranceId: 'OOT_FAIRY_MAGIC', x: 401, y: 73 },
  { renderscene: 'OOT_GREAT_FAIRY_MAGIC', entranceId: 'OOT_DEATH_MOUNTAIN_FROM_FAIRY', x: 499, y: 552 },
  { renderscene: 'OOT_GROTTO_DEATH_TRIAL_COW', entranceId: 'OOT_GROTTO_EXIT_TRAIL_COW', x: 696, y: 621 },
  { renderscene: 'OOT_GROTTO_DEATH_TRIAL_STORMS', entranceId: 'OOT_GROTTO_EXIT_GENERIC_DMT', x: 671, y: 592 },

  // ========== DESERT COLOSSUS ==========
  { renderscene: 'OOT_DESERT_COLOSSUS', entranceId: 'OOT_TEMPLE_SPIRIT', x: 715, y: 208 },
  { renderscene: 'OOT_DESERT_COLOSSUS', entranceId: 'OOT_WASTELAND_FROM_COLOSSUS', x: 54, y: 578 },
  { renderscene: 'OOT_DESERT_COLOSSUS', entranceId: 'OOT_FAIRY_NAYRU', x: 379, y: 608 },
  { renderscene: 'OOT_DESERT_COLOSSUS', entranceId: 'OOT_WARP_SONG_DESERT', x: 738, y: 413 },
  { renderscene: 'OOT_DESERT_COLOSSUS', entranceId: 'OOT_GROTTO_SCRUBS2_COLOSSUS', x: 687, y: 446 },
  { renderscene: 'OOT_GREAT_FAIRY_NAYRU', entranceId: 'OOT_DESERT_COLOSSUS_FROM_FAIRY', x: 499, y: 537 },
  { renderscene: 'OOT_GROTTO_DESERT_SCRUBS', entranceId: 'OOT_GROTTO_EXIT_SCRUBS2_COLOSSUS', x: 676, y: 650 },

  // ========== GERUDO FORTRESS ==========
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_GERUDO_TRAINING_GROUNDS', x: 590, y: 519 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_VALLEY_FROM_GERUDO_FORTRESS', x: 722, y: 580 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_WASTELAND', x: 398, y: 602 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_GROTTO_FAIRY_FORTRESS', x: 532, y: 482 },
  { renderscene: 'OOT_FAIRY_GERUDO_FORTRESS', entranceId: 'OOT_GROTTO_EXIT_FAIRY_FORTRESS', x: 485, y: 526 },

  // ========== GERUDO VALLEY ==========
  { renderscene: 'OOT_GERUDO_VALLEY', entranceId: 'OOT_FIELD_FROM_GERUDO_VALLEY', x: 927, y: 495 },
  { renderscene: 'OOT_GERUDO_VALLEY', entranceId: 'OOT_GERUDO_FORTRESS_FROM_VALLEY', x: 14, y: 279 },
  { renderscene: 'OOT_GERUDO_VALLEY', entranceId: 'OOT_VALLEY_TENT', x: 339, y: 232 },
  { renderscene: 'OOT_GERUDO_VALLEY', entranceId: 'OOT_GROTTO_SCRUBS2_VALLEY', x: 309, y: 168 },
  { renderscene: 'OOT_GERUDO_VALLEY', entranceId: 'OOT_GROTTO_OCTOROK', x: 517, y: 557 },
  { renderscene: 'OOT_GERUDO_VALLEY', entranceId: 'OOT_LAKE_HYLIA_FROM_VALLEY', x: 473, y: 582, targetScene: 'OOT_LAKE_HYLIA' },
  { renderscene: 'OOT_GROTTO_VALLEY_STORMS', entranceId: 'OOT_GROTTO_EXIT_SCRUBS2_VALLEY', x: 675, y: 648 },
  { renderscene: 'OOT_GROTTO_VALLEY_OCTOROK', entranceId: 'OOT_GROTTO_EXIT_OCTOROK', x: 674, y: 606 },

  // ========== GORON CITY ==========
  { renderscene: 'OOT_GORON_CITY', entranceId: 'OOT_LOST_WOODS_FROM_GORON_CITY', x: 383, y: 397 },
  { renderscene: 'OOT_GORON_CITY', entranceId: 'OOT_DEATH_MOUNTAIN_FROM_GORON_CITY', x: 167, y: 356 },
  { renderscene: 'OOT_GORON_CITY', entranceId: 'OOT_CRATER_FROM_GORON_CITY', x: 779, y: 361 },
  { renderscene: 'OOT_GORON_CITY', entranceId: 'OOT_SHOP_GORON', x: 473, y: 308 },
  { renderscene: 'OOT_GORON_CITY', entranceId: 'OOT_GROTTO_SCRUBS3_GORON_CITY', x: 743, y: 583 },
  { renderscene: 'OOT_GORON_SHOP', entranceId: 'OOT_GORON_CITY_FROM_SHOP', x: 462, y: 580 },
  { renderscene: 'OOT_GROTTO_GORON_CITY_SCRUBS', entranceId: 'OOT_GROTTO_EXIT_SCRUBS3_GORON_CITY', x: 696, y: 711 },

  // ========== GRAVEYARD ==========
  { renderscene: 'OOT_GRAVEYARD', entranceId: 'OOT_KAKARIKO_FROM_GRAVEYARD', x: 889, y: 273 },
  { renderscene: 'OOT_GRAVEYARD', entranceId: 'OOT_TEMPLE_SHADOW', x: 47, y: 324 },
  { renderscene: 'OOT_GRAVEYARD', entranceId: 'OOT_HOUSE_DAMPE', x: 620, y: 180 },
  { renderscene: 'OOT_GRAVEYARD', entranceId: 'OOT_GRAVE_DAMPE', x: 600, y: 434 },
  { renderscene: 'OOT_GRAVEYARD', entranceId: 'OOT_GRAVE_ROYAL', x: 236, y: 325 },
  { renderscene: 'OOT_GRAVEYARD', entranceId: 'OOT_GRAVE_REDEAD', x: 404, y: 262 },
  { renderscene: 'OOT_GRAVEYARD', entranceId: 'OOT_GRAVE_SHIELD', x: 538, y: 303 },
  { renderscene: 'OOT_DAMPE_HUT', entranceId: 'OOT_GRAVEYARD_FROM_DAMPE', x: 496, y: 280 },
  { renderscene: 'OOT_TOMB_DAMPE_WINDMILL', entranceId: 'OOT_GRAVE_EXIT_DAMPE', x: 257, y: 90, targetScene: 'OOT_GRAVEYARD' },
  { renderscene: 'OOT_TOMB_ROYAL', entranceId: 'OOT_GRAVE_EXIT_ROYAL', x: 150, y: 595 },
  { renderscene: 'OOT_TOMB_REDEAD', entranceId: 'OOT_GRAVE_EXIT_REDEAD', x: 472, y: 90 },
  { renderscene: 'OOT_TOMB_FAIRY', entranceId: 'OOT_GRAVE_EXIT_SHIELD', x: 651, y: 27 },

  // ========== HAUNTED WASTELAND ==========
  { renderscene: 'OOT_HAUNTED_WASTELAND', entranceId: 'OOT_FORTRESS_FROM_WASTELAND', x: 892, y: 141 },
  { renderscene: 'OOT_HAUNTED_WASTELAND', entranceId: 'OOT_COLOSSUS', x: 51, y: 534 },

  // ========== HYRULE CASTLE ==========
  { renderscene: "OOT_HYRULE_CASTLE", entranceId: "OOT_GROTTO_CASTLE", x: 619, y: 350 },

  // ========== GANON'S CASTLE EXTERIOR ==========
  { renderscene: "OOT_GANON_CASTLE_EXTERIOR", entranceId: "OOT_GANON_CASTLE", x: 554, y: 584 },
  { renderscene: "OOT_GANON_CASTLE_EXTERIOR", entranceId: "OOT_MARKET_ADULT_FROM_GANON_CASTLE_EXTERIOR", x: 895, y: 49 },

  // ========== GREAT FAIRY CASTLE ==========

  // ========== INSIDE GANON'S CASTLE ==========
  { renderscene: 'OOT_INSIDE_GANON_CASTLE', entranceId: 'OOT_GANON_CASTLE_EXTERIOR_FROM_CASTLE', x: 616, y: 1642 },
  { renderscene: 'OOT_INSIDE_GANON_CASTLE', entranceId: 'OOT_GANON_TOWER', x: 1338, y: 1638 },
  { renderscene: 'OOT_INSIDE_GANON_CASTLE', entranceId: 'OOT_WALLMASTER_GANON_SPIRIT', x: 598, y: 976, mqOnly: "Ganon's Castle" },
  { renderscene: 'OOT_INSIDE_GANON_CASTLE', entranceId: 'OOT_WALLMASTER_GANON_LIGHT', x: 1436, y: 417, mqOnly: "Ganon's Castle" },

  // ========== GANON'S TOWER ==========
  { renderscene: 'OOT_GANON_TOWER_ROOM_0', entranceId: 'OOT_GANON_CASTLE_FROM_TOWER', x: 472, y: 529 },

  // ========== HYRULE CASTLE GROTTO ==========
  { renderscene: "OOT_GROTTO_CASTLE_STORMS", entranceId: "OOT_GROTTO_EXIT_CASTLE", x: 689, y: 656 },

  // ========== DEKU TREE MEADOW ==========
  { renderscene: 'OOT_DEKU_TREE_MEADOW', entranceId: 'OOT_DEKU_TREE', x: 386, y: 447 },

  // ========== DEKU TREE (rooms) ==========
  { renderscene: 'OOT_DEKU_TREE_ROOM_0', entranceId: 'OOT_KOKIRI_FOREST_FROM_DEKU_TREE', x: 186, y: 326 },
  { renderscene: 'OOT_DEKU_TREE_ROOM_4', entranceId: 'OOT_BOSS_DEKU_TREE', x: 514, y: 910 },

  // ========== KOKIRI FOREST ==========
  { renderscene: "OOT_KOKIRI_FOREST", entranceId: "OOT_LOST_WOODS_FROM_KOKIRI_FOREST", x: 542, y: 53 },
  { renderscene: "OOT_KOKIRI_FOREST", entranceId: "OOT_GROTTO_GENERIC_KOKIRI_FOREST", x: 484, y: 124 },
  { renderscene: "OOT_KOKIRI_FOREST", entranceId: "OOT_HOUSE_MIDO", x: 618, y: 347 },
  { renderscene: "OOT_KOKIRI_FOREST", entranceId: "OOT_HOUSE_KNOW_IT_ALL", x: 500, y: 674 },
  { renderscene: "OOT_KOKIRI_FOREST", entranceId: "OOT_HOUSE_LINK", x: 888, y: 785 },
  { renderscene: "OOT_KOKIRI_FOREST", entranceId: "OOT_HOUSE_SARIA", x: 998, y: 580 },
  { renderscene: "OOT_KOKIRI_FOREST", entranceId: "OOT_HOUSE_TWINS", x: 1127, y: 504 },
  { renderscene: "OOT_KOKIRI_FOREST", entranceId: "OOT_KOKIRI_SHOP", x: 987, y: 274 },
  { renderscene: "OOT_KOKIRI_FOREST", entranceId: "OOT_LOST_WOODS_BRIDGE_FROM_FOREST", x: 336, y: 509 },

  // ========== LINK'S HOUSE ==========
  { renderscene: 'OOT_LINK_HOUSE', entranceId: 'OOT_SPAWN_CHILD', x: 709, y: 190 },
  { renderscene: "OOT_LINK_HOUSE", entranceId: "OOT_KOKIRI_FOREST_FROM_LINK", x: 706, y: 773 },

  // ========== MIDO'S HOUSE ==========
  { renderscene: "OOT_KOKIRI_MIDO", entranceId: "OOT_KOKIRI_FOREST_FROM_MIDO", x: 711, y: 757 },

  // ========== SARIA'S HOUSE ==========
  { renderscene: "OOT_KOKIRI_SARIA", entranceId: "OOT_KOKIRI_FOREST_FROM_SARIA", x: 471, y: 537 },

  // ========== KNOW-IT-ALL HOUSE ==========
  { renderscene: "OOT_KOKIRI_KNOW_IT_ALL", entranceId: "OOT_KOKIRI_FOREST_FROM_KNOW_IT_ALL", x: 711, y: 749 },

  // ========== TWINS HOUSE ==========
  { renderscene: "OOT_KOKIRI_TWINS", entranceId: "OOT_KOKIRI_FOREST_FROM_TWINS", x: 713, y: 753 },

  // ========== KOKIRI SHOP ==========
  { renderscene: "OOT_KOKIRI_SHOP", entranceId: "OOT_KOKIRI_FOREST_FROM_SHOP", x: 460, y: 588 },

  // ========== KOKIRI FOREST STORMS GROTTO ==========
  { renderscene: "OOT_GROTTO_KOKIRI_FOREST_STORMS", entranceId: "OOT_GROTTO_EXIT_GENERIC_KOKIRI_FOREST", x: 669, y: 591 },

  // ========== KAKARIKO VILLAGE ==========
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_FIELD_FROM_KAKARIKO', x: 823, y: 195 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_GRAVEYARD', x: 196, y: 133 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_DEATH_MOUNTAIN_FROM_KAKARIKO', x: 456, y: 605 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_HOUSE_CARPENTER', x: 439, y: 309 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_HOUSE_SKULLTULA', x: 507, y: 210 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_HOUSE_IMPA', x: 540, y: 121 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_HOUSE_IMPA_BACK', x: 429, y: 101 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_SHOP_GRANNY', x: 343, y: 347 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_KAKARIKO_BAZAAR', x: 498, y: 455 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_ADULT_ARCHERY', x: 432, y: 240 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_WINDMILL', x: 295, y: 264 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_SHOP_POTION_KAKARIKO', x: 461, y: 460 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_SHOP_POTION_KAKARIKO_BACK', x: 365, y: 442 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_GROTTO_GENERIC_KAKARIKO', x: 335, y: 395 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_GROTTO_REDEAD', x: 521, y: 298 },
  { renderscene: 'OOT_KAKARIKO_VILLAGE', entranceId: 'OOT_BOTTOM_OF_THE_WELL', x: 359, y: 280 },

  // ========== KAKARIKO BAZAAR ==========
  { renderscene: 'OOT_KAKARIKO_BAZAAR', entranceId: 'OOT_KAKARIKO_FROM_BAZAAR', x: 513, y: 582 },

  // ========== KAKARIKO POTION SHOP ==========
  { renderscene: 'OOT_KAKARIKO_POTION_SHOP', entranceId: 'OOT_KAKARIKO_FROM_SHOP_POTION', x: 628, y: 584 },
  { renderscene: 'OOT_KAKARIKO_POTION_SHOP', entranceId: 'OOT_KAKARIKO_FROM_SHOP_POTION_BACK', x: 319, y: 328 },

  // ========== GRANNY POTION SHOP ==========
  { renderscene: 'OOT_GRANNY_POTION_SHOP', entranceId: 'OOT_KAKARIKO_FROM_GRANNY', x: 483, y: 594 },

  // ========== KAKARIKO SHOOTING GALLERY ==========
  { renderscene: 'OOT_KAKARIKO_SHOOTING', entranceId: 'OOT_KAKARIKO_FROM_ARCHERY', x: 788, y: 343 },

  // ========== KAKARIKO WINDMILL ==========
  { renderscene: 'OOT_WINDMILL', entranceId: 'OOT_KAKARIKO_FROM_WINDMILL', x: 1111, y: 466 },

  // ========== HOUSE OF SKULLTULA ==========
  { renderscene: 'OOT_HOUSE_OF_SKULLTULA', entranceId: 'OOT_KAKARIKO_FROM_SKULLTULA', x: 475, y: 550 },

  // ========== IMPA HOUSE ==========
  { renderscene: 'OOT_IMPA_HOUSE', entranceId: 'OOT_KAKARIKO_FROM_IMPA', x: 1108, y: 850 },
  { renderscene: 'OOT_IMPA_HOUSE', entranceId: 'OOT_KAKARIKO_FROM_IMPA_BACK', x: 871, y: 424 },

  // ========== CARPENTER HOUSE ==========
  { renderscene: 'OOT_HOUSE_CARPENTER', entranceId: 'OOT_KAKARIKO_FROM_CARPENTER', x: 578, y: 224 },

  // ========== KAKARIKO OPEN GROTTO ==========
  { renderscene: 'OOT_GROTTO_KAKARIKO_OPEN', entranceId: 'OOT_GROTTO_EXIT_GENERIC_KAKARIKO', x: 671, y: 592 },

  // ========== KAKARIKO REDEAD GROTTO ==========
  { renderscene: 'OOT_GROTTO_KAKARIKO_REDEAD', entranceId: 'OOT_GROTTO_EXIT_REDEAD', x: 695, y: 620 },

  // ========== LOST WOODS ==========
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_FIELD_FROM_LOST_WOODS_BRIDGE", x: 102, y: 2791 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_ZORA_RIVER_FROM_LOST_WOODS", x: 2597, y: 1487 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_GORON_CITY_FROM_LOST_WOODS", x: 1652, y: 1242 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_SACRED_FOREST_MEADOW", x: 1449, y: 90 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_FOREST_FROM_LOST_WOODS_BRIDGE", x: 321, y: 2792 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_GROTTO_GENERIC_LOST_WOODS", x: 1745, y: 1407 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_GROTTO_SCRUB_UPGRADE", x: 1332, y: 206 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_GROTTO_DEKU_THEATER", x: 1030, y: 960 },
  // Each intersection: KOKIRI (visible when erAlterLw=off) + directional exit (visible when erAlterLw=on)
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_KOKIRI_FOREST_FROM_LOST_WOODS", x: 1044, y: 2232 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_LOST_WOODS_FROM_LOST_WOODS_SOUTH", x: 1044, y: 2232 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_KOKIRI_FOREST_FROM_LOST_WOODS", x: 1642, y: 2178 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_LOST_WOODS_FROM_LOST_WOODS_SOUTH", x: 1642, y: 2178 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_KOKIRI_FOREST_FROM_LOST_WOODS", x: 1449, y: 535 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_LOST_WOODS_FROM_LOST_WOODS_SOUTH", x: 1449, y: 535 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_KOKIRI_FOREST_FROM_LOST_WOODS", x: 2148, y: 1648 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_LOST_WOODS_FROM_LOST_WOODS_SOUTH", x: 2148, y: 1648 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_KOKIRI_FOREST_FROM_LOST_WOODS", x: 1463, y: 1480 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_LOST_WOODS_FROM_LOST_WOODS_EAST", x: 1463, y: 1480 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_KOKIRI_FOREST_FROM_LOST_WOODS", x: 1246, y: 308 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_LOST_WOODS_FROM_LOST_WOODS_EAST", x: 1246, y: 308 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_KOKIRI_FOREST_FROM_LOST_WOODS", x: 2167, y: 101 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_LOST_WOODS_FROM_LOST_WOODS_NORTH", x: 2167, y: 101 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_KOKIRI_FOREST_FROM_LOST_WOODS", x: 1044, y: 1798 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_LOST_WOODS_FROM_LOST_WOODS_NORTH", x: 1044, y: 1798 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_KOKIRI_FOREST_FROM_LOST_WOODS", x: 2379, y: 925 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_LOST_WOODS_FROM_LOST_WOODS_WEST", x: 2379, y: 925 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_KOKIRI_FOREST_FROM_LOST_WOODS", x: 2413, y: 323 },
  { renderscene: "OOT_LOST_WOODS", entranceId: "OOT_LOST_WOODS_FROM_LOST_WOODS_WEST", x: 2413, y: 323 },

  // ========== LOST WOODS SCRUB UPGRADE GROTTO ==========
  { renderscene: "OOT_GROTTO_LOST_WOODS_SCRUB_UPGRADE", entranceId: "OOT_GROTTO_EXIT_SCRUB_UPGRADE", x: 676, y: 666 },

  // ========== LOST WOODS THEATER GROTTO ==========
  { renderscene: "OOT_GROTTO_LOST_WOODS_THEATER", entranceId: "OOT_GROTTO_EXIT_DEKU_THEATER", x: 713, y: 705 },

  // ========== LOST WOODS GENERIC GROTTO ==========
  { renderscene: "OOT_GROTTO_LOST_WOODS_GENERIC", entranceId: "OOT_GROTTO_EXIT_GENERIC_LOST_WOODS", x: 672, y: 592 },

  // ========== SACRED FOREST MEADOW ==========
  { renderscene: "OOT_SACRED_FOREST_MEADOW", entranceId: "OOT_LOST_WOODS_FROM_MEADOW", x: 1738, y: 384 },
  { renderscene: "OOT_SACRED_FOREST_MEADOW", entranceId: "OOT_TEMPLE_FOREST", x: 110, y: 298 },
  { renderscene: 'OOT_SACRED_FOREST_MEADOW', entranceId: 'OOT_WARP_SONG_MEADOW', x: 394, y: 306 },
  { renderscene: "OOT_SACRED_FOREST_MEADOW", entranceId: "OOT_GROTTO_SCRUBS2_SFM", x: 523, y: 178 },
  { renderscene: "OOT_SACRED_FOREST_MEADOW", entranceId: "OOT_GROTTO_WOLFOS", x: 1612, y: 375 },
  { renderscene: "OOT_SACRED_FOREST_MEADOW", entranceId: "OOT_GROTTO_FAIRY_SFM", x: 1007, y: 292 },

  // ========== SACRED FOREST MEADOW STORMS GROTTO ==========
  { renderscene: "OOT_GROTTO_SACRED_MEADOW_STORMS", entranceId: "OOT_GROTTO_EXIT_SCRUBS2_SFM", x: 676, y: 650 },

  // ========== SACRED FOREST MEADOW WOLFOS GROTTO ==========
  { renderscene: "OOT_GROTTO_SACRED_MEADOW_WOLFOS", entranceId: "OOT_GROTTO_EXIT_WOLFOS", x: 690, y: 661 },

  // ========== SACRED FOREST MEADOW FAIRY ==========
  { renderscene: "OOT_FAIRY_SACRED_MEADOW", entranceId: "OOT_GROTTO_EXIT_FAIRY_SFM", x: 485, y: 526 },

  // ========== HYRULE FIELD ==========
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_LOST_WOODS_BRIDGE_FROM_FIELD", x: 1034, y: 554 },
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_ZORA_RIVER_FROM_FIELD", x: 1056, y: 282 },
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_KAKARIKO_FROM_FIELD", x: 950, y: 127 },
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_LON_LON_RANCH_FROM_FIELD", x: 664, y: 412 },
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_LAKE_HYLIA_FROM_FIELD", x: 455, y: 896 },
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_GERUDO_VALLEY_FROM_FIELD", x: 219, y: 451 },
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_MARKET_ENTRANCE_FROM_FIELD", x: 764, y: 123 },
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_GROTTO_GENERIC_HF_SOUTHEAST", x: 767, y: 788 },
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_GROTTO_GENERIC_HF_OPEN", x: 540, y: 847 },
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_GROTTO_GENERIC_HF_MARKET", x: 679, y: 142 },
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_GROTTO_FAIRY_HF", x: 547, y: 82 },
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_GROTTO_SCRUB_HEART_PIECE", x: 487, y: 851 },
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_GROTTO_TEKTITE", x: 502, y: 225 },
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_GROTTO_FIELD_COW", x: 351, y: 443 },
  { renderscene: "OOT_HYRULE_FIELD", entranceId: "OOT_GROTTO_FIELD_TREE", x: 865, y: 111 },

  // ========== HYRULE FIELD SCRUBS GROTTO ==========
  { renderscene: "OOT_GROTTO_HYRULE_SCRUBS", entranceId: "OOT_GROTTO_EXIT_SCRUB_HEART_PIECE", x: 695, y: 619 },

  // ========== HYRULE FIELD OPEN GROTTO ==========
  { renderscene: "OOT_GROTTO_HYRULE_OPEN", entranceId: "OOT_GROTTO_EXIT_GENERIC_HF_OPEN", x: 670, y: 593 },

  // ========== HYRULE FIELD SE GROTTO ==========
  { renderscene: "OOT_GROTTO_HYRULE_SE", entranceId: "OOT_GROTTO_EXIT_GENERIC_HF_SOUTHEAST", x: 672, y: 593 },

  // ========== HYRULE FIELD MARKET GROTTO ==========
  { renderscene: "OOT_GROTTO_HYRULE_MARKET", entranceId: "OOT_GROTTO_EXIT_GENERIC_HF_MARKET", x: 672, y: 591 },

  // ========== HYRULE FIELD KAKARIKO GROTTO ==========
  { renderscene: "OOT_GROTTO_HYRULE_KAKARIKO", entranceId: "OOT_GROTTO_EXIT_FIELD_TREE", x: 697, y: 658 },

  // ========== HYRULE FIELD GERUDO GROTTO ==========
  { renderscene: "OOT_GROTTO_HYRULE_GERUDO", entranceId: "OOT_GROTTO_EXIT_FIELD_COW", x: 727, y: 503 },

  // ========== HYRULE FIELD TEKTITE GROTTO ==========
  { renderscene: "OOT_GROTTO_HYRULE_TEKTITE", entranceId: "OOT_GROTTO_EXIT_TEKTITE", x: 720, y: 626 },

  // ========== HYRULE FIELD FAIRY ==========
  { renderscene: "OOT_FAIRY_HYRULE", entranceId: "OOT_GROTTO_EXIT_FAIRY_HF", x: 484, y: 526 },

  // ========== LON LON RANCH ==========
  { renderscene: "OOT_LON_LON_RANCH", entranceId: "OOT_FIELD_FROM_LON_LON_RANCH", x: 859, y: 436 },
  { renderscene: "OOT_LON_LON_RANCH", entranceId: "OOT_HOUSE_LON_LON", x: 777, y: 444 },
  { renderscene: "OOT_LON_LON_RANCH", entranceId: "OOT_STABLES", x: 774, y: 412 },
  { renderscene: "OOT_LON_LON_RANCH", entranceId: "OOT_SILO", x: 191, y: 119 },
  { renderscene: "OOT_LON_LON_RANCH", entranceId: "OOT_GROTTO_SCRUBS3_RANCH", x: 170, y: 490 },

  // ========== LON LON RANCH HOUSE ==========
  { renderscene: "OOT_RANCH_HOUSE_SILO", entranceId: "OOT_LON_LON_RANCH_FROM_HOUSE", x: 531, y: 277 },

  // ========== LON LON STABLE ==========
  { renderscene: "OOT_STABLE", entranceId: "OOT_LON_LON_RANCH_FROM_STABLES", x: 462, y: 133 },

  // ========== LON LON SILO ==========
  { renderscene: "OOT_SILO", entranceId: "OOT_LON_LON_RANCH_FROM_SILO", x: 357, y: 404 },

  // ========== LON LON SCRUBS GROTTO ==========
  { renderscene: "OOT_GROTTO_LON_LON_SCRUBS", entranceId: "OOT_GROTTO_EXIT_SCRUBS3_RANCH", x: 696, y: 710 },

  // ========== LAKE HYLIA ==========
  { renderscene: 'OOT_LAKE_HYLIA', entranceId: 'OOT_TEMPLE_WATER', x: 687, y: 365 },
  { renderscene: 'OOT_LAKE_HYLIA', entranceId: 'OOT_FIELD_FROM_LAKE_HYLIA', x: 809, y: 895 },
  { renderscene: 'OOT_LAKE_HYLIA', entranceId: 'OOT_ZORA_DOMAIN_FROM_LAKE_HYLIA', x: 684, y: 614, targetScene: 'OOT_ZORA_DOMAIN' },
  { renderscene: 'OOT_LAKE_HYLIA', entranceId: 'OOT_LABORATORY', x: 839, y: 598 },
  { renderscene: 'OOT_LAKE_HYLIA', entranceId: 'OOT_FISHING_POND', x: 450, y: 594 },
  { renderscene: 'OOT_LAKE_HYLIA', entranceId: 'OOT_GROTTO_SCRUBS3_LAKE', x: 909, y: 351 },
  { renderscene: 'OOT_LAKE_HYLIA', entranceId: 'OOT_FIELD_OWL', x: 898, y: 366 },

  // ========== LAKE HYLIA FISHING POND ==========
  { renderscene: 'OOT_FISHING_POND', entranceId: 'OOT_LAKE_HYLIA_FROM_FISHING_POND', x: 695, y: 32 },

  // ========== LAKE HYLIA LABORATORY ==========
  { renderscene: 'OOT_LABORATORY', entranceId: 'OOT_LAKE_HYLIA_FROM_LABORATORY', x: 492, y: 203 },

  // ========== LAKE HYLIA SCRUBS GROTTO ==========
  { renderscene: 'OOT_GROTTO_LAKE_HYLIA_SCRUBS', entranceId: 'OOT_GROTTO_EXIT_SCRUBS3_LAKE', x: 696, y: 709 },

  // ========== MARKET ENTRYWAY ==========
  { renderscene: "OOT_MARKET_ENTRYWAY", entranceId: "OOT_MARKET_FROM_MARKET_ENTRANCE", x: 287, y: 29 },
  { renderscene: "OOT_MARKET_ENTRYWAY", entranceId: "OOT_FIELD_FROM_MARKET_ENTRANCE", x: 292, y: 542 },
  { renderscene: "OOT_MARKET_ENTRYWAY", entranceId: "OOT_HOUSE_POTS", x: 349, y: 365 },

  // ========== GUARD HOUSE ==========
  { renderscene: "OOT_GUARD_HOUSE", entranceId: "OOT_MARKET_ENTRANCE_FROM_POTS", x: 860, y: 472 },

  // ========== BACK ALLEY ==========
  { renderscene: "OOT_BACK_ALLEY", entranceId: "OOT_BOMBCHU_SHOP", x: 735, y: 224 },
  { renderscene: "OOT_BACK_ALLEY", entranceId: "OOT_ALLEY_HOUSE", x: 227, y: 282 },

  // ========== BACK ALLEY EAST HOUSE ==========
  { renderscene: 'OOT_BACK_ALLEY_HOUSE', entranceId: 'OOT_MARKET_FROM_ALLEY_HOUSE', x: 486, y: 583 },

  // ========== MARKET - DAY ==========
  { renderscene: "OOT_MARKET_CHILD_DAY", entranceId: "OOT_CHILD_ARCHERY", x: 370, y: 35 },
  { renderscene: "OOT_MARKET_CHILD_DAY", entranceId: "OOT_HYRULE_CASTLE", x: 488, y: 24, ageFilter: 'child' },
  { renderscene: "OOT_MARKET_CHILD_NIGHT", entranceId: "OOT_HYRULE_CASTLE", x: 485, y: 23, ageFilter: 'child' },
  { renderscene: "OOT_MARKET_CHILD_DAY", entranceId: "OOT_GANON_CASTLE_EXTERIOR", x: 488, y: 24, ageFilter: 'adult' },
  { renderscene: "OOT_MARKET_CHILD_NIGHT", entranceId: "OOT_GANON_CASTLE_EXTERIOR", x: 485, y: 23, ageFilter: 'adult' },
  { renderscene: "OOT_MARKET_CHILD_DAY", entranceId: "OOT_TEMPLE_OF_TIME_ENTRYWAY_FROM_MARKET", x: 917, y: 82 },
  { renderscene: "OOT_MARKET_CHILD_NIGHT", entranceId: "OOT_TEMPLE_OF_TIME_ENTRYWAY_FROM_MARKET", x: 920, y: 85 },
  { renderscene: "OOT_MARKET_CHILD_DAY", entranceId: "OOT_MARKET_POTION", x: 722, y: 249 },
  { renderscene: "OOT_MARKET_CHILD_DAY", entranceId: "OOT_MARKET_BAZAAR", x: 726, y: 419 },
  { renderscene: "OOT_MARKET_CHILD_DAY", entranceId: "OOT_MARKET_ENTRANCE_FROM_MARKET", x: 483, y: 604 },
  { renderscene: "OOT_MARKET_CHILD_NIGHT", entranceId: "OOT_MARKET_ENTRANCE_FROM_MARKET", x: 485, y: 602 },
  { renderscene: "OOT_MARKET_CHILD_DAY", entranceId: "OOT_BOMBCHU_BOWLING", x: 241, y: 308 },
  { renderscene: "OOT_MARKET_CHILD_NIGHT", entranceId: "OOT_BOMBCHU_BOWLING", x: 261, y: 314 },
  { renderscene: "OOT_MARKET_CHILD_NIGHT", entranceId: "OOT_TREASURE_GAME", x: 237, y: 599 },
  { renderscene: "OOT_MARKET_CHILD_DAY", entranceId: "OOT_TREASURE_GAME", x: 238, y: 603 },

  // ========== MARKET - NIGHT ==========

  // ========== TEMPLE OF TIME ENTRYWAY ==========
  { renderscene: "OOT_TEMPLE_OF_TIME_ENTRYWAY", entranceId: "OOT_MARKET_FROM_TEMPLE_OF_TIME_ENTRYWAY", x: 961, y: 957 },
  { renderscene: "OOT_TEMPLE_OF_TIME_ENTRYWAY", entranceId: "OOT_TEMPLE_OF_TIME", x: 328, y: 388 },

  // ========== TEMPLE OF TIME ==========
  { renderscene: "OOT_TEMPLE_OF_TIME", entranceId: "OOT_TEMPLE_OF_TIME_ENTRYWAY_FROM_TEMPLE", x: 118, y: 330 },
  { renderscene: "OOT_TEMPLE_OF_TIME", entranceId: "OOT_SPAWN_ADULT", x: 190, y: 321 },
  { renderscene: 'OOT_TEMPLE_OF_TIME', entranceId: 'OOT_WARP_SONG_TEMPLE', x: 190, y: 341 },

  // ========== BOMBCHU SHOP ==========
  { renderscene: "OOT_BOMBCHU_SHOP", entranceId: "OOT_MARKET_FROM_BOMBCHU_SHOP", x: 500, y: 547 },

  // ========== BOMBCHU BOWLING ==========
  { renderscene: "OOT_BOMBCHU_BOWLING_ALLEY", entranceId: "OOT_MARKET_FROM_BOWLING", x: 846, y: 342 },

  // ========== MARKET SHOOTING GALLERY ==========
  { renderscene: "OOT_MARKET_SHOOTING", entranceId: "OOT_MARKET_FROM_ARCHERY", x: 782, y: 345 },

  // ========== TREASURE SHOP ==========
  { renderscene: "OOT_TREASURE_SHOP", entranceId: "OOT_MARKET_FROM_TREASURE_GAME", x: 891, y: 93 },

  // ========== MARKET POTION SHOP ==========
  { renderscene: "OOT_MARKET_POTION_SHOP", entranceId: "OOT_MARKET_FROM_POTION", x: 467, y: 598 },

  // ========== MARKET BAZAAR ==========
  { renderscene: "OOT_MARKET_BAZAAR", entranceId: "OOT_MARKET_FROM_BAZAAR", x: 526, y: 587 },

  // ========== ZORA RIVER ==========
  { renderscene: 'OOT_ZORA_RIVER', entranceId: 'OOT_FIELD_FROM_ZORA_RIVER', x: 1260, y: 175 },
  { renderscene: 'OOT_ZORA_RIVER', entranceId: 'OOT_LOST_WOODS_FROM_ZORA_RIVER', x: 116, y: 631, targetScene: 'OOT_LOST_WOODS' },
  { renderscene: 'OOT_ZORA_RIVER', entranceId: 'OOT_ZORA_DOMAIN', x: 70, y: 697 },
  { renderscene: 'OOT_ZORA_RIVER', entranceId: 'OOT_GROTTO_GENERIC_RIVER', x: 954, y: 366 },
  { renderscene: 'OOT_ZORA_RIVER', entranceId: 'OOT_GROTTO_FAIRY_RIVER', x: 875, y: 467 },
  { renderscene: 'OOT_ZORA_RIVER', entranceId: 'OOT_GROTTO_SCRUBS2_RIVER', x: 1298, y: 428 },

  // ========== ZORA RIVER GENERIC GROTTO ==========
  { renderscene: 'OOT_GROTTO_ZORA_RIVER_GENERIC', entranceId: 'OOT_GROTTO_EXIT_GENERIC_RIVER', x: 671, y: 592 },

  // ========== ZORA RIVER STORMS GROTTO ==========
  { renderscene: 'OOT_GROTTO_ZORA_RIVER_STORMS', entranceId: 'OOT_GROTTO_EXIT_SCRUBS2_RIVER', x: 676, y: 649 },

  // ========== ZORA RIVER FAIRY ==========
  { renderscene: 'OOT_FAIRY_ZORA_RIVER', entranceId: 'OOT_GROTTO_EXIT_FAIRY_RIVER', x: 485, y: 526 },

  // ========== ZORA DOMAIN ==========
  { renderscene: 'OOT_ZORA_DOMAIN', entranceId: 'OOT_RIVER_FROM_DOMAIN', x: 229, y: 454 },
  { renderscene: 'OOT_ZORA_DOMAIN', entranceId: 'OOT_FOUNTAIN_ZORA', x: 572, y: 16 },
  { renderscene: 'OOT_ZORA_DOMAIN', entranceId: 'OOT_LAKE_HYLIA_FROM_ZORA_DOMAIN', x: 434, y: 426, targetScene: 'OOT_LAKE_HYLIA' },
  { renderscene: 'OOT_ZORA_DOMAIN', entranceId: 'OOT_SHOP_ZORA', x: 558, y: 511 },
  { renderscene: 'OOT_ZORA_DOMAIN', entranceId: 'OOT_GROTTO_FAIRY_DOMAIN', x: 333, y: 378 },

  // ========== ZORA SHOP ==========
  { renderscene: 'OOT_ZORA_SHOP', entranceId: 'OOT_ZORA_DOMAIN_FROM_SHOP', x: 497, y: 591 },

  // ========== ZORA DOMAIN FAIRY ==========
  { renderscene: 'OOT_FAIRY_ZORA_DOMAIN', entranceId: 'OOT_GROTTO_EXIT_FAIRY_DOMAIN', x: 485, y: 525 },

  // ========== ZORA FOUNTAIN ==========
  { renderscene: 'OOT_ZORA_FOUNTAIN', entranceId: 'OOT_DOMAIN_FROM_FOUNTAIN', x: 763, y: 323 },
  { renderscene: 'OOT_ZORA_FOUNTAIN', entranceId: 'OOT_JABU_JABU', x: 624, y: 389 },
  { renderscene: 'OOT_ZORA_FOUNTAIN', entranceId: 'OOT_ICE_CAVERN', x: 494, y: 595 },
  { renderscene: 'OOT_ZORA_FOUNTAIN', entranceId: 'OOT_FAIRY_FARORE', x: 425, y: 63 },

  // ========== ZORA FOUNTAIN GREAT FAIRY ==========
  { renderscene: 'OOT_GREAT_FAIRY_FARORE', entranceId: 'OOT_ZORA_FOUNTAIN_FROM_FAIRY', x: 500, y: 554 },

  { renderscene: 'OOT_DEATH_MOUNTAIN_TRAIL_ROOM_2', entranceId: 'OOT_VILLAGE_OWL', x: 447, y: 95, targetScene: 'OOT_KAKARIKO_VILLAGE' },
  { renderscene: 'OOT_LAKE_HYLIA', entranceId: 'OOT_WARP_SONG_LAKE', x: 680, y: 242 },
  { renderscene: 'OOT_DEATH_MOUNTAIN_CRATER', entranceId: 'OOT_GORON_CITY_FROM_CRATER', x: 734, y: 433 },
  { renderscene: 'OOT_DEATH_MOUNTAIN_CRATER', entranceId: 'OOT_WARP_SONG_CRATER', x: 478, y: 380 },
  { renderscene: 'OOT_GRAVEYARD', entranceId: 'OOT_WARP_SONG_GRAVE', x: 136, y: 324 },

  // ========== DODONGO CAVERN (rooms) ==========
  { renderscene: 'OOT_DODONGO_CAVERN_ROOM_0', entranceId: 'OOT_BOSS_DODONGO_CAVERN', x: 905, y: 795 },
  { renderscene: 'OOT_DODONGO_CAVERN_ROOM_0', entranceId: 'OOT_MOUNTAIN_TRAIL_FROM_DODONGO_CAVERN', x: 1003, y: 2096 },

  // ========== INSIDE JABU JABU (rooms) ==========
  { renderscene: 'OOT_INSIDE_JABU_JABU_ROOM_0', entranceId: 'OOT_BOSS_JABU_JABU', x: 1603, y: 258 },
  { renderscene: 'OOT_INSIDE_JABU_JABU_ROOM_0', entranceId: 'OOT_ZORA_FOUNTAIN_FROM_JABU_JABU', x: 2578, y: 647 },

  // ========== ICE CAVERN (rooms) ==========
  { renderscene: 'OOT_ICE_CAVERN_ROOM_0', entranceId: 'OOT_ZORA_FOUNTAIN_FROM_ICE_CAVERN', x: 721, y: 1820 },

  // ========== GERUDO TRAINING GROUND (rooms) ==========
  { renderscene: 'OOT_GERUDO_TRAINING_GROUND', entranceId: 'OOT_GERUDO_FORTRESS_FROM_GERUDO_TRAINING', x: 594, y: 1301 },
  { renderscene: 'OOT_GERUDO_TRAINING_GROUND', entranceId: 'OOT_WALLMASTER_GTG', x: 145, y: 990 },

  // ========== FOREST TEMPLE (rooms) ==========
  { renderscene: 'OOT_TEMPLE_FOREST_ROOM_0', entranceId: 'OOT_SACRED_MEADOW_FROM_TEMPLE_FOREST', x: 1648, y: 2907 },
  { renderscene: 'OOT_TEMPLE_FOREST_ROOM_1', entranceId: 'OOT_WALLMASTER_FOREST_CORRIDOR_WEST', x: 118, y: 192 },
  { renderscene: 'OOT_TEMPLE_FOREST_ROOM_1', entranceId: 'OOT_WALLMASTER_FOREST_CORRIDOR_EAST', x: 2661, y: 225 },
  { renderscene: 'OOT_TEMPLE_FOREST_ROOM_3', entranceId: 'OOT_BOSS_TEMPLE_FOREST', x: 325, y: 559 },

  // ========== FIRE TEMPLE (rooms) ==========
  { renderscene: 'OOT_TEMPLE_FIRE_ROOM_0', entranceId: 'OOT_BOSS_TEMPLE_FIRE', x: 746, y: 1179 },
  { renderscene: 'OOT_TEMPLE_FIRE_ROOM_0', entranceId: 'OOT_DEATH_CRATER_FROM_TEMPLE_FIRE', x: 1283, y: 1462 },

  // ========== WATER TEMPLE (rooms) ==========
  { renderscene: 'OOT_TEMPLE_WATER_ROOM_2', entranceId: 'OOT_LAKE_HYLIA_FROM_TEMPLE_WATER', x: 1812, y: 1872 },
  { renderscene: 'OOT_TEMPLE_WATER_ROOM_2', entranceId: 'OOT_BOSS_TEMPLE_WATER', x: 1306, y: 738 },

  // ========== SHADOW TEMPLE (rooms) ==========
  { renderscene: 'OOT_TEMPLE_SHADOW_ROOM_0', entranceId: 'OOT_GRAVEYARD_FROM_TEMPLE_SHADOW', x: 680, y: 626 },
  { renderscene: 'OOT_TEMPLE_SHADOW_ROOM_2', entranceId: 'OOT_WALLMASTER_SHADOW', x: 724, y: 487 },
  { renderscene: 'OOT_TEMPLE_SHADOW_ROOM_3', entranceId: 'OOT_BOSS_TEMPLE_SHADOW', x: 721, y: 1093 },

  // ========== SPIRIT TEMPLE (rooms) ==========
  { renderscene: 'OOT_TEMPLE_SPIRIT_ROOM_0', entranceId: 'OOT_DESERT_COLOSSUS_FROM_TEMPLE_SPIRIT', x: 751, y: 1217 },
  { renderscene: 'OOT_TEMPLE_SPIRIT_ROOM_0', entranceId: 'OOT_WALLMASTER_SPIRIT_CHILD_RUPEES', x: 670, y: 408, vanillaOnly: 'Spirit Temple' },
  { renderscene: 'OOT_TEMPLE_SPIRIT_ROOM_1', entranceId: 'OOT_BOSS_TEMPLE_SPIRIT', x: 891, y: 888 },
  { renderscene: 'OOT_TEMPLE_SPIRIT_ROOM_1', entranceId: 'OOT_WALLMASTER_SPIRIT_STATUE', x: 885, y: 1465, mqOnly: 'Spirit Temple' },
  { renderscene: 'OOT_TEMPLE_SPIRIT_ROOM_1', entranceId: 'OOT_WALLMASTER_SPIRIT_ADULT_CLIMB', x: 1575, y: 1572 },
  { renderscene: 'OOT_TEMPLE_SPIRIT_ROOM_2', entranceId: 'OOT_WALLMASTER_SPIRIT_CHILD_SUN', x: 268, y: 346, mqOnly: 'Spirit Temple' },

  // ========== BOTTOM OF THE WELL (rooms) ==========
  { renderscene: 'OOT_BOTTOM_OF_THE_WELL_ROOM_0', entranceId: 'OOT_KAKARIKO_FROM_BOTTOM_OF_THE_WELL', x: 757, y: 666 },
  { renderscene: 'OOT_BOTTOM_OF_THE_WELL_ROOM_0', entranceId: 'OOT_WALLMASTER_BOTW_MAIN', x: 747, y: 264 },
  { renderscene: 'OOT_BOTTOM_OF_THE_WELL_ROOM_1', entranceId: 'OOT_WALLMASTER_BOTW_BASEMENT', x: 584, y: 364, mqOnly: 'Bottom of the Well' },
  { renderscene: 'OOT_BOTTOM_OF_THE_WELL_ROOM_0', entranceId: 'OOT_WALLMASTER_BOTW_PIT', x: 1012, y: 176, mqOnly: 'Bottom of the Well' },

  { renderscene: 'MM_CLOCK_TOWN_SOUTH', entranceId: 'MM_CLOCK_TOWN_WEST_FROM_SOUTH_BOTTOM', x: 324, y: 603 },
  { renderscene: 'MM_CLOCK_TOWN_SOUTH', entranceId: 'MM_CLOCK_TOWN_EAST_FROM_SOUTH_BOTTOM', x: 682, y: 183 },
  { renderscene: 'MM_CLOCK_TOWN_SOUTH', entranceId: 'MM_CLOCK_TOWER_ROOF', x: 319, y: 193 },
  { renderscene: 'MM_CLOCK_TOWN_SOUTH', entranceId: 'MM_CLOCK_TOWN_EAST_FROM_SOUTH_TOP', x: 368, y: 173 },
  { renderscene: 'MM_CLOCK_TOWN_SOUTH', entranceId: 'MM_CLOCK_TOWN_NORTH_FROM_SOUTH', x: 76, y: 140 },
  { renderscene: 'MM_CLOCK_TOWN_SOUTH', entranceId: 'MM_CLOCK_TOWN_WEST_FROM_SOUTH_TOP', x: 28, y: 361 },
  { renderscene: 'MM_CLOCK_TOWN_SOUTH', entranceId: 'MM_WARP_OWL_CLOCK_TOWN', x: 176, y: 263 },
  { renderscene: 'MM_CLOCK_TOWN_SOUTH', entranceId: 'MM_LAUNDRY_POOL', x: 867, y: 605 },
  { renderscene: 'MM_CLOCK_TOWN_SOUTH', entranceId: 'MM_TERMINA_FIELD_FROM_CLOCK_TOWN_SOUTH', x: 834, y: 427 },
  { renderscene: 'MM_CLOCK_TOWN_SOUTH', entranceId: 'MM_CLOCK_TOWN_FROM_CLOCK_TOWER', x: 355, y: 279 },

  { renderscene: 'MM_CLOCK_TOWN_NORTH', entranceId: 'MM_TERMINA_FIELD_FROM_CLOCK_TOWN_NORTH', x: 614, y: 238 },
  { renderscene: 'MM_CLOCK_TOWN_NORTH', entranceId: 'MM_CLOCK_TOWN_SOUTH_FROM_NORTH', x: 355, y: 239 },
  { renderscene: 'MM_CLOCK_TOWN_NORTH', entranceId: 'MM_FAIRY_FOUNTAIN_TOWN', x: 464, y: 45 },
  { renderscene: 'MM_CLOCK_TOWN_NORTH', entranceId: 'MM_GROTTO_DEKU_PLAYGROUND', x: 378, y: 71 },
  { renderscene: 'MM_CLOCK_TOWN_NORTH', entranceId: 'MM_CLOCK_TOWN_EAST_FROM_NORTH', x: 347, y: 608 },

  { renderscene: 'MM_CLOCK_TOWN_WEST', entranceId: 'MM_CLOCK_TOWN_SOUTH_BOTTOM_FROM_WEST', x: 771, y: 147 },
  { renderscene: 'MM_CLOCK_TOWN_WEST', entranceId: 'MM_LOTTERY', x: 447, y: 245 },
  { renderscene: 'MM_CLOCK_TOWN_WEST', entranceId: 'MM_POST_OFFICE', x: 91, y: 311 },
  { renderscene: 'MM_CLOCK_TOWN_WEST', entranceId: 'MM_SWORDSMAN_SCHOOL', x: 30, y: 449 },
  { renderscene: 'MM_CLOCK_TOWN_WEST', entranceId: 'MM_TERMINA_FIELD_FROM_CLOCK_TOWN_WEST', x: 125, y: 606 },
  { renderscene: 'MM_CLOCK_TOWN_WEST', entranceId: 'MM_TRADING_POST', x: 816, y: 383 },
  { renderscene: 'MM_CLOCK_TOWN_WEST', entranceId: 'MM_CURIOSITY_SHOP', x: 880, y: 273 },

  { renderscene: 'MM_CLOCK_TOWN_EAST', entranceId: 'MM_TOWN_ARCHERY', x: 693, y: 396 },
  { renderscene: 'MM_CLOCK_TOWN_EAST', entranceId: 'MM_CHEST_GAME', x: 457, y: 498 },
  { renderscene: 'MM_CLOCK_TOWN_EAST', entranceId: 'MM_STOCK_POT_INN_ROOF', x: 64, y: 345 },
  { renderscene: 'MM_CLOCK_TOWN_EAST', entranceId: 'MM_TERMINA_FIELD_FROM_CLOCK_TOWN_EAST', x: 416, y: 271 },
  { renderscene: 'MM_CLOCK_TOWN_EAST', entranceId: 'MM_MILK_BAR', x: 311, y: 319 },
  { renderscene: 'MM_CLOCK_TOWN_EAST', entranceId: 'MM_HONEY_AND_DARLING_GAME', x: 543, y: 308 },
  { renderscene: 'MM_CLOCK_TOWN_EAST', entranceId: 'MM_STOCK_POT_INN', x: 276, y: 377 },
  { renderscene: 'MM_CLOCK_TOWN_EAST', entranceId: 'MM_CLOCK_TOWN_NORTH_FROM_EAST', x: 15, y: 247 },
  { renderscene: 'MM_CLOCK_TOWN_EAST', entranceId: 'MM_MAYORS_OFFICE', x: 18, y: 200 },
  { renderscene: 'MM_CLOCK_TOWN_EAST', entranceId: 'MM_CLOCK_TOWN_SOUTH_BOTTOM_FROM_EAST', x: 642, y: 597 },
  { renderscene: 'MM_CLOCK_TOWN_EAST', entranceId: 'MM_ASTRAL_OBSERVATORY_FROM_CLOCK_TOWN_EAST', x: 98, y: 183, targetScene: 'MM_OBSERVATORY_ROOM_1' },

  { renderscene: 'MM_LAUNDRY_POOL', entranceId: 'MM_CLOCK_TOWN_SOUTH_FROM_LAUNDRY_POOL', x: 551, y: 18 },
  { renderscene: 'MM_LAUNDRY_POOL', entranceId: 'MM_KAFEI_HIDEOUT', x: 198, y: 425 },
  { renderscene: 'MM_CURIOSITY_SHOP', entranceId: 'MM_LAUNDRY_POOL_FROM_KAFEI_HIDEOUT', x: 782, y: 173 },

  { renderscene: 'MM_BOMB_SHOP', entranceId: 'MM_CLOCK_TOWN_WEST_FROM_BOMB_SHOP', x: 325, y: 588 },
  { renderscene: 'MM_TRADING_POST', entranceId: 'MM_CLOCK_TOWN_WEST_FROM_TRADING_POST', x: 504, y: 601 },
  { renderscene: 'MM_CURIOSITY_SHOP', entranceId: 'MM_CLOCK_TOWN_WEST_FROM_CURIOSITY_SHOP', x: 18, y: 381 },
  { renderscene: 'MM_SWORDSMAN_SCHOOL', entranceId: 'MM_CLOCK_TOWN_WEST_FROM_SWORDSMAN_SCHOOL', x: 170, y: 360 },
  { renderscene: 'MM_POST_OFFICE', entranceId: 'MM_CLOCK_TOWN_WEST_FROM_POST_OFFICE', x: 784, y: 320 },
  { renderscene: 'MM_LOTTERY', entranceId: 'MM_CLOCK_TOWN_WEST_FROM_LOTTERY', x: 194, y: 351 },
  { renderscene: 'MM_HONEY_DARLING', entranceId: 'MM_CLOCK_TOWN_EAST_FROM_HONEY_AND_DARLING', x: 473, y: 101 },

  { renderscene: 'MM_SHOOTING_GALLERY', entranceId: 'MM_CLOCK_TOWN_EAST_FROM_TOWN_ARCHERY', x: 781, y: 359 },

  { renderscene: 'MM_TREASURE_SHOP', entranceId: 'MM_CLOCK_TOWN_EAST_FROM_CHEST_GAME', x: 787, y: 448 },

  { renderscene: 'MM_MAYOR_HOUSE', entranceId: 'MM_CLOCK_TOWN_EAST_FROM_MAYORS_OFFICE', x: 463, y: 590 },

  { renderscene: 'MM_MILK_BAR', entranceId: 'MM_CLOCK_TOWN_EAST_FROM_MILK_BAR', x: 839, y: 446 },

  { renderscene: 'MM_OBSERVATORY_ROOM_0', entranceId: 'MM_FIELD_FROM_ASTRAL_OBSERVATORY', x: 331, y: 267 },
  { renderscene: 'MM_OBSERVATORY_ROOM_1', entranceId: 'MM_CLOCK_TOWN_EAST_FROM_ASTRAL_OBSERVATORY', x: 929, y: 155, targetScene: 'MM_CLOCK_TOWN_EAST' },

  { renderscene: 'MM_STOCK_POT_INN_ROOM_0', entranceId: 'MM_CLOCK_TOWN_EAST_FROM_STOCK_POT_INN', x: 593, y: 587 },
  { renderscene: 'MM_STOCK_POT_INN_ROOM_1', entranceId: 'MM_CLOCK_TOWN_EAST_FROM_STOCK_POT_INN_ROOF', x: 213, y: 54, targetScene: 'MM_CLOCK_TOWN_EAST' },

  { renderscene: 'MM_DEKU_PLAYGROUND', entranceId: 'MM_GROTTO_EXIT_DEKU_PLAYGROUND', x: 142, y: 315 },

  { renderscene: 'MM_FAIRY_CLOCK_TOWN', entranceId: 'MM_CLOCK_TOWN_NORTH_FROM_FAIRY_FOUNTAIN', x: 476, y: 609 },

  // ========== MAJORA'S MASK - DEKU PALACE ==========
  { renderscene: 'MM_DEKU_PALACE', entranceId: 'MM_DEKU_PALACE_THRONE', x: 485, y: 177 },
  { renderscene: 'MM_DEKU_PALACE', entranceId: 'MM_DEKU_PALACE_THRONE_CAGE', x: 399, y: 72 },
  { renderscene: 'MM_DEKU_PALACE', entranceId: 'MM_DEKU_SHRINE', x: 70, y: 10 },
  { renderscene: 'MM_DEKU_PALACE', entranceId: 'MM_SWAMP_FROM_PALACE_MAIN_ENTRANCE', x: 483, y: 611 },
  { renderscene: 'MM_DEKU_PALACE', entranceId: 'MM_SWAMP_FROM_PALACE_LEDGE', x: 662, y: 511 },
  { renderscene: 'MM_DEKU_PALACE', entranceId: 'MM_GROTTO_BEAN', x: 582, y: 52, jpOnly: 'Deku Palace' },
  { renderscene: 'MM_DEKU_PALACE', entranceId: 'MM_GROTTO_BEAN', x: 760, y: 87, usOnly: 'Deku Palace' },
  { renderscene: 'MM_DEKU_PALACE', entranceId: 'MM_GROTTO_JP_CLIMB_LEFT', x: 388, y: 165, jpOnly: 'Deku Palace' },
  { renderscene: 'MM_DEKU_PALACE', entranceId: 'MM_GROTTO_JP_CLIMB_RIGHT', x: 585, y: 169, jpOnly: 'Deku Palace' },
  { renderscene: 'MM_DEKU_PALACE', entranceId: 'MM_GROTTO_JP_LINE_START', x: 298, y: 30, jpOnly: 'Deku Palace' },
  { renderscene: 'MM_DEKU_PALACE', entranceId: 'MM_GROTTO_JP_LINE_END', x: 575, y: 18, jpOnly: 'Deku Palace' },
  { renderscene: 'MM_GROTTO_DEKU_PALACE_BEANS', entranceId: 'MM_GROTTO_EXIT_BEAN', x: 836, y: 506 },
  { renderscene: 'MM_GROTTO_DEKU_PALACE_JP_CLIMB', entranceId: 'MM_GROTTO_EXIT_JP_CLIMB_LEFT', x: 203, y: 267 },
  { renderscene: 'MM_GROTTO_DEKU_PALACE_JP_CLIMB', entranceId: 'MM_GROTTO_EXIT_JP_CLIMB_RIGHT', x: 190, y: 695 },
  { renderscene: 'MM_GROTTO_DEKU_PALACE_JP_LINE', entranceId: 'MM_GROTTO_EXIT_JP_LINE_END', x: 156, y: 201 },
  { renderscene: 'MM_GROTTO_DEKU_PALACE_JP_LINE', entranceId: 'MM_GROTTO_EXIT_JP_LINE_START', x: 151, y: 577 },

  // ========== MAJORA'S MASK - TERMINA FIELD ==========
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_MOUNTAIN_VILLAGE_PATH_FROM_TERMINA_FIELD', x: 1488, y: 47 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_GROTTO_BIO_BABA', x: 639, y: 755 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_GREAT_BAY_COAST_FROM_FIELD', x: 270, y: 711 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_MILK_ROAD_FROM_FIELD', x: 685, y: 1574 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_SWAMP_ROAD_FROM_FIELD', x: 1509, y: 1785 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_ASTRAL_OBSERVATORY_FROM_FIELD', x: 2238, y: 1043 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_IKANA_ROAD_FROM_FIELD', x: 2443, y: 670 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_GROTTO_GOSSIPS_CANYON', x: 2326, y: 965 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_GROTTO_GOSSIPS_OCEAN', x: 1043, y: 517 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_CLOCK_TOWN_SOUTH_FROM_FIELD', x: 1463, y: 1101 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_CLOCK_TOWN_EAST_FROM_FIELD', x: 1832, y: 744 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_CLOCK_TOWN_NORTH_FROM_FIELD', x: 1460, y: 378 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_GROTTO_GOSSIPS_MOUNTAIN', x: 1559, y: 304 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_CLOCK_TOWN_WEST_FROM_FIELD', x: 1067, y: 757 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_GROTTO_COW_FIELD', x: 1482, y: 1536 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_GROTTO_PEAHAT', x: 1135, y: 1418 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_GROTTO_GENERIC_GRASS', x: 1724, y: 1462 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_GROTTO_GOSSIPS_SWAMP', x: 1401, y: 1696 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_GROTTO_GENERIC_FIELD_PILLAR', x: 1957, y: 774 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_GROTTO_SCRUB', x: 2069, y: 1022 },
  { renderscene: 'MM_TERMINA_FIELD', entranceId: 'MM_GROTTO_DODONGO', x: 1142, y: 289 },

  // ========== MAJORA'S MASK - TERMINA FIELD GROTTOS ==========
  { renderscene: 'MM_GROTTO_TERMINA_BIO_BABA', entranceId: 'MM_GROTTO_EXIT_BIO_BABA', x: 728, y: 332 },
  { renderscene: 'MM_GROTTO_TERMINA_CANYON_GOSSIP', entranceId: 'MM_GROTTO_EXIT_GOSSIPS_CANYON', x: 743, y: 479 },
  { renderscene: 'MM_GROTTO_TERMINA_COW', entranceId: 'MM_GROTTO_EXIT_COW_FIELD', x: 241, y: 477 },
  { renderscene: 'MM_GROTTO_TERMINA_DODONGO', entranceId: 'MM_GROTTO_EXIT_DODONGO', x: 230, y: 491 },
  { renderscene: 'MM_GROTTO_TERMINA_OCEAN_GOSSIP', entranceId: 'MM_GROTTO_EXIT_GOSSIPS_OCEAN', x: 254, y: 476 },
  { renderscene: 'MM_GROTTO_TERMINA_PEAHAT', entranceId: 'MM_GROTTO_EXIT_PEAHAT', x: 777, y: 488 },
  { renderscene: 'MM_GROTTO_TERMINA_PILLAR', entranceId: 'MM_GROTTO_EXIT_GENERIC_FIELD_PILLAR', x: 643, y: 502 },
  { renderscene: 'MM_GROTTO_TERMINA_SCRUB', entranceId: 'MM_GROTTO_EXIT_SCRUB', x: 664, y: 420 },
  { renderscene: 'MM_GROTTO_TERMINA_TALL_GRASS', entranceId: 'MM_GROTTO_EXIT_GENERIC_GRASS', x: 637, y: 502 },
  { renderscene: 'MM_GROTTO_TERMINA_SWAMP_GOSSIP', entranceId: 'MM_GROTTO_EXIT_GOSSIPS_SWAMP', x: 290, y: 743 },
  { renderscene: 'MM_GROTTO_TERMINA_MOUNTAIN_GOSSIP', entranceId: 'MM_GROTTO_EXIT_GOSSIPS_MOUNTAIN', x: 961, y: 628 },


  // ========== MAJORA'S MASK - ROAD TO SOUTHERN SWAMP ==========
  { renderscene: 'MM_ROAD_SOUTHERN_SWAMP', entranceId: 'MM_SWAMP_ARCHERY', x: 55, y: 328 },
  { renderscene: 'MM_ROAD_SOUTHERN_SWAMP', entranceId: 'MM_GROTTO_GENERIC_PATH_SWAMP', x: 620, y: 226 },
  { renderscene: 'MM_ROAD_SOUTHERN_SWAMP', entranceId: 'MM_SWAMP_FROM_ROAD', x: 443, y: 20 },
  { renderscene: 'MM_ROAD_SOUTHERN_SWAMP', entranceId: 'MM_TERMINA_FIELD_FROM_ROAD_TO_SWAMP', x: 800, y: 599 },
  { renderscene: 'MM_GROTTO_SOUTHERN_SWAMP_ROAD_OPEN', entranceId: 'MM_GROTTO_EXIT_GENERIC_PATH_SWAMP', x: 644, y: 501 },
  { renderscene: 'MM_SHOOTING_GALLERY_SWAMP', entranceId: 'MM_SWAMP_ROAD_FROM_ARCHERY', x: 487, y: 451 },

  // ========== MAJORA'S MASK - SOUTHERN SWAMP ==========
  { renderscene: 'MM_SOUTHERN_SWAMP', entranceId: 'MM_SWAMP_ROAD_FROM_SWAMP', x: 454, y: 810 },
  { renderscene: 'MM_SOUTHERN_SWAMP', entranceId: 'MM_TOURIST_INFORMATION', x: 577, y: 680 },
  { renderscene: 'MM_SOUTHERN_SWAMP', entranceId: 'MM_MYSTERY_WOODS', x: 116, y: 509 },
  { renderscene: 'MM_SOUTHERN_SWAMP', entranceId: 'MM_POTION_SHOP', x: 205, y: 429 },
  { renderscene: 'MM_SOUTHERN_SWAMP', entranceId: 'MM_DEKU_PALACE_MAIN_ENTRANCE', x: 989, y: 424 },
  { renderscene: 'MM_SOUTHERN_SWAMP', entranceId: 'MM_DEKU_PALACE_LEDGE', x: 819, y: 721 },
  { renderscene: 'MM_SOUTHERN_SWAMP', entranceId: 'MM_WOODFALL', x: 833, y: 395 },
  { renderscene: 'MM_SOUTHERN_SWAMP', entranceId: 'MM_SPIDER_HOUSE_SWAMP', x: 837, y: 607 },
  { renderscene: 'MM_SOUTHERN_SWAMP', entranceId: 'MM_GROTTO_GENERIC_SWAMP', x: 876, y: 667 },
  { renderscene: 'MM_SOUTHERN_SWAMP', entranceId: 'MM_WARP_OWL_SOUTHERN_SWAMP', x: 628, y: 787 },
  { renderscene: 'MM_TOURIST_INFORMATION', entranceId: 'MM_SWAMP_FROM_TOURIST_INFORMATION', x: 464, y: 525 },
  { renderscene: 'MM_POTION_SHOP', entranceId: 'MM_SWAMP_FROM_POTION_SHOP', x: 476, y: 585 },
  { renderscene: 'MM_GROTTO_SOUTHERN_SWAMP_OPEN', entranceId: 'MM_GROTTO_EXIT_GENERIC_SWAMP', x: 640, y: 501 },
  { renderscene: 'MM_WOODS_MYSTERY', entranceId: 'MM_SWAMP_FROM_MYSTERY_WOODS', x: 471, y: 427 },
  { renderscene: 'MM_WOODS_MYSTERY', entranceId: 'MM_GROTTO_GENERIC_WOODS', x: 550, y: 531 },
  { renderscene: 'MM_GROTTO_WOODS_OF_MYSTERY_OPEN', entranceId: 'MM_GROTTO_EXIT_GENERIC_WOODS', x: 640, y: 502 },

  // ========== MAJORA'S MASK - WOODFALL ==========
  { renderscene: 'MM_WOODFALL', entranceId: 'MM_TEMPLE_WOODFALL', x: 471, y: 260 },
  { renderscene: 'MM_WOODFALL', entranceId: 'MM_FAIRY_FOUNTAIN_WOODFALL', x: 330, y: 66 },
  { renderscene: 'MM_WOODFALL', entranceId: 'MM_SWAMP_FROM_WOODFALL', x: 478, y: 498 },
  { renderscene: 'MM_WOODFALL', entranceId: 'MM_WARP_OWL_WOODFALL', x: 473, y: 129 },
  { renderscene: 'MM_FAIRY_WOODFALL', entranceId: 'MM_WOODFALL_FROM_FAIRY_FOUNTAIN', x: 469, y: 558 },
  { renderscene: 'MM_SPIDER_HOUSE_SWAMP_ROOM_0', entranceId: 'MM_SWAMP_FROM_SPIDER_HOUSE', x: 471, y: 564 },

  // ========== MAJORA'S MASK - ROMANI RANCH ==========
  { renderscene: 'MM_ROMANI_RANCH', entranceId: 'MM_DOGGY_RACETRACK', x: 77, y: 438 },
  { renderscene: 'MM_ROMANI_RANCH', entranceId: 'MM_CUCCO_SHACK', x: 40, y: 343 },
  { renderscene: 'MM_ROMANI_RANCH', entranceId: 'MM_RANCH_HOUSE', x: 289, y: 141 },
  { renderscene: 'MM_ROMANI_RANCH', entranceId: 'MM_STABLES', x: 380, y: 115 },
  { renderscene: 'MM_ROMANI_RANCH', entranceId: 'MM_MILK_ROAD_FROM_ROMANI_RANCH', x: 898, y: 372 },
  { renderscene: 'MM_RANCH_HOUSE', entranceId: 'MM_ROMANI_RANCH_FROM_RANCH_HOUSE', x: 806, y: 967 },
  { renderscene: 'MM_RANCH_HOUSE_BARN', entranceId: 'MM_ROMANI_RANCH_FROM_STABLES', x: 647, y: 396 },
  { renderscene: 'MM_CUCCO_SHACK', entranceId: 'MM_ROMANI_RANCH_FROM_CUCCO_SHACK', x: 893, y: 468 },
  { renderscene: 'MM_DOG_RACETRACK', entranceId: 'MM_ROMANI_RANCH_FROM_DOGGY_RACETRACK', x: 904, y: 391 },

  // ========== MAJORA'S MASK - MILK ROAD ==========
  { renderscene: 'MM_MILK_ROAD', entranceId: 'MM_TERMINA_FIELD_FROM_MILK_ROAD', x: 26, y: 375 },
  { renderscene: 'MM_MILK_ROAD', entranceId: 'MM_ROMANI_RANCH_FROM_MILK_ROAD', x: 925, y: 306 },
  { renderscene: 'MM_MILK_ROAD', entranceId: 'MM_GORMAN_BACK_FROM_MILK_ROAD', x: 780, y: 26 },
  { renderscene: 'MM_MILK_ROAD', entranceId: 'MM_GORMAN_TRACK_FROM_MILK_ROAD', x: 254, y: 28 },
  { renderscene: 'MM_MILK_ROAD', entranceId: 'MM_WARP_OWL_MILK_ROAD', x: 383, y: 205 },
  { renderscene: 'MM_GORMAN_TRACK', entranceId: 'MM_MILK_ROAD_FROM_GORMAN_TRACK', x: 710, y: 175 },
  { renderscene: 'MM_GORMAN_TRACK', entranceId: 'MM_MILK_ROAD_FROM_GORMAN_BACK', x: 360, y: 14 },

  // ========== MAJORA'S MASK - GORON VILLAGE ==========
  { renderscene: 'MM_GORON_VILLAGE_WINTER', entranceId: 'MM_LONE_PEAK_SHRINE', x: 546, y: 23 },
  { renderscene: 'MM_GORON_VILLAGE_WINTER', entranceId: 'MM_TWIN_ISLANDS_FROM_GORON_VILLAGE', x: 649, y: 574 },
  { renderscene: 'MM_GORON_VILLAGE_WINTER', entranceId: 'MM_GORON_SHRINE', x: 605, y: 438 },
  { renderscene: 'MM_GORON_SHOP', entranceId: 'MM_GORON_SHRINE_FROM_SHOP', x: 452, y: 548 },
  { renderscene: 'MM_LONE_PEAK', entranceId: 'MM_GORON_VILLAGE_FROM_LONE_PEAK_SHRINE', x: 499, y: 607 },
  { renderscene: 'MM_GORON_SHRINE', entranceId: 'MM_GORON_VILLAGE_FROM_GORON_SHRINE', x: 169, y: 482 },
  { renderscene: 'MM_GORON_SHRINE', entranceId: 'MM_GORON_SHOP', x: 251, y: 241 },

  // ========== MAJORA'S MASK - MOUNTAIN VILLAGE ==========
  { renderscene: 'MM_MOUNTAIN_VILLAGE', entranceId: 'MM_BLACKSMITH', x: 479, y: 426 },
  { renderscene: 'MM_MOUNTAIN_VILLAGE', entranceId: 'MM_WARP_OWL_MOUNTAIN_VILLAGE', x: 344, y: 311 },
  { renderscene: 'MM_MOUNTAIN_VILLAGE', entranceId: 'MM_PATH_FROM_MOUNTAIN_VILLAGE', x: 439, y: 603 },
  { renderscene: 'MM_MOUNTAIN_VILLAGE', entranceId: 'MM_TWIN_ISLANDS_FROM_MOUNTAIN_VILLAGE', x: 850, y: 412 },
  { renderscene: 'MM_MOUNTAIN_VILLAGE', entranceId: 'MM_GORON_GRAVEYARD', x: 516, y: 32 },
  { renderscene: 'MM_MOUNTAIN_VILLAGE_SPRING', entranceId: 'MM_GROTTO_GENERIC_MOUNTAIN_VILLAGE', x: 722, y: 147 },
  { renderscene: 'MM_MOUNTAIN_VILLAGE_SPRING', entranceId: 'MM_GORON_GRAVEYARD', x: 515, y: 33 },
  { renderscene: 'MM_MOUNTAIN_VILLAGE_SPRING', entranceId: 'MM_PATH_FROM_MOUNTAIN_VILLAGE', x: 434, y: 602 },
  { renderscene: 'MM_MOUNTAIN_VILLAGE_SPRING', entranceId: 'MM_TWIN_ISLANDS_FROM_MOUNTAIN_VILLAGE', x: 848, y: 406 },
  { renderscene: 'MM_MOUNTAIN_VILLAGE_SPRING', entranceId: 'MM_SNOWHEAD_PATH_FROM_MOUNTAIN_VILLAGE', x: 277, y: 221 },
  { renderscene: 'MM_MOUNTAIN_VILLAGE_SPRING', entranceId: 'MM_BLACKSMITH', x: 476, y: 428 },
  { renderscene: 'MM_GROTTO_MOUNTAIN_VILLAGE_GENERIC', entranceId: 'MM_GROTTO_EXIT_GENERIC_MOUNTAIN_VILLAGE', x: 637, y: 501 },
  { renderscene: 'MM_GORON_GRAVEYARD', entranceId: 'MM_MOUNTAIN_VILLAGE_FROM_GORON_GRAVEYARD', x: 497, y: 591, targetScene: 'MM_MOUNTAIN_VILLAGE' },
  { renderscene: 'MM_BLACKSMITH', entranceId: 'MM_MOUNTAIN_VILLAGE_FROM_BLACKSMITH', x: 719, y: 338 },

  // ========== MAJORA'S MASK - TWIN ISLANDS ==========
  { renderscene: 'MM_TWIN_ISLANDS', entranceId: 'MM_GROTTO_GENERIC_TWIN_ISLANDS', x: 235, y: 271 },
  { renderscene: 'MM_TWIN_ISLANDS', entranceId: 'MM_MOUNTAIN_VILLAGE_FROM_TWIN_ISLANDS', x: 20, y: 492 },
  { renderscene: 'MM_TWIN_ISLANDS', entranceId: 'MM_GORON_RACETRACK', x: 407, y: 45 },
  { renderscene: 'MM_TWIN_ISLANDS', entranceId: 'MM_GROTTO_HOT_WATER', x: 657, y: 357 },
  { renderscene: 'MM_TWIN_ISLANDS', entranceId: 'MM_GORON_VILLAGE_FROM_TWIN_ISLANDS', x: 829, y: 454 },
  { renderscene: 'MM_TWIN_ISLANDS_SPRING', entranceId: 'MM_MOUNTAIN_VILLAGE_FROM_TWIN_ISLANDS', x: 24, y: 489 },
  { renderscene: 'MM_TWIN_ISLANDS_SPRING', entranceId: 'MM_GROTTO_GENERIC_TWIN_ISLANDS', x: 235, y: 271 },
  { renderscene: 'MM_TWIN_ISLANDS_SPRING', entranceId: 'MM_GORON_RACETRACK', x: 415, y: 49 },
  { renderscene: 'MM_TWIN_ISLANDS_SPRING', entranceId: 'MM_GROTTO_HOT_WATER', x: 666, y: 361 },
  { renderscene: 'MM_TWIN_ISLANDS_SPRING', entranceId: 'MM_GORON_VILLAGE_FROM_TWIN_ISLANDS', x: 851, y: 460 },
  { renderscene: 'MM_GROTTO_TWIN_ISLANDS_FROZEN', entranceId: 'MM_GROTTO_EXIT_HOT_WATER', x: 709, y: 503 },
  { renderscene: 'MM_GROTTO_TWIN_ISLANDS_RAMP', entranceId: 'MM_GROTTO_EXIT_GENERIC_TWIN_ISLANDS', x: 640, y: 501 },
  { renderscene: 'MM_GORON_RACETRACK', entranceId: 'MM_TWIN_ISLANDS_FROM_GORON_RACETRACK', x: 594, y: 557 },

  // ========== MAJORA'S MASK - PATH TO MOUNTAIN VILLAGE ==========
  { renderscene: 'MM_PATH_MOUNTAIN_VILLAGE_WINTER', entranceId: 'MM_MOUNTAIN_VILLAGE_FROM_PATH', x: 96, y: 300 },
  { renderscene: 'MM_PATH_MOUNTAIN_VILLAGE_WINTER', entranceId: 'MM_TERMINA_FIELD_FROM_PATH_TO_MOUNTAIN_VILLAGE', x: 878, y: 285 },
  { renderscene: 'MM_PATH_MOUNTAIN_VILLAGE_SPRING', entranceId: 'MM_MOUNTAIN_VILLAGE_FROM_PATH', x: 126, y: 228 },
  { renderscene: 'MM_PATH_MOUNTAIN_VILLAGE_SPRING', entranceId: 'MM_TERMINA_FIELD_FROM_PATH_TO_MOUNTAIN_VILLAGE', x: 890, y: 303 },

  // ========== MAJORA'S MASK - PATH TO SNOWHEAD ==========
  { renderscene: 'MM_PATH_SNOWHEAD_WINTER', entranceId: 'MM_GROTTO_GENERIC_PATH_SNOWHEAD', x: 697, y: 201 },
  { renderscene: 'MM_PATH_SNOWHEAD_WINTER', entranceId: 'MM_SNOWHEAD_FROM_SNOWHEAD_PATH', x: 920, y: 79 },
  { renderscene: 'MM_PATH_SNOWHEAD_WINTER', entranceId: 'MM_MOUNTAIN_VILLAGE_FROM_SNOWHEAD_PATH', x: 22, y: 112 },
  { renderscene: 'MM_PATH_SNOWHEAD_SPRING', entranceId: 'MM_MOUNTAIN_VILLAGE_FROM_SNOWHEAD_PATH', x: 21, y: 102 },
  { renderscene: 'MM_PATH_SNOWHEAD_SPRING', entranceId: 'MM_SNOWHEAD_FROM_SNOWHEAD_PATH', x: 915, y: 84 },
  { renderscene: 'MM_GROTTO_PATH_TO_SNOWHEAD_GENERIC', entranceId: 'MM_GROTTO_EXIT_GENERIC_PATH_SNOWHEAD', x: 641, y: 499 },

  // ========== MAJORA'S MASK - SNOWHEAD ==========
  { renderscene: 'MM_SNOWHEAD', entranceId: 'MM_TEMPLE_SNOWHEAD', x: 676, y: 265 },
  { renderscene: 'MM_SNOWHEAD', entranceId: 'MM_FAIRY_FOUNTAIN_SNOWHEAD', x: 774, y: 325 },
  { renderscene: 'MM_SNOWHEAD', entranceId: 'MM_PATH_SNOWHEAD_FROM_SNOWHEAD', x: 113, y: 525 },
  { renderscene: 'MM_SNOWHEAD', entranceId: 'MM_WARP_OWL_SNOWHEAD', x: 196, y: 504 },
  { renderscene: 'MM_FAIRY_SNOWHEAD', entranceId: 'MM_SNOWHEAD_FROM_FAIRY_FOUNTAIN', x: 467, y: 589 },

  // ========== MAJORA'S MASK - GREAT BAY COAST ==========
  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_SPIDER_HOUSE_OCEAN', x: 703, y: 518 },
  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_GROTTO_GENERIC_GREAT_BAY_COAST', x: 699, y: 603 },
  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_FISHER_HUT', x: 681, y: 558 },
  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_ZORA_CAPE_FROM_GREAT_BAY_COAST', x: 575, y: 610 },
  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_LABORATORY', x: 298, y: 496 },
  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_PIRATE_FORTRESS', x: 548, y: 89 },
  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_GROTTO_COW_COAST', x: 713, y: 201 },
  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_TERMINA_FIELD_FROM_GREAT_BAY_COAST', x: 784, y: 430 },
  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_PINNACLE_ROCK', x: 187, y: 192 },
  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_VOID_GREAT_BAY', x: 57, y: 527 },
  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_WARP_OWL_GREAT_BAY', x: 320, y: 491 },
  { renderscene: 'MM_GROTTO_GREAT_BAY_COAST_COW', entranceId: 'MM_GROTTO_EXIT_COW_COAST', x: 241, y: 478 },
  { renderscene: 'MM_GROTTO_GREAT_BAY_COAST_FISHERMAN', entranceId: 'MM_GROTTO_EXIT_GENERIC_GREAT_BAY_COAST', x: 644, y: 500 },
  { renderscene: 'MM_FISHER_HUT', entranceId: 'MM_GREAT_BAY_COAST_FROM_FISHER_HUT', x: 219, y: 253 },
  { renderscene: 'MM_PINNACLE_ROCK', entranceId: 'MM_GREAT_BAY_FROM_PINNACLE_ROCK', x: 295, y: 15 },
  { renderscene: 'MM_PINNACLE_ROCK', entranceId: 'MM_VOID_PINNACLE_ROCK', x: 461, y: 15 },
  { renderscene: 'MM_PINNACLE_ROCK', entranceId: 'MM_VOID_PINNACLE_ROCK', x: 292, y: 17 },
  { renderscene: 'MM_LABORATORY', entranceId: 'MM_GREAT_BAY_COAST_FROM_LABORATORY', x: 752, y: 359 },

  // ========== MAJORA'S MASK - PIRATE FORTRESS ==========
  { renderscene: 'MM_PIRATE_FORTRESS_ENTRANCE', entranceId: 'MM_SEWERS_FROM_EXTERIOR_GATE', x: 312, y: 369, targetScene: 'MM_PIRATE_FORTRESS_INTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_ENTRANCE', entranceId: 'MM_PIRATE_FORTRESS_INTERIOR', x: 44, y: 91 },
  { renderscene: 'MM_PIRATE_FORTRESS_ENTRANCE', entranceId: 'MM_PIRATE_FORTRESS_INTERIOR_FROM_LOOKOUT', x: 473, y: 298 },
  { renderscene: 'MM_PIRATE_FORTRESS_ENTRANCE', entranceId: 'MM_SEWERS_FROM_EXTERIOR_DOOR', x: 472, y: 188 },
  { renderscene: 'MM_PIRATE_FORTRESS_ENTRANCE', entranceId: 'MM_GREAT_BAY_FROM_PIRATE_FORTRESS', x: 779, y: 210 },

  { renderscene: 'MM_PIRATE_FORTRESS_EXTERIOR', entranceId: 'MM_PIRATE_FORTRESS_EXTERIOR_FROM_INTERIOR', x: 253, y: 428 },
  { renderscene: 'MM_PIRATE_FORTRESS_EXTERIOR', entranceId: 'MM_PIRATE_FORTRESS_EXTERIOR_LOOKOUT', x: 678, y: 567 },
  { renderscene: 'MM_PIRATE_FORTRESS_EXTERIOR', entranceId: 'MM_PIRATE_INTERIOR_FROM_HOOKSHOT', x: 409, y: 101, targetScene: 'MM_PIRATE_FORTRESS_INTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_EXTERIOR', entranceId: 'MM_PIRATE_INTERIOR_FROM_HOOKSHOT_LOOKOUT', x: 473, y: 88, targetScene: 'MM_PIRATE_FORTRESS_INTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_EXTERIOR', entranceId: 'MM_PIRATE_INTERIOR_FROM_TREASURE', x: 165, y: 14, targetScene: 'MM_PIRATE_FORTRESS_INTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_EXTERIOR', entranceId: 'MM_PIRATE_INTERIOR_FROM_TREASURE_EGG', x: 301, y: 123, targetScene: 'MM_PIRATE_FORTRESS_INTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_EXTERIOR', entranceId: 'MM_PIRATE_INTERIOR_FROM_CANON', x: 151, y: 389, targetScene: 'MM_PIRATE_FORTRESS_INTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_EXTERIOR', entranceId: 'MM_PIRATE_INTERIOR_FROM_CANON_EGG', x: 299, y: 529, targetScene: 'MM_PIRATE_FORTRESS_INTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_EXTERIOR', entranceId: 'MM_PIRATE_INTERIOR_FROM_BARREL', x: 768, y: 449, targetScene: 'MM_PIRATE_FORTRESS_INTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_EXTERIOR', entranceId: 'MM_PIRATE_INTERIOR_FROM_BARREL_EGG', x: 647, y: 207, targetScene: 'MM_PIRATE_FORTRESS_INTERIOR' },

  { renderscene: 'MM_PIRATE_FORTRESS_INTERIOR', entranceId: 'MM_PIRATE_EXTERIOR_FROM_HOOKSHOT', x: 716, y: 273, targetScene: 'MM_PIRATE_FORTRESS_EXTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_INTERIOR', entranceId: 'MM_PIRATE_EXTERIOR_FROM_HOOKSHOT_LOOKOUT', x: 788, y: 189, targetScene: 'MM_PIRATE_FORTRESS_EXTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_INTERIOR', entranceId: 'MM_PIRATE_EXTERIOR_FROM_TREASURE', x: 397, y: 75, targetScene: 'MM_PIRATE_FORTRESS_EXTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_INTERIOR', entranceId: 'MM_PIRATE_EXTERIOR_FROM_TREASURE_EGG', x: 578, y: 273, targetScene: 'MM_PIRATE_FORTRESS_EXTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_INTERIOR', entranceId: 'MM_PIRATE_EXTERIOR_FROM_CANON', x: 402, y: 388, targetScene: 'MM_PIRATE_FORTRESS_EXTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_INTERIOR', entranceId: 'MM_PIRATE_EXTERIOR_FROM_CANON_EGG', x: 503, y: 665, targetScene: 'MM_PIRATE_FORTRESS_EXTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_INTERIOR', entranceId: 'MM_PIRATE_EXTERIOR_FROM_BARREL', x: 1057, y: 540, targetScene: 'MM_PIRATE_FORTRESS_EXTERIOR' },
  { renderscene: 'MM_PIRATE_FORTRESS_INTERIOR', entranceId: 'MM_PIRATE_EXTERIOR_FROM_BARREL_EGG', x: 947, y: 254, targetScene: 'MM_PIRATE_FORTRESS_EXTERIOR' },

  // ========== MAJORA'S MASK - ZORA CAPE ==========
  { renderscene: 'MM_ZORA_CAPE', entranceId: 'MM_GROTTO_GENERIC_ZORA_CAPE', x: 461, y: 336 },
  { renderscene: 'MM_ZORA_CAPE', entranceId: 'MM_VOID_ZORA_CAPE', x: 70, y: 555 },
  { renderscene: 'MM_ZORA_CAPE', entranceId: 'MM_WARP_OWL_ZORA_CAPE', x: 79, y: 330 },
  { renderscene: 'MM_ZORA_CAPE', entranceId: 'MM_FAIRY_FOUNTAIN_GREAT_BAY', x: 389, y: 476 },
  { renderscene: 'MM_ZORA_CAPE', entranceId: 'MM_BEAVERS', x: 852, y: 442 },
  { renderscene: 'MM_ZORA_CAPE', entranceId: 'MM_TEMPLE_GREAT_BAY', x: 18, y: 323 },
  { renderscene: 'MM_ZORA_CAPE', entranceId: 'MM_ZORA_HALL_UNDERWATER', x: 176, y: 293 },
  { renderscene: 'MM_ZORA_CAPE', entranceId: 'MM_ZORA_HALL_LEDGE', x: 74, y: 317 },
  { renderscene: 'MM_WATERFALL_RAPIDS', entranceId: 'MM_ZORA_CAPE_FROM_BEAVERS', x: 284, y: 502 },
  { renderscene: 'MM_GROTTO_ZORA_CAPE_GENERIC', entranceId: 'MM_GROTTO_EXIT_GENERIC_ZORA_CAPE', x: 640, y: 501 },
  { renderscene: 'MM_FAIRY_GREAT_BAY_COAST', entranceId: 'MM_GREAT_BAY_FROM_FAIRY_FOUNTAIN', x: 494, y: 542 },

  // ========== MAJORA'S MASK - ZORA HALL ==========
  { renderscene: 'MM_ZORA_HALL', entranceId: 'MM_ROOM_EVANS', x: 499, y: 74 },
  { renderscene: 'MM_ZORA_HALL', entranceId: 'MM_ROOM_JAPAS', x: 683, y: 220 },
  { renderscene: 'MM_ZORA_HALL', entranceId: 'MM_ROOM_LULU', x: 414, y: 100 },
  { renderscene: 'MM_ZORA_HALL', entranceId: 'MM_ROOM_TIJO', x: 675, y: 301 },
  { renderscene: 'MM_ZORA_HALL', entranceId: 'MM_ZORA_SHOP', x: 688, y: 440 },
  { renderscene: 'MM_ZORA_HALL', entranceId: 'MM_ZORA_CAPE_FROM_HALL_WATER', x: 62, y: 566 },
  { renderscene: 'MM_ZORA_HALL', entranceId: 'MM_ZORA_CAPE_PENINSULA', x: 781, y: 391 },
  { renderscene: 'MM_ZORA_SHOP', entranceId: 'MM_ZORA_HALL_FROM_SHOP', x: 444, y: 46 },
  { renderscene: 'MM_ZORA_EVANS_ROOM', entranceId: 'MM_ZORA_HALL_FROM_EVANS', x: 470, y: 62 },
  { renderscene: 'MM_ZORA_LULU_ROOM', entranceId: 'MM_ZORA_HALL_FROM_LULU', x: 241, y: 169 },
  { renderscene: 'MM_ZORA_JAPAS_ROOM', entranceId: 'MM_ZORA_HALL_FROM_JAPAS', x: 1024, y: 454 },
  { renderscene: 'MM_ZORA_TIJO_ROOM', entranceId: 'MM_ZORA_HALL_FROM_TIJO', x: 445, y: 927 },

  // ========== MAJORA'S MASK - IKANA CANYON ==========
  { renderscene: 'MM_IKANA_CANYON', entranceId: 'MM_BENEATH_THE_WELL', x: 211, y: 490 },
  { renderscene: 'MM_IKANA_CANYON', entranceId: 'MM_SECRET_SHRINE', x: 336, y: 589 },
  { renderscene: 'MM_IKANA_CANYON', entranceId: 'MM_IKANA_ROAD_FROM_VALLEY', x: 685, y: 597 },
  { renderscene: 'MM_IKANA_CANYON', entranceId: 'MM_IKANA_CASTLE_GARDENS', x: 425, y: 253 },
  { renderscene: 'MM_IKANA_CANYON', entranceId: 'MM_STONE_TOWER', x: 289, y: 54 },
  { renderscene: 'MM_IKANA_CANYON', entranceId: 'MM_GHOST_HUT', x: 117, y: 285 },
  { renderscene: 'MM_IKANA_CANYON', entranceId: 'MM_MUSIC_BOX_HOUSE', x: 271, y: 291 },
  { renderscene: 'MM_IKANA_CANYON', entranceId: 'MM_FAIRY_FOUNTAIN_IKANA', x: 339, y: 203 },
  { renderscene: 'MM_IKANA_CANYON', entranceId: 'MM_IKANA_CAVERN', x: 116, y: 162 },
  { renderscene: 'MM_IKANA_CANYON', entranceId: 'MM_SAKON_HIDEOUT', x: 792, y: 321 },
  { renderscene: 'MM_IKANA_CANYON', entranceId: 'MM_GROTTO_GENERIC_VALLEY', x: 369, y: 562 },
  { renderscene: 'MM_IKANA_CANYON', entranceId: 'MM_SWAMP_FROM_IKANA_CANYON', x: 856, y: 298, targetScene: 'MM_SOUTHERN_SWAMP' },
  { renderscene: 'MM_IKANA_CANYON', entranceId: 'MM_WARP_OWL_IKANA_CANYON', x: 410, y: 463 },
  { renderscene: 'MM_GHOST_HUT', entranceId: 'MM_IKANA_CANYON_FROM_GHOST_HUT', x: 470, y: 594 },
  { renderscene: 'MM_MUSIC_BOX_HOUSE', entranceId: 'MM_IKANA_CANYON_FROM_MUSIC_BOX_HOUSE', x: 727, y: 286 },
  { renderscene: 'MM_SAKON_HIDEOUT', entranceId: 'MM_IKANA_CANYON_FROM_SAKON_HIDEOUT', x: 164, y: 334 },
  { renderscene: 'MM_GROTTO_IKANA_VALLEY_OPEN', entranceId: 'MM_GROTTO_EXIT_GENERIC_VALLEY', x: 641, y: 502 },
  { renderscene: 'MM_FAIRY_IKANA', entranceId: 'MM_IKANA_CANYON_FROM_FAIRY_FOUNTAIN', x: 453, y: 564 },

  // ========== MAJORA'S MASK - IKANA GRAVEYARD ==========
  { renderscene: 'MM_IKANA_GRAVEYARD', entranceId: 'MM_IKANA_ROAD_FROM_IKANA_GRAVEYARD', x: 54, y: 342 },
  { renderscene: 'MM_IKANA_GRAVEYARD', entranceId: 'MM_GRAVE_NIGHT1', x: 223, y: 360 },
  { renderscene: 'MM_IKANA_GRAVEYARD', entranceId: 'MM_GRAVE_NIGHT2', x: 289, y: 355 },
  { renderscene: 'MM_IKANA_GRAVEYARD', entranceId: 'MM_GRAVE_NIGHT3', x: 275, y: 265 },
  { renderscene: 'MM_IKANA_GRAVEYARD', entranceId: 'MM_GROTTO_GENERIC_GRAVEYARD', x: 534, y: 298 },
  { renderscene: 'MM_IKANA_GRAVEYARD', entranceId: 'OOT_HOUSE_DAMPE', x: 569, y: 216 },
  { renderscene: 'MM_BENEATH_THE_GRAVEYARD', entranceId: 'MM_GRAVE_EXIT_NIGHT1', x: 334, y: 479 },
  { renderscene: 'MM_BENEATH_THE_GRAVEYARD', entranceId: 'MM_GRAVE_EXIT_NIGHT2', x: 353, y: 382 },
  { renderscene: 'MM_DAMPE_HOUSE', entranceId: 'MM_GRAVE_EXIT_NIGHT3', x: 78, y: 313 },
  { renderscene: 'MM_GROTTO_IKANA_GRAVEYARD_GENERIC', entranceId: 'MM_GROTTO_EXIT_GENERIC_GRAVEYARD', x: 642, y: 501 },
  { renderscene: 'MM_DAMPE_HOUSE', entranceId: 'OOT_GRAVEYARD_FROM_DAMPE', x: 870, y: 302 },

  // ========== MAJORA'S MASK - ROAD TO IKANA ==========
  { renderscene: 'MM_ROAD_IKANA', entranceId: 'MM_IKANA_VALLEY_FROM_ROAD', x: 20, y: 275 },
  { renderscene: 'MM_ROAD_IKANA', entranceId: 'MM_TERMINA_FIELD_FROM_ROAD_TO_IKANA', x: 828, y: 314 },
  { renderscene: 'MM_ROAD_IKANA', entranceId: 'MM_IKANA_GRAVEYARD', x: 250, y: 480 },
  { renderscene: 'MM_ROAD_IKANA', entranceId: 'MM_GROTTO_GENERIC_PATH_IKANA', x: 467, y: 263 },
  { renderscene: 'MM_GROTTO_IKANA_ROAD_GENERIC', entranceId: 'MM_GROTTO_EXIT_GENERIC_PATH_IKANA', x: 641, y: 501 },

  // ========== MAJORA'S MASK - STONE TOWER ==========
  { renderscene: 'MM_STONE_TOWER', entranceId: 'MM_IKANA_CANYON_FROM_STONE_TOWER', x: 464, y: 303 },
  { renderscene: 'MM_STONE_TOWER', entranceId: 'MM_WARP_OWL_STONE_TOWER', x: 418, y: 83 },
  { renderscene: 'MM_STONE_TOWER', entranceId: 'MM_TEMPLE_STONE_TOWER', x: 390, y: 50 },
  { renderscene: 'MM_STONE_TOWER', entranceId: 'MM_STONE_TOWER_INVERTED_FROM_STONE_TOWER', x: 453, y: 475 },
  { renderscene: 'MM_STONE_TOWER_INVERTED', entranceId: 'MM_STONE_TOWER_FROM_STONE_TOWER_INVERTED', x: 744, y: 210 },
  { renderscene: 'MM_STONE_TOWER_INVERTED', entranceId: 'MM_TEMPLE_STONE_TOWER_INVERTED', x: 758, y: 182 },

  { renderscene: 'OOT_MARKET_CHILD_DAY', entranceId: 'OOT_BACK_ALLEY_TREASURE_FROM_MARKET', x: 139, y: 607 },
  { renderscene: 'OOT_MARKET_CHILD_DAY', entranceId: 'OOT_BACK_ALLEY_SHOOTING_FROM_MARKET', x: 164, y: 20 },
  { renderscene: 'OOT_MARKET_CHILD_DAY', entranceId: 'OOT_MARKET_FROM_MASK_SHOP', x: 632, y: 44 },
  { renderscene: 'OOT_MARKET_CHILD_NIGHT', entranceId: 'OOT_BACK_ALLEY_TREASURE_FROM_MARKET', x: 149, y: 606 },
  { renderscene: 'OOT_MARKET_CHILD_NIGHT', entranceId: 'OOT_BACK_ALLEY_SHOOTING_FROM_MARKET', x: 180, y: 37 },
  { renderscene: 'OOT_MARKET_CHILD_NIGHT', entranceId: 'OOT_MARKET_FROM_MASK_SHOP', x: 631, y: 44 },
  // ========== AUTO-GENERATED FROM CSV ==========

  // MM_BENEATH_THE_WELL
  { renderscene: 'MM_BENEATH_THE_WELL', entranceId: 'MM_IKANA_CANYON_FROM_WELL', x: 619, y: 1031 },
  { renderscene: 'MM_BENEATH_THE_WELL', entranceId: 'MM_IKANA_CASTLE_EXTERIOR_FROM_WELL', x: 1092, y: 371 },
  { renderscene: 'MM_BENEATH_THE_WELL', entranceId: 'MM_WALLMASTER_BTW_ENTRANCE', x: 895, y: 944 },
  { renderscene: 'MM_BENEATH_THE_WELL', entranceId: 'MM_WALLMASTER_BTW_FOUNTAIN', x: 620, y: 431 },
  { renderscene: 'MM_BENEATH_THE_WELL', entranceId: 'MM_WALLMASTER_BTW_EXIT', x: 892, y: 494 },

  // MM_CLOCK_TOWER_ROOFTOP

  // MM_CLOCK_TOWN_EAST
  { renderscene: 'MM_CLOCK_TOWN_EAST', entranceId: 'MM_CLOCK_TOWN_SOUTH_TOP_FROM_EAST', x: 312, y: 450 },

  // MM_CLOCK_TOWN_SOUTH

  // MM_CLOCK_TOWN_WEST
  { renderscene: 'MM_CLOCK_TOWN_WEST', entranceId: 'MM_CLOCK_TOWN_SOUTH_TOP_FROM_WEST', x: 307, y: 164 },
  { renderscene: 'MM_CLOCK_TOWN_WEST', entranceId: 'MM_BOMB_SHOP', x: 630, y: 457 },

  // MM_CASTLE_IKANA_ROOM_0
  { renderscene: 'MM_CASTLE_IKANA_ROOM_0', entranceId: 'MM_IKANA_CASTLE_ROOF_KEG', x: 481, y: 202 },
  { renderscene: 'MM_CASTLE_IKANA_ROOM_0', entranceId: 'MM_IKANA_CASTLE_ROOF_BLOCK', x: 605, y: 166 },
  { renderscene: 'MM_CASTLE_IKANA_ROOM_0', entranceId: 'MM_BENEATH_THE_WELL_BACK', x: 254, y: 118 },
  { renderscene: 'MM_CASTLE_IKANA_ROOM_0', entranceId: 'MM_IKANA_CASTLE', x: 474, y: 333 },
  { renderscene: 'MM_CASTLE_IKANA_ROOM_0', entranceId: 'MM_IKANA_CASTLE_EXTERIOR_FROM_CASTLE', x: 474, y: 370 },
  { renderscene: 'MM_CASTLE_IKANA_ROOM_0', entranceId: 'MM_IKANA_CANYON_FROM_CASTLE_GARDENS', x: 341, y: 574 },

  // MM_CASTLE_IKANA_ROOM_1

  // MM_DAMPE_HOUSE
  { renderscene: 'MM_DAMPE_HOUSE', entranceId: 'MM_WALLMASTER_DAMPE', x: 812, y: 309 },

  // MM_DEKU_KING_CHAMBER
  { renderscene: 'MM_DEKU_KING_CHAMBER', entranceId: 'MM_DEKU_PALACE_EXTERIOR_FROM_THRONE', x: 503, y: 520 },
  { renderscene: 'MM_DEKU_KING_CHAMBER', entranceId: 'MM_DEKU_PALACE_EXTERIOR_FROM_THRONE_CAGE', x: 68, y: 335 },

  // MM_DEKU_PALACE

  // MM_DEKU_SHRINE
  { renderscene: 'MM_DEKU_SHRINE', entranceId: 'MM_DEKU_PALACE_EXTERIOR_FROM_SHRINE', x: 742, y: 601 },

  // MM_GREAT_BAY_COAST

  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_COAST_FROM_MIKAU_TOMB', x: 511, y: 663 },
  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_PIRATE_ENTRANCE_CAUGHT', x: 490, y: 661 },
  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_VOID_GREAT_BAY_BEACH', x: 274, y: 563 },
  { renderscene: 'MM_GREAT_BAY_COAST', entranceId: 'MM_VOID_GREAT_BAY_LEDGE_BY_PINNACLE_ROCK', x: 274, y: 342 },

  // MM_IKANA_CANYON
  { renderscene: 'MM_IKANA_CAVERN', entranceId: 'MM_IKANA_CANYON_FROM_CAVERN', x: 148, y: 514 },

  // MM_MILK_ROAD

  // MM_MOON
  { renderscene: 'MM_MOON', entranceId: 'MM_MOON_DEKU_FROM_MOON', x: 391, y: 420 },
  { renderscene: 'MM_MOON', entranceId: 'MM_MOON_FROM_MOON_GORON', x: 643, y: 420 },
  { renderscene: 'MM_MOON', entranceId: 'MM_MOON_FROM_MOON_ZORA', x: 623, y: 118 },
  { renderscene: 'MM_MOON', entranceId: 'MM_MOON_FROM_MOON_LINK', x: 394, y: 112 },
  { renderscene: 'MM_MOON', entranceId: 'MM_MAJORA_LAIR_FROM_MOON', x: 510, y: 326 },

  // MM_MOON_DEKU
  { renderscene: 'MM_MOON_DEKU', entranceId: 'MM_MOON_FROM_MOON_DEKU', x: 793, y: 359 },

  // MM_MOON_GORON
  { renderscene: 'MM_MOON_GORON', entranceId: 'MM_MOON_FROM_MOON_GORON', x: 918, y: 401 },

  // MM_MOON_LINK
  { renderscene: 'MM_MOON_LINK', entranceId: 'MM_MOON_FROM_MOON_LINK', x: 79, y: 350 },

  // MM_MOON_ZORA
  { renderscene: 'MM_MOON_ZORA', entranceId: 'MM_MOON_FROM_MOON_ZORA', x: 931, y: 384 },
  { renderscene: 'MM_MOON_ZORA', entranceId: 'MM_MOON_ZORA_WRONG_PIPE', x: 740, y: 357 },
  { renderscene: 'MM_MOON_ZORA', entranceId: 'MM_MOON_ZORA_WRONG_PIPE', x: 454, y: 325 },
  { renderscene: 'MM_MOON_ZORA', entranceId: 'MM_MOON_ZORA_WRONG_PIPE', x: 105, y: 320 },

  // MM_MOUNTAIN_VILLAGE
  { renderscene: 'MM_MOUNTAIN_VILLAGE', entranceId: 'MM_GROTTO_EXIT_GENERIC_MOUNTAIN_VILLAGE_WINTER', x: 508, y: 490 },

  // MM_PINNACLE_ROCK

  // MM_PIRATE_FORTRESS_INTERIOR
  { renderscene: 'MM_PIRATE_FORTRESS_INTERIOR', entranceId: 'MM_EXTERIOR_GATE_FROM_SEWERS', x: 1084, y: 799, targetScene: 'MM_PIRATE_FORTRESS_ENTRANCE' },
  { renderscene: 'MM_PIRATE_FORTRESS_INTERIOR', entranceId: 'MM_EXTERIOR_DOOR_FROM_SEWERS', x: 954, y: 388 },
  { renderscene: 'MM_PIRATE_FORTRESS_INTERIOR', entranceId: 'MM_ENTRANCE_VENT_FROM_SEWERS', x: 780, y: 625, targetScene: 'MM_PIRATE_FORTRESS_ENTRANCE' },
  { renderscene: 'MM_PIRATE_FORTRESS_INTERIOR', entranceId: 'MM_ENTRANCE_VENT_FROM_SEWERS', x: 803, y: 503, targetScene: 'MM_PIRATE_FORTRESS_ENTRANCE' },

  // MM_SECRET_SHRINE
  { renderscene: 'MM_SECRET_SHRINE', entranceId: 'MM_IKANA_VALLEY_FROM_SHRINE', x: 473, y: 605 },

  // MM_SNOWHEAD

  // MM_SOUTHERN_SWAMP
  { renderscene: 'MM_SOUTHERN_SWAMP', entranceId: 'MM_IKANA_CANYON_WATERFALLS', x: 667, y: 731 },
  { renderscene: 'MM_SOUTHERN_SWAMP', entranceId: 'MM_KOUME_RIDE', x: 599, y: 483, targetScene: 'MM_TOURIST_INFORMATION' },
  { renderscene: 'MM_SOUTHERN_SWAMP', entranceId: 'MM_KOUME_TARGET', x: 562, y: 483, targetScene: 'MM_TOURIST_INFORMATION' },

  // MM_SPIDER_HOUSE_OCEAN_ROOM_0
  { renderscene: 'MM_SPIDER_HOUSE_OCEAN_ROOM_0', entranceId: 'MM_GREAT_BAY_FROM_SPIDER_HOUSE', x: 470, y: 601 },

  // MM_STONE_TOWER

  // MM_TEMPLE_GREAT_BAY_ROOM_0
  { renderscene: 'MM_TEMPLE_GREAT_BAY_ROOM_0', entranceId: 'MM_GREAT_BAY_FROM_TEMPLE', x: 572, y: 330 },

  // MM_TEMPLE_GREAT_BAY_ROOM_12
  { renderscene: 'MM_TEMPLE_GREAT_BAY_ROOM_12', entranceId: 'MM_BOSS_TEMPLE_GREAT_BAY', x: 492, y: 202 },

  // MM_TEMPLE_GREAT_BAY_ROOM_15

  // MM_TEMPLE_SNOWHEAD_ROOM_0
  { renderscene: 'MM_TEMPLE_SNOWHEAD_ROOM_0', entranceId: 'MM_SNOWHEAD_FROM_TEMPLE', x: 808, y: 292 },

  // MM_TEMPLE_SNOWHEAD_ROOM_1
  { renderscene: 'MM_TEMPLE_SNOWHEAD_ROOM_1', entranceId: 'MM_BOSS_TEMPLE_SNOWHEAD', x: 674, y: 12 },

  // MM_TEMPLE_SNOWHEAD_ROOM_13

  // MM_TEMPLE_STONE_TOWER_INVERTED_ROOM_0
  { renderscene: 'MM_TEMPLE_STONE_TOWER_INVERTED_ROOM_0', entranceId: 'MM_STONE_TOWER_INVERTED_FROM_TEMPLE', x: 483, y: 605 },

  // MM_TEMPLE_STONE_TOWER_INVERTED_ROOM_5
  { renderscene: 'MM_TEMPLE_STONE_TOWER_INVERTED_ROOM_5', entranceId: 'MM_BOSS_TEMPLE_STONE_TOWER', x: 816, y: 518 },

  // MM_TEMPLE_STONE_TOWER_ROOM_0
  { renderscene: 'MM_TEMPLE_STONE_TOWER_ROOM_0', entranceId: 'MM_STONE_TOWER_FROM_TEMPLE', x: 478, y: 566 },

  // MM_TEMPLE_WOODFALL_ROOM_0
  { renderscene: 'MM_TEMPLE_WOODFALL_ROOM_0', entranceId: 'MM_WOODFALL_FROM_TEMPLE', x: 467, y: 555 },

  // MM_TEMPLE_WOODFALL_ROOM_1
  { renderscene: 'MM_TEMPLE_WOODFALL_ROOM_1', entranceId: 'MM_BOSS_TEMPLE_WOODFALL', x: 471, y: 604 },

  // MM_TEMPLE_WOODFALL_ROOM_11

  // MM_TOURIST_INFORMATION

  // MM_WATERFALL_RAPIDS
  { renderscene: 'MM_WATERFALL_RAPIDS', entranceId: 'MM_BEAVERS_RACE_FROM_END_RACE', x: 456, y: 831 },
  { renderscene: 'MM_WATERFALL_RAPIDS', entranceId: 'MM_BEAVERS_RACE_FROM_START_RACE', x: 491, y: 840 },
  { renderscene: 'MM_WATERFALL_RAPIDS', entranceId: 'MM_START_RACE_BEAVERS', x: 460, y: 778 },

  // MM_WOODFALL

  // MM_ZORA_CAPE
  { renderscene: 'MM_ZORA_CAPE', entranceId: 'MM_GREAT_BAY_COAST_FROM_ZORA_CAPE', x: 520, y: 712 },

  // OOT_BACK_ALLEY

  // OOT_BACK_ALLEY_HOUSE2
  { renderscene: 'OOT_BACK_ALLEY_HOUSE2', entranceId: 'OOT_BACK_ALLEY_FROM_HOUSE', x: 710, y: 174 },

  // OOT_CASTLE_COURTYARD

  // OOT_DEATH_MOUNTAIN_CRATER

  // OOT_DESERT_COLOSSUS

  // OOT_GERUDO_FORTRESS
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_GERUDO_FORTRESS_JAIL', x: 500, y: 517 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_HIDEOUT_BREAKOUT_FROM_FORTRESS', x: 440, y: 453 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_HIDEOUT_BREAKOUT_FROM_FORTRESS_JAIL', x: 397, y: 451 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_HIDEOUT_JAIL_2_BOTTOM_FROM_FORTRESS', x: 593, y: 490 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_HIDEOUT_JAIL_2_TOP_FROM_FORTRESS', x: 581, y: 408 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_HIDEOUT_JAIL_3_BOTTOM_FROM_FORTRESS', x: 563, y: 496 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_HIDEOUT_JAIL_3_TOP_FROM_FORTRESS', x: 486, y: 458 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_HIDEOUT_JAIL_4_FROM_FORTRESS', x: 489, y: 402 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_HIDEOUT_KITCHEN_BOTTOM_FROM_FORTRESS', x: 523, y: 451 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_HIDEOUT_KITCHEN_BOTTOM_TO_TOP_FROM_FORTRESS', x: 156, y: 707 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_HIDEOUT_KITCHEN_TOP_LEFT_FROM_FORTRESS', x: 519, y: 406 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_HIDEOUT_KITCHEN_TOP_RIGHT_FROM_FORTRESS', x: 548, y: 399 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_HIDEOUT_LEFT_JAIL_1_FROM_FORTRESS', x: 439, y: 500 },
  { renderscene: 'OOT_GERUDO_FORTRESS', entranceId: 'OOT_HIDEOUT_RIGHT_JAIL_1_FROM_FORTRESS', x: 509, y: 469 },

  // OOT_GERUDO_VALLEY

  // OOT_GRAVEYARD

  // OOT_GREAT_FAIRY_CASTLE

  // OOT_HYRULE_CASTLE

  // OOT_HYRULE_FIELD

  // OOT_KAKARIKO_VILLAGE

  // OOT_LAKE_HYLIA

  // OOT_LON_LON_RANCH

  // OOT_SACRED_FOREST_MEADOW

  // OOT_TEMPLE_OF_TIME

  // OOT_THIEVES_HIDEOUT
  { renderscene: 'OOT_THIEVES_HIDEOUT', entranceId: 'OOT_FORTRESS_FROM_HIDEOUT_BREAKOUT', x: 452, y: 499 },
  { renderscene: 'OOT_THIEVES_HIDEOUT', entranceId: 'OOT_FORTRESS_FROM_HIDEOUT_BREAKOUT_JAIL', x: 845, y: 597 },
  { renderscene: 'OOT_THIEVES_HIDEOUT', entranceId: 'OOT_FORTRESS_FROM_HIDEOUT_JAIL_2_BOTTOM', x: 662, y: 85 },
  { renderscene: 'OOT_THIEVES_HIDEOUT', entranceId: 'OOT_FORTRESS_FROM_HIDEOUT_JAIL_2_TOP', x: 426, y: 112 },
  { renderscene: 'OOT_THIEVES_HIDEOUT', entranceId: 'OOT_FORTRESS_FROM_HIDEOUT_JAIL_3_BOTTOM', x: 624, y: 127 },
  { renderscene: 'OOT_THIEVES_HIDEOUT', entranceId: 'OOT_FORTRESS_FROM_HIDEOUT_JAIL_3_TOP', x: 503, y: 306 },
  { renderscene: 'OOT_THIEVES_HIDEOUT', entranceId: 'OOT_FORTRESS_FROM_HIDEOUT_JAIL_4', x: 430, y: 318 },
  { renderscene: 'OOT_THIEVES_HIDEOUT', entranceId: 'OOT_FORTRESS_FROM_HIDEOUT_KITCHEN_BOTTOM', x: 493, y: 287 },
  { renderscene: 'OOT_THIEVES_HIDEOUT', entranceId: 'OOT_FORTRESS_FROM_HIDEOUT_KITCHEN_BOTTOM_TO_TOP', x: 493, y: 211 },
  { renderscene: 'OOT_THIEVES_HIDEOUT', entranceId: 'OOT_FORTRESS_FROM_HIDEOUT_KITCHEN_TOP_LEFT', x: 301, y: 256 },
  { renderscene: 'OOT_THIEVES_HIDEOUT', entranceId: 'OOT_FORTRESS_FROM_HIDEOUT_KITCHEN_TOP_RIGHT', x: 395, y: 207 },
  { renderscene: 'OOT_THIEVES_HIDEOUT', entranceId: 'OOT_FORTRESS_FROM_HIDEOUT_LEFT_JAIL_1', x: 663, y: 490 },
  { renderscene: 'OOT_THIEVES_HIDEOUT', entranceId: 'OOT_FORTRESS_FROM_HIDEOUT_RIGHT_JAIL_1', x: 621, y: 323 },

  // OOT_ZORA_FOUNTAIN

  // OOT_ZORA_RIVER

  // OOT_DEKU_TREE_ROOM_4

  // OOT_DODONGO_CAVERN_ROOM_0

  // OOT_INSIDE_JABU_JABU_ROOM_0

  // OOT_TEMPLE_FIRE_ROOM_0

  // OOT_TEMPLE_FOREST_ROOM_3

  // OOT_TEMPLE_SHADOW_ROOM_4

  // OOT_TEMPLE_SPIRIT_ROOM_1

  // OOT_TEMPLE_WATER_ROOM_2

  { renderscene: 'OOT_BACK_ALLEY', entranceId: 'OOT_ALLEY_HOUSE', x: 1202, y: 524 },
  { renderscene: 'OOT_BACK_ALLEY', entranceId: 'OOT_BOMBCHU_SHOP', x: 72, y: 623 },
  { renderscene: 'OOT_MARKET_CHILD_NIGHT', entranceId: 'OOT_CHILD_ARCHERY', x: 363, y: 15 },
  { renderscene: 'OOT_HYRULE_CASTLE', entranceId: 'OOT_FAIRY_DIN', x: 209, y: 602 },
  { renderscene: 'OOT_GREAT_FAIRY_CASTLE', entranceId: 'OOT_FAIRY_DIN', x: 496, y: 541, ageFilter: 'child' },
  { renderscene: 'OOT_MARKET_CHILD_NIGHT', entranceId: 'OOT_MARKET_BAZAAR', x: 737, y: 417 },
  { renderscene: 'OOT_MARKET_CHILD_NIGHT', entranceId: 'OOT_MARKET_POTION', x: 730, y: 250 },
  { renderscene: 'OOT_ZORA_FOUNTAIN', entranceId: 'OOT_BOSS_JABU_JABU_WARP_OUT', x: 674, y: 393 },
  { renderscene: 'OOT_DEATH_MOUNTAIN_CRATER', entranceId: 'OOT_BOSS_FIRE_TEMPLE_WARP_OUT', x: 472, y: 443 },
  { renderscene: 'OOT_LAKE_HYLIA', entranceId: 'OOT_BOSS_WATER_TEMPLE_WARP_OUT', x: 676, y: 270 },
  { renderscene: 'OOT_TENT_GERUDO', entranceId: 'OOT_GERUDO_VALLEY_FROM_TENT', x: 262, y: 385 },
  { renderscene: 'OOT_DESERT_COLOSSUS', entranceId: 'OOT_BOSS_SPIRIT_TEMPLE_WARP_OUT', x: 667, y: 234 },
  { renderscene: 'OOT_DEATH_MOUNTAIN_TRAIL_ROOM_0', entranceId: 'OOT_BOSS_DODONGO_CAVERN_WARP_OUT', x: 156, y: 357 },
  { renderscene: 'OOT_GRAVEYARD', entranceId: 'OOT_BOSS_SHADOW_TEMPLE_WARP_OUT', x: 104, y: 322 },
  { renderscene: 'OOT_DESERT_COLOSSUS', entranceId: 'OOT_SPIRIT_TEMPLE_DESERT_MIROR', x: 807, y: 212 },
  { renderscene: 'OOT_DESERT_COLOSSUS', entranceId: 'OOT_SPIRIT_TEMPLE_DESERT_GAUNTLET', x: 755, y: 118 },
  { renderscene: 'OOT_TEMPLE_SPIRIT_ROOM_2', entranceId: 'OOT_DESERT_FROM_MIROR', x: 1500, y: 1338 },
  { renderscene: 'OOT_TEMPLE_SPIRIT_ROOM_2', entranceId: 'OOT_DESERT_FROM_GAUNTLET', x: 529, y: 1197 },
  { renderscene: 'MM_CLOCK_TOWER_ROOFTOP', entranceId: 'MM_ROOFTOP_TO_MOON', x: 475, y: 439 },
  { renderscene: 'MM_DEKU_PALACE', entranceId: 'MM_DEKU_PALACE_CAUGHT', x: 485, y: 398 },
  { renderscene: 'MM_CASTLE_IKANA_ROOM_1', entranceId: 'MM_BOSS_IKANA_CASTLE', x: 479, y: 293 },
  { renderscene: 'MM_TEMPLE_WOODFALL_ROOM_0', entranceId: 'MM_BOSS_TEMPLE_WOODFALL_WARP_OUT', x: 470, y: 517 },
  { renderscene: 'MM_TEMPLE_SNOWHEAD_ROOM_0', entranceId: 'MM_BOSS_TEMPLE_SNOWHEAD_WARP_OUT', x: 632, y: 296 },
  { renderscene: 'MM_TEMPLE_GREAT_BAY_ROOM_0', entranceId: 'MM_BOSS_TEMPLE_GREAT_BAY_WARP_OUT', x: 373, y: 323 },
  { renderscene: 'MM_TEMPLE_STONE_TOWER_ROOM_0', entranceId: 'OOT_BOSS_SPIRIT_TEMPLE_WARP_OUT', x: 478, y: 525 },
  { renderscene: 'MM_TEMPLE_STONE_TOWER_INVERTED_ROOM_0', entranceId: 'MM_BOSS_TEMPLE_STONE_TOWER_INVERTED_WARP_OUT', x: 469, y: 413 },
];

