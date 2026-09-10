/* CASHEVENT SCHOOL — catalogue pédagogique
   MATIERES[] > chapitres[] > { seances, resume, qcm, tp }
   Niveau : 2ᵉ année Baccalauréat — Sciences (Maroc)                          */
window.ECOLE = (() => {
  const q = (e, o, i, x) => ({ e, o, i, x });
  const M = [];

  /* ============================ MATHÉMATIQUES ============================ */
  M.push({
    id: 'maths', nom: 'Mathématiques', court: 'Maths', prof: 'M. Bennani',
    coef: 7, teinte: '#3b6ef5', teinte2: '#7b3bf5', glyphe: '∫',
    labelFormules: 'Formules à retenir',
    chapitres: [
      { titre: 'Les nombres complexes', duree: 54, difficulte: 'Moyen',
        accroche: "Construire l'ensemble ℂ, maîtriser les trois écritures d'un complexe et les utiliser en géométrie.",
        notions: ['Forme algébrique', 'Module et argument', 'Forme trigonométrique', 'Interprétation géométrique'],
        seances: [['Forme algébrique, conjugué, inverse', 14], ['Module, argument, forme trigonométrique', 16], ['Formule de Moivre et racines n-ièmes', 13], ['Applications géométriques — exercices type bac', 11]],
        resume: {
          points: ["Tout complexe s'écrit z = a + ib avec a = Re(z) et b = Im(z) ; son conjugué est z̄ = a − ib.",
            "Le module |z| = √(a² + b²) mesure la distance OM ; l'argument arg(z) est l'angle orienté (u⃗ , OM⃗).",
            "La forme trigonométrique z = |z|(cos θ + i sin θ) transforme les produits en sommes d'arguments.",
            "En géométrie : |z_B − z_A| = AB, et arg((z_C − z_A)/(z_B − z_A)) donne l'angle en A."],
          formules: ['z · z̄ = |z|²', "|z·z'| = |z|·|z'| et arg(z·z') = arg z + arg z' [2π]", '(cos θ + i sin θ)ⁿ = cos nθ + i sin nθ', 'zⁿ = 1 ⟺ z = e^(2ikπ/n), k ∈ {0, …, n−1}'],
          pieges: ["Ne jamais écrire √(−4) = 2i : la notation racine n'est pas définie sur ℂ, on passe par i² = −1.",
            "L'argument n'est défini que pour z ≠ 0, et toujours modulo 2π.",
            "Confondre |z|² (réel positif) et z² (complexe)."]
        },
        qcm: [
          q('Le module de z = 3 + 4i vaut :', ['5', '7', '25'], 0, '|z| = √(3² + 4²) = √25 = 5. On prend la racine de la somme des carrés, pas la somme elle-même.'),
          q('Le conjugué de z = 2 − 5i est :', ['2 + 5i', '−2 + 5i', '−2 − 5i'], 0, 'Le conjugué change uniquement le signe de la partie imaginaire : a + ib ↦ a − ib.'),
          q('i^2026 est égal à :', ['−1', '1', 'i'], 0, '2026 = 4 × 506 + 2, donc i^2026 = i² = −1. Les puissances de i sont périodiques de période 4.')
        ],
        tp: { objectifs: ["Passer d'une forme à l'autre sans calculatrice", 'Utiliser les complexes pour démontrer une propriété géométrique'],
          exercices: ['1. Écrire z = (1 + i√3)/(1 − i) sous forme algébrique puis trigonométrique.',
            '2. Résoudre dans ℂ : z² − 2z + 5 = 0, puis placer les solutions dans le plan complexe.',
            '3. Soit A(1 + i), B(3 − i) et C(4 + 2i). Montrer que le triangle ABC est rectangle en B.'],
          corrige: ["1. On multiplie par le conjugué du dénominateur : z = ((1 + i√3)(1 + i))/2, soit z = (1 − √3)/2 + i(1 + √3)/2 ; |z| = √2 et arg(z) = π/3 + π/4 = 7π/12.",
            "2. Δ = 4 − 20 = −16 = (4i)², d'où z = (2 ± 4i)/2 = 1 ± 2i : deux points symétriques par rapport à l'axe des réels.",
            "3. Le quotient (z_C − z_B)/(z_A − z_B) = (1 + 3i)/(−2 + 2i) est imaginaire pur : l'angle en B vaut donc π/2."] } },

      { titre: 'Limites et continuité', duree: 48, difficulte: 'Moyen',
        accroche: "Lever les formes indéterminées et exploiter le théorème des valeurs intermédiaires.",
        notions: ["Limites en un point et à l'infini", 'Formes indéterminées', 'Continuité', 'Théorème des valeurs intermédiaires'],
        seances: [['Limites usuelles et opérations', 13], ['Lever les quatre formes indéterminées', 15], ['Continuité et prolongement par continuité', 11], ['TVI et dichotomie — exercices type bac', 9]],
        resume: {
          points: ["Une limite décrit un comportement, pas une valeur atteinte : f peut tendre vers ℓ sans jamais valoir ℓ.",
            "Les quatre formes indéterminées sont ∞ − ∞, 0 × ∞, ∞/∞ et 0/0 : il faut factoriser, conjuguer, ou reconnaître un taux d'accroissement.",
            "À l'infini, une fraction rationnelle se comporte comme le quotient de ses termes de plus haut degré.",
            "f continue sur [a ; b] avec f(a)·f(b) < 0 ⟹ l'équation f(x) = 0 a au moins une solution dans ]a ; b[."],
          formules: ['lim (sin x)/x = 1 en 0', 'lim (ln x)/x = 0 en +∞', 'lim x·ln x = 0 en 0⁺', 'f continue en a ⟺ lim(x→a) f(x) = f(a)'],
          pieges: ["Le TVI donne l'existence d'une solution, pas son unicité : il faut la stricte monotonie pour conclure.",
            "Une fonction peut avoir une limite finie en a sans y être définie (prolongement par continuité).",
            "Appliquer les opérations sur les limites alors qu'on est face à une forme indéterminée."]
        },
        qcm: [
          q('lim (3x² − x)/(x² + 1) quand x → +∞ vaut :', ['3', '0', '+∞'], 0, 'On factorise par x² en haut et en bas : le quotient tend vers 3/1 = 3.'),
          q("Le théorème des valeurs intermédiaires s'applique à une fonction :", ['continue sur un intervalle', 'dérivable partout', 'strictement croissante'], 0, "La continuité sur un intervalle est la seule hypothèse nécessaire ; la monotonie ne sert qu'à prouver l'unicité."),
          q('Si f est continue sur [a ; b] et f(a)·f(b) < 0, alors :', ["f s'annule au moins une fois sur ]a ; b[", "f s'annule exactement une fois", "f ne s'annule pas"], 0, "Le TVI garantit au moins une racine ; l'unicité demande en plus la stricte monotonie.")
        ],
        tp: { objectifs: ['Calculer des limites avec formes indéterminées', 'Encadrer une solution par dichotomie'],
          exercices: ['1. Calculer lim(x→+∞) (√(x² + x) − x).',
            '2. Étudier la continuité en 0 de f(x) = (sin 3x)/x prolongée par f(0) = 3.',
            '3. Montrer que x³ + x − 1 = 0 admet une unique solution α, puis en donner un encadrement à 10⁻¹ près.'],
          corrige: ['1. On multiplie par la quantité conjuguée : x/(√(x² + x) + x) → 1/2.',
            '2. (sin 3x)/x = 3·(sin 3x)/(3x) → 3 = f(0) : f est continue en 0.',
            "3. f est continue et strictement croissante (f' = 3x² + 1 > 0) ; f(0) = −1 < 0 et f(1) = 1 > 0 donc α ∈ ]0 ; 1[ ; par dichotomie 0,6 < α < 0,7."] } },

      { titre: 'Dérivation et étude de fonctions', duree: 57, difficulte: 'Moyen',
        accroche: "Du nombre dérivé à l'allure de la courbe : variations, extremums, convexité, asymptotes.",
        notions: ['Nombre dérivé et tangente', 'Opérations sur les dérivées', 'Variations et extremums', "Convexité et points d'inflexion"],
        seances: [['Nombre dérivé, tangente, approximation affine', 14], ['Dérivées des fonctions usuelles et composées', 16], ['Sens de variation et extremums', 14], ["Convexité, asymptotes, plan d'étude complet", 13]],
        resume: {
          points: ["f'(a) est le coefficient directeur de la tangente en a : y = f'(a)(x − a) + f(a).",
            "Le signe de f' donne les variations ; un extremum local correspond à un changement de signe de f'.",
            "Le signe de f'' donne la convexité ; un point d'inflexion est un changement de signe de f''.",
            "Plan d'étude type : domaine, limites, dérivée, tableau de variations, asymptotes, courbe."],
          formules: ["(u·v)' = u'v + uv'", "(u/v)' = (u'v − uv')/v²", "(u∘v)' = v'·(u'∘v)", "(ln u)' = u'/u et (e^u)' = u'·e^u"],
          pieges: ["f'(a) = 0 n'implique pas un extremum : x ↦ x³ en 0 est le contre-exemple à connaître.",
            "Une dérivée positive donne la croissance sur un intervalle, jamais sur une réunion d'intervalles.",
            "Oublier de vérifier le domaine de dérivabilité (racine carrée en 0, valeur absolue)."]
        },
        qcm: [
          q('La dérivée de f(x) = x·ln x sur ]0 ; +∞[ est :', ['ln x + 1', '1/x', 'ln x'], 0, "Dérivée d'un produit : 1·ln x + x·(1/x) = ln x + 1."),
          q("Si f'(x) > 0 sur un intervalle I, alors f est :", ['strictement croissante sur I', 'constante sur I', 'décroissante sur I'], 0, "Le signe strictement positif de la dérivée caractérise la stricte croissance sur un intervalle."),
          q("Un point d'inflexion correspond à :", ["un changement de signe de f''", 'un maximum de f', "un point où f' = 0"], 0, "L'inflexion est un changement de convexité, donc un changement de signe de la dérivée seconde.")
        ],
        tp: { objectifs: ['Mener une étude de fonction complète', 'Justifier une tangente et une position relative'],
          exercices: ['1. Étudier f(x) = (x² − 3x + 2)/(x − 1) : domaine, limites, dérivée, tableau de variations.',
            "2. Déterminer l'équation de la tangente à C_f au point d'abscisse 2.",
            '3. Étudier la convexité de g(x) = x³ − 3x et préciser son point d’inflexion.'],
          corrige: ["1. D = ℝ \\ {1}. Le numérateur se factorise en (x − 1)(x − 2), donc f(x) = x − 2 pour x ≠ 1 : la courbe est une droite privée d'un point.",
            "2. f(2) = 0 et f'(2) = 1, d'où la tangente T : y = x − 2.",
            "3. g''(x) = 6x change de signe en 0 : point d'inflexion I(0 ; 0), concave sur ]−∞ ; 0], convexe sur [0 ; +∞[."] } },

      { titre: 'Les suites numériques', duree: 46, difficulte: 'Moyen',
        accroche: "Récurrence, monotonie et convergence : les outils pour prouver qu'une suite atteint sa limite.",
        notions: ['Suites arithmétiques et géométriques', 'Raisonnement par récurrence', 'Monotonie et majoration', 'Convergence'],
        seances: [['Modes de génération et suites usuelles', 12], ['Le raisonnement par récurrence', 13], ['Monotonie, majorants, minorants', 11], ['Convergence et suites adjacentes', 10]],
        resume: {
          points: ["Une récurrence se rédige toujours en trois temps : initialisation, hérédité, conclusion.",
            "Toute suite croissante et majorée converge (théorème de la convergence monotone).",
            "Si u_{n+1} = f(u_n) avec f continue et u_n → ℓ, alors ℓ vérifie f(ℓ) = ℓ.",
            "Une suite géométrique de raison q converge si et seulement si −1 < q ≤ 1."],
          formules: ['Arithmétique : u_n = u₀ + n·r', 'Géométrique : u_n = u₀ · qⁿ', '1 + q + … + qⁿ = (1 − q^{n+1})/(1 − q)', 'lim qⁿ = 0 si |q| < 1'],
          pieges: ["Oublier l'initialisation : l'hérédité seule ne prouve rien.",
            "Une suite bornée n'est pas forcément convergente : (−1)ⁿ est bornée et divergente.",
            "Confondre le rang n et le terme u_n dans les calculs de somme."]
        },
        qcm: [
          q('La suite définie par u_n = (1/2)ⁿ est :', ['convergente vers 0', 'divergente', 'constante'], 0, "Suite géométrique de raison 1/2 : comme |q| < 1, qⁿ tend vers 0."),
          q('Toute suite croissante et majorée est :', ['convergente', 'divergente', 'nécessairement constante'], 0, "C'est le théorème de la convergence monotone : elle converge vers sa borne supérieure."),
          q('Pour une suite arithmétique de premier terme u₀ et de raison r :', ['u_n = u₀ + n·r', 'u_n = u₀ × rⁿ', 'u_n = u₀ + r'], 0, "On ajoute r à chaque étape, donc n fois r après n étapes ; u₀ × rⁿ est la forme géométrique.")
        ],
        tp: { objectifs: ['Rédiger une récurrence complète', 'Étudier une suite définie par récurrence'],
          exercices: ['1. Montrer par récurrence que pour tout n ≥ 1 : 1 + 2 + … + n = n(n + 1)/2.',
            '2. Soit u₀ = 1 et u_{n+1} = √(u_n + 2). Montrer que (u_n) est croissante et majorée par 2, puis déterminer sa limite.',
            '3. Calculer la somme des 20 premiers termes de la suite géométrique de premier terme 3 et de raison 2.'],
          corrige: ['1. Initialisation n = 1 : 1 = 1×2/2 ✓. Hérédité : S_{n+1} = S_n + (n + 1) = (n + 1)(n + 2)/2 ✓.',
            "2. Par récurrence 1 ≤ u_n ≤ 2 ; la croissance vient de u_{n+1} − u_n ≥ 0 sur [1 ; 2]. La suite converge vers ℓ tel que ℓ = √(ℓ + 2), soit ℓ = 2.",
            '3. S = 3·(2²⁰ − 1)/(2 − 1) = 3 × 1 048 575 = 3 145 725.'] } },

      { titre: 'La fonction logarithme népérien', duree: 44, difficulte: 'Moyen',
        accroche: "La fonction qui transforme les produits en sommes, et son usage dans les équations et les croissances comparées.",
        notions: ['Définition et propriétés algébriques', 'Dérivée et variations', 'Équations et inéquations', 'Croissances comparées'],
        seances: [['Définition, domaine, propriétés algébriques', 12], ['Dérivée, variations, courbe', 11], ['Résoudre équations et inéquations', 12], ['Croissances comparées et limites', 9]],
        resume: {
          points: ["ln est définie sur ]0 ; +∞[, strictement croissante, avec ln 1 = 0 et ln e = 1.",
            "ln transforme les produits en sommes : toutes les autres propriétés en découlent.",
            "Avant toute résolution, on détermine l'ensemble de définition : les arguments du ln doivent être strictement positifs.",
            "En +∞, ln x est négligeable devant x : c'est la croissance comparée."],
          formules: ['ln(ab) = ln a + ln b', 'ln(a/b) = ln a − ln b', 'ln(aⁿ) = n·ln a', "(ln x)' = 1/x"],
          pieges: ["ln(a + b) ≠ ln a + ln b : l'erreur la plus fréquente au bac.",
            "Oublier de vérifier le domaine avant de simplifier une équation logarithmique.",
            "Diviser une inéquation par ln x sans discuter son signe."]
        },
        qcm: [
          q('ln(a × b) est égal à :', ['ln a + ln b', 'ln a × ln b', 'ln a / ln b'], 0, "C'est la propriété fondamentale du logarithme : il transforme un produit en somme."),
          q("L'ensemble de définition de x ↦ ln(x − 3) est :", [']3 ; +∞[', '[3 ; +∞[', 'ℝ'], 0, "Il faut x − 3 > 0, donc x > 3 ; la borne est exclue car ln n'est pas définie en 0."),
          q('lim ln x quand x → 0⁺ vaut :', ['−∞', '0', '+∞'], 0, "La courbe admet l'axe des ordonnées comme asymptote verticale, avec une limite −∞.")
        ],
        tp: { objectifs: ['Résoudre équations et inéquations logarithmiques', 'Exploiter les croissances comparées'],
          exercices: ['1. Résoudre ln(x) + ln(x − 2) = ln 3.', '2. Résoudre ln(2x − 1) ≤ 0.',
            '3. Étudier les variations de f(x) = x − ln x sur ]0 ; +∞[ et donner son minimum.'],
          corrige: ["1. Domaine x > 2 ; l'équation devient x(x − 2) = 3, soit x² − 2x − 3 = 0 : x = 3 (x = −1 rejeté).",
            '2. Domaine x > 1/2 ; ln(2x − 1) ≤ ln 1 ⟹ 2x − 1 ≤ 1 ⟹ x ≤ 1. Solution : ]1/2 ; 1].',
            "3. f'(x) = 1 − 1/x s'annule en 1 : minimum f(1) = 1, ce qui prouve x ≥ ln x + 1 pour tout x > 0."] } },

      { titre: 'La fonction exponentielle', duree: 45, difficulte: 'Moyen',
        accroche: "Réciproque du logarithme, elle modélise toute croissance proportionnelle à elle-même.",
        notions: ['Définition et propriétés', 'Dérivée et variations', 'Équations exponentielles', 'Modélisation'],
        seances: [['Définition comme réciproque de ln', 11], ['Propriétés algébriques et dérivée', 12], ['Équations, inéquations, limites', 12], ['Modéliser une évolution', 10]],
        resume: {
          points: ["exp est définie sur ℝ et strictement positive : e^x > 0 pour tout x réel.",
            "exp et ln sont réciproques : e^{ln x} = x pour x > 0, et ln(e^x) = x pour tout x.",
            "exp est sa propre dérivée : c'est la seule fonction, à constante multiplicative près, vérifiant f' = f.",
            "En +∞, e^x l'emporte sur toute puissance de x."],
          formules: ['e^a · e^b = e^{a+b}', 'e^{−a} = 1/e^a', "(e^u)' = u'·e^u", 'lim e^x/x = +∞ en +∞'],
          pieges: ["e^x = 0 n'a jamais de solution : l'exponentielle ne s'annule pas.",
            "(e^{2x})' = 2e^{2x}, pas e^{2x} : ne pas oublier la dérivée de la composée.",
            "Confondre e^{a+b} et e^a + e^b."]
        },
        qcm: [
          q('e^a × e^b est égal à :', ['e^{a+b}', 'e^{ab}', 'e^a + e^b'], 0, "L'exponentielle transforme les sommes en produits : c'est sa relation fonctionnelle."),
          q('La dérivée de x ↦ e^{2x} est :', ['2e^{2x}', 'e^{2x}', '2x·e^{2x−1}'], 0, "Formule (e^u)' = u'·e^u avec u(x) = 2x donc u' = 2."),
          q("L'équation e^x = −2 admet :", ['aucune solution', 'une solution', 'deux solutions'], 0, "L'exponentielle est strictement positive sur ℝ : elle ne prend jamais de valeur négative.")
        ],
        tp: { objectifs: ['Résoudre des équations exponentielles', 'Modéliser une évolution'],
          exercices: ['1. Résoudre e^{2x} − 3e^x + 2 = 0 (poser X = e^x).', '2. Étudier f(x) = (x − 1)e^x : variations et limites.',
            "3. Une population de bactéries suit N(t) = 500·e^{0,2t} (t en heures). Au bout de combien de temps double-t-elle ?"],
          corrige: ['1. X² − 3X + 2 = 0 donne X = 1 ou X = 2, donc x = 0 ou x = ln 2.',
            "2. f'(x) = x·e^x : décroissante sur ]−∞ ; 0], croissante ensuite ; minimum f(0) = −1 ; limite 0⁻ en −∞ et +∞ en +∞.",
            '3. 2 = e^{0,2t} donne t = ln 2 / 0,2 ≈ 3,47 h, soit environ 3 h 28 min.'] } },

      { titre: 'Le calcul intégral', duree: 52, difficulte: 'Difficile',
        accroche: "Primitives, aires et intégration par parties : relier le calcul et la géométrie.",
        notions: ['Primitives', 'Intégrale et aire', 'Intégration par parties', 'Valeur moyenne'],
        seances: [['Primitives des fonctions usuelles', 13], ['Intégrale, aire et propriétés', 14], ['Intégration par parties', 13], ['Valeur moyenne et applications', 12]],
        resume: {
          points: ["Si F est une primitive de f, alors ∫ₐᵇ f(x)dx = F(b) − F(a).",
            "Pour f ≥ 0 sur [a ; b], l'intégrale est l'aire entre la courbe et l'axe des abscisses, en unités d'aire.",
            "L'intégration par parties découle de la dérivée d'un produit : utile pour x·e^x, x·ln x, x·cos x…",
            "La valeur moyenne de f sur [a ; b] vaut (1/(b − a))·∫ₐᵇ f(x)dx."],
          formules: ['∫ₐᵇ f = F(b) − F(a)', "∫ₐᵇ u'v = [uv]ₐᵇ − ∫ₐᵇ uv'", 'Primitive de 1/x : ln|x|', "Primitive de u'·uⁿ : u^{n+1}/(n + 1)"],
          pieges: ["Une intégrale peut être négative : ce n'est une aire que si f garde un signe positif.",
            "Oublier la constante quand on cherche une primitive (et non une intégrale).",
            "Mal choisir u et v' : on dérive ce qui se simplifie, souvent ln x ou x."]
        },
        qcm: [
          q('∫₀¹ 2x dx vaut :', ['1', '2', '0'], 0, 'Une primitive de 2x est x², donc l’intégrale vaut 1² − 0² = 1.'),
          q('Si f ≥ 0 sur [a ; b], alors ∫ₐᵇ f(x)dx représente :', ['l’aire sous la courbe', 'la pente de la courbe', 'la dérivée en b'], 0, "L'intégrale d'une fonction positive mesure l'aire entre la courbe, l'axe des abscisses et les droites x = a et x = b."),
          q("L'intégration par parties repose sur :", ["(uv)' = u'v + uv'", "la dérivée d'un quotient", 'le théorème des valeurs intermédiaires'], 0, "En intégrant (uv)' = u'v + uv' entre a et b on obtient ∫u'v = [uv] − ∫uv'.")
        ],
        tp: { objectifs: ['Calculer une intégrale par parties', 'Calculer une aire entre deux courbes'],
          exercices: ['1. Calculer ∫₀¹ x·e^x dx.', '2. Calculer ∫₁^e ln x dx.',
            "3. Calculer l'aire du domaine compris entre les courbes de f(x) = x² et g(x) = x sur [0 ; 1]."],
          corrige: ["1. u' = e^x et v = x : [x·e^x]₀¹ − ∫₀¹ e^x dx = e − (e − 1) = 1.",
            "2. u' = 1 et v = ln x : [x·ln x]₁^e − ∫₁^e 1 dx = e − (e − 1) = 1.",
            '3. ∫₀¹ (x − x²)dx = [x²/2 − x³/3]₀¹ = 1/2 − 1/3 = 1/6 unité d’aire.'] } },

      { titre: 'Les probabilités', duree: 50, difficulte: 'Difficile',
        accroche: "Probabilités conditionnelles, indépendance et loi binomiale : lire l'énoncé et choisir le bon modèle.",
        notions: ['Probabilité conditionnelle', 'Arbre pondéré', 'Indépendance', 'Loi binomiale'],
        seances: [['Vocabulaire, équiprobabilité, dénombrement', 12], ['Probabilités conditionnelles et arbres', 14], ['Indépendance et probabilités totales', 12], ['Loi binomiale et espérance', 12]],
        resume: {
          points: ["p_A(B) = p(A ∩ B)/p(A) : on restreint l'univers à A.",
            "Dans un arbre pondéré, la somme des branches issues d'un même nœud vaut 1, et un chemin se calcule en multipliant.",
            "A et B sont indépendants ⟺ p(A ∩ B) = p(A) × p(B) : l'un n'apporte aucune information sur l'autre.",
            "La loi binomiale B(n ; p) compte les succès de n épreuves de Bernoulli identiques et indépendantes."],
          formules: ['p(A ∪ B) = p(A) + p(B) − p(A ∩ B)', 'p(A ∩ B) = p(A)·p_A(B)', 'p(X = k) = C(n,k)·p^k·(1 − p)^{n−k}', 'E(X) = n·p et V(X) = n·p·(1 − p)'],
          pieges: ["Confondre p_A(B) et p_B(A) : c'est le piège classique des tests de dépistage.",
            "Confondre incompatibles (A ∩ B = ∅) et indépendants : deux événements incompatibles de probabilité non nulle ne sont jamais indépendants.",
            "Utiliser la loi binomiale alors que les tirages sont sans remise, donc dépendants."]
        },
        qcm: [
          q('Deux événements A et B sont indépendants si :', ['p(A ∩ B) = p(A) × p(B)', 'p(A ∪ B) = p(A) + p(B)', 'p(A) = p(B)'], 0, "C'est la définition. La deuxième égalité caractérise des événements incompatibles, ce qui est tout autre chose."),
          q('On lance deux dés équilibrés : la probabilité que la somme vaille 7 est :', ['1/6', '1/12', '1/9'], 0, 'Six couples favorables (1-6, 2-5, 3-4, 4-3, 5-2, 6-1) sur 36 issues : 6/36 = 1/6.'),
          q("Pour X suivant la loi binomiale B(n ; p), l'espérance vaut :", ['n·p', 'n·p·(1 − p)', 'p/n'], 0, "E(X) = n·p ; n·p·(1 − p) est la variance, à ne pas confondre.")
        ],
        tp: { objectifs: ["Construire un arbre pondéré et l'exploiter", 'Reconnaître et utiliser une loi binomiale'],
          exercices: ["1. Une usine produit 3 % de pièces défectueuses. Un test détecte 95 % des pièces défectueuses et déclare défectueuses 2 % des pièces saines. Une pièce est déclarée défectueuse : quelle est la probabilité qu'elle le soit réellement ?",
            "2. On lance 10 fois une pièce équilibrée : probabilité d'obtenir exactement 4 fois pile ?",
            '3. Justifier que la variable de l’exercice 2 suit une loi binomiale et donner son espérance.'],
          corrige: ["1. p(D ∩ T) = 0,03 × 0,95 = 0,0285 ; p(T) = 0,0285 + 0,97 × 0,02 = 0,0479 ; p_T(D) ≈ 0,595. Moins de 60 % : c'est le piège du faux positif.",
            '2. p(X = 4) = C(10,4) × 0,5¹⁰ = 210/1024 ≈ 0,205.',
            '3. Dix épreuves identiques, indépendantes, à deux issues avec p = 0,5 : X ~ B(10 ; 0,5) et E(X) = 5.'] } }
    ]
  });

  return { M, q };
})();
