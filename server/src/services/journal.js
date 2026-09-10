/* Journal d'activité : trace des actions notables, lisible depuis l'administration.
   L'écriture ne doit jamais faire échouer la requête qui l'a déclenchée. */
const { tous, un, executer } = require('../db');

const CATEGORIES = ['auth', 'compte', 'catalogue', 'apprentissage'];
const couper = (v, n) => v == null ? null : String(v).slice(0, n);

/* Derrière un proxy, la première adresse de X-Forwarded-For fait foi. */
const adresse = req => {
  const entete = req.headers['x-forwarded-for'];
  const brute = entete ? String(entete).split(',')[0].trim() : req.ip || '';
  return couper(brute.replace(/^::ffff:/, ''), 45);
};

/* `acteur` permet de tracer une tentative de connexion échouée, sans session. */
async function enregistrer(req, { categorie, action, cible, details, succes = true, acteur }) {
  try {
    const u = acteur || req.utilisateur || null;
    await executer(
      `INSERT INTO journal (utilisateur_id, nom, role, categorie, action, cible, details, succes, ip)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [u && u.id ? u.id : null,
       couper(u ? u.nom || u.email : null, 120),
       u && u.role ? u.role : 'anonyme',
       CATEGORIES.includes(categorie) ? categorie : 'auth',
       couper(action, 60),
       couper(cible, 200),
       couper(details, 400),
       succes ? 1 : 0,
       adresse(req)]);
  } catch (e) {
    /* Un journal indisponible ne doit pas empêcher l'action de l'utilisateur. */
    console.error('journal : ' + e.message);
  }
}

/* Liste paginée, du plus récent au plus ancien. */
async function lister({ categorie, utilisateurId, role, q, succes, limite = 60, avant } = {}) {
  const clauses = [], params = [];
  if (CATEGORIES.includes(categorie)) { clauses.push('j.categorie = ?'); params.push(categorie); }
  if (['eleve', 'parent', 'admin', 'anonyme'].includes(role)) { clauses.push('j.role = ?'); params.push(role); }
  if (utilisateurId) { clauses.push('j.utilisateur_id = ?'); params.push(Number(utilisateurId)); }
  if (succes === '0' || succes === false) clauses.push('j.succes = 0');
  if (q) {
    clauses.push('(j.nom LIKE ? OR j.action LIKE ? OR j.cible LIKE ? OR j.details LIKE ?)');
    const m = '%' + q + '%'; params.push(m, m, m, m);
  }
  if (avant) { clauses.push('j.id < ?'); params.push(Number(avant)); }

  const n = Math.min(200, Math.max(10, Number(limite) || 60));
  const lignes = await tous(
    `SELECT j.* FROM journal j
      ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''}
      ORDER BY j.id DESC LIMIT ${n}`, params);

  return { lignes, suivant: lignes.length === n ? lignes[lignes.length - 1].id : null };
}

/* Quelques chiffres pour coiffer la liste. */
async function resume() {
  const [jour, categories, echecs] = await Promise.all([
    un(`SELECT COUNT(*) AS n FROM journal WHERE cree_le >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`),
    tous(`SELECT categorie, COUNT(*) AS n FROM journal
           WHERE cree_le >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY categorie`),
    un(`SELECT COUNT(*) AS n FROM journal
         WHERE succes = 0 AND cree_le >= DATE_SUB(NOW(), INTERVAL 7 DAY)`)
  ]);
  return { dernieres24h: jour.n, parCategorie: categories, echecs7j: echecs.n };
}

module.exports = { enregistrer, lister, resume, CATEGORIES };
