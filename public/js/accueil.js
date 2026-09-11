/* Page d'accueil publique : collage de fond et grille des matières.
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

  const annee = document.getElementById('annee');
  if (annee) annee.textContent = new Date().getFullYear();

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
          <img src="${a.image}" alt="" loading="lazy"></div>`);
      } else {
        const m = matieres[i % matieres.length];
        tuiles.push(`<div class="tuile" style="--c1:${m.teinte};--c2:${m.teinte2}">
          <span>${m.glyphe}</span></div>`);
      }
    }
    collage.innerHTML = tuiles.join('');
  };

  const dessinerMatieres = matieres => {
    const grille = document.getElementById('matieres');
    if (!grille) return;
    grille.innerHTML = matieres.map(m => `
      <a class="nf-mat${m.image ? ' photo' : ''}" href="/inscription"
         style="--c1:${m.teinte};--c2:${m.teinte2}">
        ${m.image ? `<img src="${m.image}" alt="" loading="lazy">` : ''}
        <span class="g" aria-hidden="true">${m.glyphe}</span>
        <b>${m.nom}</b>
        <small>${m.chapitres} chapitres</small>
      </a>`).join('');
  };

  dessinerCollage([], SECOURS);
  dessinerMatieres(SECOURS);

  /* Le serveur fait autorité : si le catalogue évolue, l'accueil suit. */
  fetch('/api/catalogue/public')
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (!d || !d.matieres || !d.matieres.length) return;
      dessinerCollage(d.affiches || [], d.matieres);
      dessinerMatieres(d.matieres);
      /* Chiffres réels dans le titre de la section des matières. */
      const compte = document.getElementById('compteMatieres');
      if (compte && d.chiffres) compte.textContent =
        `${d.matieres.length} matières, ${d.chiffres.chapitres} chapitres et ` +
        `${d.chiffres.videos} cours en vidéo.`;
    })
    .catch(() => { });
})();
