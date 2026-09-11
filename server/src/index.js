/* Point d'entrée : vérifie la base puis démarre le serveur */
const config = require('./config');
const app = require('./app');
const { un, pool } = require('./db');
const amorcer = require('../db/bootstrap');

/* Diagnostic : chaque panne de base a son correctif, autant le dire. */
const conseil = e => {
  switch (e.code) {
    case 'ECONNREFUSED':
      return 'Aucun serveur MySQL sur ' + config.db.host + ':' + config.db.port + '.\n' +
             '  En local, démarrez MySQL (WampServer) ; en ligne, vérifiez DB_HOST et DB_PORT.';
    case 'ENOTFOUND':
      return 'Hôte « ' + config.db.host + ' » introuvable — corrigez DB_HOST.';
    case 'ER_ACCESS_DENIED_ERROR':
      return 'Identifiants refusés — vérifiez DB_USER et DB_PASSWORD.';
    case 'ER_BAD_DB_ERROR':
      return 'La base « ' + config.db.database + ' » n\'existe pas : créez-la chez votre ' +
             'hébergeur (ou avec `npm run db:init` en local), le reste se fait tout seul.';
    default:
      return 'Vérifiez les variables DB_* puis relancez.';
  }
};

(async () => {
  try {
    await amorcer();
    const c = await un('SELECT COUNT(*) AS n FROM matieres');
    const ch = await un('SELECT COUNT(*) AS n FROM chapitres');
    console.log(`· base connectée : ${c.n} matières, ${ch.n} chapitres`);
  } catch (e) {
    console.error('\n✗ Base de données inaccessible : ' + e.message);
    console.error('  ' + conseil(e) + '\n');
    process.exit(1);
  }

  const serveur = app.listen(config.port, () => {
    console.log(`· Cashevent School sur http://localhost:${config.port}`);
    console.log('  élève  yasmine@cashevent.education / eleve1234');
    console.log('  parent parent@cashevent.education  / parent1234');
    console.log('  admin  admin@cashevent.education   / admin1234\n');
  });

  const arreter = async signal => {
    console.log('\n· arrêt (' + signal + ')');
    serveur.close(async () => { await pool.end(); process.exit(0); });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => arreter('SIGINT'));
  process.on('SIGTERM', () => arreter('SIGTERM'));
})();
