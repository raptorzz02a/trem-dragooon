import { useState } from 'react';
import { passwordProblem } from '../../online/accounts';

/** Changement de son mot de passe (par exemple après un mot de passe provisoire donné par l'administrateur). */
export function PasswordDialog({ onSave, onClose }: { onSave: (current: string, next: string) => Promise<void>; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const problem = next ? passwordProblem(next) : null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave(current, next);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay">
      <form
        className="dialog password-dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && current && next && !problem) void submit();
        }}
      >
        <h2>Mot de passe</h2>
        {done ? (
          <div>Mot de passe changé. Tes autres appareils devront se reconnecter.</div>
        ) : (
          <>
            <input
              aria-label="Mot de passe actuel"
              placeholder="Mot de passe actuel"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
            />
            <input
              aria-label="Nouveau mot de passe"
              placeholder="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            {(problem ?? error) && <div className="online-error">{problem ?? error}</div>}
          </>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            {done ? 'Fermer' : 'Annuler'}
          </button>
          {!done && (
            <button type="submit" className="btn-gold" disabled={busy || !current || !next || problem !== null}>
              Changer
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
