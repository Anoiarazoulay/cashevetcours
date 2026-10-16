/* Banque de questions et composition d'un QCM.

   Le catalogue apporte trois questions rédigées par chapitre. L'assistant en
   ajoute d'autres, enregistrées une fois pour toutes dans la même table,
   marquées « ia ». À chaque tentative, l'élève reçoit un tirage différent :
   quelques questions prises dans la banque, en évitant celles de sa
   tentative précédente, et dans un ordre mélangé.                            */
const { tous, un, transaction } = require('../db');
const cat = require('./catalogue');
const ia = require('./ia');

const CIBLE = 12;      /* questions souhaitées par chapitre, toutes sources confondues */
const PAR_QCM = 6;     /* questions posées à chaque tentative */
const PAR_LOT = 9;     /* questions demandées au modèle en une fois */

const SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          enonce: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          correcte: { type: 'integer' },
          explication: { type: 'string' }
        },
        required: ['enonce', 'options', 'correcte', 'explication'],
        additionalProperties: false
      }
    }
  },
  required: ['questions'],
  additionalProperties: false
};

const CONSIGNE = `Tu es professeur au lycée marocain et tu rédiges des questions à choix
multiple pour des élèves de deuxième année du baccalauréat.

Règles :
- écris en français correct, avec tous les accents ;
- reste strictement dans les notions du chapitre fourni ;
- chaque question a exactement trois propositions, une seule juste, et « correcte »
  est l'indice (0, 1 ou 2) de la bonne proposition ;
- les propositions fausses sont plausibles : des erreurs que les élèves font vraiment ;
- varie les formes : calcul court, définition, application, lecture d'un résultat,
  repérage d'une erreur ;
- « explication » justifie la bonne réponse en deux ou trois phrases, comme au tableau ;
- ne reprends pas les questions déjà posées, listées dans la demande ;
- pas de Markdown ni de LaTeX : du texte simple, les formules écrites en clair.`;

const melanger = t => { const a = t.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

const compter = async chapitreId =>
  Number((await un('SELECT COUNT(*) AS n FROM questions WHERE chapitre_id = ?', [chapitreId])).n);

/* Demande un lot de questions au modèle et l'enregistre. */
async function generer(chapitreId, nombre = PAR_LOT) {
  if (!ia.actif()) throw new Error('L’assistant n’est pas configuré.');
  const c = await cat.chapitre(chapitreId);
  if (!c) throw new Error('Ce chapitre n’existe pas.');
  const deja = await tous('SELECT enonce FROM questions WHERE chapitre_id = ? ORDER BY ordre', [chapitreId]);

  const demande = [
    `Matière : ${c.matiere.nom}`, `Chapitre ${c.n} : ${c.titre}`,
    `Notions travaillées : ${(c.notions || []).join(', ')}`, '',
    'Points du résumé de cours :', ...(c.resume.points || []).map(t => '- ' + t), '',
    c.matiere.labelFormules + ' :', ...(c.resume.formules || []).map(t => '- ' + t), '',
    'Pièges fréquents :', ...(c.resume.pieges || []).map(t => '- ' + t), '',
    'Questions déjà posées (à ne pas reprendre) :', ...deja.map(q => '- ' + q.enonce), '',
    `Rédige ${nombre} nouvelles questions.`
  ].join('\n');

  const r = await ia.completerJSON({ consigne: CONSIGNE, demande, schema: SCHEMA, nomSchema: 'questions', maxTokens: 6000 });
  const valides = (r.contenu && Array.isArray(r.contenu.questions) ? r.contenu.questions : [])
    .map(q => ({
      enonce: String(q.enonce || '').trim().slice(0, 2000),
      options: Array.isArray(q.options) ? q.options.map(o => String(o).trim().slice(0, 400)).filter(Boolean).slice(0, 3) : [],
      correcte: Number(q.correcte),
      explication: String(q.explication || '').trim().slice(0, 2000)
    }))
    .filter(q => q.enonce.length > 10 && q.options.length === 3 && q.correcte >= 0 && q.correcte <= 2 && q.explication)
    .slice(0, nombre);
  if (!valides.length) throw new Error('Le modèle n’a pas renvoyé de questions exploitables.');

  const modele = String(r.modele).slice(0, 60);
  await transaction(async cx => {
    const [[m]] = await cx.query('SELECT COALESCE(MAX(ordre), -1) AS o FROM questions WHERE chapitre_id = ?', [chapitreId]);
    let ordre = Number(m.o);
    for (const q of valides) {
      const [rq] = await cx.query(
        'INSERT INTO questions (chapitre_id, enonce, explication, ordre, source, modele) VALUES (?,?,?,?,?,?)',
        [chapitreId, q.enonce, q.explication, ++ordre, 'ia', modele]);
      for (const [j, texte] of q.options.entries())
        await cx.query('INSERT INTO options_reponse (question_id, texte, correcte, ordre) VALUES (?,?,?,?)',
          [rq.insertId, texte, j === q.correcte ? 1 : 0, j]);
    }
  });
  return { ajoutees: valides.length, modele, usage: r.usage };
}

/* Complète la banque d'un chapitre sans faire attendre l'élève : une seule
   génération à la fois par chapitre, et seulement si la banque est courte. */
const enCours = new Set();
function enrichirEnArrierePlan(chapitreId, total) {
  if (!ia.actif() || total >= CIBLE || enCours.has(chapitreId)) return false;
  enCours.add(chapitreId);
  generer(chapitreId, Math.min(PAR_LOT, CIBLE - total))
    .then(r => console.log(`· banque QCM : chapitre ${chapitreId}, ${r.ajoutees} question(s) ajoutée(s) par ${r.modele}`))
    .catch(e => console.warn(`· banque QCM : chapitre ${chapitreId}, échec (${String(e.message).slice(0, 120)})`))
    .finally(() => enCours.delete(chapitreId));
  return true;
}

/* Le tirage d'une tentative : des questions différentes de la tentative
   précédente de cet élève quand la banque le permet, dans un ordre mélangé. */
async function tirer(eleveId, chapitreId) {
  const toutes = await tous(
    'SELECT id, enonce, source FROM questions WHERE chapitre_id = ? ORDER BY ordre', [chapitreId]);
  if (!toutes.length) return [];
  const derniere = await un(
    `SELECT id FROM tentatives_qcm WHERE eleve_id = ? AND chapitre_id = ? AND terminee = 1
      ORDER BY id DESC LIMIT 1`, [eleveId, chapitreId]);
  const vues = new Set(derniere
    ? (await tous('SELECT question_id FROM reponses_qcm WHERE tentative_id = ?', [derniere.id])).map(r => r.question_id)
    : []);
  const taille = Math.min(PAR_QCM, toutes.length);
  const neuves = melanger(toutes.filter(q => !vues.has(q.id)));
  const choisies = neuves.slice(0, taille);
  if (choisies.length < taille)
    choisies.push(...melanger(toutes.filter(q => !choisies.includes(q))).slice(0, taille - choisies.length));
  return melanger(choisies);
}

module.exports = { CIBLE, PAR_QCM, compter, generer, enrichirEnArrierePlan, tirer, melanger };
