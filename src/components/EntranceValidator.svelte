<script lang="ts">
  import { onMount } from 'svelte';
  import { allEntrances, entrancePositions, findReverseEntrance } from '../data/entranceData';
  import type { EntranceInfo } from '../data/entranceData';
  import type { MapData } from '../util/mapData';
  import { buildMapData } from '../util/mapData';
  import MapModal from './MapModal.svelte';

  let mapData: MapData | null = null;
  onMount(async () => { mapData = await buildMapData(new Map()); });

  // Status stored in localStorage
  const STORAGE_KEY = 'entrance-validator-status';
  let statusMap: Record<string, 'ok' | 'wrong' | ''> = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { return {}; }
  })();
  function setStatus(id: string, s: 'ok' | 'wrong' | '') {
    statusMap[id] = s;
    statusMap = { ...statusMap };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statusMap));
  }

  // Filters
  let filterType: string = 'all';
  let filterStatus: string = 'all';
  let filterGame: string = 'all';
  let search = '';

  const typeLabels: Record<string, string> = {
    overworld: 'Overworld', interior: 'Interior', dungeon: 'Dungeon',
    grotto: 'Grotto', boss: 'Boss', owl: 'Owl',
  };

  // Build rows — one per entrance
  $: rows = allEntrances
    .filter(e => filterGame === 'all' || e.game === filterGame)
    .filter(e => filterType === 'all' || e.type === filterType)
    .filter(e => filterStatus === 'all' || (statusMap[e.id] ?? '') === filterStatus)
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()))
    .map(e => ({
      ent: e,
      reverse: findReverseEntrance(e),
      hasPos: entrancePositions.some(p => p.entranceId === e.id),
      status: statusMap[e.id] ?? '',
    }));

  $: total = allEntrances.length;
  $: ok = Object.values(statusMap).filter(v => v === 'ok').length;
  $: wrong = Object.values(statusMap).filter(v => v === 'wrong').length;

  // Map modal
  let showMap = false;
  let mapScene: string | null = null;
  let mapSceneData: any = null;
  let mapInitialSubscene: string | undefined = undefined;

  function openMap(ent: EntranceInfo) {
    if (!mapData) return;
    const pos = entrancePositions.find(p => p.entranceId === ent.id);
    if (!pos) return;
    const scene = Object.entries(mapData).find(([, sd]) => sd.subscenes[pos.renderscene]);
    if (!scene) return;
    mapScene = scene[0];
    mapSceneData = scene[1];
    mapInitialSubscene = pos.renderscene;
    showMap = true;
  }

  function resetAll() {
    if (!confirm('Reset all statuses?')) return;
    statusMap = {};
    localStorage.removeItem(STORAGE_KEY);
  }
</script>

<div class="validator">
  <div class="val-header">
    <h1>Entrance Validator</h1>
    <div class="val-stats">
      <span class="stat stat-ok">✓ {ok}</span>
      <span class="stat stat-wrong">✗ {wrong}</span>
      <span class="stat stat-pending">? {total - ok - wrong}</span>
      <span class="stat">/ {total}</span>
      <button class="reset-btn" on:click={resetAll}>Reset all</button>
    </div>
  </div>

  <div class="val-filters">
    <input class="val-search" type="text" placeholder="Search…" bind:value={search} />
    <select bind:value={filterGame}>
      <option value="all">All games</option>
      <option value="oot">OoT</option>
      <option value="mm">MM</option>
    </select>
    <select bind:value={filterType}>
      <option value="all">All types</option>
      {#each Object.entries(typeLabels) as [v, l]}
        <option value={v}>{l}</option>
      {/each}
    </select>
    <select bind:value={filterStatus}>
      <option value="all">All statuses</option>
      <option value="ok">✓ OK</option>
      <option value="wrong">✗ Wrong</option>
      <option value="">? Pending</option>
    </select>
    <span class="val-count">{rows.length} shown</span>
  </div>

  <div class="val-table">
    <div class="val-row val-head">
      <span>Entrance</span>
      <span>Reverse</span>
      <span>Map</span>
      <span>Status</span>
    </div>
    {#each rows as { ent, reverse, hasPos, status }}
      <div class="val-row" class:row-ok={status === 'ok'} class:row-wrong={status === 'wrong'}>
        <div class="val-ent">
          <span class="type-tag type-{ent.type}">{typeLabels[ent.type] ?? ent.type}</span>
          <span class="game-tag game-{ent.game}">{ent.game.toUpperCase()}</span>
          <span class="ent-name" title={ent.id}>{ent.name}</span>
        </div>
        <div class="val-reverse">
          {#if reverse}
            <span class="rev-found" title={reverse.id}>✓ {reverse.name}</span>
          {:else}
            <span class="rev-missing">✗ no reverse</span>
          {/if}
        </div>
        <div class="val-map">
          {#if hasPos}
            <button class="map-btn" on:click={() => openMap(ent)} disabled={!mapData}>
              🗺 Map
            </button>
          {:else}
            <span class="no-pos">no pos</span>
          {/if}
        </div>
        <div class="val-status">
          <button class="status-btn ok-btn" class:active={status === 'ok'}
            on:click={() => setStatus(ent.id, status === 'ok' ? '' : 'ok')}>✓</button>
          <button class="status-btn wrong-btn" class:active={status === 'wrong'}
            on:click={() => setStatus(ent.id, status === 'wrong' ? '' : 'wrong')}>✗</button>
        </div>
      </div>
    {/each}
    {#if rows.length === 0}
      <div class="val-empty">No entrances match the filters.</div>
    {/if}
  </div>
</div>

{#if showMap && mapSceneData && mapScene}
  <MapModal
    sceneData={mapSceneData}
    scene={mapScene}
    initialSubscene={mapInitialSubscene}
    allScenesData={mapData}
    checkStates={new Map()}
    entranceValues={new Map()}
    spoilerErSettings={{}}
    spoilerExtraEr={{}}
    on:close={() => { showMap = false; }}
  />
{/if}

<style>
  .validator {
    padding: 1.5em;
    max-width: 1200px;
    margin: 0 auto;
    font-size: 0.9em;
  }

  .val-header {
    display: flex;
    align-items: center;
    gap: 1.5em;
    margin-bottom: 1em;
  }
  .val-header h1 { margin: 0; font-size: 1.4em; }

  .val-stats { display: flex; align-items: center; gap: 0.7em; font-weight: bold; }
  .stat { padding: 2px 8px; border-radius: 4px; font-size: 0.9em; }
  .stat-ok { background: rgba(50,200,80,0.2); color: #4c4; }
  .stat-wrong { background: rgba(200,50,50,0.2); color: #e55; }
  .stat-pending { background: rgba(150,150,150,0.15); color: #aaa; }

  .reset-btn {
    margin-left: 0.5em;
    padding: 3px 10px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    font-size: 0.8em;
    opacity: 0.6;
  }
  .reset-btn:hover { opacity: 1; }

  .val-filters {
    display: flex;
    gap: 0.5em;
    align-items: center;
    margin-bottom: 1em;
    flex-wrap: wrap;
  }
  .val-search {
    flex: 1;
    min-width: 180px;
    padding: 4px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
  }
  .val-filters select {
    padding: 4px 6px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
  }
  .val-count { font-size: 0.85em; opacity: 0.6; margin-left: auto; }

  .val-table { display: flex; flex-direction: column; gap: 2px; }

  .val-head {
    display: grid;
    grid-template-columns: 1fr 1fr 80px 90px;
    gap: 0.5em;
    padding: 4px 8px;
    font-weight: bold;
    font-size: 0.8em;
    opacity: 0.6;
    border-bottom: 1px solid var(--color-border);
  }

  .val-row {
    display: grid;
    grid-template-columns: 1fr 1fr 80px 90px;
    gap: 0.5em;
    align-items: center;
    padding: 5px 8px;
    border-radius: 4px;
    border: 1px solid transparent;
    background: var(--color-unchecked);
  }
  .val-row.row-ok { border-color: rgba(50,200,80,0.3); background: rgba(50,200,80,0.06); }
  .val-row.row-wrong { border-color: rgba(200,50,50,0.3); background: rgba(200,50,50,0.06); }

  .val-ent { display: flex; align-items: center; gap: 0.4em; min-width: 0; }
  .ent-name { font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .type-tag, .game-tag {
    font-size: 0.7em;
    padding: 1px 5px;
    border-radius: 3px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .game-tag { background: rgba(100,100,255,0.15); color: #88f; }
  .type-overworld { background: rgba(80,160,80,0.2); color: #6c6; }
  .type-interior  { background: rgba(160,120,60,0.2); color: #ca8; }
  .type-dungeon   { background: rgba(160,60,60,0.2); color: #e88; }
  .type-grotto    { background: rgba(60,120,160,0.2); color: #68c; }
  .type-boss      { background: rgba(200,60,200,0.2); color: #c8c; }
  .type-owl       { background: rgba(200,180,60,0.2); color: #cc8; }

  .rev-found { font-size: 0.8em; color: #6c6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
  .rev-missing { font-size: 0.8em; color: #e55; opacity: 0.7; }

  .map-btn {
    padding: 3px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    font-size: 0.8em;
    white-space: nowrap;
  }
  .map-btn:hover:not(:disabled) { background: var(--color-primary); color: #000; }
  .map-btn:disabled { opacity: 0.3; cursor: default; }
  .no-pos { font-size: 0.75em; opacity: 0.4; }

  .val-status { display: flex; gap: 0.4em; }
  .status-btn {
    width: 28px; height: 28px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: transparent;
    cursor: pointer;
    font-size: 0.9em;
    color: var(--color-text);
    opacity: 0.4;
    transition: opacity 0.1s, background 0.1s;
  }
  .status-btn:hover { opacity: 0.8; }
  .ok-btn.active { background: rgba(50,200,80,0.3); color: #4c4; border-color: #4c4; opacity: 1; }
  .wrong-btn.active { background: rgba(200,50,50,0.3); color: #e55; border-color: #e55; opacity: 1; }

  .val-empty { padding: 2em; text-align: center; opacity: 0.5; }
</style>
