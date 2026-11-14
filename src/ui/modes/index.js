import { clockView } from './clockView';
import { cricketView } from './cricketView';
import { randomView } from './randomView';
import { trainingView } from './trainingView';
import { x01View } from './x01View';
import { EXTRA_VIEWS } from './extra';
export const MODE_VIEWS = {
    x01: x01View,
    cricket: cricketView,
    clock: clockView,
    random: randomView,
    training: trainingView,
    ...EXTRA_VIEWS,
};
