/* Contrôle avant mise en production.
   Usage : npm run verif
   Sort en code 1 si un point bloquant n'est pas réglé.                        */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const { tous, un, pool } = require('../src/db');

let bloquants = 0, avertissements = 0;

const ok = m => console.log('  \x1b[32m✓\x1b[0m ' + m);
const alerte = m => { avertissements++; console.log('  \x1b[33m!\x1b[0m ' + m); };
const bloque = m => { bloquants++; console.log('  \x1b[31m✗\x1b[0m ' + m); };
const titre = t => console.log('\n\x1b[1m' + t + '\x1b[0m');

/* Mots de passe des comptes de démonstration : ils ne doivent pas survivre. */
const DEMO = [
  ['admin@cashevent.education', 'admin1234'],
  ['yasmine@cashevent.education', 'eleve1234'],
  ['mehdi@cashevent.education', 'eleve1234'],
  ['parent@cashevent.education', 'parent1234']
];

(async () => {
  console.log('\n\x1b[1mCashevent School — contrôle avant production\x1b[0m');

  /* ------------------------------ configuration ---------------------------- */
  titre('Configuration');

  if (config.env === 'production') ok('NODE_ENV = production');
  else alerte(`NODE_ENV = ${config.env} — passez à « production » dans .env avant d'ouvrir au public`);

  const secret = config.jwt.secret;
  if (secret === 'changez-cette-cle-en-production')
    bloque('JWT_SECRET est resté la valeur par défaut : toute session peut être forgée');
  else if (secret.length < 32)
    bloque(`JWT_SECRET ne fait que ${secret.length} caractères — visez au moins 32 caractères aléatoires`);
  else ok(`JWT_SECRET défini (${secret.length} caractères)`);

  if (config.db.user === 'root')
    alerte('La base est accédée avec « root » — créez un compte dédié limité à cashevent_school');
  else ok(`Compte MySQL dédié : ${config.db.user}`);

  if (!config.db.password && config.env === 'production')
    bloque('Le compte MySQL n’a pas de mot de passe');
  else if (!config.db.password)
    alerte('Le compte MySQL n’a pas de mot de passe (acceptable en local)');
  else ok('Mot de passe MySQL renseigné');

  const env = path.join(__dirname, '..', '..', '.env');
  const gitignore = path.join(__dirname, '..', '..', '.gitignore');
  if (fs.existsSync(gitignore) && fs.readFileSync(gitignore, 'utf8').includes('.env'))
    ok('.env est exclu du dépôt');
  else bloque('.env n’est pas listé dans .gitignore : vos identifiants risquent d’être publiés');

  /* --------------------------------- base ---------------------------------- */
  titre('Base de données');
  let tables = [];
  try {
    tables = (await tous(
      `SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`))
      .map(x => x.t);
    ok(`Connexion établie sur ${config.db.host}:${config.db.port}/${config.db.database}`);
  } catch (e) {
    bloque('Connexion impossible : ' + e.message);
    return terminer();
  }

  const attendues = ['utilisateurs', 'liens_famille', 'matieres', 'chapitres', 'notions', 'seances',
    'resume_lignes', 'tp_lignes', 'questions', 'options_reponse', 'progression', 'seances_vues',
    'tentatives_qcm', 'reponses_qcm', 'ma_liste', 'activite', 'journal'];
  const manquantes = attendues.filter(t => !tables.includes(t));
  if (manquantes.length) bloque('Tables manquantes : ' + manquantes.join(', ') + ' — lancez « npm run db:init »');
  else ok(`${attendues.length} tables présentes`);

  const colonnes = (await tous(
    `SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'seances'`)).map(x => x.c);
  if (colonnes.includes('video_url') && colonnes.includes('video_titre')) ok('Colonnes vidéo présentes');
  else bloque('Colonnes vidéo absentes — lancez « npm run contenu »');

  /* -------------------------------- contenu -------------------------------- */
  titre('Contenu pédagogique');
  const c = await un(`
    SELECT (SELECT COUNT(*) FROM matieres) AS matieres,
           (SELECT COUNT(*) FROM chapitres WHERE publie = 1) AS chapitres,
           (SELECT COUNT(*) FROM chapitres WHERE publie = 1 AND image IS NOT NULL) AS avecAffiche,
           (SELECT COUNT(*) FROM questions) AS questions,
           (SELECT COUNT(*) FROM seances) AS seances,
           (SELECT COUNT(*) FROM seances WHERE video_url IS NOT NULL) AS avecVideo,
           (SELECT COUNT(*) FROM tp_lignes WHERE type = 'corrige') AS corriges`);

  c.matieres ? ok(`${c.matieres} matières`) : bloque('Aucune matière : la base est vide');
  c.chapitres ? ok(`${c.chapitres} chapitres publiés`) : bloque('Aucun chapitre publié');

  if (c.avecAffiche === c.chapitres) ok(`${c.avecAffiche} affiches de chapitre`);
  else alerte(`${c.chapitres - c.avecAffiche} chapitre(s) sans affiche — « npm run contenu » les complète`);

  if (c.avecVideo === c.seances) ok(`${c.avecVideo} séances rattachées à une vidéo`);
  else alerte(`${c.seances - c.avecVideo} séance(s) sans vidéo — « npm run contenu » les complète`);

  ok(`${c.questions} questions de QCM, ${c.corriges} lignes de corrigé`);

  /* Un QCM mal formé bloque l'élève : on le détecte avant lui. */
  const malFormees = await tous(`
    SELECT q.id, q.chapitre_id, COUNT(o.id) AS options, SUM(o.correcte) AS bonnes
      FROM questions q LEFT JOIN options_reponse o ON o.question_id = q.id
     GROUP BY q.id, q.chapitre_id
    HAVING COUNT(o.id) < 2 OR SUM(o.correcte) <> 1`);
  if (malFormees.length)
    bloque(`${malFormees.length} question(s) sans réponse unique — ids : ` +
      malFormees.slice(0, 5).map(q => q.id).join(', '));
  else ok('Chaque question a exactement une bonne réponse');

  const affiches = path.join(__dirname, '..', '..', 'public', 'img', 'chapitres');
  if (fs.existsSync(affiches)) {
    const n = fs.readdirSync(affiches).filter(f => f.endsWith('.jpg')).length;
    const poids = fs.readdirSync(affiches)
      .reduce((s, f) => s + fs.statSync(path.join(affiches, f)).size, 0);
    ok(`${n} fichiers d'affiche sur le disque (${Math.round(poids / 1024 / 1024 * 10) / 10} Mo)`);
  } else alerte('Dossier des affiches absent — « npm run contenu » le recrée');

  /* -------------------------------- comptes -------------------------------- */
  titre('Comptes');
  const comptes = await tous('SELECT id, nom, email, role, actif, mot_de_passe FROM utilisateurs');
  const admins = comptes.filter(u => u.role === 'admin' && u.actif);
  admins.length ? ok(`${admins.length} administrateur(s) actif(s)`)
    : bloque('Aucun administrateur actif : plus personne ne pourra gérer la plateforme');

  let demoRestants = 0;
  for (const [email, mdp] of DEMO) {
    const u = comptes.find(x => x.email === email);
    if (u && bcrypt.compareSync(mdp, u.mot_de_passe)) demoRestants++;
  }
  if (demoRestants && config.env === 'production')
    bloque(`${demoRestants} compte(s) de démonstration ont encore leur mot de passe public`);
  else if (demoRestants)
    alerte(`${demoRestants} compte(s) de démonstration avec mot de passe public — à changer avant l'ouverture`);
  else ok('Aucun mot de passe de démonstration en circulation');

  const faibles = comptes.filter(u => u.mot_de_passe.length < 55);
  if (faibles.length) bloque(`${faibles.length} mot(s) de passe non hachés par bcrypt`);
  else ok('Tous les mots de passe sont hachés');

  /* ------------------------------- ressources ------------------------------ */
  titre('Ressources du serveur');
  const pages = ['accueil.html', 'connexion.html', 'inscription.html', 'ecole.html',
    'matieres.html', 'revisions.html', 'progression.html', 'espace-parent.html', 'admin.html',
    'a-propos.html', 'aide.html', 'contact.html', 'conditions.html', 'confidentialite.html',
    'mentions-legales.html', '404.html'];
  const absentes = pages.filter(p => !fs.existsSync(path.join(config.racinePublique, p)));
  absentes.length ? bloque('Pages absentes : ' + absentes.join(', ')) : ok(`${pages.length} pages présentes`);

  const feuilles = ['style.css', 'ecole.css', 'app.css', 'admin.css', 'accueil.css',
    'pages.css', 'mobile.css'];
  const cssAbsents = feuilles.filter(f => !fs.existsSync(path.join(config.racinePublique, 'css', f)));
  cssAbsents.length ? bloque('Feuilles absentes : ' + cssAbsents.join(', '))
    : ok(`${feuilles.length} feuilles de style présentes`);

  /* Les textes légaux doivent être complétés avant l'ouverture. */
  const legales = ['mentions-legales.html', 'conditions.html', 'confidentialite.html'];
  let aCompleter = 0;
  for (const f of legales) {
    const chemin = path.join(config.racinePublique, f);
    if (!fs.existsSync(chemin)) continue;
    aCompleter += (fs.readFileSync(chemin, 'utf8').match(/class="a-completer"/g) || []).length;
  }
  if (aCompleter && config.env === 'production')
    bloque(`${aCompleter} champ(s) à compléter dans les textes légaux (raison sociale, ICE, adresse…)`);
  else if (aCompleter)
    alerte(`${aCompleter} champ(s) à compléter dans les textes légaux — et faites-les relire`);
  else ok('Textes légaux complétés');

  if (fs.existsSync(path.join(config.racinePublique, 'robots.txt'))) ok('robots.txt présent');
  else alerte('robots.txt absent : les moteurs exploreront tout, espaces privés compris');

  terminer();
})().catch(e => { console.error('\n✗ ' + e.stack); process.exit(1); });

function terminer() {
  console.log('\n' + '─'.repeat(66));
  if (bloquants) {
    console.log(`\x1b[31m${bloquants} point(s) bloquant(s)\x1b[0m` +
      (avertissements ? ` et ${avertissements} avertissement(s)` : '') +
      ' — à régler avant la mise en production.\n');
  } else if (avertissements) {
    console.log(`\x1b[33mAucun point bloquant, ${avertissements} avertissement(s)\x1b[0m` +
      ' — lisez-les avant d’ouvrir au public.\n');
  } else {
    console.log('\x1b[32mTout est prêt pour la production.\x1b[0m\n');
  }
  pool.end().then(() => process.exit(bloquants ? 1 : 0));
}
