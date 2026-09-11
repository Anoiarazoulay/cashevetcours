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
  const ROLES = { eleve: 'Élève', parent: 'Parent', admin: 'Admin' };

  /* --------------------------------- onglets ------------------------------ */
  const ONGLETS = [
    ['bord', 'Tableau de bord'], ['utilisateurs', 'Utilisateurs'],
    ['catalogue', 'Catalogue'], ['suivi', 'Suivi des élèves'],
    ['messages', 'Messages'], ['journal', 'Journal']
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
          ${[['', 'Tous'], ['eleve', 'Élèves'], ['parent', 'Parents'], ['admin', 'Administrateurs']]
            .map(([v, l]) => `<button data-role="${v}" class="${filtreRole === v ? 'active' : ''}">${l}</button>`).join('')}
        </div>
        <input class="champ" id="rech" type="search" placeholder="Nom ou e-mail…" value="${echapper(recherche)}">
        <button class="pilule blanc" id="nouveau">Nouveau compte</button>
      </div>

      <div class="tableau">
        <table>
          <thead><tr><th>Nom</th><th>Rôle</th><th>Rattachements</th><th>Progression</th>
            <th>Inscription</th><th>Dernière connexion</th><th>État</th><th></th></tr></thead>
          <tbody>${utilisateurs.map(u => `
            <tr data-utilisateur="${u.id}">
              <td><b>${echapper(u.nom)}</b><small>${echapper(u.email)}</small></td>
              <td><span class="role-pastille role-${u.role}">${ROLES[u.role]}</span></td>
              <td>${u.role === 'parent' ? u.enfants + ' enfant(s)'
                : u.role === 'eleve' ? u.parents + ' parent(s)' : '—'}</td>
              <td>${u.role === 'eleve' ? u.chapitres_finis + ' chapitres finis' : '—'}</td>
              <td>${dateFR(u.cree_le)}</td>
              <td>${dateFR(u.derniere_connexion)}</td>
              <td><span class="pastille ${u.actif ? 'ok' : 'off'}">${u.actif ? 'Actif' : 'Désactivé'}</span></td>
              <td class="actions-ligne">
                <button class="mini" data-modifier="${u.id}">Modifier</button>
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

  /* -------------------------------- catalogue ----------------------------- */
  async function rendreCatalogue() {
    attente();
    const [{ matieres }, { chapitres }] = await Promise.all([
      API.get('/admin/matieres'), API.get('/admin/chapitres')
    ]);

    vue.innerHTML = `
      <div class="barre-outils">
        <button class="pilule blanc" id="nouvMatiere">Nouvelle matière</button>
        <button class="pilule" id="nouvChapitre">Nouveau chapitre</button>
      </div>

      <div class="grille-matieres">
        ${matieres.map(m => `
          <div class="carte-matiere" style="--c1:${m.teinte};--c2:${m.teinte2}">
            <span class="g">${m.glyphe}</span>
            <b>${echapper(m.nom)}</b>
            <small>${m.chapitres} chapitres · ${m.questions} questions · coef. ${m.coefficient}</small>
            <div class="actions-ligne">
              <button class="mini" data-mat-modifier="${m.id}">Modifier</button>
              <button class="mini danger" data-mat-supprimer="${m.id}">Supprimer</button>
            </div>
          </div>`).join('')}
      </div>

      <div class="tableau" style="margin-top:24px">
        <table>
          <thead><tr><th>Matière</th><th>N°</th><th>Chapitre</th><th>Durée</th><th>Difficulté</th>
            <th>Séances</th><th>Questions</th><th>État</th><th></th></tr></thead>
          <tbody>${chapitres.map(c => `
            <tr>
              <td><span class="pt" style="background:${c.teinte}"></span>${echapper(c.matiere)}</td>
              <td>${c.numero}</td><td><b>${echapper(c.titre)}</b></td>
              <td>${c.duree} min</td><td>${c.difficulte}</td>
              <td>${c.seances}</td><td>${c.questions}</td>
              <td><span class="pastille ${c.publie ? 'ok' : 'off'}">${c.publie ? 'Publié' : 'Brouillon'}</span></td>
              <td class="actions-ligne">
                <button class="mini" data-chap-modifier="${c.id}">Contenu</button>
                <button class="mini" data-chap-qcm="${c.id}">QCM</button>
                <button class="mini danger" data-chap-supprimer="${c.id}">Supprimer</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    $('#nouvMatiere').addEventListener('click', () => formulaireMatiere(null));
    $('#nouvChapitre').addEventListener('click', () => formulaireNouveauChapitre(matieres));

    gestionnaire = async e => {
      const mm = e.target.closest('[data-mat-modifier]');
      if (mm) return formulaireMatiere(matieres.find(m => m.id === Number(mm.dataset.matModifier)));
      const ms = e.target.closest('[data-mat-supprimer]');
      if (ms) {
        const m = matieres.find(x => x.id === Number(ms.dataset.matSupprimer));
        if (!confirm(`Supprimer « ${m.nom} » et ses ${m.chapitres} chapitres ? Cette action est définitive.`)) return;
        try { await API.supprimer('/admin/matieres/' + m.id); message('Matière supprimée.'); rendreCatalogue(); }
        catch (err) { message(err.message); }
        return;
      }
      const cm = e.target.closest('[data-chap-modifier]');
      if (cm) return ouvrirChapitre(cm.dataset.chapModifier);
      const cq = e.target.closest('[data-chap-qcm]');
      if (cq) return ouvrirQCM(cq.dataset.chapQcm);
      const cs = e.target.closest('[data-chap-supprimer]');
      if (cs) {
        const c = chapitres.find(x => x.id === Number(cs.dataset.chapSupprimer));
        if (!confirm(`Supprimer le chapitre « ${c.titre} » ? Les progressions liées seront perdues.`)) return;
        try { await API.supprimer('/admin/chapitres/' + c.id); message('Chapitre supprimé.'); rendreCatalogue(); }
        catch (err) { message(err.message); }
      }
    };
  }

  function formulaireMatiere(m) {
    const creation = !m;
    dialogue(creation ? 'Nouvelle matière' : 'Modifier ' + m.nom, `
      ${creation ? '<label>Code (identifiant court, sans accent)<input class="champ" name="code" required></label>' : ''}
      <label>Nom<input class="champ" name="nom" value="${creation ? '' : echapper(m.nom)}" required></label>
      <label>Nom court<input class="champ" name="court" value="${creation ? '' : echapper(m.court)}"></label>
      <label>Professeur<input class="champ" name="professeur" value="${creation ? '' : echapper(m.professeur)}"></label>
      <label>Coefficient<input class="champ" name="coefficient" type="number" min="1" max="20"
        value="${creation ? 1 : m.coefficient}"></label>
      <div class="deux">
        <label>Couleur 1<input class="champ" name="teinte" type="color" value="${creation ? '#3b6ef5' : m.teinte}"></label>
        <label>Couleur 2<input class="champ" name="teinte2" type="color" value="${creation ? '#7b3bf5' : m.teinte2}"></label>
      </div>
      <label>Symbole<input class="champ" name="glyphe" maxlength="2" value="${creation ? '' : echapper(m.glyphe)}"></label>
      <label>Titre du bloc formules<input class="champ" name="labelFormules"
        value="${creation ? 'À retenir' : echapper(m.label_formules)}"></label>`,
      async d => {
        if (creation) await API.post('/admin/matieres', d);
        else await API.patch('/admin/matieres/' + m.id, d);
        message(creation ? 'Matière créée.' : 'Matière mise à jour.');
        rendreCatalogue();
      });
  }

  function formulaireNouveauChapitre(matieres) {
    dialogue('Nouveau chapitre', `
      <label>Matière<select class="champ" name="matiereId" required>
        ${matieres.map(m => `<option value="${m.id}">${echapper(m.nom)}</option>`).join('')}
      </select></label>
      <label>Titre<input class="champ" name="titre" required></label>
      <label>Durée totale de vidéo (minutes)<input class="champ" name="duree" type="number" min="0" value="40"></label>
      <label>Difficulté<select class="champ" name="difficulte">
        <option>Facile</option><option selected>Moyen</option><option>Difficile</option></select></label>
      <label>Accroche<textarea class="champ" name="accroche" rows="2"></textarea></label>`,
      async d => {
        const r = await API.post('/admin/chapitres', { ...d, matiereId: Number(d.matiereId), duree: Number(d.duree) });
        message('Chapitre créé. Complétez son contenu.');
        await rendreCatalogue();
        ouvrirChapitre(r.id);
      });
  }

  /* Édition complète du contenu d'un chapitre */
  async function ouvrirChapitre(id) {
    let c;
    try { c = (await API.get('/admin/chapitres/' + id)).chapitre; }
    catch (e) { return message(e.message); }

    const lignes = (t, nom, valeurs, aide) => `
      <label>${t}<small class="aide-champ">${aide}</small>
        <textarea class="champ mono" name="${nom}" rows="${Math.min(10, Math.max(3, valeurs.length + 1))}"
        >${echapper(valeurs.join('\n'))}</textarea></label>`;

    dialogue(`Chapitre ${c.n} — ${c.titre}`, `
      <div class="deux">
        <label>Titre<input class="champ" name="titre" value="${echapper(c.titre)}" required></label>
        <label>Numéro<input class="champ" name="numero" type="number" min="1" value="${c.n}"></label>
      </div>
      <div class="deux">
        <label>Durée (min)<input class="champ" name="duree" type="number" min="0" value="${c.duree}"></label>
        <label>Difficulté<select class="champ" name="difficulte">
          ${['Facile', 'Moyen', 'Difficile'].map(d =>
            `<option${d === c.difficulte ? ' selected' : ''}>${d}</option>`).join('')}
        </select></label>
      </div>
      <label>Accroche<textarea class="champ" name="accroche" rows="2">${echapper(c.accroche || '')}</textarea></label>
      <label class="case"><input type="checkbox" name="publie" ${c.publie ? 'checked' : ''}> Chapitre publié</label>
      ${lignes('Notions', 'notions', c.notions, 'une notion par ligne')}
      ${lignes('Séances vidéo', 'seances', c.seances.map(s => s.titre + ' | ' + s.duree),
        'une séance par ligne, au format « titre | durée en minutes »')}
      ${lignes('Résumé — points clés', 'points', c.resume.points, 'un point par ligne')}
      ${lignes('Résumé — formules', 'formules', c.resume.formules, 'une formule par ligne')}
      ${lignes('Résumé — pièges', 'pieges', c.resume.pieges, 'un piège par ligne')}
      ${lignes('TP — objectifs', 'objectifs', c.tp.objectifs, 'un objectif par ligne')}
      ${lignes('TP — énoncés', 'exercices', c.tp.exercices, 'un exercice par ligne')}
      ${lignes('TP — corrigé', 'corrige', c.tp.corrige, 'une réponse par ligne, dans le même ordre')}`,
      async d => {
        const decouper = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
        const seances = decouper(d.seances).map((l, i) => {
          const [titre, duree] = l.split('|').map(x => (x || '').trim());
          const ancienne = c.seances[i];
          return { id: ancienne ? ancienne.id : null, titre, duree: Number(duree) || 0 };
        });
        await API.patch('/admin/chapitres/' + c.id, {
          titre: d.titre, numero: Number(d.numero), duree: Number(d.duree),
          difficulte: d.difficulte, accroche: d.accroche, publie: !!d.publie,
          notions: decouper(d.notions), seances,
          resume: { points: decouper(d.points), formules: decouper(d.formules), pieges: decouper(d.pieges) },
          tp: { objectifs: decouper(d.objectifs), exercices: decouper(d.exercices), corrige: decouper(d.corrige) }
        });
        message('Chapitre enregistré.');
        rendreCatalogue();
      }, 'large');
  }

  /* Édition du questionnaire */
  async function ouvrirQCM(id) {
    let c;
    try { c = (await API.get('/admin/chapitres/' + id)).chapitre; }
    catch (e) { return message(e.message); }

    let questions = c.questions.map(q => ({ ...q, options: q.options.map(o => ({ ...o })) }));

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

    const lireFormulaire = corps => {
      $$('.question-edit', corps).forEach((f, i) => {
        questions[i].enonce = $('[data-champ="enonce"]', f).value;
        questions[i].explication = $('[data-champ="explication"]', f).value;
        $$('[data-option]', f).forEach((inp, j) => { if (questions[i].options[j]) questions[i].options[j].texte = inp.value; });
        $$('[data-bonne]', f).forEach((r, j) => { questions[i].options[j].correcte = r.checked; });
      });
    };

    dialogue(`QCM — ${c.titre}`, `<div id="qcmEdit">${dessiner()}</div>`,
      async () => {
        await API.put('/admin/chapitres/' + c.id + '/questions', { questions });
        message('Questionnaire enregistré.');
        rendreCatalogue();
      }, 'large', corps => {
        corps.addEventListener('click', e => {
          const zone = $('#qcmEdit', corps);
          const f = e.target.closest('.question-edit');
          if (e.target.id === 'ajoutQ') {
            lireFormulaire(corps);
            questions.push({ id: null, enonce: '', explication: '', options: [
              { texte: '', correcte: true }, { texte: '', correcte: false }, { texte: '', correcte: false }] });
            zone.innerHTML = dessiner(); return;
          }
          if (e.target.closest('[data-suppr-q]')) {
            lireFormulaire(corps);
            questions.splice(Number(e.target.closest('[data-suppr-q]').dataset.supprQ), 1);
            zone.innerHTML = dessiner(); return;
          }
          if (e.target.closest('[data-ajout-o]') && f) {
            lireFormulaire(corps);
            questions[Number(f.dataset.q)].options.push({ texte: '', correcte: false });
            zone.innerHTML = dessiner(); return;
          }
          const so = e.target.closest('[data-suppr-o]');
          if (so && f) {
            lireFormulaire(corps);
            const q = questions[Number(f.dataset.q)];
            if (q.options.length <= 2) return message('Une question doit garder au moins deux propositions.');
            q.options.splice(Number(so.dataset.supprO), 1);
            if (!q.options.some(o => o.correcte)) q.options[0].correcte = true;
            zone.innerHTML = dessiner();
          }
        });
        corps.addEventListener('submit', () => lireFormulaire(corps), true);
        corps.addEventListener('change', () => lireFormulaire(corps));
      });
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
    eleve: 'Élève', parent: 'Parent', enseignant: 'Enseignant',
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
      else await rendreSuivi();
    } catch (e) { vue.innerHTML = `<div class="vide-etat"><b>Erreur</b>${e.message}</div>`; }
  }
  rendre();
})();
