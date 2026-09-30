/* Page d'accueil publique : collage de fond, chiffres, grille des matières et programme détaillé.
   Les matières viennent du serveur quand il répond, sinon d'une liste de secours. */
(() => {
  const SECOURS = [
    { nom: 'Mathématiques', court: 'Maths', teinte: '#3b6ef5', teinte2: '#7b3bf5', glyphe: '∫', chapitres: 8 },
    { nom: 'Physique', court: 'Physique', teinte: '#0f9d8c', teinte2: '#1268b3', glyphe: '⚛', chapitres: 7 },
    { nom: 'Chimie', court: 'Chimie', teinte: '#d9552b', teinte2: '#a3208f', glyphe: '⚗', chapitres: 6 },
    { nom: 'Sciences de la vie et de la Terre', court: 'SVT', teinte: '#2e9e4f', teinte2: '#0f8f7a', glyphe: '🧬', chapitres: 6 },
    { nom: 'Histoire', court: 'Histoire', teinte: '#8a5a2b', teinte2: '#b3392b', glyphe: '🏛', chapitres: 5 },
    { nom: 'Géographie', court: 'Géo', teinte: '#1d7fa6', teinte2: '#2e9e4f', glyphe: '🌍', chapitres: 5 },
    { nom: 'Philosophie', court: 'Philo', teinte: '#6b5bd2', teinte2: '#3b4a8a', glyphe: '🕯', chapitres: 6 },
    { nom: 'Œuvres au programme', court: 'Œuvres', teinte: '#b3396b', teinte2: '#6b2b8a', glyphe: '📖', chapitres: 5 }
  ];

  const echapper = t => String(t == null ? '' : t)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const annee = document.getElementById('annee');
  if (annee) annee.textContent = new Date().getFullYear();

  /* Une image absente (affiches non téléchargées) disparaît : la tuile colorée
     qui la porte reste, au lieu d'une icône d'image cassée. */
  const ecarterSiCassee = img => {
    const retirer = () => img.remove();
    if (img.complete && !img.naturalWidth) return retirer();
    img.addEventListener('error', retirer, { once: true });
  };
  document.querySelectorAll('img[data-facultative]').forEach(ecarterSiCassee);

  /* Mur de vignettes : les affiches réelles des chapitres quand elles existent,
     des tuiles colorées sinon. */
  const dessinerCollage = (affiches, matieres) => {
    const collage = document.getElementById('collage');
    if (!collage) return;
    const tuiles = [];
    const total = affiches.length ? 72 : 40;
    for (let i = 0; i < total; i++) {
      if (affiches.length) {
        const a = affiches[i % affiches.length];
        tuiles.push(`<div class="tuile photo" style="--c1:${a.teinte};--c2:${a.teinte2}">
          <img src="${echapper(a.image)}" alt="" loading="lazy"></div>`);
      } else {
        const m = matieres[i % matieres.length];
        tuiles.push(`<div class="tuile" style="--c1:${m.teinte};--c2:${m.teinte2}">
          <span>${m.glyphe}</span></div>`);
      }
    }
    collage.innerHTML = tuiles.join('');
    collage.querySelectorAll('img').forEach(ecarterSiCassee);
  };

  /* Avec le programme chargé, une carte de matière ouvre son détail ;
     sans lui (serveur muet), elle mène à l'inscription. */
  const dessinerMatieres = (matieres, avecProgramme) => {
    const grille = document.getElementById('matieres');
    if (!grille) return;
    grille.innerHTML = matieres.map(m => `
      <a class="nf-mat${m.image ? ' photo' : ''}" href="${avecProgramme ? '#programmeDetail' : '/inscription'}"
         ${avecProgramme ? `data-mat="${m.id}"` : ''} style="--c1:${m.teinte};--c2:${m.teinte2}">
        ${m.image ? `<img src="${echapper(m.image)}" alt="" loading="lazy">` : ''}
        <span class="g" aria-hidden="true">${m.glyphe}</span>
        <b>${echapper(m.nom)}</b>
        <small>${m.chapitres} chapitres</small>
      </a>`).join('');
    grille.querySelectorAll('img').forEach(ecarterSiCassee);
  };

  /* Programme détaillé : un onglet par matière, la liste de ses chapitres dessous. */
  const dessinerProgramme = (matieres, programme) => {
    const bloc = document.getElementById('programmeDetail');
    if (!bloc || !programme.length) return;
    const onglets = document.getElementById('ongletsMatieres');
    const liste = document.getElementById('listeChapitres');
    const heures = min => min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`;

    const choisir = id => {
      const m = matieres.find(x => x.id === id) || matieres[0];
      onglets.querySelectorAll('[data-onglet-mat]').forEach(b => {
        const actif = Number(b.dataset.ongletMat) === m.id;
        b.classList.toggle('actif', actif);
        b.setAttribute('aria-selected', actif);
      });
      liste.style.setProperty('--c1', m.teinte);
      liste.innerHTML = programme.filter(c => c.matiere_id === m.id).map(c => `
        <li>
          <span class="num">${c.numero}</span>
          <div class="corps">
            <b>${echapper(c.titre)}</b>
            <small>${c.seances} séance${c.seances > 1 ? 's' : ''} en vidéo${c.duree ? ' · ' + heures(c.duree) : ''}
              · résumé · QCM corrigé · TP avec corrigé</small>
            ${c.notions.length ? `<div class="notions">${c.notions.map(n => `<span>${echapper(n)}</span>`).join('')}</div>` : ''}
          </div>
        </li>`).join('');
    };

    onglets.innerHTML = matieres.map(m => `
      <button type="button" role="tab" data-onglet-mat="${m.id}" style="--c1:${m.teinte}">
        <i aria-hidden="true"></i>${echapper(m.court || m.nom)}</button>`).join('');
    onglets.addEventListener('click', e => {
      const b = e.target.closest('[data-onglet-mat]'); if (b) choisir(Number(b.dataset.ongletMat));
    });
    document.getElementById('matieres').addEventListener('click', e => {
      const a = e.target.closest('[data-mat]'); if (!a) return;
      e.preventDefault();
      choisir(Number(a.dataset.mat));
      bloc.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    bloc.hidden = false;
    choisir(matieres[0].id);
  };

  dessinerCollage([], SECOURS);
  dessinerMatieres(SECOURS, false);

  /* Le serveur fait autorité : si le catalogue évolue, l'accueil suit. */
  fetch('/api/catalogue/public')
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (!d || !d.matieres || !d.matieres.length) return;
      const programme = d.programme || [];
      dessinerCollage(d.affiches || [], d.matieres);
      dessinerMatieres(d.matieres, programme.length > 0);
      dessinerProgramme(d.matieres, programme);
      /* Chiffres réels, dans la bande de chiffres et le titre du programme. */
      if (d.chiffres) {
        const valeurs = { matieres: d.matieres.length, ...d.chiffres };
        document.querySelectorAll('[data-chiffre]').forEach(el => {
          const v = valeurs[el.dataset.chiffre];
          if (v) el.textContent = Number(v).toLocaleString('fr-FR');
        });
        const compte = document.getElementById('compteMatieres');
        if (compte) compte.textContent =
          `${d.matieres.length} matières, ${d.chiffres.chapitres} chapitres et ` +
          `${d.chiffres.videos} cours en vidéo. Choisissez une matière pour voir ses chapitres.`;
      }
    })
    .catch(() => { });
})();
