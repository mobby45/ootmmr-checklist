<script lang="ts">
  import type { Readable } from 'svelte/store';
  import type { Map as YMap } from 'yjs';
  import { logicManualSettings, enabledTricks } from '../stores/logicStore';
  import { LOGIC_SETTINGS_DEFS, SETTING_GROUPS, defaultLogicSettings } from '../data/logicSettingsDef';
  import type { LogicSettingDef } from '../data/logicSettingsDef';
  import { TRICKS_DEFS, TRICK_CATEGORIES, tricksByCategory } from '../data/tricksDef';

  /** Keys present in the spoiler log — shown read-only */
  export let spoilerKeys: Set<string> = new Set();

  /** Y.js settings map from App.svelte (needed for item visibility sub-tabs) */
  export let ySettings: YMap<any> | null = null;

  /** Readable store over ySettings */
  export let sSettings: Readable<Map<string, any>> | null = null;

  // ─── Sub-tab ──────────────────────────────────────────────────────────────────
  let activeSubTab: 'logic' | 'oot' | 'mm' | 'shared' = 'logic';

  // ─── Item visibility data ─────────────────────────────────────────────────────
  type VItem =
    | { header: string; key?: never; name?: never; options?: never }
    | { header?: never; key: string; name: string; options?: Array<{ value: string; label: string }> };

  const ootVisibility: VItem[] = [
    { header: 'Item Extensions' },
    { key: 'elegyOot',                name: 'Elegy of Emptiness' },
    { key: 'ocarinaButtonsShuffleOot', name: 'Ocarina Buttons' },
    { key: 'spinUpgradeOot',          name: 'Spin Upgrade' },
    { key: 'skeletonKeyOot',          name: 'Skeleton Key' },
    { key: 'platinumTokenOot',        name: 'Platinum Token' },
    { key: 'magicalRupee',            name: 'Magical Rupee' },
    { key: 'gfsOot',                  name: 'Great Fairy Sword' },
    { key: 'powderKegOot',            name: 'Powder Keg' },
    { key: 'coinsOot',                name: 'Coins' },
    { header: 'Progressive Items' },
    { key: 'progressiveSwordsOot',  name: 'Swords',  options: [{ value: 'separate', label: 'Separate' }, { value: 'progressiveknifebiggoron', label: 'Progressive Knife+Biggoron' }, { value: 'progressive', label: 'Progressive' }] },
    { key: 'progressiveShieldsOot', name: 'Shields', options: [{ value: 'separate', label: 'Separate' }, { value: 'progressive', label: 'Progressive' }] },
    { header: 'Wallets' },
    { key: 'childWallets',      name: 'Child Wallet (shuffled)' },
    { key: 'colossalWallets',   name: 'Colossal Wallet (999₹)' },
    { key: 'bottomlessWallets', name: 'Bottomless Wallet (9999₹)' },
  ];

  const mmVisibility: VItem[] = [
    { header: 'OoT Extensions' },
    { key: 'spellFireMm',  name: "Din's Fire" },
    { key: 'spellWindMm',  name: "Farore's Wind" },
    { key: 'spellLoveMm',  name: "Nayru's Love" },
    { key: 'stoneAgonyMm', name: 'Stone of Agony' },
    { key: 'hammerMm',     name: 'Hammer' },
    { key: 'strengthMm',   name: 'Strength' },
    { key: 'scalesMm',     name: 'Scale' },
    { key: 'dekuShieldMm', name: 'Deku Shield' },
    { key: 'bootsIronMm',  name: 'Iron Boots' },
    { key: 'bootsHoverMm', name: 'Hover Boots' },
    { key: 'tunicGoronMm', name: 'Goron Tunic' },
    { key: 'tunicZoraMm',  name: 'Zora Tunic' },
    { key: 'slingshotMm',  name: 'Slingshot' },
    { header: 'Item Extensions' },
    { key: 'ocarinaButtonsShuffleMm', name: 'Ocarina Buttons' },
    { key: 'platinumTokenMm',         name: 'Platinum Token' },
    { key: 'skeletonKeyMm',           name: 'Skeleton Key' },
    { key: 'transcendentFairy',       name: 'Transcendent Fairy' },
    { key: 'menuNotebook',            name: "Bomber's Notebook (shuffled)" },
    { key: 'clocks',                  name: 'Clock Items' },
    { key: 'progressiveClocks',       name: 'Progressive Clocks' },
    { key: 'owlShuffleEnabled',       name: 'Owl Statues' },
    { key: 'shortHookshotMm',         name: 'Short Hookshot' },
    { key: 'fairyOcarinaMm',          name: 'Fairy Ocarina' },
    { key: 'kegStrength3',            name: 'Powder Keg Strength' },
    { header: 'Progressive Items' },
    { key: 'progressiveShieldsMm',   name: 'Shields',           options: [{ value: 'separate', label: 'Separate' }, { value: 'progressive', label: 'Progressive' }] },
    { key: 'progressiveGFS',         name: 'Great Fairy Sword', options: [{ value: 'separate', label: 'Separate' }, { value: 'progressive', label: 'Progressive' }] },
    { key: 'progressiveGoronLullaby',name: 'Goron Lullaby',     options: [{ value: 'single', label: 'Full Only' }, { value: 'progressive', label: 'Progressive' }] },
    { header: 'Bombchu' },
    { key: 'bombchuBehaviorMm', name: 'Behavior', options: [
      { value: 'vanilla',     label: 'Vanilla (MM)' },
      { value: 'bagFirst',    label: 'Bag (First Pack)' },
      { value: 'bagSeparate', label: 'Bag (Separate Items)' },
    ]},
  ];

  const sharedData: VItem[] = [
    { header: 'Items' },
    { key: 'sharedHookshot',        name: 'Hookshot / Longshot' },
    { key: 'sharedBombBags',        name: 'Bomb Bags' },
    { key: 'sharedBombchuBags',     name: 'Bombchu Bags' },
    { key: 'sharedBows',            name: 'Bows' },
    { key: 'sharedMagicArrowFire',  name: 'Fire Arrows' },
    { key: 'sharedMagicArrowIce',   name: 'Ice Arrows' },
    { key: 'sharedMagicArrowLight', name: 'Light Arrows' },
    { key: 'sharedLens',            name: 'Lens of Truth' },
    { key: 'sharedOcarina',         name: 'Ocarina' },
    { key: 'sharedHammer',          name: 'Hammer' },
    { key: 'sharedNutsSticks',      name: 'Nuts & Sticks' },
    { key: 'sharedMagic',           name: 'Magic' },
    { key: 'sharedWallets',         name: 'Wallets' },
    { key: 'sharedScales',          name: 'Scales' },
    { key: 'sharedSpinUpgrade',     name: 'Spin Upgrade' },
    { key: 'sharedStoneAgony',      name: 'Stone of Agony' },
    { key: 'sharedBoomerang',       name: 'Boomerang' },
    { key: 'sharedSlingshot',       name: 'Slingshot' },
    { key: 'sharedGFS',             name: 'Great Fairy Sword' },
    { key: 'sharedPowderKeg',       name: 'Powder Keg' },
    { header: 'Equipment' },
    { key: 'sharedSwords',       name: 'Swords' },
    { key: 'sharedShields',      name: 'Shields' },
    { key: 'sharedShieldDeku',   name: 'Deku Shield' },
    { key: 'sharedShieldHylian', name: 'Hylian Shield' },
    { key: 'sharedStrength',     name: 'Strength' },
    { key: 'sharedBootsIron',    name: 'Iron Boots' },
    { key: 'sharedBootsHover',   name: 'Hover Boots' },
    { key: 'sharedTunicGoron',   name: 'Goron Tunic' },
    { key: 'sharedTunicZora',    name: 'Zora Tunic' },
    { header: 'Spells' },
    { key: 'sharedSpellFire', name: "Din's Fire" },
    { key: 'sharedSpellWind', name: "Farore's Wind" },
    { key: 'sharedSpellLove', name: "Nayru's Love" },
    { header: 'Masks' },
    { key: 'sharedMaskGoron',  name: 'Goron Mask' },
    { key: 'sharedMaskZora',   name: 'Zora Mask' },
    { key: 'sharedMaskKeaton', name: 'Keaton Mask' },
    { key: 'sharedMaskBlast',  name: 'Blast Mask' },
    { key: 'sharedMaskStone',  name: 'Stone Mask' },
    { key: 'sharedMaskBunny',  name: 'Bunny Hood' },
    { key: 'sharedMaskTruth',  name: 'Mask of Truth' },
    { key: 'sharedMaskKamaro', name: "Kamaro's Mask" },
    { header: 'Songs' },
    { key: 'sharedSongEpona',  name: "Epona's Song" },
    { key: 'sharedSongStorms', name: 'Song of Storms' },
    { key: 'sharedSongTime',   name: 'Song of Time' },
    { key: 'sharedSongSun',    name: "Sun's Song" },
    { key: 'sharedSongElegy',  name: 'Elegy of Emptiness' },
    { header: 'Cross-Game Songs (MM → OoT)' },
    { key: 'sharedSongHealing',  name: 'Song of Healing' },
    { key: 'sharedSongSoaring',  name: 'Song of Soaring' },
    { key: 'sharedSongSonata',   name: 'Sonata of Awakening' },
    { key: 'sharedSongLullaby',  name: "Goron's Lullaby" },
    { key: 'sharedSongNova',     name: 'New Wave Bossa Nova' },
    { key: 'sharedSongOath',     name: 'Oath to Order' },
    { header: 'Cross-Game Songs (OoT → MM)' },
    { key: 'sharedSongZeldaLullaby', name: "Zelda's Lullaby" },
    { key: 'sharedSongSaria',        name: "Saria's Song" },
    { key: 'sharedSongMinuet',       name: 'Minuet of Forest' },
    { key: 'sharedSongBolero',       name: 'Bolero of Fire' },
    { key: 'sharedSongSerenade',     name: 'Serenade of Water' },
    { key: 'sharedSongRequiem',      name: 'Requiem of Spirit' },
    { key: 'sharedSongNocturne',     name: 'Nocturne of Shadow' },
    { key: 'sharedSongPrelude',      name: 'Prelude of Light' },
    { header: 'Song Events' },
    { key: 'crossGameSongs',     name: 'Show Cross-Game Song Icons' },
    { key: 'songEventShuffle',   name: 'Song Events Shuffle' },
    { header: 'Bottles' },
    { key: 'sharedHealth',         name: 'Bottle' },
    { key: 'sharedBottleRuto',     name: "Ruto's Letter" },
    { key: 'sharedBottleGoldDust', name: 'Gold Dust Bottle' },
    { header: 'Triforce' },
    { key: 'sharedTriforce',        name: 'Triforce' },
    { key: 'sharedTriforceCourage', name: 'Triforce of Courage' },
    { key: 'sharedTriforcePower',   name: 'Triforce of Power' },
    { key: 'sharedTriforceWisdom',  name: 'Triforce of Wisdom' },
    { header: 'Keys & Tokens' },
    { key: 'sharedSkeletonKey',    name: 'Skeleton Key' },
    { key: 'sharedPlatinumToken',  name: 'Platinum Token' },
    { header: 'Ocarina' },
    { key: 'sharedOcarinaButtons', name: 'Ocarina Buttons' },
  ];

  // Visibility items: default on (not false = visible). Toggle writes a boolean.
  function toggleVisibility(key: string, checked: boolean) {
    if (!ySettings) return;
    ySettings.set(key, checked);
  }

  // Shared items: default off (must be true to be visible). Toggle sets/deletes.
  function toggleSharedSetting(key: string, checked: boolean) {
    if (!ySettings) return;
    if (checked) ySettings.set(key, true);
    else ySettings.delete(key);
  }

  function setStringSetting(key: string, value: string) {
    if (!ySettings) return;
    ySettings.set(key, value);
  }

  function visGet(key: string): any {
    return sSettings ? ($sSettings as Map<string, any>)?.get(key) : undefined;
  }

  // ─── Logic settings ───────────────────────────────────────────────────────────
  // All groups collapsed by default
  let collapsed = new Set<string>(SETTING_GROUPS);
  let tricksCategoryCollapsed = new Set<string>(['OoT MQ', 'OoT Glitch']);
  let tricksCollapsed = true;

  function toggleGroup(group: string) {
    collapsed = collapsed.has(group)
      ? (collapsed.delete(group), new Set(collapsed))
      : new Set([...collapsed, group]);
  }

  function toggleTricksGroup() { tricksCollapsed = !tricksCollapsed; }

  function toggleTricksCategory(cat: string) {
    tricksCategoryCollapsed = tricksCategoryCollapsed.has(cat)
      ? (tricksCategoryCollapsed.delete(cat), new Set(tricksCategoryCollapsed))
      : new Set([...tricksCategoryCollapsed, cat]);
  }

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

  const defaults = defaultLogicSettings();
  function isGroupModified(group: string): boolean {
    return groupDefs(group).some(def => {
      const v = get(def.key);
      return v !== undefined && v !== defaults[def.key];
    });
  }

  function isTrickEnabled(id: string): boolean {
    return $enabledTricks.has(id);
  }

  function toggleTrick(id: string) {
    enabledTricks.update(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function enableAllTricks() { enabledTricks.set(new Set(TRICKS_DEFS.map(t => t.id))); }
  function disableAllTricks() { enabledTricks.set(new Set()); }
</script>

<!-- Sub-tab bar -->
<div class="subtab-bar">
  <button class="subtab" class:subtab-active={activeSubTab === 'logic'}  on:click={() => activeSubTab = 'logic'}>Logic</button>
  <button class="subtab" class:subtab-active={activeSubTab === 'oot'}    on:click={() => activeSubTab = 'oot'}>OoT Items</button>
  <button class="subtab" class:subtab-active={activeSubTab === 'mm'}     on:click={() => activeSubTab = 'mm'}>MM Items</button>
  <button class="subtab" class:subtab-active={activeSubTab === 'shared'} on:click={() => activeSubTab = 'shared'}>Shared Items</button>
</div>

{#if activeSubTab === 'logic'}
  {#each SETTING_GROUPS as group}
    {@const isOpen = !collapsed.has(group)}
    {@const modified = groupDefs(group).some(def => {
      const v = $logicManualSettings[def.key];
      return v !== undefined && v !== defaults[def.key];
    })}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="group-header" on:click={() => toggleGroup(group)}>
      <span class="group-arrow">{isOpen ? '▼' : '▶'}</span>
      <span class="ls-group-label">{group}</span>
      {#if modified}<span class="modified-dot" title="Modified"></span>{/if}
    </div>

    {#if isOpen}
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
    {/if}
  {/each}

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="group-header" on:click={toggleTricksGroup}>
    <span class="group-arrow">{tricksCollapsed ? '▶' : '▼'}</span>
    <span class="ls-group-label">Tricks</span>
    {#if $enabledTricks.size > 0}<span class="modified-dot" title="{$enabledTricks.size} enabled"></span>{/if}
    <div class="tricks-actions" on:click|stopPropagation>
      <button type="button" class="trick-action-btn" on:click={enableAllTricks}>All</button>
      <button type="button" class="trick-action-btn" on:click={disableAllTricks}>None</button>
    </div>
  </div>

  {#if !tricksCollapsed}
    {#each TRICK_CATEGORIES as cat}
      {@const catOpen = !tricksCategoryCollapsed.has(cat)}
      {@const catEnabled = tricksByCategory(cat).filter(t => isTrickEnabled(t.id)).length}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="subgroup-header" on:click={() => toggleTricksCategory(cat)}>
        <span class="group-arrow small">{catOpen ? '▼' : '▶'}</span>
        <span>{cat}</span>
        {#if catEnabled > 0}<span class="cat-count">{catEnabled}</span>{/if}
      </div>
      {#if catOpen}
        <div class="dropdown-grid compact">
          {#each tricksByCategory(cat) as trick}
            <label class="checkbox-option">
              <input
                type="checkbox"
                checked={isTrickEnabled(trick.id)}
                on:change={() => toggleTrick(trick.id)}
              />
              {trick.label}
            </label>
          {/each}
        </div>
      {/if}
    {/each}
  {/if}

{:else if activeSubTab === 'oot'}
  <p class="settings-hint">Hides inactive OoT items for this seed. Automatically imported from the spoiler log.</p>
  <div class="dropdown-grid">
    {#each ootVisibility as item}
      {#if item.header}
        <div class="settings-grid-header">{item.header}</div>
      {:else if item.options}
        <label class="settings-select-row">
          <span class="settings-select-name">{item.name}</span>
          <select
            class="dropdown-select"
            value={visGet(item.key) ?? item.options[0].value}
            on:change={e => setStringSetting(item.key, e.currentTarget.value)}
          >
            {#each item.options as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </label>
      {:else}
        <label class="checkbox-option">
          <input
            type="checkbox"
            checked={visGet(item.key) !== false}
            on:change={() => toggleVisibility(item.key, visGet(item.key) === false)}
          />
          {item.name}
        </label>
      {/if}
    {/each}
  </div>

{:else if activeSubTab === 'mm'}
  <p class="settings-hint">Hides inactive MM items for this seed. Automatically imported from the spoiler log.</p>
  <div class="dropdown-grid">
    {#each mmVisibility as item}
      {#if item.header}
        <div class="settings-grid-header">{item.header}</div>
      {:else if item.options}
        <label class="settings-select-row">
          <span class="settings-select-name">{item.name}</span>
          <select
            class="dropdown-select"
            value={visGet(item.key) ?? item.options[0].value}
            on:change={e => setStringSetting(item.key, e.currentTarget.value)}
          >
            {#each item.options as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </label>
      {:else}
        <label class="checkbox-option">
          <input
            type="checkbox"
            checked={visGet(item.key) !== false}
            on:change={() => toggleVisibility(item.key, visGet(item.key) === false)}
          />
          {item.name}
        </label>
      {/if}
    {/each}
  </div>

{:else if activeSubTab === 'shared'}
  <p class="settings-hint">Enables shared items to appear in the Shared panel.</p>
  <div class="dropdown-grid">
    {#each sharedData as item}
      {#if item.header}
        <div class="settings-grid-header">{item.header}</div>
      {:else}
        <label class="checkbox-option">
          <input
            type="checkbox"
            checked={visGet(item.key) === true}
            on:change={() => toggleSharedSetting(item.key, visGet(item.key) !== true)}
          />
          {item.name}
        </label>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .subtab-bar {
    display: flex;
    gap: 0.3em;
    margin-bottom: 0.6em;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.4em;
  }

  .subtab {
    font-size: 0.75em;
    font-weight: 600;
    padding: 0.3em 0.8em;
    border: 1px solid var(--color-border);
    border-radius: 4px 4px 0 0;
    background: var(--color-bg);
    color: #888;
    cursor: pointer;
    letter-spacing: 0.03em;
  }
  .subtab:hover { color: var(--color-text); border-color: #999; }
  .subtab.subtab-active {
    color: var(--color-text);
    border-color: #4a9eff;
    background: rgba(74, 158, 255, 0.08);
  }

  .settings-hint {
    font-size: 0.78em;
    color: #888;
    margin: 0.2em 0 0.5em;
    font-style: italic;
  }

  .settings-grid-header {
    grid-column: 1 / -1;
    font-size: 0.72em;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #888;
    padding: 0.5em 0 0.1em;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 0.1em;
  }

  .settings-select-row {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 0.6em;
    font-size: 0.9em;
    padding: 0.2em 0;
  }
  .settings-select-name {
    flex-shrink: 0;
    min-width: 8em;
  }
  .settings-select-row .dropdown-select {
    flex: 1;
    margin-top: 0;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 0.4em;
    padding: 0.35em 0.2em;
    margin-top: 0.5em;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    user-select: none;
  }
  .group-header:hover { background: rgba(255,255,255,0.04); }

  .group-arrow {
    font-size: 0.6em;
    color: #666;
    min-width: 0.8em;
  }
  .group-arrow.small { font-size: 0.55em; }

  .ls-group-label {
    font-size: 0.75em;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #888;
  }

  .modified-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4a9eff;
    flex-shrink: 0;
  }

  .subgroup-header {
    display: flex;
    align-items: center;
    gap: 0.4em;
    padding: 0.25em 0.5em;
    margin-top: 0.3em;
    cursor: pointer;
    user-select: none;
    font-size: 0.72em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #666;
    border-radius: 3px;
  }
  .subgroup-header:hover { background: rgba(255,255,255,0.04); }

  .cat-count {
    font-size: 0.85em;
    background: #1a3a5a;
    color: #4a9eff;
    border-radius: 3px;
    padding: 0 4px;
  }

  .tricks-actions {
    margin-left: auto;
    display: flex;
    gap: 0.4em;
  }

  .trick-action-btn {
    font-size: 0.72em;
    padding: 1px 8px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-bg);
    color: var(--color-text);
    cursor: pointer;
  }
  .trick-action-btn:hover { border-color: #999; }

  .dropdown-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4em 1em;
    margin-bottom: 0.3em;
    padding: 0.3em 0;
  }
  .dropdown-grid.compact {
    grid-template-columns: repeat(4, 1fr);
    gap: 0.2em 0.8em;
  }
  @media screen and (max-width: 1024px) {
    .dropdown-grid { grid-template-columns: repeat(2, 1fr); }
    .dropdown-grid.compact { grid-template-columns: repeat(3, 1fr); }
  }
  @media screen and (max-width: 768px) {
    .dropdown-grid, .dropdown-grid.compact { grid-template-columns: 1fr; }
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
    padding: 0.3em 0;
    cursor: pointer;
    gap: 0.5em;
    font-size: 0.9em;
  }
  .checkbox-option input[type='checkbox'] { cursor: pointer; flex-shrink: 0; }
  .checkbox-option:has(input:disabled) { opacity: 0.55; cursor: default; }

  .multicheck-block { grid-column: 1 / -1; }
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
