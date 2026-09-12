/* Espace enseignant : suivi des classes et relecture du contenu généré.

   La production de contenu passe par les routes d'administration, ouvertes à
   l'enseignant pour ses seules matières (voir routes/admin.js). Ce fichier
   couvre ce qui n'existe que pour lui : les classes, leurs élèves, et la
   validation des séries d'exercices.                                          */
const express = require('express');
const { tous, un, executer } = require('../db');
const { requiert } = require('../middleware/auth');
const prog = require('../services/progression');
const exos = require('../services/exercices');
const journal = require('../services/journal');

const routeur = express.Router();
routeur.use(requiert('enseignant', 'admin'));

const entier = v => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
const texte = (v, max = 120) => String(v == null ? '' : v).trim().slice(0, max);

/* Un code de classe court, lisible à l'oral, sans caractères ambigus. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codeClasse = () => Array.from({ length: 6 },
  () => ALPHABET[Math.random() * ALPHABET.length | 0]).join('');

/* L'administration voit toutes les classes, l'enseignant les siennes. */
const saClasse = async (u, classeId) => {
  const c = await un('SELECT * FROM classes WHERE id = ?', [classeId]);
  if (!c) return null;
  return u.role === 'admin' || c.enseignant_id === u.id ? c : null;
};

const sesClasses = u => u.role === 'admin' ? '' : ' AND c.enseignant_id = ?';

/* ------------------------------- les classes ------------------------------ */

/* GET /api/enseignant/classes */
routeur.get('/classes', async (req, res) => {
  const params = req.utilisateur.role === 'admin' ? [] : [req.utilisateur.id];
  const classes = await tous(
    `SELECT c.id, c.nom, c.niveau, c.code, c.cree_le, u.nom AS enseignant,
            (SELECT COUNT(*) FROM classe_eleves ce WHERE ce.classe_id = c.id) AS eleves
       FROM classes c JOIN utilisateurs u ON u.id = c.enseignant_id
      WHERE c.archivee = 0${sesClasses(req.utilisateur)}
      ORDER BY c.cree_le DESC`, params);
  res.json({ classes });
});

/* POST /api/enseignant/classes */
routeur.post('/classes', requiert('enseignant'), async (req, res) => {
  const nom = texte(req.body.nom);
  if (nom.length < 2) return res.status(400).json({ erreur: 'Donnez un nom à la classe.' });

  /* Collision de code très improbable, mais elle coûterait une erreur 500. */
  let code, essais = 0;
  do { code = codeClasse(); essais++; }
  while (essais < 5 && await un('SELECT 1 AS ok FROM classes WHERE code = ?', [code]));

  const r = await executer(
    'INSERT INTO classes (enseignant_id, nom, niveau, code) VALUES (?,?,?,?)',
    [req.utilisateur.id, nom, texte(req.body.niveau, 80) || null, code]);
  await journal.enregistrer(req, { categorie: 'compte', action: 'Classe créée', cible: nom });
  res.status(201).json({ classe: { id: r.insertId, nom, code, eleves: 0 } });
});

/* DELETE /api/enseignant/classes/:id — archivage, les progressions restent */
routeur.delete('/classes/:id', async (req, res) => {
  const c = await saClasse(req.utilisateur, entier(req.params.id));
  if (!c) return res.status(404).json({ erreur: 'Classe introuvable.' });
  await executer('UPDATE classes SET archivee = 1 WHERE id = ?', [c.id]);
  await journal.enregistrer(req, { categorie: 'compte', action: 'Classe archivée', cible: c.nom });
  res.json({ archivee: true });
});

/* GET /api/enseignant/classes/:id — la classe, élève par élève.

   L'ordre met en tête ceux qui décrochent : c'est ce que l'enseignant cherche
   en ouvrant la page, pas la liste alphabétique. */
routeur.get('/classes/:id', async (req, res) => {
  const c = await saClasse(req.utilisateur, entier(req.params.id));
  if (!c) return res.status(404).json({ erreur: 'Classe introuvable.' });

  const eleves = await tous(
    `SELECT e.id, e.nom, e.email, e.niveau,
            (SELECT MAX(jour) FROM activite a WHERE a.eleve_id = e.id) AS derniere_activite
       FROM classe_eleves ce JOIN utilisateurs e ON e.id = ce.eleve_id
      WHERE ce.classe_id = ? AND e.actif = 1`, [c.id]);

  for (const e of eleves) {
    const s = await prog.statistiques(e.id);
    e.apercu = {
      global: s.global, faits: s.faits, total: s.total,
      moyenne: s.moyenne, revoir: s.revoir.length
    };
    e.fragiles = s.revoir.slice(0, 3).map(x => x.titre);
  }
  eleves.sort((a, b) => a.apercu.global - b.apercu.global);

  /* Les chapitres qui coincent pour toute la classe, pas pour un élève. */
  const ids = eleves.map(e => e.id);
  const fragiles = ids.length ? await tous(
    `SELECT c.id, c.titre, m.nom AS matiere, m.teinte,
            COUNT(t.id) AS tentatives, ROUND(AVG(t.score)) AS moyenne
       FROM tentatives_qcm t
       JOIN chapitres c ON c.id = t.chapitre_id
       JOIN matieres  m ON m.id = c.matiere_id
      WHERE t.terminee = 1 AND t.eleve_id IN (${ids.map(() => '?').join(',')})
      GROUP BY c.id
     HAVING moyenne < 60 AND tentatives >= 2
      ORDER BY moyenne ASC LIMIT 6`, ids) : [];

  /* La moyenne de classe ne porte que sur les élèves qui ont passé un QCM :
     compter les autres pour zéro donnerait un chiffre faux et décourageant. */
  const notes = eleves.map(e => e.apercu.moyenne).filter(n => n !== null && n !== undefined);
  const classe = {
    ...c,
    effectif: eleves.length,
    notes: notes.length,
    moyenne: notes.length
      ? Math.round(notes.reduce((s, n) => s + n, 0) / notes.length) : null,
    avancement: eleves.length
      ? Math.round(eleves.reduce((s, e) => s + e.apercu.global, 0) / eleves.length) : 0
  };
  res.json({ classe, eleves, fragiles });
});

/* POST /api/enseignant/classes/:id/eleves — rattacher par adresse e-mail */
routeur.post('/classes/:id/eleves', async (req, res) => {
  const c = await saClasse(req.utilisateur, entier(req.params.id));
  if (!c) return res.status(404).json({ erreur: 'Classe introuvable.' });

  const email = texte(req.body.email, 190).toLowerCase();
  const eleve = await un(
    'SELECT id, nom FROM utilisateurs WHERE email = ? AND role = "eleve" AND actif = 1', [email]);
  if (!eleve)
    return res.status(404).json({ erreur: 'Aucun compte élève avec cette adresse.' });

  await executer(
    'INSERT IGNORE INTO classe_eleves (classe_id, eleve_id) VALUES (?,?)', [c.id, eleve.id]);
  await journal.enregistrer(req, {
    categorie: 'compte', action: 'Élève ajouté à une classe',
    cible: eleve.nom + ' → ' + c.nom });
  res.status(201).json({ eleve });
});

/* DELETE /api/enseignant/classes/:id/eleves/:eleveId */
routeur.delete('/classes/:id/eleves/:eleveId', async (req, res) => {
  const c = await saClasse(req.utilisateur, entier(req.params.id));
  if (!c) return res.status(404).json({ erreur: 'Classe introuvable.' });
  await executer('DELETE FROM classe_eleves WHERE classe_id = ? AND eleve_id = ?',
    [c.id, entier(req.params.eleveId)]);
  res.json({ retire: true });
});

/* GET /api/enseignant/eleves/:id/tableau-bord — le même que celui des parents,
   accessible seulement si l'élève est dans une des classes de l'enseignant. */
routeur.get('/eleves/:id/tableau-bord', async (req, res) => {
  const eleveId = entier(req.params.id);
  if (req.utilisateur.role !== 'admin') {
    const lien = await un(
      `SELECT 1 AS ok FROM classe_eleves ce JOIN classes c ON c.id = ce.classe_id
        WHERE ce.eleve_id = ? AND c.enseignant_id = ? AND c.archivee = 0`,
      [eleveId, req.utilisateur.id]);
    if (!lien) return res.status(403).json({ erreur: 'Cet élève n’est pas dans vos classes.' });
  }
  const tb = await prog.tableauDeBord(eleveId);
  if (!tb) return res.status(404).json({ erreur: 'Élève introuvable.' });
  res.json(tb);
});

/* ------------------------- relecture des exercices ------------------------ */

/* GET /api/enseignant/exercices — les séries des matières de l'enseignant */
routeur.get('/exercices', async (req, res) => {
  const sien = req.utilisateur.role === 'enseignant';
  const series = await tous(
    `SELECT x.id, x.niveau, x.valide, x.note_relecture, x.cree_le, x.modele,
            c.id AS chapitre_id, c.numero, c.titre, m.nom AS matiere, m.teinte,
            u.nom AS relecteur
       FROM exercices x
       JOIN chapitres c ON c.id = x.chapitre_id
       JOIN matieres  m ON m.id = c.matiere_id
       LEFT JOIN utilisateurs u ON u.id = x.valide_par
      ${sien ? `WHERE c.matiere_id IN (SELECT matiere_id FROM enseignant_matieres
                                        WHERE enseignant_id = ?)` : ''}
      ORDER BY x.valide, x.cree_le DESC`, sien ? [req.utilisateur.id] : []);
  res.json({ series });
});

/* Vérifie que la série porte sur une matière de l'enseignant. */
const saSerie = async (u, id) => {
  const s = await un(
    `SELECT x.*, c.matiere_id, c.titre FROM exercices x
       JOIN chapitres c ON c.id = x.chapitre_id WHERE x.id = ?`, [id]);
  if (!s) return null;
  if (u.role === 'admin') return s;
  const ok = await un(
    'SELECT 1 AS ok FROM enseignant_matieres WHERE enseignant_id = ? AND matiere_id = ?',
    [u.id, s.matiere_id]);
  return ok ? s : null;
};

/* GET /api/enseignant/exercices/:id — le contenu complet, pour relecture */
routeur.get('/exercices/:id', async (req, res) => {
  const s = await saSerie(req.utilisateur, entier(req.params.id));
  if (!s) return res.status(404).json({ erreur: 'Série introuvable.' });
  const contenu = typeof s.contenu === 'string' ? JSON.parse(s.contenu) : s.contenu;
  res.json({ serie: { ...contenu, id: s.id, niveau: s.niveau, valide: !!s.valide,
    note: s.note_relecture, titre: s.titre } });
});

/* POST /api/enseignant/exercices/:id/valider — publication sous sa responsabilité */
routeur.post('/exercices/:id/valider', async (req, res) => {
  const s = await saSerie(req.utilisateur, entier(req.params.id));
  if (!s) return res.status(404).json({ erreur: 'Série introuvable.' });
  await executer(
    'UPDATE exercices SET valide = 1, valide_par = ?, note_relecture = ? WHERE id = ?',
    [req.utilisateur.id, texte(req.body.note, 400) || null, s.id]);
  await journal.enregistrer(req, {
    categorie: 'catalogue', action: 'Exercices validés', cible: s.titre + ' · ' + s.niveau });
  res.json({ valide: true });
});

/* POST /api/enseignant/exercices/:id/regenerer — quand la série ne convient pas */
routeur.post('/exercices/:id/regenerer', async (req, res) => {
  const s = await saSerie(req.utilisateur, entier(req.params.id));
  if (!s) return res.status(404).json({ erreur: 'Série introuvable.' });
  if (!exos.actif())
    return res.status(503).json({ erreur: 'Le générateur d’exercices n’est pas configuré.' });

  const serie = await exos.generer(s.chapitre_id, s.niveau);
  await executer('UPDATE exercices SET valide = 0, valide_par = NULL, note_relecture = NULL WHERE id = ?', [s.id]);
  await journal.enregistrer(req, {
    categorie: 'catalogue', action: 'Exercices regénérés', cible: s.titre + ' · ' + s.niveau });
  res.json({ serie });
});

module.exports = routeur;
