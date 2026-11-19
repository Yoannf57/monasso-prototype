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

  Les erreurs de saisie sont rendues sous forme de codes ; leurs textes sont dans mots.js.
*/
(function (racine) {
  "use strict";

  var L = typeof module !== "undefined" ? require("./logique.js") : racine.Logique;
  var Gr = typeof module !== "undefined" ? require("./groupes.js") : racine.Groupes;
  var Ev = typeof module !== "undefined" ? require("./evenements.js") : racine.Evenements;

  var HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
  var NOMBRE = /^\d{1,4}$/;
  var LIMITES = { texte: 80, personnesMembre: 10 };

  function nettoyer(t) { return String(t == null ? "" : t).replace(/\s+/g, " ").trim(); }

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
  function dateCloture(m, reference) {
    var main = dateEcrite(m, "closeLe", "closeDansJours", reference);
    if (main) { return main; }
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
    return m.auteurId === p.id || (Gr.peutGerer(groupe, p) && contient(m.destinataires, p.id));
  }

  // "oui", "non", ou "" si la personne n'a pas répondu.
  function reponse(m, personne) {
    if (!personne) { return ""; }
    return contient(m.oui, personne.id) ? "oui" : contient(m.non, personne.id) ? "non" : "";
  }

  // Les trois listes, en personnes : leur total égale le nombre de destinataires.
  function decompte(groupe, m) {
    var dest = destinataires(groupe, m);
    var oui = dest.filter(function (p) { return contient(m.oui, p.id); });
    var non = dest.filter(function (p) { return !contient(m.oui, p.id) && contient(m.non, p.id); });
    var sans = dest.filter(function (p) { return !contient(m.oui, p.id) && !contient(m.non, p.id); });
    var attendus = typeof m.attendus === "number" ? m.attendus : 0;
    return { destinataires: dest, oui: oui, non: non, sans: sans, attendus: attendus, complet: attendus > 0 && oui.length >= attendus };
  }

  function estComplet(groupe, m) { return decompte(groupe, m).complet; }

  // ---------- Poser une question ----------

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
      if (origine && peutGerer(groupe, p, origine)) {
        // La liste d'origine, telle quelle : elle a déjà respecté la règle de son auteur.
        dest = destinataires(groupe, origine).map(function (x) { return x.id; });
        valeurs.a = { sorte: origine.a.sorte };
        if (origine.a.equipeId) { valeurs.a.equipeId = origine.a.equipeId; }
        if (origine.a.nom) { valeurs.a.nom = origine.a.nom; }
      }
    } else {
      var ligne = destinatairesPossibles(groupe, p).filter(function (l) { return l.valeur === saisie.a; })[0];
      if (ligne && ligne.sorte === "personnes") {
        var proposees = personnesProposees(groupe, p).map(function (x) { return x.id; });
        var choisies = (saisie.personnes || []).filter(function (id, i, t) { return proposees.indexOf(id) >= 0 && t.indexOf(id) === i; });
        valeurs.a = { sorte: "personnes" };
        if (!choisies.length) { erreurs.personnes = "aucune"; }
        else if (!Gr.peutGerer(groupe, p) && choisies.length > LIMITES.personnesMembre) { erreurs.personnes = "trop"; }
        else { dest = choisies; }
      } else if (ligne) {
        dest = ligne.personnes.slice();
        valeurs.a = { sorte: ligne.sorte };
        if (ligne.equipe) { valeurs.a.equipeId = ligne.equipe.id; valeurs.a.nom = ligne.equipe.nom; }
      }
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
    return { ok: true, message: m };
  }

  // ---------- Répondre, clore, relancer ----------

  // Oui ou Non, autant de fois qu'on veut tant que la question est ouverte. Les destinataires seuls.
  function repondre(groupe, personne, id, valeur, reference) {
    var p = membre(groupe, personne);
    var m = trouverVisible(groupe, p, id);
    if (!m) { return { ok: false, raison: "introuvable" }; }
    if (!estDestinataire(groupe, p, m)) { return { ok: false, raison: "droits" }; }
    if (estClose(m, reference)) { return { ok: false, raison: "close" }; }
    if (valeur !== "oui" && valeur !== "non") { return { ok: false, raison: "saisie" }; }
    m.oui = (m.oui || []).filter(function (x) { return x !== p.id; });
    m.non = (m.non || []).filter(function (x) { return x !== p.id; });
    m[valeur].push(p.id);
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
    if (estClose(m, reference)) { return { ok: false, raison: "close" }; }
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
    visibles(groupe, p).forEach(function (m) {
      if (estClose(m, reference)) { r.termines.push(m); }
      else if (estDestinataire(groupe, p, m) && !reponse(m, p)) { r.aRepondre.push(m); }
      else { r.enCours.push(m); }
    });
    // Tri stable : à égalité, l'ordre d'arrivée est gardé.
    r.aRepondre.sort(parUrgence(reference));
    r.enCours.sort(parUrgence(reference));
    r.termines = r.termines.map(function (m, i) { return { m: m, i: i }; }).sort(function (x, y) {
      return (dateCloture(y.m, reference) - dateCloture(x.m, reference)) || (y.i - x.i);
    }).map(function (x) { return x.m; });
    return r;
  }

  // Les rendez-vous à venir de cette personne : questions datées dont elle est l'auteur ou l'un des
  // destinataires, sauf celles où elle a répondu Non.
  function rendezVous(groupe, personne, reference) {
    var p = membre(groupe, personne);
    return visibles(groupe, p).map(function (m) { return { message: m, date: dateRendezVous(m, reference) }; })
      .filter(function (x) { return x.date && L.joursJusqua(x.date, reference) >= 0 && reponse(x.message, p) !== "non"; })
      .sort(function (x, y) { return (x.date - y.date) || String(x.message.heure || "").localeCompare(String(y.message.heure || "")); });
  }

  // ---------- Agenda ----------

  // Fichier .ics du rendez-vous d'une question : une heure à partir de l'heure dite, ou la journée entière sans heure.
  function fichierAgenda(groupe, m, maintenant) {
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
      "DESCRIPTION:" + L.echapperIcs(groupe.nom),
      "END:VEVENT", "END:VCALENDAR"
    ].map(L.plierLigneIcs).join("\r\n") + "\r\n";
  }

  var Messages = {
    LIMITES: LIMITES,
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
    fichierAgenda: fichierAgenda
  };

  racine.Messages = Messages;
  if (typeof module !== "undefined") { module.exports = Messages; }
})(typeof window !== "undefined" ? window : globalThis);
