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
  import { onMount, onDestroy } from 'svelte';

  const dispatch = createEventDispatcher();

  export let scene: string = '';
  export let sceneData: SceneData;
  export let allScenes: string[] = [scene];
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

  let currentSubscene = Object.keys(sceneData.subscenes)[0];
  let imageWidth = 1;
  let imageHeight = 1;
  let imageLoaded = false;
  let imageError = false;
  $: { currentSubscene; imageError = false; imageLoaded = false; }

  // Zoom / pan
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panOriginX = 0;
  let panOriginY = 0;

  function resetZoom() { scale = 1; panX = 0; panY = 0; }

  let hasDragged = false;

  function onWheel(e: WheelEvent) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.85 : 1.18;
    const newScale = Math.min(8, Math.max(1, scale * delta));
    if (newScale === scale) return;
    if (mapOuterEl) {
      const rect = mapOuterEl.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      panX = mx - (mx - panX) * (newScale / scale);
      panY = my - (my - panY) * (newScale / scale);
    }
    scale = newScale;
    if (scale === 1) { panX = 0; panY = 0; }
  }

  function onPointerDown(e: PointerEvent) {
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
  }

  function onPointerUp() { isPanning = false; }

  let mapOuterEl: HTMLElement | undefined;
  let mapImageEl: HTMLImageElement | undefined;

  function onImageLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    imageWidth = img.naturalWidth;
    imageHeight = img.naturalHeight;
    imageLoaded = true;
  }

  $: activePings = scenePings.filter(p => p.subscene === currentSubscene);

  const typeLabels: Record<string, string> = {
    chest: 'Chest', gs: 'Gold Skulltula', pot: 'Pot', grass: 'Grass',
    cow: 'Cow', npc: 'NPC', heart: 'Heart Piece', collectible: 'Collectible',
    sf: 'Stray Fairy', shop: 'Shop', rupee: 'Rupee', scrub: 'Scrub',
    crate: 'Crate', barrel: 'Barrel', hive: 'Hive', rock: 'Rock',
    tree: 'Tree', bush: 'Bush', soil: 'Soil', butterfly: 'Butterfly',
    fairy: 'Fairy', fish: 'Fish',
  };

  let typeDropdownOpen = false;

  // Tooltip state
  let hoveredCheckName = '';
  let showTooltip = false;
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;
  let tooltipX = 0;
  let tooltipY = 0;
  let tooltipEl: HTMLDivElement | undefined;

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
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    const imgX = (dx - panX) / scale;
    const imgY = (dy - panY) / scale;
    const xPct = (imgX / mapImageEl.clientWidth) * 100;
    const yPct = (imgY / mapImageEl.clientHeight) * 100;
    dispatch('ping', { xPct, yPct, scene, subscene: currentSubscene });
  }

  onMount(() => {
    document.body.classList.add('modal-open');
    const saved = savedZoom.get(scene);
    if (saved) { scale = saved.scale; panX = saved.panX; panY = saved.panY; }
  });

  onDestroy(() => {
    document.body.classList.remove('modal-open');
    if (scale !== 1 || panX !== 0 || panY !== 0)
      savedZoom.set(scene, { scale, panX, panY });
    else
      savedZoom.delete(scene);
  });

  $: subsceneList = Object.keys(sceneData.subscenes);
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
        const matchesName = filteredCheckNames.has(check.name) || filteredCheckNames.has(nameWithoutPrefix);

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
  }

  $: if (sceneData) {
    currentSubscene = Object.keys(sceneData.subscenes)[0];
  }

  function closeModal() {
    dispatch('close');
  }

  function changeMainScene(newScene: string) {
    dispatch('changeScene', { scene: newScene });
    currentSubscene = Object.keys(sceneData.subscenes)[0];
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
      case 'gs': return '#FFD700';
      case 'pot': return '#CD853F';
      case 'grass': return '#228B22';
      case 'cow': return '#F5DEB3';
      case 'npc': return '#FF69B4';
      case 'heart': return '#FF0000';
      case 'collectible': return '#FF0000';
      case 'sf': return '#FF1493';
      case 'shop': return '#4169E1';
      case 'rupee': return '#00FF00';
      case 'scrub': return '#90EE90';
      case 'crate': return '#8B4513';
      case 'barrel': return '#A0522D';
      case 'hive': return '#FFD700';
      case 'rock': return '#D4AF37';
      case 'tree': return '#654321';
      case 'bush': return '#228B22';
      case 'soil': return '#8B4513';
      case 'butterfly': return '#FF69B4';
      case 'fairy': return '#FF1493';
      case 'fish': return '#4682B4';
      default: return '#FFD700';
    }
  }


</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="modal-overlay" on:click={closeModal}>
  <div class="modal-content" on:click|stopPropagation>
    <button class="close-button" on:click={closeModal}>✕</button>
    <h2>{sceneData.displayName || rendersceneToDisplayName(scene)}</h2>

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
      <div class="type-filter-wrap">
        <button
          class="age-button type-filter-btn"
          class:active={$hiddenTypesStore.size > 0}
          on:click|stopPropagation={() => (typeDropdownOpen = !typeDropdownOpen)}
        >
          Types ({availableTypes.length - $hiddenTypesStore.size}/{availableTypes.length}) {typeDropdownOpen ? '▲' : '▼'}
        </button>
        {#if typeDropdownOpen}
          <div class="type-dropdown" on:click|stopPropagation>
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

    <div class="map-scroll">
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
        style="cursor: {scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'};"
      >
        <div class="map-container" style="transform: scale({scale}) translate({panX / scale}px, {panY / scale}px); transform-origin: top left;">
        <img
          bind:this={mapImageEl}
          src={currentImageSrc}
          alt={currentSubscene}
          class="map-image"
          draggable="false"
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
              on:click|stopPropagation={() => { if (!hasDragged) toggleCheck(check); }}
              on:contextmenu={e => { if (!hasDragged) handleMarkerContextMenu(e, check); }}
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
        {/if}
        </div> <!-- /map-container -->

        {#if scale > 1}
          <button class="zoom-reset" on:click={resetZoom} on:pointerdown|stopPropagation title="Reset zoom">✕ Reset zoom</button>
        {/if}
      </div> <!-- /map-outer -->
    {/key}
    </div> <!-- /map-scroll -->

    {#if showTooltip}
      <div class="map-tooltip" bind:this={tooltipEl} style="left: {tooltipX}px; top: {tooltipY}px;">
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
    max-width: 90vw;
    max-height: 90vh;
    overflow: visible;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .map-scroll {
    overflow: auto;
    flex: 1;
    min-height: 0;
  }

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
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
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
    display: inline-block;
    user-select: none;
  }

  .map-container {
    position: relative;
    display: inline-block;
    transition: transform 0.05s ease-out;
  }

  .map-image {
    display: block;
    max-width: 100%;
    height: auto;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
  }

  .map-error {
    padding: 2em;
    color: #f88;
    text-align: center;
    font-size: 0.9em;
  }
  .map-error code { font-size: 0.8em; color: #aaa; }

  .zoom-reset {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 100;
    padding: 0.2em 0.5em;
    font-size: 0.75em;
    background: rgba(0,0,0,0.7);
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 4px;
    cursor: pointer;
  }
  .zoom-reset:hover { background: rgba(80,0,0,0.85); }

  .map-marker {
    position: absolute;
    transform: translate(-50%, -50%);
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