import { useEffect, useState } from 'react';
import type { DisplayInfo, DisplaySettings } from '../../online/display';
import { api } from '../../online/useAccount';
import { dateTime } from '../format';
import './Online.css';

/** Adresse de la page tableau : celle du serveur en ligne, même quand la borne sert l'appli elle-même. */
const TABLET_URL = `${import.meta.env.VITE_API_URL ? new URL(import.meta.env.VITE_API_URL).host : location.host}/tableau.html`;

/**
 * Tablettes « tableau de scores » (vieil iPad fixé au-dessus de la cible) : on les relie au compte avec le code
 * qu'elles affichent, puis on les règle d'ici, sans avoir à y toucher.
 */
export function Displays({ onBack }: { onBack: () => void }) {
  const [displays, setDisplays] = useState<DisplayInfo[] | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api<{ displays: DisplayInfo[] }>('/api/displays')
      .then((r) => setDisplays(r.displays))
      .catch((e) => setError(e instanceof Error ? e.message : 'Chargement impossible.'));

  useEffect(() => {
    void load();
  }, []);

  const run = async (action: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      await load();
      if (done) setMessage(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action refusée.');
    } finally {
      setBusy(false);
    }
  };

  const link = () =>
    run(async () => {
      await api('/api/displays', { method: 'POST', body: JSON.stringify({ code }) });
      setCode('');
    }, 'Tablette reliée : elle affichera les parties de ce compte.');

  const update = (d: DisplayInfo, settings: Partial<DisplaySettings>, done?: string) =>
    run(() => api(`/api/displays/${encodeURIComponent(d.id)}`, { method: 'PUT', body: JSON.stringify({ settings }) }), done);

  const unlink = (d: DisplayInfo) =>
    run(() => api(`/api/displays/${encodeURIComponent(d.id)}`, { method: 'DELETE' }), 'Tablette déliée : elle affiche un nouveau code.');

  return (
    <div className="screen online">
      <header className="online-top">
        <button onClick={onBack}>← Accueil</button>
        <h1>Tableau iPad</h1>
        <span />
      </header>

      <section className="online-block">
        <div className="label">Relier une tablette</div>
        <div className="online-hint">
          Sur la tablette, ouvre <strong>{TABLET_URL}</strong> dans Safari : elle affiche un code à 4 chiffres. Tape-le ici.
        </div>
        <form
          className="online-join"
          onSubmit={(e) => {
            e.preventDefault();
            void link();
          }}
        >
          <input
            aria-label="Code affiché sur la tablette"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="Code de la tablette"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
          <button className="btn-gold" type="submit" disabled={busy || code.length !== 4}>
            Relier
          </button>
        </form>
        {error && <div className="online-error">{error}</div>}
        {message && <div className="online-rules">{message}</div>}
      </section>

      <section className="online-block">
        <div className="label">Tablettes reliées à ce compte</div>
        {!displays && !error && <div className="online-hint">Chargement…</div>}
        {displays?.length === 0 && <div className="online-hint">Aucune tablette pour l’instant.</div>}
        <div className="admin-list">
          {displays?.map((d, i) => (
            <div key={d.id} className="admin-row">
              <div className="admin-who">
                <span className="admin-name">Tablette {i + 1}</span>
                <span className="admin-dates">
                  Reliée le {dateTime(d.createdAt)}
                  {d.seenAt ? ` · vue le ${dateTime(d.seenAt)}` : ''}
                </span>
              </div>
              <div className="admin-actions">
                <button disabled={busy} aria-pressed={d.settings.animations} onClick={() => update(d, { animations: !d.settings.animations })}>
                  Animations : {d.settings.animations ? 'oui' : 'non'}
                </button>
                <button disabled={busy} aria-pressed={d.settings.dim} onClick={() => update(d, { dim: !d.settings.dim })}>
                  Atténuer hors partie : {d.settings.dim ? 'oui' : 'non'}
                </button>
                <button disabled={busy} onClick={() => update(d, { reload: Date.now() }, 'La tablette va se recharger (sous 10 secondes).')}>
                  Recharger
                </button>
                <button disabled={busy} onClick={() => unlink(d)}>
                  Délier
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="online-hint">
          La tablette suit toute seule la partie en cours de ce compte. Réglages conseillés sur l’iPad : Luminosité › Verrouillage auto :
          Jamais, page ajoutée à l’écran d’accueil, Accès guidé activé, chargeur branché.
        </div>
      </section>
    </div>
  );
}
