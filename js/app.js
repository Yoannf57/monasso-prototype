/*
  Affichage du prototype. Deux espaces bien séparés :
  - espace bureau : barre fixe en bas (Aujourd'hui, Événements, Réunions, L'asso) ;
  - espace parent : arrivée par le lien ou le QR code, aucune navigation.
  Ce qu'un testeur saisit est gardé dans le navigateur (localStorage).
*/
(function () {
  "use strict";

  var L = window.Logique;
  var CLE = "monasso-prototype";
  var etat = charger();
  var creneauOuvert = null;   // créneau dont le formulaire est déplié (espace parent)
  var annulationFaite = null; // dernière inscription annulée
  var qrVisible = false;      // encart QR code (espace bureau)

  // ---------- Mémoire du navigateur ----------

  function cloner(o) { return JSON.parse(JSON.stringify(o)); }

  function etatInitial() {
    var e = cloner(DONNEES);
    e.utilisateur = DONNEES.utilisateurParDefaut;
    return e;
  }

  function charger() {
    try {
      var texte = window.localStorage.getItem(CLE);
      if (texte) {
        var e = JSON.parse(texte);
        if (e && e.version === DONNEES.version) { return e; }
      }
    } catch (err) { /* navigation privée : on repart des données d'origine */ }
    return etatInitial();
  }

  function sauver() {
    try { window.localStorage.setItem(CLE, JSON.stringify(etat)); } catch (err) { /* la démo marche quand même */ }
  }

  function reinitialiser() {
    try { window.localStorage.removeItem(CLE); } catch (err) { /* rien */ }
    etat = etatInitial();
    creneauOuvert = null;
    annulationFaite = null;
    qrVisible = false;
  }

  function membre(prenom) {
    return etat.bureau.filter(function (m) { return m.prenom === prenom; })[0] || etat.bureau[0];
  }

  // ---------- Outils de texte ----------

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function majuscule(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function minuscule(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  var fmtLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  var fmtLongAnnee = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  var fmtCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  var fmtMois = new Intl.DateTimeFormat("fr-FR", { month: "short" });

  function dateLongue(d) { return majuscule(fmtLong.format(d)); }
  function dateCourte(d) { return fmtCourt.format(d); }

  function quandEvenement(e) {
    var j = L.joursJusqua(L.dateEvenement(e));
    if (j < 0) { return majuscule(fmtLongAnnee.format(L.dateEvenement(e))); }
    if (j === 0) { return "Aujourd'hui"; }
    if (j === 1) { return "Demain"; }
    if (j < 14) { return "Dans " + j + " jours"; }
    if (j < 60) { return "Dans " + Math.round(j / 7) + " semaines"; }
    return "Dans " + Math.round(j / 30) + " mois";
  }

  function quandAction(action, evenement) {
    var j = L.joursJusqua(L.dateLimite(action, evenement));
    if (action.statut === "fait") { return "faite"; }
    if (j < -1) { return "en retard de " + (-j) + " jours"; }
    if (j === -1) { return "en retard depuis hier"; }
    if (j === 0) { return "pour aujourd'hui"; }
    if (j === 1) { return "pour demain"; }
    return "pour le " + dateCourte(L.dateLimite(action, evenement)).replace(/\.$/, "");
  }

  function pluriel(n, un, plusieurs) { return n + " " + (n > 1 ? plusieurs : un); }

  function pastilleDate(d) {
    return '<span class="pastille" aria-hidden="true"><span class="pastille-jour">' + d.getDate() +
      '</span><span class="pastille-mois">' + esc(fmtMois.format(d).replace(".", "")) + "</span></span>";
  }

  function lienParent(evenementId) {
    return location.href.split("#")[0] + "#inscription/" + evenementId;
  }

  function lienPersonnel(jeton) {
    return location.href.split("#")[0] + "#annuler/" + jeton;
  }

  // ---------- Ligne d'action (réutilisée par Aujourd'hui et la fiche événement) ----------

  function ligneAction(a, e, contexte) {
    var retard = L.estEnRetard(a, e);
    var suivant = L.statutSuivant(a.statut);
    var meta = [];
    if (contexte === "aujourdhui" || contexte === "aujourdhui-miennes") { meta.push(esc(e.titre)); }
    if (contexte !== "aujourdhui-miennes") { meta.push(esc(a.referent)); }
    meta.push('<span class="action-quand">' + esc(quandAction(a, e)) + "</span>");
    return '<li class="action action--' + a.statut + (retard ? " action--retard" : "") + '" id="action-' + a.id + '" data-contexte="' + contexte + '">' +
      '<div class="action-texte"><p class="action-libelle">' + esc(a.libelle) + "</p>" +
      '<p class="action-meta">' + meta.join(" · ") + "</p></div>" +
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
    // On remplace la ligne sur place : elle reste visible jusqu'au prochain écran.
    var li = document.getElementById("action-" + a.id);
    li.outerHTML = ligneAction(a, e, li.getAttribute("data-contexte"));
    document.querySelector("#action-" + a.id + " .statut").focus();
    var av = document.getElementById("avancement");
    if (av) {
      av.innerHTML = texteAvancement(e);
      document.getElementById("barre").style.width = pourcentage(e) + "%";
    }
  }

  // ---------- Espace bureau : Aujourd'hui ----------

  function ecranAujourdhui(toutes) {
    var moi = membre(etat.utilisateur);
    var s = L.actionsASurveiller(etat, toutes ? null : moi.prenom);
    var contexte = toutes ? "aujourdhui" : "aujourdhui-miennes";
    var html = '<header class="entete">' +
      '<p class="surtitre">' + esc(etat.association.nom) + "</p>" +
      '<h1 tabindex="-1">Aujourd\'hui</h1>' +
      '<p class="sous-titre">' + esc(dateLongue(L.aujourdhui())) + " · " + esc(moi.prenom) + ", " + esc(minuscule(moi.role)) + "</p>" +
      "</header>" +
      '<div class="bascule" role="group" aria-label="Quelles actions afficher">' +
      '<a href="#aujourdhui"' + (toutes ? "" : ' aria-current="true"') + ">Mes actions</a>" +
      '<a href="#aujourdhui/toutes"' + (toutes ? ' aria-current="true"' : "") + ">Toutes les actions</a>" +
      "</div>";

    html += '<section class="bloc"><h2 class="rubrique rubrique--retard">En retard <span class="compte">' + s.enRetard.length + "</span></h2>";
    html += s.enRetard.length
      ? '<ul class="actions">' + s.enRetard.map(function (x) { return ligneAction(x.action, x.evenement, contexte); }).join("") + "</ul>"
      : '<p class="calme">Rien en retard.</p>';
    html += "</section>";

    html += '<section class="bloc"><h2 class="rubrique">Cette semaine <span class="compte">' + s.cetteSemaine.length + "</span></h2>";
    html += s.cetteSemaine.length
      ? '<ul class="actions">' + s.cetteSemaine.map(function (x) { return ligneAction(x.action, x.evenement, contexte); }).join("") + "</ul>"
      : '<p class="calme">Rien de prévu dans les 7 jours.</p>';
    html += "</section>";

    var manque = L.creneauxEnManque(etat);
    if (manque.length) {
      html += '<section class="bloc"><h2 class="rubrique">Il manque du monde</h2><ul class="liens-liste">';
      manque.slice(0, 3).forEach(function (m) {
        html += '<li><a href="#evenement/' + m.evenement.id + '/coups-de-main">' +
          '<span class="liens-liste-titre">' + esc(m.creneau.titre) + ", " + esc(m.creneau.horaire) + "</span>" +
          '<span class="liens-liste-meta">' + esc(m.evenement.titre) + " · " + m.creneau.inscrits.length + " sur " + m.creneau.places + "</span></a></li>";
      });
      html += "</ul>";
      if (manque.length > 3) {
        html += '<a class="lien-suite" href="#evenement/' + manque[0].evenement.id + '/coups-de-main">Voir tous les créneaux</a>';
      }
      html += "</section>";
    }

    var prochain = L.evenementsAVenir(etat)[0];
    if (prochain) {
      html += '<section class="bloc"><h2 class="rubrique">Prochain événement</h2>' + carteEvenement(prochain, true) + "</section>";
    }
    return { titre: "Aujourd'hui", onglet: "aujourdhui", html: html };
  }

  // Carte d'un événement avec accès direct à ses onglets.
  function carteEvenement(e, grande) {
    var passe = L.estPasse(e);
    var retards = e.actions.filter(function (a) { return L.estEnRetard(a, e); }).length;
    var infos = [];
    if (!passe) {
      infos.push(L.compterFaites(e) + " sur " + pluriel(e.actions.length, "action faite", "actions faites"));
      if (retards) { infos.push('<span class="texte-retard">' + retards + " en retard</span>"); }
      if (e.creneaux.length) { infos.push(L.compterInscrits(e) + " sur " + L.compterPlaces(e) + " coups de main"); }
    } else if (e.bilan) {
      infos.push(e.bilan.benevoles + " parents ont aidé");
    }
    var raccourcis = passe
      ? (e.bilan ? [["bilan", "Bilan"]] : [["actions", "Actions"]])
      : [["actions", "Actions"]].concat(e.creneaux.length ? [["coups-de-main", "Coups de main"]] : []);
    return '<article class="carte' + (grande ? " carte--grande" : "") + '">' +
      '<a class="carte-tete" href="#evenement/' + e.id + '">' + pastilleDate(L.dateEvenement(e)) +
      '<span class="carte-titres"><span class="carte-titre">' + esc(e.titre) + "</span>" +
      '<span class="carte-quand">' + esc(quandEvenement(e)) + " · " + esc(e.lieu) + "</span></span></a>" +
      (infos.length ? '<p class="carte-infos">' + infos.join(" · ") + "</p>" : "") +
      '<p class="raccourcis">' + raccourcis.map(function (r) {
        return '<a href="#evenement/' + e.id + "/" + r[0] + '">' + r[1] + "</a>";
      }).join("") + "</p></article>";
  }

  // ---------- Espace bureau : Événements ----------

  function ecranEvenements() {
    var avenir = L.evenementsAVenir(etat);
    var passes = L.evenementsPasses(etat);
    var html = '<header class="entete"><p class="surtitre">' + esc(etat.association.nom) + "</p>" +
      '<h1 tabindex="-1">Événements</h1>' +
      '<p class="sous-titre">' + avenir.length + " à venir · " + pluriel(passes.length, "passé", "passés") + "</p></header>";
    html += '<section class="bloc"><h2 class="rubrique">À venir</h2>' + avenir.map(function (e) { return carteEvenement(e); }).join("") + "</section>";
    if (passes.length) {
      html += '<section class="bloc"><h2 class="rubrique">Passés</h2>' + passes.map(function (e) { return carteEvenement(e); }).join("") + "</section>";
    }
    return { titre: "Événements", onglet: "evenements", html: html };
  }

  // ---------- Espace bureau : un événement (3 onglets) ----------

  function ecranEvenement(id, onglet) {
    var e = L.trouverEvenement(etat, id);
    if (!e) { return introuvable(); }
    var passe = L.estPasse(e);
    if (["actions", "coups-de-main", "bilan"].indexOf(onglet) < 0) {
      onglet = passe && e.bilan ? "bilan" : "actions";
    }
    var date = L.dateEvenement(e);
    var html = '<a class="retour" href="#evenements">Événements</a>' +
      '<header class="entete entete--serre">' +
      '<p class="surtitre">' + esc(dateLongue(date)) + (passe ? " " + date.getFullYear() : "") + " · " + esc(e.lieu) + "</p>" +
      '<h1 tabindex="-1">' + esc(e.titre) + "</h1></header>" +
      '<nav class="sous-onglets" aria-label="Rubriques de l\'événement">' +
      sousOnglet(e, "actions", "Actions", onglet) +
      sousOnglet(e, "coups-de-main", "Coups de main", onglet) +
      sousOnglet(e, "bilan", "Bilan", onglet) +
      "</nav>";
    var r;
    if (onglet === "coups-de-main") { r = ongletCoupsDeMain(e); }
    else if (onglet === "bilan") { r = ongletBilan(e); }
    else { r = ongletActions(e); }
    var noms = { actions: "Actions", "coups-de-main": "Coups de main", bilan: "Bilan" };
    return { titre: noms[onglet] + " — " + e.titre, onglet: "evenements", html: html + r };
  }

  function sousOnglet(e, cle, libelle, actif) {
    return '<a href="#evenement/' + e.id + "/" + cle + '"' + (cle === actif ? ' aria-current="page"' : "") + ">" + libelle + "</a>";
  }

  function texteAvancement(e) {
    var nbRetard = e.actions.filter(function (a) { return L.estEnRetard(a, e); }).length;
    var t = L.compterFaites(e) + " faites sur " + e.actions.length;
    if (nbRetard) { t += ' · <span class="texte-retard">' + nbRetard + " en retard</span>"; }
    return t;
  }

  function pourcentage(e) {
    return Math.round(100 * L.compterFaites(e) / Math.max(1, e.actions.length));
  }

  function ongletActions(e) {
    if (!e.actions.length) { return '<p class="calme">Aucune action pour cet événement.</p>'; }
    var html = '<p class="avancement" id="avancement">' + texteAvancement(e) + "</p>" +
      '<div class="barre" aria-hidden="true"><span id="barre" style="width:' + pourcentage(e) + '%"></span></div>' +
      '<p class="astuce">Touchez l\'étiquette d\'une action pour changer son statut.</p>';
    var date = L.dateEvenement(e);
    L.grouperParEcheance(e).forEach(function (g) {
      var limite = L.ajouterJours(date, -g.joursAvant);
      html += '<section class="groupe">' +
        '<h2 class="groupe-titre"><span>' + esc(g.echeance) + '</span><span class="groupe-date">' + esc(dateCourte(limite)) + "</span></h2>" +
        '<ul class="actions">' + g.actions.map(function (a) { return ligneAction(a, e, "evenement"); }).join("") + "</ul></section>";
    });
    return html;
  }

  function ongletCoupsDeMain(e) {
    if (!e.creneaux.length) {
      return '<p class="calme">Pas de tableau de coups de main pour cet événement.</p>';
    }
    var lien = lienParent(e.id);
    var texteWhatsapp = "Bonjour, on cherche des parents pour le " + minuscule(e.titre) + " (" + fmtLong.format(L.dateEvenement(e)) +
      "). Même une heure aide beaucoup, sans créer de compte : " + lien;
    var inscrits = L.compterInscrits(e), places = L.compterPlaces(e);
    var html = '<section class="partage" aria-labelledby="titre-partage">' +
      '<h2 class="partage-titre" id="titre-partage">Lien à envoyer aux parents</h2>' +
      '<p class="discret">Les parents choisissent un créneau avec ce lien, sans créer de compte.</p>' +
      '<p class="lien-adresse" id="lien-parent">' + esc(lien) + "</p>" +
      '<button type="button" class="bouton bouton--principal" data-copier="lien-parent">Copier le lien</button>' +
      '<p class="discret copie-ok" id="copie-lien-parent" role="status"></p>' +
      '<div class="boutons-ligne">' +
      '<a class="bouton bouton--secondaire" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(texteWhatsapp) + '">WhatsApp</a>' +
      '<button type="button" class="bouton bouton--secondaire" data-qr aria-expanded="' + qrVisible + '" aria-controls="qr">QR code</button>' +
      "</div>" +
      '<div class="qr" id="qr"' + (qrVisible ? "" : " hidden") + '>' +
      '<div class="qr-image" aria-hidden="true"></div>' +
      "<p>Dans la vraie application, ce QR code s'imprime sur l'affiche et dans le cahier de liaison. Le prototype ne le fabrique pas.</p></div>" +
      '<a class="lien-suite" href="#inscription/' + e.id + '">Voir comme un parent</a>' +
      "</section>";

    html += '<h2 class="rubrique">Qui vient <span class="compte">' + inscrits + " sur " + places + "</span></h2>" +
      '<ul class="equipe">';
    e.creneaux.forEach(function (c) {
      var reste = L.placesRestantes(c);
      var etiquette = reste === 0
        ? '<span class="etiquette etiquette--ok">Complet</span>'
        : '<span class="etiquette' + (c.inscrits.length < c.places / 2 ? " etiquette--manque" : "") + '">' + (reste === 1 ? "Manque 1" : "Manquent " + reste) + "</span>";
      html += '<li class="equipe-creneau" id="equipe-' + c.id + '">' +
        '<div class="equipe-tete"><div><p class="equipe-titre">' + esc(c.titre) + "</p>" +
        '<p class="equipe-horaire">' + esc(c.horaire) + " · " + c.inscrits.length + " sur " + c.places + "</p></div>" + etiquette + "</div>" +
        (c.inscrits.length
          ? '<ul class="equipe-noms">' + c.inscrits.map(function (v) {
            var ct = L.analyserContact(v.contact);
            var href = ct ? (ct.type === "email" ? "mailto:" + ct.valeur : "tel:" + ct.valeur.replace(/[\s.\-()]/g, "")) : "";
            return "<li><span>" + esc(L.nomPublic(v)) + "</span>" +
              (href ? '<a href="' + esc(href) + '">' + esc(v.contact) + "</a>" : "") + "</li>";
          }).join("") + "</ul>"
          : '<p class="calme">Personne pour l\'instant.</p>') +
        "</li>";
    });
    html += "</ul>" +
      '<p class="discret">Les coordonnées ne sont visibles que du bureau. Les parents ne voient que les prénoms et initiales.</p>';
    return html;
  }

  function ongletBilan(e) {
    if (!e.bilan) {
      var exemple = etat.evenements.filter(function (x) { return x.bilan; })[0];
      return '<div class="vide"><p><strong>Le bilan se remplit le soir de l\'événement.</strong></p>' +
        "<p>Quelques chiffres (parents venus, heures données, recette de la buvette, exposants) deviennent une image de remerciement à partager.</p>" +
        (exemple ? '<a class="lien-suite" href="#evenement/' + exemple.id + '/bilan">Voir le bilan de la ' + esc(minuscule(exemple.titre)) + "</a>" : "") +
        "</div>";
    }
    var b = e.bilan;
    var texte = L.texteBilan(etat.association, e);
    return '<figure class="affichette" aria-label="Image de remerciement à partager">' +
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
      '<button type="button" class="bouton bouton--secondaire" data-image="' + e.id + '">Enregistrer l\'image</button>' +
      '<p class="discret note-bas">WhatsApp reçoit le message en texte. Pour envoyer l\'affichette, enregistrez l\'image puis joignez-la.</p>';
  }

  // Dessine l'affichette dans une image PNG (1080 × 1350).
  function enregistrerImage(id) {
    var e = L.trouverEvenement(etat, id);
    if (!e || !e.bilan) { return; }
    var b = e.bilan;
    var pret = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    pret.then(function () {
      var W = 1080, H = 1350, M = 96;
      var c = document.createElement("canvas");
      c.width = W; c.height = H;
      var g = c.getContext("2d");
      var encre = "#1E2F5C", texte = "#1F1D1A", crayon = "#5E5A52", jaune = "#F4D35E";
      g.fillStyle = "#FBF8F1"; g.fillRect(0, 0, W, H);
      g.fillStyle = jaune; g.fillRect(0, 0, W, 24);

      g.fillStyle = crayon; g.font = "600 34px Lexend";
      g.fillText(etat.association.nom.toUpperCase(), M, 150);
      g.fillStyle = encre; g.font = "112px 'Young Serif'";
      g.fillText("Merci à vous.", M, 290);
      g.fillStyle = crayon; g.font = "38px Lexend";
      g.fillText(e.titre + " · " + fmtLongAnnee.format(L.dateEvenement(e)).replace(/^\S+ /, ""), M, 360);

      g.font = "200px 'Young Serif'";
      var lv = g.measureText(String(b.benevoles)).width;
      g.fillStyle = jaune; g.fillRect(M - 12, 480, lv + 24, 110);
      g.fillStyle = encre;
      g.fillText(String(b.benevoles), M, 590);
      g.fillStyle = texte; g.font = "600 44px Lexend";
      g.fillText("parents ont donné", M + lv + 40, 520);
      g.fillText("un coup de main", M + lv + 40, 576);

      var y = 770;
      [[String(b.heures), "heures données"], [L.formaterEuros(b.recetteBuvette), "à la buvette"], [String(b.exposants), b.exposantsLibelle]]
        .forEach(function (l) {
          g.strokeStyle = "#D9CFBB"; g.lineWidth = 2;
          g.beginPath(); g.moveTo(M, y - 80); g.lineTo(W - M, y - 80); g.stroke();
          g.fillStyle = encre; g.font = "84px 'Young Serif'";
          g.fillText(l[0], M, y + 10);
          var largeur = g.measureText(l[0]).width;
          g.fillStyle = texte; g.font = "40px Lexend";
          g.fillText(l[1], M + largeur + 28, y);
          y += 140;
        });

      g.fillStyle = texte; g.font = "38px Lexend";
      ecrireLignes(g, b.ceQueCaFinance, M, 1190, W - 2 * M, 54);
      telecharger("merci-" + e.id + ".png", c.toDataURL("image/png"));
    });
  }

  function ecrireLignes(g, texte, x, y, largeurMax, interligne) {
    var ligne = "";
    texte.split(" ").forEach(function (m) {
      var essai = ligne ? ligne + " " + m : m;
      if (g.measureText(essai).width > largeurMax && ligne) { g.fillText(ligne, x, y); y += interligne; ligne = m; }
      else { ligne = essai; }
    });
    if (ligne) { g.fillText(ligne, x, y); }
  }

  function telecharger(nom, href) {
    var a = document.createElement("a");
    a.download = nom;
    a.href = href;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ---------- Espace bureau : Réunions et L'asso ----------

  function ecranReunions() {
    return {
      titre: "Réunions", onglet: "reunions",
      html: '<header class="entete"><p class="surtitre">' + esc(etat.association.nom) + "</p>" +
        '<h1 tabindex="-1">Réunions <span class="badge-bientot">Bientôt</span></h1></header>' +
        '<div class="vide"><p><strong>Cet espace arrive plus tard.</strong></p>' +
        '<ul class="liste-puces"><li>Trouver une date de réunion avec un sondage</li>' +
        "<li>Rédiger le compte rendu pas à pas, avec les actions décidées</li>" +
        "<li>Préparer l'assemblée générale</li></ul></div>"
    };
  }

  function ecranAsso() {
    var a = etat.association;
    var html = '<header class="entete"><p class="surtitre">Fiche de l\'association</p>' +
      '<h1 tabindex="-1">' + esc(a.nom) + "</h1>" +
      '<p class="sous-titre">' + esc(a.ecole) + " · " + esc(a.ville) + "</p></header>" +
      '<section class="bloc"><h2 class="rubrique">Le bureau <span class="compte">' + etat.bureau.length + "</span></h2>" +
      '<ul class="membres">' + etat.bureau.map(function (m) {
        var moi = m.prenom === etat.utilisateur;
        return "<li><span class=\"membre-nom\">" + esc(m.prenom) + (moi ? ' <span class="discret">(vous)</span>' : "") + "</span>" +
          '<span class="membre-role">' + esc(m.role) + "</span></li>";
      }).join("") + "</ul></section>" +
      '<section class="bloc"><h2 class="rubrique">Démonstration</h2>' +
      '<p class="discret">Efface ce qui a été saisi pendant les essais et remet les données d\'origine.</p>' +
      '<button type="button" class="bouton bouton--secondaire" data-reinitialiser>Réinitialiser la démo</button></section>';
    return { titre: "L'asso", onglet: "asso", html: html };
  }

  // ---------- Espace parent : tableau des coups de main ----------

  function ecranInscription(id) {
    var e = L.trouverEvenement(etat, id);
    if (!e || !e.creneaux.length || L.estPasse(e)) { return lienInconnu(); }
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
    return { titre: "Coups de main — " + e.titre, parent: true, html: html };
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
      '<p class="formulaire-titre">Je m\'inscris : ' + esc(minuscule(c.titre)) + ", " + esc(c.horaire) + "</p>" +
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
      li.querySelector("input[name=prenom]").focus({ preventScroll: true });
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

  // ---------- Espace parent : confirmation et annulation ----------

  function ecranMerci(jeton) {
    var t = L.trouverInscription(etat, jeton);
    if (!t) { return lienInconnu(); }
    var lien = lienPersonnel(jeton);
    var contact = L.analyserContact(t.volontaire.contact);
    var parSms = contact && contact.type === "tel";
    var corps = "Mon coup de main pour le " + minuscule(t.evenement.titre) + " : " + minuscule(t.creneau.titre) + ", " +
      fmtLong.format(L.dateEvenement(t.evenement)) + ", " + t.creneau.horaire + ". Pour annuler : " + lien;
    var envoi = L.lienEnvoi(t.volontaire.contact, "Mon coup de main — " + t.evenement.titre, corps);
    var html = '<section class="confirmation">' +
      '<span class="tampon-ok" aria-hidden="true">Inscrit</span>' +
      '<h1 tabindex="-1">C\'est noté, ' + esc(t.volontaire.prenom) + ".</h1>" +
      '<p class="confirmation-quoi"><strong>' + esc(t.creneau.titre) + "</strong><br>" +
      esc(dateLongue(L.dateEvenement(t.evenement))) + " · " + esc(t.creneau.horaire) + "<br>" + esc(t.evenement.lieu) + "</p>" +
      '<p>Merci. Sur le tableau, les autres parents voient seulement « <strong>' + esc(L.nomPublic(t.volontaire)) + "</strong> ».</p>" +
      '<div class="lien-perso"><p class="lien-perso-titre">Gardez votre lien pour annuler</p>' +
      '<p class="discret">Il sert à vous désinscrire si vous avez un empêchement. Il est à vous seul.</p>' +
      (envoi ? '<a class="bouton bouton--principal" id="envoyer-lien" href="' + esc(envoi) + '">' + (parSms ? "Me l'envoyer par SMS" : "Me l'envoyer par e-mail") + "</a>" : "") +
      '<button type="button" class="bouton bouton--secondaire" data-agenda="' + esc(jeton) + '">Ajouter à mon agenda</button>' +
      '<p class="discret note-bas">L\'agenda vous le rappelle la veille, avec le lien pour annuler.</p>' +
      '<details class="lien-details"><summary>Voir ou copier le lien</summary>' +
      '<p class="lien-adresse" id="lien-perso">' + esc(lien) + "</p>" +
      '<button type="button" class="lien-bouton" data-copier="lien-perso">Copier le lien</button>' +
      '<p class="discret copie-ok" id="copie-lien-perso" role="status"></p></details>' +
      "</div>" +
      '<a class="lien-suite" href="#inscription/' + t.evenement.id + '">Revenir au tableau</a>' +
      "</section>";
    return { titre: "Inscription confirmée", parent: true, html: html };
  }

  function ajouterAgenda(jeton) {
    var t = L.trouverInscription(etat, jeton);
    if (!t) { return; }
    var ics = L.fichierAgenda(etat.association, t.evenement, t.creneau, lienPersonnel(jeton), null, jeton);
    var url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    telecharger("coup-de-main-" + t.evenement.id + ".ics", url);
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  function ecranAnnuler(jeton) {
    if (annulationFaite && annulationFaite.jeton === jeton) {
      var a = annulationFaite;
      return {
        titre: "Inscription annulée", parent: true,
        html: '<section class="confirmation"><h1 tabindex="-1">C\'est annulé.</h1>' +
          "<p>Votre place au créneau <strong>" + esc(a.creneau) + "</strong> est libérée. Merci de nous avoir prévenus.</p>" +
          "<p class=\"discret\">Si vous l'aviez ajouté à votre agenda, pensez à l'en retirer.</p>" +
          '<a class="bouton bouton--secondaire" href="#inscription/' + a.evenementId + '">Choisir un autre créneau</a></section>'
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
      '<a class="lien-suite" href="#inscription/' + t.evenement.id + '">Garder mon inscription</a>' +
      "</section>";
    return { titre: "Mon coup de main", parent: true, html: html };
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
      titre: "Lien inconnu", parent: true,
      html: '<section class="confirmation"><h1 tabindex="-1">Ce lien ne mène à aucune inscription.</h1>' +
        "<p>L'inscription a peut-être déjà été annulée. Le bureau de l'association peut vous aider.</p></section>"
    };
  }

  function introuvable() {
    return {
      titre: "Page introuvable", onglet: null,
      html: '<section class="confirmation"><h1 tabindex="-1">Cette page n\'existe pas.</h1>' +
        '<a class="lien-suite" href="#aujourdhui">Revenir à Aujourd\'hui</a></section>'
    };
  }

  // ---------- Aiguillage ----------

  // Anciennes adresses du prototype 001, gardées pour les liens déjà envoyés.
  function adresseActuelle() {
    var h = location.hash.replace(/^#/, "");
    var m;
    if (!h || h === "accueil") { return "aujourdhui"; }
    if ((m = h.match(/^coups-de-main\/(.+)$/))) { return "inscription/" + m[1]; }
    if (h === "bilan/fete-juin") { return "evenement/fete-ecole/bilan"; }
    return h;
  }

  function rendre(options) {
    var morceaux = adresseActuelle().split("/").map(decodeURIComponent);
    var r;
    switch (morceaux[0]) {
      case "aujourdhui": r = ecranAujourdhui(morceaux[1] === "toutes"); break;
      case "evenements": r = ecranEvenements(); break;
      case "evenement": r = ecranEvenement(morceaux[1], morceaux[2]); break;
      case "reunions": r = ecranReunions(); break;
      case "asso": r = ecranAsso(); break;
      case "inscription": r = ecranInscription(morceaux[1]); break;
      case "merci": r = ecranMerci(morceaux[1]); break;
      case "annuler": r = ecranAnnuler(morceaux[1]); break;
      default: r = introuvable();
    }
    var parent = !!r.parent;
    document.body.classList.toggle("espace-parent", parent);
    document.body.classList.toggle("espace-bureau", !parent);
    document.getElementById("onglets").hidden = parent;
    document.getElementById("demo-retour").hidden = !parent;

    var vue = document.getElementById("vue");
    vue.innerHTML = r.html;
    document.title = r.titre + " — prototype";
    Array.prototype.forEach.call(document.querySelectorAll("[data-onglet]"), function (a) {
      if (a.getAttribute("data-onglet") === r.onglet) { a.setAttribute("aria-current", "page"); }
      else { a.removeAttribute("aria-current"); }
    });
    if (!(options && options.garderDefilement)) {
      window.scrollTo(0, 0);
      var h1 = vue.querySelector("h1");
      if (h1 && options && options.focus) { h1.focus({ preventScroll: true }); }
    }
  }

  function copier(idSource) {
    var texte = document.getElementById(idSource).textContent;
    var ok = document.getElementById("copie-" + idSource);
    function repli() {
      var zone = document.createElement("textarea");
      zone.value = texte; zone.setAttribute("readonly", "");
      zone.style.position = "fixed"; zone.style.opacity = "0";
      document.body.appendChild(zone); zone.select();
      var reussi = false;
      try { reussi = document.execCommand("copy"); } catch (err) { reussi = false; }
      zone.remove();
      ok.textContent = reussi ? "Lien copié." : "Copie impossible ici : appuyez longuement sur le lien pour le copier.";
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texte).then(function () { ok.textContent = "Lien copié."; }, repli);
    } else { repli(); }
  }

  // ---------- Menu de démo ----------

  function remplirUtilisateurs() {
    var select = document.getElementById("demo-utilisateur");
    select.innerHTML = etat.bureau.map(function (m) {
      return '<option value="' + esc(m.prenom) + '"' + (m.prenom === etat.utilisateur ? " selected" : "") + ">" +
        esc(m.prenom) + " — " + esc(minuscule(m.role)) + "</option>";
    }).join("");
  }

  function basculerMenu(forcer) {
    var bouton = document.getElementById("demo-ouvrir");
    var menu = document.getElementById("demo-menu");
    var ouvrir = typeof forcer === "boolean" ? forcer : menu.hidden;
    menu.hidden = !ouvrir;
    bouton.setAttribute("aria-expanded", String(ouvrir));
  }

  // ---------- Gestes ----------

  document.addEventListener("click", function (ev) {
    var cible = ev.target.closest("button, a");
    if (!cible) { return; }
    if (cible.classList.contains("statut")) { changerStatut(cible); return; }
    if (cible.hasAttribute("data-ouvrir")) { ouvrirFormulaire(cible.getAttribute("data-ouvrir")); return; }
    if (cible.hasAttribute("data-fermer")) { creneauOuvert = null; rendre({ garderDefilement: true }); return; }
    if (cible.hasAttribute("data-copier")) { copier(cible.getAttribute("data-copier")); return; }
    if (cible.hasAttribute("data-agenda")) { ajouterAgenda(cible.getAttribute("data-agenda")); return; }
    if (cible.hasAttribute("data-annuler")) { annulerInscription(cible.getAttribute("data-annuler")); return; }
    if (cible.hasAttribute("data-image")) { enregistrerImage(cible.getAttribute("data-image")); return; }
    if (cible.hasAttribute("data-qr")) {
      qrVisible = !qrVisible;
      document.getElementById("qr").hidden = !qrVisible;
      cible.setAttribute("aria-expanded", String(qrVisible));
      return;
    }
    if (cible.id === "demo-ouvrir") { basculerMenu(); return; }
    if (cible.hasAttribute("data-reinitialiser")) {
      if (window.confirm("Remettre la démo comme au départ ? Ce qui a été saisi sera effacé.")) {
        reinitialiser();
        remplirUtilisateurs();
        basculerMenu(false);
        if (location.hash === "#aujourdhui") { rendre(); } else { location.hash = "#aujourdhui"; }
      }
      return;
    }
    if (cible.closest("#demo-menu") && cible.tagName === "A") { basculerMenu(false); }
  });

  document.getElementById("demo-utilisateur").addEventListener("change", function (ev) {
    etat.utilisateur = ev.target.value;
    sauver();
    basculerMenu(false);
    if (document.body.classList.contains("espace-parent")) { location.hash = "#aujourdhui"; }
    else { rendre(); }
  });

  document.addEventListener("submit", function (ev) {
    if (ev.target.classList.contains("formulaire")) {
      ev.preventDefault();
      envoyerFormulaire(ev.target);
    }
  });

  window.addEventListener("hashchange", function () {
    creneauOuvert = null;
    qrVisible = false;
    rendre({ focus: true });
  });

  remplirUtilisateurs();
  rendre();
})();
