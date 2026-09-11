/* Connexion et inscription — les deux pages partagent ce script.
   Les écouteurs sont posés immédiatement : si un appel réseau échoue,
   le formulaire continue de fonctionner au lieu de repartir en soumission HTML. */
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const params = new URLSearchParams(location.search);
  const suite = params.get('suite');
  const accueil = { eleve: '/ecole', parent: '/espace-parent', admin: '/admin' };
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
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const valeur = n => (formInscription[n] ? String(formInscription[n].value).trim() : '');
    const estParent = () => $('input[name=role]:checked').value === 'parent';

    /* Un parent n'a ni filière ni lycée : les champs suivent le rôle choisi. */
    const majRole = () => {
      const parent = estParent();
      const enfant = $('#champEnfant'), filiere = $('#champFiliere'), label = $('#labelEtablissement');
      if (enfant) enfant.hidden = !parent;
      if (filiere) filiere.hidden = parent;
      if (label) label.textContent = parent ? 'Lycée de votre enfant' : 'Votre lycée';
      $$('#choixRole label').forEach(l => l.classList.toggle('actif', l.querySelector('input').checked));
    };
    const choix = $('#choixRole');
    if (choix) { choix.addEventListener('change', majRole); majRole(); }

    /* L'âge se déduit de la date : on l'affiche pour que la saisie se vérifie d'elle-même. */
    const naissance = $('#dateNaissance'), ageDit = $('#ageCalcule');
    const age = iso => {
      if (!iso) return null;
      const d = new Date(iso + 'T00:00:00');
      if (isNaN(d)) return null;
      const n = new Date();
      let a = n.getFullYear() - d.getFullYear();
      const m = n.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--;
      return a;
    };
    if (naissance && ageDit) naissance.addEventListener('input', () => {
      const a = age(naissance.value);
      ageDit.textContent = a === null ? '' : (a < 0 || a > 120 ? 'Date improbable' : a + ' ans');
    });

    /* ------------------------------ les étapes ----------------------------- */
    const panneaux = $$('.panneau-etape');
    const jalons = $$('#jalons li');
    let etape = 1;

    const afficher = n => {
      etape = n;
      panneaux.forEach(p => { p.hidden = Number(p.dataset.etape) !== n; });
      jalons.forEach((j, i) => {
        j.classList.toggle('actif', i + 1 === n);
        j.classList.toggle('fait', i + 1 < n);
      });
      cacher();
      const premier = panneaux.find(p => !p.hidden).querySelector('input:not([type=radio]), select');
      if (premier) premier.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /* Chaque étape se valide avant de laisser passer à la suivante. */
    const etape1Valide = () => {
      if (valeur('nom').length < 2) return 'Indiquez votre nom complet.';
      if (!EMAIL.test(valeur('email'))) return 'Cette adresse e-mail n’est pas valide.';
      if (valeur('motDePasse').length < 8)
        return 'Le mot de passe doit contenir au moins 8 caractères.';
      return null;
    };
    const etape2Valide = () => {
      const a = age(valeur('dateNaissance'));
      if (a === null) return 'Indiquez votre date de naissance.';
      if (a < 5 || a > 100) return 'Cette date de naissance ne semble pas correcte.';
      if (valeur('telephone').replace(/\D/g, '').length < 8)
        return 'Indiquez un numéro de téléphone valide.';
      if (valeur('ville').length < 2) return 'Indiquez votre ville.';
      if (valeur('pays').length < 2) return 'Indiquez votre pays.';
      const enfant = valeur('emailEnfant');
      if (enfant && !EMAIL.test(enfant))
        return 'L’adresse e-mail de votre enfant n’est pas valide.';
      return null;
    };

    const suivant = $('[data-suivant]'), precedent = $('[data-precedent]');
    if (suivant) suivant.addEventListener('click', () => {
      const souci = etape1Valide();
      if (souci) return montrer(souci);
      afficher(2);
    });
    if (precedent) precedent.addEventListener('click', () => afficher(1));

    formInscription.addEventListener('submit', e => {
      e.preventDefault();
      /* La soumission peut venir d'un « Entrée » frappé à la première étape. */
      if (etape === 1) {
        const souci = etape1Valide();
        return souci ? montrer(souci) : afficher(2);
      }
      const souci = etape1Valide() || etape2Valide();
      if (souci) return montrer(souci);
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
