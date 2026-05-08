import { OoTRooms, MMRooms } from '../data/roomMapping';
import { zoneMapping } from '../data/zoneMapping';
import { extraChecks } from '../data/extraChecks';

export interface MapCheck {
  id: string;
  scene: string;
  renderscene: string;
  friendlyName: string;
  name: string;
  x: number;
  y: number;
  z: number;
  type: string;
  room: string;
  context?: string;
  game?: 'oot' | 'mm';
  canBeMq?: boolean;
  isMq?: boolean;
  game_layout?: string;
  canHaveVariant?: boolean;
  variantNumber?: number;
}

export interface SceneData {
  game: 'oot' | 'mm';
  displayName?: string;
  subscenes: {
    [renderscene: string]: {
      image: string;
      checks: MapCheck[];
      displayName: string;
    };
  };
}

export interface MapData {
  [scene: string]: SceneData;
}

function parseCSV(csv: string, game: 'oot' | 'mm'): MapCheck[] {
  const lines = csv.trim().split('\n').slice(1);
  const checks: MapCheck[] = [];



  lines
    .filter(line => line.trim())
    .forEach(line => {
      const parts = line.split(';');
      const gameLayout = parts[13]?.trim() || 'all';
      const checkName = parts[3]?.trim() || '';

      checks.push({
        id: parts[0]?.trim() || '',
        scene: parts[1]?.trim() || '',
        friendlyName: parts[2]?.trim() || '',
        name: checkName,
        type: parts[4]?.trim() || '',
        x: parseInt(parts[5]?.trim() || '0'),
        y: parseInt(parts[6]?.trim() || '0'),
        z: parseInt(parts[7]?.trim() || '0'),
        renderscene: parts[8]?.trim() || parts[1]?.trim() || '',
        context: parts[11]?.trim() || 'All',
        room: parts[12]?.trim() || '0',
        game: game,
        game_layout: gameLayout,
        canBeMq: false,
        isMq: false,
        canHaveVariant: gameLayout.includes('_jp') || gameLayout === 'mm' || gameLayout === 'mm_jp',
        variantNumber: gameLayout.includes('_jp') || gameLayout === 'mm_jp' ? 1 : 0,
      });
    });

  const sceneOverrides: Record<string, string> = {
    'TINGLE_MAP_CLOCK_TOWN': 'MM_CLOCK_TOWN_NORTH',
    'TINGLE_MAP_GREAT_BAY': 'MM_GREAT_BAY_COAST',
    'TINGLE_MAP_STONE_TOWER': 'MM_IKANA_CANYON',
    'TINGLE_MAP_ROMANI_RANCH': 'MM_MILK_ROAD',
    'TINGLE_MAP_SNOWHEAD': 'MM_TWIN_ISLANDS',
    'TINGLE_MAP_WOODFALL': 'MM_ROAD_SOUTHERN_SWAMP',
  };

  const rendersceneOverrides: Record<string, string> = {
    'MM_MOUNTAIN_VILLAGE_SPRING': 'MM_MOUNTAIN_VILLAGE_SPRING',
    'MM_TWIN_ISLANDS_SPRING': 'MM_TWIN_ISLANDS_SPRING',
  };



  checks.forEach(check => {
    if (rendersceneOverrides[check.scene]) {
      check.renderscene = rendersceneOverrides[check.scene];
    }
  });

  checks.forEach(check => {
    if (sceneOverrides[check.id]) {
      check.scene = sceneOverrides[check.id];
      check.renderscene = sceneOverrides[check.id];
    }
  });

  checks.forEach(check => {
    if (check.scene === 'MM_PATH_SNOWHEAD') {
      const ctx = check.context?.toLowerCase();
      if (ctx === 'spring') {
        check.renderscene = 'MM_PATH_SNOWHEAD_SPRING';
      } else {
        check.renderscene = 'MM_PATH_SNOWHEAD_WINTER';
      }
    }
  });

  checks.forEach(check => {
    if (check.scene === 'MM_PATH_MOUNTAIN_VILLAGE') {
      const ctx = check.context?.toLowerCase();
      if (ctx === 'spring') {
        check.renderscene = 'MM_PATH_MOUNTAIN_VILLAGE_SPRING';
      } else {
        check.renderscene = 'MM_PATH_MOUNTAIN_VILLAGE_WINTER';
      }
    }
  });

  const mqDungeons = new Set([
    'OOT_DEKU_TREE',
    'OOT_DODONGO_CAVERN',
    'OOT_INSIDE_JABU_JABU',
    'OOT_TEMPLE_FOREST',
    'OOT_TEMPLE_FIRE',
    'OOT_TEMPLE_WATER',
    'OOT_TEMPLE_SHADOW',
    'OOT_TEMPLE_SPIRIT',
    'OOT_BOTTOM_OF_THE_WELL',
    'OOT_ICE_CAVERN',
    'OOT_INSIDE_GANON_CASTLE'
  ]);

  const coordOverrides: Record<string, { x: number; y: number }> = {
    'MM Moon Trial Goron Pot 03|MM_MOON_GORON': { x: 673, y: 243 },
    'MM Moon Trial Goron Pot 04|MM_MOON_GORON': { x: 685, y: 243 },
    'MM Moon Trial Goron Pot 05|MM_MOON_GORON': { x: 660, y: 243 },

    'OOT Kokiri Shop Item 6|OOT_KOKIRI_SHOP': { x: 623, y: 334 },
    'OOT Kokiri Shop Item 7|OOT_KOKIRI_SHOP': { x: 573, y:  386},
    'OOT Kokiri Shop Item 8|OOT_KOKIRI_SHOP': { x: 623, y: 386},

    'OOT Kakariko Bazaar Item 1|OOT_KAKARIKO_BAZAAR': { x: 327, y: 290 },
    'OOT Kakariko Bazaar Item 2|OOT_KAKARIKO_BAZAAR': { x: 367, y: 290 },
    'OOT Kakariko Bazaar Item 3|OOT_KAKARIKO_BAZAAR': { x: 327, y: 328 },
    'OOT Kakariko Bazaar Item 4|OOT_KAKARIKO_BAZAAR': { x: 367, y: 328 },
    'OOT Kakariko Bazaar Item 7|OOT_KAKARIKO_BAZAAR': { x: 624, y: 328 },
    'OOT Kakariko Bazaar Item 8|OOT_KAKARIKO_BAZAAR': { x: 664, y: 328 },

    'OOT Goron Shop Item 5|OOT_GORON_SHOP': { x: 582, y: 229 },
    'OOT Goron Shop Item 6|OOT_GORON_SHOP': { x: 669, y: 229 },
    'OOT Goron Shop Item 7|OOT_GORON_SHOP': { x: 582, y: 288 },
    'OOT Goron Shop Item 8|OOT_GORON_SHOP': { x: 669, y: 288 },

    'OOT Market Bazaar Item 1|OOT_MARKET_BAZAAR': { x: 327, y: 290 },
    'OOT Market Bazaar Item 2|OOT_MARKET_BAZAAR': { x: 367, y: 290 },
    'OOT Market Bazaar Item 3|OOT_MARKET_BAZAAR': { x: 327, y: 328 },
    'OOT Market Bazaar Item 4|OOT_MARKET_BAZAAR': { x: 367, y: 328 },
    'OOT Market Bazaar Item 7|OOT_MARKET_BAZAAR': { x: 624, y: 328 },
    'OOT Market Bazaar Item 8|OOT_MARKET_BAZAAR': { x: 664, y: 328 },

    'OOT Market Bombchu Shop Item 1|OOT_BOMBCHU_SHOP': { x: 342, y: 226 },
    'OOT Market Bombchu Shop Item 2|OOT_BOMBCHU_SHOP': { x: 412, y: 226 },
    'OOT Market Bombchu Shop Item 3|OOT_BOMBCHU_SHOP': { x: 342, y: 276 },
    'OOT Market Bombchu Shop Item 4|OOT_BOMBCHU_SHOP': { x: 412, y: 276 },
    'OOT Market Bombchu Shop Item 5|OOT_BOMBCHU_SHOP': { x: 574, y: 226 },
    'OOT Market Bombchu Shop Item 6|OOT_BOMBCHU_SHOP': { x: 644, y: 226 },
    'OOT Market Bombchu Shop Item 7|OOT_BOMBCHU_SHOP': { x: 574, y: 276 },
    'OOT Market Bombchu Shop Item 8|OOT_BOMBCHU_SHOP': { x: 644, y: 276 },

    // ajouter d'autres au besoin
  };

  checks.forEach(check => {
    const key = `${check.name}|${check.renderscene}`;
    if (coordOverrides[key]) {
      check.x = coordOverrides[key].x;
      check.y = coordOverrides[key].y;
    }
  });

  checks.forEach(check => {
    const isDungeonCheck = mqDungeons.has(check.renderscene);
    const isMqByName = check.name.startsWith('OOT MQ ');
    const isCommon = check.game_layout === 'all' && !isMqByName && !check.name.includes(' Vanilla ');

    if (isDungeonCheck && !isCommon) {
      check.canBeMq = true;
      check.isMq = isMqByName;
    } else {
      check.canBeMq = false;
      check.isMq = false;
    }
  });

  return checks.filter(c => c.scene && c.name);
}

export function rendersceneToDisplayName(renderscene: string): string {
  const parts = renderscene.split('_');

  const gamePrefixes = new Set(['OOT', 'MM']);
  const nameParts = gamePrefixes.has(parts[0]) ? parts.slice(1) : parts;

  return nameParts
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export async function buildMapData(mqSettings?: Map<string, boolean>): Promise<MapData> {

  const ootResponse = await fetch('/ootmmr-checklist/src/data/pool_oot.csv');
  const mmResponse = await fetch('/ootmmr-checklist/src/data/pool_mm.csv');

  const ootCSV = await ootResponse.text();
  const mmCSV = await mmResponse.text();

  const ootChecks = parseCSV(ootCSV, 'oot');
  const mmChecks = parseCSV(mmCSV, 'mm');
  const allChecks = [...ootChecks, ...mmChecks];

  const validChecks = allChecks.filter(check => check.type !== 'none');

  // Convertir les extra checks en MapCheck
  const extraMapChecks: MapCheck[] = extraChecks.map(e => ({
    id: e.id,
    scene: e.scene,
    renderscene: e.renderscene,
    friendlyName: e.name,
    name: e.name,
    x: e.x,
    y: e.y,
    z: 10,
    type: e.type,
    room: '0',
    game: e.game,
    game_layout: 'all',
    canBeMq: false,
    isMq: false,
    canHaveVariant: false,
    variantNumber: 0,
  }));

  // All combined checks (CSV + extra)
  const allValidChecks = [...validChecks, ...extraMapChecks];

  function matchesLayout(check: MapCheck, sceneName: string): boolean {
    if (check.game_layout === 'all') return true;
    if (!mqSettings) return true;

    const isMQ = mqSettings.get(sceneName) || false;

    if (check.game_layout === 'mq') return isMQ;
    if (check.game_layout === 'vanilla') return !isMQ;

    return true;
  }

  const mapData: MapData = {};
  const processedScenes = new Set<string>();

  // ========================================
  // STEP 1: Process zones with ROOMS
  // ========================================

  Object.entries(OoTRooms).forEach(([sceneName, rooms]) => {
    mapData[sceneName] = { game: 'oot', subscenes: {} };

    rooms.forEach(roomInfo => {
      const roomChecks = allValidChecks.filter(check =>
        check.renderscene === sceneName &&
        parseInt(check.room || '0') === roomInfo.roomId &&
        check.game === 'oot' &&
        matchesLayout(check, sceneName)
      );

      if (roomChecks.length > 0) {
        mapData[sceneName].subscenes[`${sceneName}_ROOM_${roomInfo.roomId}`] = {
          image: roomInfo.imagePath,
          checks: roomChecks,
          displayName: roomInfo.roomName
        };
      }
    });

    processedScenes.add(sceneName);
  });

  Object.entries(MMRooms).forEach(([sceneName, rooms]) => {
    mapData[sceneName] = { game: 'mm', subscenes: {} };

    rooms.forEach(roomInfo => {
      const roomChecks = allValidChecks.filter(check =>
        check.renderscene === sceneName &&
        parseInt(check.room || '0') === roomInfo.roomId &&
        check.game === 'mm' &&
        matchesLayout(check, sceneName)
      );

      if (roomChecks.length > 0) {
        mapData[sceneName].subscenes[`${sceneName}_ROOM_${roomInfo.roomId}`] = {
          image: roomInfo.imagePath,
          checks: roomChecks,
          displayName: roomInfo.roomName
        };
      }
    });

    processedScenes.add(sceneName);
  });

  // ========================================
  // STEP 2: Process zones WITHOUT rooms
  // ========================================

  const rendersceneToParent = new Map<string, string>();
  allChecks.forEach(check => {
    if (check.type === 'none' && check.scene !== check.renderscene) {
      rendersceneToParent.set(check.renderscene, check.scene);
    }
  });

  function processSubsceneEntry(
    mainScene: string,
    game: 'oot' | 'mm',
    subsceneEntry: string | { renderscene: string; displayName?: string }
  ) {
    const renderscene = typeof subsceneEntry === 'string'
      ? subsceneEntry
      : subsceneEntry.renderscene;

    const customDisplayName = typeof subsceneEntry === 'string'
      ? null
      : subsceneEntry.displayName;

    // SPECIAL CASE: renderscene already in mapData via roomMapping → merge
    if (mapData[renderscene] && renderscene !== mainScene) {
      Object.entries(mapData[renderscene].subscenes).forEach(([subKey, subData]) => {
        mapData[mainScene].subscenes[subKey] = subData;
      });
      delete mapData[renderscene];
      processedScenes.delete(renderscene);
      return;
    }

    // Cas normal : subscene simple — utilise allValidChecks pour inclure les extra checks
    const sceneChecks = allValidChecks.filter(check =>
      check.renderscene === renderscene &&
      check.game === game
    );

    if (sceneChecks.length > 0) {
      const gameFolder = game === 'oot' ? 'OoT' : 'MM';
      mapData[mainScene].subscenes[renderscene] = {
        image: `${gameFolder}/${renderscene.toLowerCase()}.png`,
        checks: sceneChecks,
        displayName: customDisplayName || rendersceneToDisplayName(renderscene)
      };
    }

    processedScenes.add(renderscene);
  }

  Object.entries(zoneMapping).forEach(([mainScene, config]) => {
    if (processedScenes.has(mainScene)) {
      if (config.displayName) {
        mapData[mainScene].displayName = config.displayName;
      }
      config.subscenes.forEach(entry => processSubsceneEntry(mainScene, config.game, entry));
      return;
    }

    mapData[mainScene] = {
      game: config.game,
      subscenes: {},
      displayName: config.displayName || rendersceneToDisplayName(mainScene)
    };

    config.subscenes.forEach(entry => processSubsceneEntry(mainScene, config.game, entry));

    processedScenes.add(mainScene);
  });

  // Process remaining zones with the automatic system
  allValidChecks.forEach(check => {
    const mainScene = rendersceneToParent.get(check.renderscene) || check.scene;

    if (processedScenes.has(mainScene)) return;

    const mainScenePrefix = mainScene.split('_')[0];
    const renderscenePrefix = check.renderscene.split('_')[0];

    if (mainScene !== check.renderscene && mainScenePrefix !== renderscenePrefix) {
      return;
    }

    const gameFolder = check.game === 'oot' ? 'OoT' : 'MM';

    if (!mapData[mainScene]) {
      mapData[mainScene] = { game: check.game!, subscenes: {} };
    }

    if (!mapData[mainScene].subscenes[check.renderscene]) {
      mapData[mainScene].subscenes[check.renderscene] = {
        image: `${gameFolder}/${check.renderscene.toLowerCase()}.png`,
        checks: [],
        displayName: rendersceneToDisplayName(check.renderscene),
      };
    }

    mapData[mainScene].subscenes[check.renderscene].checks.push(check);
  });

  return mapData;
}