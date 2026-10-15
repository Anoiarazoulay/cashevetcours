/* Inscription, connexion, déconnexion, profil */
const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { tous, un, executer } = require('../db');
const { signer, poserCookie, retirerCookie, requiert } = require('../middleware/auth');
const journal = require('../services/journal');
const suivi = require('../services/suivi');
const securite = require('../services/securite');

const routeur = express.Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const texte = (v, max) => String(v == null ? '' : v).trim().slice(0, max) || null;

/* Âge révolu à partir d'une date au format AAAA-MM-JJ, ou null si elle est absurde. */
const ageDepuis = iso => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return null;
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--;
  return a;
};

const profil = async u => {
  const base = {
    id: u.id, nom: u.nom, email: u.email, role: u.role, niveau: u.niveau,
    telephone: u.telephone || null, dateNaissance: u.date_naissance || null,
    age: ageDepuis(u.date_naissance), etablissement: u.etablissement || null,
    filiere: u.filiere || null, ville: u.ville || null,
    codePostal: u.code_postal || null, pays: u.pays || null,
    doitChangerMotDePasse: !!u.doit_changer_mdp
  };
  if (u.role === 'parent') {
    const { tous } = require('../db');
    base.enfants = await tous(
      `SELECT e.id, e.nom, e.niveau FROM liens_famille l
         JOIN utilisateurs e ON e.id = l.eleve_id
        WHERE l.parent_id = ? AND e.actif = 1 ORDER BY e.nom`, [u.id]);
  }
  return base;
};

/* POST /api/auth/inscription — élève, parent ou enseignant.
   L'inscription d'un enseignant est libre : il ne voit un élève que si cet
   élève l'a lui-même désigné, jamais par sa seule inscription. */
routeur.post('/inscription', async (req, res) => {
  const nom = String(req.body.nom || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const motDePasse = String(req.body.motDePasse || '');
  const role = ['eleve', 'parent', 'enseignant'].includes(req.body.role) ? req.body.role : 'eleve';

  if (nom.length < 2) return res.status(400).json({ erreur: 'Indiquez votre nom complet.' });
  if (!EMAIL.test(email)) return res.status(400).json({ erreur: 'Cette adresse e-mail n’est pas valide.' });
  const faible = securite.motDePasseFaible(motDePasse, { email, nom });
  if (faible) return res.status(400).json({ erreur: faible });

  /* ------------------------------ la fiche ------------------------------- */
  const dateNaissance = String(req.body.dateNaissance || '').trim();
  const age = ageDepuis(dateNaissance);
  if (age === null)
    return res.status(400).json({ erreur: 'Indiquez une date de naissance valide.' });
  if (age < 5 || age > 100)
    return res.status(400).json({ erreur: 'Cette date de naissance ne semble pas correcte.' });

  const telephone = texte(req.body.telephone, 30);
  if (!telephone || telephone.replace(/\D/g, '').length < 8)
    return res.status(400).json({ erreur: 'Indiquez un numéro de téléphone valide.' });

  const ville = texte(req.body.ville, 120);
  if (!ville) return res.status(400).json({ erreur: 'Indiquez votre ville.' });

  const pays = texte(req.body.pays, 80);
  if (!pays) return res.status(400).json({ erreur: 'Indiquez votre pays.' });

  const etablissement = texte(req.body.etablissement, 160);
  const codePostal = texte(req.body.codePostal, 20);
  /* La filière ne concerne que les élèves. */
  const filiere = role === 'eleve' ? texte(req.body.filiere, 80) : null;

  /* Un enseignant déclare ses matières : ses élèves ne pourront le désigner
     que dans l'une d'elles. */
  let matieresEnseignees = [];
  if (role === 'enseignant') {
    const brut = Array.isArray(req.body.matieresEnseignees)
      ? req.body.matieresEnseignees : String(req.body.matieresEnseignees || '').split(',');
    const ids = [...new Set(brut.map(Number).filter(n => Number.isInteger(n) && n > 0))];
    if (ids.length)
      matieresEnseignees = (await tous(
        `SELECT id FROM matieres WHERE id IN (${ids.map(() => '?').join(',')})`, ids)).map(m => m.id);
    if (!matieresEnseignees.length)
      return res.status(400).json({ erreur: 'Indiquez au moins une matière que vous enseignez.' });
  }

  if (await un('SELECT id FROM utilisateurs WHERE email = ?', [email]))
    return res.status(409).json({ erreur: 'Un compte existe déjà avec cette adresse.' });

  const r = await executer(
    `INSERT INTO utilisateurs
       (nom, email, mot_de_passe, role, niveau, telephone, date_naissance,
        etablissement, filiere, ville, code_postal, pays)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [nom, email, bcrypt.hashSync(motDePasse, 12), role,
     role === 'eleve' ? config.niveauParDefaut : null,
     telephone, dateNaissance, etablissement, filiere, ville, codePostal, pays]);

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

  /* Le code de l'enseignant est créé tout de suite : il peut le donner à
     ses élèves dès la fin de l'inscription. */
  if (role === 'enseignant') {
    await executer('INSERT INTO enseignant_matieres (enseignant_id, matiere_id) VALUES ?',
      [matieresEnseignees.map(m => [r.insertId, m])]);
    await suivi.profil(r.insertId);
  }

  /* Un élève peut désigner ses professeurs dès l'inscription. Un code erroné
     n'empêche pas la création du compte : il se corrige ensuite. */
  const professeurs = [];
  if (role === 'eleve' && Array.isArray(req.body.professeurs)) {
    for (const choix of req.body.professeurs.slice(0, 20)) {
      const code = String((choix && choix.code) || '').trim();
      if (!code) continue;
      try {
        const e = await suivi.designer(r.insertId, choix.matiereId, code);
        if (e) professeurs.push({ matiereId: Number(choix.matiereId), nom: e.nom });
      } catch (err) {
        if (!err.statut) throw err;
      }
    }
  }

  const u = await un('SELECT * FROM utilisateurs WHERE id = ?', [r.insertId]);
  poserCookie(res, signer(u));
  await journal.enregistrer(req, {
    categorie: 'compte', action: 'Inscription', cible: email, acteur: u,
    details: ({
      parent: 'Parent',
      enseignant: 'Enseignant · ' + matieresEnseignees.length + ' matière(s)',
      eleve: 'Élève · ' + (filiere || 'filière non précisée') +
        (professeurs.length ? ' · ' + professeurs.length + ' professeur(s) désigné(s)' : '')
    })[role] +
      ' · ' + age + ' ans · ' + ville + (lie ? ' · enfant rattaché : ' + emailEnfant : '')
  });
  res.status(201).json({ utilisateur: await profil(u), enfantLie: lie, professeurs });
});

/* POST /api/auth/connexion */
routeur.post('/connexion', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase().slice(0, 190);
  const motDePasse = String(req.body.motDePasse || '').slice(0, 200);

  /* Trop d'échecs sur ce compte : on n'essaie même pas le mot de passe. */
  const attente = securite.connexionBloquee(email);
  if (attente) {
    await journal.enregistrer(req, {
      categorie: 'auth', action: 'Connexion refusée', cible: email, succes: false, details: 'Compte temporairement bloqué' });
    return res.status(429).json({
      erreur: `Trop de tentatives. Réessayez dans ${attente} minute${attente > 1 ? 's' : ''}.` });
  }

  const u = await un('SELECT * FROM utilisateurs WHERE email = ?', [email]);
  /* Le même temps de réponse, compte connu ou non : rien ne trahit l'adresse. */
  if (!u || !bcrypt.compareSync(motDePasse, u ? u.mot_de_passe : securite.EMPREINTE_LEURRE)) {
    securite.noterEchec(email);
    await journal.enregistrer(req, {
      categorie: 'auth', action: 'Connexion refusée', cible: email, succes: false,
      details: u ? 'Mot de passe incorrect' : 'Adresse inconnue',
      acteur: u ? { id: u.id, nom: u.nom, role: u.role } : null
    });
    return res.status(401).json({ erreur: 'Adresse e-mail ou mot de passe incorrect.' });
  }
  securite.noterSucces(email);
  if (!u.actif) {
    await journal.enregistrer(req, {
      categorie: 'auth', action: 'Connexion refusée', cible: email, succes: false,
      details: 'Compte désactivé', acteur: u
    });
    return res.status(403).json({ erreur: 'Ce compte est désactivé. Contactez l’administration.' });
  }

  /* Chaque espace a sa porte : un compte ne s'ouvre que depuis la page de son rôle. */
  const ESPACES = { eleve: 'élève', parent: 'parent', enseignant: 'enseignant', admin: 'administration' };
  const espace = String(req.body.espace || '');
  if (!ESPACES[espace]) return res.status(400).json({ erreur: 'Choisissez votre espace de connexion.' });
  if (u.role !== espace) {
    await journal.enregistrer(req, {
      categorie: 'auth', action: 'Connexion refusée', cible: email, succes: false,
      details: `Compte ${u.role} sur l’espace ${espace}`, acteur: u
    });
    return res.status(403).json({
      erreur: `Ce compte n’est pas un compte ${espace === 'admin' ? 'administrateur' : ESPACES[espace]}. Connectez-vous depuis l’espace ${
        ESPACES[u.role] || u.role}.`,
      espace: u.role
    });
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

/* PATCH /api/auth/motdepasse — { actuel, nouveau }. Les autres sessions du
   compte sont fermées ; celle-ci reçoit un nouveau jeton. */
routeur.patch('/motdepasse', requiert(), async (req, res) => {
  const actuel = String(req.body.actuel || '').slice(0, 200), nouveau = String(req.body.nouveau || '').slice(0, 200);
  const faible = securite.motDePasseFaible(nouveau, { email: req.utilisateur.email, nom: req.utilisateur.nom });
  if (faible) return res.status(400).json({ erreur: faible });
  const u = await un('SELECT mot_de_passe FROM utilisateurs WHERE id = ?', [req.utilisateur.id]);
  if (!bcrypt.compareSync(actuel, u.mot_de_passe))
    return res.status(401).json({ erreur: 'Le mot de passe actuel est incorrect.' });
  if (actuel === nouveau)
    return res.status(400).json({ erreur: 'Choisissez un mot de passe différent de l’actuel.' });
  await executer(
    `UPDATE utilisateurs SET mot_de_passe = ?, doit_changer_mdp = 0, session_version = session_version + 1
      WHERE id = ?`, [bcrypt.hashSync(nouveau, 12), req.utilisateur.id]);
  const frais = await un('SELECT * FROM utilisateurs WHERE id = ?', [req.utilisateur.id]);
  poserCookie(res, signer(frais));
  await journal.enregistrer(req, {
    categorie: 'compte', action: 'Mot de passe changé', cible: req.utilisateur.email });
  res.json({ ok: true, utilisateur: await profil(frais) });
});

module.exports = routeur;
