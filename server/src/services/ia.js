/* L'assistant : un seul point d'entrée vers le modèle de langage, quel que
   soit le fournisseur.

   - OpenRouter (recommandé, modèles gratuits disponibles) : API compatible
     OpenAI. Les modèles gratuits sont parfois saturés ou refusent le format
     structuré : on essaie donc une liste de modèles, et on sait relire un JSON
     renvoyé dans du texte.
   - Anthropic : le SDK officiel, avec sortie structurée garantie.

   Sans clé, l'assistant est inactif et le reste de la plateforme fonctionne. */
const config = require('../config');

const IA = config.ia;
const actif = () => !!IA.active;

/* Extrait un objet JSON d'un texte qui peut l'entourer de prose ou de ``` */
function extraireJSON(texte) {
  const t = String(texte || '').trim();
  try { return JSON.parse(t); } catch (e) { /* on cherche plus loin */ }
  const cloture = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (cloture) { try { return JSON.parse(cloture[1]); } catch (e) { /* idem */ } }
  const debut = t.indexOf('{'), fin = t.lastIndexOf('}');
  if (debut >= 0 && fin > debut) return JSON.parse(t.slice(debut, fin + 1));
  throw new Error('Le modèle n’a pas renvoyé de JSON lisible.');
}

/* ------------------------------- OpenRouter ------------------------------- */
async function appelOpenRouter(modele, { consigne, demande, schema, nomSchema, maxTokens, structure }) {
  const corps = {
    model: modele,
    max_tokens: maxTokens,
    temperature: 0.4,
    messages: [
      { role: 'system', content: consigne + (structure ? '' :
        '\n\nRéponds uniquement par un objet JSON valide, sans commentaire ni Markdown, de la forme : ' +
        JSON.stringify(exempleDepuisSchema(schema))) },
      { role: 'user', content: demande }
    ]
  };
  if (structure) corps.response_format = {
    type: 'json_schema', json_schema: { name: nomSchema, strict: true, schema }
  };
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + IA.cle,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://cashevent.school',
      'X-Title': 'Cashevent School'
    },
    body: JSON.stringify(corps),
    signal: AbortSignal.timeout(180000)
  });
  const donnees = await r.json().catch(() => null);
  if (!r.ok || !donnees || donnees.error) {
    const msg = (donnees && donnees.error && donnees.error.message) || ('HTTP ' + r.status);
    throw Object.assign(new Error(msg), { statut: r.status, modele });
  }
  const choix = donnees.choices && donnees.choices[0];
  const texte = choix && choix.message && (typeof choix.message.content === 'string'
    ? choix.message.content
    : (choix.message.content || []).map(p => p.text || '').join(''));
  if (!texte) throw Object.assign(new Error('Réponse vide du modèle.'), { modele });
  const u = donnees.usage || {};
  return { contenu: extraireJSON(texte), modele: donnees.model || modele,
    usage: { entree: u.prompt_tokens || 0, sortie: u.completion_tokens || 0 } };
}

/* Un squelette d'exemple tiré du schéma : les modèles sans mode structuré
   suivent bien mieux un exemple qu'une description. */
function exempleDepuisSchema(s) {
  if (!s) return {};
  if (s.type === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(s.properties || {})) o[k] = exempleDepuisSchema(v);
    return o;
  }
  if (s.type === 'array') return [exempleDepuisSchema(s.items)];
  if (s.type === 'number' || s.type === 'integer') return 0;
  if (s.type === 'boolean') return true;
  return '…';
}

/* -------------------------------- Anthropic ------------------------------- */
let clientAnthropic = null;
async function appelAnthropic({ consigne, demande, schema, maxTokens }) {
  if (!clientAnthropic) {
    const Anthropic = require('@anthropic-ai/sdk');
    clientAnthropic = new (Anthropic.default || Anthropic)({ apiKey: IA.cle });
  }
  const reponse = await clientAnthropic.messages.create({
    model: IA.modele,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: consigne, cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: demande }]
  });
  if (reponse.stop_reason === 'refusal') throw new Error('Le modèle a refusé de rédiger cette série.');
  const bloc = reponse.content.find(b => b.type === 'text');
  if (!bloc) throw new Error('Réponse vide du modèle.');
  const u = reponse.usage || {};
  return { contenu: JSON.parse(bloc.text), modele: IA.modele,
    usage: { entree: u.input_tokens || 0, sortie: u.output_tokens || 0 } };
}

/* ------------------------------ point d'entrée ---------------------------- */
/* Demande un objet JSON conforme au schéma. Chez OpenRouter, on parcourt le
   modèle choisi puis les modèles de secours ; pour chacun, d'abord en mode
   structuré, puis en texte libre si le modèle ne le prend pas en charge.   */
async function completerJSON({ consigne, demande, schema, nomSchema = 'reponse', maxTokens = 8000 }) {
  if (!actif()) throw new Error('L’assistant n’est pas configuré : aucune clé d’API.');
  if (IA.fournisseur === 'anthropic') return appelAnthropic({ consigne, demande, schema, maxTokens });

  const modeles = [IA.modele, ...IA.secours].filter((m, i, t) => m && t.indexOf(m) === i);
  const erreurs = [];
  for (const modele of modeles) {
    for (const structure of [true, false]) {
      try {
        return await appelOpenRouter(modele, { consigne, demande, schema, nomSchema, maxTokens, structure });
      } catch (e) {
        erreurs.push(`${modele}${structure ? '' : ' (texte)'} : ${e.message}`);
        /* Saturation ou modèle indisponible : inutile de réessayer en texte, on change de modèle. */
        if ([429, 404, 402, 503, 502].includes(e.statut)) break;
      }
    }
  }
  const err = new Error('Aucun modèle n’a pu répondre. ' + erreurs.join(' · '));
  err.details = erreurs;
  throw err;
}

/* Un appel court pour vérifier la configuration depuis l'administration. */
async function tester() {
  const debut = Date.now();
  const r = await completerJSON({
    consigne: 'Tu réponds en JSON.',
    demande: 'Donne un objet {"ok": true, "modele": "ton nom"}.',
    schema: { type: 'object', properties: { ok: { type: 'boolean' }, modele: { type: 'string' } },
      required: ['ok', 'modele'], additionalProperties: false },
    nomSchema: 'test', maxTokens: 200
  });
  return { ...r, duree: Date.now() - debut };
}

module.exports = { actif, completerJSON, tester, extraireJSON, fournisseur: () => IA.fournisseur, modele: () => IA.modele };
