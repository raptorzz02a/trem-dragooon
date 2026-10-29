import { useEffect, useState } from 'react';
import type { AdminAccount } from '../../online/accounts';
import { api } from '../../online/useAccount';
import type { AdminSaloon } from '../../online/saloons';
import { Avatar } from '../components/Avatar';
import { SaloonMembersList, SaloonSettings } from '../components/SaloonManager';
import '../components/Saloons.css';
import { dateTime, plural } from '../format';
import './Online.css';

type Action = 'stats' | 'password' | 'delete';

const CONFIRM: Record<Action, { title: string; text: (name: string) => string; button: string }> = {
  stats: {
    title: 'Remettre les stats à zéro',
    text: (n) =>
      `Toutes les parties de ${n} ne compteront plus pour son compte. Elles restent valables pour ses adversaires. C’est définitif.`,
    button: 'Remettre à zéro',
  },
  password: {
    title: 'Nouveau mot de passe',
    text: (n) => `Un mot de passe provisoire va être créé pour ${n}, et ses appareils seront déconnectés.`,
    button: 'Créer le mot de passe',
  },
  delete: {
    title: 'Supprimer le compte',
    text: (n) =>
      `Le compte ${n} sera supprimé. Ses parties restent pour ses adversaires, à son nom « Joueur supprimé ». C’est définitif.`,
    button: 'Supprimer',
  },
};

/** Espace administrateur : tous les comptes en ligne, et les actions de dépannage sur un compte. */
export function Admin({ myId, onBack }: { myId: string; onBack: () => void }) {
  const [accounts, setAccounts] = useState<AdminAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ account: AdminAccount; action: Action } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [saloons, setSaloons] = useState<AdminSaloon[] | null>(null);
  const [saloon, setSaloon] = useState<AdminSaloon | null>(null);

  const loadSaloons = () =>
    api<{ saloons: AdminSaloon[] }>('/api/admin/saloons')
      .then((r) => setSaloons(r.saloons))
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    void loadSaloons();
  }, []);

  const load = () =>
    api<{ accounts: AdminAccount[] }>('/api/admin/accounts')
      .then((r) => setAccounts(r.accounts))
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);

  const run = async () => {
    if (!pending) return;
    const { account, action } = pending;
    const path = `/api/admin/accounts/${encodeURIComponent(account.id)}`;
    setBusy(true);
    setError(null);
    try {
      if (action === 'stats') {
        const r = await api<{ games: number }>(`${path}/reset-stats`, { method: 'POST' });
        setResult(`Stats de ${account.name} remises à zéro (${plural(r.games, 'partie')} retirée${r.games > 1 ? 's' : ''}).`);
      } else if (action === 'password') {
        const r = await api<{ password: string }>(`${path}/reset-password`, { method: 'POST' });
        setResult(`Mot de passe provisoire de ${account.name} : ${r.password}\nTransmets-le au joueur : il pourra le changer depuis l’accueil (« Mot de passe »).`);
      } else {
        await api(path, { method: 'DELETE' });
        setResult(`Compte ${account.name} supprimé.`);
      }
      setPending(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen online">
      <header className="online-top">
        <button onClick={onBack}>← Accueil</button>
        <h1>Administration</h1>
        <span />
      </header>

      {result && (
        <div className="online-block admin-result">
          <div>{result}</div>
          <button onClick={() => setResult(null)}>OK</button>
        </div>
      )}
      {error && !pending && <div className="online-error">{error}</div>}
      {!accounts && !error && <div className="label">Chargement des comptes…</div>}

      {accounts && (
        <section className="online-block">
          <div className="label">{plural(accounts.length, 'compte')}</div>
          <div className="admin-list">
            {accounts.map((a) => (
              <div key={a.id} className="admin-row">
                <Avatar avatar={a.avatar} color={a.color} size={48} />
                <div className="admin-who">
                  <span className="admin-name">
                    {a.name}
                    {a.admin && <span className="admin-badge">admin</span>}
                  </span>
                  <span className="admin-dates">
                    Créé le {dateTime(a.createdAt)} · Vu le {a.lastSeenAt ? dateTime(a.lastSeenAt) : 'jamais'} · {plural(a.games, 'partie')}
                  </span>
                </div>
                <div className="admin-actions">
                  <button onClick={() => setPending({ account: a, action: 'stats' })}>Reset stats</button>
                  <button onClick={() => setPending({ account: a, action: 'password' })}>Reset mot de passe</button>
                  {a.id !== myId && (
                    <button className="btn-danger" onClick={() => setPending({ account: a, action: 'delete' })}>
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {saloons && (
        <section className="online-block">
          <div className="label">
            {plural(saloons.length, 'saloon')} privé{saloons.length > 1 ? 's' : ''} (plus le saloon public TREM-DRAGOOON)
          </div>
          <div className="admin-list">
            {saloons.map((s) => (
              <div key={s.id} className="admin-row">
                <span className="saloon-icon" style={{ width: 48, height: 48, fontSize: 24, background: s.color }}>
                  {s.icon}
                </span>
                <div className="admin-who">
                  <span className="admin-name">{s.name}</span>
                  <span className="admin-dates">
                    Créé le {dateTime(s.createdAt)} · {plural(s.members, 'membre')} · Propriétaire : {s.owner ?? 'aucun'}
                  </span>
                </div>
                <div className="admin-actions">
                  <button onClick={() => setSaloon(s)}>Gérer</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {saloon && (
        <div className="overlay">
          <div className="dialog saloon-dialog">
            <h2>
              {saloon.icon} {saloon.name}
            </h2>
            <SaloonMembersList saloonId={saloon.id} actor="global" myId={myId} onChanged={() => void loadSaloons()} />
            <SaloonSettings
              key={saloon.id}
              saloonId={saloon.id}
              actor="global"
              initial={saloon}
              onChanged={() => void loadSaloons()}
              onDeleted={() => {
                setSaloon(null);
                setResult(`Saloon ${saloon.name} supprimé.`);
                void loadSaloons();
              }}
            />
            <div className="dialog-actions">
              <button className="btn-gold" onClick={() => setSaloon(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {pending && (
        <div className="overlay">
          <div className="dialog">
            <h2>{CONFIRM[pending.action].title}</h2>
            <div>{CONFIRM[pending.action].text(pending.account.name)}</div>
            {error && <div className="online-error">{error}</div>}
            <div className="dialog-actions">
              <button disabled={busy} onClick={() => setPending(null)}>
                Annuler
              </button>
              <button className={pending.action === 'password' ? 'btn-gold' : 'btn-danger'} disabled={busy} onClick={run}>
                {CONFIRM[pending.action].button}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
