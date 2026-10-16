/* Configuration : valeurs par défaut adaptées à WAMP, surchargées par .env */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const config = {
  port: Number(process.env.PORT || 3000),
  env: process.env.NODE_ENV || 'development',
  racinePublique: path.join(__dirname, '..', '..', 'public'),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cashevent_school'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'changez-cette-cle-en-production',
    duree: process.env.JWT_DUREE || '7d',
    cookie: 'cashevent_session'
  },
  niveauParDefaut: process.env.NIVEAU || '2ᵉ année Bac — Sciences',
  /* Enseignants référents. Un montant par élève suivi, par matière et par mois,
     dû seulement si le suivi du mois a été enregistré. */
  remuneration: {
    fcfa: Number(process.env.REMUNERATION_FCFA || 50),
    /* Parité fixe du franc CFA : 1 € = 655,957 FCFA. */
    fcfaParEuro: 655.957
  },
  /* Au-delà, une matière sans activité signale un élève à suivre. */
  inactiviteJours: 14,
  /* Générateur d'exercices. Sans clé, la fonction se désactive proprement :
     le reste de la plateforme n'en dépend pas. Les séries produites sont
     enregistrées en base et resservies à tout le monde — un chapitre n'est
     donc facturé qu'une fois, pas une fois par élève. */
  ia: (() => {
    /* OpenRouter d'abord (modèles gratuits), Anthropic sinon. IA_FOURNISSEUR force le choix. */
    const fournisseur = process.env.IA_FOURNISSEUR ||
      (process.env.OPENROUTER_API_KEY ? 'openrouter' : process.env.ANTHROPIC_API_KEY ? 'anthropic' : '');
    const cle = fournisseur === 'openrouter' ? process.env.OPENROUTER_API_KEY
      : fournisseur === 'anthropic' ? process.env.ANTHROPIC_API_KEY : '';
    const parDefaut = fournisseur === 'openrouter' ? 'google/gemma-4-31b-it:free' : 'claude-opus-5';
    return {
      fournisseur, cle: cle || '',
      modele: process.env.IA_MODELE || parDefaut,
      /* Chez OpenRouter, les modèles gratuits saturent parfois : on en essaie d'autres. */
      secours: (process.env.IA_MODELES_SECOURS ||
        'nvidia/nemotron-3-super-120b-a12b:free,google/gemma-4-26b-a4b-it:free,openrouter/free')
        .split(',').map(s => s.trim()).filter(Boolean),
      active: !!cle
    };
  })(),
  /* Pondération de l'avancement d'un chapitre (somme = 1) */
  poids: { seances: 0.5, resume: 0.1, qcm: 0.25, tp: 0.15 },
  seuilARevoir: 60,
  objectifHebdo: 3
};

if (config.env === 'production' && config.jwt.secret === 'changez-cette-cle-en-production') {
  throw new Error('JWT_SECRET doit être défini en production (voir .env.example).');
}

module.exports = config;
