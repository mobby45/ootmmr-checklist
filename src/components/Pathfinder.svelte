<script lang="ts">
  import { allEntrances, type ErSettingKey } from '../data/entranceData';
  import { defaultErSettings, type ErSettings } from '../util/spoilerParser';

  export let entranceValues: Map<string, string>;
  export let spoilerErSettings: ErSettings | null = null;

  // Active ER settings: spoiler overrides manual; manual falls back to localStorage
  let manualErSettings: ErSettings = JSON.parse(
    localStorage.getItem('erSettings') ?? JSON.stringify(defaultErSettings)
  );
  $: activeErSettings = spoilerErSettings ?? manualErSettings;

  function isActive(erType: ErSettingKey): boolean {
    return (activeErSettings as any)?.[erType] ?? false;
  }

  function parseName(name: string): { src: string; dest: string } {
    const i = name.indexOf(' to ');
    return i >= 0
      ? { src: name.slice(0, i), dest: name.slice(i + 4) }
      : { src: name, dest: name };
  }

  // All possible locations (from both src and dest of entrance names)
  $: allLocs = [...new Set(allEntrances.flatMap(e => {
    const { src, dest } = parseName(e.name);
    return [src, dest];
  }))].sort();

  // Build graph:
  // - If entrance type is ACTIVE (shuffled): only include if user has mapped it (one-way)
  // - If entrance type is NOT active (vanilla): add edges in BOTH directions so the graph
  //   stays connected despite inconsistent naming in the data
  function buildGraph(): Map<string, { entranceId: string; dest: string }[]> {
    const g = new Map<string, { entranceId: string; dest: string }[]>();
    for (const e of allEntrances) {
      const { src, dest: defaultDest } = parseName(e.name);
      if (isActive(e.erType)) {
        const mapped = entranceValues.get(e.id);
        if (mapped) {
          if (!g.has(src)) g.set(src, []);
          g.get(src)!.push({ entranceId: e.id, dest: mapped });
        }
      } else {
        if (!g.has(src)) g.set(src, []);
        g.get(src)!.push({ entranceId: e.id, dest: defaultDest });
        if (!g.has(defaultDest)) g.set(defaultDest, []);
        g.get(defaultDest)!.push({ entranceId: e.id + '_rev', dest: src });
      }
    }
    return g;
  }

  $: graph = buildGraph();

  let fromInput = '';
  let toInput = '';
  let pathResult: { entranceId: string; from: string; to: string }[] | null = null;
  let pathError = '';

  // Filtered suggestions
  $: fromSuggestions = fromInput.length >= 2
    ? allLocs.filter(l => l.toLowerCase().includes(fromInput.toLowerCase())).slice(0, 20)
    : [];
  $: toSuggestions = toInput.length >= 2
    ? allLocs.filter(l => l.toLowerCase().includes(toInput.toLowerCase())).slice(0, 20)
    : [];

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
    <input bind:value={fromInput} placeholder="From (e.g. Snowhead Temple)" class="pf-input" list="pf-from" />
    <datalist id="pf-from">
      {#each fromSuggestions as s}<option value={s}>{/each}
    </datalist>
    <input bind:value={toInput} placeholder="To (e.g. Kokiri Forest)" class="pf-input" list="pf-to" />
    <datalist id="pf-to">
      {#each toSuggestions as s}<option value={s}>{/each}
    </datalist>
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
  .pf-input {
    flex: 1 1 160px;
    min-width: 100px;
    padding: 0.35em 0.5em;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.85em;
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