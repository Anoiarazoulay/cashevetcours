/* Parcours de rattrapage.

   Lacune détectée (QCM raté, ou l'élève qui le demande lui-même) → les
   prérequis du chapitre, venus des classes antérieures → une fiche et une
   mini-évaluation par prérequis → quand tout est validé, l'élève refait le QCM
   du chapitre → un score au-dessus du seuil valide le parcours. Le parent et
   l'enseignant référent le voient avancer.                                   */
const config = require('../config');
const { tous, un, executer, transaction } = require('../db');

const SEUIL_ETAPE = 2 / 3;
const erreur = (statut, message) => Object.assign(new Error(message), { statut });
/* MySQL renvoie les colonnes JSON déjà décodées, MariaDB les renvoie en texte. */
const json = v => typeof v === 'string' ? JSON.parse(v) : (v || []);

/* ------------------------------- prérequis -------------------------------- */

const prerequisDuChapitre = chapitreId => tous(
  `SELECT p.id, p.ordre, p.niveau, p.titre, p.pourquoi,
          (SELECT COUNT(*) FROM prerequis_questions q WHERE q.prerequis_id = p.id) AS questions
     FROM prerequis p WHERE p.chapitre_id = ? ORDER BY p.ordre, p.id`, [chapitreId]);

/* La fiche complète, avec ses questions sans la bonne réponse. Les options
   sont mélangées à chaque lecture ; chacune garde son indice d'origine, que
   l'élève renvoie comme choix. */
const melanger = t => { const a = t.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
async function fiche(prerequisId) {
  const p = await un('SELECT * FROM prerequis WHERE id = ?', [prerequisId]);
  if (!p) return null;
  const questions = await tous(
    'SELECT id, enonce, options FROM prerequis_questions WHERE prerequis_id = ? ORDER BY ordre, id', [prerequisId]);
  return {
    id: p.id, chapitreId: p.chapitre_id, niveau: p.niveau, titre: p.titre, pourquoi: p.pourquoi,
    points: json(p.points), exemple: p.exemple, pieges: json(p.pieges),
    questions: questions.map(q => ({
      id: q.id, enonce: q.enonce,
      options: melanger(json(q.options).map((texte, i) => ({ i, texte })))
    }))
  };
}

/* -------------------------------- parcours -------------------------------- */

const enCours = (eleveId, chapitreId) => un(
  `SELECT * FROM parcours WHERE eleve_id = ? AND chapitre_id = ? AND etat = 'en_cours'
    ORDER BY cree_le DESC LIMIT 1`, [eleveId, chapitreId]);

const dernier = (eleveId, chapitreId) => un(
  `SELECT * FROM parcours WHERE eleve_id = ? AND chapitre_id = ?
    ORDER BY etat = 'en_cours' DESC, cree_le DESC LIMIT 1`, [eleveId, chapitreId]);

/* Crée le parcours d'un chapitre, ou renvoie celui déjà en cours. Sans
   prérequis en base, pas de parcours possible : on renvoie null. */
async function creer(eleveId, chapitreId, declencheur = 'qcm', score = null) {
  const existant = await enCours(eleveId, chapitreId);
  if (existant) return detail(eleveId, existant.id);
  const prerequis = await prerequisDuChapitre(chapitreId);
  if (!prerequis.length) return null;
  const id = await transaction(async cx => {
    const [r] = await cx.query(
      'INSERT INTO parcours (eleve_id, chapitre_id, declencheur, score_initial) VALUES (?, ?, ?, ?)',
      [eleveId, chapitreId, declencheur, score]);
    await cx.query('INSERT INTO parcours_etapes (parcours_id, prerequis_id, ordre) VALUES ?',
      [prerequis.map((p, i) => [r.insertId, p.id, i])]);
    return r.insertId;
  });
  return detail(eleveId, id);
}

/* Le parcours avec ses étapes et le chapitre concerné. */
async function detail(eleveId, parcoursId) {
  const p = await un(
    `SELECT p.*, c.numero, c.titre AS chapitre, m.id AS matiere_id, m.nom AS matiere, m.court, m.teinte, m.glyphe
       FROM parcours p JOIN chapitres c ON c.id = p.chapitre_id JOIN matieres m ON m.id = c.matiere_id
      WHERE p.id = ? AND p.eleve_id = ?`, [parcoursId, eleveId]);
  if (!p) return null;
  const etapes = await tous(
    `SELECT e.prerequis_id AS id, e.ordre, e.etat, e.score, e.essais, e.fait_le,
            r.niveau, r.titre, r.pourquoi,
            (SELECT COUNT(*) FROM prerequis_questions q WHERE q.prerequis_id = r.id) AS questions
       FROM parcours_etapes e JOIN prerequis r ON r.id = e.prerequis_id
      WHERE e.parcours_id = ? ORDER BY e.ordre`, [parcoursId]);
  const validees = etapes.filter(e => e.etat === 'valide').length;
  return {
    id: p.id, etat: p.etat, declencheur: p.declencheur,
    scoreInitial: p.score_initial, scoreFinal: p.score_final,
    creeLe: p.cree_le, majLe: p.maj_le, termineLe: p.termine_le,
    chapitre: { id: p.chapitre_id, numero: p.numero, titre: p.chapitre,
      matiere: { id: p.matiere_id, nom: p.matiere, court: p.court, teinte: p.teinte, glyphe: p.glyphe } },
    etapes: etapes.map(e => ({ ...e, questions: Number(e.questions) })),
    total: etapes.length, validees,
    pretPourQCM: etapes.length > 0 && validees === etapes.length,
    prochaine: etapes.find(e => e.etat !== 'valide') || null,
    seuil: config.seuilARevoir
  };
}

/* L'élève répond à la mini-évaluation d'une étape : tout est corrigé ici. */
async function repondre(eleveId, parcoursId, prerequisId, reponses) {
  const p = await un('SELECT id, etat FROM parcours WHERE id = ? AND eleve_id = ?', [parcoursId, eleveId]);
  if (!p) throw erreur(404, 'Parcours introuvable.');
  if (p.etat !== 'en_cours') throw erreur(409, 'Ce parcours est terminé.');
  const etape = await un('SELECT * FROM parcours_etapes WHERE parcours_id = ? AND prerequis_id = ?',
    [parcoursId, prerequisId]);
  if (!etape) throw erreur(404, 'Cette étape ne fait pas partie du parcours.');

  const questions = await tous(
    'SELECT id, options, correcte, explication FROM prerequis_questions WHERE prerequis_id = ? ORDER BY ordre, id',
    [prerequisId]);
  if (!questions.length) throw erreur(409, 'Cette fiche n’a pas encore de questions.');

  const choix = new Map((Array.isArray(reponses) ? reponses : [])
    .map(r => [Number(r.questionId), Number(r.choix)]));
  const corrections = questions.map(q => {
    const c = choix.has(q.id) ? choix.get(q.id) : null;
    return { questionId: q.id, choix: c, bonne: q.correcte, correcte: c === q.correcte, explication: q.explication };
  });
  const justes = corrections.filter(c => c.correcte).length;
  const score = Math.round(justes / questions.length * 100);
  const valide = justes / questions.length >= SEUIL_ETAPE;

  await executer(
    `UPDATE parcours_etapes SET etat = ?, score = ?, essais = essais + 1, fait_le = NOW()
      WHERE parcours_id = ? AND prerequis_id = ?`,
    [valide ? 'valide' : 'a_revoir', score, parcoursId, prerequisId]);
  await executer('UPDATE parcours SET maj_le = NOW() WHERE id = ?', [parcoursId]);

  return { score, justes, total: questions.length, valide, corrections, parcours: await detail(eleveId, parcoursId) };
}

async function abandonner(eleveId, parcoursId) {
  const r = await executer(
    `UPDATE parcours SET etat = 'abandonne', termine_le = NOW() WHERE id = ? AND eleve_id = ? AND etat = 'en_cours'`,
    [parcoursId, eleveId]);
  if (!r.affectedRows) throw erreur(404, 'Parcours introuvable.');
}

/* Après un QCM de chapitre : sous le seuil, on propose un parcours ; au-dessus,
   on valide celui qui était en cours. */
async function apresQCM(eleveId, chapitreId, score) {
  if (score < config.seuilARevoir) {
    const existant = await enCours(eleveId, chapitreId);
    const parcours = existant ? await detail(eleveId, existant.id) : await creer(eleveId, chapitreId, 'qcm', score);
    return { parcours, nouveau: !existant && !!parcours, valide: false };
  }
  const existant = await enCours(eleveId, chapitreId);
  if (!existant) return { parcours: null, nouveau: false, valide: false };
  await executer(
    `UPDATE parcours SET etat = 'valide', score_final = ?, termine_le = NOW() WHERE id = ?`,
    [score, existant.id]);
  return { parcours: await detail(eleveId, existant.id), nouveau: false, valide: true };
}

/* Tous les parcours d'un élève, les plus récents d'abord. Filtrable par
   matière pour l'enseignant référent, qui ne voit que la sienne. */
async function liste(eleveId, { matiereId = null, limite = 30 } = {}) {
  const rows = await tous(
    `SELECT p.id, p.etat, p.declencheur, p.score_initial, p.score_final, p.cree_le, p.maj_le, p.termine_le,
            c.id AS chapitre_id, c.numero, c.titre, m.id AS matiere_id, m.nom AS matiere, m.court, m.teinte,
            (SELECT COUNT(*) FROM parcours_etapes e WHERE e.parcours_id = p.id) AS total,
            (SELECT COUNT(*) FROM parcours_etapes e WHERE e.parcours_id = p.id AND e.etat = 'valide') AS validees
       FROM parcours p JOIN chapitres c ON c.id = p.chapitre_id JOIN matieres m ON m.id = c.matiere_id
      WHERE p.eleve_id = ?${matiereId ? ' AND c.matiere_id = ?' : ''}
      ORDER BY p.etat = 'en_cours' DESC, p.maj_le DESC LIMIT ?`,
    matiereId ? [eleveId, matiereId, limite] : [eleveId, limite]);
  return rows.map(r => ({
    id: r.id, etat: r.etat, declencheur: r.declencheur,
    scoreInitial: r.score_initial, scoreFinal: r.score_final,
    creeLe: r.cree_le, majLe: r.maj_le, termineLe: r.termine_le,
    chapitre: { id: r.chapitre_id, numero: r.numero, titre: r.titre,
      matiere: { id: r.matiere_id, nom: r.matiere, court: r.court, teinte: r.teinte } },
    total: Number(r.total), validees: Number(r.validees),
    pretPourQCM: Number(r.total) > 0 && Number(r.validees) === Number(r.total)
  }));
}

module.exports = {
  prerequisDuChapitre, fiche, enCours, dernier, creer, detail, repondre, abandonner, apresQCM, liste
};
