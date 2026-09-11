/* Formulaire de contact : envoi, validation et compteur de caractères. */
(() => {
  const $ = s => document.querySelector(s);
  const form = $('#formContact');
  if (!form) return;

  const erreur = $('#erreur');
  const montrer = t => { erreur.textContent = t; erreur.hidden = false; };

  /* Champ leurre : invisible pour un humain, rempli par les robots. */
  form.insertAdjacentHTML('afterbegin',
    '<input type="text" name="site" tabindex="-1" autocomplete="off" aria-hidden="true" ' +
    'style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">');

  const zone = form.querySelector('[name=message]');
  const compteur = $('#compteur');
  const majCompteur = () => { if (compteur) compteur.textContent = zone.value.length; };
  zone.addEventListener('input', majCompteur);
  majCompteur();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    erreur.hidden = true;

    const donnees = {};
    new FormData(form).forEach((v, k) => donnees[k] = v);

    if (!donnees.nom || donnees.nom.trim().length < 2) return montrer('Indiquez votre nom.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(donnees.email || ''))
      return montrer('Cette adresse e-mail n’est pas valide.');
    if ((donnees.message || '').trim().length < 20)
      return montrer('Détaillez un peu votre demande : vingt caractères au minimum.');

    const bouton = form.querySelector('[type=submit]');
    const libelle = bouton.textContent;
    bouton.disabled = true; bouton.textContent = 'Envoi…';

    try {
      const r = await fetch('/api/contact', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donnees)
      });
      const corps = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(corps.erreur || 'Envoi impossible pour le moment.');

      $('#texteSucces').textContent =
        `Merci ${donnees.nom.trim().split(' ')[0]}. Nous vous répondons à ${donnees.email}, ` +
        'en général sous un jour ouvré.';
      form.hidden = true;
      $('#succes').hidden = false;
      $('#succes').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      montrer(err.message);
      bouton.disabled = false; bouton.textContent = libelle;
    }
  });
})();
