/* En-tête, pied de page, notifications et messages courts — partagés par tous les espaces. */
window.UI = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const ICO = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l15 9-15 9z"/></svg>',
    plus: '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg class="i" viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg>',
    croix: '<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    loupe: '<svg class="i" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="7"/><path d="M21 21l-5.2-5.2"/></svg>',
    cloche: '<svg class="i" viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/></svg>',
    fleche: '<svg class="i" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    gauche: '<svg class="i" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    tele: '<svg class="i" viewBox="0 0 24 24"><path d="M12 4v11M8 12l4 4 4-4M5 20h14"/></svg>'
  };

  const NAV = {
    eleve: [['accueil', '/ecole.html', 'Accueil'], ['matieres', '/matieres.html', 'Matières'],
            ['revisions', '/revisions.html', 'Mes révisions'],
            ['progression', '/progression.html', 'Ma progression']],
    parent: [['parent', '/espace-parent.html', 'Suivi de mon enfant']],
    admin: [['admin', '/admin.html', 'Administration'], ['accueil', '/ecole.html', 'Vue élève'],
            ['parent', '/espace-parent.html', 'Vue parent']]
  };

  let tt;
  const message = m => {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400);
  };

  /* Construit l'en-tête pour l'utilisateur connecté. `recherche` active la loupe. */
  const entete = (utilisateur, page, options = {}) => {
    const liens = NAV[utilisateur.role] || [];
    const initiale = (utilisateur.nom || '?').trim()[0].toUpperCase();

    document.body.insertAdjacentHTML('afterbegin', `
<header class="header" id="header">
  <a href="/" class="brand"><b>CASHEVENT</b><em>School</em></a>
  <nav class="nav" aria-label="Navigation principale">${liens.map(([id, href, l]) =>
      `<a href="${href}"${id === page ? ' class="active" aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
  <div class="right">
    ${options.recherche ? `<form class="searchbar" id="searchbar" role="search">
      <button type="button" class="ic" id="searchBtn" aria-label="Rechercher un chapitre" style="padding:0">${ICO.loupe}</button>
      <input id="q" type="search" placeholder="Chapitre, notion…" aria-label="Rechercher un chapitre">
    </form>` : ''}
    ${options.notifications ? `<button class="ic" id="notif" aria-label="Notifications">${ICO.cloche}
      <span class="count" id="notifCount" style="display:none">0</span></button>` : ''}
    <div class="profile" id="profile" aria-expanded="false">
      <button class="pbtn" id="pbtn" aria-haspopup="true" aria-label="Mon compte">
        <span class="avatar avatar-init" aria-hidden="true">${initiale}</span><span class="caret"></span></button>
      <div class="menu" id="menu" role="menu">
        <div class="menu-tete"><b>${utilisateur.nom}</b><small>${utilisateur.email}</small>
          <span class="role-pastille role-${utilisateur.role}">${
            { eleve: 'Élève', parent: 'Parent', admin: 'Administrateur' }[utilisateur.role]}</span></div>
        ${liens.map(([, href, l]) => `<a role="menuitem" href="${href}">${l}</a>`).join('')}
        <button role="menuitem" id="deconnexion">Se déconnecter</button>
      </div>
    </div>
  </div>
</header>`);

    const pr = $('#profile'), menu = $('#menu');
    $('#pbtn').addEventListener('click', e => {
      e.stopPropagation(); const o = menu.classList.toggle('open'); pr.setAttribute('aria-expanded', o);
    });
    document.addEventListener('click', () => { menu.classList.remove('open'); pr.setAttribute('aria-expanded', 'false'); });
    $('#deconnexion').addEventListener('click', async () => {
      await API.post('/auth/deconnexion'); location.href = '/connexion.html';
    });

    const auScroll = () => $('#header').classList.toggle('solid', window.scrollY > 40);
    auScroll(); window.addEventListener('scroll', auScroll, { passive: true });
  };

  const pied = () => document.body.insertAdjacentHTML('beforeend', `
<footer class="footer">
  <p>© ${new Date().getFullYear()} Cashevent School — cours de répétition, QCM assistés par IA,
  travaux pratiques corrigés et suivi parental.</p>
</footer>`);

  /* Écran d'attente pendant les premiers appels réseau */
  const chargement = (actif, cible = document.body) => {
    let e = $('#chargement');
    if (actif) {
      if (!e) {
        e = document.createElement('div'); e.id = 'chargement'; e.className = 'chargement';
        e.innerHTML = '<span class="rond" aria-hidden="true"></span><p>Chargement…</p>';
        cible.appendChild(e);
      }
    } else if (e) e.remove();
  };

  const erreurFatale = texte => {
    chargement(false);
    document.body.insertAdjacentHTML('beforeend',
      `<div class="vide-etat" style="padding-top:120px"><b>Impossible d’afficher cette page</b>${texte}</div>`);
  };

  return { $, $$, ICO, message, entete, pied, chargement, erreurFatale };
})();
