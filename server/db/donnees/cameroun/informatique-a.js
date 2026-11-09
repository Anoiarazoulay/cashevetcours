/* CASHEVENT SCHOOL — Informatique · Terminale A (A4)
   Contenu établi à partir de la partie informatique du recueil « Infos, Sciences
   Bac A4 » : évaluations corrigées, épreuves de 2021 à 2025 et sujet de 2026.
   Le coefficient 2 est celui des évaluations du livre. L'énoncé de septembre 2026
   n'y figure pas. Les erreurs du livre sont corrigées ici.                     */
(() => {
  const { M, q } = window.ECOLE;

  M.push({
    id: 'informatique-a', nom: 'Informatique', court: 'Informatique', prof: 'Groupe Excellence — Base des cours, Bafoussam',
    coef: 2, teinte: '#3a6ea5', teinte2: '#0b7a75', glyphe: '💻',
    labelFormules: 'Formules et repères à retenir',
    series: ['A'],
    chapitres: [

      /* ------------------------------------------------------------------ */
      { titre: `Texteur et tableur : produire des contenus numériques`, duree: 50, difficulte: 'Moyen',
        accroche: `La partie I de l'épreuve : définitions, procédures Word et formules Excel.`,
        notions: ['Texteur', 'Tableur', 'Cellule, plage', 'SOMME, MOYENNE, RANG', 'NB.SI', 'Procédures'],
        seances: [[`Texteur : procédures utiles`, 15], [`Tableur : vocabulaire`, 10], [`Écrire les formules`, 18], [`Graphique et recopie`, 7]],
        resume: {
          points: [`Un <b>texteur</b> traite du texte (MS Word, Writer, AbiWord, Google Docs). Un <b>tableur</b> automatise des calculs dans des feuilles (MS Excel, Calc, Lotus 1-2-3, Google Sheets).`,
            `Fichier du tableur : le <b>classeur</b>. Une <b>feuille de calcul</b> est sa zone de travail ; une <b>cellule</b> est l'intersection d'une ligne et d'une colonne ; une <b>plage</b> est un ensemble de cellules.`,
            `Word : pagination (Insertion → Numéro de page) ; note de bas de page (Références → Insérer une note) ; image (Insertion → Images) ; tableau (Insertion → Tableau, nombre de lignes et de colonnes) ; style (groupe Style).`,
            `Excel : une formule commence par =. La <b>recopie</b> étend une formule. Bordures : Accueil → Bordures. Histogramme : sélectionner les données, Insertion, Histogramme, choisir un modèle.`,
            `Extensions : .docx (Word), .xlsx (Excel), .pub (Publisher), .pptx (PowerPoint).`],
          formules: ['=MOYENNE(B3:D3)', '=(B3+C3+D3)/3', '=SOMME(B3:D3)', '=PRODUIT(B5;F5)', '=NB.SI(D1:D5;"Admis")', '=RANG(E6;$E$6:$E$10)'],
          pieges: [`=MOYENNE(B3;D3) ne prend que B3 et D3 : pour trois notes, écrire B3:D3.`,
            `SOMME donne un total, pas une moyenne.`,
            `RANG classe par défaut dans l'ordre décroissant : la meilleure valeur a le rang 1.`,
            `Figer la plage de RANG avec $ pour pouvoir recopier.`]
        },
        qcm: [
          q(`La moyenne d'Abdoul (12, 14, 12 en B3:D3) s'obtient par :`, ['=SOMME(B3;D3)', '=MOYENNE(B3:D3)', '=MOYENNE(B3;D3)'], 1, `Résultat 38 ÷ 3 ≈ 12,67 (bac 2025). Le point-virgule ne prendrait que deux cellules.`),
          q(`=NB.SI(D1:D5;"Admis") donne 3 signifie :`, ['trois cellules contiennent Admis', 'trois élèves sont classés premiers', 'la moyenne vaut 3'], 0, `NB.SI compte les cellules qui vérifient le critère (bac 2021).`),
          q(`Pour classer les élèves par ordre de mérite :`, ['NB.SI', 'SOMME', 'RANG'], 2, `Sujet 2026.`),
          q(`Une cellule est :`, ['l’intersection d’une ligne et d’une colonne', 'un classeur', 'un onglet'], 0, `Elle a une référence, comme B3.`),
          q(`Lequel est un texteur ?`, ['MS Excel', 'LibreOffice Writer', 'MySQL'], 1, `Excel est un tableur, MySQL un SGBD.`),
          q(`Pour insérer une note de bas de page dans Word :`, ['Insertion → Tableau', 'Fichier → Imprimer', 'Références → Insérer une note de bas de page'], 2, `On sélectionne d'abord le terme concerné.`),
          q(`Dans l'extrait, le titre « Relevé de notes » couvre A1:E1. Cette plage a été :`, ['fusionnée', 'protégée', 'triée'], 0, `Sujet 2025.`)
        ],
        tp: { objectifs: ['Écrire des formules', 'Rédiger une procédure'],
          exercices: [`1. Relevé : Abdoul 12, 14, 12 ; Christine 15, 10, 12 ; Godi 11, 9, 10 en B3:D5. Écrivez la formule de moyenne en E3, puis calculez les trois moyennes.`,
            `2. Donnez la formule du rang de l'élève de la ligne 6 pour des moyennes en E6:E10 et la manière d'obtenir F7 et F8.`,
            `3. Facture : quantité en B5, prix unitaire en F5. Donnez la formule de G5 et celle du net à payer pour G5:G14.`,
            `4. Donnez la procédure pour insérer un tableau dans Word.`],
          corrige: [`1. E3 : =MOYENNE(B3:D3). Abdoul 38 ÷ 3 ≈ 12,67 ; Christine 37 ÷ 3 ≈ 12,33 ; Godi 30 ÷ 3 = 10.`,
            `2. F6 : =RANG(E6;$E$6:$E$10), puis recopie vers le bas.`,
            `3. G5 : =PRODUIT(B5;F5). Net à payer : =SOMME(G5:G14).`,
            `4. Cliquer à l'endroit voulu, Insertion → Tableau, choisir lignes et colonnes, valider.`] } },

      /* ------------------------------------------------------------------ */
      { titre: `Le système informatique : matériel et logiciels`, duree: 40, difficulte: 'Facile',
        accroche: `Fiche technique, composants et logiciels : des points sûrs avec un vocabulaire précis.`,
        notions: ['Types de systèmes', 'Composants', 'Périphériques', 'Système d’exploitation', 'Pilote', 'Antivirus'],
        seances: [[`Définition et types`, 10], [`Composants et caractéristiques`, 15], [`Logiciels`, 15]],
        resume: {
          points: [`Un <b>système informatique</b> est un ensemble de moyens informatiques et de télécommunications, matériels et logiciels, qui collecte, traite, stocke, achemine et présente des données.`,
            `Types : <b>personnel</b> (maison), <b>d'organisation</b> (entreprise, école), <b>contrôle et commande</b>.`,
            `Composants : <b>processeur</b> (exécute les instructions ; fréquence, cœurs, marque), <b>RAM</b> (données en cours ; capacité), <b>disque dur</b> (stockage durable ; capacité, vitesse), <b>carte mère</b>, <b>bloc d'alimentation</b>. Un <b>périphérique</b> est un équipement connecté à l'unité centrale.`,
            `Le <b>système d'exploitation</b> gère les ressources matérielles et logicielles (Windows, Linux Ubuntu ; Android sur téléphone). Le <b>pilote</b> fait communiquer le SE et le matériel. Un <b>logiciel d'application</b> réalise une tâche précise (Word). L'<b>antivirus</b> protège contre les programmes malveillants.`],
          formules: ['CPU = Central Processing Unit', 'RAM = Random Access Memory', 'HDD = Hard Disk Drive · SSD = Solid-State Drive', 'USB = Universal Serial Bus', 'Entrée → Unité centrale → Sortie, avec stockage'],
          pieges: [`Un logiciel est un ensemble de programmes, pas un matériel.`,
            `Une carte ajoutée à la carte mère est une carte d'extension.`,
            `Une caractéristique est une grandeur : 15,6 pouces, 1 To, 2,40 GHz.`,
            `Une entreprise avec serveurs relève du système d'organisation.`]
        },
        qcm: [
          q(`Sur une fiche, « LINUX UBUNTU 18.04 LTS » désigne :`, ['un antivirus', 'le système d’exploitation', 'le disque dur'], 1, `Bac 2024.`),
          q(`« Kaspersky Internet Security » est :`, ['un antivirus', 'un texteur', 'un SGBD'], 0, `Il protège contre les programmes malveillants.`),
          q(`Pour utiliser une imprimante, on installe :`, ['un tableur', 'un forum', 'le pilote'], 2, `Bac 2025.`),
          q(`HDD SATA 1 To 5400 tr/min : « 1 To » est :`, ['la vitesse', 'la capacité de stockage', 'l’interface'], 1, `SATA est l'interface, 5400 tr/min la vitesse de rotation.`),
          q(`Dans 1366 × 768, on lit :`, ['la définition de l’écran', 'la taille en pouces', 'la fréquence'], 0, `Nombre de pixels.`),
          q(`Android est, pour un téléphone :`, ['un réseau', 'une application de messagerie', 'un système d’exploitation'], 2, `Il permet l'exécution d'applications.`),
          q(`Lorsqu'on éteint l'ordinateur, perd ses informations :`, ['la RAM', 'le disque dur', 'le CD'], 0, `Elle est volatile.`)
        ],
        tp: { objectifs: ['Lire une fiche technique', 'Classer des logiciels'],
          exercices: [`1. Fiche : écran 15,6 pouces 1366 × 768 ; Ubuntu ; CPU Pentium 2,40 GHz ; HDD 1 To 5400 tr/min ; Kaspersky. Identifiez le SE, une caractéristique de l'écran et du disque, et le rôle de Kaspersky.`,
            `2. Dans Windows 10, Office 2016, Kaspersky, relevez un SE et un logiciel d'application.`,
            `3. Donnez une caractéristique du microprocesseur, du disque dur, de la RAM et du graveur DVD.`],
          corrige: [`1. SE : Ubuntu. Écran : 15,6 pouces ou définition 1366 × 768. Disque : capacité 1 To ou 5400 tr/min. Kaspersky protège contre les programmes malveillants.`,
            `2. SE : Windows 10. Application : Office 2016.`,
            `3. Fréquence ; capacité ; capacité ; vitesse d'écriture.`] } },

      /* ------------------------------------------------------------------ */
      { titre: `Protection et maintenance`, duree: 30, difficulte: 'Facile',
        accroche: `Coupures, surtensions, virus : une situation, un risque, une solution.`,
        notions: ['Panne', 'Maintenance préventive', 'Onduleur', 'Régulateur', 'Parasurtenseur', 'Antivirus'],
        seances: [[`Panne et maintenance`, 12], [`Équipements de protection`, 10], [`Protection des données`, 8]],
        resume: {
          points: [`Une <b>panne</b> est l'état anormal d'un système qui l'empêche d'accomplir une fonction requise. La <b>maintenance</b> regroupe entretien, vérification et réparation. Elle est <b>préventive</b> si elle agit avant la panne.`,
            `<b>Onduleur</b> : fournit l'énergie stockée pendant une coupure. <b>Régulateur de tension</b> : stabilise la tension. <b>Parasurtenseur</b> : protège des surtensions.`,
            `Le <b>bloc d'alimentation</b> fournit la tension à la carte mère et aux composants ; une surtension peut l'endommager.`,
            `Données : mots de passe et antivirus. Sans antivirus : fichiers corrompus, perte de données, lenteur, plantages.`],
          formules: ['Coupure → onduleur', 'Fluctuation → régulateur', 'Surtension → parasurtenseur', 'Virus → antivirus'],
          pieges: [`Si un PC ne s'allume plus après des coupures, soupçonner d'abord le bloc d'alimentation.`,
            `Utiliser un onduleur relève de la maintenance préventive, pas curative.`]
        },
        qcm: [
          q(`Des ordinateurs restent allumés huit minutes après une coupure grâce à :`, ['un onduleur', 'un scanner', 'un switch'], 0, `Il restitue l'énergie stockée (bac 2022).`),
          q(`Après coupures et fluctuations, l'ordinateur ne s'allume plus. On soupçonne :`, ['la souris', 'le bloc d’alimentation', 'le clavier'], 1, `Bac 2023.`),
          q(`Contre les fluctuations de tension, on installe :`, ['une webcam', 'un routeur', 'un régulateur de tension'], 2, `Il stabilise la tension.`),
          q(`Agir avant que le matériel ne tombe en panne s'appelle :`, ['maintenance curative', 'maintenance préventive', 'recopie'], 1, `C'est la définition du bac 2023.`),
          q(`Un risque de l'absence d'antivirus est :`, ['la perte de données', 'un écran plus grand', 'une RAM plus rapide'], 0, `On cite aussi fichiers corrompus et lenteur.`),
          q(`Deux techniques de protection des données sont :`, ['fusion et bordures', 'RJ45 et hub', 'mot de passe et antivirus'], 2, `Bac 2021.`)
        ],
        tp: { objectifs: ['Associer situation et protection'],
          exercices: [`1. Dans le LAB2, une surtension a endommagé des blocs d'alimentation. Nommez la maintenance qui l'aurait évité et un équipement adapté.`,
            `2. Citez trois équipements de protection électrique et leur rôle.`,
            `3. Un secrétariat veut assurer la confidentialité. Proposez deux mesures.`],
          corrige: [`1. Maintenance préventive, avec un parasurtenseur ou un régulateur.`,
            `2. Onduleur : relais lors des coupures. Régulateur : tension stable. Parasurtenseur : protection contre les surtensions.`,
            `3. Mots de passe et antivirus.`] } },

      /* ------------------------------------------------------------------ */
      { titre: `Réseaux et adresses IP`, duree: 45, difficulte: 'Moyen',
        accroche: `Lire un schéma de réseau, nommer les équipements et trouver la classe d'une adresse.`,
        notions: ['Réseau', 'LAN, WAN, intranet', 'Switch, routeur', 'Client/serveur', 'Classes IP', 'DHCP, ping'],
        seances: [[`Réseaux et équipements`, 15], [`Architectures`, 8], [`Adresses IP et classes`, 15], [`Statique, dynamique, ping`, 7]],
        resume: {
          points: [`Un <b>réseau informatique</b> est un ensemble d'équipements interconnectés pour communiquer et partager des ressources. Avantages : partage, communication. Inconvénients : vol de données, escroqueries.`,
            `Un <b>intranet</b> est un réseau privé utilisant les technologies d'Internet.`,
            `Équipements : <b>carte réseau</b> (interface entre l'ordinateur et le câble), <b>switch/hub</b> (relie les machines), <b>routeur</b> (relie à d'autres réseaux). Câbles : paire torsadée (RJ45), coaxial (BNC), fibre optique. Sans fil : Wi-Fi.`,
            `Architecture <b>client/serveur</b> : un serveur rend des services aux postes clients.`,
            `Une <b>adresse IP</b> identifie une machine. Adressage <b>statique</b> : manuel, par l'administrateur. <b>Dynamique</b> : automatique, par DHCP.`],
          formules: ['Classe A : 1 à 126 · 255.0.0.0', 'Classe B : 128 à 191 · 255.255.0.0', 'Classe C : 192 à 223 · 255.255.255.0', 'Hôtes en classe C : 2⁸ − 2 = 254', 'DHCP = Dynamic Host Configuration Protocol', 'ping 192.168.0.1'],
          pieges: [`192.55.6.0 est en classe C, pas B. 126.155.15.1 est en classe A.`,
            `Dans 192.55.6.0, la partie hôte vaut 0 : c'est une adresse de réseau, pas de machine.`,
            `Une adresse donnée à la main sur un serveur indique un adressage statique.`]
        },
        qcm: [
          q(`L'adresse 128.100.0.200 est de classe :`, ['A', 'C', 'B'], 2, `128 est entre 128 et 191 (bac 2024).`),
          q(`L'adresse 192.168.0.1 a pour masque :`, ['255.255.255.0', '255.0.0.0', '255.255.0.0'], 0, `Classe C.`),
          q(`Si un serveur DHCP est actif, les PC reçoivent leur adresse par adressage :`, ['statique', 'dynamique', 'physique'], 1, `Automatique.`),
          q(`Un réseau de classe C peut avoir :`, ['254 hôtes', '8 hôtes', '1000 hôtes'], 0, `2⁸ − 2 = 254.`),
          q(`L'administrateur attribue au serveur 10.200.15.1. L'adressage est :`, ['dynamique', 'hybride', 'statique'], 2, `Sujet 2026.`),
          q(`Un intranet avec un serveur et un switch a une architecture :`, ['client/serveur', 'poste à poste', 'en bus'], 0, `Sujet 2026.`),
          q(`Pour tester l'accès au serveur 192.168.0.1 depuis un PC :`, ['format C:', 'ping 192.168.0.1', 'SOMME(192)'], 1, `ping vérifie la communication.`),
          q(`La carte ajoutée qui relie l'ordinateur au câble est :`, ['la carte son', 'la carte vidéo', 'la carte réseau'], 2, `C'est une carte d'extension.`)
        ],
        tp: { objectifs: ['Trouver la classe et le masque', 'Analyser un petit réseau'],
          exercices: [`1. Donnez la classe et le masque de 192.55.6.0 et 126.155.15.1.`,
            `2. Serveur 192.168.0.1 avec DHCP : classe, masque, adresse réseau, nombre d'hôtes.`,
            `3. Listez trois types de câble et leur connecteur.`,
            `4. Comparez adressage statique et dynamique.`],
          corrige: [`1. 192.55.6.0 : classe C, 255.255.255.0. 126.155.15.1 : classe A, 255.0.0.0.`,
            `2. Classe C ; 255.255.255.0 ; 192.168.0.0 ; 254 hôtes.`,
            `3. Coaxial : BNC. Paire torsadée : RJ45. Fibre optique : connecteur optique.`,
            `4. Le statique est réalisé à la main par l'administrateur ; le dynamique est automatique, grâce à DHCP.`] } },

      /* ------------------------------------------------------------------ */
      { titre: `Humanités numériques : communiquer et partager en ligne`, duree: 40, difficulte: 'Facile',
        accroche: `Visioconférence, messagerie, forum, cloud : associer chaque besoin au bon service.`,
        notions: ['Visioconférence', 'Messagerie', 'Forum', 'Cloud', 'Collaboration', 'Réseaux sociaux'],
        seances: [[`Services de communication`, 15], [`Cloud : sauvegarde et partage`, 15], [`Réseaux sociaux et professionnels`, 10]],
        resume: {
          points: [`<b>Visioconférence</b> : réunion à distance par la vidéo et le son (Zoom, Skype, Google Meet). <b>Messagerie instantanée</b> : échanges directs (WhatsApp, Messenger). <b>Messagerie électronique</b> : courriers privés (Gmail, Outlook). <b>Forum</b> : espace public de discussion sur un thème.`,
            `<b>Plateforme de collaboration</b> : espace numérique pour travailler ensemble à distance (Moodle, Microsoft Teams, Google Classroom).`,
            `<b>Cloud computing</b> : stockage et accès à des ressources par Internet (Google Drive, Dropbox, OneDrive). Types : public, privé, hybride, communautaire. Avantages : accès partout, moindre risque de perte. Inconvénients : dépendance à Internet, confidentialité réduite.`,
            `<b>Réseau social</b> : plateforme où l'on crée un profil et interagit (Facebook, Instagram). <b>Réseau professionnel</b> : LinkedIn, Viadeo. La <b>virtualisation</b> réduit les coûts d'infrastructure.`],
          formules: ['Réunion à distance → visioconférence', 'Stocker en ligne → cloud', 'Recrutement → réseau professionnel', 'Travail d’équipe → plateforme de collaboration'],
          pieges: [`Courriel = privé ; forum = public.`,
            `LinkedIn sert au réseau professionnel, pas à la visioconférence.`,
            `Pour échanger en direct, les deux personnes doivent utiliser la même application.`]
        },
        qcm: [
          q(`Soutenir un mémoire en ligne avec un jury dispersé demande :`, ['un forum', 'la visioconférence', 'un tableur'], 1, `On se voit et on dialogue à distance.`),
          q(`Stocker ses données en ligne pour y accéder partout, c'est :`, ['le cloud computing', 'le cheval de Troie', 'le BIOS'], 0, `Exemples : Google Drive, Dropbox.`),
          q(`LinkedIn est :`, ['un SGBD', 'un antivirus', 'un réseau professionnel'], 2, `Viadeo l'est aussi.`),
          q(`Un inconvénient du cloud est :`, ['l’accès partout', 'la dépendance à Internet', 'la sauvegarde'], 1, `Bac 2023.`),
          q(`Google Classroom appartient aux :`, ['plateformes de collaboration', 'tableurs', 'protocoles'], 0, `Aussi Moodle et Teams.`),
          q(`Gmail et Outlook sont des services de :`, ['visioconférence', 'stockage physique', 'messagerie électronique'], 2, `Ils transmettent des courriers.`),
          q(`Tenir chaque lundi une réunion entre trois sites distants demande :`, ['la visioconférence', 'un onduleur', 'la fusion de cellules'], 0, `Bac 2023.`)
        ],
        tp: { objectifs: ['Associer service et exemple', 'Argumenter sur le cloud'],
          exercices: [`1. Associez : Zoom, Gmail, Dropbox, LinkedIn, Snapchat, Google Classroom aux services : visioconférence, messagerie électronique, cloud, réseau professionnel, messagerie instantanée, collaboration.`,
            `2. Expliquez la différence entre messagerie électronique et forum.`,
            `3. Donnez un avantage et un inconvénient de la sauvegarde dans le cloud.`,
            `4. Citez quatre types de cloud.`],
          corrige: [`1. Zoom : visioconférence. Gmail : messagerie électronique. Dropbox : cloud. LinkedIn : réseau professionnel. Snapchat : messagerie instantanée. Google Classroom : collaboration.`,
            `2. La messagerie transmet des courriers privés ; le forum est un espace public de discussion.`,
            `3. Avantage : accès à tout moment. Inconvénient : dépendance à Internet.`,
            `4. Public, privé, hybride, communautaire.`] } },

      /* ------------------------------------------------------------------ */
      { titre: `Le système d'information de l'entreprise`, duree: 30, difficulte: 'Facile',
        accroche: `Repérer dans un texte le pilotage, l'opérant, les ressources et les fonctions du SI.`,
        notions: ['Entreprise', 'Information, donnée', 'Pilotage, opérant', 'Ressources', 'Fonctions du SI'],
        seances: [[`Information et donnée`, 8], [`Les systèmes de l'entreprise`, 12], [`Ressources et fonctions`, 10]],
        resume: {
          points: [`Une <b>entreprise</b> est une unité économique juridiquement autonome qui produit des biens ou des services. Une <b>information</b> est un élément de connaissance ; une <b>donnée</b> en est la représentation conventionnelle.`,
            `Un <b>système d'information</b> est un ensemble organisé de ressources (matériel, logiciel, personnel, données, procédures) qui collecte, stocke, traite et diffuse l'information. Il est <b>automatisé</b> s'il s'appuie sur des outils informatiques.`,
            `Trois systèmes : <b>pilotage</b> (définit les objectifs, décide : directeur, PDG), <b>information</b>, <b>opérant</b> (réalise le travail : ouvriers, agents, enquêteurs).`,
            `Qualités d'une bonne information : fiable, vérifiable, pertinente, précise.`],
          formules: ['Fonctions : collecte · stockage · traitement · diffusion', 'Directeur → pilotage', 'Ouvrier, agent → opérant', 'Générer des moyennes → traitement'],
          pieges: [`Les ressources matérielles sont les machines et ordinateurs, pas les produits vendus : à FRESHLAIT, les jus ne sont pas une ressource du SI.`,
            `Dans un SI automatisé, le verbe « saisir » renvoie à la collecte ou au stockage selon le corrigé ; le livre retient le stockage.`]
        },
        qcm: [
          q(`Dans une microfinance, le Directeur appartient au système :`, ['opérant', 'de pilotage', 'de stockage'], 1, `Il décide (bac 2023).`),
          q(`Des enquêteurs de terrain relèvent du système :`, ['opérant', 'de pilotage', 'd’exploitation'], 0, `Bac 2025.`),
          q(`Générer les moyennes correspond à la fonction de :`, ['diffusion', 'collecte', 'traitement'], 2, `Bac 2024.`),
          q(`Une ressource matérielle du SI de FRESHLAIT est :`, ['MS Access', 'une machine de production ou un ordinateur', 'le jus fabriqué'], 1, `Le jus est le produit. MS Access est une ressource logicielle.`),
          q(`La donnée est :`, ['la représentation conventionnelle d’une information', 'une panne', 'une décision du directeur'], 0, `Bac 2021.`),
          q(`Un SI automatisé utilise :`, ['seulement du papier', 'seulement des clients', 'des outils informatiques'], 2, `Bac 2023 et 2024.`)
        ],
        tp: { objectifs: ['Analyser un texte d’entreprise'],
          exercices: [`1. FRESHLAIT : un directeur, des ouvriers, une base MS Access du personnel. Donnez un élément du pilotage, de l'opérant et une ressource humaine et logicielle du SI.`,
            `2. E-commerce : un directeur coordonne, un gestionnaire traite les commandes et un ouvrier livre. Identifiez une activité du système opérant et du pilotage.`,
            `3. Citez deux informations collectables par ce site.`],
          corrige: [`1. Pilotage : directeur. Opérant : ouvriers. Ressource humaine : comptable. Ressource logicielle : MS Access.`,
            `2. Opérant : préparer et livrer les colis. Pilotage : coordonner les activités.`,
            `3. Nom du client et adresse de livraison.`] } },

      /* ------------------------------------------------------------------ */
      { titre: `Bases de données et requêtes SQL`, duree: 50, difficulte: 'Moyen',
        accroche: `À partir d'une table : clé primaire, nombre de champs, requête à écrire et résultat à donner.`,
        notions: ['Base de données', 'Table, enregistrement', 'Clé primaire', 'SGBD', 'SELECT, INSERT', 'UPDATE, DELETE'],
        seances: [[`Vocabulaire`, 10], [`Choisir la clé primaire`, 8], [`SELECT et résultat`, 15], [`INSERT, UPDATE, DELETE`, 17]],
        resume: {
          points: [`Une <b>base de données</b> est un ensemble structuré de données, avec le moins de redondance possible. Un <b>SGBD</b> (Système de Gestion de Bases de Données) la gère : MS Access, MySQL, Oracle, SQL Server.`,
            `Une <b>table</b> organise les données : les <b>colonnes</b> sont les champs et chaque ligne est un <b>enregistrement</b>.`,
            `La <b>clé primaire</b> désigne chaque enregistrement de façon unique : deux lignes ne peuvent pas avoir la même valeur.`,
            `<b>SELECT</b> affiche, <b>INSERT</b> ajoute, <b>UPDATE</b> modifie, <b>DELETE</b> supprime. WHERE choisit les lignes.`],
          formules: [`SELECT Nom, Prenom FROM Enseignant WHERE Age > 30;`, `SELECT * FROM Eleve WHERE Classe = 'Terminale A4';`, `INSERT INTO CLIENT VALUES (233, 'poki', 'Route Otepe', 'Kribi');`, `UPDATE PRODUIT SET prix = 2000 WHERE code_produit = '000202';`, `DELETE FROM Article WHERE Reference = '205R12';`],
          pieges: [`Un INSERT doit avoir autant de valeurs que de champs.`,
            `Texte entre guillemets : un code comme 000202 se met entre guillemets pour garder ses zéros.`,
            `DELETE ou UPDATE sans WHERE touche toutes les lignes.`,
            `Une valeur qui se répète (Douala deux fois) ne peut pas être une clé primaire.`]
        },
        qcm: [
          q(`La table Article a 3 lignes et 5 colonnes. Elle a :`, ['5 enregistrements', '3 enregistrements et 5 champs', '8 champs'], 1, `Bac 2022.`),
          q(`Âges 16, 15, 19, 16. WHERE Age < 16 renvoie :`, ['une seule ligne : IBRAHIM', 'trois lignes', 'aucune ligne'], 0, `Seul IBRAHIM a 15 ans (bac 2023).`),
          q(`Âges 26, 34, 47. WHERE Age > 30 renvoie :`, ['une ligne', 'trois lignes', 'deux lignes'], 2, `34 et 47.`),
          q(`Pour modifier une valeur, on utilise :`, ['UPDATE', 'SELECT', 'CREATE'], 0, `UPDATE … SET … WHERE.`),
          q(`Pourquoi VilleClient ne peut pas être clé primaire ?`, ['elle est trop longue', 'elle contient du texte', 'Douala revient deux fois'], 2, `Sujet 2026.`),
          q(`UPDATE Elève SET sexe = 'M' WHERE Matricule = '77685S' :`, ['supprime l’élève', 'change le sexe de cet élève', 'affiche tous les élèves'], 1, `Bac 2025.`),
          q(`Sexe M, F, M, M et âges 35, 40, 28, 48. SELECT Nom, Age … WHERE sexe = 'F' renvoie :`, ['DJANGUI, 40', 'BOURDA, 35', 'GADJI, 48'], 0, `Bac 2024.`),
          q(`SGBD signifie :`, ['Système Général de Bureautique', 'Serveur de Gestion du Bloc', 'Système de Gestion de Bases de Données'], 2, `Exemple : MySQL.`)
        ],
        tp: { objectifs: ['Écrire des requêtes', 'Donner un résultat'],
          exercices: [`1. Table EMPLOYE (Matricule, Nom, Prénom, Sexe, Age). Insérez 1123-F, GADJI, RAPHA, M, 48.`,
            `2. Table Article : supprimez la référence 205R12.`,
            `3. Le prix du produit 000202 doit valoir 2000. Écrivez la requête.`,
            `4. Table Elève : affichez tout sur les élèves de Terminale A4.`,
            `5. CLIENT : 754 Jojo Douala, 672 Salama Douala, 233 poki Kribi. Écrivez la requête affichant les clients de Douala et donnez le résultat.`,
            `6. Que fait INSERT INTO Enseignant (Nom, Prénom, Matricule, Age) VALUES ('Menye', 'Agnes', '463897M', 38) ?`],
          corrige: [`1. INSERT INTO EMPLOYE (Matricule, Nom, Prénom, Sexe, Age) VALUES ('1123-F', 'GADJI', 'RAPHA', 'M', 48);`,
            `2. DELETE FROM Article WHERE Référence = '205R12';`,
            `3. UPDATE PRODUIT SET prix = 2000 WHERE code_produit = '000202';`,
            `4. SELECT * FROM Elève WHERE Classe = 'Terminale A4';`,
            `5. SELECT * FROM CLIENT WHERE VilleClient = 'Douala'; → 754 Jojo et 672 Salama.`,
            `6. Elle ajoute l'enseignante Menye Agnes, matricule 463897M, âgée de 38 ans.`] } }

    ]
  });
})();
