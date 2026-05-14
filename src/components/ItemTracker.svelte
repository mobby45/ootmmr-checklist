<script lang="ts">
  import {
    allTrackerItems, itemById,
    ootItems, mmItems, sharedItems,
    type TrackerItem
  } from '../data/itemData';
  import { sharedToOot, sharedToMm, ootToShared, mmToShared, directSyncOotToMm, directSyncMmToOot } from '../data/sharedSync';
  import type { Map as YMap } from 'yjs';
  import { readable } from 'svelte/store';

  export let yItems: YMap<number>;
  export let ySettings: YMap<any>;
  export let roomName: string | null = null;
  export let isWatchMode = false;

  let itGameMode: 'both' | 'oot' | 'mm' | 'none' = JSON.parse(localStorage.getItem('it_gameMode') || '"both"');
  $: localStorage.setItem('it_gameMode', JSON.stringify(itGameMode));

  let activeTab: 'items' | 'settings' = 'items';
  let overlayStacked: boolean = JSON.parse(localStorage.getItem('overlayStacked') ?? 'false');
  $: localStorage.setItem('overlayStacked', JSON.stringify(overlayStacked));

  const IMG_BASE = '/ootmmr-checklist/images/';
  let lastCounterTime = 0;

  // ==========================================
  // STORES
  // ==========================================
  const itemStore = readable(new Map<string, number>(), set => {
    const update = () => set(new Map(yItems.entries()));
    update(); yItems.observe(update);
    return () => yItems.unobserve(update);
  });

  const settingsStore = readable(new Map<string, any>(), set => {
    const update = () => set(new Map(ySettings.entries()));
    update(); ySettings.observe(update);
    return () => ySettings.unobserve(update);
  });

  // ==========================================
  // SHARED FILTERING
  // ==========================================
  $: activeSharedIds = new Set(
    sharedItems.filter(i => !i.settingKey || $settingsStore.get(i.settingKey) === true).map(i => i.id)
  );

  // Items always shown in their game columns — no shared-based hiding
  $: hiddenFromOot = new Set<string>();
  $: hiddenFromMm  = new Set<string>();

  const ootItemIdSet = new Set(ootItems.map(i => i.id));
  const mmItemIdSet  = new Set(mmItems.map(i => i.id));

  // When clicking a shared item, sync its counterpart in the other game
  function syncCounterpart(itemId: string, next: number) {
    // sh_* based sync
    const game = ootItemIdSet.has(itemId) ? 'oot' : mmItemIdSet.has(itemId) ? 'mm' : null;
    if (game) {
      const shKey = game === 'oot' ? ootToShared[itemId] : mmToShared[itemId];
      if (shKey && activeSharedIds.has(shKey)) {
        const counterpartIds = game === 'oot' ? (sharedToMm[shKey] ?? []) : (sharedToOot[shKey] ?? []);
        for (const cid of counterpartIds) {
          const cItem = effectiveItemById[cid];
          if (!cItem || cItem.maxLevel === 0) continue;
          if (next === 0) yItems.delete(cid);
          else yItems.set(cid, Math.min(next, cItem.maxLevel));
        }
      }
    }
    // Direct OoT→MM sync (souls, ocarina buttons)
    const ootPair = directSyncOotToMm[itemId];
    if (ootPair && $settingsStore.get(ootPair.sk) === true) {
      const cItem = itemById[ootPair.mmId];
      if (cItem) {
        if (next === 0) yItems.delete(ootPair.mmId);
        else yItems.set(ootPair.mmId, Math.min(next, cItem.maxLevel));
      }
    }
    const mmPair = directSyncMmToOot[itemId];
    if (mmPair && $settingsStore.get(mmPair.sk) === true) {
      const cItem = itemById[mmPair.ootId];
      if (cItem) {
        if (next === 0) yItems.delete(mmPair.ootId);
        else yItems.set(mmPair.ootId, Math.min(next, cItem.maxLevel));
      }
    }
  }

  // Item visibility from spoiler settings (value === false → hide)
  const itemVisibilityMap: Record<string, string> = {
    // OoT Item Extensions (skip mask_blast/mask_stone: shared IDs with MM Masks)
    'coin_red':               'coinsOot',
    'coin_green':             'coinsOot',
    'coin_blue':              'coinsOot',
    'coin_yellow':            'coinsOot',
    'oot_elegy':              'elegyOot',
    'button_a':               'ocarinaButtonsShuffleOot',
    'button_up':              'ocarinaButtonsShuffleOot',
    'button_down':            'ocarinaButtonsShuffleOot',
    'button_left':            'ocarinaButtonsShuffleOot',
    'button_right':           'ocarinaButtonsShuffleOot',
    'oot_spin_upgrade':       'spinUpgradeOot',
    'key_skeleton':           'skeletonKeyOot',
    'skulltula_platinum':     'platinumTokenOot',
    'oot_rupee_magical':      'magicalRupee',
    // MM OoT Extensions
    'mm_spell_fire':          'spellFireMm',
    'mm_spell_wind':          'spellWindMm',
    'mm_spell_love':          'spellLoveMm',
    'mm_stone_of_agony':      'stoneAgonyMm',
    'mm_hammer':              'hammerMm',
    'mm_strength':            'strengthMm',
    'mm_scale':               'scalesMm',
    'mm_shield_deku':         'dekuShieldMm',
    'mm_boots_iron':          'bootsIronMm',
    'mm_boots_hover':         'bootsHoverMm',
    'mm_tunic_goron':         'tunicGoronMm',
    'mm_tunic_zora':          'tunicZoraMm',
    // MM Item Extensions
    'mm_button_a':            'ocarinaButtonsShuffleMm',
    'mm_button_down':         'ocarinaButtonsShuffleMm',
    'mm_button_left':         'ocarinaButtonsShuffleMm',
    'mm_button_right':        'ocarinaButtonsShuffleMm',
    'mm_button_up':           'ocarinaButtonsShuffleMm',
    'skulltula_platinum_mm':  'platinumTokenMm',
    'mm_skeleton_key':        'skeletonKeyMm',
    'mm_transcendent_fairy':  'transcendentFairy',
    'mm_clock1':              'clocks',
    'mm_clock2':              'clocks',
    'mm_clock3':              'clocks',
    'mm_clock4':              'clocks',
    'mm_clock5':              'clocks',
    'mm_clock6':              'clocks',
    'mm_owl_clock_town':      'owlShuffleEnabled',
    'mm_owl_southern_swamp':  'owlShuffleEnabled',
    'mm_owl_woodfall':        'owlShuffleEnabled',
    'mm_owl_milk_road':       'owlShuffleEnabled',
    'mm_owl_mountain_village':'owlShuffleEnabled',
    'mm_owl_snowhead':        'owlShuffleEnabled',
    'mm_owl_great_bay':       'owlShuffleEnabled',
    'mm_owl_zora_cape':       'owlShuffleEnabled',
    'mm_owl_ikana_canyon':    'owlShuffleEnabled',
    'mm_owl_stone_tower':     'owlShuffleEnabled',
    // OoT Boss Keys
    'oot_bk_forest':          'bossKeyOotEnabled',
    'oot_bk_fire':            'bossKeyOotEnabled',
    'oot_bk_water':           'bossKeyOotEnabled',
    'oot_bk_shadow':          'bossKeyOotEnabled',
    'oot_bk_spirit':          'bossKeyOotEnabled',
    'oot_bk_ganon':           'ganonBossKeyEnabled',
    // MM Boss Keys
    'mm_bk_wf':               'bossKeyMmEnabled',
    'mm_bk_sh':               'bossKeyMmEnabled',
    'mm_bk_gb':               'bossKeyMmEnabled',
    'mm_bk_st':               'bossKeyMmEnabled',
  };

  $: disabledItems = new Set(
    Object.entries(itemVisibilityMap)
      .filter(([, sk]) => $settingsStore.get(sk) === false)
      .map(([id]) => id)
  );

  // Dynamic item overrides based on settings (short hookshot, fairy ocarina, lullaby, GFS)
  $: effectiveItemById = (() => {
    const shortHookshot = $settingsStore.get('shortHookshotMm')        !== false;
    const fairyOcarina  = $settingsStore.get('fairyOcarinaMm')          !== false;
    const progLullaby   = $settingsStore.get('progressiveGoronLullaby')  === 'progressive';
    const progGFS       = $settingsStore.get('progressiveGFS')           === 'progressive';
    if (!shortHookshot && !fairyOcarina && progLullaby && !progGFS) return itemById;
    const map: typeof itemById = { ...itemById };
    if (shortHookshot)
      map['mm_hookshot']     = { ...itemById['mm_hookshot'],     icon: 'hookshot',     maxLevel: 2, levelIcons: ['hookshot', 'mm_hookshot'] };
    if (fairyOcarina)
      map['mm_ocarina']      = { ...itemById['mm_ocarina'],      icon: 'fairyocarina', maxLevel: 2, levelIcons: ['fairyocarina', 'mm_ocarina'] };
    if (!progLullaby)
      map['mm_song_lullaby'] = { ...itemById['mm_song_lullaby'], maxLevel: 1, levelIcons: ['mm_lullaby'] };
    if (progGFS)
      map['mm_sword']        = { ...itemById['mm_sword'],        maxLevel: 4, levelIcons: ['mm_kokiri', 'mm_razor', 'mm_gilded', 'mm_fairysword'] };
    return map;
  })();

  // ==========================================
  // SECTIONS LAYOUT
  // Chaque section : { title, rows: string[][] }
  // ==========================================

  // OoT
  $: ootSections = [
    {
      title: 'Items',
      rows: [
        ['sticks_oot','nuts_oot','bomb','bow','arrow_fire_oot','din'],
        ['slingshot','ocarina','bombchu','hookshot','arrow_ice_oot','farore'],
        ['boomerang','lens','bean','hammer','arrow_light_oot','nayru'],
        ['bottle_letter','bottle_1','bottle_2','bottle_3'],
        ['skulltula_token','agony','gerudo_card'],
      ]
    },
    {
      title: 'Equipment',
      rows: [
        $settingsStore.get('progressiveSwordsOot') === 'progressive'
          ? ['oot_sword_progressive']
          : $settingsStore.get('progressiveSwordsOot') === 'progressiveknifebiggoron'
          ? ['sword_kokiri','sword_master','oot_sword_progressive_giantbiggoron']
          : ['sword_kokiri','sword_master','giant_knife','sword_biggoron'],
        $settingsStore.get('progressiveShieldsOot') === 'progressive'
          ? ['oot_shield_progressive']
          : ['deku_shield','hyrule_shield','shield_mirror'],
        ['tunic_goron','tunic_zora','boots_iron','boots_hover'],
        ['strength','scale','wallet','magic_oot'],
      ]
    },
    {
      title: 'Songs',
      rows: [
        ['oot_song_zelda','oot_song_epona','oot_song_saria','oot_song_sun','oot_song_time','oot_song_storms'],
        ['oot_song_minuet','oot_song_bolero','oot_song_serenade','oot_song_requiem','oot_song_nocturne','oot_song_prelude'],
      ]
    },
    {
      title: 'Item Extensions',
      rows: [
        ['mask_blast','mask_stone','oot_spin_upgrade'],
        ['oot_elegy','button_a','button_up','button_down','button_left','button_right'],
        ['key_skeleton','skulltula_platinum','oot_rupee_magical'],
        ['coin_red','coin_green','coin_blue','coin_yellow'],
        ['sh_triforce','sh_triforce_courage','sh_triforce_power','sh_triforce_wisdom'],
      ]
    },
    {
      title: 'Side Quests',
      rows: [
        ['trade_c_cucco','trade_c_letter','mask_keaton_oot','trade_c_skull','trade_c_spooky','trade_c_bunny','trade_c_truth','mask_goron_oot','mask_zora_oot','mask_gerudo_oot'],
        ['trade_a_cucco','trade_a_cojiro','trade_a_mushroom','trade_a_potion','trade_a_saw','trade_a_broken','trade_a_rx','trade_a_frog','trade_a_drops','trade_a_claim'],
      ]
    },
    {
      title: 'Dungeons',
      rows: [
        ['stone_emerald','stone_ruby','stone_sapphire','medal_forest','medal_fire','medal_water','medal_shadow','medal_spirit','medal_light'],
        ['label_th','label_botw','label_gtg','label_forest','label_fire','label_water','label_shadow','label_spirit','label_gc'],
        ['th_sk','botw_sk','gtg_sk','forest_sk','fire_sk','water_sk','shadow_sk','spirit_sk','gc_sk'],
        [null,null,null,'oot_bk_forest','oot_bk_fire','oot_bk_water','oot_bk_shadow','oot_bk_spirit','oot_bk_ganon'],
      ]
    },
  ];

  // MM
  $: mmSections = [
    {
      title: 'Items',
      rows: [
        ['mm_ocarina','mm_bow','mm_arrow_fire','mm_arrow_ice','mm_arrow_light','mm_clocktown_stray_fairy'],
        ['mm_bomb','mm_bombchu','mm_stick','mm_nuts','mm_bean','mm_skulltulla_woodfall'],
        $settingsStore.get('progressiveGFS') === 'progressive'
          ? ['mm_keg','mm_pictobox','mm_lens','mm_hookshot','mm_skulltulla_greatbay']
          : ['mm_keg','mm_pictobox','mm_lens','mm_hookshot','mm_fairysword','mm_skulltulla_greatbay'],
        ['mm_dust','mm_bottle_1','mm_bottle_2','mm_bottle_3','mm_bottle_4','mm_bottle_5','mm_bomber'],
      ]
    },
    {
      title: 'Equipment',
      rows: [
        ['mm_sword','mm_spin_upgrade','mm_magic'],
        $settingsStore.get('progressiveShieldsMm') === 'progressive'
          ? ['mm_shield_progressive','mm_wallet']
          : ['mm_shield','mm_mirror','mm_wallet'],
      ]
    },
    {
      title: 'Songs',
      rows: [
        ['mm_song_time','mm_song_healing','mm_song_epona','mm_song_soaring','mm_song_storms','mm_song_sun'],
        ['mm_song_sonata','mm_song_lullaby','mm_song_nova','mm_song_elegy','mm_song_oath'],
      ]
    },
    {
      title: 'Side Quests',
      rows: [
        ['mm_roomkey','mm_deed1','mm_deed2','mm_deed3','mm_deed4'],
        ['mm_pendant','mm_letter','mm_delivery','mm_tear'],
      ]
    },
    {
      title: 'Masks',
      rows: [
        ['mask_postman','mask_all_night','mask_blast','mask_stone','mask_great_fairy','mask_deku'],
        ['mask_keaton','mask_bremen','mask_bunny','mask_don_gero','mask_scents','mask_goron'],
        ['mask_romani','mask_circus_leader','mask_kafei','mask_couple','mask_truth_mm','mask_zora'],
        ['mask_kamaro','mask_gibdo','mask_garo','mask_captain_hat','mask_giant','mask_fierce_deity','mask_spooky_mm'],
      ]
    },
    {
      title: 'Dungeons',
      rows: [
        ['remains_odolwa','remains_goht','remains_gyorg','remains_twinmold'],
        ['mm_label_woodfall','mm_label_snowhead','mm_label_greatbay','mm_label_stonetower'],
        ['mm_sk_wf','mm_sk_sh','mm_sk_gb','mm_sk_st'],
        ['mm_bk_wf','mm_bk_sh','mm_bk_gb','mm_bk_st'],
        ['mm_woodfall_stray_fairy','mm_snowhead_stray_fairy','mm_greatbay_stray_fairy','mm_stonetower_stray_fairy'],
      ]
    },
    {
      title: 'OOT Extensions',
      rows: [
        ['mm_spell_fire','mm_spell_wind','mm_spell_love','mm_stone_of_agony'],
        ['mm_hammer','mm_strength','mm_scale','mm_shield_deku'],
        ['mm_boots_iron','mm_boots_hover','mm_tunic_goron','mm_tunic_zora'],
      ]
    },
    {
      title: 'Item Extensions',
      rows: [
        ['mm_button_a','mm_button_up','mm_button_down','mm_button_left','mm_button_right'],
        ['skulltula_platinum_mm','mm_skeleton_key','mm_transcendent_fairy'],
        ['mm_clock1','mm_clock2','mm_clock3','mm_clock4','mm_clock5','mm_clock6'],
        ['mm_owl_clock_town','mm_owl_southern_swamp','mm_owl_woodfall','mm_owl_milk_road','mm_owl_mountain_village'],
        ['mm_owl_snowhead','mm_owl_great_bay','mm_owl_zora_cape','mm_owl_ikana_canyon','mm_owl_stone_tower'],
        ['coin_red','coin_green','coin_blue','coin_yellow'],
        ['sh_triforce','sh_triforce_courage','sh_triforce_power','sh_triforce_wisdom'],
      ]
    },
  ];


  type VItem =
    | { header: string; key?: never; name?: never; options?: never }
    | { header?: never; key: string; name: string; options?: Array<{ value: string; label: string }> };

  // ==========================================
  // SETTINGS DATA (flat arrays for sub-tabs)
  // ==========================================
  let activeSettingsTab: 'shared' | 'oot' | 'mm' = 'shared';

  const ootVisibility: VItem[] = [
    { header: 'Item Extensions' },
    { key: 'elegyOot',                name: 'Elegy of Emptiness' },
    { key: 'ocarinaButtonsShuffleOot', name: 'Ocarina Buttons' },
    { key: 'spinUpgradeOot',          name: 'Spin Upgrade' },
    { key: 'skeletonKeyOot',          name: 'Skeleton Key' },
    { key: 'platinumTokenOot',        name: 'Platinum Token' },
    { key: 'magicalRupee',            name: 'Magical Rupee' },
    { key: 'coinsOot',                name: 'Coins' },
    { header: 'Souls' },
    { key: 'bossSoulsOot',  name: 'Boss Souls' },
    { key: 'enemySoulsOot', name: 'Enemy Souls' },
    { key: 'npcSoulsOot',   name: 'NPC Souls' },
    { key: 'animalSoulsOot', name: 'Animal Souls' },
    { key: 'miscSoulsOot',   name: 'Misc. Souls' },
    { header: 'Progressive Items' },
    { key: 'progressiveSwordsOot',  name: 'Swords',  options: [{ value: 'separate', label: 'Separate' }, { value: 'progressiveknifebiggoron', label: 'Progressive Knife+Biggoron' }, { value: 'progressive', label: 'Progressive' }] },
    { key: 'progressiveShieldsOot', name: 'Shields', options: [{ value: 'separate', label: 'Separate' }, { value: 'progressive', label: 'Progressive' }] },
    { header: 'Bombchu' },
    { key: 'bombchuBehaviorOot', name: 'Behavior', options: [
      { value: 'vanilla',     label: 'Vanilla (OoT)' },
      { value: 'bagFirst',    label: 'Bag (First Pack)' },
      { value: 'bagSeparate', label: 'Bag (Separate Items)' },
    ]},
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
    { header: 'Item Extensions' },
    { key: 'ocarinaButtonsShuffleMm', name: 'Ocarina Buttons' },
    { key: 'platinumTokenMm',         name: 'Platinum Token' },
    { key: 'skeletonKeyMm',           name: 'Skeleton Key' },
    { key: 'transcendentFairy',       name: 'Transcendent Fairy' },
    { key: 'clocks',                  name: 'Clock Items' },
    { key: 'owlShuffleEnabled',       name: 'Owl Statues' },
    { key: 'shortHookshotMm',         name: 'Short Hookshot' },
    { key: 'fairyOcarinaMm',          name: 'Fairy Ocarina' },
    { header: 'Souls' },
    { key: 'bossSoulsMm',  name: 'Boss Souls' },
    { key: 'enemySoulsMm', name: 'Enemy Souls' },
    { key: 'npcSoulsMm',   name: 'NPC Souls' },
    { key: 'animalSoulsMm', name: 'Animal Souls' },
    { key: 'miscSoulsMm',   name: 'Misc. Souls' },
    { header: 'Progressive Items' },
    { key: 'progressiveShieldsMm',   name: 'Shields',       options: [{ value: 'separate', label: 'Separate' }, { value: 'progressive', label: 'Progressive' }] },
    { key: 'progressiveGFS',         name: 'Great Fairy Sword', options: [{ value: 'separate', label: 'Separate' }, { value: 'progressive', label: 'Progressive' }] },
    { key: 'progressiveGoronLullaby',name: 'Goron Lullaby', options: [{ value: 'single', label: 'Full Only' }, { value: 'progressive', label: 'Progressive' }] },
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
    { key: 'sharedStoneOfAgony',    name: 'Stone of Agony' },
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
    { header: 'Songs' },
    { key: 'sharedSongEpona',  name: "Epona's Song" },
    { key: 'sharedSongStorms', name: 'Song of Storms' },
    { key: 'sharedSongTime',   name: 'Song of Time' },
    { key: 'sharedSongSun',    name: "Sun's Song" },
    { key: 'sharedSongElegy',  name: 'Elegy of Emptiness' },
    { header: 'Bottles' },
    { key: 'sharedHealth',         name: 'Bottle' },
    { key: 'sharedBottleRuto',     name: "Ruto's Letter" },
    { key: 'sharedBottleGoldDust', name: 'Gold Dust Bottle' },
    { header: 'Triforce' },
    { key: 'sharedTriforce',        name: 'Triforce' },
    { key: 'sharedTriforceCourage', name: 'Triforce of Courage' },
    { key: 'sharedTriforcePower',   name: 'Triforce of Power' },
    { key: 'sharedTriforceWisdom',  name: 'Triforce of Wisdom' },
    { header: 'Souls' },
    { key: 'sharedEnemySouls',  name: 'Enemy Souls' },
    { key: 'sharedNpcSouls',    name: 'NPC Souls' },
    { key: 'sharedMiscSouls',   name: 'Misc. Souls' },
    { key: 'sharedAnimalSouls', name: 'Animal Souls' },
    { header: 'Ocarina' },
    { key: 'sharedOcarinaButtons', name: 'Ocarina Buttons' },
  ];

  function toggleSetting(key: string, checked: boolean) {
    if (isWatchMode) return;
    if (checked) ySettings.set(key, true);
    else ySettings.delete(key);
  }

  function toggleVisibility(key: string, checked: boolean) {
    if (isWatchMode) return;
    if (!checked) ySettings.set(key, false);
    else ySettings.delete(key);
  }

  function setStringSetting(key: string, value: string) {
    if (isWatchMode) return;
    ySettings.set(key, value);
  }

  // ==========================================
  // SOULS
  // ==========================================
  const soulCats = new Set(['souls_boss', 'souls_enemy', 'souls_npc']);
  const ootSouls = ootItems.filter(i => soulCats.has(i.category));
  const mmSouls  = mmItems.filter(i => soulCats.has(i.category));

  $: ootSoulsVisible = ootSouls.filter(i => {
    if (i.category === 'souls_boss')  return $settingsStore.get('bossSoulsOot')  !== false;
    if (i.category === 'souls_enemy') return $settingsStore.get('enemySoulsOot') !== false;
    if (i.category === 'souls_npc')   return $settingsStore.get('npcSoulsOot')   !== false;
    return true;
  });
  $: mmSoulsVisible = mmSouls.filter(i => {
    if (i.category === 'souls_boss')  return $settingsStore.get('bossSoulsMm')  !== false;
    if (i.category === 'souls_enemy') return $settingsStore.get('enemySoulsMm') !== false;
    if (i.category === 'souls_npc')   return $settingsStore.get('npcSoulsMm')   !== false;
    return true;
  });

  // ==========================================
  // ITEM INTERACTION
  // ==========================================
  function handleClick(e: MouseEvent, item: TrackerItem) {
    if (isWatchMode || item.maxLevel === 0) return;
    if (e.shiftKey && item.showCount) {
      const now = Date.now();
      if (now - lastCounterTime < 300) return;
      lastCounterTime = now;
      const cur = $itemStore.get(item.id) ?? 0;
      const input = window.prompt(`${item.name} (0–${item.maxLevel}):`, String(cur));
      lastCounterTime = Date.now();
      if (input === null) return;
      const val = parseInt(input);
      if (isNaN(val) || val < 0) return;
      const next = val === 0 ? 0 : Math.min(val, item.maxLevel);
      if (next === 0) yItems.delete(item.id);
      else yItems.set(item.id, next);
      syncCounterpart(item.id, next);
      return;
    }
    const cur = $itemStore.get(item.id) ?? 0;
    const next = Math.min(cur + 1, item.maxLevel);
    if (next === 0) yItems.delete(item.id);
    else yItems.set(item.id, next);
    syncCounterpart(item.id, next);
  }

  function handleRightClick(e: MouseEvent, item: TrackerItem) {
    e.preventDefault();
    if (isWatchMode || item.maxLevel === 0) return;
    const cur = $itemStore.get(item.id) ?? 0;
    const prev = Math.max(0, cur - 1);
    if (prev === 0) yItems.delete(item.id);
    else yItems.set(item.id, prev);
    syncCounterpart(item.id, prev);
  }

  // ==========================================
  // ICON / BADGE
  // ==========================================
  function getIconSrc(item: TrackerItem, level: number): string {
    if (level > 0 && item.levelIcons?.[level - 1])
      return `${IMG_BASE}${item.levelIcons[level - 1]}.png`;
    return `${IMG_BASE}${item.icon}.png`;
  }

  function getBadge(item: TrackerItem, level: number): string | null {
    if (item.maxLevel === 0) return null;
    if (level === 0 && !item.showCount) return item.startLabel ?? null;
    if (item.maxLevel <= 1 && !item.showCount) return null;
    if (item.levelLabels?.length) return item.levelLabels[level - 1] ?? null;
    if (item.showCount) return String(level);
    return null;
  }

  function isMaxed(item: TrackerItem, level: number) { return item.maxLevel > 0 && level === item.maxLevel; }
  function isObtained(item: TrackerItem, level: number) { return item.maxLevel === 0 || level > 0 || !!item.startUndimmed; }
  function isGreyed(item: TrackerItem, level: number) { return item.maxLevel !== 0 && level === 0 && !item.startUndimmed; }

  // ==========================================
  // COUNTS
  // ==========================================
  $: ootObtained = ootItems.filter(i => i.maxLevel !== 0 && ($itemStore.get(i.id) ?? 0) > 0).length;
  $: ootTotal    = ootItems.filter(i => i.maxLevel !== 0).length;
  $: mmObtained  = mmItems.filter(i => i.maxLevel !== 0 && ($itemStore.get(i.id) ?? 0) > 0).length;
  $: mmTotal     = mmItems.filter(i => i.maxLevel !== 0).length;

  function clearAll() {
    if (isWatchMode) return;
    if (!confirm('Clear all tracked items?')) return;
    Array.from(yItems.keys()).forEach(k => yItems.delete(k));
  }


  function soulShortName(name: string) { return name.replace(/^Soul:\s*/, ''); }

  // helper pour rendre une cellule
  function isHidden(cellId: string, game: 'oot' | 'mm' | 'shared'): boolean {
    if (disabledItems.has(cellId)) return true;
    if (game === 'oot') return hiddenFromOot.has(cellId);
    if (game === 'mm') return hiddenFromMm.has(cellId);
    return !activeSharedIds.has(cellId);
  }

  function sectionHasItems(rows: (string | null)[][], game: 'oot' | 'mm' | 'shared'): boolean {
    return rows.some(row => row.some(cellId => cellId !== null && !!itemById[cellId] && !isHidden(cellId, game)));
  }

  function visibleRows(rows: (string | null)[][], game: 'oot' | 'mm' | 'shared'): (string | null)[][] {
    return rows.filter(row => row.some(cellId => cellId !== null && !!itemById[cellId] && !isHidden(cellId, game)));
  }

  // ==========================================
  // OBS PANEL
  // ==========================================
  let showObsPanel = false;
  let obsGame: 'oot' | 'mm' | 'both' = 'both';
  let obsOpacity = 0.85;
  let obsTransparent = false;
  let obsDebug = false;
  let obsW = 384;
  let obsH = 900;
  let obsCopied = false;

  const obsDims: Record<'oot' | 'mm' | 'both', { w: number; h: number }> = {
    both: { w: 384, h: 900 },
    oot:  { w: 200, h: 900 },
    mm:   { w: 200, h: 900 },
  };
  $: { const d = obsDims[obsGame]; obsW = d.w; obsH = d.h; }

  function buildOverlayUrl(): string {
    const base = `${window.location.origin}${window.location.pathname}`;
    const p = new URLSearchParams({ overlay: 'true' });
    if (obsGame !== 'both') p.set('game', obsGame);
    if (roomName) p.set('room', roomName);
    if (!obsTransparent && Math.abs(obsOpacity - 0.85) > 0.01) p.set('opacity', obsOpacity.toFixed(2));
    if (obsTransparent) p.set('transparent', 'true');
    if (obsDebug) p.set('debug', 'true');
    return `${base}?${p.toString()}`;
  }

  function copyObsUrl() {
    navigator.clipboard.writeText(buildOverlayUrl());
    obsCopied = true;
    setTimeout(() => obsCopied = false, 2000);
  }

  function openObsPreview() {
    window.open(buildOverlayUrl(), 'ootmm-overlay', `width=${obsW},height=${obsH},resizable=yes`);
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="item-tracker">

  <div class="tracker-toolbar">
      <div class="tracker-counts">
        {#if itGameMode !== 'mm' && itGameMode !== 'none'}<span class="game-badge oot">OoT {ootObtained}/{ootTotal}</span>{/if}
        {#if itGameMode !== 'oot' && itGameMode !== 'none'}<span class="game-badge mm">MM {mmObtained}/{mmTotal}</span>{/if}
      </div>
      <div class="tracker-actions">
        <button class="tracker-btn" on:click={openObsPreview}>🪟 Overlay</button>
        <button class="tracker-btn" class:tracker-btn-active={showObsPanel} on:click={() => showObsPanel = !showObsPanel}>📺 OBS</button>
        <button class="tracker-btn" on:click={() => overlayStacked = !overlayStacked}>
          {overlayStacked ? '⬛ Side by side' : '☰ Stacked'}
        </button>
        <button class="tracker-btn danger" on:click={clearAll} disabled={isWatchMode}>Clear</button>
      </div>
    </div>

  {#if showObsPanel}
    <div class="obs-panel">
      <div class="obs-panel-title">📺 OBS Overlay</div>
      <div class="obs-game-row">
        <button class="obs-game-btn" class:active={obsGame === 'both'} on:click={() => obsGame = 'both'}>OoT + MM</button>
        <button class="obs-game-btn" class:active={obsGame === 'oot'}  on:click={() => obsGame = 'oot'}>OoT only</button>
        <button class="obs-game-btn" class:active={obsGame === 'mm'}   on:click={() => obsGame = 'mm'}>MM only</button>
      </div>
      <label class="obs-field-row">
        <span>Opacity</span>
        <input type="range" min="0" max="1" step="0.05" bind:value={obsOpacity} disabled={obsTransparent} />
        <span class="obs-val">{obsTransparent ? '—' : Math.round(obsOpacity * 100) + '%'}</span>
      </label>
      <label class="obs-field-row obs-check">
        <input type="checkbox" bind:checked={obsTransparent} />
        <span>Transparent background</span>
      </label>
      <label class="obs-field-row obs-check">
        <input type="checkbox" bind:checked={obsDebug} />
        <span>Show dimensions</span>
      </label>
      <div class="obs-url-row">
        <code class="obs-url">{buildOverlayUrl()}</code>
        <button class="tracker-btn" on:click={copyObsUrl}>{obsCopied ? '✓ Copied!' : '📋 Copy'}</button>
      </div>
      <p class="obs-instructions">OBS: <strong>+ → Browser</strong> → paste the URL → Width: <strong>{obsW}</strong> / Height: <strong>{obsH}</strong></p>
      <button class="obs-preview-btn" on:click={openObsPreview}>Preview</button>
    </div>
  {/if}

  <div class="tab-bar">
    <button class="tab-btn" class:tab-active={activeTab === 'items'} on:click={() => activeTab = 'items'}>Items</button>
    <button class="tab-btn" class:tab-active={activeTab === 'settings'} on:click={() => activeTab = 'settings'}>Settings</button>
  </div>

  {#if activeTab === 'items'}


  <div class="{overlayStacked ? 'stacked-grid' : 'main-grid'}" class:single-col={itGameMode !== 'both' && itGameMode !== 'none'}>

    <!-- ===== OoT ===== -->
    {#if itGameMode !== 'mm' && itGameMode !== 'none'}
    <div class="game-col">
      <div class="col-header oot-header">Ocarina of Time</div>

      <!-- Items + Equipment côte à côte -->
      {#if sectionHasItems(ootSections[0].rows,'oot') || sectionHasItems(ootSections[1].rows,'oot')}
      <div class="section-row">
        {#if sectionHasItems(ootSections[0].rows,'oot')}
        <div class="section">
          <div class="section-title">Items</div>
          {#each visibleRows(ootSections[0].rows, 'oot') as row}
            <div class="row-grid">
              {#each row as cellId}
                {#if cellId === null || isHidden(cellId, 'oot')}
                  <div class="cell-empty"></div>
                {:else}
                  {@const item = effectiveItemById[cellId]}
                  {#if item}
                    {@const level = $itemStore.get(cellId) ?? 0}
                    {@const badge = getBadge(item, level)}
                    <div class="tracker-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}{item.maxLevel>1&&level>0?` — ${item.levelLabels?.[level-1]??level}`:''}"
                      on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
                      <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                      {#if badge}<span class="badge">{badge}</span>{/if}
                    </div>
                  {:else}<div class="cell-empty"></div>{/if}
                {/if}
              {/each}
            </div>
          {/each}
        </div>
        {/if}

        {#if sectionHasItems(ootSections[1].rows,'oot')}
        <div class="section">
          <div class="section-title">Equipment</div>
          {#each visibleRows(ootSections[1].rows, 'oot') as row}
            <div class="row-grid">
              {#each row as cellId}
                {#if cellId === null || isHidden(cellId, 'oot')}
                  <div class="cell-empty"></div>
                {:else}
                  {@const item = effectiveItemById[cellId]}
                  {#if item}
                    {@const level = $itemStore.get(cellId) ?? 0}
                    {@const badge = getBadge(item, level)}
                    <div class="tracker-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
                      <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                      {#if badge}<span class="badge">{badge}</span>{/if}
                    </div>
                  {:else}<div class="cell-empty"></div>{/if}
                {/if}
              {/each}
            </div>
          {/each}
        </div>
        {/if}
      </div>
      {/if}

      <!-- Songs + Item Extensions côte à côte -->
      {#if sectionHasItems(ootSections[2].rows,'oot') || sectionHasItems(ootSections[3].rows,'oot')}
      <div class="section-row">
        {#if sectionHasItems(ootSections[2].rows,'oot')}
        <div class="section">
          <div class="section-title">Songs</div>
          {#each visibleRows(ootSections[2].rows, 'oot') as row}
            <div class="row-grid">
              {#each row as cellId}
                {#if cellId === null || isHidden(cellId, 'oot')}
                  <div class="cell-empty"></div>
                {:else}
                  {@const item = effectiveItemById[cellId]}
                  {#if item}
                    {@const level = $itemStore.get(cellId) ?? 0}
                    {@const badge = getBadge(item, level)}
                    <div class="tracker-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
                      <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                      {#if badge}<span class="badge">{badge}</span>{/if}
                    </div>
                  {:else}<div class="cell-empty"></div>{/if}
                {/if}
              {/each}
            </div>
          {/each}
        </div>
        {/if}

        {#if sectionHasItems(ootSections[3].rows,'oot')}
        <div class="section">
          <div class="section-title">Item Extensions</div>
          {#each visibleRows(ootSections[3].rows, 'oot') as row}
            <div class="row-grid">
              {#each row as cellId}
                {#if cellId === null || isHidden(cellId, 'oot')}
                  <div class="cell-empty"></div>
                {:else}
                  {@const item = effectiveItemById[cellId]}
                  {#if item}
                    {@const level = $itemStore.get(cellId) ?? 0}
                    {@const badge = getBadge(item, level)}
                    <div class="tracker-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
                      <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                      {#if badge}<span class="badge">{badge}</span>{/if}
                    </div>
                  {:else}<div class="cell-empty"></div>{/if}
                {/if}
              {/each}
            </div>
          {/each}
        </div>
        {/if}
      </div>
      {/if}

      <!-- Side Quests (pleine largeur) -->
      {#if sectionHasItems(ootSections[4].rows,'oot')}
      <div class="section">
        <div class="section-title">Side Quests</div>
        {#each visibleRows(ootSections[4].rows, 'oot') as row}
          <div class="row-grid">
            {#each row as cellId}
              {#if cellId === null || isHidden(cellId, 'oot')}
                <div class="cell-empty"></div>
              {:else}
                {@const item = effectiveItemById[cellId]}
                {#if item}
                  {@const level = $itemStore.get(cellId) ?? 0}
                  {@const badge = getBadge(item, level)}
                  <div class="tracker-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                    title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
                    <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                    {#if badge}<span class="badge">{badge}</span>{/if}
                  </div>
                {:else}<div class="cell-empty"></div>{/if}
              {/if}
            {/each}
          </div>
        {/each}
      </div>
      {/if}

      <!-- Dungeons (pleine largeur) -->
      {#if sectionHasItems(ootSections[5].rows,'oot')}
      <div class="section">
        <div class="section-title">Dungeons</div>
        {#each visibleRows(ootSections[5].rows, 'oot') as row}
          <div class="row-grid dungeon-row">
            {#each row as cellId}
              {#if cellId === null || isHidden(cellId, 'oot')}
                <div class="cell-empty"></div>
              {:else}
                {@const item = effectiveItemById[cellId]}
                {#if item}
                  {@const level = $itemStore.get(cellId) ?? 0}
                  {@const badge = getBadge(item, level)}
                  <div class="tracker-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                    title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
                    <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                    {#if badge}<span class="badge">{badge}</span>{/if}
                  </div>
                {:else}<div class="cell-empty"></div>{/if}
              {/if}
            {/each}
          </div>
        {/each}
      </div>
      {/if}

    </div>
    {/if}

    <!-- ===== MM ===== -->
    {#if itGameMode !== 'oot' && itGameMode !== 'none'}
    <div class="game-col">
      <div class="col-header mm-header">Majora's Mask</div>

      <!-- Items + Equipment côte à côte -->
      {#if sectionHasItems(mmSections[0].rows,'mm') || sectionHasItems(mmSections[1].rows,'mm')}
      <div class="section-row">
        {#if sectionHasItems(mmSections[0].rows,'mm')}
        <div class="section">
          <div class="section-title">Items</div>
          {#each visibleRows(mmSections[0].rows, 'mm') as row}
            <div class="row-grid">
              {#each row as cellId}
                {#if cellId === null || isHidden(cellId, 'mm')}
                  <div class="cell-empty"></div>
                {:else}
                  {@const item = effectiveItemById[cellId]}
                  {#if item}
                    {@const level = $itemStore.get(cellId) ?? 0}
                    {@const badge = getBadge(item, level)}
                    <div class="tracker-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
                      <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                      {#if badge}<span class="badge">{badge}</span>{/if}
                    </div>
                  {:else}<div class="cell-empty"></div>{/if}
                {/if}
              {/each}
            </div>
          {/each}
        </div>
        {/if}

        {#if sectionHasItems(mmSections[1].rows,'mm')}
        <div class="section">
          <div class="section-title">Equipment</div>
          {#each visibleRows(mmSections[1].rows, 'mm') as row}
            <div class="row-grid">
              {#each row as cellId}
                {#if cellId === null || isHidden(cellId, 'mm')}
                  <div class="cell-empty"></div>
                {:else}
                  {@const item = effectiveItemById[cellId]}
                  {#if item}
                    {@const level = $itemStore.get(cellId) ?? 0}
                    {@const badge = getBadge(item, level)}
                    <div class="tracker-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
                      <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                      {#if badge}<span class="badge">{badge}</span>{/if}
                    </div>
                  {:else}<div class="cell-empty"></div>{/if}
                {/if}
              {/each}
            </div>
          {/each}
        </div>
        {/if}
      </div>
      {/if}

      <!-- Songs + Side Quests côte à côte -->
      {#if sectionHasItems(mmSections[2].rows,'mm') || sectionHasItems(mmSections[3].rows,'mm')}
      <div class="section-row">
        {#if sectionHasItems(mmSections[2].rows,'mm')}
        <div class="section">
          <div class="section-title">Songs</div>
          {#each visibleRows(mmSections[2].rows, 'mm') as row}
            <div class="row-grid">
              {#each row as cellId}
                {#if cellId === null || isHidden(cellId, 'mm')}
                  <div class="cell-empty"></div>
                {:else}
                  {@const item = effectiveItemById[cellId]}
                  {#if item}
                    {@const level = $itemStore.get(cellId) ?? 0}
                    {@const badge = getBadge(item, level)}
                    <div class="tracker-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
                      <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                      {#if badge}<span class="badge">{badge}</span>{/if}
                    </div>
                  {:else}<div class="cell-empty"></div>{/if}
                {/if}
              {/each}
            </div>
          {/each}
        </div>
        {/if}

        {#if sectionHasItems(mmSections[3].rows,'mm')}
        <div class="section">
          <div class="section-title">Side Quests</div>
          {#each visibleRows(mmSections[3].rows, 'mm') as row}
            <div class="row-grid">
              {#each row as cellId}
                {#if cellId === null || isHidden(cellId, 'mm')}
                  <div class="cell-empty"></div>
                {:else}
                  {@const item = effectiveItemById[cellId]}
                  {#if item}
                    {@const level = $itemStore.get(cellId) ?? 0}
                    {@const badge = getBadge(item, level)}
                    <div class="tracker-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
                      <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                      {#if badge}<span class="badge">{badge}</span>{/if}
                    </div>
                  {:else}<div class="cell-empty"></div>{/if}
                {/if}
              {/each}
            </div>
          {/each}
        </div>
        {/if}
      </div>
      {/if}

      <!-- Masks + Dungeons côte à côte -->
      {#if sectionHasItems(mmSections[4].rows,'mm') || sectionHasItems(mmSections[5].rows,'mm')}
      <div class="section-row">
        {#if sectionHasItems(mmSections[4].rows,'mm')}
        <div class="section">
          <div class="section-title">Masks</div>
          {#each visibleRows(mmSections[4].rows, 'mm') as row}
            <div class="row-grid">
              {#each row as cellId}
                {#if cellId === null || isHidden(cellId, 'mm')}
                  <div class="cell-empty"></div>
                {:else}
                  {@const item = effectiveItemById[cellId]}
                  {#if item}
                    {@const level = $itemStore.get(cellId) ?? 0}
                    <div class="tracker-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
                      <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                    </div>
                  {:else}<div class="cell-empty"></div>{/if}
                {/if}
              {/each}
            </div>
          {/each}
        </div>
        {/if}

        {#if sectionHasItems(mmSections[5].rows,'mm')}
        <div class="section">
          <div class="section-title">Dungeons</div>
          {#each visibleRows(mmSections[5].rows, 'mm') as row}
            <div class="row-grid dungeon-row">
              {#each row as cellId}
                {#if cellId === null || isHidden(cellId, 'mm')}
                  <div class="cell-empty"></div>
                {:else}
                  {@const item = effectiveItemById[cellId]}
                  {#if item}
                    {@const level = $itemStore.get(cellId) ?? 0}
                    {@const badge = getBadge(item, level)}
                    <div class="tracker-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
                      <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                      {#if badge}<span class="badge">{badge}</span>{/if}
                    </div>
                  {:else}<div class="cell-empty"></div>{/if}
                {/if}
              {/each}
            </div>
          {/each}
        </div>
        {/if}
      </div>
      {/if}

      <!-- OOT Extensions + Item Extensions côte à côte -->
      {#if sectionHasItems(mmSections[6].rows,'mm') || sectionHasItems(mmSections[7].rows,'mm')}
      <div class="section-row">
        {#if sectionHasItems(mmSections[6].rows,'mm')}
        <div class="section">
          <div class="section-title">OOT Extensions</div>
          {#each visibleRows(mmSections[6].rows, 'mm') as row}
            <div class="row-grid">
              {#each row as cellId}
                {#if cellId === null || isHidden(cellId, 'mm')}
                  <div class="cell-empty"></div>
                {:else}
                  {@const item = effectiveItemById[cellId]}
                  {#if item}
                    {@const level = $itemStore.get(cellId) ?? 0}
                    {@const badge = getBadge(item, level)}
                    <div class="tracker-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
                      <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                      {#if badge}<span class="badge">{badge}</span>{/if}
                    </div>
                  {:else}<div class="cell-empty"></div>{/if}
                {/if}
              {/each}
            </div>
          {/each}
        </div>
        {/if}

        {#if sectionHasItems(mmSections[7].rows,'mm')}
        <div class="section">
          <div class="section-title">Item Extensions</div>
          {#each visibleRows(mmSections[7].rows, 'mm') as row}
            <div class="row-grid">
              {#each row as cellId}
                {#if cellId === null || isHidden(cellId, 'mm')}
                  <div class="cell-empty"></div>
                {:else}
                  {@const item = effectiveItemById[cellId]}
                  {#if item}
                    {@const level = $itemStore.get(cellId) ?? 0}
                    {@const badge = getBadge(item, level)}
                    <div class="tracker-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
                      <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                      {#if badge}<span class="badge">{badge}</span>{/if}
                    </div>
                  {:else}<div class="cell-empty"></div>{/if}
                {/if}
              {/each}
            </div>
          {/each}
        </div>
        {/if}
      </div>
      {/if}
    </div>
    {/if}
  </div>

  <!-- ===== Souls ===== -->
  {#if ootSoulsVisible.length > 0 && itGameMode !== 'mm' && itGameMode !== 'none'}
      <div class="souls-section">
        <div class="col-header oot-header">OoT Souls</div>
        <div class="souls-grid">
          {#each ootSoulsVisible as item}
            {@const level = $itemStore.get(item.id) ?? 0}
            <div class="soul-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
              on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
              <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="soul-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
              <span class="soul-name">{soulShortName(item.name)}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    {#if mmSoulsVisible.length > 0 && itGameMode !== 'oot' && itGameMode !== 'none'}
      <div class="souls-section">
        <div class="col-header mm-header">MM Souls</div>
        <div class="souls-grid">
          {#each mmSoulsVisible as item}
            {@const level = $itemStore.get(item.id) ?? 0}
            <div class="soul-item" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
              on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)}>
              <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="soul-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
              <span class="soul-name">{soulShortName(item.name)}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

  {/if} <!-- end items tab -->

  {#if activeTab === 'settings'}
    <div class="settings-tab">
      <div class="it-game-mode-row">
        <label>
          Show items for:
          <select bind:value={itGameMode} disabled={isWatchMode}>
            <option value="both">Both</option>
            <option value="oot">OoT</option>
            <option value="mm">MM</option>
            <option value="none">None</option>
          </select>
        </label>
      </div>
      <div class="settings-subtabs">
        <button class="settings-stab" class:stab-active={activeSettingsTab === 'shared'} on:click={() => activeSettingsTab = 'shared'}>Shared</button>
        <button class="settings-stab" class:stab-active={activeSettingsTab === 'oot'}    on:click={() => activeSettingsTab = 'oot'}>OoT</button>
        <button class="settings-stab" class:stab-active={activeSettingsTab === 'mm'}     on:click={() => activeSettingsTab = 'mm'}>MM</button>
      </div>

      {#if activeSettingsTab === 'oot'}
        <p class="settings-hint">Hides inactive OoT items for this seed. Automatically imported from the spoiler log.</p>
        <div class="settings-grid">
          {#each ootVisibility as item}
            {#if item.header}
              <div class="settings-grid-header">{item.header}</div>
            {:else if item.options}
              <label class="settings-select-row">
                <span class="settings-select-name">{item.name}</span>
                <select value={$settingsStore.get(item.key) ?? item.options[0].value}
                  on:change={e => setStringSetting(item.key, e.currentTarget.value)}
                  disabled={isWatchMode}>
                  {#each item.options as opt}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
                </select>
              </label>
            {:else}
              <label class="settings-check">
                <input type="checkbox"
                  checked={$settingsStore.get(item.key) !== false}
                  on:change={() => toggleVisibility(item.key, $settingsStore.get(item.key) === false)}
                  disabled={isWatchMode}
                />
                {item.name}
              </label>
            {/if}
          {/each}
        </div>
      {/if}

      {#if activeSettingsTab === 'mm'}
        <p class="settings-hint">Hides inactive MM items for this seed. Automatically imported from the spoiler log.</p>
        <div class="settings-grid">
          {#each mmVisibility as item}
            {#if item.header}
              <div class="settings-grid-header">{item.header}</div>
            {:else if item.options}
              <label class="settings-select-row">
                <span class="settings-select-name">{item.name}</span>
                <select value={$settingsStore.get(item.key) ?? item.options[0].value}
                  on:change={e => setStringSetting(item.key, e.currentTarget.value)}
                  disabled={isWatchMode}>
                  {#each item.options as opt}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
                </select>
              </label>
            {:else}
              <label class="settings-check">
                <input type="checkbox"
                  checked={$settingsStore.get(item.key) !== false}
                  on:change={() => toggleVisibility(item.key, $settingsStore.get(item.key) === false)}
                  disabled={isWatchMode}
                />
                {item.name}
              </label>
            {/if}
          {/each}
        </div>
      {/if}

      {#if activeSettingsTab === 'shared'}
        <p class="settings-hint">Enables shared items to appear in the Shared panel.</p>
        <div class="settings-grid">
          {#each sharedData as item}
            {#if item.header}
              <div class="settings-grid-header">{item.header}</div>
            {:else}
              <label class="settings-check">
                <input type="checkbox"
                  checked={$settingsStore.get(item.key) === true}
                  on:change={() => toggleSetting(item.key, $settingsStore.get(item.key) !== true)}
                  disabled={isWatchMode}
                />
                {item.name}
              </label>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/if}


</div>

<style>
  .item-tracker { margin-top: 0.8em; }

  /* Toolbar */
  .tracker-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.6em; flex-wrap: wrap; gap: 0.4em; }
  .tracker-counts  { display: flex; gap: 0.4em; flex-wrap: wrap; }
  .tracker-actions { display: flex; gap: 0.4em; }
  .tracker-btn { padding: 0.3em 0.6em; border: 1px solid var(--color-border); border-radius: 4px; background: var(--color-bg); color: var(--color-text); cursor: pointer; font-size: 0.8em; }
  .tracker-btn.danger { background: var(--color-danger); color: white; border-color: var(--color-danger); }
  .tracker-btn-active { background: var(--color-border); }

  /* OBS Panel */
  .obs-panel {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.7em 1em;
    margin-bottom: 0.6em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    font-size: 0.85em;
  }
  .obs-panel-title { font-weight: bold; color: var(--color-text); }
  .obs-game-row { display: flex; gap: 0.3em; }
  .obs-game-btn {
    flex: 1; padding: 3px 6px; border: 1px solid var(--color-border); border-radius: 3px;
    background: transparent; color: var(--color-text); cursor: pointer; font-size: 0.82em;
  }
  .obs-game-btn.active { background: var(--color-border); font-weight: bold; }
  .obs-field-row {
    display: flex; align-items: center; gap: 0.5em;
    font-size: 0.82em; color: var(--color-text);
  }
  .obs-field-row span:first-child { width: 70px; flex-shrink: 0; }
  .obs-field-row input[type="range"] { flex: 1; cursor: pointer; }
  .obs-val { width: 35px; text-align: right; flex-shrink: 0; font-variant-numeric: tabular-nums; }
  .obs-check { cursor: pointer; gap: 0.4em; }
  .obs-check input { cursor: pointer; }
  .obs-url-row { display: flex; gap: 0.5em; align-items: center; }
  .obs-url {
    flex: 1; font-size: 0.75em; padding: 3px 6px;
    border: 1px solid var(--color-border); border-radius: 3px;
    background: var(--color-unchecked); color: var(--color-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .obs-instructions { font-size: 0.78em; color: var(--color-header); }
  .obs-preview-btn {
    align-self: flex-start; padding: 3px 10px;
    border: 1px solid var(--color-border); border-radius: 4px;
    background: transparent; color: var(--color-text); cursor: pointer; font-size: 0.82em;
  }
  .obs-preview-btn:hover { background: var(--color-border); }

  /* Game badges */
  .game-badge { font-size: 0.78em; font-weight: bold; padding: 2px 6px; border-radius: 3px; }
  .game-badge.oot    { background: #2a5a2a; color: #7ec87e; }
  .game-badge.mm     { background: #2a2a5a; color: #7e7ec8; }

  /* Main layout */
  .main-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 1em; margin-bottom: 0.8em; align-items: start; }
  .main-grid.single-col { grid-template-columns: 1fr; }
  .stacked-grid { display: flex; flex-direction: column; gap: 0.6em; }
  .game-col     { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
  .stacked-grid .game-col { width: 100%; }
  .stacked-grid .section-row { flex-wrap: wrap; }
  .stacked-grid .section { flex: 1 1 auto; }

  /* Game headers */
  .col-header { font-size: 0.85em; font-weight: bold; text-align: center; padding: 3px 6px; border-radius: 3px; margin-bottom: 4px; color: #fff; letter-spacing: 0.04em; }
  .oot-header    { background: rgba(34,100,34,0.85); }
  .mm-header     { background: rgba(60,50,130,0.85); }

  /* Bordered sections */
  .section-row {
    display: flex;
    flex-direction: row;
    gap: 6px;
    align-items: flex-start;
    flex-wrap: nowrap;
  }

  .section {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 5px 6px 6px;
    background: transparent;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .section-title {
    font-size: 0.7em;
    color: var(--color-header);
    margin-bottom: 3px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: none;
  }

  /* Grilles */
  .row-grid         { display: flex; gap: 2px; flex-wrap: nowrap; }
  .cell-empty       { width: 36px; height: 36px; }
  .row-grid .cell-empty { display: none; }
  .dungeon-row .cell-empty { display: block; }

  /* Items */
  .tracker-item {
    position: relative;
    width: 36px; height: 36px;
    cursor: pointer;
    border-radius: 3px;
    transition: transform 0.1s;
    user-select: none;
  }
  .tracker-item:hover { transform: scale(1.2); z-index: 10; }
  .tracker-item.obtained { background: transparent; }
  .tracker-item.maxed .badge { background: rgba(0,140,40,0.9); color: #afffb8; }

  .tracker-icon { width: 100%; height: 100%; object-fit: contain; display: block; image-rendering: auto; transition: filter 0.15s, opacity 0.15s; }
  .tracker-icon.greyed { filter: grayscale(100%); opacity: 0.22; }
  .tracker-item.obtained .tracker-icon:not(.greyed) { filter: drop-shadow(0 0 3px rgba(255, 210, 60, 0.65)); }
  .tracker-item.maxed .tracker-icon:not(.greyed)    { filter: drop-shadow(0 0 4px rgba(80, 255, 120, 0.8)); }

  .badge {
    position: absolute; bottom: 0; right: 0;
    background: rgba(0,0,0,0.8); color: #fff;
    font-size: 0.68em; font-weight: bold; line-height: 1;
    padding: 1px 2px; border-radius: 2px 0 0 0;
    pointer-events: none; white-space: nowrap; max-width: 30px; overflow: hidden;
  }


  /* Tabs */
  .tab-bar { display: flex; gap: 4px; margin-bottom: 0.5em; }
  .tab-btn {
    padding: 0.3em 0.8em; border: 1px solid var(--color-border); border-radius: 4px 4px 0 0;
    background: var(--color-bg); color: var(--color-header); cursor: pointer; font-size: 0.82em;
    border-bottom-color: transparent; transition: color 0.15s, background 0.15s;
  }
  .tab-btn:hover { color: var(--color-text); }
  .tab-btn.tab-active { color: var(--color-text); background: var(--color-unchecked); border-color: var(--color-border); border-bottom-color: transparent; }

  /* Settings tab */
  .settings-tab { display: flex; flex-direction: column; gap: 0.6em; padding-top: 0.4em; }
  .it-game-mode-row { padding: 0.3em 0 0.2em; font-size: 0.82em; display: flex; align-items: center; gap: 0.5em; }
  .it-game-mode-row select { background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 3px; font-size: 0.9em; padding: 2px 4px; cursor: pointer; }
  .settings-hint { font-size: 0.74em; color: var(--color-header); margin: 2px 0 6px; line-height: 1.4; }

  /* Sub-tabs (OoT / MM / Shared) */
  .settings-subtabs { display: flex; gap: 3px; border-bottom: 1px solid var(--color-border); padding-bottom: 4px; margin-bottom: 2px; }
  .settings-stab {
    padding: 0.25em 0.9em; border: 1px solid transparent; border-radius: 4px 4px 0 0;
    background: transparent; color: var(--color-header); cursor: pointer; font-size: 0.8em;
    transition: color 0.15s, background 0.15s;
  }
  .settings-stab:hover { color: var(--color-text); }
  .settings-stab.stab-active { color: var(--color-text); background: var(--color-unchecked); border-color: var(--color-border); border-bottom-color: transparent; }

  /* Settings grid (3 colonnes comme Game Settings) */
  .settings-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px 10px; }
  .settings-grid-header {
    grid-column: 1 / -1;
    font-size: 0.7em; font-weight: 600; color: var(--color-header);
    text-transform: uppercase; letter-spacing: 0.04em;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 2px; margin-top: 8px; margin-bottom: 1px;
  }
  .settings-grid-header:first-child { margin-top: 0; }
  .settings-check { display: flex; align-items: center; gap: 5px; font-size: 0.78em; color: var(--color-text); cursor: pointer; padding: 2px 0; line-height: 1.2; }
  .settings-check input[type="checkbox"] { cursor: pointer; accent-color: #7ec87e; width: 12px; height: 12px; flex-shrink: 0; }
  .settings-select-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 0.78em; color: var(--color-text); padding: 2px 0; }
  .settings-select-name { flex: 1; }
  .settings-select-row select { background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 3px; font-size: 0.9em; padding: 1px 3px; cursor: pointer; }

  /* Souls */
  .souls-section { margin-bottom: 0.6em; }
  .souls-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(54px, 1fr)); gap: 4px; margin-top: 0.3em; }
  .soul-item { display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; border-radius: 4px; padding: 3px 2px; transition: background 0.1s; user-select: none; }
  .soul-item:hover { background: var(--color-border); }
  .soul-item.obtained { background: transparent; }
  .soul-icon { width: 40px; height: 40px; object-fit: contain; image-rendering: auto; transition: filter 0.15s, opacity 0.15s; }
  .soul-icon.greyed { filter: grayscale(100%); opacity: 0.22; }
  .soul-item.obtained .soul-icon:not(.greyed) { filter: drop-shadow(0 0 3px rgba(255, 210, 60, 0.65)); }
  .soul-item.maxed   .soul-icon:not(.greyed)  { filter: drop-shadow(0 0 4px rgba(80, 255, 120, 0.8)); }
  .soul-name { font-size: 0.6em; color: var(--color-text); opacity: 0.75; text-align: center; line-height: 1.2; word-break: break-word; max-width: 54px; }
  .soul-item.obtained .soul-name { opacity: 1; }
</style>