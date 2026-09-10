/* Crée la base, applique le schéma, puis lance le peuplement.
   Usage : npm run db:init        (conserve les données existantes)
           npm run db:reset       (supprime et recrée la base)               */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');

const reset = process.argv.includes('--reset');

(async () => {
  const { host, port, user, password, database } = config.db;
  let cx;
  try {
    cx = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
  } catch (e) {
    console.error('\n✗ Connexion à MySQL impossible sur ' + host + ':' + port);
    console.error('  ' + e.message);
    console.error('\n  Vérifiez que le service MySQL de WampServer est démarré,');
    console.error('  puis que DB_USER / DB_PASSWORD sont corrects dans le fichier .env.\n');
    process.exit(1);
  }

  if (reset) {
    await cx.query('DROP DATABASE IF EXISTS `' + database + '`');
    console.log('· base « ' + database +' » supprimée');
  }
  await cx.query('CREATE DATABASE IF NOT EXISTS `' + database +
    '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await cx.query('USE `' + database + '`');
  console.log('· base « ' + database + ' » prête');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await cx.query(schema);
  console.log('· schéma appliqué (' + (schema.match(/CREATE TABLE/g) || []).length + ' tables)');
  await cx.end();

  await require('./seed')({ reset });
  process.exit(0);
})().catch(e => {
  console.error('\n✗ ' + e.message + '\n');
  console.error(e.stack);
  process.exit(1);
});
