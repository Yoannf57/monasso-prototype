/*
  Affichage du prototype : 4 écrans, navigation par l'adresse (#accueil, #evenement/…).
  Ce qu'un testeur saisit est gardé dans le navigateur (localStorage).
*/
(function () {
  "use strict";

  var L = window.Logique;
  var CLE = "monasso-prototype";
  var etat = charger();
  var creneauOuvert = null;   // créneau dont le formulaire est déplié
  var annulationFaite = null; // dernière inscription annulée (pour l'écran de confirmation)

  // ---------- Mémoire du navigateur ----------

  function cloner(o) { return JSON.parse(JSON.stringify(o)); }

  function charger() {
    try {
      var texte = window.localStorage.getItem(CLE);
      if (texte) {
        var e = JSON.parse(texte);
        if (e && e.version === DONNEES.version) { return e; }
      }
    } catch (err) { /* navigation privée : on repart des données d'origine */ }
    return cloner(DONNEES);
  }

  function sauver() {
    try { window.localStorage.setItem(CLE, JSON.stringify(etat)); } catch (err) { /* sans mémoire, la démo marche quand même */ }
  }

  function reinitialiser() {
    try { window.localStorage.removeItem(CLE); } catch (err) { /* rien */ }
    etat = cloner(DONNEES);
    creneauOuvert = null;
    annulationFaite = null;
  }

  // ---------- Outils de texte ----------

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function majuscule(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  var fmtLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  var fmtLongAnnee = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  var fmtCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  var fmtMois = new Intl.DateTimeFormat("fr-FR", { month: "short" });

  function dateLongue(d) { return majuscule(fmtLong.format(d)); }
  function dateCourte(d) { return fmtCourt.format(d); }

  function dansCombien(j) {
    if (j === 0) { return "aujourd'hui"; }
    if (j === 1) { return "demain"; }
    if (j < 14) { return "dans " + j + " jours"; }
    if (j < 60) { return "dans " + Math.round(j / 7) + " semaines"; }
    return "dans " + Math.round(j / 30) + " mois";
  }

  function quandAction(action, evenement) {
    var limite = L.dateLimite(action, evenement);
    var j = L.joursJusqua(limite);
    if (action.statut === "fait") { return "fait"; }
    if (j < -1) { return "en retard de " + (-j) + " jours"; }
    if (j === -1) { return "en retard depuis hier"; }
    if (j === 0) { return "pour aujourd'hui"; }
    if (j === 1) { return "pour demain"; }
    return "pour le " + dateCourte(limite);
  }

  function pastilleDate(d) {
    return '<span class="pastille" aria-hidden="true"><span class="pastille-jour">' + d.getDate() +
      '</span><span class="pastille-mois">' + esc(fmtMois.format(d).replace(".", "")) + "</span></span>";
  }

  // ---------- Écran 1 : accueil du bureau ----------

  function ecranAccueil() {
    var avenir = etat.evenements
      .filter(function (e) { return L.joursJusqua(L.dateEvenement(e)) >= 0; })
      .sort(function (a, b) { return L.dateEvenement(a) - L.dateEvenement(b); });

    var html = '<header class="entete">' +
      '<p class="surtitre">' + esc(etat.association.nom) + "</p>" +
      '<h1 tabindex="-1">Cette semaine au bureau</h1>' +
      '<p class="sous-titre">' + esc(dateLongue(L.aujourdhui())) + "</p>" +
      "</header>";

    avenir.forEach(function (e, i) {
      var date = L.dateEvenement(e);
      var s = L.aSurveiller(e);
      var faites = L.compterFaites(e);
      html += '<section class="evt' + (i === 0 ? " evt--premier" : "") + '" aria-labelledby="evt-' + e.id + '">' +
        '<a class="evt-tete" href="#evenement/' + e.id + '">' + pastilleDate(date) +
        '<span class="evt-titres"><span class="evt-titre" id="evt-' + e.id + '">' + esc(e.titre) + "</span>" +
        '<span class="evt-quand">' + esc(majuscule(dansCombien(L.joursJusqua(date)))) + " · " + esc(e.lieu) + "</span></span></a>";

      if (s.enRetard.length) {
        html += '<h2 class="rubrique rubrique--retard">En retard</h2>' + listeRappels(s.enRetard, e, true);
      }
      if (s.cetteSemaine.length) {
        html += '<h2 class="rubrique">Cette semaine</h2>' + listeRappels(s.cetteSemaine, e, false);
      }
      if (!s.enRetard.length && !s.cetteSemaine.length) {
        var p = L.prochaineAction(e);
        html += '<p class="calme">Rien d\'urgent.' +
          (p ? " Prochaine action : " + esc(p.libelle.charAt(0).toLowerCase() + p.libelle.slice(1)) + ", " + esc(quandAction(p, e).replace(/\.$/, "")) + "." : "") + "</p>";
      }
      html += '<a class="' + (i === 0 ? "bouton bouton--principal" : "lien-suite") + '" href="#evenement/' + e.id + '">' +
        "Voir les " + e.actions.length + " actions <span class=\"discret\">(" + faites + (faites > 1 ? " faites" : " faite") + ")</span></a>" +
        "</section>";
    });

    var passes = etat.bilans || [];
    if (passes.length) {
      html += '<section class="passe"><h2 class="rubrique">Déjà fait</h2><ul class="liste-simple">';
      passes.forEach(function (b) {
        html += '<li><a href="#bilan/' + b.id + '">' + esc(b.titre) + " — le bilan du soir</a></li>";
      });
      html += "</ul></section>";
    }
    return { titre: "Accueil du bureau", html: html };
  }

  function listeRappels(actions, evenement, retard) {
    return '<ul class="rappels">' + actions.map(function (a) {
      return '<li class="rappel' + (retard ? " rappel--retard" : "") + '">' +
        '<span class="rappel-libelle">' + esc(a.libelle) + "</span>" +
        '<span class="rappel-meta">' + esc(a.referent) + " · " + esc(quandAction(a, evenement)) + "</span></li>";
    }).join("") + "</ul>";
  }

  // ---------- Écran 2 : fiche événement ----------

  function ecranEvenement(id) {
    var e = L.trouverEvenement(etat, id);
    if (!e) { return introuvable(); }
    var date = L.dateEvenement(e);
    var groupes = L.grouperParEcheance(e);
    var nbRetard = e.actions.filter(function (a) { return L.estEnRetard(a, e); }).length;

    var html = '<a class="retour" href="#accueil">Accueil</a>' +
      '<header class="entete">' +
      '<p class="surtitre">' + esc(dateLongue(date)) + " · " + esc(e.lieu) + "</p>" +
      '<h1 tabindex="-1">' + esc(e.titre) + "</h1>" +
      '<p class="sous-titre" id="avancement">' + texteAvancement(e, nbRetard) + "</p>" +
      '<div class="barre" aria-hidden="true"><span id="barre" style="width:' + pourcentage(e) + '%"></span></div>' +
      "</header>" +
      '<p class="astuce">Touchez l\'étiquette d\'une action pour changer son statut.</p>';

    groupes.forEach(function (g) {
      var limite = L.ajouterJours(date, -g.joursAvant);
      html += '<section class="groupe">' +
        '<h2 class="groupe-titre"><span>' + esc(g.echeance) + '</span><span class="groupe-date">' + esc(dateCourte(limite)) + "</span></h2>" +
        '<ul class="actions">' + g.actions.map(function (a) { return ligneAction(a, e); }).join("") + "</ul></section>";
    });

    if (e.creneaux.length) {
      html += '<div class="pied">' +
        '<a class="bouton bouton--secondaire" href="#coups-de-main/' + e.id + '">Voir le tableau des coups de main</a>' +
        '<p class="discret">C\'est ce que voient les parents qui scannent le QR code de l\'affiche.</p></div>';
    }
    return { titre: e.titre, html: html };
  }

  function texteAvancement(e, nbRetard) {
    var t = L.compterFaites(e) + " faites sur " + e.actions.length;
    if (nbRetard) { t += ' · <span class="texte-retard">' + nbRetard + " en retard</span>"; }
    return t;
  }

  function pourcentage(e) {
    return Math.round(100 * L.compterFaites(e) / Math.max(1, e.actions.length));
  }

  function ligneAction(a, e) {
    var retard = L.estEnRetard(a, e);
    var suivant = L.statutSuivant(a.statut);
    return '<li class="action action--' + a.statut + (retard ? " action--retard" : "") + '" id="action-' + a.id + '">' +
      '<div class="action-texte"><p class="action-libelle">' + esc(a.libelle) + "</p>" +
      '<p class="action-meta">' + esc(a.referent) + ' · <span class="action-quand">' + esc(quandAction(a, e)) + "</span></p></div>" +
      '<button type="button" class="statut statut--' + a.statut + '" data-action="' + a.id + '" data-evenement="' + e.id + '"' +
      ' aria-label="' + esc(a.libelle) + " : " + esc(L.LIBELLES_STATUT[a.statut]) + ". Touchez pour passer à « " + esc(L.LIBELLES_STATUT[suivant]) + " »." + '">' +
      esc(L.LIBELLES_STATUT[a.statut]) + "</button></li>";
  }

  function changerStatut(bouton) {
    var e = L.trouverEvenement(etat, bouton.getAttribute("data-evenement"));
    var a = e && e.actions.filter(function (x) { return x.id === bouton.getAttribute("data-action"); })[0];
    if (!a) { return; }
    a.statut = L.statutSuivant(a.statut);
    sauver();
    var li = document.getElementById("action-" + a.id);
    li.outerHTML = ligneAction(a, e);
    var nouveau = document.querySelector('#action-' + a.id + ' .statut');
    nouveau.focus();
    var nbRetard = e.actions.filter(function (x) { return L.estEnRetard(x, e); }).length;
    document.getElementById("avancement").innerHTML = texteAvancement(e, nbRetard);
    document.getElementById("barre").style.width = pourcentage(e) + "%";
  }

  // ---------- Écran 3 : coups de main (vu par un parent) ----------

  function ecranCoupsDeMain(id) {
    var e = L.trouverEvenement(etat, id);
    if (!e) { return introuvable(); }
    var date = L.dateEvenement(e);

    var html = '<header class="affiche">' +
      '<span class="punaise" aria-hidden="true"></span>' +
      '<p class="surtitre">' + esc(etat.association.nom) + " · " + esc(etat.association.ecole) + "</p>" +
      '<h1 tabindex="-1">' + esc(e.titre) + "</h1>" +
      '<p class="affiche-date">' + esc(dateLongue(date)) + " · " + esc(e.lieu) + "</p>" +
      '<p class="affiche-texte">On cherche des parents pour tenir la journée. Choisissez un créneau : même une heure aide beaucoup. Pas besoin de compte.</p>' +
      "</header>" +
      '<ul class="creneaux">';

    e.creneaux.forEach(function (c) {
      var reste = L.placesRestantes(c);
      var complet = reste === 0;
      var ouvert = creneauOuvert === c.id && !complet;
      html += '<li class="creneau' + (complet ? " creneau--complet" : "") + (ouvert ? " creneau--ouvert" : "") + '" id="creneau-' + c.id + '">' +
        '<div class="creneau-haut">' +
        '<div class="creneau-infos"><p class="creneau-horaire">' + esc(c.horaire) + "</p>" +
        '<p class="creneau-titre">' + esc(c.titre) + "</p>" +
        '<p class="creneau-places">' + jauge(c) + '<span class="creneau-reste">' + esc(textePlaces(reste)) + "</span></p></div>" +
        (complet
          ? '<span class="tampon-complet">Complet</span>'
          : (ouvert ? "" : '<button type="button" class="bouton bouton--petit" data-ouvrir="' + c.id + '" aria-label="Je viens : ' + esc(c.titre) + ", " + esc(c.horaire) + '">Je viens</button>')) +
        "</div>" +
        (c.inscrits.length ? '<p class="creneau-noms">Avec ' + esc(c.inscrits.map(L.nomPublic).join(", ")) + "</p>" : '<p class="creneau-noms creneau-noms--vide">Personne pour l\'instant.</p>') +
        (ouvert ? formulaire(e, c) : "") +
        "</li>";
    });
    html += "</ul>" +
      '<p class="discret pied-affiche">Votre prénom et l\'initiale de votre nom apparaissent sur ce tableau. Votre téléphone ou votre e-mail reste visible du bureau seulement.</p>';
    return { titre: "Coups de main — " + e.titre, html: html };
  }

  function textePlaces(reste) {
    if (reste === 0) { return "Plus de place"; }
    if (reste === 1) { return "Dernière place"; }
    return "Encore " + reste + " places";
  }

  function jauge(c) {
    var s = '<span class="jauge" aria-hidden="true">';
    for (var i = 0; i < c.places; i++) { s += '<span class="' + (i < c.inscrits.length ? "pris" : "libre") + '"></span>'; }
    return s + "</span>";
  }

  function formulaire(e, c) {
    return '<form class="formulaire" data-evenement="' + e.id + '" data-creneau="' + c.id + '" novalidate>' +
      '<p class="formulaire-titre">Je m\'inscris : ' + esc(c.titre.charAt(0).toLowerCase() + c.titre.slice(1)) + ", " + esc(c.horaire) + "</p>" +
      champ("prenom", "Votre prénom", 'autocomplete="given-name" autocapitalize="words" maxlength="40"', "") +
      champ("initiale", "Première lettre de votre nom", 'autocomplete="off" autocapitalize="characters" maxlength="1" class="champ-court"', "Par exemple D pour Dupont.") +
      champ("contact", "Téléphone ou e-mail", 'autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false"', "Pour vous prévenir en cas de changement. Seul le bureau le voit.") +
      '<p class="erreur-generale" id="erreur-generale" role="alert"></p>' +
      '<button type="submit" class="bouton bouton--principal">Je m\'inscris</button>' +
      '<button type="button" class="lien-bouton" data-fermer>Finalement non</button>' +
      "</form>";
  }

  function champ(nom, libelle, attributs, aide) {
    var idAide = aide ? "aide-" + nom : "";
    return '<div class="champ">' +
      '<label for="champ-' + nom + '">' + esc(libelle) + "</label>" +
      (aide ? '<p class="champ-aide" id="' + idAide + '">' + esc(aide) + "</p>" : "") +
      '<input id="champ-' + nom + '" name="' + nom + '" type="text" ' + attributs +
      ' aria-describedby="' + (idAide ? idAide + " " : "") + "erreur-" + nom + '">' +
      '<p class="champ-erreur" id="erreur-' + nom + '"></p></div>';
  }

  function ouvrirFormulaire(id) {
    creneauOuvert = id;
    rendre({ garderDefilement: true });
    var li = document.getElementById("creneau-" + id);
    if (li) {
      var champPrenom = li.querySelector("input[name=prenom]");
      champPrenom.focus({ preventScroll: true });
      li.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  function envoyerFormulaire(form) {
    var saisie = {
      prenom: form.elements.prenom.value,
      initiale: form.elements.initiale.value,
      contact: form.elements.contact.value
    };
    var r = L.inscrire(etat, form.getAttribute("data-evenement"), form.getAttribute("data-creneau"), saisie);
    ["prenom", "initiale", "contact"].forEach(function (n) {
      var msg = (r.erreurs && r.erreurs[n]) || "";
      document.getElementById("erreur-" + n).textContent = msg;
      form.elements[n].setAttribute("aria-invalid", msg ? "true" : "false");
    });
    if (r.ok) {
      sauver();
      creneauOuvert = null;
      location.hash = "#merci/" + r.jeton;
      return;
    }
    if (r.raison === "complet") {
      document.getElementById("erreur-generale").textContent = "Ce créneau vient d'être complété. Choisissez-en un autre.";
      return;
    }
    var premier = form.querySelector('[aria-invalid="true"]');
    if (premier) { premier.focus(); }
  }

  function lienPersonnel(jeton) {
    return location.href.split("#")[0] + "#annuler/" + jeton;
  }

  function ecranMerci(jeton) {
    var t = L.trouverInscription(etat, jeton);
    if (!t) { return lienInconnu(); }
    var lien = lienPersonnel(jeton);
    var html = '<section class="confirmation">' +
      '<span class="tampon-ok" aria-hidden="true">Inscrit</span>' +
      '<h1 tabindex="-1">C\'est noté, ' + esc(t.volontaire.prenom) + ".</h1>" +
      '<p class="confirmation-quoi"><strong>' + esc(t.creneau.titre) + "</strong><br>" +
      esc(dateLongue(L.dateEvenement(t.evenement))) + " · " + esc(t.creneau.horaire) + "<br>" + esc(t.evenement.lieu) + "</p>" +
      '<p>Merci. Sur le tableau, les autres parents voient seulement « <strong>' + esc(L.nomPublic(t.volontaire)) + "</strong> ».</p>" +
      '<div class="lien-perso"><p class="lien-perso-titre">Votre lien pour annuler</p>' +
      '<p class="discret">Gardez-le : il sert à vous désinscrire si vous avez un empêchement. Il est à vous seul.</p>' +
      '<p class="lien-perso-adresse" id="lien-perso">' + esc(lien) + "</p>" +
      '<button type="button" class="bouton bouton--principal" data-copier>Copier le lien</button>' +
      '<p class="discret" id="copie-ok" role="status"></p></div>' +
      '<a class="lien-suite" href="#coups-de-main/' + t.evenement.id + '">Revenir au tableau</a>' +
      "</section>";
    return { titre: "Inscription confirmée", html: html };
  }

  function ecranAnnuler(jeton) {
    if (annulationFaite && annulationFaite.jeton === jeton) {
      var a = annulationFaite;
      return {
        titre: "Inscription annulée",
        html: '<section class="confirmation"><h1 tabindex="-1">C\'est annulé.</h1>' +
          "<p>Votre place au créneau <strong>" + esc(a.creneau) + "</strong> est libérée. Merci de nous avoir prévenus.</p>" +
          '<a class="bouton bouton--secondaire" href="#coups-de-main/' + a.evenementId + '">Choisir un autre créneau</a></section>'
      };
    }
    var t = L.trouverInscription(etat, jeton);
    if (!t) { return lienInconnu(); }
    var html = '<section class="confirmation">' +
      '<p class="surtitre">' + esc(etat.association.nom) + "</p>" +
      '<h1 tabindex="-1">Votre coup de main</h1>' +
      '<p class="confirmation-quoi"><strong>' + esc(t.creneau.titre) + "</strong><br>" +
      esc(dateLongue(L.dateEvenement(t.evenement))) + " · " + esc(t.creneau.horaire) + "<br>" + esc(t.evenement.titre) + "</p>" +
      "<p>Inscrit au nom de <strong>" + esc(L.nomPublic(t.volontaire)) + "</strong>.</p>" +
      "<p>Un empêchement ? Annulez ici : la place sera libérée pour un autre parent.</p>" +
      '<button type="button" class="bouton bouton--danger" data-annuler="' + esc(jeton) + '">Annuler mon inscription</button>' +
      '<a class="lien-suite" href="#coups-de-main/' + t.evenement.id + '">Garder mon inscription</a>' +
      "</section>";
    return { titre: "Mon coup de main", html: html };
  }

  function annulerInscription(jeton) {
    var t = L.trouverInscription(etat, jeton);
    if (!t) { return; }
    annulationFaite = { jeton: jeton, creneau: t.creneau.titre + ", " + t.creneau.horaire, evenementId: t.evenement.id };
    L.annuler(etat, jeton);
    sauver();
    rendre();
  }

  function lienInconnu() {
    return {
      titre: "Lien inconnu",
      html: '<section class="confirmation"><h1 tabindex="-1">Ce lien ne mène à aucune inscription.</h1>' +
        "<p>L'inscription a peut-être déjà été annulée. Le bureau peut vous aider si besoin.</p>" +
        '<a class="lien-suite" href="#coups-de-main/vide-grenier">Voir le tableau des coups de main</a></section>'
    };
  }

  // ---------- Écran 4 : bilan du soir ----------

  function trouverBilan(id) {
    return (etat.bilans || []).filter(function (b) { return b.id === id; })[0] || null;
  }

  function ecranBilan(id) {
    var b = trouverBilan(id);
    if (!b) { return introuvable(); }
    var date = L.dateEvenement(b);
    var texte = L.texteBilan(etat.association, b);
    var html = '<a class="retour" href="#accueil">Accueil</a>' +
      '<header class="entete"><p class="surtitre">Bilan du soir</p>' +
      '<h1 tabindex="-1">' + esc(b.titre) + "</h1>" +
      '<p class="sous-titre">' + esc(majuscule(fmtLongAnnee.format(date))) + " · " + esc(b.lieu) + "</p></header>" +
      '<figure class="affichette" aria-label="Image de remerciement à partager">' +
      '<span class="scotch" aria-hidden="true"></span>' +
      '<p class="affichette-asso">' + esc(etat.association.nom) + "</p>" +
      '<p class="affichette-merci">Merci à vous.</p>' +
      '<p class="chiffre-vedette"><span class="nombre">' + b.benevoles + '</span> parents ont donné un coup de main</p>' +
      '<ul class="chiffres">' +
      '<li><span class="nombre">' + b.heures + "</span> heures données</li>" +
      '<li><span class="nombre">' + esc(L.formaterEuros(b.recetteBuvette)) + "</span> à la buvette</li>" +
      '<li><span class="nombre">' + b.exposants + "</span> " + esc(b.exposantsLibelle) + "</li>" +
      "</ul>" +
      '<p class="affichette-pied">' + esc(b.ceQueCaFinance) + "</p>" +
      "</figure>" +
      '<a class="bouton bouton--principal" id="whatsapp" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(texte) + '">Partager sur WhatsApp</a>' +
      '<button type="button" class="bouton bouton--secondaire" data-image="' + b.id + '">Enregistrer l\'image</button>' +
      '<p class="discret">WhatsApp reçoit le message en texte. Pour envoyer l\'affichette, enregistrez l\'image puis joignez-la.</p>';
    return { titre: "Bilan — " + b.titre, html: html };
  }

  // Dessine l'affichette dans une image PNG (1080 × 1350, format WhatsApp/Instagram).
  function enregistrerImage(id) {
    var b = trouverBilan(id);
    if (!b) { return; }
    var pret = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    pret.then(function () {
      var W = 1080, H = 1350, M = 96;
      var c = document.createElement("canvas");
      c.width = W; c.height = H;
      var g = c.getContext("2d");
      var encre = "#1E2F5C", texte = "#1F1D1A", crayon = "#5E5A52", jaune = "#F4D35E";
      g.fillStyle = "#FBF8F1"; g.fillRect(0, 0, W, H);
      g.fillStyle = jaune; g.fillRect(0, 0, W, 24);
      g.textBaseline = "alphabetic";

      g.fillStyle = crayon; g.font = "700 34px 'Atkinson Hyperlegible'";
      g.fillText(etat.association.nom.toUpperCase(), M, 150);
      g.fillStyle = encre; g.font = "112px 'Young Serif'";
      g.fillText("Merci à vous.", M, 290);
      g.fillStyle = crayon; g.font = "38px 'Atkinson Hyperlegible'";
      g.fillText(b.titre + " · " + fmtLongAnnee.format(L.dateEvenement(b)).replace(/^\w+ /, ""), M, 360);

      g.font = "200px 'Young Serif'";
      var lv = g.measureText(String(b.benevoles)).width;
      g.fillStyle = jaune; g.fillRect(M - 12, 480, lv + 24, 110);
      g.fillStyle = encre;
      g.fillText(String(b.benevoles), M, 590);
      g.fillStyle = texte; g.font = "700 44px 'Atkinson Hyperlegible'";
      g.fillText("parents ont donné", M + lv + 40, 520);
      g.fillText("un coup de main", M + lv + 40, 576);

      var lignes = [
        [String(b.heures), "heures données"],
        [L.formaterEuros(b.recetteBuvette), "à la buvette"],
        [String(b.exposants), b.exposantsLibelle]
      ];
      var y = 770;
      lignes.forEach(function (l) {
        g.strokeStyle = "#D9CFBB"; g.lineWidth = 2;
        g.beginPath(); g.moveTo(M, y - 80); g.lineTo(W - M, y - 80); g.stroke();
        g.fillStyle = encre; g.font = "84px 'Young Serif'";
        g.fillText(l[0], M, y + 10);
        var largeur = g.measureText(l[0]).width;
        g.fillStyle = texte; g.font = "40px 'Atkinson Hyperlegible'";
        g.fillText(l[1], M + largeur + 28, y);
        y += 140;
      });

      g.fillStyle = texte; g.font = "italic 40px 'Atkinson Hyperlegible'";
      ecrireLignes(g, b.ceQueCaFinance, M, 1190, W - 2 * M, 54);

      var a = document.createElement("a");
      a.download = "merci-" + b.id + ".png";
      a.href = c.toDataURL("image/png");
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  function ecrireLignes(g, texte, x, y, largeurMax, interligne) {
    var mots = texte.split(" "), ligne = "";
    mots.forEach(function (m) {
      var essai = ligne ? ligne + " " + m : m;
      if (g.measureText(essai).width > largeurMax && ligne) {
        g.fillText(ligne, x, y); y += interligne; ligne = m;
      } else { ligne = essai; }
    });
    if (ligne) { g.fillText(ligne, x, y); }
  }

  // ---------- Commun ----------

  function introuvable() {
    return {
      titre: "Page introuvable",
      html: '<section class="confirmation"><h1 tabindex="-1">Cette page n\'existe pas.</h1>' +
        '<a class="lien-suite" href="#accueil">Revenir à l\'accueil</a></section>'
    };
  }

  function rendre(options) {
    var morceaux = (location.hash.replace(/^#/, "") || "accueil").split("/");
    var ecran = morceaux[0], param = decodeURIComponent(morceaux[1] || "");
    var r;
    switch (ecran) {
      case "evenement": r = ecranEvenement(param); break;
      case "coups-de-main": r = ecranCoupsDeMain(param); break;
      case "merci": r = ecranMerci(param); break;
      case "annuler": r = ecranAnnuler(param); break;
      case "bilan": r = ecranBilan(param); break;
      default: ecran = "accueil"; r = ecranAccueil();
    }
    var vue = document.getElementById("vue");
    vue.className = "vue vue--" + ecran;
    vue.innerHTML = r.html;
    document.title = r.titre + " — prototype";
    marquerMenu(ecran);
    if (!(options && options.garderDefilement)) {
      window.scrollTo(0, 0);
      var h1 = vue.querySelector("h1");
      if (h1 && options && options.focus) { h1.focus({ preventScroll: true }); }
    }
  }

  function marquerMenu(ecran) {
    var correspondance = { merci: "coups-de-main", annuler: "coups-de-main" };
    var actif = correspondance[ecran] || ecran;
    Array.prototype.forEach.call(document.querySelectorAll("[data-ecran]"), function (a) {
      if (a.getAttribute("data-ecran") === actif) { a.setAttribute("aria-current", "page"); }
      else { a.removeAttribute("aria-current"); }
    });
  }

  function copierLien() {
    var texte = document.getElementById("lien-perso").textContent;
    var ok = document.getElementById("copie-ok");
    function repli() {
      var zone = document.createElement("textarea");
      zone.value = texte; zone.setAttribute("readonly", "");
      zone.style.position = "fixed"; zone.style.opacity = "0";
      document.body.appendChild(zone); zone.select();
      var reussi = false;
      try { reussi = document.execCommand("copy"); } catch (err) { reussi = false; }
      zone.remove();
      ok.textContent = reussi ? "Lien copié." : "Copie impossible ici : faites une capture d'écran de cette page.";
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texte).then(function () { ok.textContent = "Lien copié."; }, repli);
    } else { repli(); }
  }

  // ---------- Gestes ----------

  document.addEventListener("click", function (ev) {
    var cible = ev.target.closest("button, a");
    if (!cible) { return; }
    if (cible.classList.contains("statut")) { changerStatut(cible); return; }
    if (cible.hasAttribute("data-ouvrir")) { ouvrirFormulaire(cible.getAttribute("data-ouvrir")); return; }
    if (cible.hasAttribute("data-fermer")) { creneauOuvert = null; rendre({ garderDefilement: true }); return; }
    if (cible.hasAttribute("data-copier")) { copierLien(); return; }
    if (cible.hasAttribute("data-annuler")) { annulerInscription(cible.getAttribute("data-annuler")); return; }
    if (cible.hasAttribute("data-image")) { enregistrerImage(cible.getAttribute("data-image")); return; }
    if (cible.id === "demo-ouvrir") { basculerMenu(); return; }
    if (cible.id === "demo-reinit") {
      if (window.confirm("Remettre la démo comme au départ ? Ce qui a été saisi sera effacé.")) {
        reinitialiser();
        basculerMenu(false);
        if (location.hash === "#accueil") { rendre(); } else { location.hash = "#accueil"; }
      }
      return;
    }
    if (cible.closest("#demo-menu") && cible.tagName === "A") { basculerMenu(false); }
  });

  document.addEventListener("submit", function (ev) {
    if (ev.target.classList.contains("formulaire")) {
      ev.preventDefault();
      envoyerFormulaire(ev.target);
    }
  });

  function basculerMenu(forcer) {
    var bouton = document.getElementById("demo-ouvrir");
    var menu = document.getElementById("demo-menu");
    var ouvrir = typeof forcer === "boolean" ? forcer : menu.hidden;
    menu.hidden = !ouvrir;
    bouton.setAttribute("aria-expanded", String(ouvrir));
  }

  window.addEventListener("hashchange", function () {
    creneauOuvert = null;
    rendre({ focus: true });
  });

  rendre();
})();
