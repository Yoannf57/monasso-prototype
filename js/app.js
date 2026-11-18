/*
  Affichage du prototype. Deux espaces bien séparés :
  - espace du groupe : menu fixe en bas (Accueil · Événements · Association pour une association,
    Accueil · Groupe pour un groupe simple), lien « Aide » en haut de chaque écran ;
  - espace parent : arrivée par le lien ou le QR code, aucune navigation.
  Plusieurs groupes (demande 005) : un groupe simple n'a ni événements ni bureau.
  Les mots des nouveaux écrans et ceux qui changent selon la sorte de groupe viennent de mots.js.
  Règle de la charte : chaque écran montre une liste courte ou un résumé,
  le détail s'ouvre au toucher, et il y a au plus un bouton principal par écran.
  Ce qu'un testeur saisit est gardé dans le navigateur (localStorage).
*/
(function () {
  "use strict";

  var L = window.Logique;
  var Gr = window.Groupes;
  var CLE = "monasso-prototype-groupes"; // les essais des versions précédentes restent à part
  var FOND = "#FFF7EC"; // même valeur que --fond dans style.css
  var etat = charger();
  var creneauOuvert = null;   // créneau dont le formulaire est déplié (espace parent)
  var annulationFaite = null; // dernière inscription annulée
  var qrVisible = false;      // encart QR code (espace bureau)
  var moisAffiche = null;     // mois montré par le calendrier (null : choisi automatiquement)
  var message = null;         // phrase de confirmation montrée une fois sur l'écran suivant

  // ---------- Mémoire du navigateur ----------

  function cloner(o) { return JSON.parse(JSON.stringify(o)); }

  function etatInitial() {
    var e = cloner(DONNEES);
    e.groupeActif = DONNEES.groupeParDefaut;
    e.personneActive = {};
    return e;
  }

  function charger() {
    try {
      var texte = window.localStorage.getItem(CLE);
      if (texte) {
        var e = JSON.parse(texte);
        if (e && e.version === DONNEES.version && Array.isArray(e.groupes) && e.groupes.length) { return e; }
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
    message = null;
    appliquerCouleur();
  }

  // ---------- Groupe et personne simulés ----------

  function G() { return Gr.groupeActif(etat); }
  function moi() { return Gr.personneActive(etat, G()); }
  function gere() { return Gr.peutGerer(G(), moi()); }
  function estAsso() { return Gr.estAssociation(G()); }
  function hrefGroupe() { return estAsso() ? "#association" : "#groupe"; }

  // Un mot de mots.js, pris dans la liste de la sorte du groupe, sinon dans la liste commune.
  function M(cle, valeurs) {
    var liste = MOTS[G().sorte] || {};
    var v = Object.prototype.hasOwnProperty.call(liste, cle) ? liste[cle] : MOTS.commun[cle];
    if (v === undefined) { throw new Error("Mot manquant dans mots.js : " + cle); }
    if (typeof v === "string" && valeurs) {
      v = v.replace(/\{(\w+)\}/g, function (tout, k) { return Object.prototype.hasOwnProperty.call(valeurs, k) ? valeurs[k] : tout; });
    }
    return v;
  }
  function D(cle) { return MOTS.commun.demo[cle]; }
  // Compte avec accord : Mn("nPersonnes", 3) → « 3 personnes ».
  function Mn(cle, n) { var f = M(cle); return (n > 1 ? f[1] : f[0]).replace("{n}", n); }
  function nomRole(role) { return MOTS.commun.roles[role].nom; }
  function compteRoles(groupe) {
    return Gr.ROLES[groupe.sorte].map(function (r) {
      var n = groupe.personnes.filter(function (p) { return p.role === r; }).length;
      var f = MOTS.commun.roles[r].compte;
      return n ? (n > 1 ? f[1] : f[0]).replace("{n}", n) : "";
    }).filter(Boolean).join(" · ");
  }
  function nomEquipe(e) { return e.bureau ? M("equipeBureau") : e.nom; }

  // La couleur principale du groupe remplace celle de la charte.
  function appliquerCouleur() {
    var p = L.paletteAssociation(G().couleur, FOND);
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
    var e = L.trouverEvenement(G(), bouton.getAttribute("data-evenement"));
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
    if (!estAsso()) { return ecranAccueilGroupe(); }
    var p = moi();
    var html = entete(G().nom, M("bonjour", { prenom: p.prenom }), esc(dateLongue(L.aujourdhui()))) + bandeauMessage();

    var prochain = L.evenementsAVenir(G())[0];
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

    var m = L.actionsAFaire(G(), p.prenom);
    var premiere = m.enRetard[0] || m.cetteSemaine[0] || m.plusTard[0];
    html += '<a class="carte" id="bloc-actions" href="#mes-actions">' +
      '<span class="carte-etiquette">Mes actions à faire</span>' +
      '<span class="bloc-chiffre"><span class="grand-nombre">' + m.total + "</span><span>" +
      (m.total ? (m.enRetard.length ? '<span class="texte-alerte">dont ' + m.enRetard.length + " en retard</span>" : "rien en retard") : "tout est fait") +
      "</span></span>" +
      (premiere ? '<span class="carte-infos">' + esc(premiere.action.libelle) + "</span>" : "") + "</a>";

    var manque = L.creneauxEnManque(G());
    html += '<a class="carte" id="bloc-rappels" href="#rappels">' +
      '<span class="carte-etiquette">Rappels</span>' +
      (manque.length
        ? '<span class="carte-titre">' + pluriel(manque.length, "créneau manque", "créneaux manquent") + " de monde</span>" +
          '<span class="carte-infos">' + esc(manque[0].creneau.titre) + " · " + esc(manque[0].evenement.titre) + "</span>"
        : '<span class="carte-titre">Rien à signaler</span>') + "</a>";

    return { titre: M("ongletAccueil"), onglet: "accueil", html: html };
  }

  // Accueil d'un groupe simple : ses personnes et mes équipes.
  function ecranAccueilGroupe() {
    var g = G(), p = moi();
    var miennes = Gr.equipesDePersonne(g, p.id).map(nomEquipe);
    var html = entete(g.nom, M("bonjour", { prenom: p.prenom }), esc(dateLongue(L.aujourdhui()))) + bandeauMessage() +
      '<a class="carte" id="bloc-personnes" href="#personnes">' +
      '<span class="carte-etiquette">' + esc(M("accueilPersonnes")) + "</span>" +
      '<span class="carte-titre">' + esc(Mn("nPersonnes", g.personnes.length)) + "</span>" +
      '<span class="carte-quand">' + esc(compteRoles(g)) + "</span></a>" +
      '<a class="carte" id="bloc-equipes" href="#equipes">' +
      '<span class="carte-etiquette">' + esc(M("accueilMesEquipes")) + "</span>" +
      '<span class="carte-titre">' + esc(miennes.length ? miennes.join(", ") : M("accueilAucuneEquipe")) + "</span>" +
      '<span class="carte-quand">' + esc(Mn("nEquipes", Gr.equipes(g).length)) + "</span></a>";
    return { titre: M("ongletAccueil"), onglet: "accueil", html: html };
  }

  // ---------- Détail : mes actions (ou toutes) ----------

  function ecranMesActions(toutes) {
    var p = moi();
    var r = L.actionsAFaire(G(), toutes ? null : p.prenom);
    var contexte = toutes ? "toutes" : "mes-actions";
    var html = retour("#accueil", "Accueil") +
      entete(null, toutes ? "Toutes les actions" : "Mes actions", toutes ? "Celles du bureau, pour les 7 jours à venir" : esc(p.prenom) + ", " + esc(minuscule(p.fonction || nomRole(p.role)))) +
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
    var manque = L.creneauxEnManque(G());
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
    var avenir = L.evenementsAVenir(G());
    var passes = L.evenementsPasses(G());
    var html = entete(G().nom, "Événements", avenir.length + " à venir · " + pluriel(passes.length, "passé", "passés"));
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
    var duMois = L.evenementsDuMois(G(), annee, mois);
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
    var m = moisAffiche || moisParDefaut(L.evenementsAVenir(G()));
    moisAffiche = new Date(m.getFullYear(), m.getMonth() + delta, 1);
    rendre({ garderDefilement: true });
  }

  // ---------- Un événement (3 onglets) ----------

  function ecranEvenement(id, onglet) {
    var e = L.trouverEvenement(G(), id);
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
            var ct = gere() ? L.analyserContact(v.contact) : null; // coordonnées : bureau seulement
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
      var exemple = G().evenements.filter(function (x) { return x.bilan; })[0];
      return etatVide("panneau", "Le bilan se remplit le soir de l'événement.",
        "Quelques chiffres (parents venus, heures données, recette de la buvette, exposants) deviennent une image de remerciement à partager.",
        exemple ? '<a class="lien-suite" href="#evenement/' + exemple.id + '/bilan">Voir le bilan de la ' + esc(minuscule(exemple.titre)) + "</a>" : "");
    }
    var b = e.bilan;
    var texte = L.texteBilan(G(), e);
    return '<figure class="affichette" aria-label="Image de remerciement à partager">' +
      '<p class="affichette-asso">' + esc(G().nom) + "</p>" +
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
    var e = L.trouverEvenement(G(), id);
    if (!e || !e.bilan) { return; }
    var b = e.bilan;
    var p = L.paletteAssociation(G().couleur, FOND);
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
      g.fillText(G().nom, M, 160);
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

  // ---------- Petits morceaux communs aux nouveaux écrans ----------

  // Phrase de confirmation (« … est dans la liste »), montrée une seule fois.
  function bandeauMessage() {
    if (!message) { return ""; }
    var m = message;
    message = null;
    return '<p class="message-ok" role="status">' + esc(m) + "</p>";
  }

  function avertissement() { return '<p class="avertissement">' + esc(M("avertissementPrototype")) + "</p>"; }

  // Liste de choix (boutons radio ou cases à cocher), chaque choix est une grande zone à toucher.
  function choix(nom, legende, options, choisis, type, classe) {
    var t = type || "radio";
    return '<fieldset class="choix' + (classe ? " " + classe : "") + '" id="champ-' + nom + '" aria-describedby="erreur-' + nom + '">' +
      "<legend>" + esc(legende) + "</legend>" +
      options.map(function (o) {
        var coche = choisis.indexOf(o.valeur) >= 0;
        return '<label class="choix-option"><input type="' + t + '" name="' + nom + '" value="' + esc(o.valeur) + '"' + (coche ? " checked" : "") + ">" +
          '<span class="choix-texte"><span class="choix-titre">' +
          (o.pastille ? '<span class="pastille-couleur" style="background:' + esc(o.pastille) + '" aria-hidden="true"></span>' : "") +
          esc(o.titre) + "</span>" + (o.detail ? '<span class="choix-detail">' + esc(o.detail) + "</span>" : "") + "</span></label>";
      }).join("") +
      '<p class="champ-erreur" id="erreur-' + nom + '"></p></fieldset>';
  }

  function valeurRadio(form, nom) {
    var coche = form.querySelector('input[name="' + nom + '"]:checked');
    return coche ? coche.value : "";
  }

  // Affiche les erreurs d'un formulaire (codes des règles → phrases de mots.js) ; rend vrai s'il y en a.
  function montrerErreurs(form, champs, erreurs, textes) {
    var premier = null;
    champs.forEach(function (n) {
      var code = erreurs && erreurs[n];
      var texte = code ? textes[n + ":" + code] || textes[n] : "";
      var zone = form.querySelector("#erreur-" + n);
      if (zone) { zone.textContent = texte; }
      var el = form.querySelector("#champ-" + n);
      if (el && el.tagName === "INPUT") { el.setAttribute("aria-invalid", texte ? "true" : "false"); }
      if (texte && !premier) { premier = el && el.tagName === "INPUT" ? el : form.querySelector("#champ-" + n + " input"); }
    });
    if (premier) { premier.focus(); }
    return !!premier;
  }

  function erreurGenerale(form, texte) {
    var z = form.querySelector(".erreur-generale");
    z.textContent = texte;
  }

  // Va à l'adresse ; si on y est déjà, redessine quand même l'écran.
  function aller(adresse) {
    if (location.hash === adresse) { rendre({ focus: true }); } else { location.hash = adresse; }
  }

  // ---------- Page du groupe (Association, ou Groupe pour un groupe simple) ----------

  function ecranGroupe() {
    var g = G();
    var equipes = Gr.equipes(g);
    var sous = [g.ecole, g.ville].filter(Boolean).map(esc).join(" · ");
    var html = entete(M("surtitreGroupe"), g.nom, sous) + bandeauMessage() +
      '<a class="carte" id="carte-personnes" href="#personnes">' +
      '<span class="carte-etiquette">' + esc(M("personnes")) + "</span>" +
      '<span class="carte-titre">' + esc(Mn("nPersonnes", g.personnes.length)) + "</span>" +
      '<span class="carte-quand">' + esc(compteRoles(g)) + "</span></a>" +
      '<a class="carte" id="carte-equipes" href="#equipes">' +
      '<span class="carte-etiquette">' + esc(M("equipes")) + "</span>" +
      '<span class="carte-titre">' + esc(Mn("nEquipes", equipes.length)) + "</span>" +
      (equipes.length ? '<span class="carte-quand">' + esc(equipes.map(nomEquipe).join(", ")) + "</span>" : "") + "</a>" +
      '<section class="section"><h2 class="section-titre">' + esc(M("apparence")) + "</h2>" +
      '<p class="discret">' + esc(M("apparenceTexte")) + "</p>" +
      '<a class="lien-suite" href="#charte">' + esc(M("voirLaCharte")) + "</a></section>" +
      '<section class="section"><h2 class="section-titre">' + esc(M("demonstration")) + "</h2>" +
      '<p class="discret">' + esc(M("demonstrationTexte")) + "</p>" +
      '<button type="button" class="bouton bouton--secondaire" data-reinitialiser>' + esc(M("reinitialiser")) + "</button></section>";
    return { titre: M("ongletGroupe"), onglet: "groupe", html: html };
  }

  // ---------- Personnes ----------

  function ligneEquipes(g, p) {
    var eq = Gr.equipesDePersonne(g, p.id).filter(function (e) { return !e.bureau; }).map(nomEquipe);
    return eq.length ? M("equipesDeLaPersonne", { liste: eq.join(", ") }) : M("aucuneEquipePersonne");
  }

  function ecranPersonnes() {
    var g = G(), p = moi(), gerer = gere();
    var liste = Gr.personnesTriees(g);
    var html = retour(hrefGroupe(), M("ongletGroupe")) +
      entete(g.nom, M("personnes"), esc(Mn("nPersonnes", liste.length)) + " · " + esc(compteRoles(g))) + bandeauMessage() +
      (gerer ? '<a class="bouton bouton--principal" id="ajouter-personne" href="#personne/nouvelle">' + esc(M("ajouterUnePersonne")) + "</a>" : "") +
      '<ul class="personnes">' + liste.map(function (x) {
        var contenu = '<span class="personne-nom">' + esc(Gr.nomComplet(x)) + (x.id === p.id ? ' <span class="personne-vous">' + esc(M("vous")) + "</span>" : "") + "</span>" +
          '<span class="personne-detail">' + esc(nomRole(x.role) + (x.fonction ? " · " + x.fonction : "")) + "</span>" +
          '<span class="personne-detail">' + esc(ligneEquipes(g, x)) + "</span>" +
          (gerer && x.contact ? '<span class="personne-detail personne-contact">' + esc(x.contact) + "</span>" : "");
        return gerer
          ? '<li><a class="personne personne--lien" id="personne-' + x.id + '" href="#personne/' + x.id + '">' + contenu + "</a></li>"
          : '<li><div class="personne" id="personne-' + x.id + '">' + contenu + "</div></li>";
      }).join("") + "</ul>" +
      '<p class="discret note-bas">' + esc(gerer ? M("contactsReserves") : M("reserveGestion")) + "</p>";
    return { titre: M("personnes"), onglet: "groupe", html: html };
  }

  function optionsRoles(g) {
    var aides = M("rolesAide");
    return Gr.ROLES[g.sorte].map(function (r) { return { valeur: r, titre: nomRole(r), detail: aides[r] }; });
  }

  function ecranPersonne(id) {
    var g = G();
    var nouvelle = id === "nouvelle";
    var x = nouvelle ? null : Gr.trouverPersonne(g, id);
    var html = retour("#personnes", M("personnes"));
    if (!nouvelle && !x) {
      return { titre: M("personnes"), onglet: "groupe", html: html + entete(g.nom, M("personnes")) + etatVide("chemin", M("personneIntrouvable"), "") };
    }
    if (!gere()) {
      if (nouvelle) { return ecranPersonnes(); }
      html += entete(g.nom, Gr.nomComplet(x), esc(nomRole(x.role) + (x.fonction ? " · " + x.fonction : ""))) +
        '<p>' + esc(ligneEquipes(g, x)) + "</p>" +
        '<p class="discret note-bas">' + esc(M("reserveGestion")) + "</p>";
      return { titre: Gr.nomComplet(x), onglet: "groupe", html: html };
    }
    var v = function (k) { return x ? ' value="' + esc(x[k] || "") + '"' : ""; };
    html += entete(g.nom, nouvelle ? M("ajouterUnePersonne") : Gr.nomComplet(x)) + bandeauMessage() +
      '<form class="form-personne" data-personne="' + (x ? x.id : "") + '" novalidate>' +
      champ("prenom", M("champPrenom"), 'autocomplete="off" autocapitalize="words" maxlength="40"' + v("prenom"), "") +
      champ("nom", M("champNom"), 'autocomplete="off" autocapitalize="words" maxlength="40"' + v("nom"), "") +
      champ("contact", M("champContact"), 'autocomplete="off" inputmode="email" autocapitalize="off" spellcheck="false"' + v("contact"),
        M("champContactAide")) +
      choix("role", M("champRole"), optionsRoles(g), [x ? x.role : "membre"]) +
      '<p class="erreur-generale" role="alert"></p>' +
      '<button type="submit" class="bouton bouton--principal">' + esc(nouvelle ? M("ajouterLaPersonne") : M("enregistrerLesChangements")) + "</button>" +
      (nouvelle
        ? '<a class="lien-suite" href="#personnes">' + esc(M("voirLaListe")) + "</a>"
        : '<button type="button" class="lien-bouton lien-bouton--alerte" data-retirer="' + x.id + '">' + esc(M("retirerLaPersonne")) + "</button>") +
      "</form>";
    return { titre: nouvelle ? M("ajouterUnePersonne") : Gr.nomComplet(x), onglet: "groupe", html: html, champ: nouvelle ? "prenom" : null };
  }

  var TEXTES_PERSONNE = function () {
    return {
      "prenom:vide": M("erreurPrenomVide"), "prenom:long": M("erreurTropLong"), "nom:long": M("erreurTropLong"),
      contact: M("erreurContact"), role: M("erreurRole")
    };
  };

  function envoyerPersonne(form) {
    if (!gere()) { return; }
    var g = G();
    var id = form.getAttribute("data-personne");
    var saisie = {
      prenom: form.elements.prenom.value, nom: form.elements.nom.value,
      contact: form.elements.contact.value, role: valeurRadio(form, "role")
    };
    var r = id ? Gr.modifierPersonne(g, id, saisie) : Gr.ajouterPersonne(g, saisie);
    erreurGenerale(form, "");
    if (montrerErreurs(form, ["prenom", "nom", "contact", "role"], r.erreurs || {}, TEXTES_PERSONNE())) { return; }
    if (r.raison === "dernier-gestionnaire") { erreurGenerale(form, M("dernierGestionnaire")); return; }
    if (!r.ok) { return; }
    sauver();
    remplirDemo();
    if (id) {
      message = M("personneModifiee", { nom: Gr.nomComplet(r.personne) });
      aller("#personnes");
    } else {
      // On reste sur le formulaire, vide, pour enchaîner la personne suivante.
      message = M("personneAjoutee", { nom: Gr.nomComplet(r.personne) });
      aller("#personne/nouvelle");
    }
  }

  function retirerPersonne(bouton) {
    var g = G();
    var x = Gr.trouverPersonne(g, bouton.getAttribute("data-retirer"));
    if (!x || !gere()) { return; }
    var form = bouton.closest("form");
    if (Gr.gestionnaires(g).length <= 1 && Gr.peutGerer(g, x)) { erreurGenerale(form, M("dernierGestionnaire")); return; }
    if (!window.confirm(M("confirmerRetrait", { nom: Gr.nomComplet(x) }))) { return; }
    var r = Gr.retirerPersonne(g, x.id);
    if (!r.ok) { erreurGenerale(form, M("dernierGestionnaire")); return; }
    sauver();
    remplirDemo();
    message = M("personneRetiree", { nom: Gr.nomComplet(x) });
    aller(gere() ? "#personnes" : hrefGroupe());
  }

  // ---------- Équipes ----------

  function apercuNoms(g, e) {
    var noms = Gr.membresEquipe(g, e).map(function (p) { return p.prenom; });
    if (!noms.length) { return M("equipeVide"); }
    return noms.length > 4 ? noms.slice(0, 4).join(", ") + " " + M("etAutres", { n: noms.length - 4 }) : noms.join(", ");
  }

  function ecranEquipes() {
    var g = G(), gerer = gere();
    var liste = Gr.equipes(g);
    var html = retour(hrefGroupe(), M("ongletGroupe")) + entete(g.nom, M("equipes"), esc(Mn("nEquipes", liste.length))) + bandeauMessage() +
      (gerer ? '<a class="bouton bouton--principal" id="creer-equipe" href="#equipe/nouvelle">' + esc(M("creerUneEquipe")) + "</a>" : "");
    if (!liste.length) {
      html += '<div class="section">' + etatVide("panneau", M("aucuneEquipe"), esc(M("aucuneEquipeAide"))) + "</div>";
    } else {
      html += '<div class="section">' + liste.map(function (e) {
        return '<a class="carte" id="equipe-' + e.id + '" href="#equipe/' + e.id + '">' +
          '<span class="carte-titre">' + esc(nomEquipe(e)) + "</span>" +
          '<span class="carte-quand">' + esc(Mn("nPersonnes", e.personnes.length)) + "</span>" +
          '<span class="carte-infos">' + esc(apercuNoms(g, e)) + "</span></a>";
      }).join("") + "</div>";
    }
    if (!gerer) { html += '<p class="discret note-bas">' + esc(M("reserveGestion")) + "</p>"; }
    return { titre: M("equipes"), onglet: "groupe", html: html };
  }

  function ecranEquipe(id) {
    var g = G();
    var nouvelle = id === "nouvelle";
    var e = nouvelle ? null : Gr.trouverEquipe(g, id);
    var html = retour("#equipes", M("equipes"));
    if (!nouvelle && !e) {
      return { titre: M("equipes"), onglet: "groupe", html: html + entete(g.nom, M("equipes")) + etatVide("chemin", M("equipeIntrouvable"), "") };
    }
    if (nouvelle && !gere()) { return ecranEquipes(); }
    if (!nouvelle && (e.bureau || !gere())) {
      var membres = Gr.membresEquipe(g, e);
      html += entete(g.nom, nomEquipe(e), esc(Mn("nPersonnes", membres.length))) +
        (membres.length
          ? '<ul class="membres">' + membres.map(function (p) {
            return '<li><span class="membre-nom">' + esc(Gr.nomComplet(p)) + "</span>" +
              '<span class="membre-role">' + esc(p.fonction || nomRole(p.role)) + "</span></li>";
          }).join("") + "</ul>"
          : etatVide("calme", M("equipeVide"), "")) +
        '<p class="discret note-bas">' + esc(e.bureau ? M("equipeBureauNote") : M("reserveGestion")) + "</p>";
      return { titre: nomEquipe(e), onglet: "groupe", html: html };
    }
    var options = Gr.personnesTriees(g).map(function (p) { return { valeur: p.id, titre: Gr.nomComplet(p) }; });
    html += entete(g.nom, nouvelle ? M("creerUneEquipe") : e.nom) +
      '<form class="form-equipe" data-equipe="' + (e ? e.id : "") + '" novalidate>' +
      champ("nom-equipe", M("champNomEquipe"), 'autocomplete="off" autocapitalize="sentences" maxlength="40"' + (e ? ' value="' + esc(e.nom) + '"' : ""), "") +
      choix("membres", M("champMembresEquipe"), options, e ? e.personnes : [], "checkbox", "choix--liste") +
      '<p class="erreur-generale" role="alert"></p>' +
      '<button type="submit" class="bouton bouton--principal">' + esc(nouvelle ? M("creerLEquipe") : M("enregistrerLEquipe")) + "</button>" +
      (nouvelle ? "" : '<button type="button" class="lien-bouton lien-bouton--alerte" data-supprimer-equipe="' + e.id + '">' + esc(M("supprimerLEquipe")) + "</button>") +
      "</form>";
    return { titre: nouvelle ? M("creerUneEquipe") : e.nom, onglet: "groupe", html: html, champ: nouvelle ? "nom-equipe" : null };
  }

  function envoyerEquipe(form) {
    if (!gere()) { return; }
    var g = G();
    var id = form.getAttribute("data-equipe");
    var saisie = {
      nom: form.elements["nom-equipe"].value,
      personnes: Array.prototype.map.call(form.querySelectorAll('input[name="membres"]:checked'), function (c) { return c.value; })
    };
    var r = id ? Gr.modifierEquipe(g, id, saisie) : Gr.creerEquipe(g, saisie);
    var erreurs = r.erreurs ? { "nom-equipe": r.erreurs.nom } : {};
    if (montrerErreurs(form, ["nom-equipe"], erreurs, { "nom-equipe:vide": M("erreurNomEquipeVide"), "nom-equipe:long": M("erreurTropLong") })) { return; }
    if (!r.ok) { return; }
    sauver();
    message = M(id ? "equipeModifiee" : "equipeCreee", { nom: r.equipe.nom });
    aller("#equipes");
  }

  function supprimerEquipe(bouton) {
    var g = G();
    var e = Gr.trouverEquipe(g, bouton.getAttribute("data-supprimer-equipe"));
    if (!e || e.bureau || !gere()) { return; }
    if (!window.confirm(M("confirmerSuppressionEquipe", { nom: e.nom }))) { return; }
    Gr.supprimerEquipe(g, e.id);
    sauver();
    message = M("equipeSupprimee", { nom: e.nom });
    aller("#equipes");
  }

  // ---------- Charte (page interne) ----------

  function ecranCharte() {
    var p = L.paletteAssociation(G().couleur, FOND);
    function ratio(a, b) { return L.contraste(a, b).toFixed(1).replace(".", ",") + ":1"; }
    var nuances = [
      ["Couleur principale", p.principale, M("charteCouleurDetail")],
      ["Bouton principal", p.principaleFond, "Texte " + (p.surPrincipale === "#FFFFFF" ? "blanc" : "foncé") + " : contraste " + ratio(p.surPrincipale, p.principaleFond)],
      ["Principale pour écrire", p.principaleTexte, "Liens et titres de carte : " + ratio(p.principaleTexte, p.principalePale) + " sur la teinte pâle"],
      ["Principale pâle", p.principalePale, "Fonds légers (encadrés, pastilles)"],
      ["Accent bleu canard", "#0B6E77", "« En cours », chiffres, informations : " + ratio("#0B6E77", FOND)],
      ["Alerte", "#B8322A", "Retards et annulation : " + ratio("#B8322A", FOND)],
      ["Fond crème", FOND, "Fond de toutes les pages"],
      ["Texte", "#2A211C", "Texte courant : " + ratio("#2A211C", FOND)],
      ["Texte doux", "#6B5D52", "Informations secondaires : " + ratio("#6B5D52", FOND)]
    ];
    var regleVocabulaire = M("charteRegleVocabulaire");
    var html = retour(hrefGroupe(), M("ongletGroupe")) + entete("Page interne", "Charte graphique", "Ce que chaque écran doit respecter") +
      '<section class="section"><h2 class="section-titre">Règles</h2><ul class="regles">' +
      "<li>Une liste courte ou un résumé par écran ; le détail s'ouvre au toucher.</li>" +
      "<li>Un seul bouton principal par écran.</li>" +
      "<li>Boutons nommés par un verbe et son objet, jamais une icône seule.</li>" +
      "<li>Texte de 16 px minimum, contraste AA (4,5:1).</li>" +
      "<li>Aucun défilement de côté sur un téléphone de 360 px.</li>" +
      (regleVocabulaire ? "<li>" + esc(regleVocabulaire) + "</li>" : "") + "</ul></section>" +

      '<section class="section"><h2 class="section-titre">Couleurs</h2><ul class="nuancier">' +
      nuances.map(function (n) {
        return '<li class="nuance"><span class="nuance-carre" style="background:' + n[1] + '"></span>' +
          '<span><span class="nuance-nom">' + esc(n[0]) + " · " + esc(n[1]) + '</span><span class="nuance-detail">' + esc(n[2]) + "</span></span></li>";
      }).join("") + "</ul></section>" +

      '<section class="section"><h2 class="section-titre">' + esc(M("charteCouleurTitre")) + "</h2>" +
      '<p class="discret">' + esc(M("charteCouleurTexte")) + "</p>" +
      '<div class="choix-couleurs" style="margin-top:10px">' + M("couleurs").map(function (c) {
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
      '<button type="button" class="bouton bouton--principal" data-exemple>' + esc(M("charteExemplePrincipal")) + "</button>" +
      '<button type="button" class="bouton bouton--secondaire" data-exemple>' + esc(M("charteExempleSecondaire")) + "</button>" +
      '<p><a class="lien-suite" href="#charte">Voir le détail</a></p>' +
      '<a class="carte" href="#charte"><span class="carte-etiquette">Carte</span><span class="carte-titre">Un résumé qui s\'ouvre au toucher</span></a>' +
      '<p><span class="etiquette">Manquent 2</span> <span class="etiquette etiquette--alerte">En retard</span> <span class="etiquette etiquette--ok">Complet</span></p>' +
      '<ul class="actions"><li class="action"><div class="action-texte"><p class="action-libelle">Statut d\'une action</p><p class="action-meta">On touche l\'étiquette pour avancer</p></div>' +
      '<span class="statut statut--en-cours" style="display:inline-flex;align-items:center;justify-content:center">En cours</span></li></ul>' +
      etatVide("calme", "État vide", "Une petite illustration et une phrase qui dit quoi faire.") +
      "</section>";
    return { titre: "Charte graphique", onglet: "groupe", html: html };
  }

  function choisirCouleur(couleur) {
    G().couleur = couleur;
    sauver();
    appliquerCouleur();
    rendre({ garderDefilement: true });
  }

  // ---------- Aide (lien texte en haut de chaque écran) ----------

  function ecranAide() {
    var questions = M("aideQuestions");
    var html = entete(G().nom, M("aideTitre"), esc(M("aideSousTitre"))) +
      '<div class="questions">' + questions.map(function (q, i) {
        return '<details class="repli" id="question-' + (i + 1) + '"><summary><span class="repli-titres">' + esc(q[0]) + "</span></summary>" +
          '<div class="repli-corps"><p>' + esc(q[1]) + "</p></div></details>";
      }).join("") + "</div>" +
      '<section class="section">' + etatVide("chemin", M("aideAutre"), esc(M("aideAutreTexte"))) + "</section>";
    return { titre: M("aideTitre"), onglet: null, aide: true, html: html };
  }

  // ---------- Démo (outil du testeur) : créer un groupe, enregistrer et ouvrir un essai ----------

  function hexCouleurs() { return M("couleurs").map(function (c) { return c[1]; }); }

  function ecranCreerGroupe() {
    var sortes = M("sortes");
    var html = retour("#accueil", M("ongletAccueil")) +
      entete(D("etiquette"), M("creerGroupeTitre"), esc(M("creerGroupeSousTitre"))) + avertissement() +
      '<form class="form-groupe" novalidate>' +
      champ("nom-groupe", M("champNomGroupe"), 'autocomplete="off" autocapitalize="sentences" maxlength="60"', M("champNomGroupeAide")) +
      choix("sorte", M("champSorte"), Gr.SORTES.map(function (s) { return { valeur: s, titre: sortes[s][0], detail: sortes[s][1] }; }), ["simple"]) +
      choix("couleur", M("champCouleur"), M("couleurs").map(function (c) { return { valeur: c[1], titre: c[0], pastille: c[1] }; }), [M("couleurs")[0][1]], "radio", "choix--couleurs") +
      champ("prenom-createur", M("champVotrePrenom"), 'autocomplete="given-name" autocapitalize="words" maxlength="40"', M("champVotrePrenomAide")) +
      '<p class="erreur-generale" role="alert"></p>' +
      '<button type="submit" class="bouton bouton--principal">' + esc(M("creerLeGroupe")) + "</button>" +
      "</form>";
    return { titre: M("creerGroupeTitre"), onglet: null, html: html, champ: "nom-groupe" };
  }

  function envoyerGroupe(form) {
    var saisie = {
      nom: form.elements["nom-groupe"].value, sorte: valeurRadio(form, "sorte"),
      couleur: valeurRadio(form, "couleur"), prenom: form.elements["prenom-createur"].value
    };
    var r = Gr.creerGroupe(etat, saisie, hexCouleurs());
    var e = r.erreurs || {};
    var erreurs = { "nom-groupe": e.nom, sorte: e.sorte, couleur: e.couleur, "prenom-createur": e.prenom };
    if (montrerErreurs(form, ["nom-groupe", "sorte", "couleur", "prenom-createur"], erreurs, {
      "nom-groupe:vide": M("erreurNomGroupeVide"), "nom-groupe:long": M("erreurNomGroupeLong"),
      sorte: M("champSorte"), couleur: M("champCouleur"),
      "prenom-createur:vide": M("erreurPrenomVide"), "prenom-createur:long": M("erreurTropLong")
    })) { return; }
    sauver();
    moisAffiche = null;
    appliquerCouleur();
    remplirOnglets();
    remplirDemo();
    message = M("groupeCree", { nom: r.groupe.nom });
    aller("#personnes");
  }

  function ecranEnregistrer() {
    var nbPersonnes = etat.groupes.reduce(function (n, g) { return n + g.personnes.length; }, 0);
    var partage = typeof navigator.canShare === "function" && typeof File === "function";
    var html = retour("#accueil", M("ongletAccueil")) + entete(D("etiquette"), M("enregistrerTitre")) + avertissement() +
      "<p>" + esc(M("enregistrerTexte")) + "</p>" +
      '<p class="discret note-bas">' + esc(M("enregistrerContenu", { groupes: Mn("nGroupes", etat.groupes.length), personnes: Mn("nPersonnes", nbPersonnes) })) + "</p>" +
      '<div class="section">' +
      '<button type="button" class="bouton bouton--principal" data-enregistrer-essai>' + esc(M("enregistrerBouton")) + "</button>" +
      (partage ? '<button type="button" class="bouton bouton--secondaire" data-envoyer-essai>' + esc(M("envoyerBouton")) + "</button>" : "") +
      '<p class="message-ok" id="essai-statut" role="status" hidden></p></div>';
    return { titre: M("enregistrerTitre"), onglet: null, html: html };
  }

  function fichierEssai() {
    var nom = Gr.nomFichierEssai();
    return { nom: nom, texte: Gr.exporterEssai(etat) };
  }

  function statutEssai(texte) {
    var z = document.getElementById("essai-statut");
    if (z) { z.hidden = !texte; z.textContent = texte; }
  }

  function enregistrerEssai() {
    var f = fichierEssai();
    var url = URL.createObjectURL(new Blob([f.texte], { type: "application/json" }));
    telecharger(f.nom, url);
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    statutEssai(M("essaiEnregistre", { nom: f.nom }));
  }

  function envoyerEssai() {
    var f = fichierEssai();
    var fichier = new File([f.texte], f.nom, { type: "application/json" });
    if (!navigator.canShare || !navigator.canShare({ files: [fichier] })) { statutEssai(M("essaiEnvoiImpossible")); return; }
    navigator.share({ files: [fichier], title: M("enregistrerTitre") }).catch(function (err) {
      if (!err || err.name !== "AbortError") { statutEssai(M("essaiEnvoiImpossible")); }
    });
  }

  function ecranOuvrir() {
    var html = retour("#accueil", M("ongletAccueil")) + entete(D("etiquette"), M("ouvrirTitre")) +
      "<p>" + esc(M("ouvrirTexte")) + "</p>" +
      '<div class="section">' +
      '<input type="file" id="fichier-essai" class="visuellement-cache">' +
      '<label class="bouton bouton--principal" for="fichier-essai">' + esc(M("choisirFichier")) + "</label>" +
      '<p class="champ-erreur" id="essai-erreur" role="alert"></p></div>';
    return { titre: M("ouvrirTitre"), onglet: null, html: html };
  }

  function ouvrirEssai(fichier) {
    var zone = document.getElementById("essai-erreur");
    var lecteur = new FileReader();
    lecteur.onload = function () {
      var r = Gr.lireEssai(String(lecteur.result), DONNEES.version);
      if (!r.ok) { zone.textContent = M(r.raison === "ancien" ? "essaiAncien" : "essaiIllisible"); return; }
      if (!window.confirm(M("confirmerOuvrir", { nom: fichier.name }))) { return; }
      etat = r.etat;
      sauver();
      creneauOuvert = null; annulationFaite = null; qrVisible = false; moisAffiche = null;
      appliquerCouleur();
      remplirOnglets();
      remplirDemo();
      var nb = etat.groupes.reduce(function (n, g) { return n + g.personnes.length; }, 0);
      message = M("essaiOuvert", { groupes: Mn("nGroupes", etat.groupes.length), personnes: Mn("nPersonnes", nb) });
      aller("#accueil");
    };
    lecteur.onerror = function () { zone.textContent = M("essaiIllisible"); };
    lecteur.readAsText(fichier);
  }

  // ---------- Espace parent : tableau des coups de main ----------
  // Le lien des parents marche quel que soit le groupe ouvert dans la démo :
  // on cherche l'événement (ou l'inscription) dans tous les groupes.

  function evenementPartout(id) {
    for (var i = 0; i < etat.groupes.length; i++) {
      var g = etat.groupes[i];
      var e = g.evenements ? L.trouverEvenement(g, id) : null;
      if (e) { return { groupe: g, evenement: e }; }
    }
    return null;
  }

  function inscriptionPartout(jeton) {
    for (var i = 0; i < etat.groupes.length; i++) {
      var g = etat.groupes[i];
      var t = g.evenements ? L.trouverInscription(g, jeton) : null;
      if (t) { t.groupe = g; return t; }
    }
    return null;
  }

  function ecranInscription(id) {
    var trouve = evenementPartout(id);
    var e = trouve && trouve.evenement;
    if (!e || !e.creneaux.length || L.estPasse(e)) { return lienInconnu(); }
    var asso = trouve.groupe;
    var date = L.dateEvenement(e);
    var html = '<header class="affiche">' +
      '<p class="surtitre">' + esc(asso.nom) + (asso.ecole ? " · " + esc(asso.ecole) : "") + "</p>" +
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
    var trouve = evenementPartout(form.getAttribute("data-evenement"));
    var r = trouve ? L.inscrire(trouve.groupe, trouve.evenement.id, form.getAttribute("data-creneau"), saisie) : { ok: false, raison: "introuvable" };
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
    var t = inscriptionPartout(jeton);
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
    var t = inscriptionPartout(jeton);
    if (!t) { return; }
    var ics = L.fichierAgenda(t.groupe, t.evenement, t.creneau, lienPersonnel(jeton), null, jeton);
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
    var t = inscriptionPartout(jeton);
    if (!t) { return lienInconnu(); }
    var html = '<section class="confirmation">' +
      '<p class="surtitre">' + esc(t.groupe.nom) + "</p>" +
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
    var t = inscriptionPartout(jeton);
    if (!t) { return; }
    annulationFaite = { jeton: jeton, creneau: t.creneau.titre + ", " + t.creneau.horaire, evenementId: t.evenement.id };
    L.annuler(t.groupe, jeton);
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
      titre: M("pageIntrouvable"), onglet: null,
      html: '<section class="confirmation"><h1 tabindex="-1">' + esc(M("pageIntrouvable")) + "</h1>" +
        etatVide("chemin", M("pageIntrouvableAide"), "", '<a class="lien-suite" href="#accueil">' + esc(M("revenirAccueil")) + "</a>") + "</section>"
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

  // Écrans propres aux associations : un groupe simple n'en a pas.
  var ECRANS_ASSOCIATION = ["mes-actions", "rappels", "evenements", "evenement"];

  function rendre(options) {
    var morceaux = adresseActuelle().split("/").map(decodeURIComponent);
    var r;
    if (!estAsso() && ECRANS_ASSOCIATION.indexOf(morceaux[0]) >= 0) { morceaux = ["introuvable"]; }
    switch (morceaux[0]) {
      case "accueil": r = ecranAccueil(); break;
      case "mes-actions": r = ecranMesActions(morceaux[1] === "toutes"); break;
      case "rappels": r = ecranRappels(); break;
      case "evenements": r = ecranEvenements(); break;
      case "evenement": r = ecranEvenement(morceaux[1], morceaux[2]); break;
      case "association": case "groupe": r = ecranGroupe(); break;
      case "personnes": r = ecranPersonnes(); break;
      case "personne": r = ecranPersonne(morceaux[1]); break;
      case "equipes": r = ecranEquipes(); break;
      case "equipe": r = ecranEquipe(morceaux[1]); break;
      case "charte": r = ecranCharte(); break;
      case "aide": r = ecranAide(); break;
      case "demo":
        r = morceaux[1] === "groupe" ? ecranCreerGroupe() : morceaux[1] === "enregistrer" ? ecranEnregistrer() :
          morceaux[1] === "ouvrir" ? ecranOuvrir() : introuvable();
        break;
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
    // Lien « Aide » en haut de chaque écran (sauf l'espace parent et la page d'aide elle-même).
    var aide = parent || r.aide ? "" : '<a class="lien-aide" id="lien-aide" href="#aide">' + esc(M("lienAide")) + "</a>";
    vue.innerHTML = aide + r.html;
    document.title = r.titre + " — " + (parent ? "" : G().nom + " — ") + "prototype";
    Array.prototype.forEach.call(document.querySelectorAll("[data-onglet]"), function (a) {
      if (a.getAttribute("data-onglet") === r.onglet) { a.setAttribute("aria-current", "page"); }
      else { a.removeAttribute("aria-current"); }
    });
    if (options && options.garderDefilement) {
      window.scrollTo(0, defilement);
    } else {
      window.scrollTo(0, 0);
      var champ = r.champ && document.getElementById("champ-" + r.champ);
      var h1 = vue.querySelector("h1");
      if (champ && options && options.focus) { champ.focus({ preventScroll: true }); }
      else if (h1 && options && options.focus) { h1.focus({ preventScroll: true }); }
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

  // ---------- Menu du bas : Accueil · Événements · Association (groupe simple : Accueil · Groupe) ----------

  var ICONES = {
    accueil: '<path d="M3.5 10.5 12 4l8.5 6.5"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-5.5h4V20"/>',
    evenements: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    groupe: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.6-3.4 3-5.3 6-5.3s5.4 1.9 6 5.3"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16.5 14.3c2.4.1 4.1 1.8 4.5 4.7"/>'
  };

  function remplirOnglets() {
    var entrees = [["accueil", "#accueil", M("ongletAccueil")]];
    if (estAsso()) { entrees.push(["evenements", "#evenements", M("ongletEvenements")]); }
    entrees.push(["groupe", hrefGroupe(), M("ongletGroupe")]);
    document.getElementById("onglets").innerHTML = entrees.map(function (x) {
      return '<a href="' + x[1] + '" data-onglet="' + x[0] + '"><span class="icone"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES[x[0]] +
        "</svg></span><span>" + esc(x[2]) + "</span></a>";
    }).join("");
  }

  // ---------- Menu de démo (outil du testeur, ouvert à tous les rôles) ----------

  function remplirDemo() {
    var g = G(), p = moi();
    var vg = Gr.estAssociation(g) && L.trouverEvenement(g, "vide-grenier");
    document.getElementById("demo-etiquette").textContent = D("etiquette");
    document.getElementById("demo-ouvrir").textContent = D("bouton");
    document.getElementById("demo-retour").textContent = D("retourEspace");
    document.getElementById("demo-menu").innerHTML =
      '<label class="demo-ligne" for="demo-groupe">' + esc(D("changerDeGroupe")) + ' <select id="demo-groupe">' +
      etat.groupes.map(function (x) {
        return '<option value="' + x.id + '"' + (x.id === g.id ? " selected" : "") + ">" + esc(x.nom) + "</option>";
      }).join("") + "</select></label>" +
      '<label class="demo-ligne" for="demo-utilisateur">' + esc(D("changerDePersonne")) + ' <select id="demo-utilisateur">' +
      Gr.personnesTriees(g).map(function (x) {
        return '<option value="' + x.id + '"' + (x.id === p.id ? " selected" : "") + ">" +
          esc(Gr.nomComplet(x)) + " — " + esc(minuscule(nomRole(x.role))) + "</option>";
      }).join("") + "</select></label>" +
      '<a class="demo-ligne" href="#demo/groupe">' + esc(D("creerUnGroupe")) + "</a>" +
      (vg && vg.creneaux.length ? '<a class="demo-ligne" href="#inscription/vide-grenier">' + esc(D("voirEspaceParent")) + "</a>" : "") +
      '<a class="demo-ligne" href="#demo/enregistrer">' + esc(D("enregistrerMonEssai")) + "</a>" +
      '<a class="demo-ligne" href="#demo/ouvrir">' + esc(D("ouvrirUnEssai")) + "</a>" +
      '<button type="button" class="demo-ligne demo-reinit" data-reinitialiser>' + esc(M("reinitialiser")) + "</button>";
  }

  function basculerMenu(forcer) {
    var bouton = document.getElementById("demo-ouvrir");
    var menu = document.getElementById("demo-menu");
    var ouvrir = typeof forcer === "boolean" ? forcer : menu.hidden;
    menu.hidden = !ouvrir;
    bouton.setAttribute("aria-expanded", String(ouvrir));
  }

  // Après un changement de groupe ou de personne : l'écran du groupe le plus proche.
  function apresChangement() {
    basculerMenu(false);
    moisAffiche = null;
    appliquerCouleur();
    remplirOnglets();
    remplirDemo();
    var h = adresseActuelle().split("/")[0];
    var garder = ["accueil", "association", "groupe", "personnes", "equipes", "aide", "charte"];
    if (document.body.classList.contains("espace-parent") || garder.indexOf(h) < 0) { aller("#accueil"); }
    else if (h === "association" || h === "groupe") { aller(hrefGroupe()); }
    else { rendre(); }
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
    if (cible.hasAttribute("data-retirer")) { retirerPersonne(cible); return; }
    if (cible.hasAttribute("data-supprimer-equipe")) { supprimerEquipe(cible); return; }
    if (cible.hasAttribute("data-enregistrer-essai")) { enregistrerEssai(); return; }
    if (cible.hasAttribute("data-envoyer-essai")) { envoyerEssai(); return; }
    if (cible.hasAttribute("data-qr")) {
      qrVisible = !qrVisible;
      document.getElementById("qr").hidden = !qrVisible;
      cible.setAttribute("aria-expanded", String(qrVisible));
      cible.textContent = qrVisible ? "Masquer le QR code" : "Afficher le QR code";
      return;
    }
    if (cible.id === "demo-ouvrir") { basculerMenu(); return; }
    if (cible.hasAttribute("data-reinitialiser")) {
      if (window.confirm(M("confirmerReinitialiser"))) {
        reinitialiser();
        remplirOnglets();
        remplirDemo();
        basculerMenu(false);
        aller("#accueil");
      }
      return;
    }
    if (cible.closest("#demo-menu") && cible.tagName === "A") { basculerMenu(false); }
  });

  document.addEventListener("change", function (ev) {
    var c = ev.target;
    if (c.id === "demo-groupe") {
      etat.groupeActif = c.value;
      sauver();
      apresChangement();
    } else if (c.id === "demo-utilisateur") {
      etat.personneActive = etat.personneActive || {};
      etat.personneActive[G().id] = c.value;
      sauver();
      apresChangement();
    } else if (c.id === "fichier-essai" && c.files && c.files[0]) {
      ouvrirEssai(c.files[0]);
      c.value = "";
    }
  });

  document.addEventListener("submit", function (ev) {
    var f = ev.target;
    var envois = { formulaire: envoyerFormulaire, "form-personne": envoyerPersonne, "form-equipe": envoyerEquipe, "form-groupe": envoyerGroupe };
    Object.keys(envois).forEach(function (classe) {
      if (f.classList.contains(classe)) { ev.preventDefault(); envois[classe](f); }
    });
  });

  window.addEventListener("hashchange", function () {
    creneauOuvert = null;
    qrVisible = false;
    rendre({ focus: true });
  });

  appliquerCouleur();
  remplirOnglets();
  remplirDemo();
  rendre();
})();
