<script lang="ts">
  import type { Array as YArray, Map as YMap } from 'yjs';
  import { allTrackerItems } from '../data/itemData';

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

  type HintType = 'woth' | 'barren' | 'item' | 'junk' | 'other';

  const hintTypes: { id: HintType; label: string; color: string }[] = [
    { id: 'woth',   label: 'WotH',   color: '#3a7bd5' },
    { id: 'barren', label: 'Barren', color: '#cc3333' },
    { id: 'item',   label: 'Item',   color: '#e67e22' },
    { id: 'junk',   label: 'Junk',   color: '#555' },
    { id: 'other',  label: 'Other',  color: '#9b59b6' },
  ];

  // Song Events Shuffle data
  // vanilla: the song that triggers this event in the unrandomized game
  // doneNA: Done? column shows N/A (event not song-triggered in vanilla)
  type SongEventEntry = { id: string; label: string; vanilla: string; doneNA?: true };

  const OOT_EVENTS: SongEventEntry[] = [
    { id: 'oot_0',  label: 'ToT Door of Time',    vanilla: 'oot_song_time'     },
    { id: 'oot_1',  label: 'HC Great Fairy',       vanilla: 'oot_song_zelda'    },
    { id: 'oot_2',  label: "Royal Family's Tomb",  vanilla: 'oot_song_sun'      },
    { id: 'oot_3',  label: "GC Darunia's Room",    vanilla: 'oot_song_saria'    },
    { id: 'oot_4',  label: 'DMTrail Great Fairy',  vanilla: 'oot_song_zelda'    },
    { id: 'oot_5',  label: 'ZR Waterfall',         vanilla: 'oot_song_zelda'    },
    { id: 'oot_6',  label: 'ZF Great Fairy',       vanilla: 'oot_song_zelda'    },
    { id: 'oot_7',  label: 'Kakariko Windmill',    vanilla: 'oot_song_storms'   },
    { id: 'oot_8',  label: 'BotW Water Level',     vanilla: 'oot_song_zelda'    },
    { id: 'oot_9',  label: 'DMCrater Great Fairy', vanilla: 'oot_song_zelda'    },
    { id: 'oot_10', label: 'Water Temple Levels',  vanilla: 'oot_song_zelda',   doneNA: true },
    { id: 'oot_11', label: 'Desert Great Fairy',   vanilla: 'oot_song_zelda'    },
    { id: 'oot_12', label: 'Spirit Temple Statue', vanilla: 'oot_song_zelda'    },
    { id: 'oot_13', label: 'Spirit Temple Lower',  vanilla: 'oot_song_requiem'  },
    { id: 'oot_14', label: 'Spirit Temple Upper',  vanilla: 'oot_song_requiem'  },
    { id: 'oot_15', label: 'Shadow Temple Boat',   vanilla: 'oot_song_nocturne' },
    { id: 'oot_16', label: 'OGC Great Fairy',      vanilla: 'oot_song_zelda'    },
    { id: 'oot_17', label: 'Ganon Light Trial',    vanilla: 'oot_song_zelda'    },
  ];

  const MM_EVENTS: SongEventEntry[] = [
    { id: 'mm_0',  label: 'CTR Moon Access',       vanilla: 'mm_song_oath'    },
    { id: 'mm_1',  label: 'Heal Kamaro',            vanilla: 'mm_song_healing' },
    { id: 'mm_2',  label: 'Woodfall Entrance',      vanilla: 'mm_song_sonata'  },
    { id: 'mm_3',  label: 'Wake SSH Deku Scrub',    vanilla: 'mm_song_sonata'  },
    { id: 'mm_4',  label: 'Shrine Goron Baby',      vanilla: 'mm_song_lullaby' },
    { id: 'mm_5',  label: 'Heal Darmani',           vanilla: 'mm_song_healing' },
    { id: 'mm_6',  label: 'Snowhead Entrance',      vanilla: 'mm_song_lullaby' },
    { id: 'mm_7',  label: 'Heal Mikau',             vanilla: 'mm_song_healing' },
    { id: 'mm_8',  label: 'Great Bay Entrance',     vanilla: 'mm_song_nova'    },
    { id: 'mm_9',  label: 'Wake Captain Keeta',     vanilla: 'mm_song_elegy'   },
    { id: 'mm_10', label: "Lift Ikana's Curse",     vanilla: 'mm_song_storms'  },
    { id: 'mm_11', label: "Heal Pamala's Father",   vanilla: 'mm_song_healing' },
  ];

  const SONG_EVENT_ROWS = OOT_EVENTS.map((oot, i) => ({ oot, mm: MM_EVENTS[i] ?? null }));

  const songChoices = allTrackerItems.filter(i => i.category === 'songs' && i.maxLevel >= 1);

  // Cross-game clones: MM songs placed in OoT pool and OoT songs placed in MM pool
  const CROSS_IN_OOT = new Set(['oot_elegy','oot_song_healing','oot_song_soaring','oot_song_sonata','oot_song_lullaby','oot_song_nova','oot_song_oath']);
  const CROSS_IN_MM  = new Set(['mm_song_zelda','mm_song_saria','mm_song_minuet','mm_song_bolero','mm_song_serenade','mm_song_requiem','mm_song_nocturne','mm_song_prelude']);

  const ootSongs = songChoices.filter(s => s.game === 'oot' && !CROSS_IN_OOT.has(s.id));
  const mmSongs  = songChoices.filter(s => s.game === 'mm'  && !CROSS_IN_MM.has(s.id));

  // Songs that share a name across both games (Epona, Song of Time, Song of Storms, Sun's Song)
  // → show only the home-game version to avoid duplicates in the "opposite" optgroup
  const ootNames = new Set(ootSongs.map(s => s.name));
  const mmNames  = new Set(mmSongs.map(s => s.name));
  const mmOnlySongs  = mmSongs.filter(s => !ootNames.has(s.name)); // MM-exclusive for OoT select
  const ootOnlySongs = ootSongs.filter(s => !mmNames.has(s.name)); // OoT-exclusive for MM select

  let songEventMap: Record<string, string> = {};
  $: if (ySongEvents) {
    ySongEvents.observe(() => { songEventMap = Object.fromEntries(ySongEvents!.entries()); });
    songEventMap = Object.fromEntries(ySongEvents.entries());
  }

  function setSongEvent(key: string, songId: string) {
    if (isWatchMode || !ySongEvents) return;
    if (songId) ySongEvents.set(key, songId);
    else ySongEvents.delete(key);
  }

  function toggleDone(key: string) {
    if (isWatchMode || !ySongEvents) return;
    const doneKey = key + '_done';
    if (songEventMap[doneKey] === 'yes') ySongEvents.delete(doneKey);
    else ySongEvents.set(doneKey, 'yes');
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

  function toggleHintDone(id: string) {
    if (isWatchMode) return;
    const idx = hints.findIndex(h => h.id === id);
    if (idx === -1) return;
    const h = hints[idx];
    yHints.delete(idx, 1);
    yHints.insert(idx, [{ ...h, done: !h.done }]);
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
      Song Events
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
          <li class="hint-item" class:hint-done={hint.done}>
            <button class="hint-done-btn" class:is-done={hint.done} on:click={() => toggleHintDone(hint.id)} title="{hint.done ? 'Mark undone' : 'Mark done'}" disabled={isWatchMode}>
              {hint.done ? '✓' : '○'}
            </button>
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
    <!-- Song Events Shuffle -->
    <table class="song-events-table">
      <thead>
        <tr>
          <th colspan="3" class="game-header oot-game-header">Ocarina of Time</th>
          <th colspan="3" class="game-header mm-game-header">Majora's Mask</th>
        </tr>
        <tr>
          <th class="event-th">Song Event</th>
          <th class="song-th">Required Song</th>
          <th class="done-th">Done?</th>
          <th class="event-th">Song Event</th>
          <th class="song-th">Required Song</th>
          <th class="done-th">Done?</th>
        </tr>
      </thead>
      <tbody>
        {#each SONG_EVENT_ROWS as row}
          {@const ootSel = songEventMap[row.oot.id] ?? ''}
          {@const ootEff = ootSel || row.oot.vanilla}
          {@const ootDone = songEventMap[row.oot.id + '_done'] === 'yes'}
          {@const mmSel  = row.mm ? (songEventMap[row.mm.id] ?? '') : null}
          {@const mmEff  = row.mm ? (mmSel || row.mm.vanilla) : null}
          {@const mmDone = row.mm ? songEventMap[row.mm.id + '_done'] === 'yes' : false}
          <tr class:row-oot-done={ootDone} class:row-mm-done={mmDone}>
            <td class="event-cell oot-event" title={row.oot.label}>{row.oot.label}</td>
            <td>
              <select
                value={ootEff}
                on:change={e => { const v = selectValue(e); setSongEvent(row.oot.id, v === row.oot.vanilla ? '' : v); }}
                disabled={isWatchMode}
                class="song-select"
                class:vanilla-select={!ootSel}
              >
                <optgroup label="Ocarina of Time">
                  {#each ootSongs as song}<option value={song.id}>{song.name}</option>{/each}
                </optgroup>
                <optgroup label="Majora's Mask">
                  {#each mmOnlySongs as song}<option value={song.id}>{song.name}</option>{/each}
                </optgroup>
              </select>
            </td>
            <td class="done-cell">
              {#if row.oot.doneNA}
                <span class="na-text">N/A</span>
              {:else}
                <button class="done-btn" class:done-yes={ootDone} on:click={() => toggleDone(row.oot.id)} disabled={isWatchMode}>
                  {ootDone ? '✓' : '✗'}
                </button>
              {/if}
            </td>
            <td class="event-cell mm-event" title={row.mm?.label ?? ''}>{row.mm?.label ?? ''}</td>
            <td>
              {#if row.mm}
                {@const mmEvt = row.mm}
                <select
                  value={mmEff ?? ''}
                  on:change={e => { const v = selectValue(e); setSongEvent(mmEvt.id, v === mmEvt.vanilla ? '' : v); }}
                  disabled={isWatchMode}
                  class="song-select"
                  class:vanilla-select={!mmSel}
                >
                  <optgroup label="Ocarina of Time">
                    {#each ootOnlySongs as song}<option value={song.id}>{song.name}</option>{/each}
                  </optgroup>
                  <optgroup label="Majora's Mask">
                    {#each mmSongs as song}<option value={song.id}>{song.name}</option>{/each}
                  </optgroup>
                </select>
              {:else}
                <span class="na-text">N/A</span>
              {/if}
            </td>
            <td class="done-cell">
              {#if !row.mm}
                <span class="na-text">N/A</span>
              {:else}
                {@const mmEvt2 = row.mm}
                <button class="done-btn" class:done-yes={mmDone} on:click={() => toggleDone(mmEvt2.id)} disabled={isWatchMode}>
                  {mmDone ? '✓' : '✗'}
                </button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
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
    transition: opacity 0.15s;
  }
  .hint-done { opacity: 0.45; }
  .hint-done .hint-text { text-decoration: line-through; }

  .hint-done-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1em;
    padding: 0 2px;
    opacity: 0.4;
    color: var(--color-text);
    line-height: 1;
  }
  .hint-done-btn:hover { opacity: 0.9; }
  .hint-done-btn.is-done { opacity: 1; color: #2ecc71; }

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

  /* ── Song Events ── */
  .song-events-table { width: 100%; border-collapse: collapse; font-size: 0.8em; }
  .song-events-table th,
  .song-events-table td { padding: 3px 5px; border-bottom: 1px solid var(--color-border); text-align: left; }
  .song-events-table tr:last-child td { border-bottom: none; }
  .song-events-table tbody tr:hover { background: rgba(255,255,255,0.04); }

  .game-header { text-align: center; font-weight: bold; font-size: 1em; padding: 4px; }
  .oot-game-header { background: rgba(70,130,210,0.18); color: #7eb8ff; border-bottom: 2px solid #4682d2; }
  .mm-game-header  { background: rgba(200,60,60,0.15);  color: #ff9090; border-bottom: 2px solid #c03030; border-left: 2px solid var(--color-border); }

  .event-th { opacity: 0.6; font-weight: normal; min-width: 9em; }
  .song-th  { opacity: 0.6; font-weight: normal; }
  .done-th  { opacity: 0.6; font-weight: normal; width: 3.5em; text-align: center; }

  .event-cell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 11em; }
  .oot-event { color: #7eb8ff; }
  .mm-event  { color: #ff9090; border-left: 2px solid var(--color-border); padding-left: 6px; }

  .done-cell { width: 3.5em; text-align: center; }
  .na-text { opacity: 0.35; font-size: 0.85em; }

  .song-select {
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 1px 3px;
    font-size: 0.9em;
    width: 100%;
    max-width: 13em;
  }
  .vanilla-select { opacity: 0.55; font-style: italic; }
  .vanilla-select:focus, .vanilla-select:hover { opacity: 1; font-style: normal; }

  .done-btn {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: #e74c3c;
    cursor: pointer;
    font-size: 0.9em;
    padding: 1px 5px;
    width: 100%;
  }
  .done-btn:disabled { cursor: default; opacity: 0.5; }
  .done-btn.done-yes { color: #2ecc71; border-color: #2ecc71; }

  .row-oot-done .oot-event { opacity: 0.5; }
  .row-mm-done  .mm-event  { opacity: 0.5; }

</style>
