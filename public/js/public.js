/* En-tête et pied de page communs aux pages publiques.
   Les liens sont définis ici une seule fois : ajouter une page se fait en un point. */
(() => {
  const PAGES = [
    ['accueil', '/accueil', 'Accueil'],
    ['apropos', '/a-propos', 'À propos'],
    ['aide', '/aide', 'Aide'],
    ['contact', '/contact', 'Contact']
  ];

  const page = document.body.dataset.page || '';

  const tete = document.getElementById('tetePublique');
  if (tete) tete.outerHTML = `
<header class="tete-publique" id="tetePublique">
  <a href="/accueil" class="brand"><b>CASHEVENT</b><em>School</em></a>
  <nav aria-label="Navigation du site">
    ${PAGES.map(([id, href, l]) =>
      `<a href="${href}"${id === page ? ' class="actif" aria-current="page"' : ''}>${l}</a>`).join('')}
  </nav>
  <a class="nf-bouton" href="/connexion">S’identifier</a>
</header>`;

})();
