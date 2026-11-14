import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { passwordProblem, PSEUDO_MAX } from '../../online/accounts';
// Mot de passe oublié, sans e-mail : un code de secours noté à la création du compte, sinon une demande à l'administrateur.
/** Le code de secours, montré une seule fois. */
export function RecoveryCodeDialog({ code, onClose }) {
    const [copied, setCopied] = useState(false);
    return (_jsx("div", { className: "overlay", children: _jsxs("div", { className: "dialog recovery-dialog", children: [_jsx("h2", { children: "Ton code de secours" }), _jsx("div", { className: "recovery-code", "aria-label": "Code de secours", children: code }), _jsx("div", { children: "Note-le (photo, carnet, gestionnaire de mots de passe). Si tu oublies ton mot de passe, il te permet d\u2019en choisir un nouveau depuis la page de connexion. Il ne sera plus affich\u00E9." }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { type: "button", onClick: () => void navigator.clipboard
                                .writeText(code)
                                .then(() => setCopied(true))
                                .catch(() => undefined), children: copied ? 'Copié' : 'Copier' }), _jsx("button", { type: "button", className: "btn-gold", onClick: onClose, children: "J\u2019ai not\u00E9 mon code" })] })] }) }));
}
/** Nouveau code de secours depuis le menu du compte : l'ancien ne marchera plus. */
export function RenewRecoveryDialog({ state, onClose }) {
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            await state.renewRecovery(password);
            onClose();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Action impossible.');
            setBusy(false);
        }
    };
    return (_jsx("div", { className: "overlay", children: _jsxs("form", { className: "dialog password-dialog", onSubmit: (e) => {
                e.preventDefault();
                if (!busy && password)
                    void submit();
            }, children: [_jsx("h2", { children: "Code de secours" }), _jsx("div", { children: state.hasRecovery
                        ? 'Un nouveau code remplace l’ancien, qui ne marchera plus.'
                        : 'Tu n’as pas encore de code de secours : sans lui, un mot de passe oublié passe par l’administrateur.' }), _jsx("input", { "aria-label": "Mot de passe", placeholder: "Ton mot de passe", type: "password", autoComplete: "current-password", value: password, onChange: (e) => setPassword(e.target.value), autoFocus: true }), error && _jsx("div", { className: "online-error", children: error }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { type: "button", onClick: onClose, children: "Annuler" }), _jsx("button", { type: "submit", className: "btn-gold", disabled: busy || !password, children: state.hasRecovery ? 'Nouveau code' : 'Créer mon code' })] })] }) }));
}
/** Page de connexion, « Mot de passe oublié ? » : code de secours et nouveau mot de passe, ou demande à l'administrateur. */
export function ForgotPassword({ state, initialName, onBack }) {
    const [name, setName] = useState(initialName);
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [requested, setRequested] = useState(false);
    const problem = password ? passwordProblem(password) : null;
    const run = async (action) => {
        setBusy(true);
        setError(null);
        try {
            await action();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Action impossible.');
        }
        finally {
            setBusy(false);
        }
    };
    if (requested) {
        return (_jsxs("div", { className: "online-login", children: [_jsx("div", { children: "Demande envoy\u00E9e. L\u2019administrateur va te cr\u00E9er un mot de passe provisoire et te le transmettre ; tu pourras ensuite le changer depuis le menu de ton compte (\u00AB Mot de passe \u00BB)." }), _jsx("button", { type: "button", onClick: onBack, children: "\u2190 Connexion" })] }));
    }
    return (_jsxs("form", { className: "online-login", onSubmit: (e) => {
            e.preventDefault();
            if (!busy && name.trim() && code && password && !problem)
                void run(() => state.recover(name.trim(), code, password));
        }, children: [_jsx("input", { "aria-label": "Pseudo", placeholder: "Pseudo", value: name, maxLength: PSEUDO_MAX, autoComplete: "username", autoCapitalize: "none", onChange: (e) => setName(e.target.value) }), _jsx("input", { "aria-label": "Code de secours", placeholder: "Code de secours (ABCD-EFGH-\u2026)", value: code, autoComplete: "off", autoCapitalize: "characters", onChange: (e) => setCode(e.target.value) }), _jsx("input", { "aria-label": "Nouveau mot de passe", placeholder: "Nouveau mot de passe", type: "password", autoComplete: "new-password", value: password, onChange: (e) => setPassword(e.target.value) }), (problem ?? error) && _jsx("div", { className: "online-error", children: problem ?? error }), _jsx("button", { type: "submit", className: "btn-gold", disabled: busy || !name.trim() || !code || !password || problem !== null, children: "Changer mon mot de passe" }), _jsx("div", { className: "online-hint", children: "Pas de code de secours ?" }), _jsx("button", { type: "button", disabled: busy || !name.trim(), onClick: () => void run(() => state.requestPassword(name.trim()).then(() => setRequested(true))), children: "Demander \u00E0 un admin" }), _jsx("button", { type: "button", className: "welcome-link", onClick: onBack, children: "\u2190 Connexion" })] }));
}
