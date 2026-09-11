/* Amorçage de la base au démarrage du serveur.

   Sur un hébergement mutualisé, on n'a pas toujours de terminal pour lancer
   « npm run db:init » : le déploiement se contente de cloner le dépôt et de
   démarrer l'application. Si les tables manquent, on les crée donc ici, puis
   on applique les migrations et le catalogue.

   Quand la base est déjà en place, seules les migrations sont vérifiées —
   une requête sur information_schema, négligeable au démarrage — de sorte
   qu'une mise à jour du code n'oublie jamais une colonne.                    */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');
const { un } = require('../src/db');

/* La table « matieres » sert de témoin : sans elle, la base est vierge. */
const baseVierge = async () => {
  try {
    await un('SELECT 1 FROM matieres LIMIT 1');
    return false;
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') return true;
    throw e;
  }
};

/* Le schéma est un fichier de plusieurs instructions : il lui faut une
   connexion dédiée, le pool partagé n'autorise pas les requêtes multiples. */
const appliquerSchema = async () => {
  const cx = await mysql.createConnection({ ...config.db, multipleStatements: true });
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await cx.query(schema);
    return (schema.match(/CREATE TABLE/g) || []).length;
  } finally {
    await cx.end();
  }
};

/* Renvoie true si la base a été créée à l'instant, false si elle existait. */
module.exports = async function amorcer() {
  const migrations = require('./migrations');

  if (!(await baseVierge())) {
    await migrations.appliquer({ silencieux: true });
    /* Rattrape une base installée avant que le contenu ne soit versionné. */
    await require('./videos').appliquer();
    return false;
  }

  console.log('· base vierge : installation automatique en cours…');
  const tables = await appliquerSchema();
  console.log('· schéma appliqué (' + tables + ' tables)');
  await migrations.appliquer({ silencieux: true });

  /* Le pool doit rester ouvert : le serveur démarre juste après. */
  await require('./seed')({ fermer: false });
  await require('./videos').appliquer();
  return true;
};
