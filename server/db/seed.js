/* Peuplement : catalogue pédagogique + comptes de démonstration.
   Le catalogue est lu dans server/db/donnees/*.js (la source rédactionnelle). */
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const { pool, tous, un, executer, transaction } = require('../src/db');

/* Les fichiers de données s'attachent à `window` : on le simule côté Node. */
const chargerCatalogue = () => {
  global.window = {};
  delete require.cache[require.resolve('./donnees/ecole-data.js')];
  delete require.cache[require.resolve('./donnees/ecole-data-sciences.js')];
  delete require.cache[require.resolve('./donnees/ecole-data-lettres.js')];
  require('./donnees/ecole-data.js');
  require('./donnees/ecole-data-sciences.js');
  require('./donnees/ecole-data-lettres.js');
  return global.window.ECOLE.M;
};

const COMPTES = [
  { nom: 'Administration Cashevent', email: 'admin@cashevent.education', mdp: 'admin1234', role: 'admin' },
  { nom: 'Yasmine Alaoui', email: 'yasmine@cashevent.education', mdp: 'eleve1234', role: 'eleve' },
  { nom: 'Karim Alaoui', email: 'parent@cashevent.education', mdp: 'parent1234', role: 'parent' },
  { nom: 'Mehdi Benjelloun', email: 'mehdi@cashevent.education', mdp: 'eleve1234', role: 'eleve' }
];

/* Un mois de travail crédible pour l'élève de démonstration */
const DEMO = [
  ['maths', 1, 100], ['maths', 2, 88], ['maths', 3, 76], ['maths', 4, 92], ['maths', 5, 67],
  ['physique', 1, 95], ['physique', 2, 71], ['physique', 3, 83],
  ['chimie', 1, 79], ['chimie', 2, 64],
  ['svt', 1, 100], ['svt', 2, 85],
  ['histoire', 1, 90], ['histoire', 2, 74],
  ['philo', 1, 68],
  ['oeuvres', 1, 96], ['oeuvres', 2, 81],
  ['geographie', 1, 87]
];

const dateSQL = d => d.toISOString().slice(0, 19).replace('T', ' ');
const jourSQL = d => d.toISOString().slice(0, 10);

/* ---------------------------------------------------------------- catalogue */
async function insererCatalogue(cx, matieres) {
  let nbChap = 0, nbQ = 0;

  for (const [iM, m] of matieres.entries()) {
    const [rm] = await cx.query(
      `INSERT INTO matieres (code, nom, court, professeur, coefficient, teinte, teinte2, glyphe, label_formules, ordre)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [m.id, m.nom, m.court, m.prof, m.coef, m.teinte, m.teinte2, m.glyphe, m.labelFormules, iM]);
    const matiereId = rm.insertId;

    for (const [iC, c] of m.chapitres.entries()) {
      const [rc] = await cx.query(
        `INSERT INTO chapitres (matiere_id, numero, titre, duree, difficulte, accroche)
         VALUES (?,?,?,?,?,?)`,
        [matiereId, iC + 1, c.titre, c.duree, c.difficulte, c.accroche]);
      const chapitreId = rc.insertId;
      nbChap++;

      for (const [i, n] of c.notions.entries())
        await cx.query('INSERT INTO notions (chapitre_id, libelle, ordre) VALUES (?,?,?)', [chapitreId, n, i]);

      for (const [i, [titre, duree]] of c.seances.entries())
        await cx.query('INSERT INTO seances (chapitre_id, numero, titre, duree) VALUES (?,?,?,?)',
          [chapitreId, i + 1, titre, duree]);

      for (const [type, cle] of [['point', 'points'], ['formule', 'formules'], ['piege', 'pieges']])
        for (const [i, t] of c.resume[cle].entries())
          await cx.query('INSERT INTO resume_lignes (chapitre_id, type, texte, ordre) VALUES (?,?,?,?)',
            [chapitreId, type, t, i]);

      for (const [type, cle] of [['objectif', 'objectifs'], ['exercice', 'exercices'], ['corrige', 'corrige']])
        for (const [i, t] of c.tp[cle].entries())
          await cx.query('INSERT INTO tp_lignes (chapitre_id, type, texte, ordre) VALUES (?,?,?,?)',
            [chapitreId, type, t, i]);

      for (const [i, q] of c.qcm.entries()) {
        const [rq] = await cx.query(
          'INSERT INTO questions (chapitre_id, enonce, explication, ordre) VALUES (?,?,?,?)',
          [chapitreId, q.e, q.x, i]);
        nbQ++;
        for (const [j, texte] of q.o.entries())
          await cx.query('INSERT INTO options_reponse (question_id, texte, correcte, ordre) VALUES (?,?,?,?)',
            [rq.insertId, texte, j === q.i ? 1 : 0, j]);
      }
    }
  }
  return { nbMat: matieres.length, nbChap, nbQ };
}

/* ----------------------------------------------------------------- comptes */
async function insererComptes(cx) {
  const ids = {};
  for (const c of COMPTES) {
    const [r] = await cx.query(
      'INSERT INTO utilisateurs (nom, email, mot_de_passe, role, niveau) VALUES (?,?,?,?,?)',
      [c.nom, c.email, bcrypt.hashSync(c.mdp, 10), c.role, c.role === 'eleve' ? config.niveauParDefaut : null]);
    ids[c.email] = r.insertId;
  }
  /* Le parent suit les deux élèves */
  await cx.query('INSERT INTO liens_famille (parent_id, eleve_id) VALUES (?,?), (?,?)',
    [ids['parent@cashevent.education'], ids['yasmine@cashevent.education'],
     ids['parent@cashevent.education'], ids['mehdi@cashevent.education']]);
  return ids;
}

/* -------------------------------------------------------- progression démo */
async function insererProgressionDemo(cx, eleveId) {
  /* Les lectures doivent passer par la connexion de la transaction : le catalogue
     vient d'y être inséré et n'est pas encore visible depuis le pool. */
  const lire = async (sql, params = []) => (await cx.query(sql, params))[0];
  const lireUn = async (sql, params = []) => (await lire(sql, params))[0] || null;

  const chapitres = await lire(
    `SELECT c.id, c.numero, m.code FROM chapitres c JOIN matieres m ON m.id = c.matiere_id`);
  const cle = (code, numero) => chapitres.find(c => c.code === code && c.numero === numero);
  const jours = new Map();
  const compter = d => jours.set(jourSQL(d), (jours.get(jourSQL(d)) || 0) + 3);

  for (const [i, [code, numero, score]] of DEMO.entries()) {
    const ch = cle(code, numero); if (!ch) continue;
    const d = new Date(Date.now() - (32 - i * 1.7) * 864e5);

    await cx.query(
      `INSERT INTO progression (eleve_id, chapitre_id, resume_lu, tp_consulte, termine, maj)
       VALUES (?,?,1,?,1,?)`, [eleveId, ch.id, i % 3 !== 2 ? 1 : 0, dateSQL(d)]);

    const seances = await lire('SELECT id FROM seances WHERE chapitre_id = ?', [ch.id]);
    for (const s of seances)
      await cx.query('INSERT INTO seances_vues (eleve_id, seance_id, vu_le) VALUES (?,?,?)',
        [eleveId, s.id, dateSQL(d)]);

    const questions = await lire('SELECT id FROM questions WHERE chapitre_id = ? ORDER BY ordre', [ch.id]);
    const justes = Math.round(score / 100 * questions.length);
    const [rt] = await cx.query(
      `INSERT INTO tentatives_qcm (eleve_id, chapitre_id, total, justes, score, terminee, commencee_le, terminee_le)
       VALUES (?,?,?,?,?,1,?,?)`,
      [eleveId, ch.id, questions.length, justes, score, dateSQL(d), dateSQL(d)]);

    for (const [k, q] of questions.entries()) {
      const opts = await lire('SELECT id, correcte FROM options_reponse WHERE question_id = ? ORDER BY ordre', [q.id]);
      const bonne = opts.find(o => o.correcte);
      const choisie = k < justes ? bonne : (opts.find(o => !o.correcte) || bonne);
      await cx.query(
        'INSERT INTO reponses_qcm (tentative_id, question_id, option_id, correcte, repondu_le) VALUES (?,?,?,?,?)',
        [rt.insertId, q.id, choisie.id, choisie.correcte ? 1 : 0, dateSQL(d)]);
    }
    compter(d);
  }

  /* Deux chapitres en cours, dont un raté sur les probabilités */
  const proba = cle('maths', 8), rc = cle('physique', 5);
  if (proba) {
    const d = new Date(Date.now() - 2 * 864e5);
    await cx.query(`INSERT INTO progression (eleve_id, chapitre_id, resume_lu, tp_consulte, termine, maj)
                    VALUES (?,?,1,0,0,?)`, [eleveId, proba.id, dateSQL(d)]);
    const seances = await lire('SELECT id FROM seances WHERE chapitre_id = ? ORDER BY numero LIMIT 2', [proba.id]);
    for (const s of seances)
      await cx.query('INSERT INTO seances_vues (eleve_id, seance_id, vu_le) VALUES (?,?,?)', [eleveId, s.id, dateSQL(d)]);
    const questions = await lire('SELECT id FROM questions WHERE chapitre_id = ? ORDER BY ordre', [proba.id]);
    const [rt] = await cx.query(
      `INSERT INTO tentatives_qcm (eleve_id, chapitre_id, total, justes, score, terminee, commencee_le, terminee_le)
       VALUES (?,?,?,1,33,1,?,?)`, [eleveId, proba.id, questions.length, dateSQL(d), dateSQL(d)]);
    for (const [k, q] of questions.entries()) {
      const opts = await lire('SELECT id, correcte FROM options_reponse WHERE question_id = ? ORDER BY ordre', [q.id]);
      const choisie = k === 0 ? opts.find(o => o.correcte) : opts.find(o => !o.correcte);
      await cx.query('INSERT INTO reponses_qcm (tentative_id, question_id, option_id, correcte, repondu_le) VALUES (?,?,?,?,?)',
        [rt.insertId, q.id, choisie.id, choisie.correcte ? 1 : 0, dateSQL(d)]);
    }
    compter(d);
  }
  if (rc) {
    const d = new Date(Date.now() - 4 * 864e5);
    await cx.query(`INSERT INTO progression (eleve_id, chapitre_id, resume_lu, tp_consulte, termine, maj)
                    VALUES (?,?,0,0,0,?)`, [eleveId, rc.id, dateSQL(d)]);
    const s = await lireUn('SELECT id FROM seances WHERE chapitre_id = ? ORDER BY numero LIMIT 1', [rc.id]);
    await cx.query('INSERT INTO seances_vues (eleve_id, seance_id, vu_le) VALUES (?,?,?)', [eleveId, s.id, dateSQL(d)]);
    compter(d);
  }

  /* Ma liste */
  const liste = [cle('maths', 7), cle('chimie', 4)].filter(Boolean);
  for (const c of liste)
    await cx.query('INSERT INTO ma_liste (eleve_id, chapitre_id) VALUES (?,?)', [eleveId, c.id]);

  for (const [j, n] of jours)
    await cx.query('INSERT INTO activite (eleve_id, jour, actions) VALUES (?,?,?) ' +
      'ON DUPLICATE KEY UPDATE actions = actions + VALUES(actions)', [eleveId, j, n]);
}

/* -------------------------------------------------------------------------- */
/* « fermer » vaut false quand le peuplement est lancé par le serveur
   lui-même au démarrage : le pool doit alors rester ouvert. */
module.exports = async ({ reset = false, fermer = true } = {}) => {
  const dejaLa = await un('SELECT COUNT(*) AS n FROM matieres');
  if (dejaLa.n > 0 && !reset) {
    console.log('· catalogue déjà présent (' + dejaLa.n + ' matières) — peuplement ignoré');
    console.log('  Utilisez `npm run db:reset` pour repartir de zéro.');
    if (fermer) await pool.end();
    return;
  }

  const matieres = chargerCatalogue();

  await transaction(async cx => {
    const c = await insererCatalogue(cx, matieres);
    console.log(`· catalogue importé : ${c.nbMat} matières, ${c.nbChap} chapitres, ${c.nbQ} questions`);

    const ids = await insererComptes(cx);
    console.log('· 4 comptes créés (admin, parent, 2 élèves)');

    await insererProgressionDemo(cx, ids['yasmine@cashevent.education']);
    console.log('· progression de démonstration pour Yasmine (un mois de travail)');
  });

  console.log('\nComptes de démonstration');
  console.log('  admin   admin@cashevent.education    / admin1234');
  console.log('  élève   yasmine@cashevent.education  / eleve1234');
  console.log('  parent  parent@cashevent.education   / parent1234');
  console.log('\nChangez ces mots de passe dès la première connexion.\n');
  if (fermer) await pool.end();
};
