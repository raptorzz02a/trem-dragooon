import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { MISS } from '../../game-engine/darts';
import { Hearts } from '../modes/extra/killerView';
import { useTapGuard } from '../useTapGuard';
import { DartBoard } from './DartBoard';
import './KillerInput.css';
const ZONES = [
    { m: 1, label: 'Simple' },
    { m: 2, label: 'Double' },
    { m: 3, label: 'Triple' },
];
/**
 * Saisie des jeux « à numéros de joueurs » (Killer, Killer Doubles) : on choisit la zone, puis le joueur dont on a
 * touché le numéro. Tout autre numéro ne fait rien : un seul bouton « Autre numéro / Raté ».
 */
export function KillerInput({ ctx, players, marks, doublesOnly = false, disabled, onDart }) {
    const guard = useTapGuard();
    const [zone, setZone] = useState(doublesOnly ? 2 : 1);
    const me = ctx.state.current?.sideIndex ?? -1;
    const send = guard((dart) => {
        onDart(dart);
        setZone(doublesOnly ? 2 : 1);
    });
    return (_jsxs("div", { className: "killer-input", children: [!doublesOnly && (_jsx("div", { className: "killer-zones segmented", children: ZONES.map(({ m, label }) => (_jsx("button", { className: zone === m ? 'selected' : '', disabled: disabled, onClick: () => setZone(m), children: label }, m))) })), _jsx("div", { className: "killer-players", children: players.map((p) => (_jsxs("button", { className: `killer-player${p.side === me ? ' me' : ''}`, disabled: disabled, onClick: () => send({ segment: p.number, multiplier: zone }), children: [_jsxs("span", { className: "killer-number", children: [zone === 2 ? 'D' : zone === 3 ? 'T' : '', p.number] }), _jsx("span", { className: "killer-name", children: p.side === me ? `${ctx.sideName(p.side)} (toi)` : ctx.sideName(p.side) }), _jsx(Hearts, { lives: p.lives, max: p.maxLives }), p.killer && _jsx("span", { className: "board-chip gold", children: "KILLER" })] }, p.side))) }), _jsx("div", { className: "killer-target", children: _jsx(DartBoard, { marks: marks }) }), _jsx("button", { className: "clock-miss killer-miss", disabled: disabled, onClick: () => send(MISS), children: "\u2717 Autre num\u00E9ro / Rat\u00E9" })] }));
}
