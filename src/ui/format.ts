// Mise en forme des nombres et des dates, à la française.

export function num(value: number | null, digits = 1): string {
  if (value === null) return '–';
  return value.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export const pct = (value: number | null) => (value === null ? '–' : `${num(value, 0)} %`);

export function duration(ms: number | null): string {
  if (ms === null) return '–';
  const min = Math.round(ms / 60000);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
