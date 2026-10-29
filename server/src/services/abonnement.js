/* Abonnements annuels : ce que chaque compte a débloqué, et par qui.
   - « eleve » : l'élève lui-même ; débloque son espace et les universités.
   - « premium » : l'élève, et par ricochet ses parents (liens_famille) et
     ses enseignants référents (referents), qui n'ont rien à payer de leur côté.
   Un parent ou un enseignant peut aussi souscrire premium pour son propre compte. */
const config = require('../config');
const { un, tous, executer } = require('../db');

const FORMULES = config.abonnements.formules;
const debloque = (formule, role) => (FORMULES[formule] || FORMULES.premium).debloque.includes(role);

/* L'abonnement actif d'un compte, s'il y en a un (le plus tardif). */
const actifDe = id => un(
  `SELECT id, formule, debut, fin FROM abonnements
    WHERE utilisateur_id = ? AND etat = 'actif' AND fin >= CURDATE()
    ORDER BY fin DESC LIMIT 1`, [id]);

/* Ce qui couvre un compte : son propre abonnement, ou le premium d'un élève
   qui lui est lié. Renvoie { formule, fin, via, eleve } ou null. */
async function couverture(utilisateur) {
  if (!utilisateur) return null;
  if (utilisateur.role === 'admin' || utilisateur.role === 'etablissement')
    return { formule: 'premium', fin: null, via: 'role' };
  const propre = await actifDe(utilisateur.id);
  if (propre) return { formule: propre.formule, fin: propre.fin, via: 'moi', id: propre.id };
  if (utilisateur.role === 'parent' || utilisateur.role === 'enseignant') {
    const lien = utilisateur.role === 'parent'
      ? 'JOIN liens_famille l ON l.eleve_id = a.utilisateur_id AND l.parent_id = ?'
      : 'JOIN referents l ON l.eleve_id = a.utilisateur_id AND l.enseignant_id = ?';
    const viaEleve = await un(
      `SELECT a.formule, a.fin, u.nom AS eleve FROM abonnements a ${lien}
         JOIN utilisateurs u ON u.id = a.utilisateur_id
        WHERE a.etat = 'actif' AND a.formule = 'premium' AND a.fin >= CURDATE()
        ORDER BY a.fin DESC LIMIT 1`, [utilisateur.id]);
    if (viaEleve) return { formule: 'premium', fin: viaEleve.fin, via: 'eleve', eleve: viaEleve.eleve };
  }
  return null;
}

/* Le compte a-t-il accès à son espace ? Les élèves ont besoin d'une formule
   quelconque ; parents et enseignants, du premium (le leur ou celui d'un élève). */
async function autorise(utilisateur) {
  const c = await couverture(utilisateur);
  return !!c && (c.via === 'role' || debloque(c.formule, utilisateur.role));
}

/* Ce que voit la page « Mon abonnement ». */
async function situation(utilisateur) {
  const [couv, demandes] = await Promise.all([
    couverture(utilisateur),
    tous(`SELECT id, formule, etat, prix, devise, paiement, reference_paiement, debut, fin, cree_le, confirme_le
            FROM abonnements WHERE utilisateur_id = ? ORDER BY cree_le DESC LIMIT 10`, [utilisateur.id])
  ]);
  return {
    obligatoire: config.abonnements.obligatoires,
    instructionsPaiement: config.abonnements.instructionsPaiement,
    formules: Object.entries(FORMULES).map(([code, f]) => ({ code, ...f, ouverte: utilisateur.role === 'eleve' || code === 'premium' })),
    couverture: couv,
    autorise: !!couv && (couv.via === 'role' || debloque(couv.formule, utilisateur.role)),
    enAttente: demandes.find(d => d.etat === 'en_attente') || null,
    historique: demandes.filter(d => d.etat !== 'en_attente')
  };
}

/* Souscription : une seule demande en attente à la fois. */
async function souscrire(utilisateur, formule) {
  const f = FORMULES[formule];
  if (!f) throw Object.assign(new Error('Formule inconnue.'), { statut: 400 });
  if (utilisateur.role !== 'eleve' && formule !== 'premium')
    throw Object.assign(new Error('Seule la formule premium est ouverte aux parents et aux enseignants.'), { statut: 400 });
  const deja = await un(`SELECT id FROM abonnements WHERE utilisateur_id = ? AND etat = 'en_attente'`, [utilisateur.id]);
  if (deja) throw Object.assign(new Error('Vous avez déjà une demande en attente de confirmation.'), { statut: 409 });
  const r = await executer(
    `INSERT INTO abonnements (utilisateur_id, formule, prix, devise) VALUES (?, ?, ?, ?)`,
    [utilisateur.id, formule, f.prix, f.devise]);
  return r.insertId;
}

/* Activation par l'administration : commence aujourd'hui, ou le lendemain de
   la fin de l'abonnement courant s'il en reste un, pour ne perdre aucun jour. */
async function activer(id, { mois, note } = {}) {
  const a = await un('SELECT * FROM abonnements WHERE id = ?', [id]);
  if (!a) throw Object.assign(new Error('Abonnement introuvable.'), { statut: 404 });
  if (a.etat === 'actif') throw Object.assign(new Error('Cet abonnement est déjà actif.'), { statut: 409 });
  const duree = Number(mois) > 0 ? Math.min(60, Number(mois)) : (FORMULES[a.formule] || FORMULES.eleve).dureeMois;
  const courant = await actifDe(a.utilisateur_id);
  const depuis = courant ? courant.fin : null;
  await executer(
    `UPDATE abonnements
        SET etat = 'actif', paiement = 'confirme', confirme_le = NOW(), note = COALESCE(?, note),
            debut = GREATEST(CURDATE(), COALESCE(DATE_ADD(?, INTERVAL 1 DAY), CURDATE())),
            fin = DATE_ADD(GREATEST(CURDATE(), COALESCE(DATE_ADD(?, INTERVAL 1 DAY), CURDATE())), INTERVAL ? MONTH)
      WHERE id = ?`, [note || null, depuis, depuis, duree, id]);
  return un('SELECT * FROM abonnements WHERE id = ?', [id]);
}

/* Accordé directement par l'administration (offert, payé en main propre…). */
async function accorder(utilisateurId, formule, { mois, note } = {}) {
  const f = FORMULES[formule];
  if (!f) throw Object.assign(new Error('Formule inconnue.'), { statut: 400 });
  const u = await un('SELECT id, role FROM utilisateurs WHERE id = ?', [utilisateurId]);
  if (!u) throw Object.assign(new Error('Compte introuvable.'), { statut: 404 });
  if (!debloque(formule, u.role)) throw Object.assign(new Error('Cette formule ne débloque pas l’espace de ce compte.'), { statut: 400 });
  const r = await executer(
    `INSERT INTO abonnements (utilisateur_id, formule, prix, devise, note) VALUES (?, ?, ?, ?, ?)`,
    [u.id, formule, f.prix, f.devise, note || 'Accordé par l’administration']);
  return activer(r.insertId, { mois });
}

/* Reçu d'un abonnement confirmé : une page sobre, imprimable, servie au
   titulaire du compte (ou à l'administration). Tout est échappé. */
const html = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dateFR = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
function recuHTML(a, u, nonce) {
  const numero = 'CS-' + new Date(a.confirme_le || a.cree_le).getFullYear() + '-' + String(a.id).padStart(6, '0');
  const montant = Number(a.prix).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' ' + (a.devise === 'EUR' ? '€' : a.devise);
  const f = FORMULES[a.formule] || FORMULES.eleve;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Reçu ${html(numero)} — Cashevent School</title>
<style>
  body{margin:0;background:#f3f3f5;font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;color:#17171a}
  .feuille{max-width:720px;margin:32px auto;background:#fff;border-radius:14px;padding:40px 44px;box-shadow:0 10px 40px rgba(0,0,0,.08)}
  .tete{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:2px solid #17171a;padding-bottom:18px}
  .marque{font-size:26px;font-weight:900;letter-spacing:.02em;color:#CD5CB4}.marque small{display:block;font-size:12px;color:#666;font-weight:600;letter-spacing:.12em;text-transform:uppercase}
  .numero{text-align:right;font-size:13px;color:#555}.numero b{display:block;font-size:18px;color:#17171a}
  h1{font-size:22px;margin:26px 0 4px}.sous{color:#666;font-size:14px;margin:0 0 22px}
  dl{display:grid;grid-template-columns:200px 1fr;gap:10px 18px;font-size:14.5px;margin:0}dt{color:#666}dd{margin:0;font-weight:600}
  table{width:100%;border-collapse:collapse;margin:26px 0 10px;font-size:14.5px}th{text-align:left;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:#666;padding:8px 0;border-bottom:1px solid #ddd}
  td{padding:14px 0;border-bottom:1px solid #eee}td.d{text-align:right}tr.total td{border:0;font-size:18px;font-weight:800;padding-top:16px}
  .tampon{display:inline-block;margin-top:8px;padding:6px 12px;border:2px solid #1f9d5a;color:#1f9d5a;border-radius:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:12px}
  .pied{margin-top:34px;padding-top:16px;border-top:1px solid #ddd;font-size:12.5px;color:#666;line-height:1.6}
  .actions{max-width:720px;margin:0 auto 40px;display:flex;gap:10px;justify-content:flex-end}
  button,a.btn{font:inherit;font-weight:700;padding:10px 18px;border-radius:999px;border:1px solid #17171a;background:#17171a;color:#fff;cursor:pointer;text-decoration:none}a.btn{background:#fff;color:#17171a}
  @media print{body{background:#fff}.feuille{box-shadow:none;margin:0;max-width:none}.actions{display:none}}
</style></head><body>
<div class="feuille">
  <div class="tete"><div class="marque">CASHEVENT<small>School · cashevent.school</small></div>
    <div class="numero">Reçu n°<b>${html(numero)}</b>Émis le ${html(dateFR(a.confirme_le || new Date()))}</div></div>
  <h1>Reçu d’abonnement</h1>
  <p class="sous">Ce document atteste du règlement de l’abonnement annuel ci-dessous.</p>
  <dl>
    <dt>Titulaire</dt><dd>${html(u.nom)}</dd>
    <dt>Adresse e-mail</dt><dd>${html(u.email)}</dd>
    <dt>Compte</dt><dd>${html({ eleve: 'Élève', parent: 'Parent', enseignant: 'Enseignant' }[u.role] || u.role)} · n° ${html(u.id)}</dd>
    <dt>Référence du paiement</dt><dd>${html(a.reference_paiement || 'Confirmé par l’administration')}</dd>
  </dl>
  <table><thead><tr><th>Désignation</th><th>Période</th><th class="d">Montant</th></tr></thead>
    <tbody><tr><td><b>Abonnement ${html(f.libelle)}</b><br><span style="color:#666;font-size:13px">${html(f.debloque.map(r => ({ eleve: 'espace élève', parent: 'espace parent', enseignant: 'espace enseignant', etablissement: 'universités et écoles' }[r])).join(', '))}</span></td>
      <td>du ${html(dateFR(a.debut))}<br>au ${html(dateFR(a.fin))}</td><td class="d">${html(montant)}</td></tr>
    <tr class="total"><td colspan="2">Total réglé</td><td class="d">${html(montant)}</td></tr></tbody></table>
  <span class="tampon">Payé</span>
  <p class="pied">Cashevent School — plateforme de révision du baccalauréat. Contact : contact@cashevent.education.
    Reçu généré automatiquement depuis l’espace du titulaire ; il n’a pas valeur de facture fiscale.${a.note ? ' Note : ' + html(a.note) : ''}</p>
</div>
<div class="actions"><a class="btn" href="/abonnement">Retour à mon abonnement</a><button id="imprimer">Imprimer / enregistrer en PDF</button></div>
<script nonce="${html(nonce)}">document.getElementById('imprimer').addEventListener('click', () => window.print());</script>
</body></html>`;
}

module.exports = { FORMULES, couverture, autorise, situation, souscrire, activer, accorder, actifDe, recuHTML };
