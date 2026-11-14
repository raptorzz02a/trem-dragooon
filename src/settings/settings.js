export const DEFAULT_SETTINGS = {
    holdMs: 3000,
    transitionMs: 1500,
    animations: true,
    statThresholds: [60, 100, 140],
    histogramStep: 20,
};
const KEY = 'trem-dragooon.settings';
export function loadSettings() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    }
    catch {
        return DEFAULT_SETTINGS;
    }
}
export function saveSettings(settings) {
    try {
        localStorage.setItem(KEY, JSON.stringify(settings));
    }
    catch {
        // Réglages non conservés, valeurs par défaut au prochain démarrage.
    }
}
