<script lang="ts">
  import { allEntrances, findReverseEntrance, entranceById } from '../data/entranceData';
  import { entrancePositions } from '../data/entrancePositions';
  import type { EntranceInfo } from '../data/entranceData';

  const STORAGE_KEY = 'entrance-validator-v2';
  type TestResult = { leftClick: 'ok'|'wrong'|''; rightClick: 'ok'|'wrong'|'' };
  let results: Record<string, TestResult> = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { return {}; }
  })();
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(results)); }

  function setLeft(id: string, v: 'ok'|'wrong'|'') {
    results[id] = { ...(results[id] ?? { leftClick:'', rightClick:'' }), leftClick: v };
    results = { ...results }; save();
  }
  function setRight(id: string, v: 'ok'|'wrong'|'') {
    results[id] = { ...(results[id] ?? { leftClick:'', rightClick:'' }), rightClick: v };
    results = { ...results }; save();
  }

  let filterType = 'all';
  let filterStatus = 'all';
  let filterGame = 'all';
  let search = '';

  const typeLabels: Record<string, string> = {
    overworld: 'OW', interior: 'Int', dungeon: 'Dgn', grotto: 'Grotto', boss: 'Boss', owl: 'Owl',
  };

  // Get the scene label for an entrance position
  function sceneOf(ent: EntranceInfo): string {
    const pos = entrancePositions.find(p => p.entranceId === ent.id);
    return pos?.renderscene ?? '—';
  }

  // What left-click should navigate to (vanilla = reverse entrance's renderscene)
  function expectedLeftClick(ent: EntranceInfo): string {
    const rev = findReverseEntrance(ent);
    if (!rev) return '? (no reverse)';
    const pos = entrancePositions.find(p => p.entranceId === rev.id);
    return pos?.renderscene ?? `? (${rev.id} has no pos)`;
  }

  $: rows = allEntrances
    .filter(e => entrancePositions.some(p => p.entranceId === e.id)) // only entrances with a map position
    .filter(e => filterGame === 'all' || e.game === filterGame)
    .filter(e => filterType === 'all' || e.type === filterType)
    .filter(e => {
      if (filterStatus === 'all') return true;
      const r = results[e.id];
      if (filterStatus === 'done') return r?.leftClick !== '' && r?.rightClick !== '';
      if (filterStatus === 'pending') return !r?.leftClick && !r?.rightClick;
      if (filterStatus === 'issues') return r?.leftClick === 'wrong' || r?.rightClick === 'wrong';
      return true;
    })
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()))
    .map(e => ({
      ent: e,
      reverse: findReverseEntrance(e),
      scene: sceneOf(e),
      expectedNav: expectedLeftClick(e),
      r: results[e.id] ?? { leftClick: '', rightClick: '' },
    }));

  $: withPos = allEntrances.filter(e => entrancePositions.some(p => p.entranceId === e.id)).length;
  $: done = Object.values(results).filter(r => r.leftClick !== '' && r.rightClick !== '').length;
  $: issues = Object.values(results).filter(r => r.leftClick === 'wrong' || r.rightClick === 'wrong').length;

  function resetAll() {
    if (!confirm('Reset all results?')) return;
    results = {}; localStorage.removeItem(STORAGE_KEY);
  }
</script>

<div class="validator">
  <div class="val-header">
    <h1>Entrance Validator</h1>
    <div class="stats">
      <span class="s-done">✓ {done} / {withPos} tested</span>
      {#if issues > 0}<span class="s-issues">⚠ {issues} issues</span>{/if}
      <div class="pbar"><div class="pbar-fill" style="width:{(done/withPos*100).toFixed(1)}%"></div></div>
      <button class="reset-btn" on:click={resetAll}>Reset</button>
    </div>
  </div>

  <div class="help-box">
    <strong>How to use:</strong>
    1. Open the tracker in another tab &nbsp;·&nbsp;
    2. Find the entrance on the map &nbsp;·&nbsp;
    3. <b>Left click</b> the dot → should navigate to the expected scene &nbsp;·&nbsp;
    4. In placement mode, <b>right click</b> the dot → should remove the marker &nbsp;·&nbsp;
    5. Mark ✓ or ✗ for each below
  </div>

  <div class="filters">
    <input class="fsearch" type="text" placeholder="Search…" bind:value={search} />
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
      <option value="all">All</option>
      <option value="pending">Pending</option>
      <option value="done">Done</option>
      <option value="issues">Issues only</option>
    </select>
    <span class="fcount">{rows.length} shown</span>
  </div>

  <div class="table">
    <div class="thead">
      <span>Entrance</span>
      <span>Scene (map)</span>
      <span>Left click → expected scene</span>
      <span class="center">🖱L</span>
      <span class="center">🖱R</span>
    </div>
    {#each rows as { ent, reverse, scene, expectedNav, r }}
      {@const rowDone = r.leftClick !== '' && r.rightClick !== ''}
      {@const rowIssue = r.leftClick === 'wrong' || r.rightClick === 'wrong'}
      <div class="trow" class:done={rowDone && !rowIssue} class:issue={rowIssue}>
        <div class="cell-name">
          <span class="tag t-{ent.type}">{typeLabels[ent.type] ?? ent.type}</span>
          <span class="tag g-{ent.game}">{ent.game.toUpperCase()}</span>
          <span class="name" title={ent.id}>{ent.name}</span>
        </div>
        <div class="cell-scene">
          <code>{scene}</code>
        </div>
        <div class="cell-nav">
          {#if reverse}
            <span class="nav-ok">→ <code>{expectedNav}</code></span>
          {:else}
            <span class="nav-none">no reverse — no navigation expected</span>
          {/if}
        </div>
        <div class="cell-btn center">
          <button class="tb ok" class:active={r.leftClick==='ok'}
            title="Left click navigates correctly"
            on:click={() => setLeft(ent.id, r.leftClick==='ok' ? '' : 'ok')}>✓</button>
          <button class="tb bad" class:active={r.leftClick==='wrong'}
            title="Left click does NOT work"
            on:click={() => setLeft(ent.id, r.leftClick==='wrong' ? '' : 'wrong')}>✗</button>
        </div>
        <div class="cell-btn center">
          <button class="tb ok" class:active={r.rightClick==='ok'}
            title="Right click removes marker correctly"
            on:click={() => setRight(ent.id, r.rightClick==='ok' ? '' : 'ok')}>✓</button>
          <button class="tb bad" class:active={r.rightClick==='wrong'}
            title="Right click does NOT work"
            on:click={() => setRight(ent.id, r.rightClick==='wrong' ? '' : 'wrong')}>✗</button>
        </div>
      </div>
    {/each}
    {#if rows.length === 0}
      <div class="empty">No entrances match the filters.</div>
    {/if}
  </div>
</div>

<style>
  :global(body) { margin: 0; background: #1a1a1a; color: #e0e0e0; font-family: sans-serif; font-size: 14px; }

  .validator { padding: 1.2em; max-width: 1200px; margin: 0 auto; }

  .val-header { display: flex; align-items: center; gap: 1em; margin-bottom: 0.6em; flex-wrap: wrap; }
  .val-header h1 { margin: 0; font-size: 1.3em; }

  .stats { display: flex; align-items: center; gap: 0.7em; flex-wrap: wrap; }
  .s-done   { font-weight: bold; color: #5d5; font-size: 0.9em; }
  .s-issues { font-weight: bold; color: #e88; font-size: 0.9em; }
  .pbar { width: 100px; height: 7px; background: #333; border-radius: 4px; overflow: hidden; }
  .pbar-fill { height: 100%; background: #5d5; transition: width 0.3s; }
  .reset-btn { padding: 2px 8px; border: 1px solid #555; border-radius: 4px; background: transparent; color: #aaa; cursor: pointer; font-size: 0.8em; }
  .reset-btn:hover { color: #fff; }

  .help-box {
    background: #252525; border: 1px solid #3a3a3a; border-radius: 6px;
    padding: 0.6em 1em; margin-bottom: 0.8em; font-size: 0.82em;
    color: #bbb; line-height: 1.6;
  }

  .filters { display: flex; gap: 0.5em; align-items: center; margin-bottom: 0.7em; flex-wrap: wrap; }
  .fsearch { flex: 1; min-width: 150px; padding: 4px 8px; border: 1px solid #444; border-radius: 4px; background: #252525; color: #e0e0e0; }
  .filters select { padding: 4px 6px; border: 1px solid #444; border-radius: 4px; background: #252525; color: #e0e0e0; }
  .fcount { margin-left: auto; font-size: 0.82em; opacity: 0.5; }

  .table { display: flex; flex-direction: column; gap: 2px; }

  .thead {
    display: grid; grid-template-columns: 1.8fr 1fr 1.2fr 64px 64px;
    gap: 0.5em; padding: 4px 8px;
    font-size: 0.75em; font-weight: bold; opacity: 0.5;
    border-bottom: 1px solid #333;
  }

  .trow {
    display: grid; grid-template-columns: 1.8fr 1fr 1.2fr 64px 64px;
    gap: 0.5em; align-items: center;
    padding: 5px 8px; border-radius: 4px;
    border: 1px solid transparent; background: #232323;
  }
  .trow:hover { background: #282828; }
  .trow.done  { border-color: rgba(50,200,80,0.2);  background: rgba(50,200,80,0.04); }
  .trow.issue { border-color: rgba(220,100,60,0.3); background: rgba(220,100,60,0.05); }

  .cell-name { display: flex; align-items: center; gap: 0.3em; min-width: 0; }
  .name { font-size: 0.83em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .tag { font-size: 0.65em; padding: 1px 4px; border-radius: 3px; white-space: nowrap; flex-shrink: 0; }
  .g-oot { background: rgba(70,130,210,0.2); color: #7eb8ff; }
  .g-mm  { background: rgba(200,60,60,0.2);  color: #ff9090; }
  .t-overworld { background: rgba(80,160,80,0.2);  color: #6c6; }
  .t-interior  { background: rgba(160,120,60,0.2); color: #ca8; }
  .t-dungeon   { background: rgba(160,60,60,0.2);  color: #e88; }
  .t-grotto    { background: rgba(60,120,160,0.2); color: #68c; }
  .t-boss      { background: rgba(200,60,200,0.2); color: #c8c; }
  .t-owl       { background: rgba(200,180,60,0.2); color: #cc8; }

  .cell-scene code { font-size: 0.78em; color: #aaa; }

  .nav-ok   { font-size: 0.8em; color: #6af; }
  .nav-ok code { color: #9cf; font-size: 0.9em; }
  .nav-none { font-size: 0.78em; color: #888; font-style: italic; }

  .center { display: flex; justify-content: center; align-items: center; gap: 3px; }

  .tb {
    width: 26px; height: 24px; border-radius: 3px;
    border: 1px solid #444; background: transparent;
    cursor: pointer; font-size: 0.82em; color: #888;
    transition: all 0.1s;
  }
  .tb:hover { color: #ccc; border-color: #888; }
  .tb.ok.active  { background: rgba(50,200,80,0.25);  color: #5d5; border-color: #5d5; }
  .tb.bad.active { background: rgba(220,80,60,0.25);  color: #e66; border-color: #e66; }

  .empty { padding: 2em; text-align: center; opacity: 0.4; }
</style>
