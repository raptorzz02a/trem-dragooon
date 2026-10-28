// Représentation d'une fléchette et calcul de sa valeur.
// segment : 0 = raté, 1 à 20 = numéros, 25 = Bull.
// Le Bull extérieur (25) est un simple Bull, le Bull intérieur (50) est un double Bull.

export type Multiplier = 1 | 2 | 3;

export interface Dart {
  segment: number;
  multiplier: Multiplier;
}

export const BULL = 25;

export const S = (n: number): Dart => ({ segment: n, multiplier: 1 });
export const D = (n: number): Dart => ({ segment: n, multiplier: 2 });
export const T = (n: number): Dart => ({ segment: n, multiplier: 3 });
export const OUTER_BULL: Dart = { segment: BULL, multiplier: 1 };
export const INNER_BULL: Dart = { segment: BULL, multiplier: 2 };
export const MISS: Dart = { segment: 0, multiplier: 1 };

export function isValidDart(dart: Dart): boolean {
  const { segment, multiplier } = dart;
  if (!Number.isInteger(segment) || ![1, 2, 3].includes(multiplier)) return false;
  if (segment === 0) return multiplier === 1;
  if (segment === BULL) return multiplier === 1 || multiplier === 2;
  return segment >= 1 && segment <= 20;
}

export function assertValidDart(dart: Dart): void {
  if (!isValidDart(dart)) {
    throw new Error(`Fléchette invalide : ${JSON.stringify(dart)}`);
  }
}

export function dartScore(dart: Dart): number {
  return dart.segment * dart.multiplier;
}

/** Double valide pour une sortie, Bull intérieur compris. */
export function isDouble(dart: Dart): boolean {
  return dart.segment !== 0 && dart.multiplier === 2;
}

export function isMiss(dart: Dart): boolean {
  return dart.segment === 0;
}

/** Notation courte : S20, D16, T19, 25, 50, 0. */
export function formatDart(dart: Dart): string {
  if (dart.segment === 0) return '0';
  if (dart.segment === BULL) return dart.multiplier === 2 ? '50' : '25';
  return `${'SDT'[dart.multiplier - 1]}${dart.segment}`;
}

/** Inverse de formatDart, pratique pour les tests et les sauvegardes lisibles. */
export function parseDart(text: string): Dart {
  const t = text.trim().toUpperCase();
  if (t === '0' || t === 'MISS') return MISS;
  if (t === '25' || t === 'SB') return OUTER_BULL;
  if (t === '50' || t === 'DB') return INNER_BULL;
  const m = /^([SDT])(\d{1,2})$/.exec(t);
  if (!m) throw new Error(`Notation inconnue : ${text}`);
  const multiplier = ('SDT'.indexOf(m[1]!) + 1) as Multiplier;
  const dart = { segment: Number(m[2]), multiplier };
  assertValidDart(dart);
  return dart;
}
