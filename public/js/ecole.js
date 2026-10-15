/* CASHEVENT SCHOOL — espace élève (accueil, matières, révisions, fiche chapitre, QCM)
   Toutes les données viennent de l'API ; rien n'est stocké dans le navigateur.        */
(async () => {
  const { $, $$, ICO, message, entete, pied, chargement, erreurFatale } = UI;
  const page = document.body.dataset.page || 'accueil';

  chargement(true);
  let moi, M = [], CHAP = [], S = { ch: {}, liste: [], jours: {}, debut: null };

  try {
    moi = await API.get('/auth/moi').then(r => r.utilisateur);
    const catalogue = await API.get('/catalogue');
    M = catalogue.matieres;
    if (moi.role === 'eleve') S = await API.get('/progression');
  } catch (e) {
    chargement(false);
    return erreurFatale(e.message);
  }
  const lectureSeule = moi.role !== 'eleve';

  /* Index à plat des chapitres, avec un renvoi vers leur matière */
  M.forEach(m => m.chapitres.forEach(c => { c.matiere = m; CHAP.push(c); }));
  const parId = id => CHAP.find(c => c.id === Number(id));

  entete(moi, page, { recherche: true, notifications: true });
  pied();
  document.body.insertAdjacentHTML('beforeend',
    '<div class="sheet-bg" id="sheetBg" role="dialog" aria-modal="true" aria-label="Fiche du chapitre"></div>');
  chargement(false);

  if (lectureSeule) document.body.insertAdjacentHTML('afterbegin',
    `<div class="bandeau-info">Vue élève en lecture seule — la progression n’est enregistrée que
     pour les comptes élèves.</div>`);

  /* Classement de la plateforme : chargé après coup, il ne retarde pas la page. */
  let POPULAIRES = [];
  API.get('/catalogue/populaires')
    .then(r => { POPULAIRES = r.populaires || []; if (page === 'accueil') rendre(); })
    .catch(() => { });

  /* Ce que les professeurs référents ont adressé à l'élève : TP et messages.
     Chargé après coup, comme le classement : la page n'attend pas. */
  let TRAVAUX = { tp: [], messages: [] };
  if (!lectureSeule) API.get('/professeurs/travaux')
    .then(r => { TRAVAUX = r; if (page === 'accueil') rendre(); })
    .catch(() => { });

  /* Les parcours de rattrapage de l'élève : lacunes prises en main, en cours ou comblées. */
  let PARCOURS = [];
  const chargerParcours = async () => {
    if (lectureSeule) return;
    try { PARCOURS = (await API.get('/rattrapage')).parcours; } catch (e) { PARCOURS = []; }
  };
  chargerParcours().then(() => rendre());
  const parcoursDe = id => PARCOURS.find(p => p.chapitre.id === Number(id) && p.etat === 'en_cours')
    || PARCOURS.find(p => p.chapitre.id === Number(id));

  /* Le projet de l'élève : son futur métier, actif ou non. */
  const metier = () => S.metier && S.metier.actif ? S.metier : null;
  const cible = id => { const m = metier(); return m ? m.chapitres[id] || null : null; };

  document.addEventListener('click', async e => {
    /* Le téléchargement suit le lien ; on met simplement la carte à jour. */
    const tp = e.target.closest('[data-tp-prof]');
    if (tp) {
      const t = TRAVAUX.tp.find(x => x.id === Number(tp.dataset.tpProf));
      if (t && !t.telecharge_le) setTimeout(() => { t.telecharge_le = new Date().toISOString(); rendre(); }, 800);
      return;
    }
    const lu = e.target.closest('[data-message-lu]');
    if (!lu) return;
    lu.disabled = true;
    try {
      await API.post('/professeurs/messages/' + lu.dataset.messageLu + '/lu');
      const m = TRAVAUX.messages.find(x => x.id === Number(lu.dataset.messageLu));
      if (m) m.lu_le = new Date().toISOString();
      rendre();
    } catch (err) { lu.disabled = false; message(err.message); }
  });

  /* ------------------------------ état local ------------------------------ */
  const etat = id => S.ch[id] || { seances: [], resume: false, tp: false, fini: false, avancement: 0, qcm: null };
  const pc = id => etat(id).avancement || 0;
  const termine = id => !!etat(id).fini;
  const aRevoir = id => { const q = etat(id).qcm; return !!q && q.pc < 60; };
  const commence = id => pc(id) > 0;
  const majEtat = (id, e) => { if (e) S.ch[id] = e; else delete S.ch[id]; };
  const resynchroniser = async () => { if (!lectureSeule) S = await API.get('/progression'); };

  const stats = () => {
    const notes = CHAP.map(c => etat(c.id).qcm).filter(Boolean);
    return {
      total: CHAP.length,
      faits: CHAP.filter(c => termine(c.id)).length,
      global: Math.round(CHAP.reduce((s, c) => s + pc(c.id), 0) / (CHAP.length || 1)),
      qcmFaits: notes.length,
      moyenne: notes.length ? Math.round(notes.reduce((s, q) => s + q.pc, 0) / notes.length) : null,
      revoir: CHAP.filter(c => aRevoir(c.id)),
      encours: CHAP.filter(c => commence(c.id) && !termine(c.id))
    };
  };

  /* --------------------------- cartes de chapitre -------------------------- */
  const styleMat = m => `--c1:${m.teinte};--c2:${m.teinte2}`;
  const carte = (c, avecMatiere = true) => {
    const p = pc(c.id);
    const badge = termine(c.id) ? '<span class="etat fini">Terminé</span>'
      : aRevoir(c.id) ? '<span class="etat revoir">À revoir</span>'
        : p > 0 ? '<span class="etat">En cours</span>' : '';
    /* Le métier activé illumine les chapitres qui comptent pour lui et estompe les autres. */
    const t = cible(c.id);
    const classeProjet = t ? ` cible poids-${t.poids}` : metier() ? ' hors-cible' : '';
    return `<button class="chap${c.image ? ' avec-image' : ''}${classeProjet}" style="${styleMat(c.matiere)}" data-chap="${c.id}">
      ${c.image ? `<img class="affiche" src="${c.image}" alt="" loading="lazy">` : ''}
      ${badge}${t ? `<span class="cible-badge" title="${txt(t.raison)}">★ ${t.libelle}</span>` : ''}<span class="g" aria-hidden="true">${c.matiere.glyphe}</span>
      <span class="n">Chapitre ${c.n}</span>
      <span class="mat">${avecMatiere ? c.matiere.court : c.duree + ' min'}</span>
      <span class="t">${c.titre}</span>
      <span class="foot"><span class="barre"><i style="width:${p}%"></i></span><span>${p} %</span></span>
    </button>`;
  };

  /* Carte du classement : le rang se lit avant le titre, comme sur une affiche. */
  const carteRang = (c, rang) => `<button class="chap rang${c.image ? ' avec-image' : ''}"
      style="${styleMat(c.matiere)}" data-chap="${c.id}">
      <span class="numero" aria-hidden="true">${rang}</span>
      <span class="vignette">
        ${c.image ? `<img class="affiche" src="${c.image}" alt="" loading="lazy">` : ''}
        <span class="g" aria-hidden="true">${c.matiere.glyphe}</span>
        <span class="t">${c.titre}</span>
        <span class="foot"><span class="barre"><i style="width:${pc(c.id)}%"></i></span></span>
      </span>
    </button>`;

  const rangee = (id, titre, items, sous = '') => `
    <section class="rowsec">
      <div class="rowhead"><h2>${titre}${sous ? ` <span class="rowhead-sous">${sous}</span>` : ''}</h2></div>
      <button class="arr l" data-track="${id}" data-dir="-1" aria-label="Précédent">${ICO.gauche}</button>
      <div class="track" id="${id}">${items.join('')}</div>
      <button class="arr r" data-track="${id}" data-dir="1" aria-label="Suivant">${ICO.fleche}</button>
    </section>`;

  /* ---------------------------- fiche chapitre ---------------------------- */
  const bg = $('#sheetBg');
  const cache = new Map();
  let courant = null, qcmClic = null;
  const finQCM = () => { if (qcmClic) { bg.removeEventListener('click', qcmClic, true); qcmClic = null; } };

  const detail = async id => {
    if (!cache.has(id)) cache.set(id, (await API.get('/chapitres/' + id)).chapitre);
    return cache.get(id);
  };

  /* Le bouton du parcours de rattrapage, selon où en est l'élève sur ce chapitre. */
  const boutonRattrapage = c => {
    const p = parcoursDe(c.id);
    const classe = p && p.etat === 'valide' ? ' valide' : '';
    const [titre, sous] = !p
      ? ['Parcours de rattrapage', 'Des lacunes ? Revoyez les prérequis des classes antérieures, puis refaites le QCM.']
      : p.etat === 'en_cours'
        ? [`Parcours en cours · ${p.validees}/${p.total} prérequis`, p.pretPourQCM ? 'Tout est validé : il reste à refaire le QCM du chapitre.' : 'Continuez : chaque fiche se lit en cinq minutes.']
        : p.etat === 'valide'
          ? ['Lacune comblée', `Parcours validé${p.scoreFinal !== null ? ' avec ' + p.scoreFinal + ' % au QCM' : ''}. Relancez-en un si besoin.`]
          : ['Parcours de rattrapage', 'Le dernier a été abandonné. Vous pouvez en relancer un.'];
    return `<button class="gros-bouton rattrapage${classe}" data-rattrapage>
      <span class="ico">${p && p.etat === 'valide' ? '✓' : '🧭'}</span>
      <span><b>${titre}</b><small>${sous}</small></span>
    </button>`;
  };

  const fiche = c => {
    const e = etat(c.id), p = pc(c.id), m = c.matiere;
    const q = e.qcm;
    const note = q
      ? `<div class="score-ligne${q.pc < 60 ? ' faible' : ''}">Dernier score : <b>${q.pc} %</b> · ${
          new Date(q.date).toLocaleDateString('fr-FR')}</div>` : '';
    const desactive = lectureSeule ? ' disabled' : '';
    const t = cible(c.id);

    return `<div class="sheet" style="${styleMat(m)}">
  <button class="close" aria-label="Fermer" data-fermer>${ICO.croix}</button>
  <div class="lecteur${c.image ? ' avec-image' : ''}" id="lecteur">
    ${c.image ? `<img class="affiche" src="${c.image}" alt="">` : ''}
    <span class="g" aria-hidden="true">${m.glyphe}</span>
    <button class="gros" data-lire aria-label="Lancer le cours en vidéo">${ICO.play}</button>
    <div class="habillage">
      <div class="num">${m.nom} · Chapitre ${c.n}</div>
      <h2>${c.titre}</h2>
    </div>
    <div class="avancee"><i style="width:${p}%"></i></div>
  </div>

  <div class="corps">
    <div class="actions">
      <button class="pilule blanc" data-lire${desactive}>${ICO.play} Lecture</button>
      <button class="pilule rond${S.liste.includes(c.id) ? ' on' : ''}" data-liste aria-label="Ajouter à ma liste"${desactive}>${ICO.plus}</button>
      <button class="pilule rond${e.fini ? ' on' : ''}" data-fini aria-label="Marquer le chapitre comme terminé"${desactive}>${ICO.check}</button>
      <span class="actions-fin">${p} % du chapitre</span>
    </div>

    <div class="colonnes">
      <div>
        <div class="meta-ligne">
          <span>${c.duree} min de vidéo</span><span>·</span><span>${c.seances.length} séances</span>
          <span class="puce diff">${c.difficulte}</span><span class="puce">Coef. ${m.coef}</span>
        </div>
        ${t ? `<div class="cible-ligne"><span>${metier().glyphe}</span>
          <span><b>★ ${t.libelle} pour devenir ${txt(metier().nom.toLowerCase())}</b> — ${txt(t.raison)}</span></div>` : ''}
        <p class="accroche">${c.accroche || ''}</p>

        <div class="bloc">
          <h3><span class="rep">4</span> Résumé écrit du cours</h3>
          <ul>${c.resume.points.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
        <div class="bloc formules">
          <h3>${m.labelFormules}</h3>
          <ul>${c.resume.formules.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
        <div class="bloc pieges">
          <h3>Pièges fréquents</h3>
          <ul>${c.resume.pieges.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
      </div>

      <div>
        <div class="fiche">
          <dl>
            <dt>Professeur</dt><dd>${m.prof}</dd>
            <dt>Matière</dt><dd>${m.nom}</dd>
            <dt>Notions travaillées</dt>
            <dd><div class="tags">${c.notions.map(n => `<span>${n}</span>`).join('')}</div></dd>
          </dl>
        </div>

        <button class="gros-bouton qcm" data-qcm${desactive}>
          <span class="ico">✦</span>
          <span><b>QCM assisté par IA</b><small>${c.nbQuestions} questions corrigées et expliquées</small>${note}</span>
          <span class="rep">2</span>
        </button>

        ${lectureSeule ? '' : boutonRattrapage(c)}

        <button class="gros-bouton exos" data-exos>
          <span class="ico">✎</span>
          <span><b>Exercices corrigés</b><small>Énoncés et corrections rédigés par l’assistant</small></span>
        </button>

        <button class="gros-bouton tp" data-tp>
          <span class="ico">⤓</span>
          <span><b>TP à télécharger</b><small>Énoncé + corrigé détaillé (.txt)${e.tp ? ' — déjà téléchargé' : ''}</small></span>
          <span class="rep">3</span>
        </button>

        <button class="gros-bouton" data-resume${desactive}>
          <span class="ico plat">✓</span>
          <span><b>${e.resume ? 'Résumé marqué comme lu' : 'Marquer le résumé comme lu'}</b>
            <small>Compte pour 10 % du chapitre</small></span>
        </button>
      </div>
    </div>

    <div class="seances">
      <h3><span class="rep">5</span> Séances du chapitre</h3>
      ${c.seances.map(s => `
        <button class="seance" data-seance="${s.id}">
          <span class="idx">${e.seances.includes(s.id) ? ICO.check : s.n}</span>
          <span class="vign">${s.video
            ? `<img src="${s.video.miniature}" alt="" loading="lazy">`
            : ''}<span class="jouer">${ICO.play}</span></span>
          <span class="txt"><b>${s.titre}</b>
            <small>${s.video
              ? `${s.video.titre}${s.video.chaine ? ' · ' + s.video.chaine : ''}`
              : 'Cours de répétition en vidéo'}</small></span>
          <span class="duree">${s.video && s.video.duree ? s.video.duree : s.duree + ' min'}</span>
        </button>`).join('')}
    </div>
  </div>
</div>`;
  };

  const ouvrir = async id => {
    finQCM();
    bg.classList.add('open'); document.body.style.overflow = 'hidden';
    bg.innerHTML = '<div class="sheet"><div class="chargement"><span class="rond"></span><p>Chargement…</p></div></div>';
    try {
      courant = await detail(id);
      courant.matiere = M.find(m => m.id === courant.matiere.id) || courant.matiere;
      bg.innerHTML = fiche(courant); bg.scrollTop = 0;
    } catch (e) {
      bg.innerHTML = `<div class="sheet"><div class="vide-etat"><b>Chapitre indisponible</b>${e.message}</div></div>`;
    }
  };
  const rafraichir = () => { finQCM(); if (courant) { const s = bg.scrollTop; bg.innerHTML = fiche(courant); bg.scrollTop = s; } rendre(); };
  const fermer = () => { finQCM(); bg.classList.remove('open'); document.body.style.overflow = ''; courant = null; rendre(); };

  bg.addEventListener('click', async e => {
    if (e.target === bg || e.target.closest('[data-fermer]')) return fermer();

    /* La fenêtre des métiers n'a pas de chapitre courant. */
    const choixMetier = e.target.closest('[data-metier-choix]');
    if (choixMetier) return choisirMetier(Number(choixMetier.dataset.metierChoix));

    if (!courant) return;
    const c = courant;
    const agir = async fn => { try { await fn(); } catch (err) { message(err.message); } };

    if (e.target.closest('[data-tp]')) return telechargerTP(c);

    /* Parcours de rattrapage : la liste des étapes, une fiche, ses réponses. */
    if (e.target.closest('[data-rattrapage]') || e.target.closest('[data-retour-parcours]')) return ouvrirParcours(c);
    if (e.target.closest('[data-lancer-parcours]')) return agir(async () => {
      const r = await API.post('/rattrapage/chapitre/' + c.id);
      await chargerParcours();
      message('Parcours lancé : ' + r.parcours.total + ' prérequis à revoir');
      ouvrirParcours(c);
    });
    const et = e.target.closest('[data-etape]');
    if (et) return ouvrirEtape(c, Number(et.dataset.parcours), Number(et.dataset.etape));
    if (e.target.closest('[data-abandonner-parcours]')) return agir(async () => {
      const p = parcoursDe(c.id);
      if (!p || !confirm('Abandonner ce parcours ? Vous pourrez en relancer un plus tard.')) return;
      await API.post('/rattrapage/' + p.id + '/abandonner');
      await chargerParcours(); message('Parcours abandonné'); rafraichir();
    });

    /* Les exercices se consultent aussi en lecture seule : un parent doit
       pouvoir regarder ce que son enfant travaille. */
    if (e.target.closest('[data-exos]')) return ouvrirExercices(c);
    const niv = e.target.closest('[data-niveau]');
    if (niv) return ouvrirExercices(c, niv.dataset.niveau);
    if (e.target.closest('[data-retour-fiche]')) return rafraichir();
    const corr = e.target.closest('[data-corrige]');
    if (corr) {
      const exo = corr.closest('.exo');
      const ouvert = exo.classList.toggle('ouvert');
      corr.textContent = ouvert ? 'Masquer la correction' : 'Voir la correction';
      return;
    }

    if (e.target.closest('[data-lire]')) {
      const suivante = c.seances.find(x => !etat(c.id).seances.includes(x.id)) || c.seances[0];
      return suivante && lireSeance(c, suivante);
    }
    if (lectureSeule) return;

    const s = e.target.closest('[data-seance]');
    if (s) return lireSeance(c, c.seances.find(x => x.id === Number(s.dataset.seance)));

    if (e.target.closest('[data-liste]')) return agir(async () => {
      const dedans = S.liste.includes(c.id);
      await (dedans ? API.supprimer('/progression/liste/' + c.id) : API.post('/progression/liste/' + c.id));
      S.liste = dedans ? S.liste.filter(x => x !== c.id) : [...S.liste, c.id];
      message(dedans ? 'Retiré de ma liste' : 'Ajouté à ma liste'); rafraichir();
    });

    if (e.target.closest('[data-fini]')) return agir(async () => {
      const r = await API.post('/progression/termine', { chapitreId: c.id, termine: !etat(c.id).fini });
      majEtat(c.id, r.etat);
      message(etat(c.id).fini ? 'Chapitre marqué comme terminé' : 'Chapitre rouvert'); rafraichir();
    });

    if (e.target.closest('[data-resume]')) return agir(async () => {
      const r = await API.post('/progression/resume', { chapitreId: c.id, lu: !etat(c.id).resume });
      majEtat(c.id, r.etat);
      message(etat(c.id).resume ? 'Résumé marqué comme lu' : 'Résumé à relire'); rafraichir();
    });

    if (e.target.closest('[data-qcm]')) return lancerQCM(c);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && bg.classList.contains('open')) fermer(); });

  /* Lance la vidéo dans la fiche, puis note la séance comme visionnée. */
  const lireSeance = async (c, seance) => {
    if (!seance) return;
    const lecteur = $('#lecteur', bg);
    if (seance.video && lecteur) {
      lecteur.classList.add('joue');
      lecteur.innerHTML = `
        <iframe src="https://www.youtube-nocookie.com/embed/${seance.video.id}?autoplay=1&rel=0&modestbranding=1"
          title="${(seance.video.titre || seance.titre).replace(/"/g, '&quot;')}"
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
      const barre = $('.seance-en-cours', bg);
      if (barre) barre.remove();
      lecteur.insertAdjacentHTML('afterend', `
        <div class="seance-en-cours">
          <span class="pastille">Séance ${seance.n}</span>
          <span class="t"><b>${seance.titre}</b>
            <small>${seance.video.titre}${seance.video.chaine ? ' · ' + seance.video.chaine : ''}</small></span>
          <a class="mini" href="${seance.video.url}" target="_blank" rel="noopener">Ouvrir sur YouTube</a>
        </div>`);
    } else if (!seance.video) {
      message('Aucune vidéo n’est encore rattachée à cette séance.');
    }
    if (lectureSeule) return;
    try {
      const r = await API.post('/progression/seance', { seanceId: seance.id });
      majEtat(c.id, r.etat);
      /* La fiche n'est pas redessinée : cela couperait la lecture en cours. */
      const carteEnCours = $$('.seance', bg).find(b => Number(b.dataset.seance) === seance.id);
      if (carteEnCours) carteEnCours.querySelector('.idx').innerHTML = ICO.check;
      const avancee = $('.avancee i', bg);
      if (avancee) avancee.style.width = pc(c.id) + '%';
      rendre();
    } catch (e) { message(e.message); }
  };

  /* Téléchargement réel : le serveur génère le document et note la consultation. */
  const telechargerTP = async c => {
    const a = document.createElement('a');
    a.href = '/api/chapitres/' + c.id + '/tp';
    a.download = '';
    document.body.appendChild(a); a.click(); a.remove();
    message('TP téléchargé : énoncé + corrigé');
    if (!lectureSeule) { await new Promise(r => setTimeout(r, 600)); await resynchroniser(); rafraichir(); }
  };

  /* ----------------------------- exercices IA ----------------------------- */
  /* Le texte vient d'un modèle : il est échappé avant d'entrer dans la page. */
  const txt = t => String(t == null ? '' : t)
    .replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));

  const NIVEAUX_EXO = [
    ['application', 'Application'],
    ['entrainement', 'Entraînement'],
    ['bac', 'Type bac']
  ];

  const ouvrirExercices = async (c, niveau = 'entrainement') => {
    finQCM();
    const enTete = `
      <button class="close" aria-label="Fermer" data-fermer>${ICO.croix}</button>
      <div class="lecteur court">
        <span class="g" aria-hidden="true">${c.matiere.glyphe}</span>
        <div class="habillage">
          <div class="num">${c.matiere.nom} · Chapitre ${c.n}</div><h2>${c.titre}</h2></div>
      </div>`;
    const onglets = `<div class="exos-niveaux">${NIVEAUX_EXO.map(([cle, nom]) =>
      `<button class="niv${cle === niveau ? ' on' : ''}" data-niveau="${cle}">${nom}</button>`).join('')}</div>`;

    const sheet = bg.querySelector('.sheet');
    sheet.innerHTML = enTete + `<div class="exos-vue">${onglets}
      <div class="chargement"><span class="rond"></span>
        <p>Préparation des exercices…<br><small>La première fois, l’assistant les rédige : comptez une minute.</small></p>
      </div></div>`;

    let serie;
    try {
      ({ serie } = await API.get('/chapitres/' + c.id + '/exercices?niveau=' + niveau));
    } catch (e) {
      sheet.innerHTML = enTete + `<div class="exos-vue">${onglets}
        <div class="vide-etat"><b>Exercices indisponibles</b>${txt(e.message)}</div>
        <div class="rangee-boutons"><button class="pilule" data-retour-fiche>Retour au chapitre</button></div>
      </div>`;
      return;
    }

    const exercices = (serie.exercices || []).map((x, i) => `
      <article class="exo">
        <header><span class="n">${i + 1}</span>
          <b>${txt(x.titre)}</b>
          ${x.bareme ? `<span class="bareme">${txt(x.bareme)}</span>` : ''}</header>
        <p class="enonce">${txt(x.enonce)}</p>
        ${x.donnees && x.donnees.length
          ? `<ul class="donnees">${x.donnees.map(d => `<li>${txt(d)}</li>`).join('')}</ul>` : ''}
        ${x.indice ? `<details class="indice"><summary>Un indice pour démarrer</summary>
             <p>${txt(x.indice)}</p></details>` : ''}
        <button class="pilule" data-corrige>Voir la correction</button>
        <div class="corrige">
          <ol>${(x.correction.etapes || []).map(t => `<li>${txt(t)}</li>`).join('')}</ol>
          <p class="reponse"><b>Réponse</b> ${txt(x.correction.reponse)}</p>
          ${x.correction.erreurs && x.correction.erreurs.length
            ? `<div class="erreurs"><b>Erreurs fréquentes</b>
                 <ul>${x.correction.erreurs.map(t => `<li>${txt(t)}</li>`).join('')}</ul></div>` : ''}
        </div>
      </article>`).join('');

    sheet.innerHTML = enTete + `<div class="exos-vue">${onglets}
      <div class="exos-tete"><b><span class="ia">✦</span> Exercices corrigés</b>
        <span class="compteur">${(serie.exercices || []).length} exercices · corrections détaillées</span></div>
      ${exercices}
      <div class="rangee-boutons">
        <button class="pilule blanc" data-qcm>Passer le QCM du chapitre</button>
        <button class="pilule" data-retour-fiche>Retour au chapitre</button>
      </div>
      <p class="exos-pied">Série rédigée par l’assistant à partir du résumé du chapitre.
        Signalez-nous toute erreur : elle sera corrigée.</p>
    </div>`;
    bg.scrollTop = 0;
  };

  /* ----------------------------- futur métier ----------------------------- */
  /* L'élève choisit le métier qu'il vise ; activé, il illumine le programme. */
  const enTeteSheet = (glyphe, sous, titre) => `
    <button class="close" aria-label="Fermer" data-fermer>${ICO.croix}</button>
    <div class="lecteur court">
      <span class="g" aria-hidden="true">${glyphe}</span>
      <div class="habillage"><div class="num">${sous}</div><h2>${titre}</h2></div>
    </div>`;

  const ouvrirMetiers = async () => {
    finQCM(); courant = null;
    bg.classList.add('open'); document.body.style.overflow = 'hidden';
    bg.innerHTML = '<div class="sheet"><div class="chargement"><span class="rond"></span><p>Chargement…</p></div></div>';
    let metiers;
    try { ({ metiers } = await API.get('/metiers')); }
    catch (e) { bg.innerHTML = `<div class="sheet"><div class="vide-etat"><b>Métiers indisponibles</b>${txt(e.message)}</div></div>`; return; }
    const actuel = S.metier ? S.metier.id : null;
    bg.innerHTML = `<div class="sheet" style="--c1:#8a5a00;--c2:#CD5CB4">
      ${enTeteSheet('★', 'Mon projet', 'Quel est ton futur métier ?')}
      <div class="metiers-vue">
        <p class="accroche">Choisis le métier dont tu rêves. Les chapitres qui comptent pour y arriver
          s’illuminent dans toutes les matières, avec la raison. Tu peux désactiver ou changer à tout moment.</p>
        <div class="metiers-grille">${metiers.map(m => `
          <button class="carte-metier${m.id === actuel ? ' on' : ''}" data-metier-choix="${m.id}">
            <span class="g" aria-hidden="true">${txt(m.glyphe)}</span>
            <b>${txt(m.nom)}</b>
            <small>${txt(m.description)}</small>
            <span class="n">${m.chapitres} chapitres · ${m.essentiels} essentiel${m.essentiels > 1 ? 's' : ''}${m.id === actuel ? ' · ton choix actuel' : ''}</span>
          </button>`).join('')}</div>
      </div>
    </div>`;
    bg.scrollTop = 0;
  };

  const choisirMetier = async (metierId, actif = true) => {
    try {
      const r = await API.put('/metiers/mien', { metierId, actif });
      S.metier = r.metier;
      message(metierId ? (actif ? `${r.metier.nom} : le programme s’illumine` : 'Métier désactivé : affichage normal') : 'Métier retiré');
    } catch (e) { return message(e.message); }
    bg.classList.remove('open'); document.body.style.overflow = ''; courant = null;
    rendre();
  };

  /* Le bandeau du projet, en tête de l'accueil. */
  const sectionProjet = () => {
    const m = S.metier;
    if (!m) return `
      <section class="projet vide">
        <span class="glyphe" aria-hidden="true">★</span>
        <div class="txt"><b>Quel est ton futur métier ?</b>
          <small>Choisis-le et le programme s’illumine : les chapitres qui comptent pour y arriver sont mis en avant, matière par matière.</small></div>
        <div class="actions"><button class="pilule or" data-choisir-metier>Choisir mon métier</button></div>
      </section>`;
    const ids = Object.keys(m.chapitres).map(Number);
    const total = ids.length, faits = ids.filter(id => termine(id)).length;
    const essentiels = ids.filter(id => m.chapitres[id].poids === 3);
    const essentielsFaits = essentiels.filter(id => termine(id)).length;
    const p = total ? Math.round(ids.reduce((s, id) => s + pc(id), 0) / total) : 0;
    return `
      <section class="projet${m.actif ? '' : ' inactif'}">
        <span class="glyphe" aria-hidden="true">${txt(m.glyphe)}</span>
        <div class="txt"><b>${m.actif ? 'Objectif : ' : 'Projet en pause : '}${txt(m.nom)}</b>
          <small>${faits}/${total} chapitres terminés · ${essentielsFaits}/${essentiels.length} essentiels · ${p} % du parcours${
            m.actif ? '' : ' · le programme s’affiche normalement'}</small>
          <div class="barre"><i style="width:${p}%"></i></div></div>
        <div class="actions">
          <button class="pilule ${m.actif ? 'or' : 'blanc'}" data-metier-toggle>${m.actif ? '✓ Activé' : 'Activer'}</button>
          <button class="pilule" data-choisir-metier>Changer</button>
        </div>
      </section>`;
  };

  /* ---------------------------- parcours de rattrapage -------------------- */
  const NIVEAU = n => `<span class="niveau-badge">${txt(n)}</span>`;
  const ETAT_ETAPE = { a_faire: 'À faire', a_revoir: 'À revoir', valide: 'Validé' };

  const ouvrirParcours = async c => {
    finQCM();
    const sheet = bg.querySelector('.sheet');
    const tete = enTeteSheet(c.matiere.glyphe, `${c.matiere.nom} · Chapitre ${c.n} · Rattrapage`, c.titre);
    sheet.innerHTML = tete + '<div class="chargement"><span class="rond"></span><p>Chargement…</p></div>';
    let d;
    try { d = await API.get('/rattrapage/chapitre/' + c.id); }
    catch (e) { sheet.innerHTML = tete + `<div class="vide-etat"><b>Parcours indisponible</b>${txt(e.message)}</div>`; return; }
    const p = d.parcours;

    const listePrerequis = `
      <div class="prerequis-liste">${d.prerequis.map((x, i) => `
        <div class="etape-ligne">
          <span class="num">${i + 1}</span>
          <span class="txt"><b>${txt(x.titre)}</b><small>${NIVEAU(x.niveau)}${txt(x.pourquoi)}</small></span>
        </div>`).join('')}</div>`;

    if (!p || p.etat !== 'en_cours') {
      const banniere = p && p.etat === 'valide'
        ? `<div class="conseil succes"><b>🎯 Lacune comblée</b>
             <p>Parcours validé${p.scoreFinal !== null ? ` avec ${p.scoreFinal} % au QCM` : ''}${p.scoreInitial !== null ? `, contre ${p.scoreInitial} % au départ` : ''}.
             Vous pouvez en relancer un à tout moment.</p></div>` : '';
      sheet.innerHTML = tete + `<div class="parcours-vue">
        <div class="exos-tete"><b><span class="ia">🧭</span> Parcours de rattrapage</b>
          <span class="compteur">${d.prerequis.length} prérequis des classes antérieures</span></div>
        ${banniere}
        <p class="accroche">Avant de retravailler ce chapitre, Cashevent School vérifie ce qu’il faut maîtriser
          des classes précédentes. Chaque fiche se lit en cinq minutes et se termine par trois questions.
          Quand tout est validé, vous refaites le QCM du chapitre.</p>
        ${d.prerequis.length ? listePrerequis : '<div class="vide-etat"><b>Aucune fiche pour ce chapitre</b>Les prérequis arrivent bientôt.</div>'}
        <div class="rangee-boutons">
          ${d.prerequis.length ? `<button class="pilule blanc" data-lancer-parcours>${p ? 'Relancer un parcours' : 'Lancer le parcours'}</button>` : ''}
          <button class="pilule" data-retour-fiche>Retour au chapitre</button>
        </div>
      </div>`;
      bg.scrollTop = 0;
      return;
    }

    const pcEtapes = Math.round(p.validees / p.total * 100);
    sheet.innerHTML = tete + `<div class="parcours-vue">
      <div class="exos-tete"><b><span class="ia">🧭</span> Parcours de rattrapage</b>
        <span class="compteur">${p.validees}/${p.total} prérequis validés${p.scoreInitial !== null ? ` · ${p.scoreInitial} % au QCM de départ` : ''}</span></div>
      <div class="barre parcours-barre"><i style="width:${pcEtapes}%"></i></div>
      ${p.pretPourQCM ? `<div class="conseil succes"><b>✓ Tous les prérequis sont validés</b>
        <p>Il reste la nouvelle évaluation : refaites le QCM du chapitre. Au-dessus de ${p.seuil} %, la lacune est comblée.</p>
        <button class="pilule blanc" data-qcm>Refaire le QCM du chapitre</button></div>`
        : `<p class="accroche">Lisez chaque fiche puis répondez aux questions. Une étape est validée à partir de deux bonnes réponses sur trois.</p>`}
      <div class="prerequis-liste">${p.etapes.map((x, i) => `
        <button class="etape-ligne ${x.etat}" data-etape="${x.id}" data-parcours="${p.id}">
          <span class="num">${x.etat === 'valide' ? ICO.check : i + 1}</span>
          <span class="txt"><b>${txt(x.titre)}</b>
            <small>${NIVEAU(x.niveau)}${ETAT_ETAPE[x.etat]}${x.score !== null && x.score !== undefined ? ' · ' + x.score + ' %' : ''}${x.essais > 1 ? ' · ' + x.essais + ' essais' : ''} · ${x.questions} questions</small></span>
          <span class="pilule mini-pilule">${x.etat === 'valide' ? 'Relire' : x.etat === 'a_revoir' ? 'Revoir' : 'Lire la fiche'}</span>
        </button>`).join('')}</div>
      <div class="rangee-boutons">
        <button class="pilule" data-retour-fiche>Retour au chapitre</button>
        <button class="pilule fantome" data-abandonner-parcours>Abandonner le parcours</button>
      </div>
    </div>`;
    bg.scrollTop = 0;
  };

  const ouvrirEtape = async (c, parcoursId, etapeId) => {
    finQCM();
    const sheet = bg.querySelector('.sheet');
    const tete = enTeteSheet(c.matiere.glyphe, `${c.matiere.nom} · Chapitre ${c.n} · Rattrapage`, c.titre);
    sheet.innerHTML = tete + '<div class="chargement"><span class="rond"></span><p>Chargement…</p></div>';
    let d;
    try { d = await API.get(`/rattrapage/${parcoursId}/etapes/${etapeId}`); }
    catch (e) { sheet.innerHTML = tete + `<div class="vide-etat"><b>Fiche indisponible</b>${txt(e.message)}</div>`; return; }
    const f = d.fiche, idx = d.parcours.etapes.findIndex(x => x.id === etapeId);
    const choix = new Map();

    sheet.innerHTML = tete + `<div class="parcours-vue fiche-prerequis">
      <div class="exos-tete"><b><span class="ia">🧭</span> Prérequis ${idx + 1} sur ${d.parcours.total}</b>
        <span class="compteur">${NIVEAU(f.niveau)}</span></div>
      <h3 class="titre-fiche">${txt(f.titre)}</h3>
      <p class="pourquoi">${txt(f.pourquoi)}</p>
      <div class="bloc"><h3>À retenir</h3><ul>${f.points.map(x => `<li>${txt(x)}</li>`).join('')}</ul></div>
      ${f.exemple ? `<div class="exemple"><b>Exemple</b>${txt(f.exemple)}</div>` : ''}
      ${f.pieges.length ? `<div class="bloc pieges"><h3>Pièges fréquents</h3><ul>${f.pieges.map(x => `<li>${txt(x)}</li>`).join('')}</ul></div>` : ''}

      <div class="mini-eval">
        <h3>Mini-évaluation</h3>
        <p class="sous">Répondez aux ${f.questions.length} questions, puis validez. Deux bonnes réponses valident l’étape.</p>
        ${f.questions.map((q, i) => `
          <div class="q" data-question="${q.id}">
            <p>${i + 1}. ${txt(q.enonce)}</p>
            <div class="reponses">${q.options.map((o, j) =>
              `<button class="rep-btn" data-choix="${o.i}" data-question-choix="${q.id}"><span class="l">${'ABC'[j]}</span><span>${txt(o.texte)}</span></button>`).join('')}</div>
            <div class="expli-etape" hidden></div>
          </div>`).join('')}
        <div class="rangee-boutons">
          <button class="pilule blanc" data-valider-etape disabled>Valider mes réponses</button>
          <button class="pilule" data-retour-parcours>Retour au parcours</button>
        </div>
        <div id="resultatEtape"></div>
      </div>
    </div>`;
    bg.scrollTop = 0;

    const valider = sheet.querySelector('[data-valider-etape]');
    const clic = async e => {
      const b = e.target.closest('[data-question-choix]');
      if (b && !b.disabled) {
        e.stopPropagation();
        const qid = Number(b.dataset.questionChoix);
        choix.set(qid, Number(b.dataset.choix));
        $$(`[data-question-choix="${qid}"]`, sheet).forEach(x => x.classList.toggle('choisi', x === b));
        valider.disabled = choix.size < f.questions.length;
        return;
      }
      if (e.target.closest('[data-valider-etape]')) {
        e.stopPropagation();
        valider.disabled = true;
        let r;
        try {
          r = await API.post(`/rattrapage/${parcoursId}/etapes/${etapeId}`,
            { reponses: [...choix].map(([questionId, ch]) => ({ questionId, choix: ch })) });
        } catch (err) { valider.disabled = false; return message(err.message); }
        for (const corr of r.corrections) {
          $$(`[data-question-choix="${corr.questionId}"]`, sheet).forEach(x => {
            x.disabled = true;
            const i = Number(x.dataset.choix);
            if (i === corr.bonne) x.classList.add('juste');
            else if (i === corr.choix) x.classList.add('faux');
          });
          const ex = sheet.querySelector(`[data-question="${corr.questionId}"] .expli-etape`);
          ex.hidden = false;
          ex.innerHTML = `<div class="expli"><b><span class="ia">✦</span> ${corr.correcte ? 'Bonne réponse' : 'Explication'}</b><p>${txt(corr.explication)}</p></div>`;
        }
        await chargerParcours();
        const pr = r.parcours;
        valider.closest('.rangee-boutons').hidden = true;
        $('#resultatEtape', sheet).innerHTML = `
          <div class="conseil ${r.valide ? 'succes' : ''}">
            <b>${r.valide ? '✓ Étape validée' : 'Étape à revoir'} · ${r.justes}/${r.total}</b>
            <p>${r.valide
              ? (pr.pretPourQCM ? 'Tous les prérequis sont validés : place à la nouvelle évaluation, le QCM du chapitre.'
                : `Encore ${pr.total - pr.validees} prérequis à valider.`)
              : 'Relisez la fiche, en particulier les pièges, puis retentez : il faut deux bonnes réponses sur trois.'}</p>
            <div class="rangee-boutons">
              ${pr.pretPourQCM ? '<button class="pilule blanc" data-qcm>Refaire le QCM du chapitre</button>'
                : r.valide && pr.prochaine ? `<button class="pilule blanc" data-etape="${pr.prochaine.id}" data-parcours="${pr.id}">Prérequis suivant</button>`
                : !r.valide ? `<button class="pilule blanc" data-etape="${etapeId}" data-parcours="${pr.id}">Retenter cette fiche</button>` : ''}
              <button class="pilule" data-retour-parcours>Retour au parcours</button>
            </div>
          </div>`;
        $('#resultatEtape', sheet).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        bg.removeEventListener('click', clic, true); qcmClic = null;
      }
    };
    finQCM(); qcmClic = clic;
    bg.addEventListener('click', clic, true);
  };

  /* ---------------------------------- QCM --------------------------------- */
  const lancerQCM = async c => {
    let session;
    try { session = await API.post('/chapitres/' + c.id + '/qcm'); }
    catch (e) { return message(e.message); }

    const qs = session.questions;
    let n = 0;

    const enTete = (titre, sous) => `
      <button class="close" aria-label="Fermer" data-fermer>${ICO.croix}</button>
      <div class="lecteur court">
        <span class="g" aria-hidden="true">${c.matiere.glyphe}</span>
        <div class="habillage"><div class="num">${sous}</div><h2>${titre}</h2></div>
      </div>`;

    const vue = () => {
      const q = qs[n];
      bg.querySelector('.sheet').innerHTML = enTete(c.titre, `${c.matiere.nom} · Chapitre ${c.n}`) + `
        <div class="qcm-vue">
          <div class="qcm-tete"><b>QCM assisté par IA</b>
            <span class="compteur">Question ${n + 1} sur ${qs.length}</span></div>
          <div class="barre"><i style="width:${n / qs.length * 100}%"></i></div>
          <p class="question">${q.enonce}</p>
          <div class="reponses">${q.options.map((o, i) =>
            `<button class="rep-btn" data-option="${o.id}"><span class="l">${'ABCD'[i]}</span><span>${o.texte}</span></button>`).join('')}</div>
          <div id="apres"></div>
        </div>`;
    };

    const repondre = async optionId => {
      const q = qs[n];
      $$('.rep-btn', bg).forEach(b => b.disabled = true);
      let r;
      try {
        r = await API.post('/qcm/' + session.tentative + '/reponse', { questionId: q.id, optionId });
      } catch (e) { $$('.rep-btn', bg).forEach(b => b.disabled = false); return message(e.message); }

      $$('.rep-btn', bg).forEach(b => {
        const id = Number(b.dataset.option);
        if (id === r.bonneOption) b.classList.add('juste');
        else if (id === optionId) b.classList.add('faux');
      });
      $('#apres', bg).innerHTML = `
        <div class="expli">
          <b><span class="ia">✦</span> ${r.correcte ? 'Bonne réponse' : 'Explication de l’assistant'}</b>
          <p>${r.explication}</p>
        </div>
        <button class="pilule blanc" data-suite>${n + 1 < qs.length ? 'Question suivante' : 'Voir mon bilan'} ${ICO.fleche}</button>`;
    };

    const bilan = async () => {
      let b;
      try { b = await API.post('/qcm/' + session.tentative + '/terminer'); }
      catch (e) { return message(e.message); }
      await resynchroniser();
      await chargerParcours();

      /* La lacune ouvre un parcours ; la réussite le valide. */
      const p = b.parcours;
      const carteParcours = b.parcoursValide
        ? `<div class="conseil succes"><b>🎯 Lacune comblée</b>
            <p>Vous aviez revu ${p.total} prérequis des classes antérieures ; ce QCM à ${b.score} % valide le parcours${
              p.scoreInitial !== null ? ` (${p.scoreInitial} % au départ)` : ''}. Vos parents le verront dans leur espace.</p></div>`
        : p && p.etat === 'en_cours'
          ? `<div class="conseil rattrapage"><b>🧭 Parcours de rattrapage${b.parcoursNouveau ? ' proposé' : ' en cours'}</b>
              <p>${b.parcoursNouveau
                ? `Ce score signale une lacune. Avant de retenter, revoyez ${p.total} prérequis des classes antérieures : ${p.etapes.map(x => '« ' + txt(x.titre) + ' »').join(', ')}.`
                : `${p.validees}/${p.total} prérequis validés. Continuez le parcours avant de retenter ce QCM.`}</p>
              <button class="pilule blanc" data-parcours>${b.parcoursNouveau ? 'Commencer le parcours' : 'Continuer le parcours'}</button></div>`
          : '';

      const couleur = b.score >= 80 ? 'var(--ok)' : b.score >= 60 ? 'var(--warn)' : 'var(--brand)';
      bg.querySelector('.sheet').innerHTML = enTete(c.titre, `${c.matiere.nom} · Chapitre ${c.n}`) + `
        <div class="qcm-vue">
          <div class="bilan">
            <div class="anneau" style="background:conic-gradient(${couleur} ${b.score * 3.6}deg,#2c2c31 0)">
              <span>${b.score} %</span></div>
            <h3>${b.justes} bonne${b.justes > 1 ? 's' : ''} réponse${b.justes > 1 ? 's' : ''} sur ${b.total}</h3>
            <p>${b.appreciation}</p>
          </div>
          ${carteParcours}
          <div class="conseil">
            <b><span class="ia">✦</span> Recommandations de l’assistant</b>
            <ul>${b.conseils.map(t => `<li>${t}</li>`).join('')}</ul>
          </div>
          <div class="rangee-boutons">
            <button class="pilule blanc" data-refaire>Refaire le QCM</button>
            <button class="pilule" data-retour>Retour au chapitre</button>
            <button class="pilule" data-tp>Télécharger le TP</button>
          </div>
        </div>`;
    };

    const clic = e => {
      const r = e.target.closest('[data-option]');
      if (r && !r.disabled) return repondre(Number(r.dataset.option));
      if (e.target.closest('[data-suite]')) { n++; return n < qs.length ? vue() : bilan(); }
      if (e.target.closest('[data-refaire]')) { finQCM(); return lancerQCM(c); }
      if (e.target.closest('[data-retour]')) { finQCM(); return rafraichir(); }
      if (e.target.closest('[data-parcours]')) { e.stopPropagation(); finQCM(); return ouvrirParcours(c); }
    };
    finQCM(); qcmClic = clic;
    bg.addEventListener('click', clic, true);
    vue();
  };

  /* ------------------------------ rendu des pages ------------------------- */
  /* Une carte de parcours en cours : où il en est, et un bouton pour y retourner. */
  const carteParcoursAccueil = p => `
    <article class="carte-prof parcours">
      <span class="etiquette-mat" style="--c1:${txt(p.chapitre.matiere.teinte)}">${txt(p.chapitre.matiere.nom)}</span>
      <b>${txt(p.chapitre.titre)}</b>
      <small>${p.validees}/${p.total} prérequis validés${p.scoreInitial !== null ? ' · ' + p.scoreInitial + ' % au QCM de départ' : ''}</small>
      <span class="barre"><i style="width:${Math.round(p.validees / p.total * 100)}%"></i></span>
      <button class="pilule${p.pretPourQCM ? ' blanc' : ''}" data-parcours-chap="${p.chapitre.id}">${p.pretPourQCM ? 'Refaire le QCM' : 'Continuer'}</button>
    </article>`;

  const ouvrirParcoursChapitre = async id => {
    await ouvrir(id);
    if (courant) ouvrirParcours(courant);
  };

  const dernierChapitre = () => {
    const commences = CHAP.filter(c => etat(c.id).maj)
      .sort((a, b) => new Date(etat(b.id).maj) - new Date(etat(a.id).maj));
    return commences.find(c => !termine(c.id)) || CHAP.find(c => !commence(c.id)) || commences[0] || CHAP[0];
  };

  const rendreAccueil = () => {
    const c = dernierChapitre(); if (!c) return;
    const p = pc(c.id), s = stats();
    const suite = c.seances.find(x => !etat(c.id).seances.includes(x.id));
    $('#reprise').outerHTML = `
      <section class="reprise${c.image ? ' avec-image' : ''}" style="${styleMat(c.matiere)}" id="reprise">
        ${c.image ? `<img class="affiche" src="${c.image}" alt="">` : ''}
        <span class="glyphe" aria-hidden="true">${c.matiere.glyphe}</span>
        <div class="inner">
          <span class="kicker">${p > 0 ? 'Reprendre le cours' : 'Commencer le programme'}</span>
          <h1>${c.titre}</h1>
          <div class="matiere-nom">${c.matiere.nom} · Chapitre ${c.n} · ${moi.niveau || ''}</div>
          <div class="barre"><i style="width:${p}%"></i></div>
          <div class="barre-legende"><span>${p} % du chapitre</span>
            <span>${suite ? 'Prochaine séance : ' + suite.titre : 'Toutes les séances vues'}</span></div>
          <p>${c.accroche || ''}</p>
          <div class="actions">
            <button class="pilule blanc" data-ouvrir="${c.id}">${ICO.play} ${p > 0 ? 'Reprendre' : 'Commencer'}</button>
            <a class="pilule" href="/matieres"><span class="long">Parcourir les matières</span><span class="court">Matières</span></a>
            <a class="pilule" href="/revisions"><span class="long">Mes révisions</span><span class="court">Révisions</span></a>
          </div>
        </div>
      </section>`;

    const rows = [];
    /* Le projet d'abord : le métier visé, puis les chapitres qui y mènent. */
    if (!lectureSeule) rows.push(sectionProjet());
    const m = metier();
    if (m) {
      const vises = Object.keys(m.chapitres).map(Number).map(parId).filter(Boolean)
        .sort((a, b) => (m.chapitres[b.id].poids - m.chapitres[a.id].poids) || (termine(a.id) - termine(b.id)));
      if (vises.length) rows.push(rangee('metier', `Pour devenir ${txt(m.nom.toLowerCase())}`, vises.map(x => carte(x)),
        `· ${vises.length} chapitres · ${vises.filter(x => m.chapitres[x.id].poids === 3).length} essentiels`));
    }
    const enCoursParcours = PARCOURS.filter(p => p.etat === 'en_cours');
    if (enCoursParcours.length) rows.push(`
      <section class="rowsec parcours-rangee">
        <div class="rowhead"><h2>Mes parcours de rattrapage <span class="rowhead-sous">· ${enCoursParcours.length} en cours</span></h2></div>
        <div class="profs-grille">${enCoursParcours.map(carteParcoursAccueil).join('')}</div>
      </section>`);
    if (s.encours.length) rows.push(rangee('encours', 'Continuer mes chapitres', s.encours.slice(0, 12).map(x => carte(x))));

    /* Top 10 : l'ordre vient de l'activité réelle de tous les élèves. */
    const classement = POPULAIRES.map(p => parId(p.id)).filter(Boolean);
    if (classement.length >= 3)
      rows.push(rangee('top10', 'Top 10 des chapitres les plus travaillés',
        classement.map((x, i) => carteRang(x, i + 1)), '· sur toute la plateforme'));
    if (s.revoir.length) rows.push(rangee('revoir', 'À revoir en priorité', s.revoir.map(x => carte(x)), '· score inférieur à 60 %'));
    M.forEach(m => rows.push(rangee('r-' + m.id, m.nom, m.chapitres.map(x => carte(x, false)),
      `· ${m.chapitres.length} chapitres · coef. ${m.coef}`)));
    /* Ce que les professeurs ont envoyé passe avant tout le reste. Leurs noms,
       titres et messages sont saisis par eux : tout est échappé. */
    const nonLus = TRAVAUX.messages.filter(m => !m.lu_le);
    const aRecuperer = TRAVAUX.tp.filter(t => !t.telecharge_le).length;
    const jourLong = j => new Date(j + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    if (nonLus.length || TRAVAUX.tp.length) rows.unshift(`
      <section class="de-mes-profs">
        <div class="rowhead"><h2>De vos professeurs <span class="rowhead-sous">· ${
          aRecuperer ? aRecuperer + ' TP à récupérer' : 'TP et messages'}</span></h2></div>
        <div class="profs-grille">
          ${nonLus.map(m => `
            <article class="carte-prof message ${txt(m.statut)}">
              <span class="etiquette-mat" style="--c1:${txt(m.teinte)}">${txt(m.matiere)}</span>
              <b>${txt(m.enseignant)}</b>
              <p>${txt(m.commentaire)}</p>
              <button class="pilule" data-message-lu="${m.id}">J’ai lu</button>
            </article>`).join('')}
          ${TRAVAUX.tp.slice(0, 6).map(t => `
            <article class="carte-prof tp${t.telecharge_le ? ' recupere' : ''}">
              <span class="etiquette-mat" style="--c1:${txt(t.teinte)}">${txt(t.matiere)}</span>
              <b>${txt(t.titre)}</b>
              <small>${txt(t.enseignant)}${t.echeance ? ' · à rendre le ' + jourLong(t.echeance) : ''}</small>
              ${t.consigne ? `<p>${txt(t.consigne)}</p>` : ''}
              <a class="pilule${t.telecharge_le ? '' : ' blanc'}" href="/api/professeurs/travaux/${t.id}/fichier"
                data-tp-prof="${t.id}">${t.telecharge_le ? 'Télécharger à nouveau' : 'Télécharger le TP'}</a>
            </article>`).join('')}
        </div>
      </section>`);

    $('[data-rows]').innerHTML = rows.join('');
  };

  const rendreMatieres = () => {
    const hote = $('[data-matieres]'); if (!hote) return;
    const sel = sessionStorage.getItem('cashevent:matiere') || 'toutes';
    $('#pills').innerHTML =
      `<button class="${sel === 'toutes' ? 'active' : ''}" data-m="toutes">Toutes les matières</button>` +
      M.map(m => `<button class="${sel === m.id ? 'active' : ''}" data-m="${m.id}" style="--c1:${m.teinte}">
        <span class="pt"></span>${m.nom}</button>`).join('');
    const matiere = M.find(m => m.id === sel);
    const liste = matiere ? matiere.chapitres : CHAP;
    hote.innerHTML = liste.map(c => carte(c)).join('');
    $('#compte').textContent = `${liste.length} chapitre${liste.length > 1 ? 's' : ''} · ` +
      `${liste.reduce((s, c) => s + c.duree, 0)} minutes de vidéo`;
    $$('#pills button').forEach(b => b.addEventListener('click', () => {
      sessionStorage.setItem('cashevent:matiere', b.dataset.m); rendreMatieres();
    }));
  };

  const rendreRevisions = () => {
    const s = stats();
    const bloc = (titre, sous, items) => items.length
      ? `<h2 class="section-title petit">${titre}</h2><p class="subtitle">${sous}</p>
         <div class="chapgrid">${items.map(c => carte(c)).join('')}</div>` : '';
    let html = '';
    const enCoursParcours = PARCOURS.filter(p => p.etat === 'en_cours');
    if (enCoursParcours.length) html += `<h2 class="section-title petit">Parcours de rattrapage</h2>
      <p class="subtitle">Les lacunes prises en main : revoyez les prérequis, puis refaites le QCM du chapitre.</p>
      <div class="profs-grille grille-page">${enCoursParcours.map(carteParcoursAccueil).join('')}</div>`;
    html += bloc('À revoir en priorité', 'Chapitres dont le dernier score au QCM est inférieur à 60 %.', s.revoir);
    html += bloc('À terminer', 'Chapitres commencés qu’il reste à finir.', s.encours);
    html += bloc('Ma liste', 'Chapitres que vous avez mis de côté.', S.liste.map(parId).filter(Boolean));
    html += bloc('Prochaines étapes suggérées', 'Chapitres pas encore ouverts, dans l’ordre du programme.',
      CHAP.filter(c => !commence(c.id)).slice(0, 8));
    $('[data-revisions]').innerHTML = html || `<div class="vide-etat">
      <b>Rien à revoir pour l’instant.</b>Commencez un chapitre depuis l’accueil :
      les QCM et les chapitres inachevés apparaîtront ici automatiquement.</div>`;
  };

  /* La cloche : messages et TP des professeurs d'abord, chapitres à revoir ensuite. */
  const ilYa = d => {
    if (!d) return '';
    const j = Math.floor((Date.now() - new Date(d)) / 86400000);
    return j <= 0 ? 'Aujourd’hui' : j === 1 ? 'Hier' : j < 7 ? `Il y a ${j} jours`
      : new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  };
  const majNotifications = () => {
    const liste = [];
    TRAVAUX.messages.filter(m => !m.lu_le).forEach(m => liste.push({
      initiale: (m.enseignant || '?').trim()[0].toUpperCase(), teinte: m.teinte,
      titre: 'Message de ' + m.enseignant, texte: m.matiere + ' — ' + m.commentaire, quand: ilYa(m.le),
      action: async () => {
        try {
          await API.post('/professeurs/messages/' + m.id + '/lu');
          m.lu_le = new Date().toISOString();
          message(m.enseignant + ' : ' + m.commentaire);
          rendre();
        } catch (err) { message(err.message); }
      }
    }));
    TRAVAUX.tp.filter(t => !t.telecharge_le).forEach(t => liste.push({
      initiale: 'TP', teinte: t.teinte, titre: 'Nouveau TP · ' + t.matiere,
      texte: t.titre + (t.echeance ? ' — à rendre le ' +
        new Date(t.echeance + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : ''),
      quand: ilYa(t.cree_le) + ' · ' + t.enseignant,
      href: '/api/professeurs/travaux/' + t.id + '/fichier',
      action: () => setTimeout(() => { t.telecharge_le = new Date().toISOString(); rendre(); }, 800)
    }));
    PARCOURS.filter(p => p.etat === 'en_cours').forEach(p => liste.push({
      initiale: '🧭', teinte: p.chapitre.matiere.teinte,
      titre: (p.pretPourQCM ? 'Prêt pour le QCM · ' : 'Rattrapage · ') + p.chapitre.titre,
      texte: p.pretPourQCM ? 'Tous les prérequis sont validés : refaites le QCM du chapitre.'
        : `${p.validees}/${p.total} prérequis validés. Continuez le parcours.`,
      quand: p.chapitre.matiere.nom,
      action: () => ouvrirParcoursChapitre(p.chapitre.id)
    }));
    stats().revoir.forEach(c => liste.push({
      image: c.image, initiale: c.matiere.glyphe, teinte: c.matiere.teinte,
      titre: 'À revoir · ' + c.titre,
      texte: `Dernier score au QCM : ${etat(c.id).qcm.pc} %. Relisez le résumé, puis refaites le QCM.`,
      quand: c.matiere.nom + ' · chapitre ' + c.n,
      action: () => ouvrir(c.id)
    }));
    UI.notifications(liste);
  };

  const rendre = () => {
    majNotifications();
    if (page === 'accueil') rendreAccueil();
    if (page === 'matieres') rendreMatieres();
    if (page === 'revisions') rendreRevisions();
  };
  rendre();

  /* ------------------------------ interactions ---------------------------- */
  /* Lien direct vers un chapitre (#chapitre-12) ou un parcours (#rattrapage-12) :
     utilisé par la cloche et les autres pages. #metier ouvre le choix du métier. */
  const ancre = location.hash.match(/^#(chapitre|rattrapage)-(\d+)$/);
  if (ancre && parId(ancre[2])) (ancre[1] === 'rattrapage' ? ouvrirParcoursChapitre : ouvrir)(Number(ancre[2]));
  if (location.hash === '#metier' && !lectureSeule) ouvrirMetiers();

  const sb = $('#searchbar'), q = $('#q');
  if (sb) {
    $('#searchBtn').addEventListener('click', () => {
      sb.classList.toggle('open'); if (sb.classList.contains('open')) q.focus();
    });
    sb.addEventListener('submit', e => e.preventDefault());
    q.addEventListener('input', () => {
      const v = q.value.trim().toLowerCase();
      $$('[data-chap]').forEach(el => {
        const c = parId(el.dataset.chap); if (!c) return;
        const txt = (c.titre + ' ' + c.matiere.nom + ' ' + c.notions.join(' ')).toLowerCase();
        el.style.display = !v || txt.includes(v) ? '' : 'none';
      });
    });
  }

  document.addEventListener('click', e => {
    const c = e.target.closest('[data-chap]'); if (c) return ouvrir(c.dataset.chap);
    const o = e.target.closest('[data-ouvrir]'); if (o) return ouvrir(o.dataset.ouvrir);
    if (e.target.closest('[data-choisir-metier]')) return ouvrirMetiers();
    if (e.target.closest('[data-metier-toggle]') && S.metier) return choisirMetier(S.metier.id, !S.metier.actif);
    const pch = e.target.closest('[data-parcours-chap]'); if (pch) return ouvrirParcoursChapitre(Number(pch.dataset.parcoursChap));
    const t = e.target.closest('[data-track]');
    if (t) {
      const el = document.getElementById(t.dataset.track);
      el.scrollBy({ left: t.dataset.dir * el.clientWidth * .9, behavior: 'smooth' });
    }
  });
})();
