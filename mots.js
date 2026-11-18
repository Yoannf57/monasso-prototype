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
*/
var MOTS = {
  commun: {
    // Menu et haut d'écran
    ongletAccueil: "Accueil",
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
    personneRetiree: "{nom} a été retiré de la liste.",
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
    aideQuestions: [
      ["Comment ajouter une personne ?",
        "Ouvrez « Groupe », puis « Personnes », et touchez « Ajouter une personne ». Seul le prénom est obligatoire."],
      ["Comment faire des équipes ?",
        "Ouvrez « Groupe », puis « Équipes », et touchez « Créer une équipe ». Donnez-lui un nom et cochez les personnes."],
      ["Qui voit les téléphones et les e-mails ?",
        "Seulement les organisateurs. Les autres voient le prénom, le nom, le rôle et les équipes."],
      ["Pourquoi je ne peux pas modifier la liste ?",
        "Seuls les organisateurs ajoutent, modifient ou retirent des personnes. Il en reste toujours au moins un."]
    ],
    aideAutreTexte: "Demandez à un organisateur du groupe.",
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
    aideQuestions: [
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
        "Ouvrez « Association », puis « Personnes » ou « Équipes ». Seul le bureau peut modifier ces listes ; l'équipe « Le bureau » se forme d'office."]
    ],
    aideAutreTexte: "Demandez à un membre du bureau. Dans la vraie application, un bouton permettra d'écrire à l'équipe MonAsso.",
    charteCouleurTitre: "Couleur de l'association",
    charteCouleurTexte: "Essayez une autre couleur principale : tout l'affichage suit, en restant lisible.",
    charteCouleurDetail: "Aplats, repères, illustrations. Remplaçable par celle de l'association.",
    charteExemplePrincipal: "Créer un événement",
    charteRegleVocabulaire: "« Actions » côté bureau, « coups de main » côté parents."
  }
};

if (typeof module !== "undefined") { module.exports = MOTS; }
