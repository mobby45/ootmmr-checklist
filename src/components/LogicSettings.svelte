<script lang="ts">
  import type { Readable } from 'svelte/store';
  import type { Map as YMap } from 'yjs';
  import { logicManualSettings, enabledTricks } from '../stores/logicStore';
  import { LOGIC_SETTINGS_DEFS, defaultLogicSettings } from '../data/logicSettingsDef';
  import type { LogicSettingDef } from '../data/logicSettingsDef';
  import { TRICKS_DEFS } from '../data/tricksDef';

  /** Keys present in the spoiler log — shown read-only */
  export let spoilerKeys: Set<string> = new Set();

  /** Y.js settings map from App.svelte (needed for item visibility sub-tabs) */
  export let ySettings: YMap<any> | null = null;

  /** Readable store over ySettings */
  export let sSettings: Readable<Map<string, any>> | null = null;

  // ─── Two-tier navigation ──────────────────────────────────────────────────────
  type PrimaryTab = 'settings' | 'items' | 'tricks';
  type SettingsTab = 'main' | 'shuffle' | 'price' | 'events' | 'cross' | 'misc';
  type ItemsTab = 'progressive' | 'extensions' | 'ageless' | 'shared';

  let primaryTab: PrimaryTab = 'settings';
  let settingsTab: SettingsTab = 'main';
  let itemsTab: ItemsTab = 'progressive';

  const SETTINGS_TABS: { id: SettingsTab; label: string; group: string }[] = [
    { id: 'main',    label: 'Main',       group: 'Main' },
    { id: 'shuffle', label: 'Shuffle',    group: 'Shuffle' },
    { id: 'price',   label: 'Price',      group: 'Price' },
    { id: 'events',  label: 'Events',     group: 'Events' },
    { id: 'cross',   label: 'Cross-Game', group: 'Cross-Game' },
    { id: 'misc',    label: 'Misc',       group: 'Misc' },
  ];

  function defsForGroup(group: string): LogicSettingDef[] {
    return LOGIC_SETTINGS_DEFS.filter(d => d.group === group);
  }

  function sectionsForGroup(group: string): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const d of LOGIC_SETTINGS_DEFS) {
      if (d.group !== group) continue;
      const s = d.section ?? '';
      if (!seen.has(s)) { seen.add(s); out.push(s); }
    }
    return out;
  }

  // ─── Item visibility data ─────────────────────────────────────────────────────
  type VItem =
    | { header: string; key?: never; name?: never; options?: never }
    | { header?: never; key: string; name: string; options?: Array<{ value: string; label: string }> };

  // Extensions tab: all items are opt-in (checked = ySettings.get(key) === true)
  const extensionsData: VItem[] = [
    { header: 'OoT' },
    { key: 'gfsOot',                   name: 'Great Fairy Sword' },
    { key: 'powderKegOot',             name: 'Powder Keg License' },
    { key: 'spinUpgradeOot',           name: 'Spin Attack Upgrade' },
    { key: 'stoneMaskOot',             name: 'Stone Mask' },
    { key: 'blastMaskOot',             name: 'Blast Mask' },
    { key: 'magicalRupee',             name: 'Magical Rupee' },
    { key: 'rustyKeysOot',             name: 'Rusty Keys' },
    { key: 'elegyOot',                 name: 'Elegy of Emptiness' },
    { key: 'coins',                    name: 'Coins' },
    { key: 'ocarinaButtonsShuffleOot', name: 'Ocarina Buttons' },
    { key: 'skeletonKeyOot',           name: 'Skeleton Key' },
    { key: 'platinumTokenOot',         name: 'Platinum Token' },
    { header: 'MM' },
    { key: 'boomerangMm',             name: 'Boomerang' },
    { key: 'hammerMm',                name: 'Megaton Hammer' },
    { key: 'scalesMm',                name: 'Scales' },
    { key: 'strengthMm',              name: 'Strength' },
    { key: 'tunicGoronMm',            name: 'Goron Tunic' },
    { key: 'tunicZoraMm',             name: 'Zora Tunic' },
    { key: 'bootsIronMm',             name: 'Iron Boots' },
    { key: 'bootsHoverMm',            name: 'Hover Boots' },
    { key: 'spellFireMm',             name: "Din's Fire" },
    { key: 'spellWindMm',             name: "Farore's Wind" },
    { key: 'spellLoveMm',             name: "Nayru's Love" },
    { key: 'dekuShieldMm',            name: 'Deku Shield' },
    { key: 'fairyOcarinaMm',          name: 'Fairy Ocarina' },
    { key: 'stoneAgonyMm',            name: 'Stone of Agony' },
    { key: 'shortHookshotMm',         name: 'Short Hookshot' },
    { key: 'rustyKeysMm',             name: 'Rusty Keys' },
    { key: 'ocarinaButtonsShuffleMm', name: 'Ocarina Buttons' },
    { key: 'platinumTokenMm',         name: 'Platinum Token' },
    { key: 'skeletonKeyMm',           name: 'Skeleton Key' },
    { key: 'transcendentFairy',       name: 'Transcendent Fairy' },
    { key: 'clocks',                  name: 'Clock Items' },
    { key: 'menuNotebook',            name: "Bomber's Notebook" },
    { key: 'owlShuffleEnabled',       name: 'Owl Statues' },
    { header: 'Wallets' },
    { key: 'childWallets',      name: 'Child Wallet (shuffled)' },
    { key: 'colossalWallets',   name: 'Colossal Wallet (999◆)' },
    { key: 'bottomlessWallets', name: 'Bottomless Wallet (9999◆)' },
    { header: 'Mechanics' },
    { key: 'bronzeScale',          name: 'Bronze Scale' },
    { key: 'blueFireArrows',       name: 'Blue Fire Arrows' },
    { key: 'iceArrowPlatformsOot', name: 'Ice Arrow Platforms (OoT)' },
    { key: 'sunlightArrows',       name: 'Sunlight Arrows' },
    { header: 'Bombchu' },
    { key: 'bombchuBehaviorOot', name: 'Behavior (OoT)', options: [
      { value: 'bagFirst',    label: 'Bag First' },
      { value: 'bagSeparate', label: 'Bag Separate' },
      { value: 'bombBag',     label: 'Bomb Bag' },
      { value: 'free',        label: 'Free' },
    ]},
    { key: 'bombchuBehaviorMm', name: 'Behavior (MM)', options: [
      { value: 'vanilla',     label: 'Vanilla (MM)' },
      { value: 'bagFirst',    label: 'Bag (First Pack)' },
      { value: 'bagSeparate', label: 'Bag (Separate Items)' },
    ]},
    { key: 'kegStrength3', name: 'Keg Strength (3rd Upgrade)' },
    { header: 'Souls (OoT)' },
    { key: 'soulsBossOot',   name: 'Boss Souls' },
    { key: 'soulsEnemyOot',  name: 'Enemy Souls' },
    { key: 'soulsNpcOot',    name: 'NPC Souls' },
    { key: 'soulsAnimalOot', name: 'Animal Souls' },
    { key: 'soulsMiscOot',   name: 'Misc Souls' },
    { header: 'Souls (MM)' },
    { key: 'soulsBossMm',   name: 'Boss Souls' },
    { key: 'soulsEnemyMm',  name: 'Enemy Souls' },
    { key: 'soulsNpcMm',    name: 'NPC Souls' },
    { key: 'soulsAnimalMm', name: 'Animal Souls' },
    { key: 'soulsMiscMm',   name: 'Misc Souls' },
    { header: 'Shared Souls' },
    { key: 'sharedSoulsEnemy',  name: 'Enemy Souls' },
    { key: 'sharedSoulsNpc',    name: 'NPC Souls' },
    { key: 'sharedSoulsAnimal', name: 'Animal Souls' },
    { key: 'sharedSoulsMisc',   name: 'Misc Souls' },
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

  // ─── Logic tab state ─────────────────────────────────────────────────────────
  type LogicTab = 'tricks' | 'glitches' | 'junk';
  type LogicGame = 'oot' | 'mm';

  let logicTab: LogicTab = 'tricks';
  let logicGame: LogicGame = 'oot';

  function tricksForTab(tab: LogicTab, game: LogicGame): typeof TRICKS_DEFS {
    if (tab === 'tricks') {
      return game === 'oot'
        ? TRICKS_DEFS.filter(t => t.category === 'OoT' || t.category === 'OoT MQ')
        : TRICKS_DEFS.filter(t => t.category === 'MM');
    }
    if (tab === 'glitches') {
      return game === 'oot' ? TRICKS_DEFS.filter(t => t.category === 'OoT Glitch') : [];
    }
    return [];
  }

  function enableAllInView() {
    const ids = new Set(tricksForTab(logicTab, logicGame).map(t => t.id));
    enabledTricks.update(s => new Set([...s, ...ids]));
  }

  function disableAllInView() {
    const ids = new Set(tricksForTab(logicTab, logicGame).map(t => t.id));
    enabledTricks.update(s => { const n = new Set(s); ids.forEach(id => n.delete(id)); return n; });
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

  $: fromSpoiler = (key: string) => spoilerKeys.has(key);

  const defaults = defaultLogicSettings();

  function isTabModified(group: string): boolean {
    return defsForGroup(group).some(def => {
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

<!-- Primary tab bar -->
<div class="primary-tab-bar">
  <button type="button" class="primary-tab" class:primary-tab-active={primaryTab === 'settings'} on:click={() => primaryTab = 'settings'}>Settings</button>
  <button type="button" class="primary-tab" class:primary-tab-active={primaryTab === 'items'}    on:click={() => primaryTab = 'items'}>Items</button>
  <button type="button" class="primary-tab" class:primary-tab-active={primaryTab === 'tricks'}   on:click={() => primaryTab = 'tricks'}>
    Tricks
    {#if $enabledTricks.size > 0}<span class="tab-count">{$enabledTricks.size}</span>{/if}
  </button>
</div>

{#if primaryTab === 'settings'}
  <!-- Secondary tab bar for settings -->
  <div class="subtab-bar">
    {#each SETTINGS_TABS as tab}
      {@const modified = isTabModified(tab.group)}
      <button
        type="button"
        class="subtab"
        class:subtab-active={settingsTab === tab.id}
        on:click={() => settingsTab = tab.id}
      >
        {tab.label}
        {#if modified}<span class="modified-dot-tab"></span>{/if}
      </button>
    {/each}
  </div>

  <!-- Settings content for active tab -->
  {#each SETTINGS_TABS as tab}
    {#if settingsTab === tab.id}
      {#each sectionsForGroup(tab.group) as section}
        {#if section}
          <div class="section-header">{section}</div>
        {/if}
        <div class="dropdown-grid">
          {#each defsForGroup(tab.group).filter(d => (d.section ?? '') === section) as def}
            {@const spoiler = fromSpoiler(def.key)}
            {#if def.type === 'bool'}
              <label class="checkbox-option" class:spoiler-row={spoiler} title={[def.desc, spoiler ? 'Set by spoiler log' : ''].filter(Boolean).join('\n')}>
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
              <label class:spoiler-row={spoiler} title={[def.desc, spoiler ? 'Set by spoiler log' : ''].filter(Boolean).join('\n')}>
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
                <div class="multicheck-title" title={[def.desc, spoiler ? 'Set by spoiler log' : ''].filter(Boolean).join('\n')}>
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
    {/if}
  {/each}

{:else if primaryTab === 'items'}
  <!-- Secondary tab bar for items -->
  <div class="subtab-bar">
    <button type="button" class="subtab" class:subtab-active={itemsTab === 'progressive'} on:click={() => itemsTab = 'progressive'}>Progressive</button>
    <button type="button" class="subtab" class:subtab-active={itemsTab === 'extensions'} on:click={() => itemsTab = 'extensions'}>Extensions</button>
    <button type="button" class="subtab" class:subtab-active={itemsTab === 'ageless'}    on:click={() => itemsTab = 'ageless'}>Ageless</button>
    <button type="button" class="subtab" class:subtab-active={itemsTab === 'shared'}     on:click={() => itemsTab = 'shared'}>Shared</button>
  </div>

  {#if itemsTab === 'progressive'}
    <p class="settings-hint">Progressive item types. Automatically imported from the spoiler log.</p>
    <div class="dropdown-grid">
      {#each defsForGroup('Progressive') as def}
        <label class="settings-select-row">
          <span class="settings-select-name">{def.label}</span>
          <select
            class="dropdown-select"
            value={visGet(def.key) ?? def.default}
            on:change={e => setStringSetting(def.key, e.currentTarget.value)}
          >
            {#each def.options ?? [] as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </label>
      {/each}
    </div>

  {:else if itemsTab === 'extensions'}
    <p class="settings-hint">Optional items shuffled into the pool. Automatically imported from the spoiler log.</p>
    <div class="dropdown-grid">
      {#each extensionsData as item}
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
              checked={visGet(item.key) === true}
              on:change={() => toggleSharedSetting(item.key, visGet(item.key) !== true)}
            />
            {item.name}
          </label>
        {/if}
      {/each}
    </div>

  {:else if itemsTab === 'ageless'}
    <p class="settings-hint">Age restrictions removed for these items.</p>
    <div class="dropdown-grid">
      {#each defsForGroup('Ageless') as def}
        <label class="checkbox-option">
          <input
            type="checkbox"
            checked={visGet(def.key) === true}
            on:change={() => toggleSharedSetting(def.key, visGet(def.key) !== true)}
          />
          {def.label}
        </label>
      {/each}
    </div>

  {:else if itemsTab === 'shared'}
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

{:else if primaryTab === 'tricks'}
  <!-- Logic sub-tab bar -->
  <div class="subtab-bar">
    <button type="button" class="subtab" class:subtab-active={logicTab === 'tricks'}  on:click={() => logicTab = 'tricks'}>
      Tricks
      {#if $enabledTricks.size > 0}<span class="tab-count">{$enabledTricks.size}</span>{/if}
    </button>
    <button type="button" class="subtab" class:subtab-active={logicTab === 'glitches'} on:click={() => logicTab = 'glitches'}>Glitches</button>
    <button type="button" class="subtab" class:subtab-active={logicTab === 'junk'}     on:click={() => logicTab = 'junk'}>Junk Locations</button>
  </div>

  {#if logicTab !== 'junk'}
    <!-- Game filter + bulk actions -->
    <div class="logic-toolbar">
      <div class="logic-game-filter">
        <button type="button" class="lgame-btn" class:lgame-active={logicGame === 'oot'} on:click={() => logicGame = 'oot'}>Ocarina of Time</button>
        <button type="button" class="lgame-btn" class:lgame-active={logicGame === 'mm'}  on:click={() => logicGame = 'mm'}>Majora's Mask</button>
      </div>
      <div class="tricks-actions">
        <button type="button" class="trick-action-btn" on:click={enableAllInView}>Add All</button>
        <button type="button" class="trick-action-btn" on:click={disableAllInView}>Remove All</button>
        <button type="button" class="trick-action-btn danger" on:click={disableAllTricks}>Reset</button>
      </div>
    </div>

    <!-- Dual panel: Disabled | Enabled -->
    {@const allTricks   = tricksForTab(logicTab, logicGame)}
    {@const disabled    = allTricks.filter(t => !isTrickEnabled(t.id))}
    {@const enabled_    = allTricks.filter(t =>  isTrickEnabled(t.id))}
    <div class="dual-panel">
      <div class="trick-panel">
        <div class="panel-header">Disabled</div>
        <div class="panel-list">
          {#each disabled as trick}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="trick-row" on:click={() => toggleTrick(trick.id)}>{trick.label}</div>
          {/each}
          {#if disabled.length === 0}
            <div class="panel-empty">All {logicTab} enabled</div>
          {/if}
        </div>
      </div>
      <div class="trick-panel enabled-panel">
        <div class="panel-header">Enabled</div>
        <div class="panel-list">
          {#each enabled_ as trick}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="trick-row trick-row-enabled" on:click={() => toggleTrick(trick.id)}>{trick.label}</div>
          {/each}
          {#if enabled_.length === 0}
            <div class="panel-empty">None enabled</div>
          {/if}
        </div>
      </div>
    </div>

  {:else}
    <!-- Junk Locations — not yet implemented -->
    <p class="settings-hint" style="margin-top:1em">Junk Locations: mark checks as logically irrelevant (coming soon).</p>
  {/if}
{/if}

<style>
  /* ── Primary tab bar ─────────────────────────────────────────────────────── */
  .primary-tab-bar {
    display: flex;
    gap: 0.2em;
    margin-bottom: 0.4em;
  }

  .primary-tab {
    flex: 1;
    font-size: 0.8em;
    font-weight: 700;
    padding: 0.35em 0.5em;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: #888;
    cursor: pointer;
    letter-spacing: 0.03em;
    text-align: center;
  }
  .primary-tab:hover { color: var(--color-text); border-color: #999; }
  .primary-tab.primary-tab-active {
    color: var(--color-text);
    border-color: #4a9eff;
    background: rgba(74, 158, 255, 0.12);
  }

  .tab-count {
    display: inline-block;
    font-size: 0.82em;
    background: #1a3a5a;
    color: #4a9eff;
    border-radius: 3px;
    padding: 0 4px;
    margin-left: 4px;
    font-weight: normal;
    vertical-align: middle;
  }

  /* ── Secondary sub-tab bar ───────────────────────────────────────────────── */
  .subtab-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25em;
    margin-bottom: 0.5em;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.35em;
  }

  .subtab {
    font-size: 0.72em;
    font-weight: 600;
    padding: 0.25em 0.65em;
    border: 1px solid var(--color-border);
    border-radius: 3px 3px 0 0;
    background: var(--color-bg);
    color: #888;
    cursor: pointer;
    letter-spacing: 0.03em;
    position: relative;
  }
  .subtab:hover { color: var(--color-text); border-color: #999; }
  .subtab.subtab-active {
    color: var(--color-text);
    border-color: #4a9eff;
    background: rgba(74, 158, 255, 0.08);
  }

  .modified-dot-tab {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #4a9eff;
    margin-left: 4px;
    vertical-align: middle;
    flex-shrink: 0;
  }

  /* ── Section headers within a tab ─────────────────────────────────────────── */
  .section-header {
    font-size: 0.72em;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #888;
    padding: 0.6em 0 0.2em;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 0.2em;
    margin-top: 0.2em;
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

  /* ── Logic / Tricks section ─────────────────────────────────────────────── */
  .logic-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4em;
    margin-bottom: 0.5em;
    flex-wrap: wrap;
  }

  .logic-game-filter {
    display: flex;
    gap: 0.25em;
  }

  .lgame-btn {
    font-size: 0.76em;
    padding: 0.3em 0.9em;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-bg);
    color: #888;
    cursor: pointer;
  }
  .lgame-btn:hover { color: var(--color-text); border-color: #999; }
  .lgame-btn.lgame-active {
    color: var(--color-text);
    border-color: #4a9eff;
    background: rgba(74,158,255,0.1);
    font-weight: 600;
  }

  .tricks-actions {
    display: flex;
    gap: 0.4em;
  }

  .trick-action-btn {
    font-size: 0.72em;
    padding: 2px 8px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-bg);
    color: var(--color-text);
    cursor: pointer;
  }
  .trick-action-btn:hover { border-color: #999; }
  .trick-action-btn.danger { border-color: #a33; color: #f88; }
  .trick-action-btn.danger:hover { border-color: #f55; color: #faa; }

  .dual-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5em;
    min-height: 200px;
  }
  @media screen and (max-width: 640px) {
    .dual-panel { grid-template-columns: 1fr; }
  }

  .trick-panel {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel-header {
    font-size: 0.72em;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #888;
    padding: 0.35em 0.6em;
    border-bottom: 1px solid var(--color-border);
    background: rgba(255,255,255,0.03);
    text-align: center;
  }
  .enabled-panel .panel-header { color: #4a9eff; }

  .panel-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.2em 0;
  }

  .trick-row {
    font-size: 0.82em;
    padding: 0.28em 0.7em;
    cursor: pointer;
    color: var(--color-text);
    border-radius: 2px;
    transition: background 0.1s;
  }
  .trick-row:hover { background: rgba(255,255,255,0.07); }
  .trick-row-enabled { color: #7ec8e3; }
  .trick-row-enabled:hover { background: rgba(74,158,255,0.1); }

  .panel-empty {
    font-size: 0.78em;
    color: #555;
    padding: 0.6em 0.7em;
    font-style: italic;
  }

  /* ── Settings grid ────────────────────────────────────────────────────────── */
  .dropdown-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4em 1em;
    margin-bottom: 0.3em;
    padding: 0.2em 0;
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
