/* CASHEVENT SCHOOL — espace enseignant : classes, contenu, relecture des exercices */
(async () => {
  const { $, $$, message, entete, pied, chargement, erreurFatale } = UI;

  chargement(true);
  let moi;
  try { moi = await API.get('/auth/moi').then(r => r.utilisateur); }
  catch (e) { chargement(false); return erreurFatale(e.message); }
  entete(moi, 'enseignant', {});
  pied();
  chargement(false);

  const echapper = t => String(t == null ? '' : t)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dateFR = d => d ? new Date(d).toLocaleDateString('fr-FR',
    { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const NIVEAUX = { application: 'Application', entrainement: 'Entraînement', bac: 'Type bac' };

  /* --------------------------------- onglets ------------------------------ */
  const ONGLETS = [['classes', 'Mes classes'], ['contenu', 'Contenu'],
                   ['exercices', 'Exercices à relire']];
  let onglet = location.hash.slice(1) || 'classes';
  if (!ONGLETS.some(([id]) => id === onglet)) onglet = 'classes';

  $('#onglets').innerHTML = ONGLETS.map(([id, l]) =>
    `<button data-onglet="${id}" class="${id === onglet ? 'active' : ''}">${l}</button>`).join('');
  $('#onglets').addEventListener('click', e => {
    const b = e.target.closest('[data-onglet]'); if (!b) return;
    onglet = b.dataset.onglet; location.hash = onglet;
    $$('#onglets button').forEach(x => x.classList.toggle('active', x.dataset.onglet === onglet));
    rendre();
  });

  const vue = $('#vue');
  /* Un seul écouteur délégué : chaque vue remplace son gestionnaire. */
  let gestionnaire = null;
  vue.addEventListener('click', e => { if (gestionnaire) gestionnaire(e); });
  let soumission = null;
  vue.addEventListener('submit', e => { if (soumission) soumission(e); });
  const attente = () => vue.innerHTML =
    '<div class="chargement"><span class="rond"></span><p>Chargement…</p></div>';

  /* La teinte d'avancement : la même lecture que côté parent. */
  const couleur = p => p >= 70 ? 'var(--ok)' : p >= 40 ? 'var(--warn)' : 'var(--brand)';

  /* --------------------------------- classes ------------------------------ */
  let classeOuverte = null;

  async function rendreClasses() {
    attente();
    if (classeOuverte) return rendreUneClasse(classeOuverte);

    const { classes } = await API.get('/enseignant/classes');
    vue.innerHTML = `
      <div class="colonnes-admin">
        <div>
          <h2 class="titre-bloc">Mes classes</h2>
          ${classes.length ? `<div class="cartes-classes">${classes.map(c => `
            <button class="carte-classe" data-classe="${c.id}">
              <b>${echapper(c.nom)}</b>
              <small>${c.niveau ? echapper(c.niveau) + ' · ' : ''}${c.eleves} élève${c.eleves > 1 ? 's' : ''}</small>
              <span class="code">Code ${echapper(c.code)}</span>
            </button>`).join('')}</div>`
            : `<div class="vide-etat"><b>Aucune classe pour l’instant</b>
                 Créez-en une, puis ajoutez vos élèves par leur adresse e-mail.</div>`}
        </div>
        <div>
          <div class="panneau">
            <h2>Créer une classe</h2>
            <p class="sous">Le code servira à la retrouver ; vous pouvez le dicter à vos élèves.</p>
            <form id="formClasse">
              <input class="champ" name="nom" placeholder="2ᵉ Bac SM — groupe A" required maxlength="120">
              <input class="champ espace-haut" name="niveau" placeholder="Niveau (facultatif)" maxlength="80">
              <button class="pilule blanc espace-haut" type="submit">Créer la classe</button>
            </form>
          </div>
        </div>
      </div>`;

    gestionnaire = e => {
      const c = e.target.closest('[data-classe]');
      if (c) { classeOuverte = Number(c.dataset.classe); rendreClasses(); }
    };
    soumission = async e => {
      e.preventDefault();
      const f = e.target;
      try {
        await API.post('/enseignant/classes',
          { nom: f.nom.value, niveau: f.niveau.value });
        message('Classe créée'); rendreClasses();
      } catch (err) { message(err.message); }
    };
  }

  async function rendreUneClasse(id) {
    attente();
    let d;
    try { d = await API.get('/enseignant/classes/' + id); }
    catch (e) { classeOuverte = null; message(e.message); return rendreClasses(); }
    const { classe, eleves, fragiles } = d;

    vue.innerHTML = `
      <div class="barre-outils">
        <button class="pilule" data-retour>← Toutes mes classes</button>
        <span class="titre-courant"><b>${echapper(classe.nom)}</b>
          <small>Code ${echapper(classe.code)} · ${classe.effectif} élève${classe.effectif > 1 ? 's' : ''}</small></span>
      </div>

      <div class="tuiles">
        <div class="tuile"><div class="lab">Effectif</div><div class="val">${classe.effectif}</div></div>
        <div class="tuile"><div class="lab">Avancement moyen</div><div class="val">${classe.avancement} %</div>
          <div class="sous">du programme, sur l’ensemble de la classe</div></div>
        <div class="tuile"><div class="lab">Moyenne aux QCM</div>
          <div class="val">${classe.moyenne === null ? '—' : classe.moyenne + ' %'}</div>
          <div class="sous">${classe.notes} élève(s) ayant passé au moins un QCM</div></div>
      </div>

      <div class="colonnes-admin">
        <div>
          <h2 class="titre-bloc">Les élèves</h2>
          <p class="sous">Ceux qui avancent le moins sont en tête : c’est là qu’il faut regarder.</p>
          ${eleves.length ? eleves.map(e => `
            <div class="ligne-eleve">
              <span class="av petite">${echapper((e.nom || '?')[0].toUpperCase())}</span>
              <span class="nom"><b>${echapper(e.nom)}</b><small>${echapper(e.email)}</small></span>
              <span class="jauge" title="${e.apercu.faits} chapitre(s) sur ${e.apercu.total}">
                <i style="width:${e.apercu.global}%;background:${couleur(e.apercu.global)}"></i></span>
              <span class="chiffre">${e.apercu.global} %</span>
              <span class="chiffre">${e.apercu.moyenne === null ? '—' : e.apercu.moyenne + ' %'}</span>
              <span class="chiffre faible">${e.apercu.revoir || 0} à revoir</span>
              <button class="pilule mini" data-eleve="${e.id}">Détail</button>
              <button class="pilule mini danger" data-retirer="${e.id}" aria-label="Retirer de la classe">×</button>
            </div>`).join('')
            : '<div class="vide-etat"><b>Classe vide</b>Ajoutez vos élèves par leur adresse e-mail.</div>'}
        </div>

        <div>
          <div class="panneau">
            <h2>Ajouter un élève</h2>
            <p class="sous">Il doit déjà avoir un compte élève sur la plateforme.</p>
            <form class="ligne-form" id="formEleve">
              <input class="champ" name="email" type="email" placeholder="eleve@exemple.ma" required>
              <button class="pilule blanc" type="submit">Ajouter</button>
            </form>
          </div>

          <div class="panneau espace-haut">
            <h2>Chapitres qui coincent</h2>
            <p class="sous">Moyenne de la classe sous 60 %, sur au moins deux tentatives.</p>
            ${fragiles.length ? fragiles.map(f => `
              <div class="ligne-chap">
                <span class="pastille-mat" style="background:${echapper(f.teinte)}"></span>
                <span class="nom"><b>${echapper(f.titre)}</b>
                  <small>${echapper(f.matiere)} · ${f.tentatives} tentative(s)</small></span>
                <span class="chiffre faible">${f.moyenne} %</span>
              </div>`).join('')
              : '<p class="sous derniere">Rien à signaler : aucun chapitre ne décroche.</p>'}
          </div>

          <div class="panneau espace-haut">
            <h2>Retirer la classe</h2>
            <p class="sous">La classe est archivée ; les comptes et les progressions ne bougent pas.</p>
            <button class="pilule danger" data-archiver>Archiver la classe</button>
          </div>
        </div>
      </div>`;

    gestionnaire = async e => {
      if (e.target.closest('[data-retour]')) { classeOuverte = null; return rendreClasses(); }

      const el = e.target.closest('[data-eleve]');
      if (el) return ficheEleve(Number(el.dataset.eleve));

      const ret = e.target.closest('[data-retirer]');
      if (ret) {
        if (!confirm('Retirer cet élève de la classe ?')) return;
        try {
          await API.supprimer('/enseignant/classes/' + id + '/eleves/' + ret.dataset.retirer);
          message('Élève retiré'); rendreUneClasse(id);
        } catch (err) { message(err.message); }
        return;
      }

      if (e.target.closest('[data-archiver]')) {
        if (!confirm('Archiver « ' + classe.nom + ' » ?')) return;
        try {
          await API.supprimer('/enseignant/classes/' + id);
          message('Classe archivée'); classeOuverte = null; rendreClasses();
        } catch (err) { message(err.message); }
      }
    };

    soumission = async e => {
      e.preventDefault();
      try {
        await API.post('/enseignant/classes/' + id + '/eleves', { email: e.target.email.value });
        message('Élève ajouté'); rendreUneClasse(id);
      } catch (err) { message(err.message); }
    };
  }

  /* Le tableau de bord d'un élève, dans une fenêtre par-dessus la classe. */
  async function ficheEleve(eleveId) {
    let tb;
    try { tb = await API.get('/enseignant/eleves/' + eleveId + '/tableau-bord'); }
    catch (e) { return message(e.message); }

    const s = tb.stats;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modale" id="modaleEleve">
        <div class="modale-corps">
          <button class="close" data-fermer aria-label="Fermer">×</button>
          <h2>${echapper(tb.eleve.nom)}</h2>
          <p class="sous">${echapper(tb.eleve.niveau || '')}</p>

          <div class="tuiles">
            <div class="tuile"><div class="lab">Programme</div><div class="val">${s.global} %</div>
              <div class="sous">${s.faits} chapitre(s) terminé(s) sur ${s.total}</div></div>
            <div class="tuile"><div class="lab">Moyenne aux QCM</div>
              <div class="val">${s.moyenne === null ? '—' : s.moyenne + ' %'}</div></div>
            <div class="tuile"><div class="lab">À revoir</div><div class="val">${s.revoir.length}</div></div>
          </div>

          <h3 class="titre-bloc">Par matière</h3>
          ${tb.matieres.map(m => `
            <div class="ligne-chap">
              <span class="pastille-mat" style="background:${echapper(m.teinte)}"></span>
              <span class="nom"><b>${echapper(m.nom)}</b>
                <small>${m.faits} / ${m.chapitres} chapitres terminés</small></span>
              <span class="jauge"><i style="width:${m.avancement}%;background:${couleur(m.avancement)}"></i></span>
              <span class="chiffre">${m.avancement} %</span>
            </div>`).join('')}

          ${s.revoir.length ? `<h3 class="titre-bloc">Chapitres à revoir</h3>
            ${s.revoir.map(c => `<div class="ligne-chap">
              <span class="pastille-mat" style="background:${echapper(c.matiere.teinte)}"></span>
              <span class="nom"><b>${echapper(c.titre)}</b><small>${echapper(c.matiere.nom)}</small></span>
              <span class="chiffre faible">${c.score === null ? '—' : c.score + ' %'}</span>
            </div>`).join('')}` : ''}
        </div>
      </div>`);

    const modale = $('#modaleEleve');
    modale.addEventListener('click', e => {
      if (e.target === modale || e.target.closest('[data-fermer]')) modale.remove();
    });
  }

  /* --------------------------------- contenu ------------------------------ */
  async function rendreContenu() {
    attente();
    const [{ matieres }, { chapitres }] = await Promise.all([
      API.get('/admin/matieres'), API.get('/admin/chapitres')
    ]);

    if (!matieres.length) {
      vue.innerHTML = `<div class="vide-etat"><b>Aucune matière ne vous est confiée</b>
        L’administration doit vous rattacher à une ou plusieurs matières avant que
        vous puissiez en modifier le contenu.</div>`;
      gestionnaire = null; soumission = null;
      return;
    }

    vue.innerHTML = `
      <h2 class="titre-bloc">Mes matières</h2>
      <div class="tuiles">${matieres.map(m => `
        <div class="tuile"><div class="lab">${echapper(m.nom)}</div>
          <div class="val">${m.chapitres}</div>
          <div class="sous">chapitres · ${m.questions} questions de QCM</div></div>`).join('')}
      </div>

      <h2 class="titre-bloc espace-haut">Chapitres</h2>
      <p class="sous">La publication décide de ce que les élèves voient. Le reste du contenu
        — séances, résumé, QCM — se modifie depuis la console d’administration.</p>
      <table class="tableau">
        <thead><tr><th>Chapitre</th><th>Matière</th><th>Séances</th><th>QCM</th>
          <th>Difficulté</th><th>État</th><th></th></tr></thead>
        <tbody>${chapitres.map(c => `
          <tr>
            <td><b>${echapper(c.titre)}</b><small>Chapitre ${c.numero}</small></td>
            <td>${echapper(c.matiere)}</td>
            <td>${c.seances}</td>
            <td>${c.questions}</td>
            <td>${echapper(c.difficulte)}</td>
            <td>${c.publie
              ? '<span class="etiquette ok">Publié</span>'
              : '<span class="etiquette">Brouillon</span>'}</td>
            <td><button class="pilule mini" data-publier="${c.id}" data-etat="${c.publie}">
              ${c.publie ? 'Dépublier' : 'Publier'}</button></td>
          </tr>`).join('')}
        </tbody>
      </table>`;

    gestionnaire = async e => {
      const b = e.target.closest('[data-publier]');
      if (!b) return;
      try {
        await API.patch('/admin/chapitres/' + b.dataset.publier,
          { publie: b.dataset.etat === '1' ? 0 : 1 });
        message(b.dataset.etat === '1' ? 'Chapitre dépublié' : 'Chapitre publié');
        rendreContenu();
      } catch (err) { message(err.message); }
    };
    soumission = null;
  }

  /* ------------------------------- exercices ------------------------------ */
  async function rendreExercices() {
    attente();
    const { series } = await API.get('/enseignant/exercices');

    if (!series.length) {
      vue.innerHTML = `<div class="vide-etat"><b>Aucune série pour l’instant</b>
        Les séries apparaissent ici dès qu’un élève ouvre les exercices d’un de vos chapitres.</div>`;
      gestionnaire = null; soumission = null;
      return;
    }

    const aRelire = series.filter(s => !s.valide).length;
    vue.innerHTML = `
      <h2 class="titre-bloc">Exercices générés</h2>
      <p class="sous">${aRelire
        ? `<b>${aRelire} série(s) en attente de relecture.</b> Les élèves les voient déjà :
           votre validation signale seulement qu’elles ont été vérifiées par un professeur.`
        : 'Toutes les séries ont été relues.'}</p>
      ${series.map(s => `
        <div class="ligne-chap">
          <span class="pastille-mat" style="background:${echapper(s.teinte)}"></span>
          <span class="nom"><b>${echapper(s.titre)}</b>
            <small>${echapper(s.matiere)} · chapitre ${s.numero} ·
              ${NIVEAUX[s.niveau] || s.niveau} · ${dateFR(s.cree_le)}</small></span>
          ${s.valide
            ? `<span class="etiquette ok">Relue${s.relecteur ? ' par ' + echapper(s.relecteur) : ''}</span>`
            : '<span class="etiquette">À relire</span>'}
          <button class="pilule mini" data-lire="${s.id}">Lire</button>
        </div>`).join('')}`;

    gestionnaire = async e => {
      const l = e.target.closest('[data-lire]');
      if (l) return lireSerie(Number(l.dataset.lire));
    };
    soumission = null;
  }

  async function lireSerie(id) {
    let serie;
    try { ({ serie } = await API.get('/enseignant/exercices/' + id)); }
    catch (e) { return message(e.message); }

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modale" id="modaleSerie">
        <div class="modale-corps">
          <button class="close" data-fermer aria-label="Fermer">×</button>
          <h2>${echapper(serie.titre)}</h2>
          <p class="sous">${NIVEAUX[serie.niveau] || serie.niveau} ·
            ${serie.valide ? 'déjà relue' : 'en attente de relecture'}</p>

          ${(serie.exercices || []).map((x, i) => `
            <article class="exo-relecture">
              <h3>${i + 1}. ${echapper(x.titre)} ${x.bareme
                ? `<span class="etiquette">${echapper(x.bareme)}</span>` : ''}</h3>
              <p>${echapper(x.enonce)}</p>
              ${x.donnees && x.donnees.length
                ? `<ul>${x.donnees.map(d => `<li>${echapper(d)}</li>`).join('')}</ul>` : ''}
              <div class="corrige-relecture">
                <b>Correction</b>
                <ol>${(x.correction.etapes || []).map(t => `<li>${echapper(t)}</li>`).join('')}</ol>
                <p><b>Réponse</b> ${echapper(x.correction.reponse)}</p>
                ${x.correction.erreurs && x.correction.erreurs.length
                  ? `<p class="sous">Erreurs fréquentes : ${
                      x.correction.erreurs.map(echapper).join(' · ')}</p>` : ''}
              </div>
            </article>`).join('')}

          <div class="panneau espace-haut">
            <h2>Votre relecture</h2>
            <form id="formRelecture">
              <input class="champ" name="note" maxlength="400"
                placeholder="Remarque (facultative) — visible de l’administration"
                value="${echapper(serie.note || '')}">
              <div class="rangee-boutons espace-haut">
                <button class="pilule blanc" type="submit">Valider la série</button>
                <button class="pilule danger" type="button" data-regenerer>Faire une autre série</button>
              </div>
            </form>
          </div>
        </div>
      </div>`);

    const modale = $('#modaleSerie');
    modale.addEventListener('click', async e => {
      if (e.target === modale || e.target.closest('[data-fermer]')) return modale.remove();
      if (e.target.closest('[data-regenerer]')) {
        if (!confirm('Demander une nouvelle série ? L’ancienne sera remplacée.')) return;
        message('Rédaction en cours, comptez une minute…');
        try {
          await API.post('/enseignant/exercices/' + id + '/regenerer');
          message('Nouvelle série rédigée'); modale.remove(); rendreExercices();
        } catch (err) { message(err.message); }
      }
    });
    modale.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        await API.post('/enseignant/exercices/' + id + '/valider', { note: e.target.note.value });
        message('Série validée'); modale.remove(); rendreExercices();
      } catch (err) { message(err.message); }
    });
  }

  /* --------------------------------- routage ------------------------------ */
  async function rendre() {
    gestionnaire = null; soumission = null;
    try {
      if (onglet === 'classes') return await rendreClasses();
      if (onglet === 'contenu') return await rendreContenu();
      if (onglet === 'exercices') return await rendreExercices();
    } catch (e) {
      vue.innerHTML = `<div class="vide-etat"><b>Chargement impossible</b>${echapper(e.message)}</div>`;
    }
  }
  rendre();
})();
