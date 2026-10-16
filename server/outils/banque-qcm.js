/* Remplit la banque de questions de tous les chapitres avec l'assistant.

   npm run qcm:banque            complète chaque chapitre jusqu'à la cible
   npm run qcm:banque -- 9       un seul chapitre (son identifiant)

   À relancer sans risque : un chapitre déjà garni est ignoré.               */
const { tous, pool } = require('../src/db');
const qcm = require('../src/services/qcm');
const ia = require('../src/services/ia');

(async () => {
  if (!ia.actif()) { console.error('✗ aucune clé d’API : renseignez OPENROUTER_API_KEY dans .env'); process.exit(1); }
  const seul = Number(process.argv[2]) || null;
  const chapitres = await tous(
    `SELECT c.id, c.titre, (SELECT COUNT(*) FROM questions q WHERE q.chapitre_id = c.id) AS n
       FROM chapitres c WHERE c.publie = 1${seul ? ' AND c.id = ?' : ''} ORDER BY c.matiere_id, c.numero`,
    seul ? [seul] : []);
  let total = 0;
  for (const c of chapitres) {
    const n = Number(c.n);
    if (n >= qcm.CIBLE) { console.log(`· ${c.titre} : ${n} questions, rien à faire`); continue; }
    process.stdout.write(`· ${c.titre} : ${n} → `);
    try {
      const r = await qcm.generer(c.id, qcm.CIBLE - n);
      total += r.ajoutees;
      console.log(`${n + r.ajoutees} (+${r.ajoutees} par ${r.modele})`);
    } catch (e) { console.log('échec : ' + e.message.slice(0, 140)); }
  }
  console.log(`\n${total} question(s) ajoutée(s) au total.`);
  await pool.end();
})();
