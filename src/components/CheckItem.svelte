<script lang="ts">
  import * as T from '../data/types';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

export let name = '';
export let vanillaItem = '';
export let type: any;
export let state = T.CheckState.unchecked;
export let shopItem: string = '';
export let shopPrice: number | null = null;
export let isShop: boolean = false;
export let showPrice: boolean = true;
export let spoilerItem: string = '';
export let author: string = '';
export let pingColor: string = '';
export let note: string = '';
export let compact: boolean = false;
export let woth: boolean = false;
export let barren: boolean = false;
export let disableTypeColor: boolean = false;
export let highlighted: boolean = false;
export let spiderHouse: boolean = false;
export let checkName: string = '';
export let zone: string = '';
export let filter: string = '';

$: isShopOrScrub = shopTypes.includes(type) || isShop;
const shopTypes = [T.CheckType.shop, T.CheckType.scrub];

type TypeColors = { bg: string; border: string } | null;

function typeColors(t: T.CheckType): TypeColors {
  switch (t) {
    case T.CheckType.gs:         return { bg: 'rgba(255,190,0,0.18)',    border: '#c8960a' };
    case T.CheckType.scrub:
    case T.CheckType.shop:       return { bg: 'rgba(40,180,80,0.18)',    border: '#2a9e50' };
    case T.CheckType.cow:        return { bg: 'rgba(210,175,110,0.20)',  border: '#b08040' };
    case T.CheckType.sf:
    case T.CheckType.fairy:
    case T.CheckType.fairy_spot: return { bg: 'rgba(0,210,230,0.16)',    border: '#00b8cc' };
    case T.CheckType.sr:         return { bg: 'rgba(160,160,220,0.18)',  border: '#8888cc' };
    case T.CheckType.pot:
    case T.CheckType.crate:
    case T.CheckType.barrel:
    case T.CheckType.hive:       return { bg: 'rgba(180,120,40,0.18)',   border: '#9a6820' };
    case T.CheckType.grass:
    case T.CheckType.tree:
    case T.CheckType.bush:
    case T.CheckType.soil:
    case T.CheckType.snowball:   return { bg: 'rgba(70,150,60,0.16)',    border: '#4a9640' };
    case T.CheckType.rock:
    case T.CheckType.redboulder:
    case T.CheckType.icicle:
    case T.CheckType.redice:     return { bg: 'rgba(200,65,50,0.15)',    border: '#b04030' };
    case T.CheckType.rupee:
    case T.CheckType.heart:
    case T.CheckType.wonder:
    case T.CheckType.fish:
    case T.CheckType.butterfly:
    case T.CheckType.collectible:
    case T.CheckType.npc:        return { bg: 'rgba(65,135,255,0.15)',   border: '#4488dd' };
    default:                     return null;
  }
}

$: tc = typeColors(type);
$: typeBg     = disableTypeColor ? '' : (tc?.bg ?? '');
$: typeBorder = disableTypeColor ? '' : (tc?.border ?? '');

const typeLabels: Partial<Record<T.CheckType, string>> = {
  [T.CheckType.chest]: 'Chest', [T.CheckType.gs]: 'Gold Skulltula',
  [T.CheckType.scrub]: 'Scrub', [T.CheckType.shop]: 'Shop',
  [T.CheckType.cow]: 'Cow', [T.CheckType.sf]: 'Stray Fairy',
  [T.CheckType.fairy]: 'Fairy', [T.CheckType.fairy_spot]: 'Fairy Spot',
  [T.CheckType.sr]: 'Silver Rupee', [T.CheckType.pot]: 'Pot',
  [T.CheckType.crate]: 'Crate', [T.CheckType.barrel]: 'Barrel',
  [T.CheckType.hive]: 'Beehive', [T.CheckType.grass]: 'Grass',
  [T.CheckType.rock]: 'Rock', [T.CheckType.tree]: 'Tree',
  [T.CheckType.bush]: 'Bush', [T.CheckType.soil]: 'Soil Patch',
  [T.CheckType.rupee]: 'Rupee', [T.CheckType.heart]: 'Heart',
  [T.CheckType.wonder]: 'Wonder Item', [T.CheckType.snowball]: 'Snowball',
  [T.CheckType.butterfly]: 'Butterfly', [T.CheckType.redboulder]: 'Red Boulder',
  [T.CheckType.icicle]: 'Icicle', [T.CheckType.redice]: 'Red Ice',
  [T.CheckType.fish]: 'Fish', [T.CheckType.collectible]: 'Collectible',
  [T.CheckType.npc]: 'NPC',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightText(text: string, query: string): string {
  if (!query || query.trim().length < 2) return escapeHtml(text);
  const q = query.trim();
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  return escapeHtml(text.slice(0, idx))
    + `<mark class="filter-mark">${escapeHtml(text.slice(idx, idx + q.length))}</mark>`
    + escapeHtml(text.slice(idx + q.length));
}

function formatItem(item: string): string {
  if (!item || item === 'NONE') return '';
  return item
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

$: tooltip = [
  typeLabels[type as T.CheckType] ?? '',
  formatItem(vanillaItem) ? `Item: ${formatItem(vanillaItem)}` : '',
  zone ? `Zone: ${zone}` : '',
].filter(Boolean).join('\n');

  $: checked = state == (T.CheckState.checked as T.CheckState);
  $: marked = state == (T.CheckState.marked as T.CheckState);

  function handleContextMenu(e: MouseEvent) {
    if (e.ctrlKey) {
      if (isShopOrScrub) dispatch('shopEdit', { range: e.shiftKey ?? false });
      else dispatch('editNote');
    } else {
      dispatch('mark', { range: e.shiftKey ?? false });
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<button
  class="check-item interactable"
  class:checked
  class:marked
  class:woth
  class:barren
  class:pinged={!!pingColor}
  class:highlighted
  class:spider-house
  class:compact
  data-check={checkName}
  style="{pingColor ? `--ping-color: ${pingColor};` : ''}{typeBg ? `--type-bg: ${typeBg};` : ''}{typeBorder ? `--type-border: ${typeBorder};` : ''}"
  title={tooltip}
  on:click|preventDefault={e => dispatch('toggle', { range: e.shiftKey ?? false })}
  on:contextmenu|preventDefault={handleContextMenu}
>
  <span class:crossed-out={checked}>{@html highlightText(name, filter)}</span>
  {#if isShopOrScrub}
    {#if shopItem}
      <span class="shop-info shop-item">{shopItem}</span>
    {/if}
    {#if shopPrice !== null && showPrice}
      <span class="shop-price" style="color: #00cc44;">({shopPrice} ◆)</span>
    {/if}
  {/if}
  {#if checked && spoilerItem}
    <span class="spoiler-item">→ {spoilerItem}</span>
  {/if}
  {#if note}
    <span class="shop-info shop-item">✎ {note}</span>
  {/if}
  {#if author && (checked || marked)}
    <span class="author-badge">{author}</span>
  {/if}
</button>

<style>
  .check-item {
    border: 1px solid lightblue;
    border-left: 3px solid var(--type-border, lightblue);
    border-radius: 5px;
    padding: 5px;
    margin: 2px;
    user-select: none;
    text-align: left;
    color: var(--color-text);
    background-color: var(--type-bg, var(--color-unchecked));

    &.marked {
      background-color: var(--color-marked);
      font-weight: bold;
      box-shadow: rgba(0, 0, 0, 0.15) 2.4px 2.4px 3.2px;
    }

    &.checked {
      background-color: var(--color-checked);
      opacity: 0.6;
    }

    &.woth {
      border-left-color: #3a7bd5;
    }
    &.woth:not(.checked) {
      background-image: linear-gradient(rgba(58,123,213,0.13), rgba(58,123,213,0.13));
    }
    &.barren {
      border-left-color: #cc3333;
    }
    &.barren:not(.checked) {
      background-image: linear-gradient(rgba(200,50,50,0.11), rgba(200,50,50,0.11));
    }

    &:focus {
      outline: 1px auto #129fea;
    }

    &.compact {
      padding: 2px 4px;
      margin: 1px;
      font-size: 0.88em;
    }

    &.pinged {
      border-color: var(--ping-color);
      animation: check-ping-glow 1.5s ease-in-out infinite;
    }

    &.highlighted {
      animation: check-highlight 2s ease-out forwards;
    }

    &.spider-house {
      background-image: linear-gradient(135deg, rgba(120, 80, 200, 0.15), rgba(120, 80, 200, 0.05));
      border-left-color: #8855cc;
    }
    &.spider-house.checked {
      background-image: none;
      border-left-color: #8855cc;
    }
  }

  @keyframes check-ping-glow {
    0%, 100% { box-shadow: 0 0 0 1px var(--ping-color); }
    50%       { box-shadow: 0 0 8px 3px var(--ping-color); }
  }

  @keyframes check-highlight {
    0%   { box-shadow: 0 0 0 2px #f0c040, 0 0 12px 4px rgba(240,192,64,0.6); }
    60%  { box-shadow: 0 0 0 2px #f0c040, 0 0 12px 4px rgba(240,192,64,0.4); }
    100% { box-shadow: none; }
  }
  .author-badge {
    display: inline-block;
    margin-left: 4px;
    padding: 0 4px;
    font-size: 0.7em;
    border-radius: 3px;
    background: rgba(100, 160, 255, 0.25);
    color: #7eb8ff;
    vertical-align: middle;
    font-weight: bold;
  }

  :global(.filter-mark) {
    background: #c8960a55;
    color: inherit;
    border-radius: 2px;
    padding: 0 1px;
  }

  .crossed-out {
    text-decoration-line: line-through;
    box-shadow: none;
  }
  .shop-info {
    font-size: 0.85em;
    opacity: 0.8;
    margin-left: 4px;
  }
  .shop-item {
    color: #7ec8e3;
    font-style: italic;
  }
  .shop-price {
    color: #ffd700;
  }
  .spoiler-item {
    font-size: 0.85em;
    margin-left: 4px;
    color: #f0a500;
    font-style: italic;
  }
</style>