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
  ['utilisateurs', 'pays', 'VARCHAR(80) NULL'],

  /* Une base en ligne avait déjà une table « classes » d'une version antérieure,
     sans ces deux colonnes : « CREATE TABLE IF NOT EXISTS » ne l'a pas touchée. */
  ['classes', 'matiere_id', 'INT UNSIGNED NULL'],
  ['classes', 'couleur', "CHAR(7) NOT NULL DEFAULT '#4c8dff'"]
];

/* [table, nom de l'index, définition] — ajoutés s'ils manquent. */
const INDEX = [
  ['classes', 'uq_classes_nom', 'UNIQUE KEY uq_classes_nom (enseignant_id, nom)']
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

  /* ------------------------- enseignants référents ------------------------ */
  /* Le code qu'un enseignant donne à ses élèves pour qu'ils le désignent. */
  ['enseignants', `CREATE TABLE IF NOT EXISTS enseignants (
     utilisateur_id INT UNSIGNED NOT NULL PRIMARY KEY,
     code CHAR(6) NOT NULL,
     cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY uq_enseignants_code (code),
     CONSTRAINT fk_enseignants_utilisateur FOREIGN KEY (utilisateur_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],

  /* Un professeur par élève et par matière, choisi par l'élève lui-même :
     c'est la seule porte d'accès d'un enseignant aux données d'un élève. */
  ['referents', `CREATE TABLE IF NOT EXISTS referents (
     eleve_id      INT UNSIGNED NOT NULL,
     matiere_id    INT UNSIGNED NOT NULL,
     enseignant_id INT UNSIGNED NOT NULL,
     depuis DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (eleve_id, matiere_id),
     KEY idx_referents_enseignant (enseignant_id, matiere_id),
     CONSTRAINT fk_referents_eleve FOREIGN KEY (eleve_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_referents_matiere FOREIGN KEY (matiere_id)
       REFERENCES matieres(id) ON DELETE CASCADE,
     CONSTRAINT fk_referents_enseignant FOREIGN KEY (enseignant_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],

  /* Chaque ouverture du dossier d'un élève. Un suivi ne peut être enregistré
     que si le dossier a été consulté dans le mois : c'est la preuve de travail. */
  ['consultations', `CREATE TABLE IF NOT EXISTS consultations (
     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     enseignant_id INT UNSIGNED NOT NULL,
     eleve_id      INT UNSIGNED NOT NULL,
     matiere_id    INT UNSIGNED NOT NULL,
     vu_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     KEY idx_consultations (enseignant_id, eleve_id, matiere_id, vu_le),
     CONSTRAINT fk_consultations_enseignant FOREIGN KEY (enseignant_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_consultations_eleve FOREIGN KEY (eleve_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_consultations_matiere FOREIGN KEY (matiere_id)
       REFERENCES matieres(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],

  /* Le suivi du mois. Une ligne = une rémunération due, avec sa preuve. */
  ['suivis', `CREATE TABLE IF NOT EXISTS suivis (
     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     enseignant_id INT UNSIGNED NOT NULL,
     eleve_id      INT UNSIGNED NOT NULL,
     matiere_id    INT UNSIGNED NOT NULL,
     mois CHAR(7) NOT NULL,
     statut ENUM('bonne_voie','encourager','aide') NOT NULL,
     commentaire VARCHAR(600) NULL,
     consulte_le DATETIME NOT NULL,
     cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     maj_le  DATETIME NULL,
     lu_le   DATETIME NULL,
     UNIQUE KEY uq_suivis_mois (enseignant_id, eleve_id, matiere_id, mois),
     KEY idx_suivis_mois (mois, enseignant_id),
     KEY idx_suivis_eleve (eleve_id, cree_le),
     CONSTRAINT fk_suivis_enseignant FOREIGN KEY (enseignant_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_suivis_eleve FOREIGN KEY (eleve_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_suivis_matiere FOREIGN KEY (matiere_id)
       REFERENCES matieres(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],

  /* TP envoyés par un enseignant. Le fichier vit en base : un redéploiement
     efface le disque de l'hébergeur, jamais la base. */
  ['tp_envois', `CREATE TABLE IF NOT EXISTS tp_envois (
     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     enseignant_id INT UNSIGNED NOT NULL,
     matiere_id    INT UNSIGNED NOT NULL,
     titre VARCHAR(160) NOT NULL,
     consigne TEXT NULL,
     echeance DATE NULL,
     fichier_nom  VARCHAR(200) NOT NULL,
     fichier_type VARCHAR(100) NOT NULL,
     taille INT UNSIGNED NOT NULL,
     fichier MEDIUMBLOB NOT NULL,
     cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     KEY idx_tp_envois_enseignant (enseignant_id, cree_le),
     CONSTRAINT fk_tp_envois_enseignant FOREIGN KEY (enseignant_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_tp_envois_matiere FOREIGN KEY (matiere_id)
       REFERENCES matieres(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],

  ['tp_destinataires', `CREATE TABLE IF NOT EXISTS tp_destinataires (
     envoi_id INT UNSIGNED NOT NULL,
     eleve_id INT UNSIGNED NOT NULL,
     telecharge_le DATETIME NULL,
     PRIMARY KEY (envoi_id, eleve_id),
     KEY idx_tp_destinataires_eleve (eleve_id),
     CONSTRAINT fk_tp_dest_envoi FOREIGN KEY (envoi_id)
       REFERENCES tp_envois(id) ON DELETE CASCADE,
     CONSTRAINT fk_tp_dest_eleve FOREIGN KEY (eleve_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],

  /* Les matières qu'un enseignant déclare enseigner : un élève ne peut le
     désigner que dans l'une d'elles. */
  ['enseignant_matieres', `CREATE TABLE IF NOT EXISTS enseignant_matieres (
     enseignant_id INT UNSIGNED NOT NULL,
     matiere_id    INT UNSIGNED NOT NULL,
     PRIMARY KEY (enseignant_id, matiere_id),
     CONSTRAINT fk_ens_mat_enseignant FOREIGN KEY (enseignant_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_ens_mat_matiere FOREIGN KEY (matiere_id)
       REFERENCES matieres(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`],

  /* Les classes d'un enseignant : des groupes qu'il compose lui-même parmi les
     élèves qui l'ont désigné (« Terminale D », « Groupe du samedi »…). Une
     classe peut être rattachée à une matière ; sinon elle les couvre toutes. */
  ['classes', `CREATE TABLE IF NOT EXISTS classes (
     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     enseignant_id INT UNSIGNED NOT NULL,
     matiere_id    INT UNSIGNED NULL,
     nom VARCHAR(80) NOT NULL,
     couleur CHAR(7) NOT NULL DEFAULT '#4c8dff',
     cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY uq_classes_nom (enseignant_id, nom),
     CONSTRAINT fk_classes_enseignant FOREIGN KEY (enseignant_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_classes_matiere FOREIGN KEY (matiere_id)
       REFERENCES matieres(id) ON DELETE SET NULL
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

  /* Carnet de l'enseignant : ses notes personnelles sur un élève dans une
     matière. L'élève ne les voit jamais, l'administration non plus. */
  ['notes_enseignant', `CREATE TABLE IF NOT EXISTS notes_enseignant (
     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     enseignant_id INT UNSIGNED NOT NULL,
     eleve_id      INT UNSIGNED NOT NULL,
     matiere_id    INT UNSIGNED NOT NULL,
     texte VARCHAR(1000) NOT NULL,
     cree_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     KEY idx_notes_dossier (enseignant_id, eleve_id, matiere_id, cree_le),
     CONSTRAINT fk_notes_enseignant FOREIGN KEY (enseignant_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_notes_eleve FOREIGN KEY (eleve_id)
       REFERENCES utilisateurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_notes_matiere FOREIGN KEY (matiere_id)
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

/* Les colonnes qu'une instruction CREATE TABLE déclare. */
const colonnesDe = sql => [...sql.matchAll(/^\s*([a-z_]+)\s+(?:INT|BIGINT|SMALLINT|TINYINT|VARCHAR|CHAR|TEXT|MEDIUMBLOB|JSON|ENUM|DATE|DATETIME)/gim)]
  .map(m => m[1].toLowerCase());

/* Les tables attendues qui n'existent pas, et celles qui existent sans les
   colonnes attendues — une table homonyme laissée par une autre application,
   par exemple. */
async function manquantes() {
  const noms = TABLES.map(([nom]) => nom);
  const lignes = await tous(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${noms.map(() => '?').join(',')})`, noms);
  const presentes = new Map();
  for (const l of lignes) {
    const t = l.t.toLowerCase();
    if (!presentes.has(t)) presentes.set(t, new Set());
    presentes.get(t).add(l.c.toLowerCase());
  }
  const absentes = [], incompletes = [];
  for (const [nom, sql] of TABLES) {
    if (!presentes.has(nom)) { absentes.push(nom); continue; }
    const manque = colonnesDe(sql).filter(c => !presentes.get(nom).has(c));
    if (manque.length) incompletes.push(nom + ' (sans ' + manque.join(', ') + ')');
  }
  return [...absentes, ...incompletes];
}

async function appliquer({ silencieux = false } = {}) {
  /* Une table qui refuse de se créer ne doit pas empêcher les autres, ni le
     démarrage : on le dit dans le journal, et /api/sante le répète. */
  for (const [nom, sql] of TABLES) {
    const avant = await tous('SELECT COUNT(*) AS n FROM information_schema.TABLES ' +
      'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [nom]);
    if (avant[0].n) continue;
    try {
      await executer(sql);
      if (!silencieux) console.log('· table créée : ' + nom);
    } catch (e) {
      console.error('✗ table « ' + nom + ' » impossible à créer : ' + e.message);
    }
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

  const indexPresents = await tous(
    `SELECT TABLE_NAME AS t, INDEX_NAME AS i FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()`);
  for (const [table, nom, definition] of INDEX) {
    if (indexPresents.some(x => x.t === table && x.i === nom)) continue;
    try {
      await executer(`ALTER TABLE \`${table}\` ADD ${definition}`);
      ajoutees++;
      if (!silencieux) console.log('· index ajouté : ' + table + '.' + nom);
    } catch (e) {
      console.error('✗ index « ' + nom + ' » impossible à ajouter : ' + e.message);
    }
  }

  if (!silencieux && !ajoutees) console.log('· schéma déjà à jour');
  return ajoutees;
}

module.exports = { appliquer, manquantes, COLONNES };
