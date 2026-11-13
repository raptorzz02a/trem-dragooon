import type { ReactNode } from 'react';
import type { GameState, ThrownDart, TurnRecord } from '../../../game-engine/types';
import type { ModeView, ViewContext } from '../types';

// Petits outils partagés par les écrans des autres jeux.

export const roundOf = (state: GameState) => state.current?.round ?? state.turns.at(-1)?.round ?? 0;
export const sideNow = (state: GameState) => state.current?.sideIndex ?? state.turns.at(-1)?.sideIndex ?? 0;
export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${Math.abs(n) > 1 ? many : word}`;
export const sum = (darts: ThrownDart[]) => darts.reduce((a, d) => a + d.points, 0);
export const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** « Manche 3 / 10 » avec une barre de progression. */
export function RoundBar({ round, total, label = 'Manche' }: { round: number; total: number; label?: string }) {
  return (
    <>
      <span className="label">{label}</span> {Math.min(round + 1, total)} / {total}
      <span className="hint-bar">
        <span style={{ width: `${(100 * Math.min(round + 1, total)) / total}%` }} />
      </span>
    </>
  );
}

/** Cœurs pleins et vides. */
export function Hearts({ lives, max }: { lives: number; max: number }) {
  return (
    <span className="hearts" aria-label={plural(lives, 'vie')}>
      {'♥'.repeat(Math.max(0, lives))}
      <i>{'♥'.repeat(Math.max(0, max - lives))}</i>
    </span>
  );
}

/** Puces d'une suite de cibles : faites, en cours, à venir. */
export function Strip({ items, current, bad = [] }: { items: string[]; current: number; bad?: number[] }) {
  return (
    <span className="target-strip">
      {items.map((t, i) => (
        <span key={i} className={i === current ? 'current' : bad.includes(i) ? 'done bad' : i < current ? 'done' : ''}>
          {t}
        </span>
      ))}
    </span>
  );
}

/** Résumé de fin standard : « 42 points ». */
export const winnerLine = (ctx: ViewContext, text: (side: number) => ReactNode): ReactNode =>
  ctx.state.winners.length === 1 ? <div className="end-darts">{text(ctx.state.winners[0]!)}</div> : null;

/** Résultat de volée standard : « Ju : +12 ». */
export const simpleResult =
  (unit = 'point'): ModeView['turnResult'] =>
  (turn: TurnRecord, ctx) => ({ text: `${ctx.nameOf(turn.playerId)} : ${plural(sum(turn.darts), unit)}` });
