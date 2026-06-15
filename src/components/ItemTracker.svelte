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
    sharedItems.filter(i => {
      if (!i.settingKey) return true;
      if ($settingsStore.get(i.settingKey) === true) return true;
      // Auto-show triforce items based on goal setting
      const goal = $settingsStore.get('goal');
      if (i.id === 'sh_triforce' && goal === 'triforce') return true;
      if (['sh_triforce_courage','sh_triforce_power','sh_triforce_wisdom'].includes(i.id) && goal === 'triforce3') return true;
      return false;
    }).map(i => i.id)
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

  // Opt-in settings: item exists only when explicitly enabled — hidden when value !== true.
  // Opt-out settings: item exists by default — hidden only when value === false.
  const OPT_IN_VISIBILITY_KEYS = new Set([
    'coins', 'elegyOot', 'ocarinaButtonsShuffleOot', 'spinUpgradeOot',
    'skeletonKeyOot', 'platinumTokenOot', 'magicalRupee',
    'ocarinaButtonsShuffleMm', 'platinumTokenMm', 'skeletonKeyMm',
    'transcendentFairy', 'clocks', 'owlShuffleEnabled',
    // MM OoT Extensions — all opt-in since they require explicit activation
    'spellFireMm', 'spellWindMm', 'spellLoveMm', 'stoneAgonyMm',
    'hammerMm', 'strengthMm', 'scalesMm', 'dekuShieldMm',
    'bootsIronMm', 'bootsHoverMm', 'tunicGoronMm', 'tunicZoraMm',
  ]);

  const itemVisibilityMap: Record<string, string> = {
    // OoT Item Extensions (skip mask_blast/mask_stone: shared IDs with MM Masks)
    'coin_red':               'coins',
    'coin_green':             'coins',
    'coin_blue':              'coins',
    'coin_yellow':            'coins',
    'oot_elegy':              'elegyOot',
    'button_a':               'ocarinaButtonsShuffleOot',
    'button_up':              'ocarinaButtonsShuffleOot',
    'button_down':            'ocarinaButtonsShuffleOot',
    'button_left':            'ocarinaButtonsShuffleOot',
    'button_right':           'ocarinaButtonsShuffleOot',
    'oot_spin_upgrade':       'spinUpgradeOot',
    'key_skeleton':               'skeletonKeyOot',
    'skulltula_platinum':         'platinumTokenOot',
    'oot_rupee_magical':          'magicalRupee',
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

  $: disabledItems = new Set([
    ...Object.entries(itemVisibilityMap)
      .filter(([, sk]) => OPT_IN_VISIBILITY_KEYS.has(sk)
        ? $settingsStore.get(sk) !== true
        : $settingsStore.get(sk) === false)
      .map(([id]) => id),
    // hide mm_roomkey from Side Quests when rusty keys MM is on (shown in rusty keys section instead)
    ...($settingsStore.get('rustyKeysMm') === true ? ['mm_roomkey'] : []),
  ]);

  // Dynamic item overrides based on settings (short hookshot, fairy ocarina, lullaby, GFS, wallets)
  $: effectiveItemById = (() => {
    const shortHookshot     = $settingsStore.get('shortHookshotMm')          === true;
    const fairyOcarina      = $settingsStore.get('fairyOcarinaMm')           === true;
    const progLullaby       = $settingsStore.get('progressiveGoronLullabyMm') === 'intro'
                           || $settingsStore.get('progressiveGoronLullaby')   === 'progressive';
    const progGFS           = $settingsStore.get('progressiveGFS')           === 'progressive';
    const kegStrength3      = $settingsStore.get('kegStrength3')             === true;
    const childWallets      = $settingsStore.get('childWallets')             === true;
    const colossalWallets   = $settingsStore.get('colossalWallets')          === true;
    const bottomlessWallets = $settingsStore.get('bottomlessWallets')        === true;
    const notebookShuffled  = $settingsStore.get('menuNotebook')             === true;
    if (!shortHookshot && !fairyOcarina && progLullaby && !progGFS && !kegStrength3 && !childWallets && !colossalWallets && !bottomlessWallets && !notebookShuffled) return itemById;
    const map: typeof itemById = { ...itemById };
    if (shortHookshot)
      map['mm_hookshot']     = { ...itemById['mm_hookshot'],     icon: 'item/hookshot',     maxLevel: 2, levelIcons: ['item/hookshot', 'mm/mm_hookshot'] };
    if (fairyOcarina)
      map['mm_ocarina']      = { ...itemById['mm_ocarina'],      icon: 'item/fairyocarina', maxLevel: 2, levelIcons: ['item/fairyocarina', 'mm/mm_ocarina'] };
    if (!progLullaby)
      map['mm_song_lullaby'] = { ...itemById['mm_song_lullaby'], maxLevel: 1, levelIcons: ['mm/mm_lullaby'] };
    if (progGFS)
      map['mm_sword']        = { ...itemById['mm_sword'],        maxLevel: 4, levelIcons: ['mm/mm_kokiri', 'mm/mm_razor', 'mm/mm_gilded', 'mm/mm_fairysword'] };
    if (kegStrength3)
      map['mm_strength']     = { ...itemById['mm_strength'],     maxLevel: 4, levelIcons: ['upgrade/lift1', 'upgrade/lift2', 'upgrade/lift3', 'upgrade/lift3'] };
    if (!notebookShuffled)
      map['mm_bomber']       = { ...itemById['mm_bomber'],       startUndimmed: true };
    if (childWallets || colossalWallets || bottomlessWallets) {
      const newLevel = bottomlessWallets ? 5 : colossalWallets ? 4 : 3;
      const icons = Array.from({ length: newLevel }, (_, i) => `upgrade/wallet${Math.min(i + 1, 3)}`);
      const labels: (string | undefined)[] = Array(newLevel).fill(undefined);
      if (colossalWallets || bottomlessWallets) labels[3] = '999';
      if (bottomlessWallets) labels[4] = '9999';
      map['wallet'] = { ...itemById['wallet'],
        ...(childWallets ? { startUndimmed: false } : {}),
        ...(newLevel > 3 ? { maxLevel: newLevel, levelIcons: icons, levelLabels: labels as string[] } : {}),
      };
    }
    return map;
  })();

  // ==========================================
  // SECTIONS LAYOUT
  // Chaque section : { title, rows: string[][] }
  // ==========================================

  const OOT_RUSTY_KEYS_ROWS: string[][] = [
    ['oot_rk_laboratory','oot_rk_fishing_pond','oot_rk_ranch_house','oot_rk_ranch_house_room','oot_rk_ranch_stable','oot_rk_silo'],
    ['oot_rk_windmill','oot_rk_impa_house','oot_rk_skulltula_house','oot_rk_carpenter_house','oot_rk_granny_potion_shop','oot_rk_graveyard'],
    ['oot_rk_guard_house','oot_rk_bombchu_bowling','oot_rk_treasure_chest_game','oot_rk_bombchu_shop','oot_rk_dog_lady_house','oot_rk_back_alley_house'],
    ['oot_rk_child_shooting_gallery','oot_rk_child_bazaar','oot_rk_child_potion_shop','oot_rk_adult_shooting_gallery','oot_rk_adult_bazaar','oot_rk_adult_potion_shop','oot_rk_adult_potion_shop_back','oot_rk_mask_shop'],
  ];
  const MM_RUSTY_KEYS_ROWS: string[][] = [
    ['mm_rk_bomb_shop','mm_rk_trading_post','mm_rk_curiosity_shop','mm_rk_post_office','mm_rk_swordsman_school','mm_rk_lottery','mm_rk_kafei_hideout'],
    ['mm_rk_mayor_residence','mm_rk_mayor_residence_office','mm_rk_mayor_residence_salon','mm_rk_mayor_residence_kafei','mm_rk_town_archery','mm_rk_treasure_chest_game','mm_rk_honey_darling'],
    ['mm_rk_inn_guest_room','mm_rk_stock_pot_inn_roof','mm_rk_stock_pot_inn_staff_room','mm_rk_stock_pot_inn_dormitory','mm_rk_grandma_room','mm_rk_milk_bar','mm_rk_observatory'],
    ['mm_rk_swamp_archery','mm_rk_tourist_information','mm_rk_potion_shop','mm_rk_cucco_shack','mm_rk_dog_racetrack','mm_rk_ranch_barn','mm_rk_ranch_house','mm_rk_ranch_house_room'],
    ['mm_rk_laboratory','mm_rk_zora_shop','mm_rk_zora_tijo_room','mm_rk_zora_japas_room','mm_rk_zora_evan_room','mm_rk_zora_lulu_room'],
    ['mm_rk_beneath_graveyard','mm_rk_dampe_house','mm_rk_music_house','mm_rk_blacksmith'],
  ];

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
        ...($settingsStore.get('crossGameSongs') === true ? [
          ['oot_song_healing','oot_song_soaring','oot_song_sonata','oot_song_lullaby','oot_song_nova','oot_song_oath'],
        ] : []),
      ]
    },
    {
      title: 'Item Extensions',
      rows: [
        ['mask_blast','mask_stone','oot_spin_upgrade'],
        ['oot_elegy','button_a','button_up','button_down','button_left','button_right'],
        ['key_skeleton','skulltula_platinum','oot_rupee_magical'],
        ['coin_red','coin_green','coin_blue','coin_yellow'],
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
        ...($settingsStore.get('crossGameSongs') === true ? [
          ['mm_song_zelda','mm_song_saria','mm_song_minuet','mm_song_bolero','mm_song_serenade','mm_song_requiem','mm_song_nocturne','mm_song_prelude'],
        ] : []),
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
        ['mask_kamaro','mask_gibdo','mask_garo','mask_captain_hat','mask_giant','mask_fierce_deity'],
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
        ['mm_clock1','mm_clock4','mm_clock2','mm_clock5','mm_clock3','mm_clock6'],
        ['mm_owl_clock_town','mm_owl_southern_swamp','mm_owl_woodfall','mm_owl_milk_road','mm_owl_mountain_village'],
        ['mm_owl_snowhead','mm_owl_great_bay','mm_owl_zora_cape','mm_owl_ikana_canyon','mm_owl_stone_tower'],
      ]
    },
  ];



  // ==========================================
  // SOULS
  // ==========================================
  const soulCats = new Set(['souls_boss', 'souls_enemy', 'souls_npc', 'souls_misc']);
  const ootSouls = ootItems.filter(i => soulCats.has(i.category));
  const mmSouls  = mmItems.filter(i => soulCats.has(i.category));

  $: ootSoulsVisible = ootSouls.filter(i => {
    if (i.category === 'souls_boss')  return $settingsStore.get('soulsBossOot')  === true;
    if (i.category === 'souls_enemy') return $settingsStore.get('soulsEnemyOot') === true;
    if (i.category === 'souls_npc')   return $settingsStore.get('soulsNpcOot')   === true;
    if (i.category === 'souls_misc')  return $settingsStore.get('soulsMiscOot')  === true;
    return false;
  });
  $: mmSoulsVisible = mmSouls.filter(i => {
    if (i.category === 'souls_boss')  return $settingsStore.get('soulsBossMm')  === true;
    if (i.category === 'souls_enemy') return $settingsStore.get('soulsEnemyMm') === true;
    if (i.category === 'souls_npc')   return $settingsStore.get('soulsNpcMm')   === true;
    if (i.category === 'souls_misc')  return $settingsStore.get('soulsMiscMm')  === true;
    return false;
  });

  const SOUL_GROUP_LABELS: Record<string, string> = {
    souls_boss:  'Boss',
    souls_misc:  'Misc',
    souls_enemy: 'Enemy',
    souls_npc:   'NPC',
  };

  function groupSoulsByCategory(souls: typeof ootSouls) {
    const order = ['souls_boss', 'souls_enemy', 'souls_npc'];
    return order
      .map(cat => ({ cat, label: SOUL_GROUP_LABELS[cat], items: souls.filter(i => i.category === cat) }))
      .filter(g => g.items.length > 0);
  }

  // ==========================================
  // ITEM INTERACTION
  // ==========================================
  function handleClick(e: MouseEvent | KeyboardEvent, item: TrackerItem) {
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
  let obsSubTab: 'setup' | 'vis' = 'setup';
  let obsLayout: 'v' | 'h' = 'v';
  let obsGame: 'oot' | 'mm' | 'both' = 'both';
  let obsOpacity = 0.85;
  let obsTransparent = false;
  let obsShowOotQuests = true;
  let obsShowMmQuests = true;
  let obsShowOotExt = true;
  let obsShowMmExt = true;
  let obsShowMasks = true;
  let obsShowOotSongs = true;
  let obsShowMmSongs = true;
  let obsShowOotDungeons = true;
  let obsShowMmDungeons = true;
  let obsDebug = false;
  let obsW = 384;
  let obsH = 900;
  let obsIconSize = 9; // 9 = auto (layout default)
  let obsCopied = false;

  const obsDims: Record<'v' | 'h', Record<'oot' | 'mm' | 'both', { w: number; h: number }>> = {
    v: { both: { w: 384, h: 900 }, oot: { w: 200, h: 900 }, mm: { w: 200, h: 900 } },
    h: { both: { w: 1920, h: 180 }, oot: { w: 1920, h: 110 }, mm: { w: 1920, h: 110 } },
  };
  $: { const d = obsDims[obsLayout][obsGame]; obsW = d.w; obsH = d.h; }
  // Disable verbose sections by default when switching to horizontal
  $: if (obsLayout === 'h') { obsShowOotQuests = false; obsShowMmQuests = false; obsShowOotExt = false; obsShowMmExt = false; obsShowMasks = false; obsShowOotSongs = false; obsShowMmSongs = false; obsShowOotDungeons = false; obsShowMmDungeons = false; }
  $: if (obsLayout === 'v') { obsShowOotQuests = true; obsShowMmQuests = true; obsShowOotExt = true; obsShowMmExt = true; obsShowMasks = true; obsShowOotSongs = true; obsShowMmSongs = true; obsShowOotDungeons = true; obsShowMmDungeons = true; }

  $: obsUrl = (() => {
    const base = `${window.location.origin}${window.location.pathname}`;
    const p = new URLSearchParams({ overlay: 'true' });
    if (obsGame !== 'both') p.set('game', obsGame);
    if (roomName) p.set('room', roomName);
    if (obsLayout === 'h') p.set('layout', 'h');
    if (!obsTransparent && Math.abs(obsOpacity - 0.85) > 0.01) p.set('opacity', obsOpacity.toFixed(2));
    if (obsTransparent) p.set('transparent', 'true');
    if (obsIconSize > 9) p.set('size', obsIconSize + 'px');
    if (!obsShowOotQuests) p.set('oot_quests', '0');
    if (!obsShowMmQuests) p.set('mm_quests', '0');
    if (!obsShowOotExt) p.set('oot_ext', '0');
    if (!obsShowMmExt) p.set('mm_ext', '0');
    if (!obsShowMasks) p.set('masks', '0');
    if (!obsShowOotSongs) p.set('oot_songs', '0');
    if (!obsShowMmSongs) p.set('mm_songs', '0');
    if (!obsShowOotDungeons) p.set('oot_dungeons', '0');
    if (!obsShowMmDungeons) p.set('mm_dungeons', '0');
    if (obsDebug) p.set('debug', 'true');
    return `${base}?${p.toString()}`;
  })();

  function copyObsUrl() {
    navigator.clipboard.writeText(obsUrl);
    obsCopied = true;
    setTimeout(() => obsCopied = false, 2000);
  }

  function openObsPreview() {
    window.open(obsUrl, 'ootmm-overlay', `width=${obsW},height=${obsH},resizable=yes`);
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
        <button type="button" class="tracker-btn" on:click={openObsPreview}>🪟 Overlay</button>
        <button type="button" class="tracker-btn" class:tracker-btn-active={showObsPanel} on:click={() => showObsPanel = !showObsPanel}>📺 OBS</button>
        <button type="button" class="tracker-btn" on:click={() => overlayStacked = !overlayStacked}>
          {overlayStacked ? '⬛ Side by side' : '☰ Stacked'}
        </button>
        <button type="button" class="tracker-btn danger" on:click={clearAll} disabled={isWatchMode}>Clear</button>
      </div>
    </div>

  {#if showObsPanel}
    <div class="obs-panel">
      <div class="obs-panel-title">📺 OBS Overlay</div>

      <div class="obs-subtab-row">
        <button type="button" class="obs-subtab-btn" class:active={obsSubTab === 'setup'} on:click={() => obsSubTab = 'setup'}>Setup</button>
        <button type="button" class="obs-subtab-btn" class:active={obsSubTab === 'vis'}   on:click={() => obsSubTab = 'vis'}>Visibility</button>
      </div>

      {#if obsSubTab === 'setup'}
        <div class="obs-game-row">
          <button type="button" class="obs-game-btn" class:active={obsLayout === 'v'} on:click={() => obsLayout = 'v'}>↕ Vertical</button>
          <button type="button" class="obs-game-btn" class:active={obsLayout === 'h'} on:click={() => obsLayout = 'h'}>↔ Horizontal</button>
        </div>

        <div class="obs-game-row">
          <button type="button" class="obs-game-btn" class:active={obsGame === 'both'} on:click={() => obsGame = 'both'}>OoT + MM</button>
          <button type="button" class="obs-game-btn" class:active={obsGame === 'oot'}  on:click={() => obsGame = 'oot'}>OoT only</button>
          <button type="button" class="obs-game-btn" class:active={obsGame === 'mm'}   on:click={() => obsGame = 'mm'}>MM only</button>
        </div>

        <div class="obs-field-row">
          <span>Dimensions</span>
          <input type="number" min="100" max="3840" step="1" bind:value={obsW} class="obs-dim-input" title="Width (px)" />
          <span style="flex-shrink:0; opacity:0.5">×</span>
          <input type="number" min="50" max="2160" step="1" bind:value={obsH} class="obs-dim-input" title="Height (px)" />
          <span class="obs-val" style="width:auto; opacity:0.5">px</span>
        </div>

        <label class="obs-field-row">
          <span>Opacity</span>
          <input type="range" min="0" max="1" step="0.05" bind:value={obsOpacity} disabled={obsTransparent} />
          <span class="obs-val">{obsTransparent ? '—' : Math.round(obsOpacity * 100) + '%'}</span>
        </label>

        <label class="obs-field-row">
          <span>Icon size</span>
          <input type="range" min="9" max="26" step="1" bind:value={obsIconSize} />
          <span class="obs-val">{obsIconSize <= 9 ? 'auto' : obsIconSize + 'px'}</span>
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
          <code class="obs-url">{obsUrl}</code>
          <button type="button" class="tracker-btn" on:click={copyObsUrl}>{obsCopied ? '✓ Copied!' : '📋 Copy'}</button>
        </div>
        <p class="obs-instructions">OBS: <strong>+ → Browser</strong> → paste the URL → Width: <strong>{obsW}</strong> / Height: <strong>{obsH}</strong></p>
        <button type="button" class="obs-preview-btn" on:click={openObsPreview}>Preview</button>
      {/if}

      {#if obsSubTab === 'vis'}
        <p class="obs-vis-hint">Sections to show in the overlay</p>
        <div class="obs-vis-grid">
          <span class="obs-vis-col-hdr"></span>
          <span class="obs-vis-col-hdr oot">OoT</span>
          <span class="obs-vis-col-hdr mm">MM</span>

          <span class="obs-vis-row-lbl">Songs</span>
          <label class="obs-check-sm"><input type="checkbox" bind:checked={obsShowOotSongs} /></label>
          <label class="obs-check-sm"><input type="checkbox" bind:checked={obsShowMmSongs} /></label>

          <span class="obs-vis-row-lbl">Quests</span>
          <label class="obs-check-sm"><input type="checkbox" bind:checked={obsShowOotQuests} /></label>
          <label class="obs-check-sm"><input type="checkbox" bind:checked={obsShowMmQuests} /></label>

          <span class="obs-vis-row-lbl">Extensions</span>
          <label class="obs-check-sm"><input type="checkbox" bind:checked={obsShowOotExt} /></label>
          <label class="obs-check-sm"><input type="checkbox" bind:checked={obsShowMmExt} /></label>

          <span class="obs-vis-row-lbl">Dungeons</span>
          <label class="obs-check-sm"><input type="checkbox" bind:checked={obsShowOotDungeons} /></label>
          <label class="obs-check-sm"><input type="checkbox" bind:checked={obsShowMmDungeons} /></label>

          <span class="obs-vis-row-lbl">Masks</span>
          <span></span>
          <label class="obs-check-sm"><input type="checkbox" bind:checked={obsShowMasks} /></label>
        </div>
      {/if}
    </div>
  {/if}

  <div class="tab-bar">
    <button type="button" class="tab-btn" class:tab-active={activeTab === 'items'} on:click={() => activeTab = 'items'}>Items</button>
    <button type="button" class="tab-btn" class:tab-active={activeTab === 'settings'} on:click={() => activeTab = 'settings'}>Settings</button>
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
                    <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}{item.maxLevel>1&&level>0?` — ${item.levelLabels?.[level-1]??level}`:''}"
                      on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
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
                    <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
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
                    <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
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
                    <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
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
                  <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                    title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
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
                  <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                    title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
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

      <!-- Triforce (shown only when triforce items are active via Shared Items settings) -->
      {#if activeSharedIds.has('sh_triforce') || activeSharedIds.has('sh_triforce_courage') || activeSharedIds.has('sh_triforce_power') || activeSharedIds.has('sh_triforce_wisdom')}
      <div class="section">
        <div class="section-title">Triforce</div>
        <div class="row-grid">
          {#each ['sh_triforce', 'sh_triforce_courage', 'sh_triforce_power', 'sh_triforce_wisdom'] as cellId}
            {#if isHidden(cellId, 'shared')}
              <div class="cell-empty"></div>
            {:else}
              {@const item = effectiveItemById[cellId]}
              {#if item}
                {@const level = $itemStore.get(cellId) ?? 0}
                {@const badge = getBadge(item, level)}
                <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                  title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
                  <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                  {#if badge}<span class="badge">{badge}</span>{/if}
                </div>
              {:else}<div class="cell-empty"></div>{/if}
            {/if}
          {/each}
        </div>
      </div>
      {/if}

      <!-- Rusty Keys (OoT) -->
      {#if $settingsStore.get('rustyKeysOot') === true}
      <div class="section">
        <div class="section-title">Rusty Keys (OoT)</div>
        {#each OOT_RUSTY_KEYS_ROWS as row}
          <div class="row-grid">
            {#each row as cellId}
              {@const item = effectiveItemById[cellId]}
              {#if item}
                {@const level = $itemStore.get(cellId) ?? 0}
                {@const badge = getBadge(item, level)}
                <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                  title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
                  <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                  {#if badge}<span class="badge">{badge}</span>{/if}
                </div>
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
                    <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
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
                    <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
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
                    <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
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
                    <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
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
                    <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
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
                    <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
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
                    <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
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
                    <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                      title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
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

      <!-- Rusty Keys (MM) -->
      {#if $settingsStore.get('rustyKeysMm') === true}
      <div class="section">
        <div class="section-title">Rusty Keys (MM)</div>
        {#each MM_RUSTY_KEYS_ROWS as row}
          <div class="row-grid">
            {#each row as cellId}
              {@const item = effectiveItemById[cellId]}
              {#if item}
                {@const level = $itemStore.get(cellId) ?? 0}
                {@const badge = getBadge(item, level)}
                <div class="tracker-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                  title="{item.name}" on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
                  <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="tracker-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                  {#if badge}<span class="badge">{badge}</span>{/if}
                </div>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
      {/if}

    </div>
    {/if}
  </div>

  <!-- ===== Souls ===== -->
  {#if ootSoulsVisible.length > 0 && itGameMode !== 'mm' && itGameMode !== 'none'}
      <div class="souls-section">
        <div class="col-header oot-header">OoT Souls</div>
        {#each groupSoulsByCategory(ootSoulsVisible) as group}
          <div class="soul-group-label">{group.label}</div>
          <div class="souls-grid">
            {#each group.items as item}
              {@const level = $itemStore.get(item.id) ?? 0}
              <div class="soul-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
                <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="soul-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                <span class="soul-name">{soulShortName(item.name)}</span>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
    {#if mmSoulsVisible.length > 0 && itGameMode !== 'oot' && itGameMode !== 'none'}
      <div class="souls-section">
        <div class="col-header mm-header">MM Souls</div>
        {#each groupSoulsByCategory(mmSoulsVisible) as group}
          <div class="soul-group-label">{group.label}</div>
          <div class="souls-grid">
            {#each group.items as item}
              {@const level = $itemStore.get(item.id) ?? 0}
              <div class="soul-item" role="button" tabindex="0" class:obtained={isObtained(item,level)} class:maxed={isMaxed(item,level)}
                on:click={e=>handleClick(e,item)} on:contextmenu={e=>handleRightClick(e,item)} on:keydown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleClick(e,item)}}}>
                <img loading="lazy" src={getIconSrc(item,level)} alt={item.name} class="soul-icon" class:greyed={isGreyed(item,level)} draggable="false"/>
                <span class="soul-name">{soulShortName(item.name)}</span>
              </div>
            {/each}
          </div>
        {/each}
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
      <p class="settings-hint">Item visibility and shared settings are now in <strong>Game / Logic Settings → Logic → OoT Items / MM Items / Shared Items</strong>.</p>
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
.obs-dim-input {
    width: 70px; flex-shrink: 0;
    background: var(--color-unchecked); color: var(--color-text);
    border: 1px solid var(--color-border); border-radius: 3px;
    padding: 1px 4px; font-size: 0.9em; text-align: right;
  }
  .obs-check { cursor: pointer; gap: 0.4em; }
  .obs-check input { cursor: pointer; }
  .obs-subtab-row { display: flex; gap: 0.3em; }
  .obs-subtab-btn {
    flex: 1; padding: 3px 6px; border: 1px solid var(--color-border); border-radius: 3px;
    background: transparent; color: var(--color-text); cursor: pointer; font-size: 0.82em;
  }
  .obs-subtab-btn.active { background: var(--color-border); font-weight: bold; }
  .obs-vis-hint { font-size: 0.78em; color: var(--color-header); margin: 0; }
  .obs-vis-grid {
    display: grid; grid-template-columns: 1fr auto auto;
    align-items: center; gap: 0.3em 0.8em;
  }
  .obs-vis-col-hdr { font-size: 0.78em; font-weight: bold; text-align: center; }
  .obs-vis-col-hdr.oot { color: #7ec8e3; }
  .obs-vis-col-hdr.mm { color: #b8a0d8; }
  .obs-vis-row-lbl { font-size: 0.82em; color: var(--color-text); }
  .obs-check-sm { display: flex; align-items: center; gap: 0.3em; cursor: pointer; color: var(--color-text); font-size: 0.82em; }
  .obs-check-sm input { cursor: pointer; }
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


  /* Souls */
  .souls-section { margin-bottom: 0.6em; }
  .soul-group-label { font-size: 0.65em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text); opacity: 0.45; margin: 0.5em 0 0.2em; padding-left: 2px; }
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