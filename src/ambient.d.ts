declare module 'svelt-yjs' {
  import type { Readable } from 'svelte/store';
  import type * as Y from 'yjs';

  export function readableMap<T>(map: Y.Map<T>): Readable<Map<string, T>>;
  export function readableArray<T>(map: Y.Array<T>): Readable<T[]>;
}

declare module 'simple-peer/simplepeer.min.js' {
  import SimplePeer from 'simple-peer';
  export default SimplePeer;
}
