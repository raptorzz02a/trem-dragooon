import { useEffect, useRef, useState } from 'react';
import { suggestCheckout } from '../../game-engine/checkout';
import { playerFor } from '../../game-engine/engine';
import { formatDart, type Dart } from '../../game-engine/darts';
import type { X01State } from '../../game-engine/modes/x01';
import type { GameState, TurnRecord, X01Options } from '../../game-engine/types';
import type { GameSession } from '../../game-session/session';
import type { AppSettings } from '../../settings/settings';
import type { PlayerRef } from '../../storage/currentGame';
import { ScorePad } from '../components/ScorePad';
import { useTapGuard } from '../useTapGuard';
import './GameX01.css';

interface Props {
  session: GameSession;
  state: GameState;
  players: PlayerRef[];
  settings: AppSettings;
  onDart: (dart: Dart) => void;
  onEndTurn: () => void;
  onUndo: () => void;
  onQuit: () => void;
  onRematch: () => void;
  onEditPlayers: () => void;
  onHome: () => void;
}

/** Moyenne par volée d'un côté : points marqués / volées jouées (un bust compte 0). */
function averages(state: GameState): number[] {
  return state.config.sides.map((_, i) => {
    const turns = state.turns.filter((t) => t.sideIndex === i);
    if (turns.length === 0) return 0;
    const scored = turns.reduce((sum, t) => sum + (t.outcome === 'bust' ? 0 : t.darts.reduce((a, d) => a + d.points, 0)), 0);
    return scored / turns.length;
  });
}

const turnTotal = (t: TurnRecord) => t.darts.reduce((a, d) => a + d.points, 0);

export function GameX01(props: Props) {
  const { state, players, settings } = props;
  const options = state.config.options as X01Options;
  const x01 = state.mode as X01State;
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? '?';
  const sides = state.config.sides;
  const current = state.current;
  const avg = averages(state);
  const guard = useTapGuard(400);

  // Écran de transition : affiché quand le tour avance (pas quand on annule).
  const [transition, setTransition] = useState<TurnRecord | null>(null);
  const lastTurnIndex = useRef(current?.turnIndex ?? -1);
  useEffect(() => {
    const index = current?.turnIndex ?? -1;
    if (current && index > lastTurnIndex.current && settings.animations) {
      setTransition(state.turns.at(-1) ?? null);
    } else if (!current || index < lastTurnIndex.current) {
      setTransition(null);
    }
    lastTurnIndex.current = index;
  }, [current, state.turns, settings.animations]);
  useEffect(() => {
    if (!transition) return;
    const timer = setTimeout(() => setTransition(null), settings.transitionMs);
    return () => clearTimeout(timer);
  }, [transition, settings.transitionMs]);

  // « Fin de tour » demande un second appui pour éviter une fin de volée accidentelle.
  const [confirmEnd, setConfirmEnd] = useState(false);
  useEffect(() => {
    if (!confirmEnd) return;
    const timer = setTimeout(() => setConfirmEnd(false), 2500);
    return () => clearTimeout(timer);
  }, [confirmEnd]);
  useEffect(() => setConfirmEnd(false), [current?.turnIndex]);

  const [confirmQuit, setConfirmQuit] = useState(false);

  const activeSide = current ? sides[current.sideIndex]! : null;
  const remaining = current ? x01.remaining[current.sideIndex]! : 0;
  const checkout = current ? suggestCheckout(remaining, current.dartsLeft, options.out) : null;
  const round = (current?.round ?? state.turns.at(-1)?.round ?? 0) + 1;

  return (
    <div className="screen game">
      <header className="game-top">
        <span className="game-title">
          {options.startScore} · {options.out === 'double' ? 'Double Out' : 'Sortie simple'}
          {state.config.teamMode ? ' · Équipes' : ''}
        </span>
        <span className="game-round">Manche {round}</span>
        <button className="game-quit" onClick={() => setConfirmQuit(true)}>
          Quitter
        </button>
      </header>

      <div className="game-body">
        <section className="game-left">
          {current && activeSide && (
            <div className="active-card" style={{ borderColor: activeSide.color ?? 'var(--gold)' }}>
              <div className="active-head">
                <div>
                  <div className="label">Joueur actif</div>
                  <div className="active-name">{nameOf(current.playerId)}</div>
                  {state.config.teamMode && (
                    <div className="active-team" style={{ color: activeSide.color }}>
                      {activeSide.name}
                    </div>
                  )}
                </div>
                <div className="active-remaining-box">
                  <div className="label">Restant</div>
                  <div className="active-remaining">{remaining}</div>
                </div>
              </div>
              <div className="active-checkout">
                {checkout ? (
                  <>
                    <span className="label">Finition</span> {checkout.map(formatDart).join(' · ')}
                  </>
                ) : (
                  ' '
                )}
              </div>
              <div className="volley">
                {[0, 1, 2].map((i) => {
                  const d = current.darts[i];
                  return (
                    <div key={i} className={`volley-slot ${d ? 'filled' : ''}`}>
                      {d ? (
                        <>
                          <span className="volley-dart">{formatDart(d.dart)}</span>
                          <span className="volley-points">{d.points}</span>
                        </>
                      ) : (
                        <span className="volley-empty">{i + 1}</span>
                      )}
                    </div>
                  );
                })}
                <div className="volley-total">
                  <span className="label">Volée</span>
                  {current.darts.reduce((a, d) => a + d.points, 0)}
                </div>
              </div>
              <div className="game-actions">
                <button disabled={props.session.events.length === 0} onClick={guard(props.onUndo)}>
                  ↶ Annuler la fléchette
                </button>
                <button
                  className={confirmEnd ? 'btn-gold' : 'btn-primary'}
                  onClick={guard(() => {
                    if (confirmEnd) props.onEndTurn();
                    else setConfirmEnd(true);
                  })}
                >
                  {confirmEnd ? 'Confirmer la fin du tour' : 'Fin de tour'}
                </button>
              </div>
            </div>
          )}

          <ol className="board">
            {sides.map((side, i) => {
              const active = current?.sideIndex === i;
              // Joueur qui lancera la prochaine volée de ce côté.
              const nextPlayer = current ? playerFor(state.config, i, current.round + (i < current.sideIndex ? 1 : 0)) : '';
              return (
                <li key={side.id} className={active ? 'active' : ''} style={{ borderLeftColor: side.color ?? 'transparent' }}>
                  <span className="board-name">
                    {state.config.teamMode ? side.name : nameOf(side.playerIds[0]!)}
                    {state.config.teamMode && nextPlayer && <span className="board-sub"> · {nameOf(nextPlayer)}</span>}
                  </span>
                  <span className="board-avg">moy. {avg[i]!.toFixed(1)}</span>
                  <span className="board-score">{x01.remaining[i]}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="game-right">
          <ScorePad disabled={!current || transition !== null} onDart={props.onDart} />
        </section>
      </div>

      {transition && current && activeSide && (
        <div className="overlay transition" onClick={() => setTransition(null)}>
          <div className="transition-card" style={{ borderColor: activeSide.color ?? 'var(--gold)' }}>
            <div className={`transition-result ${transition.outcome === 'bust' ? 'bust' : ''}`}>
              {transition.outcome === 'bust'
                ? `Bust ! ${nameOf(transition.playerId)} revient à ${x01.remaining[transition.sideIndex]}`
                : `${nameOf(transition.playerId)} : ${turnTotal(transition)} points`}
            </div>
            <div className="label">À toi de jouer</div>
            <div className="transition-name">{nameOf(current.playerId)}</div>
            {state.config.teamMode && (
              <div className="transition-team" style={{ color: activeSide.color }}>
                {activeSide.name}
              </div>
            )}
            <div className="transition-info">
              3 fléchettes · reste <strong>{remaining}</strong>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTransition(null);
                props.onUndo();
              }}
            >
              ↶ Annuler la dernière fléchette
            </button>
          </div>
        </div>
      )}

      {state.status === 'finished' && (
        <div className="overlay">
          <div className="dialog end">
            <div className="label">Victoire</div>
            <div className="end-winner">
              {state.winners
                .map((w) => (state.config.teamMode ? sides[w]!.name : nameOf(sides[w]!.playerIds[0]!)))
                .join(' et ')}
            </div>
            <ol className="end-ranking">
              {state.ranking.map((r) => (
                <li key={r.sideIndex}>
                  <span>{r.rank}.</span>
                  <span className="end-rank-name">
                    {state.config.teamMode ? sides[r.sideIndex]!.name : nameOf(sides[r.sideIndex]!.playerIds[0]!)}
                  </span>
                  <span>reste {r.value}</span>
                  <span className="end-avg">moy. {avg[r.sideIndex]!.toFixed(1)}</span>
                </li>
              ))}
            </ol>
            <div className="dialog-actions">
              <button onClick={props.onUndo}>↶ Annuler la dernière fléchette</button>
              <button onClick={props.onHome}>Accueil</button>
              <button className="btn-primary" onClick={props.onEditPlayers}>
                Modifier les joueurs
              </button>
              <button className="btn-gold" onClick={props.onRematch}>
                Rejouer
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmQuit && (
        <div className="overlay">
          <div className="dialog">
            <div>Quitter la partie ? Elle sera enregistrée comme abandonnée.</div>
            <div className="dialog-actions">
              <button onClick={() => setConfirmQuit(false)}>Continuer à jouer</button>
              <button className="btn-danger" onClick={props.onQuit}>
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
