import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BULL, MISS } from '../../game-engine/darts';
import { useTapGuard } from '../useTapGuard';
import { ClockTarget } from './ClockTarget';
import './ClockInput.css';
/** Fléchette qui valide l'étape en cours avec la zone donnée (ou celle qu'exige la variante). */
function hitDart(step, options, multiplier) {
    if ('number' in step) {
        const required = options.required === 'double' ? 2 : options.required === 'triple' ? 3 : multiplier;
        return { segment: step.number, multiplier: required };
    }
    if (step.bull === 25)
        return { segment: BULL, multiplier: 1 };
    if (step.bull === 50)
        return { segment: BULL, multiplier: 2 };
    return { segment: BULL, multiplier: options.required === 'any' ? 1 : 2 };
}
/**
 * Saisie de l'Horloge : on indique seulement si la fléchette a touché le numéro à viser.
 * Avec l'option « avance selon la zone », on précise simple, double ou triple.
 */
export function ClockInput({ options, steps, progress, disabled, onDart }) {
    const guard = useTapGuard();
    const step = steps[progress];
    const byZone = options.advanceByMultiplier && options.required === 'any' && step !== undefined && 'number' in step;
    const hit = guard((m) => step && onDart(hitDart(step, options, m)));
    const miss = guard(() => onDart(MISS));
    return (_jsxs("div", { className: "clock-input", children: [_jsx("div", { className: "clock-input-target", children: _jsx(ClockTarget, { steps: steps, progress: progress }) }), _jsxs("div", { className: `clock-input-buttons ${byZone ? 'by-zone' : ''}`, children: [byZone ? ([1, 2, 3].map((m) => (_jsxs("button", { className: "clock-hit", disabled: disabled, onClick: () => hit(m), children: ["\u2713 ", m === 1 ? 'Simple' : m === 2 ? 'Double' : 'Triple'] }, m)))) : (_jsx("button", { className: "clock-hit", disabled: disabled, onClick: () => hit(1), children: "\u2713 Touch\u00E9" })), _jsx("button", { className: "clock-miss", disabled: disabled, onClick: miss, children: "\u2717 Rat\u00E9" })] })] }));
}
