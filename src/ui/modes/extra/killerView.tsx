import { alive, type KillerState } from '../../../game-engine/extra/killer';
import type { GameState } from '../../../game-engine/types';
import { KillerInput } from '../../components/KillerInput';
import type { Mark } from '../../components/DartBoard';
import { zone } from '../../../game-engine/extra/zones';
import { ListBoard } from '../ListBoard';
import type { ModeView } from '../types';
import { Hearts } from './kit';

const kl = (state: GameState) => state.mode as KillerState;
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export { Hearts };

export const killerView: ModeView = {
  title: ({ state }) => `Killer · ${kl(state).maxLives} vies`,
  hero: ({ state }, side) => ({
    label: 'Ton numéro',
    value: kl(state).numbers[side]!,
  }),
  hint: ({ state }) => {
    const side = state.current?.sideIndex ?? 0;
    const k = kl(state);
    return k.killer[side] ? (
      <>
        <span className="board-chip gold">KILLER</span> Vise les numéros des autres · <Hearts lives={k.lives[side]!} max={k.maxLives} />
      </>
    ) : (
      <>
        Touche ton double <strong>D{k.numbers[side]}</strong> pour devenir Killer · <Hearts lives={k.lives[side]!} max={k.maxLives} />
      </>
    );
  },
  dartLabel: (d, { state }) => {
    const owner = kl(state).numbers.indexOf(d.dart.segment);
    return owner >= 0 && d.dart.segment > 0
      ? `${'SDT'[d.dart.multiplier - 1]}${d.dart.segment}`
      : d.dart.segment === 25
        ? d.dart.multiplier === 2
          ? '50'
          : '25'
        : d.dart.segment === 0
          ? '0'
          : `${'SDT'[d.dart.multiplier - 1]}${d.dart.segment}`;
  },
  dartNote: (d) => (d.points > 0 ? `−${d.points} vie${d.points > 1 ? 's' : ''}` : ''),
  volleyTotal: (darts) => {
    const n = darts.reduce((a, d) => a + d.points, 0);
    return n > 0 ? `−${n}` : '·';
  },
  turnResult: (turn, ctx) => {
    const n = turn.darts.reduce((a, d) => a + d.points, 0);
    const k = kl(ctx.state);
    if (!alive(k, turn.sideIndex))
      return {
        text: `${ctx.nameOf(turn.playerId)} s’est éliminé !`,
        bad: true,
      };
    if (n > 0)
      return {
        text: `${ctx.nameOf(turn.playerId)} retire ${plural(n, 'vie')}`,
      };
    return {
      text: k.killer[turn.sideIndex]
        ? `${ctx.nameOf(turn.playerId)} : aucune vie retirée`
        : `${ctx.nameOf(turn.playerId)} n’est pas encore Killer`,
    };
  },
  winLabel: () => 'Dernier survivant',
  endSummary: ({ state }) => {
    if (state.winners.length !== 1) return null;
    const w = state.winners[0]!;
    return (
      <div className="end-darts">
        {plural(kl(state).taken[w]!, 'vie')} retirée
        {kl(state).taken[w]! > 1 ? 's' : ''} · <Hearts lives={kl(state).lives[w]!} max={kl(state).maxLives} />
      </div>
    );
  },
  rankValue: (r, { state }) => {
    const k = kl(state);
    return `${alive(k, r.sideIndex) ? plural(k.lives[r.sideIndex]!, 'vie') : 'éliminé'} · ${plural(k.taken[r.sideIndex]!, 'vie')} retirée${k.taken[r.sideIndex]! > 1 ? 's' : ''}`;
  },
  board: (ctx) => (
    <ListBoard
      ctx={ctx}
      row={(i) => {
        const k = kl(ctx.state);
        return {
          value: k.numbers[i]!,
          out: !alive(k, i),
          extra: (
            <>
              {k.killer[i] && <span className="board-chip gold">KILLER</span>}
              <Hearts lives={k.lives[i]!} max={k.maxLives} />
            </>
          ),
        };
      }}
    />
  ),
  input: (ctx, onDart, disabled) => {
    const k = kl(ctx.state);
    const me = ctx.state.current?.sideIndex ?? -1;
    const iAmKiller = me >= 0 && k.killer[me];
    // Avant d'être Killer : son double à viser. Ensuite : les numéros des adversaires (en rouge les Killers).
    const marks: Mark[] = k.numbers.flatMap((n, i): Mark[] => {
      if (!alive(k, i)) return [{ zone: zone(n), tone: 'out' }];
      if (i === me)
        return iAmKiller
          ? [{ zone: zone(n), tone: 'soft' }]
          : [
              { zone: zone(n), tone: 'soft' },
              { zone: zone(n, 'D'), tone: 'gold', pulse: true },
            ];
      return iAmKiller ? [{ zone: zone(n), tone: k.killer[i] ? 'red' : 'green' }] : [];
    });
    const players = k.numbers
      .map((number, side) => ({ side, number, lives: k.lives[side]!, maxLives: k.maxLives, killer: k.killer[side] }))
      .filter((p) => alive(k, p.side));
    return <KillerInput ctx={ctx} players={players} marks={marks} disabled={disabled} onDart={onDart} />;
  },
  pad: () => ({}),
};
