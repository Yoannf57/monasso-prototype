/*
  Affichage du prototype. Deux espaces bien séparés :
  - espace bureau : menu fixe en bas (Accueil, Événements, Association, Aide) ;
  - espace parent : arrivée par le lien ou le QR code, aucune navigation.
  Règle de la charte : chaque écran montre une liste courte ou un résumé,
  le détail s'ouvre au toucher, et il y a au plus un bouton principal par écran.
  Ce qu'un testeur saisit est gardé dans le navigateur (localStorage).
*/
(function () {
  "use strict";

  var L = window.Logique;
  var CLE = "monasso-prototype-v2"; // la version 2 garde ses essais à part de la version 1
  var FOND = "#FFF7EC"; // même valeur que --fond dans style.css
  var etat = charger();
  var creneauOuvert = null;   // créneau dont le formulaire est déplié (espace parent)
  var annulationFaite = null; // dernière inscription annulée
  var qrVisible = false;      // encart QR code (espace bureau)
  var moisAffiche = null;     // mois montré par le calendrier (null : choisi automatiquement)

  // Couleurs proposées sur la page Charte pour essayer une autre couleur d'association.
  var COULEURS_ESSAI = [
    ["Corail", "#F2613F"], ["Bleu", "#2563EB"], ["Vert", "#16A34A"], ["Violet", "#7C3AED"], ["Jaune", "#FACC15"]
  ];

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
    moisAffiche = null;
    appliquerCouleur();
  }

  function membre(prenom) {
    return etat.bureau.filter(function (m) { return m.prenom === prenom; })[0] || etat.bureau[0];
  }

  // La couleur principale de l'association remplace celle de la charte.
  function appliquerCouleur() {
    var p = L.paletteAssociation(etat.association.couleur, FOND);
    var s = document.documentElement.style;
    s.setProperty("--principale", p.principale);
    s.setProperty("--principale-fond", p.principaleFond);
    s.setProperty("--sur-principale", p.surPrincipale);
    s.setProperty("--principale-texte", p.principaleTexte);
    s.setProperty("--principale-pale", p.principalePale);
    return p;
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
  function dateCourte(d) { return fmtCourt.format(d).replace(/\.$/, ""); }

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
    return "pour le " + dateCourte(L.dateLimite(action, evenement));
  }

  function pluriel(n, un, plusieurs) { return n + " " + (n > 1 ? plusieurs : un); }

  // Étiquette du code couleur : toujours un mot avec la couleur.
  function etiquettePreparation(e) {
    var p = L.etatPreparation(e);
    return '<span class="etiquette etiquette--' + p + '">' + esc(L.LIBELLES_PREPARATION[p]) + "</span>";
  }

  function pastilleDate(d) {
    return '<span class="pastille" aria-hidden="true"><span class="pastille-jour">' + d.getDate() +
      '</span><span class="pastille-mois">' + esc(fmtMois.format(d).replace(".", "")) + "</span></span>";
  }

  function lienParent(evenementId) { return location.href.split("#")[0] + "#inscription/" + evenementId; }
  function lienPersonnel(jeton) { return location.href.split("#")[0] + "#annuler/" + jeton; }

  function entete(surtitre, titre, sousTitre) {
    return '<header class="entete">' + (surtitre ? '<p class="surtitre">' + esc(surtitre) + "</p>" : "") +
      '<h1 tabindex="-1">' + esc(titre) + "</h1>" +
      (sousTitre ? '<p class="sous-titre">' + sousTitre + "</p>" : "") + "</header>";
  }

  function retour(href, libelle) { return '<a class="retour" href="' + href + '">' + esc(libelle) + "</a>"; }

  // Illustrations légères des écrans vides (dessinées avec les couleurs de la charte).
  function illustration(nom) {
    var dessins = {
      calme: '<circle cx="60" cy="52" r="34" fill="var(--principale-pale)"/>' +
        '<circle cx="60" cy="52" r="16" fill="var(--principale)"/>' +
        '<path d="M60 10v8M60 86v8M18 52h8M94 52h8M30 22l6 6M84 76l6 6M30 82l6-6M84 28l6-6" stroke="var(--principale)" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M22 100h76" stroke="var(--trait)" stroke-width="4" stroke-linecap="round"/>',
      panneau: '<rect x="20" y="18" width="80" height="62" rx="10" fill="var(--principale-pale)"/>' +
        '<rect x="32" y="32" width="38" height="8" rx="4" fill="var(--principale)"/>' +
        '<rect x="32" y="48" width="56" height="6" rx="3" fill="var(--trait)"/><rect x="32" y="60" width="44" height="6" rx="3" fill="var(--trait)"/>' +
        '<circle cx="60" cy="18" r="6" fill="var(--accent)"/><path d="M44 80l-8 22M76 80l8 22" stroke="var(--texte-doux)" stroke-width="4" stroke-linecap="round"/>',
      chemin: '<path d="M60 104V30" stroke="var(--texte-doux)" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M60 26h34l10 10-10 10H60z" fill="var(--principale)"/><path d="M60 54H28l-10 10 10 10h32z" fill="var(--accent-pale)"/>' +
        '<path d="M30 104h60" stroke="var(--trait)" stroke-width="4" stroke-linecap="round"/>'
    };
    return '<svg class="illustration" viewBox="0 0 120 110" aria-hidden="true" focusable="false">' + dessins[nom] + "</svg>";
  }

  function etatVide(nom, titre, texte, suite) {
    return '<div class="vide">' + illustration(nom) + "<p><strong>" + esc(titre) + "</strong></p>" +
      (texte ? '<p class="discret">' + texte + "</p>" : "") + (suite || "") + "</div>";
  }

  // ---------- Ligne d'action (Mes actions et fiche événement) ----------

  function ligneAction(a, e, contexte) {
    var retard = L.estEnRetard(a, e);
    var suivant = L.statutSuivant(a.statut);
    var meta = [];
    if (contexte === "mes-actions" || contexte === "toutes") { meta.push(esc(e.titre)); }
    if (contexte !== "mes-actions") { meta.push(esc(a.referent)); }
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
      var g = L.grouperParEcheance(e).filter(function (x) { return x.joursAvant === a.joursAvant; })[0];
      var meta = document.getElementById("groupe-meta-" + a.joursAvant);
      if (g && meta) { meta.innerHTML = metaGroupe(g, e); }
    }
  }

  // ---------- Accueil : trois blocs au plus, chacun ouvre son détail ----------

  function ecranAccueil() {
    var moi = membre(etat.utilisateur);
    var html = entete(etat.association.nom, "Bonjour " + moi.prenom, esc(dateLongue(L.aujourdhui())));

    var prochain = L.evenementsAVenir(etat)[0];
    if (prochain) {
      var retards = prochain.actions.filter(function (a) { return L.estEnRetard(a, prochain); }).length;
      var infos = [];
      if (retards) { infos.push('<span class="texte-alerte">' + pluriel(retards, "action en retard", "actions en retard") + "</span>"); }
      if (prochain.creneaux.length) { infos.push(L.compterInscrits(prochain) + " coups de main sur " + L.compterPlaces(prochain)); }
      html += '<a class="carte" id="bloc-prochain" href="#evenement/' + prochain.id + '">' +
        '<span class="carte-etiquette">Prochain événement ' + etiquettePreparation(prochain) + "</span>" +
        '<span class="carte-ligne">' + pastilleDate(L.dateEvenement(prochain)) +
        '<span><span class="carte-titre">' + esc(prochain.titre) + "</span>" +
        '<span class="carte-quand">' + esc(quandEvenement(prochain)) + " · " + esc(prochain.lieu) + "</span></span></span>" +
        (infos.length ? '<span class="carte-infos">' + infos.join(" · ") + "</span>" : "") + "</a>";
    }

    var m = L.actionsAFaire(etat, moi.prenom);
    var premiere = m.enRetard[0] || m.cetteSemaine[0] || m.plusTard[0];
    html += '<a class="carte" id="bloc-actions" href="#mes-actions">' +
      '<span class="carte-etiquette">Mes actions à faire</span>' +
      '<span class="bloc-chiffre"><span class="grand-nombre">' + m.total + "</span><span>" +
      (m.total ? (m.enRetard.length ? '<span class="texte-alerte">dont ' + m.enRetard.length + " en retard</span>" : "rien en retard") : "tout est fait") +
      "</span></span>" +
      (premiere ? '<span class="carte-infos">' + esc(premiere.action.libelle) + "</span>" : "") + "</a>";

    var manque = L.creneauxEnManque(etat);
    html += '<a class="carte" id="bloc-rappels" href="#rappels">' +
      '<span class="carte-etiquette">Rappels</span>' +
      (manque.length
        ? '<span class="carte-titre">' + pluriel(manque.length, "créneau manque", "créneaux manquent") + " de monde</span>" +
          '<span class="carte-infos">' + esc(manque[0].creneau.titre) + " · " + esc(manque[0].evenement.titre) + "</span>"
        : '<span class="carte-titre">Rien à signaler</span>') + "</a>";

    return { titre: "Accueil", onglet: "accueil", html: html };
  }

  // ---------- Détail : mes actions (ou toutes) ----------

  function ecranMesActions(toutes) {
    var moi = membre(etat.utilisateur);
    var r = L.actionsAFaire(etat, toutes ? null : moi.prenom);
    var contexte = toutes ? "toutes" : "mes-actions";
    var html = retour("#accueil", "Accueil") +
      entete(null, toutes ? "Toutes les actions" : "Mes actions", toutes ? "Celles du bureau, pour les 7 jours à venir" : esc(moi.prenom) + ", " + esc(minuscule(moi.role))) +
      '<div class="bascule" role="group" aria-label="Quelles actions afficher">' +
      '<a href="#mes-actions"' + (toutes ? "" : ' aria-current="true"') + ">Mes actions</a>" +
      '<a href="#mes-actions/toutes"' + (toutes ? ' aria-current="true"' : "") + ">Toutes</a></div>";

    function section(titre, liste, alerte) {
      return '<section class="section"><h2 class="section-titre"><span' + (alerte ? ' class="texte-alerte"' : "") + ">" + titre +
        '</span><span class="compte">' + liste.length + "</span></h2>" +
        '<ul class="actions">' + liste.map(function (x) { return ligneAction(x.action, x.evenement, contexte); }).join("") + "</ul></section>";
    }
    var groupes = [["En retard", r.enRetard, true], ["Cette semaine", r.cetteSemaine, false]];
    if (!toutes) { groupes.push(["Plus tard", r.plusTard, false]); }
    groupes = groupes.filter(function (g) { return g[1].length; });
    if (!groupes.length) {
      html += '<div class="section">' + etatVide("calme", toutes ? "Rien en retard ni cette semaine." : "Tout est fait.", "Les nouvelles actions apparaîtront ici.") + "</div>";
    } else {
      groupes.forEach(function (g) { html += section(g[0], g[1], g[2]); });
    }
    html += '<p class="discret note-bas">Touchez l\'étiquette d\'une action pour changer son statut.' + (toutes ? " Les autres actions sont dans chaque événement." : "") + "</p>";
    return { titre: toutes ? "Toutes les actions" : "Mes actions", onglet: "accueil", html: html };
  }

  // ---------- Détail : rappels ----------

  function ecranRappels() {
    var manque = L.creneauxEnManque(etat);
    var html = retour("#accueil", "Accueil") + entete(null, "Rappels", "Les créneaux remplis à moins de la moitié");
    if (!manque.length) {
      html += etatVide("calme", "Rien à signaler.", "Tous les créneaux ont au moins la moitié de leurs coups de main.");
    } else {
      manque.forEach(function (m) {
        html += '<a class="carte" href="#evenement/' + m.evenement.id + '/coups-de-main">' +
          '<span class="carte-titre">' + esc(m.creneau.titre) + "</span>" +
          '<span class="carte-quand">' + esc(m.evenement.titre) + " · " + esc(m.creneau.horaire) + "</span>" +
          '<span class="carte-infos"><span class="etiquette etiquette--alerte">' + m.creneau.inscrits.length + " sur " + m.creneau.places + "</span></span></a>";
      });
      html += '<p class="discret note-bas">Envoyez le lien aux parents depuis l\'onglet « Coups de main » de l\'événement.</p>';
    }
    return { titre: "Rappels", onglet: "accueil", html: html };
  }

  // ---------- Événements : liste courte, un toucher ouvre l'événement ----------

  function carteEvenement(e) {
    var passe = L.estPasse(e);
    var infos = [];
    if (!passe) {
      var retards = e.actions.filter(function (a) { return L.estEnRetard(a, e); }).length;
      infos.push(L.compterFaites(e) + " sur " + pluriel(e.actions.length, "action faite", "actions faites"));
      if (retards) { infos.push('<span class="texte-alerte">' + retards + " en retard</span>"); }
    } else if (e.bilan) {
      infos.push(e.bilan.benevoles + " parents ont aidé");
    }
    return '<a class="carte' + (passe ? " carte--passee" : "") + '" id="carte-' + e.id + '" href="#evenement/' + e.id + '">' +
      '<span class="carte-ligne">' + pastilleDate(L.dateEvenement(e)) +
      '<span><span class="carte-titre">' + esc(e.titre) + "</span>" +
      '<span class="carte-quand">' + esc(quandEvenement(e)) + "</span>" +
      '<span class="carte-statut">' + etiquettePreparation(e) + "</span>" +
      (infos.length ? '<span class="carte-quand">' + infos.join(" · ") + "</span>" : "") +
      "</span></span></a>";
  }

  function ecranEvenements() {
    var avenir = L.evenementsAVenir(etat);
    var passes = L.evenementsPasses(etat);
    var html = entete(etat.association.nom, "Événements", avenir.length + " à venir · " + pluriel(passes.length, "passé", "passés"));
    html += calendrier(avenir);
    html += avenir.length
      ? '<section><h2 class="section-titre">À venir</h2>' + avenir.map(carteEvenement).join("") + "</section>"
      : etatVide("panneau", "Aucun événement à venir.", "");
    if (passes.length) {
      html += '<section class="section"><h2 class="section-titre">Passés</h2>' + passes.map(carteEvenement).join("") + "</section>";
    }
    return { titre: "Événements", onglet: "evenements", html: html };
  }

  // ---------- Calendrier du mois, avec le code couleur ----------

  var fmtMoisAnnee = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
  var fmtMoisSeul = new Intl.DateTimeFormat("fr-FR", { month: "long" });
  var fmtJourLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  // Par défaut : le mois en cours s'il a un événement à venir, sinon le mois du prochain événement.
  function moisParDefaut(avenir) {
    var auj = L.aujourdhui();
    var debut = new Date(auj.getFullYear(), auj.getMonth(), 1);
    var ceMois = avenir.some(function (e) { var d = L.dateEvenement(e); return d.getFullYear() === auj.getFullYear() && d.getMonth() === auj.getMonth(); });
    if (ceMois || !avenir.length) { return debut; }
    var d = L.dateEvenement(avenir[0]);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function calendrier(avenir) {
    var m = moisAffiche || moisParDefaut(avenir);
    var annee = m.getFullYear(), mois = m.getMonth();
    var auj = L.aujourdhui();
    var duMois = L.evenementsDuMois(etat, annee, mois);
    var avant = new Date(annee, mois - 1, 1), apres = new Date(annee, mois + 1, 1);
    var html = '<section class="calendrier" aria-labelledby="titre-calendrier">' +
      '<h2 class="calendrier-titre" id="titre-calendrier">' + esc(majuscule(fmtMoisAnnee.format(m))) + "</h2>" +
      '<table class="calendrier-grille"><thead><tr>' +
      ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"].map(function (j) { return '<th scope="col">' + j + "</th>"; }).join("") +
      "</tr></thead><tbody>";
    L.grilleMois(annee, mois).forEach(function (semaine) {
      html += "<tr>" + semaine.map(function (d) {
        if (!d) { return "<td></td>"; }
        var e = duMois.filter(function (x) { return L.memeJour(L.dateEvenement(x), d); })[0];
        var classe = "jour" + (L.memeJour(d, auj) ? " jour--aujourdhui" : "");
        if (!e) {
          return '<td><span class="' + classe + '"' + (L.memeJour(d, auj) ? ' aria-label="Aujourd\'hui, ' + esc(fmtJourLong.format(d)) + '"' : "") + ">" + d.getDate() + "</span></td>";
        }
        var p = L.etatPreparation(e);
        return '<td><a class="' + classe + " jour--" + p + '" href="#evenement/' + e.id + '" id="jour-' + e.id + '"' +
          ' aria-label="' + esc(fmtJourLong.format(d) + " : " + e.titre + ", " + minuscule(L.LIBELLES_PREPARATION[p])) + '">' + d.getDate() + "</a></td>";
      }).join("") + "</tr>";
    });
    html += "</tbody></table>" +
      '<div class="boutons-ligne calendrier-mois">' +
      '<button type="button" class="bouton bouton--secondaire bouton--petit" data-mois="-1">Voir ' + esc(fmtMoisSeul.format(avant)) + "</button>" +
      '<button type="button" class="bouton bouton--secondaire bouton--petit" data-mois="1">Voir ' + esc(fmtMoisSeul.format(apres)) + "</button></div>" +
      '<ul class="legende">' +
      '<li><span class="jour jour--a-jour" aria-hidden="true"></span><span><strong>À jour</strong> : rien en retard ni d\'urgent</span></li>' +
      '<li><span class="jour jour--en-cours" aria-hidden="true"></span><span><strong>En cours</strong> : des actions à faire cette semaine</span></li>' +
      '<li><span class="jour jour--retard" aria-hidden="true"></span><span><strong>En retard</strong> : au moins une action a dépassé sa date</span></li>' +
      "</ul>" +
      (duMois.length ? "" : '<p class="discret">Pas d\'événement ce mois-ci.</p>') +
      "</section>";
    return html;
  }

  function changerMois(delta) {
    var m = moisAffiche || moisParDefaut(L.evenementsAVenir(etat));
    moisAffiche = new Date(m.getFullYear(), m.getMonth() + delta, 1);
    rendre({ garderDefilement: true });
  }

  // ---------- Un événement (3 onglets) ----------

  function ecranEvenement(id, onglet) {
    var e = L.trouverEvenement(etat, id);
    if (!e) { return introuvable(); }
    var passe = L.estPasse(e);
    if (["actions", "coups-de-main", "bilan"].indexOf(onglet) < 0) {
      onglet = passe && e.bilan ? "bilan" : "actions";
    }
    var date = L.dateEvenement(e);
    var html = retour("#evenements", "Événements") +
      entete(dateLongue(date) + (passe ? " " + date.getFullYear() : "") + " · " + e.lieu, e.titre, etiquettePreparation(e)) +
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
    var t = "<strong>" + L.compterFaites(e) + " sur " + e.actions.length + "</strong> actions faites";
    if (nbRetard) { t += ' · <span class="texte-alerte">' + nbRetard + " en retard</span>"; }
    return t;
  }

  function pourcentage(e) { return Math.round(100 * L.compterFaites(e) / Math.max(1, e.actions.length)); }

  function metaGroupe(g, e) {
    var faites = g.actions.filter(function (a) { return a.statut === "fait"; }).length;
    var retards = g.actions.filter(function (a) { return L.estEnRetard(a, e); }).length;
    return esc(dateCourte(L.ajouterJours(L.dateEvenement(e), -g.joursAvant))) + " · " + faites + " sur " + g.actions.length +
      (retards ? ' · <span class="texte-alerte">' + retards + " en retard</span>" : "");
  }

  // Les échéances sont repliées ; on ouvre d'office celles qui ont du retard,
  // ou la première qui n'est pas terminée.
  function ongletActions(e) {
    if (!e.actions.length) { return etatVide("panneau", "Aucune action pour cet événement.", ""); }
    var groupes = L.grouperParEcheance(e);
    var aOuvrir = groupes.filter(function (g) { return g.actions.some(function (a) { return L.estEnRetard(a, e); }); });
    if (!aOuvrir.length) {
      aOuvrir = groupes.filter(function (g) { return g.actions.some(function (a) { return a.statut !== "fait"; }); }).slice(0, 1);
    }
    var html = '<p class="avancement" id="avancement">' + texteAvancement(e) + "</p>" +
      '<div class="barre" aria-hidden="true"><span id="barre" style="width:' + pourcentage(e) + '%"></span></div>';
    groupes.forEach(function (g) {
      html += '<details class="repli" id="groupe-' + g.joursAvant + '"' + (aOuvrir.indexOf(g) >= 0 ? " open" : "") + ">" +
        '<summary><span class="repli-titres"><span class="repli-titre">' + esc(g.echeance) + "</span>" +
        '<span class="repli-meta" id="groupe-meta-' + g.joursAvant + '">' + metaGroupe(g, e) + "</span></span></summary>" +
        '<div class="repli-corps"><ul class="actions">' + g.actions.map(function (a) { return ligneAction(a, e, "evenement"); }).join("") + "</ul></div></details>";
    });
    html += '<p class="discret note-bas">Touchez une échéance pour voir ses actions, puis l\'étiquette d\'une action pour changer son statut.</p>';
    return html;
  }

  function ongletCoupsDeMain(e) {
    if (!e.creneaux.length) {
      return etatVide("panneau", "Pas de tableau de coups de main pour cet événement.", "");
    }
    var lien = lienParent(e.id);
    var texteWhatsapp = "Bonjour, on cherche des parents pour le " + minuscule(e.titre) + " (" + fmtLong.format(L.dateEvenement(e)) +
      "). Même une heure aide beaucoup, sans créer de compte : " + lien;
    var html = '<section class="partage" aria-labelledby="titre-partage">' +
      '<h2 id="titre-partage">Lien à envoyer aux parents</h2>' +
      '<p class="discret">Les parents choisissent un créneau avec ce lien, sans créer de compte.</p>' +
      '<p class="lien-adresse" id="lien-parent">' + esc(lien) + "</p>" +
      '<button type="button" class="bouton bouton--principal" data-copier="lien-parent">Copier le lien</button>' +
      '<p class="copie-ok" id="copie-lien-parent" role="status"></p>' +
      '<div class="boutons-ligne">' +
      '<a class="bouton bouton--secondaire" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(texteWhatsapp) + '">Envoyer sur WhatsApp</a>' +
      '<button type="button" class="bouton bouton--secondaire" data-qr aria-expanded="' + qrVisible + '" aria-controls="qr">Afficher le QR code</button>' +
      "</div>" +
      '<div class="qr" id="qr"' + (qrVisible ? "" : " hidden") + ">" +
      '<div class="qr-image" aria-hidden="true"></div>' +
      "<p>Dans la vraie application, ce QR code s'imprime sur l'affiche et dans le cahier de liaison. Le prototype ne le fabrique pas.</p></div>" +
      '<a class="lien-suite" href="#inscription/' + e.id + '">Voir la page des parents</a>' +
      "</section>";

    html += '<h2 class="section-titre">Qui vient <span class="compte">' + L.compterInscrits(e) + " sur " + L.compterPlaces(e) + "</span></h2>";
    e.creneaux.forEach(function (c) {
      var reste = L.placesRestantes(c);
      var etiquette = reste === 0
        ? '<span class="etiquette etiquette--ok">Complet</span>'
        : '<span class="etiquette' + (c.inscrits.length < c.places / 2 ? " etiquette--alerte" : "") + '">' + (reste === 1 ? "Manque 1" : "Manquent " + reste) + "</span>";
      html += '<details class="repli" id="equipe-' + c.id + '">' +
        '<summary><span class="repli-titres"><span class="repli-titre">' + esc(c.titre) + "</span>" +
        '<span class="repli-meta">' + esc(c.horaire) + ' · <span class="insecable">' + c.inscrits.length + " sur " + c.places + "</span></span></span>" + etiquette + "</summary>" +
        '<div class="repli-corps">' +
        (c.inscrits.length
          ? '<ul class="noms">' + c.inscrits.map(function (v) {
            var ct = L.analyserContact(v.contact);
            var href = ct ? (ct.type === "email" ? "mailto:" + ct.valeur : "tel:" + ct.valeur.replace(/[\s.\-()]/g, "")) : "";
            return "<li><span>" + esc(L.nomPublic(v)) + "</span>" +
              (href ? '<a href="' + esc(href) + '">' + esc(v.contact) + "</a>" : "") + "</li>";
          }).join("") + "</ul>"
          : '<p class="calme">Personne pour l\'instant.</p>') +
        "</div></details>";
    });
    html += '<p class="discret note-bas">Touchez un créneau pour voir qui vient. Les coordonnées ne sont visibles que du bureau ; les parents ne voient que les prénoms et initiales.</p>';
    return html;
  }

  function ongletBilan(e) {
    if (!e.bilan) {
      var exemple = etat.evenements.filter(function (x) { return x.bilan; })[0];
      return etatVide("panneau", "Le bilan se remplit le soir de l'événement.",
        "Quelques chiffres (parents venus, heures données, recette de la buvette, exposants) deviennent une image de remerciement à partager.",
        exemple ? '<a class="lien-suite" href="#evenement/' + exemple.id + '/bilan">Voir le bilan de la ' + esc(minuscule(exemple.titre)) + "</a>" : "");
    }
    var b = e.bilan;
    var texte = L.texteBilan(etat.association, e);
    return '<figure class="affichette" aria-label="Image de remerciement à partager">' +
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

  // Dessine l'affichette dans une image PNG (1080 × 1350), aux couleurs de l'association.
  function enregistrerImage(id) {
    var e = L.trouverEvenement(etat, id);
    if (!e || !e.bilan) { return; }
    var b = e.bilan;
    var p = L.paletteAssociation(etat.association.couleur, FOND);
    var pret = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    pret.then(function () {
      var W = 1080, H = 1350, M = 96;
      var c = document.createElement("canvas");
      c.width = W; c.height = H;
      var g = c.getContext("2d");
      var texte = "#2A211C", doux = "#6B5D52", accent = "#0B6E77";
      g.fillStyle = FOND; g.fillRect(0, 0, W, H);
      g.fillStyle = p.principale; g.fillRect(0, 0, W, 32);

      g.fillStyle = doux; g.font = "800 36px Nunito";
      g.fillText(etat.association.nom, M, 160);
      g.fillStyle = texte; g.font = "900 120px Nunito";
      g.fillText("Merci à vous.", M, 300);
      g.fillStyle = doux; g.font = "600 40px Nunito";
      g.fillText(e.titre + " · " + fmtLongAnnee.format(L.dateEvenement(e)).replace(/^\S+ /, ""), M, 370);

      g.font = "900 200px Nunito";
      var lv = g.measureText(String(b.benevoles)).width;
      g.fillStyle = p.principalePale; g.beginPath();
      if (g.roundRect) { g.roundRect(M - 20, 430, lv + 40, 200, 28); } else { g.rect(M - 20, 430, lv + 40, 200); }
      g.fill();
      g.fillStyle = texte;
      g.fillText(String(b.benevoles), M, 600);
      g.font = "800 46px Nunito";
      g.fillText("parents ont donné", M + lv + 48, 515);
      g.fillText("un coup de main", M + lv + 48, 575);

      var y = 780;
      [[String(b.heures), "heures données"], [L.formaterEuros(b.recetteBuvette), "à la buvette"], [String(b.exposants), b.exposantsLibelle]]
        .forEach(function (l) {
          g.strokeStyle = "#EADCC8"; g.lineWidth = 3;
          g.beginPath(); g.moveTo(M, y - 84); g.lineTo(W - M, y - 84); g.stroke();
          g.fillStyle = accent; g.font = "900 88px Nunito";
          g.fillText(l[0], M, y + 10);
          var largeur = g.measureText(l[0]).width;
          g.fillStyle = texte; g.font = "700 42px Nunito";
          g.fillText(l[1], M + largeur + 28, y);
          y += 140;
        });

      g.fillStyle = texte; g.font = "600 40px Nunito";
      ecrireLignes(g, b.ceQueCaFinance, M, 1200, W - 2 * M, 56);
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

  // ---------- Association ----------

  function ecranAssociation() {
    var a = etat.association;
    var html = entete("Association", a.nom, esc(a.ecole) + " · " + esc(a.ville)) +
      '<section class="section"><h2 class="section-titre">Le bureau <span class="compte">' + etat.bureau.length + "</span></h2>" +
      '<ul class="membres">' + etat.bureau.map(function (m) {
        var moi = m.prenom === etat.utilisateur;
        return '<li><span class="membre-nom">' + esc(m.prenom) + (moi ? ' <span class="discret">(vous)</span>' : "") + "</span>" +
          '<span class="membre-role">' + esc(m.role) + "</span></li>";
      }).join("") + "</ul></section>" +
      '<section class="section"><h2 class="section-titre">Apparence</h2>' +
      '<p class="discret">Couleurs, tailles de texte et composants de l\'application.</p>' +
      '<a class="lien-suite" href="#charte">Voir la charte graphique</a></section>' +
      '<section class="section"><h2 class="section-titre">Démonstration</h2>' +
      '<p class="discret">Efface ce qui a été saisi pendant les essais et remet les données d\'origine.</p>' +
      '<button type="button" class="bouton bouton--secondaire" data-reinitialiser>Réinitialiser la démo</button></section>';
    return { titre: "Association", onglet: "association", html: html };
  }

  // ---------- Charte (page interne) ----------

  function ecranCharte() {
    var p = L.paletteAssociation(etat.association.couleur, FOND);
    function ratio(a, b) { return L.contraste(a, b).toFixed(1).replace(".", ",") + ":1"; }
    var nuances = [
      ["Couleur principale", p.principale, "Aplats, repères, illustrations. Remplaçable par celle de l'association."],
      ["Bouton principal", p.principaleFond, "Texte " + (p.surPrincipale === "#FFFFFF" ? "blanc" : "foncé") + " : contraste " + ratio(p.surPrincipale, p.principaleFond)],
      ["Principale pour écrire", p.principaleTexte, "Liens et titres de carte : " + ratio(p.principaleTexte, p.principalePale) + " sur la teinte pâle"],
      ["Principale pâle", p.principalePale, "Fonds légers (encadrés, pastilles)"],
      ["Accent bleu canard", "#0B6E77", "« En cours », chiffres, informations : " + ratio("#0B6E77", FOND)],
      ["Alerte", "#B8322A", "Retards et annulation : " + ratio("#B8322A", FOND)],
      ["Fond crème", FOND, "Fond de toutes les pages"],
      ["Texte", "#2A211C", "Texte courant : " + ratio("#2A211C", FOND)],
      ["Texte doux", "#6B5D52", "Informations secondaires : " + ratio("#6B5D52", FOND)]
    ];
    var html = retour("#association", "Association") + entete("Page interne", "Charte graphique", "Ce que chaque écran doit respecter") +
      '<section class="section"><h2 class="section-titre">Règles</h2><ul class="regles">' +
      "<li>Une liste courte ou un résumé par écran ; le détail s'ouvre au toucher.</li>" +
      "<li>Un seul bouton principal par écran.</li>" +
      "<li>Boutons nommés par un verbe et son objet, jamais une icône seule.</li>" +
      "<li>Texte de 16 px minimum, contraste AA (4,5:1).</li>" +
      "<li>Aucun défilement de côté sur un téléphone de 360 px.</li>" +
      "<li>« Actions » côté bureau, « coups de main » côté parents.</li></ul></section>" +

      '<section class="section"><h2 class="section-titre">Couleurs</h2><ul class="nuancier">' +
      nuances.map(function (n) {
        return '<li class="nuance"><span class="nuance-carre" style="background:' + n[1] + '"></span>' +
          '<span><span class="nuance-nom">' + esc(n[0]) + " · " + esc(n[1]) + '</span><span class="nuance-detail">' + esc(n[2]) + "</span></span></li>";
      }).join("") + "</ul></section>" +

      '<section class="section"><h2 class="section-titre">Couleur de l\'association</h2>' +
      '<p class="discret">Essayez une autre couleur principale : tout l\'affichage suit, en restant lisible.</p>' +
      '<div class="choix-couleurs" style="margin-top:10px">' + COULEURS_ESSAI.map(function (c) {
        var choisi = c[1].toUpperCase() === p.principale;
        return '<button type="button" class="choix-couleur" data-couleur="' + c[1] + '" aria-pressed="' + choisi + '">' +
          '<span style="background:' + c[1] + '" aria-hidden="true"></span>Choisir ' + esc(minuscule(c[0])) + "</button>";
      }).join("") + "</div></section>" +

      '<section class="section"><h2 class="section-titre">Textes</h2><ul class="echelle">' +
      '<li><span style="font-size:2rem;font-weight:850;line-height:1.15">Titre de page</span><span class="discret">32 px, Nunito très gras</span></li>' +
      '<li><span style="font-size:1.25rem;font-weight:800">Titre de section</span><span class="discret">20 px, gras</span></li>' +
      "<li><span>Texte courant : phrases simples, mots du quotidien.</span><span class=\"discret\">17 px, normal</span></li>" +
      '<li><span class="discret" style="display:inline">Texte secondaire</span><span class="discret">16 px, le minimum</span></li></ul></section>' +

      '<section class="section exemples"><h2 class="section-titre">Composants</h2>' +
      '<button type="button" class="bouton bouton--principal" data-exemple>Créer un événement</button>' +
      '<button type="button" class="bouton bouton--secondaire" data-exemple>Inviter un membre</button>' +
      '<p><a class="lien-suite" href="#charte">Voir le détail</a></p>' +
      '<a class="carte" href="#charte"><span class="carte-etiquette">Carte</span><span class="carte-titre">Un résumé qui s\'ouvre au toucher</span></a>' +
      '<p><span class="etiquette">Manquent 2</span> <span class="etiquette etiquette--alerte">En retard</span> <span class="etiquette etiquette--ok">Complet</span></p>' +
      '<ul class="actions"><li class="action"><div class="action-texte"><p class="action-libelle">Statut d\'une action</p><p class="action-meta">On touche l\'étiquette pour avancer</p></div>' +
      '<span class="statut statut--en-cours" style="display:inline-flex;align-items:center;justify-content:center">En cours</span></li></ul>' +
      etatVide("calme", "État vide", "Une petite illustration et une phrase qui dit quoi faire.") +
      "</section>";
    return { titre: "Charte graphique", onglet: "association", html: html };
  }

  function choisirCouleur(couleur) {
    etat.association.couleur = couleur;
    sauver();
    appliquerCouleur();
    rendre({ garderDefilement: true });
  }

  // ---------- Aide ----------

  function ecranAide() {
    var questions = [
      ["Comment changer le statut d'une action ?",
        "<p>Ouvrez l'événement, touchez l'échéance, puis l'étiquette de l'action : « À faire » passe à « En cours », puis à « Fait ».</p>"],
      ["Comment trouver des parents pour aider ?",
        "<p>Dans l'événement, ouvrez l'onglet « Coups de main » et touchez « Copier le lien ». Collez-le dans le groupe de la classe ou envoyez-le sur WhatsApp.</p>"],
      ["Que voient les parents ?",
        "<p>Seulement le tableau des créneaux, avec le prénom et l'initiale de ceux qui viennent. Ils n'ont pas besoin de compte et ne voient jamais les coordonnées.</p>"],
      ["Comment partager le bilan de la fête ?",
        "<p>Dans l'événement passé, onglet « Bilan », touchez « Partager sur WhatsApp » ou « Enregistrer l'image ».</p>"],
      ["Un parent veut annuler, que faire ?",
        "<p>Rien : il a reçu un lien personnel pour annuler lui-même. La place se libère toute seule.</p>"]
    ];
    var html = entete(etat.association.nom, "Aide", "Les questions les plus fréquentes") +
      '<div class="questions">' + questions.map(function (q, i) {
        return '<details class="repli" id="question-' + (i + 1) + '"><summary><span class="repli-titres">' + esc(q[0]) + "</span></summary>" +
          '<div class="repli-corps">' + q[1] + "</div></details>";
      }).join("") + "</div>" +
      '<section class="section">' + etatVide("chemin", "Une autre question ?",
        "Demandez à un membre du bureau. Dans la vraie application, un bouton permettra d'écrire à l'équipe MonAsso.") + "</section>";
    return { titre: "Aide", onglet: "aide", html: html };
  }

  // ---------- Espace parent : tableau des coups de main ----------

  function ecranInscription(id) {
    var e = L.trouverEvenement(etat, id);
    if (!e || !e.creneaux.length || L.estPasse(e)) { return lienInconnu(); }
    var date = L.dateEvenement(e);
    var html = '<header class="affiche">' +
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
          ? '<span class="etiquette">Complet</span>'
          : (ouvert ? "" : '<button type="button" class="bouton bouton--secondaire bouton--petit" data-ouvrir="' + c.id + '" aria-label="Je viens : ' + esc(c.titre) + ", " + esc(c.horaire) + '">Je viens</button>')) +
        "</div>" +
        (c.inscrits.length ? '<p class="creneau-noms">Avec ' + esc(c.inscrits.map(L.nomPublic).join(", ")) + "</p>" : '<p class="creneau-noms">Personne pour l\'instant.</p>') +
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
      '<span class="tampon-ok">Inscrit</span>' +
      '<h1 tabindex="-1">C\'est noté, ' + esc(t.volontaire.prenom) + ".</h1>" +
      '<p class="confirmation-quoi"><strong>' + esc(t.creneau.titre) + "</strong><br>" +
      esc(dateLongue(L.dateEvenement(t.evenement))) + " · " + esc(t.creneau.horaire) + "<br>" + esc(t.evenement.lieu) + "</p>" +
      '<p>Merci. Sur le tableau, les autres parents voient seulement « <strong>' + esc(L.nomPublic(t.volontaire)) + "</strong> ».</p>" +
      '<div class="lien-perso"><h2>Gardez votre lien pour annuler</h2>' +
      '<p class="discret">Il sert à vous désinscrire si vous avez un empêchement. Il est à vous seul.</p>' +
      (envoi ? '<a class="bouton bouton--principal" id="envoyer-lien" href="' + esc(envoi) + '">' + (parSms ? "M'envoyer le lien par SMS" : "M'envoyer le lien par e-mail") + "</a>" : "") +
      '<button type="button" class="bouton bouton--secondaire" data-agenda="' + esc(jeton) + '">Ajouter à mon agenda</button>' +
      '<p class="note-bas">L\'agenda vous le rappelle la veille, avec le lien pour annuler.</p>' +
      '<details class="lien-details"><summary>Voir ou copier le lien</summary>' +
      '<p class="lien-adresse" id="lien-perso">' + esc(lien) + "</p>" +
      '<button type="button" class="lien-bouton" data-copier="lien-perso">Copier le lien</button>' +
      '<p class="copie-ok" id="copie-lien-perso" role="status"></p></details>' +
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
      '<button type="button" class="bouton bouton--alerte" data-annuler="' + esc(jeton) + '">Annuler mon inscription</button>' +
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
        etatVide("chemin", "L'inscription a peut-être déjà été annulée.", "Le bureau de l'association peut vous aider.") + "</section>"
    };
  }

  function introuvable() {
    return {
      titre: "Page introuvable", onglet: null,
      html: '<section class="confirmation"><h1 tabindex="-1">Cette page n\'existe pas.</h1>' +
        etatVide("chemin", "Le lien est peut-être incomplet.", "", '<a class="lien-suite" href="#accueil">Revenir à l\'accueil</a>') + "</section>"
    };
  }

  // ---------- Aiguillage ----------

  // Anciennes adresses (prototypes 001 et 002), gardées pour les liens déjà envoyés.
  function adresseActuelle() {
    var h = location.hash.replace(/^#/, "");
    var m;
    if (!h || h === "aujourdhui" || h === "reunions") { return "accueil"; }
    if (h === "aujourdhui/toutes") { return "mes-actions/toutes"; }
    if (h === "asso") { return "association"; }
    if ((m = h.match(/^coups-de-main\/(.+)$/))) { return "inscription/" + m[1]; }
    if (h === "bilan/fete-juin") { return "evenement/fete-ecole/bilan"; }
    return h;
  }

  function rendre(options) {
    var morceaux = adresseActuelle().split("/").map(decodeURIComponent);
    var r;
    switch (morceaux[0]) {
      case "accueil": r = ecranAccueil(); break;
      case "mes-actions": r = ecranMesActions(morceaux[1] === "toutes"); break;
      case "rappels": r = ecranRappels(); break;
      case "evenements": r = ecranEvenements(); break;
      case "evenement": r = ecranEvenement(morceaux[1], morceaux[2]); break;
      case "association": r = ecranAssociation(); break;
      case "charte": r = ecranCharte(); break;
      case "aide": r = ecranAide(); break;
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
    var defilement = window.scrollY;
    vue.innerHTML = r.html;
    document.title = r.titre + " — prototype";
    Array.prototype.forEach.call(document.querySelectorAll("[data-onglet]"), function (a) {
      if (a.getAttribute("data-onglet") === r.onglet) { a.setAttribute("aria-current", "page"); }
      else { a.removeAttribute("aria-current"); }
    });
    if (options && options.garderDefilement) {
      window.scrollTo(0, defilement);
    } else {
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
    if (cible.hasAttribute("data-couleur")) { choisirCouleur(cible.getAttribute("data-couleur")); return; }
    if (cible.hasAttribute("data-exemple")) { return; }
    if (cible.hasAttribute("data-mois")) { changerMois(Number(cible.getAttribute("data-mois"))); return; }
    if (cible.hasAttribute("data-qr")) {
      qrVisible = !qrVisible;
      document.getElementById("qr").hidden = !qrVisible;
      cible.setAttribute("aria-expanded", String(qrVisible));
      cible.textContent = qrVisible ? "Masquer le QR code" : "Afficher le QR code";
      return;
    }
    if (cible.id === "demo-ouvrir") { basculerMenu(); return; }
    if (cible.hasAttribute("data-reinitialiser")) {
      if (window.confirm("Remettre la démo comme au départ ? Ce qui a été saisi sera effacé.")) {
        reinitialiser();
        remplirUtilisateurs();
        basculerMenu(false);
        if (location.hash === "#accueil") { rendre(); } else { location.hash = "#accueil"; }
      }
      return;
    }
    if (cible.closest("#demo-menu") && cible.tagName === "A") { basculerMenu(false); }
  });

  document.getElementById("demo-utilisateur").addEventListener("change", function (ev) {
    etat.utilisateur = ev.target.value;
    sauver();
    basculerMenu(false);
    if (document.body.classList.contains("espace-parent")) { location.hash = "#accueil"; }
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

  appliquerCouleur();
  remplirUtilisateurs();
  rendre();
})();
