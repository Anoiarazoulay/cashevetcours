/* Pied de page unique, partagé par toutes les pages du site.
   Un seul endroit à modifier pour ajouter ou renommer un lien.               */
window.PIED = (() => {
  const COLONNES = [
    ['Découvrir', [
      ['/accueil', 'La plateforme'],
      ['/a-propos', 'À propos'],
      ['/aide', 'Centre d’aide'],
      ['/contact', 'Nous contacter']
    ]],
    ['Mon compte', [
      ['/connexion', 'S’identifier'],
      ['/inscription', 'Créer un compte'],
      ['/inscription?role=parent', 'Espace parent']
    ]],
    ['Informations', [
      ['/conditions', 'Conditions d’utilisation'],
      ['/confidentialite', 'Confidentialité'],
      ['/mentions-legales', 'Mentions légales']
    ]]
  ];

  const html = () => `
<footer class="pied-public">
  <div class="dedans">
    <div class="haut">
      <div class="marque">
        <a href="/accueil" class="brand"><b>CASHEVENT</b><em>School</em></a>
        <p>Le programme du baccalauréat chapitre par chapitre : cours de répétition en vidéo,
        QCM corrigés et expliqués, travaux pratiques avec corrigé, et un suivi que les parents
        comprennent en dix secondes.</p>
      </div>
      ${COLONNES.map(([titre, liens]) => `
        <div>
          <h4>${titre}</h4>
          <ul>${liens.map(([href, l]) => `<li><a href="${href}">${l}</a></li>`).join('')}</ul>
        </div>`).join('')}
    </div>
    <div class="bas">
      <span>© ${new Date().getFullYear()} Cashevent School — Maroc</span>
      <span><a href="mailto:contact@cashevent.education">contact@cashevent.education</a></span>
    </div>
  </div>
</footer>`;

  /* Remplace le marqueur de la page s'il existe, sinon ajoute le pied à la fin.
     Appelable plusieurs fois sans risque : un pied déjà posé n'est pas dupliqué. */
  const poser = () => {
    if (document.querySelector('footer.pied-public')) return;
    const marqueur = document.getElementById('pied');
    if (marqueur) marqueur.outerHTML = html();
    else document.body.insertAdjacentHTML('beforeend', html());
  };

  /* Les pages qui portent le marqueur n'ont rien d'autre à faire. Les espaces
     connectés construisent leur mise en page en JavaScript et appellent poser(). */
  if (document.getElementById('pied')) poser();

  return { html, poser };
})();
