/* Espace enseignant référent.

   Un enseignant n'accède à un élève que parce que cet élève l'a désigné, et
   seulement dans la matière où il l'a désigné. Aucune route ne renvoie l'e-mail,
   le téléphone ou l'adresse d'un élève, rien sur ses parents, rien sur ses
   autres matières.

   L'enseignant ne modifie pas le catalogue : il supervise, il relance, il
   envoie des TP. Le contenu reste l'affaire de l'administration.              */
const express = require('express');
const { tous, un, executer, transaction } = require('../db');
const { requiert } = require('../middleware/auth');
const suivi = require('../services/suivi');
const journal = require('../services/journal');
const { envoyerFichier } = require('../services/fichiers');

const routeur = express.Router();
routeur.use(requiert('enseignant'));

const entier = v => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
const texte = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

/* Les erreurs métier portent leur code HTTP ; les autres remontent au gestionnaire. */
const route = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (e) {
    if (e.statut) return res.status(e.statut).json({ erreur: e.message });
    throw e;
  }
};

/* Identifiants de chapitres utiles au calcul, inutiles à l'écran. */
const sansIds = ({ revoirIds, ...r }) => r;
const moyenne = t => t.length ? Math.round(t.reduce((a, b) => a + b, 0) / t.length) : null;

const referent = (enseignantId, eleveId, matiereId) => un(
  'SELECT depuis FROM referents WHERE enseignant_id = ? AND eleve_id = ? AND matiere_id = ?',
  [enseignantId, eleveId, matiereId]);

const REFUS_ELEVE = 'Cet élève ne vous a pas désigné dans cette matière.';

/* ----------------------------- tableau de bord ---------------------------- */

/* GET /api/enseignant/tableau-bord */
routeur.get('/tableau-bord', route(async (req, res) => {
  const id = req.utilisateur.id;
  const mois = await suivi.moisCourant();
  const [profil, liste, remuneration] = await Promise.all([
    suivi.profil(id), suivi.eleves(id, mois), suivi.remuneration(id, mois)
  ]);

  const parMatiere = profil.matieres.map(m => {
    const rows = liste.filter(r => r.matiere.id === m.id);
    return {
      ...m,
      eleves: rows.length,
      avancement: moyenne(rows.map(r => r.avancement)) || 0,
      moyenne: moyenne(rows.map(r => r.moyenne).filter(n => n !== null)),
      chapitresTermines: rows.reduce((s, r) => s + r.termines, 0),
      qcmFaits: rows.reduce((s, r) => s + r.qcmFaits, 0),
      aSuivre: rows.filter(r => r.besoinAide).length,
      suivisFaits: rows.filter(r => r.suivi).length
    };
  });

  /* L'assistant prépare, l'enseignant intervient : d'abord ceux qui ont des
     chapitres ratés, puis ceux qui ont décroché depuis le plus longtemps. */
  const priorites = liste
    .filter(r => r.besoinAide && !r.suivi)
    .sort((a, b) => (b.aRevoir - a.aRevoir) ||
      ((b.joursInactif ?? 1e9) - (a.joursInactif ?? 1e9)))
    .slice(0, 8)
    .map(sansIds);

  res.json({
    mois, profil, remuneration, parMatiere, priorites,
    notionsDifficiles: await suivi.notionsDifficiles(liste),
    totaux: { eleves: new Set(liste.map(r => r.eleve.id)).size, suivis: liste.length }
  });
}));

/* --------------------------------- élèves --------------------------------- */

/* GET /api/enseignant/eleves — une ligne par élève et par matière */
routeur.get('/eleves', route(async (req, res) => {
  const mois = await suivi.moisCourant();
  const liste = await suivi.eleves(req.utilisateur.id, mois);
  res.json({ mois, eleves: liste.map(sansIds) });
}));

/* GET /api/enseignant/eleves/:eleveId/matieres/:matiereId — ouvre le dossier.
   L'ouverture est consignée : c'est elle qui autorise le suivi du mois. */
routeur.get('/eleves/:eleveId/matieres/:matiereId', route(async (req, res) => {
  const eleveId = entier(req.params.eleveId), matiereId = entier(req.params.matiereId);
  const lien = eleveId && matiereId && await referent(req.utilisateur.id, eleveId, matiereId);
  if (!lien) return res.status(403).json({ erreur: REFUS_ELEVE });

  await suivi.consigner(req.utilisateur.id, eleveId, matiereId);
  const [eleve, matiere, d, duMois, historique] = await Promise.all([
    un('SELECT id, nom, filiere FROM utilisateurs WHERE id = ?', [eleveId]),
    un('SELECT id, nom, teinte FROM matieres WHERE id = ?', [matiereId]),
    suivi.dossier(eleveId, matiereId),
    suivi.suiviDuMois(req.utilisateur.id, eleveId, matiereId),
    tous(`SELECT mois, statut, commentaire, COALESCE(maj_le, cree_le) AS le
            FROM suivis
           WHERE enseignant_id = ? AND eleve_id = ? AND matiere_id = ?
           ORDER BY mois DESC LIMIT 6`, [req.utilisateur.id, eleveId, matiereId])
  ]);
  res.json({ eleve, matiere, depuis: lien.depuis, dossier: sansIds(d), suivi: duMois, historique });
}));

/* POST /api/enseignant/eleves/:eleveId/matieres/:matiereId/suivi */
routeur.post('/eleves/:eleveId/matieres/:matiereId/suivi', route(async (req, res) => {
  const eleveId = entier(req.params.eleveId), matiereId = entier(req.params.matiereId);
  if (!(eleveId && matiereId && await referent(req.utilisateur.id, eleveId, matiereId)))
    return res.status(403).json({ erreur: REFUS_ELEVE });

  const s = await suivi.enregistrerSuivi(req.utilisateur.id, eleveId, matiereId,
    String(req.body.statut || ''), req.body.commentaire);

  const noms = await un(
    'SELECT u.nom, m.nom AS matiere FROM utilisateurs u JOIN matieres m ON m.id = ? WHERE u.id = ?',
    [matiereId, eleveId]);
  await journal.enregistrer(req, {
    categorie: 'apprentissage', action: 'Suivi pédagogique',
    cible: noms.nom + ' · ' + noms.matiere, details: s.statut });
  res.json({ suivi: s });
}));

/* ----------------------------------- TP ----------------------------------- */
const TYPES = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.oasis.opendocument.text': 'odt',
  'text/plain': 'txt',
  'image/png': 'png',
  'image/jpeg': 'jpg'
};
const TAILLE_MAX = 5 * 1024 * 1024;

/* GET /api/enseignant/tp — les envois, et combien d'élèves les ont récupérés */
routeur.get('/tp', route(async (req, res) => {
  const envois = await tous(
    `SELECT e.id, e.titre, e.consigne, e.echeance, e.fichier_nom, e.taille, e.cree_le,
            m.id AS matiere_id, m.nom AS matiere, m.teinte,
            COUNT(d.eleve_id) AS destinataires,
            COALESCE(SUM(d.telecharge_le IS NOT NULL), 0) AS telecharges
       FROM tp_envois e
       JOIN matieres m ON m.id = e.matiere_id
       LEFT JOIN tp_destinataires d ON d.envoi_id = e.id
      WHERE e.enseignant_id = ?
      GROUP BY e.id, e.titre, e.consigne, e.echeance, e.fichier_nom, e.taille, e.cree_le,
               m.id, m.nom, m.teinte
      ORDER BY e.cree_le DESC`, [req.utilisateur.id]);
  res.json({ envois: envois.map(e => ({
    ...e, destinataires: Number(e.destinataires), telecharges: Number(e.telecharges) })) });
}));

/* POST /api/enseignant/tp — { matiereId, titre, consigne, echeance, fichier, eleves? } */
routeur.post('/tp', route(async (req, res) => {
  const id = req.utilisateur.id;
  const matiereId = entier(req.body.matiereId);
  const enseigne = matiereId && await un(
    'SELECT 1 AS ok FROM enseignant_matieres WHERE enseignant_id = ? AND matiere_id = ?', [id, matiereId]);
  if (!enseigne) return res.status(403).json({ erreur: 'Vous n’enseignez pas cette matière.' });

  const titre = texte(req.body.titre, 160);
  if (titre.length < 3) return res.status(400).json({ erreur: 'Donnez un titre au TP.' });

  const f = req.body.fichier || {};
  const type = String(f.type || '');
  if (!TYPES[type])
    return res.status(400).json({ erreur: 'Formats acceptés : PDF, Word, OpenDocument, texte, PNG ou JPEG.' });

  /* La taille se contrôle avant de décoder : inutile de convertir un fichier énorme pour le refuser. */
  const brut = String(f.donnees || '');
  if (brut.length * 0.75 > TAILLE_MAX + 4)
    return res.status(413).json({ erreur: 'Le fichier dépasse 5 Mo.' });
  const contenu = Buffer.from(brut, 'base64');
  if (!contenu.length) return res.status(400).json({ erreur: 'Le fichier est vide.' });
  if (contenu.length > TAILLE_MAX) return res.status(413).json({ erreur: 'Le fichier dépasse 5 Mo.' });

  const nomFichier = texte(f.nom, 200).replace(/[\\/:*?"<>| -]+/g, '_') || 'tp.' + TYPES[type];
  const echeance = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.echeance || '')) ? req.body.echeance : null;

  /* Les destinataires sont toujours pris parmi ses propres élèves de la matière. */
  const siens = (await tous(
    'SELECT eleve_id FROM referents WHERE enseignant_id = ? AND matiere_id = ?', [id, matiereId]))
    .map(r => r.eleve_id);
  let destinataires = siens;
  if (Array.isArray(req.body.eleves) && req.body.eleves.length) {
    const choisis = new Set(req.body.eleves.map(entier));
    destinataires = siens.filter(e => choisis.has(e));
  }
  if (!destinataires.length)
    return res.status(400).json({ erreur: 'Aucun de vos élèves ne vous a encore désigné dans cette matière.' });

  const envoiId = await transaction(async cx => {
    const [r] = await cx.query(
      `INSERT INTO tp_envois
         (enseignant_id, matiere_id, titre, consigne, echeance, fichier_nom, fichier_type, taille, fichier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, matiereId, titre, texte(req.body.consigne, 2000) || null, echeance,
       nomFichier, type, contenu.length, contenu]);
    await cx.query('INSERT INTO tp_destinataires (envoi_id, eleve_id) VALUES ?',
      [destinataires.map(e => [r.insertId, e])]);
    return r.insertId;
  });

  await journal.enregistrer(req, {
    categorie: 'apprentissage', action: 'TP envoyé',
    cible: titre, details: destinataires.length + ' élève(s)' });
  res.status(201).json({ envoi: { id: envoiId, destinataires: destinataires.length } });
}));

/* GET /api/enseignant/tp/:id/fichier */
routeur.get('/tp/:id/fichier', route(async (req, res) => {
  const e = await un(
    'SELECT fichier_nom, fichier_type, fichier FROM tp_envois WHERE id = ? AND enseignant_id = ?',
    [entier(req.params.id), req.utilisateur.id]);
  if (!e) return res.status(404).json({ erreur: 'TP introuvable.' });
  envoyerFichier(res, e);
}));

/* DELETE /api/enseignant/tp/:id */
routeur.delete('/tp/:id', route(async (req, res) => {
  const r = await executer('DELETE FROM tp_envois WHERE id = ? AND enseignant_id = ?',
    [entier(req.params.id), req.utilisateur.id]);
  if (!r.affectedRows) return res.status(404).json({ erreur: 'TP introuvable.' });
  res.json({ supprime: true });
}));

/* --------------------------------- profil --------------------------------- */

/* GET /api/enseignant/profil — le code à donner aux élèves, les matières */
routeur.get('/profil', route(async (req, res) => {
  const [p, toutes] = await Promise.all([
    suivi.profil(req.utilisateur.id),
    tous('SELECT id, nom, teinte FROM matieres ORDER BY ordre, id')
  ]);
  res.json({ ...p, toutes, tarif: suivi.tarif() });
}));

/* PUT /api/enseignant/profil/matieres — { matieres: [ids] } */
routeur.put('/profil/matieres', route(async (req, res) => {
  const id = req.utilisateur.id;
  const ids = [...new Set((Array.isArray(req.body.matieres) ? req.body.matieres : [])
    .map(entier).filter(Boolean))];
  if (!ids.length) return res.status(400).json({ erreur: 'Choisissez au moins une matière.' });

  const valides = await tous(`SELECT id FROM matieres WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  if (valides.length !== ids.length) return res.status(400).json({ erreur: 'Matière inconnue.' });

  /* Retirer une matière où des élèves l'ont désigné les priverait de suivi sans prévenir. */
  const occupees = await tous(
    `SELECT DISTINCT m.id, m.nom FROM referents r JOIN matieres m ON m.id = r.matiere_id
      WHERE r.enseignant_id = ?`, [id]);
  const retirees = occupees.filter(m => !ids.includes(m.id));
  if (retirees.length)
    return res.status(409).json({ erreur: `Des élèves vous ont désigné en ${
      retirees.map(m => m.nom).join(', ')} : impossible de retirer cette matière.` });

  await transaction(async cx => {
    await cx.query('DELETE FROM enseignant_matieres WHERE enseignant_id = ?', [id]);
    await cx.query('INSERT INTO enseignant_matieres (enseignant_id, matiere_id) VALUES ?',
      [ids.map(m => [id, m])]);
  });
  res.json(await suivi.profil(id));
}));

module.exports = routeur;
