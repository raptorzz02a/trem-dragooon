import type { ModeRules } from '../rules';
import type { ExtraMode, HalveItOptions, HighScoreOptions, KillerOptions } from '../types';
import { halveItRules } from './halveit';
import { highScoreRules } from './highscore';
import { killerRules } from './killer';

// Règles des « Autres jeux » : un fichier par jeu, branché ici. Ajouter un jeu = un fichier de règles,
// une entrée ici, une fiche dans le catalogue (src/extra-games/catalog.ts) et une vue (src/ui/modes/extra).

export const EXTRA_RULES: Record<ExtraMode, ModeRules<any>> = {
  highscore: highScoreRules,
  halveit: halveItRules,
  killer: killerRules,
};

export const DEFAULT_EXTRA_OPTIONS = {
  highscore: { rounds: 10 } satisfies HighScoreOptions,
  halveit: { sequence: 'standard', targets: [] } satisfies HalveItOptions,
  killer: { lives: 3, numbers: [] } satisfies KillerOptions,
} as const;
