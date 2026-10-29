import type { GameMode } from '../../game-engine/types';
import { clockView } from './clockView';
import { cricketView } from './cricketView';
import { randomView } from './randomView';
import type { ModeView } from './types';
import { x01View } from './x01View';

export const MODE_VIEWS: Record<GameMode, ModeView> = {
  x01: x01View,
  cricket: cricketView,
  clock: clockView,
  random: randomView,
};
