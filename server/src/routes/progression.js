/* Progression de l'élève connecté */
const express = require('express');
const { executer, un } = require('../db');
const { requiert } = require('../middleware/auth');
const prog = require('../services/progression');
const journal = require('../services/journal');

const routeur = express.Router();
const idValide = v => Number.isInteger(Number(v)) && Number(v) > 0;

const chapitreExiste = id => un('SELECT id FROM chapitres WHERE id = ? AND publie = 1', [id]);

/* GET /api/progression — état complet, format attendu par l'interface */
routeur.get('/', requiert('eleve'), async (req, res) => {
  res.json(await prog.etat(req.utilisateur.id));
});

/* GET /api/progression/stats */
routeur.get('/stats', requiert('eleve'), async (req, res) => {
  res.json(await prog.statistiques(req.utilisateur.id));
});

/* GET /api/progression/tableau-bord — le même tableau de bord que côté parent */
routeur.get('/tableau-bord', requiert('eleve'), async (req, res) => {
  res.json(await prog.tableauDeBord(req.utilisateur.id));
});

/* POST /api/progression/seance — une séance vient d'être visionnée */
routeur.post('/seance', requiert('eleve'), async (req, res) => {
  const seanceId = Number(req.body.seanceId);
  if (!idValide(seanceId)) return res.status(400).json({ erreur: 'Séance invalide.' });
  const s = await un('SELECT id, chapitre_id, titre FROM seances WHERE id = ?', [seanceId]);
  if (!s) return res.status(404).json({ erreur: 'Cette séance n’existe pas.' });

  await executer('INSERT IGNORE INTO seances_vues (eleve_id, seance_id) VALUES (?,?)',
    [req.utilisateur.id, seanceId]);
  await executer(`INSERT INTO progression (eleve_id, chapitre_id) VALUES (?,?)
                  ON DUPLICATE KEY UPDATE maj = NOW()`, [req.utilisateur.id, s.chapitre_id]);
  await prog.journaliser(req.utilisateur.id);
  await terminerSiComplet(req.utilisateur.id, s.chapitre_id);
  await journal.enregistrer(req, {
    categorie: 'apprentissage', action: 'Séance visionnée', cible: s.titre });
  res.json(await etatChapitre(req.utilisateur.id, s.chapitre_id));
});

/* POST /api/progression/resume — le résumé écrit a été lu */
routeur.post('/resume', requiert('eleve'), async (req, res) => {
  const id = Number(req.body.chapitreId);
  if (!idValide(id) || !await chapitreExiste(id))
    return res.status(404).json({ erreur: 'Ce chapitre n’existe pas.' });
  const lu = req.body.lu === false ? 0 : 1;
  await executer(`INSERT INTO progression (eleve_id, chapitre_id, resume_lu) VALUES (?,?,?)
                  ON DUPLICATE KEY UPDATE resume_lu = VALUES(resume_lu), maj = NOW()`,
    [req.utilisateur.id, id, lu]);
  await prog.journaliser(req.utilisateur.id);
  await terminerSiComplet(req.utilisateur.id, id);
  res.json(await etatChapitre(req.utilisateur.id, id));
});

/* POST /api/progression/termine — l'élève marque lui-même le chapitre */
routeur.post('/termine', requiert('eleve'), async (req, res) => {
  const id = Number(req.body.chapitreId);
  if (!idValide(id) || !await chapitreExiste(id))
    return res.status(404).json({ erreur: 'Ce chapitre n’existe pas.' });
  const fini = req.body.termine === false ? 0 : 1;

  if (fini) {
    /* Marquer terminé coche aussi les séances et le résumé : c'est ce que l'élève attend. */
    await executer(`INSERT IGNORE INTO seances_vues (eleve_id, seance_id)
                    SELECT ?, id FROM seances WHERE chapitre_id = ?`, [req.utilisateur.id, id]);
    await executer(`INSERT INTO progression (eleve_id, chapitre_id, resume_lu, termine) VALUES (?,?,1,1)
                    ON DUPLICATE KEY UPDATE resume_lu = 1, termine = 1, maj = NOW()`,
      [req.utilisateur.id, id]);
  } else {
    await executer(`INSERT INTO progression (eleve_id, chapitre_id, termine) VALUES (?,?,0)
                    ON DUPLICATE KEY UPDATE termine = 0, maj = NOW()`, [req.utilisateur.id, id]);
  }
  await prog.journaliser(req.utilisateur.id);
  const ch = await un('SELECT titre FROM chapitres WHERE id = ?', [id]);
  await journal.enregistrer(req, {
    categorie: 'apprentissage', action: fini ? 'Chapitre terminé' : 'Chapitre rouvert',
    cible: ch ? ch.titre : 'chapitre ' + id });
  res.json(await etatChapitre(req.utilisateur.id, id));
});

/* POST / DELETE /api/progression/liste/:chapitreId */
routeur.post('/liste/:chapitreId', requiert('eleve'), async (req, res) => {
  const id = Number(req.params.chapitreId);
  if (!idValide(id) || !await chapitreExiste(id))
    return res.status(404).json({ erreur: 'Ce chapitre n’existe pas.' });
  await executer('INSERT IGNORE INTO ma_liste (eleve_id, chapitre_id) VALUES (?,?)', [req.utilisateur.id, id]);
  res.json({ dansLaListe: true });
});

routeur.delete('/liste/:chapitreId', requiert('eleve'), async (req, res) => {
  const id = Number(req.params.chapitreId);
  await executer('DELETE FROM ma_liste WHERE eleve_id = ? AND chapitre_id = ?', [req.utilisateur.id, id]);
  res.json({ dansLaListe: false });
});

/* Passe le chapitre à « terminé » dès que tout est fait, sans intervention de l'élève. */
async function terminerSiComplet(eleveId, chapitreId) {
  const l = (await prog.lignes(eleveId)).find(x => x.id === chapitreId);
  if (l && !l.termine && prog.avancement(l) >= 0.99)
    await executer('UPDATE progression SET termine = 1 WHERE eleve_id = ? AND chapitre_id = ?',
      [eleveId, chapitreId]);
}

async function etatChapitre(eleveId, chapitreId) {
  const etat = await prog.etat(eleveId);
  return { chapitre: chapitreId, etat: etat.ch[chapitreId] || null };
}

module.exports = routeur;
