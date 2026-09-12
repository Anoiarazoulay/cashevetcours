/* Génération d'exercices corrigés par Claude.

   Une série est produite une fois par chapitre et par niveau, puis enregistrée
   en base et resservie à tous les élèves : le coût est payé une fois, pas une
   fois par consultation. Seule l'administration peut en redemander une.

   Sans ANTHROPIC_API_KEY, la fonction se désactive et le reste de la
   plateforme continue de fonctionner normalement.                            */
const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const { un, executer } = require('../db');
const cat = require('./catalogue');

const NIVEAUX = {
  application: 'exercices d\'application directe du cours, pour vérifier que les ' +
    'définitions et les formules sont comprises',
  entrainement: 'exercices d\'entraînement classiques, du niveau des contrôles ' +
    'de classe, en deux ou trois questions enchaînées',
  bac: 'exercices de type épreuve du baccalauréat, avec un énoncé contextualisé ' +
    'et un barème sur points'
};

const client = config.ia.active
  ? new (Anthropic.default || Anthropic)({ apiKey: config.ia.cle })
  : null;

/* Le contrat de sortie. « additionalProperties: false » et « required » sont
   obligatoires : le modèle ne peut alors rendre que cette forme exacte. */
const SCHEMA = {
  type: 'object',
  properties: {
    exercices: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titre: { type: 'string' },
          enonce: { type: 'string' },
          donnees: { type: 'array', items: { type: 'string' } },
          bareme: { type: 'string' },
          indice: { type: 'string' },
          correction: {
            type: 'object',
            properties: {
              etapes: { type: 'array', items: { type: 'string' } },
              reponse: { type: 'string' },
              erreurs: { type: 'array', items: { type: 'string' } }
            },
            required: ['etapes', 'reponse', 'erreurs'],
            additionalProperties: false
          }
        },
        required: ['titre', 'enonce', 'donnees', 'bareme', 'indice', 'correction'],
        additionalProperties: false
      }
    }
  },
  required: ['exercices'],
  additionalProperties: false
};

/* La consigne ne change jamais : elle est mise en cache côté API. */
const CONSIGNE = `Tu es professeur au lycée marocain et tu rédiges des exercices pour
des élèves de deuxième année du baccalauréat.

Règles de rédaction :
- écris en français, dans la langue des manuels marocains ;
- reste strictement dans les notions du chapitre fourni, sans rien emprunter à un
  autre chapitre du programme ;
- chaque énoncé doit être résoluble avec les seules formules du chapitre ;
- les valeurs numériques sont réalistes et les calculs tombent juste ;
- la correction détaille le raisonnement étape par étape, comme au tableau, et
  non seulement le résultat ;
- « erreurs » recense les fautes que les élèves commettent réellement sur ce
  type de question, pas des généralités ;
- « indice » est une piste de départ, jamais la réponse ;
- pas de Markdown ni de LaTeX : du texte simple, les formules écrites en clair
  (par exemple « v = d / t » ou « z = a + ib »).`;

/* Le contexte rédactionnel du chapitre, tel qu'il est déjà dans la base. */
const contexte = c => [
  `Matière : ${c.matiere.nom}`,
  `Chapitre ${c.n} : ${c.titre}`,
  `Difficulté annoncée : ${c.difficulte}`,
  `Notions travaillées : ${(c.notions || []).join(', ')}`,
  '',
  'Points du résumé de cours :',
  ...(c.resume.points || []).map(t => '- ' + t),
  '',
  c.matiere.labelFormules + ' :',
  ...(c.resume.formules || []).map(t => '- ' + t),
  '',
  'Pièges fréquents signalés aux élèves :',
  ...(c.resume.pieges || []).map(t => '- ' + t)
].join('\n');

/* La série déjà enregistrée, ou null. */
async function serie(chapitreId, niveau) {
  const l = await un(
    'SELECT contenu, modele, cree_le FROM exercices WHERE chapitre_id = ? AND niveau = ?',
    [chapitreId, niveau]);
  if (!l) return null;
  const contenu = typeof l.contenu === 'string' ? JSON.parse(l.contenu) : l.contenu;
  return { ...contenu, niveau, modele: l.modele, creeLe: l.cree_le };
}

/* Produit une série et l'enregistre. Renvoie la série et le coût constaté. */
async function generer(chapitreId, niveau = 'entrainement', nombre = 4) {
  if (!client) throw new Error('Le générateur d’exercices n’est pas configuré.');
  if (!NIVEAUX[niveau]) throw new Error('Niveau d’exercices inconnu.');

  const c = await cat.chapitre(chapitreId);
  if (!c) throw new Error('Ce chapitre n’existe pas.');

  const reponse = await client.messages.create({
    model: config.ia.modele,
    max_tokens: 16000,
    system: [{ type: 'text', text: CONSIGNE, cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{
      role: 'user',
      content: `${contexte(c)}\n\nRédige ${nombre} ${NIVEAUX[niveau]}.`
    }]
  });

  if (reponse.stop_reason === 'refusal')
    throw new Error('Le modèle a refusé de rédiger cette série.');

  /* Le format structuré garantit un premier bloc texte en JSON valide. */
  const bloc = reponse.content.find(b => b.type === 'text');
  if (!bloc) throw new Error('Réponse vide du modèle.');
  const contenu = JSON.parse(bloc.text);

  const u = reponse.usage || {};
  await executer(
    `INSERT INTO exercices (chapitre_id, niveau, contenu, modele, jetons_entree, jetons_sortie)
          VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE contenu = VALUES(contenu), modele = VALUES(modele),
          jetons_entree = VALUES(jetons_entree), jetons_sortie = VALUES(jetons_sortie),
          cree_le = CURRENT_TIMESTAMP`,
    [chapitreId, niveau, JSON.stringify(contenu), config.ia.modele,
     u.input_tokens || 0, u.output_tokens || 0]);

  return {
    ...contenu,
    niveau,
    modele: config.ia.modele,
    creeLe: new Date(),
    cout: { entree: u.input_tokens || 0, sortie: u.output_tokens || 0 }
  };
}

module.exports = { serie, generer, NIVEAUX, actif: () => !!client };
