<script lang="ts">
  import { allEntrances, entranceSubTypes, subTypeToParent, subTypeLabels, type EntranceType, type ErSettingKey } from '../data/entranceData';
  import { defaultErSettings, type ErSettings } from '../util/spoilerParser';
  import type { Map as YMap } from 'yjs';
  import EntranceSelect from './EntranceSelect.svelte';

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
  let lastExtraEr = '';
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

  $: activeErSettings = spoilerErSettings ?? manualErSettings;

  function saveManualErSettings() {
    localStorage.setItem('erSettings', JSON.stringify(manualErSettings));
    manualErSettings = { ...manualErSettings };
  }

  function toggleErSetting(key: string) {
    manualErSettings[key as keyof ErSettings] = !manualErSettings[key as keyof ErSettings];
    saveManualErSettings();
  }

  const erLabels: Record<string, string> = {
    erBoss: '⚔️ Boss',
    erDungeons: '🏰 Dungeons',
    erGrottos: '🕳️ Grottos',
    erIndoors: '🏠 Interiors',
    erOverworld: '🌍 Overworld',
    erOneWays: '➡️ One-Ways',
    erOwls: '🦉 Owl Statues',
    erWallmasters: '👁️ Wallmasters',
    erAlterLw: '🌲 Alter LW Exits',
    erMixed: '🔀 Cross-game destinations',
  };

  const subTypeGroups = [
    { parent: 'erDungeons', label: 'Dungeons', keys: ['erMajorDungeons', 'erMinorDungeons', 'erGanonCastle', 'erGanonTower', 'erMoon', 'erSpiderHouses', 'erPirateFortress', 'erBeneathWell', 'erIkanaCastle', 'erSecretShrine'] },
    { parent: 'erIndoors', label: 'Interiors', keys: ['erIndoorsMajor', 'erIndoorsExtra', 'erIndoorsGameLinks'] },
    { parent: 'erOneWays', label: 'One-Ways', keys: ['erOneWaysMajor', 'erOneWaysIkana', 'erOneWaysSongs', 'erOneWaysStatues', 'erOneWaysWoods', 'erOneWaysWaterVoids', 'erOneWaysAnywhere'] },
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
  let showOnlyUnknown = false;

  // Build a set of entrance IDs per sub-type for quick lookup
  $: subTypeIdSets = Object.fromEntries(
    Object.entries(entranceSubTypes).map(([k, ids]) => [k, new Set(ids)])
  ) as Record<string, Set<string>>;

  // Determine which sub-type groups have at least one active toggle
  $: hasActiveSubTypes = new Set(
    subTypeGroups
      .filter(g => g.keys.some(k => manualErSettings[k as keyof ErSettings]))
      .map(g => g.parent)
  );

  function getSub(key: string): boolean {
    return (manualErSettings as any)[key] ?? false;
  }
  function hasPopulatedSub(key: string): boolean {
    return populatedSubTypes.has(key);
  }

  function entranceMatchesSubTypes(id: string, erType: ErSettingKey): boolean {
    if (!hasActiveSubTypes.has(erType)) return true;
    for (const group of subTypeGroups) {
      if (group.parent !== erType) continue;
      for (const key of group.keys) {
        if (getSub(key) && subTypeIdSets[key]?.has(id)) {
          return true;
        }
      }
    }
    return false;
  }

  $: activeErTypes = new Set<ErSettingKey>(
    (Object.keys(activeErSettings) as (keyof ErSettings)[]).filter(k => activeErSettings[k])
  );

  $: filteredEntrances = allEntrances.filter(e => {
    if (!activeErTypes.has(e.erType)) return false;
    if (!entranceMatchesSubTypes(e.id, e.erType)) return false;
    if (gameFilter !== 'both' && e.game !== gameFilter) return false;
    if (searchFilter && !e.name.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    if (showOnlyUnknown && entranceValues.get(e.id)) return false;
    return true;
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

  $: knownCount = filteredEntrances.filter(e => getValue(e.id)).length;

  // Set of already-assigned destinations — one-ways and owls excluded (can have multiple sources)
  $: usedDestinations = new Set(
    Array.from(entranceValues.entries())
      .filter(([id]) => {
        const e = allEntrances.find(e => e.id === id);
        return e && e.erType !== 'erOneWays' && e.erType !== 'erOwls';
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
          class="er-toggle-btn"
          class:active={key === 'erMixed' ? manualErSettings.erMixed : activeErSettings[key]}
          class:from-spoiler={spoilerErSettings !== null && key !== 'erMixed'}
          class:always-manual={key === 'erMixed'}
          disabled={spoilerErSettings !== null && key !== 'erMixed'}
          on:click={() => !isWatchMode && (key === 'erMixed' || spoilerErSettings === null) && toggleErSetting(key)}
          title={key === 'erMixed' ? 'Always manual — show both games as destinations' : spoilerErSettings ? 'Set by spoiler log' : 'Click to toggle'}
        >
          {label}
        </button>
      {/each}
    </div>
  </div>

  <details class="er-extra-details">
    <summary class="er-extra-summary">ER options
      {#each subTypeGroups as group}
        {@const active = group.keys.filter(k => getSub(k)).length}
        {@const total = group.keys.filter(k => hasPopulatedSub(k)).length}
        {total > 0 ? `${group.label} ${active}/${total} ` : ''}
      {/each}
    </summary>
    <div class="er-extra-grid">
      {#each subTypeGroups as group}
        {@const groupKeys = group.keys.filter(k => hasPopulatedSub(k))}
        {#if groupKeys.length > 0}
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
        {/if}
      {/each}
    </div>
  </details>

  <div class="er-controls">
    <div class="er-filters">
      <input
        type="text"
        placeholder="Search entrance..."
        bind:value={searchFilter}
        class="er-search"
      />
      <select bind:value={gameFilter} class="er-select">
        <option value="both">OoT + MM</option>
        <option value="oot">OoT only</option>
        <option value="mm">MM only</option>
      </select>
      <label class="er-checkbox">
        <input type="checkbox" bind:checked={showOnlyUnknown} />
        Unknown only
      </label>
    </div>
    <div class="er-stats">
      <span>{knownCount}/{totalActive} known</span>
      <button class="er-clear-btn" on:click={clearAll} disabled={isWatchMode}>Clear all</button>
    </div>
  </div>

  {#if activeErTypes.size === 0}
    <div class="er-empty">No entrance types enabled. Enable some types above or import a spoiler log.</div>
  {:else}
    <div class="er-list">
      {#each filteredEntrances as entrance (entrance.id)}
        {@const currentValue = getValue(entrance.id)}
        <div class="er-row" class:filled={!!currentValue}>
  <span class="er-game-badge er-game-{entrance.game}">
    {entrance.game.toUpperCase()}
  </span>
  <span class="er-name" title={entrance.name}>{entrance.name}</span>
  <span class="er-arrow">→</span>
  <div class="er-select-wrap" style="width: {currentValue ? Math.max(160, currentValue.length * 7.2) : 160}px">
    <EntranceSelect
      options={allEntrances.filter(e => (gameFilter === 'both' || manualErSettings.erMixed || e.game === entrance.game) && (!usedDestinations.has(e.name) || e.name === currentValue))}
      value={currentValue}
      on:change={e => {
        if (isWatchMode) return;
        if (e.detail.trim() === '') clearValue(entrance.id);
        else yEntrances.set(entrance.id, e.detail);
      }}
    />
  </div>
</div>
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
  }

  .er-search {
    padding: 0.4em 0.6em;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    width: 180px;
  }

  .er-select {
    padding: 0.4em 0.6em;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    cursor: pointer;
  }

  .er-checkbox {
    display: flex;
    align-items: center;
    gap: 0.3em;
    cursor: pointer;
    color: var(--color-text);
    font-size: 0.9em;
  }

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