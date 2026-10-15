/* Authentification par jeton JWT stocké dans un cookie httpOnly */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { un } = require('../db');

/* Le jeton porte le numéro de session du compte : changer de mot de passe,
   ou désactiver le compte, rend tous les jetons antérieurs caducs. */
const signer = utilisateur => jwt.sign(
  { id: utilisateur.id, role: utilisateur.role, v: utilisateur.session_version || 1 },
  config.jwt.secret,
  { expiresIn: config.jwt.duree });

const poserCookie = (res, jeton) => res.cookie(config.jwt.cookie, jeton, {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.env === 'production',
  maxAge: 7 * 24 * 3600 * 1000
});

const retirerCookie = res => res.clearCookie(config.jwt.cookie);

/* Attache req.utilisateur quand un jeton valide est présent. Ne bloque jamais. */
const attacher = async (req, _res, suite) => {
  const jeton = req.cookies[config.jwt.cookie];
  if (!jeton) return suite();
  try {
    const charge = jwt.verify(jeton, config.jwt.secret);
    const u = await un(
      `SELECT id, nom, email, role, niveau, actif, telephone, date_naissance,
              etablissement, filiere, ville, code_postal, pays, session_version, doit_changer_mdp
         FROM utilisateurs WHERE id = ?`, [charge.id]);
    if (u && u.actif && (charge.v || 1) === (u.session_version || 1)) req.utilisateur = u;
  } catch (e) { /* jeton expiré ou invalide : visiteur anonyme */ }
  suite();
};

/* Barrière : connexion requise, et éventuellement un rôle précis. */
const requiert = (...roles) => (req, res, suite) => {
  if (!req.utilisateur) return res.status(401).json({ erreur: 'Connexion requise.' });
  if (roles.length && !roles.includes(req.utilisateur.role))
    return res.status(403).json({ erreur: 'Vous n’avez pas accès à cette ressource.' });
  suite();
};

/* Un mot de passe posé par quelqu'un d'autre doit être remplacé avant tout
   le reste : seules la lecture du profil, la déconnexion et le changement
   lui-même restent ouverts. */
const EXEMPTES = new Set(['/auth/moi', '/auth/motdepasse', '/auth/deconnexion', '/auth/connexion']);
const exigerNouveauMotDePasse = (req, res, suite) => {
  if (req.utilisateur && req.utilisateur.doit_changer_mdp && !EXEMPTES.has(req.path))
    return res.status(403).json({
      erreur: 'Choisissez un nouveau mot de passe avant de continuer.', code: 'MOT_DE_PASSE_A_CHANGER' });
  suite();
};

/* Garde-fou contre les requêtes forgées depuis un autre site : une requête
   qui modifie des données doit venir de la même origine. Le cookie est déjà
   en « SameSite=Lax » ; ceci double la ceinture. */
const memeOrigine = (req, res, suite) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return suite();
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none')
    return res.status(403).json({ erreur: 'Requête refusée : origine inconnue.' });
  const origine = req.headers.origin;
  if (origine) {
    let hote;
    try { hote = new URL(origine).host; } catch (e) { hote = null; }
    if (hote !== req.headers.host) return res.status(403).json({ erreur: 'Requête refusée : origine inconnue.' });
  }
  suite();
};

/* Un parent ne consulte que ses propres enfants ; l'admin voit tout le monde. */
const eleveAutorise = async (utilisateur, eleveId) => {
  eleveId = Number(eleveId);
  if (!Number.isInteger(eleveId) || eleveId <= 0) return false;
  if (utilisateur.role === 'admin') return true;
  if (utilisateur.role === 'eleve') return utilisateur.id === eleveId;
  if (utilisateur.role === 'parent')
    return !!await un('SELECT 1 AS ok FROM liens_famille WHERE parent_id = ? AND eleve_id = ?',
      [utilisateur.id, eleveId]);
  return false;
};

module.exports = { signer, poserCookie, retirerCookie, attacher, requiert, exigerNouveauMotDePasse, memeOrigine, eleveAutorise };
