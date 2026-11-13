/*
  Règles du prototype, sans rien d'affichage : dates, retards, places,
  inscriptions. Ce fichier est aussi chargé par les tests automatiques (Node).
*/
(function (racine) {
  "use strict";

  var JOUR = 24 * 60 * 60 * 1000;
  var STATUTS = ["a-faire", "en-cours", "fait"];
  var LIBELLES_STATUT = { "a-faire": "À faire", "en-cours": "En cours", "fait": "Fait" };

  // ---------- Dates ----------

  function aujourdhui(reference) {
    var d = reference ? new Date(reference) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function ajouterJours(date, n) {
    var d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function dateEvenement(evenement, reference) {
    if (evenement.date) { return aujourdhui(evenement.date + "T00:00:00"); }
    var d = ajouterJours(aujourdhui(reference), evenement.dansJours);
    // Les événements de l'école ont lieu le samedi : on avance au samedi suivant.
    if (evenement.leSamedi) { d = ajouterJours(d, (6 - d.getDay() + 7) % 7); }
    return d;
  }

  function dateLimite(action, evenement, reference) {
    return ajouterJours(dateEvenement(evenement, reference), -action.joursAvant);
  }

  function joursJusqua(date, reference) {
    return Math.round((aujourdhui(date) - aujourdhui(reference)) / JOUR);
  }

  // ---------- Actions ----------

  function estEnRetard(action, evenement, reference) {
    return action.statut !== "fait" && joursJusqua(dateLimite(action, evenement, reference), reference) < 0;
  }

  function estCetteSemaine(action, evenement, reference) {
    var j = joursJusqua(dateLimite(action, evenement, reference), reference);
    return action.statut !== "fait" && j >= 0 && j <= 7;
  }

  function aSurveiller(evenement, reference) {
    var enRetard = [], cetteSemaine = [];
    evenement.actions.forEach(function (a) {
      if (estEnRetard(a, evenement, reference)) { enRetard.push(a); }
      else if (estCetteSemaine(a, evenement, reference)) { cetteSemaine.push(a); }
    });
    return { enRetard: enRetard, cetteSemaine: cetteSemaine };
  }

  function prochaineAction(evenement, reference) {
    var restantes = evenement.actions.filter(function (a) { return a.statut !== "fait"; });
    restantes.sort(function (a, b) { return b.joursAvant - a.joursAvant; });
    return restantes[0] || null;
  }

  // Regroupe les actions par échéance, de la plus lointaine au jour J.
  function grouperParEcheance(evenement) {
    var groupes = [];
    var parNom = {};
    evenement.actions.forEach(function (a) {
      var g = parNom[a.echeance];
      if (!g) {
        g = { echeance: a.echeance, joursAvant: a.joursAvant, actions: [] };
        parNom[a.echeance] = g;
        groupes.push(g);
      }
      g.joursAvant = Math.max(g.joursAvant, a.joursAvant);
      g.actions.push(a);
    });
    groupes.sort(function (a, b) { return b.joursAvant - a.joursAvant; });
    groupes.forEach(function (g) {
      g.actions.sort(function (a, b) { return b.joursAvant - a.joursAvant; });
    });
    return groupes;
  }

  function statutSuivant(statut) {
    var i = STATUTS.indexOf(statut);
    return STATUTS[(i + 1) % STATUTS.length];
  }

  function compterFaites(evenement) {
    return evenement.actions.filter(function (a) { return a.statut === "fait"; }).length;
  }

  // ---------- Coups de main ----------

  function placesRestantes(creneau) {
    return Math.max(0, creneau.places - creneau.inscrits.length);
  }

  function estComplet(creneau) {
    return placesRestantes(creneau) === 0;
  }

  // Seul affichage public d'un volontaire : prénom + initiale.
  function nomPublic(volontaire) {
    return volontaire.prenom.trim() + " " + volontaire.initiale.trim().charAt(0).toUpperCase() + ".";
  }

  function analyserContact(texte) {
    var t = (texte || "").trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) { return { type: "email", valeur: t }; }
    var chiffres = t.replace(/[\s.\-()]/g, "");
    if (/^0\d{9}$/.test(chiffres) || /^\+\d{10,13}$/.test(chiffres)) { return { type: "tel", valeur: t }; }
    return null;
  }

  function validerInscription(saisie) {
    var prenom = (saisie.prenom || "").trim();
    // On ne garde que la première lettre, même si la personne tape son nom entier.
    var initiale = (saisie.initiale || "").trim().replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "").charAt(0).toUpperCase();
    var contact = analyserContact(saisie.contact);
    var erreurs = {};
    if (!prenom) { erreurs.prenom = "Indiquez votre prénom."; }
    else if (prenom.length > 40) { erreurs.prenom = "Ce prénom est un peu long."; }
    if (!initiale) { erreurs.initiale = "Indiquez la première lettre de votre nom."; }
    if (!contact) { erreurs.contact = "Indiquez un numéro de téléphone (10 chiffres) ou une adresse e-mail."; }
    return {
      ok: Object.keys(erreurs).length === 0,
      erreurs: erreurs,
      valeurs: { prenom: prenom, initiale: initiale, contact: contact ? contact.valeur : "" }
    };
  }

  function trouverEvenement(etat, id) {
    return etat.evenements.filter(function (e) { return e.id === id; })[0] || null;
  }

  function trouverCreneau(evenement, id) {
    return evenement.creneaux.filter(function (c) { return c.id === id; })[0] || null;
  }

  function nouveauJeton() {
    var octets = new Uint8Array(12);
    racine.crypto.getRandomValues(octets);
    return Array.prototype.map.call(octets, function (o) { return ("0" + o.toString(16)).slice(-2); }).join("");
  }

  function inscrire(etat, evenementId, creneauId, saisie) {
    var evenement = trouverEvenement(etat, evenementId);
    var creneau = evenement && trouverCreneau(evenement, creneauId);
    if (!creneau) { return { ok: false, raison: "introuvable" }; }
    if (estComplet(creneau)) { return { ok: false, raison: "complet" }; }
    var v = validerInscription(saisie);
    if (!v.ok) { return { ok: false, raison: "saisie", erreurs: v.erreurs }; }
    var volontaire = {
      prenom: v.valeurs.prenom,
      initiale: v.valeurs.initiale,
      contact: v.valeurs.contact,
      jeton: nouveauJeton()
    };
    creneau.inscrits.push(volontaire);
    return { ok: true, jeton: volontaire.jeton, volontaire: volontaire };
  }

  function trouverInscription(etat, jeton) {
    if (!jeton) { return null; }
    for (var i = 0; i < etat.evenements.length; i++) {
      var e = etat.evenements[i];
      for (var j = 0; j < e.creneaux.length; j++) {
        var c = e.creneaux[j];
        for (var k = 0; k < c.inscrits.length; k++) {
          if (c.inscrits[k].jeton === jeton) {
            return { evenement: e, creneau: c, volontaire: c.inscrits[k] };
          }
        }
      }
    }
    return null;
  }

  function annuler(etat, jeton) {
    var trouve = trouverInscription(etat, jeton);
    if (!trouve) { return false; }
    trouve.creneau.inscrits.splice(trouve.creneau.inscrits.indexOf(trouve.volontaire), 1);
    return true;
  }

  // ---------- Bilan ----------

  function texteBilan(association, bilan) {
    return "Merci à tous pour la " + bilan.titre.toLowerCase() + " : " +
      bilan.benevoles + " parents ont donné un coup de main, " +
      bilan.heures + " heures en tout, " +
      formaterEuros(bilan.recetteBuvette) + " à la buvette et " +
      bilan.exposants + " " + bilan.exposantsLibelle + ". " +
      bilan.ceQueCaFinance + " — " + association.nom;
  }

  function formaterEuros(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €";
  }

  var Logique = {
    STATUTS: STATUTS,
    LIBELLES_STATUT: LIBELLES_STATUT,
    aujourdhui: aujourdhui,
    ajouterJours: ajouterJours,
    dateEvenement: dateEvenement,
    dateLimite: dateLimite,
    joursJusqua: joursJusqua,
    estEnRetard: estEnRetard,
    estCetteSemaine: estCetteSemaine,
    aSurveiller: aSurveiller,
    prochaineAction: prochaineAction,
    grouperParEcheance: grouperParEcheance,
    statutSuivant: statutSuivant,
    compterFaites: compterFaites,
    placesRestantes: placesRestantes,
    estComplet: estComplet,
    nomPublic: nomPublic,
    analyserContact: analyserContact,
    validerInscription: validerInscription,
    trouverEvenement: trouverEvenement,
    trouverCreneau: trouverCreneau,
    inscrire: inscrire,
    trouverInscription: trouverInscription,
    annuler: annuler,
    texteBilan: texteBilan,
    formaterEuros: formaterEuros
  };

  racine.Logique = Logique;
  if (typeof module !== "undefined") { module.exports = Logique; }
})(typeof window !== "undefined" ? window : globalThis);
