import { suggestCheckout } from '../game-engine/checkout';
import { formatDart } from '../game-engine/darts';
import type { X01State } from '../game-engine/modes/x01';
import type { GameState, X01Options } from '../game-engine/types';
import { MODE_NAMES } from '../game-setup/setup';
import { sessionState } from '../game-session/session';
import type { RoomView } from './protocol';

// Tableau de scores sur une tablette (vieil iPad au-dessus de la cible) : le serveur lui envoie un état déjà
// calculé, pour que sa page reste minuscule et tourne sur un Safari ancien sans le moteur du jeu.

/** Un côté (joueur ou équipe) tel que le tableau l'affiche. */
export interface BoardSide {
  name: string;
  color: string;
  /** Valeur principale : le reste en X01, sinon la valeur du classement (points, numéro…). */
  value: number;
  /** Moyenne par volée (X01 et Entraînement) ; null dans les autres modes. */
  avg: number | null;
}

/** Dernière volée terminée : le tableau lance l'animation qui va avec (100+, 140+, 180, BUST, victoire). */
export interface BoardVolley {
  /** Numéro de la volée dans la partie : il change à chaque volée, même identique. */
  seq: number;
  side: number;
  total: number;
  outcome: 'complete' | 'ended' | 'bust' | 'win' | 'done';
  darts: string[];
}

export interface BoardWinner {
  names: string[];
  darts: number | null;
  best: number | null;
  checkout: string[];
  checkoutPoints: number | null;
}

export interface Board {
  status: 'lobby' | 'playing' | 'finished';
  /** Identifiant de la partie : change à chaque nouvelle partie, revanche comprise. */
  game: string | null;
  title: string;
  round: number | null;
  /** Côté qui lance, null hors partie. */
  current: number | null;
  /** Fléchettes de la volée en cours. */
  darts: string[];
  sides: BoardSide[];
  /** Finition conseillée pour le joueur qui lance (X01). */
  checkout: string[];
  last: BoardVolley | null;
  winner: BoardWinner | null;
}

const sum = (n: number[]) => n.reduce((a, b) => a + b, 0);
const round1 = (n: number) => Math.round(n * 10) / 10;
const scored = (state: GameState, side: number) => state.turns.filter((t) => t.sideIndex === side);

/** Moyenne par volée : points marqués / volées jouées (un bust compte 0), comme sur l'écran de jeu. */
function average(state: GameState, side: number): number | null {
  const mode = state.config.mode;
  if (mode !== 'x01' && mode !== 'training') return null;
  const turns = scored(state, side);
  if (turns.length === 0) return 0;
  return round1(sum(turns.map((t) => (t.outcome === 'bust' ? 0 : sum(t.darts.map((d) => d.points))))) / turns.length);
}

function title(state: GameState): string {
  if (state.config.mode === 'x01') {
    const o = state.config.options as X01Options;
    return `${o.startScore} · ${o.out === 'double' ? 'Double out' : 'Sortie simple'}`;
  }
  return MODE_NAMES[state.config.mode] ?? state.config.mode;
}

function value(state: GameState, side: number): number {
  if (state.config.mode === 'x01') return (state.mode as X01State).remaining[side] ?? 0;
  return state.ranking.find((r) => r.sideIndex === side)?.value ?? 0;
}

function winnerOf(state: GameState, names: string[]): BoardWinner | null {
  if (state.status !== 'finished') return null;
  const winners = state.winners.map((s) => names[s] ?? '');
  if (state.winners.length !== 1) return { names: winners, darts: null, best: null, checkout: [], checkoutPoints: null };
  const turns = scored(state, state.winners[0]!);
  const totals = turns.map((t) => (t.outcome === 'bust' ? 0 : sum(t.darts.map((d) => d.points))));
  const last = turns[turns.length - 1];
  const x01 = state.config.mode === 'x01';
  return {
    names: winners,
    darts: sum(turns.map((t) => t.darts.length)),
    best: totals.length ? Math.max(...totals) : null,
    checkout: x01 && last ? last.darts.map((d) => formatDart(d.dart)) : [],
    checkoutPoints: x01 && last ? sum(last.darts.map((d) => d.points)) : null,
  };
}

/** L'état d'une partie tel que la tablette l'affiche. */
export function boardView(room: Pick<RoomView, 'status' | 'session' | 'players'>): Board {
  const empty: Board = { status: 'lobby', game: null, title: '', round: null, current: null, darts: [], sides: [], checkout: [], last: null, winner: null };
  const session = room.session;
  if (room.status !== 'playing' || !session) return empty;
  const state = sessionState(session);
  const colorOf = (id: string) => room.players.find((p) => p.id === id)?.color ?? '#3dff6e';
  const names = state.config.sides.map((s) => s.name);
  const current = state.current;
  const finished = state.status === 'finished' || session.status === 'finished';
  const lastTurn = state.turns[state.turns.length - 1];
  const x01 = state.config.mode === 'x01';
  const checkout =
    x01 && current
      ? (suggestCheckout((state.mode as X01State).remaining[current.sideIndex]!, current.dartsLeft, (state.config.options as X01Options).out) ?? []).map(formatDart)
      : [];
  return {
    status: finished ? 'finished' : 'playing',
    game: session.id,
    title: title(state),
    round: current ? current.round + 1 : lastTurn ? lastTurn.round + 1 : 1,
    current: finished || !current ? null : current.sideIndex,
    darts: current && !finished ? current.darts.map((d) => formatDart(d.dart)) : [],
    sides: state.config.sides.map((s, i) => ({
      name: s.name,
      color: s.color ?? colorOf(s.playerIds[0] ?? ''),
      value: value(state, i),
      avg: average(state, i),
    })),
    checkout,
    last: lastTurn
      ? {
          seq: lastTurn.turnIndex,
          side: lastTurn.sideIndex,
          total: lastTurn.outcome === 'bust' ? 0 : sum(lastTurn.darts.map((d) => d.points)),
          outcome: lastTurn.outcome,
          darts: lastTurn.darts.map((d) => formatDart(d.dart)),
        }
      : null,
    winner: winnerOf(state, names),
  };
}

/** Code d'appairage affiché par la tablette : 4 chiffres, tapés sur la borne. */
export const isPairCode = (code: unknown): code is string => typeof code === 'string' && /^\d{4}$/.test(code);

/** Réglages d'une tablette, modifiés depuis la borne. */
export interface DisplaySettings {
  /** Affichage assombri quand aucune partie n'est en cours. */
  dim: boolean;
  /** Animations 100+, 140+, 180, BUST et victoire. */
  animations: boolean;
  /** Demande de rechargement : la tablette se recharge quand cette valeur change. */
  reload: number;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = { dim: true, animations: true, reload: 0 };

export function cleanDisplaySettings(input: unknown, base: DisplaySettings = DEFAULT_DISPLAY_SETTINGS): DisplaySettings {
  const o = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  return {
    dim: typeof o.dim === 'boolean' ? o.dim : base.dim,
    animations: typeof o.animations === 'boolean' ? o.animations : base.animations,
    reload: typeof o.reload === 'number' && Number.isFinite(o.reload) ? o.reload : base.reload,
  };
}

/** Tablette reliée à un compte, telle que la borne la liste. */
export interface DisplayInfo {
  id: string;
  createdAt: string;
  seenAt: string | null;
  settings: DisplaySettings;
}

/** Ce que la tablette apprend du serveur à chaque passage. */
export interface DisplayStatus {
  paired: boolean;
  /** Code à afficher tant que la tablette n'est pas reliée. */
  pairCode?: string;
  settings: DisplaySettings;
  /** Partie suivie (identifiant opaque) : quand il change, la tablette se reconnecte. */
  game: string | null;
}
