/* En-tête et pied de page communs aux pages publiques.
   Les liens sont définis ici une seule fois : ajouter une page se fait en un point. */
(() => {
  const PAGES = [
    ['accueil', '/accueil.html', 'Accueil'],
    ['apropos', '/a-propos.html', 'À propos'],
    ['aide', '/aide.html', 'Aide'],
    ['contact', '/contact.html', 'Contact']
  ];

  const PIED = [
    ['Découvrir', [
      ['/accueil.html', 'La plateforme'],
      ['/a-propos.html', 'À propos'],
      ['/aide.html', 'Centre d’aide'],
      ['/contact.html', 'Nous contacter']
    ]],
    ['Mon compte', [
      ['/connexion.html', 'S’identifier'],
      ['/inscription.html', 'Créer un compte'],
      ['/inscription.html?role=parent', 'Espace parent']
    ]],
    ['Informations', [
      ['/conditions.html', 'Conditions d’utilisation'],
      ['/confidentialite.html', 'Confidentialité'],
      ['/mentions-legales.html', 'Mentions légales']
    ]]
  ];

  const page = document.body.dataset.page || '';

  const tete = document.getElementById('tetePublique');
  if (tete) tete.outerHTML = `
<header class="tete-publique" id="tetePublique">
  <a href="/accueil.html" class="brand"><b>CASHEVENT</b><em>School</em></a>
  <nav aria-label="Navigation du site">
    ${PAGES.map(([id, href, l]) =>
      `<a href="${href}"${id === page ? ' class="actif" aria-current="page"' : ''}>${l}</a>`).join('')}
  </nav>
  <a class="nf-bouton" href="/connexion.html">S’identifier</a>
</header>`;

  const pied = document.getElementById('piedPublic');
  if (pied) pied.outerHTML = `
<footer class="pied-public" id="piedPublic">
  <div class="dedans">
    <div class="haut">
      <div class="marque">
        <a href="/accueil.html" class="brand"><b>CASHEVENT</b><em>School</em></a>
        <p>Le programme du baccalauréat chapitre par chapitre : cours de répétition en vidéo,
        QCM corrigés et expliqués, travaux pratiques avec corrigé, et un suivi que les parents
        comprennent en dix secondes.</p>
      </div>
      ${PIED.map(([titre, liens]) => `
        <div>
          <h4>${titre}</h4>
          <ul>${liens.map(([href, l]) => `<li><a href="${href}">${l}</a></li>`).join('')}</ul>
        </div>`).join('')}
    </div>
    <div class="bas">
      <span>© ${new Date().getFullYear()} Cashevent School — Maroc</span>
      <span><a href="mailto:contact@cashevent.ma">contact@cashevent.ma</a></span>
    </div>
  </div>
</footer>`;
})();
