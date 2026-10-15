/* Contenu du projet de l'élève : les métiers et les fiches de prérequis.

   Les deux viennent de fichiers versionnés (donnees/metiers.js et
   donnees/prerequis.js). Ils s'appliquent au démarrage, comme les vidéos :
   une base en ligne les reçoit sans terminal.

   Les métiers sont resynchronisés à chaque démarrage (quatorze lignes, un
   instant). Les fiches de prérequis ne sont posées que pour les chapitres qui
   n'en ont pas encore : on ne réécrit jamais une fiche déjà en base.       */
const { tous, un, executer, transaction } = require('../src/db');

async function cartesChapitres() {
  const chapitres = await tous(
    `SELECT c.id, c.numero, m.code AS matiere FROM chapitres c JOIN matieres m ON m.id = c.matiere_id`);
  return new Map(chapitres.map(c => [c.matiere + '#' + c.numero, c.id]));
}

async function appliquerMetiers(parCle) {
  const METIERS = require('./donnees/metiers');
  let liens = 0;
  for (const [i, m] of METIERS.entries()) {
    await executer(
      `INSERT INTO metiers (code, nom, famille, glyphe, description, ordre) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nom = VALUES(nom), famille = VALUES(famille), glyphe = VALUES(glyphe),
         description = VALUES(description), ordre = VALUES(ordre)`,
      [m.code, m.nom, m.famille, m.glyphe, m.description, i]);
    const { id } = await un('SELECT id FROM metiers WHERE code = ?', [m.code]);
    const lignes = m.chapitres
      .map(c => [id, parCle.get(c.matiere + '#' + c.numero), c.poids, c.raison])
      .filter(l => l[1]);
    await transaction(async cx => {
      await cx.query('DELETE FROM metier_chapitres WHERE metier_id = ?', [id]);
      if (lignes.length)
        await cx.query('INSERT INTO metier_chapitres (metier_id, chapitre_id, poids, raison) VALUES ?', [lignes]);
    });
    liens += lignes.length;
  }
  return { metiers: METIERS.length, liens };
}

async function appliquerPrerequis(parCle) {
  const PREREQUIS = require('./donnees/prerequis');
  const deja = new Set((await tous('SELECT DISTINCT chapitre_id FROM prerequis')).map(r => r.chapitre_id));
  let fiches = 0, questions = 0;
  for (const ch of PREREQUIS) {
    const chapitreId = parCle.get(ch.matiere + '#' + ch.numero);
    if (!chapitreId || deja.has(chapitreId)) continue;
    await transaction(async cx => {
      for (const [i, p] of ch.prerequis.entries()) {
        const [r] = await cx.query(
          `INSERT INTO prerequis (chapitre_id, ordre, niveau, titre, pourquoi, points, exemple, pieges)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [chapitreId, i, p.niveau, p.titre, p.pourquoi, JSON.stringify(p.points),
           p.exemple || null, JSON.stringify(p.pieges || [])]);
        fiches++;
        for (const [j, q] of p.questions.entries()) {
          await cx.query(
            `INSERT INTO prerequis_questions (prerequis_id, ordre, enonce, options, correcte, explication)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [r.insertId, j, q.e, JSON.stringify(q.o), q.i, q.x]);
          questions++;
        }
      }
    });
  }
  return { fiches, questions };
}

async function appliquer({ silencieux = false } = {}) {
  const parCle = await cartesChapitres();
  const m = await appliquerMetiers(parCle);
  const p = await appliquerPrerequis(parCle);
  if (!silencieux) {
    console.log(`· métiers : ${m.metiers}, ${m.liens} chapitres rattachés`);
    if (p.fiches) console.log(`· prérequis : ${p.fiches} fiches et ${p.questions} questions ajoutées`);
  }
  return { ...m, ...p };
}

module.exports = { appliquer };
