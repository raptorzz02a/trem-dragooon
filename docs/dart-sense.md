# Saisie automatique par caméra (Dart Sense)

Avec une caméra devant la cible, Dart Sense repère chaque fléchette plantée et l'appli la saisit toute seule,
comme un appui sur le pavé. Les effets de l'ampoule, les sons et les stats suivent comme d'habitude.

| Ce que voit la caméra | Ce que fait l'appli |
| --- | --- |
| Une fléchette se plante | Elle est saisie pour le joueur dont c'est le tour (T20, D16, Bull 25/50…) |
| On retire les fléchettes | La volée est terminée : les fléchettes pas vues (tombées, hors cible) comptent comme ratées |
| Bust ou victoire en cours de volée | La volée s'arrête là : les fléchettes suivantes ne passent pas au joueur d'après |
| La cible n'est plus repérée (quelqu'un devant) | Rien n'est compté, pas de faux retrait |

Le pavé, **Annuler la fléchette** et **Fin de tour** restent disponibles pour corriger une erreur de lecture.
Si aucune fléchette n'est restée dans la cible, la caméra ne voit rien à retirer : terminer la volée à la main
(**Raté** ou **Fin de tour**).

Sur l'écran de jeu, le bouton **📷** montre l'état de la caméra :

- **📷 Caméra** (vert) : tout va bien ;
- **📷 Cible non repérée** (orange) : la caméra tourne mais ne voit pas la cible (cadrage, quelqu'un devant) ;
- **📷 Caméra éteinte** (rouge) : Dart Sense n'est pas lancé sur ce PC ;
- un appui passe en **📷 Saisie manuelle** (la caméra est ignorée pour cette partie), un autre la réactive.

Ça marche en « Même cible » comme en « En ligne » : chaque PC équipé d'une caméra saisit les fléchettes du
joueur qui lance chez lui, quand c'est son tour.

## Comment ça marche

`dart-sense/trem_sense.py` remplace l'interface de Dart Sense (`GUI.py`) : il lit la caméra, utilise le modèle
de Dart Sense (`weights.pt`) et sert les fléchettes sur `http://127.0.0.1:55445`, joignable seulement depuis ce
PC. L'appli, ouverte sur ce même PC, l'interroge en continu. Le serveur Cloudflare n'est pas concerné.

Une fléchette compte quand elle est vue au même endroit sur 3 des 5 dernières images (la règle de Dart Sense).
Le retrait : plus aucune fléchette sur 3 des 5 dernières images. Plus la caméra va vite (images/s affichées
dans la fenêtre), plus la saisie est rapide.

Avec chaque fléchette, `trem_sense.py` envoie aussi son point d'impact (`position`, en mm depuis le centre de la
cible, x vers la droite, y vers le bas). L'appli l'enregistre avec la fléchette et s'en sert pour la **heat map**
(fiche du joueur, onglet « Heat map », avec les mêmes filtres de jeu, de période et de saloon que les autres
onglets). Une fléchette tapée au pavé ou corrigée à la main n'a pas de position : elle compte dans les
statistiques mais n'apparaît pas sur la carte. Un `trem_sense.py` d'avant cette version marche toujours, sans
heat map. Recette : `node scripts/recette-heatmap.cjs` (avec `npm run online:dev`).

## Points de repère mémorisés

Pour placer la cible, le modèle repère 6 points sur le bord du double (vers le 20, le 3, le 11, le 6, le 9 et le
15, ronds verts dans la fenêtre). Une fléchette, une ailette ou un reflet en cache ou en décale souvent un, et
une fléchette comptée à ce moment-là gardait un mauvais score. La caméra étant fixe, `trem_sense.py` retient
pour chaque point la médiane de ses 15 dernières positions sûres (croix blanches dans la fenêtre) : un point
caché ou faux sur une image ne change plus rien. Si la plupart des points bougent d'un coup (caméra ou cible
déplacée), la mémoire repart de zéro.

## Une ou deux caméras

Par défaut (`--camera auto`), `trem_sense.py` essaie les webcams 0 à 5 au démarrage et garde celles qui voient
la cible : la webcam intégrée du PC, qui ne la voit pas, est écartée. La console affiche par exemple
`Webcam 1 : voit la cible` puis `2 camera(s) utilisee(s) : 1, 2`. On peut aussi les donner : `--camera 1,2`.

Avec deux caméras, par exemple une à gauche et une à droite de la cible :

- chaque caméra repère la cible et les fléchettes de son côté, ramenées sur le même plan de cible ;
- une fléchette vue par les deux est placée à la moyenne des deux positions (plus précis près des fils) ;
- une fléchette cachée pour l'une (ailettes d'une autre fléchette devant) reste vue par l'autre ;
- deux fléchettes serrées vues par la même caméra ne sont jamais confondues ;
- le retrait n'est compté que quand aucune caméra ne voit plus de fléchette.

Le PC analyse les deux images à chaque tour : les images/s affichées sont donc à peu près divisées par deux.
Placer chaque caméra à hauteur du centre de la cible, 20 à 40° sur le côté, la cible remplissant le carré central.
Avec `s`, une image par caméra est enregistrée (`…-cam1.png`, `…-cam2.png`).

## Installation (une fois)

1. **Mettre à jour la borne** dans PowerShell : `cd $HOME\trem-dragooon` puis `git pull`.
2. **Copier le script dans le dossier de Dart Sense** (celui où il y a `weights.pt` et `get_scores.py`) :

   ```powershell
   copy $HOME\trem-dragooon\dart-sense\trem_sense.py <dossier de Dart Sense>
   ```

3. **Essai** depuis le dossier de Dart Sense, environnement Python activé (`.venv\Scripts\activate`, ou le nom de ton environnement) :

   ```powershell
   python trem_sense.py
   ```

   `--camera` vaut `auto` par défaut (webcams qui voient la cible, voir plus haut). Il prend aussi le numéro
   d'une webcam (`1`), deux numéros (`1,2`), une adresse
   IP Webcam (`192.168.1.20:8080`) ou une adresse complète (`rtsp://…`). Une fenêtre montre ce que voit le
   modèle : points de calibration en vert, fléchettes en orange, et en rouge les fléchettes de la volée en
   cours. `q` dans la fenêtre pour quitter, `--sans-fenetre` pour s'en passer. Chaque fléchette s'écrit aussi
   dans la console. Si Windows demande d'autoriser Python sur le réseau : réseaux **privés**.
4. **Activer la caméra dans l'appli** : menu du compte, **Activer la caméra Dart Sense** (une seule fois sur ce
   PC). Ou ajouter `camera=1` au lien de lancement.
5. **Démarrage automatique** : dans `trem-dragooon.bat` (dossier `shell:startup`), ajouter la ligne de Dart
   Sense et `camera=1` au lien, par exemple avec l'ampoule :

   ```bat
   cd /d "%USERPROFILE%\trem-dragooon"
   start "Pont ampoule" /min node bridge\pont-yeelight.mjs
   start "Dart Sense" /min cmd /c "cd /d <dossier de Dart Sense> && .venv\Scripts\python trem_sense.py --camera 1"
   start "" msedge --app="https://trem-dragooon.julien-charrier01.workers.dev/?ampoule=1&camera=1" --start-fullscreen --no-first-run
   ```

6. **Première partie** : Edge peut demander d'autoriser l'accès aux appareils du réseau local. Répondre
   **Autoriser**, une seule fois.

## Dépannage

- **📷 Caméra éteinte** : la fenêtre « Dart Sense » n'est pas ouverte ou s'est arrêtée (message
  `Plus d image de la camera depuis 10 s` : câble, mode « PC Camera » de la Crosstour). La relancer : l'appli
  se reconnecte toute seule.
- **📷 Cible non repérée** en permanence : recadrer pour que la cible remplisse le carré central de l'image.
- Fléchette mal lue : **Annuler la fléchette** puis la saisir au pavé. La caméra ne la renvoie pas.
- Recette sans caméra : `python -m unittest test_trem_sense` dans `dart-sense\` (logique de volée et serveur),
  et `node scripts/recette-dart-sense.cjs` avec `npm run online:dev` lancé (appli de bout en bout, faux Dart Sense).
