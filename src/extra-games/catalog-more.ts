import { MAX_PLAYERS } from '../game-engine/engine';
import { baseballTotal, type BaseballState } from '../game-engine/extra/baseball';
import { drawBermudaTargets, type BermudaState } from '../game-engine/extra/bermuda';
import type { BigSixState } from '../game-engine/extra/bigsix';
import { drawBombe, type BombeState } from '../game-engine/extra/bombe';
import type { Bobs27State } from '../game-engine/extra/bobs27';
import { drawChests, type CoffresState } from '../game-engine/extra/coffres';
import { drawContractOffers, type ContratState } from '../game-engine/extra/contrat';
import { dtSuccess, type DtChallengeState } from '../game-engine/extra/dtchallenge';
import type { FivesState } from '../game-engine/extra/fives';
import { golfTotal, type GolfState } from '../game-engine/extra/golf';
import { drawKillerNumbers } from '../game-engine/extra/killer';
import type { KillerDoublesState } from '../game-engine/extra/killerdoubles';
import type { LowScoreState } from '../game-engine/extra/lowscore';
import type { NineLivesState } from '../game-engine/extra/ninelives';
import { drawOneDartTargets, type OneDartState } from '../game-engine/extra/onedart';
import type { PyramideState } from '../game-engine/extra/pyramide';
import { drawRoyalTargets, type RoiState } from '../game-engine/extra/roi';
import { drawSurvieTargets, type SurvieState } from '../game-engine/extra/survie';
import type { VingtEtUnState } from '../game-engine/extra/vingtetun';
import { NUMBERS, pick } from '../game-engine/extra/zones';
import type { GameState } from '../game-engine/types';
import type { ExtraGameDef, ExtraSetting, SettingValue } from './catalog';

const num = (v: SettingValue | undefined, fallback: number) => (typeof v === 'number' ? v : fallback);
const choices = (key: string, label: string, values: (number | [string | number, string])[], def: string | number): ExtraSetting => ({
  key,
  label,
  choices: values.map((v) => (Array.isArray(v) ? { value: v[0], label: v[1] } : { value: v, label: String(v) })),
  default: def,
});
const of =
  <S>(f: (s: S, side: number) => number | null) =>
  (s: GameState, side: number) =>
    f(s.mode as S, side);

export const MORE_GAMES: ExtraGameDef[] = [
  /* ---------- Classiques ---------- */
  {
    id: 'baseball',
    name: 'Baseball',
    sub: '9 manches, du 1 au 9',
    categories: ['classic', 'team'],
    icon: 'bat',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: true,
    bubble:
      'Tu joues 9 manches, comme au baseball. À chaque manche, tu dois viser le chiffre correspondant. Chaque touche rapporte des points. Le joueur qui a marqué le plus de points après 9 manches gagne.',
    rules: {
      goal: 'Marquer le plus de points en 9 manches',
      points: 'Sur le numéro de la manche : simple 1, double 2, triple 3',
      win: 'Le plus gros total ; en cas d’égalité, manche au Bull (25 = 1, 50 = 2)',
      warning: 'Seul le numéro de la manche compte',
    },
    settings: [
      choices(
        'tiebreak',
        'Égalité',
        [
          ['bull', 'Manche au Bull'],
          ['tie', 'Ex aequo'],
        ],
        'bull',
      ),
    ],
    options: (v) => ({ mode: 'baseball', options: { tiebreak: v.tiebreak !== 'tie' } }),
    score: { label: 'Meilleur score', better: 'high', of: of<BaseballState>((s, i) => baseballTotal(s, i)) },
  },
  {
    id: 'bobs27',
    name: "Bob's 27",
    sub: 'Les doubles un par un, depuis 27 points',
    categories: ['classic', 'precision'],
    icon: 't27',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: false,
    bubble:
      "Tu commences avec 27 points. À chaque tour, tu dois viser le double d'un chiffre précis. Si tu touches le double, tu gagnes ses points. Si tu rates, tu les perds. Si ton score tombe à zéro ou moins, tu es éliminé.",
    rules: {
      goal: 'Finir le parcours D1 à D20 (puis Bull) avec le plus de points',
      points: 'Chaque double touché rapporte sa valeur (D7 = 14)',
      win: 'Le meilleur score parmi ceux qui ne sont pas tombés à zéro',
      warning: 'Aucun double dans la volée : tu perds sa valeur. À zéro, tu es éliminé',
    },
    settings: [
      choices(
        'penalty',
        'Pénalité',
        [
          ['once', 'Une fois si aucun double'],
          ['each', 'À chaque fléchette ratée'],
        ],
        'once',
      ),
      choices(
        'bull',
        'Bull final',
        [
          ['yes', 'Oui'],
          ['no', 'Non'],
        ],
        'yes',
      ),
    ],
    options: (v) => ({ mode: 'bobs27', options: { penalty: v.penalty === 'each' ? 'each' : 'once', bull: v.bull !== 'no' } }),
    score: { label: 'Meilleur score', better: 'high', of: of<Bobs27State>((s, i) => (s.outOrder[i] ? null : s.scores[i]!)) },
  },
  {
    id: 'golf',
    name: 'Golf',
    sub: 'Le moins de coups possible',
    categories: ['classic', 'team'],
    icon: 'flag',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: true,
    bubble:
      'Tu dois terminer 18 trous en visant les chiffres de 1 à 18. Chaque fléchette qui touche le bon chiffre te donne un score. Le but est de finir avec le moins de points possible.',
    rules: {
      goal: 'Finir le parcours en le moins de coups',
      points: 'Sur le numéro du trou : triple 1 coup, double 2, simple 3, rien 4',
      win: 'Le plus petit total',
      warning: 'C’est ta dernière fléchette qui compte : appuie sur « Fin de tour » pour garder un bon coup',
    },
    settings: [choices('holes', 'Trous', [9, 18], 18)],
    options: (v) => ({ mode: 'golf', options: { holes: num(v.holes, 18) as 9 | 18 } }),
    score: { label: 'Meilleur parcours', better: 'low', of: of<GolfState>((s, i) => golfTotal(s, i)) },
  },
  {
    id: 'bermuda',
    name: 'Bermuda',
    sub: 'Une zone tirée au sort à chaque manche',
    categories: ['classic', 'team'],
    icon: 'tri',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: true,
    bubble:
      'À chaque manche, la borne tire une zone de la cible : un double, un triple, un simple haut ou bas, le Bull 25 ou le Bull 50. Touche-la pour marquer sa valeur. Si tu la rates complètement, tu perds sa valeur simple. Le premier à l’objectif gagne.',
    rules: {
      goal: 'Atteindre l’objectif de points le premier',
      points: 'Une touche sur la zone rapporte la valeur de la fléchette (T14 = 42)',
      win: 'Le premier qui atteint l’objectif (on finit la manche) ; le plus haut score gagne',
      warning: 'Volée sans touche : tu perds la valeur simple de la cible (14 pour le T14)',
    },
    settings: [choices('goal', 'Objectif', [200, 400, 600], 200)],
    options: (v, _n, rng) => ({ mode: 'bermuda', options: { goal: num(v.goal, 200), targets: drawBermudaTargets(rng) } }),
    score: { label: 'Meilleur score', better: 'high', of: of<BermudaState>((s, i) => s.scores[i]!) },
  },
  /* ---------- Rapides ---------- */
  {
    id: 'fives',
    name: 'Fives',
    sub: 'Des volées divisibles par 5',
    categories: ['quick', 'team'],
    icon: 't5',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: true,
    bubble:
      'Tu as trois fléchettes par tour. Additionne tes points : si ton total est divisible par 5, tu marques le résultat de cette division. Le premier à atteindre 51 points gagne.',
    rules: {
      goal: 'Arriver pile sur l’objectif',
      points: 'Volée divisible par 5 : total ÷ 5 (45 → +9). Sinon 0',
      win: 'Le premier pile sur l’objectif (on finit la manche)',
      warning: 'Dépasser l’objectif annule la volée',
    },
    settings: [choices('goal', 'Objectif', [31, 51, 71], 51)],
    options: (v) => ({ mode: 'fives', options: { goal: num(v.goal, 51) } }),
    score: { label: 'Volées marquantes', better: 'high', of: of<FivesState>((s, i) => s.scoring[i]!) },
  },
  {
    id: 'vingtetun',
    name: '21',
    sub: 'Exactement 21, pas un de plus',
    categories: ['quick'],
    icon: 't21',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: false,
    bubble:
      'Le but est de marquer exactement 21 points. Tu peux utiliser les simples, doubles, triples et le Bull. Attention : si tu dépasses 21, ton tour ne rapporte rien.',
    rules: {
      goal: 'Faire exactement 21',
      points: 'Chaque fléchette s’ajoute à ton score',
      win: 'Le premier à 21 pile (on finit la manche)',
      warning: 'Au-delà de 21, la volée est annulée',
    },
    settings: [
      choices(
        'limit',
        'Limite',
        [
          [0, 'Aucune'],
          [10, '10 manches'],
          [20, '20 manches'],
        ],
        0,
      ),
    ],
    options: (v) => ({ mode: 'vingtetun', options: { limit: num(v.limit, 0) } }),
    score: { label: 'Dépassements', better: 'low', of: of<VingtEtUnState>((s, i) => s.busts[i]!) },
  },
  {
    id: 'lowscore',
    name: 'Low Score',
    sub: 'Le plus petit total gagne',
    categories: ['quick'],
    icon: 'down',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: false,
    bubble:
      'Le but est de marquer le moins de points possible. Tu dois éviter les grosses zones et viser les petits scores. Attention : une fléchette hors cible coûte 50 points !',
    rules: {
      goal: 'Marquer le moins de points',
      points: 'Chaque fléchette s’ajoute à ton total',
      win: 'Le plus petit total à la fin des manches',
      warning: 'Fléchette hors cible : +50',
    },
    settings: [choices('rounds', 'Manches', [5, 10], 10)],
    options: (v) => ({ mode: 'lowscore', options: { rounds: num(v.rounds, 10) } }),
    score: { label: 'Plus petit total', better: 'low', of: of<LowScoreState>((s, i) => s.scores[i]!) },
  },
  {
    id: 'ninelives',
    name: 'Nine Lives',
    sub: 'Du 1 au 20 avec 9 vies',
    categories: ['quick'],
    icon: 'heart',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: false,
    bubble:
      "Tu as neuf vies pour toucher les chiffres de 1 à 20 dans l'ordre. Si tu rates les trois fléchettes de ton tour, tu perds une vie. Le dernier joueur encore en vie gagne.",
    rules: {
      goal: 'Toucher les numéros de 1 à 20 dans l’ordre',
      points: 'Chaque touche sur le bon numéro fait avancer d’un cran',
      win: 'Le premier au 20 (on finit la manche), sinon le dernier en vie',
      warning: 'Volée sans touche : une vie en moins',
    },
    settings: [choices('lives', 'Vies', [5, 9], 9)],
    options: (v) => ({ mode: 'ninelives', options: { lives: num(v.lives, 9) } }),
    score: { label: 'Numéro atteint', better: 'high', of: of<NineLivesState>((s, i) => s.progress[i]!) },
  },
  /* ---------- Précision ---------- */
  {
    id: 'bigsix',
    name: 'Big Six',
    sub: 'Touche la cible imposée ou perds une vie',
    categories: ['precision'],
    icon: 't6',
    minPlayers: 2,
    maxPlayers: MAX_PLAYERS,
    teams: false,
    bubble:
      'On commence sur le simple 6. Si tu touches la cible, ta fléchette suivante choisit la cible des autres. Si tu ne la touches pas pendant ton tour, tu perds une vie. Le dernier survivant gagne.',
    rules: {
      goal: 'Être le dernier survivant',
      points: 'Touche la cible imposée, puis ta fléchette suivante impose la nouvelle cible',
      win: 'Le dernier joueur encore en vie',
      warning: 'Pas de touche sur la cible pendant ta volée : une vie en moins',
    },
    settings: [
      choices('lives', 'Vies', [3, 5], 3),
      choices(
        'start',
        'Départ',
        [
          ['six', 'Simple 6'],
          ['random', 'Au hasard'],
        ],
        'six',
      ),
    ],
    options: (v, _n, rng) => ({
      mode: 'bigsix',
      options: {
        lives: num(v.lives, 3),
        start:
          v.start === 'random' ? { segment: pick(NUMBERS, rng), ring: pick(['S', 'D', 'T'] as const, rng) } : { segment: 6, ring: 'S' },
      },
    }),
    score: { label: 'Cibles réussies', better: 'high', of: of<BigSixState>((s, i) => s.made[i]!) },
  },
  {
    id: 'dtchallenge',
    name: 'Défi doubles et triples',
    sub: 'Du 1 au 20, 3 fléchettes par numéro',
    categories: ['precision'],
    icon: 'tD',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: false,
    bubble:
      'Tu vises les doubles (ou les triples) de 1 à 20 dans l’ordre, avec 3 fléchettes par numéro. Dès que tu touches, tu passes au suivant. Celui qui en réussit le plus gagne.',
    rules: {
      goal: 'Réussir le plus de doubles (ou de triples) de 1 à 20',
      points: 'Un numéro réussi = 1 point ; une touche suffit et passe au suivant',
      win: 'Le plus de numéros réussis après le 20',
      warning: 'Seule la bonne zone compte : un simple ne vaut rien',
    },
    settings: [
      choices(
        'kind',
        'Défi',
        [
          ['D', 'Doubles'],
          ['T', 'Triples'],
        ],
        'D',
      ),
    ],
    options: (v) => ({ mode: 'dtchallenge', options: { kind: v.kind === 'T' ? 'T' : 'D' } }),
    score: { label: 'Numéros réussis', better: 'high', of: of<DtChallengeState>((s, i) => dtSuccess(s, i)) },
  },
  {
    id: 'killerdoubles',
    name: 'Killer Doubles',
    sub: 'Défends ton double, vise ceux des autres',
    categories: ['classic', 'precision'],
    icon: 'shield',
    minPlayers: 2,
    maxPlayers: MAX_PLAYERS,
    teams: false,
    bubble:
      'Chaque joueur possède un double à défendre. Touche ton propre double pour gagner des vies, puis les doubles des autres pour leur en retirer. Le dernier survivant gagne.',
    rules: {
      goal: 'Être le dernier survivant',
      points: 'Ton double : +1 vie (5 au maximum). Le double d’un autre : −1 vie pour lui',
      win: 'Le dernier joueur encore en vie',
      warning: 'Seuls les doubles comptent',
    },
    settings: [],
    options: (_v, n, rng) => ({ mode: 'killerdoubles', options: { numbers: drawKillerNumbers(n, rng) } }),
    score: { label: 'Vies retirées', better: 'high', of: of<KillerDoublesState>((s, i) => s.taken[i]!) },
  },
  {
    id: 'onedart',
    name: 'One Dart',
    sub: 'Une seule fléchette par tour',
    categories: ['precision'],
    icon: 't1',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: false,
    bubble:
      "À chaque tour, tu n'as droit qu'à une seule fléchette. La borne annonce une cible et tu dois la toucher. Plus la cible est dure, plus elle rapporte.",
    rules: {
      goal: 'Marquer le plus de points en une fléchette par tour',
      points: 'Simple 1, double 2, triple 3, Bull 25 : 2, Bull 50 : 4',
      win: 'Le meilleur score à la fin des tours',
      warning: 'Une seule fléchette : le tour s’arrête tout seul',
    },
    settings: [choices('rounds', 'Tours', [10, 20, 30], 20)],
    options: (v, _n, rng) => {
      const rounds = num(v.rounds, 20);
      return { mode: 'onedart', options: { rounds, targets: drawOneDartTargets(rounds, rng) } };
    },
    score: { label: 'Meilleur score', better: 'high', of: of<OneDartState>((s, i) => s.scores[i]!) },
  },
  {
    id: 'survie',
    name: 'Survie',
    sub: 'De plus en plus dur, tiens le plus longtemps',
    categories: ['precision'],
    icon: 'shield',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: false,
    bubble:
      'La borne te donne une cible à chaque manche. Tu dois la toucher pour rester dans la partie. Plus tu avances, plus les cibles sont dures : numéros, doubles, triples, puis le Bull. Le dernier encore en jeu gagne.',
    rules: {
      goal: 'Tenir le plus de manches',
      points: 'Une touche sur la cible de la manche suffit ; les paliers montent régulièrement',
      win: 'Le dernier joueur encore en vie (en solo : le nombre de manches tenues)',
      warning: 'Volée sans touche : une vie en moins',
    },
    settings: [
      choices('lives', 'Vies', [1, 3], 3),
      choices(
        'step',
        'Palier',
        [
          [5, 'Toutes les 5 manches'],
          [3, 'Toutes les 3'],
        ],
        5,
      ),
    ],
    options: (v, _n, rng) => {
      const step = num(v.step, 5);
      return { mode: 'survie', options: { lives: num(v.lives, 3), step, targets: drawSurvieTargets(step, rng) } };
    },
    score: { label: 'Manches tenues', better: 'high', of: of<SurvieState>((s, i) => s.held[i]!) },
  },
  /* ---------- Défis TREM-DRAGOOON ---------- */
  {
    id: 'contrat',
    name: 'Le Contrat',
    sub: 'Remplis un des 3 contrats proposés',
    categories: ['house', 'team'],
    icon: 'doc',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: true,
    bubble:
      'À chaque manche, trois contrats sont proposés : un double, un triple, un score précis… Lance tes fléchettes : si tu remplis un contrat, tu gagnes sa prime (le plus payant compte). Sinon, tu ne marques rien.',
    rules: {
      goal: 'Gagner le plus de primes',
      points: 'Seule la prime compte : la meilleure des contrats remplis par ta volée',
      win: 'Le meilleur score à la fin des manches',
      warning: 'À partir de la 6e manche, les contrats sont plus durs (et paient plus)',
    },
    settings: [
      choices('rounds', 'Manches', [8, 10], 10),
      choices(
        'level',
        'Difficulté',
        [
          ['progressive', 'Progressive'],
          ['fixed', 'Fixe'],
        ],
        'progressive',
      ),
    ],
    options: (v, _n, rng) => {
      const rounds = num(v.rounds, 10);
      return { mode: 'contrat', options: { rounds, offers: drawContractOffers(rounds, v.level !== 'fixed', rng) } };
    },
    score: { label: 'Meilleur score', better: 'high', of: of<ContratState>((s, i) => s.scores[i]!) },
  },
  {
    id: 'pyramide',
    name: 'La Pyramide',
    sub: 'Simple ou Spicy, monte jusqu’au sommet',
    categories: ['house'],
    icon: 'pyramid',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: false,
    bubble:
      'Tu dois construire une pyramide en validant des chiffres. Chaque étage est plus difficile que le précédent. Le premier à atteindre le sommet gagne.',
    rules: {
      goal: 'Atteindre le sommet le premier',
      points:
        'Simple : 1-2, 3 à 5, 6 à 9, 10 à 14, 15 à 20, Bull. Spicy : 1 à 5, un double ou triple, double ou triple 15-20, triple 15-20, Bull',
      win: 'Le premier au sommet (on finit la manche ; moins de fléchettes départage)',
      warning: 'Un étage « 1 à 5 » demande de toucher chacun de ses numéros, dans n’importe quel ordre',
    },
    settings: [
      choices(
        'variant',
        'Pyramide',
        [
          ['simple', 'Simple'],
          ['spicy', 'Spicy'],
        ],
        'simple',
      ),
    ],
    options: (v) => ({ mode: 'pyramide', options: { variant: v.variant === 'spicy' ? 'spicy' : 'simple' } }),
    score: {
      label: 'Fléchettes pour le sommet',
      better: 'low',
      of: of<PyramideState>((s, i) => (s.floor[i]! >= s.floors.length ? s.darts[i]! : null)),
    },
  },
  {
    id: 'bombe',
    name: 'La Bombe',
    sub: 'Ne la laisse pas exploser chez toi',
    categories: ['house'],
    icon: 'bomb',
    minPlayers: 2,
    maxPlayers: MAX_PLAYERS,
    teams: false,
    bubble:
      'Une bombe passe de joueur en joueur. Chaque fléchette sur le bon numéro rallonge la mèche, chaque raté la raccourcit. Si elle explose pendant ton tour, tu perds une vie. Le dernier survivant gagne.',
    rules: {
      goal: 'Être le dernier survivant',
      points: 'Numéro du tour touché : mèche +1. Raté : mèche −2',
      win: 'Le dernier joueur encore en vie',
      warning: 'La mèche se compte en fléchettes, pas en secondes : personne n’est pressé',
    },
    settings: [choices('lives', 'Vies', [1, 3], 3)],
    options: (v, _n, rng) => ({ mode: 'bombe', options: { lives: num(v.lives, 3), ...drawBombe(rng) } }),
    score: { label: 'Explosions subies', better: 'low', of: of<BombeState>((s, i) => s.explosions[i]!) },
  },
  {
    id: 'coffres',
    name: 'Les Coffres',
    sub: '6 bonus cachés sur la cible',
    categories: ['house', 'team'],
    icon: 'chest',
    minPlayers: 1,
    maxPlayers: MAX_PLAYERS,
    teams: true,
    bubble:
      'Six coffres sont cachés sur des zones de la cible, avec 60, 50, 40, 30, 20 et 10 points dedans. Chaque fléchette rapporte ses points, et le premier qui touche la zone d’un coffre l’ouvre et gagne son bonus.',
    rules: {
      goal: 'Marquer le plus de points',
      points: 'Chaque fléchette rapporte sa valeur, plus le bonus du coffre si elle en ouvre un',
      win: 'Le meilleur score à la fin des manches',
      warning: 'Un coffre ouvert ne rapporte plus rien à personne',
    },
    settings: [choices('rounds', 'Manches', [5, 10, 15], 10)],
    options: (v, _n, rng) => ({ mode: 'coffres', options: { rounds: num(v.rounds, 10), chests: drawChests(rng) } }),
    score: { label: 'Meilleur score', better: 'high', of: of<CoffresState>((s, i) => s.scores[i]!) },
  },
  {
    id: 'roi',
    name: 'Le Roi de la Cible',
    sub: 'Prends la couronne et garde-la',
    categories: ['house'],
    icon: 'crown',
    minPlayers: 2,
    maxPlayers: MAX_PLAYERS,
    teams: false,
    bubble:
      'Une cible royale est désignée. Touche-la pour devenir le roi. Les autres peuvent te détrôner en la touchant à leur tour. À chaque fin de manche, le roi marque un point de couronne.',
    rules: {
      goal: 'Garder la couronne le plus longtemps',
      points: 'Le roi marque 1 point à chaque fin de manche, 2 à partir de 3 manches de suite',
      win: 'Le plus de points de couronne à la fin',
      warning: 'La cible royale change toutes les 3 manches',
    },
    settings: [
      choices('rounds', 'Manches', [10, 15], 10),
      choices(
        'change',
        'Cible royale',
        [
          ['every3', 'Change toutes les 3 manches'],
          ['fixed', 'Fixe'],
        ],
        'every3',
      ),
    ],
    options: (v, _n, rng) => {
      const rounds = num(v.rounds, 10);
      return { mode: 'roi', options: { rounds, targets: drawRoyalTargets(rounds, v.change !== 'fixed', rng) } };
    },
    score: { label: 'Points de couronne', better: 'high', of: of<RoiState>((s, i) => s.crowns[i]!) },
  },
];
