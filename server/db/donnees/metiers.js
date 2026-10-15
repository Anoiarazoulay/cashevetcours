/* Les métiers que l'élève peut viser, et les chapitres qui comptent pour chacun.

   Un chapitre est repéré par le code de sa matière et son numéro. Le poids dit
   à quel point il pèse pour le métier : 3 essentiel, 2 important, 1 utile.
   La raison, courte, est ce que l'élève lit sur la carte du chapitre.        */
const c = (matiere, numero, poids, raison) => ({ matiere, numero, poids, raison });

module.exports = [
  {
    code: 'astronaute', nom: 'Astronaute', famille: 'Sciences et espace', glyphe: '🚀',
    description: 'Piloter, expérimenter et vivre en orbite : il faut une base solide en physique, en mathématiques et en biologie humaine.',
    chapitres: [
      c('physique', 7, 3, 'Les lois de Newton gouvernent chaque manœuvre en orbite'),
      c('physique', 1, 2, 'Les ondes servent aux communications et aux capteurs'),
      c('physique', 2, 2, 'Optique des instruments et télescopes'),
      c('physique', 4, 3, 'L’énergie nucléaire alimente les sondes lointaines'),
      c('physique', 3, 2, 'Rayonnements et radioprotection en vol'),
      c('physique', 5, 1, 'Circuits des instruments de bord'),
      c('maths', 3, 3, 'Dérivées : vitesses et accélérations des trajectoires'),
      c('maths', 7, 3, 'Intégrales : calculer un déplacement à partir d’une vitesse'),
      c('maths', 6, 2, 'Exponentielle : modéliser la décroissance et la croissance'),
      c('maths', 1, 2, 'Complexes : rotations et signaux'),
      c('maths', 8, 2, 'Probabilités : fiabilité et gestion du risque'),
      c('svt', 2, 2, 'Respiration et énergie du corps en apesanteur'),
      c('svt', 3, 2, 'Le muscle face à l’absence de gravité'),
      c('chimie', 1, 1, 'Cinétique des réactions dans les systèmes de survie'),
      c('geographie', 5, 1, 'La coopération spatiale est mondiale')
    ]
  },
  {
    code: 'medecin', nom: 'Médecin', famille: 'Santé', glyphe: '🩺',
    description: 'Comprendre le corps, poser un diagnostic, soigner : la biologie et la chimie sont au cœur du métier.',
    chapitres: [
      c('svt', 1, 3, 'Les enzymes expliquent la digestion et beaucoup de maladies'),
      c('svt', 2, 3, 'Respiration cellulaire et métabolisme'),
      c('svt', 3, 3, 'Le muscle : effort, fatigue, lésions'),
      c('svt', 4, 3, 'L’ADN : génétique médicale'),
      c('svt', 5, 3, 'Synthèse des protéines : médicaments et maladies génétiques'),
      c('svt', 6, 3, 'Transmission des maladies héréditaires'),
      c('chimie', 3, 3, 'Le pH du sang et des solutions injectables'),
      c('chimie', 4, 2, 'Dosages en laboratoire d’analyses'),
      c('chimie', 1, 2, 'Vitesse d’action d’un médicament'),
      c('physique', 3, 2, 'Radioactivité : imagerie et radiothérapie'),
      c('physique', 1, 1, 'Ondes : échographie'),
      c('maths', 8, 3, 'Probabilités : lire une étude clinique'),
      c('maths', 6, 1, 'Exponentielle : élimination d’un médicament'),
      c('philo', 1, 2, 'La personne humaine et la dignité du patient'),
      c('philo', 2, 1, 'La relation à autrui')
    ]
  },
  {
    code: 'ingenieur', nom: 'Ingénieur', famille: 'Sciences et techniques', glyphe: '⚙️',
    description: 'Concevoir des machines, des ponts, des réseaux : mathématiques et physique à chaque étape.',
    chapitres: [
      c('maths', 3, 3, 'Dérivées : optimiser une structure'),
      c('maths', 7, 3, 'Intégrales : calculs de surfaces, de charges, d’énergies'),
      c('maths', 2, 2, 'Limites : comportement des systèmes'),
      c('maths', 6, 3, 'Exponentielle : charge, décharge, amortissement'),
      c('maths', 1, 2, 'Complexes : circuits en régime alternatif'),
      c('maths', 4, 2, 'Suites : itérations et algorithmes'),
      c('maths', 8, 2, 'Probabilités : fiabilité et contrôle qualité'),
      c('physique', 5, 3, 'Le dipôle RC : base de l’électronique'),
      c('physique', 6, 3, 'RL et RLC : filtres et oscillateurs'),
      c('physique', 7, 3, 'Mécanique : forces et mouvements'),
      c('physique', 1, 2, 'Ondes : vibrations et acoustique'),
      c('physique', 4, 1, 'Énergie nucléaire'),
      c('chimie', 5, 2, 'Piles et batteries'),
      c('chimie', 6, 2, 'Électrolyse : traitement des métaux'),
      c('chimie', 1, 1, 'Cinétique des procédés industriels')
    ]
  },
  {
    code: 'pilote', nom: 'Pilote de ligne', famille: 'Transport et aéronautique', glyphe: '✈️',
    description: 'Voler en sécurité demande de la mécanique, de la météo, de la lecture de cartes et du sang-froid.',
    chapitres: [
      c('physique', 7, 3, 'Lois de Newton : portance, poussée, virages'),
      c('physique', 1, 3, 'Ondes : radio, radar, radionavigation'),
      c('physique', 2, 2, 'Optique et visibilité'),
      c('physique', 5, 1, 'Circuits électriques de bord'),
      c('maths', 3, 2, 'Dérivées : taux de montée et de descente'),
      c('maths', 1, 2, 'Complexes et trigonométrie : caps et angles'),
      c('maths', 8, 2, 'Probabilités : gestion du risque'),
      c('maths', 6, 1, 'Exponentielle : pression et altitude'),
      c('geographie', 1, 2, 'L’Europe : espace aérien et destinations'),
      c('geographie', 2, 2, 'Les États-Unis : hubs et compagnies'),
      c('geographie', 5, 3, 'La mondialisation des flux aériens'),
      c('svt', 2, 1, 'Respiration et oxygène en altitude'),
      c('oeuvres', 5, 1, 'S’exprimer avec précision')
    ]
  },
  {
    code: 'architecte', nom: 'Architecte', famille: 'Bâtiment et design', glyphe: '📐',
    description: 'Dessiner des bâtiments qui tiennent debout, économes et beaux : géométrie, physique et culture.',
    chapitres: [
      c('maths', 1, 3, 'Complexes : rotations, symétries, géométrie plane'),
      c('maths', 3, 3, 'Dérivées : courbes et optimisation des formes'),
      c('maths', 7, 3, 'Intégrales : surfaces et volumes'),
      c('maths', 2, 1, 'Limites et continuité'),
      c('physique', 7, 3, 'Forces et équilibre des structures'),
      c('physique', 1, 2, 'Acoustique des salles'),
      c('physique', 2, 2, 'Lumière naturelle et ouvertures'),
      c('geographie', 1, 1, 'Villes et aménagement en Europe'),
      c('geographie', 3, 2, 'La Chine : villes nouvelles et littoralisation'),
      c('geographie', 4, 2, 'Le Brésil : inégalités urbaines'),
      c('histoire', 4, 2, 'Le Maroc sous le protectorat : villes nouvelles'),
      c('philo', 1, 1, 'La personne et son cadre de vie'),
      c('oeuvres', 5, 2, 'Présenter et défendre un projet à l’écrit')
    ]
  },
  {
    code: 'developpeur', nom: 'Développeur informatique', famille: 'Numérique', glyphe: '💻',
    description: 'Écrire des programmes, c’est raisonner avec rigueur : logique, suites, probabilités et une bonne expression écrite.',
    chapitres: [
      c('maths', 4, 3, 'Suites et récurrence : la base des boucles et des algorithmes'),
      c('maths', 8, 3, 'Probabilités : données, hasard, intelligence artificielle'),
      c('maths', 2, 2, 'Limites : complexité et comportement des algorithmes'),
      c('maths', 3, 2, 'Dérivées : optimisation et apprentissage automatique'),
      c('maths', 6, 2, 'Exponentielle et logarithme : croissance et complexité'),
      c('maths', 5, 2, 'Logarithme : échelles et compression'),
      c('maths', 1, 1, 'Complexes : traitement du signal et images'),
      c('physique', 5, 2, 'RC : signaux et électronique numérique'),
      c('physique', 6, 1, 'Oscillateurs et horloges'),
      c('philo', 5, 2, 'Théorie et expérience : tester une hypothèse'),
      c('philo', 4, 1, 'La vérité : ce qu’une donnée prouve ou non'),
      c('geographie', 5, 1, 'Mondialisation et économie numérique'),
      c('oeuvres', 5, 2, 'Expliquer clairement, à l’écrit')
    ]
  },
  {
    code: 'pharmacien', nom: 'Pharmacien', famille: 'Santé', glyphe: '💊',
    description: 'Préparer, contrôler et délivrer les médicaments : la chimie est le cœur du métier, la biologie son contexte.',
    chapitres: [
      c('chimie', 1, 3, 'Cinétique : conservation et action d’un médicament'),
      c('chimie', 2, 3, 'Équilibres chimiques'),
      c('chimie', 3, 3, 'pH et acidité des préparations'),
      c('chimie', 4, 3, 'Dosages et contrôle qualité'),
      c('chimie', 5, 2, 'Oxydoréduction'),
      c('chimie', 6, 1, 'Électrolyse'),
      c('svt', 1, 3, 'Enzymes : cibles des médicaments'),
      c('svt', 2, 2, 'Métabolisme'),
      c('svt', 5, 2, 'Protéines et biotechnologies'),
      c('maths', 6, 2, 'Exponentielle : élimination d’un médicament'),
      c('maths', 8, 2, 'Probabilités : effets et statistiques'),
      c('physique', 3, 1, 'Radiopharmacie'),
      c('philo', 1, 1, 'Responsabilité envers la personne')
    ]
  },
  {
    code: 'avocat', nom: 'Avocat', famille: 'Droit et justice', glyphe: '⚖️',
    description: 'Défendre, argumenter, convaincre : la philosophie, l’histoire et la maîtrise de l’écrit sont décisives.',
    chapitres: [
      c('philo', 6, 3, 'L’État, la loi, la légitimité'),
      c('philo', 4, 3, 'La vérité : preuve et témoignage'),
      c('philo', 1, 3, 'La personne humaine et ses droits'),
      c('philo', 2, 2, 'Autrui et l’exigence éthique'),
      c('philo', 3, 2, 'L’histoire et la méthode historique'),
      c('oeuvres', 3, 3, 'Le Dernier Jour d’un condamné : un plaidoyer'),
      c('oeuvres', 5, 3, 'Argumenter à l’écrit'),
      c('oeuvres', 2, 2, 'Antigone : loi de la cité et loi morale'),
      c('oeuvres', 1, 1, 'Contexte et structure d’une œuvre'),
      c('histoire', 1, 2, 'Traités et droit international'),
      c('histoire', 3, 2, 'Totalitarismes et justice internationale'),
      c('histoire', 5, 2, 'Le mouvement national et la construction de l’État'),
      c('maths', 8, 1, 'Probabilités : lire une expertise')
    ]
  },
  {
    code: 'journaliste', nom: 'Journaliste', famille: 'Médias et communication', glyphe: '🎙️',
    description: 'Enquêter, vérifier, raconter le monde : culture générale, esprit critique et écriture.',
    chapitres: [
      c('oeuvres', 5, 3, 'Analyser et rédiger'),
      c('oeuvres', 3, 2, 'Le récit à la première personne'),
      c('oeuvres', 4, 2, 'Tradition et modernité au Maroc'),
      c('philo', 4, 3, 'La vérité et ses critères'),
      c('philo', 5, 2, 'Fait, hypothèse, vérification'),
      c('philo', 6, 2, 'La politique et l’État'),
      c('histoire', 1, 2, 'La Première Guerre mondiale'),
      c('histoire', 2, 2, 'La crise de 1929'),
      c('histoire', 3, 3, 'Totalitarismes et propagande'),
      c('histoire', 5, 2, 'Le mouvement national marocain'),
      c('geographie', 5, 3, 'La mondialisation : acteurs et enjeux'),
      c('geographie', 2, 2, 'Les États-Unis et le soft power'),
      c('geographie', 3, 1, 'La Chine'),
      c('maths', 8, 2, 'Probabilités : lire des statistiques sans se tromper')
    ]
  },
  {
    code: 'enseignant', nom: 'Enseignant', famille: 'Éducation', glyphe: '📚',
    description: 'Transmettre demande de maîtriser sa matière et de savoir l’expliquer : tout le programme compte, la pédagogie aussi.',
    chapitres: [
      c('maths', 2, 2, 'Les bases que les élèves doivent comprendre'),
      c('maths', 3, 2, 'Dérivation : un chapitre clé à expliquer'),
      c('maths', 4, 2, 'Le raisonnement par récurrence'),
      c('physique', 7, 2, 'Mécanique : la physique du quotidien'),
      c('chimie', 3, 1, 'Acides et bases'),
      c('svt', 4, 2, 'L’ADN : fondement de la biologie'),
      c('philo', 2, 3, 'Autrui : la relation pédagogique'),
      c('philo', 1, 2, 'La personne humaine'),
      c('philo', 5, 3, 'Théorie et expérience : comment on apprend'),
      c('philo', 4, 2, 'La vérité'),
      c('oeuvres', 5, 3, 'Expliquer, argumenter, corriger'),
      c('oeuvres', 1, 1, 'Situer une œuvre'),
      c('histoire', 5, 2, 'L’histoire du Maroc à transmettre')
    ]
  },
  {
    code: 'economiste', nom: 'Économiste ou banquier', famille: 'Économie et gestion', glyphe: '📈',
    description: 'Analyser des marchés, gérer des risques, conseiller : mathématiques appliquées et compréhension du monde.',
    chapitres: [
      c('maths', 8, 3, 'Probabilités : risque et assurance'),
      c('maths', 4, 3, 'Suites : intérêts composés et remboursements'),
      c('maths', 6, 3, 'Exponentielle : croissance et taux'),
      c('maths', 5, 2, 'Logarithme : taux de croissance et échelles'),
      c('maths', 3, 2, 'Dérivées : coût marginal et optimisation'),
      c('maths', 7, 1, 'Intégrales : surplus et cumul'),
      c('histoire', 2, 3, 'La crise de 1929 : la grande leçon'),
      c('histoire', 1, 1, 'Conséquences économiques de la guerre'),
      c('geographie', 1, 3, 'L’Union européenne'),
      c('geographie', 2, 3, 'Les États-Unis'),
      c('geographie', 3, 3, 'La Chine émergente'),
      c('geographie', 4, 2, 'Le Brésil et le développement'),
      c('geographie', 5, 3, 'La mondialisation'),
      c('philo', 6, 1, 'L’État et l’économie')
    ]
  },
  {
    code: 'veterinaire', nom: 'Vétérinaire', famille: 'Santé animale', glyphe: '🐾',
    description: 'Soigner les animaux, de la ferme au cabinet : biologie, chimie et sens de l’observation.',
    chapitres: [
      c('svt', 1, 3, 'Enzymes et digestion animale'),
      c('svt', 2, 3, 'Respiration et énergie'),
      c('svt', 3, 3, 'Le muscle : locomotion et effort'),
      c('svt', 4, 2, 'ADN et génétique'),
      c('svt', 5, 2, 'Protéines'),
      c('svt', 6, 3, 'Hérédité et élevage sélectif'),
      c('chimie', 3, 2, 'pH et équilibres biologiques'),
      c('chimie', 4, 2, 'Dosages'),
      c('chimie', 1, 1, 'Cinétique'),
      c('maths', 8, 2, 'Probabilités : génétique et épidémies'),
      c('maths', 6, 1, 'Exponentielle : croissance des populations'),
      c('geographie', 4, 1, 'Agriculture et élevage au Brésil'),
      c('philo', 2, 1, 'Le soin et la responsabilité')
    ]
  },
  {
    code: 'chercheur', nom: 'Chercheur en biologie', famille: 'Recherche', glyphe: '🔬',
    description: 'Comprendre le vivant jusque dans ses molécules : biologie, chimie et une méthode rigoureuse.',
    chapitres: [
      c('svt', 4, 3, 'L’ADN et l’information génétique'),
      c('svt', 5, 3, 'Réplication, transcription, traduction'),
      c('svt', 6, 3, 'Génétique et croisements'),
      c('svt', 1, 3, 'Les enzymes'),
      c('svt', 2, 3, 'Métabolisme énergétique'),
      c('svt', 3, 2, 'Le muscle'),
      c('chimie', 1, 2, 'Cinétique'),
      c('chimie', 2, 2, 'Équilibres'),
      c('chimie', 3, 3, 'pH et tampons'),
      c('chimie', 4, 2, 'Dosages'),
      c('maths', 8, 3, 'Probabilités et statistiques'),
      c('maths', 6, 2, 'Exponentielle : croissance bactérienne'),
      c('physique', 3, 2, 'Traceurs radioactifs'),
      c('philo', 5, 3, 'Théorie et expérience : la méthode scientifique'),
      c('philo', 4, 2, 'La vérité scientifique')
    ]
  },
  {
    code: 'diplomate', nom: 'Diplomate', famille: 'Relations internationales', glyphe: '🌍',
    description: 'Représenter son pays et négocier : histoire, géographie, philosophie politique et langue soignée.',
    chapitres: [
      c('histoire', 1, 3, 'Alliances, traités, SDN'),
      c('histoire', 3, 3, 'Seconde Guerre mondiale et nouvel ordre'),
      c('histoire', 4, 3, 'Le Maroc sous le protectorat'),
      c('histoire', 5, 3, 'Le mouvement national et l’indépendance'),
      c('histoire', 2, 2, 'La crise de 1929'),
      c('geographie', 1, 3, 'L’Union européenne'),
      c('geographie', 2, 3, 'Les États-Unis'),
      c('geographie', 3, 3, 'La Chine'),
      c('geographie', 4, 2, 'Le Brésil'),
      c('geographie', 5, 3, 'La mondialisation'),
      c('philo', 6, 3, 'La politique et l’État'),
      c('philo', 2, 2, 'Autrui'),
      c('philo', 3, 2, 'L’histoire'),
      c('oeuvres', 5, 3, 'Rédiger et argumenter'),
      c('oeuvres', 4, 1, 'Culture marocaine')
    ]
  }
];
