import { useEffect, useState } from 'react';
import type { Community as CommunityData, PlayerStats } from '../../online/accounts';
import type { Saloon } from '../../online/saloons';
import { loadCommunity, loadPlayer } from '../../online/useAccount';
import type { AppSettings } from '../../settings/settings';
import { Profile } from './Profile';
import { Rankings } from './Rankings';
import './Online.css';

interface Props {
  /** Le saloon ouvert : son classement, et le filtre proposé d'abord sur la fiche d'un autre joueur. */
  saloon: Saloon;
  myId: string;
  /** Ouvrir directement la fiche du joueur connecté (« Mes stats »). */
  mine?: boolean;
  settings: AppSettings;
  onSettings: (patch: Partial<AppSettings>) => void;
  onBack: () => void;
}

function Loading({ error, onBack }: { error: string | null; onBack: () => void }) {
  return (
    <div className="screen online online-center">
      <div className={error ? 'online-error' : 'label'}>{error ?? 'Chargement…'}</div>
      <button onClick={onBack}>Retour</button>
    </div>
  );
}

/**
 * Fiche d'un joueur en ligne. La sienne montre toutes ses parties, tous saloons confondus ; celle d'un autre
 * seulement ses parties dans les saloons partagés, en commençant par le saloon ouvert.
 */
function PlayerSheet({ id, saloon, settings, onSettings, onBack, backLabel }: { id: string; saloon: Saloon; backLabel: string } & Omit<Props, 'saloon' | 'myId' | 'mine'>) {
  const [data, setData] = useState<PlayerStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlayer(id)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (!data) return <Loading error={error} onBack={onBack} />;
  const profiles = data.accounts.some((a) => a.id === data.account.id) ? data.accounts : [...data.accounts, data.account];
  return (
    <Profile
      profile={data.account}
      profiles={profiles}
      games={data.games}
      settings={settings}
      onSettings={onSettings}
      onSave={() => undefined}
      onDelete={() => undefined}
      onBack={onBack}
      readOnly
      backLabel={backLabel}
      saloons={data.saloons}
      initialSaloon={data.own ? 'all' : saloon.id}
      allSaloonsLabel={data.own ? 'Tous saloons' : 'Saloons en commun'}
    />
  );
}

/** Classement du saloon ouvert (le saloon public : classement mondial) et fiches des joueurs. */
export function Community({ saloon, myId, mine = false, settings, onSettings, onBack }: Props) {
  const [data, setData] = useState<CommunityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(mine ? myId : null);

  useEffect(() => {
    if (mine) return;
    loadCommunity(saloon.id)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [saloon.id, mine]);

  if (openId) {
    return (
      <PlayerSheet
        key={openId}
        id={openId}
        saloon={saloon}
        settings={settings}
        onSettings={onSettings}
        onBack={mine ? onBack : () => setOpenId(null)}
        backLabel={mine ? '← Accueil' : '← Classement'}
      />
    );
  }

  if (!data) return <Loading error={error} onBack={onBack} />;

  return (
    <Rankings
      profiles={data.accounts}
      games={data.games}
      onOpen={setOpenId}
      onBack={onBack}
      title={`Classement · ${saloon.name}`}
      backLabel="← Retour"
      minGames={data.minGames}
      note={
        saloon.public
          ? 'Classement mondial : tous les joueurs, parties jouées dans le saloon public.'
          : `Membres du saloon, parties jouées dans le saloon. Classé à partir de ${data.minGames} partie${data.minGames > 1 ? 's' : ''}.`
      }
    />
  );
}
