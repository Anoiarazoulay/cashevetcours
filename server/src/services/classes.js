/* Les classes du secondaire camerounais, de la 6e à la Terminale.
   Une matière porte la liste des classes qui la voient (colonne matieres.series,
   ex. « TA,TC,TD ») ; un élève est rattaché à une classe par son libellé. */
const CLASSES = [
  { code: '6E', niveau: '6e', court: '6e', libelle: '6e' },
  { code: '5E', niveau: '5e', court: '5e', libelle: '5e' },
  { code: '4A', niveau: '4e', court: '4e A', libelle: '4e A (Allemand)' },
  { code: '4E', niveau: '4e', court: '4e E', libelle: '4e E (Espagnol)' },
  { code: '3A', niveau: '3e', court: '3e A', libelle: '3e A (Allemand)' },
  { code: '3E', niveau: '3e', court: '3e E', libelle: '3e E (Espagnol)' },
  { code: '2A', niveau: '2nde', court: '2nde A', libelle: '2nde A' },
  { code: '2C', niveau: '2nde', court: '2nde C', libelle: '2nde C' },
  { code: '2D', niveau: '2nde', court: '2nde D', libelle: '2nde D' },
  { code: '1A', niveau: '1re', court: '1re A', libelle: '1re A' },
  { code: '1B', niveau: '1re', court: '1re B', libelle: '1re B' },
  { code: '1C', niveau: '1re', court: '1re C', libelle: '1re C' },
  { code: '1D', niveau: '1re', court: '1re D', libelle: '1re D' },
  { code: 'TA', niveau: 'Terminale', court: 'Tle A', libelle: 'Terminale A' },
  { code: 'TB', niveau: 'Terminale', court: 'Tle B', libelle: 'Terminale B' },
  { code: 'TC', niveau: 'Terminale', court: 'Tle C', libelle: 'Terminale C' },
  { code: 'TD', niveau: 'Terminale', court: 'Tle D', libelle: 'Terminale D' }
];
const NIVEAUX = ['6e', '5e', '4e', '3e', '2nde', '1re', 'Terminale'];
const CODES = new Set(CLASSES.map(c => c.code));

/* « A » (ancien format, Terminale implicite) devient « TA » ; le reste est filtré. */
const normaliser = liste => [...new Set((Array.isArray(liste) ? liste : String(liste || '').split(','))
  .map(s => String(s).trim().toUpperCase()).map(s => /^[A-D]$/.test(s) ? 'T' + s : s)
  .filter(s => CODES.has(s)))].sort((a, b) => CLASSES.findIndex(c => c.code === a) - CLASSES.findIndex(c => c.code === b));

/* La classe d'un élève, lue dans sa fiche ; « Série A » des premiers comptes vaut Terminale A. */
const codeDe = filiere => {
  const f = String(filiere || '').trim();
  const ancienne = f.match(/^Série ([A-D])$/);
  if (ancienne) return 'T' + ancienne[1];
  const c = CLASSES.find(x => x.libelle === f);
  return c ? c.code : null;
};
const libelleDe = code => (CLASSES.find(c => c.code === code) || {}).libelle || null;

module.exports = { CLASSES, NIVEAUX, normaliser, codeDe, libelleDe };
