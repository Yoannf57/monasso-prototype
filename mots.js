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
  Demande 008 : les mots des commentaires (msgCom…), de leur notification (msgNotifCom…), de la pastille du menu
  (msgPastille…) et de l'écran Démo « Ce qui serait envoyé » (msgDemo…) sont dans la liste commune ;
  « Prochains rendez-vous » (msgAccueilRendezVous) est dans la liste du groupe simple.
  Demande 009 : les mots de l'idée et de l'info sont dans la liste commune ; ceux qui nomment le bureau ou les organisateurs
  (msgIdeeAussiGestion, msgAEtGestion), les exemples (msgChampIdeeAide, msgChampInfoAide) et tout ce qui touche à l'événement
  né d'une idée (msgIdeeEnEvenement, msgIdeeDevenueEvenement, msgEvenementVientIdee…) sont dans la liste de chaque sorte de groupe.
  Demande 010 : les mots de la réponse par lien (msgLien…) sont tous dans la liste commune ; aucun ne nomme le bureau, un événement
  ni un coup de main. Les tournures de la page des parents y sont reprises mot pour mot, sous des clés neuves : les écrans des
  coups de main gardent leurs textes.
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
    // Demande 007d : « Quand ? » est le seul titre affiché au-dessus du jour et de l'heure, hors du repli.
    msgQuand: "Quand ?",
    msgOptions: "Ajouter une date ou un nombre de Oui",
    // Depuis la 007d, « Jour du rendez-vous » et « Heure » nomment la grille et la ligne pour les lecteurs d'écran, sans être affichés.
    msgChampJour: "Jour du rendez-vous",
    // Demande 007d : la grille des jours commence par « Aujourd'hui » et « Demain », puis cinq jours nommés.
    msgJourAujourdhui: "Aujourd'hui",
    msgJourDemain: "Demain",
    // Demande 007b : les sept prochains jours, nommés (« jeudi 26 »), puis « Autre date » ; les heures courantes, puis « Autre heure ».
    // Entre le jour et son numéro, comme dans une heure, l'espace est celle qui ne se coupe pas en fin de ligne.
    msgJourNomme: "{jour} {numero}",
    msgJourAutre: "Autre date",
    msgChampHeure: "Heure",
    msgHeuresCourantes: ["18:00", "19:00", "20:00", "21:00"],
    msgHeureAutre: "Autre heure",
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
    // Demande 009 : le bloc peut montrer une idée ou une info ; le texte change, pas la clé.
    msgAccueilAutres: ["et {n} autre message", "et {n} autres messages"],

    // Calendrier
    msgVoirCalendrier: "Voir le calendrier",
    msgCalendrierTitre: "Calendrier",
    msgRendezVousTitre: "Rendez-vous",
    msgLegendeRendezVous: "une question avec une date",
    msgAucunRendezVous: "Aucun rendez-vous à venir.",
    msgAucunRendezVousAide: "Ajoutez une date à une question : elle apparaîtra ici.",

    // ---------- Demande 008 : commentaires, pastille du menu, ce qui serait envoyé ----------

    // Les commentaires, sous le message. Couples : un, plusieurs.
    msgComTitre: "Commentaires",
    msgComVoirAnciens: ["Voir {n} commentaire plus ancien", "Voir les {n} commentaires plus anciens"],
    msgComSigne: "{nom} · le {quand}",
    msgComChamp: "Votre commentaire",
    // Le compteur d'un texte de 300 caractères : la même clé sert à la demande 009 (décision du 2026-11-19).
    msgCompteCaracteres300: "{n} sur 300",
    msgComPublier: "Publier le commentaire",
    msgComPublie: "Commentaire publié.",
    msgComSupprimer: "Supprimer ce commentaire",
    msgComSupprimerLecture: "Supprimer le commentaire de {nom}, du {quand}",
    msgComConfirmerSupprimer: "Supprimer ce commentaire ? Il disparaîtra pour tout le monde.",
    msgComSupprime: "Commentaire supprimé.",
    msgComNouveaux: ["{n} nouveau commentaire", "{n} nouveaux commentaires"],
    msgComVide: "Aucun commentaire pour l'instant.",
    msgComErreurVide: "Écrivez votre commentaire.",
    msgComErreurLong: "Un commentaire tient en 300 caractères au plus.",
    msgComClos: "Ce message est clos : on ne peut plus commenter.",
    msgComErreurSupprimer: "Vous ne pouvez supprimer que vos commentaires.",

    // La pastille sur l'entrée « Messages » du menu : un nombre de 1 à 9, puis « 9+ » ; le nom lu de l'onglet.
    msgPastilleLecture: ["Messages, {n} message à répondre", "Messages, {n} messages à répondre"],
    msgPastilleMax: "9+",

    // Démo › « Voir ce qui serait envoyé » (le titre de l'écran est msgEnvoiTitre)
    msgDemoEnvoisTexte: "Ce prototype n'envoie rien. Voici ce qui serait parti dans ce groupe, le plus récent d'abord.",
    msgDemoSorteQuestion: "Nouvelle question",
    msgDemoSorteRelance: "Relance",
    msgDemoSorteCommentaire: "Commentaire",
    msgDemoQuand: "le {quand}",
    msgDemoVoirAnciennes: ["Voir {n} notification plus ancienne", "Voir les {n} notifications plus anciennes"],
    msgDemoComSupprime: "Commentaire supprimé depuis.",
    msgDemoVide: "Rien ne serait parti pour l'instant.",
    msgDemoVideAide: "Posez une question ou relancez-la : la notification apparaîtra ici.",

    // La notification d'un commentaire, pour l'auteur du message seul
    msgNotifComEntete: "{groupe} · {prenom} a commenté votre message :",
    msgNotifComCitation: "« {commentaire} »",
    msgNotifComFin: "Lisez les commentaires dans MonAsso.",

    // ---------- Demande 009 : lancer une idée, donner une info ----------
    // Le choix « Écrire un message » : trois entrées, pas une de plus.
    msgEcrire: "Écrire un message",
    msgChoixTitre: "Écrire un message",
    msgLancerIdee: "Lancer une idée",
    msgDonnerInfo: "Donner une info",
    msgChoixQuestionAide: "Chacun répond Oui ou Non.",
    msgChoixIdeeAide: "Chacun peut dire Bonne idée.",
    msgChoixInfoAide: "Chacun répond Vu.",
    // Le mot de sorte, écrit sur chaque ligne et au-dessus du titre du message
    msgSorteQuestion: "Question",
    msgSorteIdee: "Idée",
    msgSorteInfo: "Info",
    // Nouvelle idée
    msgChampIdee: "Votre idée",
    msgIdeeExplication: "Ajouter une explication",
    msgChampExplication: "Explication (facultatif)",
    msgEnvoyerIdee: "Envoyer l'idée",
    msgVoirLIdee: "Voir l'idée",
    msgNotifIdeeEntete: "{groupe} · {prenom} lance une idée :",
    msgNotifIdeeFin: "Dites « Bonne idée » dans MonAsso.",
    // L'idée
    msgBonneIdee: "Bonne idée",
    msgIdeeVotreReponse: "Vous avez dit Bonne idée.",
    msgIdeeRetirer: "Retirer ma réponse",
    msgIdeeCompteur: "{n} Bonne idée",
    msgIdeeCompteurZero: "Personne n'a encore dit Bonne idée.",
    msgListeDestinataires: "Destinataires",
    msgIdeeRetenir: "Retenir l'idée",
    msgIdeeClasser: "Classer l'idée",
    msgIdeeRetenue: "Retenue",
    msgIdeeClassee: "Classée",
    msgIdeeRetenueLe: "Idée retenue le {date}.",
    msgIdeeClasseeLe: "Idée classée le {date}. Elle reste lisible dans « Terminés ».",
    msgNotifIdeeRetenueEntete: "{groupe} · {prenom} a retenu votre idée :",
    msgNotifIdeeClasseeEntete: "{groupe} · {prenom} a classé votre idée :",
    msgNotifIdeeDecisionFin: "Retrouvez-la dans « Terminés », dans MonAsso.",
    msgDemoSorteIdee: "Nouvelle idée",
    msgDemoSorteInfo: "Nouvelle info",
    msgDemoSorteIdeeRetenue: "Idée retenue",
    msgDemoSorteIdeeClassee: "Idée classée",
    // Nouvelle info
    msgChampInfo: "Votre info",
    msgEnvoyerInfo: "Envoyer l'info",
    msgVoirLInfo: "Voir l'info",
    msgNotifInfoEntete: "{groupe} · Info de {prenom} :",
    msgNotifInfoFin: "Touchez « Vu » dans MonAsso.",
    msgNotifInfoRelanceFin: "Vous n'avez pas encore vu cette info. Touchez « Vu » dans MonAsso.",
    // L'info
    msgVu: "Vu",
    msgInfoVotreReponse: "Vous avez vu cette info.",
    msgInfoCompteur: ["{n} sur {total} a vu", "{n} sur {total} ont vu"],
    msgInfoCompteurZero: "Personne n'a encore vu, sur {total}.",
    msgInfoToutVu: "Tout le monde a vu.",
    msgInfoListeVu: "Ont vu",
    msgInfoListePasVu: "N'ont pas encore vu",
    msgInfoListeVuVide: "Personne n'a encore vu.",
    msgInfoRelancer: "Relancer ceux qui n'ont pas vu",
    msgInfoRelanceTexte: [
      "Ce prototype n'envoie rien. {n} personne n'a pas encore vu cette info et recevrait ce message :",
      "Ce prototype n'envoie rien. {n} personnes n'ont pas encore vu cette info et recevraient ce message :"
    ],
    msgInfoClore: "Clore l'info",
    msgInfoConfirmerClore: "Clore l'info ? Elle passera dans « Terminés » et ne sera plus relancée.",
    msgInfoCloseLe: "Info close le {date}.",
    // Erreurs des écrans « Nouvelle idée » et « Nouvelle info »
    msgErreurIdeeVide: "Écrivez votre idée.",
    msgErreurIdeeLongue: "L'idée tient en 80 caractères au plus.",
    msgErreur300: "300 caractères au plus.",
    msgErreurInfoVide: "Écrivez votre info.",
    msgErreurAQuiEnvoyer: "Choisissez à qui l'envoyer.",

    // Page Charte : les exemples de la demande 009 (tous inertes)
    charteIdeeInfo: {
      titre: "Idée et info : le bouton de réponse seul, le texte sur plusieurs lignes",
      avant: "Avant la réponse",
      apres: "Après « Bonne idée »",
      ligne: "Une ligne de liste : le mot de sorte, puis l'état",
      idee: "Un goûter après le match ?",
      ideeClassee: "Changer de terrain en hiver ?",
      de: "Lucie",
      compte: 3,
      texte: "Un texte saisi sur plusieurs lignes",
      explication: "On partage les frais.\nChacun amène un gâteau ou une boisson.",
      info: "Jeudi, on joue sur le terrain du haut.\nRendez-vous à 19\u00A0h\u00A045 devant le portail."
    },

    // Page Charte : les exemples de la demande 008 (zone de saisie, lien sous un commentaire, pastille du menu, lignes d'un bloc)
    charteCommentaires: {
      titre: "Commentaires",
      commentaire: "Je viens mais j'arrive à 20\u00A0h\u00A015.",
      nom: "Mehdi Saïdi",
      quand: "17 novembre à 18\u00A0h\u00A040",
      saisie: "Qui amène les chasubles ?",
      pastille: "Pastille du menu",
      pastilleNombres: [2, 12],
      lignes: "Lignes dans un bloc",
      lignesTitre: "Prochains rendez-vous",
      rendezVous: [
        ["jeudi 19 novembre à 20\u00A0h", "Qui pour jouer jeudi 20\u00A0h ?", "8 Oui sur 10 attendus"],
        ["mardi 1 décembre à 19\u00A0h\u00A030", "Qui vient au repas de fin d'année ?", "5 Oui sur 5 attendus"]
      ]
    },

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
      question: "Qui pour jouer jeudi 20 h ?",
      de: "Samir",
      rendezVous: "jeudi à 20 h",
      autres: 2
    },

    // Page Charte : l'exemple du bloc à deux liens de l'accueil (décision du 2026-11-19, soir).
    // Mots communs : la page s'ouvre aussi dans un groupe simple.
    charteBlocLiens: {
      titre: "Bloc à deux liens",
      haut: "Le bloc ouvre un écran",
      bas: "Ouvrir un autre écran"
    },

    // ---------- Demande 010 : répondre par lien, sans compte ----------

    // Sur le message, pour ceux qui gèrent la question
    msgLienTitre: "Faire répondre par lien",
    msgLienTexte: "Pour les personnes qui n'ont pas MonAsso : elles répondent Oui ou Non avec ce lien, sans créer de compte.",
    msgLienCopier: "Copier le lien",
    msgLienCopie: "Lien copié.",
    msgLienCopieImpossible: "Copie impossible ici : appuyez longuement sur le lien pour le copier.",
    msgLienAfficherQr: "Afficher le QR code",
    msgLienMasquerQr: "Masquer le QR code",
    msgLienQrTexte: "Faites scanner ce QR code : il ouvre la page de réponse.",
    msgLienQrPrototype: "Dans ce prototype, le QR code est un dessin : il ne se scanne pas.",
    msgLienPartager: "Partager le lien",
    msgLienPartageTexte: "Répondez Oui ou Non ici, sans créer de compte : {lien}",
    msgLienPartageImpossible: "Partage impossible ici : copiez le lien.",

    // La page ouverte par le lien : la réponse, puis le prénom
    msgLienSansCompte: "Pas besoin de compte.",
    msgLienCompletAide: "Le nombre de Oui attendus est atteint. Vous pouvez encore répondre.",
    msgLienVousRepondez: "Vous répondez {reponse}.",
    msgLienChampPrenom: "Votre prénom",
    msgLienChampInitiale: "Première lettre de votre nom",
    msgLienChampInitialeAide: "Par exemple D pour Dupont.",
    msgLienVisible: "Votre prénom et cette lettre ne sont montrés qu'aux personnes qui s'occupent de cette question. Aucun téléphone ni e-mail n'est demandé.",
    msgLienEnvoyer: "Envoyer ma réponse",
    msgLienErreurPrenom: "Indiquez votre prénom.",
    msgLienErreurPrenomLong: "Ce prénom est un peu long : 40 lettres au plus.",
    msgLienErreurInitiale: "Indiquez la première lettre de votre nom.",
    msgLienErreurClose: "Cette question vient d'être close. Votre réponse n'a pas été enregistrée.",
    msgLienInconnu: "Ce lien ne mène à aucune question.",
    msgLienInconnuAide: "Vérifiez le lien, ou redemandez-le à la personne qui vous l'a envoyé.",
    msgLienClose: "Cette question est close. On ne peut plus répondre.",

    // Ma réponse : le lien personnel
    msgLienNote: "C'est noté, {prenom}.",
    msgLienMaReponse: "Votre réponse",
    msgLienNomPublic: "Votre réponse est notée au nom de « {nom} ».",
    msgLienAgendaAide: "L'agenda garde aussi votre lien pour changer d'avis.",
    msgLienAgendaRetirer: "Si vous l'aviez ajouté à votre agenda, pensez à l'en retirer.",
    msgLienGarderTitre: "Pour changer d'avis plus tard",
    msgLienGarderTexte: "Rouvrez le lien reçu sur ce téléphone : votre réponse sera là. Ou gardez votre lien personnel.",
    msgLienCopierLeMien: "Copier mon lien",
    msgLienAutrePersonne: "Répondre pour une autre personne",
    msgLienReponseInconnue: "Ce lien ne mène à aucune réponse.",
    msgLienReponseRetiree: "Votre réponse a été retirée. Elle ne compte plus. Pour en savoir plus, demandez à la personne qui vous a envoyé le lien.",

    // Dans les listes « Oui » et « Non » du message. Entre le nom et le point, l'espace est celle qui ne se coupe pas :
    // le point n'est jamais seul en début de ligne.
    msgLienParLien: "{nom}\u00A0· par lien",
    msgLienNombreParLien: ["{n} réponse par lien", "{n} réponses par lien"],
    msgLienRetirer: "Retirer cette réponse",
    msgLienConfirmerRetrait: "Retirer la réponse de {nom} ? Elle ne comptera plus, et ne pourra pas revenir depuis le même téléphone.",
    msgLienRetiree: "La réponse de {nom} est retirée.",
    msgLienDejaRetiree: "Cette réponse a déjà été retirée.",

    // Démo › « Voir en invité », sans question ouverte
    msgLienDemoAucune: "Aucune question ouverte dans ce groupe.",
    msgLienDemoAucuneAide: "Posez-en une dans « Messages », puis revenez ici.",

    // Page Charte : le partage par lien (R1), le QR code de 200 px (N15), la page ouverte par lien (R2)
    charteLien: {
      titre: "Réponse par lien",
      partage: "Partage par lien. Sur l'écran d'un message, les trois boutons sont à contour : « Copier le lien » n'est plein que si l'écran n'a aucun autre bouton principal.",
      lien: "https://exemple.fr/#reponse/3f9a…",
      page: "Page ouverte par lien : ni menu du bas, ni « Aide », ni retour vers l'application.",
      groupe: "Les amis du jeudi",
      question: "Qui vient jeudi ?",
      lienPersonnel: "https://exemple.fr/#ma-reponse/7c2e…"
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
      // Demande 010 : la page publique d'une question ouverte
      voirEnInvite: "Voir en invité",
      voirEspaceParent: "Voir l'espace parent (vide-grenier)",
      // Demande 008 : les notifications simulées, avec leur texte
      voirEnvois: "Voir ce qui serait envoyé",
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
    // Demande 007c (journal du 2026-11-19) : la phrase de Yoann, mot pour mot.
    essaiAncien: "Cet essai vient d'une version précédente et ne peut plus être ouvert.",

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
    msgChampQuestionAide: "Par exemple : Qui pour jouer jeudi 20 h ?",
    msgAGestion: "Les organisateurs",
    // Demande 009 : une idée est toujours adressée aussi aux organisateurs ; les exemples des champs.
    msgChampIdeeAide: "Par exemple : Un tournoi en juin ?",
    msgIdeeAussiGestion: "Les organisateurs la reçoivent aussi : ils peuvent la retenir.",
    msgAEtGestion: "{destinataires} et les organisateurs",
    msgChampInfoAide: "Par exemple : Jeudi, on joue sur le terrain du haut.",
    // Demande 007b : la phrase d'aide du réglage suit l'état du bouton.
    msgReglageAideEteint: "Seuls les organisateurs écrivent à tout le groupe.",
    msgReglageAideAllume: "Les organisateurs et les membres écrivent à tout le groupe.",
    // Demande 008 : le second bloc de l'accueil d'un groupe simple.
    msgAccueilRendezVous: "Prochains rendez-vous",
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
        "Ouvrez « Messages », touchez « Écrire un message », puis « Demander qui est partant ». Écrivez la question, choisissez à qui, envoyez. Chacun répond Oui ou Non."],
      ["Comment ajouter une précision à ma réponse ?",
        "Ouvrez le message et écrivez sous « Commentaires », tout en bas. 300 caractères au plus."],
      ["Comment lancer une idée ?",
        "Ouvrez « Messages », touchez « Écrire un message », puis « Lancer une idée ». Écrivez-la en une ligne, choisissez à qui, envoyez. Chacun peut dire Bonne idée."],
      ["Comment savoir qui a vu mon info ?",
        "Ouvrez votre info dans « Messages » : le nombre de personnes qui l'ont vue est écrit sous le texte. Touchez « N'ont pas encore vu » pour lire les noms."],
      ["Comment faire répondre ceux qui n'ont pas MonAsso ?",
        "Ouvrez la question et touchez « Copier le lien ». Envoyez-le : chacun répond Oui ou Non, sans créer de compte."]
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
    // Demande 007b : dans une heure, les espaces sont celles qui ne se coupent pas (une heure tient d'un seul morceau en fin de ligne).
    heureRonde: "{h} h",
    heureMinutes: "{h} h {min}",
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
    // Demande 007d : la phrase n'a pas de point final, {nom} finit déjà par le point de l'initiale (« Olivier H. »).
    lienInscritAuNom: "Inscrit au nom de {nom}",
    lienEvenementSupprime: "Cet événement n'existe plus.",
    lienEvenementSupprimeAide: "Le bureau de l'association peut vous renseigner.",

    // Messages à envoyer : le nom de l'événement entre guillemets, jamais précédé de « le » ou « la »
    messageCoupsDeMain: "Bonjour, on cherche des parents pour « {nom} », {date}. Même une heure aide beaucoup, sans créer de compte : {lien}",
    messageLienPersonnel: "Mon coup de main pour « {nom} » : {creneau}, {date}, {horaire}. Pour annuler : {lien}",

    // ---------- Demande 007 : les mots des messages propres à une association ----------
    msgChampQuestionAide: "Par exemple : Qui peut tenir la buvette samedi ?",
    msgAGestion: "Le bureau",
    // Demande 009 : une idée est toujours adressée aussi au bureau ; les exemples des champs ; l'événement né d'une idée.
    msgChampIdeeAide: "Par exemple : Une tombola à la kermesse ?",
    msgIdeeAussiGestion: "Le bureau la reçoit aussi : il peut la retenir.",
    msgAEtGestion: "{destinataires} et le bureau",
    msgChampInfoAide: "Par exemple : La réunion de jeudi est décalée à mardi, 20\u00A0h\u00A030.",
    msgIdeeEnEvenement: "En faire un événement",
    msgIdeeNomRaccourci: "Le titre de l'idée a été raccourci à 60 lettres. Vérifiez le nom.",
    msgIdeeDevenueEvenement: "Devenue l'événement « {nom} »",
    msgEvenementVientIdee: "Vient de l'idée « {titre} »",
    msgErreurVisiteurEcrire: "Vous pouvez répondre aux messages, pas en écrire.",
    msgChampEvenement: "Événement concerné",
    msgAucunEvenement: "Aucun",
    msgPourEvenement: "Pour : {titre}",
    msgVideAideVisiteur: "Les questions qu'on vous pose apparaîtront ici.",
    msgErreurVisiteur: "Vous pouvez répondre aux questions, pas en poser.",
    // Demande 007b : la phrase d'aide du réglage suit l'état du bouton.
    msgReglageAideEteint: "Seul le bureau écrit à tout le groupe.",
    msgReglageAideAllume: "Le bureau et les membres écrivent à tout le groupe.",
    // La ligne des créneaux à l'accueil du bureau, et la ligne d'aide de l'écran « Créneaux qui manquent de monde »
    accueilRappelsCreneaux: ["Voir le créneau qui manque de monde", "Voir les {n} créneaux qui manquent de monde"],
    accueilRappelsAide: "Les créneaux remplis à moins de la moitié",
    // Demande 007c : l'écran « Créneaux qui manquent de monde », ouvert par la ligne de l'accueil (bureau seulement)
    creneauxManqueTitre: "Créneaux qui manquent de monde",
    creneauManque: ["Il manque {n} personne", "Il manque {n} personnes"],
    creneauxManqueVide: "Aucun créneau ne manque de monde.",

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
        "Ouvrez « Messages », touchez « Écrire un message », puis « Demander qui est partant ». Écrivez la question, choisissez à qui, envoyez. Chacun répond Oui ou Non."],
      ["Comment ajouter une précision à ma réponse ?",
        "Ouvrez le message et écrivez sous « Commentaires », tout en bas. 300 caractères au plus."],
      ["Comment lancer une idée ?",
        "Ouvrez « Messages », touchez « Écrire un message », puis « Lancer une idée ». Écrivez-la en une ligne, choisissez à qui, envoyez. Chacun peut dire Bonne idée."],
      ["Comment savoir qui a vu mon info ?",
        "Ouvrez votre info dans « Messages » : le nombre de personnes qui l'ont vue est écrit sous le texte. Touchez « N'ont pas encore vu » pour lire les noms."],
      ["Comment faire répondre ceux qui n'ont pas MonAsso ?",
        "Ouvrez la question et touchez « Copier le lien ». Envoyez-le : chacun répond Oui ou Non, sans créer de compte."]
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
