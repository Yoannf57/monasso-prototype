/*
  Données fictives du prototype : deux groupes d'exemple.
  - « APE Les Coquelicots » : une association (bureau, membres, visiteurs), avec ses événements ;
  - « Foot du jeudi » : un groupe simple (organisateurs, membres), 30 joueurs fictifs.
  Ce fichier se modifie à la main : textes entre guillemets, nombres sans guillemets.
  Les mots de l'interface ne sont pas ici mais dans mots.js.

  Personnes : prénom, nom, contact (téléphone ou e-mail, facultatif, toujours fictif),
  rôle ("bureau", "membre" ou "visiteur" dans une association ; "organisateur" ou "membre"
  dans un groupe simple) et, pour le bureau, une fonction facultative.
  Équipes : un nom et la liste des personnes (par leur identifiant). Dans une association,
  l'équipe « Le bureau » n'est pas écrite ici : elle est formée d'office des personnes du bureau.

  Dates : pour que la démo reste fraîche, les événements à venir sont placés
  « dans N jours » à partir du jour où on ouvre le prototype (dansJours).
  Chaque action indique combien de jours AVANT l'événement elle doit être faite
  (joursAvant : 0 = le jour J, 1 = la veille…).
  leSamedi: true place l'événement au premier samedi à partir de cette date.

  Créneaux : jour (0 = le jour J, -1 = la veille), debut et fin ("HH:MM") servent
  à l'ajout dans l'agenda ; horaire est le texte affiché.
  Un événement passé a une date fixe (date: "AAAA-MM-JJ") et peut avoir un bilan.

  Statuts possibles : "a-faire", "en-cours", "fait".

  Actions : « referent » est le prénom d'une personne du groupe, tel qu'on l'écrit ici.
  À l'ouverture, chaque action est rattachée à cette personne par son identifiant (referentId) :
  si on la renomme ensuite dans le prototype, elle garde ses actions.

  Messages (demande 007) : des questions « Qui est partant ? » à différents états, toutes fictives.
  « a » dit à qui la question a été posée ("tous", "gestion" : le bureau ou les organisateurs,
  "equipe", "personnes") ; « destinataires » est la liste des personnes, « oui » et « non » celles
  qui ont répondu. Les dates sont écrites « dans N jours » (un nombre négatif : il y a N jours) :
  creeDansJours, closeDansJours (question close à la main), jourDansJours (rendez-vous),
  avantLeDansJours (réponse avant le). jourSemaine: 4 avance le rendez-vous au jeudi ;
  avantLeJoursAvant: 1 place la date limite la veille du rendez-vous.
  Une question se clôt d'elle-même après sa date limite, à défaut après son rendez-vous.

  Après une modification, changez le numéro de « version » ci-dessous :
  les téléphones qui ont déjà ouvert la démo repartiront des nouvelles données.
*/
var DONNEES = {
  version: 6,

  // Groupe ouvert au démarrage (changeable dans le menu de démo).
  groupeParDefaut: "coquelicots",

  groupes: [
    {
      id: "coquelicots",
      sorte: "association",
      nom: "APE Les Coquelicots",
      ecole: "École élémentaire des Tilleuls",
      ville: "Saint-Aubin-sur-Loire",
      // Couleur principale (code couleur). Le texte posé dessus
      // et les teintes de lecture sont calculés pour rester lisibles.
      couleur: "#F2613F",
      // Personne simulée au démarrage (changeable dans le menu de démo).
      personneParDefaut: "p-claire",
      personnes: [
        { id: "p-claire", prenom: "Claire", nom: "Morel", contact: "06 00 00 01 01", role: "bureau", fonction: "Présidente" },
        { id: "p-malik", prenom: "Malik", nom: "Benali", contact: "06 00 00 01 02", role: "bureau", fonction: "Trésorier" },
        { id: "p-sophie", prenom: "Sophie", nom: "Lambert", contact: "sophie.demo@exemple.fr", role: "bureau", fonction: "Secrétaire" },
        { id: "p-thomas", prenom: "Thomas", nom: "Girard", contact: "06 00 00 01 04", role: "bureau", fonction: "Vice-président" },
        { id: "p-nadia", prenom: "Nadia", nom: "Haddad", contact: "06 00 00 01 05", role: "bureau" },
        { id: "p-julien", prenom: "Julien", nom: "Petit", contact: "julien.demo@exemple.fr", role: "bureau" },
        { id: "p-karim", prenom: "Karim", nom: "Bouzid", contact: "06 00 00 01 07", role: "membre" },
        { id: "p-elodie", prenom: "Élodie", nom: "Roux", contact: "elodie.demo@exemple.fr", role: "membre" },
        { id: "p-paul", prenom: "Paul", nom: "Tessier", contact: "", role: "membre" },
        { id: "p-aurelie", prenom: "Aurélie", nom: "Fontaine", contact: "06 00 00 01 10", role: "membre" },
        { id: "p-yasmine", prenom: "Yasmine", nom: "Kaci", contact: "06 00 00 01 11", role: "membre" },
        { id: "p-hugo", prenom: "Hugo", nom: "Perrin", contact: "", role: "membre" },
        { id: "p-helene", prenom: "Hélène", nom: "Marchand", contact: "helene.demo@exemple.fr", role: "visiteur" },
        { id: "p-bastien", prenom: "Bastien", nom: "Leroy", contact: "", role: "visiteur" }
      ],
      equipes: [
        { id: "e-buvette", nom: "Buvette", personnes: ["p-malik", "p-nadia", "p-karim", "p-yasmine"] },
        { id: "e-communication", nom: "Communication", personnes: ["p-sophie", "p-julien", "p-elodie"] }
      ],

      // Réglage « Les membres peuvent écrire à tout le groupe » : éteint par défaut.
      reglages: { membresToutLeGroupe: false },

      messages: [
        {
          id: "q-ape-lots", sorte: "question", texte: "Qui vient préparer les lots de la tombola ?",
          auteurId: "p-thomas", auteur: "Thomas Girard", creeDansJours: -2,
          a: { sorte: "tous" }, destinataires: ["p-claire", "p-malik", "p-sophie", "p-thomas", "p-nadia", "p-julien", "p-karim", "p-elodie", "p-paul", "p-aurelie", "p-yasmine", "p-hugo", "p-helene", "p-bastien"],
          jourDansJours: 5, heure: "18:30", attendus: 6, avantLeDansJours: 3, evenementId: "marche-noel",
          oui: ["p-thomas", "p-nadia", "p-elodie"], non: ["p-julien", "p-hugo"]
        },
        {
          id: "q-ape-cle", sorte: "question", texte: "Qui peut me prêter la clé du local ?",
          auteurId: "p-karim", auteur: "Karim Bouzid", creeDansJours: -1,
          a: { sorte: "gestion" }, destinataires: ["p-claire", "p-malik", "p-sophie", "p-thomas", "p-nadia", "p-julien"],
          oui: [], non: ["p-julien"]
        },
        {
          id: "q-ape-reunion", sorte: "question", texte: "Qui est partant pour une réunion la semaine prochaine ?",
          auteurId: "p-claire", auteur: "Claire Morel", creeDansJours: -3,
          a: { sorte: "gestion" }, destinataires: ["p-claire", "p-malik", "p-sophie", "p-thomas", "p-nadia", "p-julien"],
          jourDansJours: 8, heure: "20:30", attendus: 4,
          oui: ["p-claire", "p-malik", "p-sophie"], non: ["p-julien"]
        },
        {
          id: "q-ape-buvette", sorte: "question", texte: "Qui peut tenir la buvette le matin ?",
          auteurId: "p-malik", auteur: "Malik Benali", creeDansJours: -1,
          a: { sorte: "equipe", equipeId: "e-buvette", nom: "Buvette" }, destinataires: ["p-malik", "p-nadia", "p-karim", "p-yasmine"],
          attendus: 2, evenementId: "vide-grenier",
          oui: ["p-nadia", "p-yasmine"], non: []
        },
        {
          id: "q-ape-photos", sorte: "question", texte: "Qui a gardé des photos de la fête de l'école ?",
          auteurId: "p-sophie", auteur: "Sophie Lambert", creeDansJours: -20, closeDansJours: -3,
          a: { sorte: "tous" }, destinataires: ["p-claire", "p-malik", "p-sophie", "p-thomas", "p-nadia", "p-julien", "p-karim", "p-elodie", "p-paul", "p-aurelie", "p-yasmine", "p-hugo", "p-helene", "p-bastien"],
          oui: ["p-sophie", "p-karim", "p-aurelie", "p-helene"], non: ["p-claire", "p-thomas", "p-paul"]
        }
      ],

      evenements: [
        {
          id: "vide-grenier",
          titre: "Vide-grenier de l'école",
          dansJours: 21, leSamedi: true,
          lieu: "Salle polyvalente",
          actions: [
            { id: "vg-salle", libelle: "Réserver la salle polyvalente", referent: "Claire", echeance: "6 semaines avant", joursAvant: 42, statut: "fait" },
            { id: "vg-arrete", libelle: "Demander l'arrêté en mairie", referent: "Claire", echeance: "6 semaines avant", joursAvant: 42, statut: "en-cours" },
            { id: "vg-directrice", libelle: "Prévenir la directrice et le conseil d'école", referent: "Claire", echeance: "6 semaines avant", joursAvant: 42, statut: "fait" },

            { id: "vg-reservations", libelle: "Ouvrir les réservations exposants", referent: "Sophie", echeance: "4 semaines avant", joursAvant: 28, statut: "fait" },
            { id: "vg-tableau", libelle: "Préparer le tableau des coups de main", referent: "Nadia", echeance: "4 semaines avant", joursAvant: 28, statut: "fait" },
            { id: "vg-affiches", libelle: "Imprimer les affiches", referent: "Julien", echeance: "4 semaines avant", joursAvant: 28, statut: "a-faire" },
            { id: "vg-assurance", libelle: "Vérifier l'assurance de l'association", referent: "Malik", echeance: "4 semaines avant", joursAvant: 28, statut: "a-faire" },

            { id: "vg-annonce", libelle: "Annoncer le vide-grenier dans le cahier de liaison", referent: "Sophie", echeance: "3 semaines avant", joursAvant: 21, statut: "en-cours" },
            { id: "vg-commercants", libelle: "Déposer les affiches chez les commerçants", referent: "Julien", echeance: "3 semaines avant", joursAvant: 17, statut: "a-faire" },

            { id: "vg-relance", libelle: "Relancer les exposants qui n'ont pas payé", referent: "Sophie", echeance: "2 semaines avant", joursAvant: 14, statut: "a-faire" },
            { id: "vg-tables", libelle: "Réserver tables et grilles auprès de la mairie", referent: "Thomas", echeance: "2 semaines avant", joursAvant: 14, statut: "a-faire" },
            { id: "vg-plan", libelle: "Faire le plan des emplacements", referent: "Nadia", echeance: "2 semaines avant", joursAvant: 14, statut: "a-faire" },

            { id: "vg-boissons", libelle: "Acheter les boissons et les gobelets", referent: "Malik", echeance: "La semaine d'avant", joursAvant: 7, statut: "a-faire" },
            { id: "vg-caisse", libelle: "Préparer la caisse et le fond de caisse", referent: "Malik", echeance: "La semaine d'avant", joursAvant: 5, statut: "a-faire" },
            { id: "vg-registre", libelle: "Imprimer le registre des exposants", referent: "Sophie", echeance: "La semaine d'avant", joursAvant: 5, statut: "a-faire" },

            { id: "vg-cles", libelle: "Récupérer les clés de la salle", referent: "Claire", echeance: "La veille", joursAvant: 1, statut: "a-faire" },
            { id: "vg-signaletique", libelle: "Poser le fléchage dans la rue", referent: "Julien", echeance: "La veille", joursAvant: 1, statut: "a-faire" },
            { id: "vg-frais", libelle: "Mettre les boissons au frais", referent: "Nadia", echeance: "La veille", joursAvant: 1, statut: "a-faire" },

            { id: "vg-accueil", libelle: "Accueillir les exposants à 7 h", referent: "Thomas", echeance: "Le jour J", joursAvant: 0, statut: "a-faire" },
            { id: "vg-signatures", libelle: "Faire signer le registre", referent: "Sophie", echeance: "Le jour J", joursAvant: 0, statut: "a-faire" },
            { id: "vg-comptage", libelle: "Compter la caisse à deux", referent: "Malik", echeance: "Le jour J", joursAvant: 0, statut: "a-faire" },
            { id: "vg-rendre", libelle: "Ranger et rendre la salle", referent: "Claire", echeance: "Le jour J", joursAvant: 0, statut: "a-faire" }
          ],
          creneaux: [
            { id: "vg-installation", jour: -1, debut: "18:00", fin: "20:00", titre: "Installation de la salle", horaire: "La veille, 18 h – 20 h", places: 6, inscrits: [
              { prenom: "Karim", initiale: "B", contact: "06 00 00 00 01", jeton: "demo-karim" },
              { prenom: "Élodie", initiale: "R", contact: "elodie.demo@exemple.fr", jeton: "demo-elodie" },
              { prenom: "Paul", initiale: "T", contact: "06 00 00 00 02", jeton: "demo-paul" },
              { prenom: "Inès", initiale: "M", contact: "06 00 00 00 03", jeton: "demo-ines" },
              { prenom: "Marc", initiale: "L", contact: "marc.demo@exemple.fr", jeton: "demo-marc" },
              { prenom: "Aurélie", initiale: "F", contact: "06 00 00 00 04", jeton: "demo-aurelie" }
            ] },
            { id: "vg-accueil-exposants", jour: 0, debut: "07:00", fin: "09:00", titre: "Accueil des exposants", horaire: "7 h – 9 h", places: 4, inscrits: [
              { prenom: "Yasmine", initiale: "K", contact: "06 00 00 00 05", jeton: "demo-yasmine" },
              { prenom: "Hugo", initiale: "P", contact: "hugo.demo@exemple.fr", jeton: "demo-hugo" },
              { prenom: "Camille", initiale: "D", contact: "06 00 00 00 06", jeton: "demo-camille" }
            ] },
            { id: "vg-buvette-matin", jour: 0, debut: "09:00", fin: "12:00", titre: "Buvette", horaire: "9 h – 12 h", places: 3, inscrits: [
              { prenom: "Fatou", initiale: "S", contact: "06 00 00 00 07", jeton: "demo-fatou" }
            ] },
            { id: "vg-buvette-midi", jour: 0, debut: "12:00", fin: "15:00", titre: "Buvette", horaire: "12 h – 15 h", places: 3, inscrits: [] },
            { id: "vg-gateaux-matin", jour: 0, debut: "09:00", fin: "13:00", titre: "Stand gâteaux", horaire: "9 h – 13 h", places: 2, inscrits: [
              { prenom: "Léonie", initiale: "G", contact: "06 00 00 00 08", jeton: "demo-leonie" },
              { prenom: "Romain", initiale: "V", contact: "romain.demo@exemple.fr", jeton: "demo-romain" }
            ] },
            { id: "vg-gateaux-aprem", jour: 0, debut: "13:00", fin: "17:00", titre: "Stand gâteaux", horaire: "13 h – 17 h", places: 2, inscrits: [] },
            { id: "vg-rangement", jour: 0, debut: "17:00", fin: "19:00", titre: "Rangement", horaire: "17 h – 19 h", places: 6, inscrits: [
              { prenom: "Damien", initiale: "C", contact: "06 00 00 00 09", jeton: "demo-damien" }
            ] },
            { id: "vg-gateau-maison", jour: 0, debut: "07:30", fin: "09:00", titre: "Apporter un gâteau maison", horaire: "Le matin, avant 9 h", places: 10, inscrits: [
              { prenom: "Sarah", initiale: "N", contact: "06 00 00 00 10", jeton: "demo-sarah" },
              { prenom: "Lucas", initiale: "A", contact: "06 00 00 00 11", jeton: "demo-lucas" },
              { prenom: "Manon", initiale: "J", contact: "manon.demo@exemple.fr", jeton: "demo-manon" },
              { prenom: "Olivier", initiale: "H", contact: "06 00 00 00 12", jeton: "demo-olivier" }
            ] }
          ]
        },

        {
          id: "marche-noel",
          titre: "Marché de Noël",
          dansJours: 33, leSamedi: true,
          lieu: "Préau de l'école",
          actions: [
            { id: "mn-preau", libelle: "Réserver le préau auprès de la directrice", referent: "Claire", echeance: "6 semaines avant", joursAvant: 42, statut: "fait" },
            { id: "mn-sapins", libelle: "Commander les sapins", referent: "Thomas", echeance: "6 semaines avant", joursAvant: 42, statut: "fait" },
            { id: "mn-bricoleurs", libelle: "Lancer l'appel aux parents bricoleurs", referent: "Nadia", echeance: "4 semaines avant", joursAvant: 32, statut: "a-faire" },
            { id: "mn-createurs", libelle: "Recenser les créateurs du quartier", referent: "Sophie", echeance: "3 semaines avant", joursAvant: 21, statut: "a-faire" },
            { id: "mn-vin", libelle: "Acheter le jus de pomme chaud et les gobelets", referent: "Malik", echeance: "La semaine d'avant", joursAvant: 7, statut: "a-faire" }
          ],
          creneaux: []
        },

        {
          id: "kermesse",
          titre: "Kermesse",
          dansJours: 215, leSamedi: true,
          lieu: "Cour de l'école",
          actions: [
            { id: "km-date", libelle: "Caler la date avec l'équipe enseignante", referent: "Claire", echeance: "4 mois avant", joursAvant: 120, statut: "a-faire" },
            { id: "km-lots", libelle: "Demander des lots aux commerçants", referent: "Julien", echeance: "2 mois avant", joursAvant: 60, statut: "a-faire" }
          ],
          creneaux: []
        },

        {
          id: "fete-ecole",
          titre: "Fête de l'école",
          date: "2026-06-20",
          lieu: "Cour de l'école",
          actions: [
            { id: "fe-stands", libelle: "Répartir les stands entre les classes", referent: "Nadia", echeance: "1 mois avant", joursAvant: 30, statut: "fait" },
            { id: "fe-lots", libelle: "Collecter les lots de la tombola", referent: "Julien", echeance: "2 semaines avant", joursAvant: 14, statut: "fait" },
            { id: "fe-buvette", libelle: "Acheter les boissons de la buvette", referent: "Malik", echeance: "La semaine d'avant", joursAvant: 5, statut: "fait" },
            { id: "fe-caisse", libelle: "Compter la caisse à deux", referent: "Malik", echeance: "Le jour J", joursAvant: 0, statut: "fait" }
          ],
          creneaux: [],
          bilan: {
            benevoles: 34,
            heures: 96,
            recetteBuvette: 1248,
            exposants: 18,
            exposantsLibelle: "exposants au troc des enfants",
            ceQueCaFinance: "Grâce à vous, la sortie au planétarium des CM1-CM2 est payée."
          }
        }
      ]
    },

    {
      id: "foot-jeudi",
      sorte: "simple",
      nom: "Foot du jeudi",
      couleur: "#16A34A",
      personneParDefaut: "j-samir-ouali",
      personnes: [
        { id: "j-samir-ouali", prenom: "Samir", nom: "Ouali", contact: "06 00 00 02 01", role: "organisateur" },
        { id: "j-lucie-bernard", prenom: "Lucie", nom: "Bernard", contact: "lucie.demo@exemple.fr", role: "organisateur" },
        { id: "j-antoine-robin", prenom: "Antoine", nom: "Robin", contact: "", role: "membre" },
        { id: "j-mehdi-saidi", prenom: "Mehdi", nom: "Saïdi", contact: "06 00 00 02 04", role: "membre" },
        { id: "j-kevin-lefevre", prenom: "Kevin", nom: "Lefèvre", contact: "kevin.demo@exemple.fr", role: "membre" },
        { id: "j-sebastien-gauthier", prenom: "Sébastien", nom: "Gauthier", contact: "", role: "membre" },
        { id: "j-nicolas-faure", prenom: "Nicolas", nom: "Faure", contact: "06 00 00 02 07", role: "membre" },
        { id: "j-rachid-amrani", prenom: "Rachid", nom: "Amrani", contact: "rachid.demo@exemple.fr", role: "membre" },
        { id: "j-damien-colin", prenom: "Damien", nom: "Colin", contact: "", role: "membre" },
        { id: "j-jeremy-vidal", prenom: "Jérémy", nom: "Vidal", contact: "06 00 00 02 10", role: "membre" },
        { id: "j-alexandre-roche", prenom: "Alexandre", nom: "Roche", contact: "alexandre.demo@exemple.fr", role: "membre" },
        { id: "j-mamadou-diallo", prenom: "Mamadou", nom: "Diallo", contact: "", role: "membre" },
        { id: "j-florian-marie", prenom: "Florian", nom: "Marie", contact: "06 00 00 02 13", role: "membre" },
        { id: "j-youssef-cherif", prenom: "Youssef", nom: "Chérif", contact: "youssef.demo@exemple.fr", role: "membre" },
        { id: "j-maxime-brun", prenom: "Maxime", nom: "Brun", contact: "", role: "membre" },
        { id: "j-vincent-perret", prenom: "Vincent", nom: "Perret", contact: "06 00 00 02 16", role: "membre" },
        { id: "j-ibrahim-toure", prenom: "Ibrahim", nom: "Touré", contact: "ibrahim.demo@exemple.fr", role: "membre" },
        { id: "j-cedric-blanc", prenom: "Cédric", nom: "Blanc", contact: "", role: "membre" },
        { id: "j-julie-mercier", prenom: "Julie", nom: "Mercier", contact: "06 00 00 02 19", role: "membre" },
        { id: "j-romain-dupuis", prenom: "Romain", nom: "Dupuis", contact: "romain.demo@exemple.fr", role: "membre" },
        { id: "j-anthony-lopez", prenom: "Anthony", nom: "Lopez", contact: "", role: "membre" },
        { id: "j-bruno-guerin", prenom: "Bruno", nom: "Guérin", contact: "06 00 00 02 22", role: "membre" },
        { id: "j-thibault-muller", prenom: "Thibault", nom: "Muller", contact: "thibault.demo@exemple.fr", role: "membre" },
        { id: "j-karim-mansouri", prenom: "Karim", nom: "Mansouri", contact: "", role: "membre" },
        { id: "j-laurent-barbier", prenom: "Laurent", nom: "Barbier", contact: "06 00 00 02 25", role: "membre" },
        { id: "j-hamza-belkacem", prenom: "Hamza", nom: "Belkacem", contact: "hamza.demo@exemple.fr", role: "membre" },
        { id: "j-olivier-renaud", prenom: "Olivier", nom: "Renaud", contact: "", role: "membre" },
        { id: "j-pierre-arnaud", prenom: "Pierre", nom: "Arnaud", contact: "06 00 00 02 28", role: "membre" },
        { id: "j-david-meunier", prenom: "David", nom: "Meunier", contact: "david.demo@exemple.fr", role: "membre" },
        { id: "j-aissa-ndiaye", prenom: "Aïssa", nom: "Ndiaye", contact: "", role: "membre" }
      ],
      equipes: [
        { id: "e-jaunes", nom: "Chasubles jaunes", personnes: ["j-samir-ouali", "j-antoine-robin", "j-kevin-lefevre", "j-nicolas-faure", "j-damien-colin", "j-alexandre-roche", "j-florian-marie", "j-maxime-brun", "j-ibrahim-toure", "j-julie-mercier"] },
        { id: "e-bleues", nom: "Chasubles bleues", personnes: ["j-lucie-bernard", "j-mehdi-saidi", "j-sebastien-gauthier", "j-rachid-amrani", "j-jeremy-vidal", "j-mamadou-diallo", "j-youssef-cherif", "j-vincent-perret", "j-cedric-blanc", "j-romain-dupuis"] }
      ],

      // Réglage « Les membres peuvent écrire à tout le groupe » : éteint par défaut.
      reglages: { membresToutLeGroupe: false },

      messages: [
        {
          id: "q-foot-jeudi", sorte: "question", texte: "Qui pour jouer jeudi 20 h ?",
          auteurId: "j-lucie-bernard", auteur: "Lucie Bernard", creeDansJours: -1,
          a: { sorte: "tous" }, destinataires: ["j-samir-ouali", "j-lucie-bernard", "j-antoine-robin", "j-mehdi-saidi", "j-kevin-lefevre", "j-sebastien-gauthier", "j-nicolas-faure", "j-rachid-amrani", "j-damien-colin", "j-jeremy-vidal", "j-alexandre-roche", "j-mamadou-diallo", "j-florian-marie", "j-youssef-cherif", "j-maxime-brun", "j-vincent-perret", "j-ibrahim-toure", "j-cedric-blanc", "j-julie-mercier", "j-romain-dupuis", "j-anthony-lopez", "j-bruno-guerin", "j-thibault-muller", "j-karim-mansouri", "j-laurent-barbier", "j-hamza-belkacem", "j-olivier-renaud", "j-pierre-arnaud", "j-david-meunier", "j-aissa-ndiaye"],
          jourDansJours: 1, jourSemaine: 4, heure: "20:00", attendus: 10, avantLeJoursAvant: 1,
          oui: ["j-lucie-bernard", "j-antoine-robin", "j-mehdi-saidi", "j-kevin-lefevre", "j-nicolas-faure", "j-rachid-amrani", "j-julie-mercier", "j-hamza-belkacem"],
          non: ["j-damien-colin", "j-florian-marie", "j-olivier-renaud"]
        },
        {
          id: "q-foot-tournoi", sorte: "question", texte: "Qui est partant pour inscrire le groupe au tournoi du printemps ?",
          auteurId: "j-antoine-robin", auteur: "Antoine Robin", creeDansJours: -2,
          a: { sorte: "gestion" }, destinataires: ["j-samir-ouali", "j-lucie-bernard"],
          oui: [], non: []
        },
        {
          id: "q-foot-chasubles", sorte: "question", texte: "Qui peut laver les chasubles ce mois-ci ?",
          auteurId: "j-samir-ouali", auteur: "Samir Ouali", creeDansJours: -4,
          a: { sorte: "equipe", equipeId: "e-jaunes", nom: "Chasubles jaunes" }, destinataires: ["j-samir-ouali", "j-antoine-robin", "j-kevin-lefevre", "j-nicolas-faure", "j-damien-colin", "j-alexandre-roche", "j-florian-marie", "j-maxime-brun", "j-ibrahim-toure", "j-julie-mercier"],
          attendus: 2,
          oui: ["j-antoine-robin"], non: ["j-samir-ouali", "j-maxime-brun"]
        },
        {
          id: "q-foot-repas", sorte: "question", texte: "Qui vient au repas de fin d'année ?",
          auteurId: "j-samir-ouali", auteur: "Samir Ouali", creeDansJours: -5,
          a: { sorte: "equipe", equipeId: "e-bleues", nom: "Chasubles bleues" }, destinataires: ["j-lucie-bernard", "j-mehdi-saidi", "j-sebastien-gauthier", "j-rachid-amrani", "j-jeremy-vidal", "j-mamadou-diallo", "j-youssef-cherif", "j-vincent-perret", "j-cedric-blanc", "j-romain-dupuis"],
          jourDansJours: 12, heure: "19:30", attendus: 5,
          oui: ["j-lucie-bernard", "j-mehdi-saidi", "j-rachid-amrani", "j-jeremy-vidal", "j-cedric-blanc"], non: ["j-romain-dupuis"]
        },
        {
          id: "q-foot-retour", sorte: "question", texte: "Qui peut me ramener après le match ?",
          auteurId: "j-lucie-bernard", auteur: "Lucie Bernard", creeDansJours: -1,
          a: { sorte: "personnes" }, destinataires: ["j-mehdi-saidi", "j-rachid-amrani", "j-youssef-cherif"],
          oui: ["j-mehdi-saidi"], non: []
        },
        {
          id: "q-foot-dernier", sorte: "question", texte: "Qui jouait jeudi dernier ?",
          auteurId: "j-samir-ouali", auteur: "Samir Ouali", creeDansJours: -9,
          a: { sorte: "tous" }, destinataires: ["j-samir-ouali", "j-lucie-bernard", "j-antoine-robin", "j-mehdi-saidi", "j-kevin-lefevre", "j-sebastien-gauthier", "j-nicolas-faure", "j-rachid-amrani", "j-damien-colin", "j-jeremy-vidal", "j-alexandre-roche", "j-mamadou-diallo", "j-florian-marie", "j-youssef-cherif", "j-maxime-brun", "j-vincent-perret", "j-ibrahim-toure", "j-cedric-blanc", "j-julie-mercier", "j-romain-dupuis", "j-anthony-lopez", "j-bruno-guerin", "j-thibault-muller", "j-karim-mansouri", "j-laurent-barbier", "j-hamza-belkacem", "j-olivier-renaud", "j-pierre-arnaud", "j-david-meunier", "j-aissa-ndiaye"],
          jourDansJours: -6, heure: "20:00", attendus: 10,
          oui: ["j-samir-ouali", "j-lucie-bernard", "j-antoine-robin", "j-mehdi-saidi", "j-kevin-lefevre", "j-sebastien-gauthier", "j-nicolas-faure", "j-rachid-amrani", "j-jeremy-vidal", "j-julie-mercier"],
          non: ["j-damien-colin", "j-mamadou-diallo", "j-bruno-guerin", "j-pierre-arnaud"]
        }
      ]
    }
  ]
};

if (typeof module !== "undefined") { module.exports = DONNEES; }
