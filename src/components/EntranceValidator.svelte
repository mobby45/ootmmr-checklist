<script lang="ts">
  import { onMount } from 'svelte';
  import { allEntrances, findReverseEntrance, entranceById } from '../data/entranceData';
  import { entrancePositions } from '../data/entrancePositions';
  import type { EntranceInfo } from '../data/entranceData';
  import { buildMapData, type MapData, type SceneData } from '../util/mapData';
  import MapModal from './MapModal.svelte';

  let mapData: MapData | null = null;
  onMount(async () => { mapData = await buildMapData(new Map()); });

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

  // ── What left/right click does in vanilla ─────────────────
  function describeNav(ent: EntranceInfo): { navigates: true; to: string; how: string } | { navigates: false; how: string } {
    const rev = findReverseEntrance(ent);
    if (rev) {
      const pos = entrancePositions.find(p => p.entranceId === rev.id);
      if (pos) return { navigates: true, to: pos.renderscene, how: rev.name };
    }
    const oneWay = entrancePositions.find(p => p.entranceId === ent.id && p.targetScene);
    if (oneWay) return { navigates: true, to: oneWay.targetScene!, how: 'one-way' };
    if (mapData) {
      for (const sd of Object.values(mapData)) {
        if (sd.subscenes[ent.id]) return { navigates: true, to: ent.id, how: 'subscene match' };
      }
    }
    return { navigates: false, how: rev ? `reverse ${rev.id} has no map pos` : 'no reverse' };
  }

  // ── Filters ───────────────────────────────────────────────
  let filterType = 'all', filterStatus = 'all', filterGame = 'all', search = '';
  const typeLabels: Record<string, string> = {
    overworld: 'OW', interior: 'Int', dungeon: 'Dgn', grotto: 'Grotto', boss: 'Boss', owl: 'Owl',
  };

  $: rows = allEntrances
    .filter(e => entrancePositions.some(p => p.entranceId === e.id))
    .filter(e => filterGame === 'all' || e.game === filterGame)
    .filter(e => filterType === 'all' || e.type === filterType)
    .filter(e => {
      const s = results[e.id] ?? '';
      if (filterStatus === 'pending') return s === '';
      if (filterStatus === 'ok') return s === 'ok';
      if (filterStatus === 'wrong') return s === 'wrong';
      return true;
    })
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()));

  $: total = allEntrances.filter(e => entrancePositions.some(p => p.entranceId === e.id)).length;
  $: done = Object.values(results).filter(v => v !== '').length;
  $: issues = Object.values(results).filter(v => v === 'wrong').length;

  // ── Map modal ─────────────────────────────────────────────
  let showMap = false;
  let mapSceneKey = '';
  let mapSceneData: SceneData | null = null;
  let mapInitialSubscene = '';
  let clickedEntrance: EntranceInfo | null = null;

  function openMap(ent: EntranceInfo) {
    if (!mapData) return;
    const pos = entrancePositions.find(p => p.entranceId === ent.id);
    if (!pos) return;
    const entry = Object.entries(mapData).find(([, sd]) => sd.subscenes[pos.renderscene]);
    if (!entry) return;
    mapSceneKey = entry[0];
    mapSceneData = entry[1];
    mapInitialSubscene = pos.renderscene;
    clickedEntrance = null;
    showMap = true;
  }

  function handleValidateEntrance(e: CustomEvent<{entranceId: string}>) {
    const ent = entranceById[e.detail.entranceId];
    if (ent) clickedEntrance = ent;
  }
</script>

<div class="page">

  <header class="topbar">
    <span class="title">Entrance Validator</span>
    <div class="stats">
      <span class="s-done">✓ {done}/{total}</span>
      {#if issues > 0}<span class="s-bad">⚠ {issues}</span>{/if}
      <div class="pbar"><div class="fill" style="width:{total?(done/total*100).toFixed(1):0}%"></div></div>
    </div>
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
      <span class="fcount">{rows.length}</span>
    </div>
    <button class="reset-btn" on:click={resetAll}>Reset</button>
  </header>

  <div class="list">
    {#each rows as ent}
      {@const s = results[ent.id] ?? ''}
      {@const nav = describeNav(ent)}
      <div class="row" class:row-ok={s==='ok'} class:row-bad={s==='wrong'}>
        <div class="row-top">
          <span class="tag t-{ent.type}">{typeLabels[ent.type]}</span>
          <span class="tag g-{ent.game}">{ent.game.toUpperCase()}</span>
          <span class="ent-name" title={ent.id}>{ent.name}</span>
        </div>
        <div class="row-bottom">
          <div class="nav-info">
            {#if nav.navigates}
              <span class="nav-ok">🖱R → <code>{nav.to}</code> <span class="nav-how">({nav.how})</span></span>
            {:else}
              <span class="nav-none">🖱R → no navigation ({nav.how})</span>
            {/if}
          </div>
          <div class="row-actions">
            <button class="map-btn" on:click={() => openMap(ent)} disabled={!mapData}>🗺 Map</button>
            <button class="rb ok" class:active={s==='ok'}
              on:click={() => setResult(ent.id, s==='ok'?'':'ok')}>✓</button>
            <button class="rb bad" class:active={s==='wrong'}
              on:click={() => setResult(ent.id, s==='wrong'?'':'wrong')}>✗</button>
          </div>
        </div>
      </div>
    {/each}
    {#if rows.length === 0}<div class="empty">No entrances match.</div>{/if}
  </div>

</div>

<!-- Map modal overlay -->
{#if showMap && mapSceneData && mapSceneKey}
  <div class="modal-overlay" on:click|self={() => { showMap = false; clickedEntrance = null; }}>
    <div class="modal-box">
      <MapModal
        scene={mapSceneKey}
        sceneData={mapSceneData}
        allScenesData={mapData}
        initialSubscene={mapInitialSubscene}
        validationMode={true}
        on:validateEntrance={handleValidateEntrance}
        on:close={() => { showMap = false; clickedEntrance = null; }}
      />

      {#if clickedEntrance}
        {@const ce = clickedEntrance}
        {@const nav = describeNav(ce)}
        {@const cs = results[ce.id] ?? ''}
        <div class="info-panel">
          <div class="info-top">
            <span class="info-name">{ce.name}</span>
            <button class="info-close" on:click={() => clickedEntrance = null}>✕</button>
          </div>
          <div class="info-lbl">🖱 Left click → shows this panel</div>
          <div class="info-lbl">🖱 Right click → navigates to:</div>
          {#if nav.navigates}
            <code class="info-dest">{nav.to}</code>
            <span class="info-how">{nav.how}</span>
          {:else}
            <span class="info-nonav">No navigation — {nav.how}</span>
          {/if}
          <div class="info-btns">
            <button class="rb ok lg" class:active={cs==='ok'}
              on:click={() => setResult(ce.id, cs==='ok'?'':'ok')}>✓ OK</button>
            <button class="rb bad lg" class:active={cs==='wrong'}
              on:click={() => setResult(ce.id, cs==='wrong'?'':'wrong')}>✗ Wrong</button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  :global(body) { margin: 0; background: #1a1a1a; color: #e0e0e0; font-family: sans-serif; font-size: 13px; }
  .page { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

  .topbar {
    display: flex; align-items: center; gap: 0.8em; flex-wrap: wrap;
    padding: 0.5em 1em; background: #1e1e1e; border-bottom: 1px solid #333; flex-shrink: 0;
  }
  .title { font-weight: bold; white-space: nowrap; }
  .stats { display: flex; align-items: center; gap: 0.5em; }
  .s-done { color: #5d5; font-size: 0.88em; font-weight: bold; }
  .s-bad  { color: #e88; font-size: 0.88em; font-weight: bold; }
  .pbar { width: 70px; height: 6px; background: #333; border-radius: 3px; overflow: hidden; }
  .fill { height: 100%; background: #5d5; transition: width 0.3s; }
  .filters { display: flex; gap: 0.4em; align-items: center; flex-wrap: wrap; }
  .fsearch { width: 160px; padding: 3px 6px; border: 1px solid #333; border-radius: 3px; background: #252525; color: #e0e0e0; font-size: 0.82em; }
  .filters select { padding: 3px 4px; border: 1px solid #333; border-radius: 3px; background: #252525; color: #e0e0e0; font-size: 0.78em; }
  .fcount { font-size: 0.75em; opacity: 0.4; }
  .reset-btn { margin-left: auto; padding: 2px 8px; border: 1px solid #444; border-radius: 3px; background: transparent; color: #888; cursor: pointer; font-size: 0.8em; }
  .reset-btn:hover { color: #fff; }

  .list { flex: 1; overflow-y: auto; }

  .row { padding: 5px 10px; border-bottom: 1px solid #242424; border-left: 3px solid transparent; }
  .row:hover { background: #212121; }
  .row-ok  { border-left-color: #5d5; }
  .row-bad { border-left-color: #e66; background: rgba(220,80,60,0.04); }

  .row-top { display: flex; align-items: center; gap: 0.3em; min-width: 0; margin-bottom: 3px; }
  .ent-name { font-size: 0.83em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }

  .row-bottom { display: flex; align-items: center; justify-content: space-between; gap: 0.5em; }
  .nav-info { font-size: 0.75em; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-ok code { color: #9cf; font-size: 0.9em; }
  .nav-how { opacity: 0.45; font-style: italic; }
  .nav-none { color: #777; font-style: italic; }

  .row-actions { display: flex; gap: 3px; flex-shrink: 0; }
  .map-btn { padding: 2px 7px; border: 1px solid #444; border-radius: 3px; background: transparent; cursor: pointer; font-size: 0.78em; color: #aaa; }
  .map-btn:hover:not(:disabled) { border-color: #66d1ff; color: #66d1ff; }
  .map-btn:disabled { opacity: 0.25; cursor: default; }

  .rb { padding: 2px 8px; border: 1px solid #333; border-radius: 3px; background: transparent; cursor: pointer; font-size: 0.8em; color: #666; }
  .rb:hover { color: #aaa; }
  .rb.ok.active  { background: rgba(50,200,80,0.2);  color: #5d5; border-color: #5d5; }
  .rb.bad.active { background: rgba(220,80,60,0.2);  color: #e66; border-color: #e66; }
  .rb.lg { padding: 4px 14px; font-size: 0.88em; }

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

  /* Modal overlay */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.75);
    display: flex; align-items: center; justify-content: center;
    z-index: 100;
  }
  .modal-box {
    position: relative;
    width: min(95vw, 900px);
    height: min(92vh, 800px);
    display: flex; flex-direction: column;
    background: #1a1a1a; border-radius: 8px; overflow: hidden;
  }
  .modal-box :global(.modal-overlay) { position: absolute !important; background: transparent !important; }
  .modal-box :global(.modal-content) {
    width: 100% !important; height: 100% !important;
    max-width: 100% !important; max-height: 100% !important;
    border-radius: 0 !important; flex: 1;
  }

  /* Info panel inside modal */
  .info-panel {
    background: #1e1e1e; border-top: 2px solid #444;
    padding: 0.7em 1em; display: flex; flex-direction: column; gap: 0.4em;
    flex-shrink: 0;
  }
  .info-top { display: flex; justify-content: space-between; align-items: center; }
  .info-name { font-weight: bold; font-size: 0.9em; }
  .info-close { background: transparent; border: none; color: #666; cursor: pointer; font-size: 1em; }
  .info-close:hover { color: #fff; }
  .info-lbl { font-size: 0.75em; opacity: 0.55; }
  .info-dest { font-size: 0.85em; color: #9cf; background: rgba(100,180,255,0.1); padding: 2px 7px; border-radius: 3px; }
  .info-how { font-size: 0.75em; color: #888; font-style: italic; }
  .info-nonav { font-size: 0.8em; color: #777; font-style: italic; }
  .info-btns { display: flex; gap: 0.5em; margin-top: 0.2em; }
</style>
