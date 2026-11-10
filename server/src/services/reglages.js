/* Réglages modifiables depuis l'administration, sans redéployer le site.
   Aujourd'hui : les coordonnées où les élèves paient Cashevent School. */
const { un, executer } = require('../db');

const PAR_DEFAUT = {
  coordonnees_paiement: 'Les coordonnées de paiement de Cashevent School seront affichées ici très bientôt. ' +
    'Pour payer dès maintenant, écrivez-nous depuis la page Contact.'
};

async function lire(cle) {
  try {
    const r = await un('SELECT valeur FROM reglages WHERE cle = ?', [cle]);
    return r && r.valeur ? r.valeur : PAR_DEFAUT[cle] || '';
  } catch (e) { return PAR_DEFAUT[cle] || ''; }
}

const ecrire = (cle, valeur) => executer(
  'INSERT INTO reglages (cle, valeur) VALUES (?, ?) ON DUPLICATE KEY UPDATE valeur = VALUES(valeur), maj_le = NOW()',
  [cle, valeur]);

const estDefini = async cle => !!(await un('SELECT 1 AS ok FROM reglages WHERE cle = ? AND valeur <> ?', [cle, '']).catch(() => null));

module.exports = { lire, ecrire, estDefini, PAR_DEFAUT };
