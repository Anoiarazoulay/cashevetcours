/* Formulaire de contact public : réception des messages et lecture par l'administration. */
const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { tous, un, executer } = require('../db');
const { requiert } = require('../middleware/auth');
const journal = require('../services/journal');

const routeur = express.Router();

const PROFILS = ['eleve', 'parent', 'enseignant', 'etablissement', 'autre'];
const SUJETS = ['question', 'erreur', 'compte', 'etablissement', 'suggestion', 'autre'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const texte = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

/* Un formulaire public est une porte ouverte : on limite le débit par adresse. */
const limite = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => config.env !== 'production',
  handler: (_req, res) => res.status(429).json({
    erreur: 'Vous avez déjà envoyé plusieurs messages. Réessayez dans une heure.'
  })
});

/* POST /api/contact — dépôt d'un message */
routeur.post('/', limite, async (req, res) => {
  const nom = texte(req.body.nom, 120);
  const email = texte(req.body.email, 190).toLowerCase();
  const message = texte(req.body.message, 4000);
  const profil = PROFILS.includes(req.body.profil) ? req.body.profil : 'autre';
  const sujet = SUJETS.includes(req.body.sujet) ? req.body.sujet : 'question';

  if (nom.length < 2) return res.status(400).json({ erreur: 'Indiquez votre nom.' });
  if (!EMAIL.test(email))
    return res.status(400).json({ erreur: 'Cette adresse e-mail n’est pas valide.' });
  if (message.length < 20)
    return res.status(400).json({ erreur: 'Détaillez un peu votre demande : vingt caractères au minimum.' });

  /* Champ leurre : rempli par un robot, ignoré par un humain. */
  if (texte(req.body.site, 80)) return res.status(201).json({ ok: true });

  const entete = req.headers['x-forwarded-for'];
  const ip = (entete ? String(entete).split(',')[0] : req.ip || '').replace(/^::ffff:/, '').slice(0, 45);

  const r = await executer(
    'INSERT INTO messages (nom, email, profil, sujet, message, ip) VALUES (?,?,?,?,?,?)',
    [nom, email, profil, sujet, message, ip]);

  await journal.enregistrer(req, {
    categorie: 'compte', action: 'Message de contact', cible: email,
    details: sujet + ' — ' + nom, acteur: { nom, role: 'anonyme' }
  });

  res.status(201).json({ ok: true, id: r.insertId });
});

/* ----------------------- lecture par l'administration --------------------- */
routeur.get('/messages', requiert('admin'), async (req, res) => {
  const clauses = [], params = [];
  if (req.query.traite === '0') clauses.push('traite = 0');
  if (req.query.sujet && SUJETS.includes(req.query.sujet)) {
    clauses.push('sujet = ?'); params.push(req.query.sujet);
  }
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

  const [messages, compte] = await Promise.all([
    tous(`SELECT * FROM messages ${where} ORDER BY id DESC LIMIT 100`, params),
    un('SELECT COUNT(*) AS total, SUM(traite = 0) AS attente FROM messages')
  ]);
  res.json({ messages, compte });
});

/* PATCH /api/contact/messages/:id — marquer traité ou non */
routeur.patch('/messages/:id', requiert('admin'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ erreur: 'Identifiant invalide.' });
  await executer('UPDATE messages SET traite = ? WHERE id = ?', [req.body.traite ? 1 : 0, id]);
  res.json({ ok: true });
});

routeur.delete('/messages/:id', requiert('admin'), async (req, res) => {
  await executer('DELETE FROM messages WHERE id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
});

module.exports = routeur;
