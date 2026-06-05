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
    const cur: string = $logicManualSettings[key] ?? '';
    return cur.split(' ').includes(flag);
  }

  function resetAll() {
    logicManualSettings.set(defaultLogicSettings());
  }

  function groupDefs(group: string): LogicSettingDef[] {
    return LOGIC_SETTINGS_DEFS.filter(d => d.group === group);
  }

  function onCheckboxChange(key: string, e: Event) {
    setBool(key, (e.target as HTMLInputElement).checked);
  }

  function onSelectChange(key: string, e: Event) {
    setVal(key, (e.target as HTMLSelectElement).value);
  }

  $: fromSpoiler = (key: string) => spoilerKeys.has(key);
</script>

<div class="ls-header">
  <span class="ls-title">Logic Settings</span>
  <button type="button" class="ls-reset" on:click={resetAll} title="Reset all to defaults">Reset</button>
</div>

{#each SETTING_GROUPS as group}
  <div class="ls-group">
    <div class="ls-group-label">{group}</div>
    <div class="ls-group-body">
      {#each groupDefs(group) as def}
        {@const spoiler = fromSpoiler(def.key)}
        <div class="ls-row" class:from-spoiler={spoiler}>
          {#if def.type === 'bool'}
            <label class="ls-bool">
              <input type="checkbox"
                checked={spoiler ? spoilerKeys.has(def.key) : !!get(def.key)}
                disabled={spoiler}
                on:change={e => onCheckboxChange(def.key, e)}
              />
              {def.label}
              {#if spoiler}<span class="ls-spoiler-badge">spoiler</span>{/if}
            </label>
          {:else if def.type === 'select'}
            <label class="ls-select-label">{def.label}
              {#if spoiler}<span class="ls-spoiler-badge">spoiler</span>{/if}
            </label>
            <select class="ls-select" disabled={spoiler}
              value={get(def.key)}
              on:change={e => onSelectChange(def.key, e)}
            >
              {#each def.options ?? [] as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          {:else if def.type === 'multicheck'}
            <div class="ls-multicheck-label">{def.label}
              {#if spoiler}<span class="ls-spoiler-badge">spoiler</span>{/if}
            </div>
            <div class="ls-flags">
              {#each def.flags ?? [] as flag}
                <label class="ls-flag">
                  <input type="checkbox"
                    checked={hasFlag(def.key, flag.value)}
                    disabled={spoiler}
                    on:change={() => toggleFlag(def.key, flag.value)}
                  />
                  {flag.label}
                </label>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/each}

<style>
  .ls-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #333;
  }
  .ls-title { font-weight: bold; font-size: 0.9em; color: #ddd; }
  .ls-reset {
    font-size: 0.75em;
    padding: 2px 6px;
    background: #2a2a2a;
    border: 1px solid #555;
    color: #aaa;
    border-radius: 3px;
    cursor: pointer;
  }
  .ls-reset:hover { color: #fff; background: #333; }

  .ls-group { margin-bottom: 10px; }
  .ls-group-label {
    font-size: 0.7em;
    font-weight: bold;
    text-transform: uppercase;
    color: #888;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
  }
  .ls-group-body { display: flex; flex-direction: column; gap: 3px; }

  .ls-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: 0.82em;
  }
  .ls-row.from-spoiler { opacity: 0.65; }

  .ls-bool {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    color: #ccc;
    user-select: none;
  }
  .ls-bool input { cursor: pointer; }

  .ls-select-label { color: #ccc; }
  .ls-select {
    background: #2a2a2a;
    border: 1px solid #444;
    color: #ccc;
    border-radius: 3px;
    padding: 1px 4px;
    font-size: 0.9em;
  }

  .ls-multicheck-label { color: #ccc; width: 100%; }
  .ls-flags { display: flex; flex-wrap: wrap; gap: 4px; padding-left: 8px; }
  .ls-flag {
    display: flex;
    align-items: center;
    gap: 3px;
    color: #bbb;
    cursor: pointer;
    white-space: nowrap;
    font-size: 0.9em;
  }
  .ls-flag input { cursor: pointer; }

  .ls-spoiler-badge {
    font-size: 0.7em;
    background: #3a5a3a;
    color: #8f8;
    border-radius: 3px;
    padding: 0 4px;
    margin-left: 3px;
  }
</style>
