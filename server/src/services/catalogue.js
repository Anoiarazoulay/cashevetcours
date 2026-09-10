/* Lecture du catalogue et génération du document de TP */
const { tous, un } = require('../db');

/* Identifiant YouTube d'une adresse de vidéo. */
const identifiantVideo = url => {
  if (!url) return null;
  const m = String(url).match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
};

/* Fiche d'une séance, avec la vidéo qui lui est rattachée. */
const fiche = s => {
  const video = identifiantVideo(s.video_url);
  return {
    id: s.id, n: s.numero, titre: s.titre, duree: s.duree,
    video: video ? {
      id: video, url: s.video_url, titre: s.video_titre,
      chaine: s.video_chaine, duree: s.video_duree,
      miniature: 'https://i.ytimg.com/vi/' + video + '/mqdefault.jpg'
    } : null
  };
};

/* Arbre matières → chapitres, sans le contenu pédagogique détaillé. */
async function catalogue() {
  const [matieres, chapitres, notions, seances] = await Promise.all([
    tous('SELECT * FROM matieres ORDER BY ordre, id'),
    tous(`SELECT c.*, (SELECT COUNT(*) FROM questions q WHERE q.chapitre_id = c.id) AS nb_questions
            FROM chapitres c WHERE c.publie = 1 ORDER BY c.matiere_id, c.numero`),
    tous('SELECT chapitre_id, libelle FROM notions ORDER BY chapitre_id, ordre'),
    tous(`SELECT id, chapitre_id, numero, titre, duree, video_url, video_titre, video_chaine, video_duree
            FROM seances ORDER BY chapitre_id, numero`)
  ]);

  return matieres.map(m => ({
    id: m.code, matiereId: m.id, nom: m.nom, court: m.court, prof: m.professeur,
    coef: m.coefficient, teinte: m.teinte, teinte2: m.teinte2, glyphe: m.glyphe,
    labelFormules: m.label_formules,
    chapitres: chapitres.filter(c => c.matiere_id === m.id).map(c => ({
      id: c.id, n: c.numero, titre: c.titre, duree: c.duree, difficulte: c.difficulte,
      accroche: c.accroche, nbQuestions: c.nb_questions, image: c.image || null,
      notions: notions.filter(n => n.chapitre_id === c.id).map(n => n.libelle),
      seances: seances.filter(s => s.chapitre_id === c.id).map(fiche)
    }))
  }));
}

/* Détail d'un chapitre : résumé écrit, séances, TP. Jamais les bonnes réponses. */
async function chapitre(id) {
  const c = await un(`
    SELECT c.*, m.code AS matiere_code, m.nom AS matiere_nom, m.court AS matiere_court,
           m.professeur, m.coefficient, m.teinte, m.teinte2, m.glyphe, m.label_formules
      FROM chapitres c JOIN matieres m ON m.id = c.matiere_id
     WHERE c.id = ?`, [id]);
  if (!c) return null;

  const [notions, seances, resume, tp, nbQ] = await Promise.all([
    tous('SELECT libelle FROM notions WHERE chapitre_id = ? ORDER BY ordre', [id]),
    tous(`SELECT id, numero, titre, duree, video_url, video_titre, video_chaine, video_duree
            FROM seances WHERE chapitre_id = ? ORDER BY numero`, [id]),
    tous('SELECT type, texte FROM resume_lignes WHERE chapitre_id = ? ORDER BY type, ordre', [id]),
    tous('SELECT type, texte FROM tp_lignes WHERE chapitre_id = ? ORDER BY ordre', [id]),
    un('SELECT COUNT(*) AS n FROM questions WHERE chapitre_id = ?', [id])
  ]);
  const par = (liste, type) => liste.filter(l => l.type === type).map(l => l.texte);

  return {
    id: c.id, n: c.numero, titre: c.titre, duree: c.duree, difficulte: c.difficulte,
    accroche: c.accroche, publie: !!c.publie, nbQuestions: nbQ.n, image: c.image || null,
    matiere: {
      id: c.matiere_code, nom: c.matiere_nom, court: c.matiere_court, prof: c.professeur,
      coef: c.coefficient, teinte: c.teinte, teinte2: c.teinte2, glyphe: c.glyphe,
      labelFormules: c.label_formules
    },
    notions: notions.map(n => n.libelle),
    seances: seances.map(fiche),
    resume: { points: par(resume, 'point'), formules: par(resume, 'formule'), pieges: par(resume, 'piege') },
    tp: { objectifs: par(tp, 'objectif'), exercices: par(tp, 'exercice'), corrige: par(tp, 'corrige') }
  };
}

/* Document texte téléchargeable : énoncé + corrigé complet. */
function documentTP(c, niveau) {
  const l = [];
  l.push('CASHEVENT SCHOOL — ' + niveau);
  l.push(c.matiere.nom.toUpperCase() + ' · CHAPITRE ' + c.n + ' — ' + c.titre.toUpperCase());
  l.push('Travaux pratiques — énoncé et corrigé');
  l.push('Professeur : ' + c.matiere.prof + '   |   Durée conseillée : 45 min');
  l.push('='.repeat(72), '');
  l.push('OBJECTIFS'); c.tp.objectifs.forEach(o => l.push('  • ' + o)); l.push('');
  l.push('RAPPEL DE COURS'); c.resume.formules.forEach(f => l.push('  · ' + f)); l.push('');
  l.push('-'.repeat(72), 'ÉNONCÉ', '-'.repeat(72), '');
  c.tp.exercices.forEach(x => { l.push(x); l.push(''); });
  l.push('-'.repeat(72), 'CORRIGÉ DÉTAILLÉ', '-'.repeat(72), '');
  c.tp.corrige.forEach(x => { l.push(x); l.push(''); });
  l.push('-'.repeat(72), 'PIÈGES À ÉVITER');
  c.resume.pieges.forEach(p => l.push('  ! ' + p));
  l.push('', 'Document généré par Cashevent School le ' + new Date().toLocaleDateString('fr-FR'));
  return '﻿' + l.join('\r\n');
}

const nomFichierTP = c => 'TP_' + c.matiere.court + '_Ch' + c.n + '_' +
  c.titre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-') + '.txt';

module.exports = { catalogue, chapitre, documentTP, nomFichierTP, identifiantVideo };
