// Mise en forme des nombres et des dates, à la française.

/** Valeur incalculable faute de données : jamais affichée comme 0 (avenant statistiques). */
export const ND = 'non disponible';

export function num(value: number | null, digits = 1): string {
  if (value === null) return ND;
  return value.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export const pct = (value: number | null) => (value === null ? ND : `${num(value, 0)} %`);

export function duration(ms: number | null): string {
  if (ms === null) return ND;
  const min = Math.round(ms / 60000);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Nombre avec son unité, accordée : « 1 point », « 12,5 points ». */
export function withUnit(value: number | null, unit: { one: string; many: string }, digits = 1): string {
  if (value === null) return ND;
  return `${num(value, Number.isInteger(value) ? 0 : digits)} ${Math.abs(value) < 2 ? unit.one : unit.many}`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
