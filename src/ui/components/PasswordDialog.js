import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { passwordProblem } from '../../online/accounts';
/** Changement de son mot de passe (par exemple après un mot de passe provisoire donné par l'administrateur). */
export function PasswordDialog({ onSave, onClose }) {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(false);
    const problem = next ? passwordProblem(next) : null;
    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            await onSave(current, next);
            setDone(true);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Action impossible.');
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsx("div", { className: "overlay", children: _jsxs("form", { className: "dialog password-dialog", onSubmit: (e) => {
                e.preventDefault();
                if (!busy && current && next && !problem)
                    void submit();
            }, children: [_jsx("h2", { children: "Mot de passe" }), done ? (_jsx("div", { children: "Mot de passe chang\u00E9. Tes autres appareils devront se reconnecter." })) : (_jsxs(_Fragment, { children: [_jsx("input", { "aria-label": "Mot de passe actuel", placeholder: "Mot de passe actuel", type: "password", autoComplete: "current-password", value: current, onChange: (e) => setCurrent(e.target.value), autoFocus: true }), _jsx("input", { "aria-label": "Nouveau mot de passe", placeholder: "Nouveau mot de passe", type: "password", autoComplete: "new-password", value: next, onChange: (e) => setNext(e.target.value) }), (problem ?? error) && _jsx("div", { className: "online-error", children: problem ?? error })] })), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { type: "button", onClick: onClose, children: done ? 'Fermer' : 'Annuler' }), !done && (_jsx("button", { type: "submit", className: "btn-gold", disabled: busy || !current || !next || problem !== null, children: "Changer" }))] })] }) }));
}
