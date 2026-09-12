/* Envoi d'un fichier stocké en base, sous son nom d'origine.
   « attachment » encode le nom selon la RFC 5987 : les accents passent. */
const envoyerFichier = (res, { fichier_nom, fichier_type, fichier }) => {
  res.attachment(fichier_nom);
  res.type(fichier_type);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(fichier);
};

module.exports = { envoyerFichier };
