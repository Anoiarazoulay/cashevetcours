/* CASHEVENT SCHOOL — « Après le bac » : les universités et écoles, la
   candidature de l'élève (pièces, envoi, frais) et la réponse reçue.       */
(async () => {
  const { $, $$, ICO, message, entete, pied, chargement, erreurFatale } = UI;

  chargement(true);
  let moi;
  try { moi = await API.get('/auth/moi').then(r => r.utilisateur); }
  catch (e) { chargement(false); return erreurFatale(e.message); }
  entete(moi, 'apresbac', { notifications: true });
  pied();
  chargement(false);
  const lectureSeule = moi.role !== 'eleve';

  const txt = t => String(t == null ? '' : t)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dateFR = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const argent = (n, devise) => Number(n).toLocaleString('fr-FR') + ' ' + txt(devise);
  const poids = o => o < 1024 * 1024 ? Math.max(1, Math.round(o / 1024)) + ' Ko' : (Math.round(o / 1024 / 1024 * 10) / 10).toLocaleString('fr-FR') + ' Mo';
  const TYPE = { universite: 'Université', ecole: 'École de formation' };
  const MODE = { concours: 'Concours', dossier: 'Étude de dossier' };
  const ETAT = { brouillon: 'Dossier en préparation', envoyee: 'Candidature envoyée', acceptee: 'Candidature acceptée', refusee: 'Candidature refusée' };
  const PAIE = { en_attente: 'Frais à payer', declare: 'Paiement déclaré', confirme: 'Frais reçus' };
  const EXT = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

  let ETABS = [], CANDS = [];
  const charger = async () => {
    [ETABS, CANDS] = await Promise.all([
      API.get('/etablissements').then(r => r.etablissements),
      lectureSeule ? [] : API.get('/candidatures').then(r => r.candidatures)
    ]);
  };

  /* ------------------------------ rendu ------------------------------ */
  const decisionHTML = c => c.etat === 'acceptee' ? `
      <div class="decision acceptee"><b>🎉 Candidature acceptée</b>
        ${txt(c.etablissement.nom)} a accepté votre candidature. Vous avez <b style="display:inline">${c.delaiOriginaux} jours</b> pour venir avec
        les originaux de vos documents${c.limiteOriginaux ? ', soit avant le <b style="display:inline">' + dateFR(c.limiteOriginaux) + '</b>' : ''}.</div>`
    : c.etat === 'refusee' ? `
      <div class="decision refusee"><b>Candidature refusée</b>
        ${txt(c.etablissement.nom)} n’a pas retenu votre candidature. Vous pouvez postuler ailleurs depuis cette page.</div>` : '';

  const rendreMesCandidatures = () => {
    const bloc = $('#mesCandidatures');
    if (lectureSeule) { bloc.hidden = true; return; }
    const liste = CANDS;
    bloc.innerHTML = `<h2>Mes candidatures</h2>
      <p class="sous">${liste.length ? 'Chaque dossier, son état et la réponse de l’établissement.' : 'Aucune candidature pour l’instant : choisissez un établissement ci-dessous.'}</p>
      ${liste.map(c => `
        <div class="cand-ligne">
          <span class="nom"><b>${txt(c.etablissement.nom)}</b>
            <small>${TYPE[c.etablissement.type]} · ${MODE[c.etablissement.mode]} · ${c.pieces.length} pièce(s)${c.envoyeeLe ? ' · envoyée le ' + dateFR(c.envoyeeLe) : ''}</small></span>
          <span class="etiquette etat-${c.etat}">${ETAT[c.etat]}</span>
          ${c.etablissement.frais > 0 ? `<span class="etiquette paie-${c.paiement}">${PAIE[c.paiement]}</span>` : ''}
          <button class="pilule mini" data-etab="${c.etablissement.id}">${c.etat === 'brouillon' ? 'Compléter le dossier' : 'Voir'}</button>
          ${decisionHTML(c) ? `<div style="flex-basis:100%">${decisionHTML(c)}</div>` : ''}
        </div>`).join('')}`;
    /* Les décisions affichées sont considérées lues. */
    liste.filter(c => (c.etat === 'acceptee' || c.etat === 'refusee') && !c.lueLe)
      .forEach(c => API.post('/candidatures/' + c.id + '/lu').catch(() => { }));
  };

  const rendreEtablissements = () => {
    const h = $('#etablissements');
    if (!ETABS.length) {
      h.innerHTML = `<div class="vide-etat"><b>Aucun établissement inscrit pour l’instant</b>
        Les universités et écoles de formation qui rejoindront Cashevent School apparaîtront ici.</div>`;
      return;
    }
    h.innerHTML = `<h2 class="section-title petit">Universités et écoles</h2>
      <p class="subtitle">${ETABS.length} établissement${ETABS.length > 1 ? 's' : ''} reçoivent des candidatures.</p>
      <div class="etab-grille">${ETABS.map(e => `
        <button class="etab-carte" data-etab="${e.id}">
          <span class="type ${e.type}">${TYPE[e.type]}${e.ville ? ' · ' + txt(e.ville) : ''}</span>
          <b>${txt(e.nom)}</b>
          <p>${txt(e.description || 'Fiche d’admission disponible.')}</p>
          <span class="pied">
            <span class="etiquette mode">${MODE[e.mode]}</span>
            ${e.frais > 0 ? `<span class="etiquette frais">Frais : ${argent(e.frais, e.devise)}</span>` : '<span class="etiquette ok">Sans frais</span>'}
            ${!e.ouvert ? '<span class="etiquette muet">Fermé</span>' : ''}
            ${e.candidature ? `<span class="etiquette etat-${e.candidature.etat}">${ETAT[e.candidature.etat]}</span>` : ''}
          </span>
        </button>`).join('')}</div>`;
  };

  const rendre = () => { rendreMesCandidatures(); rendreEtablissements(); };

  /* ------------------------------ la fiche et le dossier ------------------------------ */
  const ouvrir = async id => {
    let d;
    try { d = await API.get('/etablissements/' + id); } catch (e) { return message(e.message); }
    const e = d.etablissement, c = d.candidature;
    const ancienne = $('#modaleEtab'); if (ancienne) ancienne.remove();

    const piecesRequises = e.pieces || [];
    const fournies = c ? c.pieces : [];
    const dossierHTML = () => {
      if (lectureSeule) return '';
      if (!c) return `
        <div class="panneau espace-haut"><h2>Postuler</h2>
          <p class="sous">Un message facultatif pour l’établissement, puis vos pièces. Le dossier ne part qu’au moment où vous cliquez sur « Envoyer ».</p>
          <form id="formPostuler">
            <label class="champ-libelle">Message <small>— facultatif</small>
              <textarea class="champ" name="message" rows="3" maxlength="600" placeholder="Pourquoi cet établissement, votre projet…"></textarea></label>
            <button class="pilule blanc espace-haut" type="submit">Commencer mon dossier</button>
          </form></div>`;
      const brouillon = c.etat === 'brouillon';
      const manquantes = piecesRequises.filter(p => !fournies.some(f => f.libelle === p));
      return `
        <div class="panneau espace-haut">
          <h2>${brouillon ? 'Mon dossier' : ETAT[c.etat]}</h2>
          <p class="sous">${brouillon ? 'Joignez chaque pièce demandée (PDF ou image, 5 Mo au plus), puis envoyez.' : 'Dossier envoyé le ' + dateFR(c.envoyeeLe) + (c.ouverteLe ? ' · ouvert par l’établissement le ' + dateFR(c.ouverteLe) : ' · pas encore ouvert') + '.'}</p>
          ${decisionHTML(c)}
          ${c.message ? `<p class="message-candidat">${txt(c.message)}</p>` : ''}
          <div class="pieces-liste">
            ${fournies.map(f => `<div class="piece"><span class="ico">${f.fichier_type === 'application/pdf' ? 'PDF' : 'IMG'}</span>
              <span class="txt"><b>${txt(f.libelle)}</b><small>${txt(f.fichier_nom)} · ${poids(f.taille)}</small></span>
              <a class="pilule mini" href="/api/candidatures/${c.id}/pieces/${f.id}/fichier" target="_blank" rel="noopener">Voir</a>
              ${brouillon ? `<button class="pilule mini danger" data-retirer-piece="${f.id}">Retirer</button>` : ''}</div>`).join('')}
            ${brouillon ? manquantes.map(p => `<label class="piece manquante"><span class="ico">+</span>
              <span class="txt"><b>${txt(p)}</b><small>À joindre · PDF, JPEG, PNG ou WebP</small></span>
              <span class="pilule mini">Choisir le fichier</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" data-piece="${txt(p)}"></label>`).join('') : ''}
            ${brouillon ? `<label class="piece manquante"><span class="ico">+</span>
              <span class="txt"><b>Autre pièce</b><small>Un document supplémentaire, si besoin</small></span>
              <span class="pilule mini">Choisir le fichier</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" data-piece=""></label>` : ''}
          </div>
          ${brouillon ? `<div class="rangee-boutons espace-haut">
            <button class="pilule blanc" data-envoyer ${fournies.length ? '' : 'disabled'}>Envoyer ma candidature</button>
            <small class="sous">${manquantes.length ? manquantes.length + ' pièce(s) demandée(s) encore à joindre' : 'Toutes les pièces demandées sont là.'}</small></div>` : ''}
          ${e.frais > 0 && c.etat !== 'brouillon' ? `
            <div class="panneau espace-haut">
              <h3 class="titre-bloc">Frais ${e.mode === 'concours' ? 'du concours' : 'd’envoi du dossier'} : ${argent(e.frais, e.devise)}</h3>
              <p class="sous">${txt(e.instructionsPaiement || 'Réglez les frais selon les indications de l’établissement, puis indiquez ici la référence de votre paiement.')}</p>
              ${c.paiement === 'confirme' ? '<span class="etiquette paie-confirme">Frais reçus par l’établissement</span>'
                : c.paiement === 'declare' ? `<span class="etiquette paie-declare">Paiement déclaré · réf. ${txt(c.referencePaiement)}</span> <small class="sous">en attente de confirmation</small>`
                : `<form id="formPaiement" class="ligne-form">
                    <input class="champ" name="reference" maxlength="80" required placeholder="Référence du paiement (reçu, transaction…)">
                    <button class="pilule blanc" type="submit">J’ai payé</button></form>`}
            </div>` : ''}
        </div>`;
    };

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modale" id="modaleEtab" role="dialog" aria-modal="true">
        <div class="modale-corps large">
          <button class="close" data-fermer aria-label="Fermer">×</button>
          <p class="sur-titre">${TYPE[e.type]}${e.ville ? ' · ' + txt(e.ville) : ''}${e.pays ? ', ' + txt(e.pays) : ''}</p>
          <h2>${txt(e.nom)}</h2>
          ${e.siteWeb ? `<p class="sous"><a class="lien-fichier" href="${txt(e.siteWeb)}" target="_blank" rel="noopener">${txt(e.siteWeb)}</a></p>` : ''}
          <div class="fiche-etab">
            ${e.description ? `<p class="description">${txt(e.description)}</p>` : ''}
            <dl>
              <dt>Admission</dt><dd>${MODE[e.mode]}</dd>
              ${e.mode === 'concours' ? `<dt>Matières à composer</dt><dd>${txt(e.matieresConcours || '—')}</dd>
                <dt>Dates du concours</dt><dd>${txt(e.datesConcours || '—')}</dd>` : ''}
              <dt>Pièces à fournir</dt><dd>${piecesRequises.length ? '<ul style="margin:0 0 0 16px">' + piecesRequises.map(p => '<li>' + txt(p) + '</li>').join('') + '</ul>' : '—'}</dd>
              <dt>Frais</dt><dd>${e.frais > 0 ? argent(e.frais, e.devise) + (e.mode === 'concours' ? ' (frais du concours)' : ' (frais d’envoi du dossier)') : 'Aucun'}</dd>
              <dt>Si vous êtes accepté</dt><dd>${e.delaiOriginaux} jours pour déposer les originaux à l’établissement</dd>
              ${!e.ouvert ? '<dt>État</dt><dd>Les candidatures sont fermées pour le moment.</dd>' : ''}
            </dl>
          </div>
          ${e.ouvert || c ? dossierHTML() : ''}
        </div>
      </div>`);
    const modale = $('#modaleEtab');
    document.body.style.overflow = 'hidden';
    const fermer = async () => { modale.remove(); document.body.style.overflow = ''; await charger(); rendre(); };
    const recharger = async () => { await fermer(); ouvrir(id); };

    modale.addEventListener('click', async ev => {
      if (ev.target === modale || ev.target.closest('[data-fermer]')) return fermer();
      const rp = ev.target.closest('[data-retirer-piece]');
      if (rp) {
        try { await API.supprimer(`/candidatures/${c.id}/pieces/${rp.dataset.retirerPiece}`); message('Pièce retirée'); recharger(); }
        catch (err) { message(err.message); }
      }
      if (ev.target.closest('[data-envoyer]')) {
        if (!confirm('Envoyer la candidature ? Vous ne pourrez plus modifier les pièces ensuite.')) return;
        try { await API.post(`/candidatures/${c.id}/envoyer`); message('Candidature envoyée'); recharger(); }
        catch (err) { message(err.message); }
      }
    });
    modale.addEventListener('submit', async ev => {
      ev.preventDefault();
      const f = ev.target;
      try {
        if (f.id === 'formPostuler') {
          await API.post(`/etablissements/${e.id}/candidatures`, { message: f.message.value });
          message('Dossier ouvert : joignez vos pièces'); recharger();
        }
        if (f.id === 'formPaiement') {
          await API.post(`/candidatures/${c.id}/paiement`, { reference: f.reference.value });
          message('Paiement déclaré'); recharger();
        }
      } catch (err) { message(err.message); }
    });
    modale.addEventListener('change', async ev => {
      const input = ev.target.closest('input[type=file][data-piece]'); if (!input || !input.files[0]) return;
      const fichier = input.files[0];
      if (fichier.size > 5 * 1024 * 1024) return message('Le fichier dépasse 5 Mo.');
      const type = fichier.type || EXT[fichier.name.split('.').pop().toLowerCase()] || '';
      let libelle = input.dataset.piece;
      if (!libelle) { libelle = prompt('De quelle pièce s’agit-il ?', fichier.name.replace(/\.[^.]+$/, '')); if (!libelle) return; }
      const etiquette = input.closest('.piece').querySelector('.pilule');
      etiquette.textContent = 'Envoi…';
      try {
        const donnees = await new Promise((ok, ko) => { const l = new FileReader(); l.onload = () => ok(String(l.result).split(',')[1] || ''); l.onerror = () => ko(new Error('Lecture impossible.')); l.readAsDataURL(fichier); });
        await API.post(`/candidatures/${c.id}/pieces`, { libelle, fichier: { nom: fichier.name, type, donnees } });
        message('Pièce jointe : ' + libelle); recharger();
      } catch (err) { message(err.message); etiquette.textContent = 'Choisir le fichier'; }
    });
    document.addEventListener('keydown', function esc(ev) { if (ev.key === 'Escape') { fermer(); document.removeEventListener('keydown', esc); } });
  };

  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-etab]'); if (b) ouvrir(Number(b.dataset.etab));
  });

  try { await charger(); } catch (e) { return erreurFatale(e.message); }
  rendre();
  const ancre = location.hash.match(/^#etablissement-(\d+)$/);
  if (ancre) ouvrir(Number(ancre[1]));
})();
