<script lang="ts">
  import { onMount } from 'svelte';
  import { allEntrances, findReverseEntrance, entranceById } from '../data/entranceData';
  import { entrancePositions } from '../data/entrancePositions';
  import type { EntranceInfo } from '../data/entranceData';
  import { buildMapData, type MapData, type SceneData } from '../util/mapData';
  import MapModal from './MapModal.svelte';

  // ── Map data ──────────────────────────────────────────────
  let mapData: MapData | null = null;
  onMount(async () => { mapData = await buildMapData(new Map()); });

  // ── What left-click does in vanilla ──────────────────────
  // Mirrors navigateToEntrance() logic with no ER fill
  function describeLeftClick(ent: EntranceInfo): { navigates: true; to: string; how: string } | { navigates: false; how: string } {
    // Step 1: reverse entrance has a map position
    const rev = findReverseEntrance(ent);
    if (rev) {
      const pos = entrancePositions.find(p => p.entranceId === rev.id);
      if (pos) return { navigates: true, to: pos.renderscene, how: `reverse entrance → ${rev.name}` };
    }
    // Step 2: one-way targetScene fallback
    const oneWay = entrancePositions.find(p => p.entranceId === ent.id && p.targetScene);
    if (oneWay) return { navigates: true, to: oneWay.targetScene!, how: `one-way → ${oneWay.targetScene}` };
    // Step 3: entrance ID matches a subscene directly (checked at runtime with mapData)
    if (mapData) {
      for (const sd of Object.values(mapData)) {
        if (sd.subscenes[ent.id]) return { navigates: true, to: ent.id, how: `entrance ID = subscene` };
      }
    }
    return { navigates: false, how: rev ? `reverse found (${rev.id}) but has no map position` : 'no reverse entrance' };
  }

  // ── Zone → expected map scene (mirrors App.svelte groupToSceneMapping + normalization) ──
  const groupToSceneMapping: Record<string, string[]> = {
    "Hyrule/Ganon's Castle Exterior": ['OOT_HYRULE_GANON_CASTLE'],
    "Jabu Jabu's Belly": ['OOT_INSIDE_JABU_JABU'],
    'Forest Temple': ['OOT_TEMPLE_FOREST'], 'Fire Temple': ['OOT_TEMPLE_FIRE'],
    'Water Temple': ['OOT_TEMPLE_WATER'], 'Shadow Temple': ['OOT_TEMPLE_SHADOW'],
    'Spirit Temple': ['OOT_TEMPLE_SPIRIT'], "Ganon's Castle": ['OOT_INSIDE_GANON_CASTLE'],
    'South Clock Town': ['MM_CLOCK_TOWN_SOUTH'], 'North Clock Town': ['MM_CLOCK_TOWN_NORTH'],
    'East Clock Town': ['MM_CLOCK_TOWN_EAST'], 'West Clock Town': ['MM_CLOCK_TOWN_WEST'],
    'Road To Southern Swamp': ['MM_ROAD_SOUTHERN_SWAMP'], 'Swamp Spider House': ['MM_SPIDER_HOUSE_SWAMP'],
    'Path To Mountain Village': ['MM_PATH_MOUNTAIN_VILLAGE'], 'Mountain Village': ['MM_MOUNTAIN_VILLAGE_SPRING'],
    'Path To Snowhead': ['MM_PATH_SNOWHEAD'], 'Pirates Fortress': ['MM_PIRATE_FORTRESS'],
    'Ocean Spider House': ['MM_SPIDER_HOUSE_OCEAN'], 'Road To Ikana': ['MM_ROAD_IKANA'],
    'Ikana Castle': ['MM_CASTLE_IKANA'], 'Woodfall Temple': ['MM_TEMPLE_WOODFALL'],
    'Snowhead Temple': ['MM_TEMPLE_SNOWHEAD'], 'Great Bay Temple': ['MM_TEMPLE_GREAT_BAY'],
    'Stone Tower Temple': ['MM_TEMPLE_STONE_TOWER', 'MM_TEMPLE_STONE_TOWER_INVERTED'],
    'The Moon': ['MM_MOON'],
  };

  // ── Validation state ──────────────────────────────────────
  const KEY = 'entrance-validator-v4';
  let results: Record<string, 'ok'|'wrong'|''> = (() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
  })();
  function setResult(id: string, v: 'ok'|'wrong'|'') {
    results[id] = v; results = {...results};
    localStorage.setItem(KEY, JSON.stringify(results));
  }
  function resetAll() {
    if (!confirm('Reset all results?')) return;
    results = {}; localStorage.removeItem(KEY);
  }

  // ── Tabs ─────────────────────────────────────────────────
  let tab: 'entrances' | 'mapbtns' = 'entrances';

  // ── Entrance list filters ─────────────────────────────────
  let filterType = 'all', filterStatus = 'all', filterGame = 'all', search = '';
  const typeLabels: Record<string, string> = {
    overworld: 'OW', interior: 'Int', dungeon: 'Dgn', grotto: 'Grotto', boss: 'Boss', owl: 'Owl',
  };

  $: entranceRows = allEntrances
    .filter(e => entrancePositions.some(p => p.entranceId === e.id))
    .filter(e => filterGame === 'all' || e.game === filterGame)
    .filter(e => filterType === 'all' || e.type === filterType)
    .filter(e => {
      const s = results['ent_' + e.id] ?? '';
      if (filterStatus === 'all') return true;
      if (filterStatus === 'pending') return s === '';
      if (filterStatus === 'ok') return s === 'ok';
      if (filterStatus === 'wrong') return s === 'wrong';
      return true;
    })
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()));

  // ── Map button rows — computed without results to avoid tracking issues ──
  $: mapBtnBase = mapData
    ? Object.entries(mapData)
        .map(([sceneKey, sd]) => {
          const displayName = Object.values(sd.subscenes)[0]?.displayName ?? sceneKey;
          const override = Object.entries(groupToSceneMapping).find(([, scenes]) => scenes.includes(sceneKey));
          return { sceneKey, zoneName: override ? override[0] : displayName };
        })
        .sort((a, b) => a.zoneName.localeCompare(b.zoneName))
    : [];

  // ── Stats ─────────────────────────────────────────────────
  $: withPos = allEntrances.filter(e => entrancePositions.some(p => p.entranceId === e.id)).length;
  $: entDone = Object.entries(results).filter(([k, v]) => k.startsWith('ent_') && v !== '').length;
  $: entIssues = Object.entries(results).filter(([k, v]) => k.startsWith('ent_') && v === 'wrong').length;
  $: mapDone = Object.entries(results).filter(([k, v]) => k.startsWith('map_') && v !== '').length;
  $: mapIssues = Object.entries(results).filter(([k, v]) => k.startsWith('map_') && v === 'wrong').length;

  // ── Map panel ─────────────────────────────────────────────
  let mapSceneKey: string | null = null;
  let mapSceneData: SceneData | null = null;
  let mapInitialSubscene = '';
  let clickedEntrance: EntranceInfo | null = null;

  function openMapForEntrance(ent: EntranceInfo) {
    if (!mapData) return;
    const pos = entrancePositions.find(p => p.entranceId === ent.id);
    if (!pos) return;
    const entry = Object.entries(mapData).find(([, sd]) => sd.subscenes[pos.renderscene]);
    if (!entry) return;
    mapSceneKey = entry[0]; mapSceneData = entry[1];
    mapInitialSubscene = pos.renderscene; clickedEntrance = null;
  }

  function openMapForScene(sceneKey: string) {
    if (!mapData?.[sceneKey]) return;
    mapSceneKey = sceneKey; mapSceneData = mapData[sceneKey];
    mapInitialSubscene = ''; clickedEntrance = null;
  }

  function closeMap() { mapSceneKey = null; mapSceneData = null; clickedEntrance = null; }

  function handleValidateEntrance(e: CustomEvent<{entranceId: string}>) {
    const ent = entranceById[e.detail.entranceId];
    if (ent) { clickedEntrance = ent; }
  }
</script>

<div class="page">

  <!-- TOP BAR -->
  <header class="topbar">
    <span class="title">Entrance Validator</span>
    <div class="stats">
      <span class="s-done">Entrances: {entDone}/{withPos}</span>
      {#if entIssues > 0}<span class="s-bad">⚠ {entIssues}</span>{/if}
      <span class="sep">·</span>
      <span class="s-done">Maps: {mapDone}/{mapBtnRows.length}</span>
      {#if mapIssues > 0}<span class="s-bad">⚠ {mapIssues}</span>{/if}
    </div>
    <button class="reset-btn" on:click={resetAll}>Reset all</button>
  </header>

  <div class="body">

    <!-- LEFT: tabs + list -->
    <div class="list-pane">
      <div class="tabs">
        <button class="tab" class:active={tab==='entrances'} on:click={() => tab='entrances'}>
          Entrance markers
        </button>
        <button class="tab" class:active={tab==='mapbtns'} on:click={() => tab='mapbtns'}>
          Map buttons
        </button>
      </div>

      {#if tab === 'entrances'}
        <div class="filters">
          <input class="fsearch" type="text" placeholder="Search…" bind:value={search} />
          <select bind:value={filterGame}>
            <option value="all">All</option><option value="oot">OoT</option><option value="mm">MM</option>
          </select>
          <select bind:value={filterType}>
            <option value="all">All types</option>
            {#each Object.entries(typeLabels) as [v, l]}<option value={v}>{l}</option>{/each}
          </select>
          <select bind:value={filterStatus}>
            <option value="all">All</option><option value="pending">Pending</option>
            <option value="ok">OK</option><option value="wrong">Wrong</option>
          </select>
          <span class="fcount">{entranceRows.length}</span>
        </div>
        <div class="list">
          {#each entranceRows as ent}
            {@const s = results['ent_' + ent.id] ?? ''}
            {@const nav = describeLeftClick(ent)}
            <div class="row"
              class:row-ok={s==='ok'} class:row-bad={s==='wrong'}
              class:row-sel={mapSceneKey !== null && entrancePositions.some(p => p.entranceId === ent.id && mapData && Object.entries(mapData).find(([k]) => k === mapSceneKey)?.[1]?.subscenes[p.renderscene])}
            >
              <div class="row-top">
                <span class="tag t-{ent.type}">{typeLabels[ent.type]}</span>
                <span class="tag g-{ent.game}">{ent.game.toUpperCase()}</span>
                <span class="ent-name" title={ent.id}>{ent.name}</span>
                <button class="map-btn" on:click={() => openMapForEntrance(ent)} disabled={!mapData}>🗺</button>
              </div>
              <div class="row-nav">
                {#if nav.navigates}
                  <span class="nav-desc">🖱L → <code>{nav.to}</code> <span class="nav-how">({nav.how})</span></span>
                {:else}
                  <span class="nav-none">🖱L → no navigation ({nav.how})</span>
                {/if}
              </div>
              <div class="row-btns">
                <button class="rb ok" class:active={s==='ok'}
                  on:click={() => setResult('ent_' + ent.id, s==='ok'?'':'ok')}>✓ OK</button>
                <button class="rb bad" class:active={s==='wrong'}
                  on:click={() => setResult('ent_' + ent.id, s==='wrong'?'':'wrong')}>✗ Wrong</button>
              </div>
            </div>
          {/each}
          {#if entranceRows.length === 0}<div class="empty">No entrances match.</div>{/if}
        </div>

      {:else}
        <!-- MAP BUTTONS tab -->
        {#if !mapData}
          <div class="empty">Loading map data…</div>
        {:else}
          <div class="list">
            {#each mapBtnBase as { sceneKey, zoneName }}
              {@const s = results['map_' + sceneKey] ?? ''}
              <div class="row" class:row-ok={s==='ok'} class:row-bad={s==='wrong'}>
                <div class="row-top">
                  <span class="ent-name">{zoneName}</span>
                  <button class="map-btn" on:click={() => openMapForScene(sceneKey)}>🗺</button>
                </div>
                <div class="row-nav">
                  <span class="nav-desc">Expected: <code>{sceneKey}</code></span>
                </div>
                <div class="row-btns">
                  <button class="rb ok" class:active={s==='ok'}
                    on:click={() => setResult('map_' + sceneKey, s==='ok'?'':'ok')}>✓ OK</button>
                  <button class="rb bad" class:active={s==='wrong'}
                    on:click={() => setResult('map_' + sceneKey, s==='wrong'?'':'wrong')}>✗ Wrong</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    <!-- RIGHT: map + clicked entrance info -->
    <div class="right-pane">
      {#if mapSceneData && mapSceneKey}

        <div class="map-wrap">
          <MapModal
            scene={mapSceneKey}
            sceneData={mapSceneData}
            allScenesData={mapData}
            initialSubscene={mapInitialSubscene}
            validationMode={true}
            on:validateEntrance={handleValidateEntrance}
            on:close={closeMap}
          />
        </div>

        {#if clickedEntrance}
          {@const ce = clickedEntrance}
          {@const nav = describeLeftClick(ce)}
          {@const cs = results['ent_' + ce.id] ?? ''}
          <div class="info">
            <div class="info-head">
              <span class="info-name">{ce.name}</span>
              <button class="info-close" on:click={() => clickedEntrance = null}>✕</button>
            </div>
            <div class="info-id">{ce.id}</div>

            <div class="info-block">
              <div class="info-lbl">🖱 Left click — shows this panel (what you just did)</div>
            </div>

            <div class="info-block">
              <div class="info-lbl">🖱 Right click — executes navigation:</div>
              {#if nav.navigates}
                <div class="info-nav">Should navigate to <code>{nav.to}</code></div>
                <div class="info-how">{nav.how}</div>
              {:else}
                <div class="info-nonav">No navigation expected — {nav.how}</div>
              {/if}
            </div>

            <div class="info-btns">
              <button class="rb ok" class:active={cs==='ok'}
                on:click={() => setResult('ent_' + ce.id, cs==='ok'?'':'ok')}>✓ OK</button>
              <button class="rb bad" class:active={cs==='wrong'}
                on:click={() => setResult('ent_' + ce.id, cs==='wrong'?'':'wrong')}>✗ Wrong</button>
            </div>
          </div>
        {:else}
          <div class="map-hint">Click an entrance marker to see what it should do</div>
        {/if}

      {:else}
        <div class="map-empty">
          <p>Click 🗺 on an entrance or zone to open the map</p>
          <p class="hint">Then click a marker to verify it navigates to the right place</p>
        </div>
      {/if}
    </div>

  </div>
</div>

<style>
  :global(body) { margin: 0; background: #1a1a1a; color: #e0e0e0; font-family: sans-serif; font-size: 13px; }
  .page { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

  .topbar { display: flex; align-items: center; gap: 1em; padding: 0.5em 1em; background: #1e1e1e; border-bottom: 1px solid #333; flex-shrink: 0; flex-wrap: wrap; }
  .title { font-weight: bold; }
  .stats { display: flex; align-items: center; gap: 0.5em; font-size: 0.85em; }
  .s-done { color: #5d5; }
  .s-bad  { color: #e88; font-weight: bold; }
  .sep    { opacity: 0.3; }
  .reset-btn { margin-left: auto; padding: 2px 8px; border: 1px solid #444; border-radius: 3px; background: transparent; color: #888; cursor: pointer; font-size: 0.8em; }
  .reset-btn:hover { color: #fff; }

  .body { display: grid; grid-template-columns: 1fr 1fr; flex: 1; overflow: hidden; }

  /* List pane */
  .list-pane { display: flex; flex-direction: column; border-right: 1px solid #333; overflow: hidden; }

  .tabs { display: flex; border-bottom: 1px solid #333; flex-shrink: 0; }
  .tab { flex: 1; padding: 0.5em; background: transparent; border: none; color: #888; cursor: pointer; font-size: 0.82em; border-bottom: 2px solid transparent; }
  .tab:hover { color: #ccc; }
  .tab.active { color: #66d1ff; border-bottom-color: #66d1ff; }

  .filters { display: flex; gap: 0.4em; align-items: center; flex-wrap: wrap; padding: 0.4em; background: #1a1a1a; border-bottom: 1px solid #2a2a2a; flex-shrink: 0; }
  .fsearch { flex: 1; min-width: 100px; padding: 3px 6px; border: 1px solid #333; border-radius: 3px; background: #252525; color: #e0e0e0; font-size: 0.82em; }
  .filters select { padding: 3px 4px; border: 1px solid #333; border-radius: 3px; background: #252525; color: #e0e0e0; font-size: 0.78em; }
  .fcount { font-size: 0.75em; opacity: 0.4; }

  .list { flex: 1; overflow-y: auto; }

  .row { padding: 5px 8px; border-bottom: 1px solid #242424; border-left: 3px solid transparent; }
  .row:hover { background: #222; }
  .row-ok  { border-left-color: #5d5; }
  .row-bad { border-left-color: #e66; background: rgba(220,80,60,0.04); }

  .row-top { display: flex; align-items: center; gap: 0.3em; min-width: 0; margin-bottom: 2px; }
  .ent-name { font-size: 0.82em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .row-nav { font-size: 0.75em; margin-bottom: 4px; padding-left: 2px; }
  .nav-desc code { color: #9cf; font-size: 0.9em; }
  .nav-how { opacity: 0.5; font-style: italic; }
  .nav-none { color: #888; font-style: italic; }
  .row-btns { display: flex; gap: 3px; }

  .map-btn { padding: 1px 5px; border: 1px solid #333; border-radius: 3px; background: transparent; cursor: pointer; font-size: 0.8em; color: #888; flex-shrink: 0; }
  .map-btn:hover:not(:disabled) { color: #fff; border-color: #888; }
  .map-btn:disabled { opacity: 0.2; cursor: default; }

  .rb { padding: 2px 8px; border: 1px solid #333; border-radius: 3px; background: transparent; cursor: pointer; font-size: 0.75em; color: #666; }
  .rb:hover { color: #aaa; }
  .rb.ok.active  { background: rgba(50,200,80,0.2);  color: #5d5; border-color: #5d5; }
  .rb.bad.active { background: rgba(220,80,60,0.2);  color: #e66; border-color: #e66; }

  .tag { font-size: 0.65em; padding: 1px 3px; border-radius: 3px; white-space: nowrap; flex-shrink: 0; }
  .g-oot { background: rgba(70,130,210,0.2); color: #7eb8ff; }
  .g-mm  { background: rgba(200,60,60,0.2);  color: #ff9090; }
  .t-overworld { background: rgba(80,160,80,0.2);  color: #6c6; }
  .t-interior  { background: rgba(160,120,60,0.2); color: #ca8; }
  .t-dungeon   { background: rgba(160,60,60,0.2);  color: #e88; }
  .t-grotto    { background: rgba(60,120,160,0.2); color: #68c; }
  .t-boss      { background: rgba(200,60,200,0.2); color: #c8c; }
  .t-owl       { background: rgba(200,180,60,0.2); color: #cc8; }

  .empty { padding: 2em; text-align: center; opacity: 0.4; }

  /* Right pane */
  .right-pane { display: flex; flex-direction: column; overflow: hidden; }

  .map-wrap { flex: 1; overflow: hidden; position: relative; min-height: 0; }
  .map-wrap :global(.modal-overlay) { position: absolute !important; background: transparent !important; }
  .map-wrap :global(.modal-content) { width: 100% !important; height: 100% !important; max-width: 100% !important; max-height: 100% !important; border-radius: 0 !important; padding: 0.5em !important; }

  .info { background: #1e1e1e; border-top: 2px solid #333; padding: 0.7em 0.9em; flex-shrink: 0; display: flex; flex-direction: column; gap: 0.5em; }
  .info-head { display: flex; justify-content: space-between; align-items: flex-start; }
  .info-name { font-size: 0.88em; font-weight: bold; color: #fff; }
  .info-close { background: transparent; border: none; color: #666; cursor: pointer; }
  .info-close:hover { color: #fff; }
  .info-id { font-size: 0.7em; color: #666; font-family: monospace; }
  .info-block { display: flex; flex-direction: column; gap: 3px; }
  .info-lbl { font-size: 0.75em; opacity: 0.5; }
  .info-nav { font-size: 0.85em; } .info-nav code { color: #9cf; }
  .info-how { font-size: 0.75em; color: #888; font-style: italic; }
  .info-nonav { font-size: 0.82em; color: #888; font-style: italic; }
  .info-btns { display: flex; gap: 0.4em; }

  .map-hint { padding: 0.5em 0.8em; font-size: 0.78em; color: #666; background: #1e1e1e; border-top: 1px solid #333; }
  .map-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0.35; text-align: center; }
  .map-empty p { margin: 0.3em 0; }
  .hint { font-size: 0.85em; line-height: 1.6; }
</style>
