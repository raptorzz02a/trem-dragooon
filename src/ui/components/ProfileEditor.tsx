import { useState } from 'react';
import type { AvatarConfig, Profile } from '../../profiles/types';
import { TEAM_COLORS } from '../../teams/teams';
import { AVATAR_PARTS, Avatar, HAIR_COLORS, randomAvatar, SKINS } from './Avatar';
import './ProfileEditor.css';

export const PROFILE_COLORS = TEAM_COLORS.map((c) => c.hex);

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function newProfile(name = ''): Profile {
  return {
    id: newId(),
    name,
    color: PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)]!,
    avatar: randomAvatar(),
    createdAt: new Date().toISOString(),
  };
}

type Part = keyof AvatarConfig;

const ROWS: { part: Part; label: string; count: number; names?: readonly string[] }[] = [
  { part: 'skin', label: 'Peau', count: SKINS.length },
  { part: 'hair', label: 'Cheveux', count: AVATAR_PARTS.hair.length, names: AVATAR_PARTS.hair },
  { part: 'hairColor', label: 'Couleur', count: HAIR_COLORS.length },
  { part: 'facialHair', label: 'Pilosité', count: AVATAR_PARTS.facialHair.length, names: AVATAR_PARTS.facialHair },
  { part: 'glasses', label: 'Lunettes', count: AVATAR_PARTS.glasses.length, names: AVATAR_PARTS.glasses },
  { part: 'hat', label: 'Chapeau', count: AVATAR_PARTS.hat.length, names: AVATAR_PARTS.hat },
];

interface Props {
  initial: Profile;
  /** Noms déjà pris par d'autres profils, pour éviter deux joueurs impossibles à distinguer. */
  takenNames: string[];
  title: string;
  onSave: (profile: Profile) => void;
  onCancel: () => void;
}

export function ProfileEditor({ initial, takenNames, title, onSave, onCancel }: Props) {
  const [profile, setProfile] = useState(initial);
  const set = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }));
  const setPart = (part: Part, value: number) => set({ avatar: { ...profile.avatar, [part]: value } });
  const name = profile.name.trim();
  const taken = takenNames.some((n) => n.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'));
  const error = !name ? 'Choisis un surnom.' : taken ? 'Ce surnom est déjà pris.' : null;

  return (
    <div className="overlay">
      <div className="dialog profile-editor">
        <div className="pe-left">
          <h2>{title}</h2>
          <div className="pe-preview">
            <Avatar avatar={profile.avatar} color={profile.color} size={190} />
          </div>
          <input
            value={profile.name}
            maxLength={16}
            placeholder="Surnom"
            onChange={(e) => set({ name: e.target.value })}
            autoFocus
          />
          <div className="pe-colors">
            {PROFILE_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Couleur ${c}`}
                className={profile.color === c ? 'selected' : ''}
                style={{ background: c }}
                onClick={() => set({ color: c })}
              />
            ))}
          </div>
          <button onClick={() => set({ avatar: randomAvatar() })}>🎲 Au hasard</button>
        </div>

        <div className="pe-right">
          {ROWS.map((row) => (
            <div key={row.part} className="pe-row">
              <span className="label">{row.label}</span>
              <div className="pe-options">
                {Array.from({ length: row.count }, (_, i) => (
                  <button
                    key={i}
                    className={profile.avatar[row.part] === i ? 'selected' : ''}
                    aria-label={row.names?.[i] ?? `${row.label} ${i + 1}`}
                    onClick={() => setPart(row.part, i)}
                  >
                    {row.part === 'skin' || row.part === 'hairColor' ? (
                      <span className="pe-swatch" style={{ background: (row.part === 'skin' ? SKINS : HAIR_COLORS)[i] }} />
                    ) : (
                      <Avatar avatar={{ ...profile.avatar, [row.part]: i }} color={profile.color} size={48} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="pe-footer">
            <span className="pe-error">{error}</span>
            <button onClick={onCancel}>Annuler</button>
            <button className="btn-gold" disabled={error !== null} onClick={() => onSave({ ...profile, name })}>
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
