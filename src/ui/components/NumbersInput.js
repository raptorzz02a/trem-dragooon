import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MISS } from '../../game-engine/darts';
import { useTapGuard } from '../useTapGuard';
import { DartBoard } from './DartBoard';
import './ClockInput.css';
import './NumbersInput.css';
/** Saisie « plusieurs numéros à toucher dans n'importe quel ordre » (Pyramide) : un bouton par numéro restant, plus Raté. */
export function NumbersInput({ numbers, marks, disabled, onDart }) {
    const guard = useTapGuard();
    const hit = guard((n) => onDart({ segment: n, multiplier: 1 }));
    const miss = guard(() => onDart(MISS));
    return (_jsxs("div", { className: "clock-input", children: [_jsx("div", { className: "clock-input-target", children: _jsx(DartBoard, { marks: marks, label: "Num\u00E9ros \u00E0 toucher" }) }), _jsxs("div", { className: "numbers-input", children: [numbers.map((n) => (_jsxs("button", { className: "clock-hit", disabled: disabled, onClick: () => hit(n), children: ["\u2713 ", n] }, n))), _jsx("button", { className: "clock-miss", disabled: disabled, onClick: miss, children: "\u2717 Rat\u00E9" })] })] }));
}
