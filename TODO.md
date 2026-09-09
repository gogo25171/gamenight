# 📋 TODO — GameNight

Idées de jeux à ajouter et améliorations en attente.
Les 8 jeux actuels : Mongolpuri · UNO · Quiz · Morpion · Scribble ·
Puissance 4 🅱️ · Undercover 🅱️ · Pierre-Feuille-Ciseaux 🅱️.

> 🅱️ = **bêta**. Le jeu est jouable de bout en bout mais son équilibrage et ses
> réglages bougent encore ; un badge `BETA` s'affiche sur la carte d'accueil,
> dans le lobby et dans l'en-tête du jeu.

---

## 🗺 Priorités de développement

Ce fichier a grossi : une quinzaine de chantiers, du réglage d'une heure à la
plateforme de mini-jeux. Cette section est la porte d'entrée — **quoi faire
ensuite, et pourquoi celui-là plutôt qu'un autre**. Le détail reste dans chaque
section, rien n'est déplacé.

Le classement suit deux questions, dans cet ordre :

1. **Est-ce que ça protège ce qui existe déjà ?** Un jeu de plus sur des
   fondations qui cassent, c'est un jeu de plus à réparer.
2. **Est-ce que ça se voit un soir de partie ?** Ce projet sert à jouer entre
   amis, pas à collectionner des lignes de code.

### 🔴 P0 — à faire avant d'ajouter quoi que ce soit

Le socle. Tant que ce n'est pas fait, chaque nouveauté augmente la dette.

| Chantier | Pourquoi maintenant | Effort |
|----------|---------------------|--------|
| [Sortir les 3 jeux de bêta](#-sortir-les-3-jeux-de-bêta) — soirées de test, équilibrage, retrait du badge | Trois jeux livrés mais jamais joués pour de vrai. Le câblage est vérifié et documenté (audit ci-dessous) ; il reste **les soirées de test** | 2-3 soirées |
| [Découper `server.js`](#-bugs--dette-technique) en `games/<id>.js` | 1 900 lignes. Ce n'est plus un blocage pour les tests, mais ça le redevient pour la relecture dès le prochain jeu | 1 jour |
| ~~[Réglage `nightTime` absent du lobby](#-bugs--dette-technique)~~ | ✅ **fait** — le champ est dans `SETTINGS_SCHEMA`, et un test vérifie désormais que *chaque* défaut serveur a un contrôle dans le lobby | ~~10 min~~ |
| [Anti-triche / anti-bot](#-anti-triche-anti-bot-anti-abus) — au minimum le jeton de reconnexion | Un salon en cours se reprend **avec le seul pseudo** : n'importe qui dans le salon peut voler la session d'un autre et son rôle secret. C'est le trou le plus large du projet | 1 jour |

### 🟠 P1 — le prochain vrai morceau

Un seul à la fois. Mon ordre :

| # | Chantier | Pourquoi | Effort |
|---|----------|----------|--------|
| 1 | [Bots](#-bots--compléter-une-table-ou-jouer-tout-seul) — infrastructure + morpion + Puissance 4 | Débloque deux usages que rien ne couvre : la table incomplète et le joueur seul. Et son évaluateur **sert deux fois** : le coach de la section suivante en dépend | 2-3 jours |
| 2 | [Apprentissage des techniques](#-apprendre-les-techniques-de-chaque-jeu) — onglet « Techniques » | La partie HTML + i18n est indépendante des bots et peut se faire en parallèle. L'analyse d'après-partie, elle, attend l'évaluateur | 1 jour pour l'onglet |
| 3 | [Bataille Navale](#-bataille-navale--plan-dimplémentation) | Le seul jeu de la liste qui apporte une mécanique neuve (la phase de placement) plutôt qu'une variante | 2 jours |
| 4 | [Banque de questions locale pour le Quiz](#-bugs--dette-technique) | Supprime la **seule** dépendance internet du projet. Un LAN sans wifi, et le Quiz meurt | 0,5 jour |

### 🟡 P2 — confort, à prendre quand l'envie vient

| Chantier | Ce que ça apporte |
|----------|-------------------|
| [Tests plus fins](#-tests--arrêter-de-découvrir-les-régressions-en-soirée) | Mongolpuri de bout en bout, UNO au niveau du tour, scoring. La base est là ; ceci est du raffinement |
| [Variantes de jeux](#-variantes-de-jeux--à-réfléchir) | Beaucoup de plaisir pour peu de code — souvent un seul réglage |
| [Numéro de version par jeu](#-numéro-de-version-par-jeu) | Devient utile le jour où les retours des joueurs arrivent |
| [Retours des joueurs](#-espace-de-commentaires--retours-des-joueurs) | Les formulaires GitHub sont en place et mis en avant ; le formulaire **dans l'app** reste à faire, et il ne vaut que s'il y a des joueurs autres que soi |
| [Configuration `.env`](#-configuration-par-fichier-env) | Confort d'hébergement, invisible pour les joueurs |
| [Documentation : captures et diagrammes](#-faire-évoluer-la-documentation) | Le manque le plus visible pour un nouvel arrivant |
| [Plus de langues](#-traduction--i18n--par-joueur) | EN et FR couvrent déjà la table |

### 🔵 P3 — pas maintenant

| Chantier | Pourquoi attendre |
|----------|-------------------|
| [Plateforme de mini-jeux, marketplace](#-plateforme--mini-jeux-installables-marketplace-gros-jeux) | Exécuter du code tiers demande un bac à sable. C'est un projet en soi, et le problème de sécurité est à régler **avant** la première installation distante |
| [Le Juste Prix](#-intégrer-le-juste-prix-) | L'option retenue est de juxtaposer, pas de fusionner. Une demi-heure de `docker-compose`, le jour où on en a envie |
| Jeux « ambitieux » (Loup-Garou complet, Poker, Quiplash) | Chacun est un moteur entier. À rouvrir quand le socle P0 est propre |

### ⏱️ Si tu n'as qu'une heure

Dans l'ordre, chaque ligne se termine en une session :

1. ~~Corriger `nightTime` (absent du schéma de lobby)~~ — ✅ fait, avec le test qui l'aurait attrapé.
2. ~~Supprimer `test-tournament.js`~~ — ✅ fait ; il gardait sa propre copie des fonctions de bracket, [test/tournament.test.js](test/tournament.test.js) teste les vraies.
3. ~~Ajouter « écrire les tests du jeu » à la [checklist d'ajout d'un jeu](#-checklist--ajouter-un-jeu)~~ — ✅ fait, ici et dans [adding-a-game.md](docs/development/adding-a-game.md).
4. Une variante « morpion misère » — un réglage, une condition inversée, un test.
5. Borner `gs.drawingData` de Scribble — un client bricolé peut faire grossir le tableau sans limite ([anti-abus](#-anti-triche-anti-bot-anti-abus)).

---

## 🎮 Jeux à ajouter

Classés par effort d'implémentation. « Réutilise » = infra déjà en place dans le projet.

> **Déjà couvert :** Scribble est l'équivalent de [skribbl.io](https://skribbl.io) (dessin partagé,
> devinettes dans le chat, score à la vitesse). Les pistes ci-dessous concernent des variantes
> (équipes, multi-langue) ou des jeux de dessin d'un genre différent, comme **Gartic Phone**.

### 🟢 Faciles — réutilisent presque tout l'existant

| Jeu | Joueurs | Principe | Réutilise |
|-----|---------|----------|-----------|
| **Deux Vérités, Un Mensonge** | 3+ | Chacun soumet 3 affirmations, les autres devinent laquelle est fausse. | Soumission + vote + scoring du quiz |
| **Quiz Photo / Blind Test emoji** | 2+ | Variante du quiz : deviner un film/une chanson à partir d'emojis. | Moteur `quiz` complet, seule la banque de questions change (locale, pas d'internet) |
| **Morpion Ultimate (9×9)** | 2 | Morpion imbriqué : ton coup décide de la case où joue l'adversaire. | `tictactoe` (moteur + vue) — voir aussi « Variantes de jeux » plus bas |

> ✅ **Livrés (en bêta) :** Puissance 4, Blanc / Undercover et Pierre-Feuille-Ciseaux
> tournoi sont désormais dans le jeu. Le morpion a gagné un réglage **taille de
> grille** (3×3 / 4×4 / 5×5). Reste à les sortir de bêta : équilibrage, tests de
> reconnexion, retours de soirée.

### 🟡 Moyens — nouveau moteur mais patterns connus

| Jeu | Joueurs | Principe | Notes |
|-----|---------|----------|-------|
| **Le Fugitif / Wavelength** | 4+ | Un joueur décrit un curseur secret sur une échelle (ex. « froid ↔ chaud »), l'équipe devine la position. | Nouvelle UI slider, scoring par proximité |
| **Just One coopératif** | 3+ | Chacun écrit un indice ; les indices en double sont annulés ; un joueur devine. | Phase de soumission cachée + comparaison de textes |
| **Codenames** | 4+ | Grille de 25 mots, 2 espions donnent des indices à leur équipe. | Gestion d'équipes (nouveau dans le projet) + grille cliquable |
| **Ni Oui Ni Non / Time's Up** | 3+ | Faire deviner des mots en 3 manches (parler / mimer / un mot). | Timer + rotation façon Scribble |
| **Gartic Phone** | 4–15 | Téléphone arabe en dessins : chacun écrit une phrase, le voisin la dessine, le suivant décrit le dessin, etc. Tout le monde joue en simultané. À la fin, on déroule chaque « album » devant le groupe. | Canevas + outils de dessin de `scribble` réutilisables tels quels. Le nouveau : chaînes parallèles (1 album par joueur), rotation à chaque tour, et l'écran de restitution finale |
| **Président / Trou du cul** | 3–7 | Jeu de cartes de défausse par combinaisons. | Réutilise le deck + main + tour de jeu d'UNO |
| **Bataille Navale** | 2 | Placement de flotte puis tirs alternés. | Phase de placement (nouvelle), puis tour par tour classique — [plan détaillé](#-bataille-navale--plan-dimplémentation) |
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

1. ~~**Puissance 4**~~ — ✅ livré (bêta).
2. ~~**Blanc / Undercover**~~ — ✅ livré (bêta).
3. ~~**Pierre-Feuille-Ciseaux tournoi**~~ — ✅ livré (bêta).
4. **Bataille Navale** — la seule vraie nouveauté de moteur du lot : une phase de
   placement. Plan détaillé plus bas.
5. **Gartic Phone** — gros potentiel de fous rires, et le canevas de Scribble est déjà écrit.
6. **Cartes contre l'humanité (SFW)** — fort effet de groupe, moteur simple.
7. **Quiz emoji local** — supprime la dépendance internet du Quiz.

---

## 🚧 Sortir les 3 jeux de bêta

Puissance 4, Undercover et Pierre-Feuille-Ciseaux sont livrés depuis
[a6f8e24](https://github.com/gogo25171/gamenight/commit/a6f8e24) et portent un badge
`BETA`. Question posée le 09/09/2026 : **sont-ils finis ?**

### ✅ Ce qui est vérifié (audit de code, 09/09/2026)

Les trois jeux sont **complets côté câblage** — rien ne manque des sept points
d'intégration serveur ni des sept points client :

| | Vérifié pour les 3 jeux |
|--|-------------------------|
| ✅ | `defaultSettings` · `validateSettings` · `minPlayers` · map de `restartGame` **et** de `game:start` · `handleAction` · `sendReconnectState` · `onPlayerDisconnect` |
| ✅ | Carte d'accueil · vue · onglet de règles · balise `<script>` · module client · listeners socket · `gameKeys` · `SETTINGS_SCHEMA` |
| ✅ | Reconnexion avec l'état **privé** : le mot d'Undercover, la couleur de Puissance 4, le coup P-F-C déjà joué |
| ✅ | Départ en cours de partie : P-F-C fait avancer le bracket, Undercover relance l'orateur suivant et termine en `abandoned` sous 3 vivants |
| ✅ | Secrets : rien ne fuit dans une diffusion salon (couvert par [test/secrets.test.js](test/secrets.test.js)) |
| ✅ | `en.json` / `fr.json` à parité, badge `BETA` piloté par `BETA_GAMES` |
| ✅ | Tests dédiés : [connect4](test/connect4.test.js) · [rps](test/rps.test.js) · [undercover](test/undercover.test.js) |
| ✅ | Doc joueur : [connect4.md](docs/games/connect4.md) · [undercover.md](docs/games/undercover.md) · [rps.md](docs/games/rps.md) — et la doc technique dans [game-internals.md](docs/development/game-internals.md) |

### 🔧 Corrigé pendant l'audit

- [x] `new_game` de Puissance 4 (et du morpion) n'était **ni réservé à l'hôte ni
      conditionné à la fin de la partie** : n'importe quel client pouvait effacer une
      grille en cours avec un `game:action` fait main. Serveur corrigé + un test par jeu
- [x] Undercover était le **seul jeu bêta sans badge dans sa propre vue** — la barre
      latérale nomme désormais le jeu et porte le badge, et un test vérifie les trois
      surfaces (carte, lobby, vue) pour chaque entrée de `BETA_GAMES`
- [x] `nightTime` de Mongolpuri absent du lobby (bug P0 de longue date), avec le test
      « chaque défaut serveur a un contrôle dans le lobby »

### ⏳ Ce qui reste avant de retirer le badge

Rien de bloquant côté code ; ce sont des décisions de jeu, qui demandent d'y jouer.

- [ ] **Puissance 4 — départ d'un joueur** : `onPlayerDisconnect` envoie une
      notification et laisse la grille figée. Personne ne gagne, l'hôte doit repasser par
      le lobby. Choisir : victoire par forfait (comme le tournoi morpion), ou promotion
      automatique d'un spectateur. Le morpion en duel a exactement le même trou
- [ ] **Puissance 4 — rotation des spectateurs** : à 4 joueurs, deux regardent toute la
      soirée. Une file d'attente (« le gagnant reste ») serait plus juste que « l'hôte
      relance »
- [ ] **Undercover — les clamps silencieux** : Mr White exige 5 joueurs, un 2ᵉ undercover
      avec Mr White en exige 7. Le serveur réduit le choix de l'hôte **sans rien dire**.
      Afficher la contrainte dans le lobby (« Mr White : 5 joueurs minimum »)
- [ ] **Undercover — les paires de mots sont en anglais**, côté serveur, partagées par
      tout le salon. Une table francophone joue avec `Coffee` / `Tea`. C'est le seul
      endroit où l'i18n par joueur ne peut pas suivre → réglage `language` du salon
      alimentant une table de paires par langue
- [ ] **P-F-C — le coup aléatoire de fin de timer** peut décider un match sans que
      personne ait joué (surtout en « lancer unique »). Décider : garder, ou perdre la
      manche au lieu de tirer au sort
- [ ] **P-F-C — le rythme** (2,8 s de révélation + 1,4 s entre matchs) n'a jamais été
      jugé à table. Trop lent à 8 joueurs ?
- [ ] **Deux soirées de test réelles** par jeu, avec des joueurs qui ne connaissent pas
      le code. C'est la seule chose que l'audit ne peut pas remplacer
- [ ] Puis retirer le badge : `BETA_GAMES` dans [app.js](public/js/app.js#L73), les trois
      `<span class="badge-beta">` d'[index.html](public/index.html), le `beta` du
      [README](README.md), les `:material-flask:` de [docs/games/](docs/games/) et l'entête
      de ce fichier

---

## 🤔 Intégrer Le Juste Prix ?

Question ouverte : faut-il faire entrer [Le-Juste-Prix](https://github.com/gogo25171/Le-Juste-Prix)
dans GameNight ?

### Ce que c'est, concrètement

| | GameNight | Le Juste Prix |
|--|-----------|---------------|
| Stack | Node 18+ · Express · Socket.io | Python 3.12 · FastAPI · WebSockets · SQLite |
| Taille | 1 `server.js` de 1 367 lignes, 6 modules client | 239 fichiers, ~547 Ko de Python |
| Tests | 1 script de simulation | 189 tests, 80 % de couverture |
| Persistance | **Aucune** — tout en mémoire, perdu au restart | SQLite : catalogue, comptes, saisons, classements |
| Comptes | Aucun — un pseudo et un avatar | Paires de clés, parties signées, portables entre instances |
| Données externes | Aucune (sauf l'API du Quiz) | Scraping marchands, cache 7 jours, gestion de fraîcheur |
| Licence | MIT | Tous droits réservés |

### 💬 Mon avis : **non, ne pas fusionner le code — juxtaposer les deux**

Les raisons, par ordre d'importance :

1. **Ce ne sont pas deux jeux, ce sont deux plateformes.** Le Juste Prix a son propre
   système de salons, son lobby, ses codes à 5 caractères, son chat, son classement.
   L'intégrer ne veut pas dire « ajouter un jeu », ça veut dire faire cohabiter deux
   moteurs de room concurrents — exactement le genre de chose que la checklist
   d'ajout de jeu ci-dessous existe pour éviter.
2. **Deux runtimes dans un repo.** Soit on garde Python et GameNight devient polyglotte
   (deux images, deux CI, deux gestionnaires de dépendances, un reverse proxy pour
   router), soit on réécrit tout en Node — et on jette 189 tests et une ADR qui
   argumente précisément le choix de Python contre Node.
3. **Les modèles de données sont incompatibles.** GameNight est volontairement
   sans état : on redémarre, tout est perdu, et c'est assumé. Le Juste Prix a besoin
   de SQLite pour son catalogue et ses comptes. Fusionner tire toute cette
   persistance dans un projet conçu pour ne pas en avoir.
4. **Le sens de la fusion est mauvais.** Le Juste Prix est le projet le plus mature
   des deux (tests, couverture, docs, ADR, sécurité). Le faire entrer dans GameNight,
   c'est le rétrograder au rang de sous-dossier.
5. **Licence.** GameNight est un fork MIT d'un projet tiers ; Le Juste Prix est en
   tous droits réservés. Verser son code ici reviendrait à le passer en MIT — c'est
   ton droit, mais c'est une décision à prendre consciemment, pas un effet de bord
   d'un merge.

### Option A — Juxtaposer *(recommandé, ~30 min)*

Les deux projets restent indépendants, GameNight devient juste le point d'entrée.

- [ ] Ajouter un service `justeprix` dans [docker-compose.yml](docker-compose.yml)
      (image du repo Juste Prix, port 8000)
- [ ] Ajouter une carte « 💰 Le Juste Prix » sur l'accueil de
      [public/index.html](public/index.html#L22) qui est un simple lien externe
      vers `http://<hôte>:8000` au lieu d'un `data-game`
- [ ] Distinguer visuellement les cartes « jeu externe » (petite icône ↗)
- [ ] Mentionner les deux jeux dans le README et la doc

Coût quasi nul, aucun couplage, chaque projet garde sa CI, ses docs et sa licence.
C'est ce que je ferais.

### Option B — Un « Juste Prix » natif, léger *(effort moyen)*

Si tu veux vraiment le jeu *dans* GameNight, réimplémente la boucle en Node en
réutilisant **les données, pas le code**.

- [ ] Exporter le catalogue Juste Prix en JSON statique (article, image, prix figé)
- [ ] Nouveau jeu `justeprix` suivant la checklist ci-dessous — le moteur `quiz`
      fait déjà 80 % du travail : questions séquentielles, chrono, score, révélation,
      classement. Seule la notation change : proximité du prix au lieu de bon/faux
- [ ] Indices « c'est plus / c'est moins » entre les manches
- [ ] Prix jamais envoyé au client avant la révélation (le Juste Prix fait déjà ça)

Tu perds les comptes, les badges, les saisons et le scraping temps réel — mais
tu gagnes un jeu de soirée qui s'enchaîne avec les autres sans changer d'onglet.

### Option C — Port complet du Python vers Node

**À éviter.** Plusieurs semaines de travail, perte des 189 tests, et réécriture du
scraping, du cache de fraîcheur et de la cryptographie des comptes portables.
Aucun bénéfice pour le joueur par rapport à l'option A.

---

## ✅ Checklist : ajouter un jeu

Points d'intégration réels dans le code (exemple avec `monjeu`).

### Serveur — [server.js](server.js)

- [ ] `defaultSettings()` ([server.js:19](server.js#L19)) — ajouter `case 'monjeu'`
- [ ] `validateSettings()` ([server.js:33](server.js#L33)) — valider les réglages entrants
- [ ] `minPlayers()` ([server.js:87](server.js#L87)) — nombre minimum de joueurs
- [ ] `restartGame()` ([server.js:322](server.js#L322)) — ajouter `monjeu: startMonjeu` dans la map
      (⚠️ la même map est écrite deux fois : aussi dans le handler `game:start`)
- [ ] `handleAction()` ([server.js:330](server.js#L330)) — router vers `monjeuAction()`
- [ ] `sendReconnectState()` ([server.js:266](server.js#L266)) — état renvoyé après un refresh
- [ ] `onPlayerDisconnect()` ([server.js:389](server.js#L389)) — que se passe-t-il si un joueur part
- [ ] Nouvelle section `// ── MONJEU ──` : `startMonjeu`, `monjeuAction`, `monjeuPublic`, `endMonjeu`

### Client

- [ ] `public/index.html` — carte `<div class="game-card" data-game="monjeu">` (~ligne 22)
- [ ] `public/index.html` — vue `<div id="view-monjeu" class="view">`
- [ ] `public/index.html` — onglet règles `data-game="monjeu"` + `<div id="rules-monjeu">`
- [ ] `public/index.html` — `<script src="js/monjeu.js"></script>`
- [ ] `public/js/monjeu.js` — module avec `onState()` et les émissions d'actions
- [ ] `public/js/app.js` — schéma de settings ([app.js:78](public/js/app.js#L78)) et listeners socket
      ([app.js:697](public/js/app.js#L697))
- [ ] `public/js/app.js` — ajouter le nom dans `gameKeys` ([app.js:578](public/js/app.js#L578))
- [ ] `public/js/app.js` — si le jeu sort en bêta, l'ajouter à `BETA_GAMES`
      ([app.js:73](public/js/app.js#L73)) — carte d'accueil, lobby et en-tête du jeu
- [ ] `public/js/i18n/en.json` **et** `fr.json` — les deux dictionnaires doivent avoir
      exactement les mêmes clés, sinon une langue dégrade en silence

### Tests — [test/](test/)

- [ ] Les règles qui décident un vainqueur (alignement, conditions de victoire, scoring)
- [ ] Un coup illégal : hors tour, hors grille, spectateur, coup après la fin
- [ ] Une entrée dans [test/secrets.test.js](test/secrets.test.js) : l'état privé du jeu
      ne part **jamais** dans une diffusion salon
- [ ] Une ligne dans le test de câblage de [test/lifecycle.test.js](test/lifecycle.test.js)
      (carte d'accueil, vue, onglet de règles, reconnexion privée)
- [ ] ⚠️ Piloter les phases (`monjeuStartRound(room)`) au lieu d'attendre les timers, et
      finir par `stopTimers(room)` — sinon `node --test` ne rend jamais la main
- [ ] ⚠️ Sélectionner les joueurs **par leur rôle**, jamais par leur position

### Finition

- [ ] Tableau des jeux + section « How to Play » dans [README.md](README.md)
- [ ] Badge `games-N` du README à incrémenter
- [ ] Page de jeu dans [docs/games/](docs/games/) + entrée dans la nav de [mkdocs.yml](mkdocs.yml)
- [ ] Section dans [docs/development/game-internals.md](docs/development/game-internals.md) :
      d'abord ce qu'on personnalise (mots, cartes, durées), ensuite comment ça marche
- [ ] Tester : reconnexion en pleine partie · départ d'un joueur · rejouer · spectateurs

---

## 🚢 Bataille Navale — plan d'implémentation

Le prochain jeu de la liste. Il suit la [checklist ci-dessus](#-checklist--ajouter-un-jeu)
comme les autres, mais il introduit une chose que le projet n'a encore jamais faite :
une **phase de placement** avant que le tour par tour ne commence.

### Ce que ça reprend de l'existant

| Brique | D'où elle vient |
|--------|-----------------|
| Grille cliquable rendue par le client | `connect4` — la grille est construite en JS depuis `cols`/`rows` envoyés par le serveur |
| Deux joueurs + spectateurs, best-of, `matchWinner` | `tictactoe` / `connect4`, mode classique |
| État privé qui ne sort jamais dans le public | `killerdoctor` (rôle) et `undercover` (mot) : `*Public()` construit la vue diffusable, le reste part en `socket.emit` |
| Chrono par tour avec relance automatique | `undercover` (`deadline` + `addTimer`) |
| Départ d'un joueur en pleine partie | `connect4` → `c4:player_left` |

### Ce qu'il faut construire

- [ ] **Phase de placement.** Chaque joueur pose sa flotte sur sa propre grille
      pendant que l'autre fait de même — donc deux états privés en parallèle, pas
      un tour par tour. Un bouton « Flotte prête » ; quand les deux sont prêts, le
      combat commence. Chrono de secours : à l'expiration, placement aléatoire.
- [ ] **Validation serveur du placement.** Le client propose, le serveur vérifie :
      bon nombre de bateaux, bonnes longueurs, dans la grille, sans chevauchement.
      Comme partout ici, une valeur invalide est **rejetée, pas corrigée**.
- [ ] **Deux grilles à l'écran.** « Ma flotte » (mes bateaux + les tirs reçus) et
      « Tirs » (ce que je sais de l'adversaire : ○ à l'eau, ✕ touché, 🔥 coulé).
- [ ] **`bnPublic()` — le point sensible.** La position des bateaux adverses ne doit
      **jamais** partir dans l'état public, même « caché » côté client. Le public ne
      contient que : les cases déjà tirées, leur résultat, et la liste des bateaux
      coulés. Chaque joueur reçoit sa propre flotte par `socket.emit`.
- [ ] **Reconnexion.** `sendReconnectState()` doit rendre : ma flotte, mes tirs, les
      tirs reçus, à qui est le tour, et la phase (placement ou combat).

### Réglages proposés

| Réglage | Valeurs | Défaut |
|---------|---------|--------|
| `gridSize` | 8×8 · 10×10 · 12×12 | 10 |
| `fleet` | classique (5·4·3·3·2) · courte (4·3·2) · longue (5·5·4·3·3·2) | classique |
| `salvo` | off · on (autant de tirs que de bateaux encore à flot) | off |
| `turnTime` | 15 · 30 · 45 s | 30 |
| `bestOf` | libre · 3 · 5 | libre |

Rappel : chaque valeur listée ici doit exister à l'identique dans
`SETTINGS_SCHEMA` **et** dans `validateSettings()`, sinon l'hôte choisit un
réglage que le serveur jette en silence.

### Points de vigilance

1. **Le placement est la partie longue à tester.** Rotation, chevauchement, bord de
   grille, glisser-déposer sur mobile. Prévoir un bouton « Placement aléatoire » dès
   la première version : c'est aussi le repli quand le chrono expire.
2. **Un abandon pendant le placement** ne doit pas figer la salle : si un joueur
   part, l'autre gagne par forfait, comme dans `connect4`.
3. **Ne pas partir sur le tournoi tout de suite.** Une partie dure bien plus
   longtemps qu'un morpion ; un bracket à 8 joueurs serait interminable. Deux
   joueurs et des spectateurs pour la v1, bracket seulement si l'envie vient.
4. **Sortie en bêta**, comme les trois derniers jeux : badge `BETA`, puis retrait du
   badge après quelques soirées sans bug.

---

## 🎲 Variantes de jeux — à réfléchir

Une variante coûte beaucoup moins cher qu'un jeu neuf : même vue, même boucle,
souvent un seul réglage en plus. Le morpion vient d'en donner l'exemple — la
**taille de grille** (3×3 / 4×4 / 5×5) n'a demandé qu'un réglage et une détection
d'alignement générique, pas un nouveau jeu.

L'idée à creuser : est-ce qu'une variante mérite d'être **un réglage du jeu
existant** (le lobby a déjà tout ce qu'il faut) ou **une carte séparée sur
l'accueil** (plus visible, mais un jeu de plus à maintenir) ?

### Morpion

| Variante | Ce que ça change | Réglage ou jeu à part ? |
|----------|------------------|-------------------------|
| **Gravité** — les symboles tombent au fond de la colonne | Le morpion devient un Puissance 4 miniature | Réglage |
| **Misère** — celui qui aligne **perd** | Inverse la condition de victoire, rien d'autre | Réglage |
| **Cases éphémères** — chaque joueur n'a que 3 pions ; le 4ᵉ efface le plus ancien | Plus jamais de match nul | Réglage |
| **Ultimate 9×9** — ton coup décide de la sous-grille adverse | Nouveau moteur de coups légaux | Jeu à part |
| **À l'aveugle** — on ne voit pas les coups adverses, le serveur annonce « occupé » | Nouvelle vue, mais moteur identique | Réglage |

### Puissance 4

- **Pop-out** : retirer un de ses propres jetons du bas de la colonne.
- **Aligner 5** sur une grille plus large — un seul paramètre `need` à exposer,
  la détection est déjà générique.
- **Gravité inversée** : une manche sur deux, les jetons tombent vers le haut.

### Undercover

- **Deux paires de mots** : deux camps d'imposteurs qui s'ignorent.
- **Indices écrits en simultané** puis révélés d'un coup — supprime l'avantage
  de parler en dernier.
- **Mode duo** : les civils gagnent seulement s'ils désignent aussi le bon mot.

### Pierre-Feuille-Ciseaux

- **Lézard-Spock** : 5 coups, même moteur, table de victoires à étendre.
- **Double élimination** : un perdant a droit à un second bracket.
- **Manche à mise** : miser des points sur une manche avant de jouer.

### UNO · Quiz · Scribble

- **UNO** : règles maison en cases à cocher (empilage des +2, jouer après pioche,
  7-0). Déjà noté plus haut comme « Uno Flip / extensions ».
- **Quiz** : mode « mort subite » — une mauvaise réponse et on sort.
- **Scribble** : mode « un seul mot pour toute la salle », tout le monde dessine en
  même temps et on vote le meilleur dessin.

### Comment décider

1. La variante change-t-elle la **condition de victoire** ou seulement la **mise en
   place** ? Mise en place → réglage. Condition de victoire → probablement un jeu.
2. Est-ce qu'un joueur qui arrive en cours de soirée comprend la variante **sans
   relire les règles** ? Si non, elle mérite son propre onglet de règles.
3. Est-ce que ça ajoute une **ligne dans `validateSettings()`** ou une **section
   entière dans `server.js`** ? La réponse est en général la bonne réponse.

---

## 🤖 Bots — compléter une table, ou jouer tout seul

Deux besoins bien distincts, qui se règlent avec le même moteur :

1. **Compléter une partie.** Il manque un joueur pour lancer Mongolpuri à 4, ou
   quelqu'un part en plein tournoi. Aujourd'hui la soirée s'arrête.
2. **Jouer seul.** Tester un jeu, s'entraîner, occuper les cinq minutes avant que
   tout le monde arrive.

### 🎚️ Le niveau se choisit au départ

Un réglage de lobby comme les autres — même schéma, mêmes contraintes
(`SETTINGS_SCHEMA` [app.js:78](public/js/app.js#L78) **et** `validateSettings()`
[server.js:33](server.js#L33), sinon l'hôte choisit une valeur que le serveur jette).

| Niveau | Ce que ça veut dire | Pour qui |
|--------|---------------------|----------|
| 🟢 **Découverte** | Joue légalement, au hasard. Ne bloque même pas un alignement évident. | Première partie, enfants |
| 🔵 **Tranquille** | Gagne si elle peut, bloque si elle doit. Rien de plus. | Le niveau « ami pas concentré » |
| 🟠 **Sérieux** | Recherche en profondeur limitée + heuristique de position. | Le niveau par défaut |
| 🔴 **Impitoyable** | Profondeur maximale. Sur le morpion 3×3, littéralement imbattable. | Ceux qui veulent perdre |

Deux réglages en plus : **combien de bots** ajouter, et s'ils sont ajoutés
**automatiquement** quand la table n'atteint pas `minPlayers()`
([server.js:87](server.js#L87)) au bout de N secondes.

### 🧩 Le vrai obstacle : un bot n'a pas de socket

Toute l'architecture passe par l'identifiant de socket : `rooms` et `playerRooms`
([server.js:14](server.js#L14)), `io.to(id).emit(...)` pour l'état privé,
`onPlayerDisconnect()` ([server.js:389](server.js#L389)) déclenché par un événement
`disconnect` qui n'arrivera jamais pour un bot.

Le contournement est plus simple qu'il n'en a l'air : donner au bot un id
**synthétique** (`bot:1`, `bot:2`) qui ne peut pas entrer en collision avec un id
de socket. Les `io.to('bot:1').emit(...)` deviennent alors des no-op silencieux —
personne n'a rejoint cette room — et le bot lit directement `room.gameState` côté
serveur. Aucun jeu n'a besoin d'être modifié pour ça, ce qui est exactement ce
qu'on veut.

Les points à ne pas rater :

- [ ] **Le ménage des rooms.** `if (room.players.size === 0)`
      ([server.js:256](server.js#L256)) supprime la room vide. Avec des bots dans
      la Map, une salle où tous les humains sont partis **ne sera jamais nettoyée**
      et ses timers tournent pour toujours. Il faut compter les humains, pas les
      joueurs.
- [ ] **`broadcastLobby()`** ([server.js:89](server.js#L89)) — un flag `isBot` pour
      afficher un badge sur la carte du lobby. Un joueur doit voir immédiatement
      contre quoi il joue.
- [ ] **Pas d'expulsion ni de transfert d'hôte vers un bot** — `room:kick` doit
      pouvoir retirer un bot, `room:transfer_host` doit le refuser.
- [ ] **Les stats de session.** `recordResult()` ([server.js:506](server.js#L506))
      doit-il compter les victoires d'un bot au tableau des scores ? Probablement
      pas, ou dans une ligne à part.
- [ ] **Un huitième hook.** Les sept fonctions de dispatch décrites dans
      [CLAUDE.md](CLAUDE.md) deviennent huit : `botAct(room, botId)`, qui aiguille
      vers `tttBotMove`, `c4BotMove`, etc. C'est le seul endroit générique à écrire.
- [ ] **Le bot doit « réfléchir ».** Une réponse instantanée est glaçante et casse
      l'illusion. Toujours passer par `addTimer(room, …)`
      ([server.js:86](server.js#L86)) avec un délai un peu aléatoire — jamais un
      `setTimeout` nu, sinon une salle vidée laisse des timers derrière elle.

### 🎯 Faisabilité, jeu par jeu

| Jeu | Difficulté du bot | Ce qui existe déjà |
|-----|-------------------|--------------------|
| ⭕ **Morpion** | ⭐ Triviale | `tttWin()` ([server.js:714](server.js#L714)) est déjà générique : minimax sur 3×3, profondeur limitée sur 4×4 / 5×5 |
| 🔴 **Puissance 4** | ⭐⭐ Facile | `c4Win()` ([server.js:1525](server.js#L1525)) donne la détection ; reste une fonction d'évaluation et un negamax profondeur 4–6 |
| ✂️ **Pierre-Feuille-Ciseaux** | ⭐ Triviale — et la plus intéressante | Le hasard est mathématiquement optimal, donc un bot « fort » est forcément un **prédicteur de motifs**. C'est le terrain d'essai idéal du modèle joueur décrit plus bas |
| 🃏 **UNO** | ⭐⭐ Facile | Heuristiques sur la main : garder les cartes noires, poser la couleur dominante, viser le joueur qui a peu de cartes |
| 🧠 **Quiz** | ⭐ Triviale | Répondre juste avec une probabilité fixée par le niveau, avec un temps de réponse plausible |
| 🕵️ **Undercover** | ⭐⭐⭐⭐ Difficile | Il faut **produire un indice en langue naturelle** puis juger ceux des autres. Hors de portée sans modèle de langue |
| 🔪 **Mongolpuri** | ⭐⭐⭐⭐ Difficile | Le jeu **est** la discussion. Un bot muet qui vote au hasard ne trompe personne |
| 🎨 **Scribble** | ⭐⭐⭐⭐⭐ Hors sujet | Dessiner. Non. |

> 💬 **Mon avis :** commencer par **Morpion et Puissance 4**. Ce sont des jeux à
> information parfaite, le moteur de recherche tient en cinquante lignes, et — c'est
> le point important — **la même fonction d'évaluation sert ensuite au coach**
> décrit dans la section suivante. Un seul effort, deux fonctionnalités.
>
> Pour les jeux de discussion (Undercover, Mongolpuri), mieux vaut **assumer qu'il
> n'y aura pas de bot** que d'en livrer un qui vote au hasard : il gâche la partie
> des humains au lieu de la sauver. Si l'envie d'un vrai bot revient, c'est une
> dépendance à un modèle de langue — donc un appel réseau, donc la fin du
> « fonctionne sans internet ». À arbitrer consciemment, comme le Quiz l'a déjà été.

### 🧠 Le jeu apprend comment tu joues

L'idée : après quelques parties, le jeu sait à peu près où tu en es et te le dit.

**Ce qu'on observe** (rien de plus, et uniquement sur les jeux déterministes) :

| Signal | Ce qu'il indique |
|--------|------------------|
| Taux de victoire contre chaque niveau | Le plus direct — 5 victoires d'affilée en 🔵, il est temps de monter |
| Taux de gaffes | Un coup jouable qui perd alors qu'un coup nul existait. Se mesure avec l'évaluateur du bot |
| Coups gagnants manqués | Tu avais l'alignement, tu ne l'as pas vu |
| Blocages manqués | Tu n'as pas vu la menace adverse |
| Temps de réflexion | Une chute brutale = du clic réflexe, pas de la maîtrise |

**Le conseil, jamais le changement automatique.** Le niveau ne bouge pas tout seul
— rien n'est plus agaçant qu'un jeu qui décide que tu es devenu bon. Un bandeau
discret en fin de partie suffit :

> 🎉 *3 victoires d'affilée en Tranquille, sans une seule gaffe. Passer en Sérieux ?*
> **[Oui] [Plus tard] [Ne plus proposer]**

Et dans l'autre sens, ce qui compte au moins autant :

> 🙂 *Cinq défaites de suite. Repasser en Tranquille ? Ce n'est pas de la triche.*

### 💾 Où vit le modèle joueur — la vraie question

GameNight est **volontairement sans état** : `rooms` est une Map en mémoire, un
redémarrage efface tout, et [CLAUDE.md](CLAUDE.md) dit que c'est délibéré. Or un
modèle qui « apprend » ne vaut rien s'il meurt à chaque redémarrage.

| Option | Ce que ça donne | Coût |
|--------|-----------------|------|
| **A — `localStorage` côté client** *(recommandé)* | Le modèle est un petit JSON dans **ton** navigateur, envoyé au serveur au moment de rejoindre. Il te suit d'une soirée à l'autre, le serveur reste sans état | Quasi nul. C'est exactement le choix déjà fait pour la langue (`gn_lang`, [i18n.js:12](public/js/i18n.js#L12)) |
| **B — un fichier JSON côté serveur** | Marche même en changeant de navigateur | Introduit de la persistance dans un projet conçu sans. Écritures concurrentes, chemin à configurer, sauvegarde |
| **C — une base** | Vrai profil, vrai historique | Voir la section « Intégrer Le Juste Prix » : c'est précisément le désaccord de modèle de données qui a fait écarter la fusion |

> 💬 **Mon avis :** l'option **A**, sans hésiter. Elle garde la promesse « aucune
> base, redémarre et c'est propre », elle est cohérente avec le choix déjà fait
> pour la langue, et elle a un effet de bord agréable : **le profil ne quitte
> jamais le navigateur du joueur**. Rien à écrire dans une politique de
> confidentialité, rien à purger. Le jour où quelqu'un veut repartir de zéro, il
> vide son stockage local.
>
> Corollaire à assumer : le profil est lié au navigateur, pas au pseudo. Changer de
> téléphone remet le compteur à zéro. Pour un jeu de soirée, c'est acceptable.

### 📋 Ordre de mise en œuvre

- [ ] `botAct()` générique + id synthétiques + comptage des humains pour le ménage
      des rooms *(l'infrastructure, sans aucun jeu)*
- [ ] Bot Morpion aux 4 niveaux — le plus simple, sert de gabarit
- [ ] Réglages de lobby : niveau, nombre de bots, remplissage automatique
- [ ] Badge « bot » dans le lobby et dans les vues de jeu
- [ ] Bot Puissance 4 *(réutilise l'évaluateur)*
- [ ] Modèle joueur en `localStorage` + bandeau de conseil en fin de partie
- [ ] Bot Pierre-Feuille-Ciseaux prédictif *(le plus amusant à écrire)*
- [ ] Bots UNO et Quiz
- [ ] Tester : un bot qui « part » (kick), une salle 100 % bots, une reconnexion
      humaine dans une partie contre des bots

---

## 🎓 Apprendre les techniques de chaque jeu

Aujourd'hui le modal « 📖 Comment jouer » ([index.html:840](public/index.html#L840))
explique **les règles**. Il ne dit nulle part *comment bien jouer*. C'est le
manque : on sait qu'il faut aligner trois symboles, personne ne dit qu'il faut
prendre le centre.

### 🪜 Trois niveaux de contenu, du moins cher au plus cher

**1. Un onglet « Techniques » à côté de « Règles »** — le moins cher, à faire en
premier. La structure existe déjà : `rules-tab` / `rules-content`
([index.html:846](public/index.html#L846)) et `openRules()`
([app.js:262](public/js/app.js#L262)) gèrent déjà huit onglets. Ajouter un
deuxième niveau d'onglets par jeu est du HTML et des clés i18n, zéro serveur.

Le contenu, par jeu — court, concret, jamais un pavé :

| Jeu | Ce qu'on y met |
|-----|----------------|
| ⭕ Morpion | Le centre d'abord, les coins ensuite. Créer une double menace. Sur 4×4 et 5×5, jouer les diagonales que l'adversaire regarde le moins |
| 🔴 Puissance 4 | La colonne centrale vaut deux colonnes de bord. Compter la parité des lignes. Ne pas offrir la case au-dessus de la sienne |
| ✂️ P-F-C | Les humains rejouent rarement deux fois le même coup, et sortent la pierre en premier. Le vrai conseil : être imprévisible |
| 🃏 UNO | Garder les cartes noires pour la fin. Vider sa couleur dominante en dernier. Compter les cartes du voisin |
| 🕵️ Undercover | Un indice trop précis te démasque autant qu'un indice trop vague. Écouter *l'ordre* dans lequel les gens parlent |
| 🔪 Mongolpuri | Le silence est suspect, l'accusation précipitée aussi. Le tueur vote souvent avec la majorité |
| 🎨 Scribble | Les formes générales avant les détails. Le chrono récompense la lisibilité, pas la beauté |
| 🧠 Quiz | Vitesse contre certitude : la barre de score récompense les deux |

**2. L'analyse d'après-partie** — le vrai apport, et presque gratuit **si les bots
sont faits d'abord**. Rejouer la liste des coups dans le même évaluateur que le bot
et marquer les moments qui comptent :

> **Partie terminée — 3 moments clés**
> · Coup 4 : tu pouvais gagner en jouant la colonne 5 🟢
> · Coup 7 : ce coup a offert l'alignement adverse 🔴
> · Coup 9 : bien vu, tu as bloqué la double menace ✅

Ça ne marche que sur les jeux à information parfaite (Morpion, Puissance 4). Pour
les autres, un simple récapitulatif factuel — qui a voté quoi, qui a deviné le plus
vite — vaut déjà mieux que rien, et `history` existe déjà dans Mongolpuri et
Undercover.

**3. Les conseils en cours de partie** — à manier avec précaution. Utile pour
débuter, insupportable ensuite. **Désactivé par défaut**, activable dans le
réglage… et coupé automatiquement dès qu'on joue à plusieurs humains : personne
ne veut d'un assistant qui souffle à l'oreille d'un adversaire.

### ⚠️ Points de vigilance

1. **Traduction.** Tout ce contenu double la taille des dictionnaires. Les deux
   fichiers `en.json` et `fr.json` doivent rester **clé pour clé identiques**, sinon
   une langue dégrade en silence. C'est le poste de travail principal de cette
   section, pas le code.
2. **Le contenu vieillit avec le jeu.** Un conseil sur le morpion 3×3 est faux sur
   du 5×5. Chaque variante ajoutée (voir « Variantes de jeux ») rend une partie des
   conseils caducs. À relier au [numéro de version par jeu](#-numéro-de-version-par-jeu).
3. **Ne pas transformer un jeu de soirée en cours du soir.** Rien ne doit s'ouvrir
   tout seul, jamais. On consulte les techniques parce qu'on le veut ; l'analyse
   d'après-partie est un panneau qu'on déplie, pas un écran qu'on subit.
4. **Le ton.** « Tu as fait une erreur » démoralise ; « il y avait mieux ici »
   apprend. Ça se joue dans les chaînes de traduction, autant y penser en les
   écrivant.

### 📋 Ordre de mise en œuvre

- [ ] Onglet « Techniques » dans le modal existant + contenu pour les 8 jeux
      *(HTML + i18n, aucun serveur)*
- [ ] Clés `en.json` **et** `fr.json` en même temps, jamais l'une sans l'autre
- [ ] Panneau d'analyse d'après-partie pour le Morpion *(dépend de l'évaluateur
      du bot — à faire après)*
- [ ] Même panneau pour le Puissance 4
- [ ] Récapitulatif factuel de fin de partie pour Mongolpuri et Undercover
      *(réutilise `history`)*
- [ ] Conseils en cours de partie, désactivés par défaut et coupés en multijoueur

---

## 🚨 Anti-triche, anti-bot, anti-abus

### Le modèle de menace, d'abord

Ce projet tourne sur un LAN, entre gens qui se connaissent. L'adversaire réaliste
n'est pas un attaquant d'internet : c'est **l'ami qui ouvre les devtools**, celui
qui ouvre deux onglets pour voter deux fois, et le petit malin qui script un
client pour gagner le tournoi P-F-C.

Deux conséquences :

1. **Proportionnalité.** Pas de captcha, pas de comptes, pas d'empreinte de
   navigateur. Chaque garde-fou doit coûter moins cher que le problème qu'il règle.
2. **Sauf si le serveur est exposé.** Le jour où l'on ouvre un port sur internet
   (voir l'avertissement de la section [`.env`](#-configuration-par-fichier-env)),
   tout ce qui suit passe de « confort » à « obligatoire ».

### ✅ Ce qui protège déjà

Le socle est meilleur que la moyenne, autant le noter avant d'empiler :

- `validateSettings()` est une **liste blanche** : une valeur inconnue est jetée, pas ramenée dans les clous
- Les secrets partent **socket par socket**, jamais dans une diffusion salon — et [test/secrets.test.js](test/secrets.test.js) le vérifie pour les 8 jeux
- Chaque action de jeu revalide **le tour, la phase et la légalité du coup** côté serveur
- Les actions d'hôte (`game:start`, `game:restart`, `room:kick`, `room:settings`, `new_game`) vérifient `room.host === socket.id`
- Les pseudos et les avatars sont uniques par salon
- Un salon vide est détruit avec ses timers

### 🚨 Le trou le plus large : reprendre une session avec un simple pseudo

Dans `room:join`, quand une partie est en cours, la reconnexion se fait **sur le
seul pseudo** :

```js
const existing = [...room.players.values()].find(p => p.name === playerName?.trim());
existing.id = socket.id;          // la session change de propriétaire
```

Autrement dit : qui connaît le code du salon et le pseudo d'un joueur — c'est-à-dire
**tout le monde dans le salon**, les pseudos sont affichés — peut prendre sa place et
recevoir son rôle secret, sa main UNO ou son mot d'Undercover. La victime devient un
fantôme : son ancien socket reste abonné aux diffusions mais n'est plus dans
`room.players`.

- [ ] **Jeton de reconnexion** : un identifiant aléatoire donné à l'entrée, stocké en
      `localStorage` à côté du pseudo et de l'avatar, exigé pour reprendre une place
- [ ] Refuser la reprise si le socket d'origine est **toujours connecté** — une
      reconnexion légitime suit toujours une déconnexion
- [ ] Nettoyer `playerRooms` et faire quitter le salon à l'ancien socket lors d'une reprise
- [ ] Journaliser les reprises côté serveur : c'est le seul endroit où une triche laisse
      une trace exploitable

### 🎮 Triche jeu par jeu

| Jeu | La triche | Ce qu'on peut faire |
|-----|-----------|---------------------|
| **Tous** | Deux onglets, deux pseudos → deux votes, deux mains | Empreinte faible (même IP + même `localStorage`) et **avertir l'hôte**, pas bloquer : deux joueurs partagent parfois un ordinateur |
| **Quiz** | Chercher la réponse dans un autre onglet | Insoluble techniquement. Un chrono court (10 s) et une banque locale de questions moins googlables font plus qu'un garde-fou |
| **Undercover · Mongolpuri** | Se coordonner par Discord / à voix basse | Hors de portée du code, et c'est en partie le jeu. À dire dans les règles plutôt qu'à combattre |
| **Scribble** | Le dessinateur écrit le mot, ou un joueur qui a trouvé le souffle | ✅ déjà couvert : le chat du dessinateur et celui des joueurs ayant trouvé sont **jetés** pendant la manche |
| **Scribble** | Envoyer des traits sans être dessinateur, ou par milliers | ✅ le rôle est vérifié · ❌ le contenu et le volume ne le sont pas (voir anti-abus) |
| **P-F-C** | Un client scripté qui joue en 3 ms, chaque manche | Détecter l'impossible plutôt que le rapide (voir anti-bot) |
| **Puissance 4 · Morpion** | Un solveur parfait en arrière-plan | Impossible à distinguer d'un bon joueur. La vraie réponse est les [bots officiels](#-bots--compléter-une-table-ou-jouer-tout-seul) : si on veut jouer contre une machine, autant que ce soit assumé |

### 🤖 Anti-bot — détecter l'automatisation, pas la vitesse

- [ ] **Limite de débit par socket et par événement** : un compteur en fenêtre glissante
      (par ex. 20 `game:action` / 10 s, 10 `chat:send` / 10 s). Un joueur normal ne s'en
      approche jamais
- [ ] **Plancher de temps de réaction** : un coup arrivé moins de ~150 ms après le début
      d'une phase n'est pas humain. Ne pas rejeter — **compter**, et signaler à l'hôte au
      bout de N fois. Un faux positif qui exclut un joueur coûte plus cher que la triche
- [ ] **Régularité** : un humain a de la variance. Dix coups au même millier de
      millisecondes près, c'est un script
- [ ] Un indicateur discret côté hôte (« 3 actions suspectes »), **jamais** une accusation
      publique automatique. C'est une soirée entre amis, pas un tribunal
- [ ] ⚠️ Ne pas confondre bot et [bot officiel](#-bots--compléter-une-table-ou-jouer-tout-seul) :
      quand la section « Bots » sera implémentée, ses joueurs devront être marqués comme
      tels et exemptés de ces contrôles

### 🧯 Anti-abus — ce qui peut casser le serveur ou le salon

Ces points sont concrets et vérifiés dans le code actuel. Les deux premiers sont des
corrections de dix minutes.

- [ ] **Indice d'avatar non borné.** `room:join` accepte `Number(avatar) || 0`, sans
      maximum, et le client fait `AVATARS[p.avatar].emoji` : un `avatar: 9999` fait
      **planter le rendu du lobby de tout le monde**. Borner côté serveur
- [ ] **Longueur du pseudo non bornée.** `playerName.trim()` n'a aucune limite : un
      pseudo de 100 000 caractères part dans toutes les diffusions. Couper à ~20
      caractères (le champ HTML le fait déjà, le serveur non)
- [ ] **`gs.drawingData` sans limite.** Chaque trait est poussé dans un tableau que
      personne ne borne, et `data.stroke` est **rediffusé sans validation de forme ni de
      taille** : c'est le chemin le plus court vers une saturation mémoire et une
      inondation de tous les clients. Valider la forme du trait et plafonner le tableau
- [ ] **Aucune limite sur `room:create`.** Une boucle crée des salons jusqu'à épuisement
      de la mémoire. Un plafond global de salons + un quota par IP
- [ ] **Aucune limite de débit sur `chat:send`.** La longueur est coupée à 400
      caractères, la fréquence n'est pas contrôlée
- [ ] Plafonner la taille des messages Socket.io (`maxHttpBufferSize`, 1 Mo par défaut —
      trop pour ce projet)
- [ ] Le futur [`POST /api/feedback`](#-espace-de-commentaires--retours-des-joueurs) hérite
      du même problème : limite de longueur **et** de débit dès la première ligne écrite

### 🔨 Modération, pour l'hôte

- [x] ~~Kick d'un joueur par l'hôte~~ — existe déjà, depuis le lobby et en cours de partie
- [ ] Ré-entrée immédiate après un kick : rien ne l'empêche aujourd'hui. Une liste de
      bannis par salon (mémoire, durée de vie du salon) suffirait
- [ ] Transfert d'hôte automatique si l'hôte part **en cours de partie** (aujourd'hui le
      premier joueur de la Map devient hôte, sans que personne ne l'apprenne clairement)
- [ ] Salon verrouillable (« plus personne n'entre ») — utile quand le code a circulé
- [ ] Filtre de gros mots sur les pseudos ? **Mon avis : non.** Faux positifs garantis, et
      l'hôte a déjà le kick

### 🧪 Tests à écrire avec

Chaque garde-fou de cette section se teste sans socket, en appelant les fonctions
directement — comme le reste de la suite :

- [ ] Une reprise de session sans jeton valide est refusée
- [ ] Une reprise est refusée tant que le socket d'origine est connecté
- [ ] Un `avatar` et un pseudo hors bornes sont normalisés, pas propagés
- [ ] La limite de débit laisse passer un rythme humain et bloque un rythme de script
- [ ] Un trait de dessin mal formé est jeté sans être rediffusé

### 💬 Mon avis sur l'ordre

1. **Le jeton de reconnexion** — c'est le seul point de cette section qui permet de
   voler le rôle secret d'un autre joueur. Tout le reste est du confort.
2. **Les trois bornes** (avatar, pseudo, traits de dessin) — trente minutes à trois,
   et elles suppriment les seuls plantages provoquables à distance.
3. **Les limites de débit**, quand elles auront un vrai usage : un salon exposé, ou un
   joueur qui s'ennuie.
4. **La détection d'automatisation**, en dernier. Elle n'a de sens qu'une fois les bots
   officiels écrits, pour ne pas signaler les siens.

---

## 🐛 Bugs / dette technique

- [x] ~~`gameNames` ne contient pas `quiz` → le lobby affiche « Lobby » au lieu de « Quiz »~~ — corrigé au passage de l'i18n : la table est devenue `gameKeys` dans [app.js](public/js/app.js) et contient les cinq jeux. Y ajouter tout nouveau jeu.
- [x] ~~`killerdoctor` a un `nightTime` dans `defaultSettings` mais aucune option correspondante dans le schéma client d'[app.js](public/js/app.js#L78)~~ — corrigé : champ ajouté (30 / **45** / 60 / 90 s), plus un test « chaque défaut serveur a un contrôle dans le lobby » qui empêche le prochain oubli.
- [x] ~~`new_game` (morpion, Puissance 4) n'était ni réservé à l'hôte ni conditionné à la fin de la partie~~ — corrigé : le serveur exige les deux, avec un test de non-régression par jeu. Le client n'affichait le bouton qu'à l'hôte, le serveur acceptait l'action de n'importe qui, à n'importe quel moment.
- [ ] [server.js](server.js) fait ~1 980 lignes : découper en `games/tictactoe.js`, `games/uno.js`, etc. avant d'ajouter 3-4 jeux de plus.
- [ ] Le Quiz nécessite internet (opentdb.com) — prévoir une banque de questions locale en repli.
- [ ] Pas de `LICENSE` dans le repo alors que le README annonce MIT.

## 🧪 Tests — arrêter de découvrir les régressions en soirée

### ✅ État d'avancement

La base est en place : **102 tests**, ~10 s, zéro dépendance ajoutée.

| | Quoi |
|--|------|
| ✅ | `npm test` → `node --test`, avec `node:test` + `node:assert` (intégrés à Node ≥ 18, donc compatibles avec la matrice `18 · 20 · 22`). Pas de Jest, pas de Vitest |
| ✅ | Un fichier par domaine dans [test/](test/) : `settings`, `tournament`, `tictactoe`, `connect4`, `rps`, `undercover`, `uno`, `secrets`, `lifecycle` |
| ✅ | Les tests appellent **le vrai code** : `server.js` se termine par un `module.exports`, et son `server.listen` est derrière `if (require.main === module)` — un test peut donc `require()` le serveur sans ouvrir de port |
| ✅ | `npm test` et `npm run i18n:check` branchés en CI **et** en hooks pre-commit |
| ⏳ | Le découpage de `server.js` en `games/<id>/` reste souhaitable pour la lisibilité — mais il n'est plus un **prérequis** aux tests, le `module.exports` a levé le blocage |

> 💡 Deux pièges appris en écrivant la suite, à connaître avant d'en ajouter :
> les machines à phases se **pilotent** (on appelle `ucStartClues`, `rpsResolveRound`…)
> au lieu d'attendre des timers de 30 s, et tout test qui démarre une partie doit
> finir par `stopTimers(room)` sinon le runner ne rend jamais la main. Les rôles,
> les mots et les mains étant tirés au hasard, on sélectionne un joueur **par son
> rôle**, jamais par sa position — sinon le test passe quatre fois sur cinq.

### 🛡️ Ce qu'il faut couvrir en priorité

Par ordre de « ça a déjà cassé ou ça cassera » :

| | Cible | Ce qu'on vérifie | Pourquoi |
|--|-------|------------------|----------|
| ✅ | **Bracket de tournoi** | 2 à 16 joueurs : nombre de tours, exemptions, matchs fantômes, propagation, un seul champion | Partagé par le morpion et le P-F-C : une régression casse deux jeux |
| ✅ | **`validateSettings()`** | Une valeur hors liste est **jetée, pas ramenée dans les clous** ; les chaînes des `<select>` sont bien converties | Règle de sécurité, pas préférence — un client hostile envoie n'importe quoi |
| ✅ | **Cohérence `SETTINGS_SCHEMA` ↔ `validateSettings()`** | Chaque option du lobby est acceptée par le serveur, et chaque défaut du schéma est valide | Le piège documenté dans CLAUDE.md : l'hôte choisit une valeur que le serveur jette en silence |
| ✅ | **Secrets** | Rôle et mot Undercover, coup P-F-C avant révélation, main UNO, rôle Mongolpuri, mot Scribble, réponse du Quiz — rien ne part dans une diffusion salon | **Le plus important.** Une fuite ici ruine la partie sans lever la moindre erreur |
| ✅ | **Alignements** | Morpion 3×3/4×4/5×5 et Puissance 4 dans les 4 directions, plus le piège du **retour à la ligne** (deux cases voisines dans le tableau plat mais pas sur la grille) | Le bug typique d'une détection écrite à la main |
| ✅ | **Coups illégaux** | Hors tour, hors grille, case occupée, colonne pleine, spectateur, coup après la fin | Un client peut émettre n'importe quel `game:action` |
| ✅ | **Format de match** | Best-of qui s'arrête à la majorité, jeu libre qui ne s'arrête jamais, échange des symboles/couleurs, scores conservés | Le score qui repart à zéro entre deux manches |
| ✅ | **Undercover** | Répartition des rôles de 4 à 12 joueurs sans parité au départ, indice tronqué/vide, égalité au vote, devinette de Mr White | Beaucoup d'états, faciles à casser |
| ✅ | **Cartes UNO** | Deck de 108 cartes exactement, jouabilité couleur/valeur/joker, sens de jeu qui s'inverse et boucle | La logique la plus dense du projet |
| ✅ | **Cycle de vie d'un salon** | Reconnexion qui rend l'état **privé** pour les 8 jeux, départ en cours de partie sans blocage, `clearTimers()`, tableau des scores de session | `clearTimers()` oublié = fuite mémoire silencieuse |
| ✅ | **Câblage d'un jeu** | Chaque carte d'accueil a bien sa vue, son onglet de règles et son entrée serveur | Les oublis les plus fréquents de la checklist |
| ✅ | **i18n** | `npm run i18n:check` : aucune clé manquante, aucune clé orpheline | Était déjà écrit — désormais branché en CI et en pre-commit |
| ⏳ | **Cycle Mongolpuri** | Le Médecin annule le Tueur, conditions de victoire, égalité au vote = aucune élimination | Seuls les secrets sont couverts pour l'instant |
| ⏳ | **UNO en partie** | +2/+4 en chaîne, « UNO ! » non dit, pioche épuisée qui recycle la défausse | Testé au niveau des cartes, pas encore au niveau du tour |
| ⏳ | **Scoring** | Points au chrono (Scribble, Quiz), classement, égalités | Silencieusement faux, personne ne s'en aperçoit sur le moment |

### 🔌 Tests d'intégration socket

Les tests unitaires ne couvrent pas ce qui casse vraiment en soirée : la reconnexion et
les départs en cours de partie.

- [ ] Client `socket.io-client` en `devDependencies`, serveur lancé sur un port éphémère
- [ ] Scénario : créer un salon → 4 joueurs rejoignent → lancer → un joueur se déconnecte
      et revient → il retrouve **son** état privé (`sendReconnectState`)
- [ ] Scénario : l'hôte part → un autre joueur devient hôte, la partie continue
- [ ] Scénario : deux joueurs, même pseudo → refus explicite
- [ ] ⚠️ Ces tests doivent **tuer le serveur et les timers** en fin de fichier, sinon
      `node --test` ne rend jamais la main

### 🔬 Tests plus fins — quand on aura le temps

La suite actuelle vise **large et vital** : les règles centrales, les coups illégaux
et les fuites de secrets. Ce qui suit est du détail utile, pas urgent — à prendre
une ligne à la fois, un jour de pluie.

- [ ] **Mongolpuri de bout en bout** : nuit → résolution → jour → vote, avec le Médecin
      qui sauve la cible du Tueur, plusieurs médecins, et la victoire à 2 survivants
- [ ] **UNO au niveau du tour** : `unoPlayCard` avec +2/+4, joker qui impose la couleur,
      « UNO ! » non annoncé, et surtout la **pioche épuisée qui recycle la défausse**
      (le cas le plus rare et le plus cassant)
- [ ] **Scribble** : points décroissants avec le chrono, indices révélés à 30 s et 55 s,
      le dessinateur qui marque à chaque bonne réponse, la manche qui se termine quand
      tout le monde a trouvé
- [ ] **Quiz** : scoring à la vitesse, égalité, départ d'un joueur en pleine question.
      La récupération des questions doit être **isolée du réseau** — sinon le test
      dépend d'opentdb.com et devient instable
- [ ] **Tournoi morpion complet** : enchaînement des matchs, match nul rejoué,
      abandon en plein match, et l'écran de bracket entre deux matchs
- [ ] **Propriétés plutôt qu'exemples** : jouer 10 000 parties de morpion aléatoires et
      vérifier qu'aucune ne finit sans vainqueur ni match nul. C'est là qu'on trouve
      les cas auxquels personne n'a pensé
- [ ] **Cas limites de `validateSettings()`** : `NaN`, `Infinity`, `null`, tableaux,
      objets imbriqués, chaînes très longues — ce qu'un client hostile envoie vraiment
- [ ] Couverture via `node --test --experimental-test-coverage` — utile comme
      indicateur, **jamais comme objectif chiffré**

### 🧷 Garde-fous anti-régression

- [x] ~~Ajouter `npm test` à [ci.yml](.github/workflows/ci.yml)~~ — fait, plus un hook
      pre-commit `unit-tests` : la suite tourne avant que le commit ne parte, pas
      seulement après
- [x] ~~Brancher `npm run i18n:check`~~ — fait, en CI et en pre-commit
- [ ] Un test de non-régression pour **chaque bug corrigé** : le test échoue d'abord,
      la correction le fait passer. C'est ce qui empêche le bug de revenir.
      Appliqué aux trois corrections du 09/09/2026 (`nightTime`, `new_game` hôte,
      badge bêta manquant) — à tenir pour les suivantes
- [x] ~~Ajouter « écrire les tests du jeu » à la checklist « ajouter un jeu »~~ — fait,
      dans ce fichier et dans [adding-a-game.md](docs/development/adding-a-game.md)
- [x] ~~Supprimer `test-tournament.js`~~ — fait. Il gardait sa **propre copie** de
      `buildTournamentRounds` / `propagateTournamentWinners`, donc il pouvait passer au
      vert sur du code mort pendant que le vrai serveur était cassé.
      [test/tournament.test.js](test/tournament.test.js) couvre le même terrain (2 à 16
      joueurs) contre les vraies fonctions. Les mentions dans
      [CLAUDE.md](CLAUDE.md), le [modèle de PR](.github/pull_request_template.md) et
      [docs/games/tictactoe.md](docs/games/tictactoe.md) pointent maintenant sur `npm test`
- [ ] Faire tourner la suite **en parallèle** si elle dépasse ~15 s ; à 4 s ce n'est
      pas un sujet

---

## 🔢 Numéro de version par jeu

Chaque jeu porte sa propre version, indépendante de celle du dépôt. Ça devient
indispensable dès que les jeux sont des dossiers installables (section « Plateforme »),
et c'est déjà utile avant : savoir quelle version d'UNO tourne quand un joueur signale
un bug de règle.

### Où elle vit

- [ ] Dans le manifeste du jeu, à côté de `id`, `name`, `emoji` :
      `version: '1.2.0'` — en attendant le découpage, une simple table
      `GAME_VERSIONS` en tête de [server.js](server.js) fait le travail
- [ ] **SemVer par jeu**, avec un sens précis pour un jeu de soirée :
      - `patch` — correction sans effet sur les règles
      - `minor` — nouveau réglage, nouvelle animation, règle optionnelle
      - `major` — **la règle change** : une partie ne se joue plus pareil qu'avant
- [ ] La version du jeu **n'est pas** celle de `package.json` : le dépôt peut sortir
      trois versions sans que le Morpion bouge d'un octet

### Où elle se voit

- [ ] Sur la carte du jeu à l'accueil, en discret (`v1.2.0`), ou seulement dans les règles
- [ ] Dans le lobby, à côté du nom du jeu — c'est là que l'hôte la lira
- [ ] Jointe automatiquement aux retours joueurs (section « Espace de commentaires »),
      avec le jeu et la phase : un bug sans numéro de version est un bug non reproductible
- [ ] Un endpoint `GET /api/games` qui liste id + version, pratique pour vérifier ce que
      fait tourner une instance sans ouvrir un navigateur

### Ce que ça permet ensuite

- [ ] Avertir quand les versions divergent entre l'instance et le registre (marketplace)
- [ ] Un `CHANGELOG` par jeu, dans `games/<id>/CHANGELOG.md`, plutôt qu'un fleuve commun
- [ ] Rattacher les scopes de commit existants (`uno`, `quiz`, `mongolpuri`…) à la version
      du jeu concerné : le scope dit déjà quel jeu bouge, il ne manque que le bump
- [ ] ⚠️ Ne pas transformer ça en cérémonie : si bumper une version devient une corvée
      manuelle à chaque commit, personne ne le fera. Le dériver des commits conventionnels
      (`feat(uno):` → minor sur UNO) ou l'assumer comme un geste rare

---

## 💬 Espace de commentaires / retours des joueurs

Permettre à un joueur d'envoyer un retour **en quelques secondes, sans quitter la
partie** : un bug, une idée, « ce jeu est trop long », « le chrono du vote est trop
court ».

### ✅ Ce qui existe déjà — le canal hors de l'app

Rien n'est encore dans le jeu, mais le suivi GitHub a **trois formulaires courts**, un
par type de retour, et ils sont maintenant mis en avant là où on les cherche :

| Formulaire | Pour |
|------------|------|
| [🐛 Bug report](.github/ISSUE_TEMPLATE/bug_report.yml) | Quelque chose a cassé, s'est bloqué, ou affiche faux |
| [💡 Feature request](.github/ISSUE_TEMPLATE/feature_request.yml) | Un réglage, une variante, un confort |
| [🎲 New game](.github/ISSUE_TEMPLATE/new_game.yml) | Un jeu à ajouter |

- [x] ~~Rubrique « signaler un bug / proposer un jeu » visible pour un joueur~~ — ajoutée
      dans le [README](README.md) et dans [docs/games/index.md](docs/games/index.md), avec la
      consigne qui rend un rapport exploitable ici : **le nombre de joueurs et la phase**
      au moment du problème
- [ ] La même rubrique dans la modale « How to Play » de l'app, ou à côté du bouton de
      sortie : un joueur sur son téléphone ne lira jamais le README
- [ ] Un lien dans l'écran de fin de partie vers le formulaire de bug pré-rempli
      (`?template=bug_report.yml&title=…`) — sans compte GitHub ça reste un cul-de-sac,
      d'où le formulaire interne ci-dessous

> Le reste de cette section est le **retour dans l'app**, qui ne demande ni compte ni
> internet. C'est l'objectif ; les formulaires GitHub sont le canal en attendant.

### Le déclencheur

- [ ] Bouton flottant discret 💬, présent sur **tous** les écrans (accueil, lobby, en
      jeu, écran de fin) — en bas à droite, au-dessus de la vue courante
- [ ] Ouvre une **popup** légère, réutiliser le style des modales existantes
      (« How to Play », choix d'avatar) plutôt que d'en inventer une nouvelle
- [ ] Raccourci clavier (`F` ou `?`) pour les joueurs sur ordinateur
- [ ] ⚠️ Ne **jamais** voler le focus ni mettre le jeu en pause : la partie continue
      derrière. Un joueur qui commente pendant son tour ne doit pas bloquer les autres

### Le formulaire — le plus court possible

- [ ] Trois catégories en un clic : 🐛 **Bug** · 💡 **Idée** · 💭 **Autre**
- [ ] Un seul champ texte libre, rien d'autre d'obligatoire
- [ ] Envoi possible **sans rien remplir d'autre** — chaque champ ajouté divise le
      nombre de retours reçus
- [ ] Confirmation brève (un toast, la popup se ferme) puis retour immédiat au jeu

### Le contexte, joint automatiquement

C'est ce qui fait la différence entre un retour exploitable et « ça marche pas ».
Le client le sait déjà, il n'y a rien à demander au joueur :

- [ ] Jeu en cours et **phase** (nuit, vote, tour de dessin…)
- [ ] Nombre de joueurs, code du salon, si l'auteur est hôte ou non
- [ ] Pseudo, horodatage, durée de la partie
- [ ] Navigateur, taille d'écran, tactile ou non
- [ ] Réglages du salon au moment du retour
- [ ] **Afficher au joueur ce qui sera joint**, repliable — pas de collecte cachée

### Où vont les retours ?

| Piste | Avantage | Inconvénient |
|-------|----------|--------------|
| **✅ Fichier local `feedback.jsonl`** | Fidèle à l'esprit du projet : rien ne sort du réseau. Une ligne JSON par retour | L'hôte doit penser à le lire |
| Issue GitHub pré-remplie | Atterrit directement dans le suivi | Nécessite internet, et le joueur doit avoir un compte |
| POST vers un service externe | Centralisé | Casse la promesse « rien ne sort du LAN », et il faudrait héberger le service |

**💬 Mon avis : fichier local par défaut**, avec un bouton secondaire
« Ouvrir une issue GitHub » qui construit une URL pré-remplie (`?title=&body=`) vers
les [templates existants](.github/ISSUE_TEMPLATE/) — aucun token à stocker, aucune
dépendance réseau côté serveur.

- [ ] `POST /api/feedback` → une ligne appendée dans `feedback.jsonl`
- [ ] Emplacement configurable via `FEEDBACK_PATH` (voir la section `.env` ci-dessous),
      et désactivable avec `FEEDBACK_ENABLED=false`
- [ ] ⚠️ En conteneur, ce fichier disparaît au redémarrage s'il n'est pas sur un volume
      — à documenter dans [docs/getting-started/docker.md](docs/getting-started/docker.md)
- [ ] `npm run feedback` : affiche les retours dans le terminal, groupés par jeu

### Le vrai gisement : demander à la fin de la partie

Un bouton caché dans un coin reçoit peu de retours. L'écran de fin de partie, lui,
capte un moment où tout le monde regarde son écran en même temps.

- [ ] Sur l'écran de fin : 👍 / 👎 + un champ d'une ligne, facultatif
- [ ] Une seule sollicitation par joueur et par soirée — mémorisé dans `localStorage`,
      comme le nom et l'avatar. Redemander à chaque manche serait vite pénible
- [ ] Agréger les 👍/👎 par jeu : c'est la donnée la plus utile pour décider quel jeu
      mérite du travail, et laquelle des pistes de la section « Jeux à ajouter » prioriser

### Garde-fous

- [ ] Limite de longueur (2 000 caractères) et limitation de débit par socket — sinon
      un joueur qui s'ennuie remplit le disque
- [ ] Échapper le contenu avant tout affichage : un retour n'est **jamais** du HTML
- [ ] Ne rien afficher aux autres joueurs — c'est un canal vers l'hôte, pas un second chat
- [ ] Mentionner cette collecte locale dans [SECURITY.md](SECURITY.md) et le README :
      « no tracking » doit rester vrai, et un fichier local lisible par l'hôte n'est pas
      du tracking — à condition de le dire

---

## ⚙ Configuration par fichier `.env`

Aujourd'hui une seule variable est lue : `PORT` ([server.js](server.js#L1353)). Tout le
reste est en dur — `gamenight.local`, l'URL de l'API du Quiz, l'adresse d'écoute.

### Mise en place

- [ ] Charger le `.env` au démarrage. Deux options :
      - **Node ≥ 20.6 natif** : `node --env-file=.env server.js` — zéro dépendance,
        mais casse le support de Node 18 annoncé dans `engines`
      - **`dotenv`** : une dépendance de plus, compatible Node 18. ✅ Plutôt ça,
        tant que Node 18 est supporté
- [ ] Créer un `.env.example` **commité**, documenté, avec des valeurs par défaut sûres
- [ ] `.env` est **déjà** dans [.gitignore](.gitignore) — vérifier qu'il y reste
- [ ] Un seul module `config.js` qui lit, valide et exporte ; le reste du code ne lit
      jamais `process.env` directement
- [ ] Valider au démarrage et **planter avec un message clair** si une valeur est
      absurde, plutôt que de démarrer à moitié cassé

### Variables proposées

| Variable | Défaut | Rôle |
|----------|--------|------|
| `PORT` | `4000` | Déjà supporté |
| `HOST` | `0.0.0.0` | Interface d'écoute. `127.0.0.1` = accessible uniquement depuis la machine |
| `MDNS_ENABLED` | `true` | Désactiver l'annonce Bonjour (utile en conteneur bridge, où elle ne sert à rien) |
| `MDNS_HOST` | `gamenight.local` | Actuellement en dur |
| `QUIZ_ENABLED` | `true` | Masquer le Quiz quand l'instance n'a pas d'accès internet |
| `QUIZ_API_URL` | opentdb | Pointer vers un miroir ou une banque locale |
| `MAX_ROOMS` | `50` | Garde-fou mémoire |
| `MAX_PLAYERS_PER_ROOM` | `20` | Garde-fou |
| `LOG_LEVEL` | `info` | `debug` pour investiguer un bug multijoueur |

### 🚨 « Une variable pour exposer sur internet ou non » — attention

**💬 Mon avis : ne pas faire `EXPOSE_INTERNET=true`. C'est un piège à deux titres.**

1. **Ce n'est pas l'app qui expose.** Le serveur écoute déjà sur `0.0.0.0`. Ce qui
   décide de l'exposition, c'est ta box (redirection de port), ton reverse proxy ou ton
   hébergeur — pas une variable dans un `.env`. Un booléen donnerait l'illusion de
   contrôler quelque chose qui se passe ailleurs.
2. **Une variable à `true` ne rend rien sûr.** GameNight n'a **ni authentification, ni
   chiffrement** : connaître un code de salon à 6 lettres suffit à entrer. Exposé tel
   quel, n'importe qui trouvant l'URL rejoint tes parties, et tout circule en clair.
   C'est écrit dans [SECURITY.md](SECURITY.md), et c'est assumé : le modèle, c'est le
   réseau local de confiance.

**Ce que je ferais à la place** — deux variables honnêtes, qui décrivent chacune une
chose réelle :

- [ ] `HOST` — le vrai levier côté app. `127.0.0.1` pour n'être joignable que derrière
      un reverse proxy local, `0.0.0.0` pour le LAN
- [ ] `GAMENIGHT_MODE=lan|public` — **pas un interrupteur d'exposition, un interrupteur
      de durcissement.** En `public`, le serveur :
      - [ ] **refuse de démarrer** si `ACCESS_CODE` n'est pas défini (fail-closed — c'est
            le point important : on ne peut pas s'exposer par distraction)
      - [ ] exige ce code avant de créer ou rejoindre un salon
      - [ ] active une limitation de débit sur la création de salons et les connexions
      - [ ] coupe le mDNS (inutile hors LAN)
      - [ ] active `trust proxy` pour lire les vraies IP derrière le proxy
      - [ ] affiche un avertissement au démarrage : trafic non chiffré, TLS à la charge
            du proxy
- [ ] `ACCESS_CODE` — mot de passe d'instance, vide par défaut, obligatoire en `public`
- [ ] `TRUST_PROXY` — nécessaire dès qu'il y a un reverse proxy devant

- [ ] Documenter dans [docs/getting-started/network.md](docs/getting-started/network.md)
      que la **bonne** façon de jouer à distance reste un VPN (Tailscale, WireGuard) ou
      un reverse proxy avec TLS **et** authentification — le mode `public` réduit le
      risque, il ne le supprime pas

---

## 🧩 Plateforme : mini-jeux installables, marketplace, gros jeux

Trois questions liées. Elles ont toutes le **même prérequis** : tant qu'ajouter un jeu
veut dire modifier 14 endroits dispersés (voir la checklist plus bas), rien de tout
ça n'est possible.

### ⚙️ Étape 0 — le prérequis : un registre de jeux

- [ ] Découper [server.js](server.js) : un dossier par jeu, `games/<id>/`
- [ ] Chaque jeu exporte un **manifeste** au lieu d'être câblé dans des `switch` :

      ```js
      // games/connect4/index.js
      module.exports = {
        id: 'connect4',
        name: 'Puissance 4',
        emoji: '🟡',
        minPlayers: 2,
        maxPlayers: 8,
        defaultSettings: () => ({ bestOf: 0 }),
        validateSettings: (incoming) => ({ /* allow-list */ }),
        settingsSchema: [ /* ce que le lobby affiche */ ],
        start, action, reconnect, disconnect, // les hooks actuels
      };
      ```

- [ ] Au démarrage, le serveur scanne `games/*/index.js` et construit le registre.
      Les sept `switch` de `server.js` deviennent des `registry[room.gameType].hook(...)`
- [ ] Côté client, un endpoint `GET /api/games` sert la liste + les schémas de réglages.
      Les cartes d'accueil, les onglets de règles et le lobby se construisent
      dynamiquement au lieu d'être écrits en dur dans `index.html`
- [ ] Chaque jeu apporte son propre `client.js`, son gabarit de vue et ses règles

➡️ **À ce stade, « installer un mini-jeu » = déposer un dossier dans `games/` et
redémarrer.** C'est déjà 90 % de la valeur, sans aucun risque de sécurité.

### 📦 Étape 1 — installation de mini-jeux

Même un tout petit jeu (pile ou face, dés, morpion) doit pouvoir s'ajouter sans
toucher au cœur.

- [ ] `games/<id>/game.json` : id, nom, version, auteur, joueurs min/max, licence
- [ ] Validation du manifeste au chargement — un jeu mal formé est **ignoré avec un
      log**, il ne doit jamais empêcher le serveur de démarrer
- [ ] Activer / désactiver un jeu sans le supprimer (`enabled: false`, ou un dossier
      `games.disabled/`)
- [ ] Gabarit `games/_template/` à copier pour démarrer un nouveau jeu
- [ ] `npm run new-game <id>` qui génère le squelette
- [ ] Installation depuis une archive : `npm run install-game ./puissance4.zip`
- [ ] Rechargement à chaud (optionnel) — recharger le registre sans couper les parties
      en cours

### 🛒 Étape 2 — marketplace

- [ ] **Registre = un simple fichier JSON dans un dépôt Git.** Pas de serveur à héberger,
      pas de base de données. Une entrée = nom, description, auteur, URL de l'archive,
      version, empreinte SHA-256, capture d'écran
- [ ] Écran « Catalogue » dans l'app : parcourir, filtrer par nombre de joueurs, installer
- [ ] Bouton d'installation réservé à l'hôte de l'instance, pas à n'importe quel joueur
- [ ] Mises à jour : comparer les versions installées au registre
- [ ] Publier = ouvrir une PR sur le dépôt du registre — la revue humaine **est** la
      modération

#### 🚨 Le problème de sécurité, à régler avant la première installation distante

Un jeu tiers est du **JavaScript exécuté dans ton processus Node**. Installer un jeu
depuis internet, c'est exécuter du code arbitraire sur la machine du salon : accès
disque, réseau, variables d'environnement. Ce n'est pas théorique, c'est la règle.

Trois postures possibles, par ordre de réalisme :

1. **Catalogue curé** — seuls des jeux relus et fusionnés par PR entrent au registre,
   l'archive est vérifiée par empreinte. Simple, honnête, suffisant pour un projet de
   cette taille. **C'est ce que je recommande.**
2. **Signature** — les archives sont signées, l'app refuse une signature inconnue.
   Déplace le problème vers « à qui fait-on confiance », sans le résoudre.
3. **Bac à sable** — chaque jeu tourne dans un processus séparé avec une API
   restreinte (envoyer/recevoir des événements, rien d'autre). C'est la seule vraie
   réponse, et de loin la plus coûteuse. ⚠️ Le module `vm` de Node **n'est pas** une
   frontière de sécurité — ne pas s'en servir pour ça.

- [ ] Afficher clairement, à l'installation, ce que le jeu peut faire, et l'assumer
      dans [SECURITY.md](SECURITY.md)

### 🤔 Étape 3 — faut-il de plus gros jeux ?

Question ouverte : GameNight doit-il accueillir des jeux à grosse structure (campagne,
progression, parties longues, sauvegarde) ?

**💬 Mon avis : pas dans le cœur, oui via les plugins — et seulement si l'API le prévoit.**

Ce qui fait l'identité actuelle, et qui a de la valeur :

| Trait | Conséquence |
|-------|-------------|
| Une partie tient en 5-20 minutes | On enchaîne, personne ne décroche |
| Règles apprises en 30 secondes | On fait jouer quelqu'un qui arrive en cours de soirée |
| Tout en mémoire, zéro persistance | Aucune base, aucune migration, aucun ménage |
| Aucun compte | On ouvre une URL et on joue |

Un gros jeu casse les quatre d'un coup : il lui faut des sauvegardes, donc une base ;
de la progression, donc des comptes ; des parties longues, donc de la reprise après
redémarrage. C'est **exactement** l'analyse faite plus haut pour Le Juste Prix, et la
conclusion est la même.

Ce que je ferais à la place :

- [ ] Prévoir dans le manifeste une déclaration de besoins :
      `requires: { storage: true, minutes: 45 }`
- [ ] Fournir aux plugins qui le demandent un petit **espace de stockage clé/valeur**
      dédié (un fichier JSON par jeu), plutôt qu'une base partagée
- [ ] Signaler la durée estimée sur la carte du jeu, pour qu'on choisisse en connaissance
      de cause
- [ ] Garder le cœur strictement sans état : c'est le plugin qui porte sa complexité,
      jamais `server.js`

➡️ Autrement dit : ne pas dire non aux gros jeux, mais **ne pas payer leur coût tant
qu'aucun n'existe**. Le système de plugins rend la question réversible — c'est tout
l'intérêt de commencer par l'étape 0.

---

## 🌐 Traduction / i18n — par joueur

Chaque joueur choisit **sa propre langue d'interface** via une petite icône en haut à
droite, sans que ça change quoi que ce soit pour les autres. Deux personnes dans le
même salon peuvent jouer, l'une en français, l'autre en arabe.

### 🚧 État d'avancement

**Livré** — le moteur, le sélecteur, et `en` + `fr` :

- [x] [public/js/i18n.js](public/js/i18n.js) — chargement des fichiers de langue, repli
      sur `en`, interpolation `{param}`, pluriels via `Intl.PluralRules`, nombres via
      `Intl.NumberFormat`, `lang`/`dir` sur `<html>`, changement à chaud sans rechargement
- [x] Bouton 🌐 fixé en haut à droite sur tous les écrans + menu déroulant
- [x] Langue mémorisée dans `localStorage`, détectée via `navigator.languages` au premier lancement
- [x] `public/js/i18n/en.json` et `fr.json` — 397 clés chacun, y compris les 100 noms d'avatars
      et tout le texte de la modale « How to Play »
- [x] Extraction des chaînes de [public/index.html](public/index.html) (`data-i18n`,
      `data-i18n-html`, `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-aria-label`)
- [x] [public/js/app.js](public/js/app.js) et [tictactoe.js](public/js/tictactoe.js) et
      [killerdoctor.js](public/js/killerdoctor.js) passent par `t()`
- [x] `npm run i18n:check` ([scripts/i18n-check.js](scripts/i18n-check.js)) — clés manquantes,
      clés orphelines, clés utilisées mais absentes du fichier de référence

**Reste à faire pour que l'app soit entièrement traduite :**

- [ ] [scribble.js](public/js/scribble.js), [uno.js](public/js/uno.js) et
      [quiz.js](public/js/quiz.js) — leurs chaînes dynamiques sont encore en dur en anglais
- [ ] Les messages poussés par [server.js](server.js) (voir « Côté serveur » plus bas) —
      `tmsg()` côté client accepte déjà `{key, params}`, il n'y a plus qu'à émettre des clés
- [ ] Brancher `npm run i18n:check` dans [ci.yml](.github/workflows/ci.yml)
- [ ] Les langues suivantes : `es`, `zh`, puis `ar` (et sa passe RTL)

### 🌍 Le sélecteur de langue — icône en haut à droite

- [ ] Bouton discret 🌐 **fixé en haut à droite**, visible sur **tous** les écrans
      (accueil, lobby, en jeu, écran de fin) — même logique que le bouton 💬 de retours
      prévu plus haut, mais dans le coin opposé pour ne pas se marcher dessus
- [ ] Au clic : petit menu déroulant listant les langues avec drapeau + nom **écrit dans
      la langue elle-même** (`Français`, `English`, `Español`, `中文`, `العربية`) —
      jamais « Arabe » écrit en français : un joueur perdu dans une langue qu'il ne lit
      pas doit pouvoir retrouver la sienne
- [ ] Langue courante mémorisée dans `localStorage`, comme le pseudo et l'avatar
- [ ] Détection au premier lancement via `navigator.languages`, repli sur `en` si aucune
      correspondance
- [ ] ⚠️ Changement **à chaud** : re-traduire la page en place, sans rechargement et
      **sans quitter la partie en cours** — un `reload()` ferait perdre le socket
- [ ] Mettre à jour `<html lang>` et `<html dir>` à chaque changement
      ([public/index.html:2](public/index.html#L2))
- [ ] Attention à la superposition avec ce qui est déjà en haut de vue (en-tête de lobby,
      chrono, en-tête UNO/Quiz) : prévoir un `z-index` et un décalage sur mobile

### 🗣️ Langues visées

Ordre de priorité suggéré — la structure rend l'ajout d'une langue supplémentaire trivial.

| Code | Langue | Sens | Priorité | Notes |
|------|--------|------|----------|-------|
| `en` | English | LTR | 1 | Langue pivot : c'est déjà ce qui est en dur dans le HTML |
| `fr` | Français | LTR | 1 | Langue de l'auteur et de ce TODO |
| `es` | Español | LTR | 2 | Chaînes ~15-20 % plus longues qu'en anglais — boutons à tester |
| `zh` | 中文 (simplifié) | LTR | 2 | Chaînes très **courtes** : les boutons paraissent vides |
| `ar` | العربية | **RTL** | 3 | Le vrai chantier : voir la section RTL ci-dessous |
| `de` | Deutsch | LTR | 4 | Mots composés très longs — casse les largeurs fixes |
| `pt` | Português | LTR | 4 | |
| `hi` | हिन्दी | LTR | 5 | |
| `ru` | Русский | LTR | 5 | Pluriels à 3 formes, impose `Intl.PluralRules` |
| `ja` | 日本語 | LTR | 5 | |

- [ ] Livrer `en` + `fr` d'abord, puis `es` + `zh`, puis `ar`, le reste ensuite
- [ ] Un fichier `public/js/i18n/<code>.json` par langue — juste des paires clé/valeur
- [ ] `en.json` fait référence : toute clé absente d'une autre langue **retombe sur
      l'anglais** et logge un avertissement en console, plutôt que d'afficher la clé brute
- [ ] Ne **pas** charger les 10 langues au démarrage : un `fetch` du seul fichier
      nécessaire (le front reste sans build, donc pas de bundle par langue)

### ↔️ Arabe : le support RTL

C'est ce qui coûte le plus cher, et ça ne se voit qu'en le testant.

- [ ] `dir="rtl"` sur `<html>` quand la langue est arabe
- [ ] Remplacer dans [public/style.css](public/style.css) les `margin-left` /
      `padding-right` / `left:` par les propriétés logiques CSS
      (`margin-inline-start`, `inset-inline-end`…) — sinon la mise en page ne se
      retourne qu'à moitié
- [ ] Le sélecteur de langue lui-même passe **en haut à gauche** en RTL — d'où
      `inset-inline-end` plutôt que `right`
- [ ] Vérifier les éléments à direction imposée : grille du morpion, sens de jeu UNO
      (horaire / antihoraire), barre de chrono, canevas Scribble — un plateau de jeu ne
      doit **pas** se miroiter
- [ ] Codes de salon, scores et chiffres restent en caractères latins
- [ ] Repli de police propre pour l'arabe et le CJK — le front reste sans dépendance,
      donc pas de webfont lourde téléchargée

### ✅ Ce qui est traduisible par joueur (côté client uniquement)

- [ ] Marquer les textes du HTML avec un attribut, ex. `<span data-i18n="lobby.waiting">`,
      puis une passe de remplacement au chargement et à chaque changement de langue
- [ ] Prévoir aussi les attributs : `data-i18n-placeholder`, `data-i18n-title`,
      `data-i18n-aria-label` — sinon les champs de saisie et les boutons-icônes restent
      en anglais
- [ ] Traduire : accueil, lobby, réglages, boutons, notifications, écrans de fin
- [ ] Traduire les règles de la modale « How to Play » (le plus gros volume de texte —
      à sortir dans des fichiers `rules.<code>.json` pour ne pas gonfler le fichier de
      langue principal)
- [ ] Noms des rôles Mongolpuri, couleurs UNO, libellés de score, `gameNames`
      ([app.js:533](public/js/app.js#L533))
- [ ] Nombres, dates et durées via `Intl.NumberFormat` / `Intl.RelativeTimeFormat`
      plutôt qu'à la main
- [ ] Pluriels via `Intl.PluralRules` (« 1 joueur » / « 2 joueurs », 3 formes en russe)
- [ ] Interpolation dans les clés : `"player.left": "{name} a quitté la partie"`
- [ ] Traduire aussi `<title>` et les libellés d'accessibilité

### ⚠️ Ce qui ne peut **pas** être par joueur

C'est le vrai point de conception. Certains contenus sont **partagés** : si deux joueurs
les voient dans deux langues différentes, le jeu casse.

| Contenu | Pourquoi c'est bloquant | Solution |
|---------|------------------------|----------|
| **Mot de Scribble** | Le dessinateur dessine « chat », un autre doit taper « cat » — la comparaison de la réponse échoue | Langue **du salon**, choisie par l'hôte dans les réglages, indépendante de la langue d'interface |
| **Questions du Quiz** | L'API [opentdb](https://opentdb.com) ne sert qu'en anglais | Soit on assume l'anglais, soit banque locale traduite (voir la piste « Quiz emoji local ») |
| **Messages du chat** | Les joueurs écrivent dans leur langue | Rien à faire, c'est humain et c'est très bien comme ça |
| **Pseudos** | Saisis par le joueur | Rien à faire |

➡️ **Conséquence : deux réglages distincts, à ne pas confondre.**
La *langue d'interface* est personnelle et vit dans le navigateur ; la *langue de
contenu* (mots de Scribble) est un réglage de salon décidé par l'hôte, au même
titre que le temps de dessin.

- [ ] Ajouter un réglage de salon `contentLanguage` dans `defaultSettings()` /
      `validateSettings()` ([server.js:19](server.js#L19)) **et** dans `SETTINGS_SCHEMA`
      ([app.js:69](public/js/app.js#L69)) — les deux doivent proposer exactement les
      mêmes valeurs, sinon l'hôte choisit une langue que le serveur jette silencieusement

### 🔌 Côté serveur

- [ ] Les messages poussés par le serveur (`notification`, « X a quitté la partie »)
      deviennent des **clés + paramètres** (`{key:'player.left', params:{name:'Lucas'}}`)
      et non des phrases toutes faites, sinon le serveur devrait connaître la langue de
      chaque socket
- [ ] Recenser d'abord toutes les chaînes émises depuis [server.js](server.js) — une
      passe de `grep` sur les `emit(` qui transportent du texte
- [ ] Le serveur reste **agnostique de la langue** : il ne charge jamais un fichier de
      traduction

### 🧰 Outillage

- [ ] Script `npm run i18n:check` : clés présentes dans `en.json` et absentes ailleurs,
      et clés orphelines (plus référencées dans le HTML/JS)
- [ ] Le faire tourner en CI (`ci.yml`) au même titre que `node --check` — une langue
      incomplète doit se voir en PR, pas en soirée
- [ ] ⚠️ L'interface est actuellement **en anglais en dur** dans le HTML : la première
      étape est l'extraction des chaînes, c'est là qu'est l'essentiel du travail. La faire
      **avant** d'ajouter de nouveaux jeux, sinon chaque jeu ajoute sa part de dette
- [ ] Ajouter « marquer les nouvelles chaînes avec `data-i18n` » à la checklist
      « ajouter un jeu » ci-dessus
- [ ] Tester chaque langue à la main : troncature (de), débordement (es), boutons qui
      paraissent vides (zh), mise en page complète (ar)

---

## 📚 Faire évoluer la documentation

La doc [MkDocs Material](mkdocs.yml) a la bonne structure (18 pages, nav propre, thème
configuré) mais elle est **100 % textuelle** : aucune capture d'écran, aucun schéma.
Qui découvre le projet ne voit jamais à quoi il ressemble avant de l'avoir installé.

- [x] ~~Une page par jeu pour les trois jeux bêta~~ — [connect4](docs/games/connect4.md),
      [undercover](docs/games/undercover.md), [rps](docs/games/rps.md), plus la nav, l'index
      des jeux et la page d'accueil
- [x] ~~Documenter les réglages de lobby de chaque jeu~~ — ils sont dans chaque page de jeu,
      et les tableaux périmés du morpion et de Mongolpuri sont à jour
- [x] ~~Une doc **technique** par jeu~~ — [game-internals.md](docs/development/game-internals.md) :
      pour chacun des 8 jeux, d'abord ce qu'on personnalise (les paires de mots
      d'Undercover, le deck d'UNO, la banque du Quiz, la liste de mots de Scribble…),
      ensuite comment le jeu marche à l'intérieur

### 🖼️ Captures d'écran — le manque le plus visible

- [ ] Créer `docs/assets/screenshots/` — aujourd'hui `docs/assets/` n'existe même pas
- [ ] Une capture par jeu, en tête de chaque page de [docs/games/](docs/games/) :
      morpion, Mongolpuri, UNO, Quiz, Scribble, Puissance 4, Undercover, P-F-C
- [ ] Les écrans communs : accueil (choix du jeu), lobby avec réglages, sélecteur
      d'avatar, modale « How to Play », écran de fin / classement
- [ ] Une capture « héro » en haut de [docs/index.md](docs/index.md) et dans le README
- [ ] **Cohérence** : mêmes pseudos fictifs, même thème, même largeur de fenêtre
      (1280×800), mêmes avatars sur toutes les captures
- [ ] Version claire **et** sombre pour les écrans principaux, servies selon le thème
      Material (`#only-light` / `#only-dark` en suffixe d'URL d'image)
- [ ] Recadrer serré : une fenêtre de navigateur entière avec sa barre d'URL ne montre
      rien d'utile
- [ ] ⚠️ Poids : PNG optimisés ou WebP, viser < 200 Ko par image — le dépôt n'a pas
      vocation à devenir une galerie
- [ ] Texte alternatif systématique sur chaque image (accessibilité + référencement)
- [ ] Activer le plugin `glightbox` pour l'agrandissement au clic ; `attr_list` (déjà
      actif) suffit pour dimensionner
- [ ] Vérifier qu'aucune capture ne montre d'**IP privée ni de nom de machine réel** —
      c'est un projet de LAN, l'écran de partage affiche une URL

### 🎞️ Animations — pour ce qu'une image fixe ne montre pas

- [ ] Une courte séquence (< 10 s, muette, en boucle) pour : créer un salon + rejoindre
      avec le code · un tour de Scribble · une nuit de Mongolpuri
- [ ] Préférer `.mp4`/`.webm` en `<video autoplay muted loop playsinline>` au GIF :
      5 à 10 fois plus léger à qualité égale
- [ ] Une animation par page **maximum** — au-delà, la page devient illisible et lourde

### 📐 Diagrammes Mermaid

Plusieurs mécaniques du projet ne se racontent bien qu'en schéma.

- [ ] **Activer Mermaid dans MkDocs d'abord** — ce n'est pas actif aujourd'hui.
      Ajouter à [mkdocs.yml](mkdocs.yml) :

      ```yaml
      markdown_extensions:
        - pymdownx.superfences:
            custom_fences:
              - name: mermaid
                class: mermaid
                format: !!python/name:pymdownx.superfences.fence_code_format
      ```

      (`pymdownx.superfences` est déjà présent, il lui manque les `custom_fences` ;
      Material embarque Mermaid, aucune dépendance à ajouter)
- [ ] Vérifier que `mkdocs build --strict` passe toujours après le changement
- [ ] Schémas à produire, par page :

| Page | Diagramme | Type Mermaid |
|------|-----------|--------------|
| [architecture.md](docs/development/architecture.md) | Vue d'ensemble : navigateurs → Socket.io → `server.js` → `rooms` / `playerRooms` | `flowchart` |
| [architecture.md](docs/development/architecture.md) | Cycle de vie d'un salon : création → lobby → en jeu → fin → rejouer / salon vide | `stateDiagram-v2` |
| [architecture.md](docs/development/architecture.md) | Les 7 hooks de dispatch et qui les appelle | `flowchart` |
| [architecture.md](docs/development/architecture.md) | Reconnexion : refresh navigateur → `sendReconnectState()` → état privé restitué | `sequenceDiagram` |
| [adding-a-game.md](docs/development/adding-a-game.md) | Les 14 points d'intégration serveur + client | `flowchart` |
| [mongolpuri.md](docs/games/mongolpuri.md) | Boucle nuit → jour → vote → élimination → conditions de victoire | `stateDiagram-v2` |
| [scribble.md](docs/games/scribble.md) | Un tour : choix du mot → dessin → devinettes → score → rotation | `sequenceDiagram` |
| [uno.md](docs/games/uno.md) | Résolution d'un tour : cartes jouables, +2/+4 en chaîne, sens de jeu | `flowchart` |
| [quiz.md](docs/games/quiz.md) | Récupération opentdb + boucle de retry sur rate-limit | `sequenceDiagram` |
| [tictactoe.md](docs/games/tictactoe.md) | Bracket de tournoi 3-8 joueurs (`buildTournamentRounds`) | `flowchart` |
| [undercover.md](docs/games/undercover.md) | Phases : révélation → indices → vote → devinette de Mr White → victoire | `stateDiagram-v2` |
| [rps.md](docs/games/rps.md) | Un match : deux coups cachés → révélation simultanée → manche suivante | `sequenceDiagram` |
| [game-internals.md](docs/development/game-internals.md) | Où vivent les données personnalisables des 8 jeux | `flowchart` |
| [network.md](docs/getting-started/network.md) | Découverte mDNS : hôte → `gamenight.local` → clients du LAN | `flowchart` |
| [ci-cd.md](docs/development/ci-cd.md) | Pipeline : hooks → `node --check` → matrice Node → build Docker → Trivy → release | `flowchart LR` |

- [ ] ⚠️ Les diagrammes doivent rester **lisibles en thème sombre** : ne pas coder de
      couleurs en dur, laisser Material appliquer son thème Mermaid
- [ ] Ne pas faire de diagramme là où une liste suffit — un schéma faux ou périmé est
      pire que pas de schéma

### ✍️ Contenu : ce qui manque en plus des visuels

- [ ] Page **FAQ / dépannage** : « mes amis ne voient pas le salon », « `gamenight.local`
      ne résout pas », « le Quiz reste bloqué au chargement », « le port 4000 est pris »
- [ ] Page **Configuration** listant les variables d'environnement — à écrire en même
      temps que la section `.env` ci-dessus
- [ ] [games/index.md](docs/games/index.md) : tableau comparatif (joueurs, durée,
      complexité, internet requis) pour choisir un jeu en 10 secondes
- [ ] Chaque page de jeu suit le **même gabarit** : capture → le jeu en une phrase →
      joueurs et durée → règles → réglages du lobby → astuces → événements socket
- [ ] Une page **Changelog** alimentée par le `CHANGELOG.md` généré par `cz bump`
      (via `pymdownx.snippets`, déjà actif) plutôt qu'un doublon à maintenir
- [ ] Traduire la doc ? **Mon avis : pas tout de suite.** Le plugin `i18n` de Material
      double le coût de chaque page. À reconsidérer une fois l'app traduite et la doc
      stabilisée

### 🛠️ Confort et qualité

- [ ] Plugins à ajouter dans [mkdocs.yml](mkdocs.yml) et `requirements-docs.txt` :
      `glightbox` (zoom images), `git-revision-date-localized` (date de mise à jour en
      pied de page), `minify` (poids)
- [ ] Vérificateur de liens morts en CI — `mkdocs build --strict` ne détecte pas les
      liens externes cassés
- [ ] Cartes sociales (`social` de Material) pour les aperçus Discord/Slack au partage
- [ ] ⚠️ Toute capture devient fausse dès que l'UI change : ajouter « mettre à jour la
      capture si l'écran change » à la checklist d'ajout de jeu, et dater les captures
      dans un `docs/assets/screenshots/README.md`

---

## 🔧 Améliorations générales

- [ ] Notion d'**équipes** réutilisable (nécessaire pour Codenames, Time's Up, Scribble par équipes)
- [ ] Classement persistant entre parties d'une même soirée (au-delà de `sessionStats`)
- [ ] Sons et musique d'ambiance (activables/désactivables)
- [ ] Mode « soirée » : enchaîner plusieurs jeux avec un score global
- [ ] Bouton « jeu aléatoire » sur l'écran d'accueil
- [ ] Kick d'un joueur par l'hôte depuis le lobby
