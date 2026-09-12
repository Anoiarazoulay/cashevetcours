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

/* Les élèves qui ont désigné cet enseignant, une ligne par matière. */
async function eleves(enseignantId, mois) {
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

  /* Un élève suivi dans deux matières ne fait calculer sa progression qu'une fois. */
  const cache = new Map();
  const liste = [];
  for (const r of refs) {
    if (!cache.has(r.eleve_id)) cache.set(r.eleve_id, await prog.lignes(r.eleve_id));
    const d = await dossier(r.eleve_id, r.matiere_id, cache.get(r.eleve_id), { detail: false });
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
  STATUTS, erreur, montant, tarif, moisCourant, moisValide,
  profil, parCode, designer, referentsEleve, travauxEleve,
  dossier, eleves, notionsDifficiles, remuneration,
  consigner, suiviDuMois, enregistrerSuivi
};
