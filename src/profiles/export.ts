import { formatDart } from '../game-engine/darts';
import type { TurnOutcome, X01Options } from '../game-engine/types';
import { volleyValue } from './scores';
import { x01VariantLabel, type PlayerGame } from './stats';

const MODE_LABELS = { x01: '301/501/701', cricket: 'Cricket', clock: 'Horloge', random: 'Chiffre aléatoire' } as const;
const OUTCOMES: Record<TurnOutcome, string> = { complete: '', ended: 'fin de tour avant 3 fléchettes', bust: 'bust', win: 'victoire', done: 'parcours terminé' };

function cell(value: string | number): string {
  const s = String(value);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Une ligne par volée du joueur, pour un tableur (séparateur « ; » et virgule décimale à la française).
 * Les données brutes permettent de refaire tous les calculs ailleurs.
 */
export function playerCsv(games: PlayerGame[]): string {
  const header = ['Date', 'Mode', 'Variante', 'Partie', 'Manche', 'Fléchettes', 'Valeur de la volée', 'Unité', 'Issue de la volée', 'Résultat de la partie'];
  const rows = [...games].reverse().flatMap((g) => {
    const { config } = g.state;
    const variant = config.mode === 'x01' ? x01VariantLabel(config.options as X01Options) : '';
    const result = config.training ? 'entraînement' : g.won ? 'victoire' : 'défaite';
    return g.turns.map((t) => [
      new Date(g.endedAt).toLocaleString('fr-FR'),
      MODE_LABELS[config.mode],
      variant,
      g.record.id,
      t.round + 1,
      t.darts.map((d) => formatDart(d.dart)).join(' '),
      config.mode === 'clock' ? '' : volleyValue(g, t),
      config.mode === 'clock' ? '' : config.mode === 'cricket' ? 'marques' : 'points',
      OUTCOMES[t.outcome],
      result,
    ]);
  });
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
}
