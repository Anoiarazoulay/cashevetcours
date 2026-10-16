/* CASHEVENT SCHOOL — « Mon bilan » : les chiffres de l'élève et l'analyse de
   l'assistant, avec ses recommandations et un plan pour la semaine.         */
(async () => {
  const { $, message, entete, pied, chargement, erreurFatale } = UI;

  chargement(true);
  let moi;
  try { moi = await API.get('/auth/moi').then(r => r.utilisateur); }
  catch (e) { chargement(false); return erreurFatale(e.message); }
  entete(moi, 'bilan', { notifications: true });
  pied();
  chargement(false);

  const echapper = t => String(t == null ? '' : t)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dateFR = d => d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';
  const prenom = (moi.nom || '').trim().split(/\s+/)[0] || 'toi';

  const attente = texte => { $('#analyse').innerHTML = `
    <section class="prog-panneau bilan-attente">
      <div class="chargement"><span class="rond"></span><p>${texte}</p></div>
    </section>`; };

  const rendreChiffres = r => {
    const c = r.chiffres;
    $('#hero').innerHTML = `
      <div class="hero-txt bilan-txt">
        <span class="salut">✦ Bilan de l’assistant</span>
        <h1>${echapper(prenom)}, voici où tu en es.</h1>
        <div class="niveau">${echapper(r.eleve.niveau || 'Cashevent School')} · ${c.progression} % du programme ·
          ${c.joursActifs14} jour${c.joursActifs14 > 1 ? 's' : ''} travaillé${c.joursActifs14 > 1 ? 's' : ''} sur 14${c.serie > 1 ? ' · ' + c.serie + ' jours d’affilée' : ''}</div>
      </div>
      <div class="hero-badges">
        <div class="hero-badge"><span class="ico">${r.metier ? '★' : '📘'}</span><div><b>${r.metier ? echapper(r.metier.nom) : 'Pas de métier choisi'}</b>
          <small>${r.metier ? `${r.metier.termines}/${r.metier.total} chapitres du projet` : 'Choisis-le depuis l’accueil'}</small></div></div>
        <div class="hero-badge"><span class="ico">📅</span><div><b>${r.projection ? new Date(r.projection.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date de fin à venir'}</b>
          <small>${r.projection ? 'fin du programme à ce rythme' : 'après deux chapitres terminés'}</small></div></div>
      </div>`;
    const tuile = (lab, val, sous, halo) => `
      <div class="chiffre-carte" style="--halo:${halo}"><div class="lab">${lab}</div><div class="val">${val}</div><div class="sous">${sous}</div></div>`;
    $('#chiffres').innerHTML =
      tuile('Vidéos vues', `${c.videosVues}<small>/ ${c.videosTotal}</small>`, `${c.videosSemaine} cette semaine`, 'rgba(76,141,255,.22)') +
      tuile('QCM passés', c.qcmPasses, c.moyenneQcm === null ? 'aucun pour le moment' : `moyenne ${c.moyenneQcm} % sur toutes les tentatives`, 'rgba(123,59,245,.22)') +
      tuile('TP téléchargés', c.tpFaits, 'énoncés avec corrigé', 'rgba(245,165,36,.22)') +
      tuile('Chapitres terminés', `${c.chapitresTermines}<small>/ ${c.chapitresTotal}</small>`, `${c.chapitresEnCours} en cours · ${c.aRevoir} à revoir`, 'rgba(63,208,138,.22)');
  };

  const rendreAnalyse = d => {
    const b = d.bilan;
    if (!b) {
      $('#analyse').innerHTML = `<section class="prog-panneau"><div class="prog-vide">${d.assistantActif
        ? 'Aucun bilan pour l’instant.' : 'L’assistant n’est pas activé sur ce serveur : le bilan rédigé n’est pas disponible.'}</div></section>`;
      return;
    }
    $('#analyse').innerHTML = `
      <section class="prog-panneau bilan-resume">
        <div class="prog-tete"><h2>L’analyse</h2>
          <button class="pilule mini" data-actualiser title="Redemander un bilan à l’assistant">Actualiser</button>
          <p>Rédigée par l’assistant d’après tes chiffres${d.creeLe ? ' · ' + dateFR(d.creeLe) : ''}${d.aJour ? '' : ' · tes chiffres ont changé depuis'}.</p></div>
        <p class="bilan-texte">${echapper(b.resume)}</p>
        ${b.encouragement ? `<p class="bilan-encouragement">“ ${echapper(b.encouragement)} ”</p>` : ''}
      </section>
      <div class="prog-colonnes">
        <section class="prog-panneau"><div class="prog-tete"><h2>Points forts</h2></div>
          <ul class="bilan-liste forts">${b.pointsForts.map(x => `<li>${echapper(x)}</li>`).join('') || '<li>À construire : commence un chapitre.</li>'}</ul></section>
        <section class="prog-panneau"><div class="prog-tete"><h2>À travailler</h2></div>
          <ul class="bilan-liste faibles">${b.pointsFaibles.map(x => `<li>${echapper(x)}</li>`).join('') || '<li>Rien de signalé.</li>'}</ul></section>
      </div>
      <section class="prog-panneau prog-pleine">
        <div class="prog-tete"><h2>Recommandations</h2><p>Les actions les plus utiles cette semaine, dans l’ordre.</p></div>
        <div class="bilan-recos">${b.recommandations.map((x, i) => `
          <div class="reco"><span class="num">${i + 1}</span><div><b>${echapper(x.titre)}</b><p>${echapper(x.detail)}</p></div></div>`).join('')}</div>
      </section>
      <section class="prog-panneau prog-pleine">
        <div class="prog-tete"><h2>Ton plan de la semaine</h2></div>
        <div class="bilan-plan">${b.planSemaine.map(x => `
          <div class="jour"><b>${echapper(x.jour)}</b><p>${echapper(x.action)}</p></div>`).join('')}</div>
      </section>
      <p class="prog-note">Bilan rédigé par un modèle de langage à partir de tes seuls chiffres sur Cashevent School${d.modele ? ' (' + echapper(d.modele) + ')' : ''}.
        Il peut se tromper : tes professeurs ont le dernier mot.</p>`;
  };

  const charger = async (forcer = false) => {
    attente(forcer ? 'L’assistant relit tes chiffres et rédige un nouveau bilan : une minute environ…'
      : 'L’assistant lit tes vidéos vues, tes QCM, tes TP… Si tes chiffres ont changé, il rédige un nouveau bilan : une minute environ.');
    let d;
    try { d = await API.get('/bilan' + (forcer ? '?forcer=1' : '')); }
    catch (e) { $('#analyse').innerHTML = `<section class="prog-panneau"><div class="prog-vide">${echapper(e.message)}</div></section>`; return; }
    rendreChiffres(d.releve);
    rendreAnalyse(d);
    if (d.genere) message('Nouveau bilan rédigé');
  };

  document.addEventListener('click', e => { if (e.target.closest('[data-actualiser]')) charger(true); });
  charger();
})();
