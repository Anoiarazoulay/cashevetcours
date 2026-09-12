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

  /* Relecture des séries d'exercices par un enseignant */
  ['exercices', 'valide', 'TINYINT(1) NOT NULL DEFAULT 0'],
  ['exercices', 'valide_par', 'INT UNSIGNED NULL'],
  ['exercices', 'note_relecture', 'VARCHAR(400) NULL'],

  /* Fiche d'inscription détaillée */
  ['utilisateurs', 'telephone', 'VARCHAR(30) NULL'],
  ['utilisateurs', 'date_naissance', 'DATE NULL'],
  ['utilisateurs', 'etablissement', 'VARCHAR(160) NULL'],
  ['utilisateurs', 'filiere', 'VARCHAR(80) NULL'],
  ['utilisateurs', 'ville', 'VARCHAR(120) NULL'],
  ['utilisateurs', 'code_postal', 'VARCHAR(20) NULL'],
  ['utilisateurs', 'pays', 'VARCHAR(80) NULL']
];

/* Tables ajoutées après la première version. « CREATE TABLE IF NOT EXISTS »
   suffit ici : la table est soit absente, soit déjà conforme. */
const TABLES = [
  ['exercices', `CREATE TABLE IF NOT EXISTS exercices (
     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     chapitre_id INT UNSIGNED NOT NULL,
     niveau ENUM('application','entrainement','bac') NOT NULL DEFAULT 'entrainement',
     contenu JSON NOT NULL,
     modele VARCHAR(60) NOT NULL,
     jetons_entree INT NOT NULL DEFAULT 0,
     jetons_sortie INT NOT NULL DEFAULT 0,
     cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY serie (chapitre_id, niveau),
     CONSTRAINT fk_exercices_chapitre FOREIGN KEY (chapitre_id)
       REFERENCES chapitres(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],

  /* Espace enseignant : des classes, et les élèves qui y sont rattachés. */
  ['classes', `CREATE TABLE IF NOT EXISTS classes (
     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     enseignant_id INT UNSIGNED NOT NULL,
     nom VARCHAR(120) NOT NULL,
     niveau VARCHAR(80) NULL,
     code CHAR(6) NOT NULL,
     archivee TINYINT(1) NOT NULL DEFAULT 0,
     cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY uq_classes_code (code),
     KEY idx_classes_enseignant (enseignant_id),
     CONSTRAINT fk_classes_enseignant FOREIGN KEY (enseignant_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],

  ['classe_eleves', `CREATE TABLE IF NOT EXISTS classe_eleves (
     classe_id INT UNSIGNED NOT NULL,
     eleve_id  INT UNSIGNED NOT NULL,
     ajoute_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (classe_id, eleve_id),
     KEY idx_classe_eleves_eleve (eleve_id),
     CONSTRAINT fk_classe_eleves_classe FOREIGN KEY (classe_id)
       REFERENCES classes(id) ON DELETE CASCADE,
     CONSTRAINT fk_classe_eleves_eleve FOREIGN KEY (eleve_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],

  /* Les matières qu'un enseignant a le droit de modifier. */
  ['enseignant_matieres', `CREATE TABLE IF NOT EXISTS enseignant_matieres (
     enseignant_id INT UNSIGNED NOT NULL,
     matiere_id    INT UNSIGNED NOT NULL,
     PRIMARY KEY (enseignant_id, matiere_id),
     CONSTRAINT fk_ens_mat_enseignant FOREIGN KEY (enseignant_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_ens_mat_matiere FOREIGN KEY (matiere_id)
       REFERENCES matieres(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`]
];

/* Élargissements d'énumération. MySQL les applique sans toucher aux lignes
   existantes tant que les valeurs d'origine restent dans la liste. */
const ENUMS = [
  ['utilisateurs', 'role',
   "ENUM('eleve','parent','enseignant','admin') NOT NULL DEFAULT 'eleve'", 'enseignant'],
  ['journal', 'role',
   "ENUM('eleve','parent','enseignant','admin','anonyme') NOT NULL DEFAULT 'anonyme'", 'enseignant']
];

async function appliquer({ silencieux = false } = {}) {
  for (const [nom, sql] of TABLES) {
    const avant = await tous('SELECT COUNT(*) AS n FROM information_schema.TABLES ' +
      'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [nom]);
    if (avant[0].n) continue;
    await executer(sql);
    if (!silencieux) console.log('· table créée : ' + nom);
  }

  const existantes = await tous(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c, COLUMN_TYPE AS type
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`);

  /* Une valeur manquante dans l'énumération suffit à déclencher l'ALTER. */
  for (const [table, colonne, definition, valeur] of ENUMS) {
    const col = existantes.find(x => x.t === table && x.c === colonne);
    if (!col || col.type.includes(`'${valeur}'`)) continue;
    await executer(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${colonne}\` ${definition}`);
    if (!silencieux) console.log('· rôle « ' + valeur +' » ajouté à ' + table + '.' + colonne);
  }

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
