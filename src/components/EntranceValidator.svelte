<script lang="ts">
  import { allEntrances, findReverseEntrance, type ErSettingKey } from '../data/entranceData';
  import { entrancePositions } from '../data/entrancePositions';
  import type { EntranceInfo } from '../data/entranceData';
  import { defaultErSettings, type ErSettings } from '../util/spoilerParser';
  import { filterEntrances } from '../util/erFilter';

  const erSettings: ErSettings = JSON.parse(
    localStorage.getItem('erSettings') ?? JSON.stringify(defaultErSettings)
  );
  const filteredBase = filterEntrances(allEntrances, erSettings);

  // ── Validation state ──────────────────────────────────────
  const KEY = 'entrance-validator-v5';
  let results: Record<string, 'ok'|'wrong'|''> = (() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
  })();
  function set(id: string, v: 'ok'|'wrong'|'') {
    results[id] = v; results = {...results};
    localStorage.setItem(KEY, JSON.stringify(results));
  }
  function cycleMap(entId: string) {
    const cur = results['m_' + entId] ?? '';
    const next = cur === '' ? 'ok' : cur === 'ok' ? 'wrong' : '';
    set('m_' + entId, next);
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

  // ── Entrance filters ──────────────────────────────────────
  let filterStatus = 'all', filterGame = 'all', search = '';
  const typeLabels: Record<string, string> = {
    overworld: 'OW', interior: 'Int', dungeon: 'Dgn', grotto: 'Grotto', boss: 'Boss', owl: 'Owl',
  };
  const erTypeOrder = ['erOverworld','erDungeons','erIndoors','erGrottos','erOneWays','erWallmasters','erSpawns','erAlterLw'];
  const erTypeLabels: Record<string, string> = {
    erOverworld: 'Overworld', erDungeons: 'Dungeons', erIndoors: 'Indoors',
    erGrottos: 'Grottos', erOneWays: 'One-ways',
    erWallmasters: 'Wallmasters', erSpawns: 'Spawns', erAlterLw: 'Lost Woods Alt',
  };

  let collapsedGroups: Set<string> = new Set(
    JSON.parse(localStorage.getItem('validator-collapsed') ?? '[]')
  );
  function toggleGroup(key: string) {
    if (collapsedGroups.has(key)) collapsedGroups.delete(key);
    else collapsedGroups.add(key);
    collapsedGroups = new Set(collapsedGroups);
    localStorage.setItem('validator-collapsed', JSON.stringify([...collapsedGroups]));
  }

  $: baseRows = filteredBase
    .filter(e => filterGame === 'all' || e.game === filterGame)
    .filter(e => {
      const s = results['e_' + e.id] ?? '';
      if (filterStatus === 'pending') return s === '';
      if (filterStatus === 'ok') return s === 'ok';
      if (filterStatus === 'wrong') return s === 'wrong';
      return true;
    })
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()));

  $: groupedRows = erTypeOrder
    .map(ert => ({ ert, rows: baseRows.filter(e => e.erType === ert) }))
    .filter(g => g.rows.length > 0);

  $: entRows = baseRows; // for fcount
  // ── Stats ─────────────────────────────────────────────────
  $: entTotal = filteredBase.length;
  $: mapTotal = filteredBase.filter(e => entrancePositions.some(p => p.entranceId === e.id)).length;
  $: entDone    = Object.entries(results).filter(([k,v]) => !k.startsWith('m_') && v !== '').length;
  $: mapDone    = Object.entries(results).filter(([k,v]) => k.startsWith('m_') && v !== '').length;
  $: entBad     = Object.entries(results).filter(([k,v]) => !k.startsWith('m_') && v === 'wrong').length;
  $: mapBad     = Object.entries(results).filter(([k,v]) => k.startsWith('m_') && v === 'wrong').length;
</script>

<div class="page">

  <header class="topbar">
    <span class="title">Entrance Validator</span>
    <span class="stat">Entrances: <b>{entDone}/{entTotal}</b>{#if entBad > 0} <em>⚠{entBad}</em>{/if}</span>
    <span class="stat">Maps: <b>{mapDone}/{mapTotal}</b>{#if mapBad > 0} <em>⚠{mapBad}</em>{/if}</span>
    <div class="pbar"><div class="fill" style="width:{entTotal?(entDone/entTotal*100).toFixed(1):0}%"></div></div>
    <button type="button" class="reset-btn" on:click={resetAll}>Reset all</button>
  </header>

  <div class="filters">
    <input class="fsearch" placeholder="Search…" bind:value={search} />
    <select bind:value={filterGame}>
      <option value="all">All</option><option value="oot">OoT</option><option value="mm">MM</option>
    </select>
    <select bind:value={filterStatus}>
      <option value="all">All</option><option value="pending">Pending</option>
      <option value="ok">OK</option><option value="wrong">Wrong</option>
    </select>
    <span class="fcount">{entRows.length}</span>
  </div>

  <div class="help">
    Test in the real tracker · <b>🗺</b> = has map position · <b>🖱R</b> on marker → navigates to destination below
  </div>

  <div class="list">
    {#each groupedRows as { ert, rows }}
      {@const groupDone = rows.filter(e => (results['e_' + e.id] ?? '') !== '').length}
      {@const groupOk   = rows.filter(e => (results['e_' + e.id] ?? '') === 'ok').length}
      {@const groupBad  = rows.filter(e => (results['e_' + e.id] ?? '') === 'wrong').length}
      {@const collapsed = collapsedGroups.has(ert)}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="group-header" on:click={() => toggleGroup(ert)}>
        <span class="group-toggle">{collapsed ? '▶' : '▼'}</span>
        <span class="group-name">{erTypeLabels[ert] ?? ert}</span>
        <span class="group-count">{groupDone}/{rows.length}</span>
        {#if groupOk > 0}<span class="group-ok">✓{groupOk}</span>{/if}
        {#if groupBad > 0}<span class="group-bad">✗{groupBad}</span>{/if}
      </div>
      {#if !collapsed}
        {#each rows as ent}
          {@const s = results['e_' + ent.id] ?? ''}
          {@const nav = describeNav(ent)}
          {@const hasPos = entrancePositions.some(p => p.entranceId === ent.id)}
          <div class="row" class:row-ok={s==='ok'} class:row-bad={s==='wrong'}>
            <div class="row-left">
              <span class="tag t-{ent.type}">{typeLabels[ent.type] ?? ent.type}</span>
              <span class="tag g-{ent.game}">{ent.game.toUpperCase()}</span>
              {#if hasPos}<span class="map-icon" title="Has map position">🗺</span>{/if}
              <span class="ent-name" title={ent.id}>{ent.name}</span>
            </div>
            <div class="row-right">
              {#if hasPos && nav !== '—'}
                <span class="nav-dest">🖱R → <code>{nav}</code></span>
              {:else if !hasPos}
                <span class="no-pos-txt">no map pos</span>
              {/if}
              <button type="button" class="rb ok" class:active={s==='ok'}
                on:click={() => set('e_' + ent.id, s==='ok'?'':'ok')}>✓</button>
              <button type="button" class="rb bad" class:active={s==='wrong'}
                on:click={() => set('e_' + ent.id, s==='wrong'?'':'wrong')}>✗</button>
              {#if hasPos}
                {@const ms = results['m_' + ent.id] ?? ''}
                <button type="button" class="rb map-val" class:map-ok={ms==='ok'} class:map-bad={ms==='wrong'}
                  title="Map button: click to cycle none→✓→✗"
                  on:click={() => cycleMap(ent.id)}>🗺{ms === 'ok' ? '✓' : ms === 'wrong' ? '✗' : ''}</button>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    {/each}
    {#if groupedRows.length === 0}<div class="empty">No entrances match.</div>{/if}
  </div>

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

  .map-icon { font-size: 0.75em; flex-shrink: 0; opacity: 0.6; }

  .filters { display: flex; gap: 0.4em; align-items: center; flex-wrap: wrap; padding: 0.4em 0.8em; background: #1a1a1a; border-bottom: 1px solid #242424; flex-shrink: 0; }
  .fsearch { width: 160px; padding: 3px 6px; border: 1px solid #333; border-radius: 3px; background: #252525; color: #e0e0e0; font-size: 0.82em; }
  .filters select { padding: 3px 4px; border: 1px solid #333; border-radius: 3px; background: #252525; color: #e0e0e0; font-size: 0.78em; }
  .fcount { font-size: 0.75em; opacity: 0.4; }

  .help { padding: 0.35em 0.9em; font-size: 0.78em; color: #888; background: #1e1e1e; border-bottom: 1px solid #282828; flex-shrink: 0; }

  .list { flex: 1; overflow-y: auto; }

  .group-header {
    display: flex; align-items: center; gap: 0.5em;
    padding: 5px 10px; background: #212121;
    border-bottom: 1px solid #2a2a2a; border-top: 1px solid #2a2a2a;
    cursor: pointer; user-select: none; position: sticky; top: 0; z-index: 2;
  }
  .group-header:hover { background: #262626; }
  .group-toggle { font-size: 0.65em; color: #666; flex-shrink: 0; }
  .group-name { font-weight: 600; font-size: 0.82em; }
  .group-count { font-size: 0.75em; color: #888; margin-left: 0.2em; }
  .group-ok  { font-size: 0.75em; color: #5d5; margin-left: auto; }
  .group-bad { font-size: 0.75em; color: #e66; }

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
  .rb.ok.active   { background: rgba(50,200,80,0.2);  color: #5d5; border-color: #5d5; }
  .rb.bad.active  { background: rgba(220,80,60,0.2);  color: #e66; border-color: #e66; }
  .rb.map-val         { min-width: 2.8em; }
  .rb.map-val.map-ok  { background: rgba(50,200,80,0.2);  color: #5d5; border-color: #5d5; }
  .rb.map-val.map-bad { background: rgba(220,80,60,0.2);  color: #e66; border-color: #e66; }

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
