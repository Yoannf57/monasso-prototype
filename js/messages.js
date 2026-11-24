/*
  Règles de la demande 007, sans rien d'affichage : la question « Qui est partant ? ».
  Chargé par la page et par les tests automatiques (Node).

  Règle des destinataires (docs/demandes/_regle-destinataires.md), contrôlée ici et pas seulement à l'écran :
  - chacun écrit au bureau (ou aux organisateurs), à une équipe dont il fait partie, ou à des personnes choisies ;
  - dix personnes choisies au plus pour un membre ; aucune limite pour le bureau et les organisateurs,
    qui écrivent aussi à toutes les équipes ;
  - « Tout le groupe » : le bureau et les organisateurs toujours ; un membre seulement si le réglage
    du groupe est allumé (éteint par défaut) ;
  - un visiteur répond, il ne lance rien ;
  - un message n'est visible que de son auteur et de ses destinataires.

  Une question (rangée dans groupe.messages) :
  - id, sorte ("question"), texte (80 caractères au plus) ;
  - auteurId, et auteur : le nom noté ce jour-là, affiché si la personne n'est plus dans le groupe ;
  - a : à qui elle a été posée, { sorte: "tous" | "gestion" | "equipe" | "personnes", equipeId, nom } ;
  - destinataires : la liste des personnes, figée à l'envoi ;
  - oui, non : les personnes qui ont répondu (la date de la réponse n'est pas gardée) ;
  - en option : jour ("AAAA-MM-JJ") et heure ("HH:MM") du rendez-vous, attendus (nombre de Oui attendus),
    avantLe ("AAAA-MM-JJ"), evenementId (association) ;
  - creeLe, et closeLe si elle a été close à la main.
  Une question se clôt aussi d'elle-même : une fois passée la date « avantLe », à défaut une fois passé le jour
  du rendez-vous. Sans aucune date, elle reste ouverte.

  Données d'exemple (donnees.js) : pour que la démo reste fraîche, les dates y sont écrites « dans N jours »
  (creeDansJours, closeDansJours, jourDansJours, avantLeDansJours) ; jourSemaine avance le rendez-vous
  jusqu'à ce jour de la semaine (4 = jeudi) ; avantLeJoursAvant compte à rebours du rendez-vous.

  Commentaires (demande 008), rangés dans la question (commentaires) :
  - id, n (numéro d'ordre sous ce message, jamais réutilisé), auteurId, auteur (le nom noté ce jour-là),
    texte (300 caractères au plus), le ("AAAA-MM-JJ") et heure ("HH:MM") ; dans les données d'exemple, dansJours à la place de « le » ;
  - dernierCommentaire : le dernier numéro donné ; vus : pour chaque personne, le numéro du dernier commentaire
    qu'elle avait sous les yeux à sa dernière ouverture du message (sert à « 2 nouveaux commentaires »).
  Qui voit le message voit ses commentaires et peut en écrire un, visiteur compris, tant que le message est ouvert.
  Chacun supprime le sien ; le bureau ou les organisateurs suppriment tous ceux des messages qu'ils voient.

  Ce qui serait envoyé (demande 008), rangé dans groupe.envois : une entrée par envoi simulé, jamais rien d'envoyé.
  - id, sorte ("question", "relance", "commentaire"), messageId, le et heure (ou dansJours), de (le prénom de qui envoie),
    a (les personnes qui recevraient la notification) ; pour un commentaire : commentaireId, commentaire (son texte, gardé
    tel qu'il serait parti) et supprime (le commentaire a été supprimé depuis).
  Nouvelle question : tous les destinataires sauf l'auteur. Relance : ceux qui n'ont pas répondu.
  Commentaire : l'auteur du message seul (décision du 2026-11-19), et rien s'il commente son propre message.

  Demande 009 : deux autres sortes de messages, et pas une de plus. Même liste, même règle des destinataires.
  Une idée (sorte "idee") :
  - texte (son titre, 80 caractères au plus), explication (facultative, 300 caractères au plus, retours à la ligne gardés) ;
  - destinataires : le choix fait dans « À qui ? », plus toutes les personnes du bureau (ou tous les organisateurs), une fois
    chacune (décision du 2026-11-19), sans l'auteur, qui ne répond pas à sa propre idée ;
  - bonneIdee : les personnes qui ont dit « Bonne idée » (aucune date gardée) ;
  - etat ("retenue" ou "classee", absent tant qu'elle est ouverte), decideLe ("AAAA-MM-JJ") ;
  - evenementId : l'événement né de l'idée (association) ; l'événement garde ideeId en retour.
  Seuls le bureau ou les organisateurs retiennent ou classent ; l'auteur est prévenu à chaque passage, sauf s'il décide lui-même.
  Une info (sorte "info") :
  - texte (300 caractères au plus, retours à la ligne gardés), destinataires (sans l'auteur) ;
  - vu : les personnes qui ont touché « Vu » (aucune date gardée ; ouvrir l'info ne compte pas) ;
  - closeLe si l'auteur l'a close. Seul l'auteur lit qui a vu, relance et clôt.
  Envois de plus (groupe.envois) : "idee", "info", "idee-retenue" et "idee-classee" (vers l'auteur de l'idée seul) ;
  la relance d'une info garde la sorte "relance".

  Demande 010 : répondre par lien, sans compte. Le lien ne vaut que pour une question.
  - le code secret du lien d'une question, différent de son id, est rangé dans le groupe (groupe.liens : pour chaque question, son
    code) ; il est fabriqué la première fois qu'on en a besoin, et la question elle-même n'en est pas changée ;
  Dans la question :
  - parLien : les réponses données par le lien, chacune { jeton (le lien personnel), prenom, initiale (une lettre, jamais le nom
    entier), reponse ("oui" ou "non"), personneId (seulement si la réponse est rattachée à un destinataire) }. Ni téléphone ni e-mail ;
  - retires : les jetons des réponses retirées par celui qui gère la question, et rien d'autre (le prénom et l'initiale sont effacés).
  Rattachement (décision du 2026-11-19), décidé une fois, à l'envoi : si le prénom et l'initiale correspondent à un seul destinataire,
  et qu'il n'a pas répondu, la réponse lui est rattachée et il quitte « Pas encore répondu » ; sinon elle reste « par lien ».
  Un Oui par lien compte dans le compteur et peut faire apparaître « Complet ». Seules les réponses par lien se retirent.

  Les erreurs de saisie sont rendues sous forme de codes ; leurs textes sont dans mots.js.
*/
(function (racine) {
  "use strict";

  var L = typeof module !== "undefined" ? require("./logique.js") : racine.Logique;
  var Gr = typeof module !== "undefined" ? require("./groupes.js") : racine.Groupes;
  var Ev = typeof module !== "undefined" ? require("./evenements.js") : racine.Evenements;

  var HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
  var NOMBRE = /^\d{1,4}$/;
  var LIMITES = { texte: 80, personnesMembre: 10, commentaire: 300, explication: 300, info: 300, prenomInvite: 40 };
  // Les trois sortes de messages. Il n'y en a pas de quatrième.
  var SORTES = ["question", "idee", "info"];

  function nettoyer(t) { return String(t == null ? "" : t).replace(/\s+/g, " ").trim(); }
  // Un texte sur plusieurs lignes : les retours à la ligne sont gardés, les espaces du début et de la fin retirés.
  // Un texte fait seulement d'espaces compte comme vide.
  function nettoyerLignes(t) { return String(t == null ? "" : t).replace(/\r\n?/g, "\n").trim(); }
  function sorteDe(m) { return m && SORTES.indexOf(m.sorte) >= 0 ? m.sorte : "question"; }

  function nouvelId(prefixe) {
    var octets = new Uint8Array(6);
    racine.crypto.getRandomValues(octets);
    return prefixe + "-" + Array.prototype.map.call(octets, function (o) { return ("0" + o.toString(16)).slice(-2); }).join("");
  }

  function contient(liste, id) { return (liste || []).indexOf(id) >= 0; }

  // La personne telle qu'elle est dans le groupe aujourd'hui (son rôle a pu changer), ou null.
  function membre(groupe, personne) {
    return personne && groupe ? Gr.trouverPersonne(groupe, personne.id) : null;
  }

  // ---------- Dates d'une question ----------

  function dateEcrite(m, cle, cleRelative, reference) {
    if (m[cle]) { return Ev.lireDate(m[cle]); }
    return typeof m[cleRelative] === "number" ? L.ajouterJours(L.aujourdhui(reference), m[cleRelative]) : null;
  }

  function dateCreation(m, reference) { return dateEcrite(m, "creeLe", "creeDansJours", reference); }

  // Le jour du rendez-vous, ou null.
  function dateRendezVous(m, reference) {
    var d = dateEcrite(m, "jour", "jourDansJours", reference);
    if (d && !m.jour && typeof m.jourSemaine === "number") { d = L.ajouterJours(d, (m.jourSemaine - d.getDay() + 7) % 7); }
    return d;
  }

  // La date « Réponse avant le », ou null.
  function dateAvantLe(m, reference) {
    var d = dateEcrite(m, "avantLe", "avantLeDansJours", reference);
    if (!d && typeof m.avantLeJoursAvant === "number") {
      var rdv = dateRendezVous(m, reference);
      d = rdv ? L.ajouterJours(rdv, -m.avantLeJoursAvant) : null;
    }
    return d;
  }

  // Le jour où la question a été close (à la main, ou d'elle-même le lendemain de sa date limite), ou null si elle est ouverte.
  // Une idée est « close » dès qu'elle est retenue ou classée ; une info, quand son auteur l'a close.
  function dateCloture(m, reference) {
    if (sorteDe(m) === "idee") { return m.etat ? (dateEcrite(m, "decideLe", "decideDansJours", reference) || dateCreation(m, reference) || L.aujourdhui(reference)) : null; }
    var main = dateEcrite(m, "closeLe", "closeDansJours", reference);
    if (main) { return main; }
    if (sorteDe(m) !== "question") { return null; }
    var limite = dateAvantLe(m, reference) || dateRendezVous(m, reference);
    return limite && L.joursJusqua(limite, reference) < 0 ? L.ajouterJours(limite, 1) : null;
  }

  function estClose(m, reference) { return !!dateCloture(m, reference); }

  // ---------- Réglage du groupe ----------

  function reglageToutLeGroupe(groupe) {
    return !!(groupe && groupe.reglages && groupe.reglages.membresToutLeGroupe === true);
  }

  // Seuls le bureau ou les organisateurs changent le réglage.
  function changerReglage(groupe, personne, allume) {
    if (!Gr.peutGerer(groupe, membre(groupe, personne))) { return { ok: false, raison: "droits" }; }
    groupe.reglages = groupe.reglages || {};
    groupe.reglages.membresToutLeGroupe = allume === true;
    return { ok: true, allume: groupe.reglages.membresToutLeGroupe };
  }

  // ---------- Qui peut écrire à qui ----------

  // Un visiteur répond, il ne lance rien.
  function peutLancer(groupe, personne) {
    var p = membre(groupe, personne);
    return !!p && p.role !== "visiteur";
  }

  // Les lignes de « À qui ? » pour cette personne, dans l'ordre de l'écran, chacune avec ses personnes.
  function destinatairesPossibles(groupe, personne) {
    var p = membre(groupe, personne);
    if (!peutLancer(groupe, p)) { return []; }
    var gere = Gr.peutGerer(groupe, p);
    var lignes = [];
    if (gere || reglageToutLeGroupe(groupe)) {
      lignes.push({ valeur: "tous", sorte: "tous", personnes: groupe.personnes.map(function (x) { return x.id; }) });
    }
    lignes.push({ valeur: "gestion", sorte: "gestion", personnes: Gr.gestionnaires(groupe).map(function (x) { return x.id; }) });
    // « Le bureau » est déjà la ligne précédente : il n'apparaît qu'une fois. Une équipe sans personne n'est pas proposée.
    Gr.equipes(groupe).forEach(function (e) {
      if (e.bureau) { return; }
      var ids = Gr.membresEquipe(groupe, e).map(function (x) { return x.id; });
      if (!ids.length || (!gere && ids.indexOf(p.id) < 0)) { return; }
      lignes.push({ valeur: "e:" + e.id, sorte: "equipe", equipe: e, personnes: ids });
    });
    lignes.push({ valeur: "personnes", sorte: "personnes", personnes: [] });
    return lignes;
  }

  // Les personnes à cocher dans « Des personnes choisies » : tout le groupe, sauf soi.
  function personnesProposees(groupe, personne) {
    return Gr.personnesTriees(groupe).filter(function (x) { return !personne || x.id !== personne.id; });
  }

  // ---------- Lire une question ----------

  function messages(groupe) { return (groupe && groupe.messages) || []; }

  function trouver(groupe, id) {
    return messages(groupe).filter(function (m) { return m.id === id; })[0] || null;
  }

  // Les destinataires encore dans le groupe, dans l'ordre de la liste « Personnes ».
  function destinataires(groupe, m) {
    return Gr.personnesTriees(groupe).filter(function (p) { return contient(m.destinataires, p.id); });
  }

  function auteur(groupe, m) { return Gr.trouverPersonne(groupe, m.auteurId); }
  function estAuteur(groupe, personne, m) { var p = membre(groupe, personne); return !!p && m.auteurId === p.id; }
  function estDestinataire(groupe, personne, m) { var p = membre(groupe, personne); return !!p && contient(m.destinataires, p.id); }

  // Un message n'est visible que de son auteur et de ses destinataires.
  function estVisible(groupe, personne, m) {
    return !!m && (estAuteur(groupe, personne, m) || estDestinataire(groupe, personne, m));
  }

  // Le message, seulement pour qui a le droit de le voir : sinon null, comme s'il n'existait pas.
  function trouverVisible(groupe, personne, id) {
    var m = trouver(groupe, id);
    return estVisible(groupe, personne, m) ? m : null;
  }

  function visibles(groupe, personne) {
    return messages(groupe).filter(function (m) { return estVisible(groupe, personne, m); });
  }

  // Relancer, clore, refaire : l'auteur, plus le bureau ou les organisateurs s'ils sont destinataires.
  function peutGerer(groupe, personne, m) {
    var p = membre(groupe, personne);
    if (!p || !m) { return false; }
    // Une info : son auteur seul la relance et la clôt. Une idée ne se relance pas, ne se clôt pas, ne se refait pas.
    if (sorteDe(m) === "info") { return m.auteurId === p.id; }
    if (sorteDe(m) === "idee") { return false; }
    return m.auteurId === p.id || (Gr.peutGerer(groupe, p) && contient(m.destinataires, p.id));
  }

  // "oui", "non", ou "" si la personne n'a pas répondu. Une réponse par lien rattachée à la personne (demande 010) compte comme la sienne.
  function reponse(m, personne) {
    if (!personne) { return ""; }
    if (contient(m.oui, personne.id)) { return "oui"; }
    if (contient(m.non, personne.id)) { return "non"; }
    var r = reponseLienDe(m, personne.id);
    return r ? r.reponse : "";
  }

  // Les trois listes, en personnes : leur total égale le nombre de destinataires.
  // Demande 010 : lienOui et lienNon sont les réponses par lien qui ne sont rattachées à personne ; elles s'ajoutent aux listes
  // (le total des trois listes égale alors le nombre de destinataires plus le nombre de ces réponses). nbOui compte tous les Oui.
  function decompte(groupe, m) {
    var dest = destinataires(groupe, m);
    var oui = dest.filter(function (p) { return reponse(m, p) === "oui"; });
    var non = dest.filter(function (p) { return reponse(m, p) === "non"; });
    var sans = dest.filter(function (p) { return !reponse(m, p); });
    var libres = reponsesLien(m).filter(function (r) { return !personneRattachee(groupe, m, r); });
    var lienOui = libres.filter(function (r) { return r.reponse === "oui"; });
    var lienNon = libres.filter(function (r) { return r.reponse === "non"; });
    var attendus = typeof m.attendus === "number" ? m.attendus : 0;
    var nbOui = oui.length + lienOui.length;
    return { destinataires: dest, oui: oui, non: non, sans: sans, lienOui: lienOui, lienNon: lienNon, nbOui: nbOui, attendus: attendus, complet: attendus > 0 && nbOui >= attendus };
  }

  function estComplet(groupe, m) { return decompte(groupe, m).complet; }

  // ---------- Poser une question ----------

  // Le choix fait dans « À qui ? », le même pour les trois sortes : il doit faire partie des lignes proposées à cette personne.
  // Rend dest (les personnes, ou null), a (ce qui a été choisi) et erreurPersonnes ("aucune", "trop").
  function choisirDestinataires(groupe, p, saisie) {
    var r = { dest: null, a: null, erreurPersonnes: "" };
    var ligne = destinatairesPossibles(groupe, p).filter(function (l) { return l.valeur === saisie.a; })[0];
    if (ligne && ligne.sorte === "personnes") {
      var proposees = personnesProposees(groupe, p).map(function (x) { return x.id; });
      var choisies = (saisie.personnes || []).filter(function (id, i, t) { return proposees.indexOf(id) >= 0 && t.indexOf(id) === i; });
      r.a = { sorte: "personnes" };
      if (!choisies.length) { r.erreurPersonnes = "aucune"; }
      else if (!Gr.peutGerer(groupe, p) && choisies.length > LIMITES.personnesMembre) { r.erreurPersonnes = "trop"; }
      else { r.dest = choisies; }
    } else if (ligne) {
      r.dest = ligne.personnes.slice();
      r.a = { sorte: ligne.sorte };
      if (ligne.equipe) { r.a.equipeId = ligne.equipe.id; r.a.nom = ligne.equipe.nom; }
    }
    return r;
  }

  // saisie : texte, a ("tous", "gestion", "e:identifiant", "personnes" ou "memes"), personnes (identifiants cochés),
  // memesDe (la question refaite), jour, heure, attendus, avantLe, evenementId.
  function validerQuestion(groupe, personne, saisie, reference) {
    var p = membre(groupe, personne);
    var texte = nettoyer(saisie.texte);
    var erreurs = {};
    var valeurs = { texte: texte };
    if (!texte) { erreurs.texte = "vide"; } else if (texte.length > LIMITES.texte) { erreurs.texte = "long"; }

    // À qui : le choix doit faire partie des lignes proposées à cette personne.
    var dest = null;
    if (saisie.a === "memes") {
      var origine = trouver(groupe, saisie.memesDe);
      if (origine && sorteDe(origine) === "question" && peutGerer(groupe, p, origine)) {
        // La liste d'origine, telle quelle : elle a déjà respecté la règle de son auteur.
        dest = destinataires(groupe, origine).map(function (x) { return x.id; });
        valeurs.a = { sorte: origine.a.sorte };
        if (origine.a.equipeId) { valeurs.a.equipeId = origine.a.equipeId; }
        if (origine.a.nom) { valeurs.a.nom = origine.a.nom; }
      }
    } else {
      var choix = choisirDestinataires(groupe, p, saisie);
      dest = choix.dest;
      if (choix.a) { valeurs.a = choix.a; }
      if (choix.erreurPersonnes) { erreurs.personnes = choix.erreurPersonnes; }
    }
    if (!erreurs.personnes && (!dest || !dest.length)) { erreurs.a = "invalide"; }
    valeurs.destinataires = dest || [];

    // Options
    var auj = L.aujourdhui(reference);
    var jourTexte = String(saisie.jour == null ? "" : saisie.jour).trim();
    var jour = jourTexte ? Ev.lireDate(jourTexte) : null;
    if (jourTexte && (!jour || jour < auj)) { erreurs.jour = "passee"; jour = null; }
    var heureTexte = String(saisie.heure == null ? "" : saisie.heure).trim();
    var heure = HEURE.test(heureTexte) ? heureTexte : "";
    if (heure && !jourTexte) { erreurs.heure = "sans-jour"; }
    var avantTexte = String(saisie.avantLe == null ? "" : saisie.avantLe).trim();
    var avantLe = avantTexte ? Ev.lireDate(avantTexte) : null;
    if (avantTexte && (!avantLe || avantLe < auj)) { erreurs.avantLe = "passee"; }
    else if (avantLe && jour && avantLe > jour) { erreurs.avantLe = "apres"; }
    var attendusTexte = String(saisie.attendus == null ? "" : saisie.attendus).trim();
    var attendus = 0;
    if (attendusTexte) {
      attendus = NOMBRE.test(attendusTexte) ? Number(attendusTexte) : 0;
      if (attendus < 1) { erreurs.attendus = "invalide"; }
      else if (dest && dest.length && attendus > dest.length) { erreurs.attendus = "trop"; }
    }
    var evenementId = "";
    if (Gr.estAssociation(groupe) && saisie.evenementId) {
      var e = L.evenementsAVenir(groupe, reference).filter(function (x) { return x.id === saisie.evenementId; })[0];
      if (e) { evenementId = e.id; } else { erreurs.evenement = "invalide"; }
    }
    valeurs.jour = jour ? Ev.ecrireDate(jour) : "";
    valeurs.heure = jour ? heure : "";
    valeurs.avantLe = avantLe ? Ev.ecrireDate(avantLe) : "";
    valeurs.attendus = attendus;
    valeurs.evenementId = evenementId;
    return { ok: Object.keys(erreurs).length === 0, erreurs: erreurs, valeurs: valeurs, nbDestinataires: (dest || []).length };
  }

  function poserQuestion(groupe, personne, saisie, reference) {
    var p = membre(groupe, personne);
    if (!p) { return { ok: false, raison: "introuvable" }; }
    if (!peutLancer(groupe, p)) { return { ok: false, raison: "droits" }; }
    var v = validerQuestion(groupe, p, saisie, reference);
    if (!v.ok) { return { ok: false, raison: "saisie", erreurs: v.erreurs, nbDestinataires: v.nbDestinataires }; }
    var m = {
      id: nouvelId("m"), sorte: "question", texte: v.valeurs.texte,
      auteurId: p.id, auteur: Gr.nomComplet(p), creeLe: Ev.ecrireDate(L.aujourdhui(reference)),
      a: v.valeurs.a, destinataires: v.valeurs.destinataires, oui: [], non: []
    };
    if (v.valeurs.jour) { m.jour = v.valeurs.jour; }
    if (v.valeurs.heure) { m.heure = v.valeurs.heure; }
    if (v.valeurs.attendus) { m.attendus = v.valeurs.attendus; }
    if (v.valeurs.avantLe) { m.avantLe = v.valeurs.avantLe; }
    if (v.valeurs.evenementId) { m.evenementId = v.valeurs.evenementId; }
    groupe.messages = groupe.messages || [];
    groupe.messages.push(m);
    // Ce qui serait envoyé : tous les destinataires sauf l'auteur.
    noterEnvoi(groupe, { sorte: "question", messageId: m.id, de: p.prenom, a: m.destinataires.filter(function (x) { return x !== p.id; }) }, reference);
    return { ok: true, message: m };
  }

  // ---------- Répondre, clore, relancer ----------

  // Oui ou Non, autant de fois qu'on veut tant que la question est ouverte. Les destinataires seuls.
  function repondre(groupe, personne, id, valeur, reference) {
    var p = membre(groupe, personne);
    var m = trouverVisible(groupe, p, id);
    if (!m) { return { ok: false, raison: "introuvable" }; }
    if (sorteDe(m) !== "question") { return { ok: false, raison: "sorte" }; }
    if (!estDestinataire(groupe, p, m)) { return { ok: false, raison: "droits" }; }
    if (estClose(m, reference)) { return { ok: false, raison: "close" }; }
    if (valeur !== "oui" && valeur !== "non") { return { ok: false, raison: "saisie" }; }
    m.oui = (m.oui || []).filter(function (x) { return x !== p.id; });
    m.non = (m.non || []).filter(function (x) { return x !== p.id; });
    m[valeur].push(p.id);
    // Demande 010 : la réponse donnée dans l'application remplace celle du lien rattachée à cette personne, sans ligne en double.
    if (reponsesLien(m).some(function (r) { return r.personneId === p.id; })) {
      m.parLien = m.parLien.filter(function (r) { return r.personneId !== p.id; });
    }
    return { ok: true, message: m, reponse: valeur };
  }

  function clore(groupe, personne, id, reference) {
    var p = membre(groupe, personne);
    var m = trouverVisible(groupe, p, id);
    if (!m) { return { ok: false, raison: "introuvable" }; }
    if (!peutGerer(groupe, p, m)) { return { ok: false, raison: "droits" }; }
    if (estClose(m, reference)) { return { ok: false, raison: "close" }; }
    m.closeLe = Ev.ecrireDate(L.aujourdhui(reference));
    return { ok: true, message: m };
  }

  // Qui recevrait la relance : ceux qui n'ont pas encore répondu, pas plus. Rien n'est envoyé.
  function relance(groupe, personne, id, reference) {
    var p = membre(groupe, personne);
    var m = trouverVisible(groupe, p, id);
    if (!m) { return { ok: false, raison: "introuvable" }; }
    if (!peutGerer(groupe, p, m)) { return { ok: false, raison: "droits" }; }
    if (estClose(m, reference)) { return { ok: false, raison: "close", message: m }; }
    // Une info : ceux qui n'ont pas vu, et eux seuls.
    if (sorteDe(m) === "info") {
      var pasVu = decompteInfo(groupe, m).pasVu;
      return pasVu.length ? { ok: true, message: m, personnes: pasVu } : { ok: false, raison: "tout-vu", message: m };
    }
    var sans = decompte(groupe, m).sans;
    if (!sans.length) { return { ok: false, raison: "tout-repondu", message: m }; }
    return { ok: true, message: m, personnes: sans };
  }

  // ---------- Listes ----------

  // La plus pressée d'abord : « réponse avant le », à défaut le rendez-vous ; puis celles sans date, la plus ancienne d'abord.
  function parUrgence(reference) {
    var loin = 8640000000000000;
    return function (x, y) {
      var dx = dateAvantLe(x, reference) || dateRendezVous(x, reference), dy = dateAvantLe(y, reference) || dateRendezVous(y, reference);
      return ((dx ? dx.getTime() : loin) - (dy ? dy.getTime() : loin)) ||
        ((dateCreation(x, reference) || 0) - (dateCreation(y, reference) || 0));
    };
  }

  // Les trois listes de l'écran « Messages » pour cette personne.
  function listes(groupe, personne, reference) {
    var p = membre(groupe, personne);
    var r = { aRepondre: [], enCours: [], termines: [] };
    visibles(groupe, p).forEach(function (m) { r[rangement(groupe, p, m, reference)].push(m); });
    // Tri stable : à égalité, l'ordre d'arrivée est gardé.
    r.aRepondre.sort(parUrgence(reference));
    // « En cours » et « Terminés » : le plus récent d'abord (demande 009) ; le même jour, le dernier arrivé d'abord.
    // En cours : le jour de l'envoi. Terminés : le jour de la clôture ; pour une info vue, sans clôture, le jour de son envoi.
    var recents = function (liste, jour) {
      return liste.map(function (m, i) { return { m: m, i: i }; }).sort(function (x, y) {
        return (jour(y.m) - jour(x.m)) || (y.i - x.i);
      }).map(function (x) { return x.m; });
    };
    r.enCours = recents(r.enCours, function (m) { return dateCreation(m, reference) || 0; });
    r.termines = recents(r.termines, function (m) { return dateCloture(m, reference) || dateCreation(m, reference) || 0; });
    return r;
  }

  // La liste où se range un message pour cette personne : "aRepondre", "enCours" ou "termines".
  function rangement(groupe, p, m, reference) {
    var sorte = sorteDe(m);
    if (estClose(m, reference)) { return "termines"; }
    if (sorte === "idee") {
      // Idée ouverte : le bureau ou les organisateurs qui l'ont reçue ont à la retenir ou à la classer. « Bonne idée » n'est
      // jamais due : pour l'auteur et les autres destinataires, l'idée est « en cours ».
      return estDestinataire(groupe, p, m) && Gr.peutGerer(groupe, p) ? "aRepondre" : "enCours";
    }
    if (sorte === "info") {
      // Pour un destinataire : à répondre tant qu'il n'a pas touché « Vu », terminée ensuite. Pour l'auteur : en cours tant
      // que quelqu'un ne l'a pas vue, terminée quand tous ont vu.
      if (estDestinataire(groupe, p, m)) { return contient(m.vu, p.id) ? "termines" : "aRepondre"; }
      return decompteInfo(groupe, m).pasVu.length ? "enCours" : "termines";
    }
    return estDestinataire(groupe, p, m) && !reponse(m, p) ? "aRepondre" : "enCours";
  }

  // Les rendez-vous à venir de cette personne : questions datées dont elle est l'auteur ou l'un des
  // destinataires, sauf celles où elle a répondu Non.
  function rendezVous(groupe, personne, reference) {
    var p = membre(groupe, personne);
    return visibles(groupe, p).map(function (m) { return { message: m, date: dateRendezVous(m, reference) }; })
      .filter(function (x) { return x.date && L.joursJusqua(x.date, reference) >= 0 && reponse(x.message, p) !== "non"; })
      .sort(function (x, y) { return (x.date - y.date) || String(x.message.heure || "").localeCompare(String(y.message.heure || "")); });
  }

  // ---------- Demande 009 : lancer une idée, donner une info ----------

  // Le bureau ou les organisateurs, toujours destinataires d'une idée (décision du 2026-11-19).
  function ajouterGestion(groupe, dest) {
    var r = dest.slice();
    Gr.gestionnaires(groupe).forEach(function (x) { if (r.indexOf(x.id) < 0) { r.push(x.id); } });
    return r;
  }

  // saisie : texte (le titre), explication, a, personnes. Les dix personnes d'un membre se comptent sur ce qu'il coche :
  // le bureau ou les organisateurs, ajoutés d'office, n'en font pas partie.
  function validerIdee(groupe, personne, saisie) {
    var p = membre(groupe, personne);
    var texte = nettoyer(saisie.texte), explication = nettoyerLignes(saisie.explication);
    var erreurs = {};
    if (!texte) { erreurs.texte = "vide"; } else if (texte.length > LIMITES.texte) { erreurs.texte = "long"; }
    if (explication.length > LIMITES.explication) { erreurs.explication = "long"; }
    var choix = choisirDestinataires(groupe, p, saisie);
    if (choix.erreurPersonnes) { erreurs.personnes = choix.erreurPersonnes; }
    else if (!choix.dest || !choix.dest.length) { erreurs.a = "invalide"; }
    // L'auteur ne répond pas à sa propre idée : il n'est pas compté parmi ses destinataires.
    var dest = choix.dest && choix.dest.length ? ajouterGestion(groupe, choix.dest).filter(function (id) { return id !== p.id; }) : [];
    if (!erreurs.personnes && !erreurs.a && !dest.length) { erreurs.a = "invalide"; }
    return { ok: Object.keys(erreurs).length === 0, erreurs: erreurs, valeurs: { texte: texte, explication: explication, a: choix.a, destinataires: dest } };
  }

  function lancerIdee(groupe, personne, saisie, reference) {
    var p = membre(groupe, personne);
    if (!p) { return { ok: false, raison: "introuvable" }; }
    if (!peutLancer(groupe, p)) { return { ok: false, raison: "droits" }; }
    var v = validerIdee(groupe, p, saisie || {});
    if (!v.ok) { return { ok: false, raison: "saisie", erreurs: v.erreurs }; }
    var m = {
      id: nouvelId("m"), sorte: "idee", texte: v.valeurs.texte,
      auteurId: p.id, auteur: Gr.nomComplet(p), creeLe: Ev.ecrireDate(L.aujourdhui(reference)),
      a: v.valeurs.a, destinataires: v.valeurs.destinataires, bonneIdee: []
    };
    if (v.valeurs.explication) { m.explication = v.valeurs.explication; }
    groupe.messages = groupe.messages || [];
    groupe.messages.push(m);
    noterEnvoi(groupe, { sorte: "idee", messageId: m.id, de: p.prenom, a: m.destinataires.slice() }, reference);
    return { ok: true, message: m };
  }

  // saisie : texte (300 caractères au plus, retours à la ligne gardés), a, personnes. La règle des destinataires de la 007, telle quelle.
  function validerInfo(groupe, personne, saisie) {
    var p = membre(groupe, personne);
    var texte = nettoyerLignes(saisie.texte);
    var erreurs = {};
    if (!texte) { erreurs.texte = "vide"; } else if (texte.length > LIMITES.info) { erreurs.texte = "long"; }
    var choix = choisirDestinataires(groupe, p, saisie);
    if (choix.erreurPersonnes) { erreurs.personnes = choix.erreurPersonnes; }
    else if (!choix.dest || !choix.dest.length) { erreurs.a = "invalide"; }
    // L'auteur n'est jamais compté parmi les destinataires de son info.
    var dest = (choix.dest || []).filter(function (id) { return id !== p.id; });
    if (!erreurs.personnes && !erreurs.a && !dest.length) { erreurs.a = "invalide"; }
    return { ok: Object.keys(erreurs).length === 0, erreurs: erreurs, valeurs: { texte: texte, a: choix.a, destinataires: dest } };
  }

  function donnerInfo(groupe, personne, saisie, reference) {
    var p = membre(groupe, personne);
    if (!p) { return { ok: false, raison: "introuvable" }; }
    if (!peutLancer(groupe, p)) { return { ok: false, raison: "droits" }; }
    var v = validerInfo(groupe, p, saisie || {});
    if (!v.ok) { return { ok: false, raison: "saisie", erreurs: v.erreurs }; }
    var m = {
      id: nouvelId("m"), sorte: "info", texte: v.valeurs.texte,
      auteurId: p.id, auteur: Gr.nomComplet(p), creeLe: Ev.ecrireDate(L.aujourdhui(reference)),
      a: v.valeurs.a, destinataires: v.valeurs.destinataires, vu: []
    };
    groupe.messages = groupe.messages || [];
    groupe.messages.push(m);
    noterEnvoi(groupe, { sorte: "info", messageId: m.id, de: p.prenom, a: m.destinataires.slice() }, reference);
    return { ok: true, message: m };
  }

  // Le choix fait dans « À qui ? » est suivi de « et le bureau » (ou « et les organisateurs ») quand ils ont été ajoutés d'office.
  function gestionAjoutee(m) {
    return sorteDe(m) === "idee" && !!m.a && (m.a.sorte === "equipe" || m.a.sorte === "personnes");
  }

  // « Bonne idée » : une fois par personne, les destinataires seuls, tant que l'idée est ouverte. dit === false la retire.
  function direBonneIdee(groupe, personne, id, dit) {
    var p = membre(groupe, personne);
    var m = trouverVisible(groupe, p, id);
    if (!m) { return { ok: false, raison: "introuvable" }; }
    if (sorteDe(m) !== "idee") { return { ok: false, raison: "sorte" }; }
    if (!estDestinataire(groupe, p, m)) { return { ok: false, raison: "droits" }; }
    if (m.etat) { return { ok: false, raison: "close" }; }
    m.bonneIdee = (m.bonneIdee || []).filter(function (x) { return x !== p.id; });
    if (dit !== false) { m.bonneIdee.push(p.id); }
    return { ok: true, message: m, dit: dit !== false };
  }

  function aDitBonneIdee(m, personne) { return !!personne && contient(m.bonneIdee, personne.id); }

  // Les personnes qui ont dit « Bonne idée », et les destinataires encore dans le groupe.
  function decompteIdee(groupe, m) {
    var dest = destinataires(groupe, m);
    return { destinataires: dest, bonneIdee: dest.filter(function (p) { return contient(m.bonneIdee, p.id); }) };
  }

  // Retenir ou classer : le bureau ou les organisateurs, pour une idée qu'ils voient (ils en sont toujours destinataires).
  function peutDecider(groupe, personne, m) {
    var p = membre(groupe, personne);
    return !!p && !!m && sorteDe(m) === "idee" && Gr.peutGerer(groupe, p) && estVisible(groupe, p, m);
  }

  // etat : "retenue" ou "classee". On peut changer d'avis. L'auteur est prévenu à chaque passage, sauf s'il décide lui-même.
  function deciderIdee(groupe, personne, id, etat, reference) {
    var p = membre(groupe, personne);
    var m = trouverVisible(groupe, p, id);
    if (!m) { return { ok: false, raison: "introuvable" }; }
    if (sorteDe(m) !== "idee") { return { ok: false, raison: "sorte" }; }
    if (!peutDecider(groupe, p, m)) { return { ok: false, raison: "droits" }; }
    if (etat !== "retenue" && etat !== "classee") { return { ok: false, raison: "saisie" }; }
    if (m.etat === etat) { return { ok: false, raison: "deja", message: m }; }
    m.etat = etat;
    m.decideLe = Ev.ecrireDate(L.aujourdhui(reference));
    if (m.auteurId !== p.id && auteur(groupe, m)) {
      noterEnvoi(groupe, { sorte: etat === "retenue" ? "idee-retenue" : "idee-classee", messageId: m.id, de: p.prenom, a: [m.auteurId] }, reference);
    }
    return { ok: true, message: m };
  }

  // L'événement né de l'idée, s'il existe encore (association).
  function evenementDeLIdee(groupe, m) {
    if (!m || sorteDe(m) !== "idee" || !m.evenementId || !Gr.estAssociation(groupe)) { return null; }
    var e = L.trouverEvenement(groupe, m.evenementId);
    return e && e.ideeId === m.id ? e : null;
  }

  // « En faire un événement » : association, bureau, idée retenue, et une seule fois (tant que l'événement existe).
  function peutEnFaireUnEvenement(groupe, personne, m) {
    return Gr.estAssociation(groupe) && peutDecider(groupe, personne, m) && m.etat === "retenue" && !evenementDeLIdee(groupe, m);
  }

  // Le nom proposé pour l'événement : le titre de l'idée, coupé à la limite d'un nom d'événement.
  function nomEvenementPropose(m) {
    var titre = String(m.texte || "");
    return { nom: titre.slice(0, Ev.LIMITES.titre).trim(), raccourci: titre.length > Ev.LIMITES.titre };
  }

  // L'événement est créé par les règles de la demande 006 ; l'idée et l'événement gardent le lien l'un vers l'autre.
  function creerEvenementDepuisIdee(groupe, personne, id, saisie, reference) {
    var p = membre(groupe, personne);
    var m = trouverVisible(groupe, p, id);
    if (!m || sorteDe(m) !== "idee") { return { ok: false, raison: "introuvable" }; }
    if (!peutEnFaireUnEvenement(groupe, p, m)) { return { ok: false, raison: "droits" }; }
    var r = Ev.creerEvenement(groupe, p, saisie, reference);
    if (!r.ok) { return r; }
    r.evenement.ideeId = m.id;
    m.evenementId = r.evenement.id;
    r.message = m;
    return r;
  }

  // L'idée d'où vient un événement, pour qui a le droit de la voir ; sinon null, comme si elle n'existait pas.
  function ideeDeLEvenement(groupe, personne, evenement) {
    if (!evenement || !evenement.ideeId) { return null; }
    var m = trouverVisible(groupe, personne, evenement.ideeId);
    return m && sorteDe(m) === "idee" && m.evenementId === evenement.id ? m : null;
  }

  // « Vu » : un geste voulu, une fois par personne, sans retour. Les destinataires seuls, tant que l'info est ouverte.
  function marquerVu(groupe, personne, id, reference) {
    var p = membre(groupe, personne);
    var m = trouverVisible(groupe, p, id);
    if (!m) { return { ok: false, raison: "introuvable" }; }
    if (sorteDe(m) !== "info") { return { ok: false, raison: "sorte" }; }
    if (!estDestinataire(groupe, p, m)) { return { ok: false, raison: "droits" }; }
    if (estClose(m, reference)) { return { ok: false, raison: "close" }; }
    if (contient(m.vu, p.id)) { return { ok: false, raison: "deja", message: m }; }
    m.vu = (m.vu || []).concat([p.id]);
    return { ok: true, message: m };
  }

  function aVu(m, personne) { return !!personne && contient(m.vu, personne.id); }

  // Les deux listes de l'auteur : leur total égale le nombre de destinataires.
  function decompteInfo(groupe, m) {
    var dest = destinataires(groupe, m);
    return {
      destinataires: dest,
      vu: dest.filter(function (p) { return contient(m.vu, p.id); }),
      pasVu: dest.filter(function (p) { return !contient(m.vu, p.id); })
    };
  }

  // Seul l'auteur d'une info lit qui a vu (décision du 2026-11-19).
  function peutLireQuiAVu(groupe, personne, m) { return sorteDe(m) === "info" && estAuteur(groupe, personne, m); }

  // ---------- Demande 010 : répondre par lien, sans compte ----------

  var HORS_LETTRES = /[^A-Za-zÀ-ÖØ-öø-ÿ]/g;

  // Un code secret, comme le jeton d'une inscription : 24 caractères au hasard, sans nom ni contact.
  function nouveauCode() {
    var octets = new Uint8Array(12);
    racine.crypto.getRandomValues(octets);
    return Array.prototype.map.call(octets, function (o) { return ("0" + o.toString(16)).slice(-2); }).join("");
  }

  // Pour comparer deux prénoms ou deux lettres : sans majuscules ni accents.
  function sansAccent(t) { return nettoyer(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  function premiereLettre(t) { return String(t == null ? "" : t).replace(HORS_LETTRES, "").charAt(0).toUpperCase(); }

  function reponsesLien(m) { return (m && m.parLien) || []; }

  // Seule forme sous laquelle l'invité est affiché : prénom et initiale.
  function nomPublicLien(r) { return r.prenom + " " + r.initiale + "."; }

  // Le code du lien d'une question, s'il a déjà été fabriqué ; sinon "".
  function codeConnu(groupe, m) {
    var liens = groupe && groupe.liens;
    return liens && m && Object.prototype.hasOwnProperty.call(liens, m.id) && typeof liens[m.id] === "string" ? liens[m.id] : "";
  }

  // Le code du lien d'une question ; il est fabriqué au premier besoin, et rangé dans le groupe. Rien pour une idée ou une info.
  function codeLien(groupe, m) {
    if (!groupe || !m || sorteDe(m) !== "question") { return ""; }
    var code = codeConnu(groupe, m);
    if (!code) {
      code = nouveauCode();
      groupe.liens = groupe.liens || {};
      groupe.liens[m.id] = code;
    }
    return code;
  }

  function trouverParCode(groupe, code) {
    if (!code || typeof code !== "string") { return null; }
    return messages(groupe).filter(function (m) { return sorteDe(m) === "question" && codeConnu(groupe, m) === code; })[0] || null;
  }

  // Le lien est proposé à ceux qui gèrent la question, tant qu'elle est ouverte.
  function peutPartager(groupe, personne, m, reference) {
    return !!m && sorteDe(m) === "question" && peutGerer(groupe, personne, m) && !estClose(m, reference);
  }

  // Le destinataire auquel la réponse est rattachée, s'il est encore dans le groupe ; sinon null.
  function personneRattachee(groupe, m, r) {
    if (!r || !r.personneId || !contient(m.destinataires, r.personneId)) { return null; }
    return Gr.trouverPersonne(groupe, r.personneId);
  }

  // La réponse par lien rattachée à cette personne, tant qu'elle n'a pas répondu elle-même dans l'application ; sinon null.
  function reponseLienDe(m, personneId) {
    if (!personneId || contient(m.oui, personneId) || contient(m.non, personneId)) { return null; }
    return reponsesLien(m).filter(function (r) { return r.personneId === personneId; })[0] || null;
  }

  // Le nom écrit sur la ligne : celui de la personne du groupe si la réponse est rattachée, sinon « Prénom I. ».
  function nomLien(groupe, m, r) {
    var p = personneRattachee(groupe, m, r);
    return p ? Gr.nomComplet(p) : nomPublicLien(r);
  }

  // saisie : reponse ("oui" ou "non"), prenom (40 lettres au plus), initiale (si un nom entier est tapé, seule la première lettre est gardée).
  function validerInvite(saisie) {
    var s = saisie || {};
    var prenom = nettoyer(s.prenom), initiale = premiereLettre(s.initiale);
    var erreurs = {};
    if (!prenom) { erreurs.prenom = "vide"; } else if (prenom.length > LIMITES.prenomInvite) { erreurs.prenom = "long"; }
    if (!initiale) { erreurs.initiale = "vide"; }
    if (s.reponse !== "oui" && s.reponse !== "non") { erreurs.reponse = "invalide"; }
    return { ok: Object.keys(erreurs).length === 0, erreurs: erreurs, valeurs: { prenom: prenom, initiale: initiale, reponse: s.reponse } };
  }

  // Répondre par le lien : aucun compte, aucun contact. Rend le jeton du lien personnel.
  function repondreParLien(groupe, code, saisie, reference) {
    var m = trouverParCode(groupe, code);
    if (!m) { return { ok: false, raison: "introuvable" }; }
    if (estClose(m, reference)) { return { ok: false, raison: "close", message: m }; }
    var v = validerInvite(saisie);
    if (!v.ok) { return { ok: false, raison: "saisie", erreurs: v.erreurs }; }
    var r = { jeton: nouveauCode(), prenom: v.valeurs.prenom, initiale: v.valeurs.initiale, reponse: v.valeurs.reponse };
    // Rattachement : un seul destinataire de ce prénom et de cette initiale, et il n'a pas répondu. Une personne sans nom
    // enregistré n'est jamais rattachée.
    var memes = destinataires(groupe, m).filter(function (p) {
      return !!p.nom && sansAccent(p.prenom) === sansAccent(r.prenom) && sansAccent(premiereLettre(p.nom)) === sansAccent(r.initiale);
    });
    if (memes.length === 1 && !reponse(m, memes[0])) { r.personneId = memes[0].id; }
    m.parLien = reponsesLien(m).concat([r]);
    return { ok: true, message: m, reponse: r, jeton: r.jeton, rattachee: !!r.personneId };
  }

  // La réponse d'un lien personnel : { message, reponse }, ou null.
  function trouverReponseLien(groupe, jeton) {
    if (!jeton) { return null; }
    var liste = messages(groupe);
    for (var i = 0; i < liste.length; i++) {
      var r = reponsesLien(liste[i]).filter(function (x) { return x.jeton === jeton; })[0];
      if (r) { return { message: liste[i], reponse: r }; }
    }
    return null;
  }

  function estRetiree(m, jeton) { return !!m && !!jeton && contient(m.retires, jeton); }

  // La question d'une réponse retirée (seul son jeton est gardé), ou null.
  function trouverRetrait(groupe, jeton) {
    return messages(groupe).filter(function (m) { return estRetiree(m, jeton); })[0] || null;
  }

  // Changer d'avis par le lien personnel : la même ligne change de liste, tant que la question est ouverte.
  function changerReponseLien(groupe, jeton, valeur, reference) {
    var t = trouverReponseLien(groupe, jeton);
    if (!t) { return { ok: false, raison: trouverRetrait(groupe, jeton) ? "retiree" : "introuvable" }; }
    if (estClose(t.message, reference)) { return { ok: false, raison: "close", message: t.message }; }
    if (valeur !== "oui" && valeur !== "non") { return { ok: false, raison: "saisie" }; }
    t.reponse.reponse = valeur;
    return { ok: true, message: t.message, reponse: t.reponse };
  }

  // Retirer une réponse faite par lien, rattachée ou non : ceux qui gèrent la question, tant qu'elle est ouverte.
  // Le prénom et l'initiale sont effacés ; seul le jeton est gardé, pour que le lien personnel dise que la réponse a été retirée.
  function retirerReponseLien(groupe, personne, id, jeton, reference) {
    var p = membre(groupe, personne);
    var m = trouverVisible(groupe, p, id);
    if (!m || sorteDe(m) !== "question") { return { ok: false, raison: "introuvable" }; }
    if (!peutGerer(groupe, p, m)) { return { ok: false, raison: "droits" }; }
    if (estRetiree(m, jeton)) { return { ok: false, raison: "deja", message: m }; }
    var r = reponsesLien(m).filter(function (x) { return x.jeton === jeton; })[0];
    if (!r) { return { ok: false, raison: "introuvable" }; }
    if (estClose(m, reference)) { return { ok: false, raison: "close", message: m }; }
    var nom = nomLien(groupe, m, r);
    m.parLien = m.parLien.filter(function (x) { return x !== r; });
    m.retires = (m.retires || []).concat([jeton]);
    return { ok: true, message: m, nom: nom };
  }

  // Démo › « Voir en invité » : la question ouverte la plus récente du groupe ; le même jour, la dernière posée.
  function questionOuverteRecente(groupe, reference) {
    return messages(groupe).map(function (m, i) { return { m: m, i: i }; })
      .filter(function (x) { return sorteDe(x.m) === "question" && !estClose(x.m, reference); })
      .sort(function (x, y) { return ((dateCreation(y.m, reference) || 0) - (dateCreation(x.m, reference) || 0)) || (y.i - x.i); })
      .map(function (x) { return x.m; })[0] || null;
  }

  // ---------- Commentaires (demande 008) ----------

  function deux(n) { return (n < 10 ? "0" : "") + n; }
  function heureDe(reference) { var d = reference ? new Date(reference) : new Date(); return deux(d.getHours()) + ":" + deux(d.getMinutes()); }

  // Du plus ancien au plus récent.
  function commentaires(m) {
    return ((m && m.commentaires) || []).slice().sort(function (x, y) { return (x.n || 0) - (y.n || 0); });
  }
  function trouverCommentaire(m, id) {
    return ((m && m.commentaires) || []).filter(function (c) { return c.id === id; })[0] || null;
  }
  function dateCommentaire(c, reference) { return dateEcrite(c, "le", "dansJours", reference); }

  // Qui voit le message peut commenter dessous, visiteur compris, tant qu'il est ouvert.
  function peutCommenter(groupe, personne, m, reference) {
    return estVisible(groupe, personne, m) && !estClose(m, reference);
  }

  // Texte seul, 300 caractères au plus ; les espaces du début et de la fin sont retirés, un retour à la ligne devient une espace.
  function commenter(groupe, personne, id, texte, reference) {
    var p = membre(groupe, personne);
    var m = trouverVisible(groupe, p, id);
    if (!m) { return { ok: false, raison: "introuvable" }; }
    if (estClose(m, reference)) { return { ok: false, raison: "close" }; }
    var t = nettoyer(texte);
    if (!t) { return { ok: false, raison: "saisie", erreur: "vide" }; }
    if (t.length > LIMITES.commentaire) { return { ok: false, raison: "saisie", erreur: "long" }; }
    var n = Math.max.apply(null, [m.dernierCommentaire || 0].concat((m.commentaires || []).map(function (c) { return c.n || 0; }))) + 1;
    var c = { id: nouvelId("c"), n: n, auteurId: p.id, auteur: Gr.nomComplet(p), texte: t, le: Ev.ecrireDate(L.aujourdhui(reference)), heure: heureDe(reference) };
    m.commentaires = m.commentaires || [];
    m.commentaires.push(c);
    m.dernierCommentaire = n;
    // Qui publie a la liste sous les yeux.
    m.vus = m.vus || {};
    m.vus[p.id] = n;
    // Seul l'auteur du message est prévenu, s'il est encore dans le groupe ; il n'est pas prévenu de son propre commentaire.
    if (m.auteurId !== p.id && auteur(groupe, m)) {
      noterEnvoi(groupe, { sorte: "commentaire", messageId: m.id, de: p.prenom, a: [m.auteurId], commentaireId: c.id, commentaire: c.texte }, reference);
    }
    return { ok: true, message: m, commentaire: c };
  }

  // Chacun supprime le sien ; le bureau ou les organisateurs suppriment tous ceux des messages qu'ils voient.
  // L'auteur du message, sans ce rôle, ne supprime que les siens.
  function peutSupprimerCommentaire(groupe, personne, m, c) {
    var p = membre(groupe, personne);
    return !!p && !!c && estVisible(groupe, p, m) && (c.auteurId === p.id || Gr.peutGerer(groupe, p));
  }

  function supprimerCommentaire(groupe, personne, id, commentaireId) {
    var p = membre(groupe, personne);
    var m = trouverVisible(groupe, p, id);
    var c = m ? trouverCommentaire(m, commentaireId) : null;
    if (!c) { return { ok: false, raison: "introuvable" }; }
    if (!peutSupprimerCommentaire(groupe, p, m, c)) { return { ok: false, raison: "droits" }; }
    m.commentaires = m.commentaires.filter(function (x) { return x !== c; });
    // La notification déjà partie ne se rattrape pas : son entrée reste, et dit que le commentaire a été supprimé depuis.
    (groupe.envois || []).forEach(function (e) { if (e.sorte === "commentaire" && e.commentaireId === c.id) { e.supprime = true; } });
    return { ok: true, message: m, commentaire: c };
  }

  // Les commentaires des autres publiés depuis ma dernière ouverture du message.
  function nouveauxCommentaires(groupe, personne, m) {
    var p = membre(groupe, personne);
    if (!p || !estVisible(groupe, p, m)) { return 0; }
    var vu = (m.vus && m.vus[p.id]) || 0;
    return ((m.commentaires) || []).filter(function (c) { return c.auteurId !== p.id && (c.n || 0) > vu; }).length;
  }

  // À l'ouverture du message : tout ce qui est publié est vu. Rend vrai si quelque chose a changé.
  function marquerVus(groupe, personne, m) {
    var p = membre(groupe, personne);
    if (!p || !estVisible(groupe, p, m)) { return false; }
    var dernier = Math.max.apply(null, [0].concat((m.commentaires || []).map(function (c) { return c.n || 0; })));
    if (((m.vus && m.vus[p.id]) || 0) >= dernier) { return false; }
    m.vus = m.vus || {};
    m.vus[p.id] = dernier;
    return true;
  }

  // ---------- Ce qui serait envoyé (demande 008) : rien n'est envoyé, chaque envoi simulé est noté ----------

  function noterEnvoi(groupe, envoi, reference) {
    if (!envoi.a || !envoi.a.length) { return null; }
    envoi.id = nouvelId("n");
    envoi.le = Ev.ecrireDate(L.aujourdhui(reference));
    envoi.heure = heureDe(reference);
    groupe.envois = groupe.envois || [];
    groupe.envois.push(envoi);
    return envoi;
  }

  // La relance est notée au moment où elle est demandée : elle ne vise que ceux qui n'ont pas encore répondu.
  function noterRelance(groupe, personne, id, reference) {
    var r = relance(groupe, personne, id, reference);
    if (!r.ok) { return r; }
    var p = membre(groupe, personne);
    r.envoi = noterEnvoi(groupe, { sorte: "relance", messageId: r.message.id, de: p.prenom, a: r.personnes.map(function (x) { return x.id; }) }, reference);
    return r;
  }

  function dateEnvoi(e, reference) { return dateEcrite(e, "le", "dansJours", reference); }

  // Les envois du groupe, le plus récent d'abord ; au même instant, le dernier noté d'abord.
  function envois(groupe, reference) {
    return ((groupe && groupe.envois) || []).map(function (e, i) { return { e: e, i: i, d: dateEnvoi(e, reference) }; })
      .filter(function (x) { return !!x.d && !!trouver(groupe, x.e.messageId); })
      .sort(function (x, y) { return (y.d - x.d) || String(y.e.heure || "").localeCompare(String(x.e.heure || "")) || (y.i - x.i); })
      .map(function (x) { return x.e; });
  }

  // ---------- Accueil (demande 008) ----------

  // Le nombre de messages qui attendent ma réponse : celui de la pastille, de la liste « À répondre » et du bloc d'accueil.
  function nombreARepondre(groupe, personne, reference) { return listes(groupe, personne, reference).aRepondre.length; }

  // « Prochains rendez-vous » : les questions datées, à venir, auxquelles j'ai répondu Oui, et celles que j'ai posées sans en
  // être destinataire ; ouvertes ou closes. Le plus proche d'abord.
  function prochainsRendezVous(groupe, personne, reference) {
    var p = membre(groupe, personne);
    return rendezVous(groupe, p, reference).filter(function (x) {
      var m = x.message;
      return reponse(m, p) === "oui" || (estAuteur(groupe, p, m) && !estDestinataire(groupe, p, m));
    });
  }

  // ---------- Agenda ----------

  // Fichier .ics du rendez-vous d'une question : une heure à partir de l'heure dite, ou la journée entière sans heure.
  // lien (demande 010) : le lien personnel de l'invité, gardé dans l'agenda pour changer d'avis.
  function fichierAgenda(groupe, m, maintenant, lien) {
    var jour = dateRendezVous(m, maintenant);
    if (!jour) { return ""; }
    var stamp = (maintenant ? new Date(maintenant) : new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    var deux = function (n) { return (n < 10 ? "0" : "") + n; };
    var jourIcs = function (d) { return d.getFullYear() + deux(d.getMonth() + 1) + deux(d.getDate()); };
    var debut, fin;
    if (m.heure) {
      var hm = m.heure.split(":").map(Number);
      var d1 = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), hm[0], hm[1]);
      var d2 = new Date(d1.getTime() + 60 * 60 * 1000);
      var horodatage = function (d) { return jourIcs(d) + "T" + deux(d.getHours()) + deux(d.getMinutes()) + "00"; };
      debut = "DTSTART:" + horodatage(d1);
      fin = "DTEND:" + horodatage(d2);
    } else {
      debut = "DTSTART;VALUE=DATE:" + jourIcs(jour);
      fin = "DTEND;VALUE=DATE:" + jourIcs(L.ajouterJours(jour, 1));
    }
    return [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MonAsso//Prototype//FR", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + m.id + "@monasso-prototype",
      "DTSTAMP:" + stamp,
      debut, fin,
      "SUMMARY:" + L.echapperIcs(m.texte),
      "DESCRIPTION:" + L.echapperIcs(groupe.nom + (lien ? "\n" + lien : "")),
      "END:VEVENT", "END:VCALENDAR"
    ].map(L.plierLigneIcs).join("\r\n") + "\r\n";
  }

  var Messages = {
    LIMITES: LIMITES,
    SORTES: SORTES,
    sorte: sorteDe,
    validerIdee: validerIdee,
    lancerIdee: lancerIdee,
    validerInfo: validerInfo,
    donnerInfo: donnerInfo,
    gestionAjoutee: gestionAjoutee,
    direBonneIdee: direBonneIdee,
    aDitBonneIdee: aDitBonneIdee,
    decompteIdee: decompteIdee,
    peutDecider: peutDecider,
    deciderIdee: deciderIdee,
    evenementDeLIdee: evenementDeLIdee,
    peutEnFaireUnEvenement: peutEnFaireUnEvenement,
    nomEvenementPropose: nomEvenementPropose,
    creerEvenementDepuisIdee: creerEvenementDepuisIdee,
    ideeDeLEvenement: ideeDeLEvenement,
    marquerVu: marquerVu,
    aVu: aVu,
    decompteInfo: decompteInfo,
    peutLireQuiAVu: peutLireQuiAVu,
    dateCreation: dateCreation,
    dateRendezVous: dateRendezVous,
    dateAvantLe: dateAvantLe,
    dateCloture: dateCloture,
    estClose: estClose,
    reglageToutLeGroupe: reglageToutLeGroupe,
    changerReglage: changerReglage,
    peutLancer: peutLancer,
    destinatairesPossibles: destinatairesPossibles,
    personnesProposees: personnesProposees,
    messages: messages,
    trouver: trouver,
    trouverVisible: trouverVisible,
    destinataires: destinataires,
    auteur: auteur,
    estAuteur: estAuteur,
    estDestinataire: estDestinataire,
    estVisible: estVisible,
    visibles: visibles,
    peutGerer: peutGerer,
    reponse: reponse,
    decompte: decompte,
    estComplet: estComplet,
    validerQuestion: validerQuestion,
    poserQuestion: poserQuestion,
    repondre: repondre,
    clore: clore,
    relance: relance,
    listes: listes,
    rendezVous: rendezVous,
    commentaires: commentaires,
    trouverCommentaire: trouverCommentaire,
    dateCommentaire: dateCommentaire,
    peutCommenter: peutCommenter,
    commenter: commenter,
    peutSupprimerCommentaire: peutSupprimerCommentaire,
    supprimerCommentaire: supprimerCommentaire,
    nouveauxCommentaires: nouveauxCommentaires,
    marquerVus: marquerVus,
    noterRelance: noterRelance,
    dateEnvoi: dateEnvoi,
    envois: envois,
    nombreARepondre: nombreARepondre,
    prochainsRendezVous: prochainsRendezVous,
    fichierAgenda: fichierAgenda,
    reponsesLien: reponsesLien,
    nomPublicLien: nomPublicLien,
    nomLien: nomLien,
    codeLien: codeLien,
    codeConnu: codeConnu,
    trouverParCode: trouverParCode,
    peutPartager: peutPartager,
    personneRattachee: personneRattachee,
    reponseLienDe: reponseLienDe,
    validerInvite: validerInvite,
    repondreParLien: repondreParLien,
    trouverReponseLien: trouverReponseLien,
    estRetiree: estRetiree,
    trouverRetrait: trouverRetrait,
    changerReponseLien: changerReponseLien,
    retirerReponseLien: retirerReponseLien,
    questionOuverteRecente: questionOuverteRecente
  };

  racine.Messages = Messages;
  if (typeof module !== "undefined") { module.exports = Messages; }
})(typeof window !== "undefined" ? window : globalThis);
