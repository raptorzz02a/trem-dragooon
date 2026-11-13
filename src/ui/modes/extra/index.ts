import type { ExtraMode } from '../../../game-engine/types';
import type { ModeView } from '../types';
import { halveitView } from './halveitView';
import { highscoreView } from './highscoreView';
import { killerView } from './killerView';

export const EXTRA_VIEWS: Record<ExtraMode, ModeView> = {
  highscore: highscoreView,
  halveit: halveitView,
  killer: killerView,
};
