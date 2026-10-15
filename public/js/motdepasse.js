/* CASHEVENT SCHOOL — changer son mot de passe. La page sert aussi de passage
   obligé quand le mot de passe a été posé par quelqu'un d'autre.            */
(async () => {
  const { $, message, entete, pied, chargement, erreurFatale } = UI;

  chargement(true);
  let moi;
  try { moi = await API.get('/auth/moi').then(r => r.utilisateur); }
  catch (e) { chargement(false); return erreurFatale(e.message); }
  entete(moi, 'motdepasse', {});
  pied();
  chargement(false);

  const erreur = $('#erreur');
  const montrer = t => { erreur.textContent = t; erreur.hidden = false; erreur.scrollIntoView({ block: 'center', behavior: 'smooth' }); };

  if (moi.doitChangerMotDePasse) {
    $('#sousTitre').textContent = 'Ce mot de passe vous a été remis par quelqu’un d’autre : choisissez le vôtre avant de continuer.';
    $('#pourquoi').textContent = 'Un mot de passe de démonstration ou posé par l’administration est connu d’autres personnes. ' +
      'Tant qu’il n’est pas remplacé, le reste de votre espace reste fermé.';
    $('#annuler').style.display = 'none';
  }

  $('#formMdp').addEventListener('submit', async e => {
    e.preventDefault();
    erreur.hidden = true;
    const f = e.target;
    if (f.nouveau.value !== f.confirmation.value) return montrer('Les deux nouveaux mots de passe ne sont pas identiques.');
    const bouton = f.querySelector('[type=submit]');
    bouton.disabled = true;
    try {
      await API.patch('/auth/motdepasse', { actuel: f.actuel.value, nouveau: f.nouveau.value });
      message('Mot de passe changé');
      setTimeout(() => { location.href = '/'; }, 600);
    } catch (err) { montrer(err.message); bouton.disabled = false; }
  });
})();
