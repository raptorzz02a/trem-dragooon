import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BULL, MISS } from '../../game-engine/darts';
import { dartFor } from '../../game-engine/extra/zones';
import { useTapGuard } from '../useTapGuard';
import { DartBoard } from './DartBoard';
import './ClockInput.css';
/**
 * Saisie à cible imposée : la cible complète avec la zone à viser en or, et seulement les boutons utiles.
 * Tout le numéro : Simple / Double / Triple / Raté. Zone précise : Touché / Raté. Bull : 25 / 50 / Raté.
 */
export function ZoneInput({ target, marks = [], note, missLabel = 'Raté', anyHit = false, disabled, onDart }) {
    const guard = useTapGuard();
    const hit = guard((m) => onDart(dartFor(target, m)));
    const miss = guard(() => onDart(MISS));
    const bull = target.segment === BULL;
    const buttons = target.ring !== 'any' || anyHit
        ? [{ m: 1, label: 'Touché' }]
        : bull
            ? [
                { m: 1, label: '25' },
                { m: 2, label: '50' },
            ]
            : [
                { m: 1, label: 'Simple' },
                { m: 2, label: 'Double' },
                { m: 3, label: 'Triple' },
            ];
    const layout = buttons.length === 3 ? 'by-zone' : buttons.length === 2 ? 'by-bull' : '';
    return (_jsxs("div", { className: "clock-input", children: [_jsx("div", { className: "clock-input-target", children: _jsx(DartBoard, { marks: [...marks, { zone: target, tone: 'gold', pulse: true }], label: "Zone \u00E0 viser" }) }), _jsxs("div", { className: `clock-input-buttons ${layout}`, children: [buttons.map(({ m, label }) => (_jsxs("button", { className: "clock-hit", disabled: disabled, onClick: () => hit(m), children: ["\u2713 ", label, note && _jsx("small", { className: "zone-note", children: note(target.ring === 'D' ? 2 : target.ring === 'T' ? 3 : m) })] }, m))), _jsxs("button", { className: "clock-miss", disabled: disabled, onClick: miss, children: ["\u2717 ", missLabel] })] })] }));
}
