/* CASHEVENT SCHOOL — « Ma progression » : le tableau de bord de l'élève lui-même.
   Il lit les mêmes chiffres que l'espace parent, mais s'adresse à l'élève, et
   les met en scène : anneau animé, paliers, rythme, une carte par matière.    */
(async () => {
  const { $, $$, message, entete, pied, chargement, erreurFatale } = UI;

  chargement(true);
  let moi, tb;
  try {
    moi = await API.get('/auth/moi').then(r => r.utilisateur);
    tb = await API.get('/progression/tableau-bord');
  } catch (e) { chargement(false); return erreurFatale(e.message); }

  entete(moi, 'progression', { notifications: true });
  pied();
  chargement(false);

  /* --------------------------------- outils ------------------------------- */
  const echapper = t => String(t == null ? '' : t)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const jourFR = j => new Date(j + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const jourCourt = j => new Date(j + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'narrow' }).toUpperCase();
  const dateLongue = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const prenom = (tb.eleve.nom || '').trim().split(/\s+/)[0] || 'vous';
  const s = tb.stats;
  const restants = s.total - s.faits;
  const animerDes = fn => (window.requestAnimationFrame || setTimeout)(() => setTimeout(fn, 60));

  /* Un anneau SVG : la circonférence est fixée par r = 52 (bandeau) ou r = 26 (matière). */
  const anneau = (pc, r, classe) => {
    const c = 2 * Math.PI * r, vb = r * 2 + 16;
    return `<svg viewBox="0 0 ${vb} ${vb}" aria-hidden="true">
      <circle class="fond" cx="${vb / 2}" cy="${vb / 2}" r="${r}"/>
      <circle class="val ${classe || ''}" cx="${vb / 2}" cy="${vb / 2}" r="${r}"
        style="stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${c.toFixed(1)}" data-cible="${(c * (1 - pc / 100)).toFixed(1)}"/>
    </svg>`;
  };

  /* Les paliers : un nom pour chaque étape du programme, et le prochain à atteindre. */
  const PALIERS = [[0, 'Premiers pas'], [6, 'En route'], [16, 'Bien lancé'], [26, 'Confirmé'],
                   [36, 'Dernière ligne droite'], [48, 'Programme bouclé']];
  const palierActuel = PALIERS.filter(([n]) => s.faits >= n).pop();
  const palierSuivant = PALIERS.find(([n]) => n > s.faits);

  /* Série : jours travaillés d'affilée en partant d'aujourd'hui. */
  let serie = 0;
  for (let i = tb.rythme.length - 1; i >= 0 && tb.rythme[i].actions; i--) serie++;
  const actifs = tb.rythme.filter(j => j.actions).length;
  const actions14 = tb.rythme.reduce((a, j) => a + j.actions, 0);

  /* --------------------------------- bandeau ------------------------------ */
  const m = tb.metier;
  $('#hero').innerHTML = `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <defs><linearGradient id="degrade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#CD5CB4"/><stop offset="1" stop-color="#ffd166"/></linearGradient></defs>
    </svg>
    <div class="hero-anneau">${anneau(s.global, 52)}
      <div class="centre"><b>${s.global} %</b><small>du programme</small></div></div>
    <div class="hero-txt">
      <span class="salut">★ ${echapper(palierActuel[1])}</span>
      <h1>${s.faits ? `Bravo ${echapper(prenom)}, ${s.faits} chapitre${s.faits > 1 ? 's' : ''} bouclé${s.faits > 1 ? 's' : ''}.`
        : `Bonjour ${echapper(prenom)}, le programme vous attend.`}</h1>
      <div class="niveau">${echapper(tb.eleve.niveau || 'Cashevent School')} · ${tb.matieres.length} matières · ${restants} chapitre${restants > 1 ? 's' : ''} restant${restants > 1 ? 's' : ''}</div>
      <div class="palier">
        ${palierSuivant ? `<small>Prochain palier</small><b>${echapper(palierSuivant[1])}</b>
          <span class="barre"><i style="width:${Math.round((s.faits - palierActuel[0]) / (palierSuivant[0] - palierActuel[0]) * 100)}%"></i></span>
          <small>encore ${palierSuivant[0] - s.faits} chapitre${palierSuivant[0] - s.faits > 1 ? 's' : ''}</small>`
          : '<b>Tout le programme est terminé. Chapeau.</b>'}
      </div>
    </div>
    <div class="hero-badges">
      <div class="hero-badge"><span class="ico">🔥</span><div><b>${serie ? serie + ' jour' + (serie > 1 ? 's' : '') + ' d’affilée' : 'Aucune série en cours'}</b>
        <small>${actifs} jour${actifs > 1 ? 's' : ''} travaillé${actifs > 1 ? 's' : ''} sur les 14 derniers</small></div></div>
      <div class="hero-badge"><span class="ico">${m ? echapper(m.metier.glyphe) : '★'}</span><div><b>${m ? echapper(m.metier.nom) : 'Futur métier'}</b>
        <small>${m ? `${m.termines}/${m.total} chapitres du projet` : 'Pas encore choisi'}</small></div></div>
      <div class="hero-badge"><span class="ico">📅</span><div><b>${tb.projection ? dateLongue(tb.projection.date) : 'Date de fin à venir'}</b>
        <small>${tb.projection ? 'fin du programme à ce rythme' : 'après deux chapitres terminés'}</small></div></div>
    </div>`;

  /* --------------------------------- chiffres ----------------------------- */
  const moyCouleur = s.moyenne === null ? 'var(--info)' : s.moyenne >= 70 ? 'var(--ok)' : 'var(--warn)';
  const parcoursEnCours = tb.parcours.filter(p => p.etat === 'en_cours').length;
  $('#chiffres').innerHTML = `
    <div class="chiffre-carte" style="--halo:rgba(76,141,255,.22)"><div class="lab">Chapitres terminés</div>
      <div class="val">${s.faits}<small>/ ${s.total}</small></div>
      <div class="barre"><i style="width:${s.global}%;background:linear-gradient(90deg,#4c8dff,#7b3bf5)"></i></div></div>
    <div class="chiffre-carte" style="--halo:rgba(123,59,245,.22)"><div class="lab">QCM passés</div>
      <div class="val">${s.qcmFaits}</div>
      <div class="sous">${s.qcmFaits ? 'sur ' + s.total + ' chapitres du programme' : 'aucun pour le moment'}</div></div>
    <div class="chiffre-carte" style="--halo:${s.moyenne !== null && s.moyenne >= 70 ? 'rgba(63,208,138,.22)' : 'rgba(245,165,36,.22)'}"><div class="lab">Moyenne aux QCM</div>
      <div class="val" style="color:${moyCouleur}">${s.moyenne === null ? '—' : s.moyenne + ' %'}</div>
      <div class="barre"><i style="width:${s.moyenne || 0}%;background:${moyCouleur}"></i></div></div>
    <div class="chiffre-carte" style="--halo:${s.revoir.length ? 'rgba(245,165,36,.22)' : 'rgba(63,208,138,.22)'}"><div class="lab">À reprendre</div>
      <div class="val" style="color:${s.revoir.length ? 'var(--warn)' : 'var(--ok)'}">${s.revoir.length}</div>
      <div class="sous">${s.revoir.length ? 'chapitre(s) sous ' + tb.seuilARevoir + ' %' + (parcoursEnCours ? ' · ' + parcoursEnCours + ' parcours en cours' : '') : 'aucune notion en difficulté'}</div></div>`;

  /* ---------------------------------- projet ------------------------------ */
  $('#projet').innerHTML = `
    <div class="prog-tete"><h2>Mon projet</h2>
      ${m ? '<a class="lien" href="/ecole#metier">Changer de métier</a>' : ''}
      <p>${m ? 'Le métier que vous visez, et où vous en êtes sur les chapitres qui y mènent.'
        : 'Choisissez le métier dont vous rêvez : les chapitres qui comptent pour y arriver s’illuminent dans toutes les matières.'}</p></div>
    ${m ? `
      <div class="projet-carte">
        <span class="g" aria-hidden="true">${echapper(m.metier.glyphe)}</span>
        <div><b>${echapper(m.metier.nom)}</b>
          <small>${m.actif ? 'Activé : le programme s’illumine selon ce métier.' : 'En pause : le programme s’affiche normalement.'}
            ${m.termines}/${m.total} chapitres terminés · ${m.essentielsTermines}/${m.essentiels} essentiels${
            m.moyenne === null ? '' : ' · moyenne ' + m.moyenne + ' % aux QCM'}</small>
          <div class="barre"><i style="width:${m.avancement}%"></i></div></div>
      </div>
      <div class="projet-grille">${m.chapitres.slice(0, 8).map(c => `
        <a class="projet-chap${c.termine ? ' fini' : ''}" style="--c:${echapper(c.matiere.teinte)}" href="/ecole#chapitre-${c.id}">
          <span class="etiq p${c.poids}">★ ${echapper(c.libelle)}</span>
          <b>${echapper(c.titre)}</b>
          <small>${echapper(c.matiere.nom)} · ${echapper(c.raison)}</small>
          <span class="pied"><span class="barre"><i style="width:${c.avancement}%"></i></span><span>${c.termine ? '✓ Terminé' : c.avancement + ' %'}</span></span>
        </a>`).join('')}</div>
      ${m.prochain ? `<p class="sous espace-haut">Prochain chapitre conseillé pour ce métier : <a class="pilule mini blanc" href="/ecole#chapitre-${m.prochain.id}">${echapper(m.prochain.titre)}</a></p>` : ''}`
    : `<div class="projet-vide"><span class="g" aria-hidden="true">★</span>
        <div><b>Quel est votre futur métier ?</b>
          <small>Astronaute, médecin, ingénieur, avocat… Quatorze métiers, chacun rattaché aux chapitres qui comptent, avec la raison.</small>
          <a class="pilule or" href="/ecole#metier">Choisir mon métier</a></div></div>`}`;

  /* --------------------------------- rythme ------------------------------- */
  const max = Math.max(1, ...tb.rythme.map(j => j.actions));
  const p = tb.projection;
  $('#rythme').innerHTML = `
    <div class="prog-tete"><h2>Votre rythme</h2>
      <p>${actifs ? `${actifs} jour${actifs > 1 ? 's' : ''} travaillé${actifs > 1 ? 's' : ''} sur les 14 derniers` +
        (serie > 1 ? `, ${serie} jours d’affilée en ce moment.` : '.') : 'Aucune session sur les 14 derniers jours : une séance de vingt minutes relance tout.'}</p></div>
    <div class="rythme-graphe">${tb.rythme.map((j, i) => `
      <div class="jour${j.actions ? ' on' : ''}${i === tb.rythme.length - 1 && j.actions ? ' aujourdhui' : ''}" title="${jourFR(j.jour)} — ${j.actions} activité(s)">
        <b>${j.actions || ''}</b><i data-h="${Math.max(6, Math.round(j.actions / max * 100))}" style="height:6%"></i></div>`).join('')}</div>
    <div class="rythme-legende">${tb.rythme.map(j => `<span>${jourCourt(j.jour)}</span>`).join('')}</div>
    <div class="rythme-resume">
      <div><b>${actions14}</b><small>activités en 14 jours</small></div>
      <div><b>${serie}</b><small>jour${serie > 1 ? 's' : ''} d’affilée</small></div>
      <div><b>${tb.objectifHebdo}</b><small>chapitres par semaine, l’objectif</small></div>
    </div>
    ${p ? `<div class="projection-carte"><b>À ce rythme, vous terminerez le programme le <span class="date">${dateLongue(p.date)}</span>.</b>
        <p>Environ ${String(p.parSemaine).replace('.', ',')} chapitre(s) par semaine ; il vous en reste ${p.restants}.
        Un chapitre de plus chaque semaine avancerait cette date de plusieurs semaines.</p></div>`
      : `<div class="projection-carte"><b>Terminez deux chapitres pour voir votre date d’arrivée.</b>
        <p>Cashevent School calculera alors la date de fin du programme d’après votre rythme réel.</p></div>`}`;

  /* -------------------------------- conseils ------------------------------ */
  /* Les alertes du service sont écrites pour un parent : on les réadresse à l'élève. */
  const aLeleve = t => t
    .replace(/[Vv]otre enfant vient de/g, 'vous venez de')
    .replace(/[Vv]otre enfant a/g, 'vous avez')
    .replace(/[Vv]otre enfant/g, 'vous')
    .replace(/son (\d+)/g, 'votre $1')
    .replace(/Il travaille sur/g, 'Vous travaillez sur')
    .replace(/Il ne reste qu’à/g, 'Il ne vous reste qu’à');
  $('#conseils').innerHTML = `
    <div class="prog-tete"><h2>Ce que Cashevent School vous conseille</h2>
      <p>Établi à partir de vos scores aux QCM et de vos chapitres en cours.</p></div>
    ${tb.alertes.length ? tb.alertes.map(a => `
      <div class="conseil-carte ${a.ton}"><span class="ico">${a.icone}</span>
        <div><b>${aLeleve(a.titre)}</b><p>${aLeleve(a.texte)}</p>
        ${a.quand ? `<div class="quand">Dernière session le ${jourFR(a.quand)}</div>` : ''}</div></div>`).join('')
      : '<div class="prog-vide">Rien à signaler : continuez comme ça.</div>'}`;

  /* -------------------------------- parcours ------------------------------ */
  const ETAT = { en_cours: 'En cours', valide: 'Lacune comblée', abandonne: 'Abandonné' };
  const COULEUR_ETAT = { en_cours: 'var(--warn)', valide: 'var(--ok)', abandonne: '#6a6a72' };
  $('#parcours').innerHTML = `
    <div class="prog-tete"><h2>Parcours de rattrapage</h2>
      <p>Une lacune détectée, les prérequis des classes antérieures revus, puis le QCM repassé.</p></div>
    ${tb.parcours.length ? tb.parcours.slice(0, 6).map(pr => `
      <div class="parcours-carte" style="--c:${COULEUR_ETAT[pr.etat]}">
        <div class="tete"><b>${echapper(pr.chapitre.titre)}</b><span class="etat ${pr.etat}">${ETAT[pr.etat]}</span></div>
        <small>${echapper(pr.chapitre.matiere.nom)} · ${pr.validees}/${pr.total} prérequis validés${
          pr.scoreInitial !== null ? ' · ' + pr.scoreInitial + ' % au départ' : ''}${
          pr.scoreFinal !== null ? ' → ' + pr.scoreFinal + ' % après rattrapage' : ''}</small>
        <span class="barre"><i style="width:${pr.total ? Math.round(pr.validees / pr.total * 100) : 0}%"></i></span>
        ${pr.etat === 'en_cours' ? `<a class="pilule blanc" href="/ecole#rattrapage-${pr.chapitre.id}">${pr.pretPourQCM ? 'Refaire le QCM du chapitre' : 'Continuer le parcours'}</a>` : ''}
      </div>`).join('')
      : '<div class="prog-vide">Aucun parcours pour l’instant. Un QCM sous 60 % en propose un, et vous pouvez en lancer un depuis la fiche d’un chapitre, bouton « Parcours de rattrapage ».</div>'}`;

  /* ------------------------------- à reprendre ---------------------------- */
  $('#reprendre').innerHTML = `
    <div class="prog-tete"><h2>À reprendre</h2><a class="lien" href="/revisions">Mes révisions</a>
      <p>Chapitres dont le dernier score est inférieur à ${tb.seuilARevoir} %.</p></div>
    ${s.revoir.length ? s.revoir.map(c => `
      <div class="reprendre-ligne"><span class="pt" style="background:${echapper(c.matiere.teinte)}"></span>
        <span class="nom"><b>${echapper(c.titre)}</b><small>${echapper(c.matiere.nom)} · chapitre ${c.numero}</small></span>
        <span class="score">${c.score} %</span>
        <a class="pilule" href="/ecole#chapitre-${c.id}">Reprendre</a></div>`).join('')
      : '<div class="prog-vide">Aucun chapitre sous la barre des ' + tb.seuilARevoir + ' %. Rien à reprendre.</div>'}`;

  /* -------------------------------- matières ------------------------------ */
  $('#matieres').innerHTML = `
    <div class="prog-tete"><h2>Matière par matière</h2><a class="lien" href="/matieres">Parcourir les matières</a>
      <p>Part du programme déjà travaillée, chapitres terminés et moyenne aux QCM dans chaque matière.</p></div>
    <div class="matieres-grille">${tb.matieres.map(x => `
      <a class="matiere-carte" style="--c:${echapper(x.teinte)}" href="/matieres" data-matiere="${echapper(x.code)}">
        <div class="tete"><div><b>${echapper(x.nom)}</b><small>${x.faits}/${x.chapitres} chapitres terminés</small></div>
          <div class="matiere-anneau">${anneau(x.avancement, 26)}<span>${x.avancement} %</span></div></div>
        <div class="stats">
          <div class="${x.moyenne !== null && x.moyenne < tb.seuilARevoir ? 'faible' : ''}"><b>${x.moyenne === null ? '—' : x.moyenne + ' %'}</b><small>moyenne QCM</small></div>
          <div><b>${x.chapitres - x.faits}</b><small>à terminer</small></div>
        </div>
      </a>`).join('')}</div>`;

  /* Une carte de matière ouvre la page des matières déjà filtrée. */
  $('#matieres').addEventListener('click', e => {
    const c = e.target.closest('[data-matiere]');
    if (c) sessionStorage.setItem('cashevent:matiere', c.dataset.matiere);
  });

  /* Les pondérations viennent du serveur : le texte reste juste si elles changent. */
  const w = tb.poids;
  $('#formule').textContent =
    `Chaque chapitre combine les séances vidéo visionnées (${Math.round(w.seances * 100)} %), ` +
    `le résumé lu (${Math.round(w.resume * 100)} %), le QCM passé (${Math.round(w.qcm * 100)} %) ` +
    `et le TP téléchargé (${Math.round(w.tp * 100)} %). Un chapitre passe « à reprendre » ` +
    `quand le dernier score au QCM descend sous ${tb.seuilARevoir} %.`;

  /* Les anneaux et les barres s'animent une fois la page posée. */
  animerDes(() => {
    $$('.val[data-cible]').forEach(c => { c.style.strokeDashoffset = c.dataset.cible; });
    $$('.rythme-graphe i[data-h]').forEach(i => { i.style.height = i.dataset.h + '%'; });
  });

  /* La cloche : ce que les professeurs ont envoyé, puis les chapitres à reprendre,
     qui s'ouvrent directement dans l'espace élève. */
  const noteChapitre = c => ({
    initiale: '!', teinte: c.matiere.teinte, titre: 'À revoir · ' + c.titre,
    texte: `Dernier score au QCM : ${c.score} %. Relisez le résumé, puis refaites le QCM.`,
    quand: c.matiere.nom + ' · chapitre ' + c.numero, href: '/ecole#chapitre-' + c.id
  });
  const notesParcours = tb.parcours.filter(x => x.etat === 'en_cours').map(x => ({
    initiale: '🧭', teinte: x.chapitre.matiere.teinte,
    titre: (x.pretPourQCM ? 'Prêt pour le QCM · ' : 'Rattrapage · ') + x.chapitre.titre,
    texte: x.pretPourQCM ? 'Tous les prérequis sont validés : refaites le QCM du chapitre.' : `${x.validees}/${x.total} prérequis validés.`,
    quand: x.chapitre.matiere.nom, href: '/ecole#rattrapage-' + x.chapitre.id
  }));
  UI.notifications([...notesParcours, ...s.revoir.map(noteChapitre)]);
  API.get('/professeurs/travaux').then(t => UI.notifications([
    ...t.messages.filter(x => !x.lu_le).map(x => ({
      initiale: (x.enseignant || '?').trim()[0].toUpperCase(), teinte: x.teinte,
      titre: 'Message de ' + x.enseignant, texte: x.matiere + ' — ' + x.commentaire, href: '/ecole'
    })),
    ...t.tp.filter(x => !x.telecharge_le).map(x => ({
      initiale: 'TP', teinte: x.teinte, titre: 'Nouveau TP · ' + x.matiere, texte: x.titre,
      quand: x.enseignant, href: '/api/professeurs/travaux/' + x.id + '/fichier'
    })),
    ...notesParcours,
    ...s.revoir.map(noteChapitre)
  ])).catch(() => { });

  /* --------------------------- professeurs référents ------------------------- */
  /* Un professeur par matière, désigné par son code. Il ne verra que cette
     matière-là : c'est l'élève qui ouvre la porte, et lui seul. */
  const zoneProfs = $('#mesProfs');

  const rendreProfs = async () => {
    let matieres;
    try { ({ matieres } = await API.get('/professeurs/mes')); }
    catch (e) { zoneProfs.innerHTML = `<p class="sous">${echapper(e.message)}</p>`; return; }
    zoneProfs.innerHTML = matieres.map(x => `
      <form class="ligne-prof" data-matiere="${x.id}">
        <span class="pt" style="background:${echapper(x.teinte)}"></span>
        <span class="nom"><b>${echapper(x.nom)}</b>
          <small>${x.enseignant ? echapper(x.enseignant) : 'Aucun professeur désigné'}</small></span>
        <input class="champ code" name="code" maxlength="6" autocomplete="off"
          placeholder="Code"
          aria-label="Code du professeur de ${echapper(x.nom)}">
        <button class="pilule mini" type="submit">${x.enseignant ? 'Changer' : 'Désigner'}</button>
        ${x.enseignant
          ? `<button class="pilule mini fantome" type="button" data-retirer-prof="${x.id}">Retirer</button>` : ''}
      </form>`).join('');
  };

  if (zoneProfs) {
    rendreProfs();
    zoneProfs.addEventListener('input', e => {
      if (e.target.name === 'code') e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    zoneProfs.addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target, code = f.code.value.trim();
      if (code.length !== 6) return message('Le code d’un professeur compte 6 caractères.');
      try {
        const r = await API.put('/professeurs/mes/' + f.dataset.matiere, { code });
        message(r.enseignant.nom + ' est désormais votre professeur référent.');
        rendreProfs();
      } catch (err) { message(err.message); }
    });
    zoneProfs.addEventListener('click', async e => {
      const b = e.target.closest('[data-retirer-prof]'); if (!b) return;
      if (!confirm('Retirer ce professeur ? Il ne verra plus votre progression dans cette matière.')) return;
      try {
        await API.put('/professeurs/mes/' + b.dataset.retirerProf, { code: '' });
        message('Professeur retiré.'); rendreProfs();
      } catch (err) { message(err.message); }
    });
  }
})();
