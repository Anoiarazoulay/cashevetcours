/* Universités et écoles de formation : la fiche d'admission, les candidatures
   des élèves, et leur traitement — ouvrir, accepter, refuser.

   Côté élève : la liste des établissements, une candidature par établissement,
   les pièces jointes (lues dans la plateforme, jamais redistribuées), la
   déclaration du paiement des frais, puis la décision reçue.
   Côté établissement : ses candidatures, le dossier d'un candidat avec ses
   pièces affichées en ligne, la décision, la confirmation du paiement.      */
const express = require('express');
const { tous, un, executer, transaction } = require('../db');
const { requiert } = require('../middleware/auth');
const journal = require('../services/journal');

const routeur = express.Router();
const entier = v => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
const texte = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const json = v => typeof v === 'string' ? JSON.parse(v) : (v || []);

const TYPES = {
  'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp'
};
const TAILLE_MAX = 5 * 1024 * 1024;
const PIECES_MAX = 12;

/* La fiche telle que l'élève la voit. */
const ficheDe = e => ({
  id: e.utilisateur_id, nom: e.nom, type: e.type, ville: e.ville, pays: e.pays, siteWeb: e.site_web,
  description: e.description, mode: e.mode, matieresConcours: e.matieres_concours, datesConcours: e.dates_concours,
  pieces: json(e.pieces), frais: Number(e.frais), devise: e.devise, delaiOriginaux: e.delai_originaux,
  instructionsPaiement: e.instructions_paiement, ouvert: !!e.ouvert, publie: !!e.publie,
  candidatures: e.candidatures === undefined ? undefined : Number(e.candidatures)
});

const SELECT_FICHE = `SELECT e.*, u.nom, u.email, u.telephone
  FROM etablissements e JOIN utilisateurs u ON u.id = e.utilisateur_id`;

/* Crée la fiche vide d'un établissement si elle manque (compte créé par l'administration). */
async function fiche(utilisateurId) {
  let e = await un(`${SELECT_FICHE} WHERE e.utilisateur_id = ?`, [utilisateurId]);
  if (!e) {
    await executer('INSERT IGNORE INTO etablissements (utilisateur_id) VALUES (?)', [utilisateurId]);
    e = await un(`${SELECT_FICHE} WHERE e.utilisateur_id = ?`, [utilisateurId]);
  }
  return e;
}

/* ============================== côté élève =============================== */

/* GET /api/etablissements — les établissements qui reçoivent des candidatures */
routeur.get('/etablissements', requiert(), async (req, res) => {
  const liste = await tous(`${SELECT_FICHE}
     WHERE e.publie = 1 AND u.actif = 1 ORDER BY e.type, u.nom`);
  const miennes = req.utilisateur.role === 'eleve'
    ? await tous('SELECT etablissement_id, etat, paiement FROM candidatures WHERE eleve_id = ?', [req.utilisateur.id])
    : [];
  res.json({ etablissements: liste.map(e => ({
    ...ficheDe(e), description: texte(e.description, 240),
    candidature: miennes.find(c => c.etablissement_id === e.utilisateur_id) || null
  })) });
});

/* GET /api/etablissements/:id — la fiche complète et ma candidature */
routeur.get('/etablissements/:id', requiert(), async (req, res) => {
  const e = await un(`${SELECT_FICHE} WHERE e.utilisateur_id = ? AND e.publie = 1 AND u.actif = 1`, [entier(req.params.id)]);
  if (!e) return res.status(404).json({ erreur: 'Établissement introuvable.' });
  const candidature = req.utilisateur.role === 'eleve' ? await maCandidature(req.utilisateur.id, e.utilisateur_id) : null;
  res.json({ etablissement: ficheDe(e), candidature });
});

async function maCandidature(eleveId, etablissementId) {
  const c = await un('SELECT * FROM candidatures WHERE eleve_id = ? AND etablissement_id = ?', [eleveId, etablissementId]);
  if (!c) return null;
  return await detailCandidature(c);
}

async function detailCandidature(c) {
  const pieces = await tous(
    'SELECT id, libelle, fichier_nom, fichier_type, taille, cree_le FROM candidature_pieces WHERE candidature_id = ? ORDER BY id',
    [c.id]);
  const e = await un(`${SELECT_FICHE} WHERE e.utilisateur_id = ?`, [c.etablissement_id]);
  const limite = c.decidee_le && c.delai_originaux
    ? new Date(new Date(c.decidee_le).getTime() + c.delai_originaux * 864e5) : null;
  return {
    id: c.id, etat: c.etat, message: c.message, paiement: c.paiement, referencePaiement: c.reference_paiement,
    creeLe: c.cree_le, envoyeeLe: c.envoyee_le, ouverteLe: c.ouverte_le, decideeLe: c.decidee_le, lueLe: c.lue_le,
    delaiOriginaux: c.delai_originaux, limiteOriginaux: limite,
    etablissement: e ? { id: e.utilisateur_id, nom: e.nom, type: e.type, ville: e.ville, mode: e.mode,
      frais: Number(e.frais), devise: e.devise, pieces: json(e.pieces), instructionsPaiement: e.instructions_paiement } : null,
    pieces
  };
}

/* GET /api/candidatures — mes candidatures */
routeur.get('/candidatures', requiert('eleve'), async (req, res) => {
  const liste = await tous('SELECT * FROM candidatures WHERE eleve_id = ? ORDER BY cree_le DESC', [req.utilisateur.id]);
  res.json({ candidatures: await Promise.all(liste.map(detailCandidature)) });
});

/* POST /api/etablissements/:id/candidatures — ouvre un dossier (brouillon) */
routeur.post('/etablissements/:id/candidatures', requiert('eleve'), async (req, res) => {
  const e = await un(`${SELECT_FICHE} WHERE e.utilisateur_id = ? AND e.publie = 1 AND u.actif = 1`, [entier(req.params.id)]);
  if (!e) return res.status(404).json({ erreur: 'Établissement introuvable.' });
  if (!e.ouvert) return res.status(409).json({ erreur: 'Cet établissement ne reçoit pas de candidatures en ce moment.' });
  const existante = await un('SELECT id FROM candidatures WHERE eleve_id = ? AND etablissement_id = ?',
    [req.utilisateur.id, e.utilisateur_id]);
  if (!existante) {
    await executer('INSERT INTO candidatures (eleve_id, etablissement_id, message) VALUES (?, ?, ?)',
      [req.utilisateur.id, e.utilisateur_id, texte(req.body.message, 600) || null]);
  } else if (req.body.message !== undefined) {
    await executer(`UPDATE candidatures SET message = ? WHERE id = ? AND etat = 'brouillon'`,
      [texte(req.body.message, 600) || null, existante.id]);
  }
  res.status(existante ? 200 : 201).json({ candidature: await maCandidature(req.utilisateur.id, e.utilisateur_id) });
});

/* POST /api/candidatures/:id/pieces — { libelle, fichier: { nom, type, donnees (base64) } } */
routeur.post('/candidatures/:id/pieces', requiert('eleve'), async (req, res) => {
  const c = await un('SELECT * FROM candidatures WHERE id = ? AND eleve_id = ?', [entier(req.params.id), req.utilisateur.id]);
  if (!c) return res.status(404).json({ erreur: 'Candidature introuvable.' });
  if (c.etat !== 'brouillon') return res.status(409).json({ erreur: 'Cette candidature est déjà envoyée.' });
  const nb = await un('SELECT COUNT(*) AS n FROM candidature_pieces WHERE candidature_id = ?', [c.id]);
  if (Number(nb.n) >= PIECES_MAX) return res.status(400).json({ erreur: `Au plus ${PIECES_MAX} pièces par candidature.` });

  const libelle = texte(req.body.libelle, 160);
  if (libelle.length < 2) return res.status(400).json({ erreur: 'Indiquez de quelle pièce il s’agit.' });
  const f = req.body.fichier || {};
  const type = String(f.type || '');
  if (!TYPES[type]) return res.status(400).json({ erreur: 'Formats acceptés : PDF, JPEG, PNG ou WebP.' });
  const brut = String(f.donnees || '');
  if (brut.length * 0.75 > TAILLE_MAX + 4) return res.status(413).json({ erreur: 'Le fichier dépasse 5 Mo.' });
  const contenu = Buffer.from(brut, 'base64');
  if (!contenu.length) return res.status(400).json({ erreur: 'Le fichier est vide.' });
  if (contenu.length > TAILLE_MAX) return res.status(413).json({ erreur: 'Le fichier dépasse 5 Mo.' });
  const nom = texte(f.nom, 200).replace(/[\\/:*?"<>| ]+/g, '_') || 'piece.' + TYPES[type];

  const r = await executer(
    `INSERT INTO candidature_pieces (candidature_id, libelle, fichier_nom, fichier_type, taille, fichier)
     VALUES (?, ?, ?, ?, ?, ?)`, [c.id, libelle, nom, type, contenu.length, contenu]);
  res.status(201).json({ piece: { id: r.insertId, libelle, fichier_nom: nom, fichier_type: type, taille: contenu.length } });
});

/* DELETE /api/candidatures/:id/pieces/:pid — tant que le dossier n'est pas envoyé */
routeur.delete('/candidatures/:id/pieces/:pid', requiert('eleve'), async (req, res) => {
  const c = await un('SELECT id, etat FROM candidatures WHERE id = ? AND eleve_id = ?', [entier(req.params.id), req.utilisateur.id]);
  if (!c) return res.status(404).json({ erreur: 'Candidature introuvable.' });
  if (c.etat !== 'brouillon') return res.status(409).json({ erreur: 'Cette candidature est déjà envoyée.' });
  await executer('DELETE FROM candidature_pieces WHERE id = ? AND candidature_id = ?', [entier(req.params.pid), c.id]);
  res.json({ supprime: true });
});

/* GET /api/candidatures/:id/pieces/:pid/fichier — l'élève relit sa propre pièce */
routeur.get('/candidatures/:id/pieces/:pid/fichier', requiert('eleve'), async (req, res) => {
  const p = await un(
    `SELECT p.* FROM candidature_pieces p JOIN candidatures c ON c.id = p.candidature_id
      WHERE p.id = ? AND c.id = ? AND c.eleve_id = ?`, [entier(req.params.pid), entier(req.params.id), req.utilisateur.id]);
  if (!p) return res.status(404).json({ erreur: 'Pièce introuvable.' });
  servirPiece(res, p);
});

/* POST /api/candidatures/:id/envoyer — le dossier part : plus de modification */
routeur.post('/candidatures/:id/envoyer', requiert('eleve'), async (req, res) => {
  const c = await un('SELECT * FROM candidatures WHERE id = ? AND eleve_id = ?', [entier(req.params.id), req.utilisateur.id]);
  if (!c) return res.status(404).json({ erreur: 'Candidature introuvable.' });
  if (c.etat !== 'brouillon') return res.status(409).json({ erreur: 'Cette candidature est déjà envoyée.' });
  const nb = await un('SELECT COUNT(*) AS n FROM candidature_pieces WHERE candidature_id = ?', [c.id]);
  if (!Number(nb.n)) return res.status(400).json({ erreur: 'Joignez au moins une pièce avant d’envoyer.' });
  await executer(`UPDATE candidatures SET etat = 'envoyee', envoyee_le = NOW() WHERE id = ?`, [c.id]);
  const e = await un('SELECT nom FROM utilisateurs WHERE id = ?', [c.etablissement_id]);
  await journal.enregistrer(req, { categorie: 'compte', action: 'Candidature envoyée', cible: e ? e.nom : String(c.etablissement_id) });
  res.json({ candidature: await detailCandidature(await un('SELECT * FROM candidatures WHERE id = ?', [c.id])) });
});

/* POST /api/candidatures/:id/paiement — { reference } : l'élève déclare avoir payé les frais */
routeur.post('/candidatures/:id/paiement', requiert('eleve'), async (req, res) => {
  const c = await un('SELECT * FROM candidatures WHERE id = ? AND eleve_id = ?', [entier(req.params.id), req.utilisateur.id]);
  if (!c) return res.status(404).json({ erreur: 'Candidature introuvable.' });
  if (c.paiement === 'confirme') return res.status(409).json({ erreur: 'Le paiement est déjà confirmé.' });
  const reference = texte(req.body.reference, 80);
  if (reference.length < 3) return res.status(400).json({ erreur: 'Indiquez la référence du paiement (reçu, numéro de transaction…).' });
  await executer(`UPDATE candidatures SET paiement = 'declare', reference_paiement = ? WHERE id = ?`, [reference, c.id]);
  res.json({ candidature: await detailCandidature(await un('SELECT * FROM candidatures WHERE id = ?', [c.id])) });
});

/* POST /api/candidatures/:id/lu — la décision a été lue */
routeur.post('/candidatures/:id/lu', requiert('eleve'), async (req, res) => {
  await executer('UPDATE candidatures SET lue_le = COALESCE(lue_le, NOW()) WHERE id = ? AND eleve_id = ?',
    [entier(req.params.id), req.utilisateur.id]);
  res.json({ lu: true });
});

/* ============================ côté établissement ========================== */

/* GET /api/etablissement/profil */
routeur.get('/etablissement/profil', requiert('etablissement'), async (req, res) => {
  res.json({ etablissement: ficheDe(await fiche(req.utilisateur.id)) });
});

/* PUT /api/etablissement/profil — la fiche d'admission */
routeur.put('/etablissement/profil', requiert('etablissement'), async (req, res) => {
  await fiche(req.utilisateur.id);
  const b = req.body || {};
  const mode = ['concours', 'dossier'].includes(b.mode) ? b.mode : 'dossier';
  const pieces = (Array.isArray(b.pieces) ? b.pieces : String(b.pieces || '').split('\n'))
    .map(p => texte(p, 160)).filter(Boolean).slice(0, 20);
  if (!pieces.length) return res.status(400).json({ erreur: 'Indiquez au moins une pièce à fournir.' });
  const frais = Math.max(0, Math.min(1e7, Number(b.frais) || 0));
  const delai = Math.max(1, Math.min(365, parseInt(b.delaiOriginaux, 10) || 7));
  await executer(
    `UPDATE etablissements SET type = ?, ville = ?, pays = ?, site_web = ?, description = ?, mode = ?,
       matieres_concours = ?, dates_concours = ?, pieces = ?, frais = ?, devise = ?, delai_originaux = ?,
       instructions_paiement = ?, ouvert = ?
     WHERE utilisateur_id = ?`,
    [['universite', 'ecole'].includes(b.type) ? b.type : 'ecole', texte(b.ville, 120) || null, texte(b.pays, 80) || null,
     texte(b.siteWeb, 200) || null, texte(b.description, 3000) || null, mode,
     mode === 'concours' ? texte(b.matieresConcours, 400) || null : null,
     mode === 'concours' ? texte(b.datesConcours, 200) || null : null,
     JSON.stringify(pieces), frais, texte(b.devise, 8) || 'MAD', delai,
     texte(b.instructionsPaiement, 600) || null, b.ouvert === false ? 0 : 1, req.utilisateur.id]);
  if (b.nom !== undefined && texte(b.nom, 120).length >= 2)
    await executer('UPDATE utilisateurs SET nom = ? WHERE id = ?', [texte(b.nom, 120), req.utilisateur.id]);
  res.json({ etablissement: ficheDe(await fiche(req.utilisateur.id)) });
});

/* GET /api/etablissement/candidatures — toutes les candidatures reçues */
routeur.get('/etablissement/candidatures', requiert('etablissement'), async (req, res) => {
  const liste = await tous(
    `SELECT c.id, c.etat, c.paiement, c.reference_paiement, c.cree_le, c.envoyee_le, c.ouverte_le, c.decidee_le, c.delai_originaux,
            u.id AS eleve_id, u.nom, u.filiere, u.etablissement AS lycee, u.ville,
            (SELECT COUNT(*) FROM candidature_pieces p WHERE p.candidature_id = c.id) AS pieces
       FROM candidatures c JOIN utilisateurs u ON u.id = c.eleve_id
      WHERE c.etablissement_id = ? AND c.etat <> 'brouillon'
      ORDER BY c.etat = 'envoyee' DESC, c.envoyee_le DESC`, [req.utilisateur.id]);
  const compte = { envoyee: 0, acceptee: 0, refusee: 0 };
  for (const c of liste) compte[c.etat]++;
  res.json({ candidatures: liste.map(c => ({ ...c, pieces: Number(c.pieces) })), compte });
});

/* GET /api/etablissement/candidatures/:id — « ouvrir » : le dossier et ses pièces */
routeur.get('/etablissement/candidatures/:id', requiert('etablissement'), async (req, res) => {
  const c = await un(
    `SELECT c.*, u.nom, u.email, u.telephone, u.filiere, u.etablissement AS lycee, u.ville, u.date_naissance
       FROM candidatures c JOIN utilisateurs u ON u.id = c.eleve_id
      WHERE c.id = ? AND c.etablissement_id = ? AND c.etat <> 'brouillon'`, [entier(req.params.id), req.utilisateur.id]);
  if (!c) return res.status(404).json({ erreur: 'Candidature introuvable.' });
  await executer('UPDATE candidatures SET ouverte_le = COALESCE(ouverte_le, NOW()) WHERE id = ?', [c.id]);
  const pieces = await tous(
    'SELECT id, libelle, fichier_nom, fichier_type, taille, cree_le FROM candidature_pieces WHERE candidature_id = ? ORDER BY id', [c.id]);
  res.json({ candidature: {
    id: c.id, etat: c.etat, message: c.message, paiement: c.paiement, referencePaiement: c.reference_paiement,
    creeLe: c.cree_le, envoyeeLe: c.envoyee_le, ouverteLe: c.ouverte_le || new Date(), decideeLe: c.decidee_le, delaiOriginaux: c.delai_originaux,
    eleve: { id: c.eleve_id, nom: c.nom, email: c.email, telephone: c.telephone, filiere: c.filiere, lycee: c.lycee, ville: c.ville,
      dateNaissance: c.date_naissance },
    pieces
  } });
});

/* GET /api/etablissement/candidatures/:id/pieces/:pid/fichier — la pièce, lue dans la page */
routeur.get('/etablissement/candidatures/:id/pieces/:pid/fichier', requiert('etablissement'), async (req, res) => {
  const p = await un(
    `SELECT p.* FROM candidature_pieces p JOIN candidatures c ON c.id = p.candidature_id
      WHERE p.id = ? AND c.id = ? AND c.etablissement_id = ? AND c.etat <> 'brouillon'`,
    [entier(req.params.pid), entier(req.params.id), req.utilisateur.id]);
  if (!p) return res.status(404).json({ erreur: 'Pièce introuvable.' });
  servirPiece(res, p);
});

/* POST /api/etablissement/candidatures/:id/decision — { etat: 'acceptee' | 'refusee' } */
routeur.post('/etablissement/candidatures/:id/decision', requiert('etablissement'), async (req, res) => {
  const etat = ['acceptee', 'refusee'].includes(req.body.etat) ? req.body.etat : null;
  if (!etat) return res.status(400).json({ erreur: 'Décision inconnue.' });
  const c = await un('SELECT * FROM candidatures WHERE id = ? AND etablissement_id = ? AND etat <> ?',
    [entier(req.params.id), req.utilisateur.id, 'brouillon']);
  if (!c) return res.status(404).json({ erreur: 'Candidature introuvable.' });
  const e = await fiche(req.utilisateur.id);
  await executer(
    `UPDATE candidatures SET etat = ?, decidee_le = NOW(), delai_originaux = ?, lue_le = NULL,
       ouverte_le = COALESCE(ouverte_le, NOW()) WHERE id = ?`,
    [etat, etat === 'acceptee' ? e.delai_originaux : null, c.id]);
  const eleve = await un('SELECT nom FROM utilisateurs WHERE id = ?', [c.eleve_id]);
  await journal.enregistrer(req, { categorie: 'compte', action: etat === 'acceptee' ? 'Candidature acceptée' : 'Candidature refusée',
    cible: eleve ? eleve.nom : String(c.eleve_id) });
  res.json({ ok: true, etat, delaiOriginaux: etat === 'acceptee' ? e.delai_originaux : null });
});

/* POST /api/etablissement/candidatures/:id/paiement — confirme la réception des frais */
routeur.post('/etablissement/candidatures/:id/paiement', requiert('etablissement'), async (req, res) => {
  const r = await executer(`UPDATE candidatures SET paiement = ? WHERE id = ? AND etablissement_id = ?`,
    [req.body.confirme === false ? 'en_attente' : 'confirme', entier(req.params.id), req.utilisateur.id]);
  if (!r.affectedRows) return res.status(404).json({ erreur: 'Candidature introuvable.' });
  res.json({ ok: true });
});

/* Les pièces s'affichent dans la page (inline), jamais exécutées : nosniff est posé par helmet. */
function servirPiece(res, p) {
  res.setHeader('Content-Type', p.fichier_type);
  res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(p.fichier_nom) + '"');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
  res.send(p.fichier);
}

module.exports = routeur;
