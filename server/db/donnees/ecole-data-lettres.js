/* CASHEVENT SCHOOL — Histoire · Géographie · Philosophie · Œuvres au programme */
(() => {
  const { M, q } = window.ECOLE;

  /* =============================== HISTOIRE ============================== */
  M.push({
    id: 'histoire', nom: 'Histoire', court: 'Histoire', prof: 'M. Chraïbi',
    coef: 2, teinte: '#8a5a2b', teinte2: '#b3392b', glyphe: '🏛',
    labelFormules: 'Dates repères',
    chapitres: [
      { titre: 'La Première Guerre mondiale : causes et conséquences', duree: 36, difficulte: 'Facile',
        accroche: "Comment un attentat déclenche un conflit total qui redessine le monde.",
        notions: ['Les alliances', 'La guerre totale', 'Le traité de Versailles', 'La SDN'],
        seances: [['Les causes profondes et immédiates', 10], ['Le déroulement : guerre de mouvement et de position', 12], ['Une guerre totale', 8], ['Les conséquences et les traités', 9]],
        resume: {
          points: ["Les causes profondes tiennent aux rivalités coloniales, économiques et nationales, ainsi qu'au système d'alliances.",
            "L'attentat de Sarajevo (juin 1914) est la cause immédiate qui déclenche l'engrenage des alliances.",
            "La guerre devient totale : mobilisation de l'économie, de la science et des colonies.",
            "Le traité de Versailles (1919) impose de lourdes sanctions à l'Allemagne et nourrit un ressentiment durable."],
          formules: ['1914 : déclenchement du conflit', '1917 : entrée des États-Unis, révolution russe', '11 novembre 1918 : armistice', '1919 : traité de Versailles, création de la SDN'],
          pieges: ["Ne pas confondre causes profondes (structurelles) et cause immédiate (l'attentat de Sarajevo).",
            "La SDN est créée en 1919-1920, pas l'ONU, qui date de 1945.",
            "Attention à la chronologie : la révolution russe et l'entrée en guerre des États-Unis ont lieu la même année, 1917."]
        },
        qcm: [
          q('La Première Guerre mondiale éclate en :', ['1914', '1918', '1939'], 0, "Le conflit débute en août 1914 et s'achève par l'armistice du 11 novembre 1918."),
          q('Le traité de Versailles est signé en :', ['1919', '1920', '1918'], 0, "Signé le 28 juin 1919, il fixe les conditions de paix avec l'Allemagne, un an après l'armistice."),
          q('Une conséquence politique majeure du conflit est :', ['la création de la Société des Nations', 'la fin immédiate des empires coloniaux', 'l’unification politique de l’Europe'], 0, "La SDN, née du traité de Versailles, devait garantir la paix collective ; elle échouera dans les années 1930.")
        ],
        tp: { objectifs: ['Construire une frise chronologique', 'Analyser un document historique'],
          exercices: ['1. Classer par ordre chronologique : armistice, attentat de Sarajevo, entrée en guerre des États-Unis, traité de Versailles.',
            '2. Expliquer en quoi la guerre de 1914-1918 est une guerre totale (trois arguments).',
            '3. À partir des clauses du traité de Versailles, expliquer le ressentiment allemand.'],
          corrige: ['1. Sarajevo (juin 1914) → entrée des États-Unis (avril 1917) → armistice (novembre 1918) → Versailles (juin 1919).',
            '2. Mobilisation de toute l’économie, effort demandé aux civils et aux femmes, recours aux colonies, propagande d’État.',
            '3. Perte de territoires, limitation militaire drastique, réparations financières écrasantes et article 231 désignant l’Allemagne comme seule responsable.'] } },

      { titre: 'La crise économique de 1929', duree: 34, difficulte: 'Moyen',
        accroche: "Du krach boursier à la dépression mondiale : mécanismes de propagation et réponses politiques.",
        notions: ['Krach boursier', 'Surproduction', 'Propagation mondiale', 'New Deal'],
        seances: [['Les États-Unis des années 1920 et la spéculation', 9], ['Le krach d’octobre 1929', 9], ['La propagation à l’économie mondiale', 8], ['Les réponses : New Deal et repli protectionniste', 8]],
        resume: {
          points: ["La prospérité américaine des années 1920 reposait sur le crédit et la spéculation boursière.",
            "Le krach de Wall Street (octobre 1929) déclenche faillites bancaires, chute de la production et chômage de masse.",
            "La crise se propage par le retrait des capitaux américains et l'effondrement du commerce international.",
            "Le New Deal de Roosevelt marque l'intervention de l'État dans l'économie ; ailleurs, la crise favorise les régimes autoritaires."],
          formules: ['24 octobre 1929 : jeudi noir', '1933 : Roosevelt lance le New Deal', 'Chômage américain : 25 % en 1932', 'Protectionnisme et dévaluations en chaîne'],
          pieges: ["Le krach est le déclencheur, pas la cause : la surproduction et la spéculation la précèdent.",
            "Le New Deal date de 1933, pas de 1929 : Hoover précède Roosevelt.",
            "Ne pas réduire la crise aux États-Unis : sa dimension est mondiale."]
        },
        qcm: [
          q('La crise de 1929 débute par :', ['le krach boursier de Wall Street', 'une guerre commerciale', 'une famine'], 0, "Le jeudi noir du 24 octobre 1929 voit l'effondrement des cours à la bourse de New York."),
          q('Le New Deal est mis en place par :', ['Roosevelt', 'Hoover', 'Wilson'], 0, "Élu en 1932, Roosevelt lance dès 1933 une politique de grands travaux et de régulation bancaire."),
          q('La crise se propage au monde principalement par :', ['le retrait des capitaux américains et la chute du commerce', 'un conflit armé', 'l’exode rural'], 0, "Les banques américaines rapatrient leurs capitaux, notamment d'Allemagne, et le protectionnisme effondre les échanges.")
        ],
        tp: { objectifs: ['Expliquer un mécanisme économique', 'Comparer deux politiques de sortie de crise'],
          exercices: ['1. Expliquer l’enchaînement entre spéculation, krach et chômage.',
            '2. Citer trois mesures du New Deal.',
            '3. Expliquer pourquoi la crise a favorisé la montée des régimes autoritaires en Europe.'],
          corrige: ["1. L'achat d'actions à crédit gonfle une bulle ; à l'annonce des premières ventes, la panique fait chuter les cours ; les banques ruinées cessent de prêter, les entreprises ferment, le chômage explose.",
            '2. Grands travaux publics, régulation bancaire (Glass-Steagall), soutien aux prix agricoles, reconnaissance des syndicats.',
            "3. Le chômage et l'appauvrissement discréditent les démocraties parlementaires et rendent audibles les discours autoritaires promettant l'ordre et le travail."] } },

      { titre: 'Régimes totalitaires et Seconde Guerre mondiale', duree: 40, difficulte: 'Moyen',
        accroche: "Des idéologies totalitaires au conflit le plus meurtrier de l'histoire.",
        notions: ['Totalitarisme', 'Expansionnisme', 'Guerre mondiale', 'Bilan et nouvel ordre'],
        seances: [['Les caractères du totalitarisme', 10], ['L’expansionnisme des années 1930', 10], ['Le déroulement du conflit', 11], ['Bilan et conférences de la paix', 9]],
        resume: {
          points: ["Un régime totalitaire repose sur un parti unique, une idéologie officielle, la terreur et l'encadrement de la société.",
            "L'expansionnisme allemand et la politique d'apaisement des démocraties mènent au conflit.",
            "La guerre commence par l'invasion de la Pologne le 1er septembre 1939 et devient mondiale en 1941.",
            "Les conférences de Yalta et Potsdam (1945) organisent le monde d'après-guerre et annoncent la guerre froide."],
          formules: ['1933 : Hitler chancelier', '1er septembre 1939 : invasion de la Pologne', '1942-1943 : tournant de Stalingrad', '1945 : Yalta, Potsdam, création de l’ONU'],
          pieges: ["Ne pas confondre régime autoritaire et régime totalitaire : le second vise le contrôle total de la société.",
            "La guerre devient mondiale en 1941 (URSS, Pearl Harbor), mais commence en 1939.",
            "Yalta prépare l'après-guerre ; ce n'est pas une conférence de capitulation."]
        },
        qcm: [
          q('Le régime nazi arrive au pouvoir en Allemagne en :', ['1933', '1929', '1939'], 0, "Hitler est nommé chancelier le 30 janvier 1933, dans le contexte de la crise économique."),
          q('La Seconde Guerre mondiale commence par :', ['l’invasion de la Pologne en septembre 1939', 'l’attaque de Pearl Harbor', 'la bataille de Stalingrad'], 0, "L'invasion de la Pologne provoque la déclaration de guerre de la France et du Royaume-Uni."),
          q('La conférence de Yalta (février 1945) prépare :', ['l’organisation du monde d’après-guerre', 'le débarquement de Normandie', 'le traité de Versailles'], 0, "Roosevelt, Churchill et Staline y définissent les zones d'influence et le principe d'une organisation internationale.")
        ],
        tp: { objectifs: ['Caractériser un régime totalitaire', 'Analyser les étapes du conflit'],
          exercices: ['1. Relever quatre caractéristiques communes aux régimes totalitaires.',
            '2. Expliquer le rôle de la politique d’apaisement dans le déclenchement de la guerre.',
            '3. Établir le bilan humain, matériel et politique du conflit.'],
          corrige: ['1. Parti unique, idéologie officielle, culte du chef, police politique et terreur, propagande et encadrement de la jeunesse.',
            "2. Les concessions successives (Rhénanie, Anschluss, Munich) ont convaincu Hitler de l'absence de réaction des démocraties.",
            '3. Environ 50 millions de morts dont une majorité de civils, l’Europe ruinée, l’émergence des deux superpuissances et la création de l’ONU.'] } },

      { titre: 'Le Maroc sous le protectorat', duree: 37, difficulte: 'Moyen',
        accroche: "1912-1956 : mise en place, exploitation coloniale et résistances.",
        notions: ['Traité de Fès', 'Politique de Lyautey', 'Exploitation économique', 'Résistance armée'],
        seances: [['Les causes de la pénétration coloniale', 9], ['Le traité de Fès et l’organisation du protectorat', 10], ['L’exploitation économique et la société duale', 10], ['La résistance armée : Rif, Atlas, Sud', 8]],
        resume: {
          points: ["La faiblesse financière et militaire du Maroc au XIXᵉ siècle prépare la pénétration européenne.",
            "Le traité de Fès (30 mars 1912) instaure le protectorat français ; l'Espagne contrôle le Nord et le Sud.",
            "Lyautey pratique une administration indirecte : il maintient les institutions makhzéniennes en apparence.",
            "La résistance armée est menée notamment par Abdelkrim el-Khattabi dans le Rif et Moha ou Hammou Zayani dans l'Atlas."],
          formules: ['30 mars 1912 : traité de Fès', '1921-1926 : guerre du Rif', '16 mai 1930 : dahir berbère', 'Casablanca : capitale économique coloniale'],
          pieges: ["Le protectorat n'est pas une colonie de peuplement au sens juridique : le sultan reste formellement souverain.",
            "Le dahir berbère de 1930 est un texte juridique, non une mesure économique.",
            "Ne pas confondre zone française et zone espagnole, aux logiques différentes."]
        },
        qcm: [
          q('Le traité instaurant le protectorat français au Maroc est signé en :', ['1912', '1907', '1930'], 0, "Le traité de Fès est signé le 30 mars 1912 par le sultan Moulay Hafid."),
          q('Le dahir berbère date de :', ['1930', '1912', '1944'], 0, "Promulgué le 16 mai 1930, il visait à soumettre les régions berbères à un droit coutumier distinct."),
          q('La politique coloniale de Lyautey reposait sur :', ['une administration indirecte respectant les institutions en apparence', 'une colonisation de peuplement exclusive', 'l’assimilation juridique totale'], 0, "Lyautey conserve la façade du Makhzen tout en concentrant le pouvoir réel entre les mains du résident général.")
        ],
        tp: { objectifs: ['Analyser un texte juridique colonial', 'Caractériser l’exploitation économique'],
          exercices: ['1. Expliquer les causes internes et externes de la mise en place du protectorat.',
            '2. Montrer, par trois exemples, le caractère inégalitaire de l’économie coloniale.',
            '3. Présenter une figure de la résistance armée marocaine.'],
          corrige: ['1. Causes internes : crise financière, endettement, révoltes tribales. Causes externes : rivalités européennes réglées par les accords de 1904 et la conférence d’Algésiras (1906).',
            '2. Accaparement des terres fertiles, mines exploitées au profit de la métropole, infrastructures orientées vers les ports d’exportation, société duale (villes nouvelles / médinas).',
            '3. Abdelkrim el-Khattabi organise dans le Rif une résistance moderne et remporte la bataille d’Anoual (1921) avant de capituler en 1926.'] } },

      { titre: 'Le mouvement national et l’indépendance du Maroc', duree: 38, difficulte: 'Moyen',
        accroche: "Du réformisme au Manifeste de l'Indépendance, jusqu'au retour du sultan.",
        notions: ['Naissance du mouvement national', 'Manifeste de l’Indépendance', 'Exil de Mohammed V', 'Indépendance'],
        seances: [['La naissance du mouvement national', 10], ['Du réformisme à la revendication d’indépendance', 10], ['L’exil de Mohammed V et la révolution du Roi et du Peuple', 9], ['La marche vers l’indépendance', 9]],
        resume: {
          points: ["Le dahir berbère de 1930 provoque une mobilisation nationale et la naissance d'un mouvement organisé.",
            "Le Manifeste de l'Indépendance du 11 janvier 1944 marque le passage des réformes à la revendication d'indépendance.",
            "L'exil de Mohammed V le 20 août 1953 unifie le peuple autour du trône : c'est la révolution du Roi et du Peuple.",
            "Le retour du sultan (novembre 1955) est suivi de la proclamation de l'indépendance en mars 1956."],
          formules: ['16 mai 1930 : dahir berbère', '11 janvier 1944 : Manifeste de l’Indépendance', '20 août 1953 : exil de Mohammed V', '2 mars 1956 : indépendance'],
          pieges: ["Le Manifeste date de 1944, pas de 1947 (discours de Tanger).",
            "L'indépendance est proclamée en 1956, mais le retour du sultan a lieu en novembre 1955.",
            "Le mouvement national commence par des revendications réformistes, non indépendantistes."]
        },
        qcm: [
          q('Le Manifeste de l’Indépendance est présenté le :', ['11 janvier 1944', '18 novembre 1955', '2 mars 1956'], 0, "Ce texte réclame explicitement l'indépendance et l'instauration d'une monarchie constitutionnelle."),
          q('Le sultan Mohammed V est exilé en :', ['1953', '1944', '1956'], 0, "Déposé et exilé le 20 août 1953, il devient le symbole de la résistance nationale."),
          q('L’indépendance du Maroc est proclamée en :', ['1956', '1955', '1961'], 0, "La déclaration commune franco-marocaine du 2 mars 1956 met fin au protectorat.")
        ],
        tp: { objectifs: ['Construire une chronologie argumentée', 'Analyser un texte politique'],
          exercices: ['1. Expliquer en quoi le dahir berbère a été un catalyseur du mouvement national.',
            '2. Comparer les revendications d’avant 1944 et celles du Manifeste.',
            '3. Expliquer l’expression « révolution du Roi et du Peuple ».'],
          corrige: ["1. En prétendant séparer juridiquement Arabes et Berbères, il a été perçu comme une atteinte à l'unité nationale et religieuse : il provoque la mobilisation, notamment par la lecture du Latif.",
            '2. Avant 1944, on demande des réformes dans le cadre du protectorat ; le Manifeste réclame l’indépendance complète et une monarchie constitutionnelle.',
            "3. L'exil du sultan soude la nation autour du trône : la lutte pour son retour et celle pour l'indépendance deviennent une seule et même cause."] } }
    ]
  });

  /* ============================== GÉOGRAPHIE ============================= */
  M.push({
    id: 'geographie', nom: 'Géographie', court: 'Géo', prof: 'Mme Berrada',
    coef: 2, teinte: '#1d7fa6', teinte2: '#2e9e4f', glyphe: '🌍',
    labelFormules: 'Repères et notions',
    chapitres: [
      { titre: 'L’Union européenne : une puissance économique mondiale', duree: 33, difficulte: 'Facile',
        accroche: "Une construction politique originale devenue l'une des premières puissances commerciales.",
        notions: ['Construction européenne', 'Marché unique', 'Politiques communes', 'Disparités régionales'],
        seances: [['Les étapes de la construction européenne', 9], ['Les fondements de la puissance', 9], ['Les politiques communes (PAC, régionale)', 8], ['Les défis et limites', 7]],
        resume: {
          points: ["De la CECA (1951) au traité de Maastricht (1992), la construction européenne s'est faite par élargissements et approfondissements successifs.",
            "Le marché unique assure la libre circulation des biens, des services, des capitaux et des personnes.",
            "L'UE est la première puissance commerciale mondiale, avec un rôle majeur dans l'agriculture et l'industrie de haute technologie.",
            "Ses limites : disparités régionales, déficit démocratique perçu, dépendance énergétique."],
          formules: ['1951 : CECA — 1957 : traité de Rome', '1992 : traité de Maastricht', '2002 : mise en circulation de l’euro', 'PAC : politique agricole commune'],
          pieges: ["Tous les États membres n'ont pas adopté l'euro : zone euro ≠ Union européenne.",
            "Ne pas confondre Conseil de l'Europe (institution distincte) et Conseil européen.",
            "L'UE est une puissance économique majeure, mais sa puissance militaire reste limitée."]
        },
        qcm: [
          q('L’Union européenne, sous son nom actuel, naît du traité de :', ['Maastricht (1992)', 'Versailles', 'Yalta'], 0, "Le traité de Maastricht transforme la CEE en Union européenne et prépare la monnaie unique."),
          q('La PAC désigne :', ['la politique agricole commune', 'un port de l’Atlantique', 'une devise européenne'], 0, "Créée en 1962, elle soutient les revenus agricoles et a longtemps représenté le premier poste budgétaire de l'UE."),
          q('Un défi majeur de l’UE est :', ['les disparités de richesse entre régions et États membres', 'l’absence de monnaie commune', 'le manque total d’industries'], 0, "Le PIB par habitant varie fortement entre l'Europe du Nord-Ouest et les périphéries orientales et méridionales.")
        ],
        tp: { objectifs: ['Lire une carte de disparités régionales', 'Argumenter sur une puissance économique'],
          exercices: ['1. Citer trois étapes majeures de la construction européenne et les dater.',
            '2. Relever trois fondements de la puissance économique de l’UE.',
            '3. Expliquer le rôle de la politique régionale européenne.'],
          corrige: ['1. CECA 1951, traité de Rome 1957, traité de Maastricht 1992 (et euro en 2002).',
            '2. Marché unique de plus de 400 millions de consommateurs, agriculture performante soutenue par la PAC, industries de haute technologie et premier rang du commerce mondial.',
            "3. Les fonds structurels transfèrent des ressources vers les régions les moins développées afin de réduire les écarts et de renforcer la cohésion."] } },

      { titre: 'Les États-Unis : une puissance mondiale', duree: 35, difficulte: 'Moyen',
        accroche: "Les fondements et les limites d'une hyperpuissance économique, militaire et culturelle.",
        notions: ['Fondements de la puissance', 'Organisation du territoire', 'Soft power', 'Limites'],
        seances: [['Les fondements de la puissance américaine', 10], ['L’organisation du territoire', 9], ['Le rayonnement mondial et le soft power', 8], ['Les limites et fragilités', 8]],
        resume: {
          points: ["La puissance américaine repose sur un vaste territoire richement doté, une économie innovante et une monnaie de référence.",
            "La Mégalopolis du Nord-Est concentre les fonctions de commandement, de Boston à Washington.",
            "La Sun Belt, au sud et à l'ouest, connaît le dynamisme démographique et technologique le plus fort.",
            "Les limites : inégalités sociales, dépendance énergétique, contestation du leadership par la Chine."],
          formules: ['Mégalopolis : Boston–Washington', 'Sun Belt : Sud et Ouest dynamiques', 'Manufacturing Belt : ancien cœur industriel', 'Soft power : culture, universités, médias'],
          pieges: ["Ne pas confondre Mégalopolis (Nord-Est) et Sun Belt (Sud et Ouest).",
            "Le soft power est une puissance d'influence, distincte de la puissance militaire.",
            "La première puissance économique n'est pas exempte de fortes inégalités internes."]
        },
        qcm: [
          q('La Mégalopolis américaine s’étend de :', ['Boston à Washington', 'Los Angeles à Seattle', 'Miami à Chicago'], 0, "Cet axe urbain du Nord-Est concentre population, capitaux et centres de décision."),
          q('Le soft power américain désigne :', ['la capacité d’influence par la culture et les valeurs', 'la puissance militaire', 'la production agricole'], 0, "Cinéma, universités, marques et médias diffusent un modèle culturel à l'échelle mondiale."),
          q('La Sun Belt correspond :', ['aux États dynamiques du Sud et de l’Ouest', 'à la région des Grands Lacs', 'au Nord-Est industriel ancien'], 0, "Attractive par son climat et ses technopôles, elle capte migrations internes et investissements.")
        ],
        tp: { objectifs: ['Organiser une argumentation géographique', 'Lire une carte de l’organisation du territoire'],
          exercices: ['1. Relever quatre fondements de la puissance américaine.',
            '2. Opposer Manufacturing Belt et Sun Belt.',
            '3. Citer deux limites actuelles de cette puissance.'],
          corrige: ['1. Territoire vaste et bien doté en ressources, population nombreuse et qualifiée, recherche et innovation, rôle du dollar et des firmes transnationales.',
            "2. La Manufacturing Belt est l'ancien cœur industriel en reconversion difficile ; la Sun Belt combine croissance démographique, hautes technologies et attractivité climatique.",
            '3. Fortes inégalités sociales et raciales, endettement et concurrence croissante de la Chine.'] } },

      { titre: 'La Chine : une puissance émergente', duree: 34, difficulte: 'Moyen',
        accroche: "Quarante ans d'ouverture qui ont fait de la Chine l'atelier puis un centre du monde.",
        notions: ['Réformes de 1978', 'Zones économiques spéciales', 'Littoralisation', 'Défis'],
        seances: [['Les réformes et l’ouverture', 9], ['Les ZES et la littoralisation', 9], ['L’insertion dans la mondialisation', 9], ['Les défis : inégalités et environnement', 7]],
        resume: {
          points: ["Les réformes lancées par Deng Xiaoping en 1978 ouvrent l'économie chinoise aux capitaux étrangers.",
            "Les zones économiques spéciales du littoral attirent les investissements et concentrent l'industrie exportatrice.",
            "La littoralisation crée un fort déséquilibre entre les provinces côtières et l'intérieur du pays.",
            "Les défis sont l'environnement, le vieillissement démographique et les inégalités sociales."],
          formules: ['1978 : réformes de Deng Xiaoping', 'ZES : Shenzhen, Zhuhai, Shantou, Xiamen', '2001 : entrée à l’OMC', 'Littoralisation de l’économie'],
          pieges: ["L'ouverture est économique et non politique : le parti unique reste au pouvoir.",
            "La Chine reste un pays émergent malgré son rang économique : le PIB par habitant demeure modéré.",
            "Ne pas confondre ZES (zones économiques spéciales) et régions administratives spéciales (Hong Kong, Macao)."]
        },
        qcm: [
          q('L’ouverture économique de la Chine a été lancée par :', ['Deng Xiaoping en 1978', 'Mao Zedong en 1949', 'Xi Jinping en 2013'], 0, "Deng Xiaoping engage les « quatre modernisations » et l'ouverture aux investissements étrangers."),
          q('Les ZES chinoises sont :', ['des zones économiques spéciales ouvertes aux investissements étrangers', 'des zones agricoles protégées', 'des réserves naturelles'], 0, "Créées sur le littoral dès 1980, elles offrent des avantages fiscaux et douaniers aux entreprises étrangères."),
          q('Un défi majeur de la puissance chinoise est :', ['les inégalités littoral / intérieur et la pollution', 'le manque de main-d’œuvre', 'l’absence de débouchés commerciaux'], 0, "La croissance très rapide a creusé les écarts régionaux et engendré une dégradation environnementale majeure.")
        ],
        tp: { objectifs: ['Expliquer une trajectoire de développement', 'Lire un croquis de littoralisation'],
          exercices: ['1. Expliquer le rôle des ZES dans l’essor économique chinois.',
            '2. Décrire le déséquilibre spatial de l’économie chinoise.',
            '3. Citer trois limites du modèle chinois.'],
          corrige: ['1. Elles attirent capitaux et technologies étrangers grâce aux exonérations, aux infrastructures portuaires et à une main-d’œuvre abondante et bon marché.',
            "2. Les provinces littorales concentrent industries, ports et villes millionnaires, tandis que l'intérieur reste rural et moins équipé, ce qui alimente d'importantes migrations internes.",
            '3. Pollution atmosphérique et hydrique, vieillissement démographique, dépendance aux exportations et tensions sociales.'] } },

      { titre: 'Le Brésil : les défis du développement', duree: 32, difficulte: 'Facile',
        accroche: "Un géant agricole et industriel confronté à des inégalités et à un dilemme environnemental.",
        notions: ['Atouts naturels', 'Puissance agricole', 'Inégalités sociales', 'Question amazonienne'],
        seances: [['Les atouts d’un géant', 9], ['Une puissance agricole et industrielle', 8], ['Des inégalités persistantes', 8], ['L’Amazonie et le développement durable', 7]],
        resume: {
          points: ["Le Brésil dispose d'un territoire immense, de ressources abondantes et d'une agriculture très compétitive.",
            "L'industrialisation s'est concentrée dans le Sud-Est, autour de São Paulo et Rio de Janeiro.",
            "Les inégalités sociales et spatiales restent fortes : favelas, Nordeste en retard de développement.",
            "L'Amazonie pose la question de la conciliation entre développement économique et préservation environnementale."],
          formules: ['Sud-Est : cœur économique (São Paulo)', 'Nordeste : région la plus pauvre', 'Favelas : marginalisation urbaine', 'BRICS : pays émergents'],
          pieges: ["Le Brésil est une puissance émergente, pas un pays développé.",
            "La déforestation amazonienne n'est pas seulement agricole : élevage, mines et infrastructures y contribuent.",
            "Ne pas confondre exode rural et croissance naturelle dans l'explication de l'urbanisation."]
        },
        qcm: [
          q('Le Brésil est un pays :', ['émergent, marqué par de fortes inégalités sociales', 'développé et très égalitaire', 'sans ressources naturelles'], 0, "Puissance agricole et industrielle de premier plan, il conserve un indice d'inégalité parmi les plus élevés au monde."),
          q('Les favelas illustrent :', ['la marginalisation urbaine', 'la réussite industrielle du pays', 'la protection de l’environnement'], 0, "Quartiers d'habitat précaire nés de l'exode rural, elles concentrent pauvreté et sous-équipement."),
          q('L’Amazonie pose principalement le problème :', ['de la déforestation et du développement durable', 'du manque d’eau douce', 'de la désertification'], 0, "L'avancée du front pionnier oppose intérêts économiques immédiats et préservation d'un écosystème mondial.")
        ],
        tp: { objectifs: ['Analyser des inégalités territoriales', 'Argumenter sur le développement durable'],
          exercices: ['1. Opposer le Sud-Est et le Nordeste brésiliens.',
            '2. Expliquer les causes de la déforestation amazonienne.',
            '3. Proposer deux pistes de développement durable pour l’Amazonie.'],
          corrige: ['1. Le Sud-Est concentre industries, services et richesse ; le Nordeste, plus rural et frappé par la sécheresse, connaît les plus faibles revenus et alimente les migrations internes.',
            '2. Élevage extensif, culture du soja, exploitation forestière et minière, construction de routes ouvrant de nouveaux fronts pionniers.',
            '3. Aires protégées et reconnaissance des terres indigènes, valorisation de filières durables (agroforesterie, écotourisme) et contrôle satellitaire de la déforestation.'] } },

      { titre: 'La mondialisation : acteurs et enjeux', duree: 36, difficulte: 'Moyen',
        accroche: "Un monde d'échanges intensifiés, mais une intégration très inégale des territoires.",
        notions: ['Acteurs de la mondialisation', 'Flux mondiaux', 'Territoires intégrés et marginalisés', 'Contestations'],
        seances: [['Définition et acteurs', 9], ['Les flux et les réseaux', 10], ['Des territoires inégalement intégrés', 9], ['Débats et contestations', 8]],
        resume: {
          points: ["Les principaux acteurs sont les firmes transnationales, les États, les organisations internationales et les ONG.",
            "Les flux de marchandises, de capitaux, d'informations et de personnes structurent l'espace mondial.",
            "Les territoires sont inégalement intégrés : métropoles mondiales d'un côté, espaces marginalisés de l'autre.",
            "La mondialisation suscite des contestations : creusement des inégalités, uniformisation culturelle, coût environnemental."],
          formules: ['FTN : firmes transnationales', 'OMC : régulation du commerce mondial', 'DIT : division internationale du travail', 'Métropolisation et littoralisation'],
          pieges: ["Mondialisation n'est pas synonyme d'uniformisation : les territoires réagissent différemment.",
            "L'OMC régule les échanges ; c'est le FMI qui prête aux États.",
            "Ne pas confondre délocalisation (déplacement d'une activité) et externalisation (sous-traitance)."]
        },
        qcm: [
          q('Les FTN sont :', ['des firmes transnationales', 'des organisations non gouvernementales', 'des fonds monétaires internationaux'], 0, "Ces entreprises implantées dans plusieurs pays organisent la division internationale du travail."),
          q('L’OMC a pour rôle :', ['de réguler le commerce mondial', 'de prêter de l’argent aux États en crise', 'de fixer les prix agricoles mondiaux'], 0, "Elle établit les règles des échanges et arbitre les différends commerciaux ; le prêt aux États relève du FMI."),
          q('La mondialisation se caractérise par :', ['une intégration inégale des territoires', 'une égalité parfaite entre les pays', 'la disparition des échanges régionaux'], 0, "Métropoles et façades maritimes concentrent les flux, tandis que d'autres espaces restent à l'écart.")
        ],
        tp: { objectifs: ['Identifier les acteurs et les flux', 'Nuancer un jugement sur la mondialisation'],
          exercices: ['1. Classer les acteurs de la mondialisation et préciser leur rôle.',
            '2. Expliquer la notion de division internationale du travail.',
            '3. Présenter deux arguments pour et deux arguments contre la mondialisation.'],
          corrige: ['1. FTN (organisation de la production), États (règles et infrastructures), organisations internationales (OMC, FMI), ONG et sociétés civiles (contre-pouvoir).',
            "2. Chaque étape de la production est localisée là où elle est la plus rentable : conception dans les pays du Nord, fabrication dans les pays à bas coûts.",
            '3. Pour : croissance des échanges, diffusion des innovations. Contre : creusement des inégalités, coût environnemental des transports et fragilisation des économies locales.'] } }
    ]
  });

  /* ============================= PHILOSOPHIE ============================= */
  M.push({
    id: 'philo', nom: 'Philosophie', court: 'Philo', prof: 'M. Lahlou',
    coef: 2, teinte: '#6b5bd2', teinte2: '#3b4a8a', glyphe: '🕯',
    labelFormules: 'Références et citations',
    chapitres: [
      { titre: 'La personne humaine', duree: 40, difficulte: 'Moyen',
        accroche: "Qu'est-ce qui fait qu'un être humain est une personne, et non une chose ?",
        notions: ['Personne et chose', 'Conscience et identité', 'Dignité', 'L’inconscient'],
        seances: [['Personne, chose, sujet : les distinctions', 11], ['Conscience et identité personnelle', 11], ['La dignité de la personne (Kant)', 9], ['L’inconscient et les limites de la conscience', 9]],
        resume: {
          points: ["La personne se distingue de la chose : elle a une valeur (dignité) et non un prix.",
            "Descartes fonde l'identité personnelle sur la conscience de soi : « je pense, donc je suis ».",
            "Kant énonce que la personne doit toujours être traitée comme une fin, jamais simplement comme un moyen.",
            "Freud conteste la transparence du sujet à lui-même : l'inconscient limite la maîtrise de soi."],
          formules: ['Descartes : « Je pense, donc je suis »', 'Kant : la personne a une dignité, non un prix', 'Locke : l’identité repose sur la mémoire', 'Freud : le moi n’est pas maître dans sa propre maison'],
          pieges: ["Ne pas confondre individu (unité biologique), personne (sujet moral) et personnalité (traits psychologiques).",
            "La thèse freudienne ne nie pas la conscience : elle en conteste la souveraineté.",
            "Une dissertation exige une problématique, non un simple exposé de doctrines."]
        },
        qcm: [
          q('Pour Kant, la personne humaine doit être traitée :', ['toujours comme une fin et jamais simplement comme un moyen', 'comme un moyen au service de la société', 'comme une chose parmi les choses'], 0, "C'est la deuxième formulation de l'impératif catégorique, fondement de la dignité."),
          q('Descartes fonde l’identité personnelle sur :', ['la conscience et la pensée', 'le corps et ses transformations', 'la mémoire collective'], 0, "Le cogito établit que l'existence du sujet est certaine dès lors qu'il pense."),
          q('Selon Freud, le sujet n’est pas transparent à lui-même à cause :', ['de l’inconscient', 'de la raison', 'du langage'], 0, "L'hypothèse de l'inconscient décentre le sujet : une part de sa vie psychique lui échappe.")
        ],
        tp: { objectifs: ['Distinguer des notions voisines', 'Construire un plan de dissertation'],
          exercices: ['1. Distinguer personne, individu et chose.',
            '2. Expliquer l’expression kantienne : « la personne a une dignité, non un prix ».',
            '3. Proposer un plan en trois parties pour : « Suis-je ce que j’ai conscience d’être ? »'],
          corrige: ["1. L'individu désigne une unité numérique, la chose un objet disponible, la personne un sujet moral doté de conscience et de responsabilité.",
            "2. Ce qui a un prix peut être échangé contre un équivalent ; la dignité désigne au contraire une valeur absolue, sans équivalent, qui interdit l'instrumentalisation.",
            "3. I. La conscience semble fonder mon identité (Descartes). II. Mais l'inconscient et le regard d'autrui la limitent (Freud, Sartre). III. Le sujet se construit alors dans le temps et la relation (Ricœur)."] } },

      { titre: 'Autrui', duree: 38, difficulte: 'Moyen',
        accroche: "L'autre est-il un obstacle à ma liberté ou la condition de mon humanité ?",
        notions: ['Autrui comme alter ego', 'Le conflit des consciences', 'L’amitié', 'L’exigence éthique'],
        seances: [['Autrui : semblable et différent', 10], ['Le conflit : Hegel et Sartre', 11], ['L’amitié et la reconnaissance', 9], ['Le visage et l’exigence éthique (Levinas)', 8]],
        resume: {
          points: ["Autrui est à la fois un autre moi-même (alter ego) et radicalement autre, inaccessible dans son intériorité.",
            "Hegel décrit la lutte des consciences pour la reconnaissance ; Sartre analyse le regard qui me chosifie.",
            "Aristote distingue trois amitiés : par intérêt, par plaisir, et par vertu — seule la dernière est parfaite.",
            "Pour Levinas, le visage d'autrui m'oblige avant tout choix : l'éthique précède l'ontologie."],
          formules: ['Aristote : amitié utile, agréable, vertueuse', 'Hegel : dialectique du maître et de l’esclave', 'Sartre : « autrui, c’est le regard »', 'Levinas : le visage m’oblige'],
          pieges: ["Ne pas réduire autrui à un objet de connaissance : il est d'abord un sujet.",
            "Le conflit sartrien n'exclut pas la relation : il en décrit une modalité.",
            "Éviter le hors-sujet psychologique : la question est philosophique, non sentimentale."]
        },
        qcm: [
          q('Pour Sartre, autrui est d’abord :', ['celui par qui je me découvre objet, à travers son regard', 'un ami naturel', 'une simple abstraction'], 0, "Le regard d'autrui me fige en objet : « autrui est le médiateur indispensable entre moi et moi-même »."),
          q('Chez Aristote, l’amitié parfaite se fonde sur :', ['la vertu', 'l’utilité réciproque', 'le seul plaisir'], 0, "Seule l'amitié vertueuse est durable, car elle vise le bien de l'autre pour lui-même."),
          q('Pour Levinas, le visage d’autrui :', ['m’oblige éthiquement', 'm’est indifférent', 'doit être maîtrisé par la connaissance'], 0, "Le visage exprime une vulnérabilité qui commande : « tu ne tueras point ».")
        ],
        tp: { objectifs: ['Confronter des thèses', 'Rédiger un paragraphe argumenté'],
          exercices: ['1. Opposer la conception sartrienne et la conception levinassienne d’autrui.',
            '2. Expliquer la dialectique hégélienne du maître et de l’esclave.',
            '3. Rédiger un paragraphe : autrui est-il nécessaire pour me connaître ?'],
          corrige: ["1. Chez Sartre, le regard d'autrui aliène et chosifie ; chez Levinas, le visage appelle la responsabilité : le conflit cède la place à l'obligation éthique.",
            "2. Deux consciences s'affrontent pour être reconnues ; celle qui préfère la vie à la liberté devient esclave, mais par le travail elle transforme le monde et accède à une reconnaissance véritable.",
            "3. Sans le regard d'autrui, la conscience de soi resterait indéterminée : c'est en me voyant vu que je me découvre comme être situé, jugé, donc identifiable."] } },

      { titre: 'L’histoire', duree: 36, difficulte: 'Moyen',
        accroche: "L'histoire a-t-elle un sens, ou n'est-elle qu'une suite d'événements contingents ?",
        notions: ['Histoire et historicité', 'Sens de l’histoire', 'Méthode historique', 'Progrès'],
        seances: [['Distinguer le passé, l’histoire, l’historicité', 9], ['Les philosophies de l’histoire (Hegel, Marx)', 10], ['La méthode de l’historien', 9], ['Y a-t-il un progrès historique ?', 8]],
        resume: {
          points: ["L'histoire désigne à la fois le passé lui-même et le récit critique qu'on en construit.",
            "Hegel voit dans l'histoire le déploiement rationnel de l'Esprit ; Marx en fait le produit de la lutte des classes.",
            "L'historien construit un savoir à partir de documents critiqués, ce qui le distingue du témoin et du mémorialiste.",
            "L'idée de progrès historique est contestée par les catastrophes du XXᵉ siècle."],
          formules: ['Hegel : « la raison gouverne le monde »', 'Marx : la lutte des classes, moteur de l’histoire', 'Distinguer mémoire et histoire', 'Objectivité : un idéal régulateur'],
          pieges: ["Ne pas confondre mémoire (vécue, sélective) et histoire (construite, critique).",
            "L'objectivité historique n'est pas la neutralité absolue, mais la méthode et la vérifiabilité.",
            "Une philosophie de l'histoire n'est pas un récit historique."]
        },
        qcm: [
          q('Pour Hegel, l’histoire est :', ['le déploiement rationnel de l’Esprit', 'une suite de hasards sans logique', 'un simple mythe'], 0, "L'histoire universelle est pour Hegel le progrès de la conscience de la liberté."),
          q('Pour Marx, le moteur de l’histoire est :', ['la lutte des classes', 'la volonté des grands hommes', 'la Providence divine'], 0, "Les rapports de production et les conflits qu'ils engendrent expliquent les transformations sociales."),
          q('L’historien se distingue du témoin parce qu’il :', ['construit un savoir critique à partir de documents', 'raconte uniquement ce qu’il a vécu', 'invente librement le passé'], 0, "La critique des sources et la confrontation des documents fondent la démarche historique.")
        ],
        tp: { objectifs: ['Distinguer mémoire et histoire', 'Discuter l’idée de progrès'],
          exercices: ['1. Distinguer mémoire et histoire à l’aide de deux critères.',
            '2. Expliquer en quoi la méthode historique vise l’objectivité.',
            '3. Peut-on parler d’un progrès de l’histoire ? Proposer une thèse et une objection.'],
          corrige: ['1. La mémoire est vécue, affective et sélective ; l’histoire est construite, méthodique et soumise à la critique des sources.',
            "2. L'historien confronte des documents d'origines diverses, expose ses sources et soumet ses conclusions à la discussion : l'objectivité est un idéal régulateur.",
            "3. Thèse : le progrès des droits et des savoirs est mesurable. Objection : les catastrophes du XXᵉ siècle montrent que le progrès technique n'entraîne pas le progrès moral."] } },

      { titre: 'La vérité', duree: 39, difficulte: 'Difficile',
        accroche: "Existe-t-il des vérités absolues, ou toute vérité est-elle relative ?",
        notions: ['Vérité et réalité', 'Critères de vérité', 'Relativisme', 'Vérité et certitude'],
        seances: [['Vérité, réalité, opinion', 10], ['Les critères : évidence et cohérence', 11], ['Le relativisme et ses limites', 9], ['Vérité et vérification scientifique', 9]],
        resume: {
          points: ["La vérité qualifie un jugement, non une chose : elle est l'accord de la pensée avec son objet.",
            "Descartes retient l'évidence claire et distincte comme critère ; d'autres privilégient la cohérence ou l'utilité.",
            "Le relativisme soutient que toute vérité dépend du sujet ou de la culture, mais se réfute lui-même s'il se veut absolu.",
            "La certitude est un état subjectif : on peut être certain et se tromper."],
          formules: ['Vérité : adéquation de la pensée et de son objet', 'Descartes : l’évidence claire et distincte', 'Protagoras : « l’homme est la mesure de toute chose »', 'Distinguer vérité et certitude'],
          pieges: ["Ne pas confondre le vrai (jugement) et le réel (ce qui est).",
            "Le relativisme absolu est contradictoire : il prétend énoncer une vérité universelle.",
            "Certitude subjective ≠ vérité objective."]
        },
        qcm: [
          q('La vérité se dit proprement :', ['d’un jugement ou d’une proposition', 'd’une chose ou d’un objet', 'd’une émotion'], 0, "Une chose est réelle ; c'est le discours qui la décrit qui peut être vrai ou faux."),
          q('Pour Descartes, le critère de la vérité est :', ['l’évidence claire et distincte', 'l’opinion du plus grand nombre', 'la tradition'], 0, "Ne recevoir pour vrai que ce qui se présente si clairement à l'esprit qu'on ne puisse en douter : c'est la première règle de la méthode."),
          q('Le relativisme soutient que :', ['toute vérité est relative au sujet ou à la culture', 'la vérité est absolue et universelle', 'rien n’existe réellement'], 0, "Position illustrée par Protagoras ; elle se heurte à l'objection de l'autoréfutation.")
        ],
        tp: { objectifs: ['Distinguer des notions voisines', 'Construire une objection argumentée'],
          exercices: ['1. Distinguer vérité, réalité et certitude.',
            '2. Formuler l’objection classique adressée au relativisme.',
            '3. Expliquer pourquoi une théorie scientifique n’est jamais définitivement vraie.'],
          corrige: ['1. Le réel est ce qui existe, la vérité une propriété du jugement qui le décrit, la certitude un état subjectif d’adhésion.',
            "2. Si toute vérité est relative, alors l'énoncé « toute vérité est relative » l'est aussi : la thèse se détruit elle-même.",
            "3. Elle reste une hypothèse confirmée mais réfutable : selon Popper, la science progresse par réfutation et non par vérification définitive."] } },

      { titre: 'La théorie et l’expérience', duree: 37, difficulte: 'Difficile',
        accroche: "La science part-elle des faits, ou les faits ne parlent-ils que sous une théorie ?",
        notions: ['Fait et expérience', 'Méthode expérimentale', 'Hypothèse', 'Falsifiabilité'],
        seances: [['Observer n’est pas voir : le fait scientifique', 10], ['La méthode expérimentale (Claude Bernard)', 10], ['Le rôle de l’hypothèse et de la théorie', 9], ['Popper et la falsifiabilité', 8]],
        resume: {
          points: ["Un fait scientifique n'est jamais brut : il est construit à partir d'un cadre théorique.",
            "Claude Bernard formalise la méthode expérimentale : observation, hypothèse, expérimentation, conclusion.",
            "L'hypothèse guide l'expérience ; sans elle, l'observation resterait aveugle.",
            "Pour Popper, une théorie n'est scientifique que si elle est falsifiable, c'est-à-dire réfutable par l'expérience."],
          formules: ['Bachelard : le fait scientifique est construit', 'Claude Bernard : observation – hypothèse – expérimentation', 'Popper : critère de falsifiabilité', 'Distinguer vérification et corroboration'],
          pieges: ["L'empirisme naïf suppose que les faits parlent d'eux-mêmes : c'est ce que critiquent Bachelard et Popper.",
            "Falsifiable ne signifie pas faux : cela signifie réfutable en droit par l'expérience.",
            "Une accumulation de confirmations ne prouve jamais définitivement une théorie."]
        },
        qcm: [
          q('Une hypothèse scientifique doit être :', ['testable et réfutable par l’expérience', 'indiscutable par principe', 'purement logique et sans lien avec les faits'], 0, "Une hypothèse qui ne pourrait jamais être contredite n'apporterait aucune information sur le monde."),
          q('Pour Claude Bernard, la méthode expérimentale suit l’ordre :', ['observation – hypothèse – expérimentation', 'intuition seule', 'déduction seule'], 0, "L'observation suscite une idée, l'expérimentation la met à l'épreuve, le raisonnement conclut."),
          q('Selon Popper, ce qui distingue une théorie scientifique est :', ['sa falsifiabilité', 'sa vérification définitive', 'le consensus des savants'], 0, "Une théorie scientifique doit interdire certains faits : si ces faits survenaient, elle serait réfutée.")
        ],
        tp: { objectifs: ['Analyser la démarche scientifique', 'Appliquer le critère de falsifiabilité'],
          exercices: ['1. Expliquer pourquoi « observer » suppose déjà une théorie.',
            '2. Détailler les étapes de la méthode expérimentale sur un exemple.',
            '3. Expliquer pourquoi une théorie irréfutable n’est pas plus scientifique, mais moins.'],
          corrige: ["1. Sans cadre théorique, on ne saurait pas quoi regarder ni quoi retenir : la théorie sélectionne les faits pertinents et fixe les instruments de mesure.",
            "2. Observation d'un phénomène → formulation d'une hypothèse explicative → expérience avec groupe témoin → conclusion, confirmée ou infirmée.",
            "3. Une théorie compatible avec tous les faits possibles n'interdit rien et n'apporte aucune information : elle échappe au contrôle de l'expérience."] } },

      { titre: 'La politique et l’État', duree: 41, difficulte: 'Moyen',
        accroche: "Pourquoi obéir ? Fondement, légitimité et limites du pouvoir politique.",
        notions: ['État de nature', 'Contrat social', 'Souveraineté', 'Légitimité et légalité'],
        seances: [['L’état de nature : Hobbes, Locke, Rousseau', 12], ['Le contrat social et la souveraineté', 11], ['Légitimité, légalité, obéissance', 10], ['Machiavel et le réalisme politique', 8]],
        resume: {
          points: ["Pour Hobbes, l'état de nature est une guerre de tous contre tous : le contrat institue un souverain absolu.",
            "Pour Rousseau, la souveraineté appartient au peuple et s'exprime par la volonté générale.",
            "La légalité désigne la conformité à la loi ; la légitimité, la reconnaissance de sa justice.",
            "Machiavel sépare l'analyse politique de la morale : il décrit la « vérité effective » du pouvoir."],
          formules: ['Hobbes : « l’homme est un loup pour l’homme »', 'Rousseau : la volonté générale', 'Weber : l’État détient le monopole de la violence légitime', 'Machiavel : la vérité effective de la chose'],
          pieges: ["L'état de nature est une hypothèse théorique, non un fait historique.",
            "Volonté générale ≠ volonté de tous : elle vise l'intérêt commun, pas la somme des intérêts particuliers.",
            "Une loi peut être légale sans être légitime."]
        },
        qcm: [
          q('Pour Hobbes, l’État naît :', ['d’un contrat destiné à sortir de l’état de guerre', 'de la nature spontanément sociable de l’homme', 'd’une origine divine'], 0, "La crainte de la mort violente pousse les individus à renoncer à leur droit naturel au profit du souverain."),
          q('Pour Rousseau, la souveraineté appartient :', ['au peuple, par la volonté générale', 'au monarque de droit divin', 'aux experts les plus compétents'], 0, "La souveraineté est inaliénable et indivisible : elle ne peut être représentée sans être trahie."),
          q('Pour Machiavel, la politique doit être pensée :', ['selon la vérité effective et l’efficacité', 'selon la seule morale religieuse', 'comme le produit du hasard'], 0, "Il substitue à l'idéal du bon gouvernement l'analyse des moyens réels de conquérir et conserver le pouvoir.")
        ],
        tp: { objectifs: ['Comparer trois théories du contrat', 'Distinguer légalité et légitimité'],
          exercices: ['1. Comparer les états de nature de Hobbes, Locke et Rousseau.',
            '2. Distinguer légalité et légitimité, avec un exemple.',
            '3. La désobéissance civile peut-elle être justifiée ? Proposer un plan.'],
          corrige: ['1. Hobbes : guerre de tous contre tous. Locke : état pré-social relativement paisible mais sans juge impartial. Rousseau : innocence originelle corrompue par la société.',
            "2. Une loi votée selon les procédures est légale ; elle est légitime si elle est reconnue juste. Des lois ségrégationnistes furent légales et jugées illégitimes.",
            "3. I. Obéir est la condition de l'ordre. II. Mais une loi injuste peut contredire le fondement même de l'État. III. La désobéissance civile, publique et non violente, se réclame alors du droit contre la loi."] } }
    ]
  });

  /* ========================= ŒUVRES AU PROGRAMME ======================== */
  M.push({
    id: 'oeuvres', nom: 'Œuvres au programme', court: 'Œuvres', prof: 'Mme Fassi',
    coef: 3, teinte: '#b3396b', teinte2: '#6b2b8a', glyphe: '📖',
    labelFormules: 'Repères et citations',
    chapitres: [
      { titre: 'Antigone d’Anouilh : l’œuvre et son contexte', duree: 35, difficulte: 'Facile',
        accroche: "Une tragédie antique réécrite en 1944, sous l'Occupation.",
        notions: ['Contexte de création', 'Réécriture du mythe', 'Le Prologue', 'Structure de la pièce'],
        seances: [['Anouilh, le contexte de 1944', 9], ['Du mythe de Sophocle à la pièce d’Anouilh', 10], ['Le rôle du Prologue', 8], ['Structure et progression dramatique', 8]],
        resume: {
          points: ["Anouilh reprend le mythe grec de Sophocle et le transpose dans un décor moderne et dépouillé.",
            "La pièce est créée à Paris en 1944, sous l'Occupation : elle a été lue comme un texte à double sens.",
            "Le Prologue présente les personnages et annonce le dénouement : le suspense est aboli au profit de la fatalité.",
            "La pièce est écrite d'un seul tenant, sans division en actes, ce qui accentue la tension continue."],
          formules: ['1944 : création de la pièce', 'Source : l’Antigone de Sophocle', 'Le Prologue annonce le dénouement', 'Tragédie moderne en un seul mouvement'],
          pieges: ["Ne pas confondre l'Antigone de Sophocle et celle d'Anouilh : les personnages et le ton diffèrent.",
            "Le Prologue n'est pas un personnage de l'intrigue : il s'adresse au public.",
            "Le décor moderne ne fait pas de la pièce un drame réaliste : elle reste une tragédie."]
        },
        qcm: [
          q('Antigone de Jean Anouilh est créée en :', ['1944', '1922', '1960'], 0, "La pièce est représentée à Paris en février 1944, en pleine Occupation."),
          q('La pièce est inspirée :', ['de la tragédie de Sophocle', 'd’un roman de Victor Hugo', 'd’un conte traditionnel marocain'], 0, "Anouilh réécrit le mythe grec transmis notamment par l'Antigone de Sophocle."),
          q('Le Prologue a pour fonction :', ['de présenter les personnages et d’annoncer le dénouement', 'de créer le suspense', 'de faire rire le public'], 0, "En dévoilant l'issue dès le début, il installe la fatalité tragique plutôt que l'attente.")
        ],
        tp: { objectifs: ['Situer une œuvre dans son contexte', 'Analyser une fonction dramatique'],
          exercices: ['1. Expliquer en quoi le contexte de 1944 éclaire la réception de la pièce.',
            '2. Relever trois fonctions du Prologue.',
            '3. Comparer brièvement la pièce d’Anouilh et celle de Sophocle.'],
          corrige: ["1. Sous l'Occupation, le refus d'Antigone put être lu comme un éloge de la résistance, tandis que les arguments de Créon pouvaient sembler défendre l'ordre : cette ambiguïté explique que la pièce ait été jouée sans être censurée.",
            "2. Présenter les personnages, annoncer le dénouement, instaurer la distance tragique en rappelant qu'il s'agit d'une représentation.",
            "3. Anouilh conserve l'intrigue mais modernise le décor et le langage, humanise Créon et fait d'Antigone une révoltée plus qu'une figure religieuse."] } },

      { titre: 'Antigone : personnages, thèmes et tragique', duree: 38, difficulte: 'Moyen',
        accroche: "Le face-à-face d'Antigone et de Créon : deux logiques irréconciliables.",
        notions: ['Antigone et Créon', 'Ismène et Hémon', 'Le conflit tragique', 'Le refus'],
        seances: [['Antigone : figure du refus', 10], ['Créon : le pragmatisme du pouvoir', 10], ['Les personnages secondaires', 9], ['Les thèmes : bonheur, révolte, fatalité', 9]],
        resume: {
          points: ["Antigone veut enterrer son frère Polynice malgré l'interdit édicté par Créon.",
            "Créon incarne la raison d'État et le pragmatisme : il tente de sauver Antigone jusqu'au bout.",
            "Ismène représente la prudence et l'attachement à la vie ; Hémon, l'amour sacrifié.",
            "Le tragique naît du conflit entre deux légitimités : la loi de la cité et la loi morale."],
          formules: ['« Je ne veux pas comprendre » — Antigone', 'Créon : « Il faut pourtant qu’il y en ait qui disent oui »', 'Le refus du bonheur médiocre', 'Conflit : loi de l’État / loi morale'],
          pieges: ["Créon n'est pas un tyran caricatural : il argumente et cherche à convaincre.",
            "Antigone ne défend pas seulement un rite funéraire : elle refuse un certain type d'existence.",
            "Le tragique n'est pas le triste : il tient à l'impossibilité de concilier deux exigences légitimes."]
        },
        qcm: [
          q('Antigone s’oppose à Créon parce qu’elle veut :', ['enterrer son frère Polynice', 'prendre le pouvoir à Thèbes', 'épouser Hémon contre l’avis du roi'], 0, "L'édit de Créon interdit la sépulture de Polynice, déclaré traître à la cité."),
          q('Ismène représente dans la pièce :', ['la prudence et l’attachement à la vie', 'la révolte absolue', 'la raison d’État'], 0, "Sœur d'Antigone, elle refuse d'abord de la suivre, par peur et par amour de la vie."),
          q('Le tragique de la pièce naît :', ['du conflit entre la loi de l’État et la loi morale', 'd’un simple quiproquo', 'd’un accident imprévisible'], 0, "Chacun des deux personnages a ses raisons : aucune issue ne peut satisfaire les deux exigences.")
        ],
        tp: { objectifs: ['Caractériser des personnages', 'Analyser un dialogue argumentatif'],
          exercices: ['1. Opposer les arguments d’Antigone et ceux de Créon lors de leur affrontement.',
            '2. Expliquer le rôle d’Ismène dans la construction du personnage d’Antigone.',
            '3. Expliquer la formule d’Antigone : « Je ne veux pas comprendre. »'],
          corrige: ["1. Créon invoque l'ordre de la cité, la nécessité de gouverner et la médiocrité du bonheur quotidien ; Antigone oppose la fidélité à son frère, le refus du compromis et l'exigence d'absolu.",
            "2. Ismène, raisonnable et attachée à la vie, sert de contraste : par opposition, la radicalité d'Antigone devient un choix et non un tempérament.",
            "3. Comprendre reviendrait à accepter les raisons de Créon, donc à consentir au compromis : le refus de comprendre est le refus de renoncer à l'absolu."] } },

      { titre: 'Le Dernier Jour d’un condamné — Victor Hugo', duree: 36, difficulte: 'Moyen',
        accroche: "Un plaidoyer contre la peine de mort écrit à la première personne.",
        notions: ['Récit à la première personne', 'Registre pathétique', 'Plaidoyer', 'Anonymat du condamné'],
        seances: [['Hugo et le combat contre la peine de mort', 9], ['Le choix du journal à la première personne', 10], ['Registres et procédés d’écriture', 9], ['Portée argumentative de l’œuvre', 8]],
        resume: {
          points: ["Publié en 1829, le roman est un plaidoyer contre la peine de mort.",
            "Le récit est mené à la première personne, sous forme de journal : le lecteur épouse la conscience du condamné.",
            "Le nom et le crime du personnage ne sont jamais révélés : il devient un condamné universel.",
            "Hugo mêle registres pathétique et polémique pour provoquer l'indignation du lecteur."],
          formules: ['1829 : publication du roman', 'Préface de 1832 : plaidoyer explicite', 'Narration à la première personne', 'Le condamné reste anonyme'],
          pieges: ["Le narrateur n'est pas Victor Hugo : c'est un personnage fictif.",
            "L'absence du crime n'est pas un oubli : c'est un choix argumentatif.",
            "Ne pas confondre l'œuvre et la préface de 1832, plus explicitement militante."]
        },
        qcm: [
          q('Le Dernier Jour d’un condamné est un plaidoyer contre :', ['la peine de mort', 'la guerre', 'l’esclavage'], 0, "Hugo dénonce l'inhumanité de la peine capitale et milite pour son abolition."),
          q('Le récit est mené :', ['à la première personne, sous forme de journal', 'par un narrateur omniscient extérieur', 'sous forme de dialogue théâtral'], 0, "Ce choix crée une immersion dans la conscience du condamné et suscite l'empathie du lecteur."),
          q('Le nom du condamné :', ['n’est jamais révélé', 'est donné dès le premier chapitre', 'apparaît dans la préface'], 0, "L'anonymat lui donne une valeur universelle : il peut être n'importe quel condamné.")
        ],
        tp: { objectifs: ['Analyser un choix narratif', 'Repérer les procédés du plaidoyer'],
          exercices: ['1. Expliquer l’effet produit par la narration à la première personne.',
            '2. Justifier l’anonymat du personnage et l’absence du récit du crime.',
            '3. Relever trois procédés du registre pathétique.'],
          corrige: ["1. Le lecteur partage les pensées et l'angoisse du condamné en temps réel : l'identification rend l'exécution insoutenable et sert l'argumentation.",
            "2. Si le crime était connu, le lecteur jugerait l'homme ; en l'ignorant, il ne peut juger que la peine elle-même.",
            "3. Champ lexical de la souffrance et de l'enfermement, exclamations et interrogations, évocation de la fille du condamné."] } },

      { titre: 'Il était une fois un vieux couple heureux — Khaïr-Eddine', duree: 34, difficulte: 'Facile',
        accroche: "Le bonheur simple d'un couple du Souss, entre mémoire orale et modernité menaçante.",
        notions: ['Cadre spatio-temporel', 'Bouchaïb et sa femme', 'Tradition et modernité', 'Oralité'],
        seances: [['L’auteur et le cadre du Souss', 8], ['Les personnages et leur mode de vie', 9], ['Tradition, mémoire et oralité', 9], ['Modernité et regard critique', 8]],
        resume: {
          points: ["Le roman met en scène Bouchaïb et son épouse dans un village berbère du Souss.",
            "Le bonheur du couple repose sur la simplicité, la sagesse et l'harmonie avec la nature.",
            "L'œuvre valorise la mémoire orale, les contes et la parole des anciens.",
            "La modernité et l'appât du gain sont présentés comme des menaces pour cet équilibre."],
          formules: ['Auteur : Mohammed Khaïr-Eddine', 'Cadre : un village du Souss', 'Bouchaïb : le calligraphe-poète', 'Thèmes : sagesse, mémoire, modernité'],
          pieges: ["Le roman n'idéalise pas naïvement le passé : il porte aussi un regard critique.",
            "Le bonheur du couple n'est pas matériel : il est fait de sobriété et de dignité.",
            "Ne pas réduire l'œuvre à une chronique villageoise : elle porte une réflexion sur la mémoire."]
        },
        qcm: [
          q('Le roman de Khaïr-Eddine met en scène :', ['Bouchaïb et son épouse dans un village du Souss', 'un condamné à mort dans sa cellule', 'une famille bourgeoise à Fès'], 0, "Le récit suit la vie quotidienne d'un vieux couple dans le Sud marocain."),
          q('L’œuvre valorise avant tout :', ['la sagesse, la tradition et la mémoire orale', 'la réussite matérielle', 'l’exil vers la ville'], 0, "Contes, proverbes et parole des anciens y sont présentés comme un patrimoine à préserver."),
          q('Le vieux couple vit :', ['une pauvreté digne et heureuse', 'une richesse ostentatoire', 'un exil douloureux à l’étranger'], 0, "Leur bonheur tient à la sobriété, à l'entente et à l'harmonie avec leur milieu.")
        ],
        tp: { objectifs: ['Analyser un cadre romanesque', 'Dégager une thèse implicite'],
          exercices: ['1. Décrire le cadre spatio-temporel du roman et son rôle.',
            '2. Expliquer en quoi le bonheur du couple est présenté comme exemplaire.',
            '3. Relever le regard porté par l’auteur sur la modernité.'],
          corrige: ["1. Un village du Souss, à l'écart des villes, dans un temps rythmé par les saisons : ce cadre rend possible un mode de vie fondé sur la simplicité et la mémoire.",
            "2. Il ne dépend d'aucune possession : entente du couple, respect mutuel, satisfaction du nécessaire et transmission de la culture.",
            "3. L'auteur montre l'attrait de l'argent et de la ville, mais souligne la perte des repères et l'affaiblissement des solidarités qu'ils entraînent."] } },

      { titre: 'Méthodologie : analyse d’extrait et production écrite', duree: 42, difficulte: 'Moyen',
        accroche: "Structurer une réponse, argumenter et rédiger : la méthode qui fait gagner des points.",
        notions: ['Situer un extrait', 'Analyse littéraire', 'Plan argumentatif', 'Connecteurs logiques'],
        seances: [['Situer et présenter un extrait', 10], ['Analyser : procédés et effets', 11], ['Construire un plan argumentatif', 11], ['Rédiger : introduction, développement, conclusion', 10]],
        resume: {
          points: ["Toute analyse commence par situer le passage dans l'œuvre et en dégager l'intérêt.",
            "On n'énumère jamais des procédés : on relie chaque procédé à un effet et à une interprétation.",
            "Une production écrite argumentative annonce une thèse, la développe par des arguments illustrés, puis conclut.",
            "Les connecteurs logiques rendent visible la progression du raisonnement."],
          formules: ['Situer → analyser → interpréter', 'Argument + exemple + explication', 'Introduction : amorce, thèse, annonce du plan', 'Connecteurs : d’abord, en outre, cependant, ainsi'],
          pieges: ["La paraphrase, qui raconte le texte au lieu de l'analyser, est l'erreur la plus pénalisée.",
            "Un exemple sans explication ne prouve rien.",
            "Ne pas oublier la conclusion : elle répond explicitement à la problématique."]
        },
        qcm: [
          q('L’analyse d’un extrait commence par :', ['la situation du passage dans l’œuvre', 'la conclusion', 'l’avis personnel du candidat'], 0, "Situer le passage permet d'en comprendre les enjeux avant toute interprétation."),
          q('Dans une production écrite argumentative, la thèse doit :', ['être annoncée puis étayée par des arguments et des exemples', 'rester implicite jusqu’à la fin', 'être répétée sans être justifiée'], 0, "Une thèse annoncée puis démontrée rend le raisonnement lisible et convaincant."),
          q('Un connecteur logique sert à :', ['organiser la progression du raisonnement', 'allonger artificiellement le devoir', 'décorer le style'], 0, "Il explicite les relations entre les idées : addition, opposition, cause, conséquence.")
        ],
        tp: { objectifs: ['Rédiger une introduction complète', 'Construire un paragraphe argumenté'],
          exercices: ['1. Rédiger l’introduction d’une analyse portant sur un extrait d’Antigone.',
            '2. Construire un paragraphe argumenté selon le schéma argument – exemple – explication.',
            '3. Relever les erreurs à éviter dans une production écrite.'],
          corrige: ["1. Présenter l'auteur et l'œuvre, situer l'extrait dans l'intrigue, formuler la problématique, annoncer les axes d'analyse.",
            "2. Annoncer l'idée, l'illustrer par une citation précise, puis expliquer en quoi l'exemple prouve l'idée : les trois temps sont indispensables.",
            '3. Paraphrase, absence de problématique, exemples non expliqués, absence de conclusion, style relâché et fautes d’orthographe.'] } }
    ]
  });
})();
