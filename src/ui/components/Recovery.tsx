import { useState } from 'react';
import { passwordProblem, PSEUDO_MAX } from '../../online/accounts';
import type { AccountState } from '../../online/useAccount';

// Mot de passe oublié, sans e-mail : un code de secours noté à la création du compte, sinon une demande à l'administrateur.

/** Le code de secours, montré une seule fois. */
export function RecoveryCodeDialog({ code, onClose }: { code: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overlay">
      <div className="dialog recovery-dialog">
        <h2>Ton code de secours</h2>
        <div className="recovery-code" aria-label="Code de secours">
          {code}
        </div>
        <div>
          Note-le (photo, carnet, gestionnaire de mots de passe). Si tu oublies ton mot de passe, il te permet d’en choisir un nouveau
          depuis la page de connexion. Il ne sera plus affiché.
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard
                .writeText(code)
                .then(() => setCopied(true))
                .catch(() => undefined)
            }
          >
            {copied ? 'Copié' : 'Copier'}
          </button>
          <button type="button" className="btn-gold" onClick={onClose}>
            J’ai noté mon code
          </button>
        </div>
      </div>
    </div>
  );
}

/** Nouveau code de secours depuis le menu du compte : l'ancien ne marchera plus. */
export function RenewRecoveryDialog({ state, onClose }: { state: AccountState; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await state.renewRecovery(password);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
      setBusy(false);
    }
  };

  return (
    <div className="overlay">
      <form
        className="dialog password-dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && password) void submit();
        }}
      >
        <h2>Code de secours</h2>
        <div>
          {state.hasRecovery
            ? 'Un nouveau code remplace l’ancien, qui ne marchera plus.'
            : 'Tu n’as pas encore de code de secours : sans lui, un mot de passe oublié passe par l’administrateur.'}
        </div>
        <input
          aria-label="Mot de passe"
          placeholder="Ton mot de passe"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <div className="online-error">{error}</div>}
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-gold" disabled={busy || !password}>
            {state.hasRecovery ? 'Nouveau code' : 'Créer mon code'}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Page de connexion, « Mot de passe oublié ? » : code de secours et nouveau mot de passe, ou demande à l'administrateur. */
export function ForgotPassword({ state, initialName, onBack }: { state: AccountState; initialName: string; onBack: () => void }) {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const problem = password ? passwordProblem(password) : null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (requested) {
    return (
      <div className="online-login">
        <div>
          Demande envoyée. L’administrateur va te créer un mot de passe provisoire et te le transmettre ; tu pourras ensuite le changer
          depuis le menu de ton compte (« Mot de passe »).
        </div>
        <button type="button" onClick={onBack}>
          ← Connexion
        </button>
      </div>
    );
  }

  return (
    <form
      className="online-login"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && name.trim() && code && password && !problem) void run(() => state.recover(name.trim(), code, password));
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
        aria-label="Code de secours"
        placeholder="Code de secours (ABCD-EFGH-…)"
        value={code}
        autoComplete="off"
        autoCapitalize="characters"
        onChange={(e) => setCode(e.target.value)}
      />
      <input
        aria-label="Nouveau mot de passe"
        placeholder="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {(problem ?? error) && <div className="online-error">{problem ?? error}</div>}
      <button type="submit" className="btn-gold" disabled={busy || !name.trim() || !code || !password || problem !== null}>
        Changer mon mot de passe
      </button>
      <div className="online-hint">Pas de code de secours ?</div>
      <button
        type="button"
        disabled={busy || !name.trim()}
        onClick={() => void run(() => state.requestPassword(name.trim()).then(() => setRequested(true)))}
      >
        Demander à un admin
      </button>
      <button type="button" className="welcome-link" onClick={onBack}>
        ← Connexion
      </button>
    </form>
  );
}
