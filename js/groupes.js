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
  // (identifiants sans caractère spécial, couleurs valides, listes là où on les attend).
  function formeValide(etat) {
    function idsSains(o) {
      if (Array.isArray(o)) { return o.every(idsSains); }
      if (o && typeof o === "object") {
        return Object.keys(o).every(function (k) {
          var v = o[k];
          if ((k === "id" || k === "jeton") && !(typeof v === "string" && ID_VALIDE.test(v))) { return false; }
          return idsSains(v);
        });
      }
      return true;
    }
    if (!etat || !Array.isArray(etat.groupes) || !etat.groupes.length) { return false; }
    var ok = etat.groupes.every(function (g) {
      return g && SORTES.indexOf(g.sorte) >= 0 && typeof g.nom === "string" && COULEUR_VALIDE.test(g.couleur) &&
        Array.isArray(g.personnes) && Array.isArray(g.equipes) &&
        g.personnes.every(function (p) { return p && typeof p.prenom === "string" && ROLES[g.sorte].indexOf(p.role) >= 0; }) &&
        g.equipes.every(function (e) { return e && typeof e.nom === "string" && Array.isArray(e.personnes) && e.personnes.every(function (x) { return ID_VALIDE.test(x); }); }) &&
        (g.sorte === "simple" || Array.isArray(g.evenements)) &&
        gestionnaires(g).length >= 1;
    });
    return ok && idsSains(etat) && (!etat.groupeActif || ID_VALIDE.test(etat.groupeActif));
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
    exporterEssai: exporterEssai,
    lireEssai: lireEssai,
    nomFichierEssai: nomFichierEssai
  };

  racine.Groupes = Groupes;
  if (typeof module !== "undefined") { module.exports = Groupes; }
})(typeof window !== "undefined" ? window : globalThis);
