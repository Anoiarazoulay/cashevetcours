/* CASHEVENT SCHOOL — espace des universités et écoles de formation.

   Deux onglets : les candidatures reçues (ouvrir, accepter, refuser) et la
   fiche d'admission (concours ou étude de dossier, pièces, frais, délai).   */
(async () => {
  const { $, $$, message, entete, pied, chargement, erreurFatale } = UI;

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
  const heureFR = d => d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const poids = o => o < 1024 * 1024 ? Math.max(1, Math.round(o / 1024)) + ' Ko' : (Math.round(o / 1024 / 1024 * 10) / 10).toLocaleString('fr-FR') + ' Mo';
  const age = iso => { if (!iso) return null; const d = new Date(iso); const n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };
  const ETAT = { envoyee: 'À traiter', acceptee: 'Acceptée', refusee: 'Refusée' };
  const PAIE = { en_attente: 'Frais non réglés', declare: 'Paiement déclaré', confirme: 'Frais reçus' };

  const ONGLETS = [['candidatures', 'Candidatures'], ['fiche', 'Ma fiche d’admission']];
  let onglet = location.hash.slice(1) || 'candidatures';
  if (!ONGLETS.some(([id]) => id === onglet)) onglet = 'candidatures';
  $('#onglets').innerHTML = ONGLETS.map(([id, l]) => `<button data-onglet="${id}" class="${id === onglet ? 'active' : ''}">${l}</button>`).join('');
  const aller = id => { onglet = id; location.hash = id; $$('#onglets button').forEach(x => x.classList.toggle('active', x.dataset.onglet === id)); rendre(); };
  $('#onglets').addEventListener('click', e => { const b = e.target.closest('[data-onglet]'); if (b) aller(b.dataset.onglet); });
  const vue = $('#vue');
  const attente = () => vue.innerHTML = '<div class="chargement"><span class="rond"></span><p>Chargement…</p></div>';

  /* ------------------------------ candidatures ------------------------------ */
  let filtre = 'envoyee';
  async function rendreCandidatures() {
    attente();
    const [{ candidatures, compte }, { etablissement }] = await Promise.all([
      API.get('/etablissement/candidatures'), API.get('/etablissement/profil')
    ]);
    if (!etablissement.pieces.length) {
      vue.innerHTML = `<div class="vide-etat"><b>Complétez d’abord votre fiche d’admission</b>
        Les élèves ne peuvent postuler qu’une fois les pièces à fournir, les frais et le délai renseignés.
        <p class="espace-haut"><button class="pilule blanc" data-onglet-vers="fiche">Remplir ma fiche</button></p></div>`;
      return;
    }
    const liste = candidatures.filter(c => filtre === 'toutes' || c.etat === filtre);
    vue.innerHTML = `
      <div class="tuiles">
        <div class="tuile"><div class="lab">À traiter</div><div class="val">${compte.envoyee}</div><div class="sous">dossiers envoyés, sans décision</div></div>
        <div class="tuile"><div class="lab">Acceptées</div><div class="val" style="color:var(--ok)">${compte.acceptee}</div><div class="sous">${etablissement.delaiOriginaux} jours pour apporter les originaux</div></div>
        <div class="tuile"><div class="lab">Refusées</div><div class="val">${compte.refusee}</div></div>
        <div class="tuile"><div class="lab">Frais déclarés à vérifier</div><div class="val">${candidatures.filter(c => c.paiement === 'declare').length}</div></div>
      </div>
      <div class="pills serres etats-eleves">
        ${[['envoyee', 'À traiter', compte.envoyee], ['acceptee', 'Acceptées', compte.acceptee], ['refusee', 'Refusées', compte.refusee], ['toutes', 'Toutes', candidatures.length]]
          .map(([v, l, n]) => `<button data-filtre="${v}" class="${filtre === v ? 'active' : ''}">${l} <span class="compte">${n}</span></button>`).join('')}
      </div>
      <div class="panneau">
        ${liste.length ? liste.map(c => `
          <div class="ligne-eleve">
            <span class="av petite">${txt((c.nom || '?')[0].toUpperCase())}</span>
            <span class="nom"><b>${txt(c.nom)}</b>
              <small>${txt(c.filiere || 'filière non précisée')}${c.lycee ? ' · ' + txt(c.lycee) : ''}${c.ville ? ' · ' + txt(c.ville) : ''} · ${c.pieces} pièce(s) · envoyée le ${dateFR(c.envoyee_le)}${c.ouverte_le ? '' : ' · <b>non ouverte</b>'}</small></span>
            ${etablissement.frais > 0 ? `<span class="etiquette paie-${c.paiement}">${PAIE[c.paiement]}</span>` : ''}
            <span class="etiquette etat-${c.etat}">${ETAT[c.etat]}</span>
            <button class="pilule mini blanc" data-ouvrir="${c.id}">Ouvrir</button>
          </div>`).join('') : '<p class="sous derniere">Aucune candidature dans cette liste.</p>'}
      </div>`;
  }

  /* « Ouvrir » : le dossier complet, les pièces lues dans la page, et la décision. */
  async function ouvrirDossier(id) {
    let d;
    try { ({ candidature: d } = await API.get('/etablissement/candidatures/' + id)); } catch (e) { return message(e.message); }
    const e = d.eleve;
    const ancienne = $('#modaleDossier'); if (ancienne) ancienne.remove();
    const lien = p => `/api/etablissement/candidatures/${d.id}/pieces/${p.id}/fichier`;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modale" id="modaleDossier" role="dialog" aria-modal="true">
        <div class="modale-corps large">
          <button class="close" data-fermer aria-label="Fermer">×</button>
          <p class="sur-titre">Candidature · envoyée le ${dateFR(d.envoyeeLe)}</p>
          <div class="candidat">
            <span class="av">${txt((e.nom || '?')[0].toUpperCase())}</span>
            <div><b>${txt(e.nom)}</b>
              <small>${txt(e.filiere || 'Filière non précisée')}${e.lycee ? ' · ' + txt(e.lycee) : ''}${e.ville ? ' · ' + txt(e.ville) : ''}${age(e.dateNaissance) !== null ? ' · ' + age(e.dateNaissance) + ' ans' : ''}<br>
                ${txt(e.email)}${e.telephone ? ' · ' + txt(e.telephone) : ''}</small></div>
          </div>
          <div class="actions-ligne gauche espace-haut">
            <span class="etiquette etat-${d.etat}">${ETAT[d.etat]}</span>
            <span class="etiquette paie-${d.paiement}">${PAIE[d.paiement]}${d.referencePaiement ? ' · réf. ' + txt(d.referencePaiement) : ''}</span>
            ${d.paiement !== 'confirme' ? '<button class="pilule mini" data-confirmer-paiement>Confirmer la réception des frais</button>' : ''}
          </div>
          ${d.message ? `<h3 class="titre-bloc espace-haut">Message du candidat</h3><p class="message-candidat">${txt(d.message)}</p>` : ''}

          <h3 class="titre-bloc espace-haut">Pièces du dossier · ${d.pieces.length}</h3>
          <div class="lecteur-pieces">${d.pieces.map(p => `
            <div class="lecteur-piece">
              <div class="titre"><b>${txt(p.libelle)}</b><small>${txt(p.fichier_nom)} · ${poids(p.taille)}</small>
                <a class="pilule mini" href="${lien(p)}" target="_blank" rel="noopener">Plein écran</a></div>
              ${p.fichier_type === 'application/pdf'
                ? `<iframe src="${lien(p)}#toolbar=0" title="${txt(p.libelle)}"></iframe>`
                : `<img src="${lien(p)}" alt="${txt(p.libelle)}" loading="lazy">`}
            </div>`).join('') || '<p class="sous">Aucune pièce.</p>'}</div>

          ${d.etat === 'envoyee' ? `
            <div class="decision-boutons">
              <button class="pilule accepter" data-decision="acceptee">Accepter la candidature</button>
              <button class="pilule refuser" data-decision="refusee">Refuser</button>
              <small class="sous">Accepter prévient l’élève et lui laisse ${(await API.get('/etablissement/profil')).etablissement.delaiOriginaux} jours pour apporter les originaux.</small>
            </div>` : `<div class="decision ${d.etat}"><b>${ETAT[d.etat]} le ${dateFR(d.decideeLe)}</b>${
              d.etat === 'acceptee' ? 'L’élève a ' + d.delaiOriginaux + ' jours pour déposer les originaux de ses documents.' : 'L’élève a été informé.'}</div>`}
        </div>
      </div>`);
    const modale = $('#modaleDossier');
    document.body.style.overflow = 'hidden';
    const fermer = () => { modale.remove(); document.body.style.overflow = ''; rendreCandidatures(); };
    modale.addEventListener('click', async ev => {
      if (ev.target === modale || ev.target.closest('[data-fermer]')) return fermer();
      const dec = ev.target.closest('[data-decision]');
      if (dec) {
        const etat = dec.dataset.decision;
        if (!confirm(etat === 'acceptee' ? `Accepter la candidature de ${e.nom} ?` : `Refuser la candidature de ${e.nom} ?`)) return;
        try {
          const r = await API.post(`/etablissement/candidatures/${d.id}/decision`, { etat });
          message(etat === 'acceptee' ? `Acceptée : ${e.nom} a ${r.delaiOriginaux} jours pour les originaux` : 'Candidature refusée');
          fermer();
        } catch (err) { message(err.message); }
      }
      if (ev.target.closest('[data-confirmer-paiement]')) {
        try { await API.post(`/etablissement/candidatures/${d.id}/paiement`, { confirme: true }); message('Frais confirmés'); modale.remove(); document.body.style.overflow = ''; ouvrirDossier(id); }
        catch (err) { message(err.message); }
      }
    });
    document.addEventListener('keydown', function esc(ev) { if (ev.key === 'Escape') { fermer(); document.removeEventListener('keydown', esc); } });
  }

  /* ------------------------------ la fiche ------------------------------ */
  async function rendreFiche() {
    attente();
    const { etablissement: e } = await API.get('/etablissement/profil');
    const opt = (v, l, a) => `<option value="${v}" ${a === v ? 'selected' : ''}>${l}</option>`;
    vue.innerHTML = `
      <div class="panneau">
        <h2>Ma fiche d’admission</h2>
        <p class="sous">C’est ce que les élèves lisent avant de postuler. Choisissez le mode d’admission, listez les pièces, indiquez les frais et le délai pour les originaux.</p>
        <form id="formFiche" class="formulaire-etab">
          <label class="champ-libelle">Nom de l’établissement<input class="champ" name="nom" maxlength="120" required value="${txt(e.nom)}"></label>
          <label class="champ-libelle">Type<select class="champ" name="type">${opt('ecole', 'École de formation', e.type)}${opt('universite', 'Université', e.type)}</select></label>
          <label class="champ-libelle">Ville<input class="champ" name="ville" maxlength="120" value="${txt(e.ville || '')}"></label>
          <label class="champ-libelle">Pays<input class="champ" name="pays" maxlength="80" value="${txt(e.pays || 'Maroc')}"></label>
          <label class="champ-libelle pleine">Site web <small>— facultatif</small><input class="champ" name="siteWeb" maxlength="200" value="${txt(e.siteWeb || '')}" placeholder="https://…"></label>
          <label class="champ-libelle pleine">Présentation <small>— ce que les élèves voient en premier</small>
            <textarea class="champ" name="description" rows="4" maxlength="3000">${txt(e.description || '')}</textarea></label>

          <div class="bloc-mode">
            <label class="${e.mode === 'concours' ? 'actif' : ''}"><input type="radio" name="mode" value="concours" ${e.mode === 'concours' ? 'checked' : ''}> Admission sur concours</label>
            <label class="${e.mode === 'dossier' ? 'actif' : ''}"><input type="radio" name="mode" value="dossier" ${e.mode === 'dossier' ? 'checked' : ''}> Admission sur étude de dossier</label>
          </div>
          <div class="sous-form" id="blocConcours" ${e.mode === 'concours' ? '' : 'hidden'}>
            <label class="champ-libelle">Matières à composer<input class="champ" name="matieresConcours" maxlength="400" value="${txt(e.matieresConcours || '')}" placeholder="Mathématiques, physique, français…"></label>
            <label class="champ-libelle">Dates du concours<input class="champ" name="datesConcours" maxlength="200" value="${txt(e.datesConcours || '')}" placeholder="Ex. 12 et 13 juillet 2027"></label>
          </div>

          <label class="champ-libelle pleine">Pièces à fournir <small>— une par ligne (${e.mode === 'concours' ? 'pour le concours' : 'pour l’étude du dossier'})</small>
            <textarea class="champ" name="pieces" rows="5" required placeholder="Relevé de notes de terminale&#10;Copie de la carte d’identité&#10;Lettre de motivation">${txt(e.pieces.join('\n'))}</textarea></label>
          <label class="champ-libelle">Frais <small>— ${e.mode === 'concours' ? 'du concours' : 'd’envoi du dossier'}, 0 si gratuit</small><input class="champ" name="frais" type="number" min="0" step="1" value="${e.frais}"></label>
          <label class="champ-libelle">Devise<input class="champ" name="devise" maxlength="8" value="${txt(e.devise)}"></label>
          <label class="champ-libelle pleine">Comment payer les frais <small>— ce que l’élève lit avant de déclarer son paiement</small>
            <textarea class="champ" name="instructionsPaiement" rows="2" maxlength="600" placeholder="Ex. virement au compte …, ou mobile money au …, en indiquant votre nom.">${txt(e.instructionsPaiement || '')}</textarea></label>
          <label class="champ-libelle">Délai pour déposer les originaux <small>— en jours, après acceptation</small><input class="champ" name="delaiOriginaux" type="number" min="1" max="365" value="${e.delaiOriginaux}"></label>
          <label class="champ-libelle"><span style="display:block;margin-bottom:8px">Candidatures</span>
            <select class="champ" name="ouvert">${opt('1', 'Ouvertes', e.ouvert ? '1' : '0')}${opt('0', 'Fermées pour le moment', e.ouvert ? '1' : '0')}</select></label>
          <div class="pleine"><button class="pilule blanc" type="submit">Enregistrer ma fiche</button></div>
        </form>
      </div>`;
  }

  /* ------------------------------ évènements ------------------------------ */
  vue.addEventListener('click', e => {
    const v = e.target.closest('[data-onglet-vers]'); if (v) return aller(v.dataset.ongletVers);
    const f = e.target.closest('[data-filtre]'); if (f) { filtre = f.dataset.filtre; return rendreCandidatures(); }
    const o = e.target.closest('[data-ouvrir]'); if (o) return ouvrirDossier(Number(o.dataset.ouvrir));
  });
  vue.addEventListener('change', e => {
    if (e.target.name === 'mode') {
      $('#blocConcours').hidden = e.target.value !== 'concours';
      $$('.bloc-mode label').forEach(l => l.classList.toggle('actif', l.querySelector('input').checked));
    }
  });
  vue.addEventListener('submit', async e => {
    e.preventDefault();
    if (e.target.id !== 'formFiche') return;
    const f = e.target;
    try {
      await API.put('/etablissement/profil', {
        nom: f.nom.value, type: f.type.value, ville: f.ville.value, pays: f.pays.value, siteWeb: f.siteWeb.value,
        description: f.description.value, mode: f.querySelector('input[name=mode]:checked').value,
        matieresConcours: f.matieresConcours.value, datesConcours: f.datesConcours.value,
        pieces: f.pieces.value.split('\n'), frais: Number(f.frais.value), devise: f.devise.value,
        instructionsPaiement: f.instructionsPaiement.value, delaiOriginaux: Number(f.delaiOriginaux.value),
        ouvert: f.ouvert.value === '1'
      });
      message('Fiche enregistrée'); rendreFiche();
    } catch (err) { message(err.message); }
  });

  async function rendre() {
    try { if (onglet === 'fiche') await rendreFiche(); else await rendreCandidatures(); }
    catch (e) { vue.innerHTML = `<div class="vide-etat"><b>Chargement impossible</b>${txt(e.message)}</div>`; }
  }
  rendre();
})();
