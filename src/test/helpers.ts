import { computeState, DEFAULT_OPTIONS } from '../game-engine/engine';
import { parseDart } from '../game-engine/darts';
import type { GameConfig, GameEvent, GameState, ModeOptions, Side } from '../game-engine/types';

export function players(n: number): Side[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}`, playerIds: [`p${i + 1}`] }));
}

export function teams(...sizes: number[]): Side[] {
  let next = 1;
  return sizes.map((size, t) => ({
    id: `t${t + 1}`,
    name: `Équipe ${t + 1}`,
    playerIds: Array.from({ length: size }, () => `p${next++}`),
  }));
}

type Opts<M extends ModeOptions['mode']> = Extract<ModeOptions, { mode: M }>['options'];

export function config<M extends ModeOptions['mode']>(
  mode: M,
  options: Partial<Opts<M>> = {},
  sides: Side[] = players(2),
): GameConfig {
  return {
    mode,
    options: { ...DEFAULT_OPTIONS[mode], ...options },
    sides,
    teamMode: sides.some((s) => s.playerIds.length > 1) || sides[0]?.id.startsWith('t') === true,
    training: sides.flatMap((s) => s.playerIds).length === 1,
  } as GameConfig;
}

/** Fléchettes en notation courte ; « / » termine la volée. Ex. : "T20 T20 / S1". */
export function events(script: string): GameEvent[] {
  return script
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (t === '/' ? { type: 'endTurn' } : { type: 'dart', dart: parseDart(t) }));
}

export function play(cfg: GameConfig, script: string): GameState {
  return computeState(cfg, events(script));
}
