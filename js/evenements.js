/*
  Règles de la demande 006, sans rien d'affichage : créer un événement ; ajouter, modifier,
  supprimer une action ou un créneau. Chargé par la page et par les tests automatiques (Node).

  Association seulement, et le bureau seul : chaque geste reçoit la personne qui le fait
  et le refuse (raison "droits") si elle n'est pas du bureau. Un événement passé ne reçoit
  plus ni action ni créneau (raison "passe").
  Seule exception : l'état d'une action, que changent son référent (la personne, ou chaque
  personne de l'équipe référente) et le bureau, personne d'autre.
  Les erreurs de saisie sont rendues sous forme de codes ; leurs textes sont dans mots.js.

  Un événement créé à la main : titre, date ("AAAA-MM-JJ"), debut et fin ("HH:MM" ou vide), lieu (ou vide).
  Une action : libelle, statut, joursAvant (nombre de jours avant l'événement), et
  - referentId (une personne) ou equipeId (une équipe), jamais les deux ;
  - referent : le nom noté ce jour-là, affiché si la personne ou l'équipe n'existe plus ;
  - dateLimite ("AAAA-MM-JJ") seulement pour une échéance « à une date précise ».
  Un créneau : titre, debut, fin, horaire (le texte affiché), places, inscrits ; il a lieu le jour de l'événement.
*/
(function (racine) {
  "use strict";

  var L = typeof module !== "undefined" ? require("./logique.js") : racine.Logique;
  var Gr = typeof module !== "undefined" ? require("./groupes.js") : racine.Groupes;

  var DATE = /^\d{4}-\d\d-\d\d$/;
  var HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
  var NOMBRE = /^\d{1,4}$/;
  var LIMITES = { titre: 60, lieu: 60, libelle: 80, intitule: 40, joursMin: 2, joursMax: 365, placesMin: 1, placesMax: 30 };

  function nettoyer(t) { return String(t == null ? "" : t).replace(/\s+/g, " ").trim(); }

  function nouvelId(prefixe) {
    var octets = new Uint8Array(6);
    racine.crypto.getRandomValues(octets);
    return prefixe + "-" + Array.prototype.map.call(octets, function (o) { return ("0" + o.toString(16)).slice(-2); }).join("");
  }

  // "2026-11-27" → la date (à minuit), ou null si ce n'est pas un vrai jour.
  function lireDate(texte) {
    if (typeof texte !== "string" || !DATE.test(texte)) { return null; }
    var p = texte.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    return d.getFullYear() === p[0] && d.getMonth() === p[1] - 1 && d.getDate() === p[2] ? d : null;
  }

  function ecrireDate(d) {
    var deux = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + deux(d.getMonth() + 1) + "-" + deux(d.getDate());
  }

  function heure(texte) {
    var t = String(texte == null ? "" : texte).trim();
    return HEURE.test(t) ? t : "";
  }

  // ---------- Droits ----------

  function refus(groupe, personne) {
    if (!groupe || !Gr.estAssociation(groupe)) { return { ok: false, raison: "sorte" }; }
    if (!Gr.peutGerer(groupe, personne)) { return { ok: false, raison: "droits" }; }
    return null;
  }

  // L'événement où le bureau peut encore ajouter ou modifier, ou la raison du refus.
  function evenementOuvert(groupe, personne, evenementId, reference) {
    var r = refus(groupe, personne);
    if (r) { return r; }
    var e = L.trouverEvenement(groupe, evenementId);
    if (!e) { return { ok: false, raison: "introuvable" }; }
    if (L.estPasse(e, reference)) { return { ok: false, raison: "passe" }; }
    return { ok: true, evenement: e };
  }

  function trouverAction(evenement, id) {
    return evenement.actions.filter(function (a) { return a.id === id; })[0] || null;
  }

  // ---------- Événement ----------

  function validerEvenement(saisie, reference) {
    var titre = nettoyer(saisie.titre);
    var lieu = nettoyer(saisie.lieu);
    var date = lireDate(String(saisie.date == null ? "" : saisie.date).trim());
    var debut = heure(saisie.debut), fin = heure(saisie.fin);
    var erreurs = {};
    if (!titre) { erreurs.titre = "vide"; } else if (titre.length > LIMITES.titre) { erreurs.titre = "long"; }
    if (!date) { erreurs.date = "vide"; } else if (L.joursJusqua(date, reference) < 0) { erreurs.date = "passee"; }
    if (fin && !debut) { erreurs.fin = "sans-debut"; } else if (fin && fin <= debut) { erreurs.fin = "avant"; }
    if (lieu.length > LIMITES.lieu) { erreurs.lieu = "long"; }
    return {
      ok: Object.keys(erreurs).length === 0, erreurs: erreurs,
      valeurs: { titre: titre, date: date ? ecrireDate(date) : "", debut: debut, fin: fin, lieu: lieu }
    };
  }

  function creerEvenement(groupe, personne, saisie, reference) {
    var r = refus(groupe, personne);
    if (r) { return r; }
    var v = validerEvenement(saisie, reference);
    if (!v.ok) { return { ok: false, raison: "saisie", erreurs: v.erreurs }; }
    var e = {
      id: nouvelId("ev"), titre: v.valeurs.titre, date: v.valeurs.date,
      debut: v.valeurs.debut, fin: v.valeurs.fin, lieu: v.valeurs.lieu,
      actions: [], creneaux: []
    };
    groupe.evenements.push(e);
    return { ok: true, evenement: e };
  }

  // ---------- Actions ----------

  // Qui peut s'occuper d'une action : les équipes, puis les personnes du bureau et les membres
  // par ordre alphabétique (pas les visiteurs).
  function referentsPossibles(groupe) {
    return {
      equipes: Gr.equipes(groupe),
      personnes: groupe.personnes.filter(function (p) { return p.role !== "visiteur"; }).sort(function (a, b) {
        return a.prenom.localeCompare(b.prenom, "fr") || (a.nom || "").localeCompare(b.nom || "", "fr");
      })
    };
  }

  // Le choix « Qui s'en occupe ? » s'écrit "p:identifiant" (une personne) ou "e:identifiant" (une équipe).
  function lireReferent(groupe, valeur) {
    var m = /^([pe]):(.+)$/.exec(String(valeur || ""));
    if (!m) { return null; }
    if (m[1] === "p") {
      var p = Gr.trouverPersonne(groupe, m[2]);
      return p && p.role !== "visiteur" ? { referentId: p.id, referent: p.prenom } : null;
    }
    var e = Gr.trouverEquipe(groupe, m[2]);
    return e ? { equipeId: e.id, referent: e.bureau ? "" : e.nom } : null;
  }

  function choixReferent(action) {
    if (action.equipeId) { return "e:" + action.equipeId; }
    return action.referentId ? "p:" + action.referentId : "";
  }

  // Les quatre choix de « Pour quand ? ».
  function sorteEcheance(action) {
    if (action.dateLimite) { return "date"; }
    if (action.joursAvant === 0) { return "jour-j"; }
    if (action.joursAvant === 1) { return "veille"; }
    return "jours";
  }

  // « garder » (en modification) : la personne notée sur l'action n'est plus proposée dans la liste, on ne la change pas.
  function validerAction(groupe, evenement, saisie, reference) {
    var libelle = nettoyer(saisie.libelle);
    var erreurs = {};
    var valeurs = { libelle: libelle, joursAvant: 0, dateLimite: "" };
    if (!libelle) { erreurs.libelle = "vide"; } else if (libelle.length > LIMITES.libelle) { erreurs.libelle = "long"; }

    if (saisie.referent === "garder") { valeurs.garderReferent = true; }
    else {
      var ref = lireReferent(groupe, saisie.referent);
      if (!ref) { erreurs.referent = "invalide"; } else { valeurs.referent = ref; }
    }

    if (saisie.echeance === "jour-j") { valeurs.joursAvant = 0; }
    else if (saisie.echeance === "veille") { valeurs.joursAvant = 1; }
    else if (saisie.echeance === "jours") {
      var t = String(saisie.jours == null ? "" : saisie.jours).trim();
      var n = NOMBRE.test(t) ? Number(t) : NaN;
      if (!(n >= LIMITES.joursMin && n <= LIMITES.joursMax)) { erreurs.jours = "invalide"; } else { valeurs.joursAvant = n; }
    } else if (saisie.echeance === "date") {
      var d = lireDate(String(saisie.date == null ? "" : saisie.date).trim());
      var ecart = d ? L.joursJusqua(L.dateEvenement(evenement, reference), d) : 0;
      if (!d) { erreurs.date = "vide"; }
      else if (ecart < 0) { erreurs.date = "apres"; }
      else { valeurs.joursAvant = ecart; valeurs.dateLimite = ecrireDate(d); }
    } else { erreurs.echeance = "invalide"; }
    return { ok: Object.keys(erreurs).length === 0, erreurs: erreurs, valeurs: valeurs };
  }

  function poserReferent(action, ref) {
    delete action.referentId;
    delete action.equipeId;
    if (ref.referentId) { action.referentId = ref.referentId; } else { action.equipeId = ref.equipeId; }
    action.referent = ref.referent;
  }

  function ajouterAction(groupe, personne, evenementId, saisie, reference) {
    var o = evenementOuvert(groupe, personne, evenementId, reference);
    if (!o.ok) { return o; }
    if (saisie.referent === "garder") { return { ok: false, raison: "saisie", erreurs: { referent: "invalide" } }; }
    var v = validerAction(groupe, o.evenement, saisie, reference);
    if (!v.ok) { return { ok: false, raison: "saisie", erreurs: v.erreurs }; }
    var a = { id: nouvelId("a"), libelle: v.valeurs.libelle, statut: "a-faire", joursAvant: v.valeurs.joursAvant };
    if (v.valeurs.dateLimite) { a.dateLimite = v.valeurs.dateLimite; }
    poserReferent(a, v.valeurs.referent);
    o.evenement.actions.push(a);
    return { ok: true, action: a, evenement: o.evenement };
  }

  function modifierAction(groupe, personne, evenementId, actionId, saisie, reference) {
    var o = evenementOuvert(groupe, personne, evenementId, reference);
    if (!o.ok) { return o; }
    var a = trouverAction(o.evenement, actionId);
    if (!a) { return { ok: false, raison: "introuvable" }; }
    var v = validerAction(groupe, o.evenement, saisie, reference);
    if (!v.ok) { return { ok: false, raison: "saisie", erreurs: v.erreurs }; }
    a.libelle = v.valeurs.libelle;
    if (!v.valeurs.garderReferent) { poserReferent(a, v.valeurs.referent); }
    // L'ancien texte d'échéance (« 6 semaines avant ») ne reste que si l'échéance n'a pas bougé.
    if (v.valeurs.joursAvant !== a.joursAvant || v.valeurs.dateLimite) { delete a.echeance; }
    a.joursAvant = v.valeurs.joursAvant;
    if (v.valeurs.dateLimite) { a.dateLimite = v.valeurs.dateLimite; } else { delete a.dateLimite; }
    return { ok: true, action: a, evenement: o.evenement };
  }

  function supprimerAction(groupe, personne, evenementId, actionId, reference) {
    var o = evenementOuvert(groupe, personne, evenementId, reference);
    if (!o.ok) { return o; }
    var a = trouverAction(o.evenement, actionId);
    if (!a) { return { ok: false, raison: "introuvable" }; }
    o.evenement.actions.splice(o.evenement.actions.indexOf(a), 1);
    return { ok: true, action: a, evenement: o.evenement };
  }

  // ---------- État d'une action ----------

  // Qui peut changer l'état d'une action : son référent (la personne, ou chaque personne de
  // l'équipe référente) et le bureau. Une action sans référent : le bureau seul.
  function peutChangerEtat(groupe, personne, action) {
    if (!groupe || !personne || !action || !Gr.estAssociation(groupe)) { return false; }
    return Gr.peutGerer(groupe, personne) || L.estReferent(action, personne, groupe);
  }

  // Passe l'action à l'état suivant. Rien d'autre ne change. Refusé (raison "droits") pour les autres.
  function changerEtatAction(groupe, personne, evenementId, actionId) {
    if (!groupe || !Gr.estAssociation(groupe)) { return { ok: false, raison: "sorte" }; }
    var e = L.trouverEvenement(groupe, evenementId);
    var a = e && trouverAction(e, actionId);
    if (!a) { return { ok: false, raison: "introuvable" }; }
    if (!peutChangerEtat(groupe, personne, a)) { return { ok: false, raison: "droits" }; }
    a.statut = L.statutSuivant(a.statut);
    return { ok: true, action: a, evenement: e };
  }

  // ---------- Créneaux ----------

  // inscrits : nombre de personnes déjà inscrites (0 pour un nouveau créneau).
  function validerCreneau(saisie, inscrits) {
    var titre = nettoyer(saisie.titre);
    var debut = heure(saisie.debut), fin = heure(saisie.fin);
    var t = String(saisie.places == null ? "" : saisie.places).trim();
    var places = NOMBRE.test(t) ? Number(t) : NaN;
    var erreurs = {};
    if (!titre) { erreurs.titre = "vide"; } else if (titre.length > LIMITES.intitule) { erreurs.titre = "long"; }
    if (!debut) { erreurs.debut = "vide"; }
    if (!fin) { erreurs.fin = "vide"; } else if (debut && fin <= debut) { erreurs.fin = "avant"; }
    if (!(places >= LIMITES.placesMin && places <= LIMITES.placesMax)) { erreurs.places = "invalide"; }
    else if (places < (inscrits || 0)) { erreurs.places = "inscrits"; }
    return { ok: Object.keys(erreurs).length === 0, erreurs: erreurs, valeurs: { titre: titre, debut: debut, fin: fin, places: places } };
  }

  // horaire(debut, fin) rend le texte affiché (« 16 h – 18 h ») : ses mots sont dans mots.js.
  function ajouterCreneau(groupe, personne, evenementId, saisie, horaire, reference) {
    var o = evenementOuvert(groupe, personne, evenementId, reference);
    if (!o.ok) { return o; }
    var v = validerCreneau(saisie, 0);
    if (!v.ok) { return { ok: false, raison: "saisie", erreurs: v.erreurs }; }
    var c = {
      id: nouvelId("c"), jour: 0, debut: v.valeurs.debut, fin: v.valeurs.fin, titre: v.valeurs.titre,
      horaire: String(horaire(v.valeurs.debut, v.valeurs.fin)), places: v.valeurs.places, inscrits: []
    };
    o.evenement.creneaux.push(c);
    return { ok: true, creneau: c, evenement: o.evenement };
  }

  // Les inscrits d'un créneau modifié restent inscrits.
  function modifierCreneau(groupe, personne, evenementId, creneauId, saisie, horaire, reference) {
    var o = evenementOuvert(groupe, personne, evenementId, reference);
    if (!o.ok) { return o; }
    var c = L.trouverCreneau(o.evenement, creneauId);
    if (!c) { return { ok: false, raison: "introuvable" }; }
    var v = validerCreneau(saisie, c.inscrits.length);
    if (!v.ok) { return { ok: false, raison: "saisie", erreurs: v.erreurs, inscrits: c.inscrits.length }; }
    c.titre = v.valeurs.titre;
    if (c.debut !== v.valeurs.debut || c.fin !== v.valeurs.fin) {
      c.debut = v.valeurs.debut;
      c.fin = v.valeurs.fin;
      c.jour = 0;
      c.horaire = String(horaire(c.debut, c.fin));
    }
    c.places = v.valeurs.places;
    return { ok: true, creneau: c, evenement: o.evenement };
  }

  function supprimerCreneau(groupe, personne, evenementId, creneauId, reference) {
    var o = evenementOuvert(groupe, personne, evenementId, reference);
    if (!o.ok) { return o; }
    var c = L.trouverCreneau(o.evenement, creneauId);
    if (!c) { return { ok: false, raison: "introuvable" }; }
    o.evenement.creneaux.splice(o.evenement.creneaux.indexOf(c), 1);
    return { ok: true, creneau: c, evenement: o.evenement };
  }

  var Evenements = {
    LIMITES: LIMITES,
    lireDate: lireDate,
    ecrireDate: ecrireDate,
    validerEvenement: validerEvenement,
    creerEvenement: creerEvenement,
    trouverAction: trouverAction,
    referentsPossibles: referentsPossibles,
    choixReferent: choixReferent,
    sorteEcheance: sorteEcheance,
    validerAction: validerAction,
    ajouterAction: ajouterAction,
    modifierAction: modifierAction,
    supprimerAction: supprimerAction,
    peutChangerEtat: peutChangerEtat,
    changerEtatAction: changerEtatAction,
    validerCreneau: validerCreneau,
    ajouterCreneau: ajouterCreneau,
    modifierCreneau: modifierCreneau,
    supprimerCreneau: supprimerCreneau
  };

  racine.Evenements = Evenements;
  if (typeof module !== "undefined") { module.exports = Evenements; }
})(typeof window !== "undefined" ? window : globalThis);
