/* Mon abonnement : les offres, ma situation, souscrire, déclarer le paiement. */
const express = require('express');
const { un, executer } = require('../db');
const { requiert } = require('../middleware/auth');
const abo = require('../services/abonnement');
const journal = require('../services/journal');

const routeur = express.Router();
const texte = (v, max = 400) => String(v == null ? '' : v).trim().slice(0, max);
const entier = v => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
const QUI = requiert('eleve', 'parent', 'enseignant', 'admin');

/* GET /api/abonnement — offres, couverture actuelle, demande en attente, historique */
routeur.get('/', QUI, async (req, res) => res.json(await abo.situation(req.utilisateur)));

/* POST /api/abonnement — { formule } : ouvre une demande, à régler puis à confirmer */
routeur.post('/', QUI, async (req, res) => {
  try {
    const formule = texte(req.body.formule, 20);
    const id = await abo.souscrire(req.utilisateur, formule);
    await journal.enregistrer(req, { categorie: 'compte', action: 'Abonnement demandé', cible: formule, details: 'n° ' + id });
    res.status(201).json(await abo.situation(req.utilisateur));
  } catch (e) {
    if (!e.statut) throw e;
    res.status(e.statut).json({ erreur: e.message });
  }
});

/* POST /api/abonnement/:id/paiement — { reference } : « j'ai payé » */
routeur.post('/:id/paiement', QUI, async (req, res) => {
  const a = await un(`SELECT * FROM abonnements WHERE id = ? AND utilisateur_id = ? AND etat = 'en_attente'`,
    [entier(req.params.id), req.utilisateur.id]);
  if (!a) return res.status(404).json({ erreur: 'Demande introuvable.' });
  const reference = texte(req.body.reference, 80);
  if (reference.length < 3) return res.status(400).json({ erreur: 'Indiquez la référence du paiement (reçu, numéro de virement…).' });
  await executer(`UPDATE abonnements SET paiement = 'declare', reference_paiement = ? WHERE id = ?`, [reference, a.id]);
  await journal.enregistrer(req, { categorie: 'compte', action: 'Paiement d’abonnement déclaré', cible: a.formule, details: reference });
  res.json(await abo.situation(req.utilisateur));
});

/* DELETE /api/abonnement/:id — retire une demande non confirmée */
routeur.delete('/:id', QUI, async (req, res) => {
  const r = await executer(`UPDATE abonnements SET etat = 'annule' WHERE id = ? AND utilisateur_id = ? AND etat = 'en_attente'`,
    [entier(req.params.id), req.utilisateur.id]);
  if (!r.affectedRows) return res.status(404).json({ erreur: 'Demande introuvable.' });
  res.json(await abo.situation(req.utilisateur));
});

module.exports = routeur;
