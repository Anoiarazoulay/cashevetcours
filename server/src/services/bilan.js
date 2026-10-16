/* Le bilan de l'assistant : il lit tout ce que l'élève a fait — vidéos vues,
   QCM et scores, TP téléchargés, chapitres terminés, rythme, parcours de
   rattrapage, métier visé — et rédige une analyse avec des recommandations.

   Le texte est conservé tant que les chiffres ne bougent pas : l'empreinte
   des chiffres décide quand le modèle est rappelé.                           */
const crypto = require('crypto');
const config = require('../config');
const { tous, un, executer } = require('../db');
const prog = require('./progression');
const ia = require('./ia');

const SCHEMA = {
  type: 'object',
  properties: {
    resume: { type: 'string' },
    pointsForts: { type: 'array', items: { type: 'string' } },
    pointsFaibles: { type: 'array', items: { type: 'string' } },
    recommandations: {
      type: 'array',
      items: {
        type: 'object',
        properties: { titre: { type: 'string' }, detail: { type: 'string' } },
        required: ['titre', 'detail'], additionalProperties: false
      }
    },
    planSemaine: {
      type: 'array',
      items: {
        type: 'object',
        properties: { jour: { type: 'string' }, action: { type: 'string' } },
        required: ['jour', 'action'], additionalProperties: false
      }
    },
    encouragement: { type: 'string' }
  },
  required: ['resume', 'pointsForts', 'pointsFaibles', 'recommandations', 'planSemaine', 'encouragement'],
  additionalProperties: false
};

const CONSIGNE = `Tu es le conseiller pédagogique de Cashevent School, une plateforme de
révision du baccalauréat au Maroc. On te donne le relevé complet du travail d'un
élève. Tu rédiges son bilan, en français, en le tutoyant, avec tous les accents.

Règles :
- appuie chaque phrase sur les chiffres fournis, cite les chapitres par leur titre ;
- « resume » : trois à cinq phrases qui disent où il en est, franchement mais sans décourager ;
- « pointsForts » et « pointsFaibles » : deux à quatre entrées chacun, concrètes ;
- « recommandations » : trois à cinq actions précises et faisables cette semaine
  (quel chapitre, quelle vidéo, quel QCM refaire, quel TP faire), les plus urgentes d'abord ;
  « titre » tient en cinq à huit mots, « detail » explique en deux ou trois phrases ;
- « planSemaine » : sept entrées, du lundi au dimanche ; « jour » est le nom du jour seul,
  « action » une phrase courte qui ne répète pas le jour, avec un jour de repos ;
- ne cite que des chapitres, vidéos et TP présents dans le relevé ou dans le programme fourni ;
- « encouragement » : une phrase personnelle, en lien avec son futur métier s'il en a un ;
- pas de Markdown, pas de listes dans les textes : des phrases.`;

/* Tout ce que l'assistant doit savoir, en chiffres et en titres. */
async function releve(eleveId) {
  const tb = await prog.tableauDeBord(eleveId);
  if (!tb) return null;
  const [videos, tpFaits, qcm, derniersQcm, semaine, commences] = await Promise.all([
    un('SELECT COUNT(*) AS n FROM seances_vues WHERE eleve_id = ?', [eleveId]),
    un('SELECT COUNT(*) AS n FROM progression WHERE eleve_id = ? AND tp_consulte = 1', [eleveId]),
    un('SELECT COUNT(*) AS n, ROUND(AVG(score)) AS moyenne FROM tentatives_qcm WHERE eleve_id = ? AND terminee = 1', [eleveId]),
    tous(`SELECT t.score, t.terminee_le, c.titre, m.nom AS matiere FROM tentatives_qcm t
            JOIN chapitres c ON c.id = t.chapitre_id JOIN matieres m ON m.id = c.matiere_id
           WHERE t.eleve_id = ? AND t.terminee = 1 ORDER BY t.terminee_le DESC LIMIT 10`, [eleveId]),
    un(`SELECT COUNT(*) AS n FROM seances_vues WHERE eleve_id = ? AND vu_le >= DATE_SUB(NOW(), INTERVAL 7 DAY)`, [eleveId]),
    un(`SELECT COUNT(*) AS n FROM progression WHERE eleve_id = ? AND termine = 0`, [eleveId])
  ]);
  const totalSeances = Number((await un('SELECT COUNT(*) AS n FROM seances s JOIN chapitres c ON c.id = s.chapitre_id WHERE c.publie = 1')).n);
  const joursActifs = tb.rythme.filter(j => j.actions).length;
  let serie = 0;
  for (let i = tb.rythme.length - 1; i >= 0 && tb.rythme[i].actions; i--) serie++;

  return {
    eleve: { nom: tb.eleve.nom, niveau: tb.eleve.niveau },
    chiffres: {
      chapitresTermines: tb.stats.faits, chapitresTotal: tb.stats.total, progression: tb.stats.global,
      chapitresEnCours: Number(commences.n),
      videosVues: Number(videos.n), videosTotal: totalSeances, videosSemaine: Number(semaine.n),
      qcmPasses: Number(qcm.n), moyenneQcm: qcm.moyenne === null ? null : Number(qcm.moyenne),
      chapitresMoyenne: tb.stats.moyenne,
      tpFaits: Number(tpFaits.n),
      aRevoir: tb.stats.revoir.length,
      joursActifs14: joursActifs, serie
    },
    matieres: tb.matieres,
    aRevoir: tb.stats.revoir.map(c => ({ titre: c.titre, matiere: c.matiere.nom, score: c.score })),
    derniersQcm: derniersQcm.map(q => ({ titre: q.titre, matiere: q.matiere, score: q.score, le: q.terminee_le })),
    parcours: tb.parcours.map(p => ({ chapitre: p.chapitre.titre, etat: p.etat, validees: p.validees, total: p.total,
      scoreInitial: p.scoreInitial, scoreFinal: p.scoreFinal })),
    metier: tb.metier ? { nom: tb.metier.metier.nom, actif: tb.metier.actif, termines: tb.metier.termines,
      total: tb.metier.total, prochain: tb.metier.prochain && tb.metier.prochain.titre } : null,
    projection: tb.projection,
    alertes: tb.alertes.map(a => a.titre),
    seuil: config.seuilARevoir
  };
}

/* Ce qui, en changeant, justifie un nouveau bilan. */
const empreinteDe = r => crypto.createHash('sha256').update(JSON.stringify([
  r.chiffres.chapitresTermines, r.chiffres.videosVues, r.chiffres.qcmPasses, r.chiffres.moyenneQcm,
  r.chiffres.tpFaits, r.chiffres.aRevoir, r.chiffres.joursActifs14,
  r.parcours.map(p => p.etat + p.validees), r.metier && r.metier.nom + r.metier.actif
])).digest('hex').slice(0, 40);

const lireJSON = v => typeof v === 'string' ? JSON.parse(v) : v;

/* Le bilan : celui en base s'il est à jour, sinon un nouveau si on peut le
   rédiger. « forcer » redemande le texte même à chiffres égaux. */
async function obtenir(eleveId, { forcer = false } = {}) {
  const r = await releve(eleveId);
  if (!r) return null;
  const empreinte = empreinteDe(r);
  const existant = await un('SELECT empreinte, contenu, modele, cree_le FROM bilans_ia WHERE eleve_id = ?', [eleveId]);
  const aJour = existant && existant.empreinte === empreinte && !forcer;
  if (aJour || !ia.actif()) {
    return { releve: r, bilan: existant ? lireJSON(existant.contenu) : null,
      modele: existant ? existant.modele : null, creeLe: existant ? existant.cree_le : null,
      aJour: !!aJour, assistantActif: ia.actif(), genere: false };
  }
  const demande = 'Relevé de l’élève, au format JSON :\n' + JSON.stringify(r, null, 1) +
    '\n\nRédige son bilan.';
  const reponse = await ia.completerJSON({ consigne: CONSIGNE, demande, schema: SCHEMA, nomSchema: 'bilan', maxTokens: 5000 });
  const b = reponse.contenu || {};
  const liste = v => Array.isArray(v) ? v.map(x => typeof x === 'string' ? x : JSON.stringify(x)).filter(Boolean) : [];
  const bilan = {
    resume: String(b.resume || ''),
    pointsForts: liste(b.pointsForts), pointsFaibles: liste(b.pointsFaibles),
    recommandations: Array.isArray(b.recommandations) ? b.recommandations
      .map(x => ({ titre: String((x && x.titre) || ''), detail: String((x && x.detail) || '') })).filter(x => x.titre) : [],
    planSemaine: Array.isArray(b.planSemaine) ? b.planSemaine
      .map(x => ({ jour: String((x && x.jour) || ''), action: String((x && x.action) || '') })).filter(x => x.action) : [],
    encouragement: String(b.encouragement || '')
  };
  const modele = String(reponse.modele).slice(0, 60);
  await executer(
    `INSERT INTO bilans_ia (eleve_id, empreinte, contenu, modele) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE empreinte = VALUES(empreinte), contenu = VALUES(contenu),
       modele = VALUES(modele), cree_le = CURRENT_TIMESTAMP`,
    [eleveId, empreinte, JSON.stringify(bilan), modele]);
  return { releve: r, bilan, modele, creeLe: new Date(), aJour: true, assistantActif: true, genere: true, usage: reponse.usage };
}

module.exports = { releve, obtenir };
