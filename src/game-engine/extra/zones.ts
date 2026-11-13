import { BULL, dartScore, type Dart } from '../darts';

/**
 * Zone de la cible à viser dans les autres jeux.
 * ring : any = tout le numéro (ou Bull 25 et 50), S = simple, SI / SO = simple intérieur (« bas ») / extérieur (« haut »),
 * D = double (Bull : 50), T = triple.
 * La saisie au pavé ne distingue pas les deux simples : un simple du numéro valide SI comme SO.
 */
export type Ring = 'any' | 'S' | 'SI' | 'SO' | 'D' | 'T';

export interface Zone {
  segment: number;
  ring: Ring;
}

export const zone = (segment: number, ring: Ring = 'any'): Zone => ({ segment, ring });

export function hitsZone(z: Zone, dart: Dart): boolean {
  if (dart.segment !== z.segment || dart.segment === 0) return false;
  switch (z.ring) {
    case 'any':
      return true;
    case 'S':
    case 'SI':
    case 'SO':
      return dart.multiplier === 1;
    case 'D':
      return dart.multiplier === 2;
    case 'T':
      return dart.multiplier === 3;
  }
}

/** Fléchette qui touche la zone (pour le bouton « Touché »). */
export function dartFor(z: Zone, multiplier: 1 | 2 | 3 = 1): Dart {
  const m = z.ring === 'D' ? 2 : z.ring === 'T' ? 3 : z.ring === 'any' ? multiplier : 1;
  return { segment: z.segment, multiplier: z.segment === BULL ? (Math.min(m, 2) as 1 | 2) : m };
}

/** Valeur simple du numéro (Bull : 25), pour les pénalités. */
export const singleValue = (z: Zone) => z.segment;

/** Notation courte : 14, S14, D14, T14, 14 haut, 14 bas, Bull, 25, 50. */
export function formatZone(z: Zone): string {
  if (z.segment === BULL) return z.ring === 'D' ? '50' : z.ring === 'any' ? 'Bull' : '25';
  switch (z.ring) {
    case 'any':
      return String(z.segment);
    case 'S':
      return `S${z.segment}`;
    case 'SI':
      return `${z.segment} bas`;
    case 'SO':
      return `${z.segment} haut`;
    case 'D':
      return `D${z.segment}`;
    case 'T':
      return `T${z.segment}`;
  }
}

/** Nom en toutes lettres, pour la consigne : « le double 14 ». */
export function zoneName(z: Zone): string {
  if (z.segment === BULL) return z.ring === 'D' ? 'le Bull 50' : z.ring === 'any' ? 'le Bull' : 'le Bull 25';
  const names: Record<Ring, string> = {
    any: 'le',
    S: 'le simple',
    SI: 'le simple bas du',
    SO: 'le simple haut du',
    D: 'le double',
    T: 'le triple',
  };
  return `${names[z.ring]} ${z.segment}`;
}

export const sameZone = (a: Zone, b: Zone) => a.segment === b.segment && a.ring === b.ring;

/** Mélange déterministe (Fisher-Yates) avec le générateur donné. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);
export const pick = <T>(items: readonly T[], rng: () => number): T => items[Math.floor(rng() * items.length)]!;

/** Points d'une fléchette (raccourci). */
export const valueOf = dartScore;
