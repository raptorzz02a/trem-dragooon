import { useEffect, useRef, useState } from 'react';
import { formatDart, type Dart } from '../../game-engine/darts';
import type { GameState, TurnRecord } from '../../game-engine/types';
import type { GameSession } from '../../game-session/session';
import type { AppSettings } from '../../settings/settings';
import type { PlayerRef } from '../../storage/currentGame';
import { ScorePad } from '../components/ScorePad';
import { MODE_VIEWS } from '../modes';
import type { ViewContext } from '../modes/types';
import { useTapGuard } from '../useTapGuard';
import type { Profile } from '../../profiles/types';
import { Avatar } from '../components/Avatar';
import './Game.css';

interface Props {
  session: GameSession;
  state: GameState;
  players: PlayerRef[];
  /** Profils, pour afficher l'avatar du joueur actif. */
  profiles?: Profile[];
  settings: AppSettings;
  onDart: (dart: Dart) => void;
  onEndTurn: () => void;
  onUndo: () => void;
  onQuit: () => void;
  onRematch: () => void;
  onEditPlayers: () => void;
  onHome: () => void;
}

/** Écran de jeu commun aux quatre modes ; ce qui diffère est fourni par la vue du mode. */
export function Game(props: Props) {
  const { state, players, settings } = props;
  const view = MODE_VIEWS[state.config.mode];
  const sides = state.config.sides;
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? '?';
  const sideName = (i: number) => (state.config.teamMode ? sides[i]!.name : nameOf(sides[i]!.playerIds[0]!));
  const ctx: ViewContext = { state, nameOf, sideName };
  const avatarOf = (id: string, size: number) => {
    const p = props.profiles?.find((x) => x.id === id);
    return p && !p.deleted ? <Avatar avatar={p.avatar} color={p.color} size={size} /> : null;
  };
  const current = state.current;
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
  const hero = current ? view.hero(ctx, current.sideIndex) : null;
  const round = (current?.round ?? state.turns.at(-1)?.round ?? 0) + 1;
  const result = transition ? view.turnResult(transition, ctx) : null;

  return (
    <div className={`screen game game-${state.config.mode}`}>
      <header className="game-top">
        <span className="game-title">
          {view.title(ctx)}
          {state.config.teamMode ? ' · Équipes' : ''}
        </span>
        <span className="game-round">Manche {round}</span>
        <button className="game-quit" onClick={() => setConfirmQuit(true)}>
          Quitter
        </button>
      </header>

      <div className="game-body">
        <section className="game-left">
          {current && activeSide && hero && (
            <div className="active-card" style={{ borderColor: activeSide.color ?? 'var(--gold)' }}>
              <div className="active-head">
                {avatarOf(current.playerId, 72)}
                <div className="active-who">
                  <div className="label">Joueur actif</div>
                  <div className="active-name">{nameOf(current.playerId)}</div>
                  {state.config.teamMode && (
                    <div className="active-team" style={{ color: activeSide.color }}>
                      {activeSide.name}
                    </div>
                  )}
                </div>
                {view.heroAside?.(ctx)}
                <div className="active-remaining-box">
                  <div className="label">{hero.label}</div>
                  <div className="active-remaining">{hero.value}</div>
                </div>
              </div>
              {!view.heroAside && <div className="active-checkout">{view.hint(ctx) ?? ' '}</div>}
              <div className="volley">
                {[0, 1, 2].map((i) => {
                  const d = current.darts[i];
                  return (
                    <div key={i} className={`volley-slot ${d ? 'filled' : ''} ${d && d.points === 0 ? 'zero' : ''}`}>
                      {d ? (
                        <>
                          <span className="volley-dart">{view.dartLabel?.(d, ctx) ?? formatDart(d.dart)}</span>
                          <span className="volley-points">{view.dartNote(d, ctx)}</span>
                        </>
                      ) : (
                        <span className="volley-empty">{i + 1}</span>
                      )}
                    </div>
                  );
                })}
                <div className="volley-total">
                  <span className="label">Volée</span>
                  {view.volleyTotal(current.darts, ctx)}
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

          <div className="game-board">{view.board(ctx)}</div>
        </section>

        <section className="game-right">
          {view.input ? (
            view.input(ctx, props.onDart, !current || transition !== null)
          ) : (
            <ScorePad disabled={!current || transition !== null} onDart={props.onDart} {...view.pad(ctx)} />
          )}
        </section>
      </div>

      {transition && result && current && activeSide && hero && (
        <div className="overlay transition" onClick={() => setTransition(null)}>
          <div className="transition-card" style={{ borderColor: activeSide.color ?? 'var(--gold)' }}>
            <div className={`transition-result ${result.bad ? 'bust' : ''}`}>{result.text}</div>
            {avatarOf(current.playerId, 130)}
            <div className="label">À toi de jouer</div>
            <div className="transition-name">{nameOf(current.playerId)}</div>
            {state.config.teamMode && (
              <div className="transition-team" style={{ color: activeSide.color }}>
                {activeSide.name}
              </div>
            )}
            <div className="transition-info">
              3 fléchettes · {hero.label.toLowerCase()} <strong>{hero.value}</strong>
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
            <div className="label">{view.winLabel?.(ctx) ?? (state.winners.length > 1 ? 'Égalité' : 'Victoire')}</div>
            <div className="end-winner">{state.winners.map(sideName).join(' et ')}</div>
            <ol className="end-ranking">
              {state.ranking.map((r) => (
                <li key={r.sideIndex}>
                  <span>{r.rank}.</span>
                  <span className="end-rank-name">{sideName(r.sideIndex)}</span>
                  <span>{view.rankValue(r, ctx)}</span>
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
