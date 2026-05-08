<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let groupName = '';
  export let canBeMq = false;
  export let isMq = false;
  export let canHaveVariant = false;
  export let variant = 0;
  export let forceOpen: boolean = true;
  export let forceOpenTimestamp: number = Date.now();
  export let allChecked: boolean = false;
  export let checkCount: { checked: number; total: number } = { checked: 0, total: 0 };
  export let pingColor: string = '';
  export let compact: boolean = false;
  export let woth: boolean = false;
  export let barren: boolean = false;

  let isOpen = forceOpen;
  let lastTimestamp = forceOpenTimestamp;
  let prevAllChecked = allChecked;
  $: pct = checkCount.total ? Math.round(checkCount.checked / checkCount.total * 100) : 0;

  $: if (forceOpenTimestamp !== lastTimestamp) {
    isOpen = forceOpen;
    lastTimestamp = forceOpenTimestamp;
  }

  // Auto-collapse when all checks in the group become completed
  $: {
    if (allChecked && !prevAllChecked && checkCount.total > 0) isOpen = false;
    prevAllChecked = allChecked;
  }

  function toggleOpen() {
    isOpen = !isOpen;
    dispatch('individualToggle', { groupName, isOpen });
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="check-group">
  <h3 class="header" style="border-image: linear-gradient(to right, {allChecked ? '#2e7d32' : '#3a7bd5'} {pct}%, var(--color-border) {pct}%) 1;">
    <span
      class="ping-zone"
      class:pinged={!!pingColor}
      style={pingColor ? `--ping-color: ${pingColor}` : ''}
    >
      <span class="interactable" on:click|preventDefault={() => dispatch('openMap')}>🗺️</span>
      <span class="arrow interactable" on:click={toggleOpen}>{isOpen ? '▼' : '▶'}</span>
      <span
        class="interactable"
        on:click|preventDefault={e => dispatch('toggleGroup')}
        on:contextmenu|preventDefault={e => dispatch('markGroup')}
      >
        <strong class:completed={allChecked}>{groupName}</strong>
      </span>
      <span class="check-count" class:completed={allChecked}>{checkCount.checked}/{checkCount.total}</span>
      {#if woth}<span class="hint-pill woth-pill">WotH</span>{/if}
      {#if barren}<span class="hint-pill barren-pill">Barren</span>{/if}
    </span>
    {#if canBeMq}
      <span class="interactable" on:click|preventDefault={e => dispatch('toggleMq')}
        ><strong>{isMq ? '(MQ)' : '(Vanilla)'}</strong></span
      >
    {/if}
    {#if canHaveVariant}
      <span class="interactable" on:click|preventDefault={e => dispatch('cycleVariant')}
        ><strong>({variant === 0 ? 'US' : 'JP'})</strong></span
      >
    {/if}
  </h3>
  {#if isOpen}
    <div class="checks-container" class:compact>
      <slot />
    </div>
  {/if}
</div>

<style>
  .header {
    color: var(--color-header);
    border-bottom: 1px solid var(--color-border);
    font-weight: normal;
    width: 100%;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .arrow {
    font-size: 0.8em;
    cursor: pointer;
    display: inline-block;
    min-width: 1em;
  }

  .header::-webkit-details-marker {
    display: none;
  }

  .checks-container {
    margin: 5px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(max(16em, 12%), 1fr));
  }
  .checks-container.compact {
    grid-template-columns: repeat(auto-fill, minmax(max(11em, 9%), 1fr));
  }

  strong.completed {
    text-decoration: line-through;
    color: #999;
  }

  .ping-zone {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 4px;
    padding: 1px 4px;
  }

  .ping-zone.pinged {
    outline: 2px solid var(--ping-color);
    animation: group-ping 1.5s ease-in-out infinite;
  }

  @keyframes group-ping {
    0%, 100% { box-shadow: 0 0 2px 1px var(--ping-color); }
    50%       { box-shadow: 0 0 8px 3px var(--ping-color); }
  }

  .check-count {
    font-size: 0.8em;
    color: var(--color-text);
    opacity: 0.7;
  }

  .check-count.completed {
    color: #999;
  }

  .hint-pill {
    font-size: 0.65em;
    font-weight: bold;
    padding: 1px 5px;
    border-radius: 3px;
    flex-shrink: 0;
    letter-spacing: 0.02em;
  }
  .woth-pill   { background: #1a4a8a; color: #7eb8ff; }
  .barren-pill { background: #333; color: #888; }
</style>