<script lang="ts">
  import { onMount } from 'svelte';
  import { allEntrances, findReverseEntrance, entranceById } from '../data/entranceData';
  import { entrancePositions } from '../data/entrancePositions';
  import type { EntranceInfo } from '../data/entranceData';
  import { buildMapData, type MapData, type SceneData } from '../util/mapData';
  import MapModal from './MapModal.svelte';

  // ── Data ──────────────────────────────────────────────────
  let mapData: MapData | null = null;
  onMount(async () => { mapData = await buildMapData(new Map()); });

  const spoilerEntrances: Record<string, string> = (() => {
    try { return JSON.parse(localStorage.getItem('spoilerEntrances') ?? 'null') ?? {}; } catch { return {}; }
  })();
  const hasSpoiler = Object.keys(spoilerEntrances).length > 0;

  // ── Validation state ──────────────────────────────────────
  const STORAGE_KEY = 'entrance-validator-v3';
  type EntResult = { leftClick: 'ok'|'wrong'|''; rightClick: 'ok'|'wrong'|'' };
  let results: Record<string, EntResult> = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { return {}; }
  })();
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(results)); }
  function setLeft(id: string, v: 'ok'|'wrong'|'') {
    results[id] = { ...(results[id] ?? {leftClick:'',rightClick:''}), leftClick: v };
    results = {...results}; save();
  }
  function setRight(id: string, v: 'ok'|'wrong'|'') {
    results[id] = { ...(results[id] ?? {leftClick:'',rightClick:''}), rightClick: v };
    results = {...results}; save();
  }
  function resetAll() {
    if (!confirm('Reset all results?')) return;
    results = {}; localStorage.removeItem(STORAGE_KEY);
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
      const r = results[e.id];
      if (filterStatus === 'all') return true;
      if (filterStatus === 'done') return r?.leftClick !== '' && r?.rightClick !== '';
      if (filterStatus === 'pending') return !r?.leftClick && !r?.rightClick;
      if (filterStatus === 'issues') return r?.leftClick === 'wrong' || r?.rightClick === 'wrong';
      return true;
    })
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()))
    .map(e => ({
      ent: e,
      reverse: findReverseEntrance(e),
      r: results[e.id] ?? {leftClick:'', rightClick:''},
    }));

  $: withPos = allEntrances.filter(e => entrancePositions.some(p => p.entranceId === e.id)).length;
  $: done = Object.values(results).filter(r => r.leftClick !== '' && r.rightClick !== '').length;
  $: issues = Object.values(results).filter(r => r.leftClick === 'wrong' || r.rightClick === 'wrong').length;

  // ── Map panel ─────────────────────────────────────────────
  let mapEntrance: EntranceInfo | null = null;
  let mapSceneKey: string | null = null;
  let mapSceneData: SceneData | null = null;
  let mapInitialSubscene: string = '';

  function openMap(ent: EntranceInfo) {
    if (!mapData) return;
    const pos = entrancePositions.find(p => p.entranceId === ent.id);
    if (!pos) return;
    const entry = Object.entries(mapData).find(([, sd]) => sd.subscenes[pos.renderscene]);
    if (!entry) return;
    mapEntrance = ent;
    mapSceneKey = entry[0];
    mapSceneData = entry[1];
    mapInitialSubscene = pos.renderscene;
    clickedEntrance = null;
  }

  function closeMap() {
    mapEntrance = null; mapSceneKey = null; mapSceneData = null; clickedEntrance = null;
  }

  // ── Entrance click info (from map) ────────────────────────
  let clickedEntrance: EntranceInfo | null = null;

  function handleValidateEntrance(e: CustomEvent<{entranceId: string}>) {
    const ent = entranceById[e.detail.entranceId];
    if (ent) clickedEntrance = ent;
  }

  function getVanillaDest(ent: EntranceInfo): string {
    const rev = findReverseEntrance(ent);
    if (!rev) return '—';
    const pos = entrancePositions.find(p => p.entranceId === rev.id);
    return pos?.renderscene ?? rev.name;
  }

  function getERDest(ent: EntranceInfo): string | null {
    return hasSpoiler ? (spoilerEntrances[ent.id] ?? null) : null;
  }
</script>

<div class="page">

  <!-- ── TOP BAR ── -->
  <header class="topbar">
    <span class="title">Entrance Validator</span>
    <div class="stats">
      <span class="s-done">✓ {done}/{withPos}</span>
      {#if issues > 0}<span class="s-issues">⚠ {issues} issues</span>{/if}
      <div class="pbar"><div class="pbar-fill" style="width:{withPos?(done/withPos*100).toFixed(1):0}%"></div></div>
    </div>
    {#if !hasSpoiler}<span class="no-spoiler">⚠ No spoiler — ER destination unavailable</span>{/if}
    <button class="reset-btn" on:click={resetAll}>Reset all</button>
  </header>

  <!-- ── BODY ── -->
  <div class="body">

    <!-- LEFT: list -->
    <div class="list-pane">
      <div class="filters">
        <input class="fsearch" type="text" placeholder="Search…" bind:value={search} />
        <select bind:value={filterGame}>
          <option value="all">All</option>
          <option value="oot">OoT</option>
          <option value="mm">MM</option>
        </select>
        <select bind:value={filterType}>
          <option value="all">All types</option>
          {#each Object.entries(typeLabels) as [v, l]}<option value={v}>{l}</option>{/each}
        </select>
        <select bind:value={filterStatus}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
          <option value="issues">Issues</option>
        </select>
        <span class="fcount">{rows.length}</span>
      </div>

      <div class="list">
        {#each rows as { ent, reverse, r }}
          {@const rowDone = r.leftClick !== '' && r.rightClick !== ''}
          {@const rowIssue = r.leftClick === 'wrong' || r.rightClick === 'wrong'}
          {@const isSelected = mapEntrance?.id === ent.id}
          <div class="row"
            class:row-done={rowDone && !rowIssue}
            class:row-issue={rowIssue}
            class:row-selected={isSelected}
          >
            <div class="row-main">
              <div class="row-info">
                <span class="tag t-{ent.type}">{typeLabels[ent.type]}</span>
                <span class="tag g-{ent.game}">{ent.game.toUpperCase()}</span>
                <span class="ent-name" title={ent.id}>{ent.name}</span>
              </div>
              <div class="row-rev">
                {#if reverse}
                  <span class="rev-ok" title={reverse.id}>↩ {reverse.name}</span>
                {:else}
                  <span class="rev-none">no reverse</span>
                {/if}
              </div>
            </div>
            <div class="row-actions">
              <button class="map-btn" on:click={() => openMap(ent)} disabled={!mapData}
                class:map-active={isSelected}>🗺</button>
              <button class="sb ok" class:active={r.leftClick==='ok'}
                title="Left click OK" on:click={() => setLeft(ent.id, r.leftClick==='ok'?'':'ok')}>🖱L✓</button>
              <button class="sb bad" class:active={r.leftClick==='wrong'}
                title="Left click Wrong" on:click={() => setLeft(ent.id, r.leftClick==='wrong'?'':'wrong')}>🖱L✗</button>
              <button class="sb ok" class:active={r.rightClick==='ok'}
                title="Right click OK" on:click={() => setRight(ent.id, r.rightClick==='ok'?'':'ok')}>🖱R✓</button>
              <button class="sb bad" class:active={r.rightClick==='wrong'}
                title="Right click Wrong" on:click={() => setRight(ent.id, r.rightClick==='wrong'?'':'wrong')}>🖱R✗</button>
            </div>
          </div>
        {/each}
        {#if rows.length === 0}
          <div class="empty">No entrances match the filters.</div>
        {/if}
      </div>
    </div>

    <!-- RIGHT: map + info panel -->
    <div class="right-pane">
      {#if mapSceneData && mapSceneKey}
        <div class="map-container">
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
          {@const vanillaDest = getVanillaDest(ce)}
          {@const erDest = getERDest(ce)}
          {@const cr = results[ce.id] ?? {leftClick:'', rightClick:''}}
          <div class="info-panel">
            <div class="ip-header">
              <span class="ip-name">{ce.name}</span>
              <button class="ip-close" on:click={() => clickedEntrance = null}>✕</button>
            </div>
            <div class="ip-row">
              <span class="ip-lbl">Vanilla →</span>
              <code class="ip-vanilla">{vanillaDest}</code>
            </div>
            {#if hasSpoiler}
              <div class="ip-row">
                <span class="ip-lbl">ER →</span>
                <code class="ip-er">{erDest ?? '—'}</code>
              </div>
            {/if}
            <div class="ip-tests">
              <div class="ip-test">
                <span>🖱 Left click</span>
                <div class="ip-btns">
                  <button class="tb ok" class:active={cr.leftClick==='ok'}
                    on:click={() => setLeft(ce.id, cr.leftClick==='ok'?'':'ok')}>✓</button>
                  <button class="tb bad" class:active={cr.leftClick==='wrong'}
                    on:click={() => setLeft(ce.id, cr.leftClick==='wrong'?'':'wrong')}>✗</button>
                </div>
              </div>
              <div class="ip-test">
                <span>🖱 Right click</span>
                <div class="ip-btns">
                  <button class="tb ok" class:active={cr.rightClick==='ok'}
                    on:click={() => setRight(ce.id, cr.rightClick==='ok'?'':'ok')}>✓</button>
                  <button class="tb bad" class:active={cr.rightClick==='wrong'}
                    on:click={() => setRight(ce.id, cr.rightClick==='wrong'?'':'wrong')}>✗</button>
                </div>
              </div>
            </div>
          </div>
        {:else}
          <div class="map-hint">Click an entrance marker to inspect it</div>
        {/if}

      {:else}
        <div class="map-empty">
          <p>Click 🗺 on an entrance to open its map</p>
          <p class="hint">Then click a marker → inspect vanilla &amp; ER destination, mark ✓/✗</p>
        </div>
      {/if}
    </div>

  </div>
</div>

<style>
  :global(body) { margin: 0; background: #1a1a1a; color: #e0e0e0; font-family: sans-serif; font-size: 13px; }

  .page { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

  /* Top bar */
  .topbar {
    display: flex; align-items: center; gap: 1em; flex-wrap: wrap;
    padding: 0.5em 1em; background: #1e1e1e; border-bottom: 1px solid #333;
    flex-shrink: 0;
  }
  .title { font-weight: bold; font-size: 1em; white-space: nowrap; }
  .stats { display: flex; align-items: center; gap: 0.6em; }
  .s-done   { color: #5d5; font-weight: bold; font-size: 0.88em; }
  .s-issues { color: #e88; font-weight: bold; font-size: 0.88em; }
  .pbar { width: 80px; height: 6px; background: #333; border-radius: 3px; overflow: hidden; }
  .pbar-fill { height: 100%; background: #5d5; transition: width 0.3s; }
  .no-spoiler { color: #e88; font-size: 0.78em; }
  .reset-btn { margin-left: auto; padding: 2px 8px; border: 1px solid #444; border-radius: 3px; background: transparent; color: #888; cursor: pointer; font-size: 0.8em; }
  .reset-btn:hover { color: #ccc; }

  /* Body */
  .body { display: grid; grid-template-columns: 1fr 1fr; flex: 1; overflow: hidden; }

  /* List pane */
  .list-pane { display: flex; flex-direction: column; border-right: 1px solid #333; overflow: hidden; }

  .filters {
    display: flex; gap: 0.4em; align-items: center; flex-wrap: wrap;
    padding: 0.5em; background: #1e1e1e; border-bottom: 1px solid #2a2a2a; flex-shrink: 0;
  }
  .fsearch { flex: 1; min-width: 120px; padding: 3px 7px; border: 1px solid #333; border-radius: 3px; background: #252525; color: #e0e0e0; font-size: 0.82em; }
  .filters select { padding: 3px 5px; border: 1px solid #333; border-radius: 3px; background: #252525; color: #e0e0e0; font-size: 0.82em; }
  .fcount { font-size: 0.78em; opacity: 0.4; }

  .list { flex: 1; overflow-y: auto; }

  .row {
    padding: 5px 8px; border-bottom: 1px solid #242424;
    background: #1e1e1e;
  }
  .row:hover { background: #232323; }
  .row-done     { border-left: 3px solid #5d5; }
  .row-issue    { border-left: 3px solid #e66; background: rgba(220,80,60,0.04); }
  .row-selected { background: rgba(102,209,255,0.06) !important; border-left: 3px solid #66d1ff; }

  .row-main { display: flex; flex-direction: column; gap: 2px; margin-bottom: 4px; }
  .row-info { display: flex; align-items: center; gap: 0.3em; min-width: 0; }
  .ent-name { font-size: 0.82em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row-rev { font-size: 0.75em; padding-left: 2px; }
  .rev-ok   { color: #5d5; }
  .rev-none { color: #666; font-style: italic; }

  .row-actions { display: flex; gap: 3px; align-items: center; }
  .map-btn { padding: 2px 6px; border: 1px solid #333; border-radius: 3px; background: transparent; cursor: pointer; font-size: 0.82em; color: #888; }
  .map-btn:hover:not(:disabled) { background: #2a2a2a; color: #fff; }
  .map-btn.map-active { border-color: #66d1ff; color: #66d1ff; }
  .map-btn:disabled { opacity: 0.3; cursor: default; }
  .sb { padding: 2px 5px; border: 1px solid #333; border-radius: 3px; background: transparent; cursor: pointer; font-size: 0.72em; color: #666; white-space: nowrap; }
  .sb:hover { color: #aaa; }
  .sb.ok.active  { background: rgba(50,200,80,0.2);  color: #5d5; border-color: #5d5; }
  .sb.bad.active { background: rgba(220,80,60,0.2);  color: #e66; border-color: #e66; }

  .tag { font-size: 0.65em; padding: 1px 3px; border-radius: 3px; white-space: nowrap; flex-shrink: 0; }
  .g-oot { background: rgba(70,130,210,0.2); color: #7eb8ff; }
  .g-mm  { background: rgba(200,60,60,0.2);  color: #ff9090; }
  .t-overworld { background: rgba(80,160,80,0.2);  color: #6c6; }
  .t-interior  { background: rgba(160,120,60,0.2); color: #ca8; }
  .t-dungeon   { background: rgba(160,60,60,0.2);  color: #e88; }
  .t-grotto    { background: rgba(60,120,160,0.2); color: #68c; }
  .t-boss      { background: rgba(200,60,200,0.2); color: #c8c; }
  .t-owl       { background: rgba(200,180,60,0.2); color: #cc8; }

  /* Right pane */
  .right-pane {
    display: flex; flex-direction: column; overflow: hidden; position: relative;
  }

  .map-container { flex: 1; overflow: hidden; position: relative; min-height: 0; }
  .map-container :global(.modal-overlay) {
    position: absolute !important;
    background: transparent !important;
  }
  .map-container :global(.modal-content) {
    width: 100% !important; height: 100% !important;
    max-width: 100% !important; max-height: 100% !important;
    border-radius: 0 !important; padding: 0.5em !important;
  }

  /* Info panel (below map) */
  .info-panel {
    flex-shrink: 0; background: #1e1e1e; border-top: 1px solid #333;
    padding: 0.6em 0.8em; display: flex; flex-direction: column; gap: 0.5em;
  }
  .ip-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .ip-name { font-size: 0.85em; font-weight: bold; color: #fff; }
  .ip-close { background: transparent; border: none; color: #888; cursor: pointer; font-size: 0.9em; }
  .ip-close:hover { color: #fff; }
  .ip-row { display: flex; align-items: center; gap: 0.5em; }
  .ip-lbl { font-size: 0.75em; opacity: 0.5; width: 55px; flex-shrink: 0; }
  .ip-vanilla { font-size: 0.78em; color: #9cf; background: rgba(100,180,255,0.08); padding: 2px 6px; border-radius: 3px; }
  .ip-er      { font-size: 0.78em; color: #fc8; background: rgba(255,160,80,0.08);  padding: 2px 6px; border-radius: 3px; }
  .ip-tests { display: flex; gap: 0.8em; }
  .ip-test { display: flex; align-items: center; gap: 0.4em; font-size: 0.8em; }
  .ip-btns { display: flex; gap: 3px; }
  .tb { width: 28px; height: 24px; border-radius: 3px; border: 1px solid #444; background: transparent; cursor: pointer; font-size: 0.85em; color: #888; }
  .tb:hover { color: #ccc; }
  .tb.ok.active  { background: rgba(50,200,80,0.2);  color: #5d5; border-color: #5d5; }
  .tb.bad.active { background: rgba(220,80,60,0.2);  color: #e66; border-color: #e66; }

  .map-hint { padding: 0.5em 0.8em; font-size: 0.78em; opacity: 0.4; background: #1e1e1e; border-top: 1px solid #333; }

  .map-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0.35; text-align: center; }
  .map-empty p { margin: 0.3em 0; }
  .hint { font-size: 0.85em; line-height: 1.6; }

  .empty { padding: 2em; text-align: center; opacity: 0.4; }
</style>
