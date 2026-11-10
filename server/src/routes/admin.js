/* Espace d'administration : pilotage des comptes et du catalogue */
const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { tous, un, executer, transaction } = require('../db');
const { requiert, posezVue, COOKIE_VUE } = require('../middleware/auth');
const cat = require('../services/catalogue');
const prog = require('../services/progression');
const journal = require('../services/journal');
const suivi = require('../services/suivi');
const exos = require('../services/exercices');
const securite = require('../services/securite');
const abo = require('../services/abonnement');

const routeur = express.Router();
routeur.use(requiert('admin'));

const entier = v => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
const texte = (v, max = 400) => String(v == null ? '' : v).trim().slice(0, max);

/* ------------------- frais des candidatures : encaisser, reverser ------------------- */
const reglages = require('../services/reglages');
const LIGNE_FRAIS = `SELECT c.id, c.paiement, c.reference_paiement, c.envoyee_le, c.paiement_le, c.reverse_le,
         COALESCE(c.montant_frais, e.frais) AS montant, e.devise, e.instructions_paiement AS numero_ecole,
         e.utilisateur_id AS ecole_id, ue.nom AS ecole, u.nom AS eleve, u.email AS eleve_email
    FROM candidatures c JOIN etablissements e ON e.utilisateur_id = c.etablissement_id
    JOIN utilisateurs ue ON ue.id = e.utilisateur_id JOIN utilisateurs u ON u.id = c.eleve_id`;
routeur.get('/paiements', async (_req, res) => {
  const [declares, aReverser, reverses] = await Promise.all([
    tous(`${LIGNE_FRAIS} WHERE c.paiement = 'declare' ORDER BY c.envoyee_le`),
    tous(`${LIGNE_FRAIS} WHERE c.paiement = 'confirme' AND c.reverse_le IS NULL ORDER BY ue.nom, c.paiement_le`),
    tous(`${LIGNE_FRAIS} WHERE c.reverse_le IS NOT NULL ORDER BY c.reverse_le DESC LIMIT 40`)
  ]);
  res.json({ coordonnees: await reglages.lire('coordonnees_paiement'), coordonneesDefinies: await reglages.estDefini('coordonnees_paiement'),
    declares, aReverser, reverses });
});
routeur.put('/paiements/coordonnees', async (req, res) => {
  await reglages.ecrire('coordonnees_paiement', texte(req.body.texte, 2000));
  await journal.enregistrer(req, { categorie: 'compte', action: 'Coordonnées de paiement modifiées' });
  res.json({ ok: true });
});
/* POST /api/admin/candidatures/:id/paiement — { confirme } : l'argent est arrivé sur le compte de Cashevent */
routeur.post('/candidatures/:id/paiement', async (req, res) => {
  const c = await un(`${LIGNE_FRAIS} WHERE c.id = ?`, [entier(req.params.id)]);
  if (!c) return res.status(404).json({ erreur: 'Candidature introuvable.' });
  const ok = req.body.confirme !== false;
  await executer(`UPDATE candidatures SET paiement = ?, paiement_le = ?, montant_frais = ? WHERE id = ?`,
    [ok ? 'confirme' : 'en_attente', ok ? new Date() : null, ok ? c.montant : null, c.id]);
  await journal.enregistrer(req, { categorie: 'compte', action: ok ? 'Frais reçus' : 'Paiement rejeté', cible: c.eleve + ' → ' + c.ecole });
  res.json({ ok: true });
});
/* POST /api/admin/candidatures/:id/reverse — { reverse } ; ou { ecoleId } pour tout reverser à une école */
routeur.post('/candidatures/:id/reverse', async (req, res) => {
  const fait = req.body.reverse !== false;
  const r = await executer(`UPDATE candidatures SET reverse_le = ? WHERE id = ? AND paiement = 'confirme'`,
    [fait ? new Date() : null, entier(req.params.id)]);
  if (!r.affectedRows) return res.status(404).json({ erreur: 'Paiement introuvable.' });
  await journal.enregistrer(req, { categorie: 'compte', action: fait ? 'Frais reversés' : 'Reversement annulé', cible: String(req.params.id) });
  res.json({ ok: true });
});
routeur.post('/paiements/reverser-ecole', async (req, res) => {
  const r = await executer(`UPDATE candidatures SET reverse_le = NOW()
     WHERE etablissement_id = ? AND paiement = 'confirme' AND reverse_le IS NULL`, [entier(req.body.ecoleId)]);
  await journal.enregistrer(req, { categorie: 'compte', action: 'Frais reversés', cible: 'école ' + req.body.ecoleId, details: r.affectedRows + ' paiement(s)' });
  res.json({ ok: true, nombre: r.affectedRows });
});

/* ---------------------- entrer dans l'espace d'un compte ---------------------- */
routeur.get('/vue', async (req, res) => {
  const [role, id] = String(req.cookies[COOKIE_VUE] || '').split(':');
  const u = Number(id) > 0 ? await un('SELECT id, nom, email, role FROM utilisateurs WHERE id = ? AND role = ?', [Number(id), role]) : null;
  res.json({ vue: u || null });
});
routeur.post('/vue', async (req, res) => {
  const id = entier(req.body.id), role = ['enseignant', 'etablissement'].includes(req.body.role) ? req.body.role : null;
  const u = id && role && await un('SELECT id, nom FROM utilisateurs WHERE id = ? AND role = ?', [id, role]);
  if (!u) return res.status(404).json({ erreur: 'Compte introuvable.' });
  posezVue(res, role, id);
  await journal.enregistrer(req, { categorie: 'compte', action: 'Entrée dans un espace', cible: role + ' · ' + u.nom });
  res.json({ ok: true });
});
routeur.delete('/vue', async (_req, res) => { res.clearCookie(COOKIE_VUE); res.json({ ok: true }); });

/* -------------------------------- abonnements ------------------------------ */
/* GET /api/admin/abonnements?etat=en_attente|actif|annule|tous */
routeur.get('/abonnements', async (req, res) => {
  const etat = ['en_attente', 'actif', 'annule'].includes(req.query.etat) ? req.query.etat : null;
  const [lignes, compte] = await Promise.all([
    tous(`SELECT a.*, u.nom, u.email, u.role FROM abonnements a JOIN utilisateurs u ON u.id = a.utilisateur_id
           ${etat ? 'WHERE a.etat = ?' : ''} ORDER BY (a.paiement = 'declare') DESC, a.cree_le DESC LIMIT 300`, etat ? [etat] : []),
    un(`SELECT SUM(etat = 'en_attente') AS en_attente, SUM(etat = 'en_attente' AND paiement = 'declare') AS declares,
               SUM(etat = 'actif' AND fin >= CURDATE()) AS actifs,
               SUM(etat = 'actif' AND fin >= CURDATE() AND formule = 'premium') AS premium,
               SUM(CASE WHEN etat = 'actif' AND fin >= CURDATE() THEN prix ELSE 0 END) AS encaisse FROM abonnements`)
  ]);
  res.json({ abonnements: lignes, compte, formules: abo.FORMULES, obligatoires: config.abonnements.obligatoires });
});

/* POST /api/admin/abonnements/:id/confirmer — { mois?, note? } : le paiement est reçu, l'année démarre */
routeur.post('/abonnements/:id/confirmer', async (req, res) => {
  try {
    const a = await abo.activer(entier(req.params.id), { mois: req.body.mois, note: texte(req.body.note, 300) || null });
    await journal.enregistrer(req, { categorie: 'compte', action: 'Abonnement confirmé', cible: a.formule, details: 'compte ' + a.utilisateur_id });
    res.json({ abonnement: a });
  } catch (e) { if (!e.statut) throw e; res.status(e.statut).json({ erreur: e.message }); }
});

/* POST /api/admin/abonnements — { utilisateurId, formule, mois?, note? } : accordé directement */
routeur.post('/abonnements', async (req, res) => {
  try {
    const a = await abo.accorder(entier(req.body.utilisateurId), texte(req.body.formule, 20), { mois: req.body.mois, note: texte(req.body.note, 300) || null });
    await journal.enregistrer(req, { categorie: 'compte', action: 'Abonnement accordé', cible: a.formule, details: 'compte ' + a.utilisateur_id });
    res.status(201).json({ abonnement: a });
  } catch (e) { if (!e.statut) throw e; res.status(e.statut).json({ erreur: e.message }); }
});

/* DELETE /api/admin/abonnements/:id — annule (demande ou abonnement actif) */
routeur.delete('/abonnements/:id', async (req, res) => {
  const r = await executer(`UPDATE abonnements SET etat = 'annule' WHERE id = ? AND etat <> 'annule'`, [entier(req.params.id)]);
  if (!r.affectedRows) return res.status(404).json({ erreur: 'Abonnement introuvable.' });
  await journal.enregistrer(req, { categorie: 'compte', action: 'Abonnement annulé', cible: String(req.params.id) });
  res.json({ ok: true });
});

/* ------------------------------ tableau de bord ---------------------------- */
routeur.get('/tableau-bord', async (_req, res) => {
  const [comptes, catalogue, activite, moyennes, recents] = await Promise.all([
    un(`SELECT COUNT(*) AS total,
               SUM(role = 'eleve')  AS eleves,
               SUM(role = 'parent') AS parents,
               SUM(role = 'enseignant') AS enseignants,
               SUM(role = 'admin')  AS admins,
               SUM(actif = 0)       AS desactives FROM utilisateurs`),
    un(`SELECT (SELECT COUNT(*) FROM matieres)         AS matieres,
               (SELECT COUNT(*) FROM chapitres)        AS chapitres,
               (SELECT COUNT(*) FROM questions)        AS questions,
               (SELECT COUNT(*) FROM seances)          AS seances`),
    un(`SELECT COUNT(DISTINCT eleve_id) AS actifs7 FROM activite
         WHERE jour >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`),
    un(`SELECT COUNT(*) AS tentatives, ROUND(AVG(score)) AS moyenne
          FROM tentatives_qcm WHERE terminee = 1`),
    tous(`SELECT u.id, u.nom, u.email, u.role, u.cree_le, u.derniere_connexion
            FROM utilisateurs u ORDER BY u.cree_le DESC LIMIT 6`)
  ]);

  /* Les chapitres les plus ratés : là où le contenu mérite d'être retravaillé. */
  const fragiles = await tous(`
    SELECT c.id, c.titre, m.nom AS matiere, m.teinte,
           COUNT(*) AS tentatives, ROUND(AVG(t.score)) AS moyenne
      FROM tentatives_qcm t
      JOIN chapitres c ON c.id = t.chapitre_id
      JOIN matieres m  ON m.id = c.matiere_id
     WHERE t.terminee = 1
     GROUP BY c.id, c.titre, m.nom, m.teinte
    HAVING COUNT(*) >= 1
     ORDER BY moyenne ASC LIMIT 6`);

  res.json({ comptes, catalogue, actifs7: activite.actifs7, qcm: moyennes, recents, fragiles });
});

/* Matières d'un enseignant : ses élèves ne peuvent le désigner que dans celles-ci. */
routeur.get('/enseignants/:id/matieres', async (req, res) => {
  const id = entier(req.params.id);
  const lignes = await tous(
    'SELECT matiere_id FROM enseignant_matieres WHERE enseignant_id = ?', [id]);
  res.json({ matieres: lignes.map(l => l.matiere_id) });
});

routeur.put('/enseignants/:id/matieres', async (req, res) => {
  const id = entier(req.params.id);
  const u = await un('SELECT id, nom, role FROM utilisateurs WHERE id = ?', [id]);
  if (!u) return res.status(404).json({ erreur: 'Utilisateur introuvable.' });
  if (u.role !== 'enseignant')
    return res.status(400).json({ erreur: 'Ce compte n’est pas un compte enseignant.' });

  const ids = (Array.isArray(req.body.matieres) ? req.body.matieres : [])
    .map(entier).filter(Boolean);

  await transaction(async cx => {
    await cx.query('DELETE FROM enseignant_matieres WHERE enseignant_id = ?', [id]);
    for (const m of ids)
      await cx.query('INSERT IGNORE INTO enseignant_matieres (enseignant_id, matiere_id) VALUES (?,?)',
        [id, m]);
  });
  await journal.enregistrer(req, {
    categorie: 'compte', action: 'Matières d’un enseignant modifiées',
    cible: u.nom + ' — ' + (ids.length ? ids.length + ' matière(s)' : 'aucune') });
  res.json({ matieres: ids });
});

/* ---------------------- enseignants : rémunérations ------------------------ */
/* Ce que Cashevent doit à chaque enseignant pour un mois. Seuls les suivis
   enregistrés comptent, et chacun garde la date à laquelle le dossier de
   l'élève a été ouvert : c'est ce qui permet de vérifier avant de payer. */
routeur.get('/remunerations', async (req, res) => {
  const mois = suivi.moisValide(req.query.mois) ? req.query.mois : await suivi.moisCourant();
  const lignes = await tous(
    `SELECT u.id, u.nom, u.email, u.telephone, u.actif, en.code,
            (SELECT COUNT(*) FROM referents r
               JOIN utilisateurs e ON e.id = r.eleve_id AND e.actif = 1
              WHERE r.enseignant_id = u.id) AS eleves,
            (SELECT COUNT(*) FROM suivis s WHERE s.enseignant_id = u.id AND s.mois = ?) AS suivis,
            (SELECT GROUP_CONCAT(m.nom ORDER BY m.ordre SEPARATOR ', ')
               FROM enseignant_matieres em JOIN matieres m ON m.id = em.matiere_id
              WHERE em.enseignant_id = u.id) AS matieres
       FROM utilisateurs u
       LEFT JOIN enseignants en ON en.utilisateur_id = u.id
      WHERE u.role = 'enseignant'
      ORDER BY suivis DESC, u.nom`, [mois]);

  const enseignants = lignes.map(l => ({
    ...l, eleves: Number(l.eleves), suivis: Number(l.suivis), du: suivi.montant(Number(l.suivis))
  }));
  res.json({
    mois, tarif: suivi.tarif(), enseignants,
    total: suivi.montant(enseignants.reduce((n, e) => n + e.suivis, 0))
  });
});

/* Le détail qui justifie un montant : un suivi par ligne, avec ses preuves. */
routeur.get('/remunerations/:id', async (req, res) => {
  const mois = suivi.moisValide(req.query.mois) ? req.query.mois : await suivi.moisCourant();
  const suivis = await tous(
    `SELECT s.statut, s.commentaire, s.consulte_le, s.cree_le, s.maj_le,
            e.nom AS eleve, m.nom AS matiere,
            (SELECT COUNT(*) FROM consultations c
              WHERE c.enseignant_id = s.enseignant_id AND c.eleve_id = s.eleve_id
                AND c.matiere_id = s.matiere_id
                AND DATE_FORMAT(c.vu_le, '%Y-%m') = s.mois) AS consultations
       FROM suivis s
       JOIN utilisateurs e ON e.id = s.eleve_id
       JOIN matieres m ON m.id = s.matiere_id
      WHERE s.enseignant_id = ? AND s.mois = ?
      ORDER BY s.cree_le`, [entier(req.params.id), mois]);
  res.json({ mois, suivis: suivis.map(x => ({ ...x, consultations: Number(x.consultations) })) });
});

/* ------------------------ exercices générés : relecture --------------------- */
/* Retirée de l'espace enseignant : avec une inscription libre, n'importe qui
   pourrait valider une série. La relecture reste à l'administration. */
/* POST /api/admin/chapitres/:id/qcm/generer — l'assistant complète la banque de questions */
routeur.post('/chapitres/:id/qcm/generer', async (req, res) => {
  const qcm = require('../services/qcm');
  const id = entier(req.params.id);
  if (!await un('SELECT id FROM chapitres WHERE id = ?', [id])) return res.status(404).json({ erreur: 'Chapitre introuvable.' });
  if (!require('../services/ia').actif()) return res.status(503).json({ erreur: 'L’assistant n’est pas activé.' });
  try {
    const r = await qcm.generer(id, Math.min(9, Number(req.body.nombre) || 9));
    await journal.enregistrer(req, { categorie: 'catalogue', action: 'Questions générées',
      cible: 'Chapitre ' + id, details: r.ajoutees + ' question(s) par ' + r.modele });
    res.json({ ...r, total: await qcm.compter(id) });
  } catch (e) { res.status(502).json({ erreur: e.message }); }
});

/* GET /api/admin/ia — l'état de l'assistant, et un appel d'essai avec ?tester=1 */
routeur.get('/ia', async (req, res) => {
  const ia = require('../services/ia');
  const etat = { actif: ia.actif(), fournisseur: ia.fournisseur() || null, modele: ia.actif() ? ia.modele() : null,
    secours: config.ia.secours };
  if (req.query.tester !== '1' || !ia.actif()) return res.json(etat);
  try {
    const r = await ia.tester();
    res.json({ ...etat, essai: { ok: true, modeleUtilise: r.modele, duree: r.duree, reponse: r.contenu, usage: r.usage } });
  } catch (e) {
    res.json({ ...etat, essai: { ok: false, erreur: e.message } });
  }
});

routeur.get('/exercices', async (_req, res) => {
  const series = await tous(
    `SELECT x.id, x.niveau, x.valide, x.note_relecture, x.cree_le, x.modele,
            c.id AS chapitre_id, c.numero, c.titre, m.nom AS matiere, m.teinte,
            u.nom AS relecteur
       FROM exercices x
       JOIN chapitres c ON c.id = x.chapitre_id
       JOIN matieres  m ON m.id = c.matiere_id
       LEFT JOIN utilisateurs u ON u.id = x.valide_par
      ORDER BY x.valide, x.cree_le DESC`);
  res.json({ series });
});

routeur.get('/exercices/:id', async (req, res) => {
  const s = await un(
    'SELECT x.*, c.titre FROM exercices x JOIN chapitres c ON c.id = x.chapitre_id WHERE x.id = ?',
    [entier(req.params.id)]);
  if (!s) return res.status(404).json({ erreur: 'Série introuvable.' });
  const contenu = typeof s.contenu === 'string' ? JSON.parse(s.contenu) : s.contenu;
  res.json({ serie: { ...contenu, id: s.id, niveau: s.niveau, valide: !!s.valide,
    note: s.note_relecture, titre: s.titre } });
});

routeur.post('/exercices/:id/valider', async (req, res) => {
  const s = await un(
    `SELECT x.id, x.niveau, c.titre FROM exercices x
       JOIN chapitres c ON c.id = x.chapitre_id WHERE x.id = ?`, [entier(req.params.id)]);
  if (!s) return res.status(404).json({ erreur: 'Série introuvable.' });
  await executer('UPDATE exercices SET valide = 1, valide_par = ?, note_relecture = ? WHERE id = ?',
    [req.utilisateur.id, texte(req.body.note, 400) || null, s.id]);
  await journal.enregistrer(req, {
    categorie: 'catalogue', action: 'Exercices validés', cible: s.titre + ' · ' + s.niveau });
  res.json({ valide: true });
});

routeur.post('/exercices/:id/regenerer', async (req, res) => {
  const s = await un(
    `SELECT x.id, x.niveau, x.chapitre_id, c.titre FROM exercices x
       JOIN chapitres c ON c.id = x.chapitre_id WHERE x.id = ?`, [entier(req.params.id)]);
  if (!s) return res.status(404).json({ erreur: 'Série introuvable.' });
  if (!exos.actif())
    return res.status(503).json({ erreur: 'Le générateur d’exercices n’est pas configuré.' });
  const serie = await exos.generer(s.chapitre_id, s.niveau);
  await executer('UPDATE exercices SET valide = 0, valide_par = NULL, note_relecture = NULL WHERE id = ?',
    [s.id]);
  await journal.enregistrer(req, {
    categorie: 'catalogue', action: 'Exercices regénérés', cible: s.titre + ' · ' + s.niveau });
  res.json({ serie });
});

/* -------------------------------- utilisateurs ----------------------------- */
routeur.get('/utilisateurs', async (req, res) => {
  const role = ['eleve', 'parent', 'enseignant', 'etablissement', 'admin'].includes(req.query.role) ? req.query.role : null;
  const q = texte(req.query.q, 80);
  const clauses = [], params = [];
  if (role) { clauses.push('u.role = ?'); params.push(role); }
  if (q) { clauses.push('(u.nom LIKE ? OR u.email LIKE ?)'); params.push('%' + q + '%', '%' + q + '%'); }
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

  const utilisateurs = await tous(`
    SELECT u.id, u.nom, u.email, u.role, u.niveau, u.actif, u.cree_le, u.derniere_connexion,
           u.telephone, u.date_naissance, u.etablissement, u.filiere, u.ville, u.code_postal, u.pays,
           TIMESTAMPDIFF(YEAR, u.date_naissance, CURDATE()) AS age,
           (SELECT COUNT(*) FROM liens_famille l WHERE l.parent_id = u.id) AS enfants,
           (SELECT COUNT(*) FROM liens_famille l WHERE l.eleve_id  = u.id) AS parents,
           (SELECT COUNT(*) FROM progression p WHERE p.eleve_id = u.id AND p.termine = 1) AS chapitres_finis
      FROM utilisateurs u ${where} ORDER BY u.role, u.nom LIMIT 200`, params);
  res.json({ utilisateurs });
});

routeur.post('/utilisateurs', async (req, res) => {
  const nom = texte(req.body.nom, 120), email = texte(req.body.email, 190).toLowerCase();
  const role = ['eleve', 'parent', 'enseignant', 'etablissement', 'admin'].includes(req.body.role) ? req.body.role : 'eleve';
  const mdp = String(req.body.motDePasse || '');
  if (nom.length < 2) return res.status(400).json({ erreur: 'Indiquez un nom.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return res.status(400).json({ erreur: 'Adresse e-mail invalide.' });
  const faible = securite.motDePasseFaible(mdp, { email, nom });
  if (faible) return res.status(400).json({ erreur: faible });
  if (await un('SELECT id FROM utilisateurs WHERE email = ?', [email]))
    return res.status(409).json({ erreur: 'Cette adresse est déjà utilisée.' });

  /* Un mot de passe posé par l'administration se change à la première connexion. */
  const r = await executer(
    'INSERT INTO utilisateurs (nom, email, mot_de_passe, role, niveau, doit_changer_mdp) VALUES (?,?,?,?,?,1)',
    [nom, email, bcrypt.hashSync(mdp, 12), role,
     role === 'eleve' ? texte(req.body.niveau, 80) || config.niveauParDefaut : null]);
  res.status(201).json({ id: r.insertId });
});

routeur.patch('/utilisateurs/:id', async (req, res) => {
  const id = entier(req.params.id);
  const u = await un('SELECT * FROM utilisateurs WHERE id = ?', [id]);
  if (!u) return res.status(404).json({ erreur: 'Utilisateur introuvable.' });

  const champs = [], params = [];
  if (req.body.nom !== undefined) { champs.push('nom = ?'); params.push(texte(req.body.nom, 120)); }
  if (req.body.niveau !== undefined) { champs.push('niveau = ?'); params.push(texte(req.body.niveau, 80) || null); }
  if (req.body.actif !== undefined) { champs.push('actif = ?'); params.push(req.body.actif ? 1 : 0); }
  if (req.body.role !== undefined && ['eleve', 'parent', 'enseignant', 'etablissement', 'admin'].includes(req.body.role)) {
    if (u.id === req.utilisateur.id && req.body.role !== 'admin')
      return res.status(400).json({ erreur: 'Vous ne pouvez pas retirer votre propre rôle d’administrateur.' });
    champs.push('role = ?'); params.push(req.body.role);
  }
  if (req.body.motDePasse) {
    const faible = securite.motDePasseFaible(String(req.body.motDePasse), { email: u.email, nom: u.nom });
    if (faible) return res.status(400).json({ erreur: faible });
    /* Nouveau mot de passe : les sessions ouvertes tombent, et il devra le changer. */
    champs.push('mot_de_passe = ?'); params.push(bcrypt.hashSync(String(req.body.motDePasse), 12));
    champs.push('session_version = session_version + 1', 'doit_changer_mdp = 1');
  }
  /* Désactiver un compte ferme aussi ses sessions. */
  if (req.body.actif !== undefined && !req.body.actif) champs.push('session_version = session_version + 1');
  if (!champs.length) return res.json({ ok: true });
  await executer('UPDATE utilisateurs SET ' + champs.join(', ') + ' WHERE id = ?', [...params, id]);
  res.json({ ok: true });
});

routeur.delete('/utilisateurs/:id', async (req, res) => {
  const id = entier(req.params.id);
  if (id === req.utilisateur.id)
    return res.status(400).json({ erreur: 'Vous ne pouvez pas supprimer votre propre compte.' });
  await executer('DELETE FROM utilisateurs WHERE id = ?', [id]);
  res.json({ ok: true });
});

/* Liens parent ↔ élève */
routeur.get('/liens', async (_req, res) => {
  res.json({
    liens: await tous(`SELECT l.parent_id, p.nom AS parent, l.eleve_id, e.nom AS eleve
                         FROM liens_famille l
                         JOIN utilisateurs p ON p.id = l.parent_id
                         JOIN utilisateurs e ON e.id = l.eleve_id
                        ORDER BY p.nom, e.nom`)
  });
});

routeur.post('/liens', async (req, res) => {
  const parentId = entier(req.body.parentId), eleveId = entier(req.body.eleveId);
  const p = await un('SELECT id FROM utilisateurs WHERE id = ? AND role = "parent"', [parentId]);
  const e = await un('SELECT id FROM utilisateurs WHERE id = ? AND role = "eleve"', [eleveId]);
  if (!p || !e) return res.status(400).json({ erreur: 'Choisissez un parent et un élève existants.' });
  await executer('INSERT IGNORE INTO liens_famille (parent_id, eleve_id) VALUES (?,?)', [parentId, eleveId]);
  res.status(201).json({ ok: true });
});

routeur.delete('/liens', async (req, res) => {
  await executer('DELETE FROM liens_famille WHERE parent_id = ? AND eleve_id = ?',
    [entier(req.query.parentId), entier(req.query.eleveId)]);
  res.json({ ok: true });
});

/* ---------------------------------- matières ------------------------------- */
routeur.get('/matieres', async (_req, res) => {
  res.json({
    matieres: await tous(`
      SELECT m.*, (SELECT COUNT(*) FROM chapitres c WHERE c.matiere_id = m.id) AS chapitres,
             (SELECT COUNT(*) FROM questions q JOIN chapitres c ON c.id = q.chapitre_id
               WHERE c.matiere_id = m.id) AS questions
        FROM matieres m ORDER BY m.ordre, m.id`)
  });
});

routeur.post('/matieres', async (req, res) => {
  const code = texte(req.body.code, 40).toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const nom = texte(req.body.nom, 120);
  if (!code || !nom) return res.status(400).json({ erreur: 'Le code et le nom sont obligatoires.' });
  if (await un('SELECT id FROM matieres WHERE code = ?', [code]))
    return res.status(409).json({ erreur: 'Ce code de matière existe déjà.' });
  const ordre = await un('SELECT COALESCE(MAX(ordre), -1) + 1 AS suivant FROM matieres');
  const r = await executer(
    `INSERT INTO matieres (code, nom, court, professeur, coefficient, teinte, teinte2, glyphe, label_formules, ordre, series)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [code, nom, texte(req.body.court, 40) || nom.slice(0, 12), texte(req.body.professeur, 120) || '—',
     entier(req.body.coefficient) || 1, texte(req.body.teinte, 7) || '#3b6ef5',
     texte(req.body.teinte2, 7) || '#7b3bf5', texte(req.body.glyphe, 8) || '',
     texte(req.body.labelFormules, 80) || 'À retenir', ordre.suivant,
     ['A', 'C', 'D'].filter(s => String(req.body.series || '').split(',').includes(s)).join(',') || null]);
  res.status(201).json({ id: r.insertId });
});

routeur.patch('/matieres/:id', async (req, res) => {
  const id = entier(req.params.id);
  if (!await un('SELECT id FROM matieres WHERE id = ?', [id]))
    return res.status(404).json({ erreur: 'Matière introuvable.' });
  const cartes = {
    nom: v => texte(v, 120), court: v => texte(v, 40), professeur: v => texte(v, 120),
    coefficient: v => entier(v) || 1, teinte: v => texte(v, 7), teinte2: v => texte(v, 7),
    glyphe: v => texte(v, 8), label_formules: v => texte(v, 80), ordre: v => Number(v) || 0,
    series: v => ['A', 'C', 'D'].filter(s => String(v).split(',').includes(s)).join(',') || null
  };
  const champs = [], params = [];
  for (const [col, nettoyer] of Object.entries(cartes)) {
    const cle = col === 'label_formules' ? 'labelFormules' : col;
    if (req.body[cle] !== undefined) { champs.push(col + ' = ?'); params.push(nettoyer(req.body[cle])); }
  }
  if (!champs.length) return res.json({ ok: true });
  await executer('UPDATE matieres SET ' + champs.join(', ') + ' WHERE id = ?', [...params, id]);
  res.json({ ok: true });
});

routeur.delete('/matieres/:id', async (req, res) => {
  await executer('DELETE FROM matieres WHERE id = ?', [entier(req.params.id)]);
  res.json({ ok: true });
});

/* --------------------------------- chapitres ------------------------------- */
routeur.get('/chapitres', async (req, res) => {
  const matiereId = entier(req.query.matiereId);
  const clauses = [], params = [];
  if (matiereId) { clauses.push('c.matiere_id = ?'); params.push(matiereId); }
  res.json({
    chapitres: await tous(`
      SELECT c.id, c.numero, c.titre, c.duree, c.difficulte, c.publie,
             m.id AS matiere_id, m.nom AS matiere, m.teinte,
             (SELECT COUNT(*) FROM questions q WHERE q.chapitre_id = c.id) AS questions,
             (SELECT COUNT(*) FROM seances s  WHERE s.chapitre_id = c.id) AS seances,
             (SELECT COUNT(*) FROM seances s  WHERE s.chapitre_id = c.id AND s.video_url IS NOT NULL) AS videos,
             (SELECT COUNT(*) FROM resume_lignes r WHERE r.chapitre_id = c.id AND r.type = 'point') AS cours,
             (SELECT COUNT(*) FROM tp_lignes t WHERE t.chapitre_id = c.id AND t.type = 'exercice') AS exercices
        FROM chapitres c JOIN matieres m ON m.id = c.matiere_id
       ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''}
       ORDER BY m.ordre, c.numero`, params)
  });
});

/* Version complète, bonnes réponses comprises : réservée à l'administration. */
routeur.get('/chapitres/:id', async (req, res) => {
  const id = entier(req.params.id);
  const c = await cat.chapitre(id);
  if (!c) return res.status(404).json({ erreur: 'Chapitre introuvable.' });
  const questions = await tous('SELECT id, enonce, explication FROM questions WHERE chapitre_id = ? ORDER BY ordre', [id]);
  const options = await tous(`SELECT o.id, o.question_id, o.texte, o.correcte FROM options_reponse o
                                JOIN questions q ON q.id = o.question_id
                               WHERE q.chapitre_id = ? ORDER BY o.ordre`, [id]);
  c.questions = questions.map(q => ({
    id: q.id, enonce: q.enonce, explication: q.explication,
    options: options.filter(o => o.question_id === q.id)
      .map(o => ({ id: o.id, texte: o.texte, correcte: !!o.correcte }))
  }));
  res.json({ chapitre: c });
});

routeur.post('/chapitres', async (req, res) => {
  const matiereId = entier(req.body.matiereId);
  const titre = texte(req.body.titre, 200);
  if (!matiereId || !titre)
    return res.status(400).json({ erreur: 'La matière et le titre sont obligatoires.' });
  if (!await un('SELECT id FROM matieres WHERE id = ?', [matiereId]))
    return res.status(404).json({ erreur: 'Matière introuvable.' });
  const suivant = await un('SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM chapitres WHERE matiere_id = ?', [matiereId]);
  const r = await executer(
    `INSERT INTO chapitres (matiere_id, numero, titre, duree, difficulte, accroche, publie)
     VALUES (?,?,?,?,?,?,?)`,
    [matiereId, entier(req.body.numero) || suivant.n, titre, entier(req.body.duree) || 0,
     ['Facile', 'Moyen', 'Difficile'].includes(req.body.difficulte) ? req.body.difficulte : 'Moyen',
     texte(req.body.accroche, 1000) || null, req.body.publie === false ? 0 : 1]);
  /* Sans séance, la lecture ne compterait pas dans l'avancement de l'élève. */
  await executer('INSERT INTO seances (chapitre_id, numero, titre, duree) VALUES (?,1,?,?)',
    [r.insertId, 'Lecture du chapitre', entier(req.body.duree) || 0]);
  res.status(201).json({ id: r.insertId });
});

/* Métadonnées + listes imbriquées (notions, séances, résumé, TP) remplacées d'un bloc. */
routeur.patch('/chapitres/:id', async (req, res) => {
  const id = entier(req.params.id);
  if (!await un('SELECT id FROM chapitres WHERE id = ?', [id]))
    return res.status(404).json({ erreur: 'Chapitre introuvable.' });

  await transaction(async cx => {
    const champs = [], params = [];
    const ajouter = (col, val) => { champs.push(col + ' = ?'); params.push(val); };
    if (req.body.titre !== undefined) ajouter('titre', texte(req.body.titre, 200));
    if (req.body.numero !== undefined) ajouter('numero', entier(req.body.numero) || 1);
    if (req.body.duree !== undefined) ajouter('duree', entier(req.body.duree) || 0);
    if (req.body.difficulte !== undefined && ['Facile', 'Moyen', 'Difficile'].includes(req.body.difficulte))
      ajouter('difficulte', req.body.difficulte);
    if (req.body.accroche !== undefined) ajouter('accroche', texte(req.body.accroche, 1000) || null);
    if (req.body.publie !== undefined) ajouter('publie', req.body.publie ? 1 : 0);
    if (champs.length) await cx.query('UPDATE chapitres SET ' + champs.join(', ') + ' WHERE id = ?', [...params, id]);

    if (Array.isArray(req.body.notions)) {
      await cx.query('DELETE FROM notions WHERE chapitre_id = ?', [id]);
      for (const [i, n] of req.body.notions.map(x => texte(x, 160)).filter(Boolean).entries())
        await cx.query('INSERT INTO notions (chapitre_id, libelle, ordre) VALUES (?,?,?)', [id, n, i]);
    }
    if (Array.isArray(req.body.seances)) {
      /* Les séances déjà visionnées sont référencées : on ne supprime que celles retirées. */
      const gardees = req.body.seances.map(s => entier(s.id)).filter(Boolean);
      await cx.query('DELETE FROM seances WHERE chapitre_id = ?' +
        (gardees.length ? ' AND id NOT IN (' + gardees.map(() => '?').join(',') + ')' : ''), [id, ...gardees]);
      for (const [i, s] of req.body.seances.entries()) {
        const titre = texte(s.titre, 200), duree = entier(s.duree) || 0;
        if (!titre) continue;
        /* Un lien YouTube valide fait passer le chapitre en mode vidéo ; un lien vidé le rend au mode livre. */
        const lien = s.video === undefined ? undefined : texte(s.video, 400);
        const videoUrl = lien && cat.identifiantVideo(lien) ? lien : null;
        if (entier(s.id))
          await cx.query('UPDATE seances SET numero = ?, titre = ?, duree = ? WHERE id = ? AND chapitre_id = ?',
            [i + 1, titre, duree, s.id, id]);
        else {
          const [r] = await cx.query('INSERT INTO seances (chapitre_id, numero, titre, duree) VALUES (?,?,?,?)',
            [id, i + 1, titre, duree]);
          s.id = r.insertId;
        }
        if (lien !== undefined)
          await cx.query(`UPDATE seances SET video_titre = IF(video_url <=> ?, video_titre, ?),
                            video_chaine = IF(video_url <=> ?, video_chaine, NULL), video_url = ?
                           WHERE id = ? AND chapitre_id = ?`,
            [videoUrl, videoUrl ? titre : null, videoUrl, videoUrl, s.id, id]);
      }
    }
    for (const [table, cle] of [['resume_lignes', 'resume'], ['tp_lignes', 'tp']]) {
      const bloc = req.body[cle];
      if (!bloc || typeof bloc !== 'object') continue;
      const types = table === 'resume_lignes'
        ? [['point', 'points'], ['formule', 'formules'], ['piege', 'pieges']]
        : [['objectif', 'objectifs'], ['exercice', 'exercices'], ['corrige', 'corrige']];
      for (const [type, champ] of types) {
        if (!Array.isArray(bloc[champ])) continue;
        await cx.query('DELETE FROM ' + table + ' WHERE chapitre_id = ? AND type = ?', [id, type]);
        for (const [i, t] of bloc[champ].map(x => texte(x, 30000)).filter(Boolean).entries())
          await cx.query('INSERT INTO ' + table + ' (chapitre_id, type, texte, ordre) VALUES (?,?,?,?)',
            [id, type, t, i]);
      }
    }
  });
  res.json({ ok: true });
});

routeur.delete('/chapitres/:id', async (req, res) => {
  await executer('DELETE FROM chapitres WHERE id = ?', [entier(req.params.id)]);
  res.json({ ok: true });
});

/* ---------------------------------- QCM ------------------------------------ */
/* PUT /api/admin/chapitres/:id/questions — remplace le questionnaire.
   Les questions conservées gardent leur identifiant, donc l'historique des tentatives. */
routeur.put('/chapitres/:id/questions', async (req, res) => {
  const id = entier(req.params.id);
  if (!await un('SELECT id FROM chapitres WHERE id = ?', [id]))
    return res.status(404).json({ erreur: 'Chapitre introuvable.' });
  const liste = Array.isArray(req.body.questions) ? req.body.questions : null;
  if (!liste) return res.status(400).json({ erreur: 'Envoyez un tableau « questions ».' });

  for (const q of liste) {
    const options = Array.isArray(q.options) ? q.options.filter(o => texte(o.texte, 400)) : [];
    if (!texte(q.enonce, 2000)) return res.status(400).json({ erreur: 'Chaque question doit avoir un énoncé.' });
    if (options.length < 2) return res.status(400).json({ erreur: 'Chaque question doit proposer au moins deux réponses.' });
    if (options.filter(o => o.correcte).length !== 1)
      return res.status(400).json({ erreur: 'Chaque question doit avoir exactement une bonne réponse.' });
  }

  await transaction(async cx => {
    /* Seules les questions rédigées sont remplacées : la banque de l'assistant reste. */
    const gardees = liste.map(q => entier(q.id)).filter(Boolean);
    await cx.query("DELETE FROM questions WHERE chapitre_id = ? AND source = 'redaction'" +
      (gardees.length ? ' AND id NOT IN (' + gardees.map(() => '?').join(',') + ')' : ''), [id, ...gardees]);

    for (const [i, q] of liste.entries()) {
      let questionId = entier(q.id);
      if (questionId) {
        await cx.query('UPDATE questions SET enonce = ?, explication = ?, ordre = ? WHERE id = ? AND chapitre_id = ?',
          [texte(q.enonce, 2000), texte(q.explication, 2000), i, questionId, id]);
        await cx.query('DELETE FROM options_reponse WHERE question_id = ?', [questionId]);
      } else {
        const [r] = await cx.query('INSERT INTO questions (chapitre_id, enonce, explication, ordre) VALUES (?,?,?,?)',
          [id, texte(q.enonce, 2000), texte(q.explication, 2000), i]);
        questionId = r.insertId;
      }
      const options = q.options.filter(o => texte(o.texte, 400));
      for (const [j, o] of options.entries())
        await cx.query('INSERT INTO options_reponse (question_id, texte, correcte, ordre) VALUES (?,?,?,?)',
          [questionId, texte(o.texte, 400), o.correcte ? 1 : 0, j]);
    }
  });
  res.json({ ok: true });
});

/* --------------------------------- journal --------------------------------- */
/* GET /api/admin/journal — liste paginée + quelques chiffres */
routeur.get('/journal', async (req, res) => {
  const [liste, chiffres] = await Promise.all([
    journal.lister({
      categorie: req.query.categorie, role: req.query.role, q: texte(req.query.q, 80),
      utilisateurId: entier(req.query.utilisateurId), succes: req.query.succes,
      limite: req.query.limite, avant: req.query.avant
    }),
    journal.resume()
  ]);
  res.json({ ...liste, chiffres });
});

/* ------------------------------ suivi des élèves --------------------------- */
routeur.get('/eleves/:id/tableau-bord', async (req, res) => {
  const tb = await prog.tableauDeBord(entier(req.params.id));
  if (!tb) return res.status(404).json({ erreur: 'Élève introuvable.' });
  res.json(tb);
});

module.exports = routeur;
