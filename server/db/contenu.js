/* Enrichissement du catalogue avec du contenu réel.
   Pour chaque chapitre : recherche des cours en vidéo sur YouTube, rattachement
   d'une vidéo à chaque séance, et téléchargement de l'affiche du chapitre.

   Usage : npm run contenu            (ne touche pas aux chapitres déjà pourvus)
           npm run contenu -- --force (refait tout)                            */
const fs = require('fs');
const path = require('path');
const { tous, un, executer, pool } = require('../src/db');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const IMAGES = path.join(__dirname, '..', '..', 'public', 'img', 'chapitres');
const force = process.argv.includes('--force');
const pause = ms => new Promise(r => setTimeout(r, ms));

/* Précisions de recherche par matière : ce qui distingue un bon résultat. */
const CONTEXTE = {
  maths: 'mathématiques 2 bac sciences cours',
  physique: 'physique 2 bac sciences cours',
  chimie: 'chimie 2 bac sciences cours',
  svt: 'SVT 2 bac sciences cours',
  histoire: 'histoire bac cours',
  geographie: 'géographie bac cours',
  philo: 'philosophie bac cours',
  oeuvres: 'français bac résumé analyse'
};

/* ------------------------------ YouTube ---------------------------------- */
const enSecondes = d => {
  const p = String(d).split(':').map(Number);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0);
};

/* Remonte les fiches vidéo depuis le bloc ytInitialData de la page de résultats. */
function extraire(html) {
  const debut = html.indexOf('var ytInitialData = ');
  if (debut < 0) return [];
  const brut = html.slice(debut + 20);
  const fin = brut.indexOf('};</script>');
  let data;
  try { data = JSON.parse(brut.slice(0, fin + 1)); } catch (e) { return []; }

  const sortie = [];
  const visiter = n => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(visiter);
    const v = n.videoRenderer;
    if (v && v.videoId && v.lengthText && v.title && v.title.runs) {
      sortie.push({
        id: v.videoId,
        titre: v.title.runs[0].text,
        duree: v.lengthText.simpleText,
        secondes: enSecondes(v.lengthText.simpleText),
        chaine: v.ownerText && v.ownerText.runs ? v.ownerText.runs[0].text : null
      });
    }
    Object.values(n).forEach(visiter);
  };
  visiter(data);
  return sortie;
}

async function chercher(requete) {
  const url = 'https://www.youtube.com/results?search_query=' +
    encodeURIComponent(requete) + '&sp=EgIQAQ%253D%253D'; /* vidéos uniquement */
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9', Cookie: 'CONSENT=YES+1' }
  });
  if (!r.ok) throw new Error('YouTube a répondu ' + r.status);
  return extraire(await r.text());
}

/* Un cours utile dure entre quatre minutes et deux heures. */
const retenir = v => {
  const vus = new Set();
  return v.filter(x => {
    if (vus.has(x.id) || x.secondes < 240 || x.secondes > 7200) return false;
    vus.add(x.id); return true;
  });
};

/* ------------------------------- affiche --------------------------------- */
async function telechargerAffiche(videoId, fichier) {
  for (const nom of ['maxresdefault', 'sddefault', 'hqdefault']) {
    try {
      const r = await fetch(`https://i.ytimg.com/vi/${videoId}/${nom}.jpg`);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      /* YouTube renvoie une image grise de 1 Ko quand la définition n'existe pas. */
      if (buf.length < 6000) continue;
      fs.writeFileSync(fichier, buf);
      return buf.length;
    } catch (e) { /* on tente la définition suivante */ }
  }
  return 0;
}

/* --------------------------------- main ---------------------------------- */
(async () => {
  fs.mkdirSync(IMAGES, { recursive: true });
  await require('./migrations').appliquer();

  const chapitres = await tous(`
    SELECT c.id, c.numero, c.titre, c.image, m.code, m.nom AS matiere
      FROM chapitres c JOIN matieres m ON m.id = c.matiere_id
     ORDER BY m.ordre, c.numero`);

  let traites = 0, videos = 0, affiches = 0, vides = [];

  for (const c of chapitres) {
    const seances = await tous(
      'SELECT id, numero, titre, video_url FROM seances WHERE chapitre_id = ? ORDER BY numero', [c.id]);
    if (!seances.length) continue;
    if (!force && c.image && seances.every(s => s.video_url)) continue;

    /* Requête précise d'abord ; repli sur une formulation plus large si elle ne rend rien. */
    const requetes = [
      c.titre + ' ' + (CONTEXTE[c.code] || 'cours'),
      c.titre.replace(/[:—–].*$/, '').trim() + ' ' + c.matiere + ' cours',
      c.titre.replace(/[:—–].*$/, '').trim() + ' cours'
    ];
    let trouvees = [];
    for (const requete of requetes) {
      try { trouvees = retenir(await chercher(requete)); }
      catch (e) { console.log('  ! ' + c.matiere + ' ch.' + c.numero + ' : ' + e.message); }
      if (trouvees.length) break;
      await pause(1200);
    }

    if (!trouvees.length) { vides.push(c.matiere + ' ch.' + c.numero + ' — ' + c.titre); await pause(1200); continue; }

    /* Une vidéo par séance ; on boucle si la recherche en a rendu moins. */
    for (const [i, s] of seances.entries()) {
      const v = trouvees[i % trouvees.length];
      await executer(
        `UPDATE seances SET video_url = ?, video_titre = ?, video_chaine = ?, video_duree = ?, duree = ?
          WHERE id = ?`,
        ['https://www.youtube.com/watch?v=' + v.id, v.titre, v.chaine, v.duree,
         Math.max(1, Math.round(v.secondes / 60)), s.id]);
      videos++;
    }

    /* L'affiche du chapitre est la miniature de son premier cours. */
    const fichier = path.join(IMAGES, c.id + '.jpg');
    const taille = await telechargerAffiche(trouvees[0].id, fichier);
    if (taille) {
      await executer('UPDATE chapitres SET image = ? WHERE id = ?', ['/img/chapitres/' + c.id + '.jpg', c.id]);
      affiches++;
    }

    /* La durée du chapitre est désormais celle des vidéos réellement rattachées. */
    const somme = await un('SELECT SUM(duree) AS n FROM seances WHERE chapitre_id = ?', [c.id]);
    await executer('UPDATE chapitres SET duree = ? WHERE id = ?', [somme.n || 0, c.id]);

    traites++;
    console.log('· ' + String(c.matiere).slice(0, 22).padEnd(24) + 'ch.' + String(c.numero).padEnd(3) +
      String(c.titre).slice(0, 40).padEnd(42) + trouvees.length + ' vidéos  ' +
      (taille ? Math.round(taille / 1024) + ' Ko' : 'sans affiche'));

    await pause(1400); /* on reste courtois avec YouTube */
  }

  console.log('\n' + traites + ' chapitres enrichis · ' + videos + ' séances rattachées à une vidéo · ' +
    affiches + ' affiches téléchargées');
  if (vides.length) {
    console.log('\nSans résultat (à reprendre à la main) :');
    vides.forEach(v => console.log('  · ' + v));
  }
  await pool.end();
})().catch(e => { console.error('\n✗ ' + e.stack); process.exit(1); });
