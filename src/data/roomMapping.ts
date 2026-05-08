export interface RoomInfo {
  roomId: number;
  roomName: string;
  imagePath: string;
}

/* =========================
   OCARINA OF TIME ROOMS
========================= */

export const OoTRooms: Record<string, RoomInfo[]> = {

  OOT_DEKU_TREE: [
    { roomId: 0, roomName: "1F", imagePath: "OoT/oot_deku_tree_1f.jpg" },
    { roomId: 1, roomName: "2F", imagePath: "OoT/oot_deku_tree_2f.jpg" },
    { roomId: 2, roomName: "3F", imagePath: "OoT/oot_deku_tree_3f.jpg" },
    { roomId: 3, roomName: "B1", imagePath: "OoT/oot_deku_tree_b1.jpg" },
    { roomId: 4, roomName: "B2", imagePath: "OoT/oot_deku_tree_b2.jpg" },
  ],

  OOT_DEATH_MOUNTAIN_TRAIL: [
    { roomId: 0, roomName: "Bottom", imagePath: "OoT/oot_death_mountain_trail_bottom.png" },
    { roomId: 1, roomName: "Middle", imagePath: "OoT/oot_death_mountain_trail_middle.png" },
    { roomId: 2, roomName: "Top", imagePath: "OoT/oot_death_mountain_trail_top.png" }
  ],

  OOT_DODONGO_CAVERN: [
    { roomId: 0, roomName: "1F", imagePath: "OoT/oot_dodongo_cavern_1f.jpg" },
    { roomId: 1, roomName: "2F", imagePath: "OoT/oot_dodongo_cavern_2f.jpg" },
  ],

  OOT_INSIDE_JABU_JABU: [
    { roomId: 0, roomName: "1F", imagePath: "OoT/oot_jabu_jabu_1f.jpg" },
    { roomId: 1, roomName: "B1", imagePath: "OoT/oot_jabu_jabu_b1.jpg" },
  ],

  OOT_ICE_CAVERN: [
    { roomId: 0, roomName: "Ice Cavern", imagePath: "OoT/oot_ice_cavern.jpg" },
  ],

  OOT_TEMPLE_FOREST: [
    { roomId: 0, roomName: "1F", imagePath: "OoT/oot_forest_temple_1f.jpg" },
    { roomId: 1, roomName: "2F", imagePath: "OoT/oot_forest_temple_2f.jpg" },
    { roomId: 2, roomName: "B1", imagePath: "OoT/oot_forest_temple_b1.jpg" },
    { roomId: 3, roomName: "B2", imagePath: "OoT/oot_forest_temple_b2.jpg" },
  ],

  OOT_TEMPLE_FIRE: [
    { roomId: 0, roomName: "1F", imagePath: "OoT/oot_fire_temple_1f.jpg" },
    { roomId: 1, roomName: "2F", imagePath: "OoT/oot_fire_temple_2f.jpg" },
    { roomId: 2, roomName: "3F", imagePath: "OoT/oot_fire_temple_3f.jpg" },
    { roomId: 3, roomName: "4F", imagePath: "OoT/oot_fire_temple_4f.jpg" },
    { roomId: 4, roomName: "5F", imagePath: "OoT/oot_fire_temple_5f.jpg" }
  ],

  OOT_TEMPLE_WATER: [
    { roomId: 0, roomName: "1F", imagePath: "OoT/oot_water_temple_1f.jpg" },
    { roomId: 1, roomName: "2F", imagePath: "OoT/oot_water_temple_2f.jpg" },
    { roomId: 2, roomName: "3F", imagePath: "OoT/oot_water_temple_3f.jpg" },
    { roomId: 3, roomName: "B1", imagePath: "OoT/oot_water_temple_b1.jpg" }
  ],

  OOT_TEMPLE_SHADOW: [
    { roomId: 0, roomName: "B1", imagePath: "OoT/oot_shadow_temple_b1.jpg" },
    { roomId: 1, roomName: "B2", imagePath: "OoT/oot_shadow_temple_b2.jpg" },
    { roomId: 2, roomName: "B3", imagePath: "OoT/oot_shadow_temple_b3.jpg" },
    { roomId: 3, roomName: "B4", imagePath: "OoT/oot_shadow_temple_b4.jpg" },
    { roomId: 4, roomName: "B5", imagePath: "OoT/oot_shadow_temple_b5.jpg" },
  ],

  OOT_TEMPLE_SPIRIT: [
    { roomId: 0, roomName: "1F", imagePath: "OoT/oot_spirit_temple_1f.jpg" },
    { roomId: 1, roomName: "2F", imagePath: "OoT/oot_spirit_temple_2f.jpg" },
    { roomId: 2, roomName: "3F", imagePath: "OoT/oot_spirit_temple_3f.jpg" },
    { roomId: 3, roomName: "4F", imagePath: "OoT/oot_spirit_temple_4f.jpg" },
  ],

  OOT_BOTTOM_OF_THE_WELL: [
    { roomId: 0, roomName: "B1", imagePath: "OoT/oot_bottom_of_the_well_b1.jpg" },
    { roomId: 1, roomName: "B2", imagePath: "OoT/oot_bottom_of_the_well_b2.jpg" }
  ],

  OOT_GANON_TOWER: [
    { roomId: 0, roomName: "Ganon's Tower - Boss Key Room", imagePath: "OoT/oot_ganon_tower_bk.png" },
    { roomId: 1, roomName: "Ganon's Tower - Pots Room", imagePath: "OoT/oot_ganon_tower_pots.png" }
  ],
};

/* =========================
   MAJORA'S MASK ROOMS
========================= */

export const MMRooms: Record<string, RoomInfo[]> = {

  MM_OBSERVATORY: [
    { roomId: 0, roomName: "Observatory", imagePath: "MM/mm_observatory.png" },
    { roomId: 1, roomName: "Passage", imagePath: "MM/mm_observatory_passage.png" }
  ],

  MM_STOCK_POT_INN: [
    { roomId: 0, roomName: "Lobby", imagePath: "MM/mm_stock_pot_inn_lobby.png" },
    { roomId: 1, roomName: "Back", imagePath: "MM/mm_stock_pot_inn_back.png" },
    { roomId: 2, roomName: "Rooms", imagePath: "MM/mm_stock_pot_inn_rooms.png" }
  ],

  MM_CASTLE_IKANA: [
    { roomId: 0, roomName: "Castle Exterior", imagePath: "MM/mm_castle_ikana_exterior.png" },
    { roomId: 1, roomName: "Castle Interior", imagePath: "MM/mm_castle_ikana_inside.png" }
  ],

  MM_SPIDER_HOUSE_OCEAN: [
    { roomId: 0, roomName: "Lobby", imagePath: "MM/mm_spider_house_ocean_lobby.png" },
    { roomId: 1, roomName: "Main Room", imagePath: "MM/mm_spider_house_ocean_main.png" },
    { roomId: 2, roomName: "Library Room", imagePath: "MM/mm_spider_house_ocean_library.png" },
    { roomId: 3, roomName: "Masks Room", imagePath: "MM/mm_spider_house_ocean_masks.png" },
    { roomId: 4, roomName: "Storage Room", imagePath: "MM/mm_spider_house_ocean_storage.png" }
  ],

  MM_SPIDER_HOUSE_SWAMP: [
    { roomId: 0, roomName: "Lobby", imagePath: "MM/mm_spider_house_swamp_lobby.png" },
    { roomId: 1, roomName: "Main Room", imagePath: "MM/mm_spider_house_swamp_main_room.png" },
    { roomId: 2, roomName: "Gold Room", imagePath: "MM/mm_spider_house_swamp_gold_room.png" },
    { roomId: 3, roomName: "Monument Room", imagePath: "MM/mm_spider_house_swamp_monument_room.png" },
    { roomId: 4, roomName: "Pots Room", imagePath: "MM/mm_spider_house_swamp_pots_room.png" },
    { roomId: 5, roomName: "Tree Room", imagePath: "MM/mm_spider_house_swamp_tree_room.png" }
  ],

  MM_TEMPLE_WOODFALL: [
    { roomId: 0, roomName: "Entrance", imagePath: "MM/mm_woodfall_entrance.png" },
    { roomId: 1, roomName: "Pre-Boss Room", imagePath: "MM/mm_woodfall_pre-boss.png" },
    { roomId: 2, roomName: "Central Room", imagePath: "MM/mm_woodfall_central.png" },
    { roomId: 3, roomName: "Maze Room", imagePath: "MM/mm_woodfall_maze.png" },
    { roomId: 4, roomName: "Compass Room", imagePath: "MM/mm_woodfall_compass.png" },
    { roomId: 5, roomName: "Water Room", imagePath: "MM/mm_woodfall_water.png" },
    { roomId: 6, roomName: "Map Room", imagePath: "MM/mm_woodfall_map.png" },
    { roomId: 7, roomName: "Dinalfos Room", imagePath: "MM/mm_woodfall_dinalfos.png" },
    { roomId: 8, roomName: "Geeko Room", imagePath: "MM/mm_woodfall_geeko.png" },
    { roomId: 9, roomName: "Dark Room", imagePath: "MM/mm_woodfall_dark.png" },
    { roomId: 10, roomName: "Pits Room", imagePath: "MM/mm_woodfall_pits.png" },
    { roomId: 11, roomName: "Boss Room", imagePath: "MM/mm_woodfall_boss.png" }
  ],

  MM_TEMPLE_SNOWHEAD: [
    { roomId: 0, roomName: "Entrance", imagePath: "MM/mm_snowhead_entrance.png" },
    { roomId: 1, roomName: "Central Room", imagePath: "MM/mm_snowhead_central.png" },
    { roomId: 2, roomName: "Bridge Room", imagePath: "MM/mm_snowhead_bridge.png" },
    { roomId: 3, roomName: "Compass Room", imagePath: "MM/mm_snowhead_compass.png" },
    { roomId: 4, roomName: "Blocks Room", imagePath: "MM/mm_snowhead_blocks.png" },
    { roomId: 5, roomName: "Pillars Room", imagePath: "MM/mm_snowhead_pillars.png" },
    { roomId: 6, roomName: "Fire Arrow Room", imagePath: "MM/mm_snowhead_fire_arrow.png" },
    { roomId: 7, roomName: "Icicle Room", imagePath: "MM/mm_snowhead_icicle.png" },
    { roomId: 8, roomName: "Dual Switches Room", imagePath: "MM/mm_snowhead_dual_switches.png" },
    { roomId: 9, roomName: "Map Room", imagePath: "MM/mm_snowhead_map.png" },
    { roomId: 10, roomName: "Snow Room", imagePath: "MM/mm_snowhead_snow.png" },
    { roomId: 11, roomName: "Dinalfos Room", imagePath: "MM/mm_snowhead_dinalfos.png" },
    { roomId: 12, roomName: "Wizzrobe Room", imagePath: "MM/mm_snowhead_wizzrobe.png" },
    { roomId: 13, roomName: "Boss Room", imagePath: "MM/mm_snowhead_boss.png" }
  ],

  MM_TEMPLE_GREAT_BAY: [
    { roomId: 0, roomName: "Entrance", imagePath: "MM/mm_great_bay_entrance.png" },
    { roomId: 1, roomName: "Water Wheel Room", imagePath: "MM/mm_great_bay_water_wheel.png" },
    { roomId: 2, roomName: "Central Room", imagePath: "MM/mm_great_bay_central.png" },
    { roomId: 3, roomName: "Geeko Room", imagePath: "MM/mm_great_bay_geeko.png" },
    { roomId: 4, roomName: "Map Room", imagePath: "MM/mm_great_bay_map.png" },
    { roomId: 5, roomName: "Red Pipe Room", imagePath: "MM/mm_great_bay_red_pipe.png" },
    { roomId: 6, roomName: "Bio-Baba Room", imagePath: "MM/mm_great_bay_bio_baba.png" },
    { roomId: 7, roomName: "Boss Key Room", imagePath: "MM/mm_great_bay_boss_key.png" },
    { roomId: 8, roomName: "Before Wart Room", imagePath: "MM/mm_great_bay_before_wart.png" },
    { roomId: 9, roomName: "Wart Room", imagePath: "MM/mm_great_bay_wart.png" },
    { roomId: 10, roomName: "Green Pipe Water Wheel Room", imagePath: "MM/mm_great_bay_green_pipe_2.png" },
    { roomId: 11, roomName: "Moving Platform Room", imagePath: "MM/mm_great_bay_moving_platform.png" },
    { roomId: 12, roomName: "Pre-Boss Room", imagePath: "MM/mm_great_bay_pre_boss.png" },
    { roomId: 13, roomName: "Green Pipe Room", imagePath: "MM/mm_great_bay_green_pipe.png" },
    { roomId: 14, roomName: "Chuchu Before Wart Room", imagePath: "MM/mm_great_bay_chuchu.png" },
    { roomId: 15, roomName: "Boss Room", imagePath: "MM/mm_great_bay_boss.png" }
  ],

  MM_TEMPLE_STONE_TOWER: [
    { roomId: 0, roomName: "Entrance", imagePath: "MM/mm_stone_tower_entrance.png" },
    { roomId: 1, roomName: "Central Room", imagePath: "MM/mm_stone_tower_central.png" },
    { roomId: 2, roomName: "Maze Room", imagePath: "MM/mm_stone_tower_maze.png" },
    { roomId: 3, roomName: "Water Room", imagePath: "MM/mm_stone_tower_water.png" },
    { roomId: 4, roomName: "Lava Room", imagePath: "MM/mm_stone_tower_lava.png" },
    { roomId: 5, roomName: "Mirrors Room", imagePath: "MM/mm_stone_tower_mirrors.png" },
    { roomId: 6, roomName: "Hiploop Bridge Room", imagePath: "MM/mm_stone_tower_hiploop.png" },
    { roomId: 7, roomName: "Wind Room", imagePath: "MM/mm_stone_tower_wind.png" },
    { roomId: 8, roomName: "Garo Master Room", imagePath: "MM/mm_stone_tower_garo.png" }
  ],

  MM_TEMPLE_STONE_TOWER_INVERTED: [
    { roomId: 0, roomName: "Inverted Entrance", imagePath: "MM/mm_stone_tower_inverted_entrance.png" },
    { roomId: 1, roomName: "Inverted Central Room", imagePath: "MM/mm_stone_tower_inverted_central.png" },
    { roomId: 2, roomName: "Inverted Maze Room", imagePath: "MM/mm_stone_tower_inverted_maze.png" },
    { roomId: 3, roomName: "Inverted Water Room", imagePath: "MM/mm_stone_tower_inverted_water.png" },
    { roomId: 4, roomName: "Inverted Lava Room", imagePath: "MM/mm_stone_tower_inverted_lava.png" },
    { roomId: 5, roomName: "Inverted Hiploop Bridge Room", imagePath: "MM/stone_tower_inverted_hiploop.png" },
    { roomId: 6, roomName: "Inverted Gomess Room", imagePath: "MM/mm_stone_tower_inverted_gomess.png" },
    { roomId: 7, roomName: "Inverted Boss Room", imagePath: "MM/mm_stone_tower_inverted_boss.png" }
  ]
};