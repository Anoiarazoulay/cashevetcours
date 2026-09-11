/* Application Express : API, pages statiques, et durcissement pour la production. */
require('express-async-errors'); /* les rejets des gestionnaires async partent au middleware d'erreur */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { attacher } = require('./middleware/auth');

const app = express();
const prod = config.env === 'production';

app.disable('x-powered-by');
/* Derrière un reverse proxy (Nginx, Traefik, Heroku…), l'adresse réelle du
   visiteur arrive dans X-Forwarded-For : sans cela les limites de débit et le
   journal enregistreraient toutes la même IP. */
app.set('trust proxy', prod ? 1 : false);

app.use(compression());

/* Un nonce par requête : les rares scripts en ligne sont autorisés nommément,
   ce qui évite d'ouvrir la porte à « unsafe-inline » pour tout le monde. */
app.use((req, res, suite) => { res.locals.nonce = crypto.randomBytes(16).toString('base64'); suite(); });

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
      /* Les couleurs des matières viennent de la base et sont posées en
         attribut « style » : la politique doit donc tolérer les styles en ligne. */
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https://i.ytimg.com', 'https://*.ytimg.com'],
      'frame-src': ['https://www.youtube-nocookie.com', 'https://www.youtube.com'],
      'connect-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      ...(prod ? { 'upgrade-insecure-requests': [] } : {})
    }
  },
  /* Les miniatures YouTube sont servies par un autre domaine. */
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: prod ? { maxAge: 15552000, includeSubDomains: true } : false
}));

app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());
app.use(attacher);

/* ------------------------------ limites de débit --------------------------- */
const limite = (minutes, max, message) => rateLimit({
  windowMs: minutes * 60 * 1000,
  limit: max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  /* En développement, on ne veut pas être bloqué par ses propres tests. */
  skip: () => !prod,
  handler: (_req, res) => res.status(429).json({ erreur: message })
});

const limiteConnexion = limite(15, 20,
  'Trop de tentatives de connexion. Réessayez dans quelques minutes.');
const limiteApi = limite(15, 1000,
  'Trop de requêtes. Patientez un instant avant de recommencer.');

/* --------------------------------- API ---------------------------------- */
const api = express.Router();
api.use(limiteApi);
api.post('/auth/connexion', limiteConnexion);
api.post('/auth/inscription', limiteConnexion);
api.use('/auth', require('./routes/auth'));
api.use('/', require('./routes/catalogue'));
api.use('/progression', require('./routes/progression'));
api.use('/parent', require('./routes/parent'));
api.use('/admin', require('./routes/admin'));
api.use('/contact', require('./routes/contact'));
api.get('/sante', (_req, res) => res.json({
  ok: true, version: require('../../package.json').version,
  environnement: config.env, heure: new Date().toISOString()
}));
api.use((_req, res) => res.status(404).json({ erreur: 'Route inconnue.' }));
app.use('/api', api);

/* --------------------------- pages protégées ---------------------------- */
/* Une page demandée sans le bon rôle renvoie vers la connexion :
   l'API reste la seule véritable barrière, ceci évite les écrans vides. */
const PAGES = {
  '/ecole.html': ['eleve', 'admin'],
  '/matieres.html': ['eleve', 'admin'],
  '/revisions.html': ['eleve', 'admin'],
  '/progression.html': ['eleve', 'admin'],
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

/* ---------------------------- plan du site -------------------------------- */
/* Généré à la demande : l'adresse du site vient de la requête, ce qui évite de
   figer un domaine dans un fichier statique. */
const PAGES_PUBLIQUES = [
  ['/accueil.html', '1.0', 'weekly'],
  ['/a-propos.html', '0.8', 'monthly'],
  ['/aide.html', '0.8', 'monthly'],
  ['/contact.html', '0.6', 'yearly'],
  ['/conditions.html', '0.3', 'yearly'],
  ['/confidentialite.html', '0.3', 'yearly'],
  ['/mentions-legales.html', '0.3', 'yearly']
];

app.get('/sitemap.xml', (req, res) => {
  const base = (req.headers['x-forwarded-proto'] || req.protocol) + '://' + req.get('host');
  const jour = new Date().toISOString().slice(0, 10);
  const urls = PAGES_PUBLIQUES.map(([chemin, priorite, frequence]) =>
    `  <url>
    <loc>${base}${chemin}</loc>
    <lastmod>${jour}</lastmod>
    <changefreq>${frequence}</changefreq>
    <priority>${priorite}</priority>
  </url>`).join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});

/* ------------------------- versionnement des fichiers ---------------------- */
/* Les pages référencent leurs feuilles et scripts avec « ?v=… ». Ce jeton est
   recalculé à partir de la date du fichier le plus récent : dès qu'un script
   change, son adresse change, et aucun navigateur ne peut servir une version
   périmée. Le HTML, lui, n'est jamais mis en cache. */
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
  /* En production les fichiers ne bougent plus : inutile de relire le disque. */
  jetonExpire = Date.now() + (prod ? 3600000 : 2000);
  return jeton;
};

app.get(/\.html$/, (req, res, suite) => {
  const fichier = path.join(config.racinePublique, path.normalize(req.path).replace(/^[\\/]+/, ''));
  if (!fichier.startsWith(config.racinePublique) || !fs.existsSync(fichier)) return suite();
  const html = fs.readFileSync(fichier, 'utf8')
    .replace(/(\/(?:css|js)\/[a-z-]+\.(?:css|js))\?v=[\w.]+/g, '$1?v=' + versionAssets())
    /* Le nonce autorise les quelques scripts en ligne des pages. */
    .replace(/<script(?![^>]*\ssrc=)/g, `<script nonce="${res.locals.nonce}"`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(html);
});

/* Les fichiers portant un jeton de version ne changent jamais sous cette adresse :
   on peut les garder un an. Les autres sont revalidés à chaque visite. */
app.use(express.static(config.racinePublique, {
  extensions: ['html'],
  etag: true,
  lastModified: true,
  setHeaders: (res, chemin) => {
    const versionne = res.req && res.req.query && res.req.query.v;
    const media = /\.(?:jpg|jpeg|png|webp|svg|ico|woff2?)$/i.test(chemin);
    res.setHeader('Cache-Control',
      prod && (versionne || media) ? 'public, max-age=31536000, immutable' : 'no-cache');
  }
}));

app.use((req, res) => {
  if (req.accepts('html')) return res.status(404).sendFile(path.join(config.racinePublique, '404.html'), e => {
    if (e) res.status(404).type('txt').send('Page introuvable.');
  });
  res.status(404).json({ erreur: 'Introuvable.' });
});

/* ------------------------------- erreurs -------------------------------- */
app.use((err, req, res, _suite) => {
  const code = err.statusCode || 500;
  /* En production on journalise l'essentiel sans exposer la pile au client. */
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${code}`);
  console.error(prod ? err.message : err.stack);
  res.status(code).json({
    erreur: code === 500 ? 'Une erreur est survenue côté serveur.' : err.message
  });
});

module.exports = app;
