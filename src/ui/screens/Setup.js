import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { MAX_TEAMS, MIN_TEAMS } from '../../game-engine/engine';
import { DEFAULT_SETUP, MODE_NAMES, MODES, TEAM_NOTES } from '../../game-setup/setup';
import { defaultValues, extraGame, isExtraMode, playersLabel } from '../../extra-games/catalog';
import { useState } from 'react';
import { GameIcon } from '../components/GameIcon';
import { RulesDialog } from '../components/RulesDialog';
import './Setup.css';
/** Rangée de choix exclusifs. */
export function Choice(props) {
    return (_jsxs(_Fragment, { children: [props.label && _jsx("div", { className: "label", children: props.label }), _jsx("div", { className: "segmented", children: props.options.map((o) => (_jsx("button", { className: props.value === o.value ? 'selected' : '', disabled: props.disabled || o.disabled, onClick: () => props.onChange(o.value), children: o.label }, String(o.value)))) })] }));
}
/** Réglages d'un des « Autres jeux », lus dans sa fiche du catalogue. */
function ExtraRules({ def, setup, update, disabled }) {
    const values = setup.extra?.[def.id] ?? defaultValues(def);
    const set = (key, value) => update({ extra: { ...(setup.extra ?? DEFAULT_SETUP.extra), [def.id]: { ...values, [key]: value } } });
    return (_jsx(_Fragment, { children: def.settings.map((st) => (_jsx(Choice, { disabled: disabled, label: st.label, value: values[st.key] ?? st.default, options: st.choices.map((c) => ({ value: c.value, label: c.label })), onChange: (v) => set(st.key, v) }, st.key))) }));
}
function ModeRules({ setup, update, disabled }) {
    if (isExtraMode(setup.mode))
        return _jsx(ExtraRules, { def: extraGame(setup.mode), setup: setup, update: update, disabled: disabled });
    switch (setup.mode) {
        case 'x01': {
            const o = setup.x01;
            const set = (p) => update({ x01: { ...o, ...p } });
            return (_jsxs(_Fragment, { children: [_jsx(Choice, { disabled: disabled, label: "Score de d\u00E9part", value: o.startScore, options: [301, 501, 701].map((v) => ({ value: v, label: v })), onChange: (startScore) => set({ startScore }) }), _jsx(Choice, { disabled: disabled, label: "Sortie", value: o.out, options: [
                            { value: 'straight', label: 'Simple' },
                            { value: 'double', label: 'Double' },
                        ], onChange: (out) => set({ out }) })] }));
        }
        case 'cricket': {
            const o = setup.cricket;
            const set = (p) => update({ cricket: { ...o, ...p } });
            return (_jsxs(_Fragment, { children: [_jsx(Choice, { disabled: disabled, label: "Variante", value: o.variant, options: [
                            { value: 'standard', label: 'Classique' },
                            { value: 'cutthroat', label: 'Cut-Throat' },
                        ], onChange: (variant) => set({ variant }) }), _jsx(Choice, { disabled: disabled, label: "Bull \u00E0 fermer", value: o.bull, options: [
                            { value: true, label: 'Avec Bull' },
                            { value: false, label: 'Sans Bull' },
                        ], onChange: (bull) => set({ bull }) }), _jsx(Choice, { disabled: disabled, label: "Manches", value: o.maxRounds, options: [
                            { value: null, label: 'Illimité' },
                            { value: 20, label: '20 manches' },
                        ], onChange: (maxRounds) => set({ maxRounds }) })] }));
        }
        case 'clock': {
            const o = setup.clock;
            const set = (p) => update({ clock: { ...o, ...p } });
            return (_jsxs(_Fragment, { children: [_jsx(Choice, { disabled: disabled, label: "Parcours", value: o.order, options: [
                            { value: 'asc', label: '1 → 20' },
                            { value: 'desc', label: '20 → 1' },
                            { value: 'board', label: 'Cadran' },
                        ], onChange: (order) => set({ order }) }), _jsx(Choice, { disabled: disabled, label: "Zone \u00E0 toucher", value: o.required, options: [
                            { value: 'any', label: 'Toutes' },
                            { value: 'double', label: 'Doubles' },
                            { value: 'triple', label: 'Triples' },
                        ], onChange: (required) => set({ required, advanceByMultiplier: required === 'any' && o.advanceByMultiplier }) }), _jsx(Choice, { disabled: disabled, label: "Double et triple font avancer de 2 et 3", value: o.advanceByMultiplier, options: [
                            { value: false, label: 'Non' },
                            { value: true, label: 'Oui', disabled: o.required !== 'any' },
                        ], onChange: (advanceByMultiplier) => set({ advanceByMultiplier }) }), _jsx(Choice, { disabled: disabled, label: "Bull final", value: o.bullFinish, options: [
                            { value: 'none', label: 'Aucun' },
                            { value: 'any', label: '25 ou 50' },
                            { value: 'both', label: '25 puis 50' },
                        ], onChange: (bullFinish) => set({ bullFinish }) })] }));
        }
        case 'random': {
            const o = setup.random;
            return (_jsx(Choice, { disabled: disabled, label: "Nombre de tours", value: o.rounds, options: [10, 15, 20].map((v) => ({ value: v, label: v })), onChange: (rounds) => update({ random: { ...o, rounds } }) }));
        }
        case 'training':
            return (_jsx("div", { className: "setup-note", children: "Chaque fl\u00E9chette rapporte sa valeur, sans bust ni limite. L\u2019h\u00F4te termine l\u2019entra\u00EEnement quand il veut : la partie compte dans les statistiques, pas dans les victoires." }));
    }
}
export const PLACE_NAMES = {
    same: 'Même cible',
    remote: 'En ligne',
};
/**
 * Réglages de la partie dans la salle d'attente. Seul l'hôte les modifie ; les autres les voient en lecture seule.
 * Chaque changement part au serveur, qui le renvoie à tous.
 */
export function SetupPanel(props) {
    const { setup, host } = props;
    const update = props.onSetup;
    const maxTeams = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, props.playerCount));
    const disabled = !host;
    const extra = isExtraMode(setup.mode) ? extraGame(setup.mode) : null;
    const [rules, setRules] = useState(false);
    return (_jsxs("section", { className: "setup-rules", children: [extra ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "setup-extra-head", children: [_jsx(GameIcon, { def: extra, size: 56 }), _jsxs("div", { className: "setup-extra-name", children: [_jsx("strong", { children: extra.name }), _jsxs("span", { children: [playersLabel(extra), " \u00B7 M\u00EAme cible uniquement"] })] }), _jsx("button", { onClick: () => setRules(true), children: "? R\u00E8gles" })] }), rules && _jsx(RulesDialog, { def: extra, onClose: () => setRules(false) })] })) : (_jsxs(_Fragment, { children: [_jsx(Choice, { disabled: disabled, label: "O\u00F9 jouez-vous ?", value: props.place, options: [
                            { value: 'same', label: PLACE_NAMES.same },
                            { value: 'remote', label: PLACE_NAMES.remote },
                        ], onChange: props.onPlace }), _jsx("div", { className: "setup-note", children: props.place === 'same'
                            ? 'Tout le monde joue sur la même cible : cet appareil saisit les fléchettes de tous.'
                            : 'Chacun joue sur sa cible et saisit ses fléchettes sur son téléphone pendant son tour.' }), _jsx(Choice, { disabled: disabled, label: "Jeu", value: setup.mode, options: MODES.map((m) => ({ value: m, label: m === 'x01' ? '301 · 501 · 701' : MODE_NAMES[m] })), onChange: (mode) => update({ mode }) })] })), _jsx(ModeRules, { setup: setup, update: update, disabled: disabled }), (!extra || extra.teams) && (_jsx(Choice, { disabled: disabled, label: "Formule", value: setup.teamMode, options: [
                    { value: false, label: 'Individuel' },
                    { value: true, label: 'Équipes' },
                ], onChange: (teamMode) => update({ teamMode }) })), setup.teamMode && (_jsxs(_Fragment, { children: [_jsx(Choice, { disabled: disabled, label: "Nombre d\u2019\u00E9quipes", value: setup.teamCount, options: Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => i + MIN_TEAMS).map((n) => ({
                            value: n,
                            label: n,
                            disabled: n > maxTeams,
                        })), onChange: (teamCount) => update({ teamCount }) }), host && (_jsx("button", { className: "btn-primary", disabled: props.playerCount < setup.teamCount, onClick: props.onDrawTeams, children: "Tirer les \u00E9quipes au sort" })), _jsx("div", { className: "setup-note", children: TEAM_NOTES[setup.mode] })] })), _jsx(Choice, { disabled: disabled, label: "Ordre de passage", value: setup.randomizeOrder, options: [
                    { value: true, label: 'Aléatoire' },
                    { value: false, label: 'Ordre de la liste' },
                ], onChange: (randomizeOrder) => update({ randomizeOrder }) }), extra && host && (_jsx("button", { className: "setup-defaults", onClick: () => update({ extra: { ...(setup.extra ?? DEFAULT_SETUP.extra), [extra.id]: defaultValues(extra) }, teamMode: false, randomizeOrder: true }), children: "\u21BA R\u00E8gles par d\u00E9faut" }))] }));
}
