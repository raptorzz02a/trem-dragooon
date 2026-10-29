// Filtre de période commun à la fiche joueur et aux classements.

export type PeriodKind = 'all' | '30' | '90' | '365' | 'custom';

export interface Period {
  kind: PeriodKind;
  /** Dates du calendrier (AAAA-MM-JJ) pour la période personnalisée. */
  from?: string;
  to?: string;
}

export const ALL_TIME: Period = { kind: 'all' };

const OPTIONS: { value: PeriodKind; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
  { value: '365', label: '1 an' },
  { value: 'custom', label: 'Dates…' },
];

const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Bornes ISO de la période (incluses), ou rien pour « Tout ». */
export function periodRange(p: Period, now = new Date()): { from?: string; to?: string } {
  if (p.kind === 'all') return {};
  if (p.kind === 'custom') {
    if (!p.from || !p.to) return {};
    return { from: new Date(`${p.from}T00:00:00`).toISOString(), to: new Date(`${p.to}T23:59:59.999`).toISOString() };
  }
  return { from: new Date(now.getTime() - Number(p.kind) * 86400000).toISOString(), to: now.toISOString() };
}

export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const pick = (kind: PeriodKind) => {
    if (kind !== 'custom') return onChange({ kind });
    const now = new Date();
    onChange({ kind, from: value.from ?? day(new Date(now.getTime() - 30 * 86400000)), to: value.to ?? day(now) });
  };
  return (
    <div className="period-filter">
      <div className="segmented">
        {OPTIONS.map((o) => (
          <button key={o.value} className={value.kind === o.value ? 'selected' : ''} onClick={() => pick(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      {value.kind === 'custom' && (
        <div className="period-dates">
          <label>
            du
            <input type="date" value={value.from} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value })} />
          </label>
          <label>
            au
            <input type="date" value={value.to} min={value.from} onChange={(e) => onChange({ ...value, to: e.target.value })} />
          </label>
        </div>
      )}
    </div>
  );
}
