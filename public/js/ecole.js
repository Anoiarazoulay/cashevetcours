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
    return `<button class="chap${c.image ? ' avec-image' : ''}" style="${styleMat(c.matiere)}" data-chap="${c.id}">
      ${c.image ? `<img class="affiche" src="${c.image}" alt="" loading="lazy">` : ''}
      ${badge}<span class="g" aria-hidden="true">${c.matiere.glyphe}</span>
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

  const fiche = c => {
    const e = etat(c.id), p = pc(c.id), m = c.matiere;
    const q = e.qcm;
    const note = q
      ? `<div class="score-ligne${q.pc < 60 ? ' faible' : ''}">Dernier score : <b>${q.pc} %</b> · ${
          new Date(q.date).toLocaleDateString('fr-FR')}</div>` : '';
    const desactive = lectureSeule ? ' disabled' : '';

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
    if (!courant) return;
    const c = courant;
    const agir = async fn => { try { await fn(); } catch (err) { message(err.message); } };

    if (e.target.closest('[data-tp]')) return telechargerTP(c);

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

      const couleur = b.score >= 80 ? 'var(--ok)' : b.score >= 60 ? 'var(--warn)' : 'var(--brand)';
      bg.querySelector('.sheet').innerHTML = enTete(c.titre, `${c.matiere.nom} · Chapitre ${c.n}`) + `
        <div class="qcm-vue">
          <div class="bilan">
            <div class="anneau" style="background:conic-gradient(${couleur} ${b.score * 3.6}deg,#2c2c31 0)">
              <span>${b.score} %</span></div>
            <h3>${b.justes} bonne${b.justes > 1 ? 's' : ''} réponse${b.justes > 1 ? 's' : ''} sur ${b.total}</h3>
            <p>${b.appreciation}</p>
          </div>
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
    };
    finQCM(); qcmClic = clic;
    bg.addEventListener('click', clic, true);
    vue();
  };

  /* ------------------------------ rendu des pages ------------------------- */
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
    if (s.encours.length) rows.push(rangee('encours', 'Continuer mes chapitres', s.encours.slice(0, 12).map(x => carte(x))));

    /* Top 10 : l'ordre vient de l'activité réelle de tous les élèves. */
    const classement = POPULAIRES.map(p => parId(p.id)).filter(Boolean);
    if (classement.length >= 3)
      rows.push(rangee('top10', 'Top 10 des chapitres les plus travaillés',
        classement.map((x, i) => carteRang(x, i + 1)), '· sur toute la plateforme'));
    if (s.revoir.length) rows.push(rangee('revoir', 'À revoir en priorité', s.revoir.map(x => carte(x)), '· score inférieur à 60 %'));
    M.forEach(m => rows.push(rangee('r-' + m.id, m.nom, m.chapitres.map(x => carte(x, false)),
      `· ${m.chapitres.length} chapitres · coef. ${m.coef}`)));
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
    html += bloc('À revoir en priorité', 'Chapitres dont le dernier score au QCM est inférieur à 60 %.', s.revoir);
    html += bloc('À terminer', 'Chapitres commencés qu’il reste à finir.', s.encours);
    html += bloc('Ma liste', 'Chapitres que vous avez mis de côté.', S.liste.map(parId).filter(Boolean));
    html += bloc('Prochaines étapes suggérées', 'Chapitres pas encore ouverts, dans l’ordre du programme.',
      CHAP.filter(c => !commence(c.id)).slice(0, 8));
    $('[data-revisions]').innerHTML = html || `<div class="vide-etat">
      <b>Rien à revoir pour l’instant.</b>Commencez un chapitre depuis l’accueil :
      les QCM et les chapitres inachevés apparaîtront ici automatiquement.</div>`;
  };

  const rendre = () => {
    const n = stats().revoir.length;
    const badge = $('#notifCount');
    if (badge) { badge.textContent = n; badge.style.display = n ? '' : 'none'; }
    if (page === 'accueil') rendreAccueil();
    if (page === 'matieres') rendreMatieres();
    if (page === 'revisions') rendreRevisions();
  };
  rendre();

  /* ------------------------------ interactions ---------------------------- */
  const notif = $('#notif');
  if (notif) notif.addEventListener('click', () => {
    const s = stats();
    message(s.revoir.length
      ? `${s.revoir.length} chapitre(s) à revoir, à commencer par « ${s.revoir[0].titre} »`
      : 'Aucun chapitre à revoir. Continuez ainsi !');
  });

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
    const t = e.target.closest('[data-track]');
    if (t) {
      const el = document.getElementById(t.dataset.track);
      el.scrollBy({ left: t.dataset.dir * el.clientWidth * .9, behavior: 'smooth' });
    }
  });
})();
