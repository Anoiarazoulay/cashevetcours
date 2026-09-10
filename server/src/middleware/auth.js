/* Authentification par jeton JWT stocké dans un cookie httpOnly */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { un } = require('../db');

const signer = utilisateur => jwt.sign(
  { id: utilisateur.id, role: utilisateur.role },
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
      'SELECT id, nom, email, role, niveau, actif FROM utilisateurs WHERE id = ?', [charge.id]);
    if (u && u.actif) req.utilisateur = u;
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

module.exports = { signer, poserCookie, retirerCookie, attacher, requiert, eleveAutorise };
