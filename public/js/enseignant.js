/* CASHEVENT SCHOOL — espace enseignant référent

   L'élève apprend, l'assistant analyse, l'enseignant supervise. Cette page dit
   à l'enseignant qui regarder, puis lui fait enregistrer le suivi du mois :
   c'est ce suivi, et lui seul, qui déclenche sa rémunération.               */
(async () => {
  const { $, $$, message, entete, pied, chargement, erreurFatale } = UI;

  chargement(true);
  let moi;
  try { moi = await API.get('/auth/moi').then(r => r.utilisateur); }
  catch (e) { chargement(false); return erreurFatale(e.message); }
  entete(moi, 'enseignant', {});
  pied();
  chargement(false);

  /* --------------------------------- outils ------------------------------- */
  const echapper = t => String(t == null ? '' : t)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dateFR = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '—';
  const moisFR = m => new Date(m + '-01T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const moisActuel = () => moisFR(new Date().toISOString().slice(0, 7));
  const fcfa = n => Number(n).toLocaleString('fr-FR') + ' FCFA';
  const eur = n => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const couleur = p => p >= 70 ? 'var(--ok)' : p >= 40 ? 'var(--warn)' : 'var(--brand)';
  const pastille = teinte => `<span class="pastille-mat" style="background:${echapper(teinte)}"></span>`;

  const STATUTS = {
    bonne_voie: ['En bonne voie', 'Rien à signaler, il avance'],
    encourager: ['À encourager', 'Il avance, mais doit garder le rythme'],
    aide: ['A besoin d’aide', 'Il décroche : dites-lui quoi reprendre']
  };

  const activite = x => x.joursInactif === null ? 'Pas encore commencé'
    : x.joursInactif === 0 ? 'Aujourd’hui'
    : x.joursInactif === 1 ? 'Hier' : 'Il y a ' + x.joursInactif + ' jours';

  /* --------------------------------- onglets ------------------------------ */
  const ONGLETS = [['bord', 'Tableau de bord'], ['eleves', 'Mes élèves'],
                   ['tp', 'TP à faire'], ['profil', 'Mon code']];
  let onglet = location.hash.slice(1) || 'bord';
  if (!ONGLETS.some(([id]) => id === onglet)) onglet = 'bord';

  $('#onglets').innerHTML = ONGLETS.map(([id, l]) =>
    `<button data-onglet="${id}" class="${id === onglet ? 'active' : ''}">${l}</button>`).join('');
  const aller = id => {
    onglet = id; location.hash = id;
    $$('#onglets button').forEach(x => x.classList.toggle('active', x.dataset.onglet === id));
    rendre();
  };
  $('#onglets').addEventListener('click', e => {
    const b = e.target.closest('[data-onglet]'); if (b) aller(b.dataset.onglet);
  });

  const vue = $('#vue');
  /* Un écouteur par type d'évènement : chaque vue remplace ses gestionnaires. */
  let gestionnaire = null, soumission = null, changement = null;
  vue.addEventListener('click', e => { if (gestionnaire) gestionnaire(e); });
  vue.addEventListener('submit', e => { if (soumission) soumission(e); });
  vue.addEventListener('change', e => { if (changement) changement(e); });
  const attente = () => vue.innerHTML =
    '<div class="chargement"><span class="rond"></span><p>Chargement…</p></div>';

  const bandeau = t => `
    <div class="bandeau-remu">
      <b>Rémunération de suivi pédagogique</b>
      <span>${fcfa(t.fcfa)} ≈ ${eur(t.eur)} par élève suivi, par matière, chaque mois où le suivi est fait.</span>
    </div>`;

  const copier = async e => {
    const b = e.target.closest('[data-copier]'); if (!b) return false;
    try { await navigator.clipboard.writeText(b.dataset.copier); message('Code copié : ' + b.dataset.copier); }
    catch (err) { message('Votre code : ' + b.dataset.copier); }
    return true;
  };

  const ouvrirSiDossier = e => {
    const b = e.target.closest('[data-dossier]'); if (!b) return false;
    const [eleve, matiere] = b.dataset.dossier.split(':').map(Number);
    ouvrirDossier(eleve, matiere);
    return true;
  };

  /* Une ligne d'élève, la même au tableau de bord et dans la liste. */
  const ligneEleve = r => `
    <div class="ligne-eleve">
      <span class="av petite">${echapper((r.eleve.nom || '?')[0].toUpperCase())}</span>
      <span class="nom"><b>${echapper(r.eleve.nom)}</b>
        <small>${pastille(r.matiere.teinte)}${echapper(r.matiere.nom)}${
          r.raisons.length ? ' · ' + r.raisons.map(echapper).join(' · ') : ''}</small></span>
      <span class="jauge" title="${r.termines} chapitre(s) terminé(s) sur ${r.total}">
        <i style="width:${r.avancement}%;background:${couleur(r.avancement)}"></i></span>
      <span class="chiffre">${r.avancement} %</span>
      <span class="chiffre${r.moyenne !== null && r.moyenne < 60 ? ' faible' : ''}"
        title="Moyenne aux QCM">${r.moyenne === null ? '—' : r.moyenne + ' %'}</span>
      ${r.suivi
        ? `<span class="statut-suivi fait" title="${STATUTS[r.suivi.statut][0]}">Suivi fait</span>`
        : '<span class="statut-suivi">Suivi à faire</span>'}
      <button class="pilule mini" data-dossier="${r.eleve.id}:${r.matiere.id}">Dossier</button>
    </div>`;

  /* ----------------------------- tableau de bord -------------------------- */
  async function rendreBord() {
    attente();
    const d = await API.get('/enseignant/tableau-bord');
    const r = d.remuneration;

    if (!d.totaux.suivis) {
      const noms = d.profil.matieres.map(m => m.nom).join(', ') || 'vos matières';
      vue.innerHTML = bandeau(r.tarif) + `
        <div class="panneau">
          <h2>Aucun élève ne vous a encore désigné</h2>
          <p class="sous">Donnez ce code à vos élèves. Ils le saisissent à l’inscription, ou plus tard
            dans « Ma progression », pour vous choisir comme professeur de ${echapper(noms)}.</p>
          <div class="code-prof"><span>${echapper(d.profil.code)}</span>
            <button class="pilule blanc" data-copier="${echapper(d.profil.code)}">Copier le code</button></div>
          <ol class="etapes-prof">
            <li>Vos élèves créent leur compte Cashevent School.</li>
            <li>Ils vous désignent avec ce code, matière par matière.</li>
            <li>Chaque mois, vous ouvrez leur dossier et enregistrez votre suivi :
              ${fcfa(r.tarif.fcfa)} par élève et par matière.</li>
          </ol>
        </div>`;
      gestionnaire = copier;
      return;
    }

    vue.innerHTML = bandeau(r.tarif) + `
      <div class="tuiles">
        <div class="tuile"><div class="lab">Élèves suivis</div><div class="val">${d.totaux.eleves}</div>
          <div class="sous">${d.totaux.suivis} suivi(s), matière par matière</div></div>
        <div class="tuile"><div class="lab">Suivis faits — ${moisFR(d.mois)}</div>
          <div class="val">${r.suivisFaits}<small> / ${r.elevesSuivis}</small></div>
          <div class="sous">${r.suivisRestants
            ? r.suivisRestants + ' encore à faire ce mois-ci' : 'Tous les suivis du mois sont faits'}</div></div>
        <div class="tuile principale-remu"><div class="lab">Rémunération validée</div>
          <div class="val">${fcfa(r.du.fcfa)}</div>
          <div class="sous">≈ ${eur(r.du.eur)} · jusqu’à ${fcfa(r.potentiel.fcfa)} si tous les suivis sont faits</div></div>
        <div class="tuile"><div class="lab">À regarder en priorité</div><div class="val">${d.priorites.length}</div>
          <div class="sous">élève(s) signalé(s), suivi pas encore fait</div></div>
      </div>

      <div class="colonnes-admin">
        <div>
          <div class="panneau">
            <h2>À suivre en priorité</h2>
            <p class="sous">L’analyse des QCM et de l’activité signale ces élèves. Ouvrez leur dossier,
              puis enregistrez votre suivi.</p>
            ${d.priorites.length ? d.priorites.map(ligneEleve).join('')
              : '<p class="sous derniere">Aucun élève en difficulté sans suivi ce mois-ci.</p>'}
          </div>

          <div class="panneau espace-haut">
            <h2>Notions difficiles</h2>
            <p class="sous">Les chapitres ratés par le plus d’élèves, et les notions qu’ils recouvrent.</p>
            ${d.notionsDifficiles.length ? d.notionsDifficiles.map(n => `
              <div class="notion-difficile">
                <div class="tete">${pastille(n.matiere.teinte)}<b>${echapper(n.chapitre)}</b>
                  <small>${echapper(n.matiere.nom)} · ${n.eleves} élève(s) sous 60 %</small></div>
                ${n.notions.length
                  ? `<div class="tags">${n.notions.map(t => `<span>${echapper(t)}</span>`).join('')}</div>` : ''}
              </div>`).join('')
              : '<p class="sous derniere">Aucun chapitre ne pose de difficulté particulière pour l’instant.</p>'}
          </div>
        </div>

        <div>
          <div class="panneau">
            <h2>Par matière</h2>
            <p class="sous">Uniquement vos élèves, et uniquement dans votre matière.</p>
            ${d.parMatiere.map(m => `
              <div class="ligne-matiere-prof">
                <div class="tete">${pastille(m.teinte)}<b>${echapper(m.nom)}</b>
                  <small>${m.eleves} élève(s) · ${m.suivisFaits}/${m.eleves} suivi(s) faits</small></div>
                <span class="jauge large"><i style="width:${m.avancement}%;background:${couleur(m.avancement)}"></i></span>
                <dl class="mini-stats">
                  <div><dt>Progression</dt><dd>${m.avancement} %</dd></div>
                  <div><dt>Moyenne QCM</dt><dd>${m.moyenne === null ? '—' : m.moyenne + ' %'}</dd></div>
                  <div><dt>Chapitres terminés</dt><dd>${m.chapitresTermines}</dd></div>
                  <div><dt>QCM passés</dt><dd>${m.qcmFaits}</dd></div>
                </dl>
              </div>`).join('')}
          </div>

          <div class="panneau espace-haut">
            <h2>Mes rémunérations</h2>
            <p class="sous">Un suivi compte quand vous avez ouvert le dossier de l’élève dans le mois,
              puis enregistré votre avis. Cashevent vérifie ces deux dates avant de payer.</p>
            ${r.historique.length ? r.historique.map(h => `
              <div class="ligne-remu"><span>${moisFR(h.mois)}</span>
                <span>${h.unites} suivi(s)</span><b>${fcfa(h.fcfa)}</b><small>≈ ${eur(h.eur)}</small></div>`).join('')
              : '<p class="sous derniere">Aucun suivi enregistré pour l’instant.</p>'}
          </div>
        </div>
      </div>`;

    gestionnaire = ouvrirSiDossier;
  }

  /* --------------------------------- élèves ------------------------------- */
  const filtre = { matiere: 'toutes', etat: 'tous' };
  let listeEleves = null;

  async function rendreEleves(recharger = true) {
    if (recharger || !listeEleves) { attente(); listeEleves = await API.get('/enseignant/eleves'); }
    const d = listeEleves;

    if (!d.eleves.length) {
      vue.innerHTML = `<div class="vide-etat"><b>Aucun élève ne vous a encore désigné</b>
        Votre code est dans l’onglet « Mon code » : donnez-le à vos élèves.</div>`;
      gestionnaire = null;
      return;
    }

    const matieres = [...new Map(d.eleves.map(r => [r.matiere.id, r.matiere])).values()];
    const liste = d.eleves.filter(r =>
      (filtre.matiere === 'toutes' || r.matiere.id === Number(filtre.matiere)) &&
      (filtre.etat === 'tous' || (filtre.etat === 'afaire' && !r.suivi) ||
       (filtre.etat === 'signales' && r.besoinAide)));
    const faits = d.eleves.filter(r => r.suivi).length;

    vue.innerHTML = `
      <div class="barre-outils">
        <div class="pills serres">
          <button data-fm="toutes" class="${filtre.matiere === 'toutes' ? 'active' : ''}">Toutes les matières</button>
          ${matieres.map(m => `<button data-fm="${m.id}"
            class="${String(filtre.matiere) === String(m.id) ? 'active' : ''}">${echapper(m.nom)}</button>`).join('')}
        </div>
        <div class="pills serres">
          ${[['tous', 'Tous'], ['afaire', 'Suivi à faire'], ['signales', 'Signalés']].map(([v, l]) =>
            `<button data-fe="${v}" class="${filtre.etat === v ? 'active' : ''}">${l}</button>`).join('')}
        </div>
      </div>
      <p class="sous">${faits} suivi(s) fait(s) sur ${d.eleves.length} en ${moisFR(d.mois)}.</p>
      <div class="panneau">
        ${liste.length ? liste.map(ligneEleve).join('')
          : '<p class="sous derniere">Aucun élève ne correspond à ce filtre.</p>'}
      </div>`;

    gestionnaire = e => {
      const fm = e.target.closest('[data-fm]');
      if (fm) { filtre.matiere = fm.dataset.fm; return rendreEleves(false); }
      const fe = e.target.closest('[data-fe]');
      if (fe) { filtre.etat = fe.dataset.fe; return rendreEleves(false); }
      ouvrirSiDossier(e);
    };
  }

  /* -------------------------- dossier d'un élève -------------------------- */
  async function ouvrirDossier(eleveId, matiereId) {
    let d;
    try { d = await API.get(`/enseignant/eleves/${eleveId}/matieres/${matiereId}`); }
    catch (e) { return message(e.message); }
    const x = d.dossier, s = d.suivi;

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modale" id="modaleDossier" role="dialog" aria-modal="true">
        <div class="modale-corps">
          <button class="close" data-fermer aria-label="Fermer">×</button>
          <p class="sur-titre">${pastille(d.matiere.teinte)} ${echapper(d.matiere.nom)} ·
            vous suit depuis le ${dateFR(d.depuis)}</p>
          <h2>${echapper(d.eleve.nom)}</h2>
          ${d.eleve.filiere ? `<p class="sous">${echapper(d.eleve.filiere)}</p>` : ''}

          ${x.besoinAide ? `<div class="alerte-prof"><b>Pourquoi le regarder</b>
            <ul>${x.raisons.map(t => `<li>${echapper(t)}</li>`).join('')}</ul></div>` : ''}

          <div class="tuiles">
            <div class="tuile"><div class="lab">Progression</div><div class="val">${x.avancement} %</div>
              <div class="sous">dans la matière</div></div>
            <div class="tuile"><div class="lab">Chapitres terminés</div>
              <div class="val">${x.termines}<small> / ${x.total}</small></div></div>
            <div class="tuile"><div class="lab">Moyenne aux QCM</div>
              <div class="val">${x.moyenne === null ? '—' : x.moyenne + ' %'}</div>
              <div class="sous">${x.qcmFaits} QCM passé(s)</div></div>
            <div class="tuile"><div class="lab">Dernière activité</div>
              <div class="val petit">${activite(x)}</div></div>
          </div>

          <h3 class="titre-bloc espace-haut">Chapitres</h3>
          <div class="tableau-defile"><table class="tableau">
            <thead><tr><th>Chapitre</th><th>Progression</th><th>État</th><th>QCM</th></tr></thead>
            <tbody>${x.chapitres.map(c => `<tr>
              <td><b>${c.numero}. ${echapper(c.titre)}</b></td>
              <td><span class="jauge"><i style="width:${c.avancement}%;background:${couleur(c.avancement)}"></i></span>
                ${c.avancement} %</td>
              <td>${c.termine ? '<span class="etiquette ok">Terminé</span>'
                : c.avancement ? '<span class="etiquette encours">En cours</span>'
                : '<span class="etiquette muet">Pas commencé</span>'}</td>
              <td class="${c.aRevoir ? 'score-faible' : ''}">${c.score === null ? '—' : c.score + ' %'}</td>
            </tr>`).join('')}</tbody>
          </table></div>

          ${x.notionsDifficiles.length ? `
            <h3 class="titre-bloc espace-haut">Notions à retravailler</h3>
            <div class="tags-prof">${x.notionsDifficiles.map(n =>
              `<span title="${echapper(n.chapitre)}">${echapper(n.libelle)}</span>`).join('')}</div>` : ''}

          <div class="panneau espace-haut">
            <h2>Suivi de ${moisActuel()}</h2>
            <p class="sous">${s
              ? `Enregistré le ${dateFR(s.maj_le || s.cree_le)}. Vous pouvez le modifier jusqu’à la fin du mois.`
              : 'Votre avis du mois. C’est ce suivi qui compte pour votre rémunération.'}</p>
            <form id="formSuivi">
              <div class="choix-statut">
                ${Object.entries(STATUTS).map(([v, [titre, aide]]) => `
                  <label class="${s && s.statut === v ? 'actif' : ''}">
                    <input type="radio" name="statut" value="${v}" ${s && s.statut === v ? 'checked' : ''}>
                    <b>${titre}</b><small>${aide}</small></label>`).join('')}
              </div>
              <label class="champ-libelle">Message à l’élève
                <small>— obligatoire s’il faut l’encourager ou l’aider</small>
                <textarea class="champ" name="commentaire" rows="3" maxlength="600"
                  placeholder="Ex. Reprends le chapitre sur les suites, puis refais le QCM.">${
                  echapper((s && s.commentaire) || '')}</textarea></label>
              <button class="pilule blanc espace-haut" type="submit">${
                s ? 'Mettre à jour le suivi' : 'Enregistrer le suivi'}</button>
            </form>
          </div>

          ${d.historique.length ? `
            <h3 class="titre-bloc espace-haut">Suivis enregistrés</h3>
            ${d.historique.map(h => `<div class="ligne-remu">
              <span>${moisFR(h.mois)}</span><span>${STATUTS[h.statut][0]}</span>
              <small>${echapper(h.commentaire || '')}</small></div>`).join('')}` : ''}
        </div>
      </div>`);

    const modale = $('#modaleDossier');
    document.body.style.overflow = 'hidden';
    const fermer = () => { modale.remove(); document.body.style.overflow = ''; rendre(); };

    modale.addEventListener('click', e => {
      if (e.target === modale || e.target.closest('[data-fermer]')) fermer();
    });
    modale.addEventListener('change', e => {
      if (e.target.name !== 'statut') return;
      $$('.choix-statut label', modale).forEach(l => l.classList.toggle('actif', l.querySelector('input').checked));
    });
    modale.addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target;
      const statut = (f.querySelector('input[name=statut]:checked') || {}).value;
      if (!statut) return message('Choisissez où en est l’élève.');
      const bouton = f.querySelector('[type=submit]');
      bouton.disabled = true;
      try {
        await API.post(`/enseignant/eleves/${eleveId}/matieres/${matiereId}/suivi`,
          { statut, commentaire: f.commentaire.value });
        message('Suivi enregistré pour ' + d.eleve.nom);
        fermer();
      } catch (err) { message(err.message); bouton.disabled = false; }
    });
  }

  /* ----------------------------------- TP --------------------------------- */
  const TYPES_EXT = {
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    odt: 'application/vnd.oasis.opendocument.text', txt: 'text/plain',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg'
  };
  const lireBase64 = fichier => new Promise((ok, ko) => {
    const lecteur = new FileReader();
    lecteur.onload = () => ok(String(lecteur.result).split(',')[1] || '');
    lecteur.onerror = () => ko(new Error('Lecture du fichier impossible.'));
    lecteur.readAsDataURL(fichier);
  });
  const poids = o => o < 1024 * 1024 ? Math.max(1, Math.round(o / 1024)) + ' Ko'
    : (Math.round(o / 1024 / 1024 * 10) / 10).toLocaleString('fr-FR') + ' Mo';

  async function rendreTP() {
    attente();
    const [{ envois }, profil, { eleves }] = await Promise.all([
      API.get('/enseignant/tp'), API.get('/enseignant/profil'), API.get('/enseignant/eleves')
    ]);

    if (!profil.matieres.length) {
      vue.innerHTML = `<div class="vide-etat"><b>Aucune matière déclarée</b>
        Indiquez les matières que vous enseignez dans l’onglet « Mon code ».</div>`;
      gestionnaire = null; soumission = null; changement = null;
      return;
    }

    const destinataires = matiereId => {
      const siens = eleves.filter(r => r.matiere.id === Number(matiereId));
      return siens.length ? siens.map(r => `
        <label><input type="checkbox" name="eleve" value="${r.eleve.id}" checked>${echapper(r.eleve.nom)}</label>`).join('')
        : '<p class="sous derniere">Aucun élève ne vous a encore désigné dans cette matière.</p>';
    };

    vue.innerHTML = `
      <div class="colonnes-admin">
        <div>
          <div class="panneau">
            <h2>Envoyer un TP</h2>
            <p class="sous">Le fichier arrive dans l’espace de vos élèves. Vous voyez ensuite qui l’a récupéré.</p>
            <form id="formTP">
              <label class="champ-libelle">Matière
                <select class="champ" name="matiereId">${profil.matieres.map(m =>
                  `<option value="${m.id}">${echapper(m.nom)}</option>`).join('')}</select></label>
              <label class="champ-libelle">Titre
                <input class="champ" name="titre" maxlength="160" required placeholder="TP 3 — Suites numériques"></label>
              <label class="champ-libelle">Consigne <small>— facultatif</small>
                <textarea class="champ" name="consigne" rows="3" maxlength="2000"></textarea></label>
              <label class="champ-libelle">À rendre pour le <small>— facultatif</small>
                <input class="champ" type="date" name="echeance"></label>
              <label class="champ-libelle">Fichier <small>— PDF, Word, OpenDocument, texte ou image · 5 Mo au plus</small>
                <input class="champ fichier" type="file" name="fichier" required
                  accept=".pdf,.doc,.docx,.odt,.txt,.png,.jpg,.jpeg"></label>
              <fieldset class="destinataires"><legend>Élèves</legend>
                <div id="listeDest">${destinataires(profil.matieres[0].id)}</div></fieldset>
              <button class="pilule blanc espace-haut" type="submit">Envoyer le TP</button>
            </form>
          </div>
        </div>

        <div>
          <div class="panneau">
            <h2>TP envoyés</h2>
            ${envois.length ? envois.map(t => `
              <div class="ligne-tp">
                <div class="tete">${pastille(t.teinte)}<b>${echapper(t.titre)}</b>
                  <small>${echapper(t.matiere)} · envoyé le ${dateFR(t.cree_le)}${
                    t.echeance ? ' · à rendre le ' + dateFR(t.echeance) : ''}</small></div>
                <div class="pied-tp">
                  <a class="lien-fichier" href="/api/enseignant/tp/${t.id}/fichier">${echapper(t.fichier_nom)}</a>
                  <small>${poids(t.taille)}</small>
                  <span class="chiffre">${t.telecharges}/${t.destinataires} téléchargé(s)</span>
                  <button class="pilule mini danger" data-supprimer-tp="${t.id}">Supprimer</button>
                </div>
              </div>`).join('')
              : '<p class="sous derniere">Aucun TP envoyé pour l’instant.</p>'}
          </div>
        </div>
      </div>`;

    changement = e => {
      if (e.target.name === 'matiereId') $('#listeDest').innerHTML = destinataires(e.target.value);
    };

    gestionnaire = async e => {
      const b = e.target.closest('[data-supprimer-tp]'); if (!b) return;
      if (!confirm('Supprimer ce TP ? Vos élèves ne pourront plus le télécharger.')) return;
      try { await API.supprimer('/enseignant/tp/' + b.dataset.supprimerTp); message('TP supprimé'); rendreTP(); }
      catch (err) { message(err.message); }
    };

    soumission = async e => {
      e.preventDefault();
      const f = e.target;
      const fichier = f.fichier.files[0];
      if (!fichier) return message('Choisissez un fichier.');
      if (fichier.size > 5 * 1024 * 1024) return message('Le fichier dépasse 5 Mo.');
      const type = fichier.type || TYPES_EXT[fichier.name.split('.').pop().toLowerCase()] || '';
      const choisis = $$('input[name=eleve]:checked', f).map(c => Number(c.value));
      if (!choisis.length) return message('Choisissez au moins un élève.');

      const bouton = f.querySelector('[type=submit]');
      bouton.disabled = true; bouton.textContent = 'Envoi en cours…';
      try {
        const r = await API.post('/enseignant/tp', {
          matiereId: Number(f.matiereId.value), titre: f.titre.value, consigne: f.consigne.value,
          echeance: f.echeance.value, eleves: choisis,
          fichier: { nom: fichier.name, type, donnees: await lireBase64(fichier) }
        });
        message(`TP envoyé à ${r.envoi.destinataires} élève(s)`);
        rendreTP();
      } catch (err) {
        message(err.message);
        bouton.disabled = false; bouton.textContent = 'Envoyer le TP';
      }
    };
  }

  /* -------------------------------- mon code ------------------------------ */
  async function rendreProfil() {
    attente();
    const p = await API.get('/enseignant/profil');

    vue.innerHTML = bandeau(p.tarif) + `
      <div class="colonnes-admin">
        <div>
          <div class="panneau">
            <h2>Votre code enseignant</h2>
            <p class="sous">Donnez-le à vos élèves. Ils le saisissent à l’inscription — ou plus tard dans
              « Ma progression » — pour vous désigner comme professeur, matière par matière.</p>
            <div class="code-prof"><span>${echapper(p.code)}</span>
              <button class="pilule blanc" data-copier="${echapper(p.code)}">Copier</button></div>
            <p class="sous derniere espace-haut">Vous ne voyez que les élèves qui vous ont désigné, et
              seulement dans la matière choisie : ni leurs autres matières, ni leurs coordonnées,
              ni celles de leurs parents.</p>
          </div>
        </div>
        <div>
          <div class="panneau">
            <h2>Les matières que vous enseignez</h2>
            <p class="sous">Vos élèves ne peuvent vous désigner que dans ces matières.</p>
            <form id="formMatieres">
              <div class="choix-matieres">${p.toutes.map(m => {
                const sienne = p.matieres.some(x => x.id === m.id);
                return `<label class="${sienne ? 'actif' : ''}">
                  <input type="checkbox" name="m" value="${m.id}" ${sienne ? 'checked' : ''}>
                  ${pastille(m.teinte)}${echapper(m.nom)}</label>`;
              }).join('')}</div>
              <button class="pilule blanc espace-haut" type="submit">Enregistrer</button>
            </form>
          </div>
        </div>
      </div>`;

    gestionnaire = copier;
    changement = e => {
      const l = e.target.closest('.choix-matieres label');
      if (l) l.classList.toggle('actif', e.target.checked);
    };
    soumission = async e => {
      e.preventDefault();
      const ids = $$('input[name=m]:checked', e.target).map(c => Number(c.value));
      try {
        await API.put('/enseignant/profil/matieres', { matieres: ids });
        message('Matières enregistrées'); rendreProfil();
      } catch (err) { message(err.message); }
    };
  }

  /* --------------------------------- routage ------------------------------ */
  async function rendre() {
    gestionnaire = null; soumission = null; changement = null;
    try {
      if (onglet === 'bord') return await rendreBord();
      if (onglet === 'eleves') return await rendreEleves();
      if (onglet === 'tp') return await rendreTP();
      if (onglet === 'profil') return await rendreProfil();
    } catch (e) {
      vue.innerHTML = `<div class="vide-etat"><b>Chargement impossible</b>${echapper(e.message)}</div>`;
    }
  }
  rendre();
})();
