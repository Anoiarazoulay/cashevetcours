/* Connexion et inscription — les deux pages partagent ce script.
   Les écouteurs sont posés immédiatement : si un appel réseau échoue,
   le formulaire continue de fonctionner au lieu de repartir en soumission HTML. */
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const params = new URLSearchParams(location.search);
  const suite = params.get('suite');
  const accueil = { eleve: '/ecole.html', parent: '/espace-parent.html', admin: '/admin.html' };
  const rediriger = u => { location.href = suite || accueil[u.role] || '/'; };

  const erreur = $('#erreur');
  const montrer = texte => {
    if (!erreur) return alert(texte);
    erreur.textContent = texte; erreur.hidden = false;
  };
  const cacher = () => { if (erreur) erreur.hidden = true; };

  const envoyer = async (form, chemin) => {
    cacher();
    const bouton = form.querySelector('[type=submit]');
    const texte = bouton.textContent;
    bouton.disabled = true; bouton.textContent = 'Un instant…';
    try {
      const donnees = {};
      new FormData(form).forEach((v, k) => donnees[k] = v);
      const r = await API.post(chemin, donnees);
      rediriger(r.utilisateur);
    } catch (e) {
      montrer(e.message || 'Connexion impossible.');
      bouton.disabled = false; bouton.textContent = texte;
      const mdp = form.querySelector('input[type=password]');
      if (mdp) mdp.focus();
    }
  };

  /* ------------------------------- connexion ------------------------------ */
  const formConnexion = $('#formConnexion');
  if (formConnexion) {
    /* Ceinture et bretelles : la soumission native ne doit jamais recharger la page. */
    formConnexion.addEventListener('submit', e => {
      e.preventDefault();
      envoyer(formConnexion, '/auth/connexion');
    });
    $$('[data-demo]').forEach(b => b.addEventListener('click', () => {
      const [mail, mdp] = b.dataset.demo.split('|');
      formConnexion.email.value = mail;
      formConnexion.motDePasse.value = mdp;
      envoyer(formConnexion, '/auth/connexion');
    }));
  }

  /* ------------------------------ inscription ----------------------------- */
  const formInscription = $('#formInscription');
  if (formInscription) {
    const choix = $('#choixRole');
    if (choix) choix.addEventListener('change', () => {
      const parent = $('input[name=role]:checked').value === 'parent';
      const champ = $('#champEnfant');
      if (champ) champ.hidden = !parent;
      $$('#choixRole label').forEach(l => l.classList.toggle('actif', l.querySelector('input').checked));
    });
    formInscription.addEventListener('submit', e => {
      e.preventDefault();
      if (formInscription.motDePasse.value.length < 8)
        return montrer('Le mot de passe doit contenir au moins 8 caractères.');
      envoyer(formInscription, '/auth/inscription');
    });
  }

  /* L'adresse saisie sur la page d'accueil est reprise telle quelle. */
  const email = params.get('email');
  if (email && $('#email')) $('#email').value = email;

  /* Signale au filet de sécurité de la page que ce script a bien pris la main. */
  window.__connexionPrete = true;

  /* Vérification différée : elle ne conditionne plus le fonctionnement des formulaires. */
  API.moi().then(u => { if (u) rediriger(u); }).catch(() => { });
})();
