import { useState } from 'react';
import {
  canEditSaloon,
  inviteLink,
  PUBLIC_SALOON_ID,
  MAX_SALOON_MEMBERS,
  SALOON_COLORS,
  SALOON_ICONS,
  saloonNameProblem,
  saloonPasswordProblem,
  type Saloon,
} from '../../online/saloons';
import type { SaloonsState } from '../../online/useSaloons';
import { ROLE_NAMES, SaloonMembersList, SaloonSettings } from './SaloonManager';
import './Saloons.css';

// Choix du saloon à l'accueil, façon Discord : une colonne d'icônes sur PC, un menu déroulant sur téléphone.


function SaloonIcon({ saloon, size = 56 }: { saloon: Saloon; size?: number }) {
  return (
    <span
      className={`saloon-icon${saloon.public ? ' saloon-icon-public' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.5, ...(saloon.color ? { background: saloon.color } : {}) }}
      aria-hidden
    >
      {saloon.icon}
    </span>
  );
}

interface PickerProps {
  state: SaloonsState;
  onAdd: () => void;
}

/** Colonne d'icônes (PC). */
export function SaloonRail({ state, onAdd }: PickerProps) {
  return (
    <nav className="saloon-rail" aria-label="Saloons">
      {state.saloons.map((s) => (
        <button
          key={s.id}
          className={`saloon-rail-item${s.id === state.current.id ? ' selected' : ''}`}
          title={s.name}
          aria-label={s.name}
          aria-current={s.id === state.current.id}
          onClick={() => state.select(s.id)}
        >
          <SaloonIcon saloon={s} />
        </button>
      ))}
      <button className="saloon-rail-add" title="Créer ou rejoindre un saloon" aria-label="Créer ou rejoindre un saloon" onClick={onAdd}>
        +
      </button>
    </nav>
  );
}

/** Saloon ouvert : son nom, et sur téléphone le menu déroulant pour en changer. */
export function SaloonHeader({ state, onAdd, onInfo }: PickerProps & { onInfo: () => void }) {
  const [open, setOpen] = useState(false);
  const { current } = state;
  return (
    <div className="saloon-header">
      <button className="saloon-header-toggle" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <SaloonIcon saloon={current} size={40} />
        <span className="saloon-header-name">{current.name}</span>
        <span className="saloon-header-caret">{open ? '▴' : '▾'}</span>
      </button>
      <span className="saloon-header-name saloon-header-static">
        <SaloonIcon saloon={current} size={40} />
        {current.name}
      </span>
      <button className="saloon-header-info" onClick={onInfo}>
        {current.public ? (
          'Saloon public, ouvert à tous'
        ) : (
          <>
            {current.members} membre{current.members > 1 ? 's' : ''}
            {current.invite ? ' · Inviter' : ''}
          </>
        )}
      </button>
      {open && (
        <>
          <div className="home-menu-backdrop" onClick={() => setOpen(false)} />
          <div className="saloon-menu" role="menu">
            {state.saloons.map((s) => (
              <button
                key={s.id}
                role="menuitem"
                className={s.id === current.id ? 'selected' : ''}
                onClick={() => {
                  setOpen(false);
                  state.select(s.id);
                }}
              >
                <SaloonIcon saloon={s} size={36} />
                {s.name}
              </button>
            ))}
            <button
              role="menuitem"
              className="saloon-menu-add"
              onClick={() => {
                setOpen(false);
                onAdd();
              }}
            >
              + Créer ou rejoindre un saloon
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Créer un saloon, ou en rejoindre un avec son nom et son mot de passe. */
export function SaloonDialog({ state, myId, onClose }: { state: SaloonsState; myId: string; onClose: () => void }) {
  const [tab, setTab] = useState<'join' | 'create'>('join');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [color, setColor] = useState<string>(SALOON_COLORS[0]);
  const [icon, setIcon] = useState<string>(SALOON_ICONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Saloon | null>(null);
  const problem = tab === 'create' ? ((name && saloonNameProblem(name)) || (password && saloonPasswordProblem(password)) || null) : null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (tab === 'create') setCreated(await state.create(name, password, color, icon));
      else {
        await state.join(name, password);
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (created) return <SaloonInfo saloon={created} state={state} myId={myId} onClose={onClose} welcome />;

  return (
    <div className="overlay">
      <form
        className="dialog saloon-dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && name && password && !problem) void submit();
        }}
      >
        <div className="segmented">
          <button type="button" className={tab === 'join' ? 'selected' : ''} onClick={() => setTab('join')}>
            Rejoindre
          </button>
          <button type="button" className={tab === 'create' ? 'selected' : ''} onClick={() => setTab('create')}>
            Créer
          </button>
        </div>
        <input aria-label="Nom du saloon" placeholder="Nom du saloon" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} autoFocus />
        <input
          aria-label="Mot de passe du saloon"
          placeholder="Mot de passe du saloon"
          type="password"
          autoComplete={tab === 'create' ? 'new-password' : 'off'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {tab === 'create' && (
          <>
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
          </>
        )}
        {(problem || error) && <div className="online-error">{problem || error}</div>}
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-gold" disabled={busy || !name || !password || !!problem}>
            {tab === 'create' ? 'Créer le saloon' : 'Entrer'}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Le saloon ouvert : lien d'invitation, membres, réglages (selon le rôle), et le quitter. */
export function SaloonInfo({ saloon, state, myId, onClose, welcome }: { saloon: Saloon; state: SaloonsState; myId: string; onClose: () => void; welcome?: boolean }) {
  // Le saloon peut changer pendant que la fenêtre est ouverte (nouveau lien, renommé).
  const current = state.saloons.find((s) => s.id === saloon.id) ?? saloon;
  const [tab, setTab] = useState<'saloon' | 'members' | 'settings'>('saloon');
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = current.invite ? inviteLink(location.origin, current.invite) : null;
  const tabs: [typeof tab, string][] = [
    ['saloon', 'Saloon'],
    ['members', 'Membres'],
    ...(canEditSaloon(current.role) ? ([['settings', 'Réglages']] as [typeof tab, string][]) : []),
  ];

  const run = (action: () => Promise<unknown>) => {
    setError(null);
    action().catch((e: Error) => setError(e.message));
  };

  return (
    <div className="overlay">
      <div className="dialog saloon-dialog">
        <h2>
          {current.icon} {current.name}
        </h2>
        {!current.public && (
          <div className="segmented saloon-tabs">
            {tabs.map(([t, label]) => (
              <button key={t} className={tab === t ? 'selected' : ''} onClick={() => setTab(t)}>
                {label}
              </button>
            ))}
          </div>
        )}
        {tab === 'members' && <SaloonMembersList saloonId={current.id} actor={current.role} myId={myId} onChanged={() => void state.refresh()} />}
        {tab === 'settings' && (
          <SaloonSettings
            saloonId={current.id}
            actor={current.role}
            initial={current}
            onChanged={() => void state.refresh()}
            onDeleted={() => {
              state.select(PUBLIC_SALOON_ID);
              void state.refresh();
              onClose();
            }}
          />
        )}
        {tab === 'saloon' && (
          <>
            {welcome && <div>Ton saloon est prêt. Envoie ce lien à tes amis : il les fait entrer directement, sans mot de passe.</div>}
            {current.public ? (
              <div>
                Le saloon public, ouvert à tous : chacun y lance une partie comme il veut, avec un pote, en solo ou chez lui. Tous les
                joueurs en font partie, et son classement est celui de tout le monde.
              </div>
            ) : (
              <div className="saloon-info-line">
                {ROLE_NAMES[current.role]} · {current.members} / {MAX_SALOON_MEMBERS} membres
              </div>
            )}
            {link && (
              <div className="saloon-invite">
                <input aria-label="Lien d'invitation" readOnly value={link} onFocus={(e) => e.target.select()} />
                <div className="dialog-actions">
                  <button
                    type="button"
                    onClick={() =>
                      run(async () => {
                        await navigator.clipboard.writeText(link);
                        setCopied(true);
                      })
                    }
                  >
                    {copied ? 'Copié' : 'Copier le lien'}
                  </button>
                  <button type="button" onClick={() => run(() => state.renewInvite(current.id).then(() => setCopied(false)))}>
                    Nouveau lien
                  </button>
                </div>
                <div className="saloon-hint">« Nouveau lien » rend l'ancien inutilisable. Sans lien, on entre avec le nom et le mot de passe du saloon.</div>
              </div>
            )}
          </>
        )}
        {error && <div className="online-error">{error}</div>}
        <div className="dialog-actions">
          {!current.public &&
            tab === 'saloon' &&
            (confirmLeave ? (
              <button type="button" className="btn-danger" onClick={() => run(() => state.leave(current.id).then(onClose))}>
                Confirmer : quitter
              </button>
            ) : (
              <button type="button" className="btn-danger" onClick={() => setConfirmLeave(true)}>
                Quitter le saloon
              </button>
            ))}
          <button type="button" className="btn-gold" onClick={onClose}>
            Fermer
          </button>
        </div>
        {confirmLeave && current.role === 'owner' && (
          <div className="saloon-hint">Tu es propriétaire : la propriété passera à l'admin le plus ancien, à défaut au membre le plus ancien.</div>
        )}
      </div>
    </div>
  );
}
