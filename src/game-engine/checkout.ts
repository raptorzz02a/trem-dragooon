import { BULL, D, dartScore, INNER_BULL, OUTER_BULL, S, T, type Dart } from './darts';
import type { X01Options } from './types';

// Doubles de sortie, du préféré au moins préféré : D20 puis D16, puis les doubles « pairs » qui se divisent bien.
const DOUBLE_PREFERENCE = [20, 16, 18, 12, 10, 8, 14, 6, 4, 2, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1];
const FINISHING_DOUBLES: Dart[] = [...DOUBLE_PREFERENCE.map(D), INNER_BULL];

// Fléchettes de préparation pour une sortie en trois : les gros triples d'abord.
const SETUP_DARTS: Dart[] = [
  ...[20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10].map(T),
  OUTER_BULL,
  INNER_BULL,
  ...Array.from({ length: 20 }, (_, i) => S(20 - i)),
  ...[9, 8, 7, 6, 5, 4, 3, 2, 1].map(T),
];

/** Une fléchette qui marque exactement `points`, en privilégiant le simple, puis le triple, puis le Bull. */
function exactDart(points: number): Dart | null {
  if (points >= 1 && points <= 20) return S(points);
  if (points <= 60 && points % 3 === 0) return T(points / 3);
  if (points === BULL) return OUTER_BULL;
  if (points === 50) return INNER_BULL;
  if (points <= 40 && points % 2 === 0) return D(points / 2);
  return null;
}

function finishers(out: X01Options['out']): Dart[] {
  if (out === 'double') return FINISHING_DOUBLES;
  // En Straight Out, n'importe quelle fléchette peut finir : on garde les doubles en tête, puis le reste.
  return [...FINISHING_DOUBLES, ...SETUP_DARTS];
}

function finishIn1(remaining: number, out: X01Options['out']): Dart[] | null {
  const last = finishers(out).find((d) => dartScore(d) === remaining);
  return last ? [last] : null;
}

function finishIn2(remaining: number, out: X01Options['out']): Dart[] | null {
  for (const last of finishers(out)) {
    const need = remaining - dartScore(last);
    const first = need > 0 ? exactDart(need) : null;
    if (first) return [first, last];
  }
  return null;
}

function finishIn3(remaining: number, out: X01Options['out']): Dart[] | null {
  for (const first of SETUP_DARTS) {
    const rest = finishIn2(remaining - dartScore(first), out);
    if (rest) return [first, ...rest];
  }
  return null;
}

/**
 * Suggestion de finition pour le reste donné et le nombre de fléchettes encore disponibles dans la volée.
 * Renvoie null si aucune finition n'est possible (ex. 169 en Double Out, ou reste trop élevé).
 */
export function suggestCheckout(remaining: number, dartsLeft: number, out: X01Options['out']): Dart[] | null {
  if (dartsLeft < 1) return null;
  if (out === 'double' && (remaining > 170 || remaining < 2)) return null;
  if (remaining < 1) return null;
  // On propose toujours la finition qui demande le moins de fléchettes.
  return (
    finishIn1(remaining, out) ??
    (dartsLeft >= 2 ? finishIn2(remaining, out) : null) ??
    (dartsLeft >= 3 ? finishIn3(remaining, out) : null)
  );
}
