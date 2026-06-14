<script lang="ts">
  import { allEntrances, entranceSubTypes, subTypeLabels, findReverseEntrance } from '../data/entranceData';
  import { defaultErSettings, type ErSettings } from '../util/spoilerParser';
  import { filterEntrances, erActiveTypes } from '../util/erFilter';
  import type { Map as YMap } from 'yjs';
  import EntranceSelect from './EntranceSelect.svelte';
  import { createEventDispatcher, tick, onMount, beforeUpdate, afterUpdate } from 'svelte';
  import { entrancePositions } from '../data/entrancePositions';
  import { erActiveSettingsStore } from '../stores/logicStore';

  const dispatch = createEventDispatcher();

  $: entranceHasMap = new Set(entrancePositions.map(p => p.entranceId));

  export let yEntrances: YMap<string>;
  export let entranceValues: Map<string, string>;
  export let spoilerErSettings: ErSettings | null = null;
  // Extra ER settings from spoiler log, used to pre-fill sub-type toggles
  export let spoilerExtraEr: Record<string, any> | null = null;
  export let isWatchMode = false;

  let manualErSettings: ErSettings = JSON.parse(
    localStorage.getItem('erSettings') ?? JSON.stringify(defaultErSettings)
  );

  // When spoilerExtraEr changes, merge sub-type values into manual settings (only once)
  let lastExtraEr = JSON.stringify(spoilerExtraEr);
  $: {
    const serialized = JSON.stringify(spoilerExtraEr);
    if (serialized !== lastExtraEr && spoilerExtraEr) {
      lastExtraEr = serialized;
      let changed = false;
      for (const [k, v] of Object.entries(spoilerExtraEr)) {
        if (k in manualErSettings && typeof v === 'boolean') {
          manualErSettings[k as keyof ErSettings] = v;
          changed = true;
        }
      }
      if (changed) saveManualErSettings();
    }
  }

  export let activeErSettings: ErSettings = spoilerErSettings ?? manualErSettings;
  $: activeErSettings = spoilerErSettings ?? manualErSettings;
  $: erActiveSettingsStore.set(activeErSettings as unknown as Record<string, boolean>);

  export let highlightedEntranceId: string | null = null;

  let erListEl: HTMLElement | undefined;
  let _prevHighlight = '';
  $: if (highlightedEntranceId && highlightedEntranceId !== _prevHighlight) {
    _prevHighlight = highlightedEntranceId;
    tick().then(() => {
      const el = erListEl?.querySelector(`[data-eid="${highlightedEntranceId}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        el.classList.add('er-row-highlight');
        setTimeout(() => el.classList.remove('er-row-highlight'), 1800);
      }
    });
  }

  function saveManualErSettings() {
    localStorage.setItem('erSettings', JSON.stringify(manualErSettings));
    manualErSettings = { ...manualErSettings };
  }

  const alwaysManualKeys = new Set(['erMixed', 'erDecoupled']);

  function toggleErSetting(key: string) {
    manualErSettings[key as keyof ErSettings] = !manualErSettings[key as keyof ErSettings];
    saveManualErSettings();
  }

  function getErSetting(settings: ErSettings, key: string): boolean {
    return (settings as unknown as Record<string, boolean>)[key] ?? false;
  }

  const erLabels: Record<string, string> = {
    erBoss: '⚔️ Boss',
    erDungeons: '🏰 Dungeons',
    erGrottos: '🕳️ Grottos',
    erIndoors: '🏠 Interiors',
    erOverworld: '🌍 Overworld',
    erOneWays: '➡️ One-Ways',
    erWallmasters: '👁️ Wallmasters',
    erAlterLw: '🌲 Alter LW Exits',
    erSpawns: '📍 Spawns',
    erMixed: '🔀 Cross-game destinations',
    erDecoupled: '🔓 Decoupled',
  };

  const subTypeGroups = [
    { parent: 'erDungeons', label: 'Dungeons', keys: ['erMajorDungeons', 'erMinorDungeons', 'erGanonCastle', 'erGanonTower', 'erMoon', 'erSpiderHouses', 'erPirateFortress', 'erBeneathWell', 'erIkanaCastle', 'erSecretShrine'] },
    { parent: 'erIndoors', label: 'Interiors', keys: ['erIndoorsMajor', 'erIndoorsExtra', 'erIndoorsGameLinks'] },
    { parent: 'erOneWays', label: 'One-Ways', keys: ['erOneWaysMajor', 'erOneWaysIkana', 'erOneWaysSongs', 'erOneWaysStatues', 'erOneWaysWaterVoids', 'erOneWaysAnywhere', 'erOneWaysOwls'] },
  ];

  // Track which sub-types have at least one entrance in the current data
  $: populatedSubTypes = new Set(
    Object.entries(entranceSubTypes)
      .filter(([, ids]) => ids.length > 0)
      .map(([k]) => k)
  );

  type GameFilter = 'both' | 'oot' | 'mm';
  let gameFilter: GameFilter = 'both';
  let searchFilter = '';
  let showMode: 'all' | 'filled' | 'unfilled' = 'all';
  let showHelp = false;

  function onClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (showHelp && !target.closest('.er-help-panel') && !target.closest('.er-help-btn')) {
      showHelp = false;
    }
  }
  onMount(() => { document.addEventListener('click', onClickOutside); return () => document.removeEventListener('click', onClickOutside); });

  // Which sub-type groups have at least one visible group (parent active + populated)
  // NOTE: must reference activeErSettings directly, not through a function,
  // so Svelte can detect the reactive dependency at compile time
  $: visibleSubGroups = subTypeGroups.filter(g =>
    (activeErSettings as any)[g.parent] && g.keys.some(k => hasPopulatedSub(k))
  );

  // Active/total sub-type count per parent key
  // Reference manualErSettings directly so Svelte tracks it as a dependency
  $: subTypeCounts = Object.fromEntries(
    subTypeGroups
      .filter(g => hasPopulatedSubGroup(g))
      .map(g => [g.parent, {
        active: g.keys.filter(k => (manualErSettings as any)[k] ?? false).length,
        total: g.keys.filter(k => hasPopulatedSub(k)).length,
      }])
  ) as Record<string, { active: number; total: number }>;

  function getSub(key: string): boolean {
    return (manualErSettings as any)[key] ?? false;
  }
  function hasPopulatedSub(key: string): boolean {
    return populatedSubTypes.has(key);
  }

  function hasPopulatedSubGroup(g: { keys: string[] }): boolean {
    return g.keys.some(k => hasPopulatedSub(k));
  }

  $: activeErTypes = erActiveTypes(activeErSettings);

  $: filteredEntrances = filterEntrances(allEntrances, activeErSettings).filter(e => {
    if (gameFilter !== 'both' && e.game !== gameFilter) return false;
    if (searchFilter && !e.name.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    if (showMode === 'filled' && !entranceValues.get(e.id)) return false;
    if (showMode === 'unfilled' && entranceValues.get(e.id)) return false;
    return true;
  });

  const sectionOrder = ['erOverworld', 'erDungeons', 'erBoss', 'erIndoors', 'erGrottos', 'erOneWays', 'erAlterLw', 'erWallmasters', 'erSpawns'];

  const sectionLabels: Record<string, string> = {
    erOverworld: '🌍 Overworld',
    erDungeons: '🏰 Dungeons',
    erBoss: '⚔️ Boss Rooms',
    erIndoors: '🏠 Interiors',
    erGrottos: '🕳️ Grottos',
    erOneWays: '➡️ One-Ways',
    erAlterLw: '🌲 Alter Lost Woods',
    erWallmasters: '👁️ Wallmasters',
    erSpawns: '📍 Spawns',
  };

  $: groupedEntrances = (() => {
    const byType = new Map<string, typeof allEntrances>();
    for (const e of filteredEntrances) {
      if (!byType.has(e.erType)) byType.set(e.erType, []);
      byType.get(e.erType)!.push(e);
    }
    return sectionOrder
      .filter(t => byType.has(t))
      .map(t => ({ erType: t, label: sectionLabels[t] ?? t, entrances: byType.get(t)! }));
  })();

  const ALL_ER_TYPES = ['erOverworld','erIndoors','erGrottos','erDungeons','erBoss','erOneWays','erWallmasters','erSpawns','erAlterLw'];
  let collapsedSections: Set<string> = new Set(
    JSON.parse(localStorage.getItem('er-collapsed') ?? JSON.stringify(ALL_ER_TYPES))
  );
  function toggleSection(erType: string) {
    if (collapsedSections.has(erType)) collapsedSections.delete(erType);
    else collapsedSections.add(erType);
    collapsedSections = new Set(collapsedSections);
    localStorage.setItem('er-collapsed', JSON.stringify([...collapsedSections]));
  }

  let _savedScrollTop = 0;
  let _needsScrollRestore = false;

  beforeUpdate(() => {
    if (erListEl) {
      _savedScrollTop = erListEl.scrollTop;
      _needsScrollRestore = true;
    }
  });

  afterUpdate(() => {
    if (_needsScrollRestore && erListEl && _savedScrollTop > 0) {
      erListEl.scrollTop = _savedScrollTop;
      _needsScrollRestore = false;
    }
  });

  function getValue(id: string): string {
    return entranceValues.get(id) ?? '';
  }

  function clearValue(id: string) {
    if (isWatchMode) return;
    yEntrances.delete(id);
  }

  function clearAll() {
    if (isWatchMode) return;
    if (!confirm('Clear all entrance connections?')) return;
    Array.from(yEntrances.keys()).forEach(k => yEntrances.delete(k));
  }

  function findReverseEntranceName(name: string): string | undefined {
    const ent = allEntrances.find(e => e.name === name);
    if (!ent) return undefined;
    return findReverseEntrance(ent)?.name;
  }

  $: knownCount = filteredEntrances.filter(e => getValue(e.id)).length;

  // Set of already-assigned destinations — one-ways and owls excluded (can have multiple sources)
  $: usedDestinations = new Set(
    Array.from(entranceValues.entries())
      .filter(([id]) => {
        const e = allEntrances.find(e => e.id === id);
        return e && e.erType !== 'erOneWays';
      })
      .map(([, v]) => v)
  );
  $: totalActive = filteredEntrances.length;
</script>

<div class="er-tracker">

  <div class="er-section">
    <div class="er-section-title">
      {#if spoilerErSettings}
        <span class="er-source-badge spoiler">⭐ From spoiler log</span>
      {:else}
        <span class="er-source-badge manual">✏️ Manual configuration</span>
      {/if}
    </div>
    <div class="er-toggles">
      {#each Object.entries(erLabels) as [key, label]}
        <button
          type="button"
          class="er-toggle-btn"
          class:active={alwaysManualKeys.has(key) ? getErSetting(manualErSettings, key) : getErSetting(activeErSettings, key)}
          class:from-spoiler={spoilerErSettings !== null && !alwaysManualKeys.has(key)}
          class:always-manual={alwaysManualKeys.has(key)}
          disabled={isWatchMode || (spoilerErSettings !== null && !alwaysManualKeys.has(key))}
          on:click={() => !isWatchMode && (alwaysManualKeys.has(key) || spoilerErSettings === null) && toggleErSetting(key)}
          title={key === 'erDecoupled' ? 'Always manual — reverse auto-fill disabled when ON' : key === 'erMixed' ? 'Always manual — show both games as destinations' : spoilerErSettings ? 'Set by spoiler log' : 'Click to toggle'}
        >
          {label}
          {#if subTypeCounts[key]}
            <span class="er-btn-sub-count">{subTypeCounts[key].active}/{subTypeCounts[key].total}</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <details class="er-extra-details">
    <summary class="er-extra-summary">ER options</summary>
    <div class="er-extra-grid">
      {#if visibleSubGroups.length > 0}
        {#each visibleSubGroups as group}
          {@const groupKeys = group.keys.filter(k => hasPopulatedSub(k))}
          <div class="er-extra-group">
            <div class="er-extra-group-title">{group.label}</div>
            {#each groupKeys as key}
              <span
                class="er-extra-badge clickable"
                class:active={getSub(key)}
                class:disabled={isWatchMode}
                on:click={() => !isWatchMode && toggleErSetting(key)}
                title="Click to toggle"
                role="button"
                tabindex="0"
                on:keydown={(e) => e.key === 'Enter' && !isWatchMode && toggleErSetting(key)}
              >
                {subTypeLabels[key] ?? key}
                <span class="er-sub-count">{(entranceSubTypes[key] ?? []).length}</span>
              </span>
            {/each}
          </div>
        {/each}
      {:else}
        <div class="er-extra-empty">Enable a main ER setting above (Dungeons, Interiors, One-Ways) to access sub-type options</div>
      {/if}
    </div>
  </details>

  <div class="er-controls">
    <div class="er-filters">
      <div class="er-search-wrap">
        <input
          type="text"
          placeholder="Search entrance..."
          bind:value={searchFilter}
          class="er-search"
        />
        {#if searchFilter}
          <button type="button" class="er-search-clear" on:click={() => searchFilter = ''} title="Clear search">×</button>
        {/if}
      </div>
      <select bind:value={gameFilter} class="er-select">
        <option value="both">OoT + MM</option>
        <option value="oot">OoT only</option>
        <option value="mm">MM only</option>
      </select>
      <button type="button" class="er-help-btn" on:click={() => showHelp = !showHelp} title="Help">?</button>
      <div class="er-mode-group">
        <button type="button" class="er-mode-btn" class:active={showMode === 'all'} on:click={() => showMode = 'all'}>All</button>
        <button type="button" class="er-mode-btn" class:active={showMode === 'filled'} on:click={() => showMode = 'filled'}>Filled</button>
        <button type="button" class="er-mode-btn" class:active={showMode === 'unfilled'} on:click={() => showMode = 'unfilled'}>Unfilled</button>
      </div>
    </div>
    {#if showHelp}
      <div class="er-help-panel">
        <strong>How to use the ER Tracker</strong>
        <button type="button" class="er-help-close" on:click={() => showHelp = false}>✕</button>
        <div class="er-help-body">
          Each row = one entrance. <strong>Left</strong> = where you enter. <strong>Right</strong> = where you appear.<br><br>
          <strong>Example:</strong> In-game you go through <em>Death Mountain Trail → Death Mountain Crater</em>. Find the row "OOT Death Mountain Trail → …", set the dropdown to "OOT Death Mountain Crater".<br><br>
          <strong>Tips:</strong><br>
          • <strong>Decoupled OFF</strong> → setting A→B auto-fills B→A.<br>
          • <strong>All / Filled / Unfilled</strong> to filter the list.<br>
          • Right-click a 🔷 on the map → jumps to this row.<br>
          • 🗺️ button → opens the entrance on the map.
        </div>
      </div>
    {/if}
    <div class="er-stats">
      <span>{knownCount}/{totalActive} known</span>
      <button type="button" class="er-clear-btn" on:click={clearAll} disabled={isWatchMode}>Clear all</button>
    </div>
  </div>

  {#if activeErTypes.size === 0}
    <div class="er-empty">No entrance types enabled. Enable some types above or import a spoiler log.</div>
  {:else}
    <div class="er-list" bind:this={erListEl}>
      {#each groupedEntrances as group}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <h4 class="er-section-header" data-er-type={group.erType} on:click={() => toggleSection(group.erType)}>
          <span class="er-section-arrow">{collapsedSections.has(group.erType) ? '▶' : '▼'}</span>
          {group.label}
          <span class="er-section-count">{group.entrances.length}</span>
        </h4>
        {#if !collapsedSections.has(group.erType)}
        {#each group.entrances as entrance (entrance.id)}
          {@const currentValue = getValue(entrance.id)}
          <div class="er-row" class:filled={!!currentValue} class:er-row-highlighted={entrance.id === highlightedEntranceId} data-eid={entrance.id}>
            <span class="er-game-badge er-game-{entrance.game}">
              {entrance.game.toUpperCase()}
            </span>
            <span class="er-name" title={entrance.name}>{entrance.name}</span>
            {#if entranceHasMap.has(entrance.id)}
              <button type="button" class="er-map-btn" title="Open map" on:click={() => dispatch('openMapForEntrance', { entranceId: entrance.id })}>🗺️</button>
            {/if}
            <span class="er-arrow">→</span>
            <div class="er-select-wrap" style="width: {currentValue ? Math.max(160, currentValue.length * 7.2) : 160}px">
              <EntranceSelect
                options={allEntrances.filter(e => (gameFilter === 'both' || manualErSettings.erMixed || e.game === entrance.game) && (!usedDestinations.has(e.name) || e.name === currentValue))}
                value={currentValue}
                on:change={e => {
                  if (isWatchMode) return;
                  const newVal = e.detail.trim();
                  if (newVal === '') clearValue(entrance.id);
                  else {
                    yEntrances.set(entrance.id, newVal);
                    if (!manualErSettings.erDecoupled) {
                      const revName = findReverseEntranceName(entrance.name);
                      if (revName) {
                        const revDestName = findReverseEntranceName(newVal);
                        if (revDestName) {
                          const revId = allEntrances.find(e => e.name === revName)?.id;
                          if (revId && !entranceValues.get(revId)) {
                            yEntrances.set(revId, revDestName);
                          }
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        {/each}
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .er-tracker { margin-top: 0.8em; }

  .er-section { margin-bottom: 0.8em; }
  .er-section-title { margin-bottom: 0.4em; }

  .er-source-badge {
    font-size: 0.8em;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: bold;
  }
  .er-source-badge.spoiler { background: rgba(100, 200, 100, 0.2); color: #7ec87e; }
  .er-source-badge.manual  { background: rgba(100, 150, 255, 0.2); color: #7e9ec8; }

  .er-toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4em;
    margin-bottom: 0.8em;
  }

  .er-toggle-btn {
    padding: 0.3em 0.7em;
    border: 1px solid var(--color-border);
    border-radius: 16px;
    background: var(--color-bg);
    color: var(--color-text);
    cursor: pointer;
    font-size: 0.85em;
    opacity: 0.5;
    transition: all 0.15s;
  }
  .er-toggle-btn.active {
    opacity: 1;
    border-color: #0078e7;
    background: rgba(0, 120, 231, 0.15);
    color: #4da8ff;
  }
  .er-toggle-btn.from-spoiler { cursor: default; }
  .er-btn-sub-count {
    margin-left: 0.3em;
    font-size: 0.75em;
    opacity: 0.6;
  }
  .er-toggle-btn.from-spoiler.active {
    border-color: rgba(100, 200, 100, 0.6);
    background: rgba(100, 200, 100, 0.1);
    color: #7ec87e;
  }
  .er-toggle-btn.always-manual {
    cursor: pointer;
    opacity: 0.5;
    border-style: dashed;
  }
  .er-toggle-btn.always-manual.active {
    opacity: 1;
    border-color: #e07800;
    background: rgba(224, 120, 0, 0.15);
    color: #ffaa44;
    border-style: dashed;
  }

  .er-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.8em;
  }

  .er-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    align-items: center;
    position: relative;
  }

  .er-search-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .er-search-wrap .er-search {
    padding: 0.4em 1.6em 0.4em 0.6em;
  }
  .er-search-clear {
    position: absolute;
    right: 4px;
    background: none;
    border: none;
    color: var(--color-text);
    cursor: pointer;
    font-size: 1.1em;
    opacity: 0.75;
    padding: 0 4px;
    line-height: 1;
  }
  .er-search-clear:hover { opacity: 1; }
  .er-help-btn {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 50%;
    width: 1.4em;
    height: 1.4em;
    font-size: 0.85em;
    cursor: pointer;
    color: var(--color-text);
    opacity: 0.5;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    line-height: 1;
  }
  .er-help-btn:hover { opacity: 1; }
  .er-help-panel {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.5em 0.6em;
    margin-bottom: 0.5em;
    font-size: 0.75em;
    line-height: 1.35;
    max-width: 420px;
  }
  .er-help-body {
    margin-top: 0.4em;
  }
  .er-help-close {
    float: right;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    color: var(--color-text);
    padding: 0.1em 0.4em;
    font-size: 0.85em;
    line-height: 1;
  }
  .er-row:nth-child(odd) {
    background: rgba(255,255,255,0.05);
  }
  .er-row.filled:nth-child(odd) {
    background: rgba(100, 150, 255, 0.09);
  }
  @keyframes er-flash {
    0%   { background: rgba(255, 200, 50, 0.35); }
    60%  { background: rgba(255, 200, 50, 0.15); }
    100% { background: transparent; }
  }
  .er-row-highlight {
    animation: er-flash 1.8s ease-out forwards;
  }
  .er-row.er-row-highlighted {
    outline: 1px solid rgba(255, 200, 50, 0.5);
    border-radius: 3px;
  }

  .er-select {
    padding: 0.4em 0.6em;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    cursor: pointer;
  }

  .er-mode-group {
    display: inline-flex;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }
  .er-mode-btn {
    background: var(--color-bg);
    color: var(--color-text);
    border: none;
    border-right: 1px solid var(--color-border);
    padding: 0.3em 0.5em;
    font-size: 0.8em;
    cursor: pointer;
    opacity: 0.5;
    transition: all 0.15s;
  }
  .er-mode-btn:last-child { border-right: none; }
  .er-mode-btn.active {
    opacity: 1;
    background: rgba(0, 120, 231, 0.15);
    color: #4da8ff;
  }
  .er-mode-btn:hover:not(.active) { opacity: 0.8; }

  .er-stats {
    display: flex;
    align-items: center;
    gap: 0.8em;
    font-size: 0.9em;
    color: var(--color-text);
  }

  .er-clear-btn {
    padding: 0.3em 0.6em;
    background: var(--color-danger);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85em;
  }

  .er-empty {
    text-align: center;
    padding: 2em;
    color: var(--color-text);
    opacity: 0.5;
    font-style: italic;
  }

  .er-section-header {
    position: sticky;
    top: 0;
    z-index: 10;
    margin: 0;
    padding: 0.35em 0.4em;
    font-size: 0.8em;
    color: var(--color-header, #ccc);
    background: var(--color-bg, #1a1a2e);
    border-bottom: 1px solid var(--color-border, #333);
    display: flex;
    align-items: center;
    gap: 0.5em;
    cursor: pointer;
    user-select: none;
  }
  .er-section-header:hover { filter: brightness(1.2); }
  .er-section-arrow { font-size: 0.65em; opacity: 0.6; flex-shrink: 0; }
  .er-section-header:not(:first-child) {
    margin-top: 0.3em;
  }
  .er-section-count {
    font-size: 0.8em;
    opacity: 0.5;
    font-weight: normal;
  }

  .er-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 500px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.15) transparent;
  }
  .er-list::-webkit-scrollbar { width: 4px; }
  .er-list::-webkit-scrollbar-track { background: transparent; }
  .er-list::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.15);
    border-radius: 2px;
  }
  .er-list::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }

  .er-row {
    display: flex;
    align-items: center;
    gap: 0.4em;
    padding: 3px 4px;
    border-radius: 4px;
    border: 1px solid transparent;
    font-size: 0.85em;
    min-width: 0;
  }
  .er-row.filled {
    border-color: rgba(100, 150, 255, 0.3);
    background: rgba(100, 150, 255, 0.05);
  }

  .er-game-badge {
    font-size: 0.7em;
    font-weight: bold;
    padding: 1px 4px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .er-game-oot { background: #2a5a2a; color: #7ec87e; }
  .er-game-mm  { background: #2a2a5a; color: #7e7ec8; }

.er-name {
  flex: 1;
  min-width: 0;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

  .er-arrow {
    color: var(--color-text);
    opacity: 0.5;
    flex-shrink: 0;
  }

  .er-map-btn {
    background: none;
    border: none;
    padding: 0 2px;
    cursor: pointer;
    font-size: 0.85em;
    opacity: 0.5;
    flex-shrink: 0;
    line-height: 1;
  }
  .er-map-btn:hover { opacity: 1; }

.er-select-wrap {
  flex: 1;
  min-width: 160px;
  max-width: 500px;
}

  .er-extra-details {
    margin: 0.4em 0 0.8em 0;
    font-size: 0.82em;
  }
  .er-extra-summary {
    cursor: pointer;
    color: var(--color-text);
    opacity: 0.7;
    font-size: 0.9em;
    margin-bottom: 0.4em;
  }
  .er-extra-summary:hover { opacity: 1; }
  .er-extra-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6em;
  }
  .er-extra-empty {
    font-size: 0.85em;
    opacity: 0.5;
    padding: 0.5em 0;
  }
  .er-extra-group {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
  }
  .er-extra-group-title {
    font-weight: bold;
    color: var(--color-text);
    opacity: 0.6;
    font-size: 0.85em;
    margin-bottom: 0.15em;
  }
  .er-extra-badge {
    font-size: 0.82em;
    padding: 1px 6px;
    border-radius: 8px;
    background: rgba(255,255,255,0.05);
    color: var(--color-text);
    opacity: 0.4;
    transition: all 0.15s;
  }
  .er-extra-badge.active {
    opacity: 1;
    background: rgba(100, 200, 100, 0.15);
    color: #7ec87e;
  }
  .er-extra-badge.disabled {
    opacity: 0.25;
    cursor: default;
    pointer-events: none;
  }
  .er-extra-badge.clickable {
    cursor: pointer;
    user-select: none;
  }
  .er-extra-badge.clickable:hover {
    opacity: 0.8;
    background: rgba(255,255,255,0.1);
  }
  .er-extra-badge.clickable.active:hover {
    opacity: 0.9;
    background: rgba(100, 200, 100, 0.25);
  }
  .er-extra-badge.clickable.disabled {
    cursor: default;
    opacity: 0.3 !important;
  }
  .er-sub-count {
    font-size: 0.75em;
    opacity: 0.5;
    margin-left: 0.3em;
  }
  .er-extra-badge.active .er-sub-count { opacity: 0.8; }

  @media screen and (max-width: 768px) {
    .er-input-wrap { width: 140px; }
    .er-name { max-width: 150px; }
  }
</style>