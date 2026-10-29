# TREM-DRAGOOON · Procès-verbal de recette

Livrable 07 · version 0.1.0 (lots 1 à 4) · recette du 28 octobre 2026

## 1. Objet

Ce procès-verbal reprend les critères d'acceptation du cahier des charges (chapitre 11). Pour chacun, il
donne le résultat obtenu sur la version livrée.

La version recettée réunit les quatre premiers lots, qui sont fusionnés :

1. moteur de jeu ;
2. écran 301/501/701 ;
3. écrans Cricket, Horloge et Shanghai ;
4. profils, statistiques et classements.

Le lot 5 (kiosque, sauvegarde, code administrateur, sons) n'est pas encore livré. Les critères qui en
dépendent sont marqués **Non livré**.

## 2. Méthode

| Moyen | Contenu | Résultat |
| --- | --- | --- |
| Tests automatiques (`npm test`, Vitest) | Règles des modes, saisie, équipes, sessions, statistiques. Chaque test porte l'identifiant du critère. | **109 / 109 réussis** |
| Recette de l'interface (`scripts/recette-ui.cjs`, Chromium, écran tactile simulé) | Parcours complet au doigt : création de profils, partie 301, coupure réseau, fermeture du navigateur, redémarrage, Full HD, animations coupées | **24 / 24 critères conformes**, aucune erreur dans la console |
| Contrôle visuel | Captures en 1366 × 768 (écran cible) et 1920 × 1080 | Conforme |
| Calcul de contraste | Couleurs du thème sur le fond `#101713` | Voir H05 |

Environnement de recette : Chromium (moteur d'Edge) en 1366 × 768 et 1920 × 1080, application construite
(`npm run build`) et servie en local (`npm run preview`).

**Non fait à ce stade : une recette sur le PC cible réel**, c'est-à-dire l'écran tactile, Windows 11 et Edge
dans la salle (voir § 5).

Légende : ✅ Conforme · 🟡 Conforme avec réserve · ⛔ Non livré.

## 3. Résultats par critère

### A. Saisie et calcul des points

| Id | Critère | Résultat attendu | Vérifié par | État |
| --- | --- | --- | --- | --- |
| A01 | Saisir S20 | 20 points | Test auto + interface (reste 301 → 281) | ✅ |
| A02 | Saisir D20 | 40 points | Test auto + interface (281 → 241) | ✅ |
| A03 | Saisir T20 | 60 points | Test auto + interface | ✅ |
| A04 | Bull extérieur | 25 points | Test auto + interface (301 → 276) | ✅ |
| A05 | Bull intérieur | 50 points | Test auto + interface (276 → 226) | ✅ |
| A06 | Raté | 0 point, fléchette consommée | Test auto + interface | ✅ |
| A07 | Multiplicateur sans numéro | Aucun score modifié | Test auto + interface | ✅ |
| A08 | Annuler la dernière fléchette | Résultat supprimé, scores recalculés | Test auto + interface | ✅ |
| A09 | Terminer après deux fléchettes | Joueur suivant, sans fléchette fictive | Test auto | ✅ |
| A10 | Quatrième saisie | Impossible avant le tour suivant | Test auto + interface (saisie bloquée pendant l'annonce du joueur suivant) | ✅ |

### B. 301 / 501 / 701

| Id | Critère | Vérifié par | État |
| --- | --- | --- | --- |
| B01 | Chaque joueur commence au score choisi (301, 501, 701) | Test auto + interface | ✅ |
| B02 | T20 ×3 en Straight Out : reste 321 | Test auto | ✅ |
| B03 | Zéro sur un simple en Double Out : bust | Test auto | ✅ |
| B04 | Arriver à 1 en Double Out : bust | Test auto | ✅ |
| B05 | Dépasser zéro : bust | Test auto | ✅ |
| B06 | Finir sur un double : vainqueur désigné | Test auto + interface | ✅ |
| B07 | Finir sur Bull 50 quand il reste 50 | Test auto | ✅ |
| B08 | Double In | **Retiré du périmètre** à la demande du client (questionnaire validé). Le test vérifie que le premier simple décompte bien. | ✅ |
| B09 | Bust après trois fléchettes : retour au début du tour | Test auto | ✅ |
| B10 | Bust à la deuxième fléchette : la troisième est consommée | Test auto | ✅ |

### C. Cricket

| Id | Critère | Vérifié par | État |
| --- | --- | --- | --- |
| C01 | Trois simples ferment le 20 | Test auto | ✅ |
| C02 | Double = deux marques | Test auto | ✅ |
| C03 | Triple ferme le 19 | Test auto | ✅ |
| C04 | Marque en trop rapporte si l'adversaire n'a pas fermé | Test auto | ✅ |
| C05 | Rien sur un numéro fermé par tous | Test auto | ✅ |
| C06 | Tout fermé et score au moins égal : victoire | Test auto | ✅ |
| C07 | Tout fermé mais score inférieur : la partie continue | Test auto | ✅ |
| C08 | Sans Bull : le Bull n'est pas requis | Test auto | ✅ |

### D. Horloge

| Id | Critère | Vérifié par | État |
| --- | --- | --- | --- |
| D01 | Numéro de départ : 1 | Test auto | ✅ |
| D02 | Toucher le 1 fait passer au 2 | Test auto | ✅ |
| D03 | Autre numéro : pas de progression | Test auto | ✅ |
| D04 | Triple en mode standard : une seule progression | Test auto | ✅ |
| D05 | Double obligatoire, simple touché : pas de progression | Test auto | ✅ |
| D06 | Sans Bull final : fin au 20 | Test auto | ✅ |
| D07 | Bull final : fin seulement après le Bull | Test auto | ✅ |

### E. Shanghai

| Id | Critère | Vérifié par | État |
| --- | --- | --- | --- |
| E01 | Tour 1 : seul le 1 rapporte | Test auto | ✅ |
| E02 | Tour 10, T10 : 30 points | Test auto | ✅ |
| E03 | Autre numéro : aucun point | Test auto | ✅ |
| E04 | Classement final après le dernier tour | Test auto | ✅ |
| E05 | Simple, double et triple dans la même volée : victoire immédiate | Test auto | ✅ |
| E06 | Variante désactivée : points normaux | Test auto | ✅ |
| E07 | Équipe : total collectif | Test auto | ✅ |

### F. Joueurs, équipes et ordre de passage

| Id | Critère | Vérifié par | État |
| --- | --- | --- | --- |
| F01 | Partie à 1 joueur (entraînement) | Test auto | ✅ |
| F02 | Partie à 10 joueurs (11 refusés) | Test auto | ✅ |
| F03 | Équipes de tailles différentes | Test auto | ✅ |
| F04 | Joueur ajouté à une équipe : présent dans l'ordre de passage | Test auto | ✅ |
| F05 | Fin de tour : joueur suivant annoncé à l'écran | Test auto + interface | ✅ |
| F06 | Revanche : joueurs, règles et équipes conservés | Test auto + interface | 🟡 L'ordre de passage est retiré au sort à la revanche, comme demandé dans le questionnaire, et non conservé comme l'écrit le critère. |
| F07 | Modifier l'ordre avant le départ | Test auto + interface | ✅ |
| F08 | Victoire d'équipe enregistrée | Test auto (victoire comptée pour chaque membre) | ✅ |

### G. Données, sauvegarde et statistiques

| Id | Critère | Vérifié par | État |
| --- | --- | --- | --- |
| G01 | Fermer et rouvrir le navigateur pendant une partie : reprise | Test auto + interface (navigateur fermé en pleine volée puis rouvert : reprise exacte) | ✅ |
| G02 | Redémarrage : les données persistent | Interface (navigateur relancé sur le même profil : profils et statistiques présents) | 🟡 Vérifié au redémarrage du navigateur. Le redémarrage du PC cible reste à constater sur place. |
| G03 | Fin de partie : statistiques mises à jour une seule fois | Test auto + interface (annuler puis refinir une partie : une seule archive) | ✅ |
| G04 | Partie annulée : pas comptée comme défaite | Test auto + interface | ✅ |
| G05 | Exporter les données | Lot 5 | ⛔ |
| G06 | Restaurer une sauvegarde valide | Lot 5 | ⛔ |
| G07 | Fichier invalide : refus sans écraser les données | Lot 5 | ⛔ |
| G08 | Corriger une partie : statistiques recalculées sans doublon | Test auto (moteur et archive) | 🟡 La correction d'une fléchette ancienne existe dans le moteur et est testée. À l'écran, seule l'annulation des dernières fléchettes est proposée pour l'instant. L'écran de correction d'une volée passée est prévu au lot 5. |
| G09 | Classement par mode : pas de mélange entre modes | Test auto + interface | ✅ |
| G10 | Partie interrompue : ni victoire ni défaite | Test auto + interface | ✅ |

### H. Interface, kiosque et robustesse

| Id | Critère | Vérifié par | État |
| --- | --- | --- | --- |
| H01 | Démarrage du PC : accueil en plein écran | Lot 5 (procédure décrite dans la documentation technique, § 4) | ⛔ |
| H02 | Tactile uniquement | Interface : tout le parcours de recette est fait au doigt | 🟡 La saisie des surnoms passe par le clavier tactile de Windows, à confirmer sur le PC cible. |
| H03 | Double appui rapide : une seule action | Interface (double appui sur D20 : 1 fléchette) | ✅ |
| H04 | Résolution Full HD : interface complète, sans défilement | Interface en 1920 × 1080, plus l'écran cible 1366 × 768 | ✅ |
| H05 | Pièce sombre : scores lisibles | Contraste mesuré : texte 16,4:1, or (scores) 8,5:1, texte secondaire 8,4:1, texte sur boutons verts 7,8:1. Tout est au-dessus du niveau AAA (7:1). | 🟡 À confirmer sur l'écran réel, dans la salle. |
| H06 | Coupure Internet après chargement : comptage et stockage continuent | Interface (réseau coupé : partie jouée jusqu'à la victoire et archivée) | ✅ L'application est servie par le PC lui-même et n'a jamais besoin d'Internet. |
| H07 | Quitter : confirmation | Interface | ✅ |
| H08 | Inactivité : rien n'est réinitialisé | Interface (attente sans toucher : partie intacte). Aucune remise à zéro automatique n'existe. | ✅ |
| H09 | Animations désactivées : fonctionnement identique | Interface (pas d'écran de transition, le tour passe directement) | 🟡 Le réglage existe, mais l'écran de réglages arrive au lot 5. |
| H10 | Changer de mode : pas de contamination | Test auto + interface | ✅ |

### S. Avenant statistiques joueurs (v2)

Recette du 29/10/2026, sur 12 profils et 114 parties de test générées par le moteur, en 1366 × 768 et
1920 × 1080.

| Id | Critère de l'avenant | Vérifié par | État |
| --- | --- | --- | --- |
| S01 | 20 profils au maximum, profils et historique existants conservés | Interface (compteur 12/20, bouton désactivé à 20, aussi au lancement d'une partie). La base n'a pas changé de version : rien n'est migré ni effacé. | ✅ |
| S02 | Statistiques calculables à partir des données réelles | Test auto (`scores.test.ts`, 12 tests : moyenne, écart type, seuils, tranches, bust = 0, marques du Cricket, semaines, mois, périodes, clôture, records, classements, CSV) | ✅ |
| S03 | Aucun visuel ne suggère une précision non mesurée | Revue : pas de carte de chaleur, de précision par cible visée ni de taux de ratés. Les numéros les plus touchés et la réussite aux doubles viennent des fléchettes saisies, avec la mention « Ne dit rien de la cible visée ». | ✅ |
| S04 | Valeurs, unités et volumes cohérents | Interface : chaque moyenne affiche son unité (points ou marques) et le nombre de volées et de parties. « non disponible » remplace les valeurs non calculables. | ✅ |
| S05 | Fonctions initiales conservées | Les 109 tests d'origine passent toujours (121 au total) ; parcours de jeu inchangé. | ✅ |

## 4. Bilan

| État | Nombre |
| --- | --- |
| ✅ Conforme | 60 (dont B08, retiré du périmètre par le client) |
| 🟡 Conforme avec réserve | 6 (F06, G02, G08, H02, H05, H09) |
| ⛔ Non livré (lot 5) | 4 (G05, G06, G07, H01) |
| **Total** | **70 critères** |

### Conditions de validation finale (cahier des charges, chapitre 11)

| Condition | État |
| --- | --- |
| Tous les tests critiques du moteur passent | ✅ 109 / 109 |
| Aucun bug bloquant pour démarrer, jouer, terminer ou reprendre une partie | ✅ Aucun relevé |
| Résultats identiques pour les mêmes impacts et règles | ✅ Garanti par le moteur, qui rejoue les événements (tests C, D, E, G01, G08) |
| Données persistantes après fermeture et redémarrage | 🟡 Vérifié au redémarrage du navigateur, à constater au redémarrage du PC |
| Fonctionnement hors ligne démontré | ✅ H06 |
| Fonctions principales utilisables au tactile, sans clavier ni souris | 🟡 Oui, sauf la saisie des surnoms par le clavier tactile Windows |
| Règles de chaque mode documentées et testées | ✅ `docs/regles.md` et tests A à E |
| Statistiques cohérentes avec les résultats enregistrés | ✅ Recalculées à partir des archives (G03, G09) |
| Avenant statistiques joueurs v2 | ✅ 5 / 5 (S01 à S05) |

## 5. Anomalies et points restants

Aucune anomalie bloquante n'est ouverte : rien qui fausse les scores, la victoire, la sauvegarde ou l'ordre
de passage.

| N° | Point | Gravité | Prévu |
| --- | --- | --- | --- |
| R1 | Mode kiosque et démarrage automatique (H01) | Majeur, fonction non livrée | Lot 5 |
| R2 | Export et restauration des données (G05 à G07) | Majeur, fonction non livrée | Lot 5 |
| R3 | Code administrateur à 4 chiffres | Majeur, fonction non livrée | Lot 5 |
| R4 | Écran de correction d'une volée passée (G08 côté écran) | Mineur, l'annulation couvre les erreurs récentes | Lot 5 |
| R5 | Écran de réglages : durée de transition, animations (H09) | Mineur | Lot 5 |
| R6 | Sons (bust, victoire, triple) | Mineur | Lot 5 |
| R7 | Écran de veille qui fait défiler les classements | Mineur | Lot 5 |
| R8 | Application « installable » (icône sur le bureau, manifeste) | Mineur | Lot 5 |
| R9 | Recette sur le PC cible : tactile réel, lisibilité dans la salle, redémarrage du PC (G02, H02, H05) | À faire par le client | Après installation |

## 6. Validation

La version 0.1.0 est **conforme sur tout ce qu'elle livre**. Elle ne peut pas encore être acceptée comme
version 1.0, parce que les critères G05, G06, G07 et H01 dépendent du lot 5.

Recommandation : accepter les lots 1 à 4 avec les réserves R4 à R9, puis refaire la recette des critères
⛔ et 🟡 à la livraison du lot 5, sur le PC cible.

| | Nom | Date | Décision | Signature |
| --- | --- | --- | --- | --- |
| Client | | | ☐ Acceptée · ☐ Acceptée avec réserves · ☐ Refusée | |
| Développeur | Claude (Claude Code) | 28/10/2026 | Version 0.1.0 livrée, recette exécutée | |
