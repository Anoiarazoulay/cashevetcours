/* Espace enseignant référent.

   Un enseignant n'accède à un élève que parce que cet élève l'a désigné, et
   seulement dans la matière où il l'a désigné. Aucune route ne renvoie l'e-mail,
   le téléphone ou l'adresse d'un élève, rien sur ses parents, rien sur ses
   autres matières.

   L'enseignant ne modifie pas le catalogue : il supervise, il relance, il
   envoie des TP, il compose ses classes et tient son carnet. Le contenu reste
   l'affaire de l'administration.                                             */
const express = require('express');
const config = require('../config');
const { tous, un, executer, transaction } = require('../db');
const { requiert } = require('../middleware/auth');
const prog = require('../services/progression');
const suivi = require('../services/suivi');
const journal = require('../services/journal');
const { envoyerFichier } = require('../services/fichiers');

const routeur = express.Router();
routeur.use(requiert('enseignant'));

const entier = v => Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
const texte = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const listeIds = v => [...new Set((Array.isArray(v) ? v : []).map(entier).filter(Boolean))];

/* Les erreurs métier portent leur code HTTP ; les autres remontent au gestionnaire. */
const route = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (e) {
    if (e.statut) return res.status(e.statut).json({ erreur: e.message });
    throw e;
  }
};

/* Identifiants de chapitres utiles au calcul, inutiles à l'écran. */
const sansIds = ({ revoirIds, ...r }) => r;

const referent = (enseignantId, eleveId, matiereId) => un(
  'SELECT depuis FROM referents WHERE enseignant_id = ? AND eleve_id = ? AND matiere_id = ?',
  [enseignantId, eleveId, matiereId]);

const REFUS_ELEVE = 'Cet élève ne vous a pas désigné dans cette matière.';

/* Une ligne d'élève accompagnée de ses classes. */
const avecClasses = (appart, r) => ({ ...sansIds(r), classes: appart.get(r.eleve.id) || [] });

/* Les classes avec leurs chiffres, calculés sur les lignes déjà en mémoire. */
async function classesAvecStats(enseignantId, liste) {
  const [classes, appart] = await Promise.all([
    suivi.classes(enseignantId), suivi.appartenances(enseignantId)
  ]);
  const membresDe = new Map();
  for (const [eleve, ids] of appart) for (const id of ids) {
    if (!membresDe.has(id)) membresDe.set(id, new Set());
    membresDe.get(id).add(eleve);
  }
  return {
    appart,
    classes: classes.map(k => ({
      ...k,
      stats: suivi.statsGroupe(
        suivi.lignesClasse(liste, { matiere_id: k.matiere ? k.matiere.id : null }, membresDe.get(k.id) || new Set()))
    }))
  };
}

/* ----------------------------- tableau de bord ---------------------------- */

/* GET /api/enseignant/tableau-bord */
routeur.get('/tableau-bord', route(async (req, res) => {
  const id = req.utilisateur.id;
  const mois = await suivi.moisCourant();
  const lignes = await prog.lignesEnseignant(id);
  const [profil, liste, remuneration, semaines, indicateurs] = await Promise.all([
    suivi.profil(id), suivi.eleves(id, mois, lignes), suivi.remuneration(id, mois),
    suivi.activiteHebdo({ enseignantId: id }), suivi.indicateurs(id, mois)
  ]);
  const { classes, appart } = await classesAvecStats(id, liste);

  const parMatiere = profil.matieres.map(m => ({
    ...m, ...suivi.statsGroupe(liste.filter(r => r.matiere.id === m.id))
  }));

  /* L'assistant prépare, l'enseignant intervient : d'abord ceux qui ont des
     chapitres ratés, puis ceux qui ont décroché depuis le plus longtemps. */
  const priorites = liste
    .filter(r => r.besoinAide && !r.suivi)
    .sort((a, b) => (b.aRevoir - a.aRevoir) ||
      ((b.joursInactif ?? 1e9) - (a.joursInactif ?? 1e9)))
    .slice(0, 8)
    .map(r => avecClasses(appart, r));

  /* La classe d'un coup d'œil : à cent élèves ou plus, on ne lit plus une
     liste, on regarde des effectifs, puis on ouvre le bon segment. */
  const compter = f => liste.filter(f).length;
  const tranches = (valeur, bornes) => bornes.map(([de, a]) => ({
    de, a: Math.min(a, 100), eleves: compter(r => valeur(r) !== null && valeur(r) >= de && valeur(r) < a) }));
  const repartition = {
    segments: {
      afaire: compter(r => !r.suivi),
      signales: compter(r => r.besoinAide),
      signalesAFaire: compter(r => r.besoinAide && !r.suivi),
      inactifs: compter(r => r.joursInactif !== null && r.joursInactif >= config.inactiviteJours),
      pasCommence: compter(r => r.joursInactif === null),
      faits: compter(r => r.suivi)
    },
    avancement: tranches(r => r.avancement, [[0, 25], [25, 50], [50, 75], [75, 101]]),
    moyennes: tranches(r => r.moyenne, [[0, 40], [40, 60], [60, 80], [80, 101]]),
    sansQcm: compter(r => r.moyenne === null),
    statuts: Object.fromEntries(suivi.STATUTS.map(s => [s, compter(r => r.suivi && r.suivi.statut === s)]))
  };

  /* Les élèves qui tirent la classe, et ceux qui ont commencé puis lâché. */
  const palmares = {
    tetes: [...liste].filter(r => r.avancement > 0)
      .sort((a, b) => (b.avancement - a.avancement) || ((b.moyenne ?? -1) - (a.moyenne ?? -1)))
      .slice(0, 5).map(r => avecClasses(appart, r)),
    decrochages: [...liste].filter(r => r.avancement > 0 && r.joursInactif !== null &&
        r.joursInactif >= config.inactiviteJours)
      .sort((a, b) => (b.joursInactif - a.joursInactif) || (b.avancement - a.avancement))
      .slice(0, 5).map(r => avecClasses(appart, r))
  };

  const global = suivi.statsGroupe(liste);
  res.json({
    mois, profil, remuneration, parMatiere, priorites, repartition, palmares, semaines, indicateurs,
    classes, carte: suivi.carteChapitres(lignes),
    notionsDifficiles: await suivi.notionsDifficiles(liste),
    inactiviteJours: config.inactiviteJours,
    totaux: { eleves: global.eleves, suivis: liste.length, actifs7: global.actifs7,
              qcmFaits: global.qcmFaits, chapitresTermines: global.chapitresTermines }
  });
}));

/* --------------------------------- élèves --------------------------------- */

/* GET /api/enseignant/eleves — une ligne par élève et par matière, avec ses classes */
routeur.get('/eleves', route(async (req, res) => {
  const id = req.utilisateur.id;
  const mois = await suivi.moisCourant();
  const [liste, classes, appart] = await Promise.all([
    suivi.eleves(id, mois), suivi.classes(id), suivi.appartenances(id)
  ]);
  res.json({ mois, inactiviteJours: config.inactiviteJours, classes,
    eleves: liste.map(r => avecClasses(appart, r)) });
}));

/* GET /api/enseignant/eleves/:eleveId/matieres/:matiereId — ouvre le dossier.
   L'ouverture est consignée : c'est elle qui autorise le suivi du mois.
   Le dossier réunit tout ce qui concerne l'élève dans la matière : chapitres,
   courbe des QCM, activité hebdomadaire, chronologie, TP reçus, messages lus,
   place dans le groupe, classes, carnet de l'enseignant.                     */
routeur.get('/eleves/:eleveId/matieres/:matiereId', route(async (req, res) => {
  const id = req.utilisateur.id;
  const eleveId = entier(req.params.eleveId), matiereId = entier(req.params.matiereId);
  const lien = eleveId && matiereId && await referent(id, eleveId, matiereId);
  if (!lien) return res.status(403).json({ erreur: REFUS_ELEVE });

  await suivi.consigner(id, eleveId, matiereId);
  const mois = await suivi.moisCourant();
  const [eleve, matiere, d, duMois, historique, tentatives, chrono, semaines, tp, notes, classes, appart, liste] =
    await Promise.all([
      un('SELECT id, nom, filiere FROM utilisateurs WHERE id = ?', [eleveId]),
      un('SELECT id, nom, teinte FROM matieres WHERE id = ?', [matiereId]),
      suivi.dossier(eleveId, matiereId),
      suivi.suiviDuMois(id, eleveId, matiereId),
      tous(`SELECT id, mois, statut, commentaire, COALESCE(maj_le, cree_le) AS le, lu_le
              FROM suivis
             WHERE enseignant_id = ? AND eleve_id = ? AND matiere_id = ?
             ORDER BY mois DESC LIMIT 6`, [id, eleveId, matiereId]),
      suivi.tentativesEleve(eleveId, matiereId),
      suivi.chronologie(id, eleveId, matiereId),
      suivi.activiteHebdo({ enseignantId: id, eleveId, matiereId }),
      suivi.tpEleve(id, eleveId, matiereId),
      suivi.notes(id, eleveId, matiereId),
      suivi.classes(id),
      suivi.appartenances(id),
      suivi.eleves(id, mois)
    ]);

  /* La place de l'élève parmi les élèves de l'enseignant dans cette matière. */
  const pairs = liste.filter(r => r.matiere.id === matiereId);
  const groupe = suivi.statsGroupe(pairs);
  const classement = [...pairs].sort((a, b) => (b.avancement - a.avancement) || ((b.moyenne ?? -1) - (a.moyenne ?? -1)));
  const rang = classement.findIndex(r => r.eleve.id === eleveId) + 1;

  res.json({
    eleve, matiere, depuis: lien.depuis, dossier: sansIds(d), suivi: duMois, historique,
    tentatives, chronologie: chrono, semaines, tp, notes,
    groupe: { ...groupe, rang: rang || null },
    classes: classes.filter(k => !k.matiere || k.matiere.id === matiereId),
    classesEleve: appart.get(eleveId) || [],
    inactiviteJours: config.inactiviteJours
  });
}));

/* POST /api/enseignant/eleves/:eleveId/matieres/:matiereId/suivi */
routeur.post('/eleves/:eleveId/matieres/:matiereId/suivi', route(async (req, res) => {
  const eleveId = entier(req.params.eleveId), matiereId = entier(req.params.matiereId);
  if (!(eleveId && matiereId && await referent(req.utilisateur.id, eleveId, matiereId)))
    return res.status(403).json({ erreur: REFUS_ELEVE });

  const s = await suivi.enregistrerSuivi(req.utilisateur.id, eleveId, matiereId,
    String(req.body.statut || ''), req.body.commentaire);

  const noms = await un(
    'SELECT u.nom, m.nom AS matiere FROM utilisateurs u JOIN matieres m ON m.id = ? WHERE u.id = ?',
    [matiereId, eleveId]);
  await journal.enregistrer(req, {
    categorie: 'apprentissage', action: 'Suivi pédagogique',
    cible: noms.nom + ' · ' + noms.matiere, details: s.statut });
  res.json({ suivi: s });
}));

/* ------------------------------ carnet (notes) ---------------------------- */

/* POST /api/enseignant/eleves/:eleveId/matieres/:matiereId/notes — { texte } */
routeur.post('/eleves/:eleveId/matieres/:matiereId/notes', route(async (req, res) => {
  const eleveId = entier(req.params.eleveId), matiereId = entier(req.params.matiereId);
  if (!(eleveId && matiereId && await referent(req.utilisateur.id, eleveId, matiereId)))
    return res.status(403).json({ erreur: REFUS_ELEVE });
  const note = await suivi.ajouterNote(req.utilisateur.id, eleveId, matiereId, req.body.texte);
  res.status(201).json({ note });
}));

/* DELETE /api/enseignant/notes/:id */
routeur.delete('/notes/:id', route(async (req, res) => {
  const r = await suivi.supprimerNote(req.utilisateur.id, entier(req.params.id));
  if (!r.affectedRows) return res.status(404).json({ erreur: 'Note introuvable.' });
  res.json({ supprime: true });
}));

/* --------------------------------- classes -------------------------------- */

/* GET /api/enseignant/classes — les classes et leurs chiffres */
routeur.get('/classes', route(async (req, res) => {
  const id = req.utilisateur.id;
  const liste = await suivi.eleves(id, await suivi.moisCourant());
  const { classes } = await classesAvecStats(id, liste);
  res.json({ classes, couleurs: suivi.COULEURS });
}));

/* POST /api/enseignant/classes — { nom, matiereId?, couleur?, eleves? } */
routeur.post('/classes', route(async (req, res) => {
  const id = req.utilisateur.id;
  const classeId = await suivi.creerClasse(id, {
    nom: req.body.nom, matiereId: entier(req.body.matiereId), couleur: String(req.body.couleur || '') });
  const classe = await suivi.classeDe(id, classeId);
  const ajoutes = await suivi.ajouterEleves(id, classe, listeIds(req.body.eleves));
  await journal.enregistrer(req, { categorie: 'apprentissage', action: 'Classe créée',
    cible: classe.nom, details: ajoutes + ' élève(s)' });
  res.status(201).json({ classe: { id: classe.id, nom: classe.nom, couleur: classe.couleur,
    matiereId: classe.matiere_id, ajoutes } });
}));

/* PATCH /api/enseignant/classes/:id — { nom?, couleur?, matiereId? } */
routeur.patch('/classes/:id', route(async (req, res) => {
  const id = req.utilisateur.id, classeId = entier(req.params.id);
  const classe = classeId && await suivi.classeDe(id, classeId);
  if (!classe) return res.status(404).json({ erreur: 'Classe introuvable.' });
  const b = req.body || {};
  await suivi.modifierClasse(id, classeId, {
    nom: b.nom, couleur: b.couleur,
    matiereId: 'matiereId' in b ? entier(b.matiereId) : undefined });
  res.json({ classe: await suivi.classeDe(id, classeId) });
}));

/* DELETE /api/enseignant/classes/:id — la classe seulement, jamais les élèves */
routeur.delete('/classes/:id', route(async (req, res) => {
  const r = await suivi.supprimerClasse(req.utilisateur.id, entier(req.params.id));
  if (!r.affectedRows) return res.status(404).json({ erreur: 'Classe introuvable.' });
  res.json({ supprime: true });
}));

/* POST /api/enseignant/classes/:id/eleves — { eleves: [ids] } ajoute */
routeur.post('/classes/:id/eleves', route(async (req, res) => {
  const id = req.utilisateur.id;
  const classe = await suivi.classeDe(id, entier(req.params.id));
  if (!classe) return res.status(404).json({ erreur: 'Classe introuvable.' });
  const ajoutes = await suivi.ajouterEleves(id, classe, listeIds(req.body.eleves));
  res.json({ ajoutes });
}));

/* DELETE /api/enseignant/classes/:id/eleves/:eleveId */
routeur.delete('/classes/:id/eleves/:eleveId', route(async (req, res) => {
  const classe = await suivi.classeDe(req.utilisateur.id, entier(req.params.id));
  if (!classe) return res.status(404).json({ erreur: 'Classe introuvable.' });
  await suivi.retirerEleve(classe.id, entier(req.params.eleveId));
  res.json({ retire: true });
}));

/* ----------------------------------- TP ----------------------------------- */
const TYPES = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.oasis.opendocument.text': 'odt',
  'text/plain': 'txt',
  'image/png': 'png',
  'image/jpeg': 'jpg'
};
const TAILLE_MAX = 5 * 1024 * 1024;

/* GET /api/enseignant/tp — les envois, et combien d'élèves les ont récupérés */
routeur.get('/tp', route(async (req, res) => {
  const envois = await tous(
    `SELECT e.id, e.titre, e.consigne, e.echeance, e.fichier_nom, e.taille, e.cree_le,
            m.id AS matiere_id, m.nom AS matiere, m.teinte,
            COUNT(d.eleve_id) AS destinataires,
            COALESCE(SUM(d.telecharge_le IS NOT NULL), 0) AS telecharges
       FROM tp_envois e
       JOIN matieres m ON m.id = e.matiere_id
       LEFT JOIN tp_destinataires d ON d.envoi_id = e.id
      WHERE e.enseignant_id = ?
      GROUP BY e.id, e.titre, e.consigne, e.echeance, e.fichier_nom, e.taille, e.cree_le,
               m.id, m.nom, m.teinte
      ORDER BY e.cree_le DESC`, [req.utilisateur.id]);
  res.json({ envois: envois.map(e => ({
    ...e, destinataires: Number(e.destinataires), telecharges: Number(e.telecharges) })) });
}));

/* POST /api/enseignant/tp — { matiereId, titre, consigne, echeance, fichier, eleves?, classeId? } */
routeur.post('/tp', route(async (req, res) => {
  const id = req.utilisateur.id;
  const matiereId = entier(req.body.matiereId);
  const enseigne = matiereId && await un(
    'SELECT 1 AS ok FROM enseignant_matieres WHERE enseignant_id = ? AND matiere_id = ?', [id, matiereId]);
  if (!enseigne) return res.status(403).json({ erreur: 'Vous n’enseignez pas cette matière.' });

  const titre = texte(req.body.titre, 160);
  if (titre.length < 3) return res.status(400).json({ erreur: 'Donnez un titre au TP.' });

  const f = req.body.fichier || {};
  const type = String(f.type || '');
  if (!TYPES[type])
    return res.status(400).json({ erreur: 'Formats acceptés : PDF, Word, OpenDocument, texte, PNG ou JPEG.' });

  /* La taille se contrôle avant de décoder : inutile de convertir un fichier énorme pour le refuser. */
  const brut = String(f.donnees || '');
  if (brut.length * 0.75 > TAILLE_MAX + 4)
    return res.status(413).json({ erreur: 'Le fichier dépasse 5 Mo.' });
  const contenu = Buffer.from(brut, 'base64');
  if (!contenu.length) return res.status(400).json({ erreur: 'Le fichier est vide.' });
  if (contenu.length > TAILLE_MAX) return res.status(413).json({ erreur: 'Le fichier dépasse 5 Mo.' });

  const nomFichier = texte(f.nom, 200).replace(/[\\/:*?"<>| -]+/g, '_') || 'tp.' + TYPES[type];
  const echeance = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.echeance || '')) ? req.body.echeance : null;

  /* Les destinataires sont toujours pris parmi ses propres élèves de la matière :
     tous, une classe, ou une sélection. */
  const siens = (await tous(
    'SELECT eleve_id FROM referents WHERE enseignant_id = ? AND matiere_id = ?', [id, matiereId]))
    .map(r => r.eleve_id);
  let destinataires = siens;
  const classeId = entier(req.body.classeId);
  if (classeId) {
    const classe = await suivi.classeDe(id, classeId);
    if (!classe) return res.status(404).json({ erreur: 'Classe introuvable.' });
    const m = await suivi.membres(classeId);
    destinataires = siens.filter(e => m.has(e));
  } else if (Array.isArray(req.body.eleves) && req.body.eleves.length) {
    const choisis = new Set(req.body.eleves.map(entier));
    destinataires = siens.filter(e => choisis.has(e));
  }
  if (!destinataires.length)
    return res.status(400).json({ erreur: classeId
      ? 'Aucun élève de cette classe ne vous a désigné dans cette matière.'
      : 'Aucun de vos élèves ne vous a encore désigné dans cette matière.' });

  const envoiId = await transaction(async cx => {
    const [r] = await cx.query(
      `INSERT INTO tp_envois
         (enseignant_id, matiere_id, titre, consigne, echeance, fichier_nom, fichier_type, taille, fichier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, matiereId, titre, texte(req.body.consigne, 2000) || null, echeance,
       nomFichier, type, contenu.length, contenu]);
    await cx.query('INSERT INTO tp_destinataires (envoi_id, eleve_id) VALUES ?',
      [destinataires.map(e => [r.insertId, e])]);
    return r.insertId;
  });

  await journal.enregistrer(req, {
    categorie: 'apprentissage', action: 'TP envoyé',
    cible: titre, details: destinataires.length + ' élève(s)' });
  res.status(201).json({ envoi: { id: envoiId, destinataires: destinataires.length } });
}));

/* GET /api/enseignant/tp/:id/fichier */
routeur.get('/tp/:id/fichier', route(async (req, res) => {
  const e = await un(
    'SELECT fichier_nom, fichier_type, fichier FROM tp_envois WHERE id = ? AND enseignant_id = ?',
    [entier(req.params.id), req.utilisateur.id]);
  if (!e) return res.status(404).json({ erreur: 'TP introuvable.' });
  envoyerFichier(res, e);
}));

/* DELETE /api/enseignant/tp/:id */
routeur.delete('/tp/:id', route(async (req, res) => {
  const r = await executer('DELETE FROM tp_envois WHERE id = ? AND enseignant_id = ?',
    [entier(req.params.id), req.utilisateur.id]);
  if (!r.affectedRows) return res.status(404).json({ erreur: 'TP introuvable.' });
  res.json({ supprime: true });
}));

/* --------------------------------- profil --------------------------------- */

/* GET /api/enseignant/profil — le code à donner aux élèves, les matières */
routeur.get('/profil', route(async (req, res) => {
  const [p, toutes] = await Promise.all([
    suivi.profil(req.utilisateur.id),
    tous('SELECT id, nom, teinte FROM matieres ORDER BY ordre, id')
  ]);
  res.json({ ...p, toutes, tarif: suivi.tarif() });
}));

/* PUT /api/enseignant/profil/matieres — { matieres: [ids] } */
routeur.put('/profil/matieres', route(async (req, res) => {
  const id = req.utilisateur.id;
  const ids = listeIds(req.body.matieres);
  if (!ids.length) return res.status(400).json({ erreur: 'Choisissez au moins une matière.' });

  const valides = await tous(`SELECT id FROM matieres WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  if (valides.length !== ids.length) return res.status(400).json({ erreur: 'Matière inconnue.' });

  /* Retirer une matière où des élèves l'ont désigné les priverait de suivi sans prévenir. */
  const occupees = await tous(
    `SELECT DISTINCT m.id, m.nom FROM referents r JOIN matieres m ON m.id = r.matiere_id
      WHERE r.enseignant_id = ?`, [id]);
  const retirees = occupees.filter(m => !ids.includes(m.id));
  if (retirees.length)
    return res.status(409).json({ erreur: `Des élèves vous ont désigné en ${
      retirees.map(m => m.nom).join(', ')} : impossible de retirer cette matière.` });

  await transaction(async cx => {
    await cx.query('DELETE FROM enseignant_matieres WHERE enseignant_id = ?', [id]);
    await cx.query('INSERT INTO enseignant_matieres (enseignant_id, matiere_id) VALUES ?',
      [ids.map(m => [id, m])]);
  });
  res.json(await suivi.profil(id));
}));

module.exports = routeur;
