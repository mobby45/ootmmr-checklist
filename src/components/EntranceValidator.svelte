<script lang="ts">
  import { allEntrances, findReverseEntrance, bossExitIds, entranceSubTypes, type ErSettingKey } from '../data/entranceData';
  import { entrancePositions } from '../data/entrancePositions';
  import type { EntranceInfo } from '../data/entranceData';
  import { defaultErSettings, type ErSettings } from '../util/spoilerParser';

  // ── Replicate ER tracker filter from localStorage erSettings ──
  const erSettings: ErSettings = JSON.parse(
    localStorage.getItem('erSettings') ?? JSON.stringify(defaultErSettings)
  );

  const subTypeGroups = [
    { parent: 'erDungeons', keys: ['erMajorDungeons','erMinorDungeons','erGanonCastle','erGanonTower','erMoon','erSpiderHouses','erPirateFortress','erBeneathWell','erIkanaCastle','erSecretShrine'] },
    { parent: 'erIndoors',  keys: ['erIndoorsMajor','erIndoorsExtra','erIndoorsGameLinks'] },
    { parent: 'erOneWays',  keys: ['erOneWaysMajor','erOneWaysIkana','erOneWaysSongs','erOneWaysStatues','erOneWaysWaterVoids','erOneWaysAnywhere','erOneWaysOwls'] },
  ];
  const subTypeIdSets = Object.fromEntries(
    Object.entries(entranceSubTypes).map(([k, ids]) => [k, new Set(ids)])
  ) as Record<string, Set<string>>;
  const activeErTypes = new Set<ErSettingKey>(
    (Object.keys(erSettings) as ErSettingKey[]).filter(k => erSettings[k as keyof ErSettings])
  );
  const hasActiveSubTypes = new Set(
    subTypeGroups.filter(g => g.keys.some(k => (erSettings as any)[k])).map(g => g.parent)
  );
  function hasSubTypeGroup(erType: string) { return subTypeGroups.some(g => g.parent === erType); }
  function matchesSubTypes(id: string, erType: ErSettingKey): boolean {
    if (!hasSubTypeGroup(erType)) return true;
    if (!hasActiveSubTypes.has(erType)) return false;
    for (const g of subTypeGroups) {
      if (g.parent !== erType) continue;
      for (const k of g.keys) {
        if ((erSettings as any)[k] && subTypeIdSets[k]?.has(id)) return true;
      }
    }
    return false;
  }

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

  // ── Entrance filters ──────────────────────────────────────
  let filterType = 'all', filterStatus = 'all', filterGame = 'all', search = '';
  const typeLabels: Record<string, string> = {
    overworld: 'OW', interior: 'Int', dungeon: 'Dgn', grotto: 'Grotto', boss: 'Boss', owl: 'Owl',
  };

  $: entRows = allEntrances
    .filter(e => !bossExitIds.has(e.id))
    .filter(e => activeErTypes.has(e.erType))
    .filter(e => matchesSubTypes(e.id, e.erType))
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

  // ── Stats ─────────────────────────────────────────────────
  $: entTotal = allEntrances.filter(e => !bossExitIds.has(e.id) && activeErTypes.has(e.erType) && matchesSubTypes(e.id, e.erType)).length;
  $: entDone  = Object.values(results).filter(v => v !== '').length;
  $: entBad   = Object.values(results).filter(v => v === 'wrong').length;
</script>

<div class="page">

  <header class="topbar">
    <span class="title">Entrance Validator</span>
    <span class="stat">Entrances: <b>{entDone}/{entTotal}</b>{#if entBad > 0} <em>⚠{entBad}</em>{/if}</span>
    <span class="stat">Maps: <b>{mapDone}/{mapZones.length}</b>{#if mapBad > 0} <em>⚠{mapBad}</em>{/if}</span>
    <div class="pbar"><div class="fill" style="width:{entTotal?((entDone+mapDone)/(entTotal+mapZones.length)*100).toFixed(1):0}%"></div></div>
    <button class="reset-btn" on:click={resetAll}>Reset all</button>
  </header>

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
    Test in the real tracker · <b>🗺</b> = has map position · <b>🖱R</b> on marker → navigates to destination below
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
          {#if hasPos}<span class="map-icon" title="Has map position">🗺</span>{/if}
          <span class="ent-name" title={ent.id}>{ent.name}</span>
        </div>
        <div class="row-right">
          {#if hasPos && nav !== '—'}
            <span class="nav-dest">🖱R → <code>{nav}</code></span>
          {:else if !hasPos}
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
