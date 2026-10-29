import { useState } from 'react';
import { passwordProblem, pseudoProblem, PSEUDO_MAX } from '../../online/accounts';
import type { AccountState } from '../../online/useAccount';
import { Logo } from '../components/Logo';
import { newProfile } from '../components/ProfileEditor';
import { Choice } from './Setup';
import './Online.css';

/** Connexion ou création de compte : sans compte, pas de partie (les stats suivent le joueur partout). */
export function Welcome({ state, onCreated }: { state: AccountState; onCreated: () => void }) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problem = tab === 'signup' ? (pseudoProblem(name) ?? passwordProblem(password)) : null;
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (tab === 'login') await state.login(name, password);
      else {
        const look = newProfile(name);
        await state.signup(name.trim(), password, look.color, look.avatar);
        // Compte créé : on passe directement au choix de l'avatar.
        onCreated();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
      setBusy(false);
    }
  };

  return (
    <div className="screen online welcome">
      <div className="welcome-logo">
        <Logo size={64} />
      </div>
      <section className="online-block welcome-block">
        <Choice
          label=""
          value={tab}
          options={[
            { value: 'login' as const, label: 'Se connecter' },
            { value: 'signup' as const, label: 'Créer un compte' },
          ]}
          onChange={(t) => {
            setTab(t);
            setError(null);
          }}
        />
        <form
          className="online-login"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && !problem) void submit();
          }}
        >
          <input
            aria-label="Pseudo"
            placeholder="Pseudo"
            value={name}
            maxLength={PSEUDO_MAX}
            autoComplete="username"
            autoCapitalize="none"
            onChange={(e) => setName(e.target.value)}
          />
          <input
            aria-label="Mot de passe"
            placeholder="Mot de passe"
            type="password"
            value={password}
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="btn-gold" disabled={busy || !name.trim() || !password || problem !== null}>
            {tab === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>
        <div className="online-hint">
          {tab === 'signup'
            ? problem && (name || password)
              ? problem
              : 'Un pseudo et un mot de passe suffisent. Tu choisiras ton avatar ensuite.'
            : 'Ton compte garde tes stats, que tu joues sur la borne ou à distance.'}
        </div>
        {error && <div className="online-error">{error}</div>}
      </section>
    </div>
  );
}
