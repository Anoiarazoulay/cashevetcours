/* Calculs de progression : avancement, statistiques, alertes, projection.
   Un seul endroit pour ces règles — l'élève, le parent et l'admin lisent les mêmes chiffres. */
const config = require('../config');
const { tous, un } = require('../db');

const P = config.poids;
const jourSQL = d => d.toISOString().slice(0, 10);

/* Une ligne par chapitre du programme, avec l'état de l'élève. */
const lignes = eleveId => tous(`
  SELECT c.id, c.numero, c.titre, c.duree, c.difficulte,
         m.id AS matiere_id, m.code AS matiere_code, m.nom AS matiere_nom,
         m.court AS matiere_court, m.teinte, m.ordre AS matiere_ordre,
         (SELECT COUNT(*) FROM seances s WHERE s.chapitre_id = c.id) AS nb_seances,
         (SELECT COUNT(*) FROM seances s
            JOIN seances_vues v ON v.seance_id = s.id AND v.eleve_id = ?
           WHERE s.chapitre_id = c.id) AS seances_vues,
         COALESCE(p.resume_lu, 0)   AS resume_lu,
         COALESCE(p.tp_consulte, 0) AS tp_consulte,
         COALESCE(p.termine, 0)     AS termine,
         p.maj,
         t.score, t.justes, t.total AS qcm_total, t.terminee_le
    FROM chapitres c
    JOIN matieres m ON m.id = c.matiere_id
    LEFT JOIN progression p ON p.chapitre_id = c.id AND p.eleve_id = ?
    LEFT JOIN (
      SELECT a.chapitre_id, a.score, a.justes, a.total, a.terminee_le
        FROM tentatives_qcm a
        JOIN (SELECT chapitre_id, MAX(id) AS dernier
                FROM tentatives_qcm
               WHERE eleve_id = ? AND terminee = 1
               GROUP BY chapitre_id) b ON b.dernier = a.id
    ) t ON t.chapitre_id = c.id
   WHERE c.publie = 1
   ORDER BY m.ordre, c.numero`, [eleveId, eleveId, eleveId]);

/* Avancement d'un chapitre, entre 0 et 1 */
const avancement = l => Math.min(1,
  P.seances * (l.nb_seances ? l.seances_vues / l.nb_seances : 0) +
  P.resume * (l.resume_lu ? 1 : 0) +
  P.qcm * (l.score === null || l.score === undefined ? 0 : 1) +
  P.tp * (l.tp_consulte ? 1 : 0));

const estTermine = l => !!l.termine || avancement(l) >= 0.99;
const aRevoir = l => l.score !== null && l.score !== undefined && l.score < config.seuilARevoir;
const commence = l => avancement(l) > 0;

const resume = l => ({
  id: l.id, numero: l.numero, titre: l.titre,
  matiere: { id: l.matiere_id, code: l.matiere_code, nom: l.matiere_nom, court: l.matiere_court, teinte: l.teinte },
  avancement: Math.round(avancement(l) * 100),
  termine: estTermine(l), aRevoir: aRevoir(l),
  score: l.score === null ? null : Number(l.score),
  maj: l.maj
});

/* ------------------------------ état complet ------------------------------ */
/* Format aligné sur ce que consomme l'interface élève. */
async function etat(eleveId) {
  const [ls, vues, liste, jours] = await Promise.all([
    lignes(eleveId),
    tous(`SELECT s.chapitre_id, s.id AS seance_id
            FROM seances_vues v JOIN seances s ON s.id = v.seance_id
           WHERE v.eleve_id = ?`, [eleveId]),
    tous('SELECT chapitre_id FROM ma_liste WHERE eleve_id = ?', [eleveId]),
    tous(`SELECT jour, actions FROM activite WHERE eleve_id = ?
           ORDER BY jour DESC LIMIT 120`, [eleveId])
  ]);

  const ch = {};
  for (const l of ls) {
    if (!commence(l) && !l.termine) continue;
    ch[l.id] = {
      seances: vues.filter(v => v.chapitre_id === l.id).map(v => v.seance_id),
      resume: !!l.resume_lu, tp: !!l.tp_consulte, fini: estTermine(l),
      avancement: Math.round(avancement(l) * 100),
      qcm: l.score === null ? null
        : { pc: Number(l.score), justes: l.justes, total: l.qcm_total, date: l.terminee_le },
      maj: l.maj
    };
  }
  const parJour = {};
  for (const j of jours) parJour[j.jour] = j.actions;

  return {
    ch, liste: liste.map(x => x.chapitre_id), jours: parJour,
    debut: jours.length ? jours[jours.length - 1].jour : null
  };
}

/* ------------------------------ statistiques ------------------------------ */
async function statistiques(eleveId, ls) {
  ls = ls || await lignes(eleveId);
  const notes = ls.filter(l => l.score !== null && l.score !== undefined);
  const moyenne = notes.length ? Math.round(notes.reduce((s, l) => s + Number(l.score), 0) / notes.length) : null;
  return {
    total: ls.length,
    faits: ls.filter(estTermine).length,
    global: ls.length ? Math.round(ls.reduce((s, l) => s + avancement(l), 0) / ls.length * 100) : 0,
    qcmFaits: notes.length,
    moyenne,
    revoir: ls.filter(aRevoir).map(resume),
    encours: ls.filter(l => commence(l) && !estTermine(l)).map(resume)
  };
}

/* ---------------------------- progression par matière ---------------------- */
const parMatiere = ls => {
  const m = new Map();
  for (const l of ls) {
    const e = m.get(l.matiere_code) ||
      { code: l.matiere_code, nom: l.matiere_nom, teinte: l.teinte, total: 0, somme: 0, notes: [], faits: 0 };
    e.total++; e.somme += avancement(l);
    if (estTermine(l)) e.faits++;
    if (l.score !== null && l.score !== undefined) e.notes.push(Number(l.score));
    m.set(l.matiere_code, e);
  }
  return [...m.values()].map(e => ({
    code: e.code, nom: e.nom, teinte: e.teinte, chapitres: e.total, faits: e.faits,
    avancement: Math.round(e.somme / e.total * 100),
    moyenne: e.notes.length ? Math.round(e.notes.reduce((a, b) => a + b, 0) / e.notes.length) : null
  }));
};

/* --------------------------------- rythme --------------------------------- */
async function rythme(eleveId, nbJours = 14) {
  const debut = new Date(Date.now() - (nbJours - 1) * 864e5);
  const l = await tous('SELECT jour, actions FROM activite WHERE eleve_id = ? AND jour >= ?',
    [eleveId, jourSQL(debut)]);
  const carte = new Map(l.map(x => [x.jour, x.actions]));
  return [...Array(nbJours)].map((_, i) => {
    const j = jourSQL(new Date(Date.now() - (nbJours - 1 - i) * 864e5));
    return { jour: j, actions: carte.get(j) || 0 };
  });
}

/* -------------------------------- projection ------------------------------- */
async function projection(eleveId, stats) {
  const premier = await un('SELECT MIN(jour) AS debut FROM activite WHERE eleve_id = ?', [eleveId]);
  if (!premier || !premier.debut || stats.faits < 2) return null;
  const jours = Math.max(1, Math.round((Date.now() - new Date(premier.debut + 'T00:00:00')) / 864e5));
  const parJour = stats.faits / jours;
  if (parJour <= 0) return null;
  const restants = stats.total - stats.faits;
  return {
    date: new Date(Date.now() + restants / parJour * 864e5).toISOString().slice(0, 10),
    parSemaine: Number((parJour * 7).toFixed(1)),
    restants, depuis: premier.debut
  };
}

/* --------------------------------- alertes --------------------------------- */
/* Ton volontairement encourageant : on compte ce qui est accompli,
   la seule alerte négative est l'inactivité, formulée comme une relance. */
async function alertes(eleveId, ls, stats) {
  const a = [];
  const dernier = await un('SELECT MAX(jour) AS jour FROM activite WHERE eleve_id = ?', [eleveId]);
  const depuis = dernier && dernier.jour
    ? Math.floor((Date.now() - new Date(dernier.jour + 'T00:00:00')) / 864e5) : null;

  if (depuis === null) {
    a.push({
      ton: 'info', icone: '👋', titre: 'Le suivi commence dès la première séance',
      texte: 'Aucune activité enregistrée pour le moment. Dès que votre enfant ouvre un chapitre, cet espace se remplit automatiquement.'
    });
  } else if (depuis >= 3) {
    const repris = ls.filter(l => commence(l) && !estTermine(l))
      .sort((x, y) => new Date(y.maj) - new Date(x.maj))[0];
    a.push({
      ton: 'attention', icone: '🔔', titre: `Aucune session depuis ${depuis} jours`,
      texte: 'Une courte session de 20 minutes suffirait à relancer la dynamique.' +
        (repris ? ` Le chapitre « ${repris.titre} » est déjà commencé à ${Math.round(avancement(repris) * 100)} %.` : ''),
      quand: dernier.jour
    });
  }

  const semaine = ls.filter(l => estTermine(l) && l.maj && Date.now() - new Date(l.maj) < 7 * 864e5).length;
  if (semaine > 0) {
    a.push({
      ton: 'bien', icone: '💪',
      titre: `${semaine} chapitre${semaine > 1 ? 's' : ''} terminé${semaine > 1 ? 's' : ''} cette semaine`,
      texte: semaine >= config.objectifHebdo
        ? 'Objectif hebdomadaire atteint. Beau rythme, à saluer !'
        : `Encore ${config.objectifHebdo - semaine} pour atteindre l’objectif de la semaine.`
    });
  }
  if (stats.faits > 0 && stats.faits % 5 === 0) {
    a.push({
      ton: 'bien', icone: '🎉', titre: `Cap des ${stats.faits} chapitres terminés`,
      texte: `Votre enfant vient de franchir un palier : ${stats.faits} chapitres sur ${stats.total} sont bouclés.`
    });
  }

  /* Matière fragile : on privilégie celle où un chapitre a réellement été raté. */
  const fragile = parMatiere(ls)
    .map(m => ({ ...m, rates: ls.filter(l => l.matiere_code === m.code && aRevoir(l)) }))
    .filter(m => m.moyenne !== null && (m.rates.length || m.moyenne < 70))
    .sort((x, y) => (y.rates.length - x.rates.length) || (x.moyenne - y.moyenne))[0];
  if (fragile) {
    const rate = fragile.rates[0];
    a.push({
      ton: 'attention', icone: '⚠️', titre: `Difficultés en ${fragile.nom.toLowerCase()}`,
      texte: rate
        ? `Score de ${rate.score} % au QCM sur « ${rate.titre} » (moyenne de ${fragile.moyenne} % dans la matière). Cashevent School recommande 2 exercices supplémentaires du TP et une reprise de la vidéo avant de refaire le QCM.`
        : `Moyenne de ${fragile.moyenne} % dans la matière. Cashevent School recommande 2 exercices supplémentaires et une reprise des chapitres concernés.`
    });
  }

  if (stats.moyenne !== null && stats.moyenne >= 80) {
    a.push({
      ton: 'bien', icone: '⭐', titre: `Moyenne de ${stats.moyenne} % aux QCM`,
      texte: 'Le niveau de compréhension est solide sur l’ensemble des chapitres travaillés.'
    });
  }
  return a;
}

/* --------------------------- tableau de bord complet ----------------------- */
async function tableauDeBord(eleveId) {
  const eleve = await un(
    'SELECT id, nom, email, niveau, derniere_connexion FROM utilisateurs WHERE id = ? AND role = "eleve"',
    [eleveId]);
  if (!eleve) return null;
  const ls = await lignes(eleveId);
  const stats = await statistiques(eleveId, ls);
  const [alertesListe, proj, jours] = await Promise.all([
    alertes(eleveId, ls, stats), projection(eleveId, stats), rythme(eleveId)
  ]);
  return {
    eleve, stats, alertes: alertesListe, projection: proj,
    matieres: parMatiere(ls), rythme: jours,
    objectifHebdo: config.objectifHebdo, poids: P, seuilARevoir: config.seuilARevoir
  };
}

/* Journalise une action du jour (sert au rythme et aux alertes d'inactivité). */
const journaliser = eleveId => require('../db').executer(
  `INSERT INTO activite (eleve_id, jour, actions) VALUES (?, CURDATE(), 1)
   ON DUPLICATE KEY UPDATE actions = actions + 1`, [eleveId]);

module.exports = {
  lignes, avancement, estTermine, aRevoir, resume,
  etat, statistiques, parMatiere, rythme, projection, alertes, tableauDeBord, journaliser
};
