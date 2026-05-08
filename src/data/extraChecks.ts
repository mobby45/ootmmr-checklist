// src/data/extraChecks.ts
export interface ExtraCheck {
  id: string;
  name: string;
  scene: string;
  renderscene: string;
  type: string;
  x: number;
  y: number;
  game: 'oot' | 'mm';
}

export const extraChecks: ExtraCheck[] = [
  { id: 'TINGLE_MAP_WOODFALL_2', name: 'Tingle Map Woodfall', scene: 'MM_CLOCK_TOWN_NORTH', renderscene: 'MM_CLOCK_TOWN_NORTH', type: 'npc', x: 414, y: 148, game: 'mm' },
  { id: 'TINGLE_MAP_SNOWHEAD_2', name: 'Tingle Map Snowhead', scene: 'MM_ROAD_SOUTHERN_SWAMP', renderscene: 'MM_ROAD_SOUTHERN_SWAMP', type: 'npc', x: 581, y: 248, game: 'mm' },
  { id: 'TINGLE_MAP_RANCH_2', name: 'Tingle Map Ranch', scene: 'MM_TWIN_ISLANDS', renderscene: 'MM_TWIN_ISLANDS', type: 'npc', x: 659, y: 200, game: 'mm' },
  { id: 'TINGLE_MAP_GREAT_BAY_2', name: 'Tingle Map Great Bay', scene: 'MM_MILK_ROAD', renderscene: 'MM_MILK_ROAD', type: 'npc', x: 669, y: 200, game: 'mm' },
  { id: 'TINGLE_MAP_IKANA_2', name: 'Tingle Map Ikana', scene: 'MM_GREAT_BAY_COAST', renderscene: 'MM_GREAT_BAY_COAST', type: 'npc', x: 330, y: 504, game: 'mm' },
  { id: 'TINGLE_MAP_CLOCK_TOWN_2', name: 'Tingle Map Clock Town', scene: 'MM_IKANA_CANYON', renderscene: 'MM_IKANA_CANYON', type: 'npc', x: 364, y: 455, game: 'mm' },
];