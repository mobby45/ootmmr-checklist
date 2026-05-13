<script lang="ts">
  import type { EntranceInfo } from '../data/entranceData';
  import { createEventDispatcher } from 'svelte';

  export let options: EntranceInfo[] = [];
  export let value: string = '';
  export let placeholder: string = 'Connects to...';

  const dispatch = createEventDispatcher<{ change: string }>();

  let search = '';
  let open = false;
  let editing = false;
  let highlightIndex = -1;
  let inputEl: HTMLInputElement;
  let dropdownEl: HTMLDivElement;
  let wrapEl: HTMLDivElement;
  let dropdownTop = 0;
  let dropdownLeft = 0;
  let dropdownMinWidth = 0;

  $: filtered = search.trim() === ''
    ? options.slice(0, 80)
    : options.filter(o => o.name.toLowerCase().includes(search.toLowerCase())).slice(0, 80);

  $: totalFiltered = search.trim() === ''
    ? options.length
    : options.filter(o => o.name.toLowerCase().includes(search.toLowerCase())).length;

  function updatePos() {
    if (!wrapEl) return;
    const rect = wrapEl.getBoundingClientRect();
    dropdownTop = rect.bottom + 2;
    dropdownLeft = rect.left;
    dropdownMinWidth = rect.width;
  }

  function startEditing() {
    editing = true;
    search = '';
    open = true;
    updatePos();
    setTimeout(() => inputEl?.focus(), 0);
  }

  function select(opt: EntranceInfo) {
    dispatch('change', opt.name);
    editing = false;
    open = false;
    search = '';
    highlightIndex = -1;
  }

  function clear(e: MouseEvent) {
    e.stopPropagation();
    dispatch('change', '');
    editing = false;
    open = false;
    search = '';
  }

  function handleInput() {
    open = true;
    highlightIndex = -1;
    updatePos();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      open = true;
      highlightIndex = Math.min(highlightIndex + 1, filtered.length - 1);
      scrollToHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightIndex = Math.max(highlightIndex - 1, 0);
      scrollToHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && filtered[highlightIndex]) {
        select(filtered[highlightIndex]);
      } else if (filtered.length === 1) {
        select(filtered[0]);
      }
    } else if (e.key === 'Escape') {
      editing = false;
      open = false;
      search = '';
    }
  }

  function scrollToHighlight() {
    if (!dropdownEl) return;
    const item = dropdownEl.querySelector(`[data-idx="${highlightIndex}"]`) as HTMLElement;
    item?.scrollIntoView({ block: 'nearest' });
  }

  function clickOutside(node: HTMLElement) {
    function handler(e: MouseEvent) {
      if (!node.contains(e.target as Node)) {
        editing = false;
        open = false;
        search = '';
      }
    }
    document.addEventListener('mousedown', handler, true);
    return { destroy: () => document.removeEventListener('mousedown', handler, true) };
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="es-wrap" bind:this={wrapEl} use:clickOutside>

  {#if editing}
    <!-- Edit mode: search input -->
    <div class="es-input-row">
      <input
        bind:this={inputEl}
        bind:value={search}
        type="text"
        class="es-input"
        placeholder="Search..."
        on:input={handleInput}
        on:keydown={handleKeydown}
        autocomplete="off"
        spellcheck="false"
      />
    </div>
  {:else}
    <!-- Display mode: clickable div -->
    <div class="es-display" class:filled={!!value} on:click={startEditing}>
      {#if value}
        <span class="es-display-value">{value}</span>
        <span class="es-clear" on:click={clear} title="Clear">✕</span>
      {:else}
        <span class="es-placeholder">{placeholder}</span>
      {/if}
    </div>
  {/if}

  <!-- Dropdown in fixed position to escape overflow -->
  {#if open && filtered.length > 0}
    <div
      class="es-dropdown"
      bind:this={dropdownEl}
      style="top:{dropdownTop}px; left:{dropdownLeft}px; min-width:{dropdownMinWidth}px; width:max-content;"
    >
      {#each filtered as opt, i}
        <div
          class="es-option"
          class:highlighted={i === highlightIndex}
          class:selected={opt.name === value}
          data-idx={i}
          on:mousedown|preventDefault={() => select(opt)}
          on:mouseover={() => highlightIndex = i}
          on:focus={() => highlightIndex = i}
        >
          <span class="es-opt-game es-opt-{opt.game}">{opt.game.toUpperCase()}</span>
          <span class="es-opt-name">{opt.name}</span>
        </div>
      {/each}
      {#if totalFiltered > 80}
        <div class="es-more">… {totalFiltered} results — refine your search</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .es-wrap {
    position: relative;
    width: 100%;
  }

  /* Mode affichage */
  .es-display {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 6px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-bg);
    cursor: pointer;
    font-size: 0.9em;
    min-height: 22px;
    gap: 4px;
  }
  .es-display:hover { border-color: rgba(255,255,255,0.3); }
  .es-display.filled { border-color: rgba(100,150,255,0.5); }

  .es-display-value {
    color: #4da8ff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }

  .es-placeholder {
    color: var(--color-text);
    opacity: 0.35;
    white-space: nowrap;
  }

  .es-clear {
    color: var(--color-text);
    opacity: 0.4;
    font-size: 0.75em;
    flex-shrink: 0;
    cursor: pointer;
    user-select: none;
    padding: 0 2px;
  }
  .es-clear:hover { opacity: 1; }

  /* Edit mode */
  .es-input-row { width: 100%; }
  .es-input {
    width: 100%;
    padding: 2px 6px;
    border: 1px solid #0078e7;
    border-radius: 3px;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.9em;
    outline: none;
    box-sizing: border-box;
  }

  /* Dropdown */
  .es-dropdown {
    position: fixed;
    max-width: 500px;
    max-height: 240px;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--color-bg, #1a1a2e);
    border: 1px solid var(--color-border, #444);
    border-radius: 4px;
    z-index: 9999;
    box-shadow: 0 4px 16px rgba(0,0,0,0.6);
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.15) transparent;
  }
  .es-dropdown::-webkit-scrollbar { width: 4px; }
  .es-dropdown::-webkit-scrollbar-track { background: transparent; }
  .es-dropdown::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }

  .es-option {
    display: flex;
    align-items: center;
    gap: 0.4em;
    padding: 5px 8px;
    cursor: pointer;
    font-size: 0.82em;
    white-space: nowrap;
  }
  .es-option:hover,
  .es-option.highlighted { background: rgba(0,120,231,0.2); }
  .es-option.selected { background: rgba(0,120,231,0.1); }

  .es-opt-game {
    font-size: 0.7em;
    font-weight: bold;
    padding: 1px 3px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .es-opt-oot { background: #2a5a2a; color: #7ec87e; }
  .es-opt-mm  { background: #2a2a5a; color: #7e7ec8; }

  .es-opt-name { color: var(--color-text); }
  .es-option.selected .es-opt-name { color: #4da8ff; }

  .es-more {
    padding: 5px 8px;
    font-size: 0.78em;
    opacity: 0.5;
    font-style: italic;
    text-align: center;
  }
</style>