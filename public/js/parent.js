/* CASHEVENT SCHOOL — espace parent : choix de l'enfant puis tableau de bord */
(async () => {
  const { $, $$, message, entete, pied, chargement, erreurFatale } = UI;

  chargement(true);
  let moi, enfants = [];
  try {
    moi = await API.get('/auth/moi').then(r => r.utilisateur);
    enfants = (await API.get('/parent/enfants')).enfants;
  } catch (e) { chargement(false); return erreurFatale(e.message); }

  entete(moi, 'parent', { notifications: true });
  pied();
  chargement(false);

  const jourFR = j => new Date(j + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const jourCourt = j => new Date(j + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric' });

  /* ------------------------------ choix de l'enfant ----------------------- */
  const rendreEnfants = () => {
    if (!enfants.length) {
      $('#enfants').innerHTML = `<div class="vide-etat"><b>Aucun enfant rattaché à votre compte.</b>
        Ajoutez l’adresse e-mail du compte élève de votre enfant ci-dessous pour suivre sa progression.</div>`;
      return;
    }
    $('#enfants').innerHTML = enfants.map((e, i) => `
      <button class="carte-enfant${i === 0 ? ' active' : ''}" data-enfant="${e.id}">
        <span class="av">${e.nom[0].toUpperCase()}</span>
        <span class="txt"><b>${e.nom}</b><small>${e.niveau || 'Élève'}</small></span>
        <span class="mini-stat"><b>${e.apercu.global} %</b><small>${e.apercu.faits}/${e.apercu.total} chapitres</small></span>
      </button>`).join('');
  };

  /* ------------------------------ tableau de bord ------------------------- */
  const rendreTableau = tb => {
    const s = tb.stats;
    const couleur = s.global >= 70 ? 'var(--ok)' : s.global >= 40 ? 'var(--info)' : 'var(--warn)';
    const moyCouleur = s.moyenne === null ? 'var(--info)' : s.moyenne >= 70 ? 'var(--ok)' : 'var(--warn)';

    $('#eleveInit').textContent = tb.eleve.nom[0].toUpperCase();
    $('#eleveNom').textContent = tb.eleve.nom;
    $('#eleveNiveau').textContent = tb.eleve.niveau || 'Cashevent School';

    $('#tuiles').innerHTML = `
      <div class="tuile principale">
        <div class="anneau petit" style="background:conic-gradient(${couleur} ${s.global * 3.6}deg,#2c2c31 0)">
          <span>${s.global} %</span></div>
        <div class="txt">
          <div class="lab">Progression sur le programme</div>
          <div class="val">${s.faits}<small> / ${s.total} chapitres</small></div>
          <div class="sous">${tb.eleve.niveau || ''} · ${tb.matieres.length} matières</div>
        </div>
      </div>
      <div class="tuile"><div class="lab">QCM réalisés</div><div class="val">${s.qcmFaits}</div>
        <div class="sous">${s.qcmFaits ? 'sur ' + s.total + ' chapitres du programme' : 'aucun QCM pour le moment'}</div></div>
      <div class="tuile"><div class="lab">Moyenne aux QCM</div>
        <div class="val" style="color:${moyCouleur}">${s.moyenne === null ? '—' : s.moyenne + ' %'}</div>
        <div class="barre espace"><i style="width:${s.moyenne || 0}%;background:${moyCouleur}"></i></div></div>
      <div class="tuile"><div class="lab">Chapitres à revoir</div>
        <div class="val" style="color:${s.revoir.length ? 'var(--warn)' : 'var(--ok)'}">${s.revoir.length}</div>
        <div class="sous">${s.revoir.length ? s.revoir.slice(0, 2).map(c => c.titre).join(' · ')
          : 'Aucune notion en difficulté'}</div></div>`;

    $('#alertes').innerHTML = tb.alertes.map(a => `
      <div class="alerte ${a.ton}"><span class="ico">${a.icone}</span>
        <div><b>${a.titre}</b><p>${a.texte}</p>
        ${a.quand ? `<div class="quand">Dernière activité le ${jourFR(a.quand)}</div>` : ''}</div></div>`).join('')
      || '<p class="sous">Aucune alerte : tout est à jour.</p>';

    $('#parMatiere').innerHTML = tb.matieres.map(m => `
      <div class="ligne-mat"><span class="pt" style="background:${m.teinte}"></span>
        <span class="nom">${m.nom}</span>
        <span class="barre"><i style="width:${m.avancement}%;background:${m.teinte}"></i></span>
        <span class="pc">${m.avancement} %</span></div>`).join('');

    const p = tb.projection;
    $('#projection').innerHTML = p
      ? `<div class="projection"><b>Au rythme actuel, le programme sera terminé le
         <span class="date">${new Date(p.date).toLocaleDateString('fr-FR',
            { day: 'numeric', month: 'long', year: 'numeric' })}</span>.</b>
         <p>Environ ${String(p.parSemaine).replace('.', ',')} chapitre(s) par semaine ;
         il en reste ${p.restants} à travailler. Un chapitre supplémentaire par semaine
         avancerait cette date de plusieurs semaines.</p></div>`
      : `<div class="projection"><b>Projection disponible après deux chapitres terminés.</b>
         <p>Cashevent School calculera alors une date d’achèvement du programme à partir du rythme réel de travail.</p></div>`;

    const max = Math.max(1, ...tb.rythme.map(j => j.actions));
    $('#rythme').innerHTML = tb.rythme.map(j =>
      `<div class="${j.actions ? 'on' : ''}" style="height:${Math.max(6, j.actions / max * 100)}%"
        title="${jourFR(j.jour)} — ${j.actions} activité(s)"></div>`).join('');
    $('#rythmeLab').innerHTML = tb.rythme.map((j, i) =>
      `<span>${i % 3 === 0 ? jourCourt(j.jour) : ''}</span>`).join('');
    const actifs = tb.rythme.filter(j => j.actions).length;
    $('#rythmeTexte').textContent = actifs
      ? `${actifs} jour${actifs > 1 ? 's' : ''} de travail sur les 14 derniers.`
      : 'Aucune session sur les 14 derniers jours.';

    $('#revoirDetail').innerHTML = s.revoir.length
      ? s.revoir.map(c => `<div class="ligne-chap"><span class="pt" style="background:${c.matiere.teinte}"></span>
          <span class="nom"><b>${c.titre}</b><small>${c.matiere.nom} · chapitre ${c.numero}</small></span>
          <span class="score faible">${c.score} %</span></div>`).join('')
      : '<p class="sous">Aucun chapitre sous la barre des 60 %. Rien à signaler.</p>';

    const badge = $('#notifCount');
    const alertesAttention = tb.alertes.filter(a => a.ton === 'attention').length;
    if (badge) { badge.textContent = alertesAttention; badge.style.display = alertesAttention ? '' : 'none'; }
  };

  const charger = async id => {
    $$('.carte-enfant').forEach(b => b.classList.toggle('active', Number(b.dataset.enfant) === Number(id)));
    $('#tableau').classList.add('en-chargement');
    try {
      rendreTableau(await API.get('/parent/enfants/' + id + '/tableau-bord'));
    } catch (e) { message(e.message); }
    $('#tableau').classList.remove('en-chargement');
  };

  rendreEnfants();
  if (enfants.length) charger(enfants[0].id);
  else $('#tableau').hidden = true;

  $('#enfants').addEventListener('click', e => {
    const b = e.target.closest('[data-enfant]'); if (b) charger(b.dataset.enfant);
  });

  const notif = $('#notif');
  if (notif) notif.addEventListener('click', () => {
    const a = $$('.alerte.attention b')[0];
    message(a ? a.textContent : 'Aucune alerte en cours');
  });

  /* ------------------------- rattacher un enfant -------------------------- */
  const form = $('#formEnfant');
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#emailEnfant').value.trim();
    if (!email) return;
    try {
      const r = await API.post('/parent/enfants', { email });
      message(r.enfant.nom + ' est maintenant rattaché à votre compte.');
      enfants = (await API.get('/parent/enfants')).enfants;
      rendreEnfants(); $('#tableau').hidden = false;
      charger(enfants[enfants.length - 1].id);
      form.reset();
    } catch (err) { message(err.message); }
  });
})();
