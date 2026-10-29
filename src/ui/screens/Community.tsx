import { useEffect, useState } from 'react';
import type { Community as CommunityData } from '../../online/accounts';
import { loadCommunity } from '../../online/useAccount';
import type { Profile as ProfileData } from '../../profiles/types';
import type { AppSettings } from '../../settings/settings';
import { Profile } from './Profile';
import { Rankings } from './Rankings';
import './Online.css';

interface Props {
  settings: AppSettings;
  onSettings: (patch: Partial<AppSettings>) => void;
  onBack: () => void;
}

/** Classements et fiches des joueurs en ligne, calculés à partir des parties en ligne de tout le monde. */
export function Community({ settings, onSettings, onBack }: Props) {
  const [data, setData] = useState<CommunityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    loadCommunity()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (!data) {
    return (
      <div className="screen online online-center">
        <div className={error ? 'online-error' : 'label'}>{error ?? 'Chargement des joueurs en ligne…'}</div>
        <button onClick={onBack}>Retour</button>
      </div>
    );
  }

  // Les comptes jouent le rôle des profils de l'appareil : mêmes écrans, mêmes calculs.
  const profiles: ProfileData[] = data.accounts;
  const profile = profiles.find((p) => p.id === openId);
  if (profile) {
    return (
      <Profile
        profile={profile}
        profiles={profiles}
        games={data.games}
        settings={settings}
        onSettings={onSettings}
        onSave={() => undefined}
        onDelete={() => undefined}
        onBack={() => setOpenId(null)}
        readOnly
        backLabel="← Classements"
      />
    );
  }

  return (
    <Rankings
      profiles={profiles}
      games={data.games}
      onOpen={setOpenId}
      onBack={onBack}
      title="Joueurs en ligne"
      backLabel="← Retour"
    />
  );
}
