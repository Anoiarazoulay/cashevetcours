/* Le projet de l'élève : le métier qu'il vise.

   Quand il l'active, le programme s'illumine : chaque chapitre qui compte pour
   ce métier porte un poids (3 essentiel, 2 important, 1 utile) et une raison.
   Désactivé, tout redevient comme avant. Le choix reste enregistré.          */
const { tous, un, executer } = require('../db');
const prog = require('./progression');

const POIDS = { 3: 'Essentiel', 2: 'Important', 1: 'Utile' };

/* Tous les métiers proposés, avec le nombre de chapitres rattachés. */
const liste = () => tous(
  `SELECT m.id, m.code, m.nom, m.famille, m.glyphe, m.description,
          (SELECT COUNT(*) FROM metier_chapitres mc WHERE mc.metier_id = m.id) AS chapitres,
          (SELECT COUNT(*) FROM metier_chapitres mc WHERE mc.metier_id = m.id AND mc.poids = 3) AS essentiels
     FROM metiers m ORDER BY m.ordre, m.nom`);

const metier = id => un('SELECT id, code, nom, famille, glyphe, description FROM metiers WHERE id = ?', [id]);

/* Les chapitres d'un métier : chapitreId → { poids, raison }. */
async function chapitresDe(metierId) {
  const rows = await tous(
    'SELECT chapitre_id, poids, raison FROM metier_chapitres WHERE metier_id = ?', [metierId]);
  const carte = {};
  for (const r of rows) carte[r.chapitre_id] = { poids: r.poids, libelle: POIDS[r.poids], raison: r.raison };
  return carte;
}

/* Le choix de l'élève, tel que l'interface l'attend. */
async function duEleve(eleveId) {
  const u = await un('SELECT metier_id, metier_actif FROM utilisateurs WHERE id = ?', [eleveId]);
  if (!u || !u.metier_id) return null;
  const m = await metier(u.metier_id);
  if (!m) return null;
  return { ...m, actif: !!u.metier_actif, chapitres: await chapitresDe(m.id) };
}

/* Choisir un métier (ou le retirer avec null), et l'activer ou non. */
async function choisir(eleveId, metierId, actif) {
  if (metierId !== null) {
    const m = await metier(metierId);
    if (!m) throw Object.assign(new Error('Métier inconnu.'), { statut: 404 });
  }
  await executer('UPDATE utilisateurs SET metier_id = ?, metier_actif = ? WHERE id = ?',
    [metierId, metierId && actif ? 1 : 0, eleveId]);
  return duEleve(eleveId);
}

/* Où en est l'élève sur les chapitres de son métier. Les lignes de progression
   peuvent être fournies pour éviter une seconde lecture. */
async function progression(eleveId, lignes = null) {
  const p = await duEleve(eleveId);
  if (!p) return null;
  const ls = lignes || await prog.lignes(eleveId);
  const chapitres = ls
    .filter(l => p.chapitres[l.id])
    .map(l => ({
      id: l.id, numero: l.numero, titre: l.titre,
      matiere: { id: l.matiere_id, code: l.matiere_code, nom: l.matiere_nom, court: l.matiere_court, teinte: l.teinte },
      poids: p.chapitres[l.id].poids, libelle: p.chapitres[l.id].libelle, raison: p.chapitres[l.id].raison,
      avancement: Math.round(prog.avancement(l) * 100),
      termine: prog.estTermine(l),
      aRevoir: prog.aRevoir(l),
      score: l.score === null || l.score === undefined ? null : Number(l.score)
    }))
    .sort((a, b) => (b.poids - a.poids) || (a.matiere.id - b.matiere.id) || (a.numero - b.numero));
  const essentiels = chapitres.filter(c => c.poids === 3);
  const notes = chapitres.map(c => c.score).filter(s => s !== null);
  return {
    metier: { id: p.id, code: p.code, nom: p.nom, famille: p.famille, glyphe: p.glyphe, description: p.description },
    actif: p.actif,
    chapitres,
    total: chapitres.length,
    termines: chapitres.filter(c => c.termine).length,
    avancement: chapitres.length ? Math.round(chapitres.reduce((s, c) => s + c.avancement, 0) / chapitres.length) : 0,
    essentiels: essentiels.length,
    essentielsTermines: essentiels.filter(c => c.termine).length,
    moyenne: notes.length ? Math.round(notes.reduce((a, b) => a + b, 0) / notes.length) : null,
    aRevoir: chapitres.filter(c => c.aRevoir).length,
    prochain: chapitres.find(c => !c.termine) || null
  };
}

module.exports = { POIDS, liste, metier, chapitresDe, duEleve, choisir, progression };
