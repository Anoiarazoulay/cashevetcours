/* Suivi pédagogique par les enseignants référents.

   L'élève désigne un professeur par matière. Ce professeur ne voit que cette
   matière-là, et Cashevent lui verse chaque mois un montant par élève suivi —
   à condition que le suivi ait réellement été fait.

   La preuve, c'est une ligne dans « suivis ». Le serveur refuse de l'écrire si
   l'enseignant n'a pas ouvert le dossier de l'élève dans le mois (table
   « consultations ») : on ne peut pas valider trois cents élèves d'un clic.

   Le mois comptable est celui de l'horloge de la base, jamais celle du
   serveur Node : un seul fuseau décide à quel mois appartient un suivi.       */
const config = require('../config');
const { tous, un, executer } = require('../db');
const prog = require('./progression');

const R = config.remuneration;
const STATUTS = ['bonne_voie', 'encourager', 'aide'];

const erreur = (statut, message) => Object.assign(new Error(message), { statut });
const moyenne = t => t.length ? Math.round(t.reduce((a, b) => a + b, 0) / t.length) : null;

/* ------------------------------ argent et mois ---------------------------- */
const euros = fcfa => Math.round(fcfa / R.fcfaParEuro * 100) / 100;
const montant = n => ({ unites: n, fcfa: n * R.fcfa, eur: euros(n * R.fcfa) });
const tarif = () => ({ fcfa: R.fcfa, eur: euros(R.fcfa) });

const moisCourant = async () => (await un("SELECT DATE_FORMAT(NOW(), '%Y-%m') AS m")).m;
const moisValide = m => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || ''));

/* --------------------------------- profil --------------------------------- */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const nouveauCode = () =>
  Array.from({ length: 6 }, () => ALPHABET[Math.random() * ALPHABET.length | 0]).join('');

/* Le code est créé au premier besoin : un compte ouvert par l'administration
   n'en a pas encore. */
async function profil(enseignantId) {
  let p = await un('SELECT code FROM enseignants WHERE utilisateur_id = ?', [enseignantId]);
  for (let essai = 0; !p && essai < 6; essai++) {
    try {
      const code = nouveauCode();
      await executer('INSERT INTO enseignants (utilisateur_id, code) VALUES (?, ?)', [enseignantId, code]);
      p = { code };
    } catch (e) {
      if (e.code !== 'ER_DUP_ENTRY') throw e;
      /* Code déjà pris, ou profil créé à l'instant par une autre requête. */
      p = await un('SELECT code FROM enseignants WHERE utilisateur_id = ?', [enseignantId]);
    }
  }
  const matieres = await tous(
    `SELECT m.id, m.nom, m.teinte FROM enseignant_matieres em
       JOIN matieres m ON m.id = em.matiere_id
      WHERE em.enseignant_id = ? ORDER BY m.ordre, m.id`, [enseignantId]);
  return { code: p.code, matieres };
}

/* Un enseignant actif, retrouvé par le code qu'il a donné à ses élèves. */
async function parCode(code) {
  code = String(code || '').trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) return null;
  const e = await un(
    `SELECT u.id, u.nom FROM enseignants en
       JOIN utilisateurs u ON u.id = en.utilisateur_id
      WHERE en.code = ? AND u.role = 'enseignant' AND u.actif = 1`, [code]);
  if (!e) return null;
  e.matieres = await tous(
    `SELECT m.id, m.nom FROM enseignant_matieres em JOIN matieres m ON m.id = em.matiere_id
      WHERE em.enseignant_id = ? ORDER BY m.ordre, m.id`, [e.id]);
  return e;
}

/* ------------------------------ côté élève -------------------------------- */

/* L'élève désigne son professeur pour une matière, ou le retire (code vide). */
async function designer(eleveId, matiereId, code) {
  matiereId = Number(matiereId);
  if (!code) {
    await executer('DELETE FROM referents WHERE eleve_id = ? AND matiere_id = ?', [eleveId, matiereId]);
    return null;
  }
  const e = await parCode(code);
  if (!e) throw erreur(404, 'Aucun enseignant ne correspond à ce code.');
  if (!e.matieres.some(m => m.id === matiereId))
    throw erreur(400, `${e.nom} n’enseigne pas cette matière sur Cashevent School.`);

  /* « depuis » est évalué avant la mise à jour de l'enseignant : il ne repart
     de zéro que si l'élève change réellement de professeur. */
  await executer(
    `INSERT INTO referents (eleve_id, matiere_id, enseignant_id) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       depuis = IF(enseignant_id = VALUES(enseignant_id), depuis, CURRENT_TIMESTAMP),
       enseignant_id = VALUES(enseignant_id)`,
    [eleveId, matiereId, e.id]);
  return { id: e.id, nom: e.nom };
}

/* Toutes les matières, avec le professeur choisi quand il y en a un. */
const referentsEleve = eleveId => tous(
  `SELECT m.id, m.nom, m.teinte, u.nom AS enseignant
     FROM matieres m
     LEFT JOIN referents r ON r.matiere_id = m.id AND r.eleve_id = ?
     LEFT JOIN utilisateurs u ON u.id = r.enseignant_id AND u.actif = 1
    ORDER BY m.ordre, m.id`, [eleveId]);

/* Ce que les professeurs ont adressé à l'élève : TP à faire et messages. */
async function travauxEleve(eleveId) {
  const [tp, messages] = await Promise.all([
    tous(
      `SELECT e.id, e.titre, e.consigne, e.echeance, e.fichier_nom, e.taille, e.cree_le,
              d.telecharge_le, m.nom AS matiere, m.teinte, u.nom AS enseignant
         FROM tp_destinataires d
         JOIN tp_envois e ON e.id = d.envoi_id
         JOIN matieres m ON m.id = e.matiere_id
         JOIN utilisateurs u ON u.id = e.enseignant_id
        WHERE d.eleve_id = ?
        ORDER BY e.cree_le DESC LIMIT 30`, [eleveId]),
    tous(
      `SELECT s.id, s.statut, s.commentaire, COALESCE(s.maj_le, s.cree_le) AS le, s.lu_le,
              m.nom AS matiere, m.teinte, u.nom AS enseignant
         FROM suivis s
         JOIN matieres m ON m.id = s.matiere_id
         JOIN utilisateurs u ON u.id = s.enseignant_id
        WHERE s.eleve_id = ? AND s.commentaire IS NOT NULL AND s.commentaire <> ''
          AND s.cree_le >= DATE_SUB(NOW(), INTERVAL 60 DAY)
        ORDER BY le DESC LIMIT 20`, [eleveId])
  ]);
  return { tp, messages };
}

/* ---------------------------- côté enseignant ----------------------------- */

/* Le dossier d'un élève dans UNE matière. Rien des autres matières n'en sort :
   les lignes sont filtrées avant tout calcul. */
async function dossier(eleveId, matiereId, lignesEleve, { detail = true } = {}) {
  const ls = (lignesEleve || await prog.lignes(eleveId))
    .filter(l => l.matiere_id === Number(matiereId));

  const chapitres = ls.map(l => ({
    id: l.id, numero: l.numero, titre: l.titre,
    avancement: Math.round(prog.avancement(l) * 100),
    termine: prog.estTermine(l),
    aRevoir: prog.aRevoir(l),
    score: l.score === null || l.score === undefined ? null : Number(l.score),
    qcmLe: l.terminee_le || null
  }));

  const notes = chapitres.map(c => c.score).filter(s => s !== null);
  const revoir = chapitres.filter(c => c.aRevoir);
  const total = chapitres.length;

  /* Dernière trace dans la matière : progression d'un chapitre ou QCM terminé. */
  let derniere = null;
  for (const l of ls) for (const d of [l.maj, l.terminee_le]) {
    if (d && (!derniere || new Date(d) > derniere)) derniere = new Date(d);
  }
  const joursInactif = derniere ? Math.floor((Date.now() - derniere) / 86400000) : null;

  /* Les raisons pour lesquelles un élève mérite un regard ce mois-ci. */
  const raisons = [];
  if (revoir.length)
    raisons.push(`${revoir.length} chapitre${revoir.length > 1 ? 's' : ''} sous ${config.seuilARevoir} % au QCM`);
  if (joursInactif === null) raisons.push('n’a pas encore commencé la matière');
  else if (joursInactif >= config.inactiviteJours)
    raisons.push(`aucune activité dans la matière depuis ${joursInactif} jours`);

  const resume = {
    total,
    termines: chapitres.filter(c => c.termine).length,
    avancement: total ? Math.round(chapitres.reduce((s, c) => s + c.avancement, 0) / total) : 0,
    moyenne: notes.length ? Math.round(notes.reduce((a, b) => a + b, 0) / notes.length) : null,
    qcmFaits: notes.length,
    aRevoir: revoir.length,
    revoirIds: revoir.map(c => c.id),
    derniereActivite: derniere,
    joursInactif,
    besoinAide: raisons.length > 0,
    raisons
  };
  if (!detail) return resume;

  const notionsDifficiles = revoir.length ? await tous(
    `SELECT n.libelle, c.titre AS chapitre
       FROM notions n JOIN chapitres c ON c.id = n.chapitre_id
      WHERE n.chapitre_id IN (${revoir.map(() => '?').join(',')})
      ORDER BY c.numero, n.ordre`, revoir.map(c => c.id)) : [];

  return { ...resume, chapitres, notionsDifficiles };
}

/* Les élèves qui ont désigné cet enseignant, une ligne par matière. Les lignes
   de progression peuvent être fournies quand l'appelant les a déjà. */
async function eleves(enseignantId, mois, lignesPretes = null) {
  const refs = await tous(
    `SELECT r.eleve_id, r.matiere_id, r.depuis, u.nom, u.filiere,
            m.nom AS matiere, m.teinte,
            s.statut, COALESCE(s.maj_le, s.cree_le) AS suivi_le
       FROM referents r
       JOIN utilisateurs u ON u.id = r.eleve_id AND u.actif = 1
       JOIN matieres m ON m.id = r.matiere_id
       LEFT JOIN suivis s ON s.enseignant_id = r.enseignant_id AND s.eleve_id = r.eleve_id
                         AND s.matiere_id = r.matiere_id AND s.mois = ?
      WHERE r.enseignant_id = ?
      ORDER BY m.ordre, u.nom`, [mois, enseignantId]);

  /* Toute la progression en une fois : le coût ne dépend plus du nombre d'élèves. */
  const lignes = lignesPretes || await prog.lignesEnseignant(enseignantId);
  const liste = [];
  for (const r of refs) {
    const d = await dossier(r.eleve_id, r.matiere_id, lignes.get(r.eleve_id) || [], { detail: false });
    liste.push({
      eleve: { id: r.eleve_id, nom: r.nom, filiere: r.filiere },
      matiere: { id: r.matiere_id, nom: r.matiere, teinte: r.teinte },
      depuis: r.depuis,
      ...d,
      suivi: r.statut ? { statut: r.statut, le: r.suivi_le } : null
    });
  }
  return liste;
}

/* Les chiffres d'un groupe de lignes (une matière, une classe, tout le monde). */
function statsGroupe(rows) {
  const notes = rows.map(r => r.moyenne).filter(n => n !== null);
  const actifs = rows.filter(r => r.joursInactif !== null && r.joursInactif <= 7);
  return {
    eleves: new Set(rows.map(r => r.eleve.id)).size,
    suivis: rows.length,
    avancement: moyenne(rows.map(r => r.avancement)) || 0,
    moyenne: moyenne(notes),
    chapitresTermines: rows.reduce((s, r) => s + r.termines, 0),
    qcmFaits: rows.reduce((s, r) => s + r.qcmFaits, 0),
    aSuivre: rows.filter(r => r.besoinAide).length,
    inactifs: rows.filter(r => r.joursInactif !== null && r.joursInactif >= config.inactiviteJours).length,
    pasCommence: rows.filter(r => r.joursInactif === null).length,
    actifs7: new Set(actifs.map(r => r.eleve.id)).size,
    suivisFaits: rows.filter(r => r.suivi).length
  };
}

/* Où en est la classe, chapitre par chapitre : combien l'ont commencé, fini,
   raté. C'est la carte qui dit à l'enseignant quel chapitre reprendre en cours. */
function carteChapitres(lignes) {
  const parChap = new Map();
  for (const ls of lignes.values()) for (const l of ls) {
    let a = parChap.get(l.id);
    if (!a) {
      a = { id: l.id, numero: l.numero, titre: l.titre,
            matiere: { id: l.matiere_id, nom: l.matiere_nom, teinte: l.teinte, ordre: l.matiere_ordre },
            eleves: 0, commences: 0, termines: 0, aRevoir: 0, notes: [] };
      parChap.set(l.id, a);
    }
    a.eleves++;
    if (prog.avancement(l) > 0) a.commences++;
    if (prog.estTermine(l)) a.termines++;
    if (prog.aRevoir(l)) a.aRevoir++;
    if (l.score !== null && l.score !== undefined) a.notes.push(Number(l.score));
  }
  const parMat = new Map();
  for (const a of parChap.values()) {
    const m = parMat.get(a.matiere.id) || { matiere: a.matiere, chapitres: [] };
    m.chapitres.push({
      id: a.id, numero: a.numero, titre: a.titre, eleves: a.eleves,
      commences: a.commences, termines: a.termines, aRevoir: a.aRevoir,
      qcm: a.notes.length, moyenne: moyenne(a.notes)
    });
    parMat.set(a.matiere.id, m);
  }
  return [...parMat.values()]
    .sort((x, y) => x.matiere.ordre - y.matiere.ordre)
    .map(m => ({ ...m, chapitres: m.chapitres.sort((x, y) => x.numero - y.numero) }));
}

/* L'activité semaine par semaine, dans les seules matières où l'enseignant a
   été désigné : séances vues et QCM terminés. Pour toute la classe, ou pour un
   élève dans une matière. Les semaines vides sont renvoyées à zéro. */
async function activiteHebdo({ enseignantId, eleveId = null, matiereId = null }, nb = 8) {
  const portee = () => {
    const w = ['r.enseignant_id = ?'], p = [enseignantId];
    if (eleveId) { w.push('x.eleve_id = ?'); p.push(eleveId); }
    if (matiereId) { w.push('c.matiere_id = ?'); p.push(matiereId); }
    return { w: w.join(' AND '), p };
  };
  const a = portee(), b = portee();
  const [lignes, { lundi }] = await Promise.all([
    tous(`
      SELECT lundi, COUNT(DISTINCT eleve_id) AS actifs, SUM(evenements) AS evenements,
             SUM(qcm) AS qcm, ROUND(AVG(score)) AS score
        FROM (
          SELECT x.eleve_id, DATE_SUB(DATE(x.vu_le), INTERVAL WEEKDAY(x.vu_le) DAY) AS lundi,
                 1 AS evenements, 0 AS qcm, NULL AS score
            FROM seances_vues x
            JOIN seances s ON s.id = x.seance_id
            JOIN chapitres c ON c.id = s.chapitre_id
            JOIN referents r ON r.eleve_id = x.eleve_id AND r.matiere_id = c.matiere_id
           WHERE ${a.w} AND x.vu_le >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)
          UNION ALL
          SELECT x.eleve_id, DATE_SUB(DATE(x.terminee_le), INTERVAL WEEKDAY(x.terminee_le) DAY),
                 1, 1, x.score
            FROM tentatives_qcm x
            JOIN chapitres c ON c.id = x.chapitre_id
            JOIN referents r ON r.eleve_id = x.eleve_id AND r.matiere_id = c.matiere_id
           WHERE ${b.w} AND x.terminee = 1
             AND x.terminee_le >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)
        ) t GROUP BY lundi`, [...a.p, nb, ...b.p, nb]),
    un('SELECT DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AS lundi')
  ]);
  const carte = new Map(lignes.map(l => [String(l.lundi), l]));
  const semaines = [];
  for (let i = nb - 1; i >= 0; i--) {
    const d = new Date(lundi + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 7 * i);
    const k = d.toISOString().slice(0, 10);
    const l = carte.get(k);
    semaines.push({
      debut: k,
      actifs: l ? Number(l.actifs) : 0,
      evenements: l ? Number(l.evenements) : 0,
      qcm: l ? Number(l.qcm) : 0,
      score: l && l.score !== null ? Number(l.score) : null
    });
  }
  return semaines;
}

/* Ce que les élèves ont fait de ce que l'enseignant leur a envoyé. */
async function indicateurs(enseignantId, mois) {
  const [msg, tp] = await Promise.all([
    un(`SELECT COUNT(*) AS n, COALESCE(SUM(lu_le IS NOT NULL), 0) AS lus
          FROM suivis
         WHERE enseignant_id = ? AND mois = ? AND commentaire IS NOT NULL AND commentaire <> ''`,
       [enseignantId, mois]),
    un(`SELECT COUNT(DISTINCT e.id) AS envois, COUNT(d.eleve_id) AS destinataires,
               COALESCE(SUM(d.telecharge_le IS NOT NULL), 0) AS telecharges
          FROM tp_envois e LEFT JOIN tp_destinataires d ON d.envoi_id = e.id
         WHERE e.enseignant_id = ?`, [enseignantId])
  ]);
  return {
    messages: { envoyes: Number(msg.n), lus: Number(msg.lus) },
    tp: { envois: Number(tp.envois), destinataires: Number(tp.destinataires), telecharges: Number(tp.telecharges) }
  };
}

/* ------------------------- le dossier complet d'un élève ------------------ */

/* Tous les QCM terminés dans la matière, du plus ancien au plus récent : la
   courbe des scores. */
const tentativesEleve = async (eleveId, matiereId) => (await tous(
  `SELECT t.id, t.chapitre_id, c.numero, c.titre, t.score, t.justes, t.total, t.terminee_le
     FROM tentatives_qcm t JOIN chapitres c ON c.id = t.chapitre_id
    WHERE t.eleve_id = ? AND c.matiere_id = ? AND t.terminee = 1
    ORDER BY t.terminee_le DESC LIMIT 40`, [eleveId, matiereId])).reverse();

/* Les derniers évènements de l'élève dans la matière, toutes sources confondues. */
const chronologie = (enseignantId, eleveId, matiereId, limite = 40) => tous(
  `SELECT * FROM (
     SELECT 'seance' AS type, x.vu_le AS le, s.titre AS titre, c.titre AS chapitre, NULL AS valeur
       FROM seances_vues x JOIN seances s ON s.id = x.seance_id JOIN chapitres c ON c.id = s.chapitre_id
      WHERE x.eleve_id = ? AND c.matiere_id = ?
     UNION ALL
     SELECT 'qcm', t.terminee_le, NULL, c.titre, t.score
       FROM tentatives_qcm t JOIN chapitres c ON c.id = t.chapitre_id
      WHERE t.eleve_id = ? AND c.matiere_id = ? AND t.terminee = 1
     UNION ALL
     SELECT 'termine', p.maj, NULL, c.titre, NULL
       FROM progression p JOIN chapitres c ON c.id = p.chapitre_id
      WHERE p.eleve_id = ? AND c.matiere_id = ? AND p.termine = 1
     UNION ALL
     SELECT 'tp', d.telecharge_le, e.titre, NULL, NULL
       FROM tp_destinataires d JOIN tp_envois e ON e.id = d.envoi_id
      WHERE d.eleve_id = ? AND e.matiere_id = ? AND e.enseignant_id = ? AND d.telecharge_le IS NOT NULL
     UNION ALL
     SELECT 'lu', s.lu_le, NULL, NULL, NULL
       FROM suivis s
      WHERE s.eleve_id = ? AND s.matiere_id = ? AND s.enseignant_id = ? AND s.lu_le IS NOT NULL
   ) t ORDER BY le DESC LIMIT ?`,
  [eleveId, matiereId, eleveId, matiereId, eleveId, matiereId,
   eleveId, matiereId, enseignantId, eleveId, matiereId, enseignantId, limite]);

/* Les TP que cet enseignant a adressés à l'élève dans la matière. */
const tpEleve = (enseignantId, eleveId, matiereId) => tous(
  `SELECT e.id, e.titre, e.echeance, e.cree_le, d.telecharge_le
     FROM tp_destinataires d JOIN tp_envois e ON e.id = d.envoi_id
    WHERE d.eleve_id = ? AND e.enseignant_id = ? AND e.matiere_id = ?
    ORDER BY e.cree_le DESC LIMIT 20`, [eleveId, enseignantId, matiereId]);

/* ---------------------------- carnet de l'enseignant ---------------------- */
const notes = (enseignantId, eleveId, matiereId) => tous(
  `SELECT id, texte, cree_le FROM notes_enseignant
    WHERE enseignant_id = ? AND eleve_id = ? AND matiere_id = ?
    ORDER BY cree_le DESC LIMIT 50`, [enseignantId, eleveId, matiereId]);

async function ajouterNote(enseignantId, eleveId, matiereId, texte) {
  texte = String(texte || '').trim().slice(0, 1000);
  if (texte.length < 2) throw erreur(400, 'Écrivez une note.');
  const r = await executer(
    'INSERT INTO notes_enseignant (enseignant_id, eleve_id, matiere_id, texte) VALUES (?, ?, ?, ?)',
    [enseignantId, eleveId, matiereId, texte]);
  return un('SELECT id, texte, cree_le FROM notes_enseignant WHERE id = ?', [r.insertId]);
}

const supprimerNote = (enseignantId, id) => executer(
  'DELETE FROM notes_enseignant WHERE id = ? AND enseignant_id = ?', [id, enseignantId]);

/* --------------------------------- classes -------------------------------- */
const COULEURS = ['#4c8dff', '#3fd08a', '#f5a524', '#CD5CB4', '#7b3bf5', '#ff6b6b', '#20c6c6', '#9db6ff'];

async function classes(enseignantId) {
  const rows = await tous(
    `SELECT k.id, k.nom, k.couleur, k.cree_le, m.id AS matiere_id, m.nom AS matiere_nom, m.teinte,
            (SELECT COUNT(*) FROM classe_eleves ce
               JOIN utilisateurs u ON u.id = ce.eleve_id AND u.actif = 1
              WHERE ce.classe_id = k.id) AS effectif
       FROM classes k LEFT JOIN matieres m ON m.id = k.matiere_id
      WHERE k.enseignant_id = ? ORDER BY k.nom`, [enseignantId]);
  return rows.map(k => ({
    id: k.id, nom: k.nom, couleur: k.couleur, creeLe: k.cree_le, effectif: Number(k.effectif),
    matiere: k.matiere_id ? { id: k.matiere_id, nom: k.matiere_nom, teinte: k.teinte } : null
  }));
}

/* eleveId → [classeId] pour toutes les classes de l'enseignant. */
async function appartenances(enseignantId) {
  const rows = await tous(
    `SELECT ce.classe_id, ce.eleve_id FROM classe_eleves ce
       JOIN classes k ON k.id = ce.classe_id WHERE k.enseignant_id = ?`, [enseignantId]);
  const m = new Map();
  for (const r of rows) {
    if (!m.has(r.eleve_id)) m.set(r.eleve_id, []);
    m.get(r.eleve_id).push(r.classe_id);
  }
  return m;
}

const classeDe = (enseignantId, id) => un(
  'SELECT id, nom, couleur, matiere_id FROM classes WHERE id = ? AND enseignant_id = ?', [id, enseignantId]);

/* Les lignes d'élèves qui composent une classe : ses membres, dans sa matière
   s'il y en a une, dans toutes celles où ils ont désigné l'enseignant sinon. */
const lignesClasse = (liste, classe, membres) => liste.filter(r =>
  membres.has(r.eleve.id) && (!classe.matiere_id || r.matiere.id === classe.matiere_id));

async function verifierMatiere(enseignantId, matiereId) {
  const ok = await un('SELECT 1 AS ok FROM enseignant_matieres WHERE enseignant_id = ? AND matiere_id = ?',
    [enseignantId, matiereId]);
  if (!ok) throw erreur(400, 'Vous n’enseignez pas cette matière.');
}

async function creerClasse(enseignantId, { nom, matiereId, couleur }) {
  nom = String(nom || '').trim().slice(0, 80);
  if (nom.length < 2) throw erreur(400, 'Donnez un nom à la classe (2 caractères au moins).');
  if (matiereId) await verifierMatiere(enseignantId, matiereId);
  try {
    const r = await executer('INSERT INTO classes (enseignant_id, matiere_id, nom, couleur) VALUES (?, ?, ?, ?)',
      [enseignantId, matiereId || null, nom, COULEURS.includes(couleur) ? couleur : COULEURS[0]]);
    return r.insertId;
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw erreur(409, 'Vous avez déjà une classe de ce nom.');
    throw e;
  }
}

async function modifierClasse(enseignantId, id, { nom, couleur, matiereId }) {
  const set = [], p = [];
  if (nom !== undefined) {
    nom = String(nom || '').trim().slice(0, 80);
    if (nom.length < 2) throw erreur(400, 'Donnez un nom à la classe (2 caractères au moins).');
    set.push('nom = ?'); p.push(nom);
  }
  if (couleur !== undefined && COULEURS.includes(couleur)) { set.push('couleur = ?'); p.push(couleur); }
  if (matiereId !== undefined) {
    if (matiereId) await verifierMatiere(enseignantId, matiereId);
    set.push('matiere_id = ?'); p.push(matiereId || null);
  }
  if (!set.length) return;
  try {
    await executer(`UPDATE classes SET ${set.join(', ')} WHERE id = ? AND enseignant_id = ?`, [...p, id, enseignantId]);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw erreur(409, 'Vous avez déjà une classe de ce nom.');
    throw e;
  }
}

const supprimerClasse = (enseignantId, id) =>
  executer('DELETE FROM classes WHERE id = ? AND enseignant_id = ?', [id, enseignantId]);

/* N'entrent dans une classe que des élèves qui ont désigné l'enseignant — dans
   la matière de la classe quand elle en a une. Les autres sont ignorés. */
async function ajouterEleves(enseignantId, classe, eleveIds) {
  eleveIds = [...new Set(eleveIds)];
  if (!eleveIds.length) return 0;
  const siens = (await tous(
    `SELECT DISTINCT eleve_id FROM referents
      WHERE enseignant_id = ? AND eleve_id IN (?)${classe.matiere_id ? ' AND matiere_id = ?' : ''}`,
    classe.matiere_id ? [enseignantId, eleveIds, classe.matiere_id] : [enseignantId, eleveIds]))
    .map(r => r.eleve_id);
  if (!siens.length) return 0;
  const r = await executer('INSERT IGNORE INTO classe_eleves (classe_id, eleve_id) VALUES ?',
    [siens.map(e => [classe.id, e])]);
  return r.affectedRows;
}

const retirerEleve = (classeId, eleveId) =>
  executer('DELETE FROM classe_eleves WHERE classe_id = ? AND eleve_id = ?', [classeId, eleveId]);

const membres = async classeId => new Set(
  (await tous('SELECT eleve_id FROM classe_eleves WHERE classe_id = ?', [classeId])).map(r => r.eleve_id));

/* Les chapitres qui coincent pour le plus d'élèves, avec leurs notions. */
async function notionsDifficiles(liste, limite = 8) {
  const compte = new Map();
  for (const r of liste) for (const id of r.revoirIds) {
    compte.set(id, (compte.get(id) || 0) + 1);
  }
  const top = [...compte.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite);
  if (!top.length) return [];

  const ids = top.map(([id]) => id);
  const lignes = await tous(
    `SELECT c.id, c.titre, c.matiere_id, m.nom AS matiere, m.teinte,
            GROUP_CONCAT(n.libelle ORDER BY n.ordre SEPARATOR '||') AS notions
       FROM chapitres c
       JOIN matieres m ON m.id = c.matiere_id
       LEFT JOIN notions n ON n.chapitre_id = c.id
      WHERE c.id IN (${ids.map(() => '?').join(',')})
      GROUP BY c.id, c.titre, c.matiere_id, m.nom, m.teinte`, ids);

  return top.map(([id, n]) => {
    const l = lignes.find(x => x.id === id);
    return {
      chapitre: l.titre,
      matiere: { id: l.matiere_id, nom: l.matiere, teinte: l.teinte },
      eleves: n,
      notions: l.notions ? l.notions.split('||') : []
    };
  });
}

/* Ce que Cashevent doit à l'enseignant pour un mois donné. */
async function remuneration(enseignantId, mois) {
  const [refs, faits, historique] = await Promise.all([
    un(`SELECT COUNT(*) AS n FROM referents r
          JOIN utilisateurs u ON u.id = r.eleve_id AND u.actif = 1
         WHERE r.enseignant_id = ?`, [enseignantId]),
    un('SELECT COUNT(*) AS n FROM suivis WHERE enseignant_id = ? AND mois = ?', [enseignantId, mois]),
    tous(`SELECT mois, COUNT(*) AS n FROM suivis WHERE enseignant_id = ?
           GROUP BY mois ORDER BY mois DESC LIMIT 6`, [enseignantId])
  ]);
  const suivis = Number(refs.n), fait = Number(faits.n);
  return {
    mois,
    tarif: tarif(),
    elevesSuivis: suivis,
    suivisFaits: fait,
    suivisRestants: Math.max(0, suivis - fait),
    du: montant(fait),
    potentiel: montant(suivis),
    historique: historique.map(h => ({ mois: h.mois, ...montant(Number(h.n)) }))
  };
}

/* Trace l'ouverture d'un dossier : sans elle, pas de suivi possible. */
const consigner = (enseignantId, eleveId, matiereId) => executer(
  'INSERT INTO consultations (enseignant_id, eleve_id, matiere_id) VALUES (?, ?, ?)',
  [enseignantId, eleveId, matiereId]);

/* Le suivi du mois en cours, pour cet élève et cette matière. */
const suiviDuMois = (enseignantId, eleveId, matiereId) => un(
  `SELECT statut, commentaire, consulte_le, cree_le, maj_le, lu_le
     FROM suivis
    WHERE enseignant_id = ? AND eleve_id = ? AND matiere_id = ?
      AND mois = DATE_FORMAT(NOW(), '%Y-%m')`, [enseignantId, eleveId, matiereId]);

/* Enregistre le suivi du mois en cours. Refusé sans consultation préalable. */
async function enregistrerSuivi(enseignantId, eleveId, matiereId, statut, commentaire) {
  if (!STATUTS.includes(statut)) throw erreur(400, 'Choisissez où en est l’élève.');
  commentaire = String(commentaire || '').trim().slice(0, 600);
  /* Quand l'élève a besoin d'être relancé, il faut lui dire quoi faire. */
  if (statut !== 'bonne_voie' && commentaire.length < 10)
    throw erreur(400, 'Écrivez à l’élève ce qu’il doit travailler (10 caractères au moins).');

  const vu = await un(
    `SELECT MAX(vu_le) AS le FROM consultations
      WHERE enseignant_id = ? AND eleve_id = ? AND matiere_id = ?
        AND vu_le >= DATE_FORMAT(NOW(), '%Y-%m-01')`, [enseignantId, eleveId, matiereId]);
  if (!vu || !vu.le)
    throw erreur(409, 'Ouvrez le dossier de l’élève avant d’enregistrer son suivi.');

  await executer(
    `INSERT INTO suivis (enseignant_id, eleve_id, matiere_id, mois, statut, commentaire, consulte_le)
     VALUES (?, ?, ?, DATE_FORMAT(NOW(), '%Y-%m'), ?, ?, ?)
     ON DUPLICATE KEY UPDATE statut = VALUES(statut), commentaire = VALUES(commentaire),
       consulte_le = VALUES(consulte_le), maj_le = CURRENT_TIMESTAMP, lu_le = NULL`,
    [enseignantId, eleveId, matiereId, statut, commentaire || null, vu.le]);
  return suiviDuMois(enseignantId, eleveId, matiereId);
}

module.exports = {
  STATUTS, COULEURS, erreur, moyenne, montant, tarif, moisCourant, moisValide,
  profil, parCode, designer, referentsEleve, travauxEleve,
  dossier, eleves, statsGroupe, carteChapitres, activiteHebdo, indicateurs,
  notionsDifficiles, remuneration,
  tentativesEleve, chronologie, tpEleve,
  notes, ajouterNote, supprimerNote,
  classes, appartenances, classeDe, lignesClasse, creerClasse, modifierClasse, supprimerClasse,
  ajouterEleves, retirerEleve, membres,
  consigner, suiviDuMois, enregistrerSuivi
};
