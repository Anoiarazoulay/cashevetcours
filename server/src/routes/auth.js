/* Inscription, connexion, déconnexion, profil */
const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { un, executer } = require('../db');
const { signer, poserCookie, retirerCookie, requiert } = require('../middleware/auth');
const journal = require('../services/journal');

const routeur = express.Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const profil = async u => {
  const base = { id: u.id, nom: u.nom, email: u.email, role: u.role, niveau: u.niveau };
  if (u.role === 'parent') {
    const { tous } = require('../db');
    base.enfants = await tous(
      `SELECT e.id, e.nom, e.niveau FROM liens_famille l
         JOIN utilisateurs e ON e.id = l.eleve_id
        WHERE l.parent_id = ? AND e.actif = 1 ORDER BY e.nom`, [u.id]);
  }
  return base;
};

/* POST /api/auth/inscription — élève ou parent uniquement */
routeur.post('/inscription', async (req, res) => {
  const nom = String(req.body.nom || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const motDePasse = String(req.body.motDePasse || '');
  const role = ['eleve', 'parent'].includes(req.body.role) ? req.body.role : 'eleve';

  if (nom.length < 2) return res.status(400).json({ erreur: 'Indiquez votre nom complet.' });
  if (!EMAIL.test(email)) return res.status(400).json({ erreur: 'Cette adresse e-mail n’est pas valide.' });
  if (motDePasse.length < 8)
    return res.status(400).json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères.' });

  if (await un('SELECT id FROM utilisateurs WHERE email = ?', [email]))
    return res.status(409).json({ erreur: 'Un compte existe déjà avec cette adresse.' });

  const r = await executer(
    'INSERT INTO utilisateurs (nom, email, mot_de_passe, role, niveau) VALUES (?,?,?,?,?)',
    [nom, email, bcrypt.hashSync(motDePasse, 10), role, role === 'eleve' ? config.niveauParDefaut : null]);

  /* Un parent qui indique l'e-mail de son enfant est relié immédiatement. */
  const emailEnfant = String(req.body.emailEnfant || '').trim().toLowerCase();
  let lie = false;
  if (role === 'parent' && emailEnfant) {
    const enfant = await un('SELECT id FROM utilisateurs WHERE email = ? AND role = "eleve"', [emailEnfant]);
    if (enfant) {
      await executer('INSERT IGNORE INTO liens_famille (parent_id, eleve_id) VALUES (?,?)',
        [r.insertId, enfant.id]);
      lie = true;
    }
  }

  const u = await un('SELECT * FROM utilisateurs WHERE id = ?', [r.insertId]);
  poserCookie(res, signer(u));
  await journal.enregistrer(req, {
    categorie: 'compte', action: 'Inscription', cible: email, acteur: u,
    details: role === 'parent' ? (lie ? 'Parent — enfant rattaché : ' + emailEnfant : 'Parent') : 'Élève'
  });
  res.status(201).json({ utilisateur: await profil(u), enfantLie: lie });
});

/* POST /api/auth/connexion */
routeur.post('/connexion', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const motDePasse = String(req.body.motDePasse || '');

  const u = await un('SELECT * FROM utilisateurs WHERE email = ?', [email]);
  if (!u || !bcrypt.compareSync(motDePasse, u.mot_de_passe)) {
    await journal.enregistrer(req, {
      categorie: 'auth', action: 'Connexion refusée', cible: email, succes: false,
      details: u ? 'Mot de passe incorrect' : 'Adresse inconnue',
      acteur: u ? { id: u.id, nom: u.nom, role: u.role } : null
    });
    return res.status(401).json({ erreur: 'Adresse e-mail ou mot de passe incorrect.' });
  }
  if (!u.actif) {
    await journal.enregistrer(req, {
      categorie: 'auth', action: 'Connexion refusée', cible: email, succes: false,
      details: 'Compte désactivé', acteur: u
    });
    return res.status(403).json({ erreur: 'Ce compte est désactivé. Contactez l’administration.' });
  }

  await executer('UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = ?', [u.id]);
  poserCookie(res, signer(u));
  await journal.enregistrer(req, { categorie: 'auth', action: 'Connexion', cible: email, acteur: u });
  res.json({ utilisateur: await profil(u) });
});

/* POST /api/auth/deconnexion */
routeur.post('/deconnexion', async (req, res) => {
  if (req.utilisateur)
    await journal.enregistrer(req, { categorie: 'auth', action: 'Déconnexion', cible: req.utilisateur.email });
  retirerCookie(res);
  res.json({ ok: true });
});

/* GET /api/auth/moi */
routeur.get('/moi', requiert(), async (req, res) => res.json({ utilisateur: await profil(req.utilisateur) }));

/* PATCH /api/auth/motdepasse */
routeur.patch('/motdepasse', requiert(), async (req, res) => {
  const actuel = String(req.body.actuel || ''), nouveau = String(req.body.nouveau || '');
  if (nouveau.length < 8)
    return res.status(400).json({ erreur: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
  const u = await un('SELECT mot_de_passe FROM utilisateurs WHERE id = ?', [req.utilisateur.id]);
  if (!bcrypt.compareSync(actuel, u.mot_de_passe))
    return res.status(401).json({ erreur: 'Le mot de passe actuel est incorrect.' });
  await executer('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?',
    [bcrypt.hashSync(nouveau, 10), req.utilisateur.id]);
  await journal.enregistrer(req, {
    categorie: 'compte', action: 'Mot de passe changé', cible: req.utilisateur.email });
  res.json({ ok: true });
});

module.exports = routeur;
