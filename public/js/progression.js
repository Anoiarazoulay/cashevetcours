/* CASHEVENT SCHOOL — « Ma progression » : le tableau de bord de l'élève lui-même.
   Il lit les mêmes chiffres que l'espace parent, mais s'adresse à l'élève.      */
(async () => {
  const { $, message, entete, pied, chargement, erreurFatale } = UI;

  chargement(true);
  let moi, tb;
  try {
    moi = await API.get('/auth/moi').then(r => r.utilisateur);
    tb = await API.get('/progression/tableau-bord');
  } catch (e) { chargement(false); return erreurFatale(e.message); }

  entete(moi, 'progression', { notifications: true });
  pied();
  chargement(false);

  const jourFR = j => new Date(j + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const jourCourt = j => new Date(j + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric' });
  const s = tb.stats;

  $('#eleveInit').textContent = (tb.eleve.nom || '?')[0].toUpperCase();
  $('#eleveNom').textContent = tb.eleve.nom;
  $('#eleveNiveau').textContent = tb.eleve.niveau || 'Cashevent School';

  /* ------------------------------- les chiffres ----------------------------- */
  const couleur = s.global >= 70 ? 'var(--ok)' : s.global >= 40 ? 'var(--info)' : 'var(--warn)';
  const moyCouleur = s.moyenne === null ? 'var(--info)' : s.moyenne >= 70 ? 'var(--ok)' : 'var(--warn)';
  const restants = s.total - s.faits;

  $('#sousTitre').textContent = s.faits
    ? `${s.faits} chapitres terminés, ${restants} restants sur le programme.`
    : 'Ouvrez un premier chapitre : cette page se remplira au fur et à mesure.';

  $('#tuiles').innerHTML = `
    <div class="tuile principale">
      <div class="anneau petit" style="background:conic-gradient(${couleur} ${s.global * 3.6}deg,#2c2c31 0)">
        <span>${s.global} %</span></div>
      <div class="txt">
        <div class="lab">Programme parcouru</div>
        <div class="val">${s.faits}<small> / ${s.total} chapitres</small></div>
        <div class="sous">${tb.eleve.niveau || ''} · ${tb.matieres.length} matières</div>
      </div>
    </div>
    <div class="tuile"><div class="lab">QCM passés</div><div class="val">${s.qcmFaits}</div>
      <div class="sous">${s.qcmFaits ? 'sur ' + s.total + ' chapitres du programme' : 'aucun pour le moment'}</div></div>
    <div class="tuile"><div class="lab">Moyenne aux QCM</div>
      <div class="val" style="color:${moyCouleur}">${s.moyenne === null ? '—' : s.moyenne + ' %'}</div>
      <div class="barre espace"><i style="width:${s.moyenne || 0}%;background:${moyCouleur}"></i></div></div>
    <div class="tuile"><div class="lab">À reprendre</div>
      <div class="val" style="color:${s.revoir.length ? 'var(--warn)' : 'var(--ok)'}">${s.revoir.length}</div>
      <div class="sous">${s.revoir.length ? 'chapitre(s) sous 60 %' : 'aucune notion en difficulté'}</div></div>`;

  /* --------------------------------- rythme --------------------------------- */
  const max = Math.max(1, ...tb.rythme.map(j => j.actions));
  $('#rythme').innerHTML = tb.rythme.map(j =>
    `<div class="${j.actions ? 'on' : ''}" style="height:${Math.max(6, j.actions / max * 100)}%"
      title="${jourFR(j.jour)} — ${j.actions} activité(s)"></div>`).join('');
  $('#rythmeLab').innerHTML = tb.rythme.map((j, i) =>
    `<span>${i % 3 === 0 ? jourCourt(j.jour) : ''}</span>`).join('');

  const actifs = tb.rythme.filter(j => j.actions).length;
  /* Série en cours : les jours travaillés d'affilée, en partant d'aujourd'hui. */
  let serie = 0;
  for (let i = tb.rythme.length - 1; i >= 0 && tb.rythme[i].actions; i--) serie++;
  $('#rythmeTexte').textContent = actifs
    ? `${actifs} jour${actifs > 1 ? 's' : ''} travaillé${actifs > 1 ? 's' : ''} sur les 14 derniers` +
      (serie > 1 ? ` · ${serie} jours d’affilée en ce moment.` : '.')
    : 'Aucune session sur les 14 derniers jours.';

  const p = tb.projection;
  $('#projection').innerHTML = p
    ? `<div class="projection"><b>À ce rythme, vous terminerez le programme le
       <span class="date">${new Date(p.date).toLocaleDateString('fr-FR',
          { day: 'numeric', month: 'long', year: 'numeric' })}</span>.</b>
       <p>Environ ${String(p.parSemaine).replace('.', ',')} chapitre(s) par semaine ;
       il vous en reste ${p.restants}. Un chapitre de plus chaque semaine avancerait
       cette date de plusieurs semaines.</p></div>`
    : `<div class="projection"><b>Terminez deux chapitres pour voir votre date d’arrivée.</b>
       <p>Cashevent School calculera alors la date de fin du programme d’après votre rythme réel.</p></div>`;

  /* -------------------------------- conseils -------------------------------- */
  /* Les alertes du service sont écrites pour un parent : on les réadresse à l'élève. */
  const aLeleve = t => t
    .replace(/[Vv]otre enfant vient de/g, 'vous venez de')
    .replace(/[Vv]otre enfant a/g, 'vous avez')
    .replace(/[Vv]otre enfant/g, 'vous')
    .replace(/son (\d+)/g, 'votre $1');

  $('#alertes').innerHTML = tb.alertes.map(a => `
    <div class="alerte ${a.ton}"><span class="ico">${a.icone}</span>
      <div><b>${aLeleve(a.titre)}</b><p>${aLeleve(a.texte)}</p>
      ${a.quand ? `<div class="quand">Dernière session le ${jourFR(a.quand)}</div>` : ''}</div></div>`).join('')
    || '<p class="sous">Rien à signaler : continuez comme ça.</p>';

  /* ---------------------------- détail par matière --------------------------- */
  $('#parMatiere').innerHTML = tb.matieres.map(m => `
    <div class="ligne-mat"><span class="pt" style="background:${m.teinte}"></span>
      <span class="nom">${m.nom}</span>
      <span class="barre"><i style="width:${m.avancement}%;background:${m.teinte}"></i></span>
      <span class="pc">${m.avancement} %</span></div>`).join('');

  $('#revoirDetail').innerHTML = s.revoir.length
    ? s.revoir.map(c => `<div class="ligne-chap"><span class="pt" style="background:${c.matiere.teinte}"></span>
        <span class="nom"><b>${c.titre}</b><small>${c.matiere.nom} · chapitre ${c.numero}</small></span>
        <span class="score faible">${c.score} %</span></div>`).join('')
    : '<p class="sous">Aucun chapitre sous la barre des 60 %. Rien à reprendre.</p>';

  /* Les pondérations viennent du serveur : le texte reste juste si elles changent. */
  const w = tb.poids;
  $('#formule').textContent =
    `Chaque chapitre combine les séances vidéo visionnées (${Math.round(w.seances * 100)} %), ` +
    `le résumé lu (${Math.round(w.resume * 100)} %), le QCM passé (${Math.round(w.qcm * 100)} %) ` +
    `et le TP téléchargé (${Math.round(w.tp * 100)} %). Un chapitre passe « à reprendre » ` +
    `quand le dernier score au QCM descend sous ${tb.seuilARevoir} %.`;

  const notif = $('#notif');
  if (notif) notif.addEventListener('click', () => message(
    s.revoir.length ? `${s.revoir.length} chapitre(s) à reprendre` : 'Aucun chapitre à reprendre.'));
})();
