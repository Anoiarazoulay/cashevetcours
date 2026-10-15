/* Accès à l'API — le cookie de session est envoyé automatiquement. */
window.API = (() => {
  const appel = async (methode, chemin, corps) => {
    let r;
    try {
      r = await fetch('/api' + chemin, {
        method: methode,
        credentials: 'same-origin',
        headers: corps ? { 'Content-Type': 'application/json' } : {},
        body: corps ? JSON.stringify(corps) : undefined
      });
    } catch (e) {
      throw new Error('Serveur injoignable. Vérifiez que l’application est démarrée.');
    }
    if (r.status === 401 && !location.pathname.startsWith('/connexion')) {
      /* Session expirée : retour à la porte de l'espace où l'on se trouvait. */
      const porte = { '/espace-parent': 'parent', '/espace-enseignant': 'enseignant', '/admin': 'admin' };
      location.href = '/connexion/' + (porte[location.pathname] || 'eleve') +
        '?suite=' + encodeURIComponent(location.pathname);
      throw new Error('Session expirée.');
    }
    let donnees = null;
    if ((r.headers.get('content-type') || '').includes('application/json')) donnees = await r.json();
    /* Un mot de passe à changer bloque tout le reste : on y va. */
    if (r.status === 403 && donnees && donnees.code === 'MOT_DE_PASSE_A_CHANGER' && location.pathname !== '/mot-de-passe') {
      location.href = '/mot-de-passe';
      throw new Error(donnees.erreur);
    }
    if (!r.ok) throw new Error((donnees && donnees.erreur) || 'Erreur ' + r.status);
    return donnees;
  };

  return {
    get: c => appel('GET', c),
    post: (c, corps) => appel('POST', c, corps),
    patch: (c, corps) => appel('PATCH', c, corps),
    put: (c, corps) => appel('PUT', c, corps),
    supprimer: c => appel('DELETE', c),
    /* Renvoie null au lieu de rediriger : utile sur la page de connexion. */
    moi: async () => {
      try {
        const r = await fetch('/api/auth/moi', { credentials: 'same-origin' });
        return r.ok ? (await r.json()).utilisateur : null;
      } catch (e) { return null; }
    }
  };
})();
