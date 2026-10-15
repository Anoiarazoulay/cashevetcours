/* Sécurité des comptes : politique de mots de passe, frein aux tentatives de
   connexion, et comptes de démonstration à verrouiller en production.      */
const bcrypt = require('bcryptjs');
const { tous, executer } = require('../db');

/* --------------------------- mots de passe ------------------------------- */
const TRIVIAUX = new Set([
  '12345678', '123456789', '1234567890', '00000000', '11111111', '87654321',
  'password', 'password1', 'motdepasse', 'azertyuiop', 'qwertyuiop', 'azerty123',
  'admin1234', 'eleve1234', 'parent1234', 'prof1234', 'cashevent', 'cashevent1',
  'abcdefgh', 'iloveyou', 'bienvenue', 'soleil123', 'football'
]);
const sansAccent = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* Renvoie un message d'erreur si le mot de passe est trop faible, sinon null. */
function motDePasseFaible(mdp, { email = '', nom = '' } = {}) {
  mdp = String(mdp || '');
  if (mdp.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (mdp.length > 200) return 'Le mot de passe est trop long.';
  const bas = sansAccent(mdp);
  if (TRIVIAUX.has(bas) || /^(.)\1+$/.test(bas))
    return 'Ce mot de passe est trop courant. Choisissez-en un plus personnel.';
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(mdp)).length;
  if (classes < 2) return 'Mélangez lettres et chiffres (ou majuscules, ou signes) dans votre mot de passe.';
  /* On compare sans ponctuation : « prenom.nom » et « prenomnom » sont la même fuite. */
  const nu = t => t.replace(/[^a-z0-9]/g, '');
  const local = nu(sansAccent(String(email).split('@')[0]));
  if (local.length >= 4 && nu(bas).includes(local)) return 'Le mot de passe ne doit pas contenir votre adresse e-mail.';
  for (const mot of sansAccent(nom).split(/\s+/))
    if (mot.length >= 4 && bas.includes(mot)) return 'Le mot de passe ne doit pas contenir votre nom.';
  return null;
}

/* ----------------------- frein par compte à la connexion ------------------ */
/* Cinq échecs sur un même compte en un quart d'heure : le compte attend un
   quart d'heure. Tenu en mémoire : suffisant pour un serveur unique.         */
const ECHECS_MAX = 5, FENETRE = 15 * 60 * 1000;
const tentatives = new Map();

function connexionBloquee(email) {
  const t = tentatives.get(email);
  if (!t) return 0;
  if (Date.now() - t.depuis > FENETRE) { tentatives.delete(email); return 0; }
  return t.echecs >= ECHECS_MAX ? Math.ceil((t.depuis + FENETRE - Date.now()) / 60000) : 0;
}
function noterEchec(email) {
  const t = tentatives.get(email);
  if (!t || Date.now() - t.depuis > FENETRE) tentatives.set(email, { echecs: 1, depuis: Date.now() });
  else t.echecs++;
}
const noterSucces = email => tentatives.delete(email);
/* Les comptes oubliés sont purgés de temps en temps. */
setInterval(() => {
  for (const [email, t] of tentatives) if (Date.now() - t.depuis > FENETRE) tentatives.delete(email);
}, FENETRE).unref();

/* ---------------------- comptes de démonstration -------------------------- */
const DEMO = [
  ['admin@cashevent.education', 'admin1234'],
  ['yasmine@cashevent.education', 'eleve1234'],
  ['mehdi@cashevent.education', 'eleve1234'],
  ['parent@cashevent.education', 'parent1234']
];

/* En production, un compte de démonstration qui a encore son mot de passe
   public devra le changer à sa prochaine connexion. Renvoie les adresses. */
async function verrouillerComptesDemo() {
  const comptes = await tous(
    `SELECT id, email, mot_de_passe FROM utilisateurs WHERE email IN (?)`, [DEMO.map(d => d[0])]);
  const touches = [];
  for (const c of comptes) {
    const mdp = DEMO.find(d => d[0] === c.email)[1];
    if (bcrypt.compareSync(mdp, c.mot_de_passe)) {
      await executer('UPDATE utilisateurs SET doit_changer_mdp = 1 WHERE id = ?', [c.id]);
      touches.push(c.email);
    }
  }
  return touches;
}

/* Une empreinte bcrypt quelconque, comparée quand l'adresse est inconnue :
   le temps de réponse ne dit pas si le compte existe. */
const EMPREINTE_LEURRE = bcrypt.hashSync('leurre-' + Math.random(), 12);

module.exports = { EMPREINTE_LEURRE, motDePasseFaible, connexionBloquee, noterEchec, noterSucces, verrouillerComptesDemo, DEMO };
