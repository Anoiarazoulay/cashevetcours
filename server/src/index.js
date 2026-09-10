/* Point d'entrée : vérifie la base puis démarre le serveur */
const config = require('./config');
const app = require('./app');
const { un, pool } = require('./db');

(async () => {
  try {
    const c = await un('SELECT COUNT(*) AS n FROM matieres');
    if (!c.n) {
      console.warn('⚠ La base est vide. Lancez `npm run db:init` pour importer le catalogue.\n');
    } else {
      const ch = await un('SELECT COUNT(*) AS n FROM chapitres');
      console.log(`· base connectée : ${c.n} matières, ${ch.n} chapitres`);
    }
  } catch (e) {
    console.error('\n✗ Base de données inaccessible : ' + e.message);
    console.error('  Démarrez MySQL (WampServer) puis exécutez `npm run db:init`.\n');
    process.exit(1);
  }

  const serveur = app.listen(config.port, () => {
    console.log(`· Cashevent School sur http://localhost:${config.port}`);
    console.log('  élève  yasmine@cashevent.ma / eleve1234');
    console.log('  parent parent@cashevent.ma  / parent1234');
    console.log('  admin  admin@cashevent.ma   / admin1234\n');
  });

  const arreter = async signal => {
    console.log('\n· arrêt (' + signal + ')');
    serveur.close(async () => { await pool.end(); process.exit(0); });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => arreter('SIGINT'));
  process.on('SIGTERM', () => arreter('SIGTERM'));
})();
