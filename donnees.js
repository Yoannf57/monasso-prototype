/*
  Données fictives du prototype — APE « Les Coquelicots ».
  Ce fichier se modifie à la main : textes entre guillemets, nombres sans guillemets.

  Dates : pour que la démo reste fraîche, les événements à venir sont placés
  « dans N jours » à partir du jour où on ouvre le prototype (dansJours).
  Chaque action indique combien de jours AVANT l'événement elle doit être faite
  (joursAvant : 0 = le jour J, 1 = la veille…).
  leSamedi: true place l'événement au premier samedi à partir de cette date.

  Statuts possibles : "a-faire", "en-cours", "fait".

  Après une modification, changez le numéro de « version » ci-dessous :
  les téléphones qui ont déjà ouvert la démo repartiront des nouvelles données.
*/
var DONNEES = {
  version: 1,

  association: {
    nom: "APE Les Coquelicots",
    ecole: "École élémentaire des Tilleuls",
    ville: "Saint-Aubin-sur-Loire"
  },

  bureau: [
    { prenom: "Claire", role: "Présidente" },
    { prenom: "Malik", role: "Trésorier" },
    { prenom: "Sophie", role: "Secrétaire" },
    { prenom: "Thomas", role: "Vice-président" },
    { prenom: "Nadia", role: "Membre du bureau" },
    { prenom: "Julien", role: "Membre du bureau" }
  ],

  evenements: [
    {
      id: "vide-grenier",
      titre: "Vide-grenier de l'école",
      dansJours: 21, leSamedi: true,
      lieu: "Salle polyvalente",
      actions: [
        { id: "vg-salle", libelle: "Réserver la salle polyvalente", referent: "Claire", echeance: "6 semaines avant", joursAvant: 42, statut: "fait" },
        { id: "vg-arrete", libelle: "Demander l'arrêté en mairie", referent: "Thomas", echeance: "6 semaines avant", joursAvant: 42, statut: "en-cours" },
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
        { id: "vg-installation", titre: "Installation de la salle", horaire: "La veille, 18 h – 20 h", places: 6, inscrits: [
          { prenom: "Karim", initiale: "B", contact: "06 00 00 00 01", jeton: "demo-karim" },
          { prenom: "Élodie", initiale: "R", contact: "elodie.demo@exemple.fr", jeton: "demo-elodie" },
          { prenom: "Paul", initiale: "T", contact: "06 00 00 00 02", jeton: "demo-paul" },
          { prenom: "Inès", initiale: "M", contact: "06 00 00 00 03", jeton: "demo-ines" },
          { prenom: "Marc", initiale: "L", contact: "marc.demo@exemple.fr", jeton: "demo-marc" },
          { prenom: "Aurélie", initiale: "F", contact: "06 00 00 00 04", jeton: "demo-aurelie" }
        ] },
        { id: "vg-accueil-exposants", titre: "Accueil des exposants", horaire: "7 h – 9 h", places: 4, inscrits: [
          { prenom: "Yasmine", initiale: "K", contact: "06 00 00 00 05", jeton: "demo-yasmine" },
          { prenom: "Hugo", initiale: "P", contact: "hugo.demo@exemple.fr", jeton: "demo-hugo" },
          { prenom: "Camille", initiale: "D", contact: "06 00 00 00 06", jeton: "demo-camille" }
        ] },
        { id: "vg-buvette-matin", titre: "Buvette", horaire: "9 h – 12 h", places: 3, inscrits: [
          { prenom: "Fatou", initiale: "S", contact: "06 00 00 00 07", jeton: "demo-fatou" }
        ] },
        { id: "vg-buvette-midi", titre: "Buvette", horaire: "12 h – 15 h", places: 3, inscrits: [] },
        { id: "vg-gateaux-matin", titre: "Stand gâteaux", horaire: "9 h – 13 h", places: 2, inscrits: [
          { prenom: "Léonie", initiale: "G", contact: "06 00 00 00 08", jeton: "demo-leonie" },
          { prenom: "Romain", initiale: "V", contact: "romain.demo@exemple.fr", jeton: "demo-romain" }
        ] },
        { id: "vg-gateaux-aprem", titre: "Stand gâteaux", horaire: "13 h – 17 h", places: 2, inscrits: [] },
        { id: "vg-rangement", titre: "Rangement", horaire: "17 h – 19 h", places: 6, inscrits: [
          { prenom: "Damien", initiale: "C", contact: "06 00 00 00 09", jeton: "demo-damien" }
        ] },
        { id: "vg-gateau-maison", titre: "Apporter un gâteau maison", horaire: "Le matin, avant 9 h", places: 10, inscrits: [
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
        { id: "mn-sapins", libelle: "Commander les sapins", referent: "Thomas", echeance: "6 semaines avant", joursAvant: 42, statut: "a-faire" },
        { id: "mn-bricoleurs", libelle: "Lancer l'appel aux parents bricoleurs", referent: "Nadia", echeance: "4 semaines avant", joursAvant: 28, statut: "a-faire" },
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
    }
  ],

  bilans: [
    {
      id: "fete-juin",
      titre: "Fête de l'école",
      date: "2026-06-20",
      lieu: "Cour de l'école",
      benevoles: 34,
      heures: 96,
      recetteBuvette: 1248,
      exposants: 18,
      exposantsLibelle: "exposants au troc des enfants",
      ceQueCaFinance: "Grâce à vous, la sortie au planétarium des CM1-CM2 est payée."
    }
  ]
};

if (typeof module !== "undefined") { module.exports = DONNEES; }
