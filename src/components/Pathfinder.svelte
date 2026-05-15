<script lang="ts">
  import { allEntrances } from '../data/entranceData';

  export let entranceValues: Map<string, string>;

  function parseName(name: string): { src: string; dest: string } {
    let pos = 0;
    while (true) {
      const i = name.indexOf(' to ', pos);
      if (i < 0) return { src: name, dest: name };
      const src = name.slice(0, i);
      const dest = name.slice(i + 4);
      if ((src.startsWith('OOT ') || src.startsWith('MM ')) &&
          (dest.startsWith('OOT ') || dest.startsWith('MM ')))
        return { src, dest };
      pos = i + 4;
    }
  }

  // All possible locations (from both src and dest of entrance names)
  $: allLocs = [...new Set(allEntrances.flatMap(e => {
    const { src, dest } = parseName(e.name);
    return [src, dest];
  }))].sort();

  // Known cross-game links in vanilla OoTMM (mask shop ↔ clock town)
  const gameLinks: [string, string][] = [
    ['OOT Market Mask Shop', 'MM Clock Town South'],
    ['MM Clock Tower', 'OOT Market'],
  ];

  // Build graph:
  // - For each entrance, use the mapped destination if available, else vanilla default
  // - Add edges in BOTH directions so the graph stays connected
  // - Add virtual cross-game edges (mask shop ↔ clock town)
  // - Auto-link same-game locations sharing 2+ leading words (e.g. "MM Mountain Village"
  //   and "MM Mountain Village Cliff") to bridge naming inconsistencies in the entrance data
  function buildGraph(): Map<string, { entranceId: string; dest: string }[]> {
    const g = new Map<string, { entranceId: string; dest: string }[]>();
    for (const e of allEntrances) {
      const { src, dest: defaultDest } = parseName(e.name);
      const dest = entranceValues.get(e.id) || defaultDest;
      if (!g.has(src)) g.set(src, []);
      g.get(src)!.push({ entranceId: e.id, dest });
      if (!g.has(dest)) g.set(dest, []);
      g.get(dest)!.push({ entranceId: e.id + '_rev', dest: src });
    }
    for (const [a, b] of gameLinks) {
      if (!g.has(a)) g.set(a, []);
      if (!g.has(b)) g.set(b, []);
      g.get(a)!.push({ entranceId: 'gameLink', dest: b });
      g.get(b)!.push({ entranceId: 'gameLink', dest: a });
    }
    // Count unique neighbors (degree) for each location
    const degree = new Map<string, number>();
    for (const [loc, edges] of g) {
      degree.set(loc, new Set(edges.map(e => e.dest)).size);
    }
    // Auto-link same-game locations sharing 2+ leading words,
    // but only when at least one is a leaf (degree ≤ 1) so well-connected
    // nodes like "OOT Lost Woods Bridge" (degree 2) aren't shortcut.
    const locs = [...g.keys()];
    const gameOf = (s: string) => s.startsWith('OOT ') ? 'oot' : s.startsWith('MM ') ? 'mm' : null;
    const stripGame = (s: string) => s.startsWith('OOT ') ? s.slice(4) : s.startsWith('MM ') ? s.slice(3) : s;
    const words = (s: string) => s.split(/\s+/);
    for (let i = 0; i < locs.length; i++) {
      const gi = gameOf(locs[i]);
      if (!gi) continue;
      const wi = words(stripGame(locs[i]));
      for (let j = i + 1; j < locs.length; j++) {
        if (gameOf(locs[j]) !== gi) continue;
        const wj = words(stripGame(locs[j]));
        let shared = 0;
        const limit = Math.min(wi.length, wj.length);
        while (shared < limit && wi[shared] === wj[shared]) shared++;
        if (shared >= 2 && (degree.get(locs[i])! <= 1 || degree.get(locs[j])! <= 1)) {
          g.get(locs[i])!.push({ entranceId: 'autoLink', dest: locs[j] });
          g.get(locs[j])!.push({ entranceId: 'autoLink', dest: locs[i] });
        }
      }
    }
    return g;
  }

  $: graph = buildGraph();

  let fromInput = '';
  let toInput = '';
  let fromFocused = false;
  let toFocused = false;
  let pathResult: { entranceId: string; from: string; to: string }[] | null = null;
  let pathError = '';

  // Filtered suggestions
  $: fromSuggestions = fromInput.length >= 2
    ? allLocs.filter(l => l.toLowerCase().includes(fromInput.toLowerCase())).slice(0, 20)
    : [];
  $: toSuggestions = toInput.length >= 2
    ? allLocs.filter(l => l.toLowerCase().includes(toInput.toLowerCase())).slice(0, 20)
    : [];

  function pickFrom(val: string) { fromInput = val; fromFocused = false; }
  function pickTo(val: string) { toInput = val; toFocused = false; }

  function findPath() {
    pathResult = null;
    pathError = '';

    const start = fromInput.trim();
    const target = toInput.trim();
    if (!start || !target) { pathError = 'Enter both start and target locations.'; return; }
    if (start === target) { pathResult = []; return; }

    const g = graph;

    // BFS
    const visited = new Set<string>();
    const queue: { node: string; path: { entranceId: string; from: string; to: string }[] }[] = [];

    // Find starting edges
    const startEdges = g.get(start);
    if (!startEdges || startEdges.length === 0) {
      pathError = `No mapped entrance from "${start}".`;
      return;
    }

    visited.add(start);
    for (const edge of startEdges) {
      queue.push({ node: edge.dest, path: [{ entranceId: edge.entranceId, from: start, to: edge.dest }] });
    }

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      if (node === target) { pathResult = path; return; }
      if (visited.has(node)) continue;
      visited.add(node);

      const edges = g.get(node);
      if (edges) {
        for (const edge of edges) {
          if (!visited.has(edge.dest)) {
            queue.push({ node: edge.dest, path: [...path, { entranceId: edge.entranceId, from: node, to: edge.dest }] });
          }
        }
      }
    }

    pathError = `No path found from "${start}" to "${target}".`;
  }

  function entranceName(id: string): string {
    if (id === 'gameLink') return 'Game Link (Mask Shop / Clock Tower)';
    if (id === 'autoLink') return 'Auto Link (same area)';
    if (id.endsWith('_rev')) return '(reverse) ' + (allEntrances.find(e => e.id === id.slice(0, -4))?.name ?? id);
    return allEntrances.find(e => e.id === id)?.name ?? id;
  }

  function clearAll() {
    fromInput = '';
    toInput = '';
    pathResult = null;
    pathError = '';
  }
</script>

<div class="pathfinder">
  <div class="pf-row">
    <div class="pf-input-wrap">
      <input bind:value={fromInput} placeholder="From" class="pf-input"
        on:focus={() => fromFocused = true}
        on:blur={() => setTimeout(() => fromFocused = false, 150)} />
      {#if fromInput}
        <button class="pf-input-clear" on:click={() => fromInput = ''} tabindex="-1">✕</button>
      {/if}
      {#if fromFocused && fromSuggestions.length > 0}
        <div class="pf-suggestions" on:mousedown|preventDefault={() => {}}>
          {#each fromSuggestions as s}
            <button class="pf-suggestion" on:click={() => pickFrom(s)}>{s}</button>
          {/each}
        </div>
      {/if}
    </div>
    <span class="pf-arrow-icon">→</span>
    <div class="pf-input-wrap">
      <input bind:value={toInput} placeholder="To" class="pf-input"
        on:focus={() => toFocused = true}
        on:blur={() => setTimeout(() => toFocused = false, 150)} />
      {#if toInput}
        <button class="pf-input-clear" on:click={() => toInput = ''} tabindex="-1">✕</button>
      {/if}
      {#if toFocused && toSuggestions.length > 0}
        <div class="pf-suggestions" on:mousedown|preventDefault={() => {}}>
          {#each toSuggestions as s}
            <button class="pf-suggestion" on:click={() => pickTo(s)}>{s}</button>
          {/each}
        </div>
      {/if}
    </div>
    <button class="pf-btn pf-btn-primary" on:click={findPath}>Find Path</button>
    <button class="pf-btn pf-btn-clear" on:click={clearAll}>Clear</button>
  </div>

  {#if pathResult !== null}
    <div class="pf-path">
      <strong>Path:</strong>
      <span class="pf-step">{fromInput}</span>
      {#each pathResult as step, i}
        <span class="pf-arrow">→</span>
        <span class="pf-step" title={entranceName(step.entranceId)}>{step.to}</span>
      {/each}
    </div>
  {/if}
  {#if pathError}
    <div class="pf-error">{pathError}</div>
  {/if}
</div>

<style>
  .pathfinder {
    margin-top: 0.8em;
  }
  .pf-row {
    display: flex;
    align-items: center;
    gap: 0.4em;
    flex-wrap: wrap;
  }
  .pf-input-wrap {
    position: relative;
    flex: 1 1 160px;
    min-width: 100px;
  }
  .pf-input {
    width: 100%;
    padding: 0.35em 1.5em 0.35em 0.5em;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.85em;
    box-sizing: border-box;
  }
  .pf-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 10;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-top: none;
    border-radius: 0 0 4px 4px;
    max-height: 200px;
    overflow-y: auto;
  }
  .pf-suggestion {
    display: block;
    width: 100%;
    padding: 0.3em 0.5em;
    background: none;
    border: none;
    color: var(--color-text);
    font-size: 0.82em;
    text-align: left;
    cursor: pointer;
  }
  .pf-suggestion:hover {
    background: var(--color-primary);
    color: #000;
  }
  .pf-input-clear {
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--color-text);
    opacity: 0.4;
    cursor: pointer;
    padding: 2px 4px;
    font-size: 0.8em;
    line-height: 1;
  }
  .pf-input-clear:hover {
    opacity: 1;
  }
  .pf-arrow-icon {
    color: var(--color-text);
    opacity: 0.35;
    font-size: 1em;
    line-height: 1;
    flex-shrink: 0;
  }
  .pf-btn {
    padding: 0.35em 0.7em;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85em;
    white-space: nowrap;
  }
  .pf-btn-primary {
    background: var(--color-primary);
    color: #000;
  }
  .pf-btn-clear {
    background: transparent;
    color: var(--color-text);
    border: 1px solid var(--color-border);
    opacity: 0.6;
  }
  .pf-btn-clear:hover {
    opacity: 1;
  }
  .pf-path {
    margin-top: 0.5em;
    padding: 0.4em 0.6em;
    background: rgba(76,175,80,0.1);
    border-radius: 4px;
    word-break: break-all;
  }
  .pf-step {
    font-weight: 500;
    color: #81c784;
  }
  .pf-arrow {
    color: var(--color-text);
    opacity: 0.4;
    margin: 0 0.15em;
  }
  .pf-error {
    margin-top: 0.4em;
    color: var(--color-danger);
    font-size: 0.9em;
  }
</style>