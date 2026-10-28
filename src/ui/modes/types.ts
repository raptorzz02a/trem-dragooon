import type { ReactNode } from 'react';
import type { ThrownDart, GameState, RankEntry, TurnRecord } from '../../game-engine/types';

/** Ce qu'il faut savoir des joueurs pour l'affichage. */
export interface ViewContext {
  state: GameState;
  nameOf: (playerId: string) => string;
  /** Nom affiché d'un côté : l'équipe, ou le joueur en individuel. */
  sideName: (sideIndex: number) => string;
}

/** Tout ce qui change d'un mode à l'autre sur l'écran de jeu. Le reste de l'écran est commun. */
export interface ModeView {
  /** Ligne de titre, ex. « 501 · Double Out ». */
  title(ctx: ViewContext): string;
  /** Grande valeur du joueur actif (reste, points, prochain numéro…). */
  hero(ctx: ViewContext, sideIndex: number): { label: string; value: string | number };
  /** Ligne sous la valeur : finition, zones restantes, consigne. */
  hint(ctx: ViewContext): ReactNode;
  /** Texte court sous une fléchette de la volée. */
  dartNote(dart: ThrownDart, ctx: ViewContext): string;
  volleyTotal(darts: ThrownDart[], ctx: ViewContext): string;
  /** Résultat de la volée terminée, affiché sur l'écran de transition. */
  turnResult(turn: TurnRecord, ctx: ViewContext): { text: string; bad?: boolean };
  /** Titre de l'écran de fin, si le mode a une victoire particulière (ex. « Shanghai ! »). */
  winLabel?(ctx: ViewContext): string | null;
  /** Valeur d'une ligne du classement final. */
  rankValue(entry: RankEntry, ctx: ViewContext): string;
  /** Tableau des scores de tous les côtés. */
  board(ctx: ViewContext): ReactNode;
  pad(ctx: ViewContext): { numbers?: number[]; highlight?: number | null; highlightBull?: 25 | 50 | 'any' | null };
}
