/* Catalogue, fiche chapitre, TP téléchargeable et moteur de QCM */
const express = require('express');
const config = require('../config');
const { tous, un, executer, transaction } = require('../db');
const { requiert } = require('../middleware/auth');
const cat = require('../services/catalogue');
const prog = require('../services/progression');
const journal = require('../services/journal');

const routeur = express.Router();
const idValide = v => Number.isInteger(Number(v)) && Number(v) > 0;

/* GET /api/catalogue/public — vitrine : uniquement les matières et leur volume */
routeur.get('/catalogue/public', async (_req, res) => {
  const [matieres, affiches, chiffres] = await Promise.all([
    tous(`SELECT m.nom, m.court, m.teinte, m.teinte2, m.glyphe,
                 (SELECT COUNT(*) FROM chapitres c WHERE c.matiere_id = m.id AND c.publie = 1) AS chapitres,
                 (SELECT c.image FROM chapitres c
                   WHERE c.matiere_id = m.id AND c.publie = 1 AND c.image IS NOT NULL
                   ORDER BY c.numero LIMIT 1) AS image
            FROM matieres m ORDER BY m.ordre, m.id`),
    /* Les affiches alimentent le mur de vignettes de la page d'accueil. */
    tous(`SELECT c.image, c.titre, m.teinte, m.teinte2, m.glyphe
            FROM chapitres c JOIN matieres m ON m.id = c.matiere_id
           WHERE c.publie = 1 AND c.image IS NOT NULL
           ORDER BY m.ordre, c.numero`),
    un(`SELECT (SELECT COUNT(*) FROM chapitres WHERE publie = 1) AS chapitres,
               (SELECT COUNT(*) FROM questions) AS questions,
               (SELECT COUNT(*) FROM seances WHERE video_url IS NOT NULL) AS videos`)
  ]);
  res.json({ matieres, affiches, chiffres });
});

/* GET /api/catalogue */
routeur.get('/catalogue', requiert(), async (_req, res) => res.json({ matieres: await cat.catalogue() }));

/* GET /api/catalogue/populaires — les chapitres les plus travaillés sur la plateforme.
   Le classement vient de l'activité réelle : séances vues et QCM passés, toutes
   promotions confondues. */
routeur.get('/catalogue/populaires', requiert(), async (_req, res) => {
  const lignes = await tous(`
    SELECT c.id,
           COUNT(DISTINCT v.eleve_id) AS spectateurs,
           COUNT(DISTINCT t.eleve_id) AS candidats,
           ROUND(AVG(t.score))        AS moyenne
      FROM chapitres c
      LEFT JOIN seances s      ON s.chapitre_id = c.id
      LEFT JOIN seances_vues v ON v.seance_id = s.id
      LEFT JOIN tentatives_qcm t ON t.chapitre_id = c.id AND t.terminee = 1
     WHERE c.publie = 1
     GROUP BY c.id
    HAVING spectateurs > 0 OR candidats > 0
     ORDER BY (COUNT(DISTINCT v.eleve_id) * 2 + COUNT(DISTINCT t.eleve_id)) DESC, c.id
     LIMIT 10`);
  res.json({ populaires: lignes });
});

/* GET /api/chapitres/:id */
routeur.get('/chapitres/:id', requiert(), async (req, res) => {
  if (!idValide(req.params.id)) return res.status(400).json({ erreur: 'Identifiant de chapitre invalide.' });
  const c = await cat.chapitre(req.params.id);
  if (!c || !c.publie) return res.status(404).json({ erreur: 'Ce chapitre n’existe pas.' });
  res.json({ chapitre: c });
});

/* GET /api/chapitres/:id/tp — le fichier, et la consultation est enregistrée */
routeur.get('/chapitres/:id/tp', requiert(), async (req, res) => {
  if (!idValide(req.params.id)) return res.status(400).json({ erreur: 'Identifiant de chapitre invalide.' });
  const c = await cat.chapitre(req.params.id);
  if (!c) return res.status(404).json({ erreur: 'Ce chapitre n’existe pas.' });

  if (req.utilisateur.role === 'eleve') {
    await executer(
      `INSERT INTO progression (eleve_id, chapitre_id, tp_consulte) VALUES (?,?,1)
       ON DUPLICATE KEY UPDATE tp_consulte = 1`, [req.utilisateur.id, c.id]);
    await prog.journaliser(req.utilisateur.id);
    await journal.enregistrer(req, {
      categorie: 'apprentissage', action: 'TP téléchargé',
      cible: c.matiere.court + ' · ch. ' + c.n + ' — ' + c.titre });
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="' + cat.nomFichierTP(c) + '"');
  res.send(cat.documentTP(c, req.utilisateur.niveau || config.niveauParDefaut));
});

/* ---------------------------------- QCM ---------------------------------- */
const melanger = t => { const a = t.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };

/* POST /api/chapitres/:id/qcm — ouvre une tentative, renvoie les questions sans les réponses */
routeur.post('/chapitres/:id/qcm', requiert('eleve'), async (req, res) => {
  if (!idValide(req.params.id)) return res.status(400).json({ erreur: 'Identifiant de chapitre invalide.' });
  const chapitreId = Number(req.params.id);

  const questions = await tous(
    'SELECT id, enonce FROM questions WHERE chapitre_id = ? ORDER BY ordre', [chapitreId]);
  if (!questions.length)
    return res.status(404).json({ erreur: 'Aucune question n’est encore disponible pour ce chapitre.' });

  const options = await tous(
    `SELECT o.id, o.question_id, o.texte FROM options_reponse o
       JOIN questions q ON q.id = o.question_id
      WHERE q.chapitre_id = ? ORDER BY o.ordre`, [chapitreId]);

  const r = await executer(
    'INSERT INTO tentatives_qcm (eleve_id, chapitre_id, total) VALUES (?,?,?)',
    [req.utilisateur.id, chapitreId, questions.length]);

  res.status(201).json({
    tentative: r.insertId,
    questions: questions.map(q => ({
      id: q.id, enonce: q.enonce,
      /* Les propositions sont mélangées à chaque tentative. */
      options: melanger(options.filter(o => o.question_id === q.id).map(o => ({ id: o.id, texte: o.texte })))
    }))
  });
});

/* POST /api/qcm/:tentative/reponse — correction immédiate, question par question */
routeur.post('/qcm/:tentative/reponse', requiert('eleve'), async (req, res) => {
  const tentativeId = Number(req.params.tentative);
  const questionId = Number(req.body.questionId), optionId = Number(req.body.optionId);
  if (!idValide(tentativeId) || !idValide(questionId) || !idValide(optionId))
    return res.status(400).json({ erreur: 'Requête incomplète.' });

  const t = await un('SELECT * FROM tentatives_qcm WHERE id = ? AND eleve_id = ?',
    [tentativeId, req.utilisateur.id]);
  if (!t) return res.status(404).json({ erreur: 'Tentative introuvable.' });
  if (t.terminee) return res.status(409).json({ erreur: 'Cette tentative est déjà terminée.' });

  const question = await un('SELECT id, explication FROM questions WHERE id = ? AND chapitre_id = ?',
    [questionId, t.chapitre_id]);
  if (!question) return res.status(400).json({ erreur: 'Cette question n’appartient pas au chapitre.' });

  const options = await tous('SELECT id, correcte FROM options_reponse WHERE question_id = ?', [questionId]);
  const choisie = options.find(o => o.id === optionId);
  if (!choisie) return res.status(400).json({ erreur: 'Proposition inconnue.' });
  const bonne = options.find(o => o.correcte);
  const correcte = !!choisie.correcte;

  await executer(
    `INSERT INTO reponses_qcm (tentative_id, question_id, option_id, correcte) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE option_id = VALUES(option_id), correcte = VALUES(correcte)`,
    [tentativeId, questionId, optionId, correcte ? 1 : 0]);

  const compte = await un(
    'SELECT COUNT(*) AS n, SUM(correcte) AS justes FROM reponses_qcm WHERE tentative_id = ?', [tentativeId]);

  res.json({
    correcte, bonneOption: bonne ? bonne.id : null, explication: question.explication,
    repondues: compte.n, total: t.total
  });
});

/* POST /api/qcm/:tentative/terminer — clôture, score et recommandations */
routeur.post('/qcm/:tentative/terminer', requiert('eleve'), async (req, res) => {
  const tentativeId = Number(req.params.tentative);
  const t = await un('SELECT * FROM tentatives_qcm WHERE id = ? AND eleve_id = ?',
    [tentativeId, req.utilisateur.id]);
  if (!t) return res.status(404).json({ erreur: 'Tentative introuvable.' });

  const reponses = await tous(
    `SELECT r.question_id, r.correcte, q.ordre FROM reponses_qcm r
       JOIN questions q ON q.id = r.question_id
      WHERE r.tentative_id = ? ORDER BY q.ordre`, [tentativeId]);
  const justes = reponses.filter(r => r.correcte).length;
  const score = t.total ? Math.round(justes / t.total * 100) : 0;

  if (!t.terminee) {
    await transaction(async cx => {
      await cx.query(
        'UPDATE tentatives_qcm SET justes = ?, score = ?, terminee = 1, terminee_le = NOW() WHERE id = ?',
        [justes, score, tentativeId]);
      await cx.query(
        `INSERT INTO progression (eleve_id, chapitre_id) VALUES (?,?)
         ON DUPLICATE KEY UPDATE maj = NOW()`, [req.utilisateur.id, t.chapitre_id]);
    });
    await prog.journaliser(req.utilisateur.id);
  }

  const c = await cat.chapitre(t.chapitre_id);
  if (!t.terminee) await journal.enregistrer(req, {
    categorie: 'apprentissage', action: 'QCM terminé',
    cible: c.matiere.court + ' · ch. ' + c.n + ' — ' + c.titre,
    details: score + ' % (' + justes + '/' + t.total + ')', succes: score >= config.seuilARevoir });
  const rates = reponses.filter(r => !r.correcte);
  const conseils = [];
  if (score === 100) conseils.push('Chapitre maîtrisé : passe au chapitre suivant de ' + c.matiere.nom + '.');
  if (rates.length) {
    const notions = [...new Set(rates.map(r => c.notions[r.ordre % c.notions.length]))].filter(Boolean);
    if (notions.length) conseils.push('Revois en priorité : ' + notions.join(', ') + '.');
    conseils.push('Refais les exercices ' + (rates.length > 1 ? '1 et 2' : '1') +
      ' du TP « ' + c.titre + ' » avant de recommencer ce QCM.');
  }
  if (score < config.seuilARevoir && c.seances.length)
    conseils.push('Reprends la séance « ' + c.seances[0].titre + ' » puis relis les pièges fréquents du résumé.');
  if (score >= config.seuilARevoir && score < 80)
    conseils.push('Relis les ' + c.resume.formules.length + ' points de « ' +
      c.matiere.labelFormules.toLowerCase() + ' » : c’est ce qui fait la différence.');

  res.json({
    score, justes, total: t.total,
    appreciation: score >= 80 ? 'Très bon niveau sur ce chapitre. Les notions clés sont acquises.'
      : score >= config.seuilARevoir ? 'Les bases sont là, mais quelques notions restent fragiles.'
        : 'Ce chapitre n’est pas encore acquis. Reprends la vidéo avant de refaire le QCM.',
    conseils
  });
});

module.exports = routeur;
