import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BULL, MISS } from '../../game-engine/darts';
import { useTapGuard } from '../useTapGuard';
import { ClockTarget } from './ClockTarget';
import './ClockInput.css';
const ZONES = [
    { m: 1, label: 'Simple' },
    { m: 2, label: 'Double' },
    { m: 3, label: 'Triple' },
];
const BULLS = [
    { m: 1, label: '25' },
    { m: 2, label: '50' },
];
/**
 * Saisie du Chiffre aléatoire : la cible dessinée comme à l'Horloge, le numéro tiré allumé,
 * et on indique seulement la zone touchée sur ce numéro (seules ces fléchettes rapportent).
 */
export function RandomInput({ target, disabled, onDart }) {
    const guard = useTapGuard();
    const bull = target === BULL;
    const hit = guard((m) => onDart({ segment: target, multiplier: m }));
    const miss = guard(() => onDart(MISS));
    const zones = bull ? BULLS : ZONES;
    return (_jsxs("div", { className: "clock-input", children: [_jsx("div", { className: "clock-input-target", children: _jsx(ClockTarget, { steps: [bull ? { bull: 'any' } : { number: target }], progress: 0 }) }), _jsxs("div", { className: `clock-input-buttons ${bull ? 'by-bull' : 'by-zone'}`, children: [zones.map(({ m, label }) => (_jsxs("button", { className: "clock-hit", disabled: disabled, onClick: () => hit(m), children: ["\u2713 ", label] }, m))), _jsx("button", { className: "clock-miss", disabled: disabled, onClick: miss, children: "\u2717 Rat\u00E9" })] })] }));
}
