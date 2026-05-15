<script lang="ts">
  import { allEntrances } from '../data/entranceData';

  export let entranceValues: Map<string, string>;

  function parseName(name: string): { src: string; dest: string } {
    const i = name.indexOf(' to ');
    return i >= 0
      ? { src: name.slice(0, i), dest: name.slice(i + 4) }
      : { src: name, dest: name };
  }

  // All possible locations (from entrance names)
  $: allLocs = [...new Set(allEntrances.map(e => parseName(e.name).src))].sort();

  // Build graph: use mapped destination if available, otherwise vanilla default
  function buildGraph(): Map<string, { entranceId: string; dest: string }[]> {
    const g = new Map<string, { entranceId: string; dest: string }[]>();
    for (const e of allEntrances) {
      const { src, dest: defaultDest } = parseName(e.name);
      const to = entranceValues.get(e.id) || defaultDest;
      if (!g.has(src)) g.set(src, []);
      g.get(src)!.push({ entranceId: e.id, dest: to });
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
    return allEntrances.find(e => e.id === id)?.name ?? id;
  }
</script>

<div class="pathfinder">
  <h4 style="margin:0 0 0.5em 0">Pathfinder</h4>
  <div class="pf-row">
    <input bind:value={fromInput} placeholder="From (e.g. Snowhead Temple)" class="pf-input" list="pf-from" />
    <datalist id="pf-from">
      {#each fromSuggestions as s}<option value={s}>{/each}
    </datalist>
    <span style="margin:0 0.3em">→</span>
    <input bind:value={toInput} placeholder="To (e.g. Kokiri Forest)" class="pf-input" list="pf-to" />
    <datalist id="pf-to">
      {#each toSuggestions as s}<option value={s}>{/each}
    </datalist>
    <button class="pure-button bg-primary" on:click={findPath}>Find Path</button>
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
    padding: 0.6em;
    background: rgba(255,255,255,0.03);
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.08);
  }
  .pf-row {
    display: flex;
    align-items: center;
    gap: 0.3em;
    flex-wrap: wrap;
  }
  .pf-input {
    flex: 1 1 180px;
    min-width: 120px;
    padding: 0.3em 0.5em;
    border: 1px solid #555;
    border-radius: 4px;
    background: #222;
    color: #eee;
    font-size: 0.9em;
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
    color: #888;
    margin: 0 0.15em;
  }
  .pf-error {
    margin-top: 0.4em;
    color: #e57373;
    font-size: 0.9em;
  }
</style>