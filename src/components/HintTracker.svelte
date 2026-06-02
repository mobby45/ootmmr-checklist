<script lang="ts">
  import type { Array as YArray, Map as YMap } from 'yjs';
  import { allTrackerItems } from '../data/itemData';
  import { sharedToOot, sharedToMm, ootToShared, mmToShared } from '../data/sharedSync';

  export let yHints: YArray<any>;
  export let hints: any[] = [];
  export let notesEntries: { id: string; text: string; group: string }[] = [];
  export let shopEntries: { id: string; item: string; price: number | null; group: string }[] = [];
  export let onEditNote: ((id: string) => void) | null = null;
  export let onEditShop: ((id: string) => void) | null = null;
  export let onDeleteNote: ((id: string) => void) | null = null;
  export let onDeleteShop: ((id: string) => void) | null = null;
  export let isWatchMode = false;
  export let ySongEvents: YMap<string> | null = null;
  export let yItems: YMap<number> | null = null;


  $: annotationCount = notesEntries.length + shopEntries.length;

  type AnnotationEntry =
    | { kind: 'note'; id: string; text: string; group: string }
    | { kind: 'shop'; id: string; item: string; price: number | null; group: string };

  $: groupedAnnotations = (() => {
    const all: AnnotationEntry[] = [
      ...notesEntries.map(e => ({ ...e, kind: 'note' as const })),
      ...shopEntries.map(e => ({ ...e, kind: 'shop' as const })),
    ].sort((a, b) => a.group.localeCompare(b.group) || a.id.localeCompare(b.id));
    const groups: { group: string; items: AnnotationEntry[] }[] = [];
    for (const item of all) {
      const last = groups[groups.length - 1];
      if (last && last.group === item.group) last.items.push(item);
      else groups.push({ group: item.group || '—', items: [item] });
    }
    return groups;
  })();

  type HintType = 'woth' | 'barren' | 'location' | 'item' | 'junk' | 'other';

  const hintTypes: { id: HintType; label: string; color: string }[] = [
    { id: 'woth',     label: 'WotH',     color: '#3a7bd5' },
    { id: 'barren',   label: 'Barren',   color: '#cc3333' },
    { id: 'location', label: 'Location', color: '#2ecc71' },
    { id: 'item',     label: 'Item',     color: '#e67e22' },
    { id: 'junk',     label: 'Junk',     color: '#555' },
    { id: 'other',    label: 'Other',    color: '#9b59b6' },
  ];

  // Song Events Shuffle data — separate OoT and MM event lists
  const OOT_SONG_EVENTS: ({ label: string } | null)[] = [
    { label: 'ToT Door of Time' },
    { label: 'HC Great Fairy' },
    { label: 'Royal Family\'s Tomb' },
    { label: 'GC Darunia\'s Room' },
    { label: 'DMTrail Great Fairy' },
    { label: 'ZR Waterfall' },
    { label: 'ZF Great Fairy' },
    { label: 'Kakariko Windmill' },
    { label: 'BotW Water Level' },
    { label: 'DMCrater Great Fairy' },
    null,
    { label: 'Desert Great Fairy' },
    { label: 'Spirit Temple Statue' },
    { label: 'Spirit Temple Lower' },
    { label: 'Spirit Temple Upper' },
    { label: 'Shadow Temple Boat' },
    { label: 'OGC Great Fairy' },
    { label: 'Ganon Light Trial' },
  ];

  const MM_SONG_EVENTS: ({ label: string } | null)[] = [
    { label: 'CTR Moon Access' },
    { label: 'Heal Kamaro' },
    { label: 'Woodfall Entrance' },
    { label: 'Wake SSH Deku Scrub' },
    { label: 'Shrine Goron Baby' },
    { label: 'Heal Darmani' },
    { label: 'Snowhead Entrance' },
    { label: 'Heal Mikau' },
    { label: 'Great Bay Entrance' },
    { label: 'Wake Captain Keeta' },
    { label: 'Lift Ikana\'s Curse' },
    { label: 'Heal Pamala\'s Father' },
    null, null, null, null, null, null,
  ];

  const songChoices = allTrackerItems.filter(i => i.category === 'songs' && i.maxLevel >= 1);

  let songEventMap: Record<string, string> = {};
  $: if (ySongEvents) {
    ySongEvents.observe(() => { songEventMap = Object.fromEntries(ySongEvents!.entries()); });
    songEventMap = Object.fromEntries(ySongEvents.entries());
  }

  let itemMap: Record<string, number> = {};
  $: if (yItems) {
    yItems.observe(() => { itemMap = Object.fromEntries(yItems!.entries()); });
    itemMap = Object.fromEntries(yItems.entries());
  }

  function setSongEvent(key: string, songId: string) {
    if (isWatchMode || !ySongEvents) return;
    if (songId) ySongEvents.set(key, songId);
    else ySongEvents.delete(key);
  }

  function isSongObtained(songId: string): boolean {
    if ((itemMap[songId] ?? 0) > 0) return true;
    // Check via shared ↔ game-specific counterparts
    const shId = ootToShared[songId] ?? mmToShared[songId] ?? (songId.startsWith('sh_') ? songId : null);
    if (shId) {
      if ((itemMap[shId] ?? 0) > 0) return true;
      for (const id of (sharedToOot[shId] ?? [])) if ((itemMap[id] ?? 0) > 0) return true;
      for (const id of (sharedToMm[shId] ?? []))  if ((itemMap[id] ?? 0) > 0) return true;
    }
    return false;
  }

  function selectValue(e: Event): string {
    return (e.target as HTMLSelectElement | null)?.value ?? '';
  }

  let view: 'hints' | 'notes' | 'songs' = 'hints';
  let newText = '';
  let newType: HintType = 'woth';
  let filterType: HintType | 'all' = 'all';
  let notesFilter = '';
  let copiedId = '';

  async function copyHint(id: string, type: HintType, text: string) {
    await navigator.clipboard.writeText(`${typeLabel(type)}: ${text}`);
    copiedId = id;
    setTimeout(() => { copiedId = ''; }, 1500);
  }

  function addHint() {
    if (isWatchMode) return;
    const text = newText.trim();
    if (!text) return;

    // WotH and Barren are mutually exclusive — remove conflicting hints of the opposite type
    if (newType === 'woth' || newType === 'barren') {
      const opposite = newType === 'woth' ? 'barren' : 'woth';
      const tl = text.toLowerCase();
      for (let i = hints.length - 1; i >= 0; i--) {
        const h = hints[i];
        if (h.type === opposite) {
          const hl = h.text.toLowerCase();
          if (tl.includes(hl) || hl.includes(tl)) yHints.delete(i, 1);
        }
      }
    }

    yHints.push([{ id: crypto.randomUUID(), text, type: newType, ts: Date.now() }]);
    newText = '';
  }

  function removeHint(id: string) {
    if (isWatchMode) return;
    const idx = hints.findIndex(h => h.id === id);
    if (idx !== -1) yHints.delete(idx, 1);
  }

  function clearAll() {
    if (isWatchMode) return;
    if (!confirm('Clear all hints?')) return;
    yHints.delete(0, yHints.length);
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addHint(); }
  }

  $: filtered = filterType === 'all' ? hints : hints.filter(h => h.type === filterType);
  $: if (filterType !== 'all' && hints.filter(h => h.type === filterType).length === 0) filterType = 'all';

  $: filteredAnnotations = (() => {
    const q = notesFilter.trim().toLowerCase();
    if (!q) return groupedAnnotations;
    return groupedAnnotations
      .map(g => ({
        ...g,
        items: g.items.filter(e =>
          e.id.toLowerCase().includes(q) ||
          (e.kind === 'note' ? e.text : e.item).toLowerCase().includes(q) ||
          g.group.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.items.length > 0);
  })();

  function typeColor(t: HintType): string {
    return hintTypes.find(x => x.id === t)?.color ?? '#888';
  }
  function typeLabel(t: HintType): string {
    return hintTypes.find(x => x.id === t)?.label ?? t;
  }
</script>

<div class="hint-tracker">
  <!-- Tab toggle -->
  <div class="tab-row">
    <button class="tab-btn" class:active={view === 'hints'} on:click={() => view = 'hints'}>
      Hints {#if hints.length > 0}<span class="tab-count">{hints.length}</span>{/if}
    </button>
    <button class="tab-btn" class:active={view === 'notes'} on:click={() => view = 'notes'}>
      Notes {#if annotationCount > 0}<span class="tab-count">{annotationCount}</span>{/if}
    </button>
    <button class="tab-btn" class:active={view === 'songs'} on:click={() => view = 'songs'}>
      Songs
    </button>
  </div>

  {#if view === 'hints'}
    <!-- Add form -->
    <div class="hint-add">
      <div class="type-row">
        {#each hintTypes as t}
          <button
            class="type-btn"
            class:active={newType === t.id}
            style="--tc: {t.color}"
            on:click={() => newType = t.id}
            disabled={isWatchMode}
          >{t.label}</button>
        {/each}
      </div>
      <div class="input-row">
        <textarea
          class="hint-input"
          placeholder="Enter hint text… (Enter to add)"
          bind:value={newText}
          on:keydown={handleKey}
          rows="2"
          disabled={isWatchMode}
        ></textarea>
        <button class="add-btn" on:click={addHint} disabled={!newText.trim() || isWatchMode}>Add</button>
      </div>
    </div>

    <!-- Filter + Clear -->
    <div class="filter-row">
      <span class="filter-label">Filter:</span>
      <button class="filter-btn" class:active={filterType === 'all'} on:click={() => filterType = 'all'}>All ({hints.length})</button>
      {#each hintTypes as t}
        {@const count = hints.filter(h => h.type === t.id).length}
        {#if count > 0}
          <button
            class="filter-btn"
            class:active={filterType === t.id}
            style="--tc: {t.color}"
            on:click={() => filterType = t.id}
          >{t.label} ({count})</button>
        {/if}
      {/each}
      {#if hints.length > 0}
        <button class="clear-all-btn" on:click={clearAll} disabled={isWatchMode}>Clear all</button>
      {/if}
    </div>

    <!-- List -->
    {#if filtered.length === 0}
      <p class="empty">No hints yet.</p>
    {:else}
      <ul class="hint-list">
        {#each filtered as hint (hint.id)}
          <li class="hint-item">
            <span class="hint-badge" style="background: {typeColor(hint.type)}">{typeLabel(hint.type)}</span>
            <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
            <span class="hint-text" on:click={() => copyHint(hint.id, hint.type, hint.text)} title="Click to copy" style="cursor:copy">
              {#if copiedId === hint.id}<span class="hint-copied">✓ Copied</span>{:else}{hint.text}{/if}
            </span>
            <button class="del-btn" on:click={() => removeHint(hint.id)} title="Delete" disabled={isWatchMode}>✕</button>
          </li>
        {/each}
      </ul>
    {/if}

  {:else if view === 'notes'}
    <!-- Notes + Shops grid -->
    {#if annotationCount === 0}
      <p class="empty">No notes or shops yet.</p>
    {:else}
      <div class="notes-filter-wrap">
        <input
          class="notes-filter-input"
          type="text"
          placeholder="Filter notes…"
          bind:value={notesFilter}
        />
        {#if notesFilter}
          <button class="notes-filter-clear" on:click={() => notesFilter = ''}>✕</button>
        {/if}
      </div>
      {#if filteredAnnotations.length === 0}
        <p class="empty">No match.</p>
      {/if}
      {#each filteredAnnotations as grp (grp.group)}
        <div class="annotation-group-label">{grp.group}</div>
        <div class="annotation-grid">
          {#each grp.items as entry (entry.id)}
            <div class="annotation-card">
              <div class="annotation-header">
                <span class="annotation-badge" class:note-badge={entry.kind === 'note'} class:shop-badge={entry.kind === 'shop'}>
                  {entry.kind === 'note' ? 'Note' : 'Shop'}
                </span>
                <span class="annotation-name" title={entry.id}>{entry.id}</span>
                {#if entry.kind === 'note' && onEditNote && !isWatchMode}
                  <button class="annotation-edit" on:click={() => onEditNote?.(entry.id)} title="Edit">✎</button>
                {/if}
                {#if entry.kind === 'shop' && onEditShop && !isWatchMode}
                  <button class="annotation-edit" on:click={() => onEditShop?.(entry.id)} title="Edit">✎</button>
                {/if}
                {#if entry.kind === 'note' && onDeleteNote && !isWatchMode}
                  <button class="annotation-del" on:click={() => onDeleteNote?.(entry.id)} title="Delete">✕</button>
                {/if}
                {#if entry.kind === 'shop' && onDeleteShop && !isWatchMode}
                  <button class="annotation-del" on:click={() => onDeleteShop?.(entry.id)} title="Delete">✕</button>
                {/if}
              </div>
              <div class="annotation-body">
                {#if entry.kind === 'note'}
                  {entry.text}
                {:else}
                  <span class="shop-item-text">{entry.item}</span>
                  {#if entry.price !== null}
                    <span class="shop-price-text">{entry.price} ◆</span>
                  {/if}
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/each}
    {/if}
  {:else if view === 'songs'}
    <!-- Song Events Shuffle — side-by-side OoT / MM -->
    <div class="se-tracker">
      <div class="se-col se-col-oot">
        <div class="se-title">Ocarina of Time</div>
        <div class="se-header-row">
          <span class="se-h se-h-event">Song Event</span>
          <span class="se-h se-h-song">Required Song</span>
          <span class="se-h se-h-done">Done?</span>
        </div>
        <div class="se-rows">
          {#each OOT_SONG_EVENTS as evt, i}
            {#if evt === null}
              <div class="se-row se-row-na">
                <span class="se-cell se-cell-event se-na">N/A</span>
                <span class="se-cell se-cell-song se-na">N/A</span>
                <span class="se-cell se-cell-done se-na">N/A</span>
              </div>
            {:else}
              {@const sk = 'oot_' + i}
              {@const selectedId = songEventMap[sk] ?? ''}
              {@const obtained = selectedId ? isSongObtained(selectedId) : false}
              <div class="se-row">
                <span class="se-cell se-cell-event">{evt.label}</span>
                <span class="se-cell se-cell-song">
                  <span class="se-song-pill">
                    <select
                      value={selectedId}
                      on:change={e => setSongEvent(sk, selectValue(e))}
                      disabled={isWatchMode}
                      class="se-select"
                    >
                      <option value="">—</option>
                      {#each songChoices as song}
                        <option value={song.id}>{song.name}</option>
                      {/each}
                    </select>
                  </span>
                </span>
                <span class="se-cell se-cell-done">
                  {#if obtained}
                    <span class="se-ok">Yes</span>
                  {:else}
                    <span class="se-no">No</span>
                  {/if}
                </span>
              </div>
            {/if}
          {/each}
        </div>
      </div>
      <div class="se-col se-col-mm">
        <div class="se-title">Majora's Mask</div>
        <div class="se-header-row">
          <span class="se-h se-h-event">Song Event</span>
          <span class="se-h se-h-song">Required Song</span>
          <span class="se-h se-h-done">Done?</span>
        </div>
        <div class="se-rows">
          {#each MM_SONG_EVENTS as evt, i}
            {#if evt === null}
              <div class="se-row se-row-na">
                <span class="se-cell se-cell-event se-na">N/A</span>
                <span class="se-cell se-cell-song se-na">N/A</span>
                <span class="se-cell se-cell-done se-na">N/A</span>
              </div>
            {:else}
              {@const sk = 'mm_' + i}
              {@const selectedId = songEventMap[sk] ?? ''}
              {@const obtained = selectedId ? isSongObtained(selectedId) : false}
              <div class="se-row">
                <span class="se-cell se-cell-event">{evt.label}</span>
                <span class="se-cell se-cell-song">
                  <span class="se-song-pill">
                    <select
                      value={selectedId}
                      on:change={e => setSongEvent(sk, selectValue(e))}
                      disabled={isWatchMode}
                      class="se-select"
                    >
                      <option value="">—</option>
                      {#each songChoices as song}
                        <option value={song.id}>{song.name}</option>
                      {/each}
                    </select>
                  </span>
                </span>
                <span class="se-cell se-cell-done">
                  {#if obtained}
                    <span class="se-ok">Yes</span>
                  {:else}
                    <span class="se-no">No</span>
                  {/if}
                </span>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .hint-tracker { margin-top: 0.6em; display: flex; flex-direction: column; gap: 0.6em; }

  .tab-row { display: flex; gap: 0.4em; border-bottom: 1px solid var(--color-border); padding-bottom: 0.4em; }

  .tab-btn {
    padding: 2px 10px;
    border: 1px solid var(--color-border);
    border-radius: 3px 3px 0 0;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    font-size: 0.85em;
    opacity: 0.5;
  }
  .tab-btn.active { opacity: 1; background: var(--color-border); font-weight: bold; }

  .tab-count {
    display: inline-block;
    background: rgba(255,255,255,0.15);
    border-radius: 8px;
    padding: 0 5px;
    font-size: 0.85em;
    margin-left: 3px;
  }

  .hint-add { display: flex; flex-direction: column; gap: 0.4em; }

  .type-row { display: flex; flex-wrap: wrap; gap: 0.3em; }

  .type-btn {
    padding: 2px 8px;
    border: 1px solid var(--tc, #888);
    border-radius: 3px;
    background: transparent;
    color: var(--tc, #888);
    cursor: pointer;
    font-size: 0.8em;
    opacity: 0.5;
  }
  .type-btn.active { background: var(--tc, #888); color: #fff; opacity: 1; }

  .input-row { display: flex; gap: 0.4em; align-items: flex-end; }

  .hint-input {
    flex: 1;
    padding: 4px 6px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.85em;
    resize: vertical;
    min-height: 2.5em;
  }

  .add-btn {
    padding: 4px 12px;
    border: none;
    border-radius: 4px;
    background: #3a7bd5;
    color: #fff;
    cursor: pointer;
    font-size: 0.85em;
    height: fit-content;
  }
  .add-btn:disabled { opacity: 0.4; cursor: default; }

  .filter-row { display: flex; flex-wrap: wrap; gap: 0.3em; align-items: center; }

  .filter-label { font-size: 0.8em; color: var(--color-text); opacity: 0.6; }

  .filter-btn {
    padding: 1px 7px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    font-size: 0.78em;
    opacity: 0.6;
  }
  .filter-btn.active { opacity: 1; font-weight: bold; border-color: var(--tc, var(--color-border)); color: var(--tc, var(--color-text)); }

  .clear-all-btn {
    margin-left: auto;
    padding: 1px 7px;
    border: 1px solid rgba(200, 50, 50, 0.4);
    border-radius: 3px;
    background: transparent;
    color: var(--color-danger, #c00);
    cursor: pointer;
    font-size: 0.78em;
    opacity: 0.7;
  }
  .clear-all-btn:hover { opacity: 1; }

  .empty { font-size: 0.85em; opacity: 0.5; margin: 0; }

  .hint-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35em; }

  .hint-item {
    display: flex;
    align-items: baseline;
    gap: 0.5em;
    padding: 4px 6px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.85em;
  }

  .hint-badge {
    flex-shrink: 0;
    font-size: 0.75em;
    font-weight: bold;
    padding: 1px 5px;
    border-radius: 3px;
    color: #fff;
  }

  .notes-filter-wrap {
    position: relative;
    margin-bottom: 0.4em;
  }
  .notes-filter-input {
    width: 100%;
    box-sizing: border-box;
    padding: 3px 24px 3px 7px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.83em;
  }
  .notes-filter-clear {
    position: absolute;
    right: 4px; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: var(--color-text);
    opacity: 0.5; cursor: pointer; font-size: 0.8em; padding: 0 2px;
  }
  .notes-filter-clear:hover { opacity: 1; }

  .hint-copied { color: #2ecc71; font-style: italic; font-size: 0.9em; }

  .annotation-group-label {
    font-size: 0.78em;
    font-weight: bold;
    color: var(--color-text);
    opacity: 0.5;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 2px;
    margin-top: 0.4em;
  }
  .annotation-group-label:first-child { margin-top: 0; }

  .annotation-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    margin-bottom: 0.3em;
  }

  .annotation-card {
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
    flex: 0 1 auto;
    min-width: 8em;
    max-width: 100%;
  }

  .annotation-header {
    display: flex;
    align-items: center;
    gap: 0.4em;
    min-width: 0;
  }

  .annotation-badge {
    flex-shrink: 0;
    font-size: 0.7em;
    font-weight: bold;
    padding: 1px 5px;
    border-radius: 3px;
  }
  .note-badge  { background: #5a3a9a; color: #ddd; }
  .shop-badge  { background: #2a5a7a; color: #ddd; }

  .annotation-name {
    flex: 1;
    font-size: 0.78em;
    font-weight: bold;
    color: var(--color-text);
    opacity: 0.7;
    white-space: nowrap;
  }

  .annotation-edit {
    flex-shrink: 0;
    background: none;
    border: none;
    color: #7eb8ff;
    cursor: pointer;
    font-size: 0.9em;
    padding: 0 2px;
    opacity: 0.6;
  }
  .annotation-edit:hover { opacity: 1; }

  .annotation-del {
    flex-shrink: 0;
    background: none;
    border: none;
    color: var(--color-danger, #c00);
    cursor: pointer;
    font-size: 0.85em;
    padding: 0 2px;
    opacity: 0.5;
  }
  .annotation-del:hover { opacity: 1; }

  .annotation-body {
    font-size: 0.85em;
    color: var(--color-text);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .shop-item-text { color: #7ec8e3; font-style: italic; }
  .shop-price-text { margin-left: 0.4em; color: #ffd700; }

  .hint-text { flex: 1; color: var(--color-text); white-space: pre-wrap; word-break: break-word; }

  .del-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    color: var(--color-danger, #c00);
    cursor: pointer;
    font-size: 0.85em;
    padding: 0 2px;
    opacity: 0.5;
  }
  .del-btn:hover { opacity: 1; }

  .se-tracker {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    overflow: hidden;
    font-size: 0.8em;
  }
  .se-col { display: flex; flex-direction: column; min-width: 0; }
  .se-col-oot { border-right: 2px solid var(--color-border); }
  .se-title {
    text-align: center;
    font-weight: bold;
    font-size: 1em;
    padding: 0.4em 0.5em;
    background: var(--color-primary);
    color: var(--color-text);
  }
  .se-header-row {
    display: grid;
    grid-template-columns: 1fr 1.2fr 0.6fr;
    background: var(--color-border);
    color: var(--color-text);
    font-weight: bold;
    text-align: center;
    border-bottom: 1px solid var(--color-border);
  }
  .se-h { padding: 0.3em 0.3em; }
  .se-rows { display: flex; flex-direction: column; }
  .se-row {
    display: grid;
    grid-template-columns: 1fr 1.2fr 0.6fr;
    border-bottom: 1px solid var(--color-border);
    align-items: center;
  }
  .se-row:last-child { border-bottom: none; }
  .se-cell { padding: 0.25em 0.4em; text-align: center; min-width: 0; }
  .se-cell-event {
    background: var(--color-unchecked);
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .se-cell-song {
    background: var(--color-bg);
    color: var(--color-text);
    padding: 0.25em 0.4em;
  }
  .se-song-pill {
    display: inline-block;
    background: var(--color-checked);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    padding: 0.1em 0.3em;
    width: 90%;
    max-width: 120px;
  }
  .se-select {
    width: 100%;
    border: none;
    background: transparent;
    color: var(--color-text);
    font-size: 0.9em;
    text-align: center;
    cursor: pointer;
    outline: none;
  }
  .se-cell-done { text-align: center; }
  .se-ok {
    display: inline-block;
    padding: 1px 8px;
    border-radius: 4px;
    background: rgba(50, 180, 80, 0.25);
    color: #5cd97a;
    font-weight: bold;
    font-size: 0.85em;
    border: 1px solid rgba(50, 180, 80, 0.4);
  }
  .se-no {
    display: inline-block;
    padding: 1px 8px;
    border-radius: 4px;
    background: rgba(200, 50, 50, 0.25);
    color: #e06060;
    font-weight: bold;
    font-size: 0.85em;
    border: 1px solid rgba(200, 50, 50, 0.4);
  }
  .se-na { color: var(--color-text); opacity: 0.35; font-size: 0.85em; }
  .se-row-na { opacity: 0.5; }

</style>
