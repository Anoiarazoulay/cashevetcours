/* Espace parent : la liste des enfants suivis et leur tableau de bord */
const express = require('express');
const { tous, un, executer } = require('../db');
const { requiert, eleveAutorise } = require('../middleware/auth');
const prog = require('../services/progression');

const routeur = express.Router();

/* GET /api/parent/enfants */
routeur.get('/enfants', requiert('parent', 'admin'), async (req, res) => {
  /* Le plus actif d'abord : c'est celui que le parent vient consulter. */
  const derniere = '(SELECT MAX(jour) FROM activite a WHERE a.eleve_id = e.id) AS derniere_activite';
  const ordre = 'ORDER BY derniere_activite IS NULL, derniere_activite DESC, e.nom';
  const enfants = req.utilisateur.role === 'admin'
    ? await tous(`SELECT e.id, e.nom, e.email, e.niveau, ${derniere} FROM utilisateurs e
                   WHERE e.role = 'eleve' AND e.actif = 1 ${ordre}`)
    : await tous(`SELECT e.id, e.nom, e.email, e.niveau, ${derniere} FROM liens_famille l
                    JOIN utilisateurs e ON e.id = l.eleve_id
                   WHERE l.parent_id = ? AND e.actif = 1 ${ordre}`, [req.utilisateur.id]);

  /* Un aperçu chiffré suffit pour choisir un enfant dans la liste. */
  for (const e of enfants) {
    const s = await prog.statistiques(e.id);
    e.apercu = { global: s.global, faits: s.faits, total: s.total, moyenne: s.moyenne, revoir: s.revoir.length };
  }
  res.json({ enfants });
});

/* GET /api/parent/enfants/:id/tableau-bord */
routeur.get('/enfants/:id/tableau-bord', requiert('parent', 'admin'), async (req, res) => {
  if (!await eleveAutorise(req.utilisateur, req.params.id))
    return res.status(403).json({ erreur: 'Vous ne suivez pas cet élève.' });
  const tb = await prog.tableauDeBord(Number(req.params.id));
  if (!tb) return res.status(404).json({ erreur: 'Élève introuvable.' });
  res.json(tb);
});

/* GET /api/parent/enfants/:id/chapitres — le détail, matière par matière */
routeur.get('/enfants/:id/chapitres', requiert('parent', 'admin'), async (req, res) => {
  if (!await eleveAutorise(req.utilisateur, req.params.id))
    return res.status(403).json({ erreur: 'Vous ne suivez pas cet élève.' });
  const ls = await prog.lignes(Number(req.params.id));
  res.json({ chapitres: ls.map(prog.resume) });
});

/* POST /api/parent/enfants — relier un enfant existant par son adresse e-mail */
routeur.post('/enfants', requiert('parent'), async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const enfant = await un('SELECT id, nom FROM utilisateurs WHERE email = ? AND role = "eleve"', [email]);
  if (!enfant)
    return res.status(404).json({ erreur: 'Aucun compte élève ne correspond à cette adresse.' });
  await executer('INSERT IGNORE INTO liens_famille (parent_id, eleve_id) VALUES (?,?)',
    [req.utilisateur.id, enfant.id]);
  res.status(201).json({ enfant });
});

/* DELETE /api/parent/enfants/:id */
routeur.delete('/enfants/:id', requiert('parent'), async (req, res) => {
  await executer('DELETE FROM liens_famille WHERE parent_id = ? AND eleve_id = ?',
    [req.utilisateur.id, Number(req.params.id)]);
  res.json({ ok: true });
});

module.exports = routeur;
