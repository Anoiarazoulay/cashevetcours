/* Le projet de l'élève : son futur métier, et ses parcours de rattrapage. */
const express = require('express');
const { un } = require('../db');
const { requiert } = require('../middleware/auth');
const prog = require('../services/progression');
const projet = require('../services/projet');
const rattrapage = require('../services/rattrapage');
const journal = require('../services/journal');

const routeur = express.Router();
const entier = v => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;

const route = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (e) {
    if (e.statut) return res.status(e.statut).json({ erreur: e.message });
    throw e;
  }
};

/* --------------------------------- métiers -------------------------------- */

/* GET /api/metiers — la liste, et le choix de l'élève connecté */
routeur.get('/metiers', requiert(), route(async (req, res) => {
  const metiers = await projet.liste();
  const mien = req.utilisateur.role === 'eleve' ? await projet.duEleve(req.utilisateur.id) : null;
  res.json({ metiers, mien: mien ? { id: mien.id, actif: mien.actif } : null });
}));

/* PUT /api/metiers/mien — { metierId | null, actif } */
routeur.put('/metiers/mien', requiert('eleve'), route(async (req, res) => {
  const metierId = req.body.metierId === null ? null : entier(req.body.metierId);
  if (req.body.metierId !== null && !metierId) return res.status(400).json({ erreur: 'Métier invalide.' });
  const actif = req.body.actif !== false;
  const m = await projet.choisir(req.utilisateur.id, metierId, actif);
  await journal.enregistrer(req, {
    categorie: 'apprentissage', action: metierId ? (actif ? 'Métier activé' : 'Métier choisi') : 'Métier retiré',
    cible: m ? m.nom : null });
  res.json({ metier: m, progression: await projet.progression(req.utilisateur.id) });
}));

/* GET /api/metiers/mien/progression — les chapitres du métier et où en est l'élève */
routeur.get('/metiers/mien/progression', requiert('eleve'), route(async (req, res) => {
  res.json({ progression: await projet.progression(req.utilisateur.id) });
}));

/* ---------------------------------- bilan --------------------------------- */

/* GET /api/bilan — le relevé de l'élève et le bilan rédigé par l'assistant.
   Le texte est rédigé quand les chiffres ont changé, ou avec ?forcer=1. */
routeur.get('/bilan', requiert('eleve'), route(async (req, res) => {
  const bilan = require('../services/bilan');
  const d = await bilan.obtenir(req.utilisateur.id, { forcer: req.query.forcer === '1' });
  if (!d) return res.status(404).json({ erreur: 'Élève introuvable.' });
  if (d.genere) await journal.enregistrer(req, { categorie: 'apprentissage', action: 'Bilan rédigé',
    cible: req.utilisateur.nom, details: d.modele });
  res.json(d);
}));

/* -------------------------------- rattrapage ------------------------------ */

/* GET /api/rattrapage — mes parcours */
routeur.get('/rattrapage', requiert('eleve'), route(async (req, res) => {
  res.json({ parcours: await rattrapage.liste(req.utilisateur.id) });
}));

/* GET /api/rattrapage/chapitre/:id — le parcours du chapitre s'il existe, et ses prérequis */
routeur.get('/rattrapage/chapitre/:id', requiert('eleve'), route(async (req, res) => {
  const chapitreId = entier(req.params.id);
  const c = chapitreId && await un('SELECT id FROM chapitres WHERE id = ? AND publie = 1', [chapitreId]);
  if (!c) return res.status(404).json({ erreur: 'Ce chapitre n’existe pas.' });
  const d = await rattrapage.dernier(req.utilisateur.id, chapitreId);
  res.json({
    parcours: d ? await rattrapage.detail(req.utilisateur.id, d.id) : null,
    prerequis: await rattrapage.prerequisDuChapitre(chapitreId)
  });
}));

/* POST /api/rattrapage/chapitre/:id — l'élève lance lui-même un parcours */
routeur.post('/rattrapage/chapitre/:id', requiert('eleve'), route(async (req, res) => {
  const chapitreId = entier(req.params.id);
  const c = chapitreId && await un('SELECT id, titre FROM chapitres WHERE id = ? AND publie = 1', [chapitreId]);
  if (!c) return res.status(404).json({ erreur: 'Ce chapitre n’existe pas.' });
  const p = await rattrapage.creer(req.utilisateur.id, chapitreId, 'demande');
  if (!p) return res.status(404).json({ erreur: 'Aucune fiche de prérequis n’est encore disponible pour ce chapitre.' });
  await prog.journaliser(req.utilisateur.id);
  await journal.enregistrer(req, { categorie: 'apprentissage', action: 'Parcours de rattrapage lancé', cible: c.titre });
  res.status(201).json({ parcours: p });
}));

/* GET /api/rattrapage/:id */
routeur.get('/rattrapage/:id', requiert('eleve'), route(async (req, res) => {
  const p = await rattrapage.detail(req.utilisateur.id, entier(req.params.id));
  if (!p) return res.status(404).json({ erreur: 'Parcours introuvable.' });
  res.json({ parcours: p });
}));

/* GET /api/rattrapage/:id/etapes/:prerequisId — la fiche et ses questions */
routeur.get('/rattrapage/:id/etapes/:prerequisId', requiert('eleve'), route(async (req, res) => {
  const p = await rattrapage.detail(req.utilisateur.id, entier(req.params.id));
  if (!p) return res.status(404).json({ erreur: 'Parcours introuvable.' });
  const etape = p.etapes.find(e => e.id === entier(req.params.prerequisId));
  if (!etape) return res.status(404).json({ erreur: 'Cette étape ne fait pas partie du parcours.' });
  res.json({ fiche: await rattrapage.fiche(etape.id), etape, parcours: p });
}));

/* POST /api/rattrapage/:id/etapes/:prerequisId — { reponses: [{ questionId, choix }] } */
routeur.post('/rattrapage/:id/etapes/:prerequisId', requiert('eleve'), route(async (req, res) => {
  const r = await rattrapage.repondre(req.utilisateur.id, entier(req.params.id), entier(req.params.prerequisId),
    req.body.reponses);
  await prog.journaliser(req.utilisateur.id);
  await journal.enregistrer(req, {
    categorie: 'apprentissage', action: r.valide ? 'Prérequis validé' : 'Prérequis à revoir',
    cible: r.parcours.chapitre.titre, details: r.score + ' %' });
  res.json(r);
}));

/* POST /api/rattrapage/:id/abandonner */
routeur.post('/rattrapage/:id/abandonner', requiert('eleve'), route(async (req, res) => {
  await rattrapage.abandonner(req.utilisateur.id, entier(req.params.id));
  res.json({ abandonne: true });
}));

module.exports = routeur;
