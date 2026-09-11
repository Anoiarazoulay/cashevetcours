/* Contenu réel des séances : cours en vidéo et affiches de chapitre.

   « npm run contenu » va chercher ces vidéos sur YouTube, puis enregistre le
   résultat dans donnees/videos.json. Ce fichier est versionné : un déploiement
   neuf retrouve donc exactement les mêmes cours, sans dépendre d'une recherche
   en ligne au moment de l'installation.

   Les affiches pointent sur les miniatures d'origine, autorisées par la
   politique de sécurité. « npm run contenu » les remplace par des copies
   locales quand on veut éviter les appels vers YouTube.                       */
const fs = require('fs');
const path = require('path');
const { tous, executer } = require('../src/db');

const FICHIER = path.join(__dirname, 'donnees', 'videos.json');

/* Applique le fichier ; ne touche qu'aux séances encore dépourvues de vidéo,
   sauf avec « force ». Renvoie le nombre de séances et d'affiches posées. */
async function appliquer({ force = false, silencieux = false } = {}) {
  if (!fs.existsSync(FICHIER)) return { seances: 0, images: 0 };
  const contenu = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));

  const chapitres = await tous(
    `SELECT c.id, c.numero, c.image, m.code AS matiere
       FROM chapitres c JOIN matieres m ON m.id = c.matiere_id`);
  const parCle = new Map(chapitres.map(c => [c.matiere + '#' + c.numero, c]));

  const seances = await tous('SELECT id, chapitre_id, numero, video_url FROM seances');
  const parSeance = new Map(seances.map(s => [s.chapitre_id + '#' + s.numero, s]));

  let nbSeances = 0, nbImages = 0;
  for (const ch of contenu.chapitres) {
    const chapitre = parCle.get(ch.matiere + '#' + ch.numero);
    if (!chapitre) continue;

    if (ch.image && (force || !chapitre.image)) {
      await executer('UPDATE chapitres SET image = ? WHERE id = ?', [ch.image, chapitre.id]);
      nbImages++;
    }

    for (const s of ch.seances) {
      const seance = parSeance.get(chapitre.id + '#' + s.numero);
      if (!seance || (!force && seance.video_url)) continue;
      await executer(
        `UPDATE seances SET video_url = ?, video_titre = ?, video_chaine = ?, video_duree = ?
          WHERE id = ?`, [s.url, s.titre, s.chaine, s.duree, seance.id]);
      nbSeances++;
    }
  }

  if (!silencieux && (nbSeances || nbImages))
    console.log('· contenu appliqué : ' + nbSeances + ' séances en vidéo, ' +
      nbImages + ' affiches');
  return { seances: nbSeances, images: nbImages };
}

const idVideo = url => {
  const m = String(url || '').match(/[?&]v=([\w-]{6,})/);
  return m ? m[1] : null;
};

/* Relit la base et réécrit donnees/videos.json — appelé à la fin de
   « npm run contenu », pour que le dépôt porte toujours le dernier état. */
async function exporter({ silencieux = false } = {}) {
  const lignes = await tous(
    `SELECT m.code AS matiere, c.numero AS chapitre, s.numero AS seance,
            s.video_url AS url, s.video_titre AS titre,
            s.video_chaine AS chaine, s.video_duree AS duree
       FROM seances s
       JOIN chapitres c ON c.id = s.chapitre_id
       JOIN matieres  m ON m.id = c.matiere_id
      WHERE s.video_url IS NOT NULL AND s.video_url <> ''
      ORDER BY m.ordre, c.numero, s.numero`);

  const parChapitre = new Map();
  for (const l of lignes) {
    const cle = l.matiere + '#' + l.chapitre;
    if (!parChapitre.has(cle))
      parChapitre.set(cle, { matiere: l.matiere, numero: l.chapitre, image: null, seances: [] });
    parChapitre.get(cle).seances.push({
      numero: l.seance, url: l.url, titre: l.titre, chaine: l.chaine, duree: l.duree
    });
  }

  /* On enregistre l'adresse d'origine de l'affiche, jamais le chemin local :
     les copies téléchargées ne sont pas versionnées. */
  for (const ch of parChapitre.values()) {
    const v = idVideo(ch.seances[0] && ch.seances[0].url);
    ch.image = v ? 'https://i.ytimg.com/vi/' + v + '/hqdefault.jpg' : null;
  }

  const sortie = { genere: new Date().toISOString().slice(0, 10), chapitres: [...parChapitre.values()] };
  fs.writeFileSync(FICHIER, JSON.stringify(sortie, null, 1) + '\n', 'utf8');
  if (!silencieux)
    console.log('· contenu exporté : ' + sortie.chapitres.length + ' chapitres, ' +
      lignes.length + ' séances → server/db/donnees/videos.json');
  return sortie.chapitres.length;
}

module.exports = { appliquer, exporter };
