/* CASHEVENT SCHOOL — console d'administration : comptes, catalogue, QCM, suivi */
(async () => {
  const { $, $$, message, entete, pied, chargement, erreurFatale } = UI;

  chargement(true);
  let moi;
  try { moi = await API.get('/auth/moi').then(r => r.utilisateur); }
  catch (e) { chargement(false); return erreurFatale(e.message); }
  entete(moi, 'admin', {});
  pied();
  chargement(false);

  const echapper = t => String(t == null ? '' : t)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dateFR = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const ROLES = { eleve: 'Élève', parent: 'Parent', enseignant: 'Enseignant', etablissement: 'Établissement', admin: 'Admin' };

  /* --------------------------------- onglets ------------------------------ */
  const ONGLETS = [
    ['bord', 'Tableau de bord'], ['utilisateurs', 'Utilisateurs'],
    ['catalogue', 'Catalogue'], ['suivi', 'Suivi des élèves'],
    ['enseignants', 'Enseignants'], ['abonnements', 'Abonnements'], ['paiements', 'Paiements'], ['exercices', 'Exercices'],
    ['espaces', 'Entrer dans un espace'], ['messages', 'Messages'], ['journal', 'Journal']
  ];
  let onglet = location.hash.slice(1) || 'bord';
  if (!ONGLETS.some(([id]) => id === onglet)) onglet = 'bord';

  $('#onglets').innerHTML = ONGLETS.map(([id, l]) =>
    `<button data-onglet="${id}" class="${id === onglet ? 'active' : ''}">${l}</button>`).join('');
  $('#onglets').addEventListener('click', e => {
    const b = e.target.closest('[data-onglet]'); if (!b) return;
    onglet = b.dataset.onglet; location.hash = onglet;
    $$('#onglets button').forEach(x => x.classList.toggle('active', x.dataset.onglet === onglet));
    rendre();
  });

  const vue = $('#vue');
  /* Un seul écouteur délégué : chaque vue remplace son gestionnaire au lieu de les empiler. */
  let gestionnaire = null;
  vue.addEventListener('click', e => { if (gestionnaire) gestionnaire(e); });
  const attente = () => vue.innerHTML = '<div class="chargement"><span class="rond"></span><p>Chargement…</p></div>';

  /* ----------------------------- tableau de bord -------------------------- */
  async function rendreBord() {
    attente();
    const d = await API.get('/admin/tableau-bord');
    vue.innerHTML = `
      <div class="tuiles">
        <div class="tuile"><div class="lab">Comptes</div><div class="val">${d.comptes.total}</div>
          <div class="sous">${d.comptes.eleves} élèves · ${d.comptes.parents} parents · ${d.comptes.admins} admin</div></div>
        <div class="tuile"><div class="lab">Élèves actifs (7 jours)</div><div class="val">${d.actifs7}</div>
          <div class="sous">${d.comptes.desactives} compte(s) désactivé(s)</div></div>
        <div class="tuile"><div class="lab">Catalogue</div><div class="val">${d.catalogue.chapitres}</div>
          <div class="sous">${d.catalogue.matieres} matières · ${d.catalogue.questions} questions ·
            ${d.catalogue.seances} séances</div></div>
        <div class="tuile"><div class="lab">Moyenne générale aux QCM</div>
          <div class="val">${d.qcm.moyenne === null ? '—' : d.qcm.moyenne + ' %'}</div>
          <div class="sous">${d.qcm.tentatives} tentative(s) terminée(s)</div></div>
      </div>

      <div class="colonnes-admin">
        <div class="panneau">
          <h2>Chapitres les plus ratés</h2>
          <p class="sous">Là où le contenu ou l’explication mérite d’être retravaillé.</p>
          ${d.fragiles.length ? d.fragiles.map(f => `
            <div class="ligne-chap"><span class="pt" style="background:${f.teinte}"></span>
              <span class="nom"><b>${echapper(f.titre)}</b><small>${echapper(f.matiere)} · ${f.tentatives} tentative(s)</small></span>
              <span class="score ${f.moyenne < 60 ? 'faible' : ''}">${f.moyenne} %</span>
              <button class="mini" data-editer="${f.id}">Modifier</button></div>`).join('')
            : '<p class="sous">Aucune tentative enregistrée pour le moment.</p>'}
        </div>
        <div class="panneau">
          <h2>Derniers comptes créés</h2>
          <p class="sous">Inscriptions les plus récentes.</p>
          ${d.recents.map(u => `
            <div class="ligne-chap"><span class="av petite">${echapper(u.nom[0].toUpperCase())}</span>
              <span class="nom"><b>${echapper(u.nom)}</b><small>${echapper(u.email)}</small></span>
              <span class="role-pastille role-${u.role}">${ROLES[u.role]}</span>
              <span class="quand">${dateFR(u.cree_le)}</span></div>`).join('')}
        </div>
      </div>`;
    gestionnaire = e => {
      const b = e.target.closest('[data-editer]');
      if (b) { onglet = 'catalogue'; location.hash = 'catalogue'; rendre().then(() => ouvrirChapitre(b.dataset.editer)); }
    };
  }

  /* ------------------------------ utilisateurs ---------------------------- */
  let filtreRole = '', recherche = '';

  async function rendreUtilisateurs() {
    attente();
    const params = new URLSearchParams();
    if (filtreRole) params.set('role', filtreRole);
    if (recherche) params.set('q', recherche);
    const [{ utilisateurs }, { liens }] = await Promise.all([
      API.get('/admin/utilisateurs?' + params), API.get('/admin/liens')
    ]);

    vue.innerHTML = `
      <div class="barre-outils">
        <div class="pills serres" id="filtres">
          ${[['', 'Tous'], ['eleve', 'Élèves'], ['parent', 'Parents'],
             ['enseignant', 'Enseignants'], ['etablissement', 'Universités / écoles'], ['admin', 'Administrateurs']]
            .map(([v, l]) => `<button data-role="${v}" class="${filtreRole === v ? 'active' : ''}">${l}</button>`).join('')}
        </div>
        <input class="champ" id="rech" type="search" placeholder="Nom ou e-mail…" value="${echapper(recherche)}">
        <button class="pilule blanc" id="nouveau">Nouveau compte</button>
      </div>

      <div class="tableau">
        <table>
          <thead><tr><th>Nom</th><th>Rôle</th><th>Rattachements</th><th>Progression</th>
            <th>Fiche</th><th>Inscription</th><th>Dernière connexion</th><th>État</th><th></th></tr></thead>
          <tbody>${utilisateurs.map(u => `
            <tr data-utilisateur="${u.id}">
              <td><b>${echapper(u.nom)}</b><small>${echapper(u.email)}</small></td>
              <td><span class="role-pastille role-${u.role}">${ROLES[u.role]}</span></td>
              <td>${u.role === 'parent' ? u.enfants + ' enfant(s)'
                : u.role === 'eleve' ? u.parents + ' parent(s)' : '—'}</td>
              <td>${u.role === 'eleve' ? u.chapitres_finis + ' chapitres finis' : '—'}</td>
              <td class="fiche-mini">${[
                u.ville && (echapper(u.ville) + (u.pays ? ', ' + echapper(u.pays) : '')),
                u.telephone && echapper(u.telephone),
                u.age !== null && u.age !== undefined ? u.age + ' ans' : null,
                u.filiere && echapper(u.filiere),
                u.etablissement && echapper(u.etablissement)
              ].filter(Boolean).join('<br>') || '—'}</td>
              <td>${dateFR(u.cree_le)}</td>
              <td>${dateFR(u.derniere_connexion)}</td>
              <td><span class="pastille ${u.actif ? 'ok' : 'off'}">${u.actif ? 'Actif' : 'Désactivé'}</span></td>
              <td class="actions-ligne">
                <button class="mini" data-modifier="${u.id}">Modifier</button>
                ${u.role === 'enseignant'
                  ? `<button class="mini" data-matieres="${u.id}">Matières</button>` : ''}
                <button class="mini" data-basculer="${u.id}">${u.actif ? 'Désactiver' : 'Réactiver'}</button>
                <button class="mini danger" data-supprimer="${u.id}">Supprimer</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
        ${utilisateurs.length ? '' : '<p class="sous vide">Aucun compte ne correspond à cette recherche.</p>'}
      </div>

      <div class="panneau" style="margin-top:22px">
        <h2>Liens parent ↔ élève</h2>
        <p class="sous">Un parent ne voit que les élèves qui lui sont rattachés.</p>
        <form class="ligne-form" id="formLien">
          <select class="champ" id="selParent" required>
            <option value="">Parent…</option>
            ${utilisateurs.filter(u => u.role === 'parent')
              .map(u => `<option value="${u.id}">${echapper(u.nom)}</option>`).join('')}
          </select>
          <select class="champ" id="selEleve" required>
            <option value="">Élève…</option>
            ${utilisateurs.filter(u => u.role === 'eleve')
              .map(u => `<option value="${u.id}">${echapper(u.nom)}</option>`).join('')}
          </select>
          <button class="pilule blanc" type="submit">Rattacher</button>
        </form>
        <div class="liens">${liens.map(l => `
          <span class="lien-puce">${echapper(l.parent)} → ${echapper(l.eleve)}
            <button data-delier="${l.parent_id}:${l.eleve_id}" aria-label="Supprimer ce lien">×</button></span>`).join('')
          || '<p class="sous">Aucun lien enregistré.</p>'}</div>
      </div>`;

    $('#filtres').addEventListener('click', e => {
      const b = e.target.closest('[data-role]'); if (!b) return;
      filtreRole = b.dataset.role; rendreUtilisateurs();
    });
    let minuteur;
    $('#rech').addEventListener('input', e => {
      clearTimeout(minuteur);
      minuteur = setTimeout(() => { recherche = e.target.value.trim(); rendreUtilisateurs(); }, 300);
    });
    $('#nouveau').addEventListener('click', () => formulaireUtilisateur(null));

    $('#formLien').addEventListener('submit', async e => {
      e.preventDefault();
      try {
        await API.post('/admin/liens', { parentId: Number($('#selParent').value), eleveId: Number($('#selEleve').value) });
        message('Lien créé.'); rendreUtilisateurs();
      } catch (err) { message(err.message); }
    });

    gestionnaire = async e => {
      const mod = e.target.closest('[data-modifier]');
      if (mod) return formulaireUtilisateur(utilisateurs.find(u => u.id === Number(mod.dataset.modifier)));

      const mat = e.target.closest('[data-matieres]');
      if (mat) return matieresEnseignant(utilisateurs.find(u => u.id === Number(mat.dataset.matieres)));

      const bascule = e.target.closest('[data-basculer]');
      if (bascule) {
        const u = utilisateurs.find(x => x.id === Number(bascule.dataset.basculer));
        try { await API.patch('/admin/utilisateurs/' + u.id, { actif: !u.actif }); rendreUtilisateurs(); }
        catch (err) { message(err.message); }
        return;
      }
      const sup = e.target.closest('[data-supprimer]');
      if (sup) {
        const u = utilisateurs.find(x => x.id === Number(sup.dataset.supprimer));
        if (!confirm(`Supprimer définitivement le compte de ${u.nom} ? Sa progression sera perdue.`)) return;
        try { await API.supprimer('/admin/utilisateurs/' + u.id); message('Compte supprimé.'); rendreUtilisateurs(); }
        catch (err) { message(err.message); }
        return;
      }
      const del = e.target.closest('[data-delier]');
      if (del) {
        const [p, el] = del.dataset.delier.split(':');
        try { await API.supprimer(`/admin/liens?parentId=${p}&eleveId=${el}`); rendreUtilisateurs(); }
        catch (err) { message(err.message); }
      }
    };
  }

  function formulaireUtilisateur(u) {
    const creation = !u;
    dialogue(creation ? 'Nouveau compte' : 'Modifier ' + u.nom, `
      <label>Nom complet<input class="champ" name="nom" value="${creation ? '' : echapper(u.nom)}" required></label>
      <label>Adresse e-mail<input class="champ" name="email" type="email"
        value="${creation ? '' : echapper(u.email)}" ${creation ? 'required' : 'disabled'}></label>
      <label>Rôle<select class="champ" name="role">
        ${Object.entries(ROLES).map(([v, l]) =>
          `<option value="${v}"${!creation && u.role === v ? ' selected' : ''}>${l}</option>`).join('')}
      </select></label>
      <label>Niveau (élèves)<input class="champ" name="niveau" value="${creation ? '' : echapper(u.niveau || '')}"></label>
      <label>${creation ? 'Mot de passe' : 'Nouveau mot de passe (laisser vide pour ne pas changer)'}
        <input class="champ" name="motDePasse" type="password" minlength="8" ${creation ? 'required' : ''}></label>`,
      async donnees => {
        if (creation) await API.post('/admin/utilisateurs', donnees);
        else {
          const corps = { nom: donnees.nom, role: donnees.role, niveau: donnees.niveau };
          if (donnees.motDePasse) corps.motDePasse = donnees.motDePasse;
          await API.patch('/admin/utilisateurs/' + u.id, corps);
        }
        message(creation ? 'Compte créé.' : 'Compte mis à jour.');
        rendreUtilisateurs();
      });
  }

  /* Les matières d'un enseignant : celles où ses élèves peuvent le désigner. */
  async function matieresEnseignant(u) {
    let matieres, siennes;
    try {
      [{ matieres }, { matieres: siennes }] = await Promise.all([
        API.get('/admin/matieres'), API.get('/admin/enseignants/' + u.id + '/matieres')
      ]);
    } catch (e) { return message(e.message); }

    dialogue('Matières de ' + u.nom, `
      <p class="sous">Cochez les matières que ${echapper(u.nom)} enseigne : ses élèves ne pourront
        le désigner comme professeur référent que dans celles-ci.</p>
      ${matieres.map(m => `
        <label class="case-outil" style="padding:6px 0">
          <input type="checkbox" name="m${m.id}" ${siennes.includes(m.id) ? 'checked' : ''}>
          <span>${echapper(m.nom)} <small style="color:var(--text-3)">· ${m.chapitres} chapitres</small></span>
        </label>`).join('')}`,
      async donnees => {
        const choisies = matieres.map(m => m.id).filter(id => donnees['m' + id]);
        await API.put('/admin/enseignants/' + u.id + '/matieres', { matieres: choisies });
        message(choisies.length
          ? choisies.length + ' matière(s) confiée(s) à ' + u.nom
          : 'Plus aucune matière confiée à ' + u.nom);
      });
  }

  /* -------------------------------- catalogue ----------------------------- */
  /* Le catalogue se lit dans l'ordre où l'élève le découvre :
     série → matière → chapitre → contenu du chapitre. */
  const VUE_CAT = { serie: 'toutes', matiere: null, q: '' };
  const SERIES = [['toutes', 'Toutes les classes'], ['6e', '6e'], ['5e', '5e'], ['4e', '4e'], ['3e', '3e'], ['2nde', '2nde'], ['1re', '1re'], ['Terminale', 'Terminale']];
  let CLASSES_CAT = [];
  const seriesDe = m => (m.series || '').split(',').filter(Boolean);
  const courtDe = code => (CLASSES_CAT.find(c => c.code === code) || { court: code }).court;
  const niveauDe = code => (CLASSES_CAT.find(c => c.code === code) || {}).niveau;
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

  async function rendreCatalogue() {
    attente();
    const [{ matieres, classes }, { chapitres }] = await Promise.all([
      API.get('/admin/matieres'), API.get('/admin/chapitres')
    ]);
    CLASSES_CAT = (classes || []).filter(c => c.code !== 'SUP');
    if (VUE_CAT.matiere && !matieres.some(m => m.id === VUE_CAT.matiere)) VUE_CAT.matiere = null;
    const chapitresDe = id => chapitres.filter(c => c.matiere_id === id);
    const dansSerie = m => VUE_CAT.serie === 'toutes' || seriesDe(m).some(c => niveauDe(c) === VUE_CAT.serie);
    const nbSerie = s => s === 'toutes' ? matieres.length : matieres.filter(m => seriesDe(m).some(c => niveauDe(c) === s)).length;
    const manque = c => !c.cours || !c.questions || !c.exercices;

    const ligneChapitre = (c, avecMatiere) => `
      <article class="cat-ligne${c.publie ? '' : ' masque'}">
        <span class="cat-num" style="--c1:${c.teinte}">${c.numero}</span>
        <button class="cat-titre" data-chap-ouvrir="${c.id}">
          ${avecMatiere ? `<small>${echapper(c.matiere)}</small>` : ''}
          <b>${echapper(c.titre)}</b>
          <span class="cat-format ${c.videos ? 'video' : 'livre'}">${c.videos ? 'Cours en vidéo' : 'Cours à lire'}</span>
          <span class="cat-diff">${c.difficulte}</span>
        </button>
        <div class="cat-contenus">
          <button class="${c.cours ? 'ok' : 'vide'}" data-chap-ouvrir="${c.id}" data-onglet-chap="cours"><b>${c.cours}</b>Cours</button>
          <button class="${c.exercices ? 'ok' : 'vide'}" data-chap-ouvrir="${c.id}" data-onglet-chap="exercices"><b>${c.exercices}</b>Exercices</button>
          <button class="${c.questions ? 'ok' : 'vide'}" data-chap-ouvrir="${c.id}" data-onglet-chap="qcm"><b>${c.questions}</b>QCM</button>
          <button class="${c.videos ? 'ok' : 'neutre'}" data-chap-ouvrir="${c.id}" data-onglet-chap="videos"><b>${c.videos}</b>Vidéos</button>
        </div>
        <label class="cat-switch" title="Visible par les élèves">
          <input type="checkbox" data-chap-publier="${c.id}" ${c.publie ? 'checked' : ''}><i></i>
          <span>${c.publie ? 'En ligne' : 'Masqué'}</span>
        </label>
        <div class="cat-actions">
          <button class="pilule mini blanc" data-chap-ouvrir="${c.id}">Modifier</button>
          <button class="mini danger" data-chap-supprimer="${c.id}" aria-label="Supprimer le chapitre">Supprimer</button>
        </div>
      </article>`;

    const grille = () => {
      const q = VUE_CAT.q.toLowerCase();
      const liste = matieres.filter(dansSerie);
      if (q) {
        const ids = new Set(liste.map(m => m.id));
        const trouves = chapitres.filter(c => ids.has(c.matiere_id) &&
          (c.titre.toLowerCase().includes(q) || c.matiere.toLowerCase().includes(q)));
        return trouves.length
          ? `<p class="cat-compte">${pluriel(trouves.length, 'chapitre')} pour « ${echapper(VUE_CAT.q)} »</p>
             <div class="cat-liste">${trouves.map(c => ligneChapitre(c, true)).join('')}</div>`
          : `<div class="vide-etat"><b>Aucun chapitre trouvé</b>Essayez un autre mot.</div>`;
      }
      return `<div class="cat-matieres">${liste.map(m => {
        const ch = chapitresDe(m.id), aFaire = ch.filter(manque).length;
        return `<button class="cat-matiere" data-matiere-ouvrir="${m.id}" style="--c1:${m.teinte};--c2:${m.teinte2}">
          <span class="g" aria-hidden="true">${m.glyphe}</span>
          <span class="series">${seriesDe(m).map(s => `<i>${courtDe(s)}</i>`).join('') || '<i class="off">Aucune classe</i>'}</span>
          <b>${echapper(m.nom)}</b>
          <small>${pluriel(ch.length, 'chapitre')} · ${pluriel(Number(m.questions), 'question')} · coef. ${m.coefficient}</small>
          <span class="etat${aFaire ? ' afaire' : ''}">${aFaire ? pluriel(aFaire, 'chapitre') + ' à compléter' : 'Contenu complet'}</span>
        </button>`;
      }).join('')}</div>`;
    };

    const detailMatiere = () => {
      const m = matieres.find(x => x.id === VUE_CAT.matiere), ch = chapitresDe(m.id);
      return `<section class="cat-tete" style="--c1:${m.teinte};--c2:${m.teinte2}">
          <button class="cat-retour" data-retour-matieres>← Toutes les matières</button>
          <span class="g" aria-hidden="true">${m.glyphe}</span>
          <div class="series">${seriesDe(m).map(s => `<i>${courtDe(s)}</i>`).join('')}</div>
          <h2>${echapper(m.nom)}</h2>
          <p>${pluriel(ch.length, 'chapitre')} · ${pluriel(Number(m.questions), 'question')} · coefficient ${m.coefficient} · ${echapper(m.professeur)}</p>
          <div class="cat-tete-actions">
            <button class="pilule blanc" data-nouveau-chapitre>Ajouter un chapitre</button>
            <button class="pilule" data-mat-modifier="${m.id}">Réglages de la matière</button>
            <button class="pilule danger" data-mat-supprimer="${m.id}">Supprimer la matière</button>
          </div>
        </section>
        <div class="cat-liste">${ch.map(c => ligneChapitre(c, false)).join('') ||
          '<div class="vide-etat"><b>Aucun chapitre</b>Ajoutez le premier chapitre de cette matière.</div>'}</div>`;
    };

    const zone = () => { $('#catZone').innerHTML = VUE_CAT.matiere ? detailMatiere() : grille(); };
    const totalQ = matieres.reduce((s, m) => s + Number(m.questions), 0);

    vue.innerHTML = `
      <section class="cat-guide" aria-label="Comment le catalogue est organisé">
        <div class="cat-guide-tete"><h2>Comment ça marche</h2>
          <p>${pluriel(matieres.length, 'matière')}, ${pluriel(chapitres.length, 'chapitre')} et ${pluriel(totalQ, 'question')}. Tout se range en quatre niveaux.</p></div>
        <ol>
          <li><b>Classe</b><span>De la 6e à la Terminale, avec sa série : l’élève ne voit que les matières de sa classe.</span></li>
          <li><b>Matière</b><span>Mathématiques, Histoire… une couleur et un coefficient.</span></li>
          <li><b>Chapitre</b><span>Une leçon du programme, en ligne ou masquée.</span></li>
          <li><b>Contenu</b><span>Le cours, les exercices corrigés, le QCM et, si vous en avez, les vidéos.</span></li>
        </ol>
      </section>
      <div class="cat-barre">
        <div class="cat-series" role="tablist">${SERIES.map(([v, l]) => `
          <button role="tab" aria-selected="${VUE_CAT.serie === v}" class="${VUE_CAT.serie === v ? 'actif' : ''}" data-cat-serie="${v}">${l}<i>${nbSerie(v)}</i></button>`).join('')}</div>
        <input class="champ" id="catRecherche" type="search" placeholder="Chercher un chapitre…" value="${echapper(VUE_CAT.q)}" aria-label="Chercher un chapitre">
        <button class="pilule" id="nouvChapitre">Nouveau chapitre</button>
        <button class="pilule blanc" id="nouvMatiere">Nouvelle matière</button>
      </div>
      <div id="catZone"></div>`;
    zone();

    $('#nouvMatiere').addEventListener('click', () => formulaireMatiere(null));
    $('#nouvChapitre').addEventListener('click', () => formulaireNouveauChapitre(matieres, VUE_CAT.matiere));
    $('#catRecherche').addEventListener('input', e => { VUE_CAT.q = e.target.value.trim(); VUE_CAT.matiere = null; zone(); });
    $('#catZone').addEventListener('change', async e => {
      const t = e.target.closest('[data-chap-publier]'); if (!t) return;
      const c = chapitres.find(x => x.id === Number(t.dataset.chapPublier));
      try {
        await API.patch('/admin/chapitres/' + c.id, { publie: t.checked });
        c.publie = t.checked ? 1 : 0; zone();
        message(t.checked ? 'Chapitre en ligne.' : 'Chapitre masqué aux élèves.');
      } catch (err) { t.checked = !t.checked; message(err.message); }
    });

    gestionnaire = async e => {
      const se = e.target.closest('[data-cat-serie]');
      if (se) { VUE_CAT.serie = se.dataset.catSerie; VUE_CAT.matiere = null; return rendreCatalogue(); }
      const mo = e.target.closest('[data-matiere-ouvrir]');
      if (mo) { VUE_CAT.matiere = Number(mo.dataset.matiereOuvrir); zone(); return window.scrollTo({ top: 0, behavior: 'smooth' }); }
      if (e.target.closest('[data-retour-matieres]')) { VUE_CAT.matiere = null; return zone(); }
      if (e.target.closest('[data-nouveau-chapitre]')) return formulaireNouveauChapitre(matieres, VUE_CAT.matiere);
      const mm = e.target.closest('[data-mat-modifier]');
      if (mm) return formulaireMatiere(matieres.find(m => m.id === Number(mm.dataset.matModifier)));
      const ms = e.target.closest('[data-mat-supprimer]');
      if (ms) {
        const m = matieres.find(x => x.id === Number(ms.dataset.matSupprimer));
        if (!confirm(`Supprimer « ${m.nom} » et ses ${m.chapitres} chapitres ? Cette action est définitive.`)) return;
        try { await API.supprimer('/admin/matieres/' + m.id); message('Matière supprimée.'); VUE_CAT.matiere = null; rendreCatalogue(); }
        catch (err) { message(err.message); }
        return;
      }
      const cs = e.target.closest('[data-chap-supprimer]');
      if (cs) {
        const c = chapitres.find(x => x.id === Number(cs.dataset.chapSupprimer));
        if (!confirm(`Supprimer le chapitre « ${c.titre} » ? Les progressions liées seront perdues.`)) return;
        try { await API.supprimer('/admin/chapitres/' + c.id); message('Chapitre supprimé.'); rendreCatalogue(); }
        catch (err) { message(err.message); }
        return;
      }
      const co = e.target.closest('[data-chap-ouvrir]');
      if (co) return ouvrirChapitre(co.dataset.chapOuvrir, co.dataset.ongletChap);
    };
  }

  function formulaireMatiere(m) {
    const creation = !m, actuelles = creation ? [] : seriesDe(m);
    dialogue(creation ? 'Nouvelle matière' : 'Réglages — ' + m.nom, `
      ${creation ? '<label>Code (identifiant court, sans accent)<input class="champ" name="code" required></label>' : ''}
      <label>Nom<input class="champ" name="nom" value="${creation ? '' : echapper(m.nom)}" required></label>
      <label>Nom court<input class="champ" name="court" value="${creation ? '' : echapper(m.court)}"></label>
      <fieldset class="cat-choix-series"><legend>Classes qui voient cette matière</legend>
        ${[...new Set(CLASSES_CAT.map(c => c.niveau))].map(n => `<div class="cat-niveau"><b>${n}</b>${CLASSES_CAT.filter(c => c.niveau === n).map(c =>
          `<label class="case"><input type="checkbox" name="classe_${c.code}" ${actuelles.includes(c.code) ? 'checked' : ''}> ${c.court}</label>`).join('')}</div>`).join('')}
      </fieldset>
      <label>Professeur ou auteurs<input class="champ" name="professeur" value="${creation ? '' : echapper(m.professeur)}"></label>
      <label>Coefficient<input class="champ" name="coefficient" type="number" min="1" max="20"
        value="${creation ? 1 : m.coefficient}"></label>
      <div class="deux">
        <label>Couleur 1<input class="champ" name="teinte" type="color" value="${creation ? '#3b6ef5' : m.teinte}"></label>
        <label>Couleur 2<input class="champ" name="teinte2" type="color" value="${creation ? '#7b3bf5' : m.teinte2}"></label>
      </div>
      <label>Symbole<input class="champ" name="glyphe" maxlength="2" value="${creation ? '' : echapper(m.glyphe)}"></label>
      <label>Titre du bloc « à retenir »<input class="champ" name="labelFormules"
        value="${creation ? 'À retenir' : echapper(m.label_formules)}"></label>`,
      async d => {
        const series = CLASSES_CAT.map(c => c.code).filter(c => d['classe_' + c]).join(',');
        CLASSES_CAT.forEach(c => delete d['classe_' + c.code]);
        const corps = { ...d, series };
        if (creation) await API.post('/admin/matieres', corps);
        else await API.patch('/admin/matieres/' + m.id, corps);
        message(creation ? 'Matière créée.' : 'Matière mise à jour.');
        rendreCatalogue();
      });
  }

  function formulaireNouveauChapitre(matieres, matiereId) {
    dialogue('Nouveau chapitre', `
      <label>Matière<select class="champ" name="matiereId" required>
        ${matieres.map(m => `<option value="${m.id}"${m.id === matiereId ? ' selected' : ''}>${echapper(m.nom)}${m.series ? ' — ' + m.series : ''}</option>`).join('')}
      </select></label>
      <label>Titre<input class="champ" name="titre" required></label>
      <label>Durée de travail (minutes)<input class="champ" name="duree" type="number" min="0" value="40"></label>
      <label>Difficulté<select class="champ" name="difficulte">
        <option>Facile</option><option selected>Moyen</option><option>Difficile</option></select></label>
      <label>Accroche<textarea class="champ" name="accroche" rows="2"></textarea></label>`,
      async d => {
        const r = await API.post('/admin/chapitres', { ...d, matiereId: Number(d.matiereId), duree: Number(d.duree), publie: false });
        message('Chapitre créé et masqué. Complétez-le, puis mettez-le en ligne.');
        await rendreCatalogue();
        ouvrirChapitre(r.id, 'cours');
      });
  }

  /* L'éditeur de QCM, intégré à la fiche du chapitre. */
  function editeurQCM(c) {
    const questions = c.questions.map(q => ({ ...q, options: q.options.map(o => ({ ...o })) }));
    const etat = { modifie: false };
    const dessiner = () => questions.map((q, i) => `
      <fieldset class="question-edit" data-q="${i}">
        <legend>Question ${i + 1}
          <button type="button" class="mini danger" data-suppr-q="${i}">Retirer</button></legend>
        <label>Énoncé<textarea class="champ" data-champ="enonce" rows="2">${echapper(q.enonce)}</textarea></label>
        <div class="options-edit">
          ${q.options.map((o, j) => `
            <div class="option-edit">
              <input type="radio" name="bonne-${i}" data-bonne="${j}" ${o.correcte ? 'checked' : ''}
                aria-label="Bonne réponse ${j + 1}">
              <input class="champ" data-option="${j}" value="${echapper(o.texte)}" placeholder="Proposition ${j + 1}">
              <button type="button" class="mini" data-suppr-o="${j}" aria-label="Retirer">×</button>
            </div>`).join('')}
          <button type="button" class="mini" data-ajout-o>+ proposition</button>
        </div>
        <label>Explication affichée après la réponse
          <textarea class="champ" data-champ="explication" rows="2">${echapper(q.explication)}</textarea></label>
      </fieldset>`).join('') + '<button type="button" class="pilule" id="ajoutQ">+ Ajouter une question</button>';

    const lire = corps => {
      $$('.question-edit', corps).forEach((f, i) => {
        questions[i].enonce = $('[data-champ="enonce"]', f).value;
        questions[i].explication = $('[data-champ="explication"]', f).value;
        $$('[data-option]', f).forEach((inp, j) => { if (questions[i].options[j]) questions[i].options[j].texte = inp.value; });
        $$('[data-bonne]', f).forEach((r, j) => { questions[i].options[j].correcte = r.checked; });
      });
    };
    const brancher = corps => {
      const zone = $('#qcmEdit', corps);
      zone.addEventListener('input', () => { etat.modifie = true; });
      zone.addEventListener('change', () => { etat.modifie = true; });
      zone.addEventListener('click', e => {
        const f = e.target.closest('.question-edit');
        const redessiner = () => { etat.modifie = true; zone.innerHTML = dessiner(); };
        if (e.target.id === 'ajoutQ') {
          lire(corps);
          questions.push({ id: null, enonce: '', explication: '', options: [
            { texte: '', correcte: true }, { texte: '', correcte: false }, { texte: '', correcte: false }] });
          return redessiner();
        }
        if (e.target.closest('[data-suppr-q]')) {
          lire(corps);
          questions.splice(Number(e.target.closest('[data-suppr-q]').dataset.supprQ), 1);
          return redessiner();
        }
        if (e.target.closest('[data-ajout-o]') && f) {
          lire(corps);
          questions[Number(f.dataset.q)].options.push({ texte: '', correcte: false });
          return redessiner();
        }
        const so = e.target.closest('[data-suppr-o]');
        if (so && f) {
          lire(corps);
          const q = questions[Number(f.dataset.q)];
          if (q.options.length <= 2) return message('Une question doit garder au moins deux propositions.');
          q.options.splice(Number(so.dataset.supprO), 1);
          if (!q.options.some(o => o.correcte)) q.options[0].correcte = true;
          redessiner();
        }
      });
    };
    return { questions, etat, dessiner, lire, brancher };
  }

  /* La fiche d'un chapitre : un onglet par partie de ce que voit l'élève. */
  async function ouvrirChapitre(id, ongletInitial) {
    let c;
    try { c = (await API.get('/admin/chapitres/' + id)).chapitre; }
    catch (e) { return message(e.message); }
    const qcm = editeurQCM(c);
    let corpsForm = null;

    /* Chaque élément est une ligne à part, ajoutée ou retirée d'un clic. */
    const lignesPour = v => Math.min(12, Math.max(2, Math.ceil(String(v).length / 85) + 1));
    const itemListe = v => `<div class="item-edit">
        <textarea class="champ" rows="${lignesPour(v)}">${echapper(v)}</textarea>
        <button type="button" class="mini danger" data-suppr-item aria-label="Retirer">×</button></div>`;
    const blocListe = (nom, titre, valeurs, bouton) => `
      <div class="liste-edit" data-liste="${nom}"><h4>${titre}</h4>
        <div class="liste-items">${valeurs.map(itemListe).join('')}</div>
        <button type="button" class="pilule mini" data-ajout-item>+ ${bouton}</button></div>`;
    const carteExo = (en, co, i) => `<fieldset class="exo-edit"><legend>Exercice
        <button type="button" class="mini danger" data-suppr-exo>Retirer</button></legend>
        <label>Énoncé<textarea class="champ e-enonce" rows="${lignesPour(en)}">${echapper(en)}</textarea></label>
        <label>Corrigé<textarea class="champ e-corrige" rows="${lignesPour(co)}">${echapper(co)}</textarea></label></fieldset>`;
    const exosApparies = c.tp.exercices.length === c.tp.corrige.length;
    const ligneVideo = s => `
      <div class="vid-ligne" data-id="${s.id || ''}">
        <input class="champ v-titre" value="${echapper(s.titre)}" placeholder="Titre de la séance" aria-label="Titre de la séance">
        <input class="champ v-duree" type="number" min="0" value="${s.duree || 0}" aria-label="Durée en minutes">
        <input class="champ v-lien" value="${echapper(s.video ? s.video.url : '')}" placeholder="Lien YouTube (facultatif)" aria-label="Lien YouTube">
        <button type="button" class="mini danger" data-suppr-seance aria-label="Retirer la séance">×</button>
      </div>`;

    const ONGLETS_CHAP = [
      ['general', 'Présentation', null],
      ['cours', 'Cours', c.resume.points.length],
      ['retenir', 'À retenir', c.resume.formules.length + c.resume.pieges.length],
      ['exercices', 'Exercices', c.tp.exercices.length],
      ['qcm', 'QCM', c.questions.length],
      ['videos', 'Vidéos', c.seances.filter(s => s.video).length]
    ];
    const depart = ONGLETS_CHAP.some(([v]) => v === ongletInitial) ? ongletInitial : 'general';
    const aide = t => `<p class="chap-aide">${t}</p>`;
    const volet = (v, html) => `<section class="chap-volet" data-volet="${v}"${v === depart ? '' : ' hidden'}>${html}</section>`;

    dialogue(`${c.matiere.nom} · Chapitre ${c.n}`, `
      <nav class="chap-onglets" role="tablist">${ONGLETS_CHAP.map(([v, l, n]) => `
        <button type="button" role="tab" class="${v === depart ? 'actif' : ''}" data-chap-onglet="${v}">${l}${n === null ? '' : `<i>${n}</i>`}</button>`).join('')}</nav>
      ${volet('general', aide('La carte du chapitre : ce que l’élève voit avant de l’ouvrir.') + `
        <div class="deux">
          <label>Titre<input class="champ" name="titre" value="${echapper(c.titre)}" required></label>
          <label>Numéro<input class="champ" name="numero" type="number" min="1" value="${c.n}"></label>
        </div>
        <div class="deux">
          <label>Durée de travail (min)<input class="champ" name="duree" type="number" min="0" value="${c.duree}"></label>
          <label>Difficulté<select class="champ" name="difficulte">
            ${['Facile', 'Moyen', 'Difficile'].map(d => `<option${d === c.difficulte ? ' selected' : ''}>${d}</option>`).join('')}
          </select></label>
        </div>
        <label>Accroche<textarea class="champ" name="accroche" rows="3">${echapper(c.accroche || '')}</textarea></label>
        <label class="case"><input type="checkbox" name="publie" ${c.publie ? 'checked' : ''}> Chapitre visible par les élèves</label>
        ${blocListe('notions', 'Notions travaillées', c.notions, 'Ajouter une notion')}`)}
      ${volet('cours', aide('Le texte que l’élève lit, page par page. Deux paragraphes forment une page. Pour écrire en gras : &lt;b&gt;mot&lt;/b&gt;.') +
        blocListe('points', 'Paragraphes du cours', c.resume.points, 'Ajouter un paragraphe'))}
      ${volet('retenir', aide('Les dernières pages de lecture avant les exercices.') +
        blocListe('formules', echapper(c.matiere.labelFormules), c.resume.formules, 'Ajouter un élément') +
        blocListe('pieges', 'Pièges fréquents', c.resume.pieges, 'Ajouter un piège'))}
      ${volet('exercices', aide('Chaque exercice devient une page, avec un bouton « Voir le corrigé ». Ils forment aussi le TP téléchargeable.') +
        blocListe('objectifs', 'Objectifs', c.tp.objectifs, 'Ajouter un objectif') +
        (exosApparies
          ? `<div id="exoListe">${c.tp.exercices.map((x, i) => carteExo(x, c.tp.corrige[i], i)).join('')}</div>
             <button type="button" class="pilule" id="ajoutExo">+ Ajouter un exercice</button>`
          : blocListe('exercices', 'Énoncés', c.tp.exercices, 'Ajouter un énoncé') +
            blocListe('corrige', 'Corrigés (affichés ensemble à la fin)', c.tp.corrige, 'Ajouter un corrigé')))}
      ${volet('qcm', aide('L’élève reçoit un tirage différent à chaque essai. Cochez le rond de la bonne réponse.') + `<div id="qcmEdit">${qcm.dessiner()}</div>`)}
      ${volet('videos', aide('<b>Sans lien, l’élève lit le chapitre page par page.</b> Dès qu’une séance a un lien YouTube, le chapitre passe en mode vidéo.') + `
        <div class="vid-tete"><span>Séance</span><span>Minutes</span><span>Lien YouTube</span></div>
        <div id="vidListe">${c.seances.map(ligneVideo).join('')}</div>
        <button type="button" class="pilule" id="ajoutSeance">+ Ajouter une séance</button>`)}`,
      async d => {
        const lue = nom => $$(`[data-liste="${nom}"] textarea`, corpsForm).map(t => t.value.trim()).filter(Boolean);
        const cartes = $$('.exo-edit', corpsForm)
          .map(f => [$('.e-enonce', f).value.trim(), $('.e-corrige', f).value.trim()]).filter(([en]) => en);
        qcm.lire(corpsForm);
        const seances = $$('.vid-ligne', corpsForm).map(l => ({
          id: l.dataset.id ? Number(l.dataset.id) : null,
          titre: $('.v-titre', l).value.trim(),
          duree: Number($('.v-duree', l).value) || 0,
          video: $('.v-lien', l).value.trim()
        })).filter(s => s.titre);
        await API.patch('/admin/chapitres/' + c.id, {
          titre: d.titre, numero: Number(d.numero), duree: Number(d.duree),
          difficulte: d.difficulte, accroche: d.accroche, publie: !!d.publie,
          notions: lue('notions'), seances,
          resume: { points: lue('points'), formules: lue('formules'), pieges: lue('pieges') },
          tp: { objectifs: lue('objectifs'),
            exercices: exosApparies ? cartes.map(x => x[0]) : lue('exercices'),
            corrige: exosApparies ? cartes.map(x => x[1] || 'Corrigé à venir.') : lue('corrige') }
        });
        if (qcm.etat.modifie) await API.put('/admin/chapitres/' + c.id + '/questions', { questions: qcm.questions });
        message('Chapitre enregistré.');
        rendreCatalogue();
      }, 'large editeur', corps => {
        corpsForm = corps;
        qcm.brancher(corps);
        corps.addEventListener('click', e => {
          const o = e.target.closest('[data-chap-onglet]');
          if (o) {
            $$('[data-chap-onglet]', corps).forEach(b => b.classList.toggle('actif', b === o));
            $$('[data-volet]', corps).forEach(v => { v.hidden = v.dataset.volet !== o.dataset.chapOnglet; });
            return;
          }
          const plus = e.target.closest('[data-ajout-item]');
          if (plus) {
            const hote = $('.liste-items', plus.closest('.liste-edit'));
            hote.insertAdjacentHTML('beforeend', itemListe(''));
            return hote.lastElementChild.querySelector('textarea').focus();
          }
          const moins = e.target.closest('[data-suppr-item]');
          if (moins) return moins.closest('.item-edit').remove();
          if (e.target.id === 'ajoutExo') {
            $('#exoListe', corps).insertAdjacentHTML('beforeend', carteExo('', ''));
            return $('#exoListe', corps).lastElementChild.querySelector('textarea').focus();
          }
          const moinsExo = e.target.closest('[data-suppr-exo]');
          if (moinsExo) return moinsExo.closest('.exo-edit').remove();
          if (e.target.id === 'ajoutSeance')
            return $('#vidListe', corps).insertAdjacentHTML('beforeend', ligneVideo({ titre: '', duree: 0 }));
          const s = e.target.closest('[data-suppr-seance]');
          if (s) s.closest('.vid-ligne').remove();
        });
      });
  }

  /* -------------------------------- paiements ----------------------------- */
  /* L'élève paie Cashevent School ; l'administration confirme, puis reverse à l'école. */
  async function rendrePaiements() {
    attente();
    const d = await API.get('/admin/paiements');
    const argent = (n, dev) => Number(n || 0).toLocaleString('fr-FR') + ' ' + echapper(dev || 'FCFA');
    const somme = l => l.reduce((s, x) => s + Number(x.montant || 0), 0);
    const parEcole = new Map();
    d.aReverser.forEach(x => { if (!parEcole.has(x.ecole_id)) parEcole.set(x.ecole_id, []); parEcole.get(x.ecole_id).push(x); });
    const ligne = (x, actions) => `<tr>
        <td><b>${echapper(x.eleve)}</b><small>${echapper(x.eleve_email)}</small></td>
        <td>${echapper(x.ecole)}</td>
        <td><b>${argent(x.montant, x.devise)}</b></td>
        <td>${x.reference_paiement ? echapper(x.reference_paiement) : '—'}</td>
        <td class="actions-ligne">${actions}</td></tr>`;
    vue.innerHTML = `
      <div class="tuiles">
        <div class="tuile"><div class="lab">Paiements à vérifier</div><div class="val">${d.declares.length}</div><div class="sous">déclarés par les élèves</div></div>
        <div class="tuile"><div class="lab">À reverser aux écoles</div><div class="val">${argent(somme(d.aReverser), d.aReverser[0] && d.aReverser[0].devise)}</div><div class="sous">${d.aReverser.length} paiement(s) · ${parEcole.size} école(s)</div></div>
        <div class="tuile"><div class="lab">Déjà reversés</div><div class="val">${d.reverses.length}</div><div class="sous">derniers reversements</div></div>
      </div>
      <section class="panneau paie-bloc">
        <h2>Où les élèves paient</h2>
        <p class="sous">Ces coordonnées sont affichées à chaque élève qui doit des frais, quelle que soit l’école${d.coordonneesDefinies ? '' : ' — <b class="alerte">pas encore renseignées</b>'}.</p>
        <form id="formCoordonnees" class="paie-form">
          <textarea class="champ" name="texte" rows="4" maxlength="2000" placeholder="Orange Money : 6XX XX XX XX (Cashevent School)&#10;MTN Mobile Money : 6XX XX XX XX&#10;Virement : banque, IBAN…">${d.coordonneesDefinies ? echapper(d.coordonnees) : ''}</textarea>
          <button class="pilule blanc" type="submit">Enregistrer les coordonnées</button>
        </form>
      </section>
      <section class="panneau paie-bloc">
        <h2>1. Paiements déclarés à vérifier</h2>
        <p class="sous">Vérifiez que l’argent est bien arrivé sur le compte de Cashevent avant de confirmer.</p>
        ${d.declares.length ? `<div class="table-defile"><table class="tableau tableau-plat"><thead><tr><th>Élève</th><th>École</th><th>Montant</th><th>Référence</th><th></th></tr></thead>
          <tbody>${d.declares.map(x => ligne(x, `<button class="pilule mini blanc" data-paie-ok="${x.id}">Argent reçu</button>
            <button class="mini danger" data-paie-non="${x.id}">Introuvable</button>`)).join('')}</tbody></table></div>` : '<p class="sous vide">Aucun paiement à vérifier.</p>'}
      </section>
      <section class="panneau paie-bloc">
        <h2>2. À reverser aux écoles</h2>
        <p class="sous">Faites le virement au numéro de l’école, puis marquez-le reversé.</p>
        ${parEcole.size ? [...parEcole.values()].map(l => `
          <div class="paie-ecole">
            <div class="paie-ecole-tete"><div><b>${echapper(l[0].ecole)}</b>
              <small>Numéro de reversement : ${l[0].numero_ecole ? echapper(l[0].numero_ecole) : '<b class="alerte">non renseigné par l’école</b>'}</small></div>
              <span class="paie-total">${argent(somme(l), l[0].devise)}</span>
              <button class="pilule blanc" data-reverser-ecole="${l[0].ecole_id}">Tout marqué reversé</button></div>
            <div class="table-defile"><table class="tableau tableau-plat"><tbody>${l.map(x => ligne(x, `<button class="pilule mini" data-reverse="${x.id}">Reversé</button>`)).join('')}</tbody></table></div>
          </div>`).join('') : '<p class="sous vide">Rien à reverser pour le moment.</p>'}
      </section>
      ${d.reverses.length ? `<section class="panneau paie-bloc"><h2>3. Derniers reversements</h2>
        <div class="table-defile"><table class="tableau tableau-plat"><tbody>${d.reverses.map(x => ligne(x,
          `<span class="sous">le ${dateFR(x.reverse_le)}</span> <button class="mini" data-reverse-annuler="${x.id}">Annuler</button>`)).join('')}</tbody></table></div></section>` : ''}`;

    $('#formCoordonnees').addEventListener('submit', async e => {
      e.preventDefault();
      try { await API.put('/admin/paiements/coordonnees', { texte: e.target.texte.value }); message('Coordonnées enregistrées : les élèves les voient déjà.'); rendrePaiements(); }
      catch (err) { message(err.message); }
    });
    gestionnaire = async e => {
      const t = e.target.closest('[data-paie-ok],[data-paie-non],[data-reverse],[data-reverse-annuler],[data-reverser-ecole]'); if (!t) return;
      t.disabled = true;
      try {
        if (t.dataset.paieOk) await API.post(`/admin/candidatures/${t.dataset.paieOk}/paiement`, { confirme: true });
        else if (t.dataset.paieNon) {
          if (!confirm('Le paiement est introuvable ? L’élève devra le déclarer à nouveau.')) { t.disabled = false; return; }
          await API.post(`/admin/candidatures/${t.dataset.paieNon}/paiement`, { confirme: false });
        }
        else if (t.dataset.reverse) await API.post(`/admin/candidatures/${t.dataset.reverse}/reverse`, { reverse: true });
        else if (t.dataset.reverseAnnuler) await API.post(`/admin/candidatures/${t.dataset.reverseAnnuler}/reverse`, { reverse: false });
        else if (t.dataset.reverserEcole) await API.post('/admin/paiements/reverser-ecole', { ecoleId: Number(t.dataset.reverserEcole) });
        message('C’est noté.'); rendrePaiements();
      } catch (err) { t.disabled = false; message(err.message); }
    };
  }

  /* ---------------------------- entrer dans un espace ---------------------- */
  /* L'administration entre dans le compte d'un enseignant ou d'un établissement et le gère. */
  async function rendreEspaces() {
    attente();
    const [{ utilisateurs: ens }, { utilisateurs: etabs }] = await Promise.all([
      API.get('/admin/utilisateurs?role=enseignant'), API.get('/admin/utilisateurs?role=etablissement')]);
    const carte = (u, role) => `<article class="esp-ligne" data-nom="${echapper((u.nom + ' ' + u.email).toLowerCase())}">
        <span class="esp-av">${echapper((u.nom || '?').trim()[0].toUpperCase())}</span>
        <span class="esp-txt"><b>${echapper(u.nom)}</b><small>${echapper(u.email)}${u.actif ? '' : ' · désactivé'}</small></span>
        <button class="pilule mini blanc" data-entrer="${u.id}" data-role="${role}">Entrer</button></article>`;
    const colonne = (titre, sous, liste, role) => `<section class="esp-col"><h2>${titre}</h2><p>${sous}</p>
        <div class="esp-liste">${liste.map(u => carte(u, role)).join('') || '<div class="vide-etat"><b>Aucun compte</b>Créez-en un depuis l’onglet Utilisateurs.</div>'}</div></section>`;
    vue.innerHTML = `
      <div class="esp-acces">
        <a class="esp-tuile" href="/ecole"><b>Vue élève</b><span>Le site tel que le voit un élève</span></a>
        <a class="esp-tuile" href="/espace-parent"><b>Vue parent</b><span>Le suivi de tous les enfants</span></a>
      </div>
      <input class="champ" id="espRecherche" type="search" placeholder="Chercher un nom ou un e-mail…" aria-label="Chercher un compte">
      <div class="esp-colonnes">
        ${colonne('Enseignants', 'Classes, élèves, suivis et TP de l’enseignant.', ens, 'enseignant')}
        ${colonne('Universités et écoles', 'Fiche d’admission et candidatures reçues.', etabs, 'etablissement')}
      </div>`;
    $('#espRecherche').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      $$('.esp-ligne').forEach(l => { l.hidden = !!q && !l.dataset.nom.includes(q); });
    });
    gestionnaire = async e => {
      const b = e.target.closest('[data-entrer]'); if (!b) return;
      try {
        await API.post('/admin/vue', { role: b.dataset.role, id: Number(b.dataset.entrer) });
        location.href = b.dataset.role === 'enseignant' ? '/espace-enseignant' : '/espace-etablissement';
      } catch (err) { message(err.message); }
    };
  }

  /* ----------------------------- suivi des élèves ------------------------- */
  async function rendreSuivi() {
    attente();
    const { enfants } = await API.get('/parent/enfants');
    vue.innerHTML = `
      <p class="sous" style="padding:0 0 14px">Tous les élèves inscrits, avec leur progression réelle.</p>
      <div class="grille-eleves">
        ${enfants.map(e => `
          <button class="carte-eleve" data-eleve="${e.id}">
            <span class="av">${echapper(e.nom[0].toUpperCase())}</span>
            <span class="txt"><b>${echapper(e.nom)}</b><small>${echapper(e.email)}</small></span>
            <span class="barre"><i style="width:${e.apercu.global}%"></i></span>
            <span class="chiffres">${e.apercu.global} % · ${e.apercu.faits}/${e.apercu.total} chapitres ·
              moyenne ${e.apercu.moyenne === null ? '—' : e.apercu.moyenne + ' %'}
              ${e.apercu.revoir ? ' · ' + e.apercu.revoir + ' à revoir' : ''}</span>
          </button>`).join('') || '<p class="sous">Aucun élève inscrit.</p>'}
      </div>
      <div id="detailEleve"></div>`;

    gestionnaire = async e => {
      const b = e.target.closest('[data-eleve]'); if (!b) return;
      $$('.carte-eleve').forEach(x => x.classList.toggle('active', x === b));
      const tb = await API.get('/admin/eleves/' + b.dataset.eleve + '/tableau-bord');
      $('#detailEleve').innerHTML = `
        <div class="panneau" style="margin-top:20px">
          <h2>${echapper(tb.eleve.nom)}</h2>
          <p class="sous">${tb.stats.faits} chapitres terminés sur ${tb.stats.total} ·
            moyenne ${tb.stats.moyenne === null ? '—' : tb.stats.moyenne + ' %'} ·
            ${tb.stats.revoir.length} chapitre(s) à revoir</p>
          ${tb.matieres.map(m => `
            <div class="ligne-mat"><span class="pt" style="background:${m.teinte}"></span>
              <span class="nom">${echapper(m.nom)}</span>
              <span class="barre"><i style="width:${m.avancement}%;background:${m.teinte}"></i></span>
              <span class="pc">${m.avancement} %</span></div>`).join('')}
          <div style="margin-top:16px">${tb.alertes.map(a =>
            `<div class="alerte ${a.ton}"><span class="ico">${a.icone}</span>
              <div><b>${a.titre}</b><p>${a.texte}</p></div></div>`).join('')}</div>
        </div>`;
      $('#detailEleve').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
  }

  /* -------------------------------- messages -------------------------------- */
  const SUJETS = {
    question: 'Question', erreur: 'Erreur signalée', compte: 'Compte',
    etablissement: 'Établissement', suggestion: 'Suggestion', autre: 'Autre'
  };
  const PROFILS = {
    eleve: 'Élève', parent: 'Parent', enseignant: 'Enseignant', etablissement: 'Établissement',
    etablissement: 'Établissement', autre: 'Autre'
  };
  let messagesEnAttente = false;

  async function rendreMessages() {
    attente();
    const d = await API.get('/contact/messages' + (messagesEnAttente ? '?traite=0' : ''));

    vue.innerHTML = `
      <div class="barre-outils">
        <div class="pills serres" id="filtreMessages">
          <button data-attente="0" class="${messagesEnAttente ? '' : 'active'}">Tous</button>
          <button data-attente="1" class="${messagesEnAttente ? 'active' : ''}">
            À traiter${d.compte.attente ? ' (' + d.compte.attente + ')' : ''}</button>
        </div>
      </div>

      ${d.messages.length ? d.messages.map(m => `
        <div class="message${m.traite ? ' traite' : ''}" data-message="${m.id}">
          <div class="message-tete">
            <span class="etiquette cat-compte">${SUJETS[m.sujet] || m.sujet}</span>
            <b>${echapper(m.nom)}</b>
            <span class="role-pastille role-eleve">${PROFILS[m.profil] || m.profil}</span>
            <a class="courriel" href="mailto:${echapper(m.email)}?subject=${
              encodeURIComponent('Re : votre message à Cashevent School')}">${echapper(m.email)}</a>
            <span class="quand">${dateFR(m.cree_le)}</span>
          </div>
          <p class="message-corps">${echapper(m.message)}</p>
          <div class="actions-ligne">
            <button class="mini" data-basculer-message="${m.id}">${
              m.traite ? 'Remettre à traiter' : 'Marquer traité'}</button>
            <button class="mini danger" data-suppr-message="${m.id}">Supprimer</button>
          </div>
        </div>`).join('')
        : `<div class="vide-etat"><b>Aucun message.</b>Les demandes envoyées depuis le
           formulaire de contact arrivent ici.</div>`}`;

    $('#filtreMessages').addEventListener('click', e => {
      const b = e.target.closest('[data-attente]'); if (!b) return;
      messagesEnAttente = b.dataset.attente === '1'; rendreMessages();
    });

    gestionnaire = async e => {
      const bascule = e.target.closest('[data-basculer-message]');
      if (bascule) {
        const id = Number(bascule.dataset.basculerMessage);
        const m = d.messages.find(x => x.id === id);
        try { await API.patch('/contact/messages/' + id, { traite: !m.traite }); rendreMessages(); }
        catch (err) { message(err.message); }
        return;
      }
      const sup = e.target.closest('[data-suppr-message]');
      if (sup) {
        if (!confirm('Supprimer définitivement ce message ?')) return;
        try { await API.supprimer('/contact/messages/' + Number(sup.dataset.supprMessage)); rendreMessages(); }
        catch (err) { message(err.message); }
      }
    };
  }

  /* --------------------------------- journal -------------------------------- */
  const CATEGORIES = {
    auth: 'Connexions', compte: 'Comptes',
    catalogue: 'Catalogue', apprentissage: 'Apprentissage'
  };
  let filtreCat = '', rechJournal = '', echecsSeuls = false;

  const quand = d => {
    const t = new Date(d), ecart = (Date.now() - t) / 1000;
    if (ecart < 60) return 'à l’instant';
    if (ecart < 3600) return 'il y a ' + Math.floor(ecart / 60) + ' min';
    if (ecart < 86400) return 'il y a ' + Math.floor(ecart / 3600) + ' h';
    return t.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' à ' +
           t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  async function rendreJournal() {
    attente();
    const params = new URLSearchParams();
    if (filtreCat) params.set('categorie', filtreCat);
    if (rechJournal) params.set('q', rechJournal);
    if (echecsSeuls) params.set('succes', '0');
    const d = await API.get('/admin/journal?' + params);

    const parCat = Object.fromEntries(d.chiffres.parCategorie.map(c => [c.categorie, c.n]));
    vue.innerHTML = `
      <div class="tuiles">
        <div class="tuile"><div class="lab">Événements (24 h)</div>
          <div class="val">${d.chiffres.dernieres24h}</div>
          <div class="sous">tracés sur l’ensemble de la plateforme</div></div>
        <div class="tuile"><div class="lab">Connexions (7 j)</div>
          <div class="val">${parCat.auth || 0}</div>
          <div class="sous">${d.chiffres.echecs7j} tentative(s) refusée(s)</div></div>
        <div class="tuile"><div class="lab">Apprentissage (7 j)</div>
          <div class="val">${parCat.apprentissage || 0}</div>
          <div class="sous">séances, QCM, TP</div></div>
        <div class="tuile"><div class="lab">Catalogue et comptes (7 j)</div>
          <div class="val">${(parCat.catalogue || 0) + (parCat.compte || 0)}</div>
          <div class="sous">modifications enregistrées</div></div>
      </div>

      <div class="barre-outils">
        <div class="pills serres" id="catJournal">
          <button data-cat="" class="${filtreCat ? '' : 'active'}">Tout</button>
          ${Object.entries(CATEGORIES).map(([v, l]) =>
            `<button data-cat="${v}" class="${filtreCat === v ? 'active' : ''}">${l}</button>`).join('')}
        </div>
        <input class="champ" id="rechJournal" type="search" placeholder="Nom, action, cible…"
          value="${echapper(rechJournal)}">
        <label class="case-outil"><input type="checkbox" id="echecs" ${echecsSeuls ? 'checked' : ''}>
          Échecs seulement</label>
      </div>

      <div class="tableau">
        <table>
          <thead><tr><th>Quand</th><th>Qui</th><th>Action</th><th>Objet</th>
            <th>Détail</th><th>Adresse</th></tr></thead>
          <tbody>${d.lignes.map(l => `
            <tr class="${l.succes ? '' : 'echec'}">
              <td class="quand-cell">${quand(l.cree_le)}</td>
              <td>${l.nom ? `<b>${echapper(l.nom)}</b>` : '<b class="anonyme">Visiteur</b>'}
                <span class="role-pastille role-${l.role === 'anonyme' ? 'eleve' : l.role}">${
                  { eleve: 'Élève', parent: 'Parent', admin: 'Admin', anonyme: 'Anonyme' }[l.role]}</span></td>
              <td><span class="etiquette cat-${l.categorie}">${CATEGORIES[l.categorie]}</span>
                ${echapper(l.action)}</td>
              <td>${echapper(l.cible || '—')}</td>
              <td class="detail">${echapper(l.details || '')}</td>
              <td class="ip">${echapper(l.ip || '')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        ${d.lignes.length ? '' : '<p class="sous vide">Aucun événement ne correspond à ce filtre.</p>'}
      </div>
      ${d.suivant ? '<div class="plus"><button class="pilule" id="plusJournal">Charger plus</button></div>' : ''}`;

    $('#catJournal').addEventListener('click', e => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      filtreCat = b.dataset.cat; rendreJournal();
    });
    let minuteur;
    $('#rechJournal').addEventListener('input', e => {
      clearTimeout(minuteur);
      minuteur = setTimeout(() => { rechJournal = e.target.value.trim(); rendreJournal(); }, 300);
    });
    $('#echecs').addEventListener('change', e => { echecsSeuls = e.target.checked; rendreJournal(); });

    const plus = $('#plusJournal');
    if (plus) plus.addEventListener('click', async () => {
      plus.disabled = true; plus.textContent = 'Chargement…';
      params.set('avant', d.suivant);
      const suite = await API.get('/admin/journal?' + params);
      $('.tableau tbody').insertAdjacentHTML('beforeend', suite.lignes.map(l => `
        <tr class="${l.succes ? '' : 'echec'}">
          <td class="quand-cell">${quand(l.cree_le)}</td>
          <td>${l.nom ? `<b>${echapper(l.nom)}</b>` : '<b class="anonyme">Visiteur</b>'}
            <span class="role-pastille role-${l.role === 'anonyme' ? 'eleve' : l.role}">${
              { eleve: 'Élève', parent: 'Parent', admin: 'Admin', anonyme: 'Anonyme' }[l.role]}</span></td>
          <td><span class="etiquette cat-${l.categorie}">${CATEGORIES[l.categorie]}</span>
            ${echapper(l.action)}</td>
          <td>${echapper(l.cible || '—')}</td>
          <td class="detail">${echapper(l.details || '')}</td>
          <td class="ip">${echapper(l.ip || '')}</td>
        </tr>`).join(''));
      plus.closest('.plus').remove();
    });
    gestionnaire = null;
  }

  /* ------------------------------- enseignants ---------------------------- */
  /* Ce que Cashevent doit à chaque enseignant, et la preuve de chaque suivi. */
  let moisRemu = null;
  const fcfa = n => Number(n).toLocaleString('fr-FR') + ' FCFA';
  const eur = n => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const moisFR = m => new Date(m + '-01T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const dateHeure = d => d ? new Date(d).toLocaleString('fr-FR',
    { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
  const STATUTS_SUIVI = { bonne_voie: 'En bonne voie', encourager: 'À encourager', aide: 'A besoin d’aide' };

  async function rendreEnseignants() {
    attente();
    const d = await API.get('/admin/remunerations' + (moisRemu ? '?mois=' + moisRemu : ''));
    moisRemu = d.mois;
    const possibles = d.enseignants.reduce((n, e) => n + e.eleves, 0);

    vue.innerHTML = `
      <div class="barre-outils">
        <label class="case-outil">Mois <input class="champ" type="month" id="moisRemu" value="${d.mois}"></label>
        <span class="sous">Tarif : ${fcfa(d.tarif.fcfa)} ≈ ${eur(d.tarif.eur)} par élève suivi, par matière.</span>
      </div>
      <div class="tuiles">
        <div class="tuile"><div class="lab">Enseignants inscrits</div><div class="val">${d.enseignants.length}</div></div>
        <div class="tuile"><div class="lab">Suivis possibles</div><div class="val">${possibles}</div>
          <div class="sous">désignations élève × matière</div></div>
        <div class="tuile"><div class="lab">Suivis faits — ${moisFR(d.mois)}</div><div class="val">${d.total.unites}</div></div>
        <div class="tuile"><div class="lab">À verser</div><div class="val">${fcfa(d.total.fcfa)}</div>
          <div class="sous">≈ ${eur(d.total.eur)}</div></div>
      </div>
      <div class="table-defile"><table class="tableau">
        <thead><tr><th>Enseignant</th><th>Code</th><th>Matières</th><th>Élèves</th>
          <th>Suivis faits</th><th>À verser</th><th></th></tr></thead>
        <tbody>${d.enseignants.map(e => `
          <tr>
            <td><b>${echapper(e.nom)}</b><small>${echapper(e.email)}${e.telephone ? ' · ' + echapper(e.telephone) : ''}</small></td>
            <td>${e.code ? echapper(e.code) : '—'}</td>
            <td class="fiche-mini">${echapper(e.matieres || '—')}</td>
            <td>${e.eleves}</td>
            <td>${e.suivis}</td>
            <td><b>${fcfa(e.du.fcfa)}</b><small>≈ ${eur(e.du.eur)}</small></td>
            <td class="actions-ligne">${e.suivis ? `<button class="mini" data-preuves="${e.id}">Preuves</button>` : ''}</td>
          </tr>`).join('')}</tbody>
      </table></div>
      ${d.enseignants.length ? '' : '<p class="sous vide">Aucun enseignant inscrit pour l’instant.</p>'}
      <p class="sous" style="margin-top:14px">Un suivi n’est compté que si l’enseignant a ouvert le dossier
        de l’élève dans le mois avant de l’enregistrer. Le détail de chaque suivi se consulte avant paiement.</p>`;

    $('#moisRemu').addEventListener('change', e => {
      if (e.target.value) { moisRemu = e.target.value; rendreEnseignants(); }
    });

    gestionnaire = async e => {
      const b = e.target.closest('[data-preuves]'); if (!b) return;
      const ens = d.enseignants.find(x => x.id === Number(b.dataset.preuves));
      let p;
      try { p = await API.get('/admin/remunerations/' + ens.id + '?mois=' + d.mois); }
      catch (err) { return message(err.message); }
      fenetre('Suivis de ' + ens.nom + ' — ' + moisFR(d.mois), `
        <p class="sous">${p.suivis.length} suivi(s) · ${fcfa(ens.du.fcfa)} à verser.</p>
        <div class="table-defile"><table class="tableau">
          <thead><tr><th>Élève</th><th>Matière</th><th>Avis</th><th>Dossier ouvert</th><th>Suivi enregistré</th></tr></thead>
          <tbody>${p.suivis.map(s => `<tr>
            <td><b>${echapper(s.eleve)}</b></td>
            <td>${echapper(s.matiere)}</td>
            <td>${STATUTS_SUIVI[s.statut] || echapper(s.statut)}${s.commentaire ? `<small>${echapper(s.commentaire)}</small>` : ''}</td>
            <td class="quand-cell">${dateHeure(s.consulte_le)}<small>${s.consultations} ouverture(s) dans le mois</small></td>
            <td class="quand-cell">${dateHeure(s.maj_le || s.cree_le)}</td>
          </tr>`).join('')}</tbody>
        </table></div>`, 'large');
    };
  }

  /* ------------------------------- abonnements ---------------------------- */
  /* Le paiement se fait hors ligne : le compte déclare sa référence, l'admin
     confirme ici et l'année démarre. Un abonnement peut aussi être accordé. */
  let etatAbo = 'en_attente';
  const FORMULE = { eleve: 'Élève', premium: 'Premium' };
  const PAIE_ABO = { en_attente: ['À payer', ''], declare: ['Déclaré', 'declare'], confirme: ['Reçu', 'confirme'] };
  async function rendreAbonnements() {
    attente();
    const d = await API.get('/admin/abonnements' + (etatAbo === 'tous' ? '' : '?etat=' + etatAbo));
    const c = d.compte;
    vue.innerHTML = `
      <div class="tuiles">
        <div class="tuile"><div class="lab">Demandes à traiter</div><div class="val">${Number(c.en_attente) || 0}</div>
          <div class="sous">${Number(c.declares) || 0} paiement(s) déclaré(s) à vérifier</div></div>
        <div class="tuile"><div class="lab">Abonnements actifs</div><div class="val">${Number(c.actifs) || 0}</div>
          <div class="sous">dont ${Number(c.premium) || 0} premium</div></div>
        <div class="tuile"><div class="lab">Encaissé sur les abonnements actifs</div><div class="val">${eur(c.encaisse || 0)}</div></div>
        <div class="tuile"><div class="lab">Barrière</div><div class="val petit">${d.obligatoires ? 'Abonnement obligatoire' : 'Accès libre (lancement)'}</div>
          <div class="sous">ABONNEMENTS_OBLIGATOIRES dans .env</div></div>
      </div>
      <div class="barre-outils">
        <div class="filtres-roles">${[['en_attente', 'À traiter'], ['actif', 'Actifs'], ['annule', 'Annulés'], ['tous', 'Tous']].map(([v, l]) =>
          `<button class="pilule mini ${etatAbo === v ? 'blanc' : ''}" data-etat-abo="${v}">${l}</button>`).join('')}</div>
        <button class="pilule blanc" data-accorder>Accorder un abonnement</button>
      </div>
      <div class="table-defile"><table class="tableau">
        <thead><tr><th>Compte</th><th>Formule</th><th>Montant</th><th>Paiement</th><th>Période</th><th>Demandé le</th><th></th></tr></thead>
        <tbody>${d.abonnements.map(a => `
          <tr>
            <td><b>${echapper(a.nom)}</b><small>${echapper(a.email)} · ${ROLES[a.role] || a.role}</small></td>
            <td><span class="etiquette ${a.formule}">${FORMULE[a.formule]}</span></td>
            <td>${eur(a.prix)}</td>
            <td><span class="etiquette paie-${a.paiement}">${PAIE_ABO[a.paiement][0]}</span>${a.reference_paiement ? `<small>${echapper(a.reference_paiement)}</small>` : ''}</td>
            <td>${a.etat === 'actif' ? `${dateFR(a.debut)} → ${dateFR(a.fin)}` : a.etat === 'annule' ? 'Annulé' : '—'}${a.note ? `<small>${echapper(a.note)}</small>` : ''}</td>
            <td class="quand-cell">${dateFR(a.cree_le)}</td>
            <td class="actions-ligne">
              ${a.etat === 'en_attente' ? `<button class="mini" data-confirmer="${a.id}">Confirmer le paiement</button>` : ''}
              ${a.etat !== 'annule' ? `<button class="mini danger" data-annuler-abo="${a.id}">Annuler</button>` : ''}
            </td>
          </tr>`).join('')}</tbody>
      </table></div>
      ${d.abonnements.length ? '' : '<p class="sous vide">Rien dans cette liste.</p>'}
      <p class="sous" style="margin-top:14px">Élève : ${eur(d.formules.eleve.prix)} par an, ouvre l’espace élève et les universités.
        Premium : ${eur(d.formules.premium.prix)} par an, ouvre en plus l’espace des parents et des enseignants référents de l’élève.</p>`;

    gestionnaire = async e => {
      const f = e.target.closest('[data-etat-abo]'), ok = e.target.closest('[data-confirmer]');
      const an = e.target.closest('[data-annuler-abo]'), acc = e.target.closest('[data-accorder]');
      if (f) { etatAbo = f.dataset.etatAbo; return rendreAbonnements(); }
      if (ok) {
        const a = d.abonnements.find(x => x.id === Number(ok.dataset.confirmer));
        return dialogue('Confirmer le paiement de ' + a.nom, `
          <p class="sous">${FORMULE[a.formule]} · ${eur(a.prix)}${a.reference_paiement ? ' · référence ' + echapper(a.reference_paiement) : ''}.
            L’abonnement démarre aujourd’hui (ou à la suite de l’abonnement en cours).</p>
          <label class="champ-libelle">Durée en mois <input class="champ" name="mois" type="number" min="1" max="60" value="12"></label>
          <label class="champ-libelle">Note (facultatif) <input class="champ" name="note" maxlength="300" placeholder="Virement reçu le…"></label>`,
          async v => { await API.post(`/admin/abonnements/${a.id}/confirmer`, { mois: Number(v.mois), note: v.note }); message('Abonnement activé.'); rendreAbonnements(); });
      }
      if (an) {
        if (!confirm('Annuler cet abonnement ? Le compte perdra la couverture correspondante.')) return;
        try { await API.supprimer('/admin/abonnements/' + an.dataset.annulerAbo); rendreAbonnements(); }
        catch (err) { message(err.message); }
      }
      if (acc) {
        let comptes = [];
        try { comptes = (await API.get('/admin/utilisateurs')).utilisateurs.filter(u => ['eleve', 'parent', 'enseignant'].includes(u.role)); }
        catch (err) { return message(err.message); }
        dialogue('Accorder un abonnement', `
          <label class="champ-libelle">Compte <select class="champ" name="utilisateurId" required>
            ${comptes.map(u => `<option value="${u.id}">${echapper(u.nom)} — ${ROLES[u.role]} (${echapper(u.email)})</option>`).join('')}
          </select></label>
          <label class="champ-libelle">Formule <select class="champ" name="formule">
            <option value="eleve">Élève — ${eur(d.formules.eleve.prix)} / an</option>
            <option value="premium" selected>Premium — ${eur(d.formules.premium.prix)} / an</option>
          </select></label>
          <label class="champ-libelle">Durée en mois <input class="champ" name="mois" type="number" min="1" max="60" value="12"></label>
          <label class="champ-libelle">Note <input class="champ" name="note" maxlength="300" placeholder="Offert, payé en espèces…"></label>`,
          async v => { await API.post('/admin/abonnements', { utilisateurId: Number(v.utilisateurId), formule: v.formule, mois: Number(v.mois), note: v.note }); message('Abonnement accordé.'); rendreAbonnements(); });
      }
    };
  }

  /* -------------------------------- exercices ----------------------------- */
  /* La relecture des séries générées reste à l'administration. */
  const NIVEAUX_EXO = { application: 'Application', entrainement: 'Entraînement', bac: 'Type bac' };

  async function rendreExercices() {
    attente();
    const { series } = await API.get('/admin/exercices');
    if (!series.length) {
      vue.innerHTML = `<div class="vide-etat"><b>Aucune série générée pour l’instant</b>
        Une série apparaît ici dès qu’un élève ouvre les exercices d’un chapitre.</div>`;
      gestionnaire = null;
      return;
    }
    const aRelire = series.filter(s => !s.valide).length;
    vue.innerHTML = `
      <p class="sous">${aRelire
        ? `<b>${aRelire} série(s) à relire.</b> Les élèves les voient déjà ; la validation indique qu’elles ont été vérifiées.`
        : 'Toutes les séries ont été relues.'}</p>
      <div class="panneau">${series.map(s => `
        <div class="ligne-chap">
          <span class="pastille-mat" style="background:${echapper(s.teinte)}"></span>
          <span class="nom"><b>${echapper(s.titre)}</b>
            <small>${echapper(s.matiere)} · chapitre ${s.numero} · ${NIVEAUX_EXO[s.niveau] || s.niveau} · ${dateFR(s.cree_le)}</small></span>
          ${s.valide ? `<span class="etiquette ok">Relue${s.relecteur ? ' par ' + echapper(s.relecteur) : ''}</span>`
            : '<span class="etiquette">À relire</span>'}
          <button class="mini" data-lire-serie="${s.id}">Lire</button>
        </div>`).join('')}</div>`;

    gestionnaire = async e => {
      const b = e.target.closest('[data-lire-serie]'); if (!b) return;
      let serie;
      try { ({ serie } = await API.get('/admin/exercices/' + b.dataset.lireSerie)); }
      catch (err) { return message(err.message); }

      const f = fenetre(serie.titre + ' — ' + (NIVEAUX_EXO[serie.niveau] || serie.niveau), `
        ${(serie.exercices || []).map((x, i) => `
          <article class="exo-relecture">
            <h3>${i + 1}. ${echapper(x.titre)} ${x.bareme ? `<span class="etiquette">${echapper(x.bareme)}</span>` : ''}</h3>
            <p>${echapper(x.enonce)}</p>
            ${x.donnees && x.donnees.length ? `<ul>${x.donnees.map(t => `<li>${echapper(t)}</li>`).join('')}</ul>` : ''}
            <div class="corrige-relecture"><b>Correction</b>
              <ol>${(x.correction.etapes || []).map(t => `<li>${echapper(t)}</li>`).join('')}</ol>
              <p><b>Réponse</b> ${echapper(x.correction.reponse)}</p>
            </div>
          </article>`).join('')}
        <label class="espace-haut" style="display:block">Remarque de relecture
          <input class="champ" id="noteSerie" maxlength="400" value="${echapper(serie.note || '')}"></label>
        <div class="rangee-boutons espace-haut">
          <button class="pilule blanc" type="button" data-valider-serie>Valider la série</button>
          <button class="pilule" type="button" data-refaire-serie>Faire une autre série</button>
        </div>`, 'large');

      f.fond.addEventListener('click', async ev => {
        if (ev.target.closest('[data-valider-serie]')) {
          try {
            await API.post('/admin/exercices/' + serie.id + '/valider', { note: $('#noteSerie').value });
            message('Série validée.'); f.fermer(); rendreExercices();
          } catch (err) { message(err.message); }
        }
        if (ev.target.closest('[data-refaire-serie]')) {
          if (!confirm('Remplacer cette série par une nouvelle ?')) return;
          message('Rédaction en cours, comptez une minute…');
          try {
            await API.post('/admin/exercices/' + serie.id + '/regenerer');
            message('Nouvelle série rédigée.'); f.fermer(); rendreExercices();
          } catch (err) { message(err.message); }
        }
      });
    };
  }

  /* Fenêtre de lecture : l'habillage des dialogues, sans formulaire à valider. */
  function fenetre(titre, corpsHTML, taille = '') {
    const fond = document.createElement('div');
    fond.className = 'dlg-fond';
    fond.innerHTML = `
      <div class="dlg ${taille}" role="dialog" aria-modal="true">
        <header><h2>${echapper(titre)}</h2>
          <button type="button" class="close" data-annuler aria-label="Fermer">${UI.ICO.croix}</button></header>
        <div class="dlg-corps">${corpsHTML}</div>
        <footer><button type="button" class="pilule" data-annuler>Fermer</button></footer>
      </div>`;
    document.body.appendChild(fond);
    document.body.style.overflow = 'hidden';
    const fermer = () => { fond.remove(); document.body.style.overflow = ''; };
    fond.addEventListener('click', e => {
      if (e.target === fond || e.target.closest('[data-annuler]')) fermer();
    });
    return { fond, fermer };
  }

  /* -------------------------------- dialogue ------------------------------ */
  function dialogue(titre, corpsHTML, valider, taille = '', apresRendu) {
    const fond = document.createElement('div');
    fond.className = 'dlg-fond';
    fond.innerHTML = `
      <form class="dlg ${taille}">
        <header><h2>${echapper(titre)}</h2>
          <button type="button" class="close" data-annuler aria-label="Fermer">${UI.ICO.croix}</button></header>
        <div class="dlg-corps">${corpsHTML}</div>
        <footer><button type="button" class="pilule" data-annuler>Annuler</button>
          <button class="pilule blanc" type="submit">Enregistrer</button></footer>
      </form>`;
    document.body.appendChild(fond);
    document.body.style.overflow = 'hidden';
    const fermer = () => { fond.remove(); document.body.style.overflow = ''; };
    fond.addEventListener('click', e => {
      if (e.target === fond || e.target.closest('[data-annuler]')) fermer();
    });
    const form = fond.querySelector('form');
    if (apresRendu) apresRendu(fond.querySelector('.dlg-corps'));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const donnees = {};
      new FormData(form).forEach((v, k) => donnees[k] = v);
      form.querySelectorAll('input[type=checkbox]').forEach(c => donnees[c.name] = c.checked);
      const bouton = form.querySelector('[type=submit]');
      bouton.disabled = true;
      try { await valider(donnees); fermer(); }
      catch (err) { message(err.message); bouton.disabled = false; }
    });
    const premier = form.querySelector('input,select,textarea');
    if (premier) premier.focus();
  }

  /* --------------------------------- routage ------------------------------ */
  async function rendre() {
    try {
      if (onglet === 'bord') await rendreBord();
      else if (onglet === 'utilisateurs') await rendreUtilisateurs();
      else if (onglet === 'catalogue') await rendreCatalogue();
      else if (onglet === 'messages') await rendreMessages();
      else if (onglet === 'journal') await rendreJournal();
      else if (onglet === 'enseignants') await rendreEnseignants();
      else if (onglet === 'exercices') await rendreExercices();
      else if (onglet === 'abonnements') await rendreAbonnements();
      else if (onglet === 'espaces') await rendreEspaces();
      else if (onglet === 'paiements') await rendrePaiements();
      else await rendreSuivi();
    } catch (e) { vue.innerHTML = `<div class="vide-etat"><b>Erreur</b>${e.message}</div>`; }
  }
  rendre();
})();
