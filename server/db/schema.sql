-- Cashevent School — schéma MySQL 8
-- Appliqué par `npm run db:init` (ajouter --reset pour repartir de zéro).

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

/* ============================== UTILISATEURS ============================== */

CREATE TABLE IF NOT EXISTS utilisateurs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom           VARCHAR(120)  NOT NULL,
  email         VARCHAR(190)  NOT NULL,
  mot_de_passe  VARCHAR(100)  NOT NULL,
  role          ENUM('eleve','parent','admin') NOT NULL DEFAULT 'eleve',
  niveau        VARCHAR(80)   NULL,
  telephone       VARCHAR(30)  NULL,
  date_naissance  DATE         NULL,
  etablissement   VARCHAR(160) NULL,
  filiere         VARCHAR(80)  NULL,
  ville           VARCHAR(120) NULL,
  code_postal     VARCHAR(20)  NULL,
  pays            VARCHAR(80)  NULL,
  actif         TINYINT(1)    NOT NULL DEFAULT 1,
  derniere_connexion DATETIME NULL,
  cree_le       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_utilisateurs_email (email),
  KEY idx_utilisateurs_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Un parent peut suivre plusieurs enfants, un élève peut avoir deux parents.
CREATE TABLE IF NOT EXISTS liens_famille (
  parent_id INT UNSIGNED NOT NULL,
  eleve_id  INT UNSIGNED NOT NULL,
  cree_le   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (parent_id, eleve_id),
  KEY idx_liens_eleve (eleve_id),
  CONSTRAINT fk_liens_parent FOREIGN KEY (parent_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_liens_eleve  FOREIGN KEY (eleve_id)  REFERENCES utilisateurs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ================================ CATALOGUE =============================== */

CREATE TABLE IF NOT EXISTS matieres (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(40)  NOT NULL,
  nom             VARCHAR(120) NOT NULL,
  court           VARCHAR(40)  NOT NULL,
  professeur      VARCHAR(120) NOT NULL,
  coefficient     TINYINT UNSIGNED NOT NULL DEFAULT 1,
  teinte          CHAR(7)      NOT NULL DEFAULT '#3b6ef5',
  teinte2         CHAR(7)      NOT NULL DEFAULT '#7b3bf5',
  glyphe          VARCHAR(8)   NOT NULL DEFAULT '',
  label_formules  VARCHAR(80)  NOT NULL DEFAULT 'À retenir',
  ordre           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_matieres_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chapitres (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  matiere_id  INT UNSIGNED NOT NULL,
  numero      SMALLINT UNSIGNED NOT NULL,
  titre       VARCHAR(200) NOT NULL,
  duree       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  difficulte  ENUM('Facile','Moyen','Difficile') NOT NULL DEFAULT 'Moyen',
  accroche    TEXT NULL,
  publie      TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_chapitre_numero (matiere_id, numero),
  CONSTRAINT fk_chapitres_matiere FOREIGN KEY (matiere_id) REFERENCES matieres(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chapitre_id INT UNSIGNED NOT NULL,
  libelle     VARCHAR(160) NOT NULL,
  ordre       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  KEY idx_notions_chapitre (chapitre_id),
  CONSTRAINT fk_notions_chapitre FOREIGN KEY (chapitre_id) REFERENCES chapitres(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Séances vidéo du cours de répétition
CREATE TABLE IF NOT EXISTS seances (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chapitre_id INT UNSIGNED NOT NULL,
  numero      SMALLINT UNSIGNED NOT NULL,
  titre       VARCHAR(200) NOT NULL,
  duree       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  video_url   VARCHAR(400) NULL,
  UNIQUE KEY uq_seance_numero (chapitre_id, numero),
  CONSTRAINT fk_seances_chapitre FOREIGN KEY (chapitre_id) REFERENCES chapitres(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Résumé écrit : points clés, formules, pièges
CREATE TABLE IF NOT EXISTS resume_lignes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chapitre_id INT UNSIGNED NOT NULL,
  type        ENUM('point','formule','piege') NOT NULL,
  texte       TEXT NOT NULL,
  ordre       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  KEY idx_resume_chapitre (chapitre_id, type),
  CONSTRAINT fk_resume_chapitre FOREIGN KEY (chapitre_id) REFERENCES chapitres(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Travaux pratiques : objectifs, énoncés, corrigés
CREATE TABLE IF NOT EXISTS tp_lignes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chapitre_id INT UNSIGNED NOT NULL,
  type        ENUM('objectif','exercice','corrige') NOT NULL,
  texte       TEXT NOT NULL,
  ordre       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  KEY idx_tp_chapitre (chapitre_id, type),
  CONSTRAINT fk_tp_chapitre FOREIGN KEY (chapitre_id) REFERENCES chapitres(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* =================================== QCM ================================== */

CREATE TABLE IF NOT EXISTS questions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chapitre_id INT UNSIGNED NOT NULL,
  enonce      TEXT NOT NULL,
  explication TEXT NOT NULL,
  ordre       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  KEY idx_questions_chapitre (chapitre_id),
  CONSTRAINT fk_questions_chapitre FOREIGN KEY (chapitre_id) REFERENCES chapitres(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS options_reponse (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  question_id INT UNSIGNED NOT NULL,
  texte       VARCHAR(400) NOT NULL,
  correcte    TINYINT(1) NOT NULL DEFAULT 0,
  ordre       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  KEY idx_options_question (question_id),
  CONSTRAINT fk_options_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ================================ PROGRESSION ============================= */

CREATE TABLE IF NOT EXISTS progression (
  eleve_id    INT UNSIGNED NOT NULL,
  chapitre_id INT UNSIGNED NOT NULL,
  resume_lu   TINYINT(1) NOT NULL DEFAULT 0,
  tp_consulte TINYINT(1) NOT NULL DEFAULT 0,
  termine     TINYINT(1) NOT NULL DEFAULT 0,
  maj         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (eleve_id, chapitre_id),
  KEY idx_progression_chapitre (chapitre_id),
  CONSTRAINT fk_prog_eleve    FOREIGN KEY (eleve_id)    REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_prog_chapitre FOREIGN KEY (chapitre_id) REFERENCES chapitres(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seances_vues (
  eleve_id  INT UNSIGNED NOT NULL,
  seance_id INT UNSIGNED NOT NULL,
  vu_le     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (eleve_id, seance_id),
  KEY idx_seances_vues_seance (seance_id),
  CONSTRAINT fk_sv_eleve  FOREIGN KEY (eleve_id)  REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_sv_seance FOREIGN KEY (seance_id) REFERENCES seances(id)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tentatives_qcm (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  eleve_id     INT UNSIGNED NOT NULL,
  chapitre_id  INT UNSIGNED NOT NULL,
  total        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  justes       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  score        TINYINT UNSIGNED NULL,
  terminee     TINYINT(1) NOT NULL DEFAULT 0,
  commencee_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  terminee_le  DATETIME NULL,
  KEY idx_tentatives_eleve (eleve_id, chapitre_id),
  CONSTRAINT fk_tent_eleve    FOREIGN KEY (eleve_id)    REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_tent_chapitre FOREIGN KEY (chapitre_id) REFERENCES chapitres(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reponses_qcm (
  tentative_id INT UNSIGNED NOT NULL,
  question_id  INT UNSIGNED NOT NULL,
  option_id    INT UNSIGNED NOT NULL,
  correcte     TINYINT(1) NOT NULL DEFAULT 0,
  repondu_le   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tentative_id, question_id),
  KEY idx_reponses_question (question_id),
  CONSTRAINT fk_rep_tentative FOREIGN KEY (tentative_id) REFERENCES tentatives_qcm(id) ON DELETE CASCADE,
  CONSTRAINT fk_rep_question  FOREIGN KEY (question_id)  REFERENCES questions(id)      ON DELETE CASCADE,
  CONSTRAINT fk_rep_option    FOREIGN KEY (option_id)    REFERENCES options_reponse(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ma_liste (
  eleve_id    INT UNSIGNED NOT NULL,
  chapitre_id INT UNSIGNED NOT NULL,
  cree_le     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (eleve_id, chapitre_id),
  CONSTRAINT fk_liste_eleve    FOREIGN KEY (eleve_id)    REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_liste_chapitre FOREIGN KEY (chapitre_id) REFERENCES chapitres(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Une ligne par jour travaillé : sert au graphe de rythme et aux alertes d'inactivité.
CREATE TABLE IF NOT EXISTS activite (
  eleve_id INT UNSIGNED NOT NULL,
  jour     DATE NOT NULL,
  actions  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (eleve_id, jour),
  CONSTRAINT fk_activite_eleve FOREIGN KEY (eleve_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ================================ JOURNAL ================================= */

-- Trace des actions notables, consultable depuis l'administration.
-- Le nom est recopié pour que la ligne reste lisible après suppression du compte.
CREATE TABLE IF NOT EXISTS journal (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT UNSIGNED NULL,
  nom            VARCHAR(120) NULL,
  role           ENUM('eleve','parent','admin','anonyme') NOT NULL DEFAULT 'anonyme',
  categorie      ENUM('auth','compte','catalogue','apprentissage') NOT NULL,
  action         VARCHAR(60)  NOT NULL,
  cible          VARCHAR(200) NULL,
  details        VARCHAR(400) NULL,
  succes         TINYINT(1)   NOT NULL DEFAULT 1,
  ip             VARCHAR(45)  NULL,
  cree_le        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_journal_date (cree_le),
  KEY idx_journal_categorie (categorie, cree_le),
  KEY idx_journal_utilisateur (utilisateur_id),
  CONSTRAINT fk_journal_utilisateur FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ================================ MESSAGES ================================ */

-- Messages reçus par le formulaire de contact public.
CREATE TABLE IF NOT EXISTS messages (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom        VARCHAR(120)  NOT NULL,
  email      VARCHAR(190)  NOT NULL,
  profil     ENUM('eleve','parent','enseignant','etablissement','autre') NOT NULL DEFAULT 'autre',
  sujet      ENUM('question','erreur','compte','etablissement','suggestion','autre')
             NOT NULL DEFAULT 'question',
  message    TEXT          NOT NULL,
  traite     TINYINT(1)    NOT NULL DEFAULT 0,
  ip         VARCHAR(45)   NULL,
  cree_le    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_messages_date (cree_le),
  KEY idx_messages_traite (traite, cree_le)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
