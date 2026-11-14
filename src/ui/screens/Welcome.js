import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { passwordProblem, pseudoProblem, PSEUDO_MAX } from '../../online/accounts';
import { Logo } from '../components/Logo';
import { newProfile } from '../components/ProfileEditor';
import { ForgotPassword } from '../components/Recovery';
import { Choice } from './Setup';
import './Online.css';
/** Connexion ou création de compte : sans compte, pas de partie (les stats suivent le joueur partout). */
export function Welcome({ state, onCreated }) {
    const [tab, setTab] = useState('login');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [forgot, setForgot] = useState(false);
    const problem = tab === 'signup' ? (pseudoProblem(name) ?? passwordProblem(password)) : null;
    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            if (tab === 'login')
                await state.login(name, password);
            else {
                const look = newProfile(name);
                await state.signup(name.trim(), password, look.color, look.avatar);
                // Compte créé : on passe directement au choix de l'avatar.
                onCreated();
            }
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Action impossible.');
            setBusy(false);
        }
    };
    return (_jsxs("div", { className: "screen online welcome", children: [_jsx("div", { className: "welcome-logo", children: _jsx(Logo, { size: 64 }) }), _jsx("section", { className: "online-block welcome-block", children: forgot ? (_jsxs(_Fragment, { children: [_jsx("h2", { children: "Mot de passe oubli\u00E9" }), _jsx(ForgotPassword, { state: state, initialName: name, onBack: () => setForgot(false) })] })) : (_jsxs(_Fragment, { children: [_jsx(Choice, { label: "", value: tab, options: [
                                { value: 'login', label: 'Se connecter' },
                                { value: 'signup', label: 'Créer un compte' },
                            ], onChange: (t) => {
                                setTab(t);
                                setError(null);
                            } }), _jsxs("form", { className: "online-login", onSubmit: (e) => {
                                e.preventDefault();
                                if (!busy && !problem)
                                    void submit();
                            }, children: [_jsx("input", { "aria-label": "Pseudo", placeholder: "Pseudo", value: name, maxLength: PSEUDO_MAX, autoComplete: "username", autoCapitalize: "none", onChange: (e) => setName(e.target.value) }), _jsx("input", { "aria-label": "Mot de passe", placeholder: "Mot de passe", type: "password", value: password, autoComplete: tab === 'login' ? 'current-password' : 'new-password', onChange: (e) => setPassword(e.target.value) }), _jsx("button", { type: "submit", className: "btn-gold", disabled: busy || !name.trim() || !password || problem !== null, children: tab === 'login' ? 'Se connecter' : 'Créer mon compte' })] }), _jsx("div", { className: "online-hint", children: tab === 'signup'
                                ? problem && (name || password)
                                    ? problem
                                    : 'Un pseudo et un mot de passe suffisent. Tu choisiras ton avatar ensuite.'
                                : 'Ton compte garde tes stats, que tu joues sur la borne ou à distance.' }), tab === 'login' && (_jsx("button", { type: "button", className: "welcome-link", onClick: () => setForgot(true), children: "Mot de passe oubli\u00E9 ?" })), error && _jsx("div", { className: "online-error", children: error })] })) })] }));
}
