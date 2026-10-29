# Règles appliquées par le moteur de jeu

Ce document décrit exactement ce que calcule le moteur (`src/game-engine`). Chaque règle est couverte par un test
automatisé ; l'identifiant du cahier des charges (A01, B03…) figure dans le nom du test.

## Règles communes

- Une volée compte au plus 3 fléchettes. Elle se termine après la 3e, sur un bust, sur une victoire, ou quand
  le joueur appuie sur « Fin de tour » (aucune fléchette fictive n'est ajoutée).
- Un « côté » porte le score : un joueur en individuel, une équipe en mode équipe.
- Ordre de passage : les côtés jouent chacun leur tour (A, B, C, A, B, C…). Dans une équipe, les membres se
  relaient à chaque manche. Exemple 2 + 2 + 3 joueurs : A1 B1 C1, A2 B2 C2, A1 B1 C3…
- De 1 à 10 joueurs. En équipe : de 2 à 5 équipes, au moins un joueur chacune, un joueur dans une seule équipe.
- Une partie terminée n'accepte plus de lancers.
- Annuler retire la dernière action, même si elle a fait passer au joueur suivant.
- Corriger une fléchette rejoue toute la partie : scores, vainqueur et statut sont recalculés. Une correction
  peut terminer la partie (les lancers suivants sont alors retirés) ou la rouvrir. Chaque correction est tracée.
- Abandon et annulation ne désignent aucun vainqueur.
- Revanche : mêmes règles et mêmes équipes, ordre de passage tiré au sort.

## 301 / 501 / 701

- Départ simple uniquement (pas de Double In).
- Sortie : Straight Out (toute fléchette qui fait exactement 0) ou Double Out (dernier impact sur un double,
  Bull 50 compris).
- Bust : passer sous 0, ou en Double Out rester à 1, ou atteindre 0 sans double. Le score revient à celui du début
  de la volée et les fléchettes restantes sont perdues.
- En équipe, le score est commun à l'équipe.
- La partie s'arrête dès qu'un côté atteint 0. Les autres sont classés par points restants.
- Option : limite de manches. À la limite, le plus petit reste gagne (ex aequo possibles).
- Suggestions de finition : la finition la plus courte possible avec les fléchettes restantes, doubles préférés
  D20 puis D16. Aucune suggestion au-dessus de 170 en Double Out.

## Cricket

- Numéros 20 à 15, plus le Bull (option). Simple = 1 marque, double = 2, triple = 3, Bull 25 = 1, Bull 50 = 2.
- 3 marques ferment un numéro. Les marques en trop rapportent la valeur du numéro tant qu'au moins un adversaire
  ne l'a pas fermé.
- Victoire : tout fermé et score au moins égal à chaque adversaire.
- Variante Cut-Throat : les points vont aux adversaires qui n'ont pas fermé ; victoire avec tout fermé et score
  au plus égal à chaque adversaire.
- Limite de 20 manches (réglable). À la limite : plus de points (moins en Cut-Throat), puis plus de marques.

## Horloge

- Parcours de 1 à 20 (options : 20 à 1, ou ordre du cadran 20, 1, 18, 4…). On peut avancer plusieurs fois dans
  la même volée.
- Zone exigée : toutes (défaut), double obligatoire, ou triple obligatoire.
- Option : le double fait avancer de 2 et le triple de 3 (seulement sans zone obligatoire).
- Bull final : aucun, un Bull (25 ou 50 ; 50 exigé en variante double ou triple), ou 25 puis 50.
- La progression d'une équipe est commune à ses membres.
- On termine la manche en cours, puis le côté qui a fini avec le moins de fléchettes gagne (ex aequo possibles).

## Chiffre aléatoire

- 10, 15 ou 20 tours (20 par défaut).
- À chaque tour, un numéro à viser est tiré au sort parmi 1 à 20 et le Bull, jamais le même deux tours de
  suite. Le tirage est fait au lancement de la partie, si bien que tous les joueurs visent le même numéro au
  même tour et qu'une correction rejoue la partie à l'identique.
- Seul le numéro tiré rapporte : simple, double ou triple de sa valeur (25 ou 50 pour le Bull).
- La cible est dessinée comme à l'Horloge, avec le numéro à viser en surbrillance.
- En équipe, le total est commun à l'équipe.
- Après la dernière manche, le plus haut score gagne (ex aequo possibles).
