import { useMemo, useState } from 'react';
import { playerGames, summary } from '../../profiles/stats';
import type { GameRecord, Profile } from '../../profiles/types';
import { Avatar } from '../components/Avatar';
import { newProfile, ProfileEditor } from '../components/ProfileEditor';
import { pct } from '../format';
import './Library.css';

interface Props {
  profiles: Profile[];
  games: GameRecord[];
  onSaveProfile: (profile: Profile) => void;
  onOpen: (id: string) => void;
  onBack: () => void;
}

export function Players({ profiles, games, onSaveProfile, onOpen, onBack }: Props) {
  const [creating, setCreating] = useState<Profile | null>(null);
  const active = useMemo(
    () => profiles.filter((p) => !p.deleted).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [profiles],
  );
  const summaries = useMemo(() => new Map(active.map((p) => [p.id, summary(playerGames(games, p.id))])), [active, games]);

  return (
    <div className="screen library">
      <header className="lib-header">
        <button onClick={onBack}>← Accueil</button>
        <h2>Joueurs</h2>
        <button className="btn-primary" onClick={() => setCreating(newProfile())}>
          ＋ Nouveau joueur
        </button>
      </header>

      {active.length === 0 ? (
        <div className="lib-empty">Aucun joueur pour l’instant. Crée le premier profil pour lancer une partie.</div>
      ) : (
        <div className="players-grid">
          {active.map((p) => {
            const s = summaries.get(p.id)!;
            return (
              <button key={p.id} className="player-tile" onClick={() => onOpen(p.id)}>
                <Avatar avatar={p.avatar} color={p.color} size={96} />
                <span className="player-tile-name">{p.name}</span>
                <span className="player-tile-sub">
                  {s.played} partie{s.played > 1 ? 's' : ''} · {pct(s.winRate)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {creating && (
        <ProfileEditor
          title="Nouveau joueur"
          initial={creating}
          takenNames={active.map((p) => p.name)}
          onCancel={() => setCreating(null)}
          onSave={(profile) => {
            onSaveProfile(profile);
            setCreating(null);
          }}
        />
      )}
    </div>
  );
}
