/* Évolutions du schéma appliquées après coup.
   « CREATE TABLE IF NOT EXISTS » ne touche pas une table déjà créée : les
   colonnes ajoutées plus tard passent donc par ici. Chaque entrée est vérifiée
   avant d'être appliquée, la fonction peut être relancée sans risque.          */
const { tous, executer } = require('../src/db');

/* [table, colonne, définition SQL] */
const COLONNES = [
  /* Contenu réel des séances */
  ['chapitres', 'image', 'VARCHAR(300) NULL'],
  ['seances', 'video_titre', 'VARCHAR(250) NULL'],
  ['seances', 'video_chaine', 'VARCHAR(120) NULL'],
  ['seances', 'video_duree', 'VARCHAR(12) NULL'],

  /* Fiche d'inscription détaillée */
  ['utilisateurs', 'telephone', 'VARCHAR(30) NULL'],
  ['utilisateurs', 'date_naissance', 'DATE NULL'],
  ['utilisateurs', 'etablissement', 'VARCHAR(160) NULL'],
  ['utilisateurs', 'filiere', 'VARCHAR(80) NULL'],
  ['utilisateurs', 'ville', 'VARCHAR(120) NULL'],
  ['utilisateurs', 'code_postal', 'VARCHAR(20) NULL'],
  ['utilisateurs', 'pays', 'VARCHAR(80) NULL']
];

async function appliquer({ silencieux = false } = {}) {
  const existantes = await tous(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()`);
  const existe = (t, c) => existantes.some(x => x.t === t && x.c === c);

  let ajoutees = 0;
  for (const [table, colonne, definition] of COLONNES) {
    if (existe(table, colonne)) continue;
    await executer(`ALTER TABLE \`${table}\` ADD COLUMN \`${colonne}\` ${definition}`);
    ajoutees++;
    if (!silencieux) console.log('· colonne ajoutée : ' + table + '.' + colonne);
  }
  if (!silencieux && !ajoutees) console.log('· schéma déjà à jour');
  return ajoutees;
}

module.exports = { appliquer, COLONNES };
