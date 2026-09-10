/* ONDES — script commun : données, header/footer, rangées, aperçu au survol, interactions */
(() => {
  const $ = s => document.querySelector(s);
  const px = (id, slug = '', w = 600) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}${slug}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
  const un = (id, w = 900) => `https://images.unsplash.com/${id}?fm=jpg&q=70&w=${w}&auto=format&fit=crop`;
  const MAN = px(36080784, '/free-photo-of-moody-portrait-of-a-reflective-man');

  /* ---------- Catalogue (titres inventés, photos libres) ---------- */
  const C = {
    gentlemen:{t:'Les<br>Gentlemen', img:MAN, age:'18+', s:'2 saisons', g:'Ironique|Comédie|Policier', kind:'serie', lang:'Anglais'},
    souriciere:{t:'Souricière', img:px(38948539), age:'13+', s:'1 saison', g:'Mystère|Thriller|Coréen', kind:'serie', lang:'Coréen'},
    rythme:{t:'Rythme<br>+ flow', img:px(12633475), age:'16+', s:'5 saisons', g:'Entraînant|Téléréalité|Anthologie', kind:'serie', lang:'Français'},
    beaute:{t:'Beauté<br>en noir', img:px(4770741), age:'18+', s:'3 saisons', g:'Drame|Familial|Américain', kind:'serie', lang:'Anglais'},
    rivages:{t:'Rivages', img:px(38948555), age:'16+', s:'4 saisons', g:'Aventure|Adolescent|Romance', kind:'serie', lang:'Anglais'},
    printemps:{t:'Le premier<br>printemps', img:px(38948545), age:'13+', s:'1 saison', g:'Romantique|Drame|Coréen', kind:'serie', lang:'Coréen'},
    sorceleur:{t:'Le sorceleur', img:px(38948550), age:'18+', s:'3 saisons', g:'Fantasy|Action|Sombre', kind:'serie', lang:'Anglais'},
    jeudi:{t:'Jeudi', img:px(38948542), age:'13+', s:'2 saisons', g:'Mystère|Comédie|Gothique', kind:'serie', lang:'Anglais'},
    vallon:{t:'Les ombres<br>de Vallon', img:un('photo-1770036245365-0f084cc1b7b6'), age:'16+', s:'4 saisons', g:'Science-fiction|Horreur|Mystère', kind:'serie', lang:'Anglais'},
    lecon:{t:'Je vais<br>t\'apprendre', img:px(38842176), age:'18+', s:'1 saison', g:'Vengeance|Drame|Coréen', kind:'serie', lang:'Coréen'},
    cartel:{t:'Face au<br>cartel', img:px(4770741, '', 900), age:'18+', s:'Film · 1h 52min', g:'Tendu|Action|Policier', kind:'film', lang:'Espagnol'},
    corps:{t:'Corps<br>durs', img:MAN, age:'16+', s:'Film · 1h 40min', g:'Action|Arts martiaux', kind:'film', lang:'Anglais'},
    justicier:{t:'Le<br>Justicier', img:px(12633475, '', 900), age:'18+', s:'Film · 1h 49min', g:'Violent|Action|Thriller', kind:'film', lang:'Anglais'},
    novocaine:{t:'Novocaïne', img:un('photo-1532553805460-b3f55eabbc7b'), age:'18+', s:'Film · 1h 50min', g:'Comédie|Action', kind:'film', lang:'Anglais'},
    murmure:{t:'L\'homme<br>qui murmure', img:px(38948542, '', 900), age:'16+', s:'Film · 2h 08min', g:'Suspense|Drame', kind:'film', lang:'Anglais'},
    maree:{t:'Marée<br>noire', img:px(38948545, '', 900), age:'13+', s:'Film · 1h 56min', g:'Action|Aventure', kind:'film', lang:'Anglais'},
    vikings:{t:'Vikings<br>du Nord', img:px(38948550, '', 900), age:'18+', s:'Film · 2h 15min', g:'Épique|Historique', kind:'film', lang:'Norvégien'},
    symbiote:{t:'Symbiote', img:px(38842176, '', 900), age:'13+', s:'Film · 1h 52min', g:'Science-fiction|Action', kind:'film', lang:'Anglais'},
  };
  const list = (...k) => k.map(id => ({id, ...C[id]}));
  const labels = ['Nouvelle saison', 'Ajouté récemment', '', 'Nouvelle saison', 'Ajouté récemment', 'Nouveau', '', 'Ajouté récemment', 'Nouvelle saison', ''];
  const SERIES = Object.keys(C).filter(k => C[k].kind === 'serie');
  const FILMS = Object.keys(C).filter(k => C[k].kind === 'film');
  const store = { list: JSON.parse(localStorage.getItem('ondes:list') || '[]'), likes: JSON.parse(localStorage.getItem('ondes:likes') || '[]') };
  const save = () => { localStorage.setItem('ondes:list', JSON.stringify(store.list)); localStorage.setItem('ondes:likes', JSON.stringify(store.likes)); };

  /* ---------- Toast ---------- */
  let tt; const toast = m => { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 1800); };
  document.addEventListener('click', e => { const b = e.target.closest('[data-toast]'); if (b) toast(b.dataset.toast); });

  /* ---------- Header / footer ---------- */
  const page = document.body.dataset.page || 'accueil';
  const NAV = [['accueil', 'index.html', 'Accueil'], ['series', 'series.html', 'Séries'], ['films', 'films.html', 'Films'], ['jeux', 'jeux.html', 'Jeux'], ['nouveautes', 'nouveautes.html', 'Nouveautés'], ['liste', 'ma-liste.html', 'Ma liste'], ['langues', 'langues.html', 'Par langue']];
  document.body.insertAdjacentHTML('afterbegin', `
<header class="header" id="header">
  <a href="index.html" class="brand">ONDES</a>
  <nav class="nav" aria-label="Navigation">${NAV.map(([id, href, l]) => `<a href="${href}"${id === page ? ' class="active" aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
  <div class="right">
    <form class="searchbar" id="searchbar" role="search"><button type="button" class="ic" id="searchBtn" aria-label="Rechercher" style="padding:0"><svg class="i" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="7"/><path d="M21 21l-5.2-5.2"/></svg></button><input id="q" type="search" placeholder="Titres, genres…" aria-label="Rechercher"></form>
    <button class="ic" data-toast="15 notifications" aria-label="Notifications (15)"><svg class="i" viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/></svg><span class="count">15</span></button>
    <button class="kids" data-toast="Profil Enfants"><span class="k">kids</span><span>Enfants</span></button>
    <div class="profile" id="profile" aria-expanded="false"><button class="pbtn" id="pbtn" aria-haspopup="true" aria-label="Profil"><span class="avatar" aria-hidden="true"><i></i></span><span class="caret"></span></button>
      <div class="menu" id="menu" role="menu"><a role="menuitem" href="ma-liste.html">Ma liste</a><button role="menuitem" data-toast="Gérer les profils">Gérer les profils</button><button role="menuitem" data-toast="Compte">Compte</button><button role="menuitem" data-toast="Déconnexion">Se déconnecter</button></div></div>
  </div>
</header>`);
  document.body.insertAdjacentHTML('beforeend', `
<footer class="footer">
  <div class="soc">
    <a href="#" aria-label="Facebook"><svg class="i" viewBox="0 0 24 24"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8z"/></svg></a>
    <a href="#" aria-label="Instagram"><svg class="i" viewBox="0 0 24 24"><path d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3zm4 3.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM16.8 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg></a>
    <a href="#" aria-label="X"><svg class="i" viewBox="0 0 24 24"><path d="M4 4h4l4 6 5-6h3l-6.5 8L21 20h-4l-4.5-6.5L7 20H4l7-8z"/></svg></a>
    <a href="#" aria-label="YouTube"><svg class="i" viewBox="0 0 24 24"><path d="M22 8.5a3 3 0 0 0-2-2C18 6 12 6 12 6s-6 0-8 .5a3 3 0 0 0-2 2A31 31 0 0 0 2 12a31 31 0 0 0 0 3.5 3 3 0 0 0 2 2c2 .5 8 .5 8 .5s6 0 8-.5a3 3 0 0 0 2-2 31 31 0 0 0 0-3.5 31 31 0 0 0 0-3.5zM10 15V9l5 3z"/></svg></a>
  </div>
  <div class="cols">
    <a href="#">Audiodescription</a><a href="#">Centre d'aide</a><a href="#">Cartes cadeaux</a><a href="#">Presse</a>
    <a href="#">Relations investisseurs</a><a href="#">Emplois</a><a href="#">Conditions d'utilisation</a><a href="#">Confidentialité</a>
    <a href="#">Informations légales</a><a href="#">Préférences de cookies</a><a href="#">Mentions légales</a><a href="#">Nous contacter</a>
  </div>
  <button class="code" data-toast="Code de service : 482-113">Code de service</button>
  <p>© ${new Date().getFullYear()} Ondes — projet de démonstration. Tous les titres sont fictifs ; photos Unsplash / Pexels.</p>
</footer>
<div class="preview" id="preview" role="dialog" aria-label="Aperçu">
  <div class="media"><img alt="" id="pvImg"><div class="mark" aria-hidden="true">O</div><div class="ttl" id="pvTitle"></div>
    <button class="mute" data-pv-mute aria-label="Activer le son"><svg class="i" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l4 6M21 9l-4 6"/></svg></button></div>
  <div class="body">
    <div class="ctl">
      <button class="rb play" data-pv="Lecture" aria-label="Lecture"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l15 9-15 9z"/></svg></button>
      <button class="rb" data-pv="list" aria-label="Ma liste"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
      <button class="rb" data-pv="like" aria-label="J'aime"><svg class="i" viewBox="0 0 24 24"><path d="M7 11v9H4v-9zM7 11l4-8a2.5 2.5 0 0 1 2.5 2.5V9h4.5a2 2 0 0 1 2 2.3l-1.2 6.7a2 2 0 0 1-2 1.7H7"/></svg></button>
      <button class="rb more" data-pv="Détails" aria-label="Plus d'infos"><svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
    </div>
    <div class="facts"><span class="box" id="pvAge"></span><span id="pvSeasons"></span><span class="box hd">HD</span></div>
    <div class="genres" id="pvGenres"></div>
  </div>
</div>`);

  /* Header : recherche dépliable, menu profil, fond au défilement */
  const sb = $('#searchbar'), q = $('#q');
  $('#searchBtn').addEventListener('click', () => { sb.classList.toggle('open'); if (sb.classList.contains('open')) q.focus(); });
  q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); document.querySelectorAll('[data-pvt]').forEach(c => { c.style.opacity = !v || (c.dataset.pvt + ' ' + c.dataset.genres).toLowerCase().includes(v) ? '' : '.2'; }); });
  sb.addEventListener('submit', e => { e.preventDefault(); toast(q.value ? `Recherche : ${q.value}` : 'Saisissez un titre'); });
  const pr = $('#profile'), menu = $('#menu');
  $('#pbtn').addEventListener('click', e => { e.stopPropagation(); const o = menu.classList.toggle('open'); pr.setAttribute('aria-expanded', o); });
  document.addEventListener('click', () => { menu.classList.remove('open'); pr.setAttribute('aria-expanded', 'false'); });
  const onScroll = () => $('#header').classList.toggle('solid', window.scrollY > 40); onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Rendu des cartes ---------- */
  const attrs = f => `data-pvt="${f.t}" data-img="${f.img}" data-age="${f.age}" data-seasons="${f.s}" data-genres="${f.g}" data-id="${f.id}" data-toast="${f.t.replace('<br>', ' ')}"`;
  const topCard = (f, i) => `<button class="top" ${attrs(f)}><span class="num${i === 1 ? ' two' : ''}" aria-hidden="true">${i + 1}</span><span class="poster"><img src="${f.img}" alt="" loading="lazy"><span class="pt">${f.t}</span>${labels[i] ? `<span class="lbl">${labels[i]}</span>` : ''}</span></button>`;
  const pickCard = (f, i, top10 = true) => `<button class="pick" ${attrs(f)}><img src="${f.img}" alt="" loading="lazy">${top10 ? '<span class="top10">TOP<br>10</span>' : ''}<span class="pt">${f.t}</span>${labels[(i + 1) % labels.length] ? `<span class="lbl">${labels[(i + 1) % labels.length]}</span>` : ''}</button>`;
  const row = (id, title, items, kind, dashes = 2) => `<section class="rowsec"><div class="rowhead"><h2>${title}</h2><div class="pager">${Array.from({length: dashes}, (_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div></div>
    <button class="arr l" data-track="${id}" data-dir="-1" aria-label="Précédent"><svg class="i" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
    <div class="track" id="${id}">${items.map((f, i) => kind === 'top' ? topCard(f, i) : pickCard(f, i, kind === 'pick')).join('')}</div>
    <button class="arr r" data-track="${id}" data-dir="1" aria-label="Suivant"><svg class="i" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button></section>`;

  /* Chaque page déclare ses rangées via <div data-rows> */
  const ROWS = {
    accueil: () => row('top10', 'Top 10 des séries au Maroc aujourd\'hui', list(...SERIES), 'top') + row('picks', 'Sélection du jour pour vous', list(...FILMS), 'pick', 3) + row('news', 'Nouveautés sur Ondes', list('lecon', 'printemps', 'jeudi', 'symbiote', 'vallon', 'rivages'), 'plain', 2),
    series: () => row('top10', 'Top 10 des séries au Maroc aujourd\'hui', list(...SERIES), 'top') + row('kdrama', 'Séries coréennes', list('souriciere', 'printemps', 'lecon', 'jeudi', 'rivages', 'sorceleur'), 'plain') + row('policier', 'Séries policières', list('gentlemen', 'beaute', 'vallon', 'rythme', 'sorceleur', 'jeudi'), 'pick'),
    films: () => row('top10', 'Top 10 des films au Maroc aujourd\'hui', list(...FILMS, 'vallon', 'lecon'), 'top') + row('action', 'Films d\'action', list('cartel', 'corps', 'justicier', 'maree', 'vikings', 'symbiote'), 'pick') + row('drame', 'Drames et suspense', list('murmure', 'novocaine', 'vikings', 'justicier', 'cartel', 'corps'), 'plain'),
    nouveautes: () => row('week', 'Nouveautés de la semaine', list('lecon', 'printemps', 'novocaine', 'symbiote', 'jeudi', 'murmure'), 'pick', 3) + row('soon', 'Bientôt disponibles', list('vikings', 'maree', 'rivages', 'sorceleur', 'beaute', 'gentlemen'), 'plain') + row('top10', 'Top 10 aujourd\'hui', list(...SERIES), 'top'),
  };
  const host = $('[data-rows]');
  if (host && ROWS[page]) host.innerHTML = ROWS[page]();
  const grid = $('[data-grid]');
  if (grid) {
    const ids = grid.dataset.grid === 'list' ? store.list : grid.dataset.grid === 'films' ? FILMS : SERIES;
    grid.innerHTML = ids.length ? list(...ids).map((f, i) => pickCard(f, i, false)).join('') : '<p class="empty">Votre liste est vide. Survolez un titre et cliquez sur « + » pour l\'ajouter.</p>';
  }
  const langs = $('[data-langs]');
  if (langs) {
    const all = Object.keys(C); const render = l => langs.innerHTML = list(...all.filter(k => !l || C[k].lang === l)).map((f, i) => pickCard(f, i, false)).join('');
    render(''); document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('[data-lang]').forEach(x => x.classList.remove('active')); b.classList.add('active'); render(b.dataset.lang); }));
  }
  document.querySelectorAll('[data-track]').forEach(b => b.addEventListener('click', () => { const t = document.getElementById(b.dataset.track); t.scrollBy({ left: b.dataset.dir * t.clientWidth * .9, behavior: 'smooth' }); }));

  /* Menu déroulant « Genres » / mute (pages Séries, Films) */
  document.querySelectorAll('.select').forEach(sel => { const b = sel.querySelector(':scope > button'), l = sel.querySelector('.list');
    b.addEventListener('click', e => { e.stopPropagation(); l.classList.toggle('open'); });
    l.addEventListener('click', e => { const g = e.target.closest('button'); if (g) { b.firstChild.textContent = g.textContent; l.classList.remove('open'); toast(`Genre : ${g.textContent}`); } });
    document.addEventListener('click', () => l.classList.remove('open')); });
  document.querySelectorAll('[data-mute]').forEach(m => m.addEventListener('click', () => { const on = m.getAttribute('aria-pressed') !== 'true'; m.setAttribute('aria-pressed', on);
    m.innerHTML = on ? '<svg class="i" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l4 6M21 9l-4 6"/></svg>' : '<svg class="i" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg>'; }));

  /* ---------- Aperçu au survol ---------- */
  const pv = $('#preview'); let pvTimer, hideTimer, cur = null;
  const syncBtns = () => { const id = cur && cur.dataset.id; pv.querySelector('[data-pv="list"]').classList.toggle('on', store.list.includes(id)); pv.querySelector('[data-pv="like"]').classList.toggle('on', store.likes.includes(id)); };
  const showPv = card => {
    clearTimeout(hideTimer); cur = card;
    $('#pvImg').src = card.dataset.img; $('#pvTitle').innerHTML = card.dataset.pvt; $('#pvAge').textContent = card.dataset.age; $('#pvSeasons').textContent = card.dataset.seasons;
    $('#pvGenres').innerHTML = card.dataset.genres.split('|').map(g => `<span>${g}</span>`).join('<i></i>'); syncBtns();
    const r = (card.querySelector('.poster') || card).getBoundingClientRect(), w = 390, vw = document.documentElement.clientWidth;
    let left = r.left + r.width / 2 - w / 2; left = Math.max(12, Math.min(left, vw - w - 12));
    pv.style.left = (left + window.scrollX) + 'px'; pv.style.top = (r.top + window.scrollY + r.height / 2) + 'px'; pv.classList.add('show');
  };
  const hidePv = () => { hideTimer = setTimeout(() => { pv.classList.remove('show'); cur = null; }, 150); };
  document.addEventListener('mouseover', e => { const c = e.target.closest('[data-pvt]'); if (c) { clearTimeout(pvTimer); clearTimeout(hideTimer); if (c !== cur) pvTimer = setTimeout(() => showPv(c), 350); } });
  document.addEventListener('mouseout', e => { const c = e.target.closest('[data-pvt]'); if (c && !c.contains(e.relatedTarget) && !pv.contains(e.relatedTarget)) { clearTimeout(pvTimer); hidePv(); } });
  pv.addEventListener('mouseenter', () => clearTimeout(hideTimer)); pv.addEventListener('mouseleave', hidePv);
  document.addEventListener('focusin', e => { const c = e.target.closest('[data-pvt]'); if (c) showPv(c); });
  pv.addEventListener('click', e => { e.stopPropagation(); const m = e.target.closest('[data-pv-mute]'); if (m) { m.classList.toggle('on'); return; }
    const b = e.target.closest('[data-pv]'); if (!b || !cur) return; const id = cur.dataset.id, name = cur.dataset.pvt.replace('<br>', ' ');
    if (b.dataset.pv === 'list') { const i = store.list.indexOf(id); i < 0 ? store.list.push(id) : store.list.splice(i, 1); save(); syncBtns(); toast(i < 0 ? `Ajouté à ma liste : ${name}` : `Retiré de ma liste : ${name}`); }
    else if (b.dataset.pv === 'like') { const i = store.likes.indexOf(id); i < 0 ? store.likes.push(id) : store.likes.splice(i, 1); save(); syncBtns(); toast(i < 0 ? `Vous aimez ${name}` : `Retiré des favoris`); }
    else toast(`${b.dataset.pv} : ${name}`); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { pv.classList.remove('show'); cur = null; } });
  window.addEventListener('scroll', () => { if (cur) { pv.classList.remove('show'); cur = null; } }, { passive: true });
})();
