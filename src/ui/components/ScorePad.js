import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { BULL, MISS } from '../../game-engine/darts';
import { useTapGuard } from '../useTapGuard';
import './ScorePad.css';
const MULTIPLIERS = [
    { value: 1, label: 'Simple' },
    { value: 2, label: 'Double' },
    { value: 3, label: 'Triple' },
];
const ALL_NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);
/**
 * Saisie en deux étapes : on choisit la zone (Simple par défaut), puis le numéro.
 * L'appui sur le numéro enregistre la fléchette et la zone revient à Simple.
 */
export function ScorePad({ disabled, onDart, numbers = ALL_NUMBERS, highlight = null, highlightBull = null }) {
    const [multiplier, setMultiplier] = useState(1);
    const guard = useTapGuard();
    const throwDart = guard((dart) => {
        onDart(dart);
        setMultiplier(1);
    });
    return (_jsxs("div", { className: `pad pad-m${multiplier}`, children: [_jsx("div", { className: "pad-step label", children: "1. Choisir la zone" }), _jsx("div", { className: "pad-multipliers", children: MULTIPLIERS.map((m) => (_jsx("button", { className: `pad-mult pad-mult-${m.value} ${multiplier === m.value ? 'selected' : ''}`, disabled: disabled, onClick: () => setMultiplier(m.value), children: m.label }, m.value))) }), _jsx("div", { className: "pad-step label", children: "2. Choisir le num\u00E9ro" }), _jsx("div", { className: `pad-numbers ${numbers.length <= 6 ? 'pad-numbers-few' : ''}`, children: numbers.map((n) => (_jsxs("button", { className: `pad-num ${highlight === n ? 'pad-target' : ''}`, disabled: disabled, onClick: () => throwDart({ segment: n, multiplier }), children: [multiplier > 1 && _jsx("span", { className: "pad-prefix", children: multiplier === 2 ? 'D' : 'T' }), n] }, n))) }), _jsxs("div", { className: "pad-specials", children: [_jsx("button", { className: `pad-bull25 ${highlightBull === 25 || highlightBull === 'any' ? 'pad-target' : ''}`, disabled: disabled, onClick: () => throwDart({ segment: BULL, multiplier: 1 }), children: "Bull 25" }), _jsx("button", { className: `pad-bull50 ${highlightBull === 50 || highlightBull === 'any' ? 'pad-target' : ''}`, disabled: disabled, onClick: () => throwDart({ segment: BULL, multiplier: 2 }), children: "Bull 50" }), _jsx("button", { className: "pad-miss", disabled: disabled, onClick: () => throwDart(MISS), children: "Rat\u00E9 0" })] })] }));
}
