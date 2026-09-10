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
      location.href = '/connexion.html?suite=' + encodeURIComponent(location.pathname);
      throw new Error('Session expirée.');
    }
    let donnees = null;
    if ((r.headers.get('content-type') || '').includes('application/json')) donnees = await r.json();
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
