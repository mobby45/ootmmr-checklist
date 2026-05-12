<script lang="ts">
  import { itemById, sharedItems, type TrackerItem } from '../data/itemData';
  import { sharedToOot, sharedToMm, ootToShared, mmToShared } from '../data/sharedSync';
  import type { Map as YMap } from 'yjs';
  import { readable } from 'svelte/store';
  import { onMount } from 'svelte';

  export let yItems: YMap<number>;
  export let ySettings: YMap<any>;
  export let onJoinRoom: ((code: string) => void) | null = null;

  let ovGameMode: 'both' | 'oot' | 'mm' | 'none' = JSON.parse(localStorage.getItem('ov_gameMode') || '"both"');
  $: localStorage.setItem('ov_gameMode', JSON.stringify(ovGameMode));

  const IMG_BASE = '/ootmmr-checklist/images/';
  const _p = new URLSearchParams(window.location.search);
  const overlayGame = (_p.get('game') as 'oot' | 'mm' | 'both') ?? 'both';
  const bgOpacity   = parseFloat(_p.get('opacity') ?? '1');
  const transparent = _p.get('transparent') === 'true';
  const debugMode   = _p.get('debug') === 'true';
  if (_p.get('room') && onJoinRoom) onJoinRoom(_p.get('room')!);

  const itemStore = readable(new Map<string, number>(), set => {
    const u = () => set(new Map(yItems.entries()));
    u(); yItems.observe(u); return () => yItems.unobserve(u);
  });
  const settingsStore = readable(new Map<string, any>(), set => {
    const u = () => set(new Map(ySettings.entries()));
    u(); ySettings.observe(u); return () => ySettings.unobserve(u);
  });

  $: showOot    = ovGameMode !== 'mm'  && ovGameMode !== 'none' && (overlayGame === 'both' || overlayGame === 'oot');
  $: showMm     = ovGameMode !== 'oot' && ovGameMode !== 'none' && (overlayGame === 'both' || overlayGame === 'mm');
  $: showShared = ovGameMode === 'both' && overlayGame === 'both';

  $: activeSharedIds = new Set(
    sharedItems.filter(i => !i.settingKey || $settingsStore.get(i.settingKey) === true).map(i => i.id)
  );

  // No shared-based hiding — items always show in their game columns
  $: hiddenFromOot = new Set<string>();
  $: hiddenFromMm  = new Set<string>();

  function sharedObt(cid: string, game: 'oot' | 'mm'): boolean {
    const shKey = game === 'oot' ? ootToShared[cid] : mmToShared[cid];
    if (!shKey || !activeSharedIds.has(shKey)) return false;
    const shItem = itemById[shKey];
    if (!shItem) return false;
    return isObt(shItem, $itemStore.get(shKey) ?? 0);
  }

  function hasSyncDot(cid: string, game: 'oot' | 'mm'): boolean {
    if (!showShared) return false;
    const shKey = game === 'oot' ? ootToShared[cid] : mmToShared[cid];
    return shKey !== undefined && activeSharedIds.has(shKey);
  }

  const itemVisibilityMap: Record<string, string> = {
    'oot_elegy':               'elegyOot',
    'button_a':                'ocarinaButtonsShuffleOot',
    'button_up':               'ocarinaButtonsShuffleOot',
    'button_down':             'ocarinaButtonsShuffleOot',
    'button_left':             'ocarinaButtonsShuffleOot',
    'button_right':            'ocarinaButtonsShuffleOot',
    'oot_spin_upgrade':        'spinUpgradeOot',
    'key_skeleton':            'skeletonKeyOot',
    'skulltula_platinum':      'platinumTokenOot',
    'oot_rupee_magical':       'magicalRupee',
    'mm_spell_fire':           'spellFireMm',
    'mm_spell_wind':           'spellWindMm',
    'mm_spell_love':           'spellLoveMm',
    'mm_stone_of_agony':       'stoneAgonyMm',
    'mm_hammer':               'hammerMm',
    'mm_strength':             'strengthMm',
    'mm_scale':                'scalesMm',
    'mm_shield_deku':          'dekuShieldMm',
    'mm_boots_iron':           'bootsIronMm',
    'mm_boots_hover':          'bootsHoverMm',
    'mm_tunic_goron':          'tunicGoronMm',
    'mm_tunic_zora':           'tunicZoraMm',
    'mm_button_a':             'ocarinaButtonsShuffleMm',
    'mm_button_down':          'ocarinaButtonsShuffleMm',
    'mm_button_left':          'ocarinaButtonsShuffleMm',
    'mm_button_right':         'ocarinaButtonsShuffleMm',
    'mm_button_up':            'ocarinaButtonsShuffleMm',
    'skulltula_platinum_mm':   'platinumTokenMm',
    'mm_skeleton_key':         'skeletonKeyMm',
    'mm_transcendent_fairy':   'transcendentFairy',
    'mm_clock1':               'clocks',
    'mm_clock2':               'clocks',
    'mm_clock3':               'clocks',
    'mm_clock4':               'clocks',
    'mm_clock5':               'clocks',
    'mm_clock6':               'clocks',
    'mm_owl_clock_town':       'owlShuffleEnabled',
    'mm_owl_southern_swamp':   'owlShuffleEnabled',
    'mm_owl_woodfall':         'owlShuffleEnabled',
    'mm_owl_milk_road':        'owlShuffleEnabled',
    'mm_owl_mountain_village': 'owlShuffleEnabled',
    'mm_owl_snowhead':         'owlShuffleEnabled',
    'mm_owl_great_bay':        'owlShuffleEnabled',
    'mm_owl_zora_cape':        'owlShuffleEnabled',
    'mm_owl_ikana_canyon':     'owlShuffleEnabled',
    'mm_owl_stone_tower':      'owlShuffleEnabled',
    'oot_bk_forest':           'bossKeyOotEnabled',
    'oot_bk_fire':             'bossKeyOotEnabled',
    'oot_bk_water':            'bossKeyOotEnabled',
    'oot_bk_shadow':           'bossKeyOotEnabled',
    'oot_bk_spirit':           'bossKeyOotEnabled',
    'oot_bk_ganon':            'ganonBossKeyEnabled',
    'mm_bk_wf':                'bossKeyMmEnabled',
    'mm_bk_sh':                'bossKeyMmEnabled',
    'mm_bk_gb':                'bossKeyMmEnabled',
    'mm_bk_st':                'bossKeyMmEnabled',
  };
  $: disabledItems = new Set(
    Object.entries(itemVisibilityMap)
      .filter(([, sk]) => $settingsStore.get(sk) === false)
      .map(([id]) => id)
  );

  function isHidden(cellId: string, game: 'oot' | 'mm' | 'shared'): boolean {
    if (disabledItems.has(cellId)) return true;
    if (game === 'oot')    return hiddenFromOot.has(cellId);
    if (game === 'mm')     return hiddenFromMm.has(cellId);
    return false;
  }

  function visRows(rows: (string | null)[][], game: 'oot' | 'mm' | 'shared'): (string | null)[][] {
    return rows.filter(row => row.some(cid => cid !== null && !!itemById[cid] && !isHidden(cid, game)));
  }
  function secVis(rows: (string | null)[][], game: 'oot' | 'mm' | 'shared'): boolean {
    return rows.some(row => row.some(cid => cid !== null && !!itemById[cid] && !isHidden(cid, game)));
  }

  function getIconSrc(item: TrackerItem, level: number): string {
    if (level > 0 && item.levelIcons?.[level - 1]) return `${IMG_BASE}${item.levelIcons[level - 1]}.png`;
    return `${IMG_BASE}${item.icon}.png`;
  }
  function getBadge(item: TrackerItem, level: number): string | null {
    if (item.maxLevel === 0 || level === 0) return null;
    if (item.maxLevel <= 1 && !item.showCount) return null;
    if (item.levelLabels) return item.levelLabels[level - 1] ?? null;
    if (item.showCount) return String(level);
    return null;
  }
  const isObt = (i: TrackerItem, l: number) => i.maxLevel === 0 || l > 0 || !!i.startUndimmed;

  // ==================== SECTIONS DATA ====================
  type Section = { title: string; rows: (string | null)[][] };

  const ootSects: Section[] = [
    { title: 'Items', rows: [
      ['sticks_oot','nuts_oot','bomb','bow','arrow_fire_oot','din'],
      ['slingshot','ocarina','bombchu','hookshot','arrow_ice_oot','farore'],
      ['boomerang','lens','bean','hammer','arrow_light_oot','nayru'],
      ['bottle_letter','bottle_1','bottle_2','bottle_3'],
      ['skulltula_token','agony','gerudo_card'],
    ]},
    { title: 'Equipment', rows: [
      ['sword_kokiri','sword_master','giant_knife','sword_biggoron'],
      ['deku_shield','hyrule_shield','shield_mirror'],
      ['tunic_goron','tunic_zora','boots_iron','boots_hover'],
      ['strength','scale','wallet','magic_oot'],
    ]},
    { title: 'Songs', rows: [
      ['oot_song_zelda','oot_song_epona','oot_song_saria','oot_song_sun','oot_song_time','oot_song_storms'],
      ['oot_song_minuet','oot_song_bolero','oot_song_serenade','oot_song_requiem','oot_song_nocturne','oot_song_prelude'],
    ]},
    { title: 'Item Ext.', rows: [
      ['mask_blast','mask_stone','oot_spin_upgrade'],
      ['oot_elegy','button_a','button_up','button_down','button_left','button_right'],
      ['key_skeleton','skulltula_platinum','oot_rupee_magical'],
    ]},
    { title: 'Side Quests', rows: [
      ['trade_c_cucco','trade_c_letter','mask_keaton_oot','trade_c_skull','trade_c_spooky','trade_c_bunny','trade_c_truth','mask_goron_oot','mask_zora_oot','mask_gerudo_oot'],
      ['trade_a_cucco','trade_a_cojiro','trade_a_mushroom','trade_a_potion','trade_a_saw','trade_a_broken','trade_a_rx','trade_a_frog','trade_a_drops','trade_a_claim'],
    ]},
    { title: 'Dungeons', rows: [
      ['stone_emerald','stone_ruby','stone_sapphire','medal_forest','medal_fire','medal_water','medal_shadow','medal_spirit','medal_light'],
      ['label_th','label_botw','label_gtg','label_forest','label_fire','label_water','label_shadow','label_spirit','label_gc'],
      ['th_sk','botw_sk','gtg_sk','forest_sk','fire_sk','water_sk','shadow_sk','spirit_sk','gc_sk'],
      [null,null,null,'oot_bk_forest','oot_bk_fire','oot_bk_water','oot_bk_shadow','oot_bk_spirit','oot_bk_ganon'],
    ]},
  ];

  const mmSects: Section[] = [
    { title: 'Items', rows: [
      ['mm_ocarina','mm_bow','mm_arrow_fire','mm_arrow_ice','mm_arrow_light','mm_clocktown_stray_fairy'],
      ['mm_bomb','mm_bombchu','mm_stick','mm_nuts','mm_bean','mm_skulltulla_woodfall'],
      ['mm_keg','mm_pictobox','mm_lens','mm_hookshot','mm_fairysword','mm_skulltulla_greatbay'],
      ['mm_dust','mm_bottle_1','mm_bottle_2','mm_bottle_3','mm_bottle_4','mm_bottle_5','mm_bomber'],
    ]},
    { title: 'Equipment', rows: [
      ['mm_sword','mm_spin_upgrade','mm_magic'],
      ['mm_shield','mm_mirror','mm_wallet'],
    ]},
    { title: 'Songs', rows: [
      ['mm_song_time','mm_song_healing','mm_song_epona','mm_song_soaring','mm_song_storms','mm_song_sun'],
      ['mm_song_sonata','mm_song_lullaby','mm_song_nova','mm_song_elegy','mm_song_oath'],
    ]},
    { title: 'Side Quests', rows: [
      ['mm_roomkey','mm_deed1','mm_deed2','mm_deed3','mm_deed4'],
      ['mm_pendant','mm_letter','mm_delivery','mm_tear'],
    ]},
    { title: 'Masks', rows: [
      ['mask_postman','mask_all_night','mask_blast','mask_stone','mask_great_fairy','mask_deku'],
      ['mask_keaton','mask_bremen','mask_bunny','mask_don_gero','mask_scents','mask_goron'],
      ['mask_romani','mask_circus_leader','mask_kafei','mask_couple','mask_truth_mm','mask_zora'],
      ['mask_kamaro','mask_gibdo','mask_garo','mask_captain_hat','mask_giant','mask_fierce_deity'],
    ]},
    { title: 'Dungeons', rows: [
      ['remains_odolwa','remains_goht','remains_gyorg','remains_twinmold'],
      ['mm_label_woodfall','mm_label_snowhead','mm_label_greatbay','mm_label_stonetower'],
      ['mm_sk_wf','mm_sk_sh','mm_sk_gb','mm_sk_st'],
      ['mm_bk_wf','mm_bk_sh','mm_bk_gb','mm_bk_st'],
      ['mm_woodfall_stray_fairy','mm_snowhead_stray_fairy','mm_greatbay_stray_fairy','mm_stonetower_stray_fairy'],
    ]},
    { title: 'OoT Ext.', rows: [
      ['mm_spell_fire','mm_spell_wind','mm_spell_love','mm_stone_of_agony'],
      ['mm_hammer','mm_strength','mm_scale','mm_shield_deku'],
      ['mm_boots_iron','mm_boots_hover','mm_tunic_goron','mm_tunic_zora'],
    ]},
    { title: 'Item Ext.', rows: [
      ['mm_button_a','mm_button_up','mm_button_down','mm_button_left','mm_button_right'],
      ['skulltula_platinum_mm','mm_skeleton_key','mm_transcendent_fairy'],
      ['mm_clock1','mm_clock2','mm_clock3','mm_clock4','mm_clock5','mm_clock6'],
      ['mm_owl_clock_town','mm_owl_southern_swamp','mm_owl_woodfall','mm_owl_milk_road','mm_owl_mountain_village'],
      ['mm_owl_snowhead','mm_owl_great_bay','mm_owl_zora_cape','mm_owl_ikana_canyon','mm_owl_stone_tower'],
    ]},
  ];

  type DungeonEntry = { abbrev: string; reward: string; sk: string; bk: string | null };

  const mmCompactDung: DungeonEntry[] = [
    { abbrev: 'WF', reward: 'remains_odolwa',   sk: 'mm_sk_wf', bk: 'mm_bk_wf' },
    { abbrev: 'SH', reward: 'remains_goht',     sk: 'mm_sk_sh', bk: 'mm_bk_sh' },
    { abbrev: 'GB', reward: 'remains_gyorg',    sk: 'mm_sk_gb', bk: 'mm_bk_gb' },
    { abbrev: 'ST', reward: 'remains_twinmold', sk: 'mm_sk_st', bk: 'mm_bk_st' },
  ];

  const ootDungAbbrevs: Record<string, string> = {
    'label_th':     'TH',
    'label_botw':   'BOTW',
    'label_gtg':    'GTG',
    'label_forest': 'FRST',
    'label_fire':   'FIRE',
    'label_water':  'WATR',
    'label_shadow': 'SHDW',
    'label_spirit': 'SPRT',
    'label_gc':     'GC',
  };

  // Combined EXT rows for merged section at bottom of MM
  const mmExtRows: (string | null)[][] = [...mmSects[6].rows, ...mmSects[7].rows];

  const iconSize = _p.get('size') ?? '18px';
  const keySize  = '13px';

  let rootEl: HTMLElement;
  let natW = 0, natH = 0;
  onMount(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    if (transparent) document.body.style.background = 'transparent';

    if (!debugMode || !rootEl) return;
    const ro = new ResizeObserver(() => { natW = rootEl.scrollWidth; natH = rootEl.scrollHeight; });
    ro.observe(rootEl);
    return () => ro.disconnect();
  });
</script>

<div
  class="ov-root"
  bind:this={rootEl}
  style="--icon-size:{iconSize}; --key-size:{keySize}; {transparent ? 'background:transparent;' : ''}"
>

  <!-- OOT | MM columns -->
  <div class="ov-games-row">

  {#if showOot}
  <div class="ov-col ov-col-oot">
    <div class="ov-game-lbl oot">OOT</div>

    <!-- Items + Equipment side by side -->
    <div class="ov-section ov-ie-row">
      <div class="ov-ie-items">
        <div class="ov-sec-title ov-sec-oot">Items</div>
        {#each visRows(ootSects[0].rows, 'oot') as irow}
        <div class="ov-irow">
          {#each irow as cid}
            {#if cid !== null && itemById[cid] && !isHidden(cid, 'oot')}
              {@const item = itemById[cid]}
              {@const lvl  = $itemStore.get(cid) ?? 0}
              <div class="ov-cell" class:obtained={isObt(item, lvl) || sharedObt(cid, 'oot')}>
                <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
                {#if getBadge(item, lvl)}<span class="ov-badge">{getBadge(item, lvl)}</span>{/if}
                {#if hasSyncDot(cid, 'oot')}<span class="ov-sync-dot"></span>{/if}
              </div>
            {/if}
          {/each}
        </div>
        {/each}
      </div>
      <div class="ov-ie-sep"></div>
      <div class="ov-ie-equip">
        <div class="ov-sec-title ov-sec-oot">Equip</div>
        {#each visRows(ootSects[1].rows, 'oot') as irow}
        <div class="ov-irow">
          {#each irow as cid}
            {#if cid !== null && itemById[cid] && !isHidden(cid, 'oot')}
              {@const item = itemById[cid]}
              {@const lvl  = $itemStore.get(cid) ?? 0}
              <div class="ov-cell" class:obtained={isObt(item, lvl) || sharedObt(cid, 'oot')}>
                <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
                {#if getBadge(item, lvl)}<span class="ov-badge">{getBadge(item, lvl)}</span>{/if}
                {#if hasSyncDot(cid, 'oot')}<span class="ov-sync-dot"></span>{/if}
              </div>
            {/if}
          {/each}
        </div>
        {/each}
      </div>
    </div>

    <!-- Songs -->
    {#if secVis(ootSects[2].rows, 'oot')}
    <div class="ov-section">
      <div class="ov-sec-title ov-sec-oot">Songs</div>
      {#each visRows(ootSects[2].rows, 'oot') as irow}
      <div class="ov-irow">
        {#each irow as cid}
          {#if cid !== null && itemById[cid] && !isHidden(cid, 'oot')}
            {@const item = itemById[cid]}
            {@const lvl  = $itemStore.get(cid) ?? 0}
            <div class="ov-cell" class:obtained={isObt(item, lvl) || sharedObt(cid, 'oot')}>
              <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
              {#if hasSyncDot(cid, 'oot')}<span class="ov-sync-dot"></span>{/if}
            </div>
          {/if}
        {/each}
      </div>
      {/each}
    </div>
    {/if}

    <!-- Item Extensions -->
    {#if secVis(ootSects[3].rows, 'oot')}
    <div class="ov-section">
      <div class="ov-sec-title ov-sec-oot">Ext</div>
      {#each visRows(ootSects[3].rows, 'oot') as irow}
      <div class="ov-irow">
        {#each irow as cid}
          {#if cid !== null && itemById[cid] && !isHidden(cid, 'oot')}
            {@const item = itemById[cid]}
            {@const lvl  = $itemStore.get(cid) ?? 0}
            <div class="ov-cell ov-sm" class:obtained={isObt(item, lvl) || sharedObt(cid, 'oot')}>
              <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
              {#if getBadge(item, lvl)}<span class="ov-badge">{getBadge(item, lvl)}</span>{/if}
              {#if hasSyncDot(cid, 'oot')}<span class="ov-sync-dot"></span>{/if}
            </div>
          {/if}
        {/each}
      </div>
      {/each}
    </div>
    {/if}

    <!-- Side Quests -->
    {#if secVis(ootSects[4].rows, 'oot')}
    <div class="ov-section">
      <div class="ov-sec-title ov-sec-oot">Quests</div>
      {#each visRows(ootSects[4].rows, 'oot') as irow}
      <div class="ov-irow">
        {#each irow as cid}
          {#if cid !== null && itemById[cid] && !isHidden(cid, 'oot')}
            {@const item = itemById[cid]}
            {@const lvl  = $itemStore.get(cid) ?? 0}
            <div class="ov-cell ov-sm" class:obtained={isObt(item, lvl) || sharedObt(cid, 'oot')}>
              <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
              {#if getBadge(item, lvl)}<span class="ov-badge">{getBadge(item, lvl)}</span>{/if}
              {#if hasSyncDot(cid, 'oot')}<span class="ov-sync-dot"></span>{/if}
            </div>
          {/if}
        {/each}
      </div>
      {/each}
    </div>
    {/if}

    <!-- Dungeons: reward row + SK row + optional BK row -->
    <div class="ov-section">
      <div class="ov-sec-title ov-sec-oot">Dungeons</div>
      <div class="ov-irow ov-irow-dung-rwd">
        {#each ootSects[5].rows[0] as cid}
          {#if cid !== null && itemById[cid] && !isHidden(cid, 'oot')}
            {@const item = itemById[cid]}
            {@const lvl  = $itemStore.get(cid) ?? 0}
            <div class="ov-cell" class:obtained={isObt(item, lvl)}>
              <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
            </div>
          {:else}
            <div class="ov-cell"></div>
          {/if}
        {/each}
      </div>
      <div class="ov-irow ov-irow-dung-rwd">
        {#each ootSects[5].rows[1] as cid}
          <div class="ov-dung-lbl">{ootDungAbbrevs[cid ?? ''] ?? ''}</div>
        {/each}
      </div>
      <div class="ov-irow ov-irow-dung-rwd">
        {#each ootSects[5].rows[2] as cid}
          {#if cid !== null && itemById[cid] && !isHidden(cid, 'oot')}
            {@const item = itemById[cid]}
            {@const lvl  = $itemStore.get(cid) ?? 0}
            <div class="ov-cell ov-key" class:obtained={isObt(item, lvl)}>
              <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
              {#if getBadge(item, lvl)}<span class="ov-badge">{getBadge(item, lvl)}</span>{/if}
            </div>
          {:else}
            <div class="ov-cell ov-key"></div>
          {/if}
        {/each}
      </div>
      {#if ootSects[5].rows[3].some(cid => cid !== null && itemById[cid] && !isHidden(cid, 'oot'))}
      <div class="ov-irow ov-irow-dung-rwd">
        {#each ootSects[5].rows[3] as cid}
          {#if cid !== null && itemById[cid] && !isHidden(cid, 'oot')}
            {@const item = itemById[cid]}
            {@const lvl  = $itemStore.get(cid) ?? 0}
            <div class="ov-cell ov-key" class:obtained={isObt(item, lvl)}>
              <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
            </div>
          {:else}
            <div class="ov-cell ov-key"></div>
          {/if}
        {/each}
      </div>
      {/if}
    </div>
  </div>
  {/if}

  {#if showOot && showMm}<div class="ov-col-sep"></div>{/if}

  {#if showMm}
  <div class="ov-col">
    <div class="ov-game-lbl mm">MM</div>

    <!-- Items + Equipment side by side -->
    <div class="ov-section ov-ie-row">
      <div class="ov-ie-items">
        <div class="ov-sec-title ov-sec-mm">Items</div>
        {#each visRows(mmSects[0].rows, 'mm') as irow}
        <div class="ov-irow">
          {#each irow as cid}
            {#if cid !== null && itemById[cid] && !isHidden(cid, 'mm')}
              {@const item = itemById[cid]}
              {@const lvl  = $itemStore.get(cid) ?? 0}
              <div class="ov-cell" class:obtained={isObt(item, lvl) || sharedObt(cid, 'mm')}>
                <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
                {#if getBadge(item, lvl)}<span class="ov-badge">{getBadge(item, lvl)}</span>{/if}
                {#if hasSyncDot(cid, 'mm')}<span class="ov-sync-dot"></span>{/if}
              </div>
            {/if}
          {/each}
        </div>
        {/each}
      </div>
      <div class="ov-ie-sep"></div>
      <div class="ov-ie-equip">
        <div class="ov-sec-title ov-sec-mm">Equip</div>
        {#each visRows(mmSects[1].rows, 'mm') as irow}
        <div class="ov-irow">
          {#each irow as cid}
            {#if cid !== null && itemById[cid] && !isHidden(cid, 'mm')}
              {@const item = itemById[cid]}
              {@const lvl  = $itemStore.get(cid) ?? 0}
              <div class="ov-cell" class:obtained={isObt(item, lvl) || sharedObt(cid, 'mm')}>
                <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
                {#if getBadge(item, lvl)}<span class="ov-badge">{getBadge(item, lvl)}</span>{/if}
                {#if hasSyncDot(cid, 'mm')}<span class="ov-sync-dot"></span>{/if}
              </div>
            {/if}
          {/each}
        </div>
        {/each}
      </div>
    </div>

    <!-- Songs -->
    {#if secVis(mmSects[2].rows, 'mm')}
    <div class="ov-section">
      <div class="ov-sec-title ov-sec-mm">Songs</div>
      {#each visRows(mmSects[2].rows, 'mm') as irow}
      <div class="ov-irow">
        {#each irow as cid}
          {#if cid !== null && itemById[cid] && !isHidden(cid, 'mm')}
            {@const item = itemById[cid]}
            {@const lvl  = $itemStore.get(cid) ?? 0}
            <div class="ov-cell" class:obtained={isObt(item, lvl) || sharedObt(cid, 'mm')}>
              <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
              {#if hasSyncDot(cid, 'mm')}<span class="ov-sync-dot"></span>{/if}
            </div>
          {/if}
        {/each}
      </div>
      {/each}
    </div>
    {/if}

    <!-- Side Quests -->
    {#if secVis(mmSects[3].rows, 'mm')}
    <div class="ov-section">
      <div class="ov-sec-title ov-sec-mm">Quests</div>
      {#each visRows(mmSects[3].rows, 'mm') as irow}
      <div class="ov-irow">
        {#each irow as cid}
          {#if cid !== null && itemById[cid] && !isHidden(cid, 'mm')}
            {@const item = itemById[cid]}
            {@const lvl  = $itemStore.get(cid) ?? 0}
            <div class="ov-cell ov-sm" class:obtained={isObt(item, lvl) || sharedObt(cid, 'mm')}>
              <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
              {#if getBadge(item, lvl)}<span class="ov-badge">{getBadge(item, lvl)}</span>{/if}
              {#if hasSyncDot(cid, 'mm')}<span class="ov-sync-dot"></span>{/if}
            </div>
          {/if}
        {/each}
      </div>
      {/each}
    </div>
    {/if}

    <!-- Masks -->
    {#if secVis(mmSects[4].rows, 'mm')}
    <div class="ov-section">
      <div class="ov-sec-title ov-sec-mm">Masks</div>
      {#each visRows(mmSects[4].rows, 'mm') as irow}
      <div class="ov-irow">
        {#each irow as cid}
          {#if cid !== null && itemById[cid] && !isHidden(cid, 'mm')}
            {@const item = itemById[cid]}
            {@const lvl  = $itemStore.get(cid) ?? 0}
            <div class="ov-cell ov-sm" class:obtained={isObt(item, lvl) || sharedObt(cid, 'mm')}>
              <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
              {#if getBadge(item, lvl)}<span class="ov-badge">{getBadge(item, lvl)}</span>{/if}
              {#if hasSyncDot(cid, 'mm')}<span class="ov-sync-dot"></span>{/if}
            </div>
          {/if}
        {/each}
      </div>
      {/each}
    </div>
    {/if}

    <!-- Dungeons: compact columns WF/SH/GB/ST -->
    <div class="ov-section">
      <div class="ov-sec-title ov-sec-mm">Dungeons</div>
      <div class="ov-dung-row">
        {#each mmCompactDung as dung}
        <div class="ov-dung-col">
          <div class="ov-dung-abbrev">{dung.abbrev}</div>
          {#if itemById[dung.reward]}
            {@const item = itemById[dung.reward]}
            {@const lvl  = $itemStore.get(dung.reward) ?? 0}
            <div class="ov-cell ov-sm" class:obtained={isObt(item, lvl)}>
              <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
            </div>
          {:else}
            <div class="ov-cell ov-sm"></div>
          {/if}
          {#if itemById[dung.sk] && !isHidden(dung.sk, 'mm')}
            {@const item = itemById[dung.sk]}
            {@const lvl  = $itemStore.get(dung.sk) ?? 0}
            <div class="ov-cell ov-key" class:obtained={isObt(item, lvl)}>
              <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
              {#if getBadge(item, lvl)}<span class="ov-badge">{getBadge(item, lvl)}</span>{/if}
            </div>
          {:else}
            <div class="ov-cell ov-key"></div>
          {/if}
          {#each [dung.bk] as bk}
            {#if bk && itemById[bk] && !isHidden(bk, 'mm')}
              {@const item = itemById[bk]}
              {@const lvl  = $itemStore.get(bk) ?? 0}
              <div class="ov-cell ov-key" class:obtained={isObt(item, lvl)}>
                <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
              </div>
            {:else}
              <div class="ov-cell ov-key"></div>
            {/if}
          {/each}
        </div>
        {/each}
      </div>
    </div>

    <!-- Merged EXT: OoT Ext + Item Ext on one dense block -->
    {#if secVis(mmExtRows, 'mm')}
    <div class="ov-section">
      <div class="ov-sec-title ov-sec-mm">Ext</div>
      <div class="ov-irow">
        {#each mmExtRows.flat() as cid}
          {#if cid !== null && itemById[cid] && !isHidden(cid, 'mm')}
            {@const item = itemById[cid]}
            {@const lvl  = $itemStore.get(cid) ?? 0}
            <div class="ov-cell ov-sm" class:obtained={isObt(item, lvl) || sharedObt(cid, 'mm')}>
              <img src={getIconSrc(item, lvl)} alt="" class="ov-icon" draggable="false" />
              {#if getBadge(item, lvl)}<span class="ov-badge">{getBadge(item, lvl)}</span>{/if}
              {#if hasSyncDot(cid, 'mm')}<span class="ov-sync-dot"></span>{/if}
            </div>
          {/if}
        {/each}
      </div>
    </div>
    {/if}

  </div>
  {/if}

  </div><!-- /ov-games-row -->

  {#if debugMode && natW > 0}
  <div class="ov-debug">{natW} × {natH} px</div>
  {/if}
</div>

<style>
  .ov-root {
    width: 384px;
    display: flex;
    flex-direction: column;
    background: #0a0a0a;
    box-sizing: border-box;
    font-family: system-ui, 'Segoe UI', sans-serif;
    font-size: 11px;
    position: relative;
  }

  /* Columns */
  .ov-games-row {
    display: flex;
    flex-direction: row;
    align-items: stretch;
  }
  .ov-col {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    padding: 6px;
    background: #0d0d0d;
  }
  .ov-col-oot {
    gap: 5px;
  }
  .ov-col-oot .ov-section {
    padding: 6px 4px;
  }
  .ov-col-sep {
    width: 1px;
    background: rgba(255,255,255,0.1);
    flex-shrink: 0;
  }

  /* Game headers */
  .ov-game-lbl {
    font-size: 8px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    line-height: 1;
    padding-bottom: 2px;
  }
  .ov-game-lbl.oot { color: #4aff88; }
  .ov-game-lbl.mm  { color: #c060ff; }

  /* Sections */
  .ov-section {
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 4px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ov-section.ov-ie-row {
    flex-direction: row;
    align-items: flex-start;
    padding: 0;
    gap: 0;
    width: 100%;
  }
  .ov-sec-title {
    font-size: 7px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    line-height: 1;
    margin-bottom: 1px;
  }
  .ov-sec-oot { color: rgba(74,255,136,0.5); }
  .ov-sec-mm  { color: rgba(192,96,255,0.5); }

  /* Items + Equipment split */
  .ov-ie-items {
    flex: 3 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
  }
  .ov-ie-equip {
    flex: 2 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
  }
  .ov-ie-sep {
    width: 1px;
    background: rgba(255,255,255,0.08);
    align-self: stretch;
    flex-shrink: 0;
  }

  /* Icon rows */
  .ov-irow {
    display: flex;
    flex-direction: row;
    gap: 2px;
    flex-wrap: wrap;
  }

  /* Cells */
  .ov-cell {
    position: relative;
    width: var(--icon-size, 22px);
    height: var(--icon-size, 22px);
    flex-shrink: 0;
  }
  .ov-cell.ov-sm {
    width: 20px;
    height: 20px;
  }
  .ov-cell.ov-key {
    width: var(--key-size, 16px);
    height: var(--key-size, 16px);
  }

  /* Icon states */
  .ov-icon {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    opacity: 0.2;
    filter: grayscale(100%);
    transition: opacity 150ms ease, filter 150ms ease;
  }
  .ov-cell.obtained .ov-icon {
    opacity: 1;
    filter: drop-shadow(0 0 3px rgba(255,255,255,0.18));
  }

  .ov-badge {
    position: absolute;
    bottom: -1px;
    right: -1px;
    background: rgba(0,0,0,0.85);
    color: #fff;
    font-size: 0.5em;
    padding: 0 1px;
    border-radius: 2px;
    line-height: 1.2;
    pointer-events: none;
  }

  /* Sync dot — golden indicator for shared items */
  .ov-sync-dot {
    position: absolute;
    bottom: 1px;
    right: 1px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #f0c040;
    pointer-events: none;
    z-index: 2;
  }

  /* MM compact dungeon columns */
  .ov-dung-row {
    display: flex;
    flex-direction: row;
    gap: 4px;
    align-items: flex-start;
  }
  .ov-dung-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }
  .ov-dung-abbrev {
    font-size: 8px;
    color: rgba(255,255,255,0.38);
    text-align: center;
    letter-spacing: -0.02em;
    white-space: nowrap;
    line-height: 1;
  }

  .ov-irow-dung-rwd {
    flex-wrap: nowrap;
    gap: 1px;
  }
  .ov-irow-dung-rwd .ov-cell {
    width: 17px;
    height: 17px;
  }
  .ov-dung-lbl {
    width: 17px;
    flex-shrink: 0;
    font-size: 6px;
    color: rgba(255,255,255,0.55);
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    white-space: nowrap;
    overflow: visible;
    letter-spacing: -0.03em;
  }

  .ov-debug {
    position: fixed;
    bottom: 4px;
    right: 4px;
    background: rgba(0,0,0,0.7);
    color: #0f0;
    font-size: 0.7em;
    font-family: monospace;
    padding: 2px 6px;
    border-radius: 3px;
    pointer-events: none;
  }
</style>
