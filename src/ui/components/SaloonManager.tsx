import { useEffect, useState } from 'react';
import {
  canDeleteSaloon,
  canEditSaloon,
  canManage,
  SALOON_COLORS,
  SALOON_ICONS,
  saloonKey,
  saloonNameProblem,
  saloonPasswordProblem,
  type MemberAction,
  type SaloonActor,
  type SaloonMember,
  type SaloonMembers,
  type SaloonRole,
} from '../../online/saloons';
import { api } from '../../online/useAccount';
import { Avatar } from './Avatar';

// Administration d'un saloon : membres et rôles, réglages, suppression. Sert au propriétaire et aux admins du saloon,
// et à l'administrateur de l'appli depuis l'espace Administration.

export const ROLE_NAMES: Record<SaloonRole, string> = { owner: 'Propriétaire', admin: 'Admin', member: 'Membre' };

const ACTIONS: { action: MemberAction; label: string; confirm?: (name: string) => string; danger?: boolean }[] = [
  { action: 'promote', label: 'Nommer admin' },
  { action: 'demote', label: 'Retirer admin' },
  { action: 'transfer', label: 'Donner la propriété', confirm: (n) => `${n} devient propriétaire du saloon ; l'actuel propriétaire reste admin.` },
  { action: 'kick', label: 'Exclure', confirm: (n) => `${n} sort du saloon. Il pourra revenir avec le mot de passe ou un lien.`, danger: true },
  { action: 'ban', label: 'Bannir', confirm: (n) => `${n} sort du saloon et ne pourra plus y revenir, même avec le mot de passe.`, danger: true },
];

const base = (saloonId: string) => `/api/saloons/${encodeURIComponent(saloonId)}`;

interface MembersProps {
  saloonId: string;
  actor: SaloonActor;
  myId: string;
  /** Après un changement qui touche les saloons du compte connecté (rôle, départ). */
  onChanged?: () => void;
}

/** Liste des membres, avec les actions permises à celui qui regarde. */
export function SaloonMembersList({ saloonId, actor, myId, onChanged }: MembersProps) {
  const [data, setData] = useState<SaloonMembers | null>(null);
  const [pending, setPending] = useState<{ member: SaloonMember; action: (typeof ACTIONS)[number] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api<SaloonMembers>(`${base(saloonId)}/members`)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  useEffect(() => {
    void load();
    // Rechargée seulement quand on change de saloon ; les actions la rechargent elles-mêmes.
  }, [saloonId]);

  const act = async (accountId: string, action: MemberAction | 'unban') => {
    setError(null);
    try {
      await api(`${base(saloonId)}/members/${encodeURIComponent(accountId)}/${action}`, { method: 'POST' });
      setPending(null);
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
    }
  };

  if (!data) return <div className="saloon-hint">{error ?? 'Chargement des membres…'}</div>;

  return (
    <div className="saloon-members">
      {data.members.map((m) => {
        const allowed = ACTIONS.filter((a) => (m.id !== myId || actor === 'global') && canManage(actor, m.role, a.action));
        return (
          <div key={m.id} className="saloon-member">
            <Avatar avatar={m.avatar} color={m.color} size={40} />
            <span className="saloon-member-name">{m.name}</span>
            {m.role !== 'member' && <span className={`saloon-role saloon-role-${m.role}`}>{ROLE_NAMES[m.role]}</span>}
            {allowed.length > 0 && (
              <div className="saloon-member-actions">
                {allowed.map((a) => (
                  <button
                    key={a.action}
                    className={a.danger ? 'btn-danger' : ''}
                    onClick={() => (a.confirm ? setPending({ member: m, action: a }) : void act(m.id, a.action))}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {data.banned.length > 0 && (
        <>
          <div className="label">Bannis</div>
          {data.banned.map((b) => (
            <div key={b.id} className="saloon-member">
              <span className="saloon-member-name">{b.name}</span>
              <div className="saloon-member-actions">
                <button onClick={() => void act(b.id, 'unban')}>Lever le bannissement</button>
              </div>
            </div>
          ))}
        </>
      )}
      {pending && (
        <div className="saloon-confirm">
          <div>{pending.action.confirm!(pending.member.name)}</div>
          <div className="dialog-actions">
            <button onClick={() => setPending(null)}>Annuler</button>
            <button className={pending.action.danger ? 'btn-danger' : 'btn-gold'} onClick={() => void act(pending.member.id, pending.action.action)}>
              {pending.action.label}
            </button>
          </div>
        </div>
      )}
      {error && <div className="online-error">{error}</div>}
    </div>
  );
}

interface SettingsProps {
  saloonId: string;
  actor: SaloonActor;
  initial: { name: string; color: string; icon: string };
  onChanged: () => void;
  onDeleted: () => void;
}

/** Réglages du saloon (propriétaire, admins) et suppression (propriétaire). */
export function SaloonSettings({ saloonId, actor, initial, onChanged, onDeleted }: SettingsProps) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [icon, setIcon] = useState(initial.icon);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const problem = saloonNameProblem(name) ?? (password ? saloonPasswordProblem(password) : null);

  const save = async () => {
    setMessage(null);
    try {
      await api(base(saloonId), { method: 'PUT', body: JSON.stringify({ name, password, color, icon }) });
      setPassword('');
      setMessage({ text: password ? 'Enregistré. Nouveau mot de passe actif : les membres restent membres.' : 'Enregistré.' });
      onChanged();
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Action impossible.', error: true });
    }
  };

  const remove = async () => {
    setMessage(null);
    try {
      await api(base(saloonId), { method: 'DELETE', body: JSON.stringify({ confirm }) });
      onDeleted();
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Action impossible.', error: true });
    }
  };

  return (
    <div className="saloon-settings">
      {canEditSaloon(actor) && (
        <>
          <input aria-label="Nom du saloon" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
          <input
            aria-label="Nouveau mot de passe du saloon"
            placeholder="Nouveau mot de passe (facultatif)"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="saloon-choices" role="radiogroup" aria-label="Couleur">
            {SALOON_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={c === color}
                aria-label={`Couleur ${c}`}
                className={`saloon-swatch${c === color ? ' selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div className="saloon-choices" role="radiogroup" aria-label="Icône">
            {SALOON_ICONS.map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={i === icon}
                className={`saloon-choice-icon${i === icon ? ' selected' : ''}`}
                style={i === icon ? { background: color } : undefined}
                onClick={() => setIcon(i)}
              >
                {i}
              </button>
            ))}
          </div>
          {problem && <div className="online-error">{problem}</div>}
          <div className="dialog-actions">
            <button className="btn-gold" disabled={!!problem} onClick={() => void save()}>
              Enregistrer
            </button>
          </div>
        </>
      )}
      {canDeleteSaloon(actor) && (
        <div className="saloon-delete">
          <div className="label">Supprimer le saloon</div>
          <div className="saloon-hint">Ses parties restent dans les stats de ceux qui les ont jouées. Retape le nom du saloon pour confirmer.</div>
          <input aria-label="Nom du saloon à supprimer" placeholder={initial.name} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <div className="dialog-actions">
            <button className="btn-danger" disabled={saloonKey(confirm) !== saloonKey(initial.name)} onClick={() => void remove()}>
              Supprimer définitivement
            </button>
          </div>
        </div>
      )}
      {message && <div className={message.error ? 'online-error' : 'saloon-hint'}>{message.text}</div>}
    </div>
  );
}
