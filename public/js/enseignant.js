/* CASHEVENT SCHOOL — espace enseignant référent

   L'élève apprend, l'assistant analyse, l'enseignant supervise. Cette page dit
   à l'enseignant qui regarder, puis lui fait enregistrer le suivi du mois :
   c'est ce suivi, et lui seul, qui déclenche sa rémunération.               */
(async () => {
  const { $, $$, message, entete, pied, chargement, erreurFatale } = UI;

  chargement(true);
  let moi;
  try { moi = await API.get('/auth/moi').then(r => r.utilisateur); }
  catch (e) { chargement(false); return erreurFatale(e.message); }
  entete(moi, 'enseignant', {});
  pied();
  chargement(false);

  /* --------------------------------- outils ------------------------------- */
  const echapper = t => String(t == null ? '' : t)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dateFR = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '—';
  const moisFR = m => new Date(m + '-01T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const moisActuel = () => moisFR(new Date().toISOString().slice(0, 7));
  const fcfa = n => Number(n).toLocaleString('fr-FR') + ' FCFA';
  const eur = n => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const couleur = p => p >= 70 ? 'var(--ok)' : p >= 40 ? 'var(--warn)' : 'var(--brand)';
  const pastille = teinte => `<span class="pastille-mat" style="background:${echapper(teinte)}"></span>`;

  const STATUTS = {
    bonne_voie: ['En bonne voie', 'Rien à signaler, il avance'],
    encourager: ['À encourager', 'Il avance, mais doit garder le rythme'],
    aide: ['A besoin d’aide', 'Il décroche : dites-lui quoi reprendre']
  };

  const activite = x => x.joursInactif === null ? 'Pas encore commencé'
    : x.joursInactif === 0 ? 'Aujourd’hui'
    : x.joursInactif === 1 ? 'Hier' : 'Il y a ' + x.joursInactif + ' jours';

  /* --------------------------------- onglets ------------------------------ */
  const ONGLETS = [['bord', 'Tableau de bord'], ['eleves', 'Mes élèves'],
                   ['tp', 'TP à faire'], ['profil', 'Mon code']];
  let onglet = location.hash.slice(1) || 'bord';
  if (!ONGLETS.some(([id]) => id === onglet)) onglet = 'bord';

  $('#onglets').innerHTML = ONGLETS.map(([id, l]) =>
    `<button data-onglet="${id}" class="${id === onglet ? 'active' : ''}">${l}</button>`).join('');
  const aller = id => {
    onglet = id; location.hash = id;
    $$('#onglets button').forEach(x => x.classList.toggle('active', x.dataset.onglet === id));
    rendre();
  };
  $('#onglets').addEventListener('click', e => {
    const b = e.target.closest('[data-onglet]'); if (b) aller(b.dataset.onglet);
  });

  const vue = $('#vue');
  /* Un écouteur par type d'évènement : chaque vue remplace ses gestionnaires. */
  let gestionnaire = null, soumission = null, changement = null, saisie = null;
  vue.addEventListener('click', e => { if (gestionnaire) gestionnaire(e); });
  vue.addEventListener('submit', e => { if (soumission) soumission(e); });
  vue.addEventListener('change', e => { if (changement) changement(e); });
  vue.addEventListener('input', e => { if (saisie) saisie(e); });
  const attente = () => vue.innerHTML =
    '<div class="chargement"><span class="rond"></span><p>Chargement…</p></div>';

  const bandeau = t => `
    <div class="bandeau-remu">
      <b>Rémunération de suivi pédagogique</b>
      <span>${fcfa(t.fcfa)} ≈ ${eur(t.eur)} par élève suivi, par matière, chaque mois où le suivi est fait.</span>
    </div>`;

  const copier = async e => {
    const b = e.target.closest('[data-copier]'); if (!b) return false;
    try { await navigator.clipboard.writeText(b.dataset.copier); message('Code copié : ' + b.dataset.copier); }
    catch (err) { message('Votre code : ' + b.dataset.copier); }
    return true;
  };

  const ouvrirSiDossier = e => {
    const b = e.target.closest('[data-dossier]'); if (!b) return false;
    const [eleve, matiere] = b.dataset.dossier.split(':').map(Number);
    ouvrirDossier(eleve, matiere);
    return true;
  };

  /* Depuis le tableau de bord : ouvre « Mes élèves » sur le bon segment. */
  const ouvrirSegment = e => {
    const b = e.target.closest('[data-segment]'); if (!b) return false;
    Object.assign(filtre, { q: '', etat: b.dataset.segment, tri: 'priorite', page: 0 });
    aller('eleves');
    return true;
  };

  /* Une ligne d'élève, la même au tableau de bord et dans la liste. */
  const ligneEleve = r => `
    <div class="ligne-eleve">
      <span class="av petite">${echapper((r.eleve.nom || '?')[0].toUpperCase())}</span>
      <span class="nom"><b>${echapper(r.eleve.nom)}</b>
        <small>${pastille(r.matiere.teinte)}${echapper(r.matiere.nom)}${
          r.eleve.filiere ? ' · ' + echapper(r.eleve.filiere) : ''}${
          r.raisons.length ? ' · ' + r.raisons.map(echapper).join(' · ') : ''}</small></span>
      <span class="jauge" title="${r.termines} chapitre(s) terminé(s) sur ${r.total}">
        <i style="width:${r.avancement}%;background:${couleur(r.avancement)}"></i></span>
      <span class="chiffre">${r.avancement} %</span>
      <span class="chiffre${r.moyenne !== null && r.moyenne < 60 ? ' faible' : ''}"
        title="Moyenne aux QCM">${r.moyenne === null ? '—' : r.moyenne + ' %'}</span>
      ${r.suivi
        ? `<span class="statut-suivi fait" title="${STATUTS[r.suivi.statut][0]}">Suivi fait</span>`
        : '<span class="statut-suivi">Suivi à faire</span>'}
      <button class="pilule mini" data-dossier="${r.eleve.id}:${r.matiere.id}">Dossier</button>
    </div>`;

  /* ----------------------------- tableau de bord -------------------------- */
  async function rendreBord() {
    attente();
    const d = await API.get('/enseignant/tableau-bord');
    const r = d.remuneration;

    if (!d.totaux.suivis) {
      const noms = d.profil.matieres.map(m => m.nom).join(', ') || 'vos matières';
      vue.innerHTML = bandeau(r.tarif) + `
        <div class="panneau">
          <h2>Aucun élève ne vous a encore désigné</h2>
          <p class="sous">Donnez ce code à vos élèves. Ils le saisissent à l’inscription, ou plus tard
            dans « Ma progression », pour vous choisir comme professeur de ${echapper(noms)}.</p>
          <div class="code-prof"><span>${echapper(d.profil.code)}</span>
            <button class="pilule blanc" data-copier="${echapper(d.profil.code)}">Copier le code</button></div>
          <ol class="etapes-prof">
            <li>Vos élèves créent leur compte Cashevent School.</li>
            <li>Ils vous désignent avec ce code, matière par matière.</li>
            <li>Chaque mois, vous ouvrez leur dossier et enregistrez votre suivi :
              ${fcfa(r.tarif.fcfa)} par élève et par matière.</li>
          </ol>
        </div>`;
      gestionnaire = copier;
      return;
    }

    const seg = d.repartition.segments;
    const pc = (n, sur = d.totaux.suivis) => sur ? Math.round(n / sur * 100) : 0;
    const maxHisto = Math.max(1, ...d.repartition.avancement.map(t => t.eleves));

    vue.innerHTML = bandeau(r.tarif) + `
      <div class="tuiles">
        <div class="tuile"><div class="lab">Élèves suivis</div><div class="val">${d.totaux.eleves}</div>
          <div class="sous">${d.totaux.suivis} suivi(s), matière par matière</div></div>
        <div class="tuile"><div class="lab">Suivis faits — ${moisFR(d.mois)}</div>
          <div class="val">${r.suivisFaits}<small> / ${r.elevesSuivis}</small></div>
          <div class="sous">${r.suivisRestants
            ? r.suivisRestants + ' encore à faire ce mois-ci' : 'Tous les suivis du mois sont faits'}</div>
          ${r.suivisRestants ? '<button class="pilule mini blanc espace-haut" data-segment="afaire">Faire les suivis</button>' : ''}</div>
        <div class="tuile principale-remu"><div class="lab">Rémunération validée</div>
          <div class="val">${fcfa(r.du.fcfa)}</div>
          <div class="sous">≈ ${eur(r.du.eur)} · jusqu’à ${fcfa(r.potentiel.fcfa)} si tous les suivis sont faits</div></div>
        <div class="tuile"><div class="lab">À regarder en priorité</div><div class="val">${seg.signalesAFaire}</div>
          <div class="sous">élève(s) signalé(s), suivi pas encore fait</div></div>
      </div>

      <div class="colonnes-admin">
        <div>
          <div class="panneau">
            <h2>La classe d’un coup d’œil</h2>
            <p class="sous">Un suivi par élève et par matière. Cliquez sur un groupe pour l’ouvrir dans
              « Mes élèves ».</p>
            <div class="segments-prof">
              ${[['afaire', 'Suivi à faire ce mois-ci', seg.afaire, 'var(--warn)'],
                 ['signales', 'Signalés par l’analyse', seg.signales, 'var(--brand)'],
                 ['inactifs', 'Sans activité depuis 2 semaines', seg.inactifs, '#9db6ff'],
                 ['pascommence', 'Pas encore commencé', seg.pasCommence, '#8c8c8c'],
                 ['faits', 'Suivi fait', seg.faits, 'var(--ok)']].map(([id, l, n, c]) => `
                <button class="segment-prof" data-segment="${id}">
                  <span class="lib">${l}</span><b>${n}</b>
                  <span class="jauge large"><i style="width:${pc(n)}%;background:${c}"></i></span>
                </button>`).join('')}
            </div>
            <h3 class="titre-bloc espace-haut">Progression dans la matière</h3>
            <div class="histo-prof">
              ${d.repartition.avancement.map(t => `
                <div class="barre-histo" title="${t.eleves} suivi(s) entre ${t.de} et ${t.a} %">
                  <b>${t.eleves}</b>
                  <span class="col"><i style="height:${Math.max(2, pc(t.eleves, maxHisto))}%"></i></span>
                  <small>${t.de}–${t.a} %</small>
                </div>`).join('')}
            </div>
          </div>

          <div class="panneau espace-haut">
            <h2>À suivre en priorité</h2>
            <p class="sous">L’analyse des QCM et de l’activité signale ces élèves. Ouvrez leur dossier,
              puis enregistrez votre suivi.</p>
            ${d.priorites.length ? d.priorites.map(ligneEleve).join('')
              : '<p class="sous derniere">Aucun élève en difficulté sans suivi ce mois-ci.</p>'}
            ${seg.signalesAFaire > d.priorites.length ? `
              <button class="pilule mini espace-haut" data-segment="signales">
                Voir les ${seg.signalesAFaire} élèves signalés</button>` : ''}
          </div>

          <div class="panneau espace-haut">
            <h2>Notions difficiles</h2>
            <p class="sous">Les chapitres ratés par le plus d’élèves, et les notions qu’ils recouvrent.</p>
            ${d.notionsDifficiles.length ? d.notionsDifficiles.map(n => `
              <div class="notion-difficile">
                <div class="tete">${pastille(n.matiere.teinte)}<b>${echapper(n.chapitre)}</b>
                  <small>${echapper(n.matiere.nom)} · ${n.eleves} élève(s) sous 60 %</small></div>
                ${n.notions.length
                  ? `<div class="tags">${n.notions.map(t => `<span>${echapper(t)}</span>`).join('')}</div>` : ''}
              </div>`).join('')
              : '<p class="sous derniere">Aucun chapitre ne pose de difficulté particulière pour l’instant.</p>'}
          </div>
        </div>

        <div>
          <div class="panneau">
            <h2>Par matière</h2>
            <p class="sous">Uniquement vos élèves, et uniquement dans votre matière.</p>
            ${d.parMatiere.map(m => `
              <div class="ligne-matiere-prof">
                <div class="tete">${pastille(m.teinte)}<b>${echapper(m.nom)}</b>
                  <small>${m.eleves} élève(s) · ${m.suivisFaits}/${m.eleves} suivi(s) faits</small></div>
                <span class="jauge large"><i style="width:${m.avancement}%;background:${couleur(m.avancement)}"></i></span>
                <dl class="mini-stats">
                  <div><dt>Progression</dt><dd>${m.avancement} %</dd></div>
                  <div><dt>Moyenne QCM</dt><dd>${m.moyenne === null ? '—' : m.moyenne + ' %'}</dd></div>
                  <div><dt>Chapitres terminés</dt><dd>${m.chapitresTermines}</dd></div>
                  <div><dt>QCM passés</dt><dd>${m.qcmFaits}</dd></div>
                </dl>
              </div>`).join('')}
          </div>

          <div class="panneau espace-haut">
            <h2>Mes rémunérations</h2>
            <p class="sous">Un suivi compte quand vous avez ouvert le dossier de l’élève dans le mois,
              puis enregistré votre avis. Cashevent vérifie ces deux dates avant de payer.</p>
            ${r.historique.length ? r.historique.map(h => `
              <div class="ligne-remu"><span>${moisFR(h.mois)}</span>
                <span>${h.unites} suivi(s)</span><b>${fcfa(h.fcfa)}</b><small>≈ ${eur(h.eur)}</small></div>`).join('')
              : '<p class="sous derniere">Aucun suivi enregistré pour l’instant.</p>'}
          </div>
        </div>
      </div>`;

    gestionnaire = e => ouvrirSegment(e) || ouvrirSiDossier(e);
  }

  /* --------------------------------- élèves ------------------------------- */
  /* Pensé pour cent à mille élèves : on cherche, on filtre, on trie, on pagine,
     puis on enchaîne les dossiers sans revenir à la liste (la « tournée »). */
  const PAR_PAGE = 50;
  const filtre = { q: '', matiere: 'toutes', filiere: 'toutes', etat: 'tous', tri: 'priorite', page: 0 };
  let listeEleves = null;

  const sansAccent = t => String(t == null ? '' : t)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const inactif = r => r.joursInactif !== null &&
    r.joursInactif >= ((listeEleves && listeEleves.inactiviteJours) || 14);

  const ETATS = [
    ['tous', 'Tous', () => true],
    ['afaire', 'Suivi à faire', r => !r.suivi],
    ['signales', 'Signalés', r => r.besoinAide],
    ['inactifs', 'Inactifs', inactif],
    ['pascommence', 'Pas commencé', r => r.joursInactif === null],
    ['faits', 'Suivi fait', r => !!r.suivi]
  ];

  /* Priorité : signalé sans suivi, puis sans suivi, puis suivi fait ; à égalité,
     le plus de chapitres ratés, puis le décrochage le plus long. */
  const urgence = r => r.suivi ? 0 : r.besoinAide ? 2 : 1;
  const parNom = (a, b) => a.eleve.nom.localeCompare(b.eleve.nom, 'fr', { numeric: true }) ||
    a.matiere.nom.localeCompare(b.matiere.nom, 'fr');
  const absent = v => v === null ? 1e9 : v;
  const TRIS = {
    priorite: ['Priorité', (a, b) => (urgence(b) - urgence(a)) || (b.aRevoir - a.aRevoir) ||
      (absent(b.joursInactif) - absent(a.joursInactif)) || parNom(a, b)],
    nom: ['Nom', parNom],
    avancement: ['Progression la plus faible', (a, b) => (a.avancement - b.avancement) || parNom(a, b)],
    moyenne: ['Moyenne QCM la plus faible', (a, b) =>
      ((a.moyenne === null ? 101 : a.moyenne) - (b.moyenne === null ? 101 : b.moyenne)) || parNom(a, b)],
    inactivite: ['Inactifs depuis le plus longtemps', (a, b) =>
      (absent(b.joursInactif) - absent(a.joursInactif)) || parNom(a, b)]
  };

  /* Tous les filtres sauf l'état : sert aussi à compter chaque pastille d'état. */
  const horsEtat = rows => {
    const q = sansAccent(filtre.q).trim();
    return rows.filter(r =>
      (filtre.matiere === 'toutes' || r.matiere.id === Number(filtre.matiere)) &&
      (filtre.filiere === 'toutes' || (r.eleve.filiere || '') === filtre.filiere) &&
      (!q || sansAccent(r.eleve.nom).includes(q)));
  };
  const selection = () => {
    const test = (ETATS.find(([id]) => id === filtre.etat) || ETATS[0])[2];
    return horsEtat(listeEleves.eleves).filter(test).sort(TRIS[filtre.tri][1]);
  };

  /* Export tableur de la sélection courante (séparateur « ; » pour Excel en français). */
  function exporter(rows) {
    const cols = [
      ['Élève', r => r.eleve.nom], ['Filière', r => r.eleve.filiere || ''], ['Matière', r => r.matiere.nom],
      ['Progression (%)', r => r.avancement], ['Chapitres terminés', r => r.termines],
      ['Chapitres', r => r.total], ['Moyenne QCM (%)', r => r.moyenne === null ? '' : r.moyenne],
      ['QCM passés', r => r.qcmFaits], ['Chapitres à revoir', r => r.aRevoir],
      ['Jours sans activité', r => r.joursInactif === null ? 'pas commencé' : r.joursInactif],
      ['Signalé', r => r.besoinAide ? 'oui' : 'non'], ['Raisons', r => r.raisons.join(' ; ')],
      ['Suivi du mois', r => r.suivi ? STATUTS[r.suivi.statut][0] : 'à faire']
    ];
    /* Une cellule qui commence par = + - @ serait lue comme une formule par le tableur. */
    const cellule = v => {
      let t = String(v);
      if (/^[=+\-@]/.test(t)) t = "'" + t;
      return /[";\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    const csv = '﻿' + [cols.map(c => c[0]), ...rows.map(r => cols.map(c => c[1](r)))]
      .map(l => l.map(cellule).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `eleves-${listeEleves.mois}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function rendreEleves(recharger = true) {
    if (recharger || !listeEleves) { attente(); listeEleves = await API.get('/enseignant/eleves'); }
    const d = listeEleves;

    if (!d.eleves.length) {
      vue.innerHTML = `<div class="vide-etat"><b>Aucun élève ne vous a encore désigné</b>
        Votre code est dans l’onglet « Mon code » : donnez-le à vos élèves.</div>`;
      gestionnaire = null;
      return;
    }

    const matieres = [...new Map(d.eleves.map(r => [r.matiere.id, r.matiere])).values()];
    const filieres = [...new Set(d.eleves.map(r => r.eleve.filiere).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'fr'));
    if (filtre.matiere !== 'toutes' && !matieres.some(m => String(m.id) === String(filtre.matiere)))
      filtre.matiere = 'toutes';
    if (filtre.filiere !== 'toutes' && !filieres.includes(filtre.filiere)) filtre.filiere = 'toutes';

    const option = (v, l, actuel) =>
      `<option value="${echapper(v)}" ${String(actuel) === String(v) ? 'selected' : ''}>${echapper(l)}</option>`;

    /* La barre d'outils est posée une fois : la retaper à chaque frappe ferait
       perdre le curseur de la recherche. Seuls les résultats se redessinent. */
    vue.innerHTML = `
      <div class="barre-outils outils-eleves">
        <input class="champ" type="search" id="rechercheEleve" placeholder="Rechercher un élève…"
          value="${echapper(filtre.q)}" aria-label="Rechercher un élève" autocomplete="off">
        ${matieres.length > 1 ? `<select class="champ" id="fMatiere" aria-label="Matière">
          ${option('toutes', 'Toutes les matières', filtre.matiere)}
          ${matieres.map(m => option(m.id, m.nom, filtre.matiere)).join('')}</select>` : ''}
        ${filieres.length > 1 ? `<select class="champ" id="fFiliere" aria-label="Filière">
          ${option('toutes', 'Toutes les filières', filtre.filiere)}
          ${filieres.map(f => option(f, f, filtre.filiere)).join('')}</select>` : ''}
        <select class="champ" id="fTri" aria-label="Trier par">
          ${Object.entries(TRIS).map(([v, [l]]) => option(v, 'Trier : ' + l, filtre.tri)).join('')}</select>
        <button class="pilule mini" data-exporter title="Télécharge la liste affichée, pour Excel">Exporter</button>
      </div>
      <div id="resultatsEleves"></div>`;

    const resultats = () => {
      const base = horsEtat(d.eleves);
      const rows = selection();
      const pages = Math.max(1, Math.ceil(rows.length / PAR_PAGE));
      filtre.page = Math.min(filtre.page, pages - 1);
      const debut = filtre.page * PAR_PAGE;
      const page = rows.slice(debut, debut + PAR_PAGE);
      const faits = d.eleves.filter(r => r.suivi).length;
      const file = rows.filter(r => !r.suivi);

      $('#resultatsEleves').innerHTML = `
        <div class="pills serres etats-eleves">
          ${ETATS.map(([id, l, test]) => `<button data-fe="${id}" class="${filtre.etat === id ? 'active' : ''}">
            ${l} <span class="compte">${base.filter(test).length}</span></button>`).join('')}
        </div>

        <div class="avance-mois">
          <div class="txt"><span><b>${faits} / ${d.eleves.length}</b> suivis faits en ${moisFR(d.mois)}</span>
            <span class="jauge large"><i style="width:${Math.round(faits / d.eleves.length * 100)}%;background:var(--ok)"></i></span></div>
          ${file.length ? `<button class="pilule blanc" data-tournee>Lancer la tournée · ${file.length} dossier${file.length > 1 ? 's' : ''}</button>` : ''}
        </div>

        <div class="panneau">
          ${page.length ? page.map(ligneEleve).join('')
            : '<p class="sous derniere">Aucun élève ne correspond à cette recherche.</p>'}
        </div>

        ${pages > 1 ? `<div class="pagination-prof">
          <button class="pilule mini" data-vers-page="${filtre.page - 1}" ${filtre.page ? '' : 'disabled'}>Précédent</button>
          <span>${debut + 1}–${debut + page.length} sur ${rows.length}</span>
          <button class="pilule mini" data-vers-page="${filtre.page + 1}" ${filtre.page < pages - 1 ? '' : 'disabled'}>Suivant</button>
        </div>` : ''}`;
    };
    resultats();

    let minuterie = null;
    saisie = e => {
      if (e.target.id !== 'rechercheEleve') return;
      clearTimeout(minuterie);
      minuterie = setTimeout(() => { filtre.q = e.target.value; filtre.page = 0; resultats(); }, 120);
    };
    changement = e => {
      const champ = { fMatiere: 'matiere', fFiliere: 'filiere', fTri: 'tri' }[e.target.id];
      if (!champ) return;
      filtre[champ] = e.target.value; filtre.page = 0; resultats();
    };
    gestionnaire = e => {
      const fe = e.target.closest('[data-fe]');
      if (fe) { filtre.etat = fe.dataset.fe; filtre.page = 0; return resultats(); }
      const p = e.target.closest('[data-vers-page]');
      if (p && !p.disabled) {
        filtre.page = Number(p.dataset.versPage); resultats();
        return $('#resultatsEleves').scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
      if (e.target.closest('[data-exporter]')) return exporter(selection());
      if (e.target.closest('[data-tournee]')) {
        const file = selection().filter(r => !r.suivi);
        if (file.length) return ouvrirDossier(file[0].eleve.id, file[0].matiere.id, { file, index: 0, faits: 0 });
      }
      ouvrirSiDossier(e);
    };
  }

  /* -------------------------- dossier d'un élève -------------------------- */
  /* Un statut et un message proposés à partir du dossier. L'enseignant choisit :
     rien n'est coché d'avance, le message ne se remplit qu'au choix du statut. */
  function proposition(x, matiere, seuil) {
    const decroche = x.joursInactif === null || x.joursInactif >= seuil;
    const statut = !x.besoinAide ? 'bonne_voie' : (x.aRevoir >= 2 || decroche) ? 'aide' : 'encourager';
    const faibles = x.chapitres.filter(c => c.aRevoir).sort((a, b) => a.score - b.score).slice(0, 2);
    const suivant = x.chapitres.find(c => !c.termine);
    const phrases = [];
    if (faibles.length) phrases.push(`Reprends ${faibles.map(c =>
      `« ${c.titre} » (${c.score} % au QCM)`).join(' et ')}, puis refais le QCM.`);
    if (x.joursInactif === null)
      phrases.push(`Tu n’as pas encore commencé ${matiere}${suivant ? ` : lance-toi avec « ${suivant.titre} »` : ''}.`);
    else if (x.joursInactif >= seuil)
      phrases.push(`Tu n’as rien fait en ${matiere} depuis ${x.joursInactif} jours${
        suivant ? ` : reprends avec « ${suivant.titre} »` : ''}.`);
    const messages = {
      bonne_voie: phrases.length ? phrases.join(' ') : 'Continue comme ça, ton rythme est bon.',
      encourager: phrases.length ? phrases.join(' ')
        : `Tu avances bien, garde ce rythme${suivant ? ` et attaque « ${suivant.titre} »` : ''}.`,
      aide: phrases.length ? phrases.join(' ')
        : `Il faut t’accrocher en ${matiere}${suivant ? ` : reprends « ${suivant.titre} »` : ''}, et écris-moi si tu bloques.`
    };
    return { statut, messages };
  }

  /* Après un suivi : la ligne en mémoire est mise à jour, sans recharger la liste. */
  const noterSuivi = (eleveId, matiereId, statut) => {
    const r = listeEleves && listeEleves.eleves.find(x => x.eleve.id === eleveId && x.matiere.id === matiereId);
    if (r) r.suivi = { statut, le: new Date().toISOString() };
  };
  const apresDossier = () => onglet === 'eleves' && listeEleves ? rendreEleves(false) : rendre();

  /* tournee : { file: [lignes], index, faits } — enchaîne les dossiers de la file. */
  async function ouvrirDossier(eleveId, matiereId, tournee = null) {
    let d;
    try { d = await API.get(`/enseignant/eleves/${eleveId}/matieres/${matiereId}`); }
    catch (e) { return message(e.message); }
    const x = d.dossier, s = d.suivi;
    const prop = proposition(x, d.matiere.nom, d.inactiviteJours || 14);
    const dernier = tournee && tournee.index === tournee.file.length - 1;

    const ancienne = $('#modaleDossier');
    if (ancienne) ancienne.remove();
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modale" id="modaleDossier" role="dialog" aria-modal="true" aria-labelledby="titreDossier">
        <div class="modale-corps">
          <button class="close" data-fermer aria-label="Fermer">×</button>
          ${tournee ? `<div class="tournee-tete">
            <span><b>Tournée</b> · dossier ${tournee.index + 1} sur ${tournee.file.length}
              ${tournee.faits ? ` · ${tournee.faits} suivi${tournee.faits > 1 ? 's' : ''} enregistré${tournee.faits > 1 ? 's' : ''}` : ''}</span>
            <span class="jauge large"><i style="width:${Math.round(tournee.index / tournee.file.length * 100)}%;background:var(--ok)"></i></span>
          </div>` : ''}
          <p class="sur-titre">${pastille(d.matiere.teinte)} ${echapper(d.matiere.nom)} ·
            vous suit depuis le ${dateFR(d.depuis)}</p>
          <h2 id="titreDossier">${echapper(d.eleve.nom)}</h2>
          ${d.eleve.filiere ? `<p class="sous">${echapper(d.eleve.filiere)}</p>` : ''}

          ${x.besoinAide ? `<div class="alerte-prof"><b>Pourquoi le regarder</b>
            <ul>${x.raisons.map(t => `<li>${echapper(t)}</li>`).join('')}</ul></div>` : ''}

          <div class="tuiles">
            <div class="tuile"><div class="lab">Progression</div><div class="val">${x.avancement} %</div>
              <div class="sous">dans la matière</div></div>
            <div class="tuile"><div class="lab">Chapitres terminés</div>
              <div class="val">${x.termines}<small> / ${x.total}</small></div></div>
            <div class="tuile"><div class="lab">Moyenne aux QCM</div>
              <div class="val">${x.moyenne === null ? '—' : x.moyenne + ' %'}</div>
              <div class="sous">${x.qcmFaits} QCM passé(s)</div></div>
            <div class="tuile"><div class="lab">Dernière activité</div>
              <div class="val petit">${activite(x)}</div></div>
          </div>

          <div class="panneau espace-haut">
            <h2>Suivi de ${moisActuel()}</h2>
            <p class="sous">${s
              ? `Enregistré le ${dateFR(s.maj_le || s.cree_le)}. Vous pouvez le modifier jusqu’à la fin du mois.`
              : 'Votre avis du mois. C’est ce suivi qui compte pour votre rémunération.'}</p>
            <form id="formSuivi">
              <div class="choix-statut">
                ${Object.entries(STATUTS).map(([v, [titre, aide]], i) => `
                  <label class="${s && s.statut === v ? 'actif' : ''}">
                    <input type="radio" name="statut" value="${v}" ${s && s.statut === v ? 'checked' : ''}>
                    <b>${titre}${prop.statut === v ? ' <em class="suggere">suggéré</em>' : ''}</b>
                    <small>${aide}</small><kbd>${i + 1}</kbd></label>`).join('')}
              </div>
              <label class="champ-libelle">Message à l’élève
                <small>— obligatoire s’il faut l’encourager ou l’aider · une proposition se remplit
                  au choix de l’état, à relire</small>
                <textarea class="champ" name="commentaire" rows="3" maxlength="600"
                  placeholder="Ex. Reprends le chapitre sur les suites, puis refais le QCM.">${
                  echapper((s && s.commentaire) || '')}</textarea></label>
              <div class="actions-suivi espace-haut">
                <button class="pilule blanc" type="submit">${tournee
                  ? (dernier ? 'Enregistrer et terminer' : 'Enregistrer et passer au suivant')
                  : s ? 'Mettre à jour le suivi' : 'Enregistrer le suivi'}</button>
                ${tournee && !dernier ? '<button class="pilule mini" type="button" data-passer>Passer cet élève</button>' : ''}
                <small class="raccourcis">1 · 2 · 3 pour l’état, Ctrl + Entrée pour enregistrer, Échap pour fermer</small>
              </div>
            </form>
          </div>

          ${x.notionsDifficiles.length ? `
            <h3 class="titre-bloc espace-haut">Notions à retravailler</h3>
            <div class="tags-prof">${x.notionsDifficiles.map(n =>
              `<span title="${echapper(n.chapitre)}">${echapper(n.libelle)}</span>`).join('')}</div>` : ''}

          <h3 class="titre-bloc espace-haut">Chapitres</h3>
          <div class="tableau-defile"><table class="tableau">
            <thead><tr><th>Chapitre</th><th>Progression</th><th>État</th><th>QCM</th></tr></thead>
            <tbody>${x.chapitres.map(c => `<tr>
              <td><b>${c.numero}. ${echapper(c.titre)}</b></td>
              <td><span class="jauge"><i style="width:${c.avancement}%;background:${couleur(c.avancement)}"></i></span>
                ${c.avancement} %</td>
              <td>${c.termine ? '<span class="etiquette ok">Terminé</span>'
                : c.avancement ? '<span class="etiquette encours">En cours</span>'
                : '<span class="etiquette muet">Pas commencé</span>'}</td>
              <td class="${c.aRevoir ? 'score-faible' : ''}">${c.score === null ? '—' : c.score + ' %'}</td>
            </tr>`).join('')}</tbody>
          </table></div>

          ${d.historique.length ? `
            <h3 class="titre-bloc espace-haut">Suivis enregistrés</h3>
            ${d.historique.map(h => `<div class="ligne-remu">
              <span>${moisFR(h.mois)}</span><span>${STATUTS[h.statut][0]}</span>
              <small>${echapper(h.commentaire || '')}</small></div>`).join('')}` : ''}
        </div>
      </div>`);

    const modale = $('#modaleDossier');
    const form = $('#formSuivi', modale);
    const zone = form.commentaire;
    document.body.style.overflow = 'hidden';
    modale.scrollTop = 0;

    const fermer = () => {
      modale.remove(); document.removeEventListener('keydown', clavier);
      document.body.style.overflow = '';
      if (tournee && tournee.faits) message(`Tournée interrompue : ${tournee.faits} suivi(s) enregistré(s)`);
      apresDossier();
    };
    const suivant = faits => {
      modale.remove(); document.removeEventListener('keydown', clavier);
      const t = { ...tournee, index: tournee.index + 1, faits };
      if (t.index < t.file.length) return ouvrirDossier(t.file[t.index].eleve.id, t.file[t.index].matiere.id, t);
      document.body.style.overflow = '';
      message(`Tournée terminée : ${faits} suivi(s) enregistré(s)`);
      apresDossier();
    };

    /* Le message proposé n'écrase jamais ce que l'enseignant a tapé lui-même. */
    let dernierPropose = null;
    const choisir = statut => {
      const r = form.querySelector(`input[name=statut][value=${statut}]`);
      r.checked = true;
      $$('.choix-statut label', modale).forEach(l => l.classList.toggle('actif', l.querySelector('input').checked));
      if (!zone.value.trim() || zone.value === dernierPropose) {
        zone.value = dernierPropose = prop.messages[statut];
      }
    };

    function clavier(e) {
      if (e.key === 'Escape') return fermer();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); return form.requestSubmit(); }
      if (e.target === zone || e.ctrlKey || e.metaKey || e.altKey) return;
      const statut = Object.keys(STATUTS)[Number(e.key) - 1];
      if (statut) { e.preventDefault(); choisir(statut); }
    }
    document.addEventListener('keydown', clavier);

    modale.addEventListener('click', e => {
      if (e.target === modale || e.target.closest('[data-fermer]')) return fermer();
      if (e.target.closest('[data-passer]')) return suivant(tournee.faits);
    });
    modale.addEventListener('change', e => {
      if (e.target.name === 'statut') choisir(e.target.value);
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const statut = (form.querySelector('input[name=statut]:checked') || {}).value;
      if (!statut) return message('Choisissez où en est l’élève (touche 1, 2 ou 3).');
      const bouton = form.querySelector('[type=submit]');
      if (bouton.disabled) return;
      bouton.disabled = true;
      try {
        await API.post(`/enseignant/eleves/${eleveId}/matieres/${matiereId}/suivi`,
          { statut, commentaire: zone.value });
        noterSuivi(eleveId, matiereId, statut);
        if (tournee) return suivant(tournee.faits + 1);
        message('Suivi enregistré pour ' + d.eleve.nom);
        fermer();
      } catch (err) { message(err.message); bouton.disabled = false; }
    });
  }

  /* ----------------------------------- TP --------------------------------- */
  const TYPES_EXT = {
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    odt: 'application/vnd.oasis.opendocument.text', txt: 'text/plain',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg'
  };
  const lireBase64 = fichier => new Promise((ok, ko) => {
    const lecteur = new FileReader();
    lecteur.onload = () => ok(String(lecteur.result).split(',')[1] || '');
    lecteur.onerror = () => ko(new Error('Lecture du fichier impossible.'));
    lecteur.readAsDataURL(fichier);
  });
  const poids = o => o < 1024 * 1024 ? Math.max(1, Math.round(o / 1024)) + ' Ko'
    : (Math.round(o / 1024 / 1024 * 10) / 10).toLocaleString('fr-FR') + ' Mo';

  async function rendreTP() {
    attente();
    const [{ envois }, profil, { eleves }] = await Promise.all([
      API.get('/enseignant/tp'), API.get('/enseignant/profil'), API.get('/enseignant/eleves')
    ]);

    if (!profil.matieres.length) {
      vue.innerHTML = `<div class="vide-etat"><b>Aucune matière déclarée</b>
        Indiquez les matières que vous enseignez dans l’onglet « Mon code ».</div>`;
      gestionnaire = null; soumission = null; changement = null;
      return;
    }

    /* À mille élèves, on vise un groupe plutôt que de cocher mille cases. */
    const siens = matiereId => eleves.filter(r => r.matiere.id === Number(matiereId));
    const GROUPES = [['tous', 'Tous mes élèves', () => true], ['signales', 'Les élèves signalés', r => r.besoinAide]];
    const destinataires = matiereId => {
      const rows = siens(matiereId);
      if (!rows.length) return '<p class="sous derniere">Aucun élève ne vous a encore désigné dans cette matière.</p>';
      return `
        <div class="choix-dest">
          ${GROUPES.map(([v, l, test], i) => `<label><input type="radio" name="dest" value="${v}" ${i ? '' : 'checked'}>
            ${l} <span class="compte">${rows.filter(test).length}</span></label>`).join('')}
          <label><input type="radio" name="dest" value="choisir"> Choisir un par un</label>
        </div>
        <div id="choixEleves" hidden>
          <input class="champ" type="search" id="rechercheDest" placeholder="Filtrer par nom…" autocomplete="off">
          <div class="actions-dest">
            <button type="button" class="pilule mini" data-cocher="1">Tout cocher</button>
            <button type="button" class="pilule mini" data-cocher="0">Tout décocher</button>
            <small id="nbCoches"></small>
          </div>
          <div class="liste-dest">${rows.map(r => `
            <label data-nom="${echapper(sansAccent(r.eleve.nom))}"><input type="checkbox" name="eleve" value="${r.eleve.id}">${
              echapper(r.eleve.nom)}${r.besoinAide ? ' <small>signalé</small>' : ''}</label>`).join('')}</div>
        </div>`;
    };
    const compterCoches = () => {
      const n = $('#nbCoches'); if (n) n.textContent = $$('input[name=eleve]:checked', vue).length + ' coché(s)';
    };

    vue.innerHTML = `
      <div class="colonnes-admin">
        <div>
          <div class="panneau">
            <h2>Envoyer un TP</h2>
            <p class="sous">Le fichier arrive dans l’espace de vos élèves. Vous voyez ensuite qui l’a récupéré.</p>
            <form id="formTP">
              <label class="champ-libelle">Matière
                <select class="champ" name="matiereId">${profil.matieres.map(m =>
                  `<option value="${m.id}">${echapper(m.nom)}</option>`).join('')}</select></label>
              <label class="champ-libelle">Titre
                <input class="champ" name="titre" maxlength="160" required placeholder="TP 3 — Suites numériques"></label>
              <label class="champ-libelle">Consigne <small>— facultatif</small>
                <textarea class="champ" name="consigne" rows="3" maxlength="2000"></textarea></label>
              <label class="champ-libelle">À rendre pour le <small>— facultatif</small>
                <input class="champ" type="date" name="echeance"></label>
              <label class="champ-libelle">Fichier <small>— PDF, Word, OpenDocument, texte ou image · 5 Mo au plus</small>
                <input class="champ fichier" type="file" name="fichier" required
                  accept=".pdf,.doc,.docx,.odt,.txt,.png,.jpg,.jpeg"></label>
              <fieldset class="destinataires"><legend>Élèves</legend>
                <div id="listeDest">${destinataires(profil.matieres[0].id)}</div></fieldset>
              <button class="pilule blanc espace-haut" type="submit">Envoyer le TP</button>
            </form>
          </div>
        </div>

        <div>
          <div class="panneau">
            <h2>TP envoyés</h2>
            ${envois.length ? envois.map(t => `
              <div class="ligne-tp">
                <div class="tete">${pastille(t.teinte)}<b>${echapper(t.titre)}</b>
                  <small>${echapper(t.matiere)} · envoyé le ${dateFR(t.cree_le)}${
                    t.echeance ? ' · à rendre le ' + dateFR(t.echeance) : ''}</small></div>
                <div class="pied-tp">
                  <a class="lien-fichier" href="/api/enseignant/tp/${t.id}/fichier">${echapper(t.fichier_nom)}</a>
                  <small>${poids(t.taille)}</small>
                  <span class="chiffre">${t.telecharges}/${t.destinataires} téléchargé(s)</span>
                  <button class="pilule mini danger" data-supprimer-tp="${t.id}">Supprimer</button>
                </div>
              </div>`).join('')
              : '<p class="sous derniere">Aucun TP envoyé pour l’instant.</p>'}
          </div>
        </div>
      </div>`;

    changement = e => {
      if (e.target.name === 'matiereId') $('#listeDest').innerHTML = destinataires(e.target.value);
      if (e.target.name === 'dest') $('#choixEleves').hidden = e.target.value !== 'choisir';
      if (e.target.name === 'eleve') compterCoches();
    };
    saisie = e => {
      if (e.target.id !== 'rechercheDest') return;
      const q = sansAccent(e.target.value).trim();
      $$('.liste-dest label', vue).forEach(l => { l.hidden = !!q && !l.dataset.nom.includes(q); });
    };

    gestionnaire = async e => {
      const c = e.target.closest('[data-cocher]');
      if (c) {
        /* Seuls les élèves visibles : « Tout cocher » après une recherche vise le résultat. */
        $$('.liste-dest label:not([hidden]) input', vue).forEach(i => { i.checked = c.dataset.cocher === '1'; });
        return compterCoches();
      }
      const b = e.target.closest('[data-supprimer-tp]'); if (!b) return;
      if (!confirm('Supprimer ce TP ? Vos élèves ne pourront plus le télécharger.')) return;
      try { await API.supprimer('/enseignant/tp/' + b.dataset.supprimerTp); message('TP supprimé'); rendreTP(); }
      catch (err) { message(err.message); }
    };

    soumission = async e => {
      e.preventDefault();
      const f = e.target;
      const fichier = f.fichier.files[0];
      if (!fichier) return message('Choisissez un fichier.');
      if (fichier.size > 5 * 1024 * 1024) return message('Le fichier dépasse 5 Mo.');
      const type = fichier.type || TYPES_EXT[fichier.name.split('.').pop().toLowerCase()] || '';
      const mode = (f.querySelector('input[name=dest]:checked') || {}).value;
      const groupe = GROUPES.find(([v]) => v === mode);
      const choisis = groupe
        ? siens(f.matiereId.value).filter(groupe[2]).map(r => r.eleve.id)
        : $$('input[name=eleve]:checked', f).map(c => Number(c.value));
      if (!choisis.length) return message(mode === 'signales'
        ? 'Aucun élève signalé dans cette matière.' : 'Choisissez au moins un élève.');

      const bouton = f.querySelector('[type=submit]');
      bouton.disabled = true; bouton.textContent = 'Envoi en cours…';
      try {
        const r = await API.post('/enseignant/tp', {
          matiereId: Number(f.matiereId.value), titre: f.titre.value, consigne: f.consigne.value,
          echeance: f.echeance.value, eleves: choisis,
          fichier: { nom: fichier.name, type, donnees: await lireBase64(fichier) }
        });
        message(`TP envoyé à ${r.envoi.destinataires} élève(s)`);
        rendreTP();
      } catch (err) {
        message(err.message);
        bouton.disabled = false; bouton.textContent = 'Envoyer le TP';
      }
    };
  }

  /* -------------------------------- mon code ------------------------------ */
  async function rendreProfil() {
    attente();
    const p = await API.get('/enseignant/profil');

    vue.innerHTML = bandeau(p.tarif) + `
      <div class="colonnes-admin">
        <div>
          <div class="panneau">
            <h2>Votre code enseignant</h2>
            <p class="sous">Donnez-le à vos élèves. Ils le saisissent à l’inscription — ou plus tard dans
              « Ma progression » — pour vous désigner comme professeur, matière par matière.</p>
            <div class="code-prof"><span>${echapper(p.code)}</span>
              <button class="pilule blanc" data-copier="${echapper(p.code)}">Copier</button></div>
            <p class="sous derniere espace-haut">Vous ne voyez que les élèves qui vous ont désigné, et
              seulement dans la matière choisie : ni leurs autres matières, ni leurs coordonnées,
              ni celles de leurs parents.</p>
          </div>
        </div>
        <div>
          <div class="panneau">
            <h2>Les matières que vous enseignez</h2>
            <p class="sous">Vos élèves ne peuvent vous désigner que dans ces matières.</p>
            <form id="formMatieres">
              <div class="choix-matieres">${p.toutes.map(m => {
                const sienne = p.matieres.some(x => x.id === m.id);
                return `<label class="${sienne ? 'actif' : ''}">
                  <input type="checkbox" name="m" value="${m.id}" ${sienne ? 'checked' : ''}>
                  ${pastille(m.teinte)}${echapper(m.nom)}</label>`;
              }).join('')}</div>
              <button class="pilule blanc espace-haut" type="submit">Enregistrer</button>
            </form>
          </div>
        </div>
      </div>`;

    gestionnaire = copier;
    changement = e => {
      const l = e.target.closest('.choix-matieres label');
      if (l) l.classList.toggle('actif', e.target.checked);
    };
    soumission = async e => {
      e.preventDefault();
      const ids = $$('input[name=m]:checked', e.target).map(c => Number(c.value));
      try {
        await API.put('/enseignant/profil/matieres', { matieres: ids });
        message('Matières enregistrées'); rendreProfil();
      } catch (err) { message(err.message); }
    };
  }

  /* --------------------------------- routage ------------------------------ */
  async function rendre() {
    gestionnaire = null; soumission = null; changement = null; saisie = null;
    try {
      if (onglet === 'bord') return await rendreBord();
      if (onglet === 'eleves') return await rendreEleves();
      if (onglet === 'tp') return await rendreTP();
      if (onglet === 'profil') return await rendreProfil();
    } catch (e) {
      vue.innerHTML = `<div class="vide-etat"><b>Chargement impossible</b>${echapper(e.message)}</div>`;
    }
  }
  rendre();
})();
