import { BULL } from '../../../game-engine/darts';
import type { BigSixState } from '../../../game-engine/extra/bigsix';
import { dtSuccess, DT_NUMBERS, type DtChallengeState } from '../../../game-engine/extra/dtchallenge';
import { KD_MAX, type KillerDoublesState } from '../../../game-engine/extra/killerdoubles';
import { oneDartValue, type OneDartState } from '../../../game-engine/extra/onedart';
import { SURVIE_LEVELS, survieLevel, type SurvieState } from '../../../game-engine/extra/survie';
import { formatZone, zone, zoneName } from '../../../game-engine/extra/zones';
import type { GameState } from '../../../game-engine/types';
import type { Mark } from '../../components/DartBoard';
import { KillerInput } from '../../components/KillerInput';
import { ZoneInput } from '../../components/ZoneInput';
import { ListBoard } from '../ListBoard';
import type { ModeView } from '../types';
import { Hearts, plural, roundOf, RoundBar, sideNow, sum, winnerLine } from './kit';

/* ---------- Big Six ---------- */
const bs = (s: GameState) => s.mode as BigSixState;

export const bigsixView: ModeView = {
  title: ({ state }) => `Big Six · ${bs(state).maxLives} vies`,
  hero: ({ state }) => ({ label: bs(state).hit ? 'Choisis la suivante' : 'À toucher', value: formatZone(bs(state).target) }),
  hint: ({ state }) => {
    const s = bs(state);
    const side = sideNow(state);
    return (
      <>
        <Hearts lives={s.lives[side]!} max={s.maxLives} /> ·{' '}
        {s.hit
          ? 'Touchée ! Ta prochaine fléchette choisit la cible des suivants'
          : `Touche ${zoneName(s.target)} pour ne pas perdre de vie`}
      </>
    );
  },
  dartNote: (d) => (d.points ? '✓' : ''),
  volleyTotal: () => '',
  turnResult: (turn, ctx) => {
    const s = bs(ctx.state);
    const who = ctx.nameOf(turn.playerId);
    if (!turn.darts.some((d) => d.points)) return { text: `${who} rate la cible et perd une vie`, bad: true };
    return s.setter === turn.sideIndex ? { text: `${who} impose ${formatZone(s.target)}` } : { text: `${who} touche la cible` };
  },
  winLabel: () => 'Dernier survivant',
  endSummary: (ctx) => winnerLine(ctx, (w) => `${plural(bs(ctx.state).made[w]!, 'cible réussie', 'cibles réussies')}`),
  rankValue: (r, { state }) => (bs(state).outOrder[r.sideIndex] ? 'éliminé' : plural(bs(state).lives[r.sideIndex]!, 'vie')),
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => ({
        value: bs(ctx.state).made[i]!,
        out: bs(ctx.state).outOrder[i] !== 0,
        extra: <Hearts lives={bs(ctx.state).lives[i]!} max={bs(ctx.state).maxLives} />,
      })}
    />
  ),
  pad: ({ state }) => {
    const t = bs(state).target;
    if (bs(state).hit) return {};
    return t.segment === BULL ? { highlightBull: t.ring === 'D' ? 50 : 25 } : { highlight: t.segment };
  },
};

/* ---------- Défi doubles et triples ---------- */
const dt = (s: GameState) => s.mode as DtChallengeState;
const dtName = (s: DtChallengeState) => (s.kind === 'D' ? 'doubles' : 'triples');

export const dtchallengeView: ModeView = {
  title: ({ state }) => `Défi des ${dtName(dt(state))}`,
  hero: ({ state }) => ({ label: 'À viser', value: `${dt(state).kind}${Math.min(roundOf(state) + 1, DT_NUMBERS)}` }),
  hint: ({ state }) => {
    const s = dt(state);
    const side = sideNow(state);
    return (
      <>
        Réussis <strong>{dtSuccess(s, side)}</strong> · <RoundBar round={roundOf(state)} total={DT_NUMBERS} label="Numéro" />
      </>
    );
  },
  dartNote: (d) => (d.points ? '✓' : ''),
  volleyTotal: (darts) => (sum(darts) ? '✓' : '·'),
  turnResult: (turn, ctx) =>
    sum(turn.darts)
      ? { text: `${ctx.nameOf(turn.playerId)} réussit le ${dt(ctx.state).kind}${turn.round + 1}` }
      : { text: `${ctx.nameOf(turn.playerId)} rate le ${dt(ctx.state).kind}${turn.round + 1}`, bad: true },
  endSummary: (ctx) => winnerLine(ctx, (w) => `${dtSuccess(dt(ctx.state), w)} ${dtName(dt(ctx.state))} sur ${DT_NUMBERS}`),
  rankValue: (r) => `${r.value} / ${DT_NUMBERS}`,
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => ({
        value: dtSuccess(dt(ctx.state), i),
        extra: (
          <span className="dt-dots">
            {dt(ctx.state).results[i]!.map((ok, k) => (
              <i key={k} className={ok ? 'ok' : 'ko'} />
            ))}
          </span>
        ),
      })}
    />
  ),
  input: ({ state }, onDart, disabled) => {
    const s = dt(state);
    const side = sideNow(state);
    const marks: Mark[] = s.results[side]!.map((ok, k) => ({ zone: zone(k + 1, s.kind), tone: ok ? 'green' : 'red' }));
    return <ZoneInput target={zone(Math.min(roundOf(state) + 1, DT_NUMBERS), s.kind)} marks={marks} disabled={disabled} onDart={onDart} />;
  },
  pad: () => ({}),
};

/* ---------- Killer Doubles ---------- */
const kd = (s: GameState) => s.mode as KillerDoublesState;

export const killerdoublesView: ModeView = {
  title: () => 'Killer Doubles',
  hero: ({ state }, side) => ({ label: 'Ton double', value: `D${kd(state).numbers[side]}` }),
  hint: ({ state }) => {
    const side = sideNow(state);
    return (
      <>
        Ton double = +1 vie ({KD_MAX} max) · le double des autres = −1 vie · <Hearts lives={kd(state).lives[side]!} max={KD_MAX} />
      </>
    );
  },
  dartLabel: (d) => (d.dart.segment === 0 ? '0' : `${'SDT'[d.dart.multiplier - 1]}${d.dart.segment}`),
  dartNote: (d, { state }) => {
    if (!d.points) return '';
    return kd(state).numbers.indexOf(d.dart.segment) === sideNow(state) ? '+1 vie' : '−1 vie';
  },
  volleyTotal: () => '',
  turnResult: (turn, ctx) => ({
    text: `${ctx.nameOf(turn.playerId)} : ${plural(sum(turn.darts), 'double', 'doubles')} touché${sum(turn.darts) > 1 ? 's' : ''}`,
  }),
  winLabel: () => 'Dernier survivant',
  endSummary: (ctx) => winnerLine(ctx, (w) => `${plural(kd(ctx.state).taken[w]!, 'vie retirée', 'vies retirées')}`),
  rankValue: (r, { state }) => (kd(state).outOrder[r.sideIndex] ? 'éliminé' : plural(kd(state).lives[r.sideIndex]!, 'vie')),
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => ({
        value: `D${kd(ctx.state).numbers[i]}`,
        out: kd(ctx.state).outOrder[i] !== 0,
        extra: <Hearts lives={kd(ctx.state).lives[i]!} max={KD_MAX} />,
      })}
    />
  ),
  input: (ctx, onDart, disabled) => {
    const s = kd(ctx.state);
    const me = sideNow(ctx.state);
    const marks: Mark[] = s.numbers.flatMap((n, i): Mark[] =>
      s.outOrder[i] !== 0 ? [{ zone: zone(n), tone: 'out' }] : [{ zone: zone(n, 'D'), tone: i === me ? 'gold' : 'green', pulse: i === me }],
    );
    const players = s.numbers
      .map((number, side) => ({ side, number, lives: s.lives[side]!, maxLives: KD_MAX }))
      .filter((p) => s.outOrder[p.side] === 0);
    return <KillerInput ctx={ctx} players={players} marks={marks} doublesOnly disabled={disabled} onDart={onDart} />;
  },
  pad: () => ({}),
};

/* ---------- One Dart ---------- */
const od = (s: GameState) => s.mode as OneDartState;

export const onedartView: ModeView = {
  title: ({ state }) => `One Dart · ${od(state).rounds} tours`,
  hero: ({ state }) => ({ label: 'À viser', value: formatZone(od(state).targets[roundOf(state)]!) }),
  hint: ({ state }) => {
    const z = od(state).targets[roundOf(state)]!;
    return (
      <>
        Une seule fléchette · vaut <strong>{plural(oneDartValue(z), 'pt')}</strong> ·{' '}
        <RoundBar round={roundOf(state)} total={od(state).rounds} label="Tour" />
      </>
    );
  },
  dartNote: (d) => (d.points ? `+${d.points}` : '✗'),
  volleyTotal: (darts) => (sum(darts) ? `+${sum(darts)}` : '0'),
  turnResult: (turn, ctx) =>
    sum(turn.darts)
      ? { text: `${ctx.nameOf(turn.playerId)} : +${sum(turn.darts)}` }
      : { text: `${ctx.nameOf(turn.playerId)} : raté`, bad: true },
  endSummary: (ctx) =>
    winnerLine(ctx, (w) => `${plural(od(ctx.state).scores[w]!, 'point')} · ${od(ctx.state).hits[w]} / ${od(ctx.state).rounds} réussies`),
  rankValue: (r) => plural(r.value, 'pt'),
  board: (ctx) => <ListBoard ctx={ctx} row={(i) => ({ value: od(ctx.state).scores[i]!, detail: `${od(ctx.state).hits[i]} touchées` })} />,
  input: ({ state }, onDart, disabled) => {
    const z = od(state).targets[roundOf(state)]!;
    return <ZoneInput target={z} note={() => `+${oneDartValue(z)}`} disabled={disabled} onDart={onDart} />;
  },
  pad: () => ({}),
};

/* ---------- Survie ---------- */
const sv = (s: GameState) => s.mode as SurvieState;

export const survieView: ModeView = {
  title: ({ state }) => `Survie · ${sv(state).maxLives} vie${sv(state).maxLives > 1 ? 's' : ''}`,
  hero: ({ state }) => ({ label: 'À viser', value: formatZone(sv(state).targets[roundOf(state)]!) }),
  hint: ({ state }) => {
    const s = sv(state);
    const level = survieLevel(roundOf(state), s.step);
    return (
      <>
        <Hearts lives={s.lives[sideNow(state)]!} max={s.maxLives} /> · Niveau {level + 1} : {SURVIE_LEVELS[level]} · manche{' '}
        {roundOf(state) + 1}
      </>
    );
  },
  dartNote: (d) => (d.points ? '✓' : ''),
  volleyTotal: (darts) => (sum(darts) ? '✓' : '·'),
  turnResult: (turn, ctx) =>
    sum(turn.darts) ? { text: `${ctx.nameOf(turn.playerId)} tient bon` } : { text: `${ctx.nameOf(turn.playerId)} perd une vie`, bad: true },
  winLabel: () => 'Dernier survivant',
  endSummary: (ctx) => winnerLine(ctx, (w) => `${plural(sv(ctx.state).held[w]!, 'manche tenue', 'manches tenues')}`),
  rankValue: (r) => plural(r.value, 'manche tenue', 'manches tenues'),
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => ({
        value: sv(ctx.state).held[i]!,
        out: sv(ctx.state).outOrder[i] !== 0,
        extra: <Hearts lives={sv(ctx.state).lives[i]!} max={sv(ctx.state).maxLives} />,
      })}
    />
  ),
  input: ({ state }, onDart, disabled) => (
    <ZoneInput anyHit target={sv(state).targets[roundOf(state)]!} disabled={disabled} onDart={onDart} />
  ),
  pad: () => ({}),
};
