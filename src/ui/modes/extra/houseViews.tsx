import { bestBonus, contractLabel, fulfils, type ContratState } from '../../../game-engine/extra/contrat';
import { bombeTarget, FUSE_HIT, FUSE_MISS, type BombeState } from '../../../game-engine/extra/bombe';
import { CHEST_BONUSES, type CoffresState } from '../../../game-engine/extra/coffres';
import { atTop, type PyramideState } from '../../../game-engine/extra/pyramide';
import type { RoiState } from '../../../game-engine/extra/roi';
import { BULL } from '../../../game-engine/darts';
import { formatZone, zone, zoneName } from '../../../game-engine/extra/zones';
import type { GameState } from '../../../game-engine/types';
import type { Mark } from '../../components/DartBoard';
import { NumbersInput } from '../../components/NumbersInput';
import { ScorePad } from '../../components/ScorePad';
import { ZoneInput } from '../../components/ZoneInput';
import { ListBoard } from '../ListBoard';
import type { ModeView } from '../types';
import { Hearts, plural, roundOf, RoundBar, sideNow, sum, winnerLine } from './kit';

/* ---------- Le Contrat ---------- */
const ct = (s: GameState) => s.mode as ContratState;

export const contratView: ModeView = {
  title: ({ state }) => `Le Contrat · ${ct(state).rounds} manches`,
  hero: ({ state }, side) => ({ label: 'Points', value: ct(state).scores[side]! }),
  hint: ({ state }) => {
    const s = ct(state);
    const offers = s.offers[Math.min(roundOf(state), s.offers.length - 1)]!;
    return (
      <span className="hint-chips">
        {offers.map((c, i) => (
          <span key={i} className={`hint-chip${fulfils(c, s.darts) ? ' done' : ''}`}>
            {contractLabel(c)} · +{c.bonus}
          </span>
        ))}
      </span>
    );
  },
  dartNote: (d) => String(d.points),
  volleyTotal: (_darts, { state }) => {
    const s = ct(state);
    const b = bestBonus(s.offers[Math.min(roundOf(state), s.offers.length - 1)]!, s.darts);
    return b ? `+${b}` : '·';
  },
  turnResult: (turn, ctx) => {
    const s = ct(ctx.state);
    const b = bestBonus(
      s.offers[turn.round]!,
      turn.darts.map((d) => d.dart),
    );
    return b
      ? { text: `${ctx.nameOf(turn.playerId)} remplit un contrat : +${b}` }
      : { text: `${ctx.nameOf(turn.playerId)} : aucun contrat rempli`, bad: true };
  },
  endSummary: (ctx) =>
    winnerLine(
      ctx,
      (w) => `${plural(ct(ctx.state).scores[w]!, 'point')} · ${plural(ct(ctx.state).won[w]!, 'contrat rempli', 'contrats remplis')}`,
    ),
  rankValue: (r, { state }) => `${plural(r.value, 'pt')} · ${ct(state).won[r.sideIndex]} contrats`,
  board: (ctx) => <ListBoard ctx={ctx} row={(i) => ({ value: ct(ctx.state).scores[i]!, detail: `${ct(ctx.state).won[i]} remplis` })} />,
  pad: () => ({}),
};

/* ---------- La Pyramide ---------- */
const py = (s: GameState) => s.mode as PyramideState;
const floorLabel = (s: PyramideState, side: number) => (atTop(s, side) ? 'Sommet' : s.floors[s.floor[side]!]!.label);

export const pyramideView: ModeView = {
  title: ({ state }) => `La Pyramide · ${py(state).floors.length === 6 ? 'Simple' : 'Spicy'}`,
  hero: ({ state }, side) => ({
    label: 'Étage',
    value: `${Math.min(py(state).floor[side]! + 1, py(state).floors.length)} / ${py(state).floors.length}`,
  }),
  hint: ({ state }) => {
    const s = py(state);
    const side = sideNow(state);
    const f = s.floors[s.floor[side]!];
    if (!f) return 'Sommet atteint !';
    if (f.kind === 'all') {
      const left = f.numbers.filter((n) => !s.done[side]!.includes(n));
      return (
        <>
          Étage {f.label} · restent <strong>{left.join(' · ')}</strong>
        </>
      );
    }
    return (
      <>
        Étage : <strong>{f.label}</strong> (une touche suffit)
      </>
    );
  },
  dartNote: (d) => (d.points ? '✓' : ''),
  volleyTotal: (darts) => (sum(darts) ? `+${sum(darts)}` : '·'),
  turnResult: (turn, ctx) => {
    const s = py(ctx.state);
    return sum(turn.darts)
      ? { text: `${ctx.nameOf(turn.playerId)} : ${atTop(s, turn.sideIndex) ? 'au sommet !' : floorLabel(s, turn.sideIndex)}` }
      : { text: `${ctx.nameOf(turn.playerId)} : rien de validé`, bad: true };
  },
  endSummary: (ctx) => winnerLine(ctx, (w) => `Sommet en ${plural(py(ctx.state).darts[w]!, 'fléchette')}`),
  rankValue: (r, { state }) => `${floorLabel(py(state), r.sideIndex)} · ${plural(py(state).darts[r.sideIndex]!, 'fl.', 'fl.')}`,
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => ({
        value: `${Math.min(py(ctx.state).floor[i]! + 1, py(ctx.state).floors.length)}`,
        detail: floorLabel(py(ctx.state), i),
        extra: (
          <span className="pyr-mini">
            {py(ctx.state).floors.map((_, k) => (
              <i key={k} className={k < py(ctx.state).floor[i]! ? 'ok' : k === py(ctx.state).floor[i] ? 'now' : ''} />
            ))}
          </span>
        ),
      })}
    />
  ),
  input: ({ state }, onDart, disabled) => {
    const s = py(state);
    const side = sideNow(state);
    const f = s.floors[s.floor[side]!];
    if (!f) return null;
    if (f.kind === 'all') {
      const left = f.numbers.filter((n) => !s.done[side]!.includes(n));
      const marks: Mark[] = [
        ...s.done[side]!.map((n): Mark => ({ zone: zone(n), tone: 'green' })),
        ...left.map((n): Mark => ({ zone: zone(n), tone: 'gold', pulse: true })),
      ];
      return <NumbersInput numbers={left} marks={marks} disabled={disabled} onDart={onDart} />;
    }
    if (f.test === 'bull') return <ZoneInput anyHit target={zone(BULL)} disabled={disabled} onDart={onDart} />;
    return <ScorePad disabled={disabled} onDart={onDart} />;
  },
  pad: () => ({}),
};

/* ---------- La Bombe ---------- */
const bo = (s: GameState) => s.mode as BombeState;

export const bombeView: ModeView = {
  title: ({ state }) => `La Bombe · ${bo(state).maxLives} vie${bo(state).maxLives > 1 ? 's' : ''}`,
  hero: ({ state }) => ({ label: '💣 Mèche', value: bo(state).fuse }),
  hint: ({ state }) => {
    const s = bo(state);
    return (
      <>
        <Hearts lives={s.lives[sideNow(state)]!} max={s.maxLives} /> · vise le <strong>{bombeTarget(s)}</strong> · touché +{FUSE_HIT} · raté{' '}
        {FUSE_MISS}
        {s.fuse <= 3 && <span className="board-chip bad"> ça va sauter !</span>}
      </>
    );
  },
  dartNote: (d) => (d.points > 0 ? `+${d.points}` : String(d.points)),
  volleyTotal: (darts) => {
    const t = sum(darts);
    return t > 0 ? `+${t}` : String(t);
  },
  turnResult: (turn, ctx) => {
    const exploded = turn.outcome === 'done' || turn.outcome === 'win';
    return exploded
      ? { text: `💥 La bombe explose chez ${ctx.nameOf(turn.playerId)} !`, bad: true }
      : { text: `${ctx.nameOf(turn.playerId)} passe la bombe : mèche ${bo(ctx.state).fuse}` };
  },
  winLabel: () => 'Dernier survivant',
  endSummary: (ctx) =>
    winnerLine(ctx, (w) => `${plural(bo(ctx.state).explosions[w]!, 'explosion')} subie${bo(ctx.state).explosions[w]! > 1 ? 's' : ''}`),
  rankValue: (r, { state }) => (bo(state).outOrder[r.sideIndex] ? 'éliminé' : plural(bo(state).lives[r.sideIndex]!, 'vie')),
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => ({
        value: bo(ctx.state).explosions[i]!,
        detail: '💥',
        out: bo(ctx.state).outOrder[i] !== 0,
        extra: <Hearts lives={bo(ctx.state).lives[i]!} max={bo(ctx.state).maxLives} />,
      })}
    />
  ),
  input: ({ state }, onDart, disabled) => (
    <ZoneInput
      anyHit
      target={zone(bombeTarget(bo(state)))}
      note={() => `mèche +${FUSE_HIT}`}
      missLabel={`Raté · mèche ${FUSE_MISS}`}
      disabled={disabled}
      onDart={onDart}
    />
  ),
  pad: () => ({}),
};

/* ---------- Les Coffres ---------- */
const cf = (s: GameState) => s.mode as CoffresState;

export const coffresView: ModeView = {
  title: ({ state }) => `Les Coffres · ${cf(state).rounds} manches`,
  hero: ({ state }, side) => ({ label: 'Points', value: cf(state).scores[side]! }),
  hint: (ctx) => {
    const s = cf(ctx.state);
    return (
      <span className="hint-chips">
        {CHEST_BONUSES.map((b, i) => {
          const o = s.opened[i];
          return (
            <span key={i} className={`hint-chip${o ? ' done' : ''}`}>
              {o ? `${formatZone(s.chests[i]!)} · ${ctx.sideName(o.side)}` : `🔒 ${b}`}
            </span>
          );
        })}
      </span>
    );
  },
  dartNote: (d) => `+${d.points}`,
  volleyTotal: (darts) => `+${sum(darts)}`,
  turnResult: (turn, ctx) => {
    const s = cf(ctx.state);
    const opened = s.opened
      .map((o, i) => (o && o.side === turn.sideIndex && o.round === turn.round ? CHEST_BONUSES[i] : 0))
      .filter(Boolean);
    return opened.length
      ? { text: `🎁 ${ctx.nameOf(turn.playerId)} ouvre un coffre : +${opened.join(' +')} !` }
      : { text: `${ctx.nameOf(turn.playerId)} : +${sum(turn.darts)}` };
  },
  endSummary: (ctx) => winnerLine(ctx, (w) => `${plural(cf(ctx.state).scores[w]!, 'point')} dont ${cf(ctx.state).bonus[w]} de coffres`),
  rankValue: (r, { state }) => `${plural(r.value, 'pt')} · coffres ${cf(state).bonus[r.sideIndex]}`,
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => ({ value: cf(ctx.state).scores[i]!, detail: cf(ctx.state).bonus[i] ? `🎁 ${cf(ctx.state).bonus[i]}` : undefined })}
    />
  ),
  pad: () => ({}),
};

/* ---------- Le Roi de la Cible ---------- */
const ro = (s: GameState) => s.mode as RoiState;

export const roiView: ModeView = {
  title: ({ state }) => `Le Roi de la Cible · ${ro(state).rounds} manches`,
  hero: ({ state }) => ({ label: 'Cible royale', value: formatZone(ro(state).targets[Math.min(roundOf(state), ro(state).rounds - 1)]!) }),
  hint: (ctx) => {
    const s = ro(ctx.state);
    const z = s.targets[Math.min(roundOf(ctx.state), s.rounds - 1)]!;
    return (
      <>
        {s.king >= 0 ? (
          <>
            👑 <strong>{ctx.sideName(s.king)}</strong>
            {s.king === sideNow(ctx.state) ? ' (toi) : défends ta couronne' : ` · touche ${zoneName(z)} pour le détrôner`}
          </>
        ) : (
          <>Personne n’est roi : touche {zoneName(z)}</>
        )}{' '}
        · <RoundBar round={roundOf(ctx.state)} total={s.rounds} />
      </>
    );
  },
  dartNote: (d) => (d.points ? '👑' : ''),
  volleyTotal: (darts) => (sum(darts) ? '👑' : '·'),
  turnResult: (turn, ctx) =>
    sum(turn.darts)
      ? { text: `👑 ${ctx.nameOf(turn.playerId)} prend la couronne !` }
      : { text: `${ctx.nameOf(turn.playerId)} : pas de couronne` },
  endSummary: (ctx) =>
    winnerLine(ctx, (w) => `${plural(ro(ctx.state).crowns[w]!, 'point')} de couronne · plus longue série ${ro(ctx.state).best[w]}`),
  rankValue: (r) => plural(r.value, 'pt'),
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => ({
        value: ro(ctx.state).crowns[i]!,
        extra: ro(ctx.state).king === i ? <span className="board-chip gold">👑 ROI</span> : null,
      })}
    />
  ),
  input: ({ state }, onDart, disabled) => (
    <ZoneInput anyHit target={ro(state).targets[Math.min(roundOf(state), ro(state).rounds - 1)]!} disabled={disabled} onDart={onDart} />
  ),
  pad: () => ({}),
};
