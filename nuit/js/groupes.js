/*
  Règles des groupes, des personnes et des équipes (demande 005), sans rien d'affichage.
  Chargé par la page et par les tests automatiques (Node).

  Deux sortes de groupes :
  - "simple" : rôles organisateur et membre ;
  - "association" : rôles bureau, membre et visiteur ; l'équipe « Le bureau » y existe d'office
    (elle n'est pas enregistrée : on la forme à partir des rôles).
  Il reste toujours au moins un organisateur (ou une personne du bureau).
  Les erreurs sont rendues sous forme de codes ; leurs textes sont dans mots.js.
*/
(function (racine) {
  "use strict";

  var SORTES = ["simple", "association"];
  var ROLES = { simple: ["organisateur", "membre"], association: ["bureau", "membre", "visiteur"] };
  var ROLE_GESTION = { simple: "organisateur", association: "bureau" };
  var ID_EQUIPE_BUREAU = "bureau";
  var FORMAT_ESSAI = "monasso-essai";
  var ID_VALIDE = /^[A-Za-z0-9_-]{1,64}$/;
  var COULEUR_VALIDE = /^#[0-9A-Fa-f]{6}$/;
  var DATE_VALIDE = /^\d{4}-\d\d-\d\d$/;
  var HEURE_VALIDE = /^\d\d:\d\d$/;
  var STATUTS_ACTION = ["a-faire", "en-cours", "fait"]; // les mêmes que dans logique.js

  function nettoyer(t) { return String(t == null ? "" : t).replace(/\s+/g, " ").trim(); }

  function nouvelId(prefixe) {
    var octets = new Uint8Array(6);
    racine.crypto.getRandomValues(octets);
    return prefixe + "-" + Array.prototype.map.call(octets, function (o) { return ("0" + o.toString(16)).slice(-2); }).join("");
  }

  // ---------- Groupes ----------

  function trouverGroupe(etat, id) {
    return etat.groupes.filter(function (g) { return g.id === id; })[0] || null;
  }

  function groupeActif(etat) {
    return trouverGroupe(etat, etat.groupeActif) || etat.groupes[0];
  }

  function estAssociation(groupe) { return groupe.sorte === "association"; }

  function validerGroupe(saisie, couleursPermises) {
    var nom = nettoyer(saisie.nom);
    var prenom = nettoyer(saisie.prenom);
    var erreurs = {};
    if (!nom) { erreurs.nom = "vide"; } else if (nom.length > 60) { erreurs.nom = "long"; }
    if (SORTES.indexOf(saisie.sorte) < 0) { erreurs.sorte = "invalide"; }
    var couleur = String(saisie.couleur || "").toUpperCase();
    var permises = (couleursPermises || []).map(function (c) { return c.toUpperCase(); });
    if (!COULEUR_VALIDE.test(couleur) || (permises.length && permises.indexOf(couleur) < 0)) { erreurs.couleur = "invalide"; }
    if (!prenom) { erreurs.prenom = "vide"; } else if (prenom.length > 40) { erreurs.prenom = "long"; }
    return { ok: Object.keys(erreurs).length === 0, erreurs: erreurs, valeurs: { nom: nom, sorte: saisie.sorte, couleur: couleur, prenom: prenom } };
  }

  // Crée le groupe, avec la personne qui le crée comme organisateur (ou au bureau),
  // en fait le groupe actif et la personne simulée.
  function creerGroupe(etat, saisie, couleursPermises) {
    var v = validerGroupe(saisie, couleursPermises);
    if (!v.ok) { return { ok: false, erreurs: v.erreurs }; }
    var createur = { id: nouvelId("p"), prenom: v.valeurs.prenom, nom: "", contact: "", role: ROLE_GESTION[v.valeurs.sorte] };
    var groupe = {
      id: nouvelId("g"),
      sorte: v.valeurs.sorte,
      nom: v.valeurs.nom,
      couleur: v.valeurs.couleur,
      personneParDefaut: createur.id,
      personnes: [createur],
      equipes: []
    };
    if (groupe.sorte === "association") { groupe.evenements = []; }
    etat.groupes.push(groupe);
    etat.groupeActif = groupe.id;
    etat.personneActive = etat.personneActive || {};
    etat.personneActive[groupe.id] = createur.id;
    return { ok: true, groupe: groupe, personne: createur };
  }

  // ---------- Personnes ----------

  function trouverPersonne(groupe, id) {
    return groupe.personnes.filter(function (p) { return p.id === id; })[0] || null;
  }

  function peutGerer(groupe, personne) {
    return !!personne && personne.role === ROLE_GESTION[groupe.sorte];
  }

  function gestionnaires(groupe) {
    return groupe.personnes.filter(function (p) { return peutGerer(groupe, p); });
  }

  // La personne simulée dans ce groupe : celle choisie, sinon celle par défaut, sinon un gestionnaire.
  function personneActive(etat, groupe) {
    var choix = etat.personneActive && etat.personneActive[groupe.id];
    return trouverPersonne(groupe, choix) || trouverPersonne(groupe, groupe.personneParDefaut) ||
      gestionnaires(groupe)[0] || groupe.personnes[0] || null;
  }

  function nomComplet(p) { return p.nom ? p.prenom + " " + p.nom : p.prenom; }

  // Ordre d'affichage : rôles dans l'ordre (gestion d'abord), puis prénom.
  function personnesTriees(groupe) {
    var ordre = ROLES[groupe.sorte];
    return groupe.personnes.slice().sort(function (a, b) {
      return (ordre.indexOf(a.role) - ordre.indexOf(b.role)) || a.prenom.localeCompare(b.prenom, "fr") || (a.nom || "").localeCompare(b.nom || "", "fr");
    });
  }

  function contactValide(texte) {
    var t = nettoyer(texte);
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) { return true; }
    var chiffres = t.replace(/[\s.\-()]/g, "");
    return /^0\d{9}$/.test(chiffres) || /^\+\d{10,13}$/.test(chiffres);
  }

  function validerPersonne(groupe, saisie) {
    var prenom = nettoyer(saisie.prenom);
    var nom = nettoyer(saisie.nom);
    var contact = nettoyer(saisie.contact);
    var erreurs = {};
    if (!prenom) { erreurs.prenom = "vide"; } else if (prenom.length > 40) { erreurs.prenom = "long"; }
    if (nom.length > 40) { erreurs.nom = "long"; }
    if (contact && !contactValide(contact)) { erreurs.contact = "invalide"; }
    if (ROLES[groupe.sorte].indexOf(saisie.role) < 0) { erreurs.role = "invalide"; }
    return { ok: Object.keys(erreurs).length === 0, erreurs: erreurs, valeurs: { prenom: prenom, nom: nom, contact: contact, role: saisie.role } };
  }

  function ajouterPersonne(groupe, saisie) {
    var v = validerPersonne(groupe, saisie);
    if (!v.ok) { return { ok: false, raison: "saisie", erreurs: v.erreurs }; }
    var p = { id: nouvelId("p"), prenom: v.valeurs.prenom, nom: v.valeurs.nom, contact: v.valeurs.contact, role: v.valeurs.role };
    groupe.personnes.push(p);
    return { ok: true, personne: p };
  }

  function modifierPersonne(groupe, id, saisie) {
    var p = trouverPersonne(groupe, id);
    if (!p) { return { ok: false, raison: "introuvable" }; }
    var v = validerPersonne(groupe, saisie);
    if (!v.ok) { return { ok: false, raison: "saisie", erreurs: v.erreurs }; }
    if (peutGerer(groupe, p) && v.valeurs.role !== p.role && gestionnaires(groupe).length <= 1) {
      return { ok: false, raison: "dernier-gestionnaire" };
    }
    p.prenom = v.valeurs.prenom;
    p.nom = v.valeurs.nom;
    p.contact = v.valeurs.contact;
    if (v.valeurs.role !== p.role) { delete p.fonction; } // « Présidente » n'a plus de sens hors du bureau
    p.role = v.valeurs.role;
    return { ok: true, personne: p };
  }

  function retirerPersonne(groupe, id) {
    var p = trouverPersonne(groupe, id);
    if (!p) { return { ok: false, raison: "introuvable" }; }
    if (peutGerer(groupe, p) && gestionnaires(groupe).length <= 1) { return { ok: false, raison: "dernier-gestionnaire" }; }
    groupe.personnes.splice(groupe.personnes.indexOf(p), 1);
    groupe.equipes.forEach(function (e) { e.personnes = e.personnes.filter(function (x) { return x !== id; }); });
    return { ok: true, personne: p };
  }

  // ---------- Actions rattachées à la personne (demande 005b) ----------
  // Une action tient à sa personne par l'identifiant (referentId), plus par le prénom :
  // renommer quelqu'un ne lui retire donc aucune action.
  // Reprise des anciennes données (donnees.js écrit à la main, état gardé dans le navigateur,
  // essais déjà enregistrés) : une action qui n'a qu'un prénom est rattachée à la première
  // personne du groupe qui porte ce prénom. Sans effet sur une action déjà rattachée.
  function rattacherActions(etat) {
    (etat.groupes || []).forEach(function (g) {
      (g.evenements || []).forEach(function (e) {
        (e.actions || []).forEach(function (a) {
          if (a.referentId || a.equipeId || !a.referent) { return; } // equipeId : action confiée à une équipe (demande 006)
          var p = g.personnes.filter(function (x) { return x.prenom === a.referent; })[0];
          if (p) { a.referentId = p.id; }
        });
      });
    });
    return etat;
  }

  // La personne d'une action, ou null si elle n'est plus dans le groupe.
  function referentAction(groupe, action) {
    return action.referentId ? trouverPersonne(groupe, action.referentId) : null;
  }

  // ---------- Équipes ----------

  // Toutes les équipes à afficher : dans une association, « Le bureau » d'abord, formée d'office.
  function equipes(groupe) {
    var liste = groupe.equipes.slice();
    if (estAssociation(groupe)) {
      liste.unshift({ id: ID_EQUIPE_BUREAU, bureau: true, personnes: gestionnaires(groupe).map(function (p) { return p.id; }) });
    }
    return liste;
  }

  function trouverEquipe(groupe, id) {
    return equipes(groupe).filter(function (e) { return e.id === id; })[0] || null;
  }

  function equipesDePersonne(groupe, personneId) {
    return equipes(groupe).filter(function (e) { return e.personnes.indexOf(personneId) >= 0; });
  }

  function membresEquipe(groupe, equipe) {
    return equipe.personnes.map(function (id) { return trouverPersonne(groupe, id); }).filter(Boolean);
  }

  function validerEquipe(groupe, saisie) {
    var nom = nettoyer(saisie.nom);
    var erreurs = {};
    if (!nom) { erreurs.nom = "vide"; } else if (nom.length > 40) { erreurs.nom = "long"; }
    var ids = (saisie.personnes || []).filter(function (id, i, t) { return trouverPersonne(groupe, id) && t.indexOf(id) === i; });
    return { ok: Object.keys(erreurs).length === 0, erreurs: erreurs, valeurs: { nom: nom, personnes: ids } };
  }

  function creerEquipe(groupe, saisie) {
    var v = validerEquipe(groupe, saisie);
    if (!v.ok) { return { ok: false, raison: "saisie", erreurs: v.erreurs }; }
    var e = { id: nouvelId("e"), nom: v.valeurs.nom, personnes: v.valeurs.personnes };
    groupe.equipes.push(e);
    return { ok: true, equipe: e };
  }

  function modifierEquipe(groupe, id, saisie) {
    var e = groupe.equipes.filter(function (x) { return x.id === id; })[0];
    if (!e) { return { ok: false, raison: "introuvable" }; } // « Le bureau » ne se modifie pas ici
    var v = validerEquipe(groupe, saisie);
    if (!v.ok) { return { ok: false, raison: "saisie", erreurs: v.erreurs }; }
    e.nom = v.valeurs.nom;
    e.personnes = v.valeurs.personnes;
    return { ok: true, equipe: e };
  }

  function supprimerEquipe(groupe, id) {
    var e = groupe.equipes.filter(function (x) { return x.id === id; })[0];
    if (!e) { return { ok: false, raison: "introuvable" }; }
    groupe.equipes.splice(groupe.equipes.indexOf(e), 1);
    return { ok: true, equipe: e };
  }

  // ---------- Essai enregistré dans un fichier ----------

  function exporterEssai(etat, maintenant) {
    return JSON.stringify({
      format: FORMAT_ESSAI,
      version: etat.version,
      enregistreLe: (maintenant ? new Date(maintenant) : new Date()).toISOString(),
      etat: etat
    }, null, 1);
  }

  // Le fichier vient de l'extérieur : on vérifie sa forme avant de s'en servir
  // (identifiants sans caractère spécial, couleurs valides, listes là où on les attend,
  // un texte là où on attend un texte, un nombre là où on attend un nombre).
  // Un seul champ qui ne va pas fait refuser tout le fichier.
  function estTexte(v) { return typeof v === "string"; }
  function texteOuRien(v) { return v === undefined || v === null || typeof v === "string"; }
  function estNombre(v) { return typeof v === "number" && isFinite(v); }
  function nombreOuRien(v) { return v === undefined || v === null || estNombre(v); }
  function estId(v) { return typeof v === "string" && ID_VALIDE.test(v); }
  function idOuRien(v) { return v === undefined || v === null || estId(v); }
  function liste(v, chacun) { return Array.isArray(v) && v.every(function (x) { return !!x && typeof x === "object" && chacun(x); }); }

  function dateOuRien(v) { return v === undefined || v === null || (estTexte(v) && DATE_VALIDE.test(v) && !isNaN(new Date(v + "T00:00:00").getTime())); }
  function heureOuRien(v) { return v === undefined || v === null || v === "" || (estTexte(v) && HEURE_VALIDE.test(v)); }

  // equipeId, dateLimite : actions créées à la main (demande 006).
  function actionValide(a) {
    return estId(a.id) && estTexte(a.libelle) && texteOuRien(a.referent) && idOuRien(a.referentId) && idOuRien(a.equipeId) &&
      texteOuRien(a.echeance) && estNombre(a.joursAvant) && dateOuRien(a.dateLimite) && STATUTS_ACTION.indexOf(a.statut) >= 0;
  }

  function creneauValide(c) {
    return estId(c.id) && estTexte(c.titre) && estTexte(c.horaire) &&
      estTexte(c.debut) && HEURE_VALIDE.test(c.debut) && estTexte(c.fin) && HEURE_VALIDE.test(c.fin) &&
      nombreOuRien(c.jour) &&
      estNombre(c.places) && c.places >= 0 && Math.floor(c.places) === c.places &&
      liste(c.inscrits, function (v) { return estTexte(v.prenom) && estTexte(v.initiale) && texteOuRien(v.contact) && estId(v.jeton); });
  }

  function bilanValide(b) {
    return !!b && typeof b === "object" &&
      estNombre(b.benevoles) && estNombre(b.heures) && estNombre(b.recetteBuvette) && estNombre(b.exposants) &&
      estTexte(b.exposantsLibelle) && estTexte(b.ceQueCaFinance);
  }

  function evenementValide(e) {
    var quand = e.date === undefined || e.date === null
      ? estNombre(e.dansJours)
      : estTexte(e.date) && DATE_VALIDE.test(e.date) && !isNaN(new Date(e.date + "T00:00:00").getTime()) && nombreOuRien(e.dansJours);
    // debut, fin : horaires d'un événement créé à la main (demande 006), "HH:MM" ou vide.
    return estId(e.id) && estTexte(e.titre) && estTexte(e.lieu) && quand && heureOuRien(e.debut) && heureOuRien(e.fin) &&
      liste(e.actions, actionValide) && liste(e.creneaux, creneauValide) &&
      (e.bilan === undefined || e.bilan === null || bilanValide(e.bilan));
  }

  // Une question (demande 007) : ses listes de personnes sont des identifiants, ses dates de vraies dates.
  var SORTES_A = ["tous", "gestion", "equipe", "personnes"];
  function listeIds(v) { return Array.isArray(v) && v.every(estId); }
  function messageValide(m) {
    return estId(m.id) && m.sorte === "question" && estTexte(m.texte) && estId(m.auteurId) && texteOuRien(m.auteur) &&
      dateOuRien(m.creeLe) && nombreOuRien(m.creeDansJours) && dateOuRien(m.closeLe) && nombreOuRien(m.closeDansJours) &&
      dateOuRien(m.jour) && nombreOuRien(m.jourDansJours) && nombreOuRien(m.jourSemaine) && heureOuRien(m.heure) &&
      dateOuRien(m.avantLe) && nombreOuRien(m.avantLeDansJours) && nombreOuRien(m.avantLeJoursAvant) &&
      (m.attendus === undefined || m.attendus === null || (estNombre(m.attendus) && m.attendus >= 1 && Math.floor(m.attendus) === m.attendus)) &&
      idOuRien(m.evenementId) &&
      !!m.a && typeof m.a === "object" && SORTES_A.indexOf(m.a.sorte) >= 0 && idOuRien(m.a.equipeId) && texteOuRien(m.a.nom) &&
      listeIds(m.destinataires) && listeIds(m.oui) && listeIds(m.non) &&
      // Commentaires (demande 008) : un texte, un numéro d'ordre, une date et une heure ; « vus » : un numéro par personne.
      (m.commentaires === undefined || m.commentaires === null || liste(m.commentaires, commentaireValide)) &&
      nombreOuRien(m.dernierCommentaire) && vusValides(m.vus);
  }
  function commentaireValide(c) {
    return estId(c.id) && estNombre(c.n) && estId(c.auteurId) && texteOuRien(c.auteur) && estTexte(c.texte) &&
      dateOuRien(c.le) && nombreOuRien(c.dansJours) && heureOuRien(c.heure);
  }
  function vusValides(v) {
    return v === undefined || v === null ||
      (typeof v === "object" && !Array.isArray(v) && Object.keys(v).every(function (k) { return estId(k) && estNombre(v[k]); }));
  }
  // Ce qui serait envoyé (demande 008) : des identifiants, une date, une heure, et le texte du commentaire cité.
  var SORTES_ENVOI = ["question", "relance", "commentaire"];
  function envoiValide(e) {
    return estId(e.id) && SORTES_ENVOI.indexOf(e.sorte) >= 0 && estId(e.messageId) && dateOuRien(e.le) && nombreOuRien(e.dansJours) &&
      heureOuRien(e.heure) && texteOuRien(e.de) && listeIds(e.a) && idOuRien(e.commentaireId) && texteOuRien(e.commentaire) &&
      (e.supprime === undefined || e.supprime === null || typeof e.supprime === "boolean");
  }

  function reglagesValides(r) {
    return r === undefined || r === null || (typeof r === "object" && !Array.isArray(r) &&
      (r.membresToutLeGroupe === undefined || r.membresToutLeGroupe === null || typeof r.membresToutLeGroupe === "boolean"));
  }

  function groupeValide(g) {
    return SORTES.indexOf(g.sorte) >= 0 && estId(g.id) && estTexte(g.nom) && estTexte(g.couleur) && COULEUR_VALIDE.test(g.couleur) &&
      texteOuRien(g.ecole) && texteOuRien(g.ville) && idOuRien(g.personneParDefaut) &&
      liste(g.personnes, function (p) {
        return estId(p.id) && estTexte(p.prenom) && texteOuRien(p.nom) && texteOuRien(p.contact) && texteOuRien(p.fonction) &&
          ROLES[g.sorte].indexOf(p.role) >= 0;
      }) &&
      liste(g.equipes, function (e) { return estId(e.id) && estTexte(e.nom) && Array.isArray(e.personnes) && e.personnes.every(estId); }) &&
      (g.sorte === "simple" ? g.evenements === undefined || g.evenements === null || liste(g.evenements, evenementValide) : liste(g.evenements, evenementValide)) &&
      (g.messages === undefined || g.messages === null || liste(g.messages, messageValide)) && reglagesValides(g.reglages) &&
      (g.envois === undefined || g.envois === null || liste(g.envois, envoiValide)) &&
      // jetonsSupprimes : jetons des inscrits d'un événement supprimé (demande 006b), des identifiants et rien d'autre.
      (g.jetonsSupprimes === undefined || g.jetonsSupprimes === null || listeIds(g.jetonsSupprimes)) &&
      gestionnaires(g).length >= 1;
  }

  function formeValide(etat) {
    function idsSains(o) {
      if (Array.isArray(o)) { return o.every(idsSains); }
      if (o && typeof o === "object") {
        return Object.keys(o).every(function (k) {
          var v = o[k];
          if ((k === "id" || k === "jeton") && !estId(v)) { return false; }
          return idsSains(v);
        });
      }
      return true;
    }
    if (!etat || !estNombre(etat.version) || !Array.isArray(etat.groupes) || !etat.groupes.length) { return false; }
    var pa = etat.personneActive;
    var personnesActives = pa === undefined || pa === null ||
      (typeof pa === "object" && !Array.isArray(pa) && Object.keys(pa).every(function (k) { return estId(k) && estId(pa[k]); }));
    return liste(etat.groupes, groupeValide) && idsSains(etat) && idOuRien(etat.groupeParDefaut) &&
      (!etat.groupeActif || estId(etat.groupeActif)) && personnesActives;
  }

  function lireEssai(texte, versionAttendue) {
    var d;
    try { d = JSON.parse(texte); } catch (err) { return { ok: false, raison: "illisible" }; }
    if (!d || d.format !== FORMAT_ESSAI || !d.etat) { return { ok: false, raison: "illisible" }; }
    if (d.version !== versionAttendue || d.etat.version !== versionAttendue) { return { ok: false, raison: "ancien" }; }
    if (!formeValide(d.etat)) { return { ok: false, raison: "illisible" }; }
    if (!trouverGroupe(d.etat, d.etat.groupeActif)) { d.etat.groupeActif = d.etat.groupes[0].id; }
    if (!d.etat.personneActive || typeof d.etat.personneActive !== "object") { d.etat.personneActive = {}; }
    return { ok: true, etat: d.etat, enregistreLe: d.enregistreLe };
  }

  function nomFichierEssai(maintenant) {
    var d = maintenant ? new Date(maintenant) : new Date();
    var deux = function (n) { return (n < 10 ? "0" : "") + n; };
    return "essai-monasso-" + d.getFullYear() + "-" + deux(d.getMonth() + 1) + "-" + deux(d.getDate()) + "-" + deux(d.getHours()) + "h" + deux(d.getMinutes()) + ".json";
  }

  var Groupes = {
    SORTES: SORTES,
    ROLES: ROLES,
    ROLE_GESTION: ROLE_GESTION,
    ID_EQUIPE_BUREAU: ID_EQUIPE_BUREAU,
    trouverGroupe: trouverGroupe,
    groupeActif: groupeActif,
    estAssociation: estAssociation,
    validerGroupe: validerGroupe,
    creerGroupe: creerGroupe,
    trouverPersonne: trouverPersonne,
    peutGerer: peutGerer,
    gestionnaires: gestionnaires,
    personneActive: personneActive,
    nomComplet: nomComplet,
    personnesTriees: personnesTriees,
    validerPersonne: validerPersonne,
    ajouterPersonne: ajouterPersonne,
    modifierPersonne: modifierPersonne,
    retirerPersonne: retirerPersonne,
    equipes: equipes,
    trouverEquipe: trouverEquipe,
    equipesDePersonne: equipesDePersonne,
    membresEquipe: membresEquipe,
    creerEquipe: creerEquipe,
    modifierEquipe: modifierEquipe,
    supprimerEquipe: supprimerEquipe,
    rattacherActions: rattacherActions,
    referentAction: referentAction,
    exporterEssai: exporterEssai,
    lireEssai: lireEssai,
    nomFichierEssai: nomFichierEssai
  };

  racine.Groupes = Groupes;
  if (typeof module !== "undefined") { module.exports = Groupes; }
})(typeof window !== "undefined" ? window : globalThis);
