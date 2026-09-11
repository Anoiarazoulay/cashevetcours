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

| Rôle | Adresse | Mot de passe |
|---|---|---|
| Élève | `yasmine@cashevent.ma` | `eleve1234` |
| Élève (compte vierge) | `mehdi@cashevent.ma` | `eleve1234` |
| Parent | `parent@cashevent.ma` | `parent1234` |
| Administrateur | `admin@cashevent.ma` | `admin1234` |

Le compte de Yasmine contient un mois de travail : 18 chapitres terminés, 19 QCM passés,
une difficulté marquée sur les probabilités. Le parent suit les deux élèves.

---

## La vitrine

`/` conduit un visiteur vers `accueil.html` : bandeau plein écran sur un mur de vignettes de
matières construit en CSS, sections alternées présentant les quatre briques du produit, grille
des huit matières, questions fréquentes et saisie d'e-mail. `connexion.html` et
`inscription.html` reprennent les mêmes codes : carte sombre centrée sur le mur de vignettes,
champs à étiquette flottante, bouton rouge.

Un compte déjà connecté qui demande ces trois pages est renvoyé vers son espace.

## Les trois espaces

### Élève — `/ecole.html`, `/matieres.html`, `/revisions.html`, `/progression.html`

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

### Parent — `/espace-parent.html`

Le parent choisit l'enfant à consulter (le plus actif est proposé en premier), puis voit :

- quatre tuiles lisibles en dix secondes : progression sur le programme, QCM réalisés, moyenne, chapitres à revoir ;
- des alertes contextuelles : inactivité, palier franchi, objectif hebdomadaire, matière fragile
  avec le chapitre concerné et une recommandation d'exercices ;
- le rythme des 14 derniers jours et la projection de la date de fin du programme ;
- la progression matière par matière, et le détail des chapitres à revoir.

Le ton compte ce qui est accompli, jamais ce qui a manqué : la seule alerte négative est
l'inactivité, formulée comme une relance. Un parent ne voit que les élèves qui lui sont rattachés.

### Administration — `/admin.html`

Quatre onglets :

- **Tableau de bord** — comptes, élèves actifs sur 7 jours, volume du catalogue, moyenne générale
  aux QCM, et les chapitres les plus ratés (là où le contenu mérite d'être retravaillé) ;
- **Utilisateurs** — recherche et filtre par rôle, création, modification, activation/désactivation,
  suppression, et gestion des liens parent ↔ élève ;
- **Catalogue** — matières et chapitres : création, édition complète du contenu (notions, séances,
  résumé, TP) et édition du questionnaire, avec contrôle d'une bonne réponse unique ;
- **Suivi des élèves** — la progression réelle de chaque élève, avec ses alertes ;
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
    routes/                 auth · catalogue · progression · parent · admin
  db/
    schema.sql              16 tables
    init.js                 création de la base + schéma + peuplement
    seed.js                 import du catalogue et comptes de démonstration
    donnees/                source rédactionnelle : 8 matières, 48 chapitres, 144 questions
public/
  accueil.html              vitrine publique (hero, sections, matières, FAQ)
  connexion.html            « S'identifier »
  inscription.html          création de compte (élève ou parent)
  ecole.html · matieres.html · revisions.html      espace élève
  espace-parent.html                               espace parent
  admin.html                                       administration
  css/  style.css · ecole.css · app.css · admin.css · accueil.css
  js/   api.js · entete.js · ecole.js · parent.js · admin.js · connexion.js · accueil.js
```

### Règles métier

L'avancement d'un chapitre combine les séances visionnées (50 %), le résumé lu (10 %),
le QCM passé (25 %) et le TP téléchargé (15 %). Un chapitre bascule « à revoir » quand le
dernier score au QCM descend sous 60 %. Ces valeurs sont regroupées dans `server/src/config.js`.

Ces calculs vivent dans un seul service : l'élève, le parent et l'administration lisent
exactement les mêmes chiffres.

### Sécurité

- Mots de passe hachés avec bcrypt, session par jeton JWT dans un cookie `httpOnly`.
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
| PATCH | `/api/auth/motdepasse` | connecté | changer son mot de passe |
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
