import { useEffect, useState } from 'react';
import { IMPORT_BATCH, involves } from '../../online/accounts';
import { api } from '../../online/useAccount';
import type { GameRecord, Profile } from '../../profiles/types';
import { openStore } from '../../storage/db';
import { Avatar } from '../components/Avatar';
import './Online.css';

/** Profils et parties enregistrés sur cet appareil avant le passage en ligne (vide sur un téléphone). */
export async function localData(): Promise<{ profiles: Profile[]; games: GameRecord[] }> {
  try {
    const { store, durable } = await openStore();
    if (!durable) return { profiles: [], games: [] };
    const [profiles, games] = await Promise.all([store.listProfiles(), store.listGames()]);
    return { profiles: profiles.filter((p) => !p.deleted && games.some((g) => involves(g, p.id))), games };
  } catch {
    return { profiles: [], games: [] };
  }
}

/**
 * Reprise des stats de la borne : le joueur connecté choisit quel profil de la borne était le sien,
 * et ses parties rejoignent son compte. Chaque joueur le fait une fois avec son compte.
 */
export function ImportLocal({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<{ profiles: Profile[]; games: GameRecord[] } | null>(null);
  const [chosen, setChosen] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    void localData().then(setData);
  }, []);

  const run = async (profile: Profile) => {
    if (!data) return;
    setError(null);
    const games = data.games.filter((g) => involves(g, profile.id));
    let imported = 0;
    try {
      for (let i = 0; i < games.length; i += IMPORT_BATCH) {
        setProgress(`Envoi des parties… ${i}/${games.length}`);
        const r = await api<{ imported: number }>('/api/account/import', {
          method: 'POST',
          body: JSON.stringify({ localId: profile.id, games: games.slice(i, i + IMPORT_BATCH) }),
        });
        imported += r.imported;
      }
      setDone(imported);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="screen online">
      <header className="online-top">
        <button onClick={onBack}>← Accueil</button>
        <h1>Stats de la borne</h1>
        <span />
      </header>
      <section className="online-block">
        {done !== null ? (
          <>
            <div className="online-rules">{done} partie(s) ajoutée(s) à ton compte.</div>
            <div className="online-hint">Les autres joueurs de la borne peuvent faire de même en se connectant à leur compte.</div>
            <button className="btn-gold" onClick={onBack}>
              Terminé
            </button>
          </>
        ) : chosen ? (
          <>
            <div className="online-me">
              <Avatar avatar={chosen.avatar} color={chosen.color} size={64} />
              <span className="online-me-name">{chosen.name}</span>
            </div>
            <div>
              Les parties de <strong>{chosen.name}</strong> sur cette borne vont rejoindre ton compte. Un joueur de la borne ne peut
              être rattaché qu’à un seul compte.
            </div>
            {error && <div className="online-error">{error}</div>}
            <div className="dialog-actions">
              <button disabled={progress !== null} onClick={() => setChosen(null)}>
                Retour
              </button>
              <button className="btn-gold" disabled={progress !== null} onClick={() => run(chosen)}>
                {progress ?? 'Ajouter à mon compte'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="label">Quel joueur de la borne es-tu ?</div>
            {!data && <div className="online-hint">Lecture des stats de la borne…</div>}
            {data && data.profiles.length === 0 && <div className="online-hint">Aucune stat sur cet appareil.</div>}
            <div className="online-profiles">
              {data?.profiles.map((p) => (
                <button key={p.id} className="online-profile" onClick={() => setChosen(p)}>
                  <Avatar avatar={p.avatar} color={p.color} size={56} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
