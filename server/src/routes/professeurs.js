/* Côté élève : choisir ses professeurs référents, recevoir leurs TP et messages.

   La recherche par code est publique — elle sert pendant l'inscription, avant
   que le compte existe — mais ne renvoie que le nom de l'enseignant et ses
   matières. Elle est limitée en débit dans app.js.                           */
const express = require('express');
const { un, executer } = require('../db');
const { requiert } = require('../middleware/auth');
const suivi = require('../services/suivi');
const journal = require('../services/journal');
const { envoyerFichier } = require('../services/fichiers');

const routeur = express.Router();
const entier = v => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;

/* GET /api/professeurs/code/:code */
routeur.get('/code/:code', async (req, res) => {
  const e = await suivi.parCode(req.params.code);
  if (!e) return res.status(404).json({ erreur: 'Aucun enseignant ne correspond à ce code.' });
  res.json({ enseignant: { nom: e.nom, matieres: e.matieres } });
});

/* GET /api/professeurs/mes — chaque matière et son professeur, s'il y en a un */
routeur.get('/mes', requiert('eleve'), async (req, res) => {
  res.json({ matieres: await suivi.referentsEleve(req.utilisateur.id) });
});

/* PUT /api/professeurs/mes/:matiereId — { code } ; un code vide retire le professeur */
routeur.put('/mes/:matiereId', requiert('eleve'), async (req, res) => {
  const matiereId = entier(req.params.matiereId);
  const matiere = matiereId && await un('SELECT id, nom FROM matieres WHERE id = ?', [matiereId]);
  if (!matiere) return res.status(404).json({ erreur: 'Matière inconnue.' });

  let enseignant;
  try {
    enseignant = await suivi.designer(req.utilisateur.id, matiereId, String(req.body.code || '').trim());
  } catch (e) {
    if (e.statut) return res.status(e.statut).json({ erreur: e.message });
    throw e;
  }
  await journal.enregistrer(req, {
    categorie: 'apprentissage',
    action: enseignant ? 'Professeur désigné' : 'Professeur retiré',
    cible: matiere.nom + (enseignant ? ' → ' + enseignant.nom : '') });
  res.json({ enseignant });
});

/* GET /api/professeurs/travaux — TP reçus et messages des professeurs */
routeur.get('/travaux', requiert('eleve'), async (req, res) => {
  res.json(await suivi.travauxEleve(req.utilisateur.id));
});

/* GET /api/professeurs/travaux/:id/fichier — le téléchargement est noté pour le professeur */
routeur.get('/travaux/:id/fichier', requiert('eleve'), async (req, res) => {
  const id = entier(req.params.id);
  const e = await un(
    `SELECT e.fichier_nom, e.fichier_type, e.fichier
       FROM tp_destinataires d JOIN tp_envois e ON e.id = d.envoi_id
      WHERE d.envoi_id = ? AND d.eleve_id = ?`, [id, req.utilisateur.id]);
  if (!e) return res.status(404).json({ erreur: 'TP introuvable.' });
  await executer(
    'UPDATE tp_destinataires SET telecharge_le = COALESCE(telecharge_le, NOW()) WHERE envoi_id = ? AND eleve_id = ?',
    [id, req.utilisateur.id]);
  envoyerFichier(res, e);
});

/* POST /api/professeurs/messages/:id/lu */
routeur.post('/messages/:id/lu', requiert('eleve'), async (req, res) => {
  await executer('UPDATE suivis SET lu_le = COALESCE(lu_le, NOW()) WHERE id = ? AND eleve_id = ?',
    [entier(req.params.id), req.utilisateur.id]);
  res.json({ lu: true });
});

module.exports = routeur;
