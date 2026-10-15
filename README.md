# Cashevent School

Plateforme de révision pour le baccalauréat : cours de répétition en vidéo, QCM assistés par IA,
travaux pratiques corrigés, résumés écrits — avec trois espaces distincts (**élève**, **parent**,
**administration**).

Application Node.js / Express, base MySQL (ou MariaDB), interface HTML/CSS/JS sans framework.

---

## Démarrage

```bash
npm install
cp .env.example .env      # renseigner les identifiants MySQL
npm run db:init           # crée la base, applique le schéma, importe le catalogue
npm start                 # http://localhost:3000
```

`npm run verif` contrôle que tout est en ordre avant d'ouvrir au public.
`npm run db:reset` supprime la base et repart d'un jeu de données propre.
`npm run contenu` rattache à chaque séance un vrai cours en vidéo et télécharge les affiches
(ajouter `-- --force` pour tout refaire). `npm run dev` relance le serveur à chaque modification.

### Base de données

Le fichier `.env` est actuellement configuré sur **MariaDB de WampServer, port 3307**, avec
`root` sans mot de passe. Pour utiliser MySQL 8 (port 3306), il suffit de changer `DB_PORT`
et `DB_PASSWORD` — aucune autre modification n'est nécessaire, le schéma est compatible
avec les deux.

Démarrez le service depuis l'icône WampServer avant `npm run db:init`.

### Comptes de démonstration

Chaque rôle a sa propre page de connexion ; `/connexion` propose de choisir. Le serveur refuse
un compte qui se présente sur la page d'un autre rôle (un élève sur `/connexion/admin`, par exemple).

| Rôle | Page de connexion | Adresse | Mot de passe |
|---|---|---|---|
| Élève | `/connexion/eleve` | `yasmine@cashevent.education` | `eleve1234` |
| Élève (compte vierge) | `/connexion/eleve` | `mehdi@cashevent.education` | `eleve1234` |
| Parent | `/connexion/parent` | `parent@cashevent.education` | `parent1234` |
| Enseignant | `/connexion/enseignant` | — (créé à l'inscription ou par l'administration) | |
| Administrateur | `/connexion/admin` | `admin@cashevent.education` | `admin1234` |

Le compte de Yasmine contient un mois de travail : 18 chapitres terminés, 19 QCM passés,
une difficulté marquée sur les probabilités. Le parent suit les deux élèves.

---

## Pages publiques et référencement

Sept pages sont accessibles sans compte et indexables :

| Adresse | Rôle |
|---|---|
| `/accueil` | la vitrine : bandeau, sections, matières, questions fréquentes |
| `/a-propos` | la méthode, le contenu d'un chapitre, le parti pris sur le suivi parental |
| `/aide` | centre d'aide : usage de la plateforme, comptes, problèmes techniques |
| `/contact` | formulaire de contact, relié à la base et lisible depuis l'administration |
| `/conditions` | conditions d'utilisation |
| `/confidentialite` | politique de confidentialité |
| `/mentions-legales` | éditeur, hébergement, propriété intellectuelle, signalement |

### Inscription

Le formulaire se déroule en deux étapes : le compte (rôle, nom, e-mail, mot de passe), puis la
fiche (date de naissance, téléphone, lycée, filière, ville, code postal, pays). Un mur de champs
décourage ; deux écrans courts se remplissent.

L'âge n'est pas stocké : il est recalculé à l'affichage à partir de la date de naissance, seule
source de vérité. La filière et le lycée ne sont demandés qu'aux élèves, et un parent voit à la
place le champ de rattachement de son enfant.

Chaque étape est validée avant de laisser passer à la suivante, et le serveur revérifie tout :
date plausible (entre 5 et 100 ans), téléphone d'au moins huit chiffres, ville et pays
renseignés. L'administration affiche la fiche dans la liste des comptes, et le journal en
conserve un résumé.

### Adresses

Les pages se servent **sans extension** : `/contact`, pas `/contact.html`. L'ancienne forme
existe encore et renvoie en 301 vers la nouvelle, pour ne casser ni un signet ni un lien
déjà partagé. Le plan du site, les adresses canoniques et `robots.txt` emploient tous la
forme courte.

### Pied de page

Un seul pied pour tout le site — pages publiques et espaces connectés — construit par
`public/js/pied.js`. Il se pose tout seul sur les pages qui portent `<div id="pied"></div>`,
et les espaces connectés l'appellent après avoir monté leur interface. Ajouter ou renommer
un lien se fait à un seul endroit. L'en-tête des pages publiques vient de
`public/js/public.js`, celui des espaces connectés de `public/js/entete.js`.

### Référencement

Chaque page publique porte un titre distinct, une description, une adresse canonique et des
balises Open Graph. Les espaces connectés portent `noindex,nofollow`.

`robots.txt` autorise les pages publiques et écarte les espaces privés, l'API et les anciennes
maquettes. `/sitemap.xml` est généré à la demande : l'adresse du site est lue dans la requête,
donc le plan reste juste quel que soit le domaine servi.

Deux jeux de données structurées : `EducationalOrganization` et `WebSite` sur la vitrine,
`FAQPage` sur le centre d'aide.

### Textes légaux

Les trois pages légales sont des **modèles de départ**. Les informations que seul l'éditeur peut
fournir — raison sociale, ICE, RC, adresse, hébergeur, numéro CNDP — apparaissent surlignées à
l'écran. `npm run verif` les compte : simple avertissement en développement, point bloquant en
production. Faites relire ces textes par un conseil juridique avant l'ouverture.

## La vitrine

`/` conduit un visiteur vers `accueil.html` : bandeau plein écran sur un mur de vignettes de
matières construit en CSS, sections alternées présentant les quatre briques du produit, grille
des huit matières, questions fréquentes et saisie d'e-mail. `connexion.html` et
`inscription.html` reprennent les mêmes codes : carte sombre centrée sur le mur de vignettes,
champs à étiquette flottante, bouton rouge.

Un compte déjà connecté qui demande ces trois pages est renvoyé vers son espace.

## Les trois espaces

### Élève — `/ecole`, `/matieres`, `/revisions`, `/progression`

L'accueil reprend le principe des interfaces de streaming : un bandeau « reprendre le cours »,
puis une rangée par matière dont chaque carte est un chapitre. Le clic ouvre la fiche du chapitre,
qui réunit les cinq briques du produit :

| Repère | Élément |
|---|---|
| 1 | Cours de répétition en vidéo — un vrai cours YouTube par séance, lu dans la fiche |
| 2 | QCM assisté par IA — correction et explication à chaque question, bilan et recommandations |
| 3 | TP à télécharger — fichier `.txt` généré par le serveur : objectifs, rappel de cours, énoncé, corrigé, pièges |
| 4 | Résumé écrit — points clés, formules, pièges fréquents |
| 5 | Séances du chapitre — le découpage vidéo, coché au fur et à mesure |

L'accueil affiche aussi un **Top 10 des chapitres les plus travaillés**, classé d'après
l'activité réelle de tous les élèves — séances visionnées et QCM passés.

« Mes révisions » regroupe les chapitres à revoir (dernier score sous 60 %), ceux à terminer,
la liste mise de côté et les prochaines étapes suggérées.

« Ma progression » donne à l'élève la même lecture que celle du parent, mais adressée à lui :
programme parcouru, moyenne, série de jours travaillés, date prévisionnelle d'arrivée,
progression matière par matière et chapitres à reprendre.

### Le projet de l'élève : futur métier et parcours de rattrapage

Deux chaînes complètes, de l'élève au parent :

- **Choix du futur métier.** Quatorze métiers (astronaute, médecin, ingénieur, avocat…), chacun
  rattaché aux chapitres qui comptent pour lui avec un poids (essentiel, important, utile) et une
  raison. Activé, le métier *illumine* le programme : les cartes des chapitres visés portent un
  badge doré, les autres s'estompent, une rangée « Pour devenir … » ouvre l'accueil, et la fiche
  du chapitre dit pourquoi il compte. Désactivé, tout redevient normal ; le choix reste enregistré.
  Le parent voit le projet et l'avancement sur ses chapitres essentiels.
- **Parcours de rattrapage.** Lacune détectée (QCM sous 60 %, ou l'élève qui le demande depuis la
  fiche du chapitre) → les **prérequis des classes antérieures** (collège, tronc commun, 1ʳᵉ année
  Bac) : une fiche par prérequis, cinq minutes de lecture (pourquoi, points à retenir, exemple,
  pièges) et une mini-évaluation de trois questions, validée à deux bonnes réponses → quand tout est
  validé, l'élève **refait le QCM du chapitre** : au-dessus du seuil, la lacune est comblée. Le
  parent reçoit l'alerte (« Lacune comblée sur … : de 33 % à 100 % »), l'enseignant référent voit
  les parcours de sa matière dans le dossier de l'élève.

Le contenu vit dans `server/db/donnees/metiers.js` et `server/db/donnees/prerequis.js` :
14 métiers, 194 rattachements, **96 fiches de prérequis et 288 questions** couvrant les 48
chapitres. Il s'applique au démarrage du serveur (`server/db/projet.js`), donc aussi en ligne.

### Parent — `/espace-parent`

Le parent choisit l'enfant à consulter (le plus actif est proposé en premier), puis voit :

- quatre tuiles lisibles en dix secondes : progression sur le programme, QCM réalisés, moyenne, chapitres à revoir ;
- des alertes contextuelles : inactivité, palier franchi, objectif hebdomadaire, matière fragile
  avec le chapitre concerné et une recommandation d'exercices ;
- le rythme des 14 derniers jours et la projection de la date de fin du programme ;
- la progression matière par matière, et le détail des chapitres à revoir.

Le ton compte ce qui est accompli, jamais ce qui a manqué : la seule alerte négative est
l'inactivité, formulée comme une relance. Un parent ne voit que les élèves qui lui sont rattachés.

### Enseignant référent — `/espace-enseignant`

Pensé pour suivre de cent à mille élèves, et pour gérer tout ce qui concerne un élève dans
la matière où il a désigné l'enseignant :

- **Tableau de bord** — huit tuiles (élèves suivis, suivis du mois, rémunération, priorités,
  actifs sur 7 jours, QCM passés, messages lus, TP téléchargés), la classe d'un coup d'œil
  (chaque segment s'ouvre dans « Mes élèves »), la répartition de la progression et des
  moyennes aux QCM, les suivis du mois par état, l'activité des huit dernières semaines
  (élèves actifs, QCM passés, moyenne), les élèves à suivre en priorité, un palmarès
  (en tête / décrochages), les chiffres par matière, les classes, la **carte des chapitres**
  (commencé, terminé, moyenne, à revoir, chapitre par chapitre), les notions difficiles et
  l'historique des rémunérations.
- **Mes élèves** — recherche par nom, filtres par matière, filière, classe et état (avec
  effectifs), tri par priorité, progression, moyenne ou inactivité, pagination par 50, export
  tableur (CSV, avec les classes).
- **Mes classes** — l'enseignant compose ses groupes parmi les élèves qui l'ont désigné : une
  classe de lycée, un groupe de soutien, une matière. Chaque classe a ses chiffres, sa tournée
  de suivis, son export et l'envoi de TP à tout le groupe. Un élève se place aussi dans une
  classe depuis son dossier.
- **Dossier d'un élève** — tout ce qui le concerne dans la matière : les raisons de le regarder,
  ses chiffres, le suivi du mois, sa place par rapport au groupe (progression, moyenne, rang),
  l'activité des huit dernières semaines, la courbe de tous ses QCM, les notions à retravailler,
  les chapitres, les TP reçus (téléchargés ou non), la chronologie de ses derniers gestes,
  le **carnet** de l'enseignant (notes personnelles, invisibles pour l'élève et l'administration),
  ses classes, et les suivis passés avec leur état de lecture.
- **Tournée** — enchaîne les dossiers de la sélection sans suivi : l'enseignant lit le dossier,
  choisit l'état (touches 1, 2, 3), relit le message proposé à partir des chapitres ratés et de
  l'inactivité, puis Ctrl + Entrée enregistre et ouvre l'élève suivant. Rien n'est coché d'avance :
  chaque suivi exige toujours l'ouverture du dossier dans le mois.
- **TP** — envoi à tous ses élèves de la matière, aux seuls élèves signalés, à une classe, ou à
  une sélection filtrable ; taux de téléchargement par envoi.

La progression de tous les élèves d'un enseignant se calcule en cinq requêtes
(`progression.lignesEnseignant`), quel que soit leur nombre : le tableau de bord complet
répond en 0,2 s pour mille élèves, le dossier d'un élève en 0,1 s.

### Administration — `/admin`

Quatre onglets :

- **Tableau de bord** — comptes, élèves actifs sur 7 jours, volume du catalogue, moyenne générale
  aux QCM, et les chapitres les plus ratés (là où le contenu mérite d'être retravaillé) ;
- **Utilisateurs** — recherche et filtre par rôle, création, modification, activation/désactivation,
  suppression, et gestion des liens parent ↔ élève ;
- **Catalogue** — matières et chapitres : création, édition complète du contenu (notions, séances,
  résumé, TP) et édition du questionnaire, avec contrôle d'une bonne réponse unique ;
- **Suivi des élèves** — la progression réelle de chaque élève, avec ses alertes ;
- **Messages** — les demandes reçues par le formulaire de contact, filtrables sur celles qui
  restent à traiter, avec réponse en un clic par courriel ;
- **Journal** — la trace des actions : connexions (réussies et refusées), comptes, catalogue,
  apprentissage. Filtres par catégorie, recherche, affichage des échecs seuls, pagination.

---

## Architecture

```
server/
  src/
    config.js               configuration (.env), pondérations, seuils
    db.js                   pool MySQL, aides de requête, transactions
    app.js                  Express : API, pages protégées, erreurs
    index.js                démarrage, vérification de la base, arrêt propre
    middleware/auth.js      JWT en cookie httpOnly, contrôle des rôles
    services/catalogue.js   lecture du catalogue, génération du document de TP
    services/progression.js avancement, statistiques, alertes, projection
    services/suivi.js       enseignants référents : suivis, classes, carnet, statistiques
    services/projet.js      futur métier de l'élève et progression sur ses chapitres
    services/rattrapage.js  parcours de rattrapage : prérequis, mini-évaluations, validation
    outils/verification.js  contrôle avant mise en production
    routes/                 auth · catalogue · progression · parent · admin · enseignant · professeurs · projet
  db/
    schema.sql              18 tables
    migrations.js           tables et colonnes ajoutées après coup (enseignants, classes,
                            carnet…), appliquées au démarrage, relançables sans risque
    init.js                 création de la base + schéma + peuplement
    seed.js                 import du catalogue et comptes de démonstration
    donnees/                source rédactionnelle : 8 matières, 48 chapitres, 144 questions,
                            14 métiers, 96 fiches de prérequis (288 questions)
public/
  accueil.html              vitrine publique (hero, sections, matières, FAQ)
  connexion.html            « S'identifier »
  inscription.html          création de compte (élève ou parent)
  ecole.html · matieres.html · revisions.html      espace élève
  espace-parent.html                               espace parent
  admin.html                                       administration
  css/  style.css · ecole.css · app.css · admin.css · accueil.css
  js/   api.js · entete.js · public.js · pied.js · ecole.js · parent.js · progression.js
        admin.js · connexion.js · accueil.js · contact.js
```

### Règles métier

L'avancement d'un chapitre combine les séances visionnées (50 %), le résumé lu (10 %),
le QCM passé (25 %) et le TP téléchargé (15 %). Un chapitre bascule « à revoir » quand le
dernier score au QCM descend sous 60 %. Ces valeurs sont regroupées dans `server/src/config.js`.

Ces calculs vivent dans un seul service : l'élève, le parent et l'administration lisent
exactement les mêmes chiffres.

### Sécurité

- Mots de passe hachés avec bcrypt (coût 12), session par jeton JWT dans un cookie `httpOnly`,
  `SameSite=Lax`, `Secure` en production.
- **Politique de mots de passe** (`services/securite.js`) : huit caractères au moins, deux familles
  de caractères, rien de trop courant, ni l'adresse e-mail ni le nom. Appliquée à l'inscription, au
  changement et aux comptes créés par l'administration.
- **Frein par compte** : cinq échecs de connexion en un quart d'heure bloquent le compte un quart
  d'heure, en plus de la limite par adresse IP. Le message et le temps de réponse sont les mêmes
  pour une adresse inconnue et un mauvais mot de passe.
- **Sessions révocables** : le jeton porte un numéro de session ; changer de mot de passe, ou être
  désactivé, ferme toutes les autres sessions du compte.
- **Mot de passe à changer** : un mot de passe posé par quelqu'un d'autre (administration, compte
  de démonstration encore public en production) doit être remplacé à la connexion suivante ; tout
  le reste de l'API reste fermé jusque-là (`/mot-de-passe`).
- **Origine contrôlée** : une requête qui modifie des données doit venir du site lui-même
  (`Origin` et `Sec-Fetch-Site`), en plus du cookie `SameSite`.
- En-têtes : politique de sécurité du contenu avec nonce, `Permissions-Policy`, `Referrer-Policy`,
  HSTS en production, aucune mise en cache des pages.
- Les bonnes réponses ne quittent jamais le serveur avant que l'élève ait répondu :
  le QCM ouvre une tentative, chaque réponse est corrigée côté serveur, le score est calculé
  à partir des réponses enregistrées.
- Chaque route vérifie le rôle ; un parent est en plus contrôlé sur le lien de filiation.
- Les pages sont redirigées vers la connexion si le rôle ne correspond pas, mais c'est bien
  l'API qui fait autorité.

---

## Mise en production

```bash
cp .env.production.example .env     # puis renseigner chaque valeur
npm ci --omit=dev
npm run db:init
npm run verif                       # contrôle complet, sort en erreur si un point bloque
npm run prod
```

`npm run verif` vérifie la configuration (secret de session, compte MySQL dédié, `.env` exclu
du dépôt), la base (17 tables, colonnes vidéo), le contenu (affiches, vidéos, questions à
réponse unique), les comptes (au moins un administrateur, aucun mot de passe de démonstration
en circulation, hachage bcrypt) et les fichiers servis. Les points bloquants font sortir le
script en code 1, ce qui permet de l'enchaîner dans un script de déploiement.

### Ce que `NODE_ENV=production` change

- **Sessions** : le cookie passe en `secure` — servez le site en HTTPS, sinon plus personne
  ne pourra se connecter.
- **En-têtes** : HSTS sur six mois et `upgrade-insecure-requests` s'ajoutent à la politique
  de sécurité du contenu.
- **Limites de débit** : 20 tentatives de connexion et 1 000 requêtes d'API par quart d'heure
  et par adresse. Désactivées en développement pour ne pas gêner les tests.
- **Cache** : les fichiers versionnés (`?v=…`) et les images sont gardés un an côté navigateur ;
  le HTML n'est jamais mis en cache.
- **Erreurs** : la pile n'est plus renvoyée au client, seule la ligne de journal la conserve.

### Derrière un reverse proxy

`app.set('trust proxy', 1)` est activé en production : l'adresse réelle du visiteur est lue
dans `X-Forwarded-For`, ce dont dépendent les limites de débit et le journal. Terminez le TLS
sur Nginx ou Caddy et transmettez `X-Forwarded-For` et `X-Forwarded-Proto`.

### Sécurité du contenu

La politique CSP n'autorise aucun script en ligne anonyme : les rares scripts intégrés aux
pages reçoivent un *nonce* recalculé à chaque requête. Les sources externes admises se
limitent aux polices Google, aux miniatures `ytimg.com` et aux lecteurs YouTube.

### Avant l'ouverture

Changez les mots de passe des quatre comptes de démonstration, ou supprimez-les depuis
l'administration : `npm run verif` bloque si l'un d'eux est encore public en production.

---

## API

| Méthode | Route | Rôle | Objet |
|---|---|---|---|
| POST | `/api/auth/inscription` | — | créer un compte élève ou parent |
| POST | `/api/auth/connexion` | — | ouvrir une session |
| POST | `/api/auth/deconnexion` | — | fermer la session |
| GET | `/api/auth/moi` | connecté | profil courant |
| PATCH | `/api/auth/motdepasse` | connecté | changer son mot de passe (ferme les autres sessions) |
| GET | `/api/catalogue` | connecté | matières et chapitres |
| GET | `/api/chapitres/:id` | connecté | fiche complète (sans les réponses) |
| GET | `/api/chapitres/:id/tp` | connecté | télécharger le TP corrigé |
| POST | `/api/chapitres/:id/qcm` | élève | ouvrir une tentative |
| POST | `/api/qcm/:tentative/reponse` | élève | répondre, obtenir la correction |
| POST | `/api/qcm/:tentative/terminer` | élève | score, appréciation, recommandations |
| GET | `/api/progression` | élève | état complet |
| GET | `/api/progression/stats` · `/tableau-bord` | élève | statistiques, tableau de bord |
| POST | `/api/progression/seance` · `/resume` · `/termine` | élève | enregistrer une avancée |
| POST/DELETE | `/api/progression/liste/:id` | élève | ma liste |
| GET | `/api/parent/enfants` | parent, admin | enfants suivis et aperçu |
| GET | `/api/parent/enfants/:id/tableau-bord` | parent, admin | tableau de bord d'un enfant |
| POST/DELETE | `/api/parent/enfants` | parent | rattacher / détacher un enfant |
| GET | `/api/admin/tableau-bord` | admin | vue d'ensemble |
| GET/POST/PATCH/DELETE | `/api/admin/utilisateurs` | admin | gestion des comptes |
| GET/POST/DELETE | `/api/admin/liens` | admin | liens parent ↔ élève |
| GET/POST/PATCH/DELETE | `/api/admin/matieres` · `/chapitres` | admin | catalogue |
| PUT | `/api/admin/chapitres/:id/questions` | admin | questionnaire |
| GET | `/api/admin/eleves/:id/tableau-bord` | admin | suivi d'un élève |
| GET | `/api/enseignant/tableau-bord` | enseignant | statistiques complètes, classes, carte des chapitres |
| GET | `/api/enseignant/eleves` | enseignant | une ligne par élève et par matière, avec ses classes |
| GET | `/api/enseignant/eleves/:id/matieres/:m` | enseignant | dossier complet (ouverture consignée) |
| POST | `/api/enseignant/eleves/:id/matieres/:m/suivi` | enseignant | enregistrer le suivi du mois |
| POST/DELETE | `/api/enseignant/eleves/:id/matieres/:m/notes` · `/notes/:id` | enseignant | carnet |
| GET/POST/PATCH/DELETE | `/api/enseignant/classes` | enseignant | classes et leurs chiffres |
| POST/DELETE | `/api/enseignant/classes/:id/eleves` | enseignant | composer une classe |
| GET/POST/DELETE | `/api/enseignant/tp` | enseignant | TP envoyés (à tous, une classe, une sélection) |
| GET/PUT | `/api/enseignant/profil` · `/profil/matieres` | enseignant | code et matières enseignées |
| GET | `/api/professeurs/code/:code` | — | retrouver un enseignant par son code |
| GET/PUT | `/api/metiers` · `/metiers/mien` | élève | les métiers, choisir et activer le sien |
| GET | `/api/metiers/mien/progression` | élève | avancement sur les chapitres du métier |
| GET | `/api/rattrapage` · `/rattrapage/:id` | élève | mes parcours, le détail d'un parcours |
| GET/POST | `/api/rattrapage/chapitre/:id` | élève | prérequis d'un chapitre, lancer un parcours |
| GET/POST | `/api/rattrapage/:id/etapes/:prerequisId` | élève | lire une fiche, répondre à sa mini-évaluation |
| POST | `/api/rattrapage/:id/abandonner` | élève | abandonner un parcours |
| GET/PUT | `/api/professeurs/mes` | élève | désigner ses professeurs référents |
| GET | `/api/catalogue/populaires` | connecté | classement des chapitres les plus travaillés |
| POST | `/api/contact` | — | déposer un message depuis le formulaire public |
| GET/PATCH/DELETE | `/api/contact/messages` | admin | lire et traiter les messages reçus |

---

## Contenu réel

Les séances ne sont pas des libellés : chacune renvoie à un vrai cours en vidéo, trouvé par
`server/db/contenu.js` sur YouTube à partir du titre du chapitre et de sa matière. Le script
retient les vidéos de 4 à 120 minutes, enregistre leur titre, leur chaîne et leur durée réelle,
puis télécharge la miniature du premier cours dans `public/img/chapitres/` — c'est l'affiche
du chapitre, visible sur les cartes et le bandeau d'accueil.

À ce jour : **192 séances rattachées à une vidéo et 48 affiches**, de chaînes comme
Yvan Monka, jaicompris Maths, Math & Phys ou Prof Fouad. La vidéo se lit directement dans la
fiche du chapitre, et le visionnage compte dans la progression.

## Contenu pédagogique

Programme de 2ᵉ année Baccalauréat — Sciences : mathématiques, physique, chimie, SVT, histoire,
géographie, philosophie et œuvres au programme. 48 chapitres, chacun avec son accroche, ses
notions, ses séances vidéo, son résumé (points clés, formules, pièges), son QCM expliqué
et son TP corrigé — soit 144 questions rédigées.

La source rédactionnelle reste `server/db/donnees/*.js`, importée en base au peuplement.
Une fois en base, tout se modifie depuis l'administration.
