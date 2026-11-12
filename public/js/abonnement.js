/* CASHEVENT SCHOOL — « Mon abonnement » : les deux formules annuelles, la
   situation du compte étape par étape, le comparatif, la demande, la
   déclaration du paiement, le reçu et les questions fréquentes.             */
(async () => {
  const { $, message, entete, pied, chargement, erreurFatale } = UI;

  chargement(true);
  let moi;
  try { moi = await API.get('/auth/moi').then(r => r.utilisateur); }
  catch (e) { chargement(false); return erreurFatale(e.message); }
  entete(moi, 'abonnement', {});
  pied();
  chargement(false);

  const txt = t => String(t == null ? '' : t)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dateFR = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const prix = (n, devise) => Number(n).toLocaleString('fr-FR') + ' ' + (devise === 'EUR' ? '€' : txt(devise));
  const parMois = (n, devise) => (Math.round(Number(n) / 12 * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' ' + (devise === 'EUR' ? '€' : txt(devise));
  const joursRestants = d => Math.max(0, Math.ceil((new Date(d) - new Date()) / 86400000));
  const NOM = { eleve: 'Élève', premium: 'Premium' };
  const ESPACES = { eleve: 'Espace élève', parent: 'Espace parent', enseignant: 'Espace enseignant', etablissement: 'Universités et écoles' };
  const DETAIL = {
    eleve: 'Cours en vidéo, QCM différents à chaque essai, TP corrigés, bilan rédigé par l’assistant, projet et parcours de rattrapage.',
    parent: 'Le suivi de l’enfant : avancement, alertes, bilan, échanges avec les enseignants référents.',
    enseignant: 'Le tableau de bord des classes, les dossiers d’élèves, les suivis mensuels et l’envoi de TP.',
    etablissement: 'Candidater aux universités et écoles de formation : dossier, frais et réponse en ligne.'
  };
  /* Le comparatif : chaque ligne dit ce qu'ouvre chaque formule. */
  const COMPARATIF = [
    ['Apprendre', [
      ['Cours en vidéo, chapitre par chapitre', true, true],
      ['QCM différent à chaque essai, corrigés et expliqués', true, true],
      ['Travaux pratiques avec corrigé', true, true],
      ['Mon bilan : score, vidéos vues, QCM, TP et conseils de l’assistant', true, true],
      ['Projet : futur métier et chapitres à éclairer', true, true],
      ['Rattrapage : prérequis des classes antérieures, parcours, réévaluation', true, true]]],
    ['Autour de l’élève', [
      ['Espace parent : suivi, alertes, bilan de l’enfant', false, true],
      ['Espace enseignant référent : classes, dossiers, suivis, TP', false, true],
      ['Professeurs référents par matière et notes d’enseignant', false, true]]],
    ['Service', [
      ['Reçu de paiement téléchargeable', true, true],
      ['Renouvellement sans perdre un jour', true, true],
      ['Annulation libre avant confirmation du paiement', true, true]]]
  ];
  const FAQ = [
    ['Comment se passe le paiement ?', 'Vous choisissez une formule, puis vous réglez le montant selon les consignes affichées (virement ou auprès de votre contact Cashevent School). Vous indiquez ensuite la référence du paiement ; une personne de l’équipe la vérifie et active votre année. Aucune carte bancaire n’est saisie sur la plateforme.'],
    ['Combien de temps dure l’activation ?', 'Dès que la référence est vérifiée, en général sous un jour ouvré. Vous recevez l’état en direct sur cette page, et votre reçu est disponible immédiatement après.'],
    ['Le premium couvre-t-il mes parents et mes professeurs ?', 'Oui. Le premium souscrit par un élève ouvre l’espace de ses parents (comptes liés) et de ses enseignants référents, sans qu’ils aient à payer. Un parent ou un enseignant peut aussi souscrire le premium pour son propre compte.'],
    ['Que se passe-t-il à la fin de l’année ?', 'Votre espace vous prévient à l’approche de l’échéance. Si vous renouvelez avant la fin, la nouvelle année commence le lendemain de l’ancienne : vous ne perdez aucun jour.'],
    ['Puis-je changer de formule ?', 'Oui : souscrivez la formule premium, elle prend le relais à la suite de votre abonnement en cours. Pour toute situation particulière, écrivez-nous depuis la page Contact.'],
    ['Mes données sont-elles protégées ?', 'Votre session est chiffrée, vos documents de candidature restent dans la plateforme, et seules les personnes autorisées (vous, vos parents liés, vos enseignants référents, l’administration) voient votre activité.']
  ];

  let S;
  const charger = async () => { S = await API.get('/abonnement'); };

  /* ------------------------- situation, étape par étape ------------------------ */
  const etapes = (actuelle, libelles) => `<ol class="abo-etapes">${libelles.map((l, i) =>
    `<li class="${i < actuelle ? 'faite' : i === actuelle ? 'en-cours' : ''}"><span>${i + 1}</span><b>${l[0]}</b><small>${l[1]}</small></li>`).join('')}</ol>`;
  const ETAPES = [['Formule choisie', 'Votre demande est enregistrée'], ['Paiement', 'Réglez puis indiquez la référence'],
                  ['Vérification', 'L’équipe contrôle le paiement'], ['Espace ouvert', 'Une année complète']];

  const situationHTML = () => {
    const c = S.couverture;
    if (moi.role === 'admin') return `<div class="panneau abo-etat neutre"><b>Vue administrateur</b>
      Les abonnements des comptes se gèrent depuis l’administration, onglet « Abonnements ».</div>`;
    if (c && S.autorise) {
      const restent = c.fin ? joursRestants(c.fin) : null;
      /* Le reçu de l'année en cours : l'abonnement actif déjà commencé le plus récent. */
      const propre = c.via === 'moi' ? S.historique.filter(a => a.etat === 'actif' && a.paiement === 'confirme' && new Date(a.debut) <= new Date())
        .sort((x, y) => new Date(y.debut) - new Date(x.debut))[0] : null;
      return `<div class="panneau abo-etat ok">
        <div class="abo-etat-tete"><div><b>Abonnement ${NOM[c.formule]} actif</b>
          ${c.via === 'eleve' ? `Ouvert grâce à l’abonnement premium de <strong>${txt(c.eleve)}</strong>.` : 'Votre espace est ouvert.'}
          ${c.fin ? ` Valable jusqu’au <strong>${dateFR(c.fin)}</strong>.` : ''}</div>
          ${c.fin ? `<div class="abo-compteur ${restent <= 30 ? 'bientot' : ''}"><b>${restent}</b><small>jour${restent > 1 ? 's' : ''} restant${restent > 1 ? 's' : ''}</small></div>` : ''}</div>
        ${etapes(3, ETAPES)}
        <div class="abo-actions">
          ${propre ? `<a class="pilule" href="/abonnement/${propre.id}/recu" target="_blank" rel="noopener">Mon reçu</a>` : ''}
          ${c.via === 'moi' && restent !== null && restent <= 60 ? `<button class="pilule blanc" data-souscrire="${c.formule}" ${S.enAttente ? 'disabled' : ''}>Renouveler une année</button>` : ''}
          ${c.via === 'moi' && c.formule === 'eleve' ? `<button class="pilule" data-souscrire="premium" ${S.enAttente ? 'disabled' : ''}>Passer en premium</button>` : ''}
        </div>
        ${S.enAttente ? `<p class="sous">Une demande ${NOM[S.enAttente.formule]} est en attente : ${S.enAttente.paiement === 'declare' ? 'paiement déclaré, en cours de vérification.' : 'réglez-la puis indiquez la référence ci-dessous.'}</p>${demandeHTML(S.enAttente)}` : ''}
      </div>`;
    }
    if (S.enAttente) {
      const a = S.enAttente;
      return `<div class="panneau abo-etat attente">
        <div class="abo-etat-tete"><div><b>Demande ${NOM[a.formule]} · ${prix(a.prix, a.devise)} par an</b>
          ${a.paiement === 'declare' ? 'Paiement déclaré : nous le vérifions, votre espace s’ouvre dès confirmation.' : 'Il ne reste qu’à régler, puis à nous indiquer la référence du paiement.'}</div></div>
        ${etapes(a.paiement === 'declare' ? 2 : 1, ETAPES)}
        ${demandeHTML(a)}
      </div>`;
    }
    return `<div class="panneau abo-etat ${S.obligatoire ? 'bloque' : 'neutre'}">
      <div class="abo-etat-tete"><div><b>${S.obligatoire ? 'Votre espace attend un abonnement' : 'Aucun abonnement pour l’instant'}</b>
      ${S.obligatoire ? 'Choisissez une formule ci-dessous : votre espace s’ouvre dès que le paiement est confirmé.' :
        'Votre espace reste ouvert pendant la phase de lancement. Choisissez une formule pour garder l’accès toute l’année.'}</div></div>
      ${etapes(0, ETAPES)}</div>`;
  };

  const demandeHTML = a => `
    <div class="abo-demande">
      <dl class="abo-recap">
        <dt>Formule</dt><dd>${NOM[a.formule]}</dd>
        <dt>Montant</dt><dd>${prix(a.prix, a.devise)} pour 12 mois</dd>
        <dt>Demandée le</dt><dd>${dateFR(a.cree_le)}</dd>
        <dt>Paiement</dt><dd>${a.paiement === 'declare' ? `Déclaré · référence <code>${txt(a.reference_paiement)}</code>` : 'À effectuer'}</dd>
      </dl>
      <div class="consignes"><b>Comment régler</b>${txt(S.instructionsPaiement)}</div>
      ${a.paiement === 'declare' ? '' : `
      <form id="formPaiement" class="ligne-paiement">
        <input class="champ" name="reference" placeholder="Référence du paiement (reçu, n° de virement…)" maxlength="80" minlength="3" required autocomplete="off">
        <button class="pilule blanc" type="submit">J’ai réglé, voici la référence</button>
      </form>`}
      <button class="lien-discret" data-annuler="${a.id}">Annuler cette demande</button>
    </div>`;

  /* -------------------------------- offres -------------------------------- */
  const offresHTML = () => `
    <div class="abo-entete-section"><h2 class="abo-titre">Deux formules, une année complète</h2>
      <p class="sous">Sans engagement au-delà de l’année. Le prix est le même pour tous, toute l’année.</p></div>
    <div class="abo-grille">${S.formules.map(f => `
      <article class="abo-carte ${f.code}${f.ouverte ? '' : ' fermee'}">
        <div class="abo-nom">${txt(f.libelle)}</div>
        <div class="abo-prix">${prix(f.prix, f.devise)}<small>/ an</small></div>
        <div class="abo-mensuel">soit ${parMois(f.prix, f.devise)} par mois</div>
        <ul class="abo-liste">${f.debloque.map(r => `<li><b>${ESPACES[r]}</b><span>${DETAIL[r]}</span></li>`).join('')}</ul>
        ${f.code === 'premium' ? '<p class="abo-note">Souscrit par l’élève, il ouvre aussi l’espace de ses parents et de ses enseignants référents, sans rien payer de plus.</p>'
          : '<p class="abo-note">L’essentiel pour réviser. Les candidatures aux universités et écoles restent gratuites pour tous. Les parents et enseignants ne sont pas inclus.</p>'}
        ${moi.role === 'admin' ? '' : f.ouverte
          ? `<button class="pilule ${f.code === 'premium' ? 'blanc' : ''}" data-souscrire="${f.code}" ${S.enAttente ? 'disabled' : ''}>Choisir ${txt(f.libelle)}</button>`
          : '<p class="sous">Réservée aux élèves. Un parent ou un enseignant est couvert par le premium de son élève, ou souscrit le premium.</p>'}
      </article>`).join('')}
    </div>`;

  const comparatifHTML = () => `
    <div class="panneau abo-comparatif"><h2>Ce que chaque formule ouvre</h2>
      <div class="table-defile"><table class="tableau tableau-plat tableau-comparatif">
        <thead><tr><th></th><th>Élève</th><th class="premium">Premium</th></tr></thead>
        <tbody>${COMPARATIF.map(([groupe, lignes]) => `
          <tr class="groupe"><td colspan="3">${groupe}</td></tr>
          ${lignes.map(([l, a, b]) => `<tr><td>${l}</td><td class="oui-non">${a ? '<i class="oui">✓</i>' : '<i class="non">—</i>'}</td><td class="oui-non premium">${b ? '<i class="oui">✓</i>' : '<i class="non">—</i>'}</td></tr>`).join('')}`).join('')}
        </tbody></table></div></div>`;

  const fonctionnementHTML = () => `
    <div class="abo-entete-section"><h2 class="abo-titre">Comment ça marche</h2></div>
    <div class="abo-pas">
      <div class="pas"><span>1</span><b>Choisissez votre formule</b><p>Votre demande est enregistrée immédiatement. Vous pouvez l’annuler tant que le paiement n’est pas confirmé.</p></div>
      <div class="pas"><span>2</span><b>Réglez et indiquez la référence</b><p>Virement ou règlement auprès de votre contact. Aucune carte bancaire n’est saisie ici : vous nous donnez seulement la référence.</p></div>
      <div class="pas"><span>3</span><b>Nous vérifions, votre espace s’ouvre</b><p>Une personne confirme le paiement. Votre année démarre, votre reçu est disponible, et vous êtes prévenu à l’approche de l’échéance.</p></div>
    </div>`;

  const confianceHTML = () => `
    <div class="abo-confiance">
      <div class="conf"><b>🔒 Session protégée</b>Connexion chiffrée, cookie sécurisé, mot de passe exigeant. Un changement de mot de passe ferme les autres sessions.</div>
      <div class="conf"><b>👁️ Qui voit quoi</b>Seuls vous, vos parents liés, vos enseignants référents et l’administration voient votre activité. Jamais d’autres élèves.</div>
      <div class="conf"><b>🧾 Reçu à chaque paiement</b>Un reçu numéroté, imprimable et enregistrable en PDF, dès confirmation.</div>
      <div class="conf"><b>↩️ Annulation libre</b>Avant confirmation du paiement, vous annulez d’un clic. Après, écrivez-nous : nous trouvons une solution.</div>
    </div>`;

  const faqHTML = () => `
    <div class="abo-entete-section"><h2 class="abo-titre">Questions fréquentes</h2></div>
    <div class="abo-faq">${FAQ.map(([q, r]) => `<details><summary>${q}</summary><p>${r}</p></details>`).join('')}</div>`;

  const historiqueHTML = () => S.historique.length ? `
    <div class="panneau"><h2>Historique</h2>
      <div class="table-defile"><table class="tableau tableau-plat">
        <thead><tr><th>Formule</th><th>Montant</th><th>État</th><th>Du</th><th>Au</th><th></th></tr></thead>
        <tbody>${S.historique.map(a => {
          const actif = a.etat === 'actif' && new Date(a.fin) >= new Date();
          return `<tr>
          <td><b>${NOM[a.formule]}</b></td>
          <td>${prix(a.prix, a.devise)}</td>
          <td><span class="etiquette ${actif ? 'paie-confirme' : a.etat === 'annule' ? 'etat-refusee' : 'etat-brouillon'}">${actif ? 'Actif' : a.etat === 'annule' ? 'Annulé' : 'Expiré'}</span></td>
          <td>${dateFR(a.debut)}</td><td>${dateFR(a.fin)}</td>
          <td class="actions-ligne">${a.etat === 'actif' && a.paiement === 'confirme' ? `<a class="pilule mini" href="/abonnement/${a.id}/recu" target="_blank" rel="noopener">Reçu</a>` : ''}</td>
        </tr>`; }).join('')}</tbody>
      </table></div></div>` : '';

  const rendre = () => {
    $('#situation').innerHTML = situationHTML();
    $('#offres').innerHTML = offresHTML() + comparatifHTML();
    $('#fonctionnement').innerHTML = fonctionnementHTML() + confianceHTML();
    $('#faq').innerHTML = faqHTML();
    $('#historique').innerHTML = historiqueHTML();
    const form = $('#formPaiement');
    if (form) form.addEventListener('submit', async e => {
      e.preventDefault();
      const b = form.querySelector('button'); b.disabled = true;
      try { S = await API.post(`/abonnement/${S.enAttente.id}/paiement`, { reference: form.reference.value.trim() }); message('Merci, votre paiement est en cours de vérification.'); rendre(); }
      catch (err) { message(err.message); b.disabled = false; }
    });
  };

  document.addEventListener('click', async e => {
    const s = e.target.closest('[data-souscrire]'), a = e.target.closest('[data-annuler]');
    if (s) {
      s.disabled = true;
      try { S = await API.post('/abonnement', { formule: s.dataset.souscrire }); message('Demande enregistrée : il ne reste qu’à régler.'); rendre(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      catch (err) { message(err.message); s.disabled = false; }
    } else if (a) {
      if (!confirm('Annuler cette demande d’abonnement ?')) return;
      try { S = await API.supprimer('/abonnement/' + a.dataset.annuler); message('Demande annulée.'); rendre(); }
      catch (err) { message(err.message); }
    }
  });

  try { await charger(); rendre(); }
  catch (e) { erreurFatale(e.message); }
})();
