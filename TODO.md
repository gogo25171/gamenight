# 📋 TODO — GameNight

Idées de jeux à ajouter et améliorations en attente.
Les 5 jeux actuels : Mongolpuri · UNO · Quiz · Tic Tac Toe · Scribble.

---

## 🎮 Jeux à ajouter

Classés par effort d'implémentation. « Réutilise » = infra déjà en place dans le projet.

### 🟢 Faciles — réutilisent presque tout l'existant

| Jeu | Joueurs | Principe | Réutilise |
|-----|---------|----------|-----------|
| **Puissance 4** | 2+ | Grille 7×6, aligner 4 jetons. Support tournoi identique au morpion. | Toute la logique `tictactoe` (matchs, best-of, bracket) — c'est un copier-adapter |
| **Blanc / Undercover** | 4–12 | Tout le monde reçoit un mot sauf 1 (ou 2) qui en a un légèrement différent. Chacun donne un indice, puis on vote. | Cycle `killerdoctor` (rôles secrets, discussion, vote, élimination) |
| **Deux Vérités, Un Mensonge** | 3+ | Chacun soumet 3 affirmations, les autres devinent laquelle est fausse. | Soumission + vote + scoring du quiz |
| **Quiz Photo / Blind Test emoji** | 2+ | Variante du quiz : deviner un film/une chanson à partir d'emojis. | Moteur `quiz` complet, seule la banque de questions change (locale, pas d'internet) |
| **Pierre-Feuille-Ciseaux tournoi** | 2+ | Rounds simultanés, best-of. | Bracket `tictactoe` |
| **Morpion Ultimate (9×9)** | 2 | Morpion imbriqué : ton coup décide de la case où joue l'adversaire. | `tictactoe` (moteur + vue) |

### 🟡 Moyens — nouveau moteur mais patterns connus

| Jeu | Joueurs | Principe | Notes |
|-----|---------|----------|-------|
| **Le Fugitif / Wavelength** | 4+ | Un joueur décrit un curseur secret sur une échelle (ex. « froid ↔ chaud »), l'équipe devine la position. | Nouvelle UI slider, scoring par proximité |
| **Just One coopératif** | 3+ | Chacun écrit un indice ; les indices en double sont annulés ; un joueur devine. | Phase de soumission cachée + comparaison de textes |
| **Codenames** | 4+ | Grille de 25 mots, 2 espions donnent des indices à leur équipe. | Gestion d'équipes (nouveau dans le projet) + grille cliquable |
| **Ni Oui Ni Non / Time's Up** | 3+ | Faire deviner des mots en 3 manches (parler / mimer / un mot). | Timer + rotation façon Scribble |
| **Président / Trou du cul** | 3–7 | Jeu de cartes de défausse par combinaisons. | Réutilise le deck + main + tour de jeu d'UNO |
| **Bataille Navale** | 2 | Placement de flotte puis tirs alternés. | Phase de placement (nouvelle), puis tour par tour classique |
| **Puzzle mot (type Wordle) en versus** | 2+ | Tout le monde résout la même grille, le plus rapide gagne. | Liste de mots locale, clavier virtuel |
| **Dessine et Devine par équipes** | 6+ | Scribble en 2 équipes avec score collectif. | Extension de `scribble` + notion d'équipe |

### 🔴 Ambitieux — nouveau système de jeu complet

| Jeu | Joueurs | Principe | Ce qu'il faut construire |
|-----|---------|----------|--------------------------|
| **Loup-Garou complet** | 6–18 | Mongolpuri avec Voyante, Sorcière, Chasseur, Cupidon, Petite Fille… | Système de rôles extensible + ordre de réveil nocturne |
| **Poker (Texas Hold'em)** | 2–8 | Blinds, mises, pot, évaluation de mains. | Moteur de mises + évaluateur de mains à 5 cartes |
| **Cartes contre l'humanité (SFW)** | 3+ | Une carte noire, chacun joue une carte blanche, un juge tranche. | Deck de cartes texte + rotation du juge |
| **Jackbox-like : Quiplash** | 3+ | Deux joueurs répondent à une même question, les autres votent la meilleure réponse. | Appariement de prompts + rounds de vote |
| **Uno Flip / Uno extensions** | 2+ | Cartes Flip, +4 en chaîne, règles maison configurables. | Options de règles dans les settings d'UNO |
| **Skribbl multi-langue** | 3+ | Banque de mots FR/EN/ES sélectionnable en lobby. | Fichiers de mots + setting `language` |

### ⭐ Priorité suggérée

1. **Puissance 4** — le plus rapide à livrer, réutilise le bracket de tournoi.
2. **Blanc / Undercover** — très fun en soirée, la boucle Mongolpuri fait déjà 90 % du travail.
3. **Cartes contre l'humanité (SFW)** — fort effet de groupe, moteur simple.
4. **Quiz emoji local** — supprime la dépendance internet du Quiz.

---

## ✅ Checklist : ajouter un jeu

Points d'intégration réels dans le code (exemple avec `monjeu`).

**Serveur — [server.js](server.js)**
- [ ] `defaultSettings()` ([server.js:19](server.js#L19)) — ajouter `case 'monjeu'`
- [ ] `validateSettings()` ([server.js:30](server.js#L30)) — valider les réglages entrants
- [ ] `minPlayers()` ([server.js:68](server.js#L68)) — nombre minimum de joueurs
- [ ] `restartGame()` ([server.js:289](server.js#L289)) — ajouter `monjeu: startMonjeu` dans la map
- [ ] `handleAction()` ([server.js:297](server.js#L297)) — router vers `monjeuAction()`
- [ ] `sendReconnectState()` ([server.js:247](server.js#L247)) — état renvoyé après un refresh
- [ ] `onPlayerDisconnect()` ([server.js:344](server.js#L344)) — que se passe-t-il si un joueur part
- [ ] Nouvelle section `// ── MONJEU ──` : `startMonjeu`, `monjeuAction`, `monjeuPublic`, `endMonjeu`

**Client**
- [ ] `public/index.html` — carte `<div class="game-card" data-game="monjeu">` (~ligne 22)
- [ ] `public/index.html` — vue `<div id="view-monjeu" class="view">`
- [ ] `public/index.html` — onglet règles `data-game="monjeu"` + `<div id="rules-monjeu">`
- [ ] `public/index.html` — `<script src="js/monjeu.js"></script>`
- [ ] `public/js/monjeu.js` — module avec `onState()` et les émissions d'actions
- [ ] `public/js/app.js` — schéma de settings (~ligne 78) et listeners socket (~ligne 647)
- [ ] `public/js/app.js` — ajouter le nom dans `gameNames` ([app.js:533](public/js/app.js#L533))

**Finition**
- [ ] Tableau des jeux + section « How to Play » dans [README.md](README.md)
- [ ] Badge `games-N` du README à incrémenter
- [ ] Tester : reconnexion en pleine partie · départ d'un joueur · rejouer · spectateurs

---

## 🐛 Bugs / dette technique

- [ ] `gameNames` dans [app.js:533](public/js/app.js#L533) ne contient pas `quiz` → le lobby affiche « Lobby » au lieu de « Quiz ». Y ajouter aussi tout nouveau jeu.
- [ ] `killerdoctor` a un `nightTime` dans `defaultSettings` mais aucune option correspondante dans le schéma client d'[app.js](public/js/app.js#L78) — réglage non modifiable depuis le lobby.
- [ ] [server.js](server.js) fait 1367 lignes : découper en `games/tictactoe.js`, `games/uno.js`, etc. avant d'ajouter 3-4 jeux de plus.
- [ ] Le Quiz nécessite internet (opentdb.com) — prévoir une banque de questions locale en repli.
- [ ] Pas de `LICENSE` dans le repo alors que le README annonce MIT.

## 🔧 Améliorations générales

- [ ] Notion d'**équipes** réutilisable (nécessaire pour Codenames, Time's Up, Scribble par équipes)
- [ ] Classement persistant entre parties d'une même soirée (au-delà de `sessionStats`)
- [ ] Sons et musique d'ambiance (activables/désactivables)
- [ ] Mode « soirée » : enchaîner plusieurs jeux avec un score global
- [ ] Bouton « jeu aléatoire » sur l'écran d'accueil
- [ ] Kick d'un joueur par l'hôte depuis le lobby
