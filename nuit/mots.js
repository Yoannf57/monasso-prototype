/*
  Les mots de l'interface, en un seul endroit (décision du 2026-11-18) :
  pour changer un mot, on change une ligne ici, rien d'autre.

  Trois listes :
  - commun : les mêmes mots pour toutes les sortes de groupe ;
  - simple : un groupe simple (organisateurs, membres). Ne jamais y écrire
    les mots du bureau, des événements ni des coups de main ;
  - association : une association (bureau, membres, visiteurs).
  Un mot cherché dans « simple » ou « association » est pris dans « commun » s'il n'y est pas.
  {nom}, {n}… sont remplacés au moment de l'affichage.

  Demande 005 : seuls les nouveaux écrans (groupes, personnes, équipes, démo) et les mots
  qui changent selon la sorte de groupe sont ici. Les autres textes des écrans d'événements
  restent pour l'instant dans js/app.js (liste dans docs/recette/005-groupes-personnes-equipes.md).
  Demande 006 : tous les mots de la création d'un événement, de ses actions et de ses créneaux
  sont dans la liste « association ».
  Demande 006b : les mots pour modifier, supprimer et refaire un événement sont dans la liste « association ».
  Demande 007 : tous les mots des messages commencent par « msg » ; ils sont dans la liste commune,
  sauf ceux qui nomment le bureau, les organisateurs ou un événement.
*/
var MOTS = {
  commun: {
    // Menu et haut d'écran
    ongletAccueil: "Accueil",
    ongletMessages: "Messages",
    ongletEvenements: "Événements",
    lienAide: "Aide",
    bonjour: "Bonjour {prenom}",
    vous: "(vous)",
    revenirAccueil: "Revenir à l'accueil",

    // Rôles : leur nom, et comment on les compte (un, plusieurs)
    roles: {
      organisateur: { nom: "Organisateur", compte: ["{n} organisateur", "{n} organisateurs"] },
      bureau: { nom: "Bureau", compte: ["{n} au bureau", "{n} au bureau"] },
      membre: { nom: "Membre", compte: ["{n} membre", "{n} membres"] },
      visiteur: { nom: "Visiteur", compte: ["{n} visiteur", "{n} visiteurs"] }
    },

    // Personnes
    personnes: "Personnes",
    nPersonnes: ["{n} personne", "{n} personnes"],
    ajouterUnePersonne: "Ajouter une personne",
    ajouterLaPersonne: "Ajouter la personne",
    enregistrerLesChangements: "Enregistrer les changements",
    retirerLaPersonne: "Retirer cette personne",
    confirmerRetrait: "Retirer {nom} de la liste ? Ses équipes la perdront aussi.",
    personneAjoutee: "{nom} est dans la liste. Ajoutez la suivante, ou revenez à la liste.",
    personneModifiee: "Changements enregistrés pour {nom}.",
    personneRetiree: "{nom} ne fait plus partie du groupe.",
    voirLaListe: "Revenir à la liste",
    champPrenom: "Prénom",
    champNom: "Nom (facultatif)",
    champContact: "Téléphone ou e-mail (facultatif)",
    champRole: "Rôle",
    erreurPrenomVide: "Indiquez le prénom.",
    erreurTropLong: "C'est un peu long : 40 lettres au plus.",
    erreurContact: "Indiquez un numéro de téléphone (10 chiffres) ou une adresse e-mail, ou laissez vide.",
    erreurRole: "Choisissez un rôle.",
    equipesDeLaPersonne: "Équipes : {liste}",
    aucuneEquipePersonne: "Aucune équipe",
    personneIntrouvable: "Cette personne n'est plus dans la liste.",

    // Équipes
    equipes: "Équipes",
    nEquipes: ["{n} équipe", "{n} équipes"],
    creerUneEquipe: "Créer une équipe",
    creerLEquipe: "Créer l'équipe",
    enregistrerLEquipe: "Enregistrer l'équipe",
    supprimerLEquipe: "Supprimer cette équipe",
    confirmerSuppressionEquipe: "Supprimer l'équipe « {nom} » ? Les personnes restent dans la liste.",
    equipeCreee: "L'équipe « {nom} » est créée.",
    equipeModifiee: "L'équipe « {nom} » est enregistrée.",
    equipeSupprimee: "L'équipe « {nom} » est supprimée.",
    champNomEquipe: "Nom de l'équipe",
    champMembresEquipe: "Qui en fait partie ?",
    erreurNomEquipeVide: "Indiquez le nom de l'équipe.",
    aucuneEquipe: "Aucune équipe pour l'instant.",
    aucuneEquipeAide: "Une équipe, c'est un nom et quelques personnes.",
    equipeVide: "Personne dans cette équipe pour l'instant.",
    equipeIntrouvable: "Cette équipe n'existe plus.",
    etAutres: "et {n} autres",

    // Accueil d'un groupe sans événements
    accueilMesEquipes: "Mes équipes",
    accueilAucuneEquipe: "Vous n'êtes dans aucune équipe.",
    accueilPersonnes: "Personnes",

    // ---------- Demande 007 : demander qui est partant ----------

    // Écran « Messages »
    msgTitre: "Messages",
    msgListeARepondre: "À répondre",
    msgListeEnCours: "En cours",
    msgListeTermines: "Terminés",
    msgVoirAutres: ["Voir {n} autre message", "Voir les {n} autres messages"],
    msgDemander: "Demander qui est partant",
    msgDe: "De {prenom}",
    msgDeVous: "De vous",
    msgVide: "Aucun message pour l'instant.",
    msgVideAide: "Posez une question : chacun répond Oui ou Non.",
    msgRienARepondre: "Rien à répondre.",
    msgRienEnCours: "Aucun message en cours.",
    msgRienTermine: "Aucun message terminé.",

    // Nouvelle question
    msgChampQuestion: "Votre question",
    msgCompteCaracteres: "{n} sur 80",
    msgChampAQui: "À qui ?",
    msgAToutLeGroupe: "Tout le groupe",
    msgAPersonnes: "Des personnes choisies",
    msgAMemesPersonnes: "Les mêmes personnes",
    msgAvecCompte: "{nom} · {compte}",
    msgPersonnesCompte: "{n} sur 10",
    msgOptions: "Ajouter une date ou un nombre de Oui",
    msgChampJour: "Jour du rendez-vous",
    msgJourAujourdhui: "Aujourd'hui",
    msgJourDemain: "Demain",
    msgJourAutre: "Autre date",
    msgChampHeure: "Heure",
    msgChampAttendus: "Nombre de Oui attendus",
    msgChampAvantLe: "Réponse avant le",
    msgEnvoyer: "Envoyer la question",
    msgErreurQuestionVide: "Écrivez votre question.",
    msgErreurQuestionLongue: "La question tient en 80 caractères au plus.",
    msgErreurAQui: "Choisissez à qui poser la question.",
    msgErreurPersonneAucune: "Cochez au moins une personne.",
    msgErreurDixPersonnes: "Dix personnes au plus.",
    msgErreurHeureSansJour: "Indiquez aussi le jour du rendez-vous.",
    msgErreurDatePassee: "Cette date est déjà passée.",
    msgErreurAvantLe: "La réponse doit arriver avant le rendez-vous.",
    msgErreurAttendus: "Indiquez un nombre, 1 au moins.",
    msgErreurAttendusTrop: "C'est plus de Oui qu'il n'y a de personnes ({n}).",

    // Ce qui serait envoyé, ce qui serait relancé (le prototype n'envoie rien)
    msgEnvoiTitre: "Ce qui serait envoyé",
    msgEnvoiTexte: ["Ce prototype n'envoie rien. {n} personne recevrait ce message :", "Ce prototype n'envoie rien. {n} personnes recevraient ce message :"],
    msgRelanceTitre: "Ce qui serait relancé",
    msgRelanceTexte: [
      "Ce prototype n'envoie rien. {n} personne n'a pas encore répondu et recevrait ce message :",
      "Ce prototype n'envoie rien. {n} personnes n'ont pas encore répondu et recevraient ce message :"
    ],
    msgNotifEntete: "{groupe} · {prenom} demande :",
    msgNotifRelanceEntete: "{groupe} · Rappel de {prenom} :",
    msgNotifAvantLe: "Réponse attendue avant le {date}",
    msgNotifFin: "Répondez Oui ou Non dans MonAsso.",
    msgNotifRelanceFin: "Vous n'avez pas encore répondu. Répondez Oui ou Non dans MonAsso.",
    msgVoirLaQuestion: "Voir la question",

    // Le message
    msgRetourMessages: "Messages",
    msgDeLe: "De {nom} · le {date}",
    msgA: "À : {destinataires}",
    msgRendezVous: "Rendez-vous : {quand}",
    msgDateHeure: "{date} à {heure}",
    msgAvantLe: "Réponse avant le {date}",
    msgOui: "Oui",
    msgNon: "Non",
    msgVotreReponse: "Vous avez répondu {reponse}.",
    msgChangerAide: "Touchez l'autre bouton pour changer d'avis.",
    msgSansReponse: "Vous n'avez pas répondu.",
    msgCompteurAttendus: ["{oui} Oui sur {n} attendu", "{oui} Oui sur {n} attendus"],
    msgCompteur: "{oui} Oui",
    msgComplet: "Complet",
    msgListePasRepondu: "Pas encore répondu",
    msgListeOuiVide: "Personne n'a encore dit Oui.",
    msgListeNonVide: "Personne n'a dit Non.",
    msgListePasReponduVide: "Tout le monde a répondu.",
    msgAjouterAgenda: "Ajouter à mon agenda",
    msgRelancer: "Relancer ceux qui n'ont pas répondu",
    msgClore: "Clore la question",
    msgConfirmerClore: "Clore la question ? Plus personne ne pourra répondre ni changer d'avis.",
    msgRefaire: "Refaire cette question",
    msgClose: "Close",
    msgCloseLe: "Question close le {date}. Les réponses ne changent plus.",
    msgIntrouvable: "Ce message n'existe pas, ou ne vous est pas adressé.",

    // Accueil : le bloc « À répondre »
    msgReponseEnregistree: "Vous avez répondu {reponse} à « {question} ».",
    msgChangerDAvis: "Changer d'avis",
    msgAccueilAutres: ["et {n} autre question", "et {n} autres questions"],

    // Calendrier
    msgVoirCalendrier: "Voir le calendrier",
    msgCalendrierTitre: "Calendrier",
    msgRendezVousTitre: "Rendez-vous",
    msgLegendeRendezVous: "une question avec une date",
    msgAucunRendezVous: "Aucun rendez-vous à venir.",
    msgAucunRendezVousAide: "Ajoutez une date à une question : elle apparaîtra ici.",

    // Réglage, sur la page du groupe
    msgReglageTitre: "Messages",
    msgReglageToutLeGroupe: "Les membres peuvent écrire à tout le groupe",
    msgReglageAllume: "Allumé",
    msgReglageEteint: "Éteint",
    msgReglageEnregistre: "Réglage enregistré.",

    // Page Charte : la paire de réponse, seule exception à « un seul bouton principal »
    charteReglePaire: "Seule exception : la paire « Oui » / « Non » d'un message. Aucun autre bouton principal sur le même écran.",
    chartePaire: {
      titre: "Paire de réponse",
      avant: "Avant la réponse",
      apresOui: "Après « Oui »",
      apresNon: "Après « Non »",
      bloc: "Bloc « À répondre » de l'accueil",
      question: "Qui pour jouer jeudi 20 h ?",
      de: "Samir",
      rendezVous: "jeudi à 20 h",
      autres: 2
    },

    // Page du groupe
    apparence: "Apparence",
    apparenceTexte: "Couleurs, tailles de texte et composants de l'application.",
    voirLaCharte: "Voir la charte graphique",
    demonstration: "Démonstration",
    demonstrationTexte: "Efface ce qui a été saisi pendant les essais et remet les données d'origine.",
    reinitialiser: "Réinitialiser la démo",
    confirmerReinitialiser: "Remettre la démo comme au départ ? Les groupes créés et ce qui a été saisi seront effacés.",

    // Aide
    aideTitre: "Aide",
    aideSousTitre: "Les questions les plus fréquentes",
    aideAutre: "Une autre question ?",

    // Menu de démonstration (outil du testeur, ouvert à tous les rôles)
    demo: {
      etiquette: "Prototype de test",
      bouton: "Démo",
      changerDeGroupe: "Changer de groupe",
      changerDePersonne: "Changer de personne",
      creerUnGroupe: "Créer un groupe",
      voirEspaceParent: "Voir l'espace parent (vide-grenier)",
      enregistrerMonEssai: "Enregistrer mon essai",
      ouvrirUnEssai: "Ouvrir un essai",
      retourEspace: "Revenir à l'application"
    },
    avertissementPrototype: "Prototype de test : n'entrez pas de vraies coordonnées.",

    // Démo › Créer un groupe
    creerGroupeTitre: "Créer un groupe",
    creerGroupeSousTitre: "Pour essayer votre propre cas",
    champNomGroupe: "Nom du groupe",
    champNomGroupeAide: "Par exemple : APE de l'école Jules-Verne, Foot du mardi.",
    champSorte: "Sorte de groupe",
    sortes: {
      simple: ["Groupe simple", "Des organisateurs et des membres. Par exemple une équipe de sport."],
      association: ["Association", "Un groupe avec des modules en plus. Par exemple une APE."]
    },
    champCouleur: "Couleur",
    champVotrePrenom: "Votre prénom",
    champVotrePrenomAide: "Vous pourrez ensuite ajouter les autres personnes.",
    creerLeGroupe: "Créer le groupe",
    erreurNomGroupeVide: "Indiquez le nom du groupe.",
    erreurNomGroupeLong: "C'est un peu long : 60 lettres au plus.",
    groupeCree: "Le groupe « {nom} » est créé. Ajoutez maintenant les personnes.",
    // Les huit couleurs proposées (nom affiché, code couleur).
    couleurs: [
      ["Corail", "#F2613F"], ["Bleu", "#2563EB"], ["Vert", "#16A34A"], ["Violet", "#7C3AED"],
      ["Jaune", "#FACC15"], ["Rose", "#DB2777"], ["Turquoise", "#0891B2"], ["Ardoise", "#475569"]
    ],

    // Démo › Enregistrer mon essai
    enregistrerTitre: "Enregistrer mon essai",
    enregistrerTexte: "Un fichier garde tous vos groupes, personnes et équipes. Envoyez-le-vous par e-mail ou par message, puis ouvrez-le sur un autre téléphone avec « Ouvrir un essai ».",
    enregistrerContenu: "Ce téléphone contient {groupes} et {personnes}.",
    nGroupes: ["{n} groupe", "{n} groupes"],
    enregistrerBouton: "Enregistrer mon essai",
    envoyerBouton: "Envoyer mon essai",
    essaiEnregistre: "Fichier « {nom} » enregistré dans vos téléchargements.",
    essaiEnvoiImpossible: "Envoi impossible ici : enregistrez le fichier, puis joignez-le à un message.",

    // Démo › Ouvrir un essai
    ouvrirTitre: "Ouvrir un essai",
    ouvrirTexte: "Choisissez le fichier reçu. Il remplace tout ce qui est sur ce téléphone.",
    choisirFichier: "Choisir le fichier de l'essai",
    confirmerOuvrir: "Remplacer ce qui est sur ce téléphone par l'essai « {nom} » ?",
    essaiOuvert: "Essai ouvert : {groupes}, {personnes}.",
    essaiIllisible: "Ce fichier n'est pas un essai MonAsso. Choisissez le fichier enregistré avec « Enregistrer mon essai ».",
    essaiAncien: "Cet essai vient d'une autre version du prototype : il ne peut pas être ouvert ici.",

    // Charte (page interne)
    charteExempleSecondaire: "Inviter un membre",
    // Exemples de formulaire de la page Charte : les mêmes pour toutes les sortes de groupe.
    charteFormulaire: {
      champ: "Nom de l'équipe",
      champAide: "Par exemple : Les verts.",
      date: "Date",
      heure: "Heure de début",
      court: "Combien de personnes ?",
      erreurChamp: "Prénom",
      erreur: "Indiquez le prénom.",
      choix: "Pour quand ?",
      choixOptions: ["Le jour même", "La veille"],
      replie: "Qui s'en occupe ?",
      replieOptions: ["Vous (Claire)", "Malik", "Sophie"],
      messageOk: "L'équipe « Les verts » est créée.",
      lienBouton: "Revenir à la liste",
      lienBoutonAlerte: "Supprimer cette équipe",
      actionLibelle: "Acheter les serviettes en papier",
      actionMeta: "Le libellé souligné ouvre l'action"
    },

    // Exemples de la page Charte ajoutés par la demande 006b : confirmation d'une suppression, état qui se lit sans se toucher.
    charteSuppression: {
      quoi: "Vous allez supprimer l'équipe «\u00A0Les verts\u00A0».",
      definitif: "On ne peut pas revenir en arrière.",
      bouton: "Supprimer l'équipe",
      actionLecture: "État d'une action, en lecture seule",
      actionLectureMeta: "Une étiquette\u00A0: elle ne se touche pas"
    },

    // Pages d'erreur
    pageIntrouvable: "Cette page n'existe pas.",
    pageIntrouvableAide: "Le lien est peut-être incomplet."
  },

  simple: {
    ongletGroupe: "Groupe",
    surtitreGroupe: "Groupe",
    roleGestion: "organisateur",
    champContactAide: "Pour la joindre. Seuls les organisateurs le voient.",
    reserveGestion: "Seuls les organisateurs peuvent modifier cette liste.",
    contactsReserves: "Téléphones et e-mails ne sont visibles que des organisateurs.",
    dernierGestionnaire: "Il faut garder au moins un organisateur dans le groupe.",
    rolesAide: {
      organisateur: "Ajoute des personnes et crée les équipes.",
      membre: "Voit le groupe et ses équipes."
    },
    msgChampQuestionAide: "Par exemple : Qui pour jouer jeudi 20 h ?",
    msgAGestion: "Les organisateurs",
    msgReglageAide: "Éteint, seuls les organisateurs écrivent à tout le groupe.",
    aideQuestions: [
      ["Comment ajouter une personne ?",
        "Ouvrez « Groupe », puis « Personnes », et touchez « Ajouter une personne ». Seul le prénom est obligatoire."],
      ["Comment faire des équipes ?",
        "Ouvrez « Groupe », puis « Équipes », et touchez « Créer une équipe ». Donnez-lui un nom et cochez les personnes."],
      ["Qui voit les téléphones et les e-mails ?",
        "Seulement les organisateurs. Les autres voient le prénom, le nom, le rôle et les équipes."],
      ["Pourquoi je ne peux pas modifier la liste ?",
        "Seuls les organisateurs ajoutent, modifient ou retirent des personnes. Il en reste toujours au moins un."],
      ["Comment demander qui est partant ?",
        "Ouvrez « Messages » et touchez « Demander qui est partant ». Écrivez la question, choisissez à qui, envoyez. Chacun répond Oui ou Non."]
    ],
    aideAutreTexte: "Demandez à un organisateur du groupe.",
    lienInconnuAide: "Un organisateur du groupe peut vous aider.",
    charteCouleurReservee: "Seuls les organisateurs peuvent changer la couleur du groupe.",
    charteCouleurTitre: "Couleur du groupe",
    charteCouleurTexte: "Essayez une autre couleur principale : tout l'affichage suit, en restant lisible.",
    charteCouleurDetail: "Aplats, repères, illustrations. Remplaçable par celle du groupe.",
    charteExemplePrincipal: "Créer une équipe",
    charteRegleVocabulaire: ""
  },

  association: {
    ongletGroupe: "Association",
    surtitreGroupe: "Association",
    roleGestion: "bureau",
    champContactAide: "Pour la joindre. Seul le bureau le voit.",
    reserveGestion: "Seul le bureau peut modifier cette liste.",
    contactsReserves: "Téléphones et e-mails ne sont visibles que du bureau.",
    dernierGestionnaire: "Il faut garder au moins une personne au bureau.",
    rolesAide: {
      bureau: "Gère l'association, ses personnes et ses équipes.",
      membre: "Fait partie de l'association.",
      visiteur: "Suit l'association sans en être membre (par exemple la directrice)."
    },
    equipeBureau: "Le bureau",
    equipeBureauNote: "Formée d'office des personnes du bureau. Pour y ajouter quelqu'un, changez son rôle dans « Personnes ».",

    // ---------- Demande 006 : créer un événement, ses actions, ses créneaux ----------

    // Liste des événements
    creerUnEvenement: "Créer un événement",
    aucunEvenementAVenir: "Aucun événement à venir.",
    aucunEvenementAide: "Touchez « Créer un événement » pour poser le prochain.",

    // Créer un événement
    champNomEvenement: "Nom de l'événement",
    champNomEvenementAide: "Par exemple : Vente de gâteaux.",
    champDateEvenement: "Date",
    champDebutEvenement: "Heure de début (facultatif)",
    champFinEvenement: "Heure de fin (facultatif)",
    champLieuEvenement: "Lieu (facultatif)",
    creerLEvenement: "Créer l'événement",
    evenementCree: "« {nom} » est créé. Ajoutez maintenant ses actions.",
    erreurNomEvenementVide: "Indiquez le nom de l'événement.",
    erreurDateVide: "Indiquez la date.",
    erreurDatePassee: "Cette date est déjà passée. Choisissez aujourd'hui ou un jour à venir.",
    erreurFinSansDebut: "Indiquez aussi l'heure de début, ou videz l'heure de fin.",
    erreurFinAvantDebut: "L'heure de fin doit venir après l'heure de début.",

    // Horaires : « 16 h », « 16 h 30 », « 16 h – 18 h », « à partir de 16 h »
    heureRonde: "{h} h",
    heureMinutes: "{h} h {min}",
    horaireDeA: "{debut} – {fin}",
    horaireAPartirDe: "à partir de {debut}",

    // Actions d'un événement
    ajouterUneAction: "Ajouter une action",
    aucuneAction: "Aucune action pour cet événement.",
    aucuneActionAide: "Une action, c'est une chose à faire, quelqu'un pour s'en occuper et une date.",
    champLibelleAction: "Que faut-il faire ?",
    champLibelleActionAide: "Par exemple : Acheter les serviettes en papier.",
    champReferent: "Qui s'en occupe ?",
    referentVous: "Vous ({prenom})",
    champEcheance: "Pour quand ?",
    echeanceJourJ: "Le jour J",
    echeanceVeille: "La veille",
    echeancePlusieursJours: "Plusieurs jours avant",
    echeanceDatePrecise: "À une date précise",
    echeanceNJoursAvant: "{n} jours avant",
    champJoursAvant: "Combien de jours avant ?",
    champDateEcheance: "Date limite",
    ajouterLAction: "Ajouter l'action",
    actionAjoutee: "« {libelle} » est ajoutée. Ajoutez la suivante, ou revenez à l'événement.",
    revenirALEvenement: "Revenir à l'événement",
    modifierLAction: "Modifier l'action",
    enregistrerLAction: "Enregistrer l'action",
    actionModifiee: "« {libelle} » est enregistrée.",
    supprimerCetteAction: "Supprimer cette action",
    confirmerSuppressionAction: "Supprimer l'action « {libelle} » ?",
    actionSupprimee: "« {libelle} » est supprimée.",
    noteActions: "Touchez une échéance pour voir ses actions, puis l'étiquette d'une action pour changer son statut.",
    noteActionsLecture: "Touchez une échéance pour voir ses actions.",
    noteActionsBureau: "Touchez une échéance pour voir ses actions. L'étiquette change le statut, le libellé ouvre l'action pour la modifier.",
    erreurLibelleVide: "Indiquez ce qu'il faut faire.",
    erreurLibelleLong: "C'est un peu long : 80 lettres au plus.",
    erreurJoursAvant: "Indiquez un nombre de jours, de 2 à 365.",
    erreurDateEcheanceVide: "Indiquez la date limite.",
    erreurDateEcheanceApres: "La date limite doit tomber le jour de l'événement ou avant.",
    actionIntrouvable: "Cette action n'existe plus.",

    // Créneaux de coups de main
    ajouterUnCreneau: "Ajouter un créneau",
    aucunCreneau: "Aucun créneau de coups de main pour cet événement.",
    aucunCreneauAide: "Ajoutez un créneau : le lien à envoyer aux parents apparaîtra ici.",
    champIntituleCreneau: "Intitulé du créneau",
    champIntituleCreneauAide: "Par exemple : Tenir le stand.",
    champDebutCreneau: "Heure de début",
    champFinCreneau: "Heure de fin",
    champPlacesCreneau: "Combien de personnes faut-il ?",
    ajouterLeCreneau: "Ajouter le créneau",
    creneauAjoute: "Le créneau « {nom} » est ajouté. Ajoutez le suivant, ou revenez à l'événement.",
    modifierCeCreneau: "Modifier ce créneau",
    enregistrerLeCreneau: "Enregistrer le créneau",
    creneauModifie: "Le créneau « {nom} » est enregistré.",
    supprimerCeCreneau: "Supprimer ce créneau",
    confirmerSuppressionCreneau: "Supprimer le créneau « {nom} » ?",
    confirmerSuppressionCreneauInscrits: [
      "Supprimer le créneau « {nom} » ? {n} personne inscrite sera retirée, sans être prévenue.",
      "Supprimer le créneau « {nom} » ? {n} personnes inscrites seront retirées, sans être prévenues."
    ],
    creneauSupprime: "Le créneau « {nom} » est supprimé.",
    erreurIntituleVide: "Indiquez l'intitulé du créneau.",
    erreurDebutVide: "Indiquez l'heure de début.",
    erreurFinVide: "Indiquez l'heure de fin.",
    erreurPlaces: "Indiquez un nombre de personnes, de 1 à 30.",
    erreurPlacesInscrits: [
      "{n} personne est déjà inscrite : indiquez au moins {n}.",
      "{n} personnes sont déjà inscrites : indiquez au moins {n}."
    ],
    creneauIntrouvable: "Ce créneau n'existe plus.",

    // ---------- Demande 006b : modifier, supprimer et refaire un événement ----------
    // \u00A0 est une espace insécable : après « et avant », avant ? et :, pour qu'aucun de ces signes ne passe seul à la ligne.

    // Modifier l'événement (le formulaire est celui de la création)
    modifierLEvenement: "Modifier l'événement",
    enregistrerLEvenement: "Enregistrer l'événement",
    evenementModifie: "«\u00A0{nom}\u00A0» est enregistré.",

    // Supprimer l'événement : un écran entier, rien à taper
    supprimerCetEvenement: "Supprimer cet événement",
    supprimerEvenementTitre: "Supprimer cet événement\u00A0?",
    supprimerEvenementQuoi: "Vous allez supprimer «\u00A0{nom}\u00A0», prévu le {date}.",
    supprimerEvenementPerte: "Seront effacés avec lui\u00A0: {liste}.",
    supprimerEvenementInscrits: "Les personnes inscrites ne seront pas prévenues\u00A0: pensez à le leur dire.",
    supprimerEvenementDefinitif: "On ne peut pas revenir en arrière.",
    supprimerLEvenement: "Supprimer l'événement",
    garderLEvenement: "Garder l'événement",
    evenementSupprime: "«\u00A0{nom}\u00A0» est supprimé.",
    nActions: ["{n} action", "{n} actions"],
    nCreneaux: ["{n} créneau", "{n} créneaux"],
    nInscrits: ["{n} personne inscrite", "{n} personnes inscrites"],
    // {liste} : on ne cite que ce qui existe, avec des virgules, et « et » avant le dernier.
    listeVirgule: ", ",
    listeEt: "{debut} et {dernier}",

    // Refaire cet événement
    refaireCetEvenement: "Refaire cet événement",
    refaireTexte: "La copie reprend {liste}. Les actions repartent à «\u00A0À faire\u00A0» et personne n'est inscrit. «\u00A0{nom}\u00A0» ne change pas.",
    refaireTexteVide: "La copie reprend le nom, les horaires et le lieu. «\u00A0{nom}\u00A0» ne change pas.",
    champNouvelleDate: "Nouvelle date",
    creerLaCopie: "Créer la copie",
    evenementRefait: "«\u00A0{nom}\u00A0» est recopié au {date}. Vérifiez ses actions et ses créneaux.",

    // Lien personnel d'un parent, après la suppression de l'événement
    lienEvenementSupprime: "Cet événement n'existe plus.",
    lienEvenementSupprimeAide: "Le bureau de l'association peut vous renseigner.",

    // Messages à envoyer : le nom de l'événement entre guillemets, jamais précédé de « le » ou « la »
    messageCoupsDeMain: "Bonjour, on cherche des parents pour « {nom} », {date}. Même une heure aide beaucoup, sans créer de compte : {lien}",
    messageLienPersonnel: "Mon coup de main pour « {nom} » : {creneau}, {date}, {horaire}. Pour annuler : {lien}",

    // ---------- Demande 007 : les mots des messages propres à une association ----------
    msgChampQuestionAide: "Par exemple : Qui peut tenir la buvette samedi ?",
    msgAGestion: "Le bureau",
    msgChampEvenement: "Événement concerné",
    msgAucunEvenement: "Aucun",
    msgPourEvenement: "Pour : {titre}",
    msgVideAideVisiteur: "Les questions qu'on vous pose apparaîtront ici.",
    msgErreurVisiteur: "Vous pouvez répondre aux questions, pas en poser.",
    msgReglageAide: "Éteint, seul le bureau écrit à tout le groupe.",
    // Les rappels, dans l'écran « Mes actions » (bureau seulement)
    accueilRappelsCreneaux: ["{n} créneau manque de monde", "{n} créneaux manquent de monde"],
    accueilRappels: "Rappels",
    accueilRappelsAide: "Les créneaux remplis à moins de la moitié",
    accueilRappelsVoirAutres: ["Voir {n} autre créneau", "Voir les {n} autres créneaux"],

    aideQuestions: [
      ["Comment créer un événement ?",
        "Ouvrez « Événements » et touchez « Créer un événement ». Seuls le nom et la date sont obligatoires. Ajoutez ensuite ses actions, puis ses créneaux de coups de main. Seul le bureau peut le faire."],
      ["Comment changer le statut d'une action ?",
        "Ouvrez l'événement, touchez l'échéance, puis l'étiquette de l'action : « À faire » passe à « En cours », puis à « Fait »."],
      ["Comment trouver des parents pour aider ?",
        "Dans l'événement, ouvrez l'onglet « Coups de main » et touchez « Copier le lien ». Collez-le dans le groupe de la classe ou envoyez-le sur WhatsApp."],
      ["Que voient les parents ?",
        "Seulement le tableau des créneaux, avec le prénom et l'initiale de ceux qui viennent. Ils n'ont pas besoin de compte et ne voient jamais les coordonnées."],
      ["Comment partager le bilan de la fête ?",
        "Dans l'événement passé, onglet « Bilan », touchez « Partager sur WhatsApp » ou « Enregistrer l'image »."],
      ["Un parent veut annuler, que faire ?",
        "Rien : il a reçu un lien personnel pour annuler lui-même. La place se libère toute seule."],
      ["Comment ajouter une personne ou une équipe ?",
        "Ouvrez « Association », puis « Personnes » ou « Équipes ». Seul le bureau peut modifier ces listes ; l'équipe « Le bureau » se forme d'office."],
      ["Comment demander qui est partant ?",
        "Ouvrez « Messages » et touchez « Demander qui est partant ». Écrivez la question, choisissez à qui, envoyez. Chacun répond Oui ou Non."]
    ],
    aideAutreTexte: "Demandez à un membre du bureau. Dans la vraie application, un bouton permettra d'écrire à l'équipe MonAsso.",
    lienInconnuAide: "Le bureau de l'association peut vous aider.",
    charteCouleurReservee: "Seul le bureau peut changer la couleur de l'association.",
    charteCouleurTitre: "Couleur de l'association",
    charteCouleurTexte: "Essayez une autre couleur principale : tout l'affichage suit, en restant lisible.",
    charteCouleurDetail: "Aplats, repères, illustrations. Remplaçable par celle de l'association.",
    charteExemplePrincipal: "Créer un événement",
    charteRegleVocabulaire: "« Actions » côté bureau, « coups de main » côté parents."
  }
};

if (typeof module !== "undefined") { module.exports = MOTS; }
