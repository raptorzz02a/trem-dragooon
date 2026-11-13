import { fivesGain, type FivesState } from '../../../game-engine/extra/fives';
import { LOW_MISS, type LowScoreState } from '../../../game-engine/extra/lowscore';
import { NINE_GOAL, type NineLivesState } from '../../../game-engine/extra/ninelives';
import { TWENTY_ONE, type VingtEtUnState } from '../../../game-engine/extra/vingtetun';
import { zone } from '../../../game-engine/extra/zones';
import type { GameState } from '../../../game-engine/types';
import { ZoneInput } from '../../components/ZoneInput';
import { ListBoard } from '../ListBoard';
import type { ModeView } from '../types';
import { Hearts, plural, roundOf, RoundBar, sideNow, sum, winnerLine } from './kit';

/* ---------- Fives ---------- */
const fv = (s: GameState) => s.mode as FivesState;
const fivesText = (score: number, volley: number, goal: number) => {
  const g = fivesGain(score, volley, goal);
  return g === null ? 'dépassé' : g ? `+${g}` : '0';
};

export const fivesView: ModeView = {
  title: ({ state }) => `Fives · objectif ${fv(state).goal}`,
  hero: ({ state }, side) => ({ label: 'Score', value: fv(state).scores[side]! }),
  hint: ({ state }) => {
    const s = fv(state);
    const v = s.volley;
    return (
      <>
        Volée <strong>{v}</strong> →{' '}
        {v % 5 === 0 && v > 0 ? `÷ 5 = ${fivesText(s.scores[sideNow(state)]!, v, s.goal)}` : 'pas divisible par 5 : 0'} · arrivée pile sur{' '}
        {s.goal}
      </>
    );
  },
  dartNote: (d) => String(d.points),
  volleyTotal: (darts, { state }) => fivesText(fv(state).scores[sideNow(state)]!, sum(darts), fv(state).goal),
  turnResult: (turn, ctx) => {
    const s = fv(ctx.state);
    const v = sum(turn.darts);
    const who = ctx.nameOf(turn.playerId);
    const e = s.log.find((x) => x.side === turn.sideIndex && x.round === turn.round);
    if (!e) return { text: `${who} : ${v}` };
    if (e.gain === null) return { text: `${who} : ${e.volley} ÷ 5 dépasse ${s.goal}, volée annulée`, bad: true };
    return e.gain ? { text: `${who} : ${e.volley} ÷ 5 = +${e.gain}` } : { text: `${who} : ${e.volley}, pas divisible par 5`, bad: true };
  },
  endSummary: (ctx) =>
    winnerLine(ctx, (w) => `${fv(ctx.state).goal} pile · ${plural(fv(ctx.state).scoring[w]!, 'volée marquante', 'volées marquantes')}`),
  rankValue: (r) => plural(r.value, 'pt'),
  board: (ctx) => <ListBoard ctx={ctx} row={(i) => ({ value: fv(ctx.state).scores[i]!, detail: `/ ${fv(ctx.state).goal}` })} />,
  pad: () => ({}),
};

/* ---------- 21 ---------- */
const vt = (s: GameState) => s.mode as VingtEtUnState;

export const vingtetunView: ModeView = {
  title: () => '21',
  hero: ({ state }, side) => ({ label: 'Il te faut', value: TWENTY_ONE - vt(state).scores[side]! }),
  hint: ({ state }) => (
    <>
      Score <strong>{vt(state).scores[sideNow(state)]}</strong> / 21 · au-delà de 21, la volée est annulée
    </>
  ),
  dartNote: (d) => `+${d.points}`,
  volleyTotal: (darts) => `+${sum(darts)}`,
  turnResult: (turn, ctx) =>
    turn.outcome === 'bust'
      ? { text: `${ctx.nameOf(turn.playerId)} dépasse 21 : volée annulée`, bad: true }
      : { text: `${ctx.nameOf(turn.playerId)} : ${vt(ctx.state).scores[turn.sideIndex]} / 21` },
  endSummary: (ctx) => winnerLine(ctx, () => '21 pile !'),
  rankValue: (r) => `${r.value} / 21`,
  board: (ctx) => (
    <ListBoard ctx={ctx} row={(i) => ({ value: vt(ctx.state).scores[i]!, detail: `reste ${TWENTY_ONE - vt(ctx.state).scores[i]!}` })} />
  ),
  pad: ({ state }) => {
    const left = TWENTY_ONE - vt(state).scores[sideNow(state)]!;
    return { highlight: left >= 1 && left <= 20 ? left : null, highlightBull: left === 25 ? 25 : null };
  },
};

/* ---------- Low Score ---------- */
const lo = (s: GameState) => s.mode as LowScoreState;

export const lowscoreView: ModeView = {
  title: ({ state }) => `Low Score · ${lo(state).rounds} manches`,
  hero: ({ state }, side) => ({ label: 'Total', value: lo(state).scores[side]! }),
  hint: ({ state }) => (
    <>
      Le plus petit total gagne · hors cible <strong>+{LOW_MISS}</strong> · <RoundBar round={roundOf(state)} total={lo(state).rounds} />
    </>
  ),
  dartNote: (d) => (d.dart.segment === 0 ? `+${LOW_MISS} !` : `+${d.points}`),
  volleyTotal: (darts) => `+${sum(darts)}`,
  turnResult: (turn, ctx) => ({
    text: `${ctx.nameOf(turn.playerId)} : +${sum(turn.darts)}`,
    bad: turn.darts.some((d) => d.dart.segment === 0),
  }),
  endSummary: (ctx) => winnerLine(ctx, (w) => `Total de ${plural(lo(ctx.state).scores[w]!, 'point')}`),
  rankValue: (r) => plural(r.value, 'pt'),
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => ({
        value: lo(ctx.state).scores[i]!,
        detail: lo(ctx.state).misses[i] ? `${lo(ctx.state).misses[i]} hors cible` : undefined,
      })}
    />
  ),
  pad: () => ({}),
};

/* ---------- Nine Lives ---------- */
const nl = (s: GameState) => s.mode as NineLivesState;

export const ninelivesView: ModeView = {
  title: ({ state }) => `Nine Lives · ${nl(state).maxLives} vies`,
  hero: ({ state }, side) => ({ label: 'À viser', value: Math.min(nl(state).progress[side]! + 1, NINE_GOAL) }),
  hint: ({ state }) => {
    const s = nl(state);
    const side = sideNow(state);
    return (
      <>
        <Hearts lives={s.lives[side]!} max={s.maxLives} /> · {s.progress[side]} / 20 · une volée sans touche coûte une vie
      </>
    );
  },
  dartNote: (d) => (d.points ? '✓' : ''),
  volleyTotal: (darts) => (sum(darts) ? `+${sum(darts)}` : '·'),
  turnResult: (turn, ctx) =>
    sum(turn.darts)
      ? { text: `${ctx.nameOf(turn.playerId)} avance de ${sum(turn.darts)}` }
      : { text: `${ctx.nameOf(turn.playerId)} perd une vie`, bad: true },
  endSummary: (ctx) => winnerLine(ctx, (w) => (nl(ctx.state).progress[w] === NINE_GOAL ? 'Parcours terminé !' : 'Dernier en vie')),
  rankValue: (r, { state }) => `${nl(state).progress[r.sideIndex]} / 20 · ${plural(nl(state).lives[r.sideIndex]!, 'vie')}`,
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => ({
        value: nl(ctx.state).progress[i]!,
        out: nl(ctx.state).outOrder[i] !== 0,
        extra: <Hearts lives={nl(ctx.state).lives[i]!} max={nl(ctx.state).maxLives} />,
      })}
    />
  ),
  input: ({ state }, onDart, disabled) => {
    const p = nl(state).progress[sideNow(state)]!;
    const done = Array.from({ length: p }, (_, k) => ({ zone: zone(k + 1), tone: 'green' as const }));
    return <ZoneInput anyHit target={zone(Math.min(p + 1, NINE_GOAL))} marks={done} disabled={disabled} onDart={onDart} />;
  },
  pad: () => ({}),
};
