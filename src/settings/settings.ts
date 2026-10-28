export interface AppSettings {
  /** Durée de l'écran « joueur suivant », en millisecondes. */
  transitionMs: number;
  /** false : pas d'écran de transition ni d'animation. */
  animations: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = { transitionMs: 1500, animations: true };

const KEY = 'trem-dragooon.settings';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Réglages non conservés, valeurs par défaut au prochain démarrage.
  }
}
