/**
 * Manual zone mapping with their subscenes (grottos, etc.)
 * Used for zones that require explicit subscene control
 */

export interface SubsceneInfo {
  renderscene: string;
  displayName?: string;
}

export type SubsceneEntry = string | SubsceneInfo;

export const zoneMapping: Record<string, { game: 'oot' | 'mm'; subscenes: SubsceneEntry[]; displayName?: string; }> = {

  // ==================
  // OCARINA OF TIME
  // ==================

  OOT_DEATH_MOUNTAIN_CRATER: {
    game: 'oot',
    displayName: 'Death Mountain Crater',
    subscenes: [
      { renderscene: 'OOT_DEATH_MOUNTAIN_CRATER', displayName: 'Death Mountain Crater' },
      { renderscene: 'OOT_GROTTO_DEATH_CRATER_GENERIC', displayName: 'Generic Grotto' },
      { renderscene: 'OOT_GROTTO_DEATH_CRATER_SCRUBS', displayName: 'Deku Scrubs Grotto' },
      { renderscene: 'OOT_GREAT_FAIRY_MAGIC2', displayName: 'Great Fairy Fountain' },
    ]
  },

  OOT_DEATH_MOUNTAIN_TRAIL: {
    game: 'oot',
    displayName: 'Death Mountain Trail',
    subscenes: [
      { renderscene: 'OOT_GROTTO_DEATH_TRIAL_COW', displayName: 'Cow Grotto' },
      { renderscene: 'OOT_GROTTO_DEATH_TRIAL_STORMS', displayName: 'Song of Storms Grotto' },
      { renderscene: 'OOT_GREAT_FAIRY_MAGIC', displayName: 'Great Fairy Fountain' },
    ]
  },

  OOT_DESERT_COLOSSUS: {
    game: 'oot',
    displayName: 'Desert Colossus',
    subscenes: [
      { renderscene: 'OOT_DESERT_COLOSSUS', displayName: 'Desert Colossus' },
      { renderscene: 'OOT_GROTTO_DESERT_SCRUBS', displayName: 'Deku Scrubs Grotto' },
      { renderscene: 'OOT_GREAT_FAIRY_NAYRU', displayName: 'Great Fairy Fountain' },
    ]
  },

  OOT_GERUDO_FORTRESS: {
    game: 'oot',
    displayName: 'Gerudo Fortress',
    subscenes: [
      { renderscene: 'OOT_GERUDO_FORTRESS', displayName: 'Gerudo Fortress' },
      { renderscene: 'OOT_THIEVES_HIDEOUT', displayName: 'Thieves Hideout' },
      { renderscene: 'OOT_FAIRY_GERUDO_FORTRESS', displayName: 'Fairy Fountain' },
    ]
  },

  OOT_GERUDO_TRAINING_GROUNDS: {
    game: 'oot',
    displayName: 'Gerudo Training Ground',
    subscenes: [
      { renderscene: 'OOT_GERUDO_TRAINING_GROUND', displayName: 'Gerudo Training Ground' },
    ]
  },

  OOT_GERUDO_VALLEY: {
    game: 'oot',
    displayName: 'Gerudo Valley',
    subscenes: [
      { renderscene: 'OOT_GERUDO_VALLEY', displayName: 'Gerudo Valley' },
      { renderscene: 'OOT_GROTTO_VALLEY_OCTOROK', displayName: 'Octorok Grotto' },
      { renderscene: 'OOT_GROTTO_VALLEY_STORMS', displayName: 'Song of Storms Grotto' },
    ]
  },

  OOT_GORON_CITY: {
    game: 'oot',
    displayName: 'Goron City',
    subscenes: [
      { renderscene: 'OOT_GORON_CITY', displayName: 'Goron City' },
      { renderscene: 'OOT_GROTTO_GORON_CITY_SCRUBS', displayName: 'Deku Scrubs Grotto' },
      { renderscene: 'OOT_GORON_SHOP', displayName: 'Goron Shop' },
    ]
  },

  OOT_GRAVEYARD: {
    game: 'oot',
    displayName: 'Graveyard',
    subscenes: [
      { renderscene: 'OOT_GRAVEYARD', displayName: 'Graveyard' },
      { renderscene: 'OOT_TOMB_REDEAD', displayName: "Redead's Tomb" },
      { renderscene: 'OOT_TOMB_ROYAL', displayName: "Royal's Family Tomb" },
      { renderscene: 'OOT_TOMB_FAIRY', displayName: "Fairy's Fountain Tomb" },
      { renderscene: 'OOT_TOMB_DAMPE_WINDMILL', displayName: "Dampe's Tomb" },
    ]
  },

  OOT_HAUNTED_WASTELAND: {
    game: 'oot',
    displayName: 'Haunted Wasteland',
    subscenes: [
      { renderscene: 'OOT_HAUNTED_WASTELAND', displayName: 'Haunted Wasteland' },
    ]
  },

  OOT_HYRULE_GANON_CASTLE: {
    game: 'oot',
    displayName: "Hyrule / Ganon's Castle Exterior",
    subscenes: [
      { renderscene: 'OOT_CASTLE_COURTYARD', displayName: 'Castle Courtyard' },
      { renderscene: 'OOT_GANON_CASTLE_EXTERIOR', displayName: 'Ganon Castle Exterior' },
      { renderscene: 'OOT_HYRULE_CASTLE', displayName: 'Hyrule Castle' },
      { renderscene: 'OOT_GREAT_FAIRY_CASTLE', displayName: 'Great Fairy Fountain' },
      { renderscene: 'OOT_GROTTO_CASTLE_STORMS', displayName: 'Song of Storms Grotto' },
    ]
  },

  OOT_HYRULE_FIELD: {
    game: 'oot',
    displayName: 'Hyrule Field',
    subscenes: [
      { renderscene: 'OOT_HYRULE_FIELD', displayName: 'Hyrule Field' },
      { renderscene: 'OOT_GROTTO_HYRULE_GERUDO', displayName: 'Cow Grotto' },
      { renderscene: 'OOT_GROTTO_HYRULE_KAKARIKO', displayName: 'Kakariko Side Grotto' },
      { renderscene: 'OOT_GROTTO_HYRULE_MARKET', displayName: 'Market Side Grotto' },
      { renderscene: 'OOT_GROTTO_HYRULE_OPEN', displayName: 'Open Grotto' },
      { renderscene: 'OOT_GROTTO_HYRULE_SCRUBS', displayName: 'Deku Scrubs Grotto' },
      { renderscene: 'OOT_GROTTO_HYRULE_SE', displayName: 'Southeast Grotto' },
      { renderscene: 'OOT_GROTTO_HYRULE_TEKTITE', displayName: 'Tektite Grotto' },
      { renderscene: 'OOT_FAIRY_HYRULE', displayName: 'Fairy Fountain' },
    ]
  },

  OOT_KAKARIKO_VILLAGE: {
    game: 'oot',
    displayName: 'Kakariko Village',
    subscenes: [
      { renderscene: 'OOT_KAKARIKO_VILLAGE', displayName: 'Kakariko Village' },
      { renderscene: 'OOT_KAKARIKO_BAZAAR', displayName: 'Bazaar' },
      { renderscene: 'OOT_IMPA_HOUSE', displayName: "Impa's House" },
      { renderscene: 'OOT_GRANNY_POTION_SHOP', displayName: 'Granny Potion Shop' },
      { renderscene: 'OOT_KAKARIKO_POTION_SHOP', displayName: 'Potion Shop' },
      { renderscene: 'OOT_GROTTO_KAKARIKO_OPEN', displayName: 'Open Grotto' },
      { renderscene: 'OOT_GROTTO_KAKARIKO_REDEAD', displayName: 'Redead Grotto' },
      { renderscene: 'OOT_KAKARIKO_SHOOTING', displayName: 'Shooting Gallery' },
      { renderscene: 'OOT_WINDMILL', displayName: 'Windmill' },
      { renderscene: 'OOT_HOUSE_OF_SKULLTULA', displayName: 'House of Skulltula' },
    ]
  },

  OOT_KOKIRI_FOREST: {
    game: 'oot',
    displayName: 'Kokiri Forest',
    subscenes: [
      { renderscene: 'OOT_KOKIRI_FOREST', displayName: 'Kokiri Forest' },
      { renderscene: 'OOT_LINK_HOUSE', displayName: "Link's House" },
      { renderscene: 'OOT_KOKIRI_MIDO', displayName: "Mido's House" },
      { renderscene: 'OOT_KOKIRI_SARIA', displayName: "Saria's House" },
      { renderscene: 'OOT_KOKIRI_KNOW_IT_ALL', displayName: "Know-It-All Brother's House" },
      { renderscene: 'OOT_KOKIRI_TWINS', displayName: "Twins's House" },
      { renderscene: 'OOT_KOKIRI_SHOP', displayName: 'Shop' },
      { renderscene: 'OOT_GROTTO_KOKIRI_FOREST_STORMS', displayName: 'Song of Storms Grotto' },
    ]
  },

  OOT_LAKE_HYLIA: {
    game: 'oot',
    displayName: 'Lake Hylia',
    subscenes: [
      { renderscene: 'OOT_LAKE_HYLIA', displayName: 'Lake Hylia' },
      { renderscene: 'OOT_GROTTO_LAKE_HYLIA_SCRUBS', displayName: 'Deku Scrubs Grotto' },
      { renderscene: 'OOT_FISHING_POND', displayName: 'Fishing Pond' },
      { renderscene: 'OOT_LABORATORY', displayName: 'Laboratory' },
    ]
  },

  OOT_LON_LON_RANCH: {
    game: 'oot',
    displayName: "Lon Lon Ranch",
    subscenes: [
      { renderscene: 'OOT_LON_LON_RANCH', displayName: "Lon Lon Ranch" },
      { renderscene: 'OOT_GROTTO_LON_LON_SCRUBS', displayName: 'Deku Scrubs Grotto' },
      { renderscene: 'OOT_RANCH_HOUSE_SILO', displayName: "Talon's House" },
      { renderscene: 'OOT_SILO', displayName: 'Silo' },
      { renderscene: 'OOT_STABLE', displayName: 'Stable' },
    ]
  },

  OOT_LOST_WOODS: {
    game: 'oot',
    displayName: 'Lost Woods',
    subscenes: [
      { renderscene: 'OOT_LOST_WOODS', displayName: 'Lost Woods' },
      { renderscene: 'OOT_GROTTO_LOST_WOODS_GENERIC', displayName: 'Generic Grotto' },
      { renderscene: 'OOT_GROTTO_LOST_WOODS_SCRUB_UPGRADE', displayName: 'Deku Scrubs Grotto' },
      { renderscene: 'OOT_GROTTO_LOST_WOODS_THEATER', displayName: "Deku's Theater Grotto" },
    ]
  },

  OOT_MARKET: {
    game: 'oot',
    displayName: 'Market',
    subscenes: [
      { renderscene: 'OOT_MARKET_CHILD_DAY', displayName: 'Market - Day' },
      { renderscene: 'OOT_MARKET_CHILD_NIGHT', displayName: 'Market - Night' },
      { renderscene: 'OOT_TREASURE_SHOP', displayName: 'Treasure Shop' },
      { renderscene: 'OOT_BACK_ALLEY_HOUSE', displayName: "Back Alley's House" },
      { renderscene: 'OOT_BACK_ALLEY_HOUSE2', displayName: "Dog Lady's House" },
      { renderscene: 'OOT_MARKET_BAZAAR', displayName: 'Bazaar' },
      { renderscene: 'OOT_BOMBCHU_SHOP', displayName: 'Bombchu Shop' },
      { renderscene: 'OOT_GUARD_HOUSE', displayName: 'Guard House' },
      { renderscene: 'OOT_MARKET_POTION_SHOP', displayName: 'Potion Shop' },
      { renderscene: 'OOT_MARKET_SHOOTING', displayName: 'Shooting Gallery' },
      { renderscene: 'OOT_BOMBCHU_BOWLING_ALLEY', displayName: 'Bombchu Bowling' },
    ]
  },

  OOT_SACRED_FOREST_MEADOW: {
    game: 'oot',
    displayName: 'Sacred Forest Meadow',
    subscenes: [
      { renderscene: 'OOT_SACRED_FOREST_MEADOW', displayName: 'Sacred Forest Meadow' },
      { renderscene: 'OOT_GROTTO_SACRED_MEADOW_STORMS', displayName: 'Song of Storms Grotto' },
      { renderscene: 'OOT_GROTTO_SACRED_MEADOW_WOLFOS', displayName: 'Wolfos Grotto' },
      { renderscene: 'OOT_FAIRY_SACRED_MEADOW', displayName: 'Fairy Fountain' },
    ]
  },

  OOT_TEMPLE_OF_TIME: {
    game: 'oot',
    displayName: 'Temple of Time',
    subscenes: [
      { renderscene: 'OOT_TEMPLE_OF_TIME', displayName: 'Temple of Time' },
    ]
  },

  OOT_ZORA_DOMAIN: {
    game: 'oot',
    displayName: "Zora's Domain",
    subscenes: [
      { renderscene: 'OOT_ZORA_DOMAIN', displayName: "Zora's Domain" },
      { renderscene: 'OOT_ZORA_SHOP', displayName: "Zora's Shop" },
      { renderscene: 'OOT_FAIRY_ZORA_DOMAIN', displayName: 'Fairy Fountain' },
    ]
  },

  OOT_ZORA_FOUNTAIN: {
    game: 'oot',
    displayName: "Zora's Fountain",
    subscenes: [
      { renderscene: 'OOT_ZORA_FOUNTAIN', displayName: "Zora's Fountain" },
      { renderscene: 'OOT_GREAT_FAIRY_FARORE', displayName: 'Great Fairy Fountain' },
    ]
  },

  OOT_ZORA_RIVER: {
    game: 'oot',
    displayName: "Zora's River",
    subscenes: [
      { renderscene: 'OOT_ZORA_RIVER', displayName: "Zora's River" },
      { renderscene: 'OOT_GROTTO_ZORA_RIVER_GENERIC', displayName: 'Generic Grotto' },
      { renderscene: 'OOT_GROTTO_ZORA_RIVER_STORMS', displayName: 'Song of Storms Grotto' },
      { renderscene: 'OOT_FAIRY_ZORA_RIVER', displayName: 'Fairy Fountain' },
    ]
  },

  // OoT dungeons (empty subscenes = handled by roomMapping)
  OOT_DEKU_TREE: {
    game: 'oot',
    displayName: 'Deku Tree',
    subscenes: []
  },

  OOT_DODONGO_CAVERN: {
    game: 'oot',
    displayName: "Dodongo's Cavern",
    subscenes: []
  },

  OOT_INSIDE_JABU_JABU: {
    game: 'oot',
    displayName: "Jabu Jabu's Belly",
    subscenes: [
      { renderscene: 'OOT_LAIR_BARINADE', displayName: 'Boss (Barinade)' },
    ]
  },

  OOT_BOTTOM_OF_THE_WELL: {
    game: 'oot',
    displayName: 'Bottom of the Well',
    subscenes: []
  },

  OOT_ICE_CAVERN: {
    game: 'oot',
    displayName: 'Ice Cavern',
    subscenes: []
  },

  OOT_TEMPLE_FOREST: {
    game: 'oot',
    displayName: 'Forest Temple',
    subscenes: [
      { renderscene: 'OOT_LAIR_PHANTOM_GANON', displayName: 'Boss (Phantom Ganon)' },
    ]
  },

  OOT_TEMPLE_FIRE: {
    game: 'oot',
    displayName: 'Fire Temple',
    subscenes: [
      { renderscene: 'OOT_LAIR_VOLVAGIA', displayName: 'Boss (Volvagia)' },
    ]
  },

  OOT_TEMPLE_WATER: {
    game: 'oot',
    displayName: 'Water Temple',
    subscenes: [
      { renderscene: 'OOT_LAIR_MORPHA', displayName: 'Boss (Morpha)' },
    ]
  },

  OOT_TEMPLE_SHADOW: {
    game: 'oot',
    displayName: 'Shadow Temple',
    subscenes: [
      { renderscene: 'OOT_LAIR_BONGO_BONGO', displayName: 'Boss (Bongo Bongo)' },
    ]
  },

  OOT_TEMPLE_SPIRIT: {
    game: 'oot',
    displayName: 'Spirit Temple',
    subscenes: [
      { renderscene: 'OOT_LAIR_TWINROVA', displayName: 'Boss (Twinrova)' },
    ]
  },

  OOT_INSIDE_GANON_CASTLE: {
    game: 'oot',
    displayName: "Ganon's Castle",
    subscenes: [
      { renderscene: 'OOT_INSIDE_GANON_CASTLE', displayName: "Ganon's Castle" },
      { renderscene: 'OOT_GANON_TOWER', displayName: 'Ganon Tower' },
    ]
  },

  // ==================
  // MAJORA'S MASK
  // ==================

  // Clock Town
  MM_CLOCK_TOWN_SOUTH: {
    game: 'mm',
    displayName: 'South Clock Town',
    subscenes: [
      { renderscene: 'MM_CLOCK_TOWN_SOUTH', displayName: 'South Clock Town' },
      { renderscene: 'MM_CLOCK_TOWER_ROOFTOP', displayName: 'Clock Tower Rooftop' },
    ]
  },

  MM_CLOCK_TOWN_NORTH: {
    game: 'mm',
    displayName: 'North Clock Town',
    subscenes: [
      { renderscene: 'MM_CLOCK_TOWN_NORTH', displayName: 'North Clock Town' },
      { renderscene: 'MM_DEKU_PLAYGROUND', displayName: 'Deku Playground' },
      { renderscene: 'MM_FAIRY_CLOCK_TOWN', displayName: 'Great Fairy Fountain' },
    ]
  },

  MM_CLOCK_TOWN_EAST: {
    game: 'mm',
    displayName: 'East Clock Town',
    subscenes: [
      { renderscene: 'MM_CLOCK_TOWN_EAST', displayName: 'East Clock Town' },
      { renderscene: 'MM_TREASURE_SHOP', displayName: 'Treasure Shop' },
      { renderscene: 'MM_HONEY_DARLING', displayName: 'Honey & Darling' },
      { renderscene: 'MM_SHOOTING_GALLERY', displayName: 'Shooting Gallery' },
      { renderscene: 'MM_MAYOR_HOUSE', displayName: "Mayor's Office" },
      { renderscene: 'MM_MILK_BAR', displayName: 'Milk Bar' },
      { renderscene: 'MM_OBSERVATORY', displayName: 'Astral Observatory' },
    ]
  },

  MM_CLOCK_TOWN_WEST: {
    game: 'mm',
    displayName: 'West Clock Town',
    subscenes: [
      { renderscene: 'MM_CLOCK_TOWN_WEST', displayName: 'West Clock Town' },
      { renderscene: 'MM_BOMB_SHOP', displayName: 'Bomb Shop' },
      { renderscene: 'MM_CURIOSITY_SHOP', displayName: 'Curiosity Shop' },
      { renderscene: 'MM_LOTTERY', displayName: 'Lottery' },
      { renderscene: 'MM_SWORDSMAN_SCHOOL', displayName: 'Swordsman School' },
      { renderscene: 'MM_TRADING_POST', displayName: 'Trading Post' },
      { renderscene: 'MM_POST_OFFICE', displayName: 'Post Office' },
    ]
  },

  MM_LAUNDRY_POOL: {
    game: 'mm',
    displayName: 'Laundry Pool',
    subscenes: [
      { renderscene: 'MM_LAUNDRY_POOL', displayName: 'Laundry Pool' },
      
    ]
  },

  MM_DEKU_PALACE: {
    game: 'mm',
    displayName: "Deku's Palace",
    subscenes: [
      { renderscene: 'MM_DEKU_PALACE', displayName: "Deku's Palace" },
      { renderscene: 'MM_GROTTO_DEKU_PALACE_BEANS', displayName: 'Beans Grotto' },
      { renderscene: 'MM_DEKU_SHRINE', displayName: "Deku's Shrine" },
      { renderscene: 'MM_DEKU_KING_CHAMBER', displayName: "Deku King's Chamber" },
      { renderscene: 'MM_GROTTO_DEKU_PALACE_GENERIC', displayName: 'Deku Palace Grotto' },
    ]
  },
    MM_GORON_VILLAGE: {
    game: 'mm',
    displayName: "Goron Village",
    subscenes: [
      { renderscene: 'MM_GORON_VILLAGE_WINTER', displayName: "Goron's Village" },
      { renderscene: 'MM_GORON_SHOP', displayName: "Goron's Shop" },
      { renderscene: 'MM_LONE_PEAK', displayName: "Lone Peak Shrine" },
      { renderscene: 'MM_GORON_SHRINE', displayName: "Goron's Shrine" },
    ]
  },

  MM_GREAT_BAY_COAST: {
    game: 'mm',
    displayName: 'Great Bay Coast',
    subscenes: [
      { renderscene: 'MM_GREAT_BAY_COAST', displayName: 'Great Bay Coast' },
      { renderscene: 'MM_GROTTO_GREAT_BAY_COAST_COW', displayName: 'Cow Grotto' },
      { renderscene: 'MM_GROTTO_GREAT_BAY_COAST_FISHERMAN', displayName: 'Fisherman Grotto' },
      { renderscene: 'MM_LABORATORY', displayName: 'Laboratory' },
    ]
  },

  MM_IKANA_CANYON: {
    game: 'mm',
    displayName: 'Ikana Canyon',
    subscenes: [
      { renderscene: 'MM_IKANA_CANYON', displayName: 'Ikana Canyon' },
      { renderscene: 'MM_GROTTO_IKANA_VALLEY_OPEN', displayName: 'Open Grotto' },
      { renderscene: 'MM_MUSIC_BOX_HOUSE', displayName: 'Music Box House' },
      { renderscene: 'MM_GHOST_HUT', displayName: 'Ghost Hut' },
      { renderscene: 'MM_SAKON_HIDEOUT', displayName: "Sakon's Hideout" },
      { renderscene: 'MM_FAIRY_IKANA', displayName: "Great Fairy" },
    ]
  },

  MM_IKANA_GRAVEYARD: {
    game: 'mm',
    displayName: 'Ikana Graveyard',
    subscenes: [
      { renderscene: 'MM_IKANA_GRAVEYARD', displayName: 'Ikana Graveyard' },
      { renderscene: 'MM_GROTTO_IKANA_GRAVEYARD_GENERIC', displayName: 'Generic Grotto' },
      { renderscene: 'MM_BENEATH_THE_GRAVEYARD', displayName: 'Beneath the Graveyard' },
      { renderscene: 'MM_DAMPE_HOUSE', displayName: "Dampe's House" },
    ]
  },

  MM_MILK_ROAD: {
    game: 'mm',
    displayName: 'Milk Road',
    subscenes: [
      { renderscene: 'MM_MILK_ROAD', displayName: 'Milk Road' },
      { renderscene: 'MM_GORMAN_TRACK', displayName: 'Gorman Track' },
    ]
  },

  MM_PATH_MOUNTAIN_VILLAGE: {
    game: 'mm',
    displayName: 'Path to Snowhead',
    subscenes: [
      { renderscene: 'MM_PATH_MOUNTAIN_VILLAGE_WINTER', displayName: 'Path to Mountain Village Winter' },
      { renderscene: 'MM_PATH_MOUNTAIN_VILLAGE_SPRING', displayName: 'Path to Mountain Village Spring' },
    ]
  },

MM_MOUNTAIN_VILLAGE: {
  game: 'mm',
  displayName: 'Mountain Village',
  subscenes: [
    { renderscene: 'MM_MOUNTAIN_VILLAGE', displayName: 'Mountain Village (Winter)' },
    { renderscene: 'MM_MOUNTAIN_VILLAGE_SPRING', displayName: 'Mountain Village (Spring)' },
    { renderscene: 'MM_GROTTO_MOUNTAIN_VILLAGE_GENERIC', displayName: 'Tunnel Grotto' },
    { renderscene: 'MM_GORON_GRAVEYARD', displayName: 'Goron Graveyard' },
    { renderscene: 'MM_BLACKSMITH', displayName: 'Blacksmith' },
  ]
},

  MM_PATH_SNOWHEAD: {
    game: 'mm',
    displayName: 'Path to Snowhead',
    subscenes: [
      { renderscene: 'MM_PATH_SNOWHEAD_WINTER', displayName: 'Path to Snowhead Winter' },
      { renderscene: 'MM_PATH_SNOWHEAD_SPRING', displayName: 'Path to Snowhead Spring' },
      { renderscene: 'MM_GROTTO_PATH_TO_SNOWHEAD_GENERIC', displayName: 'Generic Grotto' },
      { renderscene: 'MM_SNOWHEAD', displayName: 'Snowhead' },
      { renderscene: 'MM_FAIRY_SNOWHEAD', displayName: 'Fairy Snowhead' },
    ]
  },

  MM_PINNACLE_ROCK: {
    game: 'mm',
    displayName: 'Pinnacle Rock',
    subscenes: [
      { renderscene: 'MM_PINNACLE_ROCK', displayName: 'Pinnacle Rock' },
    ]
  },

  MM_ROAD_IKANA: {
    game: 'mm',
    displayName: 'Road to Ikana',
    subscenes: [
      { renderscene: 'MM_ROAD_IKANA', displayName: 'Road to Ikana' },
      { renderscene: 'MM_GROTTO_IKANA_ROAD_GENERIC', displayName: 'Generic Grotto' },
    ]
  },

  MM_ROAD_SOUTHERN_SWAMP: {
    game: 'mm',
    displayName: 'Road to Southern Swamp',
    subscenes: [
      { renderscene: 'MM_ROAD_SOUTHERN_SWAMP', displayName: 'Road to Southern Swamp' },
      { renderscene: 'MM_GROTTO_SOUTHERN_SWAMP_ROAD_OPEN', displayName: 'Open Grotto' },
      { renderscene: 'MM_SHOOTING_GALLERY_SWAMP', displayName: 'Shooting Gallery' },
    ]
  },

  MM_ROMANI_RANCH: {
    game: 'mm',
    displayName: 'Romani Ranch',
    subscenes: [
      { renderscene: 'MM_ROMANI_RANCH', displayName: 'Romani Ranch' },
      { renderscene: 'MM_RANCH_HOUSE_BARN', displayName: 'Stables' },
      { renderscene: 'MM_CUCCO_SHACK', displayName: 'Cucco Shack' },
      { renderscene: 'MM_DOG_RACETRACK', displayName: 'Dog Racetrack' },
    ]
  },

  MM_SOUTHERN_SWAMP: {
    game: 'mm',
    displayName: 'Southern Swamp',
    subscenes: [
      { renderscene: 'MM_SOUTHERN_SWAMP', displayName: 'Southern Swamp' },
      { renderscene: 'MM_WOODS_MYSTERY', displayName: 'Woods of Mystery' },
      { renderscene: 'MM_GROTTO_SOUTHERN_SWAMP_OPEN', displayName: 'Open Grotto' },
      { renderscene: 'MM_GROTTO_WOODS_OF_MYSTERY_OPEN', displayName: 'Woods of Mystery Grotto' },
      { renderscene: 'MM_TOURIST_INFORMATION', displayName: 'Tourist Information' },
      { renderscene: 'MM_POTION_SHOP', displayName: 'Potion Shop' },
    ]
  },

  MM_TERMINA_FIELD: {
    game: 'mm',
    displayName: 'Termina Field',
    subscenes: [
      { renderscene: 'MM_TERMINA_FIELD', displayName: 'Termina Field' },
      { renderscene: 'MM_GROTTO_TERMINA_BIO_BABA', displayName: 'Bio Baba Grotto' },
      { renderscene: 'MM_GROTTO_TERMINA_CANYON_GOSSIP', displayName: 'Canyon Gossip Grotto' },
      { renderscene: 'MM_GROTTO_TERMINA_COW', displayName: 'Cow Grotto' },
      { renderscene: 'MM_GROTTO_TERMINA_DODONGO', displayName: 'Dodongo Grotto' },
      { renderscene: 'MM_GROTTO_TERMINA_OCEAN_GOSSIP', displayName: 'Ocean Gossip Grotto' },
      { renderscene: 'MM_GROTTO_TERMINA_PEAHAT', displayName: 'Peahat Grotto' },
      { renderscene: 'MM_GROTTO_TERMINA_PILLAR', displayName: 'Pillar Grotto' },
      { renderscene: 'MM_GROTTO_TERMINA_SCRUB', displayName: 'Scrub Grotto' },
      { renderscene: 'MM_GROTTO_TERMINA_TALL_GRASS', displayName: 'Tall Grass Grotto' },
      { renderscene: 'MM_FAIRY_FOUNTAIN', displayName: 'Fairy Fountain' },
      
    ]
  },

  MM_TWIN_ISLANDS: {
    game: 'mm',
    displayName: 'Twin Islands',
    subscenes: [
      { renderscene: 'MM_TWIN_ISLANDS', displayName: 'Twin Islands Winter' },
      { renderscene: 'MM_TWIN_ISLANDS_SPRING', displayName: 'Twin Islands Spring' },
      { renderscene: 'MM_GROTTO_TWIN_ISLANDS_FROZEN', displayName: 'Frozen Grotto' },
      { renderscene: 'MM_GROTTO_TWIN_ISLANDS_RAMP', displayName: 'Ramp Grotto' },
      { renderscene: 'MM_GORON_RACETRACK', displayName: 'Goron Racetrack' },
    ]
  },

  MM_ZORA_CAPE: {
    game: 'mm',
    displayName: 'Zora Cape',
    subscenes: [
      { renderscene: 'MM_ZORA_CAPE', displayName: 'Zora Cape' },
      { renderscene: 'MM_WATERFALL_RAPIDS', displayName: 'Waterfall Rapids' },
      { renderscene: 'MM_FAIRY_GREAT_BAY_COAST', displayName: 'Great Fairy' },
      { renderscene: 'MM_GROTTO_ZORA_CAPE_GENERIC', displayName: 'Generic Grotto' },
    ]
  },

  MM_ZORA_HALL: {
    game: 'mm',
    displayName: 'Zora Hall',
    subscenes: [
      { renderscene: 'MM_ZORA_HALL', displayName: 'Zora Hall' },
      { renderscene: 'MM_ZORA_HALL_ROOMS', displayName: 'Zora Hall Rooms' },
      { renderscene: 'MM_ZORA_EVANS_ROOM', displayName: 'Zora Evans Room' },
      { renderscene: 'MM_ZORA_SHOP', displayName: 'Zora Shop' },
    ]
  },

  MM_MOON: {
    game: 'mm',
    displayName: 'Moon',
    subscenes: [
      { renderscene: 'MM_MOON', displayName: 'Moon' },
      { renderscene: 'MM_MOON_DEKU', displayName: 'Deku Trial' },
      { renderscene: 'MM_MOON_GORON', displayName: 'Goron Trial' },
      { renderscene: 'MM_MOON_ZORA', displayName: 'Zora Trial' },
      { renderscene: 'MM_MOON_LINK', displayName: 'Link Trial' },
      { renderscene: 'MM_LAIR_MAJORA', displayName: 'Majora Lair' },
    ]
  },

  // MM dungeons (empty subscenes = handled by roomMapping)
  MM_TEMPLE_WOODFALL: {
    game: 'mm',
    displayName: 'Woodfall Temple',
    subscenes: [
      { renderscene: 'MM_LAIR_ODOLWA', displayName: 'Boss (Odolwa)' },
    ]
  },

  MM_TEMPLE_SNOWHEAD: {
    game: 'mm',
    displayName: 'Snowhead Temple',
    subscenes: [
      { renderscene: 'MM_LAIR_GOHT', displayName: 'Boss (Goht)' },
    ]
  },

  MM_TEMPLE_GREAT_BAY: {
    game: 'mm',
    displayName: 'Great Bay Temple',
    subscenes: [
      { renderscene: 'MM_LAIR_GYORG', displayName: 'Boss (Gyorg)' },
    ]
  },

MM_TEMPLE_STONE_TOWER: {
  game: 'mm',
  displayName: 'Stone Tower Temple',
  subscenes: []
},

MM_TEMPLE_STONE_TOWER_INVERTED: {
  game: 'mm',
  displayName: 'Inverted Stone Tower Temple', 
  subscenes: [
    { renderscene: 'MM_LAIR_TWINMOLD', displayName: 'Boss (Twinmold)' },
  ]
},

  MM_BENEATH_THE_WELL: {
    game: 'mm',
    displayName: 'Beneath the Well',
    subscenes: [
      { renderscene: 'MM_BENEATH_THE_WELL', displayName: 'Beneath the Well' },
    ]
  },

  MM_CASTLE_IKANA: {
    game: 'mm',
    displayName: 'Ikana Castle',
    subscenes: [
      { renderscene: 'MM_LAIR_IKANA', displayName: 'Boss ( Ikana)' },
    ]
  },

  MM_SPIDER_HOUSE_SWAMP: {
    game: 'mm',
    displayName: 'Swamp Spider House',
    subscenes: []
  },

  MM_SPIDER_HOUSE_OCEAN: {
    game: 'mm',
    displayName: 'Ocean Spider House',
    subscenes: []
  },

  MM_PIRATE_FORTRESS: {
    game: 'mm',
    displayName: 'Pirate Fortress',
    subscenes: [
      { renderscene: 'MM_PIRATE_FORTRESS_ENTRANCE', displayName: 'Pirate Fortress Entrance' },
      { renderscene: 'MM_PIRATE_FORTRESS_EXTERIOR', displayName: 'Pirate Fortress Exterior' },
      { renderscene: 'MM_PIRATE_FORTRESS_INTERIOR', displayName: 'Pirate Fortress Interior' },
    ]
  },

  MM_OBSERVATORY: {
    game: 'mm',
    displayName: 'Observatory',
    subscenes: []
  },

  MM_STOCK_POT_INN: {
    game: 'mm',
    displayName: 'Stock Pot Inn',
    subscenes: []
  },
};