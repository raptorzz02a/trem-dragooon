import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { playersLabel } from '../../extra-games/catalog';
import { GameIcon } from './GameIcon';
import './RulesDialog.css';
/** Règles d'un des « Autres jeux » : l'explication entre amis, puis quatre lignes fixes. */
export function RulesDialog({ def, onClose, onPlay }) {
    return (_jsx("div", { className: "overlay", onClick: onClose, children: _jsxs("div", { className: "dialog rules-dialog", role: "dialog", "aria-label": `Règles de ${def.name}`, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "rules-head", children: [_jsx(GameIcon, { def: def, size: 60 }), _jsxs("div", { children: [_jsx("div", { className: "rules-name", children: def.name }), _jsxs("div", { className: "rules-meta", children: [playersLabel(def), " \u00B7 ", def.teams ? 'individuel ou équipes' : 'individuel'] })] })] }), _jsxs("p", { className: "rules-bubble", children: ["\u00AB ", def.bubble, " \u00BB"] }), _jsxs("dl", { className: "rules-lines", children: [_jsx("dt", { children: "But" }), _jsx("dd", { children: def.rules.goal }), _jsx("dt", { children: "Points" }), _jsx("dd", { children: def.rules.points }), _jsx("dt", { children: "Victoire" }), _jsx("dd", { children: def.rules.win }), _jsx("dt", { children: "Attention" }), _jsx("dd", { children: def.rules.warning })] }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { onClick: onClose, children: "Fermer" }), onPlay && (_jsx("button", { className: "btn-gold", onClick: onPlay, children: "Jouer" }))] })] }) }));
}
