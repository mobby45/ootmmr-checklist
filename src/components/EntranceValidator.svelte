<script lang="ts">
  import { allEntrances, findReverseEntrance, bossExitIds } from '../data/entranceData';
  import { entrancePositions } from '../data/entrancePositions';
  import type { EntranceInfo } from '../data/entranceData';

  // ── Validation state ──────────────────────────────────────
  const KEY = 'entrance-validator-v5';
  let results: Record<string, 'ok'|'wrong'|''> = (() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
  })();
  function set(id: string, v: 'ok'|'wrong'|'') {
    results[id] = v; results = {...results};
    localStorage.setItem(KEY, JSON.stringify(results));
  }
  function resetAll() {
    if (!confirm('Reset all results?')) return;
    results = {}; localStorage.removeItem(KEY);
  }

  // ── What right-click navigates to ────────────────────────
  function describeNav(ent: EntranceInfo): string {
    const rev = findReverseEntrance(ent);
    if (rev) {
      const pos = entrancePositions.find(p => p.entranceId === rev.id);
      if (pos) return pos.renderscene;
    }
    const oneWay = entrancePositions.find(p => p.entranceId === ent.id && p.targetScene);
    if (oneWay) return oneWay.targetScene! + ' (one-way)';
    return '—';
  }

  // ── Tabs ─────────────────────────────────────────────────
  let tab: 'entrances' | 'maps' = 'entrances';

  // ── Entrance filters ──────────────────────────────────────
  let filterType = 'all', filterStatus = 'all', filterGame = 'all', search = '';
  const typeLabels: Record<string, string> = {
    overworld: 'OW', interior: 'Int', dungeon: 'Dgn', grotto: 'Grotto', boss: 'Boss', owl: 'Owl',
  };

  $: entRows = allEntrances
    .filter(e => !bossExitIds.has(e.id))
    .filter(e => filterGame === 'all' || e.game === filterGame)
    .filter(e => filterType === 'all' || e.type === filterType)
    .filter(e => {
      const s = results['e_' + e.id] ?? '';
      if (filterStatus === 'pending') return s === '';
      if (filterStatus === 'ok') return s === 'ok';
      if (filterStatus === 'wrong') return s === 'wrong';
      return true;
    })
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()));

  // ── Zone map button list (mirrors groupToSceneMapping + all scenes) ──
  const mapZones: { label: string; expected: string }[] = [
    { label: "Hyrule/Ganon's Castle Exterior", expected: 'OOT_HYRULE_GANON_CASTLE' },
    { label: "Jabu Jabu's Belly",   expected: 'OOT_INSIDE_JABU_JABU' },
    { label: 'Forest Temple',       expected: 'OOT_TEMPLE_FOREST' },
    { label: 'Fire Temple',         expected: 'OOT_TEMPLE_FIRE' },
    { label: 'Water Temple',        expected: 'OOT_TEMPLE_WATER' },
    { label: 'Shadow Temple',       expected: 'OOT_TEMPLE_SHADOW' },
    { label: 'Spirit Temple',       expected: 'OOT_TEMPLE_SPIRIT' },
    { label: "Ganon's Castle",      expected: 'OOT_INSIDE_GANON_CASTLE' },
    { label: 'South Clock Town',    expected: 'MM_CLOCK_TOWN_SOUTH' },
    { label: 'North Clock Town',    expected: 'MM_CLOCK_TOWN_NORTH' },
    { label: 'East Clock Town',     expected: 'MM_CLOCK_TOWN_EAST' },
    { label: 'West Clock Town',     expected: 'MM_CLOCK_TOWN_WEST' },
    { label: 'Road To Southern Swamp', expected: 'MM_ROAD_SOUTHERN_SWAMP' },
    { label: 'Swamp Spider House',  expected: 'MM_SPIDER_HOUSE_SWAMP' },
    { label: 'Path To Mountain Village', expected: 'MM_PATH_MOUNTAIN_VILLAGE' },
    { label: 'Mountain Village',    expected: 'MM_MOUNTAIN_VILLAGE_SPRING' },
    { label: 'Path To Snowhead',    expected: 'MM_PATH_SNOWHEAD' },
    { label: 'Pirates Fortress',    expected: 'MM_PIRATE_FORTRESS' },
    { label: 'Ocean Spider House',  expected: 'MM_SPIDER_HOUSE_OCEAN' },
    { label: 'Road To Ikana',       expected: 'MM_ROAD_IKANA' },
    { label: 'Ikana Castle',        expected: 'MM_CASTLE_IKANA' },
    { label: 'Woodfall Temple',     expected: 'MM_TEMPLE_WOODFALL' },
    { label: 'Snowhead Temple',     expected: 'MM_TEMPLE_SNOWHEAD' },
    { label: 'Great Bay Temple',    expected: 'MM_TEMPLE_GREAT_BAY' },
    { label: 'Stone Tower Temple',  expected: 'MM_TEMPLE_STONE_TOWER / MM_TEMPLE_STONE_TOWER_INVERTED' },
    { label: 'The Moon',            expected: 'MM_MOON' },
  ];

  // ── Stats ─────────────────────────────────────────────────
  $: entTotal = allEntrances.filter(e => !bossExitIds.has(e.id)).length;
  $: entDone  = Object.entries(results).filter(([k,v]) => k.startsWith('e_') && v !== '').length;
  $: entBad   = Object.entries(results).filter(([k,v]) => k.startsWith('e_') && v === 'wrong').length;
  $: mapDone  = Object.entries(results).filter(([k,v]) => k.startsWith('m_') && v !== '').length;
  $: mapBad   = Object.entries(results).filter(([k,v]) => k.startsWith('m_') && v === 'wrong').length;
</script>

<div class="page">

  <header class="topbar">
    <span class="title">Entrance Validator</span>
    <span class="stat">Entrances: <b>{entDone}/{entTotal}</b>{#if entBad > 0} <em>⚠{entBad}</em>{/if}</span>
    <span class="stat">Maps: <b>{mapDone}/{mapZones.length}</b>{#if mapBad > 0} <em>⚠{mapBad}</em>{/if}</span>
    <div class="pbar"><div class="fill" style="width:{entTotal?((entDone+mapDone)/(entTotal+mapZones.length)*100).toFixed(1):0}%"></div></div>
    <button class="reset-btn" on:click={resetAll}>Reset all</button>
  </header>

  <div class="tabs">
    <button class="tab" class:active={tab==='entrances'} on:click={() => tab='entrances'}>
      Entrance markers ({entTotal})
    </button>
    <button class="tab" class:active={tab==='maps'} on:click={() => tab='maps'}>
      Map buttons ({mapZones.length})
    </button>
  </div>

  {#if tab === 'entrances'}
    <div class="filters">
      <input class="fsearch" placeholder="Search…" bind:value={search} />
      <select bind:value={filterGame}>
        <option value="all">All</option><option value="oot">OoT</option><option value="mm">MM</option>
      </select>
      <select bind:value={filterType}>
        <option value="all">All types</option>
        {#each Object.entries(typeLabels) as [v,l]}<option value={v}>{l}</option>{/each}
      </select>
      <select bind:value={filterStatus}>
        <option value="all">All</option><option value="pending">Pending</option>
        <option value="ok">OK</option><option value="wrong">Wrong</option>
      </select>
      <span class="fcount">{entRows.length}</span>
    </div>

    <div class="help">
      Test in the real tracker: <b>🖱 Left click</b> a marker → shows info panel &nbsp;·&nbsp;
      <b>🖱 Right click</b> a marker → navigates to the destination shown below
    </div>

    <div class="list">
      {#each entRows as ent}
        {@const s = results['e_' + ent.id] ?? ''}
        {@const nav = describeNav(ent)}
        {@const hasPos = entrancePositions.some(p => p.entranceId === ent.id)}
        <div class="row" class:row-ok={s==='ok'} class:row-bad={s==='wrong'}>
          <div class="row-left">
            <span class="tag t-{ent.type}">{typeLabels[ent.type] ?? ent.type}</span>
            <span class="tag g-{ent.game}">{ent.game.toUpperCase()}</span>
            <span class="ent-name" title={ent.id}>{ent.name}</span>
            {#if !hasPos}<span class="no-pos" title="No map position">·</span>{/if}
          </div>
          <div class="row-right">
            {#if hasPos}
              <span class="nav-dest" title="🖱R navigates here">→ <code>{nav}</code></span>
            {:else}
              <span class="no-pos-txt">no map pos</span>
            {/if}
            <button class="rb ok" class:active={s==='ok'}
              on:click={() => set('e_' + ent.id, s==='ok'?'':'ok')}>✓</button>
            <button class="rb bad" class:active={s==='wrong'}
              on:click={() => set('e_' + ent.id, s==='wrong'?'':'wrong')}>✗</button>
          </div>
        </div>
      {/each}
      {#if entRows.length === 0}<div class="empty">No entrances match.</div>{/if}
    </div>

  {:else}
    <div class="help">
      Test in the real tracker: click the <b>🗺 map button</b> on a zone → verify it opens the expected scene below, then mark ✓/✗
    </div>
    <div class="list">
      {#each mapZones as z}
        {@const s = results['m_' + z.expected] ?? ''}
        <div class="row" class:row-ok={s==='ok'} class:row-bad={s==='wrong'}>
          <div class="row-left">
            <span class="ent-name">{z.label}</span>
          </div>
          <div class="row-right">
            <span class="nav-dest">→ <code>{z.expected}</code></span>
            <button class="rb ok" class:active={s==='ok'}
              on:click={() => set('m_' + z.expected, s==='ok'?'':'ok')}>✓</button>
            <button class="rb bad" class:active={s==='wrong'}
              on:click={() => set('m_' + z.expected, s==='wrong'?'':'wrong')}>✗</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

</div>

<style>
  :global(body) { margin: 0; background: #1a1a1a; color: #e0e0e0; font-family: sans-serif; font-size: 13px; }
  .page { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

  .topbar { display: flex; align-items: center; gap: 0.8em; flex-wrap: wrap; padding: 0.5em 1em; background: #1e1e1e; border-bottom: 1px solid #333; flex-shrink: 0; }
  .title { font-weight: bold; }
  .stat { font-size: 0.85em; } .stat b { color: #5d5; } .stat em { color: #e88; font-style: normal; }
  .pbar { width: 80px; height: 6px; background: #333; border-radius: 3px; overflow: hidden; }
  .fill { height: 100%; background: #5d5; transition: width 0.3s; }
  .reset-btn { margin-left: auto; padding: 2px 8px; border: 1px solid #444; border-radius: 3px; background: transparent; color: #888; cursor: pointer; font-size: 0.8em; }
  .reset-btn:hover { color: #fff; }

  .tabs { display: flex; border-bottom: 1px solid #333; flex-shrink: 0; background: #1a1a1a; }
  .tab { flex: 1; padding: 0.45em; background: transparent; border: none; border-bottom: 2px solid transparent; color: #888; cursor: pointer; font-size: 0.83em; }
  .tab:hover { color: #ccc; }
  .tab.active { color: #66d1ff; border-bottom-color: #66d1ff; }

  .filters { display: flex; gap: 0.4em; align-items: center; flex-wrap: wrap; padding: 0.4em 0.8em; background: #1a1a1a; border-bottom: 1px solid #242424; flex-shrink: 0; }
  .fsearch { width: 160px; padding: 3px 6px; border: 1px solid #333; border-radius: 3px; background: #252525; color: #e0e0e0; font-size: 0.82em; }
  .filters select { padding: 3px 4px; border: 1px solid #333; border-radius: 3px; background: #252525; color: #e0e0e0; font-size: 0.78em; }
  .fcount { font-size: 0.75em; opacity: 0.4; }

  .help { padding: 0.35em 0.9em; font-size: 0.78em; color: #888; background: #1e1e1e; border-bottom: 1px solid #282828; flex-shrink: 0; }

  .list { flex: 1; overflow-y: auto; }

  .row { display: flex; align-items: center; justify-content: space-between; gap: 0.5em; padding: 4px 10px; border-bottom: 1px solid #222; border-left: 3px solid transparent; }
  .row:hover { background: #212121; }
  .row-ok  { border-left-color: #5d5; }
  .row-bad { border-left-color: #e66; background: rgba(220,80,60,0.04); }

  .row-left { display: flex; align-items: center; gap: 0.3em; min-width: 0; flex: 1; overflow: hidden; }
  .ent-name { font-size: 0.82em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .no-pos { color: #555; font-size: 0.8em; }

  .row-right { display: flex; align-items: center; gap: 0.4em; flex-shrink: 0; }
  .nav-dest { font-size: 0.75em; color: #888; white-space: nowrap; }
  .nav-dest code { color: #9cf; font-size: 0.9em; }
  .no-pos-txt { font-size: 0.72em; color: #555; font-style: italic; }

  .rb { padding: 2px 8px; border: 1px solid #333; border-radius: 3px; background: transparent; cursor: pointer; font-size: 0.8em; color: #666; }
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
</style>
