<script lang="ts">
  import { logicManualSettings } from '../stores/logicStore';
  import { LOGIC_SETTINGS_DEFS, SETTING_GROUPS, defaultLogicSettings } from '../data/logicSettingsDef';
  import type { LogicSettingDef } from '../data/logicSettingsDef';

  /** Keys present in the spoiler log — shown read-only */
  export let spoilerKeys: Set<string> = new Set();

  function get(key: string): any {
    return $logicManualSettings[key];
  }

  function setBool(key: string, value: boolean) {
    logicManualSettings.update(s => ({ ...s, [key]: value }));
  }

  function setVal(key: string, value: any) {
    logicManualSettings.update(s => ({ ...s, [key]: value }));
  }

  function toggleFlag(key: string, flag: string) {
    const cur: string = $logicManualSettings[key] ?? '';
    const flags = cur ? cur.split(' ') : [];
    const idx = flags.indexOf(flag);
    if (idx === -1) flags.push(flag); else flags.splice(idx, 1);
    setVal(key, flags.join(' '));
  }

  function hasFlag(key: string, flag: string): boolean {
    return ($logicManualSettings[key] ?? '').split(' ').includes(flag);
  }

  function onCheckboxChange(key: string, e: Event) {
    setBool(key, (e.target as HTMLInputElement).checked);
  }

  function onSelectChange(key: string, e: Event) {
    setVal(key, (e.target as HTMLSelectElement).value);
  }

  function groupDefs(group: string): LogicSettingDef[] {
    return LOGIC_SETTINGS_DEFS.filter(d => d.group === group);
  }

  $: fromSpoiler = (key: string) => spoilerKeys.has(key);
</script>

<div class="ls-toolbar">
  <button type="button" class="ls-reset-btn" on:click={() => logicManualSettings.set(defaultLogicSettings())}>
    Reset to defaults
  </button>
</div>

{#each SETTING_GROUPS as group}
  <p class="ls-group-header">{group}</p>
  <div class="dropdown-grid">
    {#each groupDefs(group) as def}
      {@const spoiler = fromSpoiler(def.key)}
      {#if def.type === 'bool'}
        <label class="checkbox-option" class:spoiler-row={spoiler} title={spoiler ? 'Set by spoiler log' : ''}>
          <input
            type="checkbox"
            checked={!!get(def.key)}
            disabled={spoiler}
            on:change={e => onCheckboxChange(def.key, e)}
          />
          {def.label}
          {#if spoiler}<span class="spoiler-badge">spoiler</span>{/if}
        </label>
      {:else if def.type === 'select'}
        <label class:spoiler-row={spoiler} title={spoiler ? 'Set by spoiler log' : ''}>
          {def.label}
          {#if spoiler}<span class="spoiler-badge">spoiler</span>{/if}
          <select
            class="dropdown-select"
            value={get(def.key)}
            disabled={spoiler}
            on:change={e => onSelectChange(def.key, e)}
          >
            {#each def.options ?? [] as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </label>
      {:else if def.type === 'multicheck'}
        <div class="multicheck-block">
          <div class="multicheck-title">
            {def.label}
            {#if spoiler}<span class="spoiler-badge">spoiler</span>{/if}
          </div>
          <div class="multicheck-flags">
            {#each def.flags ?? [] as flag}
              <label class="checkbox-option" title={spoiler ? 'Set by spoiler log' : ''}>
                <input
                  type="checkbox"
                  checked={hasFlag(def.key, flag.value)}
                  disabled={spoiler}
                  on:change={() => toggleFlag(def.key, flag.value)}
                />
                {flag.label}
              </label>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>
{/each}

<style>
  .ls-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.6em;
  }

  .ls-reset-btn {
    font-size: 0.8em;
    padding: 0.25em 0.7em;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    cursor: pointer;
    opacity: 0.7;
  }
  .ls-reset-btn:hover { opacity: 1; }

  .ls-group-header {
    font-size: 0.75em;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #888;
    margin: 0.8em 0 0.3em;
    padding-bottom: 0.2em;
    border-bottom: 1px solid var(--color-border);
  }

  /* Mirror the App.svelte dropdown-grid / dropdown-select / checkbox-option styles */
  .dropdown-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1em;
    margin-bottom: 0.5em;
  }
  @media screen and (max-width: 1024px) {
    .dropdown-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media screen and (max-width: 768px) {
    .dropdown-grid { grid-template-columns: 1fr; }
  }

  :global(.dropdown-grid) .dropdown-select,
  .dropdown-select {
    width: 100%;
    padding: 0.5em;
    margin-top: 0.4em;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: var(--color-bg);
    color: var(--color-text);
    cursor: pointer;
    font-size: 0.9em;
  }
  .dropdown-select:hover { border-color: #999; }
  .dropdown-select:focus { outline: none; border-color: #0078e7; }
  .dropdown-select:disabled { opacity: 0.55; cursor: default; }

  .checkbox-option {
    display: flex;
    align-items: center;
    padding: 0.5em 0;
    cursor: pointer;
    gap: 0.5em;
  }
  .checkbox-option input[type='checkbox'] { cursor: pointer; flex-shrink: 0; }
  .checkbox-option:has(input:disabled) { opacity: 0.55; cursor: default; }

  /* Multicheck block spans full row */
  .multicheck-block {
    grid-column: 1 / -1;
  }
  .multicheck-title {
    font-size: 0.88em;
    font-weight: 600;
    margin-bottom: 0.3em;
    color: var(--color-text);
    display: flex;
    align-items: center;
    gap: 0.4em;
  }
  .multicheck-flags {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0 1em;
    padding-left: 0.5em;
  }
  @media screen and (max-width: 768px) {
    .multicheck-flags { grid-template-columns: 1fr; }
  }

  .spoiler-row { opacity: 0.6; }
  .spoiler-badge {
    font-size: 0.68em;
    background: #3a5a3a;
    color: #8f8;
    border-radius: 3px;
    padding: 0 4px;
    font-weight: normal;
  }
</style>
