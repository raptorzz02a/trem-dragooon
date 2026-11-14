import { halveItRules } from './halveit';
import { highScoreRules } from './highscore';
import { killerRules } from './killer';
import { baseballRules } from './baseball';
import { bobs27Rules } from './bobs27';
import { fivesRules } from './fives';
import { bigSixRules } from './bigsix';
import { golfRules } from './golf';
import { vingtEtUnRules } from './vingtetun';
import { bermudaRules } from './bermuda';
import { lowScoreRules } from './lowscore';
import { dtChallengeRules } from './dtchallenge';
import { nineLivesRules } from './ninelives';
import { killerDoublesRules } from './killerdoubles';
import { oneDartRules } from './onedart';
import { survieRules } from './survie';
import { contratRules } from './contrat';
import { pyramideRules } from './pyramide';
import { bombeRules } from './bombe';
import { coffresRules } from './coffres';
import { roiRules } from './roi';
// Règles des « Autres jeux » : un fichier par jeu, branché ici. Ajouter un jeu = un fichier de règles,
// une entrée ici, une fiche dans le catalogue (src/extra-games/catalog.ts) et une vue (src/ui/modes/extra).
export const EXTRA_RULES = {
    highscore: highScoreRules,
    halveit: halveItRules,
    killer: killerRules,
    baseball: baseballRules,
    bobs27: bobs27Rules,
    fives: fivesRules,
    bigsix: bigSixRules,
    golf: golfRules,
    vingtetun: vingtEtUnRules,
    bermuda: bermudaRules,
    lowscore: lowScoreRules,
    dtchallenge: dtChallengeRules,
    ninelives: nineLivesRules,
    killerdoubles: killerDoublesRules,
    onedart: oneDartRules,
    survie: survieRules,
    contrat: contratRules,
    pyramide: pyramideRules,
    bombe: bombeRules,
    coffres: coffresRules,
    roi: roiRules,
};
export const DEFAULT_EXTRA_OPTIONS = {
    highscore: { rounds: 10 },
    halveit: { sequence: 'standard', targets: [] },
    killer: { lives: 3, numbers: [] },
};
