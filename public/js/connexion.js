/* Connexion et inscription — les deux pages partagent ce script.
   Les écouteurs sont posés immédiatement : si un appel réseau échoue,
   le formulaire continue de fonctionner au lieu de repartir en soumission HTML. */
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const params = new URLSearchParams(location.search);
  const suite = params.get('suite');
  const accueil = { eleve: '/ecole', parent: '/espace-parent',
                    enseignant: '/espace-enseignant', admin: '/admin' };
  const rediriger = u => { location.href = suite || accueil[u.role] || '/'; };

  const erreur = $('#erreur');
  const montrer = texte => {
    if (!erreur) return alert(texte);
    erreur.textContent = texte; erreur.hidden = false;
  };
  const cacher = () => { if (erreur) erreur.hidden = true; };

  const envoyer = async (form, chemin, completer) => {
    cacher();
    /* Dans un formulaire à étapes, c'est le bouton visible qui doit patienter. */
    const bouton = form.querySelector('.panneau-etape:not([hidden]) [type=submit]') ||
      form.querySelector('[type=submit]');
    const texte = bouton.textContent;
    bouton.disabled = true; bouton.textContent = 'Un instant…';
    try {
      const donnees = {};
      new FormData(form).forEach((v, k) => donnees[k] = v);
      if (completer) completer(donnees);
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
    const role = () => $('input[name=role]:checked').value;

    /* Chaque rôle a sa fiche : l'élève sa filière et ses professeurs, le parent
       son enfant, l'enseignant les matières qu'il enseigne. */
    const majRole = () => {
      const r = role();
      const enfant = $('#champEnfant'), filiere = $('#champFiliere'), label = $('#labelEtablissement');
      const matieres = $('#champMatieres'), jalon = $('[data-jalon-eleve]'), bouton = $('#boutonEtape2');
      if (enfant) enfant.hidden = r !== 'parent';
      if (filiere) filiere.hidden = r !== 'eleve';
      if (matieres) matieres.hidden = r !== 'enseignant';
      if (jalon) jalon.hidden = r !== 'eleve';
      if (bouton) bouton.textContent = r === 'eleve' ? 'Continuer' : 'Créer mon compte';
      if (label) label.textContent = { parent: 'Lycée de votre enfant',
        enseignant: 'Établissement où vous enseignez' }[r] || 'Votre lycée';
      $$('#choixRole label').forEach(l => l.classList.toggle('actif', l.querySelector('input').checked));
    };
    const choix = $('#choixRole');
    if (choix) { choix.addEventListener('change', majRole); majRole(); }

    /* Les matières servent deux fois : cases à cocher pour l'enseignant,
       codes des professeurs pour l'élève. */
    const echapper = t => String(t == null ? '' : t)
      .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const listeMatieres = $('#listeMatieres'), listeProfs = $('#listeProfesseurs');
    if (listeMatieres || listeProfs) {
      fetch('/api/catalogue/public', { credentials: 'same-origin' })
        .then(r => r.json())
        .then(d => {
          const matieres = d.matieres || [];
          if (listeMatieres) listeMatieres.innerHTML = matieres.map(m => `
            <label><input type="checkbox" name="matieresEnseignees" value="${m.id}">
              <span class="pt" style="background:${echapper(m.teinte)}"></span>${echapper(m.nom)}</label>`).join('');
          if (listeProfs) listeProfs.innerHTML = matieres.map(m => `
            <div class="nf-prof">
              <span class="mat"><span class="pt" style="background:${echapper(m.teinte)}"></span>${echapper(m.nom)}</span>
              <input type="text" autocomplete="off" maxlength="6" placeholder="Code" data-code="${m.id}"
                aria-label="Code de votre professeur de ${echapper(m.nom)}">
              <span class="verdict" aria-live="polite"></span>
            </div>`).join('');
        })
        .catch(() => { });
    }
    if (listeMatieres) listeMatieres.addEventListener('change', e => {
      const l = e.target.closest('label'); if (l) l.classList.toggle('actif', e.target.checked);
    });

    /* Le nom du professeur s'affiche dès que le code est complet : l'élève sait
       tout de suite s'il s'est trompé de code ou de matière. */
    const verdicts = new Map();
    if (listeProfs) listeProfs.addEventListener('input', e => {
      const champ = e.target.closest('[data-code]'); if (!champ) return;
      champ.value = champ.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const ligne = champ.closest('.nf-prof'), verdict = ligne.querySelector('.verdict');
      const matiereId = Number(champ.dataset.code);
      verdicts.delete(matiereId);
      ligne.classList.remove('ok', 'ko');
      verdict.textContent = '';
      clearTimeout(champ._minuteur);
      if (champ.value.length < 6) return;
      const code = champ.value;
      champ._minuteur = setTimeout(async () => {
        try {
          const { enseignant } = await API.get('/professeurs/code/' + code);
          if (champ.value !== code) return;
          const enseigne = enseignant.matieres.some(m => m.id === matiereId);
          verdicts.set(matiereId, enseigne);
          ligne.classList.add(enseigne ? 'ok' : 'ko');
          verdict.textContent = enseigne ? enseignant.nom : enseignant.nom + ' n’enseigne pas cette matière';
        } catch (err) {
          if (champ.value !== code) return;
          verdicts.set(matiereId, false);
          ligne.classList.add('ko');
          verdict.textContent = err.message;
        }
      }, 250);
    });

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
      if (role() === 'enseignant' && !$$('input[name=matieresEnseignees]:checked').length)
        return 'Cochez au moins une matière que vous enseignez.';
      const enfant = valeur('emailEnfant');
      if (enfant && !EMAIL.test(enfant))
        return 'L’adresse e-mail de votre enfant n’est pas valide.';
      return null;
    };

    /* Un code saisi doit être complet et reconnu ; un champ vide est permis. */
    const etape3Valide = () => {
      for (const champ of $$('[data-code]')) {
        if (!champ.value) continue;
        const nom = champ.closest('.nf-prof').querySelector('.mat').textContent.trim();
        if (champ.value.length < 6) return `Le code de votre professeur de ${nom} est incomplet.`;
        if (verdicts.get(Number(champ.dataset.code)) === false)
          return `Corrigez ou effacez le code de votre professeur de ${nom}.`;
      }
      return null;
    };

    const suivant = $('[data-suivant]');
    if (suivant) suivant.addEventListener('click', () => {
      const souci = etape1Valide();
      if (souci) return montrer(souci);
      afficher(2);
    });
    $$('[data-precedent]').forEach(b => b.addEventListener('click', () => afficher(Math.max(1, etape - 1))));

    formInscription.addEventListener('submit', e => {
      e.preventDefault();
      /* La soumission peut venir d'un « Entrée » frappé à la première étape. */
      if (etape === 1) {
        const souci = etape1Valide();
        return souci ? montrer(souci) : afficher(2);
      }
      const souci = etape1Valide() || etape2Valide();
      if (souci) return montrer(souci);
      /* L'élève passe par l'étape de ses professeurs avant l'envoi. */
      if (etape === 2 && role() === 'eleve') return afficher(3);
      const souci3 = etape === 3 ? etape3Valide() : null;
      if (souci3) return montrer(souci3);
      envoyer(formInscription, '/auth/inscription', donnees => {
        donnees.matieresEnseignees = $$('input[name=matieresEnseignees]:checked').map(c => Number(c.value));
        donnees.professeurs = role() === 'eleve'
          ? $$('[data-code]').filter(c => c.value.length === 6)
              .map(c => ({ matiereId: Number(c.dataset.code), code: c.value }))
          : [];
      });
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
