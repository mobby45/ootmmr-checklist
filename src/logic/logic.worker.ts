import { computeReachabilityOotmm } from './ootmm-engine';
import type { LogicState } from './types';

// ─── Wire types shared with logicStore.ts ────────────────────────────────────

export interface WorkerRequest {
  id: number;
  items:          [string, number][];
  settings:       [string, any][];
  erOverrides:    [string, string][];
  tricks:         string[];
  flags:          string[];
  events:         string[];
  resolvedSpecial:[string, boolean][];
  songEvents:     [string, string][];
  shopPrices:     [string, number][];
  rawSpecialConds: Record<string, any> | null;
  erMode:  boolean;
  mmTime:  number;
  mmTime2: number;
  age: 'child' | 'adult';
  currentGame?: 'oot' | 'mm';
}

export interface WorkerResponse {
  id: number;
  result?: {
    regions:             string[];
    childRegions:        string[];
    adultRegions:        string[];
    childChecks:         string[];
    adultChecks:         string[];
    disabledChecks:      string[];
    events:              string[];
    entranceReachability:[string, boolean][];
  };
  error?: string;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

// Cast self to avoid dom/webworker lib conflicts in tsconfig.
const ctx = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage: (d: any) => void };

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, ...data } = e.data;

  const state: LogicState = {
    items:           new Map(data.items),
    settings:        new Map(data.settings),
    erOverrides:     new Map(data.erOverrides),
    tricks:          new Set(data.tricks),
    flags:           new Set(data.flags),
    events:          new Set(data.events),
    resolvedSpecial: new Map(data.resolvedSpecial),
    songEvents:      new Map(data.songEvents),
    shopPrices:      new Map(data.shopPrices),
    rawSpecialConds: data.rawSpecialConds,
    erMode:          data.erMode,
    mmTime:          data.mmTime,
    mmTime2:         data.mmTime2,
    age:             data.age,
    currentGame:     data.currentGame,
  };

  try {
    const result = await computeReachabilityOotmm(state);
    ctx.postMessage({
      id,
      result: {
        regions:              [...result.regions],
        childRegions:         [...result.childRegions],
        adultRegions:         [...result.adultRegions],
        childChecks:          [...result.childChecks],
        adultChecks:          [...result.adultChecks],
        disabledChecks:       [...result.disabledChecks],
        events:               [...result.events],
        entranceReachability: [...result.entranceReachability],
      },
    } satisfies WorkerResponse);
  } catch (err) {
    ctx.postMessage({ id, error: String(err) } satisfies WorkerResponse);
  }
};
