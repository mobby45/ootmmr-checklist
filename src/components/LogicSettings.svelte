<script lang="ts">
  import { logicManualSettings } from '../stores/logicStore';
  import { LOGIC_SETTINGS_DEFS, SETTING_GROUPS } from '../data/logicSettingsDef';
  import type { LogicSettingDef } from '../data/logicSettingsDef';

  /** Keys present in the spoiler log — shown read-only */
  export let spoilerKeys: Set<string> = new Set();

  let open = false;

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
    const { defaultLogicSettings } = (() => {
      const defs = LOGIC_SETTINGS_DEFS;
      return { defaultLogicSettings: () => {
        const out: Record<string, any> = {};
        for (const d of defs) out[d.key] = d.default;
        return out;
      }};
    })();
    logicManualSettings.set(defaultLogicSettings());
  }

  function groupDefs(group: string): LogicSettingDef[] {
    return LOGIC_SETTINGS_DEFS.filter(d => d.group === group);
  }

  $: fromSpoiler = (key: string) => spoilerKeys.has(key);
</script>

<div class="logic-settings-wrap">
  <button class="logic-settings-toggle" on:click={() => open = !open} title="Logic settings">
    ⚙ {open ? '▲' : '▼'}
  </button>

  {#if open}
    <div class="logic-settings-panel">
      <div class="ls-header">
        <span class="ls-title">Logic Settings</span>
        <button class="ls-reset" on:click={resetAll} title="Reset all to defaults">Reset</button>
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
                      on:change={e => setBool(def.key, (e.target as HTMLInputElement).checked)}
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
                    on:change={e => setVal(def.key, (e.target as HTMLSelectElement).value)}
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
    </div>
  {/if}
</div>

<style>
  .logic-settings-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .logic-settings-toggle {
    background: #2a2a2a;
    border: 1px solid #444;
    color: #ccc;
    border-radius: 4px;
    padding: 2px 7px;
    font-size: 0.8em;
    cursor: pointer;
    white-space: nowrap;
  }
  .logic-settings-toggle:hover { background: #333; color: #fff; }

  .logic-settings-panel {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 200;
    background: #1e1e1e;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 10px;
    min-width: 320px;
    max-width: 480px;
    max-height: 70vh;
    overflow-y: auto;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }

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
