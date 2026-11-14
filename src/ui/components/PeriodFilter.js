import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const ALL_TIME = { kind: 'all' };
const OPTIONS = [
    { value: 'all', label: 'Tout' },
    { value: '30', label: '30 jours' },
    { value: '90', label: '90 jours' },
    { value: '365', label: '1 an' },
    { value: 'custom', label: 'Dates…' },
];
const day = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Bornes ISO de la période (incluses), ou rien pour « Tout ». */
export function periodRange(p, now = new Date()) {
    if (p.kind === 'all')
        return {};
    if (p.kind === 'custom') {
        if (!p.from || !p.to)
            return {};
        return { from: new Date(`${p.from}T00:00:00`).toISOString(), to: new Date(`${p.to}T23:59:59.999`).toISOString() };
    }
    return { from: new Date(now.getTime() - Number(p.kind) * 86400000).toISOString(), to: now.toISOString() };
}
export function PeriodFilter({ value, onChange }) {
    const pick = (kind) => {
        if (kind !== 'custom')
            return onChange({ kind });
        const now = new Date();
        onChange({ kind, from: value.from ?? day(new Date(now.getTime() - 30 * 86400000)), to: value.to ?? day(now) });
    };
    return (_jsxs("div", { className: "period-filter", children: [_jsx("div", { className: "segmented", children: OPTIONS.map((o) => (_jsx("button", { className: value.kind === o.value ? 'selected' : '', onClick: () => pick(o.value), children: o.label }, o.value))) }), value.kind === 'custom' && (_jsxs("div", { className: "period-dates", children: [_jsxs("label", { children: ["du", _jsx("input", { type: "date", value: value.from, max: value.to, onChange: (e) => onChange({ ...value, from: e.target.value }) })] }), _jsxs("label", { children: ["au", _jsx("input", { type: "date", value: value.to, min: value.from, onChange: (e) => onChange({ ...value, to: e.target.value }) })] })] }))] }));
}
