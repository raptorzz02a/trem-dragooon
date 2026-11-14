import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { TEAM_COLORS } from '../../teams/teams';
import { AVATAR_PARTS, Avatar, HAIR_COLORS, randomAvatar, SKINS } from './Avatar';
import './ProfileEditor.css';
export const PROFILE_COLORS = TEAM_COLORS.map((c) => c.hex);
export function newId() {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
export function newProfile(name = '') {
    return {
        id: newId(),
        name,
        color: PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)],
        avatar: randomAvatar(),
        createdAt: new Date().toISOString(),
    };
}
const ROWS = [
    { part: 'skin', label: 'Peau', count: SKINS.length },
    { part: 'hair', label: 'Cheveux', count: AVATAR_PARTS.hair.length, names: AVATAR_PARTS.hair },
    { part: 'hairColor', label: 'Couleur', count: HAIR_COLORS.length },
    { part: 'facialHair', label: 'Pilosité', count: AVATAR_PARTS.facialHair.length, names: AVATAR_PARTS.facialHair },
    { part: 'glasses', label: 'Lunettes', count: AVATAR_PARTS.glasses.length, names: AVATAR_PARTS.glasses },
    { part: 'hat', label: 'Chapeau', count: AVATAR_PARTS.hat.length, names: AVATAR_PARTS.hat },
];
export function ProfileEditor({ initial, takenNames, title, onSave, onCancel }) {
    const [profile, setProfile] = useState(initial);
    const set = (patch) => setProfile((p) => ({ ...p, ...patch }));
    const setPart = (part, value) => set({ avatar: { ...profile.avatar, [part]: value } });
    const name = profile.name.trim();
    const taken = takenNames.some((n) => n.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'));
    const error = !name ? 'Choisis un surnom.' : taken ? 'Ce surnom est déjà pris.' : null;
    return (_jsx("div", { className: "overlay", children: _jsxs("div", { className: "dialog profile-editor", children: [_jsxs("div", { className: "pe-left", children: [_jsx("h2", { children: title }), _jsx("div", { className: "pe-preview", children: _jsx(Avatar, { avatar: profile.avatar, color: profile.color, size: 190 }) }), _jsx("input", { value: profile.name, maxLength: 16, placeholder: "Surnom", onChange: (e) => set({ name: e.target.value }), autoFocus: true }), _jsx("div", { className: "pe-colors", children: PROFILE_COLORS.map((c) => (_jsx("button", { "aria-label": `Couleur ${c}`, className: profile.color === c ? 'selected' : '', style: { background: c }, onClick: () => set({ color: c }) }, c))) }), _jsx("button", { onClick: () => set({ avatar: randomAvatar() }), children: "\uD83C\uDFB2 Au hasard" })] }), _jsxs("div", { className: "pe-right", children: [ROWS.map((row) => (_jsxs("div", { className: "pe-row", children: [_jsx("span", { className: "label", children: row.label }), _jsx("div", { className: "pe-options", children: Array.from({ length: row.count }, (_, i) => (_jsx("button", { className: profile.avatar[row.part] === i ? 'selected' : '', "aria-label": row.names?.[i] ?? `${row.label} ${i + 1}`, onClick: () => setPart(row.part, i), children: row.part === 'skin' || row.part === 'hairColor' ? (_jsx("span", { className: "pe-swatch", style: { background: (row.part === 'skin' ? SKINS : HAIR_COLORS)[i] } })) : (_jsx(Avatar, { avatar: { ...profile.avatar, [row.part]: i }, color: profile.color, size: 48 })) }, i))) })] }, row.part))), _jsxs("div", { className: "pe-footer", children: [_jsx("span", { className: "pe-error", children: error }), _jsx("button", { onClick: onCancel, children: "Annuler" }), _jsx("button", { className: "btn-gold", disabled: error !== null, onClick: () => onSave({ ...profile, name }), children: "Enregistrer" })] })] })] }) }));
}
