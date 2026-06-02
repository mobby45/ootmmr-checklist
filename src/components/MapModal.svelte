<script context="module" lang="ts">
  import { writable } from 'svelte/store';
  export const hiddenTypesStore = writable(new Set<string>());

  const savedZoom = new Map<string, { scale: number; panX: number; panY: number }>();
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { MapCheck, SceneData, MapData } from '../util/mapData';
  import { rendersceneToDisplayName } from '../util/mapData';
  import * as T from '../data/types';
  import { onMount, onDestroy, tick } from 'svelte';
import { allEntrances, findReverseEntrance } from '../data/entranceData';
import type { EntranceInfo } from '../data/entranceData';
  import { entrancePositions } from '../data/entrancePositions';
  import { YAML_ENTRANCE_IDS } from '../data/yamlEntranceIds';

  const dispatch = createEventDispatcher();

  export let scene: string = '';
  export let sceneData: SceneData;
  export let allScenes: string[] = [scene];
  export let navScenes: string[] = [];   // checklist-ordered scenes for ‹ › navigation
  export let allScenesData: MapData | null = null;
  export let checkStates: Map<string, T.CheckState> = new Map();
  export let filteredCheckNames: Set<string> = new Set();
  export let checkNameMappingReverse: Record<string, string> = {};
  export let showAgeFilter = true;
  export let ageFilter: 'child' | 'adult' = 'child';
  export let shopItems: Map<string, string> = new Map();
  export let shopPrices: Map<string, number> = new Map();
  export let shopScrubIds: Set<string> = new Set();
  export let scenePings: Array<{ id: string; xPct: number; yPct: number; pseudo: string; subscene: string; checkName?: string; color?: string }> = [];
  export let erSettings: Record<string, boolean> = {};
  export let entranceValues: Map<string, string> = new Map();
  export let initialSubscene: string = '';

  let currentSubscene = Object.keys(sceneData.subscenes)[0];
  let imageWidth = 1;
  let imageHeight = 1;
  let imageLoaded = false;
  let imageError = false;
  $: { currentSubscene; imageError = false; imageLoaded = false; displayW = 0; displayH = 0; }

  // Zoom / pan
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panOriginX = 0;
  let panOriginY = 0;
  let hasDragged = false;

  $: counterScale = scale > 1 ? 1 / Math.sqrt(scale) : 1;

  function clampPan() {
    if (!mapOuterEl || !mapImageEl) return;
    if (scale <= 1) { panX = 0; panY = 0; return; }
    const { ox, oy } = getImageOrigin();
    const outerW = mapOuterEl.clientWidth;
    const outerH = mapOuterEl.clientHeight;
    const cw = mapImageEl.clientWidth;
    const ch = mapImageEl.clientHeight;
    const minX = outerW - ox - cw * scale;
    const maxX = -ox;
    const minY = outerH - oy - ch * scale;
    const maxY = -oy;
    // When scaled image fits in container, keep it visually centered
    panX = minX > maxX ? cw * (1 - scale) / 2 : Math.max(minX, Math.min(maxX, panX));
    panY = minY > maxY ? ch * (1 - scale) / 2 : Math.max(minY, Math.min(maxY, panY));
  }

  function applyZoom(newScale: number, originX: number, originY: number) {
    if (mapOuterEl) {
      const rect = mapOuterEl.getBoundingClientRect();
      const { ox, oy } = getImageOrigin();
      const mx = originX - rect.left - ox;
      const my = originY - rect.top - oy;
      panX = mx - (mx - panX) * (newScale / scale);
      panY = my - (my - panY) * (newScale / scale);
    }
    scale = newScale;
    if (scale === 1) { panX = 0; panY = 0; }
    clampPan();
  }

  function resetZoom() { scale = 1; panX = 0; panY = 0; clampPan(); }

  function zoomIn() {
    const ns = Math.min(8, scale * 1.35);
    if (ns === scale) return;
    if (mapOuterEl) {
      const rect = mapOuterEl.getBoundingClientRect();
      applyZoom(ns, rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else {
      scale = ns;
    }
  }
  function zoomOut() {
    const ns = Math.max(1, scale / 1.35);
    if (ns === scale) return;
    if (mapOuterEl) {
      const rect = mapOuterEl.getBoundingClientRect();
      applyZoom(ns, rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else {
      scale = ns;
    }
  }

  function onWheel(e: WheelEvent) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.85 : 1.18;
    const ns = Math.min(8, Math.max(1, scale * delta));
    if (ns === scale) return;
    applyZoom(ns, e.clientX, e.clientY);
  }

  function onPointerDown(e: PointerEvent) {
    hasDragged = false;
    if (scale <= 1) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    isPanning = true;
    hasDragged = false;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panOriginX = panX;
    panOriginY = panY;
  }

  function onPointerMove(e: PointerEvent) {
    if (!isPanning) return;
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;
    if (!hasDragged && Math.abs(dx) + Math.abs(dy) > 5) hasDragged = true;
    panX = panOriginX + dx;
    panY = panOriginY + dy;
    clampPan();
  }

  function onPointerUp() { isPanning = false; }

  let mapScrollEl: HTMLElement | undefined;
  let mapOuterEl: HTMLElement | undefined;
  let mapImageEl: HTMLImageElement | undefined;
  let typeFilterWrapEl: HTMLElement | undefined;
  let displayW = 0;
  let displayH = 0;
  let resizeObserver: ResizeObserver | undefined;

  function updateDisplaySize() {
    if (!mapScrollEl || imageWidth <= 1 || imageHeight <= 1) return;
    const cw = mapScrollEl.clientWidth;
    const ch = mapScrollEl.clientHeight;
    const ar = imageWidth / imageHeight;
    let w = cw;
    let h = w / ar;
    if (h > ch) { h = ch; w = h * ar; }
    displayW = Math.round(w);
    displayH = Math.round(h);
  }

  function getImageOrigin(): { ox: number; oy: number } {
    if (!mapOuterEl || !mapImageEl) return { ox: 0, oy: 0 };
    return {
      ox: (mapOuterEl.clientWidth - mapImageEl.clientWidth) / 2,
      oy: (mapOuterEl.clientHeight - mapImageEl.clientHeight) / 2,
    };
  }

  function onImageLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    imageWidth = img.naturalWidth;
    imageHeight = img.naturalHeight;
    imageLoaded = true;
    updateDisplaySize();
  }

  $: activePings = scenePings.filter(p => p.subscene === currentSubscene);

  const typeLabels: Record<string, string> = {
    chest: 'Chest', gold_skulltula: 'Gold Skulltula', pot: 'Pot', grass: 'Grass',
    cow: 'Cow', npc_reward: 'NPC Reward', heart: 'Heart Piece', collectible: 'Collectible',
    stray_fairy: 'Stray Fairy', shop: 'Shop', rupee: 'Rupee', deku_scrub: 'Deku Scrub',
    crate: 'Crate', barrel: 'Barrel', beehive: 'Beehive', rock: 'Rock',
    tree: 'Tree', bush: 'Bush', soft_soil: 'Soft Soil', butterfly: 'Butterfly',
    fairy_fountain: 'Fairy Fountain', fish: 'Fish', wonder_item: 'Wonder Item',
    fairy_spot: 'Fairy Spot', silver_rupee: 'Silver Rupee', snowball: 'Snowball',
    red_boulder: 'Red Boulder', icicle: 'Icicle', red_ice: 'Red Ice',
  };

  let typeDropdownOpen = false;

  // Tooltip state
  let hoveredCheckName = '';
  let showTooltip = false;
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;
  let tooltipX = 0;
  let tooltipY = 0;

  function startHoverTimer(check: MapCheck, e: MouseEvent) {
    tooltipX = e.clientX; tooltipY = e.clientY;
    clearHoverTimer();
    hoverTimer = setTimeout(() => {
      showTooltip = true;
      hoveredCheckName = check.name.replace(/^(OOT|MM) /, '');
    }, 1000);
  }
  function clearHoverTimer() {
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = undefined; }
    showTooltip = false;
    hoveredCheckName = '';
  }

  $: availableTypes = [...new Set(filteredChecks.map(c => c.type))].sort();
  $: availableTypesSet = new Set(availableTypes);
  $: relevantHiddenCount = [...$hiddenTypesStore].filter(t => availableTypesSet.has(t)).length;
  $: displayedChecks = filteredChecks.filter(c => !$hiddenTypesStore.has(c.type));

  function toggleType(type: string) {
    hiddenTypesStore.update(s => {
      const next = new Set(s);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  }
  function showAllTypes() { hiddenTypesStore.set(new Set()); }
  function hideAllTypes() { hiddenTypesStore.set(new Set(availableTypes)); }

  $: positionedChecks = imageWidth > 1
    ? displayedChecks.map(check => ({ check, adjX: (check.x / imageWidth) * 100, adjY: (check.y / imageHeight) * 100 }))
    : [];


  function handleMapContextMenu(e: MouseEvent) {
    e.preventDefault();
    if ((e.target as Element).closest('.map-marker')) return;
    if (!imageLoaded || !mapImageEl || !mapOuterEl) return;
    const rect = mapOuterEl.getBoundingClientRect();
    const { ox, oy } = getImageOrigin();
    const imgX = (e.clientX - rect.left - ox - panX) / scale;
    const imgY = (e.clientY - rect.top - oy - panY) / scale;
    const xPct = (imgX / mapImageEl.clientWidth) * 100;
    const yPct = (imgY / mapImageEl.clientHeight) * 100;
    dispatch('ping', { xPct, yPct, scene, subscene: currentSubscene });
  }

  onMount(async () => {
    document.body.classList.add('modal-open');
    const saved = savedZoom.get(scene);
    if (saved) { scale = saved.scale; panX = saved.panX; panY = saved.panY; }
    await tick();
    requestAnimationFrame(() => {
      updateDisplaySize();
    });
    if (mapScrollEl) {
      resizeObserver = new ResizeObserver(() => requestAnimationFrame(updateDisplaySize));
      resizeObserver.observe(mapScrollEl);
    }
  });

  onDestroy(() => {
    document.body.classList.remove('modal-open');
    resizeObserver?.disconnect();
    if (scale !== 1 || panX !== 0 || panY !== 0)
      savedZoom.set(scene, { scale, panX, panY });
    else
      savedZoom.delete(scene);
  });

  $: subsceneList = Object.keys(sceneData.subscenes).filter(s => {
    const info = sceneData.subscenes[s];
    const variant = variantSettings.get(groupName) ?? 0;
    return !(info.jpOnly && variant !== 1) && !(info.usOnly && variant !== 0);
  });
  $: if (currentSubscene && !subsceneList.includes(currentSubscene)) {
    currentSubscene = subsceneList[0];
  }
  $: currentData = sceneData.subscenes[currentSubscene];
  $: currentImageSrc = currentData ? `/ootmmr-checklist/maps/${currentData.image}` : '';
  export let mqSettings: Map<string, boolean> = new Map();
  export let groupName: string = '';
  export let variantSettings: Map<string, number> = new Map();

  const priceEditIds = new Set([
    'TINGLE_MAP_CLOCK_TOWN', 'TINGLE_MAP_WOODFALL', 'TINGLE_MAP_SNOWHEAD',
    'TINGLE_MAP_ROMANI_RANCH', 'TINGLE_MAP_GREAT_BAY', 'TINGLE_MAP_STONE_TOWER',
    'TALON_MILK', 'CARPET_MERCHANT', 'WITCH_BLUE_POTION', 'MEDIGORON',
  ]);

  const itemOnlyIds = new Set([
    'SCRUB_TELESCOPE', 'SCRUB_SHOP_BEANS', 'SCRUB_BOMB_BAG',
    'SCRUB_SHOP_POTION_GREEN', 'SCRUB_SHOP_POTION_BLUE',
  ]);

  $: filteredChecks = currentData
    ? currentData.checks.filter(check => {
        const nameWithoutPrefix = check.name.replace(/^(OOT|MM) /, '');
        const matchesName = filteredCheckNames.size === 0 || filteredCheckNames.has(check.name) || filteredCheckNames.has(nameWithoutPrefix);

        const matchesAge =
          sceneData.game !== 'oot' ||
          !check.context ||
          check.context.toLowerCase() === ageFilter ||
          check.context.toLowerCase() === 'all';

        const isMqDungeon = mqSettings.get(groupName) ?? false;
        const matchesMq = !check.canBeMq || check.isMq === isMqDungeon;

        const currentVariant = variantSettings.get(groupName) ?? 0;
        const matchesVariant = !check.canHaveVariant || check.variantNumber === currentVariant;

        return matchesName && matchesAge && matchesMq && matchesVariant;
      })
    : [];

  $: if (currentSubscene) {
    imageLoaded = false;
    imageWidth = 1;
    imageHeight = 1;
    scale = 1; panX = 0; panY = 0;
    displayW = 0; displayH = 0;
  }

  $: if (sceneData) {
    const target = initialSubscene && sceneData.subscenes[initialSubscene] ? initialSubscene : Object.keys(sceneData.subscenes)[0];
    currentSubscene = target;
  }

  $: { placementMode; tick().then(() => requestAnimationFrame(updateDisplaySize)); }

  function closeModal() {
    dispatch('close');
  }

  let pendingSubscene: string | null = null;
  $: if (pendingSubscene && sceneData.subscenes[pendingSubscene]) {
    currentSubscene = pendingSubscene;
    pendingSubscene = null;
  }

  function changeMainScene(newScene: string, targetSubscene?: string) {
    pendingSubscene = targetSubscene ?? null;
    dispatch('changeScene', { scene: newScene, subscene: targetSubscene });
    currentSubscene = Object.keys(sceneData.subscenes)[0];
  }

  function navigateToEntrance(entranceId: string) {
    let targetId: string | undefined;
    const destName = entranceValues.get(entranceId);

    if (destName) {
      // Prefer destination's own position (the scene you arrive in)
      const destEnt = allEntrances.find(e => e.name === destName);
      if (destEnt) {
        if (entrancePositions.some(p => p.entranceId === destEnt.id)) targetId = destEnt.id;
        else {
          const rev = findReverseEntrance(destEnt);
          if (rev && entrancePositions.some(p => p.entranceId === rev.id)) targetId = rev.id;
        }
      }
    } else {
      // Unassigned: navigate to vanilla destination via the entrance's own reverse
      const thisEnt = allEntrances.find(e => e.id === entranceId);
      if (thisEnt) {
        const rev = findReverseEntrance(thisEnt);
        if (rev && entrancePositions.some(p => p.entranceId === rev.id)) targetId = rev.id;
      }
    }

    if (targetId) {
      const allPos = entrancePositions.filter(p => p.entranceId === targetId);
      const pos = allPos.find(p => !p.ageFilter || p.ageFilter === ageFilter) ?? allPos[0];
      if (!pos) return;
      const target = pos.renderscene;
      if (sceneData.subscenes[target]) { currentSubscene = target; return; }
      if (!allScenesData) return;
      for (const [sceneKey, sd] of Object.entries(allScenesData)) {
        if (sd.subscenes[target]) { changeMainScene(sceneKey, target); return; }
      }
    } else {
      if (!allScenesData) return;
      // Fallback A: targetScene set on position (one-way entrances)
      const oneWayPos = entrancePositions.find(p => p.entranceId === entranceId && p.targetScene);
      if (oneWayPos) {
        const ts = oneWayPos.targetScene!;
        if (sceneData.subscenes[ts]) { currentSubscene = ts; return; }
        for (const [sceneKey, sd] of Object.entries(allScenesData)) {
          if (sd.subscenes[ts]) { changeMainScene(sceneKey, ts); return; }
        }
        // targetScene is a scene key itself
        if (allScenesData[ts]) { changeMainScene(ts); return; }
      }
      // Fallback B: entrance ID matches its destination renderscene (e.g. OOT_HYRULE_CASTLE)
      if (sceneData.subscenes[entranceId]) { currentSubscene = entranceId; return; }
      for (const [sceneKey, sd] of Object.entries(allScenesData)) {
        if (sd.subscenes[entranceId]) { changeMainScene(sceneKey, entranceId); return; }
      }
    }
  }

  function handleEntranceClick(entranceId: string) {
    if (hasDragged) return;
    if (!placementMode) { navigateToEntrance(entranceId); return; }
  }

  function handleEntranceContextMenu(e: MouseEvent, markerUid: string, entranceId: string, isAuto: boolean) {
    e.preventDefault(); e.stopPropagation();
    if (isAuto) {
      const atIdx = markerUid.lastIndexOf('_at_');
      const posId = atIdx >= 0 ? markerUid.slice(atIdx + 4) : entranceId;
      deleteAutoMarker(posId);
    } else {
      deleteEntranceMarker(markerUid);
    }
  }

  function toggleCheck(check: MapCheck) {
    dispatch('toggleCheck', { checkName: check.name });
  }

  function isShopOrScrub(check: MapCheck): boolean {
    return check.type === 'shop' || check.type === 'scrub' ||
      shopScrubIds.has(check.id) || priceEditIds.has(check.id);
  }

  function getCheckKey(check: MapCheck): string {
    return checkNameMappingReverse[check.name] ?? check.name.replace(/^(OOT|MM) /, '');
  }

  function handleMarkerContextMenu(e: MouseEvent, check: MapCheck) {
    e.preventDefault();
    e.stopPropagation();
    if (hasDragged) return;
    if (isShopOrScrub(check)) {
      dispatch('shopEdit', { checkName: getCheckKey(check) });
    } else {
      const xPct = (check.x / imageWidth) * 100;
      const yPct = (check.y / imageHeight) * 100;
      dispatch('ping', { xPct, yPct, scene, subscene: currentSubscene, checkName: check.name });
    }
  }

  function getMarkerColorByType(type: string): string {
    return getMarkerColor({ type } as MapCheck);
  }

  function getMarkerColor(check: MapCheck): string {
    switch (check.type) {
      case 'chest': return '#8B4513';
      case 'gold_skulltula': return '#FFD700';
      case 'pot': return '#CD853F';
      case 'grass': return '#228B22';
      case 'cow': return '#F5DEB3';
      case 'npc_reward': return '#FF69B4';
      case 'heart': return '#FF0000';
      case 'collectible': return '#FF0000';
      case 'stray_fairy': return '#FF1493';
      case 'shop': return '#4169E1';
      case 'rupee': return '#00FF00';
      case 'deku_scrub': return '#90EE90';
      case 'crate': return '#8B4513';
      case 'barrel': return '#A0522D';
      case 'beehive': return '#FFD700';
      case 'rock': return '#D4AF37';
      case 'tree': return '#654321';
      case 'bush': return '#228B22';
      case 'soft_soil': return '#8B4513';
      case 'butterfly': return '#FF69B4';
      case 'fairy_fountain': return '#FF1493';
      case 'fish': return '#4682B4';
      case 'wonder_item': return '#FFD700';
      case 'fairy_spot': return '#FF1493';
      case 'silver_rupee': return '#8888CC';
      case 'snowball': return '#FFFFFF';
      case 'red_boulder': return '#B04030';
      case 'icicle': return '#87CEEB';
      case 'red_ice': return '#B04030';
      default: return '#FFD700';
    }
  }

  // ==========================================
  // ENTRANCE MARKERS
  // ==========================================
  interface EntranceMarker { uid: string; id: string; renderscene: string; x: number; y: number; _auto?: boolean; }

  $: showEntrances = Object.values(erSettings ?? {}).some(v => v);
  let showEntranceLabels = false;
  let placementMode = false;
  let showAllEntrances = false;
  let placementSearch = '';
  let zoneOnly = true;
  let selectedPlacementEntrances: EntranceInfo[] = [];

  function loadStoredMarkers(): EntranceMarker[] {
    try {
      return (JSON.parse(localStorage.getItem('entranceMarkers') ?? '[]') as EntranceMarker[])
        .map(m => ({ ...m, uid: m.uid ?? (m.id + '_' + Math.random().toString(36).slice(2)) }));
    } catch { return []; }
  }

  let entranceMarkers: EntranceMarker[] = loadStoredMarkers();

  function saveEntranceMarker(id: string, renderscene: string, x: number, y: number) {
    const all = loadStoredMarkers();
    all.push({ uid: id + '_' + Date.now() + '_' + Math.random().toString(36).slice(2), id, renderscene, x, y });
    localStorage.setItem('entranceMarkers', JSON.stringify(all));
    entranceMarkers = [...all];
  }

  function deleteEntranceMarker(uid: string) {
    const all = loadStoredMarkers().filter(m => m.uid !== uid);
    localStorage.setItem('entranceMarkers', JSON.stringify(all));
    entranceMarkers = [...all];
  }

  function placeEntranceAt(e: MouseEvent) {
    if (!selectedPlacementEntrances.length || !mapOuterEl || !mapImageEl || !imageLoaded) return;
    const rect = mapOuterEl.getBoundingClientRect();
    const { ox, oy } = getImageOrigin();
    const imgX = (e.clientX - rect.left - ox - panX) / scale;
    const imgY = (e.clientY - rect.top - oy - panY) / scale;
    const absX = Math.round((imgX / mapImageEl.clientWidth) * imageWidth);
    const absY = Math.round((imgY / mapImageEl.clientHeight) * imageHeight);
    for (const ent of selectedPlacementEntrances) {
      saveEntranceMarker(ent.id, currentSubscene, absX, absY);
    }
  }

  function getEntranceTypeColor(type: string): string {
    switch (type) {
      case 'boss':      return '#FF3333';
      case 'overworld': return '#FF8833';
      case 'dungeon':   return '#FFCC00';
      case 'grotto':    return '#44DD66';
      case 'owl':       return '#00FFDD';
      case 'interior':  return '#4499FF';
      default:          return '#aaaaaa';
    }
  }

  function shortEntranceName(e: EntranceInfo): string {
    const name = e.name;
    let pos = 0;
    while (true) {
      const i = name.indexOf(' to ', pos);
      if (i < 0) break;
      const src = name.slice(0, i);
      const dest = name.slice(i + 4);
      if ((src.startsWith('OOT ') || src.startsWith('MM ')) &&
          (dest.startsWith('OOT ') || dest.startsWith('MM ')))
        return src.replace(/^(OOT|MM) /, '') + ' → ' + dest.replace(/^(OOT|MM) /, '').replace(/ -> .*$/, '').replace(/ - .*$/, '');
      pos = i + 4;
    }
    return name.replace(/^(OOT|MM) /, '');
  }

  function startEntranceHoverTimer(name: string, e: MouseEvent) {
    tooltipX = e.clientX; tooltipY = e.clientY;
    clearHoverTimer();
    hoverTimer = setTimeout(() => { showTooltip = true; hoveredCheckName = name; }, 300);
  }

  $: currentEntranceMarkers = entranceMarkers.filter(m => m.renderscene === currentSubscene);

  function loadDeletedAutoIds(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem('deletedAutoMarkers') ?? '[]') as string[]); }
    catch { return new Set(); }
  }

  let deletedAutoIds: Set<string> = loadDeletedAutoIds();

  function deleteAutoMarker(entranceId: string) {
    const next = new Set(loadDeletedAutoIds());
    next.add(entranceId);
    localStorage.setItem('deletedAutoMarkers', JSON.stringify([...next]));
    deletedAutoIds = next;
  }

  function resetDeletedAutoMarkers() {
    localStorage.setItem('deletedAutoMarkers', '[]');
    deletedAutoIds = new Set();
  }

  $: placementSuggestions = (() => {
    const sceneWords = currentSubscene.toLowerCase().split('_')
      .filter(w => w.length > 2 && w !== 'oot' && w !== 'mm');
    const search = placementSearch.toLowerCase();
    const base = search
      ? allEntrances.filter(e => e.name.toLowerCase().includes(search) || e.id.toLowerCase().includes(search))
      : allEntrances;
    const likely = base.filter(e => sceneWords.some(w => e.name.toLowerCase().includes(w)));
    if (zoneOnly && !search) return likely;
    const rest = base.filter(e => !likely.includes(e));
    return [...likely, ...rest];
  })();

  function isEntranceVisible(ent: { erType: string; hideWhenErActive?: string } | undefined, id: string): boolean {
    if (!ent) return true;
    if (entranceValues.has(id)) return false;
    if (ent.hideWhenErActive) return !erSettings[ent.hideWhenErActive];
    const hasErSettings = Object.keys(erSettings).length > 0;
    if (!hasErSettings) return true;
    return !!erSettings[ent.erType];
  }

  function isEntranceUnshuffled(ent: EntranceInfo | undefined): boolean {
    if (!ent) return false;
    return !YAML_ENTRANCE_IDS.has(ent.id);
  }

  // Manual markers always show regardless of erSettings — user placed them intentionally
  $: visibleEntranceMarkers = currentEntranceMarkers.filter(m => !entranceValues.has(m.id));

  // Pre-computed entrance positions from entrancePositions.ts (Memych data)
  $: currentPrecomputed = entrancePositions.filter(p => p.renderscene === currentSubscene);

  // In placement mode or showAllEntrances: show all precomputed markers regardless of erSettings
  $: visiblePrecomputed = currentPrecomputed.filter(p => {
    if (placementMode || showAllEntrances) return true;
    if (entranceValues.has(p.entranceId)) return false;
    return isEntranceVisible(allEntrances.find(e => e.id === p.entranceId), p.entranceId);
  });

  function filterByAge(items: typeof visiblePrecomputed, age: 'child' | 'adult', game: string) {
    return items.filter(p => !p.ageFilter || game !== 'oot' || p.ageFilter === age);
  }

  $: ageFilteredPrecomputed = filterByAge(visiblePrecomputed, ageFilter, sceneData.game)
    .filter(p => !p.mqOnly || (mqSettings.get(p.mqOnly) ?? false))
    .filter(p => !p.vanillaOnly || !(mqSettings.get(p.vanillaOnly) ?? false))
    .filter(p => !p.jpOnly || (variantSettings.get(p.jpOnly) ?? 0) === 1)
    .filter(p => !p.usOnly || (variantSettings.get(p.usOnly) ?? 0) === 0);



  // Primary: destination entrance ID → source IDs (source marker replaces destination marker)
  // Secondary: reverse entrance ID → source IDs (source marker added alongside reverse marker)
  $: { const r = (() => {
    const primary = new Map<string, string[]>();
    const secondary = new Map<string, string[]>();
    for (const [srcId, destName] of entranceValues) {
      const destEnt = allEntrances.find(e => e.name === destName);
      if (!destEnt) continue;
      const pa = primary.get(destEnt.id) ?? []; pa.push(srcId); primary.set(destEnt.id, pa);
      const rev = findReverseEntrance(destEnt);
      if (rev) { const sa = secondary.get(rev.id) ?? []; sa.push(srcId); secondary.set(rev.id, sa); }
    }
    return { primary, secondary };
  })(); destToSources = r.primary; revToSources = r.secondary; }

  let destToSources = new Map<string, string[]>();
  let revToSources = new Map<string, string[]>();

  // Auto markers: at each precomputed position, show displaced sources (primary) and/or own marker + extra sources (secondary)
  $: autoEntranceMarkers = ageFilteredPrecomputed
    .filter(p => !visibleEntranceMarkers.some(m => m.id === p.entranceId) && !deletedAutoIds.has(p.entranceId))
    .flatMap(p => {
      const sources = destToSources.get(p.entranceId);
      const revSources = revToSources.get(p.entranceId);
      const mk = (id: string, offset: number) => ({
        uid: 'auto_' + id + '_at_' + p.entranceId,
        id,
        renderscene: p.renderscene,
        x: p.x + offset * 10,
        y: p.y,
        _auto: true as const,
      });
      if (sources?.length) {
        // Primary displacement: source known → show source markers only
        return sources.map((srcId, i) => mk(srcId, i));
      }
      if (revSources?.length) {
        // Interior exit: connection known via reverse → show source markers only
        return revSources.map((srcId, i) => mk(srcId, i));
      }
      // Unknown connection — show own vanilla marker
      return [{
        uid: 'auto_' + p.entranceId + '_' + p.renderscene + '_' + p.x + '_' + p.y,
        id: p.entranceId,
        renderscene: p.renderscene,
        x: p.x,
        y: p.y,
        _auto: true as const,
      }];
    });

  // ==========================================
  // ENTRANCE MARKER DRAG
  // ==========================================
  let draggingEntranceUid: string | null = null;
  let dragIsAuto = false;
  let dragPositions: Record<string, { x: number; y: number }> = {};

  function getImageCoordsFromPointer(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!mapOuterEl || !mapImageEl) return null;
    const rect = mapOuterEl.getBoundingClientRect();
    const { ox, oy } = getImageOrigin();
    const imgX = (clientX - rect.left - ox - panX) / scale;
    const imgY = (clientY - rect.top - oy - panY) / scale;
    return {
      x: Math.round((imgX / mapImageEl.clientWidth) * imageWidth),
      y: Math.round((imgY / mapImageEl.clientHeight) * imageHeight),
    };
  }

  function entrancePointerDown(e: PointerEvent, marker: EntranceMarker) {
    if (!placementMode) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    draggingEntranceUid = marker.uid;
    dragIsAuto = !!marker._auto;
  }

  function entrancePointerMove(e: PointerEvent) {
    if (!draggingEntranceUid) return;
    const coords = getImageCoordsFromPointer(e.clientX, e.clientY);
    if (coords) {
      dragPositions = { ...dragPositions, [draggingEntranceUid]: coords };
    }
  }

  function entrancePointerUp(e: PointerEvent) {
    if (!draggingEntranceUid) return;
    const coords = getImageCoordsFromPointer(e.clientX, e.clientY);
    if (coords) {
      if (dragIsAuto) {
        // Auto marker: save a manual marker at final position (auto-hides the auto one)
        const auto = autoEntranceMarkers.find(m => m.uid === draggingEntranceUid);
        if (auto) {
          saveEntranceMarker(auto.id, currentSubscene, coords.x, coords.y);
        }
      } else {
        // Manual marker: update position in localStorage
        const all = loadStoredMarkers();
        const idx = all.findIndex(m => m.uid === draggingEntranceUid);
        if (idx >= 0) {
          all[idx] = { ...all[idx], x: coords.x, y: coords.y };
          localStorage.setItem('entranceMarkers', JSON.stringify(all));
          entranceMarkers = [...all];
        }
      }
    }
    const uid = draggingEntranceUid;
    draggingEntranceUid = null;
    dragIsAuto = false;
    const { [uid]: _, ...rest } = dragPositions;
    dragPositions = rest;
  }

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="modal-overlay" on:click={closeModal}>
  <div class="modal-content" on:click|stopPropagation={() => typeDropdownOpen = false}>
    <button class="close-button" on:click={closeModal}>✕</button>
    <div class="map-title-row">
      <button class="nav-btn" on:click={() => { const nav = navScenes.length > 1 ? navScenes : allScenes; const i = nav.indexOf(scene); changeMainScene(nav[(i - 1 + nav.length) % nav.length]); }} title="Previous zone" disabled={(navScenes.length > 1 ? navScenes : allScenes).length <= 1}>‹</button>
      <h2>{sceneData.displayName || rendersceneToDisplayName(scene)}</h2>
      <button class="nav-btn" on:click={() => { const nav = navScenes.length > 1 ? navScenes : allScenes; const i = nav.indexOf(scene); changeMainScene(nav[(i + 1) % nav.length]); }} title="Next zone" disabled={(navScenes.length > 1 ? navScenes : allScenes).length <= 1}>›</button>
    </div>

    {#if allScenes.length > 1}
      <div class="filter-controls">
        {#each allScenes as s}
          <button class="age-button" class:active={s === scene} on:click={() => changeMainScene(s)}>
            {allScenesData?.[s]?.displayName ?? s}
          </button>
        {/each}
      </div>
    {/if}

    <div class="filter-controls">
      {#if sceneData.game === 'oot' && showAgeFilter}
        <button class="age-button" class:active={ageFilter === 'child'} on:click={() => (ageFilter = 'child')}>
          👶 Child
        </button>
        <button class="age-button" class:active={ageFilter === 'adult'} on:click={() => (ageFilter = 'adult')}>
          👨 Adult
        </button>
        <span class="controls-sep"></span>
      {/if}
      <div class="type-filter-wrap" bind:this={typeFilterWrapEl}>
        <button
          class="age-button type-filter-btn"
          class:active={$hiddenTypesStore.size > 0}
          on:click|stopPropagation={() => (typeDropdownOpen = !typeDropdownOpen)}
        >
          Types ({availableTypes.length - relevantHiddenCount}/{availableTypes.length}) {typeDropdownOpen ? '▲' : '▼'}
        </button>
        {#if typeDropdownOpen}
          {@const r = typeFilterWrapEl?.getBoundingClientRect()}
          <div class="type-dropdown" style="top:{(r?.bottom ?? 0) + 4}px;left:{r?.left ?? 0}px;" on:click|stopPropagation>
            <div class="type-actions">
              <button class="type-action-btn" on:click={showAllTypes}>All</button>
              <button class="type-action-btn" on:click={hideAllTypes}>None</button>
            </div>
            {#each availableTypes as type}
              {@const color = getMarkerColorByType(type)}
              {@const hidden = $hiddenTypesStore.has(type)}
              <label class="type-option" class:hidden-type={hidden}>
                <input type="checkbox" checked={!hidden} on:change={() => toggleType(type)} />
                <span class="type-dot" style="background:{color};"></span>
                {typeLabels[type] ?? type}
              </label>
            {/each}
          </div>
        {/if}
      </div>
      {#if showEntrances}
        <span class="controls-sep"></span>
        <button
          class="age-button"
          class:active={showEntranceLabels}
          on:click={() => { showEntranceLabels = !showEntranceLabels; }}
          title="Show entrance names"
        >🏷️</button>
        <button
          class="age-button"
          class:active={showAllEntrances}
          on:click={() => { showAllEntrances = !showAllEntrances; }}
          title="Show all entrances regardless of ER settings"
        >👁️</button>
        <button
          class="age-button"
          class:active={placementMode}
          on:click={() => { placementMode = !placementMode; if (!placementMode) selectedPlacementEntrances = []; }}
          title="Mode placement (add/remove markers)"
        >✏️</button>
      {/if}
    </div>

    {#if subsceneList.length > 1}
      <div class="subscene-tabs">
        {#each subsceneList as subscene}
          <button
            class="subscene-tab"
            class:active={subscene === currentSubscene}
            on:click={() => (currentSubscene = subscene)}
          >
            {sceneData.subscenes[subscene].displayName}
          </button>
        {/each}
      </div>
    {/if}

    <div class="map-with-panel">
    <div class="map-scroll" bind:this={mapScrollEl}
      style={imageWidth > 1 ? `aspect-ratio: ${imageWidth}/${imageHeight}` : ''}>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    {#key currentSubscene}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="map-outer"
        bind:this={mapOuterEl}
        on:wheel={onWheel}
        on:pointerdown={onPointerDown}
        on:pointermove={onPointerMove}
        on:pointerup={onPointerUp}
        on:pointercancel={onPointerUp}
        on:contextmenu={handleMapContextMenu}
        on:click={e => { if (placementMode && selectedPlacementEntrances.length && !hasDragged) placeEntranceAt(e); }}
        style="cursor: {placementMode && selectedPlacementEntrances.length ? 'crosshair' : placementMode ? 'default' : scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'};"
      >
        <div class="map-container" class:show-labels={showEntranceLabels} style="--cs:{counterScale};--ms:{scale};transform: scale({scale}) translate({panX / scale}px, {panY / scale}px); transform-origin: top left;">
        <img
          bind:this={mapImageEl}
          src={currentImageSrc}
          alt={currentSubscene}
          class="map-image"
          class:map-image-ready={displayW > 0}
          draggable="false"
          style={displayW > 0 ? `width:${displayW}px;height:${displayH}px;` : ''}
          on:load={onImageLoad}
          on:error={() => { imageError = true; }}
        />
        {#if imageError}
          <div class="map-error">⚠️ Map image not found<br><code>{currentImageSrc}</code></div>
        {/if}

        {#if imageLoaded}
{#each activePings as ping (ping.id)}
            {@const c = ping.color ?? '#ff6b6b'}
            <div class="ping-marker" style="left: {ping.xPct}%; top: {ping.yPct}%;">
              <div class="ping-ring" style="border-color: {c};"></div>
              <div class="ping-ring ping-ring-2" style="border-color: {c};"></div>
              <div class="ping-dot" style="background: {c}; box-shadow: 0 0 6px {c};"></div>
              <span class="ping-label" style="color: {c};">{ping.checkName ? ping.checkName.replace(/^(OOT|MM) /, '') : ping.pseudo}</span>
            </div>
          {/each}
          {#each positionedChecks as { check, adjX, adjY } (check.id + '-' + check.name + '-' + check.x + '-' + check.y)}
            {@const checkKey = getCheckKey(check)}
            {@const state = checkStates.get(checkKey) ?? T.CheckState.unchecked}
            {@const color = getMarkerColor(check)}
            {@const left = adjX}
            {@const top = adjY}
            {@const zIndex = check.z || 10}
            {@const shopItem = shopItems.get(checkKey) ?? ''}
            {@const shopPrice = shopPrices.get(checkKey) ?? null}
            {@const showPrice = !itemOnlyIds.has(check.id)}
            {@const hasShopInfo = isShopOrScrub(check) && (shopItem || (shopPrice !== null && showPrice))}
            <button
              class="map-marker"
              class:checked={state === T.CheckState.checked}
              class:marked={state === T.CheckState.marked}
              style="left: {left}%; top: {top}%; z-index: {zIndex};"
              on:mouseenter={e => startHoverTimer(check, e)}
              on:mouseleave={clearHoverTimer}
              on:pointerdown|stopPropagation={() => {}}
              on:click|stopPropagation={e => { if (placementMode && selectedPlacementEntrances.length) { placeEntranceAt(e); return; } toggleCheck(check); }}
              on:contextmenu={e => handleMarkerContextMenu(e, check)}
            >
              {#if hasShopInfo}
                <span class="marker-label">
                  {#if shopItem}<span class="marker-item">{shopItem.length > 8 ? shopItem.slice(0, 8) + '…' : shopItem}</span>{/if}
                  {#if shopPrice !== null && showPrice}<span class="marker-price">({shopPrice}◆)</span>{/if}
                </span>
              {/if}
              <span class="marker-dot" style="background-color: {color};"></span>
            </button>
          {/each}
            {#if showEntrances}
            {#each autoEntranceMarkers as marker (marker.uid)}
              {@const ent = allEntrances.find(e => e.id === marker.id)}
              {@const col = getEntranceTypeColor(ent?.type ?? '')}
              {@const _dp = draggingEntranceUid === marker.uid ? dragPositions[marker.uid] : null}
              {@const _pos = _dp ? _dp : marker}
              {@const __ax = (_pos.x / imageWidth) * 100}
              {@const __ay = (_pos.y / imageHeight) * 100}
              {@const _lbl = ent ? shortEntranceName(ent) : marker.id}
              {@const _unshuffled = isEntranceUnshuffled(ent)}
              {#if !_unshuffled}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="entrance-marker"
                class:entrance-marker-dragging={draggingEntranceUid === marker.uid}
                class:entrance-marker-unshuffled={_unshuffled}
                style="left:{__ax}%;top:{__ay}%;--ec:{col};"
                on:mouseenter={e => startEntranceHoverTimer(_lbl, e)}
                on:mouseleave={clearHoverTimer}
                on:pointerdown={e => entrancePointerDown(e, marker)}
                on:pointermove={entrancePointerMove}
                on:pointerup={entrancePointerUp}
                on:click|stopPropagation={() => handleEntranceClick(marker.id)}
                on:contextmenu|preventDefault|stopPropagation={e => handleEntranceContextMenu(e, marker.uid, marker.id, true)}
              >
                <span class="entrance-diamond"></span>
                {#if draggingEntranceUid !== marker.uid}<span class="entrance-lbl">{_lbl}</span>{/if}
              </div>
              {/if}
            {/each}
            {#each visibleEntranceMarkers as marker (marker.uid)}
              {@const ent = allEntrances.find(e => e.id === marker.id)}
              {@const col = getEntranceTypeColor(ent?.type ?? '')}
              {@const _dp = draggingEntranceUid === marker.uid ? dragPositions[marker.uid] : null}
              {@const _pos = _dp ? _dp : marker}
              {@const ax = (_pos.x / imageWidth) * 100}
              {@const ay = (_pos.y / imageHeight) * 100}
              {@const lbl = ent ? shortEntranceName(ent) : marker.id}
              {@const cursorStyle = placementMode ? 'grab' : 'default'}
              {@const unshuffled = isEntranceUnshuffled(ent)}
              {#if !unshuffled}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="entrance-marker"
                class:entrance-marker-sel={selectedPlacementEntrances.some(s => s.id === marker.id)}
                class:entrance-marker-dragging={draggingEntranceUid === marker.uid}
                class:entrance-marker-unshuffled={unshuffled}
                style="left:{ax}%;top:{ay}%;--ec:{col};cursor:{cursorStyle};"
                on:mouseenter={e => startEntranceHoverTimer(ent ? shortEntranceName(ent) : marker.id, e)}
                on:mouseleave={clearHoverTimer}
                on:pointerdown={e => entrancePointerDown(e, marker)}
                on:pointermove={entrancePointerMove}
                on:pointerup={entrancePointerUp}
                on:click|stopPropagation={() => handleEntranceClick(marker.id)}
                on:contextmenu|preventDefault|stopPropagation={e => handleEntranceContextMenu(e, marker.uid, marker.id, false)}
              >
                <span class="entrance-diamond"></span>
                {#if draggingEntranceUid !== marker.uid}<span class="entrance-lbl">{lbl}</span>{/if}
              </div>
              {/if}
            {/each}
          {/if}
        {/if}
        </div> <!-- /map-container -->

        <div class="zoom-controls">
          <button class="zoom-btn" on:click={zoomIn} on:pointerdown|stopPropagation title="Zoom in" disabled={scale >= 8}>+</button>
          <button class="zoom-btn" on:click={zoomOut} on:pointerdown|stopPropagation title="Zoom out" disabled={scale <= 1}>−</button>
          <button class="zoom-btn" on:click={resetZoom} on:pointerdown|stopPropagation disabled={scale <= 1} title="Reset zoom">✕</button>
        </div>
      </div> <!-- /map-outer -->
    {/key}
    </div> <!-- /map-scroll -->

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    {#if placementMode}
      <div class="placement-panel">
        <div class="placement-header">
          <span class="placement-status">
            {#if selectedPlacementEntrances.length > 0}
              {selectedPlacementEntrances.length} entrance{selectedPlacementEntrances.length > 1 ? 's' : ''} sélectionnée{selectedPlacementEntrances.length > 1 ? 's' : ''}
            {:else}
              Sélectionne une ou plusieurs entrances
            {/if}
          </span>
          <div class="placement-header-actions">
            <button class="age-button" on:click={resetDeletedAutoMarkers} title="Restaurer les marqueurs auto supprimés">↺</button>
            <button class="age-button" on:click={() => { placementMode = false; selectedPlacementEntrances = []; }}>✕</button>
          </div>
        </div>
        <div class="placement-zone-row">
          <button class="placement-zone-btn" class:active={zoneOnly} on:click={() => { zoneOnly = !zoneOnly; placementSearch = ''; }}>
            Zone only
          </button>
          <input class="placement-search" type="text" placeholder="Filtrer…" bind:value={placementSearch} on:input={() => { if (placementSearch) zoneOnly = false; }} />
        </div>
        <div class="placement-list">
          {#each placementSuggestions as e}
            {@const placed = currentEntranceMarkers.some(m => m.id === e.id)}
            {@const sel = selectedPlacementEntrances.some(s => s.id === e.id)}
            {@const entUnshuffled = isEntranceUnshuffled(e)}
            <button
              class="placement-item"
              class:placement-item-sel={sel}
              class:placement-item-placed={placed}
              class:placement-item-unshuffled={entUnshuffled}
              on:click={() => selectedPlacementEntrances = sel ? selectedPlacementEntrances.filter(s => s.id !== e.id) : [...selectedPlacementEntrances, e]}
            >
              <span class="ent-type-dot" class:ent-type-dot-unshuffled={entUnshuffled} style="background:{getEntranceTypeColor(e.type)};"></span>
              {shortEntranceName(e)}
              {#if placed}<span class="ent-placed-check">✓</span>{/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}
    </div> <!-- /map-with-panel -->

        {#if showTooltip}
      <div class="map-tooltip" style="left: {tooltipX}px; top: {tooltipY}px;">
        {hoveredCheckName}
      </div>
    {/if}

  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    overflow: hidden;
  }

  .modal-content {
    background: var(--color-bg);
    color: var(--color-text);
    padding: 2em;
    border-radius: 8px;
    width: fit-content;
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .map-with-panel {
    display: flex;
    flex-direction: row;
    gap: 0.5em;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    justify-content: center;
    align-items: center;
  }

  .map-scroll {
    overflow: hidden;
    min-width: 0;
    min-height: 0;
    max-height: calc(85vh - 6em);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .map-title-row {
    display: flex;
    align-items: center;
    gap: 0.4em;
    margin-bottom: 0.3em;
  }
  .map-title-row h2 {
    margin: 0;
    font-size: 1.2em;
    white-space: nowrap;
  }
  .nav-btn {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    cursor: pointer;
    font-size: 1.3em;
    padding: 0.1em 0.4em;
    line-height: 1.2;
    opacity: 0.6;
    transition: opacity 0.15s;
  }
  .nav-btn:hover { opacity: 1; }
  .nav-btn:disabled { opacity: 0.2; cursor: default; }

  .close-button {
    position: absolute;
    top: 0.5em;
    right: 0.5em;
    background: var(--color-danger);
    border: none;
    border-radius: 4px;
    padding: 0.5em 1em;
    cursor: pointer;
    font-size: 1.2em;
    color: white;
    z-index: 10;
  }

  h2 {
    margin-top: 0;
    color: var(--color-header);
  }

  .filter-controls {
    display: flex;
    gap: 0.5em;
    margin-bottom: 1em;
    align-items: center;
  }

  .age-button {
    padding: 0.4em 0.8em;
    background: var(--color-bg);
    border: 2px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    color: var(--color-text);
    transition: all 0.2s;
  }

  .age-button:hover { background: var(--color-primary); opacity: 0.8; }

  .age-button.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
    font-weight: bold;
  }

  .subscene-tabs {
    display: flex;
    gap: 0.5em;
    margin-bottom: 1em;
    flex-wrap: wrap;
  }

  .subscene-tab {
    padding: 0.5em 1em;
    background: var(--color-bg);
    border: 2px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    color: var(--color-text);
    transition: all 0.2s;
  }

  .subscene-tab:hover { background: var(--color-primary); opacity: 0.8; }

  .controls-sep {
    flex: 1;
  }

  .type-filter-wrap {
    position: relative;
  }

  .type-filter-btn.active {
    border-color: #f0a500;
    color: #f0a500;
  }

  .type-dropdown {
    position: fixed;
    z-index: 200;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 6px;
    min-width: 160px;
    max-height: 260px;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  }

  .type-actions {
    display: flex;
    gap: 4px;
    margin-bottom: 6px;
  }

  .type-action-btn {
    flex: 1;
    padding: 2px 6px;
    font-size: 0.75em;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    cursor: pointer;
    color: var(--color-text);
  }
  .type-action-btn:hover { background: var(--color-primary); opacity: 0.8; }

  .type-option {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 4px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.85em;
    color: var(--color-text);
    user-select: none;
  }
  .type-option:hover { background: rgba(255,255,255,0.06); }
  .type-option.hidden-type { opacity: 0.45; }

  .type-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.5);
    flex-shrink: 0;
  }

  .subscene-tab.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    font-weight: bold;
  }

  .map-outer {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    user-select: none;
  }

  .map-container {
    position: relative;
    display: inline-block;
    transition: transform 0.05s ease-out;
  }

  .map-image {
    display: block;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
  }

  .map-image:not(.map-image-ready) {
    opacity: 0;
  }

  .map-error {
    padding: 2em;
    color: #f88;
    text-align: center;
    font-size: 0.9em;
  }
  .map-error code { font-size: 0.8em; color: #aaa; }

  .zoom-controls {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 100;
    display: flex;
    gap: 2px;
  }
  .zoom-btn {
    padding: 0.2em 0.5em;
    font-size: 0.75em;
    background: rgba(0,0,0,0.7);
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 4px;
    cursor: pointer;
    line-height: 1;
  }
  .zoom-btn:hover { background: rgba(80,0,0,0.85); }
  .zoom-btn:disabled { opacity: 0.35; cursor: default; background: rgba(0,0,0,0.4); }

  .map-marker {
    position: absolute;
    transform: translate(-50%, -50%) scale(var(--cs, 1));
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .marker-label {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.75);
    color: white;
    font-size: 0.6em;
    white-space: nowrap;
    padding: 1px 4px;
    border-radius: 3px;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    max-width: 70px;
    overflow: hidden;
  }

  .marker-item {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .marker-price {
    color: #ffd700;
  }

  .marker-dot {
    display: block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    transition: all 0.2s;
  }

  .map-marker:hover .marker-dot {
    transform: scale(1.5);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
  }

  .map-marker.marked .marker-dot {
    transform: scale(1.3);
    box-shadow: 0 0 0 3px white, 0 0 10px 4px rgba(255, 215, 0, 0.8);
  }

  .map-marker.checked::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 10px;
    font-weight: bold;
    text-shadow: 0 0 2px black;
  }

  .map-marker.checked .marker-dot {
    opacity: 0.4;
  }

  @keyframes ping-pulse {
    0%   { transform: translate(-50%, -50%) scale(1);   opacity: 0.85; }
    100% { transform: translate(-50%, -50%) scale(3.5); opacity: 0; }
  }

  .ping-marker {
    position: absolute;
    pointer-events: none;
    z-index: 50;
  }

  .ping-ring {
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid;
    animation: ping-pulse 1.4s ease-out infinite;
    transform: translate(-50%, -50%);
  }

  .ping-ring-2 {
    animation-delay: 0.7s;
  }

  .ping-dot {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  .ping-label {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.58em;
    white-space: nowrap;
    text-shadow: 0 0 3px black, 0 0 3px black;
    font-weight: bold;
  }

  /* ===== Entrance markers ===== */
  .entrance-marker {
    position: absolute;
    transform: translate(-50%, -50%) scale(var(--cs, 1));
    z-index: 12;
    cursor: default;
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: auto;
  }
  .entrance-diamond {
    display: block;
    width: 13px;
    height: 13px;
    background: var(--ec, #fff);
    transform: rotate(45deg);
    border: 2px solid rgba(0,0,0,0.7);
    box-shadow: 0 0 6px var(--ec, #fff), 0 0 10px rgba(0,0,0,0.4);
    transition: transform 0.15s, box-shadow 0.15s;
    flex-shrink: 0;
  }
  .entrance-marker:hover .entrance-diamond {
    transform: rotate(45deg) scale(1.5);
    box-shadow: 0 0 12px var(--ec, #fff), 0 0 18px rgba(0,0,0,0.5);
  }
  .entrance-marker-unshuffled {
    opacity: 0.45;
  }
  .entrance-marker-unshuffled .entrance-diamond {
    border-style: dashed;
    box-shadow: none;
  }
  .entrance-marker-unshuffled:hover .entrance-diamond {
    box-shadow: none;
  }

  .entrance-marker-dragging {
    z-index: 100 !important;
    opacity: 0.85;
  }
  .entrance-marker-dragging .entrance-diamond {
    transform: rotate(45deg) scale(1.6);
    box-shadow: 0 0 16px var(--ec, #fff), 0 0 24px var(--ec, #fff);
  }
  .entrance-marker-sel .entrance-diamond {
    transform: rotate(45deg) scale(1.4);
    box-shadow: 0 0 14px var(--ec, #fff), 0 0 24px var(--ec, #fff);
  }
  .entrance-lbl {
    display: none;
  }
  .show-labels .entrance-lbl {
    display: block;
    max-width: 90px;
    font-size: 0.52em;
    line-height: 1.2;
    text-align: center;
    white-space: normal;
    word-break: break-word;
    color: #fff;
    text-shadow: 0 0 3px #000, 0 0 3px #000;
    pointer-events: none;
    order: -1;
    margin-bottom: 2px;
  }

  /* ===== Placement panel ===== */
  .placement-panel {
    border: 1px solid var(--color-primary, #8B6914);
    border-radius: 6px;
    background: var(--color-bg);
    flex-shrink: 0;
    width: 220px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .placement-zone-row {
    display: flex;
    align-items: center;
    gap: 0.3em;
    padding: 0.2em 0.4em;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .placement-zone-btn {
    padding: 0.15em 0.45em;
    font-size: 0.75em;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .placement-zone-btn.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #000;
    font-weight: bold;
  }
  .placement-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.3em 0.5em;
    background: rgba(139, 105, 20, 0.18);
    flex-shrink: 0;
    gap: 0.5em;
    font-size: 0.83em;
    min-height: 0;
  }
  .placement-header-actions { display: flex; gap: 0.2em; }
  .placement-status {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .placement-search {
    padding: 0.22em 0.45em;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: transparent;
    color: var(--color-text);
    font-size: 0.82em;
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
  }
  .placement-search:focus { outline: none; background: rgba(255,255,255,0.03); }
  .placement-list { overflow-y: auto; flex: 1; }
  .placement-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.18em 0.5em;
    background: none;
    border: none;
    color: var(--color-text);
    font-size: 0.78em;
    text-align: left;
    cursor: pointer;
    gap: 0.4em;
  }
  .placement-item:hover { background: rgba(255,255,255,0.06); }
  .placement-item-sel { background: rgba(139, 105, 20, 0.32) !important; }
  .placement-item-placed { opacity: 0.6; }
  .ent-type-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    transform: rotate(45deg);
    border: 1px solid rgba(0,0,0,0.5);
  }
  .ent-placed-check { margin-left: auto; color: #4caf50; font-size: 0.9em; }
  .ent-type-dot-unshuffled { opacity: 0.4; }
  .placement-item-unshuffled { opacity: 0.55; }

  .map-tooltip {
    position: fixed;
    z-index: 9999;
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.85em;
    pointer-events: none;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    transform: translate(8px, 8px);
  }
</style>