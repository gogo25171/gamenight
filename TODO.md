# 📋 TODO — GameNight

Idées de jeux à ajouter et améliorations en attente.
Les 5 jeux actuels : Mongolpuri · UNO · Quiz · Tic Tac Toe · Scribble.

---

## 🎮 Jeux à ajouter

Classés par effort d'implémentation. « Réutilise » = infra déjà en place dans le projet.

> **Déjà couvert :** Scribble est l'équivalent de [skribbl.io](https://skribbl.io) (dessin partagé,
> devinettes dans le chat, score à la vitesse). Les pistes ci-dessous concernent des variantes
> (équipes, multi-langue) ou des jeux de dessin d'un genre différent, comme **Gartic Phone**.

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
| **Gartic Phone** | 4–15 | Téléphone arabe en dessins : chacun écrit une phrase, le voisin la dessine, le suivant décrit le dessin, etc. Tout le monde joue en simultané. À la fin, on déroule chaque « album » devant le groupe. | Canevas + outils de dessin de `scribble` réutilisables tels quels. Le nouveau : chaînes parallèles (1 album par joueur), rotation à chaque tour, et l'écran de restitution finale |
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
3. **Gartic Phone** — gros potentiel de fous rires, et le canevas de Scribble est déjà écrit.
4. **Cartes contre l'humanité (SFW)** — fort effet de groupe, moteur simple.
5. **Quiz emoji local** — supprime la dépendance internet du Quiz.

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
- [ ] `validateSettings()` ([server.js:30](server.js#L30)) — valider les réglages entrants
- [ ] `minPlayers()` ([server.js:68](server.js#L68)) — nombre minimum de joueurs
- [ ] `restartGame()` ([server.js:289](server.js#L289)) — ajouter `monjeu: startMonjeu` dans la map
- [ ] `handleAction()` ([server.js:297](server.js#L297)) — router vers `monjeuAction()`
- [ ] `sendReconnectState()` ([server.js:247](server.js#L247)) — état renvoyé après un refresh
- [ ] `onPlayerDisconnect()` ([server.js:344](server.js#L344)) — que se passe-t-il si un joueur part
- [ ] Nouvelle section `// ── MONJEU ──` : `startMonjeu`, `monjeuAction`, `monjeuPublic`, `endMonjeu`

### Client

- [ ] `public/index.html` — carte `<div class="game-card" data-game="monjeu">` (~ligne 22)
- [ ] `public/index.html` — vue `<div id="view-monjeu" class="view">`
- [ ] `public/index.html` — onglet règles `data-game="monjeu"` + `<div id="rules-monjeu">`
- [ ] `public/index.html` — `<script src="js/monjeu.js"></script>`
- [ ] `public/js/monjeu.js` — module avec `onState()` et les émissions d'actions
- [ ] `public/js/app.js` — schéma de settings (~ligne 78) et listeners socket (~ligne 647)
- [ ] `public/js/app.js` — ajouter le nom dans `gameNames` ([app.js:533](public/js/app.js#L533))

### Finition

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

## 💬 Espace de commentaires / retours des joueurs

Permettre à un joueur d'envoyer un retour **en quelques secondes, sans quitter la
partie** : un bug, une idée, « ce jeu est trop long », « le chrono du vote est trop
court ».

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

## ⚙️ Configuration par fichier `.env`

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

Chaque joueur choisit **sa propre langue d'interface**, sans que ça change quoi que ce
soit pour les autres. Deux personnes dans le même salon peuvent jouer, l'une en
français, l'autre en anglais.

### Ce qui est traduisible par joueur (côté client uniquement)

- [ ] Fichiers de langue `public/js/i18n/fr.json`, `en.json` — juste des paires clé/valeur
- [ ] Marquer les textes du HTML avec un attribut, ex. `<span data-i18n="lobby.waiting">`,
      puis une passe de remplacement au chargement et à chaque changement de langue
- [ ] Sélecteur de langue à côté du choix d'avatar, mémorisé dans `localStorage`
      comme le nom et l'avatar le sont déjà
- [ ] Traduire : accueil, lobby, réglages, boutons, notifications, écrans de fin
- [ ] Traduire les règles de la modale « How to Play » (le plus gros volume de texte)
- [ ] Noms des rôles Mongolpuri, couleurs UNO, libellés de score

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

### Notes

- Les messages poussés par le serveur (`notification`, « X a quitté la partie »)
  doivent devenir des **clés + paramètres** (`{key:'player.left', name:'Lucas'}`)
  et non des phrases toutes faites, sinon le serveur devrait connaître la langue de
  chaque socket.
- Commencer par `fr` et `en` ; la structure rend l'ajout d'une 3ᵉ langue trivial.
- L'interface est actuellement **en anglais en dur** dans le HTML : la première étape
  est l'extraction des chaînes, c'est là qu'est l'essentiel du travail.

---

## 🔧 Améliorations générales

- [ ] Notion d'**équipes** réutilisable (nécessaire pour Codenames, Time's Up, Scribble par équipes)
- [ ] Classement persistant entre parties d'une même soirée (au-delà de `sessionStats`)
- [ ] Sons et musique d'ambiance (activables/désactivables)
- [ ] Mode « soirée » : enchaîner plusieurs jeux avec un score global
- [ ] Bouton « jeu aléatoire » sur l'écran d'accueil
- [ ] Kick d'un joueur par l'hôte depuis le lobby
