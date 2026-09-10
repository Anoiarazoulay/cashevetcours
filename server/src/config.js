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
  /* Pondération de l'avancement d'un chapitre (somme = 1) */
  poids: { seances: 0.5, resume: 0.1, qcm: 0.25, tp: 0.15 },
  seuilARevoir: 60,
  objectifHebdo: 3
};

if (config.env === 'production' && config.jwt.secret === 'changez-cette-cle-en-production') {
  throw new Error('JWT_SECRET doit être défini en production (voir .env.example).');
}

module.exports = config;
