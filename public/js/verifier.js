/* CASHEVENT SCHOOL — vérification d'un admis : l'établissement scanne le QR
   code de l'élève et voit aussitôt s'il l'a bien accepté, puis note la
   réception de ses originaux.                                               */
(async () => {
  const { $, message, entete, pied, chargement, erreurFatale } = UI;

  chargement(true);
  let moi;
  try { moi = await API.get('/auth/moi').then(r => r.utilisateur); }
  catch (e) { chargement(false); return erreurFatale(e.message); }
  entete(moi, 'etablissement', {});
  pied();
  chargement(false);

  const txt = t => String(t == null ? '' : t)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dateFR = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const code = decodeURIComponent(location.pathname.split('/').pop() || '').toUpperCase();
  const zone = $('#verif');

  if (moi.role !== 'etablissement' && moi.role !== 'admin') {
    zone.innerHTML = `<div class="verif-carte"><div class="verif-tete non"><span class="rond">!</span><h1>Réservé aux établissements</h1>
      <p>Ce QR code se scanne depuis le compte de l’université ou de l’école qui a admis l’élève.</p></div></div>`;
    return;
  }

  const dessiner = a => {
    const e = a.eleve, recus = !!a.originauxLe;
    zone.innerHTML = `<div class="verif-carte">
      <div class="verif-tete${a.admis ? '' : ' non'}">
        <span class="rond">${a.admis ? '✓' : '!'}</span>
        <h1>${txt(e.nom)}</h1>
        <p>${a.admis ? `Admis${a.decideeLe ? ' le ' + dateFR(a.decideeLe) : ''} à ${txt(a.etablissement.nom)}` : 'Cette admission n’est plus valable.'}</p>
      </div>
      <div class="verif-corps">
        <dl>
          <dt>Code</dt><dd>${txt(a.code || code)}</dd>
          <dt>E-mail</dt><dd>${txt(e.email)}</dd>
          ${e.telephone ? `<dt>Téléphone</dt><dd>${txt(e.telephone)}</dd>` : ''}
          ${e.dateNaissance ? `<dt>Date de naissance</dt><dd>${dateFR(e.dateNaissance)}</dd>` : ''}
          ${e.filiere ? `<dt>Série</dt><dd>${txt(e.filiere)}</dd>` : ''}
          ${e.lycee ? `<dt>Lycée</dt><dd>${txt(e.lycee)}${e.ville ? ' · ' + txt(e.ville) : ''}</dd>` : ''}
          <dt>Originaux attendus avant le</dt><dd>${dateFR(a.limiteOriginaux)}</dd>
          <dt>Pièces envoyées en ligne</dt><dd>${a.pieces.length ? a.pieces.map(p => txt(p.libelle)).join(', ') : '—'}</dd>
          <dt>Originaux</dt><dd>${recus ? '✓ Reçus le ' + dateFR(a.originauxLe) : 'Pas encore reçus'}</dd>
        </dl>
        <div class="verif-actions">
          ${a.admis ? (recus
            ? '<button class="pilule" data-originaux="0">Annuler la réception</button>'
            : '<button class="pilule blanc grand" data-originaux="1">✓ Originaux reçus</button>') : ''}
          <a class="pilule" href="/espace-etablissement">Toutes mes candidatures</a>
        </div>
      </div></div>`;
  };

  let admis;
  try { ({ admis } = await API.get('/etablissement/verifier/' + encodeURIComponent(code))); dessiner(admis); }
  catch (e) {
    zone.innerHTML = `<div class="verif-carte"><div class="verif-tete non"><span class="rond">✕</span><h1>Code inconnu</h1>
      <p>${txt(e.message)}</p></div><div class="verif-corps"><div class="verif-actions"><a class="pilule blanc" href="/espace-etablissement">Retour à mes candidatures</a></div></div></div>`;
    return;
  }

  zone.addEventListener('click', async e => {
    const b = e.target.closest('[data-originaux]'); if (!b) return;
    b.disabled = true;
    try {
      const r = await API.post('/etablissement/verifier/' + encodeURIComponent(code) + '/originaux', { recus: b.dataset.originaux === '1' });
      admis.originauxLe = r.originauxLe; dessiner(admis);
      message(r.originauxLe ? 'Originaux reçus : c’est noté' : 'Réception annulée');
    } catch (err) { b.disabled = false; message(err.message); }
  });
})();
