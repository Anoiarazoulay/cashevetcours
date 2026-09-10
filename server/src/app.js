/* Application Express : API + service des pages statiques */
require('express-async-errors'); /* les rejets des gestionnaires async partent au middleware d'erreur */
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { attacher, requiert } = require('./middleware/auth');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(attacher);

/* --------------------------------- API ---------------------------------- */
const api = express.Router();
api.use('/auth', require('./routes/auth'));
api.use('/', require('./routes/catalogue'));
api.use('/progression', require('./routes/progression'));
api.use('/parent', require('./routes/parent'));
api.use('/admin', require('./routes/admin'));
api.get('/sante', (_req, res) => res.json({ ok: true, heure: new Date().toISOString() }));
api.use((_req, res) => res.status(404).json({ erreur: 'Route inconnue.' }));
app.use('/api', api);

/* --------------------------- pages protégées ---------------------------- */
/* Une page demandée sans le bon rôle renvoie vers la connexion :
   l'API reste la seule véritable barrière, ceci évite les écrans vides. */
const PAGES = {
  '/ecole.html': ['eleve', 'admin'],
  '/matieres.html': ['eleve', 'admin'],
  '/revisions.html': ['eleve', 'admin'],
  '/espace-parent.html': ['parent', 'admin'],
  '/admin.html': ['admin']
};
app.get(Object.keys(PAGES), (req, res, suite) => {
  const roles = PAGES[req.path];
  if (!req.utilisateur) return res.redirect('/connexion.html?suite=' + encodeURIComponent(req.path));
  if (!roles.includes(req.utilisateur.role)) return res.redirect('/');
  suite();
});

/* Racine : la vitrine pour un visiteur, son espace pour un compte connecté */
app.get('/', (req, res) => {
  if (!req.utilisateur) return res.redirect('/accueil.html');
  const cible = { eleve: '/ecole.html', parent: '/espace-parent.html', admin: '/admin.html' };
  res.redirect(cible[req.utilisateur.role] || '/accueil.html');
});

/* Un visiteur déjà connecté n'a rien à faire sur la vitrine ni sur les formulaires */
app.get(['/accueil.html', '/connexion.html', '/inscription.html'], (req, res, suite) => {
  if (req.utilisateur && !req.query.suite) return res.redirect('/');
  suite();
});

/* ------------------------- versionnement des fichiers ---------------------- */
/* Les pages référencent leurs feuilles et scripts avec « ?v=… ». Ce jeton est
   recalculé à partir de la date du fichier le plus récent : dès qu'un script
   change, son adresse change, et aucun navigateur ne peut servir une version
   périmée. Le HTML, lui, n'est jamais mis en cache. */
const fs = require('fs');
let jeton = null, jetonExpire = 0;

const versionAssets = () => {
  if (Date.now() < jetonExpire && jeton) return jeton;
  let recent = 0;
  for (const dossier of ['css', 'js']) {
    const chemin = path.join(config.racinePublique, dossier);
    for (const f of fs.readdirSync(chemin)) {
      const { mtimeMs } = fs.statSync(path.join(chemin, f));
      if (mtimeMs > recent) recent = mtimeMs;
    }
  }
  jeton = Math.round(recent).toString(36);
  jetonExpire = Date.now() + 2000;
  return jeton;
};

app.get(/\.html$/, (req, res, suite) => {
  const fichier = path.join(config.racinePublique, path.normalize(req.path).replace(/^[\\/]+/, ''));
  if (!fichier.startsWith(config.racinePublique) || !fs.existsSync(fichier)) return suite();
  const html = fs.readFileSync(fichier, 'utf8')
    .replace(/(\/(?:css|js)\/[a-z-]+\.(?:css|js))\?v=[\w.]+/g, '$1?v=' + versionAssets());
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(html);
});

/* « no-cache » : le navigateur garde les fichiers mais revalide à chaque fois. */
app.use(express.static(config.racinePublique, {
  extensions: ['html'],
  etag: true,
  lastModified: true,
  setHeaders: res => res.setHeader('Cache-Control', 'no-cache')
}));

app.use((req, res) => {
  if (req.accepts('html')) return res.status(404).sendFile(path.join(config.racinePublique, '404.html'), e => {
    if (e) res.status(404).type('txt').send('Page introuvable.');
  });
  res.status(404).json({ erreur: 'Introuvable.' });
});

/* ------------------------------- erreurs -------------------------------- */
app.use((err, _req, res, _suite) => {
  console.error(err);
  const code = err.statusCode || 500;
  res.status(code).json({
    erreur: code === 500 ? 'Une erreur est survenue côté serveur.' : err.message
  });
});

module.exports = app;
