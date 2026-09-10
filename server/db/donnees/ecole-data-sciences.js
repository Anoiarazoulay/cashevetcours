/* CASHEVENT SCHOOL — Physique · Chimie · SVT */
(() => {
  const { M, q } = window.ECOLE;

  /* ============================== PHYSIQUE ============================== */
  M.push({
    id: 'physique', nom: 'Physique', court: 'Physique', prof: 'Mme Alaoui',
    coef: 7, teinte: '#0f9d8c', teinte2: '#1268b3', glyphe: '⚛',
    labelFormules: 'Relations à connaître',
    chapitres: [
      { titre: 'Les ondes mécaniques progressives', duree: 43, difficulte: 'Moyen',
        accroche: "Une perturbation qui se propage sans transport de matière : célérité, longueur d'onde et retard.",
        notions: ['Onde transversale et longitudinale', 'Célérité et retard', "Longueur d'onde", 'Onde périodique'],
        seances: [['Définition, milieux de propagation', 11], ['Célérité, retard, double périodicité', 13], ['Longueur d’onde et onde périodique', 10], ['Exercices type bac : corde et cuve à ondes', 9]],
        resume: {
          points: ["Une onde mécanique transporte de l'énergie de proche en proche, jamais de la matière.",
            "L'onde est transversale si la perturbation est perpendiculaire à la propagation (corde), longitudinale si elle lui est parallèle (son).",
            "Le retard τ entre deux points distants de d vaut τ = d/v : c'est la clé de tous les exercices.",
            "Une onde périodique présente une double périodicité : temporelle (T) et spatiale (λ)."],
          formules: ['v = d/τ', 'λ = v·T = v/N', 'y_M(t) = y_S(t − τ)', 'τ = d/v'],
          pieges: ["La célérité dépend du milieu, pas de la fréquence de la source : changer la fréquence change λ, pas v.",
            "Ne pas confondre la vitesse de l'onde et la vitesse d'un point du milieu, qui oscille sur place.",
            "Vérifier les unités : λ en mètres, v en m·s⁻¹, T en secondes."]
        },
        qcm: [
          q('Une onde mécanique progressive transporte :', ["de l'énergie sans transport de matière", 'de la matière', 'uniquement de la lumière'], 0, "Chaque point du milieu oscille autour de sa position d'équilibre : seule l'énergie se propage."),
          q('La longueur d’onde λ est liée à la célérité v et à la période T par :', ['λ = v·T', 'λ = v/T', 'λ = T/v'], 0, "λ est la distance parcourue par l'onde pendant une période, donc λ = v·T."),
          q('Une onde est dite transversale lorsque :', ['la perturbation est perpendiculaire à la propagation', 'la perturbation est parallèle à la propagation', 'le milieu ne se déforme pas'], 0, "Cas de l'onde le long d'une corde : les points montent et descendent alors que l'onde avance horizontalement.")
        ],
        tp: { objectifs: ['Mesurer une célérité à partir d’un enregistrement', 'Exploiter la relation λ = v·T'],
          exercices: ["1. Une onde parcourt 2,4 m le long d'une corde en 0,30 s. Calculer sa célérité.",
            '2. La source vibre à 50 Hz. En déduire la longueur d’onde.',
            '3. Un point M est situé à 1,2 m de la source : calculer le retard, puis représenter l’allure de son élongation.'],
          corrige: ['1. v = d/τ = 2,4/0,30 = 8,0 m·s⁻¹.', '2. λ = v/N = 8,0/50 = 0,16 m, soit 16 cm.',
            "3. τ = 1,2/8,0 = 0,15 s : M reproduit le mouvement de la source avec 0,15 s de retard, soit 7,5 périodes."] } },

      { titre: 'Les ondes lumineuses : diffraction et dispersion', duree: 41, difficulte: 'Moyen',
        accroche: "Pourquoi la lumière s'étale derrière une fente, et pourquoi un prisme la décompose.",
        notions: ['Diffraction', 'Écart angulaire', 'Indice de réfraction', 'Dispersion'],
        seances: [['Diffraction par une fente : mise en évidence', 10], ['Écart angulaire et largeur de la tache centrale', 12], ['Indice, réfraction, dispersion', 11], ['Exercices type bac', 8]],
        resume: {
          points: ["La diffraction est d'autant plus marquée que la dimension de l'ouverture est proche de λ.",
            "L'écart angulaire du faisceau diffracté vaut θ = λ/a, et la largeur de la tache centrale L = 2λD/a.",
            "Dans un milieu transparent d'indice n, la lumière ralentit : v = c/n.",
            "L'indice dépend de la longueur d'onde : c'est la dispersion, qui explique la décomposition par un prisme."],
          formules: ['θ = λ/a', 'L = 2λD/a', 'n = c/v', 'n₁·sin i₁ = n₂·sin i₂'],
          pieges: ["θ = λ/a n'est valable qu'en radians et pour de petits angles.",
            "La fréquence d'une radiation ne change pas en changeant de milieu ; c'est λ qui change.",
            "Ne pas confondre a (largeur de la fente) et D (distance fente-écran)."]
        },
        qcm: [
          q("Le phénomène de diffraction est d'autant plus marqué que :", ['la fente est étroite', 'la fente est large', 'la lumière est intense'], 0, "L'étalement θ = λ/a augmente quand a diminue : plus la fente est fine, plus la figure est large."),
          q('L’écart angulaire du faisceau diffracté vaut :', ['λ/a', 'a/λ', 'λ·a'], 0, "θ = λ/a, avec θ en radians, λ et a exprimés dans la même unité."),
          q("Dans un milieu transparent d'indice n, la vitesse de la lumière vaut :", ['c/n', 'c × n', 'c'], 0, "L'indice n = c/v est toujours supérieur à 1 : la lumière est plus lente que dans le vide.")
        ],
        tp: { objectifs: ['Déterminer une longueur d’onde par diffraction', 'Exploiter la loi de Descartes'],
          exercices: ["1. Un laser éclaire une fente de largeur a = 0,10 mm. Sur un écran à D = 2,0 m, la tache centrale mesure L = 2,5 cm. Calculer λ.",
            '2. Calculer la vitesse de cette lumière dans un verre d’indice n = 1,5.',
            '3. Un rayon arrive sur ce verre avec un angle d’incidence de 30°. Calculer l’angle de réfraction.'],
          corrige: ['1. λ = L·a/(2D) = (2,5×10⁻² × 1,0×10⁻⁴)/(2 × 2,0) = 6,3×10⁻⁷ m, soit 630 nm (rouge).',
            '2. v = c/n = 3,0×10⁸/1,5 = 2,0×10⁸ m·s⁻¹.',
            '3. sin r = sin 30°/1,5 = 0,333 donc r ≈ 19,5°.'] } },

      { titre: 'La décroissance radioactive', duree: 46, difficulte: 'Moyen',
        accroche: "Un phénomène aléatoire, spontané et inéluctable, décrit par une loi exponentielle.",
        notions: ['Types de désintégration', 'Lois de Soddy', 'Loi de décroissance', 'Demi-vie et activité'],
        seances: [['Stabilité des noyaux et diagramme (N, Z)', 11], ['Désintégrations α, β⁻, β⁺ et lois de Soddy', 13], ['Loi de décroissance et demi-vie', 12], ['Activité, datation, exercices', 10]],
        resume: {
          points: ["La radioactivité est spontanée, aléatoire et inéluctable : elle ne dépend ni de la température ni de la pression.",
            "Les lois de Soddy traduisent la conservation du nombre de charge Z et du nombre de masse A.",
            "N(t) = N₀·e^{−λt} : le nombre de noyaux restants décroît exponentiellement.",
            "La demi-vie t½ = ln2/λ est la durée au bout de laquelle la moitié des noyaux se sont désintégrés."],
          formules: ['N(t) = N₀·e^{−λt}', 't½ = ln2/λ', 'a(t) = λ·N(t)', 'Activité en becquerels (Bq)'],
          pieges: ["Confondre λ (constante radioactive, en s⁻¹) et λ (longueur d'onde) : le contexte tranche.",
            "Après 2 demi-vies il reste N₀/4, pas 0 : la décroissance n'est jamais totale.",
            "Convertir t½ et t dans la même unité avant tout calcul."]
        },
        qcm: [
          q('La demi-vie t½ est la durée au bout de laquelle :', ['la moitié des noyaux initiaux se sont désintégrés', 'tous les noyaux se sont désintégrés', 'un quart des noyaux subsiste'], 0, "Après une demi-vie il reste N₀/2, après deux demi-vies N₀/4, et ainsi de suite."),
          q('Lors d’une désintégration β⁻ :', ['un neutron se transforme en proton', 'un proton se transforme en neutron', 'le noyau perd deux protons'], 0, "β⁻ : ¹₀n → ¹₁p + ⁰₋₁e. Z augmente de 1, A reste inchangé."),
          q('La loi de décroissance radioactive s’écrit :', ['N(t) = N₀·e^{−λt}', 'N(t) = N₀·e^{λt}', 'N(t) = N₀ − λt'], 0, "La décroissance est exponentielle avec un exposant négatif : le nombre de noyaux diminue.")
        ],
        tp: { objectifs: ['Écrire une équation de désintégration', 'Exploiter la loi de décroissance'],
          exercices: ["1. Écrire l'équation de la désintégration α du ²³⁸U (Z = 92).",
            '2. Le carbone 14 a une demi-vie de 5 730 ans. Calculer sa constante radioactive λ.',
            "3. Un échantillon archéologique a une activité égale à 25 % de celle d'un échantillon actuel. Estimer son âge."],
          corrige: ['1. ²³⁸₉₂U → ²³⁴₉₀Th + ⁴₂He (conservation de A et de Z).',
            '2. λ = ln2/t½ = 0,693/5730 ≈ 1,21×10⁻⁴ an⁻¹.',
            '3. 25 % = (1/2)², soit 2 demi-vies : âge ≈ 2 × 5 730 = 11 460 ans.'] } },

      { titre: 'Noyaux, masse et énergie', duree: 44, difficulte: 'Difficile',
        accroche: "L'équivalence masse-énergie d'Einstein appliquée à la fission et à la fusion.",
        notions: ['Défaut de masse', 'Énergie de liaison', 'Courbe d’Aston', 'Fission et fusion'],
        seances: [['Défaut de masse et E = Δm·c²', 12], ['Énergie de liaison par nucléon', 11], ['Courbe d’Aston, fission, fusion', 12], ['Bilans énergétiques : exercices', 9]],
        resume: {
          points: ["La masse d'un noyau est toujours inférieure à la somme des masses de ses nucléons : c'est le défaut de masse Δm.",
            "E_ℓ = Δm·c² est l'énergie qu'il faudrait fournir pour dissocier complètement le noyau.",
            "C'est E_ℓ/A, l'énergie de liaison par nucléon, qui mesure la stabilité : maximale autour du fer.",
            "Fission (noyaux lourds) et fusion (noyaux légers) libèrent de l'énergie en produisant des noyaux plus stables."],
          formules: ['Δm = Z·m_p + (A − Z)·m_n − m_noyau', 'E_ℓ = Δm·c²', '1 u = 931,5 MeV/c²', 'E_libérée = |Δm|·c²'],
          pieges: ["Ne pas confondre énergie de liaison totale et énergie de liaison par nucléon.",
            "Le défaut de masse est toujours positif ; c'est la variation de masse de la réaction qui est négative.",
            "Attention aux unités : masses en u, énergies en MeV, avec 1 u = 931,5 MeV/c²."]
        },
        qcm: [
          q('Le défaut de masse Δm d’un noyau est :', ['la différence entre la masse des nucléons séparés et celle du noyau', 'toujours nul', 'égal à la masse du noyau'], 0, "Les nucléons liés ont une masse totale inférieure à celle qu'ils auraient séparés : la différence correspond à l'énergie de liaison."),
          q('La relation E = Δm·c² exprime :', ['l’énergie de liaison du noyau', 'la quantité de mouvement', 'la puissance rayonnée'], 0, "C'est l'équivalence masse-énergie d'Einstein appliquée au noyau."),
          q('Les noyaux les plus stables sont ceux qui ont :', ['la plus grande énergie de liaison par nucléon', 'la plus petite énergie de liaison par nucléon', 'le plus grand nombre de nucléons'], 0, "La courbe d'Aston place les noyaux les plus stables (autour du fer 56) au maximum de E_ℓ/A.")
        ],
        tp: { objectifs: ['Calculer une énergie de liaison', 'Établir un bilan énergétique de réaction nucléaire'],
          exercices: ["1. Calculer le défaut de masse du noyau d'hélium ⁴₂He (m_p = 1,00728 u ; m_n = 1,00866 u ; m_noyau = 4,00150 u).",
            '2. En déduire son énergie de liaison en MeV, puis par nucléon.',
            '3. Expliquer pourquoi la fusion de deux noyaux légers libère de l’énergie.'],
          corrige: ['1. Δm = 2(1,00728) + 2(1,00866) − 4,00150 = 0,03038 u.',
            '2. E_ℓ = 0,03038 × 931,5 ≈ 28,3 MeV, soit 7,07 MeV par nucléon.',
            "3. Le noyau formé a une énergie de liaison par nucléon plus grande : le système gagne en stabilité et l'excédent est libéré sous forme d'énergie."] } },

      { titre: 'Le dipôle RC', duree: 40, difficulte: 'Moyen',
        accroche: "Charge et décharge d'un condensateur : équation différentielle et constante de temps.",
        notions: ['Condensateur et capacité', 'Équation différentielle', 'Constante de temps τ', 'Énergie stockée'],
        seances: [['Le condensateur : charge, capacité, relation i = dq/dt', 11], ['Réponse à un échelon : équation différentielle', 12], ['Constante de temps et méthodes de mesure', 10], ['Énergie et exercices type bac', 7]],
        resume: {
          points: ["Pour un condensateur : q = C·u et i = dq/dt = C·du/dt.",
            "La charge suit u_C(t) = E(1 − e^{−t/τ}) et la décharge u_C(t) = E·e^{−t/τ}.",
            "τ = RC se lit graphiquement : à t = τ, u_C atteint 63 % de E (charge) ou 37 % (décharge).",
            "En régime permanent, le courant s'annule : le condensateur se comporte comme un interrupteur ouvert."],
          formules: ['q = C·u', 'i = C·du/dt', 'τ = R·C', 'E = ½·C·u²'],
          pieges: ["La tension aux bornes d'un condensateur ne peut pas subir de discontinuité, contrairement au courant.",
            "τ s'exprime en secondes : vérifier R en ohms et C en farads (µF = 10⁻⁶ F).",
            "Le régime permanent est atteint pratiquement après 5τ, pas après τ."]
        },
        qcm: [
          q('La constante de temps d’un dipôle RC vaut :', ['τ = R·C', 'τ = R/C', 'τ = C/R'], 0, "τ = RC, homogène à un temps : elle fixe la rapidité de la charge et de la décharge."),
          q('En régime permanent, le condensateur :', ['ne laisse plus passer de courant', 'se comporte comme un fil', 'court-circuite le générateur'], 0, "u_C est constante donc i = C·du/dt = 0 : la branche se comporte comme un interrupteur ouvert."),
          q('L’énergie emmagasinée par un condensateur vaut :', ['½·C·u²', '½·C·u', 'C·u²'], 0, "E = ½·C·u², expression analogue à ½·L·i² pour la bobine.")
        ],
        tp: { objectifs: ['Déterminer τ expérimentalement', 'Exploiter l’équation différentielle de charge'],
          exercices: ['1. Un condensateur C = 10 µF se charge à travers R = 20 kΩ sous E = 6 V. Calculer τ.',
            '2. Calculer u_C à t = τ, puis à t = 3τ.', '3. Calculer l’énergie stockée en fin de charge.'],
          corrige: ['1. τ = 20×10³ × 10×10⁻⁶ = 0,20 s.',
            '2. u_C(τ) = 6(1 − e⁻¹) = 3,8 V ; u_C(3τ) = 6(1 − e⁻³) = 5,7 V.',
            '3. E = ½ × 10×10⁻⁶ × 6² = 1,8×10⁻⁴ J.'] } },

      { titre: 'Le dipôle RL et l’oscillateur RLC', duree: 47, difficulte: 'Difficile',
        accroche: "La bobine s'oppose aux variations de courant ; associée au condensateur, elle crée des oscillations.",
        notions: ['Inductance et auto-induction', 'Constante de temps L/R', 'Oscillations libres', 'Amortissement'],
        seances: [['La bobine : inductance et loi u = L·di/dt', 12], ['Réponse d’un dipôle RL à un échelon', 12], ['Oscillations libres du circuit RLC', 13], ['Amortissement et entretien des oscillations', 10]],
        resume: {
          points: ["Pour une bobine idéale : u = L·di/dt ; elle s'oppose aux variations du courant.",
            "Pour un dipôle RL, τ = L/R et le courant s'établit selon i(t) = (E/R)(1 − e^{−t/τ}).",
            "Dans un circuit LC idéal, l'énergie oscille entre le condensateur et la bobine, sans perte.",
            "La résistance dissipe l'énergie par effet Joule : elle est la cause de l'amortissement."],
          formules: ['u = L·di/dt', 'τ = L/R', 'T₀ = 2π·√(L·C)', 'E = ½·L·i²'],
          pieges: ["L'intensité dans une bobine ne peut pas subir de discontinuité.",
            "τ = L/R pour le dipôle RL, et non L·R : vérifier l'homogénéité.",
            "La pseudo-période d'un régime amorti est légèrement supérieure à la période propre T₀."]
        },
        qcm: [
          q('La constante de temps d’un dipôle RL vaut :', ['τ = L/R', 'τ = R·L', 'τ = R/L'], 0, "τ = L/R est homogène à un temps ; plus L est grande, plus l'établissement du courant est lent."),
          q('Dans un circuit RLC en oscillations libres, l’amortissement est dû :', ['à la résistance du circuit', 'à la bobine seule', 'au condensateur seul'], 0, "C'est la résistance qui dissipe l'énergie par effet Joule ; sans elle, les oscillations seraient entretenues."),
          q('La période propre d’un circuit LC idéal vaut :', ['T₀ = 2π·√(L·C)', 'T₀ = 2π·√(L/C)', 'T₀ = √(L·C)'], 0, "Formule de Thomson : T₀ = 2π√(LC), avec L en henrys et C en farads.")
        ],
        tp: { objectifs: ['Exploiter la réponse d’un dipôle RL', 'Calculer une période propre'],
          exercices: ['1. Une bobine L = 0,50 H et R = 100 Ω est soumise à E = 12 V. Calculer τ et l’intensité en régime permanent.',
            '2. Cette bobine est associée à C = 2,0 µF. Calculer la période propre des oscillations.',
            '3. Expliquer l’évolution de l’énergie totale si la résistance n’est pas nulle.'],
          corrige: ['1. τ = 0,50/100 = 5,0×10⁻³ s ; I = E/R = 0,12 A.',
            '2. T₀ = 2π√(0,50 × 2,0×10⁻⁶) = 6,3×10⁻³ s, soit 6,3 ms.',
            "3. L'énergie totale décroît, dissipée par effet Joule : l'amplitude des oscillations diminue jusqu'à extinction."] } },

      { titre: 'Les lois de Newton et les mouvements', duree: 55, difficulte: 'Difficile',
        accroche: "Du bilan des forces à l'équation horaire : chute libre, projectiles et mouvement circulaire.",
        notions: ['Référentiel galiléen', 'Les trois lois de Newton', 'Chute et projectile', 'Mouvement circulaire uniforme'],
        seances: [['Référentiels, vecteurs position, vitesse, accélération', 14], ['Les trois lois de Newton', 13], ['Mouvement dans un champ de pesanteur uniforme', 15], ['Mouvement circulaire uniforme', 13]],
        resume: {
          points: ["Toute application des lois de Newton commence par : système, référentiel, bilan des forces.",
            "2ᵉ loi : ΣF⃗ = m·a⃗ ; le vecteur accélération a toujours le sens de la résultante des forces.",
            "Dans un champ de pesanteur uniforme sans frottement, a⃗ = g⃗ : la trajectoire d'un projectile est une parabole.",
            "Dans un mouvement circulaire uniforme, l'accélération est centripète : a = v²/R."],
          formules: ['ΣF⃗ = m·a⃗', 'x(t) = v₀cosα·t ; y(t) = −½g·t² + v₀sinα·t + y₀', 'a_n = v²/R', 'v = R·ω'],
          pieges: ["Un mouvement circulaire uniforme n'est pas un mouvement sans accélération : la direction du vecteur vitesse change.",
            "La 1ʳᵉ loi n'est valable que dans un référentiel galiléen.",
            "Ne pas oublier de projeter les équations sur les axes avant d'intégrer."]
        },
        qcm: [
          q('La deuxième loi de Newton s’écrit :', ['ΣF⃗ = m·a⃗', 'ΣF⃗ = 0⃗', 'ΣF⃗ = m·v⃗'], 0, "La somme vectorielle des forces extérieures est égale au produit de la masse par le vecteur accélération."),
          q('Dans un référentiel galiléen, un solide soumis à des forces qui se compensent :', ['garde un mouvement rectiligne uniforme ou reste au repos', 's’arrête toujours', 'accélère'], 0, "C'est le principe d'inertie, première loi de Newton."),
          q('Dans un champ de pesanteur uniforme et sans frottement, la trajectoire d’un projectile lancé obliquement est :', ['une parabole', 'une droite', 'un cercle'], 0, "En éliminant t entre x(t) et y(t) on obtient une équation du second degré en x : une parabole.")
        ],
        tp: { objectifs: ['Établir les équations horaires d’un projectile', 'Exploiter la relation fondamentale de la dynamique'],
          exercices: ["1. Un ballon est lancé à v₀ = 15 m·s⁻¹ avec un angle α = 40° depuis le sol. Établir x(t) et y(t) (g = 9,8 m·s⁻²).",
            '2. Calculer la portée du tir.', '3. Calculer la hauteur maximale atteinte.'],
          corrige: ['1. x(t) = 15·cos40°·t = 11,5·t ; y(t) = −4,9·t² + 15·sin40°·t = −4,9·t² + 9,64·t.',
            '2. y = 0 pour t = 9,64/4,9 = 1,97 s, d’où portée x = 11,5 × 1,97 ≈ 22,6 m.',
            '3. Sommet à t = 0,98 s : y_max = −4,9(0,98)² + 9,64(0,98) ≈ 4,7 m.'] } }
    ]
  });

  /* =============================== CHIMIE =============================== */
  M.push({
    id: 'chimie', nom: 'Chimie', court: 'Chimie', prof: 'M. Tazi',
    coef: 7, teinte: '#d9552b', teinte2: '#a3208f', glyphe: '⚗',
    labelFormules: 'Relations à connaître',
    chapitres: [
      { titre: 'Suivi temporel et vitesse de réaction', duree: 42, difficulte: 'Moyen',
        accroche: "Mesurer l'avancement d'une transformation au cours du temps et agir sur sa vitesse.",
        notions: ['Avancement', 'Vitesse volumique', 'Temps de demi-réaction', 'Facteurs cinétiques'],
        seances: [['Tableau d’avancement et suivi expérimental', 11], ['Vitesse volumique de réaction', 12], ['Temps de demi-réaction', 9], ['Facteurs cinétiques et catalyse', 10]],
        resume: {
          points: ["Le tableau d'avancement relie les quantités de matière à l'avancement x à chaque instant.",
            "La vitesse volumique v = (1/V)·(dx/dt) se lit comme la pente de la tangente à la courbe x(t).",
            "La vitesse est maximale au début puis décroît : les réactifs se raréfient.",
            "Facteurs cinétiques : concentration, température, catalyseur, surface de contact."],
          formules: ['v = (1/V)·(dx/dt)', 'x_max = min(n_i/coefficient)', 't½ : x = x_f/2', 'Conductance G = σ·S/L'],
          pieges: ["Un catalyseur accélère la réaction mais ne modifie ni l'état final ni la constante d'équilibre.",
            "La vitesse se lit sur la tangente, pas sur la corde entre deux points.",
            "Ne pas confondre réactif limitant et réactif en excès dans le tableau d'avancement."]
        },
        qcm: [
          q('La vitesse volumique de réaction se détermine à partir :', ['de la pente de la tangente à la courbe x(t), divisée par V', 'de la masse totale du mélange', 'de la seule température'], 0, "v = (1/V)·(dx/dt) : la dérivée de l'avancement, ramenée au volume de la solution."),
          q('Un catalyseur :', ['augmente la vitesse sans être consommé', 'déplace l’état d’équilibre', 'est consommé par la réaction'], 0, "Il abaisse l'énergie d'activation ; on le retrouve intact en fin de réaction et l'état final est inchangé."),
          q('Le temps de demi-réaction t½ correspond :', ['à la durée nécessaire pour atteindre la moitié de l’avancement final', 'à la durée totale de la réaction', 'à la moitié de la concentration initiale'], 0, "C'est la durée au bout de laquelle x = x_f/2 : un indicateur commode de la rapidité d'une transformation.")
        ],
        tp: { objectifs: ['Construire un tableau d’avancement', 'Déterminer une vitesse et un temps de demi-réaction'],
          exercices: ["1. On mélange 20 mL d'acide chlorhydrique à 0,10 mol·L⁻¹ avec un excès de magnésium. Dresser le tableau d'avancement.",
            '2. Le volume de dihydrogène dégagé atteint 12 mL au bout de 30 s et 24 mL en fin de réaction. Déterminer t½ graphiquement.',
            '3. Citer deux moyens d’accélérer cette réaction et justifier.'],
          corrige: ['1. Mg + 2H⁺ → Mg²⁺ + H₂ ; n(H⁺) = 2,0×10⁻³ mol donc x_max = 1,0×10⁻³ mol (H⁺ limitant).',
            '2. La moitié du volume final est atteinte à 30 s : t½ = 30 s.',
            "3. Augmenter la concentration en acide ou la température : dans les deux cas les chocs efficaces entre entités sont plus nombreux."] } },

      { titre: 'Transformations dans les deux sens et état d’équilibre', duree: 40, difficulte: 'Moyen',
        accroche: "Toutes les transformations ne sont pas totales : quotient de réaction et constante d'équilibre.",
        notions: ['Réaction non totale', 'Quotient de réaction Qr', 'Constante d’équilibre K', 'Taux d’avancement final'],
        seances: [['Transformations non totales et équilibre dynamique', 10], ['Quotient de réaction Qr', 11], ['Constante d’équilibre K', 10], ['Taux d’avancement final et évolution spontanée', 9]],
        resume: {
          points: ["À l'équilibre, les deux réactions inverses se poursuivent à la même vitesse : l'équilibre est dynamique.",
            "Le quotient de réaction Qr s'écrit avec les concentrations à un instant donné, dans l'ordre produits/réactifs.",
            "À l'équilibre, Qr,éq = K : la constante ne dépend que de la température.",
            "Le taux d'avancement final τ = x_f/x_max mesure à quel point la transformation est complète."],
          formules: ['Qr = [C]^c·[D]^d / ([A]^a·[B]^b)', 'Qr,éq = K', 'τ = x_f / x_max', 'Qr < K : sens direct'],
          pieges: ["K ne dépend que de la température, jamais des concentrations initiales.",
            "Le taux d'avancement, lui, dépend des conditions initiales et de la dilution.",
            "Les solides et le solvant n'interviennent pas dans l'expression de Qr."]
        },
        qcm: [
          q('À l’équilibre, le quotient de réaction est égal :', ['à la constante d’équilibre K', 'à 0', 'à 1'], 0, "Par définition, Qr,éq = K : c'est le critère d'équilibre du système."),
          q('Si Qr < K, le système évolue :', ['dans le sens direct', 'dans le sens inverse', 'il n’évolue pas'], 0, "Le système évolue toujours de manière à faire tendre Qr vers K : ici Qr doit augmenter, donc les produits se forment."),
          q('La constante d’équilibre K dépend :', ['de la température', 'des concentrations initiales', 'du volume de la solution'], 0, "K est une caractéristique de la réaction à une température donnée ; les conditions initiales n'influencent que le taux d'avancement.")
        ],
        tp: { objectifs: ['Calculer un quotient de réaction', 'Prévoir le sens d’évolution d’un système'],
          exercices: ['1. Écrire l’expression de Qr pour CH₃COOH + H₂O ⇌ CH₃COO⁻ + H₃O⁺.',
            '2. Une solution d’acide éthanoïque à 10⁻² mol·L⁻¹ a un pH de 3,4. Calculer le taux d’avancement final.',
            '3. En déduire la constante d’acidité K_A.'],
          corrige: ['1. Qr = [CH₃COO⁻]·[H₃O⁺]/[CH₃COOH] (l’eau, solvant, n’apparaît pas).',
            '2. [H₃O⁺] = 10^{−3,4} = 4,0×10⁻⁴ mol·L⁻¹ ; τ = 4,0×10⁻⁴/10⁻² = 0,04, soit 4 % : la transformation est très limitée.',
            '3. K_A = (4,0×10⁻⁴)²/(10⁻² − 4,0×10⁻⁴) ≈ 1,7×10⁻⁵, soit pK_A ≈ 4,8.'] } },

      { titre: 'Réactions acide-base et pH', duree: 43, difficulte: 'Moyen',
        accroche: "Couples acide/base, produit ionique de l'eau et forces relatives des acides.",
        notions: ['Théorie de Brønsted', 'Produit ionique de l’eau', 'pH et concentration', 'Constante d’acidité K_A'],
        seances: [['Acides et bases selon Brønsted', 10], ['Produit ionique de l’eau et échelle de pH', 11], ['Constante d’acidité et pK_A', 12], ['Diagramme de prédominance', 10]],
        resume: {
          points: ["Un acide cède un proton H⁺, une base le capte : ils forment un couple AH/A⁻.",
            "À 25 °C, K_e = [H₃O⁺]·[HO⁻] = 10⁻¹⁴ : le pH de l'eau pure vaut 7.",
            "pH = −log[H₃O⁺] : une unité de pH correspond à un facteur 10 sur la concentration.",
            "Le diagramme de prédominance se construit autour du pK_A : AH prédomine si pH < pK_A."],
          formules: ['pH = −log[H₃O⁺]', 'K_e = 10⁻¹⁴ à 25 °C', 'K_A = [A⁻][H₃O⁺]/[AH]', 'pH = pK_A + log([A⁻]/[AH])'],
          pieges: ["Plus le pK_A est petit, plus l'acide est fort : la relation est inversée.",
            "Un acide fort est totalement dissocié : sa constante d'acidité n'a pas de sens dans l'eau.",
            "Le pH de neutralité vaut 7 uniquement à 25 °C."]
        },
        qcm: [
          q('Selon Brønsted, un acide est une espèce qui :', ['cède un proton H⁺', 'capte un proton H⁺', 'cède un électron'], 0, "La définition de Brønsted repose sur l'échange de protons ; l'échange d'électrons relève de l'oxydoréduction."),
          q('Pour un couple acide/base, on a pH = pK_A lorsque :', ['[A⁻] = [AH]', '[A⁻] > [AH]', 'la solution est neutre'], 0, "D'après pH = pK_A + log([A⁻]/[AH]), l'égalité des concentrations annule le logarithme."),
          q('À 25 °C, le produit ionique de l’eau vaut :', ['10⁻¹⁴', '10⁻⁷', '14'], 0, "K_e = [H₃O⁺]·[HO⁻] = 10⁻¹⁴ ; 10⁻⁷ mol·L⁻¹ est la concentration de chaque ion dans l'eau pure.")
        ],
        tp: { objectifs: ['Relier pH et concentration', 'Comparer la force de deux acides'],
          exercices: ['1. Calculer le pH d’une solution d’acide chlorhydrique à 5,0×10⁻³ mol·L⁻¹.',
            '2. Une solution d’acide méthanoïque de même concentration a un pH de 3,0. Cet acide est-il fort ou faible ?',
            '3. Classer les couples de pK_A 3,8 et 4,8 par acidité décroissante.'],
          corrige: ['1. Acide fort totalement dissocié : [H₃O⁺] = 5,0×10⁻³ donc pH = 2,3.',
            "2. Un acide fort donnerait pH = 2,3 ; le pH mesuré est supérieur, donc l'acide n'est que partiellement dissocié : il est faible.",
            '3. Plus le pK_A est faible, plus l’acide est fort : celui de pK_A = 3,8 est le plus acide.'] } },

      { titre: 'Le dosage acido-basique', duree: 45, difficulte: 'Difficile',
        accroche: "Déterminer une concentration inconnue par équivalence : mode opératoire et exploitation.",
        notions: ['Réaction de dosage', 'Équivalence', 'Méthode des tangentes', 'Choix de l’indicateur coloré'],
        seances: [['Principe et montage d’un dosage', 11], ['Courbe pH = f(V) et équivalence', 13], ['Méthode des tangentes et point de demi-équivalence', 12], ['Indicateurs colorés et exercices', 9]],
        resume: {
          points: ["Une réaction de dosage doit être totale, rapide et unique.",
            "À l'équivalence, les réactifs ont été mélangés dans les proportions stœchiométriques : C_A·V_A = C_B·V_B (dosage 1:1).",
            "Le point de demi-équivalence donne directement pH = pK_A pour un acide faible.",
            "L'indicateur coloré est choisi de sorte que sa zone de virage encadre le pH à l'équivalence."],
          formules: ['C_A·V_A = C_B·V_B', 'À la demi-équivalence : pH = pK_A', 'Acide faible + base forte : pH_éq > 7', 'Acide fort + base forte : pH_éq = 7'],
          pieges: ["Le pH à l'équivalence ne vaut 7 que pour un dosage acide fort/base forte.",
            "Ne pas confondre équivalence (stœchiométrie) et neutralité (pH = 7).",
            "Rincer la burette avec la solution titrante, jamais avec de l'eau distillée."]
        },
        qcm: [
          q('À l’équivalence d’un dosage :', ['les réactifs ont été mélangés dans les proportions stœchiométriques', 'l’acide est toujours en excès', 'le pH vaut systématiquement 7'], 0, "C'est la définition de l'équivalence ; le pH à l'équivalence dépend de la nature des réactifs."),
          q('Le dosage d’un acide faible par une base forte donne à l’équivalence un pH :', ['supérieur à 7', 'égal à 7', 'inférieur à 7'], 0, "La base conjuguée formée réagit avec l'eau : la solution obtenue est basique."),
          q('La méthode des tangentes sert à :', ['déterminer le volume équivalent', 'mesurer la conductivité', 'calculer la constante d’équilibre'], 0, "Deux tangentes parallèles de part et d'autre du saut de pH encadrent le point d'équivalence.")
        ],
        tp: { objectifs: ['Exploiter une courbe de dosage', 'Déterminer une concentration inconnue'],
          exercices: ["1. On dose V_A = 20,0 mL d'acide éthanoïque par une solution de soude à 0,10 mol·L⁻¹. Le volume équivalent est V_E = 12,0 mL. Calculer C_A.",
            '2. À la demi-équivalence, le pH vaut 4,8. Que peut-on en déduire ?',
            '3. Parmi le bleu de bromothymol (6,0–7,6) et la phénolphtaléine (8,2–10,0), quel indicateur choisir si pH_éq ≈ 8,7 ?'],
          corrige: ['1. C_A = C_B·V_E/V_A = 0,10 × 12,0/20,0 = 6,0×10⁻² mol·L⁻¹.',
            '2. À la demi-équivalence pH = pK_A, donc pK_A = 4,8 : il s’agit bien du couple CH₃COOH/CH₃COO⁻.',
            '3. La phénolphtaléine, dont la zone de virage encadre le pH à l’équivalence.'] } },

      { titre: 'Les piles et les transformations spontanées', duree: 41, difficulte: 'Moyen',
        accroche: "Convertir une transformation d'oxydoréduction spontanée en énergie électrique.",
        notions: ['Oxydoréduction', 'Constitution d’une pile', 'Sens du courant', 'Quantité d’électricité'],
        seances: [['Couples oxydant/réducteur et demi-équations', 11], ['Constitution et fonctionnement d’une pile', 12], ['Sens d’évolution et force électromotrice', 10], ['Capacité d’une pile et exercices', 8]],
        resume: {
          points: ["Une pile est constituée de deux demi-piles reliées par un pont salin, siège d'une transformation spontanée.",
            "L'oxydation a lieu à l'anode, pôle négatif ; la réduction à la cathode, pôle positif.",
            "À l'intérieur de la pile, le courant circule du pôle − vers le pôle + ; dans le circuit extérieur, c'est l'inverse.",
            "La pile s'use lorsque le système atteint l'équilibre : Qr = K."],
          formules: ['Q = I·Δt', 'Q = n(e⁻)·F', 'F = 96 500 C·mol⁻¹', 'Qr,i < K : évolution spontanée directe'],
          pieges: ["Confondre le sens du courant et le sens de déplacement des électrons, qui est opposé.",
            "L'anode est le pôle négatif dans une pile, mais le pôle positif dans une électrolyse.",
            "Ne pas oublier le facteur du nombre d'électrons échangés dans Q = n(e⁻)·F."]
        },
        qcm: [
          q('Dans une pile, l’oxydation se produit :', ['à l’anode, pôle négatif', 'à la cathode, pôle positif', 'dans le pont salin'], 0, "L'oxydation libère des électrons : l'électrode où elle se produit devient le pôle négatif de la pile."),
          q('Le pont salin sert :', ['à assurer la neutralité électrique des solutions', 'à produire le courant', 'à isoler les deux électrodes'], 0, "Il ferme le circuit en laissant migrer les ions, ce qui compense les charges créées de part et d'autre."),
          q('La quantité d’électricité débitée par une pile vaut :', ['Q = I·Δt', 'Q = I/Δt', 'Q = U·I'], 0, "Q = I·Δt en coulombs ; U·I est une puissance, pas une charge.")
        ],
        tp: { objectifs: ['Écrire les demi-équations d’une pile', 'Calculer la capacité d’une pile'],
          exercices: ['1. Écrire les demi-équations et l’équation-bilan de la pile Daniell (Zn/Zn²⁺ et Cu²⁺/Cu).',
            '2. Cette pile débite 50 mA pendant 2,0 h. Calculer la quantité d’électricité.',
            '3. En déduire la masse de zinc consommée (M = 65,4 g·mol⁻¹).'],
          corrige: ['1. Zn → Zn²⁺ + 2e⁻ (anode) ; Cu²⁺ + 2e⁻ → Cu (cathode) ; bilan : Zn + Cu²⁺ → Zn²⁺ + Cu.',
            '2. Q = 0,050 × 7 200 = 360 C.',
            '3. n(e⁻) = 360/96 500 = 3,7×10⁻³ mol, donc n(Zn) = 1,9×10⁻³ mol et m = 0,12 g.'] } },

      { titre: 'L’électrolyse et les transformations forcées', duree: 38, difficulte: 'Moyen',
        accroche: "Imposer à un système d'évoluer dans le sens inverse de son évolution spontanée.",
        notions: ['Transformation forcée', 'Anode et cathode', 'Loi de Faraday', 'Applications industrielles'],
        seances: [['Principe de l’électrolyse', 10], ['Réactions aux électrodes', 11], ['Aspect quantitatif : loi de Faraday', 10], ['Applications : galvanoplastie, accumulateurs', 7]],
        resume: {
          points: ["Une électrolyse impose au système d'évoluer dans le sens inverse du sens spontané : elle nécessite un générateur.",
            "La cathode est reliée au pôle − du générateur : elle est le siège de la réduction.",
            "L'anode est reliée au pôle + : elle est le siège de l'oxydation.",
            "La masse déposée se calcule à partir de la quantité d'électricité et de la constante de Faraday."],
          formules: ['Q = I·Δt = n(e⁻)·F', 'm = (M·I·Δt)/(n·F)', 'F = 96 500 C·mol⁻¹', 'Qr,i > K : transformation forcée'],
          pieges: ["Anode et cathode changent de polarité entre pile et électrolyse : mémoriser par la nature de la réaction, pas par le signe.",
            "Convertir la durée en secondes avant d'appliquer Q = I·Δt.",
            "Ne pas oublier le nombre d'électrons échangés au dénominateur."]
        },
        qcm: [
          q('Une électrolyse est une transformation :', ['forcée', 'spontanée', 'impossible'], 0, "Le générateur impose le sens d'évolution : le système s'éloigne de l'équilibre au lieu d'y tendre."),
          q('Lors d’une électrolyse, la réduction se produit :', ['à la cathode, reliée au pôle − du générateur', 'à l’anode, reliée au pôle −', 'dans l’électrolyte'], 0, "La cathode est toujours le siège de la réduction, quelle que soit sa polarité."),
          q('La masse déposée lors d’une électrolyse se calcule à partir :', ['de la constante de Faraday F = 96 500 C·mol⁻¹', 'de la seule constante d’Avogadro', 'de la masse volumique de l’électrolyte'], 0, "F est la charge d'une mole d'électrons : elle relie la quantité d'électricité à la quantité de matière.")
        ],
        tp: { objectifs: ['Identifier les réactions aux électrodes', 'Appliquer la loi de Faraday'],
          exercices: ['1. On électrolyse une solution de sulfate de cuivre entre deux électrodes de graphite. Écrire les réactions aux électrodes.',
            '2. Un courant de 1,5 A circule pendant 30 min. Calculer la masse de cuivre déposée (M = 63,5 g·mol⁻¹).',
            '3. Citer une application industrielle de l’électrolyse.'],
          corrige: ['1. Cathode : Cu²⁺ + 2e⁻ → Cu ; anode : 2H₂O → O₂ + 4H⁺ + 4e⁻.',
            '2. Q = 1,5 × 1 800 = 2 700 C ; n(e⁻) = 0,028 mol ; n(Cu) = 0,014 mol ; m ≈ 0,89 g.',
            '3. Galvanoplastie (dépôt protecteur de chrome ou de nickel), production d’aluminium, recharge des accumulateurs.'] } }
    ]
  });

  /* ================================ SVT ================================= */
  M.push({
    id: 'svt', nom: 'Sciences de la vie et de la Terre', court: 'SVT', prof: 'Mme Idrissi',
    coef: 5, teinte: '#2e9e4f', teinte2: '#0f8f7a', glyphe: '🧬',
    labelFormules: 'Repères à retenir',
    chapitres: [
      { titre: 'Les enzymes et la digestion', duree: 39, difficulte: 'Facile',
        accroche: "Des catalyseurs biologiques d'une extraordinaire spécificité.",
        notions: ['Nature protéique', 'Site actif', 'Spécificité', 'Conditions optimales'],
        seances: [['Nature et rôle des enzymes', 10], ['Site actif et complexe enzyme-substrat', 12], ['Double spécificité', 9], ['Facteurs influençant l’activité enzymatique', 8]],
        resume: {
          points: ["Une enzyme est un catalyseur biologique de nature protéique : elle accélère une réaction sans être consommée.",
            "Le site actif comprend un site de reconnaissance et un site catalytique.",
            "La double spécificité est de substrat et d'action : chaque enzyme reconnaît un substrat et catalyse un type de réaction.",
            "L'activité dépend du pH et de la température : au-delà de l'optimum, l'enzyme se dénature."],
          formules: ['Complexe : E + S ⇌ ES → E + P', 'Spécificité de substrat et d’action', 'Dénaturation irréversible par la chaleur', 'Amylase, pepsine, trypsine : enzymes digestives'],
          pieges: ["Une enzyme dénaturée ne retrouve pas son activité : la perte de conformation est irréversible.",
            "L'enzyme n'est pas consommée : une petite quantité suffit à transformer beaucoup de substrat.",
            "Ne pas confondre spécificité de substrat et spécificité d'action."]
        },
        qcm: [
          q('Une enzyme est :', ['un catalyseur biologique de nature protéique', 'un glucide de réserve', 'une hormone'], 0, "Les enzymes sont des protéines dont la conformation tridimensionnelle crée le site actif."),
          q('La spécificité d’action d’une enzyme est liée :', ['à la structure de son site actif', 'à sa masse moléculaire', 'à la température du milieu'], 0, "La complémentarité géométrique et chimique entre le site actif et le substrat explique la spécificité."),
          q('L’activité enzymatique est maximale :', ['à un pH et une température optimaux', 'à 0 °C', 'à pH 14'], 0, "Chaque enzyme possède un optimum ; au-delà, la structure se dénature et l'activité chute.")
        ],
        tp: { objectifs: ['Interpréter une courbe d’activité enzymatique', 'Mettre en évidence la spécificité'],
          exercices: ['1. On mesure l’activité de l’amylase à différentes températures. Interpréter la chute observée au-delà de 40 °C.',
            '2. L’amylase agit-elle sur les protéines ? Justifier.',
            '3. Proposer un protocole pour montrer que l’enzyme n’est pas consommée.'],
          corrige: ["1. Au-delà de l'optimum, les liaisons stabilisant la structure spatiale se rompent : le site actif se déforme, l'enzyme est dénaturée.",
            '2. Non : la spécificité de substrat fait que l’amylase ne reconnaît que l’amidon.',
            '3. Ajouter successivement plusieurs doses de substrat sans renouveler l’enzyme : la transformation se poursuit à chaque fois.'] } },

      { titre: 'Respiration, fermentation et production d’ATP', duree: 47, difficulte: 'Moyen',
        accroche: "Comment la cellule extrait l'énergie de la matière organique, avec ou sans dioxygène.",
        notions: ['Glycolyse', 'Cycle de Krebs', 'Chaîne respiratoire', 'Fermentations'],
        seances: [['La glycolyse dans le hyaloplasme', 12], ['Cycle de Krebs et matrice mitochondriale', 13], ['Chaîne respiratoire et phosphorylation oxydative', 12], ['Fermentations lactique et alcoolique', 10]],
        resume: {
          points: ["La glycolyse se déroule dans le hyaloplasme et produit 2 pyruvates et 2 ATP par glucose.",
            "En aérobie, le pyruvate entre dans la mitochondrie : cycle de Krebs puis chaîne respiratoire.",
            "Le bilan de la respiration est d'environ 36 à 38 ATP par molécule de glucose.",
            "En anaérobie, la fermentation ne produit que 2 ATP : le rendement est très faible."],
          formules: ['Respiration : C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O', 'Bilan ≈ 36–38 ATP', 'Fermentation : 2 ATP', 'ATP = adénosine triphosphate'],
          pieges: ["La glycolyse est commune à la respiration et à la fermentation : elle n'a pas besoin de dioxygène.",
            "Le dioxygène intervient en fin de chaîne respiratoire, comme accepteur final d'électrons.",
            "Ne pas confondre fermentation lactique (muscle, bactéries lactiques) et alcoolique (levures)."]
        },
        qcm: [
          q('La glycolyse se déroule dans :', ['le hyaloplasme (cytoplasme)', 'la matrice mitochondriale', 'le noyau'], 0, "C'est une étape cytoplasmique commune à la respiration et aux fermentations."),
          q('Le bilan énergétique de la respiration d’une molécule de glucose est d’environ :', ['36 à 38 ATP', '2 ATP', '100 ATP'], 0, "La chaîne respiratoire produit l'essentiel de l'ATP ; la glycolyse seule n'en fournit que 2."),
          q('La fermentation lactique se produit :', ['en absence de dioxygène', 'uniquement en présence de dioxygène', 'dans la matrice mitochondriale'], 0, "C'est une voie anaérobie : le pyruvate est réduit en lactate faute d'accepteur final d'électrons.")
        ],
        tp: { objectifs: ['Comparer respiration et fermentation', 'Exploiter des données expérimentales'],
          exercices: ['1. Comparer les rendements énergétiques de la respiration et de la fermentation.',
            '2. Expliquer l’accumulation d’acide lactique dans un muscle lors d’un effort intense.',
            '3. Localiser chaque étape de la respiration dans la cellule.'],
          corrige: ['1. 36–38 ATP contre 2 ATP : la respiration est près de 18 fois plus rentable.',
            "2. L'apport de dioxygène devient insuffisant : la cellule bascule en fermentation lactique, plus rapide mais peu rentable, et le lactate s'accumule.",
            '3. Glycolyse : hyaloplasme ; cycle de Krebs : matrice mitochondriale ; chaîne respiratoire : membrane interne (crêtes).'] } },

      { titre: 'Le muscle strié squelettique', duree: 38, difficulte: 'Moyen',
        accroche: "Du sarcomère au mouvement : la mécanique moléculaire de la contraction.",
        notions: ['Structure du muscle', 'Sarcomère', 'Glissement des filaments', 'Régénération de l’ATP'],
        seances: [['Organisation du muscle strié', 10], ['Le sarcomère, unité contractile', 11], ['Mécanisme de glissement actine-myosine', 10], ['Sources d’ATP du muscle', 7]],
        resume: {
          points: ["Le muscle est organisé en faisceaux, fibres, myofibrilles, puis sarcomères.",
            "Le sarcomère est l'unité contractile, délimitée par deux stries Z.",
            "La contraction résulte du glissement des filaments d'actine sur ceux de myosine : les filaments ne se raccourcissent pas.",
            "Trois voies régénèrent l'ATP : la phosphocréatine, la fermentation lactique, la respiration."],
          formules: ['Phosphocréatine + ADP → créatine + ATP', 'Voie anaérobie alactique : très rapide', 'Voie anaérobie lactique : effort intense', 'Voie aérobie : effort d’endurance'],
          pieges: ["Les filaments ne se raccourcissent pas : c'est leur chevauchement qui augmente.",
            "L'ATP est indispensable aussi pour le relâchement, pas seulement pour la contraction.",
            "Ne pas confondre sarcomère (unité contractile) et sarcolemme (membrane de la fibre)."]
        },
        qcm: [
          q('L’unité contractile du muscle strié est :', ['le sarcomère', 'le sarcolemme', 'la fibre musculaire entière'], 0, "Le sarcomère, compris entre deux stries Z, est la plus petite unité capable de se contracter."),
          q('La contraction musculaire résulte :', ['du glissement des filaments d’actine sur ceux de myosine', 'du raccourcissement des filaments eux-mêmes', 'du gonflement des fibres'], 0, "Les têtes de myosine tirent les filaments d'actine : la longueur des filaments reste constante."),
          q('La régénération la plus rapide de l’ATP dans le muscle fait intervenir :', ['la phosphocréatine', 'l’urée', 'le glycogène hépatique uniquement'], 0, "La voie anaérobie alactique mobilise la phosphocréatine dès les premières secondes de l'effort.")
        ],
        tp: { objectifs: ['Relier structure et fonction du muscle', 'Comparer les voies de régénération de l’ATP'],
          exercices: ['1. Légender un schéma de sarcomère (stries Z, bande claire, bande sombre).',
            '2. Expliquer pourquoi la bande claire se raccourcit lors de la contraction alors que les filaments gardent leur longueur.',
            '3. Associer chaque voie de régénération de l’ATP à un type d’effort.'],
          corrige: ['1. Le sarcomère va d’une strie Z à la suivante ; la bande claire ne contient que de l’actine, la bande sombre contient la myosine.',
            '2. Les filaments d’actine coulissent vers le centre du sarcomère : la zone où seule l’actine est présente diminue.',
            '3. Phosphocréatine : sprint (quelques secondes) ; fermentation lactique : effort intense de 30 s à 2 min ; respiration : endurance.'] } },

      { titre: 'L’ADN, support de l’information génétique', duree: 42, difficulte: 'Moyen',
        accroche: "Structure de la molécule et expériences historiques qui ont prouvé son rôle.",
        notions: ['Nucléotides', 'Double hélice', 'Complémentarité des bases', 'Expériences historiques'],
        seances: [['Expériences de Griffith et Avery', 11], ['Structure du nucléotide et de la double hélice', 12], ['Complémentarité des bases', 10], ['Universalité du code génétique', 9]],
        resume: {
          points: ["Un nucléotide associe un désoxyribose, un groupement phosphate et une base azotée.",
            "L'ADN est une double hélice de deux brins antiparallèles et complémentaires.",
            "Complémentarité : A avec T (2 liaisons hydrogène), G avec C (3 liaisons).",
            "Griffith puis Avery ont démontré que la molécule porteuse de l'information est l'ADN, non les protéines."],
          formules: ['A–T et G–C', 'Brins antiparallèles 5’→3’ et 3’→5’', 'Séquence des bases = information génétique', 'Code génétique universel'],
          pieges: ["Le sucre de l'ADN est le désoxyribose ; celui de l'ARN est le ribose.",
            "L'ARN contient l'uracile à la place de la thymine.",
            "Ne pas confondre gène (portion d'ADN) et chromosome (molécule d'ADN associée à des protéines)."]
        },
        qcm: [
          q('Un nucléotide d’ADN est constitué :', ['d’un désoxyribose, d’un phosphate et d’une base azotée', 'd’un ribose et d’un acide aminé', 'de deux bases azotées'], 0, "Ces trois éléments forment l'unité de base du polymère d'ADN."),
          q('Dans l’ADN, l’adénine s’apparie avec :', ['la thymine', 'la cytosine', 'la guanine'], 0, "A–T par deux liaisons hydrogène, G–C par trois : c'est la règle de complémentarité de Chargaff."),
          q('Les expériences de Griffith et Avery ont montré :', ['que l’ADN est le support de l’information génétique', 'que les protéines portent l’information', 'que l’ARN est le support héréditaire'], 0, "La transformation bactérienne persiste après destruction des protéines, mais disparaît si l'ADN est détruit.")
        ],
        tp: { objectifs: ['Exploiter les expériences historiques', 'Utiliser la complémentarité des bases'],
          exercices: ['1. Un brin d’ADN a pour séquence 5’-ATGCCTAG-3’. Écrire le brin complémentaire.',
            '2. Un ADN contient 22 % d’adénine. Calculer le pourcentage de chaque base.',
            '3. Expliquer en quoi l’expérience d’Avery complète celle de Griffith.'],
          corrige: ['1. 3’-TACGGATC-5’.',
            '2. A = T = 22 % donc G = C = (100 − 44)/2 = 28 %.',
            "3. Griffith montre l'existence d'un principe transformant ; Avery l'identifie en détruisant sélectivement chaque catégorie de molécules."] } },

      { titre: 'Réplication et synthèse des protéines', duree: 49, difficulte: 'Difficile',
        accroche: "De la copie fidèle de l'ADN à la fabrication d'une protéine : transcription et traduction.",
        notions: ['Réplication semi-conservative', 'Transcription', 'Code génétique', 'Traduction'],
        seances: [['La réplication semi-conservative', 12], ['La transcription et l’ARN messager', 13], ['Le code génétique et les codons', 12], ['La traduction au niveau des ribosomes', 12]],
        resume: {
          points: ["La réplication est semi-conservative : chaque molécule fille contient un brin ancien et un brin néoformé.",
            "La transcription, nucléaire, produit un ARN messager complémentaire du brin transcrit.",
            "Le code génétique associe un codon (3 nucléotides) à un acide aminé : il est universel et redondant.",
            "La traduction s'effectue dans le cytoplasme, au niveau des ribosomes, avec l'aide des ARN de transfert."],
          formules: ['ADN → ARNm → protéine', '1 codon = 3 nucléotides', '64 codons pour 20 acides aminés', 'Codon initiateur AUG ; codons stop UAA, UAG, UGA'],
          pieges: ["Le code est redondant mais non ambigu : un codon ne code jamais deux acides aminés différents.",
            "La transcription a lieu dans le noyau, la traduction dans le cytoplasme.",
            "Ne pas confondre brin transcrit et brin non transcrit : l'ARNm a la séquence du brin non transcrit (avec U)."]
        },
        qcm: [
          q('La réplication de l’ADN est dite :', ['semi-conservative', 'conservative', 'dispersive'], 0, "L'expérience de Meselson et Stahl a montré que chaque molécule fille conserve un brin parental."),
          q('La traduction se déroule :', ['au niveau des ribosomes, dans le cytoplasme', 'dans le noyau', 'exclusivement dans la mitochondrie'], 0, "Le ribosome assemble les acides aminés apportés par les ARNt selon la séquence de l'ARNm."),
          q('Un codon est constitué de :', ['3 nucléotides', '2 nucléotides', '1 acide aminé'], 0, "Trois nucléotides forment un codon, ce qui donne 4³ = 64 combinaisons possibles.")
        ],
        tp: { objectifs: ['Transcrire et traduire une séquence', 'Comprendre l’effet d’une mutation'],
          exercices: ['1. Le brin transcrit est 3’-TACGGCTTA-5’. Écrire l’ARNm correspondant.',
            '2. À l’aide du code génétique, indiquer combien d’acides aminés sont codés.',
            '3. Une substitution remplace le second nucléotide par A. Discuter les conséquences possibles.'],
          corrige: ['1. ARNm : 5’-AUGCCGAAU-3’.',
            '2. Trois codons donc trois acides aminés, dont la méthionine initiatrice codée par AUG.',
            "3. Selon le codon obtenu, la mutation peut être silencieuse (même acide aminé), faux-sens (acide aminé différent) ou non-sens (codon stop, protéine tronquée)."] } },

      { titre: 'La transmission de l’information génétique', duree: 51, difficulte: 'Difficile',
        accroche: "Les lois de Mendel : du croisement expérimental à la prévision des proportions.",
        notions: ['Monohybridisme', 'Dihybridisme', 'Dominance et récessivité', 'Test-cross'],
        seances: [['Vocabulaire : gène, allèle, génotype, phénotype', 12], ['Monohybridisme et lois de Mendel', 13], ['Dihybridisme et brassage', 14], ['Test-cross et échiquier de croisement', 12]],
        resume: {
          points: ["Le croisement de deux lignées pures donne une F1 homogène : c'est la loi d'uniformité des hybrides.",
            "En F2, le monohybridisme avec dominance donne 3/4 – 1/4 ; sans dominance, 1/4 – 1/2 – 1/4.",
            "Le dihybridisme avec gènes indépendants donne 9/3/3/1 en F2.",
            "Le test-cross croise l'individu de génotype inconnu avec un homozygote récessif."],
          formules: ['F1 uniforme (1ʳᵉ loi)', 'F2 : 3/4 – 1/4 (dominance)', 'F2 : 9/3/3/1 (dihybridisme)', 'Test-cross : 1/1 ou 1/1/1/1'],
          pieges: ["Le phénotype se note entre crochets, le génotype avec les allèles.",
            "Une F2 en 1/1/1/1 après test-cross indique des gènes indépendants ; des proportions inégales indiquent une liaison.",
            "Ne pas confondre homozygote (deux allèles identiques) et hybride (hétérozygote)."]
        },
        qcm: [
          q('Le croisement de deux lignées pures différant par un caractère donne en F1 :', ['des individus hybrides tous identiques', 'une ségrégation 3/4 – 1/4', 'deux phénotypes en proportions égales'], 0, "C'est la première loi de Mendel, dite loi d'uniformité des hybrides de première génération."),
          q('En F2, un monohybridisme sans dominance complète donne les proportions :', ['1/4 – 1/2 – 1/4', '3/4 – 1/4', '9/3/3/1'], 0, "L'hétérozygote présentant un phénotype intermédiaire devient distinguable, d'où trois phénotypes."),
          q('Le test-cross consiste à croiser l’individu étudié avec :', ['un homozygote récessif', 'un homozygote dominant', 'un hétérozygote'], 0, "L'homozygote récessif ne transmet que des allèles récessifs : la descendance révèle directement les gamètes du parent testé.")
        ],
        tp: { objectifs: ['Construire un échiquier de croisement', 'Interpréter des proportions expérimentales'],
          exercices: ['1. Chez le pois, la couleur jaune (J) domine la verte (j). Croiser deux hétérozygotes et donner les proportions en F2.',
            '2. Un test-cross donne 50 % de jaunes et 50 % de verts. Quel est le génotype du parent testé ?',
            '3. Un dihybridisme donne en F2 les proportions 9/3/3/1. Que peut-on conclure sur les deux gènes ?'],
          corrige: ['1. Jj × Jj → 1 JJ, 2 Jj, 1 jj, soit 3/4 de jaunes et 1/4 de verts.',
            '2. Il est hétérozygote Jj : il produit deux types de gamètes en proportions égales.',
            '3. Les deux gènes sont indépendants, portés par des paires de chromosomes différentes.'] } }
    ]
  });
})();
