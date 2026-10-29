export interface AppSettings {
  /** Durée de l'écran « joueur suivant », en millisecondes. */
  transitionMs: number;
  /** false : pas d'écran de transition ni d'animation. */
  animations: boolean;
  /** Seuils de volée suivis dans les statistiques (part des volées au moins égales à chaque seuil). */
  statThresholds: number[];
  /** Largeur des tranches de l'histogramme des volées, en points. */
  histogramStep: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  transitionMs: 1500,
  animations: true,
  statThresholds: [60, 100, 140],
  histogramStep: 20,
};

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
