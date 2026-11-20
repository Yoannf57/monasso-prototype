/*
  Affichage du prototype. Deux espaces bien séparés :
  - espace du groupe : menu fixe en bas (Accueil · Messages · Événements · Association pour une association,
    Accueil · Messages · Groupe pour un groupe simple), lien « Aide » en haut de chaque écran ;
  - espace parent : arrivée par le lien ou le QR code, aucune navigation.
  Plusieurs groupes (demande 005) : un groupe simple n'a ni événements ni bureau.
  Les mots des nouveaux écrans et ceux qui changent selon la sorte de groupe viennent de mots.js.
  Règle de la charte : chaque écran montre une liste courte ou un résumé,
  le détail s'ouvre au toucher, et il y a au plus un bouton principal par écran
  (seule exception : la paire « Oui » / « Non » d'un message).
  Ce qu'un testeur saisit est gardé dans le navigateur (localStorage).
*/
(function () {
  "use strict";

  var L = window.Logique;
  var Gr = window.Groupes;
  var Ev = window.Evenements;
  var Msg = window.Messages;
  var CLE = "monasso-prototype-groupes"; // les essais des versions précédentes restent à part
  var FOND = "#FFF7EC"; // même valeur que --fond dans style.css
  var etat = charger();
  var creneauOuvert = null;   // créneau dont le formulaire est déplié (espace parent)
  var annulationFaite = null; // dernière inscription annulée
  var qrVisible = false;      // encart QR code (espace bureau)
  var moisAffiche = null;     // mois montré par le calendrier (null : choisi automatiquement)
  var message = null;         // phrase de confirmation montrée une fois sur l'écran suivant
  var reponseAccueil = null;  // dernière réponse donnée depuis l'accueil : { id, reponse }
  var reglageEnregistre = false; // « Réglage enregistré. », montré une fois sur la page du groupe
  var commentaireFait = null; // dernier geste sur un commentaire, dit une fois sous le champ : { id, quoi }
  var anciensDeplies = null;  // message dont les commentaires plus anciens sont dépliés

  // ---------- Mémoire du navigateur ----------

  function cloner(o) { return JSON.parse(JSON.stringify(o)); }

  function etatInitial() {
    var e = cloner(DONNEES);
    e.groupeActif = DONNEES.groupeParDefaut;
    e.personneActive = {};
    return Gr.rattacherActions(e);
  }

  function charger() {
    try {
      var texte = window.localStorage.getItem(CLE);
      if (texte) {
        var e = JSON.parse(texte);
        // Reprise d'un état gardé avant la demande 005b : les actions y tenaient au prénom.
        if (e && e.version === DONNEES.version && Array.isArray(e.groupes) && e.groupes.length) { return Gr.rattacherActions(e); }
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
    reponseAccueil = null;
    reglageEnregistre = false;
    commentaireFait = null;
    anciensDeplies = null;
    appliquerCouleur();
  }

  // ---------- Groupe et personne simulés ----------

  function G() { return Gr.groupeActif(etat); }
  function moi() { return Gr.personneActive(etat, G()); }
  function gere() { return Gr.peutGerer(G(), moi()); }
  function estAsso() { return Gr.estAssociation(G()); }
  function hrefGroupe() { return estAsso() ? "#association" : "#groupe"; }

  // Un mot de mots.js, pris dans la liste de la sorte du groupe, sinon dans la liste commune.
  function remplacer(texte, valeurs) {
    return texte.replace(/\{(\w+)\}/g, function (tout, k) { return Object.prototype.hasOwnProperty.call(valeurs, k) ? valeurs[k] : tout; });
  }
  function mot(sorte, cle, valeurs) {
    var liste = MOTS[sorte] || {};
    var v = Object.prototype.hasOwnProperty.call(liste, cle) ? liste[cle] : MOTS.commun[cle];
    if (v === undefined) { throw new Error("Mot manquant dans mots.js : " + cle); }
    return typeof v === "string" && valeurs ? remplacer(v, valeurs) : v;
  }
  function M(cle, valeurs) { return mot(G().sorte, cle, valeurs); }
  // Les mots d'une association, quel que soit le groupe ouvert dans la démo : pour les pages des parents
  // (leur lien marche toujours) et pour ce qui est gardé avec un événement.
  function MA(cle, valeurs) { return mot("association", cle, valeurs); }
  function D(cle) { return MOTS.commun.demo[cle]; }
  // Compte avec accord : Mn("nPersonnes", 3) → « 3 personnes ». D'autres valeurs peuvent suivre ({nom}…).
  function Mn(cle, n, valeurs) {
    var f = M(cle), v = { n: n };
    Object.keys(valeurs || {}).forEach(function (k) { v[k] = valeurs[k]; });
    return remplacer(n > 1 ? f[1] : f[0], v);
  }
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

  // « 16 h », « 16 h 30 » ; « 16 h – 18 h » ; début seul : « à partir de 16 h » ; rien sans heure de début.
  function heureLisible(hhmm) {
    var p = String(hhmm).split(":");
    return p[1] === "00" ? MA("heureRonde", { h: Number(p[0]) }) : MA("heureMinutes", { h: Number(p[0]), min: p[1] });
  }
  function horaires(debut, fin) {
    if (!debut) { return ""; }
    return fin ? MA("horaireDeA", { debut: heureLisible(debut), fin: heureLisible(fin) }) : MA("horaireAPartirDe", { debut: heureLisible(debut) });
  }

  // Date, puis horaires s'il y en a, puis lieu s'il y en a : rien à la place d'un champ vide.
  function quandOu(e, date) {
    return [date, horaires(e.debut, e.fin), e.lieu].filter(Boolean).join(" · ");
  }

  // Nom d'une échéance dans la liste des actions. Les actions des données d'exemple gardent leur texte
  // (« 6 semaines avant ») ; celles créées à la main : « Le jour J », « La veille », « N jours avant »,
  // ou la date en toutes lettres pour une échéance à date précise.
  function titreEcheance(a, e) {
    if (a.echeance) { return a.echeance; }
    if (a.dateLimite) { return dateLongue(L.dateLimite(a, e)); }
    if (a.joursAvant === 0) { return MA("echeanceJourJ"); }
    if (a.joursAvant === 1) { return MA("echeanceVeille"); }
    return MA("echeanceNJoursAvant", { n: a.joursAvant });
  }
  function groupesEcheance(e) { return L.grouperParEcheance(e, function (a) { return titreEcheance(a, e); }); }
  function peutModifier(e) { return gere() && !L.estPasse(e); }

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
    if (contexte !== "mes-actions" && nomReferent(a)) { meta.push(esc(nomReferent(a))); }
    meta.push('<span class="action-quand">' + esc(quandAction(a, e)) + "</span>");
    var texte = '<p class="action-libelle">' + esc(a.libelle) + "</p>" + '<p class="action-meta">' + meta.join(" · ") + "</p>";
    // Dans l'événement, pour le bureau : le libellé (et la ligne dessous) ouvre l'action pour la modifier.
    var ouvre = contexte === "evenement" && peutModifier(e);
    return '<li class="action action--' + esc(a.statut) + (retard ? " action--retard" : "") + '" id="action-' + esc(a.id) + '" data-contexte="' + esc(contexte) + '">' +
      (ouvre
        ? '<a class="action-texte action-texte--lien" href="#evenement/' + esc(e.id) + "/action/" + esc(a.id) + '">' + texte + "</a>"
        : '<div class="action-texte">' + texte + "</div>") +
      // L'état se touche pour le référent de l'action et pour le bureau ; les autres le lisent sur une étiquette,
      // qui n'est pas un bouton (demande 006b).
      (peutChangerEtat(a)
        ? '<button type="button" class="statut statut--' + esc(a.statut) + '" data-action="' + esc(a.id) + '" data-evenement="' + esc(e.id) + '"' +
          ' aria-label="' + esc(a.libelle) + " : " + esc(L.LIBELLES_STATUT[a.statut]) + ". Touchez pour passer à « " + esc(L.LIBELLES_STATUT[suivant]) + " »." + '">' +
          esc(L.LIBELLES_STATUT[a.statut]) + "</button>"
        : '<span class="etiquette">' + esc(L.LIBELLES_STATUT[a.statut]) + "</span>") +
      "</li>";
  }

  // Le prénom affiché sur une action : celui de sa personne aujourd'hui (elle a pu être renommée) ;
  // si elle n'est plus dans le groupe, le prénom noté sur l'action.
  // Une action confiée à une équipe porte le nom de l'équipe à la place du prénom.
  function nomReferent(a) {
    if (a.equipeId) {
      var equipe = Gr.trouverEquipe(G(), a.equipeId);
      return equipe ? nomEquipe(equipe) : (a.referent || "");
    }
    var p = Gr.referentAction(G(), a);
    return p ? p.prenom : (a.referent || "");
  }

  function peutChangerEtat(a) { return Ev.peutChangerEtat(G(), moi(), a); }

  function changerStatut(bouton) {
    // La règle refuse le geste de qui n'est ni le référent de l'action ni du bureau : un bouton fabriqué à la main ne change rien.
    var r = Ev.changerEtatAction(G(), moi(), bouton.getAttribute("data-evenement"), bouton.getAttribute("data-action"));
    if (!r.ok) { return; }
    var e = r.evenement, a = r.action;
    sauver();
    // On remplace la ligne sur place : elle reste visible jusqu'au prochain écran.
    var li = document.getElementById("action-" + a.id);
    li.outerHTML = ligneAction(a, e, li.getAttribute("data-contexte"));
    document.querySelector("#action-" + esc(a.id) + " .statut").focus();
    var av = document.getElementById("avancement");
    if (av) {
      av.innerHTML = texteAvancement(e);
      document.getElementById("barre").style.width = pourcentage(e) + "%";
      groupesEcheance(e).forEach(function (g, i) {
        var meta = document.getElementById("groupe-meta-" + i);
        if (meta && g.actions.indexOf(a) >= 0) { meta.innerHTML = metaGroupe(g, e); }
      });
    }
  }

  // ---------- Accueil : trois blocs au plus, chacun ouvre son détail ----------

  function ecranAccueil() {
    if (!estAsso()) { return ecranAccueilGroupe(); }
    var p = moi();
    var html = entete(G().nom, M("bonjour", { prenom: p.prenom }), esc(dateLongue(L.aujourdhui()))) + bandeauMessage() + blocARepondre();

    var prochain = L.evenementsAVenir(G())[0];
    if (prochain) {
      var retards = prochain.actions.filter(function (a) { return L.estEnRetard(a, prochain); }).length;
      var infos = [];
      // Demande 008 : la ligne « N actions en retard » de ce bloc n'est montrée qu'au bureau.
      if (retards && gere()) { infos.push('<span class="texte-alerte">' + pluriel(retards, "action en retard", "actions en retard") + "</span>"); }
      if (prochain.creneaux.length) { infos.push(L.compterInscrits(prochain) + " coups de main sur " + esc(L.compterPlaces(prochain))); }
      html += '<a class="carte" id="bloc-prochain" href="#evenement/' + esc(prochain.id) + '">' +
        '<span class="carte-etiquette">Prochain événement ' + etiquettePreparation(prochain) + "</span>" +
        '<span class="carte-ligne">' + pastilleDate(L.dateEvenement(prochain)) +
        '<span><span class="carte-titre">' + esc(prochain.titre) + "</span>" +
        '<span class="carte-quand">' + esc([quandEvenement(prochain), prochain.lieu].filter(Boolean).join(" · ")) + "</span></span></span>" +
        (infos.length ? '<span class="carte-infos">' + infos.join(" · ") + "</span>" : "") + "</a>";
    }

    var m = L.actionsAFaire(G(), p);
    var premiere = m.enRetard[0] || m.cetteSemaine[0] || m.plusTard[0];
    var blocActions = '<a class="carte" id="bloc-actions" href="#mes-actions">' +
      '<span class="carte-etiquette">Mes actions à faire</span>' +
      '<span class="bloc-chiffre"><span class="grand-nombre">' + m.total + "</span><span>" +
      (m.total ? (m.enRetard.length ? '<span class="texte-alerte">dont ' + m.enRetard.length + " en retard</span>" : "rien en retard") : "tout est fait") +
      "</span></span>" +
      (premiere ? '<span class="carte-infos">' + esc(premiere.action.libelle) + "</span>" : "") + "</a>";
    // Demande 007c : pour le bureau, la ligne des créneaux est un lien à elle, vers la liste des créneaux en manque ;
    // le reste du bloc ouvre toujours « Mes actions ». Sans la ligne, le bloc reste une carte.
    var nbManque = rappels().length;
    // Demande 008 (décisions du 2026-11-19) : pas de bloc pour qui n'a aucune action, faite ou à faire, quel que soit son rôle.
    // Seule exception, pour tenir aussi « la ligne des créneaux reste dans Mes actions à faire » : une personne du bureau sans action
    // garde le bloc tant qu'il reste des créneaux en manque ; il porte alors cette ligne (nbManque vaut toujours 0 hors du bureau).
    if (L.aDesActions(G(), p) || nbManque) {
      html += nbManque
        ? '<div class="bloc-liens">' + blocActions +
          '<a class="lien-suite" id="ligne-rappels" href="#creneaux-manquants">' + esc(Mn("accueilRappelsCreneaux", nbManque)) + "</a></div>"
        : blocActions;
    }

    return { titre: M("ongletAccueil"), onglet: "accueil", html: html };
  }

  // Accueil d'un groupe simple (demande 008, décision du 2026-11-19) : deux blocs, « À répondre » et « Prochains rendez-vous ».
  // « Personnes » et « Mes équipes » sont dans l'onglet « Groupe ».
  function ecranAccueilGroupe() {
    var g = G(), p = moi();
    var html = entete(g.nom, M("bonjour", { prenom: p.prenom }), esc(dateLongue(L.aujourdhui()))) + bandeauMessage() + blocARepondre() + blocRendezVous();
    return { titre: M("ongletAccueil"), onglet: "accueil", html: html };
  }

  // N10 : une ligne de rendez-vous dans un bloc. La ligne entière ouvre le message.
  function ligneRendezVous(href, quand, question, compteur) {
    return '<li><a class="personne personne--lien" href="' + href + '">' +
      '<span class="personne-detail">' + esc(quand) + "</span>" +
      '<span class="personne-nom">' + esc(question) + "</span>" +
      '<span class="personne-detail">' + esc(compteur) + "</span></a></li>";
  }

  // « Prochains rendez-vous » : les trois prochains au plus, le plus proche d'abord ; « Voir le calendrier » en dernière ligne, toujours.
  function blocRendezVous() {
    var g = G();
    var liste = Msg.prochainsRendezVous(g, moi()).slice(0, 3);
    return '<section class="bloc-reponse" id="bloc-rendez-vous" aria-labelledby="titre-rendez-vous">' +
      '<h2 class="carte-etiquette" id="titre-rendez-vous">' + esc(M("msgAccueilRendezVous")) + "</h2>" +
      (liste.length
        ? '<ul class="lignes-bloc">' + liste.map(function (x) {
          return ligneRendezVous("#message/" + esc(x.message.id), quandRendezVous(x.message), x.message.texte, texteCompteur(Msg.decompte(g, x.message)));
        }).join("") + "</ul>"
        : '<p class="calme">' + esc(M("msgAucunRendezVous")) + '</p><p class="calme">' + esc(M("msgAucunRendezVousAide")) + "</p>") +
      '<a class="lien-suite" id="voir-calendrier" href="#calendrier">' + esc(M("msgVoirCalendrier")) + "</a></section>";
  }

  // ---------- Détail : mes actions (ou toutes) ----------

  function ecranMesActions(toutes) {
    var p = moi();
    var r = L.actionsAFaire(G(), toutes ? null : p);
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
    // Sections, dans cet ordre : « En retard », « Cette semaine », « Plus tard ». Plus aucun créneau ici (décision du 2026-11-19, soir) :
    // la section « Rappels » faisait doublon avec l'écran des créneaux en manque.
    var groupes = [["En retard", r.enRetard, true], ["Cette semaine", r.cetteSemaine, false]];
    if (!toutes) { groupes.push(["Plus tard", r.plusTard, false]); }
    groupes = groupes.filter(function (g) { return g[1].length; });
    if (!groupes.length) {
      html += '<div class="section">' + etatVide("calme", toutes ? "Rien en retard ni cette semaine." : "Tout est fait.", "Les nouvelles actions apparaîtront ici.") + "</div>";
    } else {
      groupes.forEach(function (g) { html += section(g[0], g[1], g[2]); });
    }
    // La phrase sur l'étiquette ne s'affiche que si la personne peut changer l'état d'une action de l'écran.
    var touchable = !groupes.length || groupes.some(function (g) { return g[1].some(function (x) { return peutChangerEtat(x.action); }); });
    var note = (touchable ? "Touchez l\'étiquette d\'une action pour changer son statut." : "") + (toutes ? " Les autres actions sont dans chaque événement." : "");
    if (note) { html += '<p class="discret note-bas">' + note.trim() + "</p>"; }
    return { titre: toutes ? "Toutes les actions" : "Mes actions", onglet: "accueil", html: html };
  }

  // ---------- Créneaux en manque, pour le bureau seul ----------

  // Les créneaux remplis à moins de la moitié. Personne d'autre que le bureau ne les reçoit.
  function rappels() { return estAsso() && gere() ? L.creneauxEnManque(G()) : []; }

  // ---------- Créneaux en manque : la liste entière, sur un écran à part, pour le bureau seul (demande 007c) ----------

  // Une ligne : le créneau, « événement · horaire », puis combien il manque. Un toucher ouvre les coups de main de l'événement.
  function carteCreneauManquant(m) {
    return '<a class="carte" href="#evenement/' + esc(m.evenement.id) + '/coups-de-main">' +
      '<span class="carte-titre">' + esc(m.creneau.titre) + "</span>" +
      // Le point médian tient à l'horaire : si l'horaire passe à la ligne, le point est masqué (jamais seul en bout de ligne).
      '<span class="carte-quand suite"><span class="suite-part">' + esc(m.evenement.titre) + "</span>" +
      (m.creneau.horaire ? '<span class="suite-part insecable"><span class="suite-point"> · </span>' + esc(m.creneau.horaire) + "</span>" : "") + "</span>" +
      '<span class="carte-infos"><span class="etiquette etiquette--alerte">' + esc(Mn("creneauManque", m.manque)) + "</span></span></a>";
  }

  // Rien entre le titre et le premier créneau, sauf la ligne d'aide : le premier créneau se voit sans défiler.
  function ecranCreneauxManquants() {
    var manque = rappels();
    var html = retour("#accueil", M("ongletAccueil"));
    if (manque.length) {
      html += entete(null, M("creneauxManqueTitre"), esc(M("accueilRappelsAide"))) +
        '<div id="creneaux-manquants">' + manque.map(carteCreneauManquant).join("") + "</div>";
    } else {
      html += entete(null, M("creneauxManqueTitre")) +
        etatVide("calme", M("creneauxManqueVide"), "", '<a class="lien-suite" href="#accueil">' + esc(M("revenirAccueil")) + "</a>");
    }
    return { titre: M("creneauxManqueTitre"), onglet: "accueil", html: html };
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
      infos.push(esc(e.bilan.benevoles) + " parents ont aidé");
    }
    return '<a class="carte' + (passe ? " carte--passee" : "") + '" id="carte-' + esc(e.id) + '" href="#evenement/' + esc(e.id) + '">' +
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
    var html = entete(G().nom, "Événements", avenir.length + " à venir · " + pluriel(passes.length, "passé", "passés")) + bandeauMessage();
    // Le bureau seul crée un événement : aucun bouton pour les autres.
    if (gere()) { html += '<a class="bouton bouton--principal" id="creer-evenement" href="#evenement/nouveau">' + esc(M("creerUnEvenement")) + "</a>"; }
    html += calendrier() + sectionRendezVous(false);
    html += avenir.length
      ? '<section><h2 class="section-titre">À venir</h2>' + avenir.map(carteEvenement).join("") + "</section>"
      : etatVide("panneau", M("aucunEvenementAVenir"), gere() ? esc(M("aucunEvenementAide")) : "");
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

  // Le mois montré à l'ouverture. Association : comme avant, d'après les événements.
  // Groupe simple (pas d'événement) : le mois en cours, sauf si le prochain rendez-vous tombe un autre mois.
  function moisDeDepart() {
    if (estAsso()) { return moisParDefaut(L.evenementsAVenir(G())); }
    var auj = L.aujourdhui();
    var rdv = Msg.rendezVous(G(), moi());
    var ceMois = rdv.some(function (x) { return x.date.getFullYear() === auj.getFullYear() && x.date.getMonth() === auj.getMonth(); });
    var d = ceMois || !rdv.length ? auj : rdv[0].date;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  // Les rendez-vous à venir du mois affiché : questions datées que je vois, sauf celles où j'ai dit Non.
  function rendezVousDuMois() {
    var m = moisAffiche || moisDeDepart();
    return Msg.rendezVous(G(), moi()).filter(function (x) { return x.date.getFullYear() === m.getFullYear() && x.date.getMonth() === m.getMonth(); });
  }

  // Sous le calendrier : les rendez-vous du mois (question, jour, heure). Un toucher ouvre le message.
  function sectionRendezVous(avecVide) {
    var liste = rendezVousDuMois();
    if (!liste.length) {
      return avecVide ? etatVide("calme", M("msgAucunRendezVous"), esc(M("msgAucunRendezVousAide"))) : "";
    }
    return '<section class="rendez-vous" id="rendez-vous"><h2 class="section-titre">' + esc(M("msgRendezVousTitre")) + "</h2>" +
      liste.map(function (x) {
        return '<a class="carte" id="rdv-' + esc(x.message.id) + '" href="#message/' + esc(x.message.id) + '">' +
          '<span class="carte-ligne">' + pastilleDate(x.date) +
          '<span><span class="carte-titre">' + esc(x.message.texte) + "</span>" +
          '<span class="carte-quand">' + esc(quandRendezVous(x.message)) + "</span></span></span></a>";
      }).join("") + "</section>";
  }

  // Calendrier du groupe simple : il s'ouvre depuis l'accueil, sans onglet de plus (demande 007).
  function ecranCalendrier() {
    var html = retour("#accueil", M("ongletAccueil")) + entete(G().nom, M("msgCalendrierTitre")) + calendrier() + sectionRendezVous(true);
    return { titre: M("msgCalendrierTitre"), onglet: "accueil", html: html };
  }

  function calendrier() {
    var asso = estAsso();
    var m = moisAffiche || moisDeDepart();
    var annee = m.getFullYear(), mois = m.getMonth();
    var auj = L.aujourdhui();
    var duMois = asso ? L.evenementsDuMois(G(), annee, mois) : [];
    var rdv = rendezVousDuMois();
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
        // Un jour qui porte un événement ouvre toujours l'événement ; sinon, le premier rendez-vous du jour.
        var rv = e ? null : rdv.filter(function (x) { return L.memeJour(x.date, d); })[0];
        if (rv) {
          return '<td><a class="' + classe + ' jour--rendez-vous" href="#message/' + esc(rv.message.id) + '" id="jour-rdv-' + esc(rv.message.id) + '"' +
            ' aria-label="' + esc(fmtJourLong.format(d) + " : " + minuscule(M("msgRendezVousTitre")) + ", " + rv.message.texte) + '">' + d.getDate() + "</a></td>";
        }
        if (!e) {
          return '<td><span class="' + classe + '"' + (L.memeJour(d, auj) ? ' aria-label="Aujourd\'hui, ' + esc(fmtJourLong.format(d)) + '"' : "") + ">" + d.getDate() + "</span></td>";
        }
        var p = L.etatPreparation(e);
        return '<td><a class="' + classe + " jour--" + p + '" href="#evenement/' + esc(e.id) + '" id="jour-' + esc(e.id) + '"' +
          ' aria-label="' + esc(fmtJourLong.format(d) + " : " + e.titre + ", " + minuscule(L.LIBELLES_PREPARATION[p])) + '">' + d.getDate() + "</a></td>";
      }).join("") + "</tr>";
    });
    html += "</tbody></table>" +
      '<div class="boutons-ligne calendrier-mois">' +
      '<button type="button" class="bouton bouton--secondaire bouton--petit" data-mois="-1">Voir ' + esc(fmtMoisSeul.format(avant)) + "</button>" +
      '<button type="button" class="bouton bouton--secondaire bouton--petit" data-mois="1">Voir ' + esc(fmtMoisSeul.format(apres)) + "</button></div>" +
      '<ul class="legende">' +
      (asso
        ? '<li><span class="jour jour--a-jour" aria-hidden="true"></span><span><strong>À jour</strong> : rien en retard ni d\'urgent</span></li>' +
          '<li><span class="jour jour--en-cours" aria-hidden="true"></span><span><strong>En cours</strong> : des actions à faire cette semaine</span></li>' +
          '<li><span class="jour jour--retard" aria-hidden="true"></span><span><strong>En retard</strong> : au moins une action a dépassé sa date</span></li>'
        : "") +
      legendeRendezVous() +
      "</ul>" +
      (!asso || duMois.length ? "" : '<p class="discret">Pas d\'événement ce mois-ci.</p>') +
      "</section>";
    return html;
  }

  function legendeRendezVous() {
    return '<li><span class="jour jour--rendez-vous" aria-hidden="true"></span><span><strong>' + esc(M("msgRendezVousTitre")) + "</strong> : " +
      esc(M("msgLegendeRendezVous")) + "</span></li>";
  }

  function changerMois(delta) {
    var m = moisAffiche || moisDeDepart();
    moisAffiche = new Date(m.getFullYear(), m.getMonth() + delta, 1);
    rendre({ garderDefilement: true });
  }

  // ---------- Un événement (3 onglets) ----------

  function ecranEvenement(id, onglet, sous) {
    // Créer un événement : le bureau seul ; les autres retrouvent la liste, sans message.
    if (id === "nouveau" && !onglet) { return gere() ? ecranCreerEvenement() : ecranEvenements(); }
    // Demande 009, écran 9 : le même écran, prérempli avec le titre d'une idée retenue ; même règle pour qui n'est pas du bureau.
    if (id === "nouveau" && onglet === "idee" && sous) { return gere() ? ecranCreerEvenement(sous) : ecranEvenements(); }
    var e = L.trouverEvenement(G(), id);
    if (!e) { return introuvable(); }
    // Modifier, supprimer et refaire l'événement (demande 006b) : le bureau seul, événement à venir ou passé ;
    // les autres retrouvent l'événement, sans message.
    if (["modifier", "supprimer", "refaire"].indexOf(onglet) >= 0) {
      if (gere()) { return onglet === "modifier" ? ecranModifierEvenement(e) : onglet === "supprimer" ? ecranSupprimerEvenement(e) : ecranRefaireEvenement(e); }
      onglet = "actions";
    }
    var passe = L.estPasse(e);
    // Ajouter ou modifier une action, un créneau : le bureau seul, événement à venir ; sinon, l'événement.
    if (onglet === "action") {
      if (sous && peutModifier(e)) { return ecranAction(e, sous); }
      onglet = "actions";
    }
    if (onglet === "creneau") {
      if (sous && peutModifier(e)) { return ecranCreneau(e, sous); }
      onglet = "coups-de-main";
    }
    if (["actions", "coups-de-main", "bilan"].indexOf(onglet) < 0) {
      onglet = passe && e.bilan ? "bilan" : "actions";
    }
    var date = L.dateEvenement(e);
    // Demande 009 : l'idée d'où vient l'événement, pour qui a le droit de la voir ; les autres ne voient rien à cette place.
    var idee = Msg.ideeDeLEvenement(G(), moi(), e);
    var html = retour("#evenements", "Événements") +
      entete(quandOu(e, dateLongue(date) + (passe ? " " + date.getFullYear() : "")), e.titre, etiquettePreparation(e)) +
      (idee ? '<p><a class="lien-suite" id="vient-idee" href="#message/' + esc(idee.id) + '">' + esc(M("msgEvenementVientIdee", { titre: idee.texte })) + "</a></p>" : "") +
      bandeauMessage() +
      // Rubrique Actions, bureau seulement : « Modifier l'événement », entre l'en-tête et les rubriques.
      (onglet === "actions" && gere() ? '<p><a class="lien-suite" id="modifier-evenement" href="' + hrefEvenement(e, "modifier") + '">' + esc(M("modifierLEvenement")) + "</a></p>" : "") +
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
    return '<a href="#evenement/' + esc(e.id) + "/" + esc(cle) + '"' + (cle === actif ? ' aria-current="page"' : "") + ">" + esc(libelle) + "</a>";
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
    var modifiable = peutModifier(e);
    var ajout = modifiable
      ? '<a class="bouton bouton--principal" id="ajouter-action" href="#evenement/' + esc(e.id) + '/action/nouvelle">' + esc(M("ajouterUneAction")) + "</a>"
      : "";
    // Bureau seulement, événement à venir ou passé : « Refaire cet événement », tout en bas.
    var refaire = gere() ? '<p><a class="lien-suite" id="refaire-evenement" href="' + hrefEvenement(e, "refaire") + '">' + esc(M("refaireCetEvenement")) + "</a></p>" : "";
    if (!e.actions.length) { return ajout + etatVide("panneau", M("aucuneAction"), modifiable ? esc(M("aucuneActionAide")) : "") + refaire; }
    var groupes = groupesEcheance(e);
    var aOuvrir = groupes.filter(function (g) { return g.actions.some(function (a) { return L.estEnRetard(a, e); }); });
    if (!aOuvrir.length) {
      aOuvrir = groupes.filter(function (g) { return g.actions.some(function (a) { return a.statut !== "fait"; }); }).slice(0, 1);
    }
    var html = ajout + '<p class="avancement" id="avancement">' + texteAvancement(e) + "</p>" +
      '<div class="barre" aria-hidden="true"><span id="barre" style="width:' + pourcentage(e) + '%"></span></div>';
    groupes.forEach(function (g, i) {
      html += '<details class="repli" id="groupe-' + i + '"' + (aOuvrir.indexOf(g) >= 0 ? " open" : "") + ">" +
        '<summary><span class="repli-titres"><span class="repli-titre">' + esc(g.echeance) + "</span>" +
        '<span class="repli-meta" id="groupe-meta-' + i + '">' + metaGroupe(g, e) + "</span></span></summary>" +
        '<div class="repli-corps"><ul class="actions">' + g.actions.map(function (a) { return ligneAction(a, e, "evenement"); }).join("") + "</ul></div></details>";
    });
    // Sans action dont elle puisse changer l'état, la personne lit la phrase courte.
    var touche = e.actions.some(peutChangerEtat);
    html += '<p class="discret note-bas">' + esc(M(modifiable ? "noteActionsBureau" : touche ? "noteActions" : "noteActionsLecture")) + "</p>";
    return html + refaire;
  }

  function ongletCoupsDeMain(e) {
    var modifiable = peutModifier(e);
    var hrefAjout = "#evenement/" + esc(e.id) + "/creneau/nouveau";
    if (!e.creneaux.length) {
      // Sans créneau, pas de lien à copier : « Ajouter un créneau » est le bouton principal (bureau).
      return etatVide("panneau", M("aucunCreneau"), modifiable ? esc(M("aucunCreneauAide")) : "",
        modifiable ? '<a class="bouton bouton--principal" id="ajouter-creneau" href="' + hrefAjout + '">' + esc(M("ajouterUnCreneau")) + "</a>" : "");
    }
    var lien = lienParent(e.id);
    var texteWhatsapp = M("messageCoupsDeMain", { nom: e.titre, date: fmtLong.format(L.dateEvenement(e)), lien: lien });
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
      '<a class="lien-suite" href="#inscription/' + esc(e.id) + '">Voir la page des parents</a>' +
      "</section>";

    html += '<h2 class="section-titre">Qui vient <span class="compte">' + L.compterInscrits(e) + " sur " + esc(L.compterPlaces(e)) + "</span></h2>";
    e.creneaux.forEach(function (c) {
      var reste = L.placesRestantes(c);
      var etiquette = reste === 0
        ? '<span class="etiquette etiquette--ok">Complet</span>'
        : '<span class="etiquette' + (c.inscrits.length < c.places / 2 ? " etiquette--alerte" : "") + '">' + (reste === 1 ? "Manque 1" : "Manquent " + esc(reste)) + "</span>";
      html += '<details class="repli" id="equipe-' + esc(c.id) + '">' +
        '<summary><span class="repli-titres"><span class="repli-titre">' + esc(c.titre) + "</span>" +
        // Le point médian tient au compte : si le compte passe à la ligne, le point est masqué (jamais seul en bout de ligne).
        '<span class="repli-meta suite"><span class="suite-part">' + esc(c.horaire) + '</span><span class="suite-part insecable"><span class="suite-point"> · </span>' +
        c.inscrits.length + " sur " + esc(c.places) + "</span></span></span>" + etiquette + "</summary>" +
        '<div class="repli-corps">' +
        (c.inscrits.length
          ? '<ul class="noms">' + c.inscrits.map(function (v) {
            var ct = gere() ? L.analyserContact(v.contact) : null; // coordonnées : bureau seulement
            var href = ct ? (ct.type === "email" ? "mailto:" + ct.valeur : "tel:" + ct.valeur.replace(/[\s.\-()]/g, "")) : "";
            return "<li><span>" + esc(L.nomPublic(v)) + "</span>" +
              (href ? '<a href="' + esc(href) + '">' + esc(v.contact) + "</a>" : "") + "</li>";
          }).join("") + "</ul>"
          : '<p class="calme">Personne pour l\'instant.</p>') +
        (modifiable ? '<a class="lien-suite" href="#evenement/' + esc(e.id) + "/creneau/" + esc(c.id) + '">' + esc(M("modifierCeCreneau")) + "</a>" : "") +
        "</div></details>";
    });
    // Avec des créneaux, « Copier le lien » reste le seul bouton principal : l'ajout devient secondaire.
    if (modifiable) { html += '<a class="bouton bouton--secondaire" id="ajouter-creneau" href="' + hrefAjout + '">' + esc(M("ajouterUnCreneau")) + "</a>"; }
    html += '<p class="discret note-bas">Touchez un créneau pour voir qui vient. Les coordonnées ne sont visibles que du bureau ; les parents ne voient que les prénoms et initiales.</p>';
    return html;
  }

  function ongletBilan(e) {
    if (!e.bilan) {
      var exemple = G().evenements.filter(function (x) { return x.bilan; })[0];
      return etatVide("panneau", "Le bilan se remplit le soir de l'événement.",
        "Quelques chiffres (parents venus, heures données, recette de la buvette, exposants) deviennent une image de remerciement à partager.",
        exemple ? '<a class="lien-suite" href="#evenement/' + esc(exemple.id) + '/bilan">Voir le bilan de la ' + esc(minuscule(exemple.titre)) + "</a>" : "");
    }
    var b = e.bilan;
    var texte = L.texteBilan(G(), e);
    return '<figure class="affichette" aria-label="Image de remerciement à partager">' +
      '<p class="affichette-asso">' + esc(G().nom) + "</p>" +
      '<p class="affichette-merci">Merci à vous.</p>' +
      '<p class="chiffre-vedette"><span class="nombre">' + esc(b.benevoles) + '</span> parents ont donné un coup de main</p>' +
      '<ul class="chiffres">' +
      '<li><span class="nombre">' + esc(b.heures) + "</span> heures données</li>" +
      '<li><span class="nombre">' + esc(L.formaterEuros(b.recetteBuvette)) + "</span> à la buvette</li>" +
      '<li><span class="nombre">' + esc(b.exposants) + "</span> " + esc(b.exposantsLibelle) + "</li>" +
      "</ul>" +
      '<p class="affichette-pied">' + esc(b.ceQueCaFinance) + "</p>" +
      "</figure>" +
      '<a class="bouton bouton--principal" id="whatsapp" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(texte) + '">Partager sur WhatsApp</a>' +
      '<button type="button" class="bouton bouton--secondaire" data-image="' + esc(e.id) + '">Enregistrer l\'image</button>' +
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
      telecharger("merci-" + esc(e.id) + ".png", c.toDataURL("image/png"));
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
      options.map(function (o) { return optionChoix(nom, t, o, choisis.indexOf(o.valeur) >= 0); }).join("") +
      '<p class="champ-erreur" id="erreur-' + nom + '"></p></fieldset>';
  }

  function optionChoix(nom, type, o, coche) {
    return '<label class="choix-option"><input type="' + type + '" name="' + nom + '" value="' + esc(o.valeur) + '"' + (coche ? " checked" : "") + ">" +
      '<span class="choix-texte"><span class="choix-titre">' +
      (o.pastille ? '<span class="pastille-couleur" style="background:' + esc(o.pastille) + '" aria-hidden="true"></span>' : "") +
      esc(o.titre) + "</span>" + (o.detail ? '<span class="choix-detail">' + esc(o.detail) + "</span>" : "") + "</span></label>";
  }

  // Choix unique dans une longue liste : replié, il montre le choix en cours ; on l'ouvre pour en changer.
  // sections : [{ titre (facultatif), options }]. Choisir referme la liste (voir les gestes, plus bas).
  function choixReplie(nom, legende, sections, choisi) {
    var enCours = "";
    var corps = sections.map(function (s) {
      return (s.titre ? '<p class="surtitre">' + esc(s.titre) + "</p>" : "") + s.options.map(function (o) {
        if (o.valeur === choisi) { enCours = o.titre; }
        return optionChoix(nom, "radio", o, o.valeur === choisi);
      }).join("");
    }).join("");
    return '<fieldset class="choix choix--liste choix--replie" id="champ-' + nom + '" aria-describedby="erreur-' + nom + '">' +
      "<legend>" + esc(legende) + "</legend>" +
      '<details class="repli"><summary><span class="repli-titres"><span class="repli-titre">' + esc(enCours) + "</span></span></summary>" +
      '<div class="repli-corps">' + corps + "</div></details>" +
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
      if (zone) {
        zone.textContent = texte;
        // Le code sert à savoir si la phrase porte sur deux champs (voir effacerErreur).
        if (texte) { zone.setAttribute("data-code", code); } else { zone.removeAttribute("data-code"); }
      }
      var el = form.querySelector("#champ-" + n);
      // Une zone de saisie sur plusieurs lignes est un champ comme un autre (demande 009).
      var saisie = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
      if (saisie) { el.setAttribute("aria-invalid", texte ? "true" : "false"); }
      if (texte && !premier) { premier = saisie ? el : form.querySelector("#champ-" + n + " input"); }
    });
    if (premier) { premier.focus(); }
    return !!premier;
  }

  // Une phrase d'erreur disparaît dès que le champ est corrigé (demande 006b), sur tous les formulaires du prototype,
  // « Ajouter une personne » compris (décision du 2026-11-19, soir) : dès que le contenu du champ change, sa phrase
  // et sa bordure d'erreur s'effacent, sans attendre l'enregistrement, qui refait le contrôle complet.
  // Les phrases des autres champs restent.
  // La phrase sous l'heure de fin porte aussi sur l'heure de début quand elle les compare : elle s'efface si l'une des deux change.
  var ERREURS_A_DEUX = { "debut-evenement": "fin-evenement", "debut-creneau": "fin-creneau" };
  var CODES_A_DEUX = ["sans-debut", "avant"];

  function effacerErreur(c) {
    var form = c.form;
    if (!form || !c.name) { return; }
    function effacer(nom, codes) {
      var zone = form.querySelector("#erreur-" + nom);
      if (!zone || !zone.textContent || (codes && codes.indexOf(zone.getAttribute("data-code")) < 0)) { return; }
      zone.textContent = "";
      zone.removeAttribute("data-code");
      var el = form.querySelector("#champ-" + nom);
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) { el.setAttribute("aria-invalid", "false"); }
    }
    effacer(c.name);
    if (ERREURS_A_DEUX[c.name]) { effacer(ERREURS_A_DEUX[c.name], CODES_A_DEUX); }
  }

  function erreurGenerale(form, texte) {
    var z = form.querySelector(".erreur-generale");
    z.textContent = texte;
  }

  // Va à l'adresse ; si on y est déjà, redessine quand même l'écran.
  function aller(adresse) {
    if (location.hash === adresse) { rendre({ focus: true }); } else { location.hash = adresse; }
  }

  // ---------- Demande 006 : créer un événement ; ajouter, modifier, supprimer une action ou un créneau ----------
  // Association seulement, bureau seulement : les écrans ne sont rendus que pour le bureau (voir ecranEvenement)
  // et chaque geste est contrôlé une seconde fois par les règles (js/evenements.js).

  function hrefEvenement(e, rubrique) { return "#evenement/" + esc(e.id) + "/" + rubrique; }

  // Écran « n'existe plus » d'une action ou d'un créneau supprimé entre-temps.
  function nExistePlus(e, cle, rubrique) {
    return {
      titre: M(cle), onglet: "evenements",
      html: retour(hrefEvenement(e, rubrique), e.titre) +
        '<section class="confirmation"><h1 tabindex="-1">' + esc(M(cle)) + "</h1>" +
        '<a class="lien-suite" href="' + hrefEvenement(e, rubrique) + '">' + esc(M("revenirALEvenement")) + "</a></section>"
    };
  }

  // Écran 2 : créer un événement. Seuls le nom et la date sont obligatoires.
  // Demande 009, écran 9 (ideeId) : le nom est rempli avec le titre d'une idée retenue, coupé à 60 caractères ; le curseur est
  // dans la date ; le retour mène à l'idée. Rien d'autre ne change.
  function ecranCreerEvenement(ideeId) {
    var idee = null, propose = null;
    if (ideeId) {
      idee = Msg.trouverVisible(G(), moi(), ideeId);
      if (!idee || Msg.sorte(idee) !== "idee") { return messageIntrouvable(); }
      // Idée qui n'est pas retenue, ou déjà devenue un événement : l'idée elle-même.
      if (!Msg.peutEnFaireUnEvenement(G(), moi(), idee)) { return ecranMessage(ideeId); }
      propose = Msg.nomEvenementPropose(idee);
    }
    var html = (idee ? retour("#message/" + esc(idee.id), idee.texte) : retour("#evenements", M("ongletEvenements"))) + entete(G().nom, M("creerUnEvenement")) +
      '<form class="form-evenement"' + (idee ? ' data-idee="' + esc(idee.id) + '"' : "") + " novalidate>" +
      champ("nom-evenement", M("champNomEvenement"), 'autocomplete="off" autocapitalize="sentences" maxlength="60"' + (idee ? ' value="' + esc(propose.nom) + '"' : ""),
        M("champNomEvenementAide"), "", "", propose && propose.raccourci ? M("msgIdeeNomRaccourci") : "") +
      champ("date-evenement", M("champDateEvenement"), 'min="' + esc(Ev.ecrireDate(L.aujourdhui())) + '"', "", "date") +
      champ("debut-evenement", M("champDebutEvenement"), "", "", "time") +
      champ("fin-evenement", M("champFinEvenement"), "", "", "time") +
      champ("lieu-evenement", M("champLieuEvenement"), 'autocomplete="off" autocapitalize="sentences" maxlength="60"', "") +
      '<p class="erreur-generale" role="alert"></p>' +
      '<button type="submit" class="bouton bouton--principal">' + esc(M("creerLEvenement")) + "</button>" +
      "</form>";
    return { titre: M("creerUnEvenement"), onglet: "evenements", html: html, champ: idee ? "date-evenement" : "nom-evenement" };
  }

  // Les erreurs du formulaire d'événement (création et modification) ; rend vrai s'il y en a.
  function erreursEvenement(form, r) {
    var e = r.erreurs || {};
    return montrerErreurs(form, ["nom-evenement", "date-evenement", "fin-evenement", "lieu-evenement"],
      { "nom-evenement": e.titre, "date-evenement": e.date, "fin-evenement": e.fin, "lieu-evenement": e.lieu }, {
        "nom-evenement:vide": M("erreurNomEvenementVide"), "nom-evenement:long": M("erreurNomGroupeLong"),
        "date-evenement:vide": M("erreurDateVide"), "date-evenement:passee": M("erreurDatePassee"),
        "fin-evenement:sans-debut": M("erreurFinSansDebut"), "fin-evenement:avant": M("erreurFinAvantDebut"),
        "lieu-evenement:long": M("erreurNomGroupeLong")
      });
  }

  function saisieEvenement(form) {
    var el = form.elements;
    return {
      titre: el["nom-evenement"].value, date: el["date-evenement"].value,
      debut: el["debut-evenement"].value, fin: el["fin-evenement"].value, lieu: el["lieu-evenement"].value
    };
  }

  // Le calendrier s'ouvrira sur le mois de cet événement.
  function montrerMoisDe(e) {
    var d = L.dateEvenement(e);
    moisAffiche = new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function envoyerEvenement(form) {
    if (!estAsso()) { return; }
    // Le même formulaire sert à modifier l'événement (écran 9) ; celui de la copie n'a qu'une date (écran 11).
    if (form.hasAttribute("data-refaire")) { envoyerCopie(form); return; }
    if (form.hasAttribute("data-evenement")) { envoyerModification(form); return; }
    // Demande 009 : né d'une idée retenue, l'événement et l'idée gardent le lien l'un vers l'autre.
    var ideeId = form.getAttribute("data-idee");
    var r = ideeId ? Msg.creerEvenementDepuisIdee(G(), moi(), ideeId, saisieEvenement(form)) : Ev.creerEvenement(G(), moi(), saisieEvenement(form));
    if (erreursEvenement(form, r)) { return; }
    if (!r.ok) { aller(ideeId ? "#message/" + ideeId : "#evenements"); return; }
    sauver();
    montrerMoisDe(r.evenement);
    message = M("evenementCree", { nom: r.evenement.titre });
    aller("#evenement/" + r.evenement.id + "/actions");
  }

  // ---------- Demande 006b : modifier, supprimer et refaire l'événement ----------
  // Le bureau seul, pour un événement à venir comme pour un événement passé (voir ecranEvenement) ;
  // chaque geste est contrôlé une seconde fois par les règles (js/evenements.js).

  // La date d'un événement dans une phrase : « vendredi 27 novembre », avec l'année s'il est passé.
  function dateEnPhrase(e) {
    return (L.estPasse(e) ? fmtLongAnnee : fmtLong).format(L.dateEvenement(e));
  }

  // « 3 actions, 2 créneaux et 4 personnes inscrites » : on ne cite que ce qui existe.
  function listeDeComptes(comptes) {
    var parts = comptes.filter(function (x) { return x[1] > 0; }).map(function (x) { return Mn(x[0], x[1]); });
    if (parts.length < 2) { return parts.join(""); }
    return M("listeEt", { debut: parts.slice(0, -1).join(M("listeVirgule")), dernier: parts[parts.length - 1] });
  }

  // Écran 9 : le formulaire de la création, rempli. « Supprimer cet événement » est sous le bouton.
  function ecranModifierEvenement(e) {
    var valeur = function (v) { return v ? ' value="' + esc(v) + '"' : ""; };
    // Événement à venir : le téléphone ne propose pas de jour passé. Événement passé : sa date reste permise.
    var min = L.estPasse(e) ? "" : 'min="' + esc(Ev.ecrireDate(L.aujourdhui())) + '"';
    var html = retour(hrefEvenement(e, "actions"), e.titre) + entete(G().nom, M("modifierLEvenement")) +
      '<form class="form-evenement" data-evenement="' + esc(e.id) + '" novalidate>' +
      champ("nom-evenement", M("champNomEvenement"), 'autocomplete="off" autocapitalize="sentences" maxlength="60"' + valeur(e.titre), M("champNomEvenementAide")) +
      champ("date-evenement", M("champDateEvenement"), min + valeur(Ev.ecrireDate(L.dateEvenement(e))), "", "date") +
      champ("debut-evenement", M("champDebutEvenement"), valeur(e.debut), "", "time") +
      champ("fin-evenement", M("champFinEvenement"), valeur(e.fin), "", "time") +
      champ("lieu-evenement", M("champLieuEvenement"), 'autocomplete="off" autocapitalize="sentences" maxlength="60"' + valeur(e.lieu), "") +
      '<p class="erreur-generale" role="alert"></p>' +
      '<button type="submit" class="bouton bouton--principal">' + esc(M("enregistrerLEvenement")) + "</button>" +
      '<a class="lien-bouton lien-bouton--alerte" id="supprimer-evenement" href="' + hrefEvenement(e, "supprimer") + '">' + esc(M("supprimerCetEvenement")) + "</a>" +
      "</form>";
    return { titre: M("modifierLEvenement"), onglet: "evenements", html: html };
  }

  function envoyerModification(form) {
    var eid = form.getAttribute("data-evenement");
    var r = Ev.modifierEvenement(G(), moi(), eid, saisieEvenement(form));
    if (erreursEvenement(form, r)) { return; }
    // Événement disparu entre-temps, ou droits perdus : l'écran se redessine et le dit.
    if (!r.ok) { rendre({ focus: true }); return; }
    sauver();
    if (r.dateChangee) { montrerMoisDe(r.evenement); }
    message = M("evenementModifie", { nom: r.evenement.titre });
    aller("#evenement/" + eid + "/actions");
  }

  // Écran 10 : un écran entier, écrit en toutes lettres, sans rien à taper. Le bouton rouge est le seul bouton.
  function ecranSupprimerEvenement(e) {
    var p = Ev.compterPertes(e);
    var liste = listeDeComptes([["nActions", p.actions], ["nCreneaux", p.creneaux], ["nInscrits", p.inscrits]]);
    var html = '<section class="confirmation">' +
      '<h1 tabindex="-1">' + esc(M("supprimerEvenementTitre")) + "</h1>" +
      '<p class="confirmation-quoi">' + esc(M("supprimerEvenementQuoi", { nom: e.titre, date: dateEnPhrase(e) })) + "</p>" +
      (liste ? "<p>" + esc(M("supprimerEvenementPerte", { liste: liste })) + "</p>" : "") +
      (p.inscrits ? "<p>" + esc(M("supprimerEvenementInscrits")) + "</p>" : "") +
      '<p class="texte-alerte">' + esc(M("supprimerEvenementDefinitif")) + "</p>" +
      '<button type="button" class="bouton bouton--alerte" data-supprimer-evenement="' + esc(e.id) + '">' + esc(M("supprimerLEvenement")) + "</button>" +
      '<a class="lien-suite" href="' + hrefEvenement(e, "modifier") + '">' + esc(M("garderLEvenement")) + "</a>" +
      "</section>";
    return { titre: M("supprimerEvenementTitre"), onglet: "evenements", html: html };
  }

  // Après la suppression, rien n'est gardé des inscrits, sauf leurs jetons (voir js/evenements.js).
  function supprimerEvenement(bouton) {
    if (!estAsso()) { return; }
    var r = Ev.supprimerEvenement(G(), moi(), bouton.getAttribute("data-supprimer-evenement"));
    if (!r.ok) { rendre({ focus: true }); return; }
    sauver();
    message = M("evenementSupprime", { nom: r.titre });
    aller("#evenements");
  }

  // Écran 11 : une seule chose à donner, la nouvelle date.
  function ecranRefaireEvenement(e) {
    var liste = listeDeComptes([["nActions", e.actions.length], ["nCreneaux", e.creneaux.length]]);
    var html = retour(hrefEvenement(e, "actions"), e.titre) + entete(G().nom, M("refaireCetEvenement")) +
      "<p>" + esc(liste ? M("refaireTexte", { liste: liste, nom: e.titre }) : M("refaireTexteVide", { nom: e.titre })) + "</p>" +
      '<form class="form-evenement" data-refaire="' + esc(e.id) + '" novalidate>' +
      champ("nouvelle-date", M("champNouvelleDate"), 'min="' + esc(Ev.ecrireDate(L.aujourdhui())) + '"', "", "date") +
      '<p class="erreur-generale" role="alert"></p>' +
      '<button type="submit" class="bouton bouton--principal">' + esc(M("creerLaCopie")) + "</button>" +
      "</form>";
    return { titre: M("refaireCetEvenement"), onglet: "evenements", html: html, champ: "nouvelle-date" };
  }

  function envoyerCopie(form) {
    var r = Ev.refaireEvenement(G(), moi(), form.getAttribute("data-refaire"), { date: form.elements["nouvelle-date"].value });
    if (montrerErreurs(form, ["nouvelle-date"], { "nouvelle-date": (r.erreurs || {}).date }, {
      "nouvelle-date:vide": M("erreurDateVide"), "nouvelle-date:passee": M("erreurDatePassee")
    })) { return; }
    if (!r.ok) { rendre({ focus: true }); return; }
    sauver();
    montrerMoisDe(r.evenement);
    message = M("evenementRefait", { nom: r.evenement.titre, date: dateEnPhrase(r.evenement) });
    aller("#evenement/" + r.evenement.id + "/actions");
  }

  // Écrans 4 et 5 : ajouter ou modifier une action.
  function sectionsReferent(a) {
    var p = moi();
    var possibles = Ev.referentsPossibles(G());
    var sections = [
      { options: [{ valeur: "p:" + p.id, titre: M("referentVous", { prenom: p.prenom }) }] },
      { titre: M("equipes"), options: possibles.equipes.map(function (x) { return { valeur: "e:" + x.id, titre: nomEquipe(x) }; }) },
      { titre: M("personnes"), options: possibles.personnes.filter(function (x) { return x.id !== p.id; }).map(function (x) { return { valeur: "p:" + x.id, titre: Gr.nomComplet(x) }; }) }
    ].filter(function (s) { return s.options.length; });
    var choisi = a ? Ev.choixReferent(a) : "p:" + p.id;
    var propose = sections.some(function (s) { return s.options.some(function (o) { return o.valeur === choisi; }); });
    if (!propose) {
      // La personne notée sur l'action n'est plus proposée (retirée du groupe, ou visiteur) : on peut la garder.
      if (a && nomReferent(a)) { sections[0].options.push({ valeur: "garder", titre: nomReferent(a) }); choisi = "garder"; }
      else { choisi = "p:" + p.id; }
    }
    return { sections: sections, choisi: choisi };
  }

  function ecranAction(e, id) {
    var nouvelle = id === "nouvelle";
    var a = nouvelle ? null : Ev.trouverAction(e, id);
    if (!nouvelle && !a) { return nExistePlus(e, "actionIntrouvable", "actions"); }
    var sorte = a ? Ev.sorteEcheance(a) : "veille";
    var ref = sectionsReferent(a);
    var titre = M(nouvelle ? "ajouterUneAction" : "modifierLAction");
    var html = retour(hrefEvenement(e, "actions"), e.titre) + entete(G().nom, titre) + (nouvelle ? bandeauMessage() : "") +
      '<form class="form-action" data-evenement="' + esc(e.id) + '" data-action="' + (a ? esc(a.id) : "") + '" novalidate>' +
      champ("libelle-action", M("champLibelleAction"), 'autocomplete="off" autocapitalize="sentences" maxlength="80"' + (a ? ' value="' + esc(a.libelle) + '"' : ""), M("champLibelleActionAide")) +
      choixReplie("referent", M("champReferent"), ref.sections, ref.choisi) +
      choix("echeance", M("champEcheance"), [
        { valeur: "jour-j", titre: M("echeanceJourJ") }, { valeur: "veille", titre: M("echeanceVeille") },
        { valeur: "jours", titre: M("echeancePlusieursJours") }, { valeur: "date", titre: M("echeanceDatePrecise") }
      ], [sorte]) +
      '<div id="zone-jours"' + (sorte === "jours" ? "" : " hidden") + ">" +
      champ("jours-avant", M("champJoursAvant"), 'inputmode="numeric" autocomplete="off" maxlength="3" class="champ-court"' + (a && sorte === "jours" ? ' value="' + esc(a.joursAvant) + '"' : ""), "") + "</div>" +
      '<div id="zone-date"' + (sorte === "date" ? "" : " hidden") + ">" +
      champ("date-echeance", M("champDateEcheance"), 'max="' + esc(Ev.ecrireDate(L.dateEvenement(e))) + '"' + (a && sorte === "date" ? ' value="' + esc(Ev.ecrireDate(L.dateLimite(a, e))) + '"' : ""), "", "date") + "</div>" +
      '<p class="erreur-generale" role="alert"></p>' +
      '<button type="submit" class="bouton bouton--principal">' + esc(M(nouvelle ? "ajouterLAction" : "enregistrerLAction")) + "</button>" +
      (nouvelle
        ? '<a class="lien-suite" href="' + hrefEvenement(e, "actions") + '">' + esc(M("revenirALEvenement")) + "</a>"
        : '<button type="button" class="lien-bouton lien-bouton--alerte" data-supprimer-action="' + esc(a.id) + '">' + esc(M("supprimerCetteAction")) + "</button>") +
      "</form>";
    return { titre: titre, onglet: "evenements", html: html, champ: nouvelle ? "libelle-action" : null };
  }

  // « Plusieurs jours avant » montre le nombre de jours ; « À une date précise » montre la date limite.
  function montrerChampsEcheance(form) {
    var sorte = valeurRadio(form, "echeance");
    form.querySelector("#zone-jours").hidden = sorte !== "jours";
    form.querySelector("#zone-date").hidden = sorte !== "date";
  }

  function envoyerAction(form) {
    if (!estAsso()) { return; }
    var g = G(), el = form.elements;
    var eid = form.getAttribute("data-evenement"), aid = form.getAttribute("data-action");
    var saisie = {
      libelle: el["libelle-action"].value, referent: valeurRadio(form, "referent"), echeance: valeurRadio(form, "echeance"),
      jours: el["jours-avant"].value, date: el["date-echeance"].value
    };
    var r = aid ? Ev.modifierAction(g, moi(), eid, aid, saisie) : Ev.ajouterAction(g, moi(), eid, saisie);
    var e = r.erreurs || {};
    if (montrerErreurs(form, ["libelle-action", "referent", "echeance", "jours-avant", "date-echeance"],
      { "libelle-action": e.libelle, referent: e.referent, echeance: e.echeance, "jours-avant": e.jours, "date-echeance": e.date }, {
        "libelle-action:vide": M("erreurLibelleVide"), "libelle-action:long": M("erreurLibelleLong"),
        referent: M("champReferent"), echeance: M("champEcheance"), "jours-avant": M("erreurJoursAvant"),
        "date-echeance:vide": M("erreurDateEcheanceVide"), "date-echeance:apres": M("erreurDateEcheanceApres")
      })) { return; }
    // Action ou événement disparu entre-temps, ou droits perdus : l'écran se redessine et le dit.
    if (!r.ok) { rendre({ focus: true }); return; }
    sauver();
    if (aid) {
      message = M("actionModifiee", { libelle: r.action.libelle });
      aller("#evenement/" + eid + "/actions");
    } else {
      // On reste sur le formulaire, vidé, pour enchaîner l'action suivante.
      message = M("actionAjoutee", { libelle: r.action.libelle });
      aller("#evenement/" + eid + "/action/nouvelle");
    }
  }

  function supprimerAction(bouton) {
    var form = bouton.closest("form");
    if (!form || !estAsso()) { return; }
    var eid = form.getAttribute("data-evenement");
    var e = L.trouverEvenement(G(), eid);
    var a = e && Ev.trouverAction(e, bouton.getAttribute("data-supprimer-action"));
    if (!a || !peutModifier(e)) { rendre({ focus: true }); return; }
    if (!window.confirm(M("confirmerSuppressionAction", { libelle: a.libelle }))) { return; }
    if (!Ev.supprimerAction(G(), moi(), eid, a.id).ok) { rendre({ focus: true }); return; }
    sauver();
    message = M("actionSupprimee", { libelle: a.libelle });
    aller("#evenement/" + eid + "/actions");
  }

  // Écrans 7 et 8 : ajouter ou modifier un créneau. Il a lieu le jour de l'événement.
  function ecranCreneau(e, id) {
    var nouveau = id === "nouveau";
    var c = nouveau ? null : L.trouverCreneau(e, id);
    if (!nouveau && !c) { return nExistePlus(e, "creneauIntrouvable", "coups-de-main"); }
    var titre = M(nouveau ? "ajouterUnCreneau" : "modifierCeCreneau");
    var valeur = function (v) { return v || v === 0 ? ' value="' + esc(v) + '"' : ""; };
    var html = retour(hrefEvenement(e, "coups-de-main"), e.titre) + entete(G().nom, titre) + (nouveau ? bandeauMessage() : "") +
      '<form class="form-creneau" data-evenement="' + esc(e.id) + '" data-creneau="' + (c ? esc(c.id) : "") + '" novalidate>' +
      champ("intitule-creneau", M("champIntituleCreneau"), 'autocomplete="off" autocapitalize="sentences" maxlength="40"' + valeur(c && c.titre), M("champIntituleCreneauAide")) +
      champ("debut-creneau", M("champDebutCreneau"), valeur(c ? c.debut : e.debut), "", "time") +
      champ("fin-creneau", M("champFinCreneau"), valeur(c ? c.fin : e.fin), "", "time") +
      champ("places-creneau", M("champPlacesCreneau"), 'inputmode="numeric" autocomplete="off" maxlength="2" class="champ-court"' + valeur(c ? c.places : 2), "") +
      '<p class="erreur-generale" role="alert"></p>' +
      '<button type="submit" class="bouton bouton--principal">' + esc(M(nouveau ? "ajouterLeCreneau" : "enregistrerLeCreneau")) + "</button>" +
      (nouveau
        ? '<a class="lien-suite" href="' + hrefEvenement(e, "coups-de-main") + '">' + esc(M("revenirALEvenement")) + "</a>"
        : '<button type="button" class="lien-bouton lien-bouton--alerte" data-supprimer-creneau="' + esc(c.id) + '">' + esc(M("supprimerCeCreneau")) + "</button>") +
      "</form>";
    return { titre: titre, onglet: "evenements", html: html, champ: nouveau ? "intitule-creneau" : null };
  }

  function envoyerCreneau(form) {
    if (!estAsso()) { return; }
    var g = G(), el = form.elements;
    var eid = form.getAttribute("data-evenement"), cid = form.getAttribute("data-creneau");
    var saisie = {
      titre: el["intitule-creneau"].value, debut: el["debut-creneau"].value,
      fin: el["fin-creneau"].value, places: el["places-creneau"].value
    };
    var r = cid ? Ev.modifierCreneau(g, moi(), eid, cid, saisie, horaires) : Ev.ajouterCreneau(g, moi(), eid, saisie, horaires);
    var e = r.erreurs || {};
    if (montrerErreurs(form, ["intitule-creneau", "debut-creneau", "fin-creneau", "places-creneau"],
      { "intitule-creneau": e.titre, "debut-creneau": e.debut, "fin-creneau": e.fin, "places-creneau": e.places }, {
        "intitule-creneau:vide": M("erreurIntituleVide"), "intitule-creneau:long": M("erreurTropLong"),
        "debut-creneau": M("erreurDebutVide"), "fin-creneau:vide": M("erreurFinVide"), "fin-creneau:avant": M("erreurFinAvantDebut"),
        "places-creneau:invalide": M("erreurPlaces"), "places-creneau:inscrits": Mn("erreurPlacesInscrits", r.inscrits || 0)
      })) { return; }
    if (!r.ok) { rendre({ focus: true }); return; }
    sauver();
    if (cid) {
      message = M("creneauModifie", { nom: r.creneau.titre });
      aller("#evenement/" + eid + "/coups-de-main");
    } else {
      // On reste sur le formulaire, pour enchaîner le créneau suivant.
      message = M("creneauAjoute", { nom: r.creneau.titre });
      aller("#evenement/" + eid + "/creneau/nouveau");
    }
  }

  // Supprimer un créneau qui a des inscrits est permis : la question en donne le nombre.
  function supprimerCreneau(bouton) {
    var form = bouton.closest("form");
    if (!form || !estAsso()) { return; }
    var eid = form.getAttribute("data-evenement");
    var e = L.trouverEvenement(G(), eid);
    var c = e && L.trouverCreneau(e, bouton.getAttribute("data-supprimer-creneau"));
    if (!c || !peutModifier(e)) { rendre({ focus: true }); return; }
    var n = c.inscrits.length;
    var question = n ? Mn("confirmerSuppressionCreneauInscrits", n, { nom: c.titre }) : M("confirmerSuppressionCreneau", { nom: c.titre });
    if (!window.confirm(question)) { return; }
    if (!Ev.supprimerCreneau(G(), moi(), eid, c.id).ok) { rendre({ focus: true }); return; }
    sauver();
    message = M("creneauSupprime", { nom: c.titre });
    aller("#evenement/" + eid + "/coups-de-main");
  }

  // ---------- Demande 007 : demander qui est partant ----------
  // La question « Qui est partant ? » seulement. Chaque geste est contrôlé une seconde fois par les règles
  // (js/messages.js) : qui écrit à qui, qui voit quoi, qui répond, qui relance et qui clôt.
  // La question est le seul texte libre : elle passe partout par esc(), jamais écrite comme du HTML.

  var fmtJourMois = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
  var fmtJourNomme = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric" });

  // « jeudi 26 » (demande 007b) : le nom du jour en toutes lettres et son numéro, tels que le téléphone les écrit.
  function jourNomme(d) {
    var morceaux = {};
    fmtJourNomme.formatToParts(d).forEach(function (m) { morceaux[m.type] = m.value; });
    return M("msgJourNomme", { jour: morceaux.weekday, numero: morceaux.day });
  }
  // Demande 007d : sept jours en tout, d'aujourd'hui au sixième jour après aujourd'hui. Le même jour de la semaine
  // suivante n'en fait plus partie : il passe par « Autre date ».
  function joursProposes(aujourdhui) {
    var jours = [];
    for (var i = 0; i < 7; i++) { jours.push(L.ajouterJours(aujourdhui, i)); }
    return jours;
  }
  // « Aujourd'hui », « Demain », puis le jour nommé (« jeudi 19 »).
  function titreJour(d, rang) { return rang === 0 ? M("msgJourAujourdhui") : rang === 1 ? M("msgJourDemain") : jourNomme(d); }

  // N13 (demande 007d) : des cases à toucher sans rond, un seul choix possible. Le bouton radio reste dans la page pour le
  // clavier et les lecteurs d'écran, caché ; la case entière est son étiquette. La légende nomme le groupe sans être affichée.
  // inerte : exemple de la page Charte (rien ne se touche, aucun nom de champ).
  function choixCases(nom, legende, options, choisi, classe, inerte) {
    return '<fieldset class="choix ' + classe + '"' + (inerte ? "" : ' id="champ-' + nom + '" aria-describedby="erreur-' + nom + '"') + ">" +
      '<legend class="visuellement-cache">' + esc(legende) + "</legend>" +
      options.map(function (o) {
        return '<label class="choix-option"><input class="visuellement-cache" type="radio" name="' + nom + '" value="' + esc(o.valeur) + '"' +
          (o.valeur === choisi ? " checked" : "") + (inerte ? " disabled" : "") + '><span class="choix-titre">' + esc(o.titre) + "</span></label>";
      }).join("") +
      (inerte ? "" : '<p class="champ-erreur" id="erreur-' + nom + '"></p>') + "</fieldset>";
  }
  // Les quatre heures courantes puis « Autre heure ».
  function heuresProposees() {
    var heures = M("msgHeuresCourantes").map(function (h) { return { valeur: h, titre: heureLisible(h) }; });
    heures.push({ valeur: "autre", titre: M("msgHeureAutre") });
    return heures;
  }
  // N14 (demande 007d) : la bande fixe au-dessus du menu, qui ne porte qu'un bouton.
  function bandeAction(bouton) { return '<div class="bande-action" id="bande-action">' + bouton + "</div>"; }

  function motReponse(r) { return M(r === "oui" ? "msgOui" : "msgNon"); }

  // « jeudi 19 novembre à 20 h », « jeudi 19 novembre » sans heure, rien sans jour.
  function quandRendezVous(m) {
    var d = Msg.dateRendezVous(m);
    if (!d) { return ""; }
    return m.heure ? M("msgDateHeure", { date: fmtLong.format(d), heure: heureLisible(m.heure) }) : fmtLong.format(d);
  }

  // L'auteur tel qu'il s'appelle aujourd'hui ; s'il n'est plus dans le groupe, le nom noté sur la question.
  function prenomAuteur(m) { var p = Msg.auteur(G(), m); return p ? p.prenom : (m.auteur || ""); }
  function nomAuteur(m) { var p = Msg.auteur(G(), m); return p ? Gr.nomComplet(p) : (m.auteur || ""); }
  function deQui(m) { return Msg.estAuteur(G(), moi(), m) ? M("msgDeVous") : M("msgDe", { prenom: prenomAuteur(m) }); }

  // « Tout le groupe · 30 personnes »
  function aQui(m) {
    var a = m.a || {};
    var equipe = a.sorte === "equipe" ? Gr.trouverEquipe(G(), a.equipeId) : null;
    var nom = a.sorte === "tous" ? M("msgAToutLeGroupe") : a.sorte === "gestion" ? M("msgAGestion") :
      a.sorte === "equipe" && (equipe || a.nom) ? (equipe ? nomEquipe(equipe) : a.nom) : M("msgAPersonnes");
    // Demande 009 : une idée est toujours adressée aussi au bureau (ou aux organisateurs) ; le choix fait le dit, sauf s'il les nomme déjà.
    if (Msg.gestionAjoutee(m)) { nom = M("msgAEtGestion", { destinataires: nom }); }
    return M("msgAvecCompte", { nom: nom, compte: Mn("nPersonnes", Msg.destinataires(G(), m).length) });
  }

  // ----- Demande 009 : ce que les trois sortes de messages ont en commun à l'écran -----
  // Le titre de l'idée, son explication et le texte de l'info sont des textes libres : ils passent partout par esc().

  // Le mot de sorte : « Question », « Idée » ou « Info ». Toujours écrit, jamais une couleur seule.
  function motSorte(m) { var s = Msg.sorte(m); return M(s === "idee" ? "msgSorteIdee" : s === "info" ? "msgSorteInfo" : "msgSorteQuestion"); }

  // Le début d'un texte sur une seule ligne : 80 caractères au plus, puis « … » (ligne de liste, accueil, titre de l'onglet).
  function debutTexte(t) {
    var s = String(t || "").replace(/\s+/g, " ").trim();
    return s.length > 80 ? s.slice(0, 80) + "…" : s;
  }
  // Ce qui nomme le message sur une ligne : la question, le titre de l'idée, le début de l'info.
  function titreMessage(m) { return Msg.sorte(m) === "info" ? debutTexte(m.texte) : m.texte; }

  // « 12 sur 30 ont vu », « Personne n'a encore vu, sur 30. », « Tout le monde a vu. »
  function texteCompteurInfo(d) {
    var total = d.destinataires.length, n = d.vu.length;
    return !d.pasVu.length ? M("msgInfoToutVu") : !n ? M("msgInfoCompteurZero", { total: total }) : Mn("msgInfoCompteur", n, { total: total });
  }

  // N1, le bouton de réponse seul : « Bonne idée » ou « Vu ». Il est l'unique bouton principal de son écran.
  // choisi : vrai ou faux pour « Bonne idée » (le bouton reste, plein et coché) ; null pour « Vu », qui ne se retire pas.
  // exemple : bouton inerte de la page Charte.
  function boutonReponse(cle, attribut, id, choisi, exemple) {
    return '<button type="button" class="bouton bouton--principal reponse-seule' + (choisi ? " bouton--choisi" : "") + '"' +
      (exemple ? " data-exemple" : " " + attribut + '="' + esc(id) + '"') +
      (choisi === null ? "" : ' aria-pressed="' + !!choisi + '"') + ">" + esc(M(cle)) + "</button>";
  }

  // Le haut de l'écran d'un message : le mot de sorte et son état, le titre, « De… » et « À :… ».
  // etat : la pastille d'état, déjà écrite ; classeTitre : pour l'info, dont le texte est le titre ; sousTitre : l'explication d'une idée.
  function enteteMessage(m, etat, classeTitre, sousTitre) {
    var creation = Msg.dateCreation(m);
    return '<header class="entete entete--message">' +
      '<p class="surtitre"><span class="sorte-message">' + esc(motSorte(m)) + "</span>" + (etat || "") + "</p>" +
      '<h1 tabindex="-1"' + (classeTitre ? ' class="' + classeTitre + '"' : "") + ">" + esc(m.texte) + "</h1>" + (sousTitre || "") +
      '<p class="sous-titre">' + esc(M("msgDeLe", { nom: nomAuteur(m), date: creation ? fmtJourMois.format(creation) : "" })) + "</p>" +
      '<p class="sous-titre">' + esc(M("msgA", { destinataires: aQui(m) })) + "</p>";
  }

  // « 8 Oui sur 10 attendus », ou « 8 Oui » sans nombre attendu.
  function texteCompteur(c) {
    return c.attendus ? Mn("msgCompteurAttendus", c.attendus, { oui: c.oui.length }) : M("msgCompteur", { oui: c.oui.length });
  }

  function etiquetteComplet() { return '<span class="etiquette etiquette--ok">' + esc(M("msgComplet")) + "</span>"; }

  // La paire « Oui » / « Non » : seule exception à « un seul bouton principal par écran ».
  // Avant la réponse, deux boutons pleins de même taille ; après, le bouton choisi reste plein, avec une coche,
  // et l'autre passe en contour. exemple : boutons inertes de la page Charte.
  function paireReponse(id, choisie, exemple) {
    function bouton(valeur) {
      var choisi = choisie === valeur;
      return '<button type="button" class="bouton ' + (!choisie || choisi ? "bouton--principal" : "bouton--secondaire") + (choisi ? " bouton--choisi" : "") + '"' +
        (exemple ? " data-exemple" : ' data-reponse="' + valeur + '" data-message="' + esc(id) + '"') +
        ' aria-pressed="' + choisi + '">' + esc(motReponse(valeur)) + "</button>";
    }
    return '<div class="boutons-ligne paire-reponse">' + bouton("oui") + bouton("non") + "</div>";
  }

  // ----- Écran 1 : Messages, en trois listes -----

  // Demande 009 : chaque ligne porte son mot de sorte, en tête. passee : la ligne est dans « Terminés ».
  function carteMessage(m, passee) {
    var g = G(), p = moi(), sorte = Msg.sorte(m);
    var close = Msg.estClose(m), nouveaux = Msg.nouveauxCommentaires(g, p, m);
    var etiquette = function (cle, ok) { return ' <span class="etiquette' + (ok ? " etiquette--ok" : "") + '">' + esc(M(cle)) + "</span>"; };
    var infos;
    if (sorte === "idee") {
      // « 3 Bonne idée » (rien à zéro), puis « Retenue » ou « Classée ».
      var n = Msg.decompteIdee(g, m).bonneIdee.length;
      infos = (n ? esc(M("msgIdeeCompteur", { n: n })) : "") + (m.etat === "retenue" ? etiquette("msgIdeeRetenue", true) : m.etat === "classee" ? etiquette("msgIdeeClassee") : "");
    } else if (sorte === "info") {
      // « 12 sur 30 ont vu » pour l'auteur seulement ; dans « Terminés », « Close » ou « Vu ».
      infos = (Msg.peutLireQuiAVu(g, p, m) ? esc(texteCompteurInfo(Msg.decompteInfo(g, m))) : "") +
        (close ? etiquette("msgClose") : Msg.aVu(m, p) ? etiquette("msgVu") : "");
    } else {
      var c = Msg.decompte(g, m);
      infos = esc(texteCompteur(c)) + (c.complet ? " " + etiquetteComplet() : "") + (close ? etiquette("msgClose") : "");
    }
    return '<a class="carte' + (passee ? " carte--passee" : "") + '" id="message-' + esc(m.id) + '" data-sorte="' + esc(sorte) + '" href="#message/' + esc(m.id) + '">' +
      '<span class="carte-etiquette sorte-message">' + esc(motSorte(m)) + "</span>" +
      '<span class="carte-titre">' + esc(titreMessage(m)) + "</span>" +
      '<span class="carte-quand">' + esc([deQui(m), quandRendezVous(m)].filter(Boolean).join(" · ")) + "</span>" +
      (infos ? '<span class="carte-infos">' + infos + "</span>" : "") +
      // Demande 008 : les commentaires des autres publiés depuis ma dernière ouverture du message, en toutes lettres.
      (nouveaux ? '<span class="carte-statut nouveaux-commentaires"><span class="etiquette etiquette--ok">' + esc(Mn("msgComNouveaux", nouveaux)) + "</span></span>" : "") +
      "</a>";
  }

  // Trois messages au plus, puis « Voir les N autres messages » qui déplie le reste sur place.
  function sectionMessages(id, titre, liste, vide) {
    var html = '<section class="section" id="liste-' + id + '"><h2 class="section-titre"><span>' + esc(titre) +
      '</span><span class="compte">' + liste.length + "</span></h2>";
    if (!liste.length) { return html + '<p class="calme">' + esc(vide) + "</p></section>"; }
    var carte = function (m) { return carteMessage(m, id === "termines"); };
    html += liste.slice(0, 3).map(carte).join("");
    if (liste.length > 3) {
      html += '<div class="suite-liste" hidden>' + liste.slice(3).map(carte).join("") + "</div>" +
        '<button type="button" class="lien-bouton" data-voir-suite>' + esc(Mn("msgVoirAutres", liste.length - 3)) + "</button>";
    }
    return html + "</section>";
  }

  function voirSuite(bouton) {
    var suite = bouton.previousElementSibling;
    suite.hidden = false;
    bouton.remove();
    var premier = suite.querySelector("a");
    if (premier) { premier.focus({ preventScroll: true }); }
  }

  function ecranMessages() {
    var g = G(), p = moi();
    var l = Msg.listes(g, p);
    var lance = Msg.peutLancer(g, p); // un visiteur répond, il ne lance rien : pas de bouton
    var html = entete(g.nom, M("msgTitre")) + bandeauMessage() +
      // Demande 009 : le bouton principal ouvre le choix entre les trois sortes de messages.
      (lance ? '<a class="bouton bouton--principal" id="ecrire" href="#messages/nouveau">' + esc(M("msgEcrire")) + "</a>" : "");
    if (!(l.aRepondre.length + l.enCours.length + l.termines.length)) {
      html += '<div class="section">' + etatVide("panneau", M("msgVide"), esc(M(lance ? "msgVideAide" : "msgVideAideVisiteur"))) + "</div>";
    } else {
      html += sectionMessages("a-repondre", M("msgListeARepondre"), l.aRepondre, M("msgRienARepondre")) +
        sectionMessages("en-cours", M("msgListeEnCours"), l.enCours, M("msgRienEnCours")) +
        sectionMessages("termines", M("msgListeTermines"), l.termines, M("msgRienTermine"));
    }
    return { titre: M("msgTitre"), onglet: "messages", html: html };
  }

  // Message inexistant, ou personne ni auteur ni destinataire : la même phrase, pour ne rien laisser deviner.
  function messageIntrouvable() {
    return {
      titre: M("msgTitre"), onglet: "messages",
      html: retour("#messages", M("msgRetourMessages")) + entete(G().nom, M("msgTitre")) +
        '<p class="calme" id="message-introuvable">' + esc(M("msgIntrouvable")) + "</p>" +
        '<a class="lien-suite" href="#accueil">' + esc(M("revenirAccueil")) + "</a>"
    };
  }

  // ----- Écrans 2 et 6 : nouvelle question, refaire -----

  function comptePersonnes(n, sansLimite) { return sansLimite ? Mn("nPersonnes", n) : M("msgPersonnesCompte", { n: n }); }

  // Les lignes de « À qui ? » pour cette personne, chacune avec son nombre de personnes : les mêmes pour les trois sortes de messages.
  function optionsAQui(g, p) {
    return Msg.destinatairesPossibles(g, p).map(function (l) {
      var nom = l.sorte === "tous" ? M("msgAToutLeGroupe") : l.sorte === "gestion" ? M("msgAGestion") : l.sorte === "equipe" ? nomEquipe(l.equipe) : M("msgAPersonnes");
      return { valeur: l.valeur, titre: l.sorte === "personnes" ? nom : M("msgAvecCompte", { nom: nom, compte: Mn("nPersonnes", l.personnes.length) }) };
    });
  }
  // La liste des personnes à cocher, cachée tant que « Des personnes choisies » n'est pas choisi.
  function zonePersonnes(g, p, sansLimite) {
    return '<div id="zone-personnes" hidden><fieldset class="choix choix--liste" id="champ-personnes" aria-describedby="erreur-personnes"' +
      ' data-limite="' + (sansLimite ? "" : Msg.LIMITES.personnesMembre) + '">' +
      "<legend>" + esc(M("msgAPersonnes")) + ' <span class="compte" id="compte-personnes">' + esc(comptePersonnes(0, sansLimite)) + "</span></legend>" +
      '<p class="champ-erreur limite-personnes" id="erreur-personnes" role="status"></p>' +
      Msg.personnesProposees(g, p).map(function (x) { return optionChoix("personnes", "checkbox", { valeur: x.id, titre: Gr.nomComplet(x) }, false); }).join("") +
      "</fieldset></div>";
  }

  function ecranNouvelleQuestion(refaireId) {
    var g = G(), p = moi();
    if (!Msg.peutLancer(g, p)) {
      return {
        titre: M("msgDemander"), onglet: "messages",
        html: retour("#messages", M("msgRetourMessages")) + entete(g.nom, M("msgDemander")) +
          '<p class="calme" id="question-refusee">' + esc(M("msgErreurVisiteur")) + "</p>" +
          '<a class="lien-suite" href="#accueil">' + esc(M("revenirAccueil")) + "</a>"
      };
    }
    var origine = null;
    if (refaireId) {
      origine = Msg.trouverVisible(g, p, refaireId);
      if (!origine) { return messageIntrouvable(); }
      // Refaire : l'auteur, plus le bureau ou les organisateurs destinataires ; les autres retrouvent le message.
      // Seule une question se refait (demande 009) : une idée ou une info s'affiche telle quelle.
      if (Msg.sorte(origine) !== "question" || !Msg.peutGerer(g, p, origine)) { return ecranMessage(refaireId); }
    }
    var sansLimite = Gr.peutGerer(g, p); // dix personnes au plus pour un membre seulement
    var o = origine || {};
    var valeur = function (v) { return v || v === 0 ? ' value="' + esc(v) + '"' : ""; };
    var aujourdhui = L.aujourdhui();
    var min = 'min="' + esc(Ev.ecrireDate(aujourdhui)) + '"';

    // À qui ? Un seul choix, chacun avec son nombre de personnes. Rien n'est coché d'avance (sauf « Les mêmes personnes »).
    var options = optionsAQui(g, p);
    if (origine) {
      options.unshift({ valeur: "memes", titre: M("msgAvecCompte", { nom: M("msgAMemesPersonnes"), compte: Mn("nPersonnes", Msg.destinataires(g, origine).length) }) });
    }

    // Demande 007d : « Aujourd'hui », « Demain », cinq jours nommés (« jeudi 19 »), puis « Autre date » ; un toucher chacun.
    var jours = joursProposes(aujourdhui).map(function (d, i) { return { valeur: Ev.ecrireDate(d), titre: titreJour(d, i) }; });
    jours.push({ valeur: "autre", titre: M("msgJourAutre") });
    // Les heures courantes en un toucher, puis « Autre heure ».
    var courantes = M("msgHeuresCourantes");
    var heures = heuresProposees();

    // Refaire : le même jour la semaine suivante, déjà choisi ; s'il est déjà passé (question ancienne), le prochain même jour
    // de la semaine, à partir de demain. Hors de la grille : « Autre date », avec la date dans le champ. Question sans date :
    // aucun jour choisi.
    var jourChoisi = "", autreDate = "";
    var rdvOrigine = origine ? Msg.dateRendezVous(origine) : null;
    if (rdvOrigine) {
      var suivant = L.ajouterJours(rdvOrigine, 7);
      if (L.joursJusqua(suivant) < 0) {
        for (var i = 1; i <= 7; i++) {
          suivant = L.ajouterJours(aujourdhui, i);
          if (suivant.getDay() === rdvOrigine.getDay()) { break; }
        }
      }
      var ecrit = Ev.ecrireDate(suivant);
      if (jours.some(function (j) { return j.valeur === ecrit; })) { jourChoisi = ecrit; } else { jourChoisi = "autre"; autreDate = ecrit; }
    }
    // L'heure d'origine est gardée : l'une des quatre, ou telle quelle dans « Autre heure ».
    var heureChoisie = !o.heure ? "" : courantes.indexOf(o.heure) >= 0 ? o.heure : "autre";
    var autreHeure = heureChoisie === "autre" ? o.heure : "";

    var evenements = estAsso() ? L.evenementsAVenir(g) : [];
    var evenementChoisi = evenements.some(function (e) { return e.id === o.evenementId; }) ? o.evenementId : "";
    var titre = M(origine ? "msgRefaire" : "msgDemander");
    // Demande 009 : une nouvelle question vient du choix « Écrire un message » ; « Refaire » n'y passe pas.
    var html = (origine ? retour("#messages", M("msgRetourMessages")) : retour("#messages/nouveau", M("msgChoixTitre"))) + entete(g.nom, titre) +
      '<form class="form-question" data-refaire="' + (origine ? esc(origine.id) : "") + '"' +
      ' data-choisi-jour="' + esc(jourChoisi) + '" data-choisi-heure="' + esc(heureChoisie) + '" novalidate>' +
      // La question : une ligne, 80 caractères au plus ; le champ n'accepte pas le 81e, un compteur le dit.
      '<div class="champ"><label for="champ-question">' + esc(M("msgChampQuestion")) + "</label>" +
      '<p class="champ-aide" id="aide-question">' + esc(M("msgChampQuestionAide")) + "</p>" +
      '<input id="champ-question" name="question" type="text" autocomplete="off" autocapitalize="sentences" maxlength="' + Msg.LIMITES.texte + '"' +
      valeur(o.texte) + ' aria-describedby="aide-question compte-question erreur-question">' +
      '<p class="discret compte-question" id="compte-question">' + esc(M("msgCompteCaracteres", { n: (o.texte || "").length })) + "</p>" +
      '<p class="champ-erreur" id="erreur-question"></p></div>' +
      choix("a-qui", M("msgChampAQui"), options, origine ? ["memes"] : [], "radio", "choix--liste") +
      // « Des personnes choisies » déplie la liste des personnes, à cocher, avec son compteur.
      zonePersonnes(g, p, sansLimite) +
      // Demande 007d : « Quand ? » est affiché d'emblée, sans repli. La grille des jours, puis la ligne des heures ;
      // « Autre date » et « Autre heure » montrent leur champ, vide, sous la grille et sous la ligne.
      '<fieldset class="choix quand" id="quand"><legend>' + esc(M("msgQuand")) + "</legend>" +
      choixCases("jour", M("msgChampJour"), jours, jourChoisi, "choix--cases") +
      '<div id="zone-autre-date"' + (jourChoisi === "autre" ? "" : " hidden") + ">" +
      champ("autre-date", M("msgJourAutre"), min + valeur(autreDate), "", "date") + "</div>" +
      choixCases("heure", M("msgChampHeure"), heures, heureChoisie, "choix--ligne") +
      '<div id="zone-autre-heure"' + (heureChoisie === "autre" ? "" : " hidden") + ">" +
      champ("autre-heure", M("msgHeureAutre"), valeur(autreHeure), "", "time") + "</div>" +
      "</fieldset>" +
      // Les autres options, repliées (dépliées quand on refait une question, pour que le nombre de Oui repris se voie).
      '<details class="repli" id="options-question"' + (origine ? " open" : "") + '><summary><span class="repli-titres"><span class="repli-titre">' +
      esc(M("msgOptions")) + '</span></span></summary><div class="repli-corps repli-corps--formulaire">' +
      champ("attendus", M("msgChampAttendus"), 'inputmode="numeric" autocomplete="off" maxlength="4" class="champ-court"' + valeur(o.attendus), "") +
      champ("avant-le", M("msgChampAvantLe"), min, "", "date") +
      (estAsso()
        ? choix("evenement", M("msgChampEvenement"), [{ valeur: "", titre: M("msgAucunEvenement") }].concat(evenements.map(function (e) { return { valeur: e.id, titre: e.titre }; })),
          [evenementChoisi], "radio", "choix--liste")
        : "") +
      "</div></details>" +
      '<p class="erreur-generale" role="alert"></p>' +
      // « Envoyer la question » reste en bas de l'écran, seul dans la bande fixe au-dessus du menu.
      bandeAction('<button type="submit" class="bouton bouton--principal">' + esc(M("msgEnvoyer")) + "</button>") +
      "</form>";
    return { titre: titre, onglet: "messages", html: html, champ: origine ? null : "question", bande: true };
  }

  // Le compteur « 24 sur 80 » ; à 80, la phrase qui dit que la question ne peut pas être plus longue.
  function compterCaracteres(champQuestion) {
    var n = champQuestion.value.length, max = Msg.LIMITES.texte;
    document.getElementById("compte-question").textContent = M("msgCompteCaracteres", { n: n });
    var zone = document.getElementById("erreur-question");
    if (n >= max) { zone.textContent = M("msgErreurQuestionLongue"); }
    else if (zone.textContent === M("msgErreurQuestionLongue")) { zone.textContent = ""; }
  }

  // « Des personnes choisies » montre la liste des personnes ; « Autre date » le champ de date ; « Autre heure » le champ d'heure.
  function montrerZonesQuestion(form) {
    form.querySelector("#zone-personnes").hidden = valeurRadio(form, "a-qui") !== "personnes";
    form.querySelector("#zone-autre-date").hidden = valeurRadio(form, "jour") !== "autre";
    form.querySelector("#zone-autre-heure").hidden = valeurRadio(form, "heure") !== "autre";
  }

  // Le jour et l'heure, même règle : toucher un autre choix remplace le premier ; toucher le choix déjà fait l'enlève
  // (le rendez-vous est une option). « Autre date » et « Autre heure » arrivent vides (demande 007d) ;
  // quitter l'un ou l'autre cache le champ, et ce qu'il contenait ne compte plus.
  function choisirJourOuHeure(radio) {
    var form = radio.form, nom = radio.name, cle = "data-choisi-" + nom;
    if (form.getAttribute(cle) === radio.value) { radio.checked = false; }
    var choisi = valeurRadio(form, nom);
    if (choisi !== form.getAttribute(cle)) {
      form.elements[nom === "jour" ? "autre-date" : "autre-heure"].value = "";
    }
    form.setAttribute(cle, choisi);
    montrerZonesQuestion(form);
    effacerErreursRendezVous(form, nom);
  }

  // Une phrase d'erreur disparaît dès que le choix ou le champ est corrigé (comme depuis la demande 006b). Changer le jour
  // efface aussi « Indiquez aussi le jour du rendez-vous. », écrite sous l'heure : elle porte sur les deux.
  function effacerErreursRendezVous(form, nom) {
    var jour = nom === "jour" || nom === "autre-date";
    (jour ? ["jour", "autre-date", "heure"] : ["heure"]).forEach(function (n) {
      var zone = form.querySelector("#erreur-" + n);
      if (zone) { zone.textContent = ""; zone.removeAttribute("data-code"); }
      var el = form.querySelector("#champ-" + n);
      if (el && el.tagName === "INPUT") { el.setAttribute("aria-invalid", "false"); }
    });
  }

  // Compteur des personnes cochées. Membre : « 3 sur 10 » ; à dix, les autres cases ne se cochent plus
  // et la phrase de la limite s'affiche. Bureau, organisateurs : « 3 personnes », aucune case bloquée.
  function compterPersonnes(form) {
    var zone = form.querySelector("#champ-personnes");
    var limite = Number(zone.getAttribute("data-limite")) || 0;
    var cases = zone.querySelectorAll('input[name="personnes"]');
    var n = zone.querySelectorAll('input[name="personnes"]:checked').length;
    form.querySelector("#compte-personnes").textContent = comptePersonnes(n, !limite);
    var plein = limite > 0 && n >= limite;
    Array.prototype.forEach.call(cases, function (x) {
      var bloquee = plein && !x.checked;
      x.disabled = bloquee;
      x.closest(".choix-option").classList.toggle("choix-option--bloquee", bloquee);
    });
    form.querySelector("#erreur-personnes").textContent = plein ? M("msgErreurDixPersonnes") : "";
  }

  function envoyerQuestion(form) {
    var g = G(), el = form.elements;
    var jour = valeurRadio(form, "jour");
    var autre = jour === "autre";
    var heure = valeurRadio(form, "heure");
    if (heure === "autre") { heure = el["autre-heure"] ? el["autre-heure"].value : ""; }
    var saisie = {
      texte: el.question.value, a: valeurRadio(form, "a-qui"), memesDe: form.getAttribute("data-refaire"),
      personnes: Array.prototype.map.call(form.querySelectorAll('input[name="personnes"]:checked'), function (x) { return x.value; }),
      jour: autre ? el["autre-date"].value : jour, heure: heure, attendus: el.attendus.value, avantLe: el["avant-le"].value,
      evenementId: estAsso() ? valeurRadio(form, "evenement") : ""
    };
    var r = Msg.poserQuestion(g, moi(), saisie);
    // Visiteur, ou personne retirée entre-temps : l'écran se redessine et le dit.
    if (r.raison === "droits" || r.raison === "introuvable") { rendre({ focus: true }); return; }
    var e = r.erreurs || {};
    // Une erreur dans le repli ouvre le repli (le jour et l'heure n'y sont plus, demande 007d) ; une erreur sur les personnes montre la liste.
    if (e.attendus || e.avantLe) { form.querySelector("#options-question").open = true; }
    var erreurs = { question: e.texte, "a-qui": e.a, personnes: e.personnes, heure: e.heure, attendus: e.attendus, "avant-le": e.avantLe };
    erreurs[autre ? "autre-date" : "jour"] = e.jour;
    var fautes = montrerErreurs(form, ["question", "a-qui", "personnes", "jour", "autre-date", "heure", "attendus", "avant-le"], erreurs, {
      "question:vide": M("msgErreurQuestionVide"), "question:long": M("msgErreurQuestionLongue"),
      "a-qui": M("msgErreurAQui"), "personnes:aucune": M("msgErreurPersonneAucune"), "personnes:trop": M("msgErreurDixPersonnes"),
      jour: M("msgErreurDatePassee"), "autre-date": M("msgErreurDatePassee"), heure: M("msgErreurHeureSansJour"),
      "attendus:invalide": M("msgErreurAttendus"), "attendus:trop": M("msgErreurAttendusTrop", { n: r.nbDestinataires || 0 }),
      "avant-le:passee": M("msgErreurDatePassee"), "avant-le:apres": M("msgErreurAvantLe")
    });
    if (fautes) {
      // Les phrases qui ne sont pas des erreurs d'envoi (limite atteinte, 80 caractères) restent affichées.
      if (!e.personnes) { compterPersonnes(form); }
      if (!e.texte) { compterCaracteres(el.question); }
      // Demande 007d : le bouton ne bouge plus ; le premier choix ou champ en erreur est amené à l'écran, avec sa phrase.
      amenerErreurALEcran(form);
      return;
    }
    if (!r.ok) { rendre({ focus: true }); return; }
    sauver();
    // Le calendrier s'ouvrira sur le mois du rendez-vous.
    var rdv = Msg.dateRendezVous(r.message);
    if (rdv) { moisAffiche = new Date(rdv.getFullYear(), rdv.getMonth(), 1); }
    // Rien n'est envoyé : l'écran suivant montre le message qui partirait.
    aller("#message/" + r.message.id + "/envoi");
  }

  // Envoi refusé (demande 007d) : le premier choix ou champ en erreur se place entre le bandeau du testeur et la bande
  // du bouton, avec sa phrase. Plus haut que la place libre (longue liste) : son début, ou sa phrase si elle est plus bas.
  function amenerErreurALEcran(form) {
    var phrase = Array.prototype.filter.call(form.querySelectorAll(".champ-erreur"), function (z) { return z.textContent && z.getClientRects().length; })[0];
    if (!phrase) { return; }
    var bandeau = document.querySelector(".demo-bandeau"), bande = document.getElementById("bande-action");
    var haut = (bandeau ? bandeau.getBoundingClientRect().bottom : 0) + 8;
    var bas = (bande ? bande.getBoundingClientRect().top : window.innerHeight) - 8;
    var bloc = (phrase.closest(".champ, .choix") || phrase).getBoundingClientRect(), p = phrase.getBoundingClientRect();
    var de = bloc.top, a = bloc.bottom;
    if (a - de > bas - haut) { if (p.bottom - de <= bas - haut) { a = de + (bas - haut); } else { de = p.top; a = p.bottom; } }
    if (de < haut) { window.scrollBy(0, de - haut); }
    else if (a > bas) { window.scrollBy(0, a - bas); }
  }

  // ----- Écrans 3 et 5 : ce qui serait envoyé, ce qui serait relancé -----

  // Le texte d'une notification, ligne par ligne : la première en gras, puis une ligne par phrase.
  // sorte : "question", "relance" ou "commentaire" ; prenom : qui envoie ; commentaire : le texte cité.
  // Demande 009 : "idee", "info", "idee-retenue" et "idee-classee" s'y ajoutent ; la relance d'une info a sa propre fin.
  function lignesNotification(m, sorte, prenom, commentaire) {
    var g = G();
    var entetes = {
      relance: "msgNotifRelanceEntete", commentaire: "msgNotifComEntete", idee: "msgNotifIdeeEntete", info: "msgNotifInfoEntete",
      "idee-retenue": "msgNotifIdeeRetenueEntete", "idee-classee": "msgNotifIdeeClasseeEntete"
    };
    var premiere = M(entetes[sorte] || "msgNotifEntete", { groupe: g.nom, prenom: prenom });
    var lignes = [m.texte];
    if (sorte === "commentaire") {
      lignes.push(M("msgNotifComCitation", { commentaire: commentaire }), M("msgNotifComFin"));
      return { premiere: premiere, lignes: lignes };
    }
    // L'explication n'apparaît que si elle a été saisie.
    if (sorte === "idee") { return { premiere: premiere, lignes: lignes.concat(m.explication ? [m.explication] : [], [M("msgNotifIdeeFin")]) }; }
    if (sorte === "info") { return { premiere: premiere, lignes: lignes.concat([M("msgNotifInfoFin")]) }; }
    if (sorte === "idee-retenue" || sorte === "idee-classee") { return { premiere: premiere, lignes: lignes.concat([M("msgNotifIdeeDecisionFin")]) }; }
    if (sorte === "relance" && Msg.sorte(m) === "info") { return { premiere: premiere, lignes: lignes.concat([M("msgNotifInfoRelanceFin")]) }; }
    var quand = quandRendezVous(m), avant = Msg.dateAvantLe(m);
    if (quand) { lignes.push(M("msgRendezVous", { quand: quand })); }
    if (sorte !== "relance" && avant) { lignes.push(M("msgNotifAvantLe", { date: fmtLong.format(avant) })); }
    lignes.push(M(sorte === "relance" ? "msgNotifRelanceFin" : "msgNotifFin"));
    return { premiere: premiere, lignes: lignes };
  }
  function blocNotification(n, id) {
    return '<p class="confirmation-quoi"' + (id ? ' id="' + id + '"' : "") + "><strong>" + esc(n.premiere) + "</strong>" +
      n.lignes.map(function (l) { return "<br>" + esc(l); }).join("") + "</p>";
  }

  // « Voir la question », « Voir l'idée », « Voir l'info ».
  function cleVoirMessage(m) { var s = Msg.sorte(m); return s === "idee" ? "msgVoirLIdee" : s === "info" ? "msgVoirLInfo" : "msgVoirLaQuestion"; }

  function ecranEnvoi(m, relance) {
    var g = G(), p = moi(), sorte = Msg.sorte(m);
    // La relance ne vise que ceux qui n'ont pas encore répondu (pour une info : ceux qui n'ont pas vu) ; elle porte le prénom
    // de la personne qui relance.
    var n = !relance ? Msg.destinataires(g, m).length : sorte === "info" ? Msg.decompteInfo(g, m).pasVu.length : Msg.decompte(g, m).sans.length;
    var titre = M(relance ? "msgRelanceTitre" : "msgEnvoiTitre");
    var html = retour("#messages", M("msgRetourMessages")) + entete(g.nom, titre) +
      '<p class="astuce" id="envoi-combien">' + esc(Mn(!relance ? "msgEnvoiTexte" : sorte === "info" ? "msgInfoRelanceTexte" : "msgRelanceTexte", n)) + "</p>" +
      blocNotification(lignesNotification(m, relance ? "relance" : sorte, relance ? p.prenom : prenomAuteur(m)), "message-qui-partirait") +
      '<a class="bouton bouton--principal" href="#message/' + esc(m.id) + '">' + esc(M(cleVoirMessage(m))) + "</a>";
    return { titre: titre, onglet: "messages", html: html };
  }

  // ----- Écran 4 : le message -----

  function listeNoms(id, titre, personnes, vide) {
    var p = moi();
    return '<details class="repli" id="liste-' + id + '"><summary><span class="repli-titres"><span class="repli-titre">' + esc(titre) +
      '</span></span><span class="compte">' + personnes.length + "</span></summary>" +
      '<div class="repli-corps">' +
      (personnes.length
        ? '<ul class="noms">' + personnes.map(function (x) {
          return '<li><span class="personne-nom">' + esc(Gr.nomComplet(x)) +
            (x.id === p.id ? ' <span class="personne-vous">' + esc(M("vous")) + "</span>" : "") + "</span></li>";
        }).join("") + "</ul>"
        : '<p class="calme">' + esc(vide) + "</p>") +
      "</div></details>";
  }

  function ecranMessage(id, sous) {
    var g = G(), p = moi();
    // Ni auteur ni destinataire : le message n'existe pas pour cette personne, adresse directe comprise.
    var m = Msg.trouverVisible(g, p, id);
    if (!m) { return messageIntrouvable(); }
    var sorte = Msg.sorte(m);
    if (sous === "envoi") { return ecranEnvoi(m, false); }
    // Une idée ne se relance pas : son adresse de relance affiche l'idée.
    if (sous === "relance" && sorte !== "idee") {
      var rel = Msg.relance(g, p, id);
      if (rel.ok) { return ecranEnvoi(m, true); }
      // Info que tout le monde a vue, ou close : son auteur le lit, avec le lien vers l'info.
      if (sorte === "info" && Msg.estAuteur(g, p, m) && (rel.raison === "tout-vu" || rel.raison === "close")) {
        return {
          titre: M("msgRelanceTitre"), onglet: "messages",
          html: retour("#messages", M("msgRetourMessages")) + entete(g.nom, M("msgRelanceTitre")) +
            '<p class="calme" id="relance-inutile">' +
            esc(rel.raison === "close" ? M("msgInfoCloseLe", { date: fmtJourMois.format(Msg.dateCloture(m)) }) : M("msgInfoToutVu")) + "</p>" +
            '<a class="lien-suite" href="#message/' + esc(m.id) + '">' + esc(M("msgVoirLInfo")) + "</a>"
        };
      }
      if (rel.raison === "tout-repondu") {
        return {
          titre: M("msgRelanceTitre"), onglet: "messages",
          html: retour("#messages", M("msgRetourMessages")) + entete(g.nom, M("msgRelanceTitre")) +
            '<p class="calme" id="relance-inutile">' + esc(M("msgListePasReponduVide")) + "</p>" +
            '<a class="bouton bouton--principal" href="#message/' + esc(m.id) + '">' + esc(M("msgVoirLaQuestion")) + "</a>"
        };
      }
      // Personne qui ne peut pas relancer, ou question close : le message, sans relance.
    } else if (sous && sous !== "relance") { return introuvable(); }
    if (sorte === "idee") { return ecranIdee(m); }
    if (sorte === "info") { return ecranInfo(m); }

    var c = Msg.decompte(g, m);
    var close = Msg.estClose(m), destinataire = Msg.estDestinataire(g, p, m), gerable = Msg.peutGerer(g, p, m), maReponse = Msg.reponse(m, p);
    var creation = Msg.dateCreation(m), avant = Msg.dateAvantLe(m), quand = quandRendezVous(m), rdv = Msg.dateRendezVous(m);
    var evenement = estAsso() && m.evenementId ? L.trouverEvenement(g, m.evenementId) : null;
    var pour = evenement ? M("msgPourEvenement").split("{titre}") : null;
    var ligne = function (texte) { return '<p class="sous-titre">' + texte + "</p>"; };
    var html = retour("#messages", M("msgRetourMessages")) +
      '<header class="entete entete--message">' +
      // Demande 009 : le mot de sorte, au-dessus du titre. Question close : la pastille « Close » à sa suite.
      '<p class="surtitre"><span class="sorte-message">' + esc(motSorte(m)) + "</span>" + (close ? ' <span class="etiquette">' + esc(M("msgClose")) + "</span>" : "") + "</p>" +
      '<h1 tabindex="-1">' + esc(m.texte) + "</h1>" +
      ligne(esc(M("msgDeLe", { nom: nomAuteur(m), date: creation ? fmtJourMois.format(creation) : "" }))) +
      ligne(esc(M("msgA", { destinataires: aQui(m) }))) +
      (quand ? ligne(esc(M("msgRendezVous", { quand: quand }))) : "") +
      (avant ? ligne(esc(M("msgAvantLe", { date: fmtLong.format(avant) }))) : "") +
      (pour ? ligne(esc(pour[0]) + '<a href="#evenement/' + esc(evenement.id) + '">' + esc(evenement.titre) + "</a>" + esc(pour[1] || "")) : "") +
      "</header>" + bandeauMessage();

    if (close) {
      // Close : plus de boutons « Oui » / « Non », plus de relance ; les listes restent lisibles.
      html += '<p class="astuce" id="question-close">' + esc(M("msgCloseLe", { date: fmtJourMois.format(Msg.dateCloture(m)) })) +
        (destinataire ? " " + esc(maReponse ? M("msgVotreReponse", { reponse: motReponse(maReponse) }) : M("msgSansReponse")) : "") + "</p>";
    } else if (destinataire) {
      html += '<section class="ma-reponse" id="ma-reponse">' + paireReponse(m.id, maReponse) +
        (maReponse ? '<p class="message-ok" role="status">' + esc(M("msgVotreReponse", { reponse: motReponse(maReponse) }) + " " + M("msgChangerAide")) + "</p>" : "") +
        "</section>";
    }

    // Le compteur en toutes lettres, « Complet » (un mot et une forme) ; la barre n'est qu'un complément.
    html += '<section class="section" id="compteur"><h2 class="section-titre"><span id="compteur-texte">' + esc(texteCompteur(c)) + "</span>" +
      (c.complet ? etiquetteComplet() : "") + "</h2>" +
      (c.attendus ? '<div class="barre" aria-hidden="true"><span style="width:' + Math.min(100, Math.round(100 * c.oui.length / c.attendus)) + '%"></span></div>' : "") +
      listeNoms("oui", M("msgOui"), c.oui, M("msgListeOuiVide")) +
      listeNoms("non", M("msgNon"), c.non, M("msgListeNonVide")) +
      listeNoms("sans", M("msgListePasRepondu"), c.sans, M("msgListePasReponduVide")) + "</section>";

    // Un seul bouton principal, selon le cas : la paire « Oui » / « Non » si je peux répondre ; sinon « Relancer »
    // (question ouverte, auteur non destinataire) ; « Refaire » (question close que je peux gérer) ; sinon aucun.
    var principal = close ? "refaire" : destinataire ? "" : "relancer";
    var classe = function (nom) { return "bouton " + (principal === nom ? "bouton--principal" : "bouton--secondaire"); };
    var boutons = "";
    if (rdv && maReponse === "oui" && L.joursJusqua(rdv) >= 0) {
      boutons += '<button type="button" class="bouton bouton--secondaire" data-agenda-question="' + esc(m.id) + '">' + esc(M("msgAjouterAgenda")) + "</button>";
    }
    // Relancer, clore, refaire : l'auteur, plus le bureau ou les organisateurs destinataires.
    if (gerable) {
      if (!close && c.sans.length) { boutons += '<a class="' + classe("relancer") + '" id="relancer" data-relancer="' + esc(m.id) + '" href="#message/' + esc(m.id) + '/relance">' + esc(M("msgRelancer")) + "</a>"; }
      if (!close) { boutons += '<button type="button" class="bouton bouton--secondaire" data-clore="' + esc(m.id) + '">' + esc(M("msgClore")) + "</button>"; }
    }
    if (boutons) { html += '<div class="section" id="gestion-question">' + boutons + "</div>"; }
    // Demande 007d : « Refaire cette question » quitte le bas de la page pour la bande fixe au-dessus du menu, visible sans
    // défiler. Même poids qu'avant : secondaire tant que la question est ouverte, principal une fois close.
    if (gerable) {
      html += bandeAction('<a class="' + classe("refaire") + '" id="refaire" href="#messages/nouveau/question/' + esc(m.id) + '">' + esc(M("msgRefaire")) + "</a>");
    }
    // Place gardée pour le partage par lien (demande 010), avec les boutons de l'auteur. Les commentaires (demande 008)
    // sont le dernier élément de la page.
    // Ouvrir le message, c'est avoir lu ses commentaires : la mention « N nouveaux commentaires » disparaît de la liste.
    if (Msg.marquerVus(g, p, m)) { sauver(); }
    html += sectionCommentaires(m, close);
    return { titre: m.texte, onglet: "messages", html: html, bande: gerable };
  }

  // ----- Demande 009, écran 2 : « Écrire un message », le choix entre les trois sortes -----

  // Un visiteur répond, il n'écrit rien : par l'adresse directe des écrans 2, 3 et 4, la même phrase.
  function refusEcrire(titre) {
    return {
      titre: titre, onglet: "messages",
      html: retour("#messages", M("msgRetourMessages")) + entete(G().nom, titre) +
        '<p class="calme" id="ecrire-refuse">' + esc(M("msgErreurVisiteurEcrire")) + "</p>" +
        '<a class="lien-suite" href="#accueil">' + esc(M("revenirAccueil")) + "</a>"
    };
  }

  // Trois lignes de même poids, dans cet ordre ; rien n'est choisi d'avance, aucun bouton.
  function ecranChoixMessage() {
    var g = G();
    if (!Msg.peutLancer(g, moi())) { return refusEcrire(M("msgChoixTitre")); }
    var lignes = [
      ["question", "msgDemander", "msgChoixQuestionAide"],
      ["idee", "msgLancerIdee", "msgChoixIdeeAide"],
      ["info", "msgDonnerInfo", "msgChoixInfoAide"]
    ];
    var html = retour("#messages", M("msgRetourMessages")) + entete(g.nom, M("msgChoixTitre")) +
      '<div class="section" id="choix-message">' + lignes.map(function (l) {
        return '<a class="carte" id="choix-' + l[0] + '" href="#messages/nouveau/' + l[0] + '">' +
          '<span class="carte-titre">' + esc(M(l[1])) + "</span>" +
          '<span class="carte-quand">' + esc(M(l[2])) + "</span></a>";
      }).join("") + "</div>";
    return { titre: M("msgChoixTitre"), onglet: "messages", html: html };
  }

  // ----- Demande 009, écrans 3 et 4 : « Nouvelle idée », « Nouvelle info » -----

  // N7 : une zone de saisie sur plusieurs lignes, 300 caractères au plus, avec son compteur dessous.
  function champLignes(nom, libelle, aide, lignes) {
    return '<div class="champ"><label for="champ-' + nom + '">' + esc(libelle) + "</label>" +
      (aide ? '<p class="champ-aide" id="aide-' + nom + '">' + esc(aide) + "</p>" : "") +
      '<textarea id="champ-' + nom + '" name="' + nom + '" rows="' + lignes + '" maxlength="' + Msg.LIMITES.info + '" autocapitalize="sentences"' +
      ' aria-describedby="' + (aide ? "aide-" + nom + " " : "") + "compte-" + nom + " erreur-" + nom + '"></textarea>' +
      '<p class="discret compte-champ" id="compte-' + nom + '">' + esc(M("msgCompteCaracteres300", { n: 0 })) + "</p>" +
      '<p class="champ-erreur" id="erreur-' + nom + '"></p></div>';
  }

  // sorte : "idee" ou "info". Même « À qui ? » que la question, rien de coché d'avance. Le bouton est dans la page.
  function ecranEcrire(sorte) {
    var g = G(), p = moi(), idee = sorte === "idee";
    var titre = M(idee ? "msgLancerIdee" : "msgDonnerInfo");
    if (!Msg.peutLancer(g, p)) { return refusEcrire(titre); }
    var sansLimite = Gr.peutGerer(g, p); // dix personnes au plus pour un membre seulement
    var html = retour("#messages/nouveau", M("msgChoixTitre")) + entete(g.nom, titre) +
      '<form class="form-ecrire" data-sorte="' + sorte + '" novalidate>' +
      (idee
        // L'idée : une ligne, 80 caractères au plus ; le champ n'accepte pas le 81e, un compteur le dit.
        ? '<div class="champ"><label for="champ-idee">' + esc(M("msgChampIdee")) + "</label>" +
          '<p class="champ-aide" id="aide-idee">' + esc(M("msgChampIdeeAide")) + "</p>" +
          '<input id="champ-idee" name="idee" type="text" autocomplete="off" autocapitalize="sentences" maxlength="' + Msg.LIMITES.texte + '"' +
          ' aria-describedby="aide-idee compte-idee erreur-idee">' +
          '<p class="discret compte-champ" id="compte-idee">' + esc(M("msgCompteCaracteres", { n: 0 })) + "</p>" +
          '<p class="champ-erreur" id="erreur-idee"></p></div>' +
          // L'explication, facultative, repliée.
          '<details class="repli" id="explication-idee"><summary><span class="repli-titres"><span class="repli-titre">' +
          esc(M("msgIdeeExplication")) + '</span></span></summary><div class="repli-corps repli-corps--formulaire">' +
          champLignes("explication", M("msgChampExplication"), "", 4) + "</div></details>"
        // L'info : un texte, sur plusieurs lignes, 300 caractères au plus.
        : champLignes("info", M("msgChampInfo"), M("msgChampInfoAide"), 6)) +
      choix("a-qui", M("msgChampAQui"), optionsAQui(g, p), [], "radio", "choix--liste") +
      zonePersonnes(g, p, sansLimite) +
      // Toujours visible, quel que soit le choix : le bureau (ou les organisateurs) reçoit aussi l'idée.
      (idee ? '<p class="astuce" id="idee-aussi-gestion">' + esc(M("msgIdeeAussiGestion")) + "</p>" : "") +
      '<p class="erreur-generale" role="alert"></p>' +
      '<button type="submit" class="bouton bouton--principal">' + esc(M(idee ? "msgEnvoyerIdee" : "msgEnvoyerInfo")) + "</button>" +
      "</form>";
    return { titre: titre, onglet: "messages", html: html, champ: idee ? "idee" : "info" };
  }

  // Le compteur sous un champ (« 27 sur 80 », « 64 sur 300 ») ; à la limite, la phrase qui le dit. Un texte posé d'un coup est coupé.
  function compterChamp(c) {
    var court = c.name === "idee";
    var max = court ? Msg.LIMITES.texte : Msg.LIMITES.info;
    var phrase = M(court ? "msgErreurIdeeLongue" : "msgErreur300");
    if (c.value.length > max) { c.value = c.value.slice(0, max); }
    var n = c.value.length;
    document.getElementById("compte-" + c.name).textContent = M(court ? "msgCompteCaracteres" : "msgCompteCaracteres300", { n: n });
    var zone = document.getElementById("erreur-" + c.name);
    if (n >= max) { zone.textContent = phrase; }
    else if (zone.textContent === phrase) { zone.textContent = ""; }
  }

  function envoyerEcrit(form) {
    var g = G(), el = form.elements, idee = form.getAttribute("data-sorte") === "idee";
    var nom = idee ? "idee" : "info";
    var saisie = {
      texte: el[nom].value, explication: idee ? el.explication.value : "", a: valeurRadio(form, "a-qui"),
      personnes: Array.prototype.map.call(form.querySelectorAll('input[name="personnes"]:checked'), function (x) { return x.value; })
    };
    var r = idee ? Msg.lancerIdee(g, moi(), saisie) : Msg.donnerInfo(g, moi(), saisie);
    // Visiteur, ou personne retirée entre-temps : l'écran se redessine et le dit.
    if (r.raison === "droits" || r.raison === "introuvable") { rendre({ focus: true }); return; }
    var e = r.erreurs || {};
    if (e.explication) { form.querySelector("#explication-idee").open = true; }
    var erreurs = { explication: e.explication, "a-qui": e.a, personnes: e.personnes };
    erreurs[nom] = e.texte;
    var fautes = montrerErreurs(form, [nom, "explication", "a-qui", "personnes"], erreurs, {
      "idee:vide": M("msgErreurIdeeVide"), "idee:long": M("msgErreurIdeeLongue"),
      "info:vide": M("msgErreurInfoVide"), "info:long": M("msgErreur300"), explication: M("msgErreur300"),
      "a-qui": M("msgErreurAQuiEnvoyer"), "personnes:aucune": M("msgErreurPersonneAucune"), "personnes:trop": M("msgErreurDixPersonnes")
    });
    if (fautes) {
      // La phrase de la limite des dix personnes n'est pas une erreur d'envoi : elle reste affichée.
      if (!e.personnes) { compterPersonnes(form); }
      amenerErreurALEcran(form);
      return;
    }
    if (!r.ok) { rendre({ focus: true }); return; }
    sauver();
    // Rien n'est envoyé : l'écran suivant montre le message qui partirait.
    aller("#message/" + r.message.id + "/envoi");
  }

  // ----- Demande 009, écran 6 : le message, une idée -----

  function ecranIdee(m) {
    var g = G(), p = moi();
    var c = Msg.decompteIdee(g, m);
    var destinataire = Msg.estDestinataire(g, p, m), dit = Msg.aDitBonneIdee(m, p), decide = Msg.peutDecider(g, p, m);
    var evenement = Msg.evenementDeLIdee(g, m);
    var etat = m.etat === "retenue" ? ' <span class="etiquette etiquette--ok">' + esc(M("msgIdeeRetenue")) + "</span>"
      : m.etat === "classee" ? ' <span class="etiquette">' + esc(M("msgIdeeClassee")) + "</span>" : "";
    var html = retour("#messages", M("msgRetourMessages")) +
      enteteMessage(m, etat, "", m.explication ? '<p class="message-texte" id="idee-explication">' + esc(m.explication) + "</p>" : "") + "</header>" +
      bandeauMessage() +
      // Association : l'événement né de l'idée, sous son nom d'aujourd'hui. La phrase entière est le lien.
      (evenement ? '<p><a class="lien-suite" id="idee-evenement" href="#evenement/' + esc(evenement.id) + '">' + esc(M("msgIdeeDevenueEvenement", { nom: evenement.titre })) + "</a></p>" : "");

    if (m.etat) {
      // Retenue ou classée : plus de bouton « Bonne idée » ; le compteur, les listes et les commentaires restent lisibles.
      html += '<p class="astuce" id="idee-decidee">' +
        esc(M(m.etat === "retenue" ? "msgIdeeRetenueLe" : "msgIdeeClasseeLe", { date: fmtJourMois.format(Msg.dateCloture(m)) })) + "</p>";
      // Association, bureau, idée retenue qui n'est pas encore devenue un événement : le seul bouton principal de l'écran.
      if (Msg.peutEnFaireUnEvenement(g, p, m)) {
        html += '<a class="bouton bouton--principal" id="en-faire-evenement" href="#evenement/nouveau/idee/' + esc(m.id) + '">' + esc(M("msgIdeeEnEvenement")) + "</a>";
      }
    } else if (destinataire) {
      // Un geste pour dire « Bonne idée », un geste pour la retirer ; une seule fois par personne.
      html += '<section class="ma-reponse" id="ma-reponse">' + boutonReponse("msgBonneIdee", "data-bonne-idee", m.id, dit) +
        (dit
          ? '<p class="message-ok" role="status">' + esc(M("msgIdeeVotreReponse")) + "</p>" +
            '<button type="button" class="lien-bouton" data-retirer-idee="' + esc(m.id) + '">' + esc(M("msgIdeeRetirer")) + "</button>"
          : "") + "</section>";
    }

    // Le compteur en toutes lettres, puis les deux listes repliées.
    html += '<section class="section" id="compteur"><h2 class="section-titre"><span id="compteur-texte">' +
      esc(c.bonneIdee.length ? M("msgIdeeCompteur", { n: c.bonneIdee.length }) : M("msgIdeeCompteurZero")) + "</span></h2>" +
      listeNoms("bonne-idee", M("msgBonneIdee"), c.bonneIdee, M("msgIdeeCompteurZero")) +
      listeNoms("destinataires", M("msgListeDestinataires"), c.destinataires, "") + "</section>";

    // Le bureau ou les organisateurs : un toucher, sans confirmation, car on peut changer d'avis. Jamais côte à côte.
    if (decide) {
      html += '<div class="section" id="gestion-idee">' +
        (m.etat !== "retenue" ? '<button type="button" class="bouton bouton--secondaire" data-decider="retenue" data-message="' + esc(m.id) + '">' + esc(M("msgIdeeRetenir")) + "</button>" : "") +
        (m.etat !== "classee" ? '<button type="button" class="bouton bouton--secondaire" data-decider="classee" data-message="' + esc(m.id) + '">' + esc(M("msgIdeeClasser")) + "</button>" : "") +
        "</div>";
    }
    if (Msg.marquerVus(g, p, m)) { sauver(); }
    html += sectionCommentaires(m, !!m.etat);
    return { titre: m.texte, onglet: "messages", html: html };
  }

  // « Bonne idée », ou « Retirer ma réponse » : sans changer d'écran.
  function direBonneIdee(id, dit) {
    var r = Msg.direBonneIdee(G(), moi(), id, dit);
    if (r.ok) { sauver(); }
    rendre({ garderDefilement: true, garderReplis: true });
    var suite = document.querySelector("#ma-reponse .reponse-seule");
    if (suite) { suite.focus({ preventScroll: true }); }
  }

  // « Retenir l'idée », « Classer l'idée » : un toucher. L'auteur est prévenu (voir Démo › « Voir ce qui serait envoyé »).
  function deciderIdee(bouton) {
    var r = Msg.deciderIdee(G(), moi(), bouton.getAttribute("data-message"), bouton.getAttribute("data-decider"));
    if (r.ok) { sauver(); }
    rendre({ focus: true });
  }

  // ----- Demande 009, écran 7 : le message, une info -----

  function ecranInfo(m) {
    var g = G(), p = moi();
    var d = Msg.decompteInfo(g, m), close = Msg.estClose(m);
    var auteur = Msg.estAuteur(g, p, m), destinataire = Msg.estDestinataire(g, p, m), vu = Msg.aVu(m, p);
    // Le texte de l'info est le titre de la page : elle n'en a pas d'autre.
    var html = retour("#messages", M("msgRetourMessages")) +
      enteteMessage(m, close ? ' <span class="etiquette">' + esc(M("msgClose")) + "</span>" : "", "message-texte message-texte--titre") + "</header>" +
      bandeauMessage();

    // Seul l'auteur lit les noms (décision du 2026-11-19) : le compteur et les deux listes, tout de suite sous le texte, sans dérouler ni toucher.
    if (Msg.peutLireQuiAVu(g, p, m)) {
      var total = d.destinataires.length;
      html += '<section class="section" id="compteur"><h2 class="section-titre"><span id="compteur-texte">' + esc(texteCompteurInfo(d)) + "</span></h2>" +
        (total ? '<div class="barre" aria-hidden="true"><span style="width:' + Math.round(100 * d.vu.length / total) + '%"></span></div>' : "") +
        listeNoms("vu", M("msgInfoListeVu"), d.vu, M("msgInfoListeVuVide")) +
        listeNoms("pas-vu", M("msgInfoListePasVu"), d.pasVu, M("msgInfoToutVu")) + "</section>";
    }
    if (close) {
      // Close : plus de bouton « Vu », plus de relance ; le texte et les listes restent lisibles.
      html += '<p class="astuce" id="info-close">' + esc(M("msgInfoCloseLe", { date: fmtJourMois.format(Msg.dateCloture(m)) })) + "</p>";
    } else if (destinataire) {
      // « Vu » est un geste voulu : ouvrir l'info ne suffit pas. Après le toucher, le bouton laisse la place à la phrase.
      html += '<section class="ma-reponse" id="ma-reponse">' +
        (vu ? '<p class="message-ok" role="status" tabindex="-1">' + esc(M("msgInfoVotreReponse")) + "</p>" : boutonReponse("msgVu", "data-vu", m.id, null)) +
        "</section>";
    }
    // Les destinataires lisent le compteur seul (critère 5 de la situation) : aucun nom, aucune liste. Seul l'auteur lit les noms.
    if (!auteur) {
      html += '<section class="section" id="compteur"><h2 class="section-titre"><span id="compteur-texte">' + esc(texteCompteurInfo(d)) + "</span></h2></section>";
    }
    // L'auteur : « Relancer ceux qui n'ont pas vu » tant qu'il en reste, seul bouton principal ; « Clore l'info », après confirmation.
    if (auteur && !close) {
      html += '<div class="section" id="gestion-info">' +
        (d.pasVu.length ? '<a class="bouton bouton--principal" id="relancer" data-relancer="' + esc(m.id) + '" href="#message/' + esc(m.id) + '/relance">' + esc(M("msgInfoRelancer")) + "</a>" : "") +
        '<button type="button" class="bouton bouton--secondaire" data-clore="' + esc(m.id) + '">' + esc(M("msgInfoClore")) + "</button></div>";
    }
    if (Msg.marquerVus(g, p, m)) { sauver(); }
    html += sectionCommentaires(m, close);
    return { titre: debutTexte(m.texte), onglet: "messages", html: html };
  }

  // « Vu », en un geste : depuis l'écran de l'info comme depuis le bloc « À répondre » de l'accueil. Sans retour.
  function marquerVu(id) {
    var accueil = adresseActuelle().split("/")[0] === "accueil";
    var r = Msg.marquerVu(G(), moi(), id);
    if (r.ok) {
      sauver();
      if (accueil) { reponseAccueil = { id: id, reponse: "vu" }; }
    }
    rendre({ garderDefilement: true, garderReplis: true });
    var suite = document.querySelector(accueil ? "#bloc-repondre .message-ok" : "#ma-reponse .message-ok");
    if (suite) { suite.focus({ preventScroll: true }); }
  }

  // ----- Demande 008 : les commentaires, sous le message -----
  // Le commentaire est le second texte libre, après la question : il passe partout par esc(), jamais écrit comme du HTML.

  // « 17 novembre à 18 h 40 » : le jour et l'heure d'un commentaire ou d'un envoi.
  function quandPrecis(date, heure) {
    if (!date) { return ""; }
    return heure ? M("msgDateHeure", { date: fmtJourMois.format(date), heure: heureLisible(heure) }) : fmtJourMois.format(date);
  }

  // Le nom comme dans « Personnes » ; si la personne n'est plus dans le groupe, le nom noté sur le commentaire.
  function nomCommentaire(c) { var x = Gr.trouverPersonne(G(), c.auteurId); return x ? Gr.nomComplet(x) : (c.auteur || ""); }

  // N8 : un commentaire. Le texte, la signature dessous, puis le lien « Supprimer ce commentaire » pour qui en a le droit.
  // exemple : ligne inerte de la page Charte.
  function ligneCommentaire(o) {
    // « Mehdi Saïdi · le 17 novembre à 18 h 40 » : le point médian tient à la date, qui ne se coupe pas.
    var morceaux = M("msgComSigne").split(" · ");
    var nom = function (t) { return esc(remplacer(t, { nom: o.nom, quand: o.quand })) + (o.moi && t.indexOf("{nom}") >= 0 ? ' <span class="personne-vous">' + esc(M("vous")) + "</span>" : ""); };
    var signature = morceaux.length === 2
      ? '<span class="suite-part">' + nom(morceaux[0]) + '</span><span class="suite-part insecable"><span class="suite-point"> · </span>' + nom(morceaux[1]) + "</span>"
      : '<span class="suite-part">' + nom(morceaux.join(" · ")) + "</span>";
    return '<li class="personne commentaire"' + (o.id ? ' id="commentaire-' + esc(o.id) + '"' : "") + (o.cache ? " hidden" : "") + ">" +
      '<p class="commentaire-texte">' + esc(o.texte) + "</p>" +
      '<span class="personne-detail suite">' + signature + "</span>" +
      (o.supprimable
        ? '<button type="button" class="lien-bouton lien-bouton--ligne"' +
          (o.exemple ? " data-exemple" : ' data-supprimer-commentaire="' + esc(o.id) + '" data-message="' + esc(o.messageId) + '"') + ">" +
          '<span aria-hidden="true">' + esc(M("msgComSupprimer")) + "</span>" +
          '<span class="visuellement-cache">' + esc(M("msgComSupprimerLecture", { nom: o.nom, quand: o.quand })) + "</span></button>"
        : "") + "</li>";
  }

  // N7 : la zone de saisie sur plusieurs lignes, avec son compteur dessous. Le champ n'accepte pas le 301e caractère.
  function champCommentaire(id, valeur, inerte) {
    return '<div class="champ"><label for="' + id + '">' + esc(M("msgComChamp")) + "</label>" +
      '<textarea id="' + id + '"' + (inerte ? " readonly" : ' name="commentaire"') + ' rows="3" maxlength="' + Msg.LIMITES.commentaire + '" autocapitalize="sentences"' +
      (inerte ? "" : ' aria-describedby="compte-commentaire erreur-commentaire"') + ">" + esc(valeur || "") + "</textarea>" +
      '<p class="discret compte-commentaire"' + (inerte ? "" : ' id="compte-commentaire"') + ">" + esc(M("msgCompteCaracteres300", { n: (valeur || "").length })) + "</p>" +
      (inerte ? "" : '<p class="champ-erreur" id="erreur-commentaire"></p>') + "</div>";
  }

  function sectionCommentaires(m, close) {
    var g = G(), p = moi();
    var liste = Msg.commentaires(m);
    // Les trois plus récents sont affichés ; les plus anciens se déplient sur place, sans changer l'ordre.
    var caches = anciensDeplies === m.id ? 0 : Math.max(0, liste.length - 3);
    var fait = commentaireFait && commentaireFait.id === m.id ? commentaireFait.quoi : "";
    commentaireFait = null;
    var html = '<section class="section" id="commentaires"><h2 class="section-titre"><span>' + esc(M("msgComTitre")) +
      '</span><span class="compte" id="compte-commentaires">' + liste.length + "</span></h2>";
    if (caches) { html += '<button type="button" class="lien-bouton" data-voir-anciens="' + esc(m.id) + '">' + esc(Mn("msgComVoirAnciens", caches)) + "</button>"; }
    html += liste.length
      ? '<ul class="personnes" id="liste-commentaires">' + liste.map(function (c, i) {
        return ligneCommentaire({
          id: c.id, messageId: m.id, texte: c.texte, nom: nomCommentaire(c), moi: c.auteurId === p.id,
          quand: quandPrecis(Msg.dateCommentaire(c), c.heure), cache: i < caches, supprimable: Msg.peutSupprimerCommentaire(g, p, m, c)
        });
      }).join("") + "</ul>"
      : '<p class="calme" id="aucun-commentaire">' + esc(M("msgComVide")) + "</p>";
    var statut = '<p class="message-ok" id="commentaire-statut" role="status" tabindex="-1"' + (fait === "publie" || fait === "supprime" ? "" : " hidden") + ">" +
      esc(fait === "publie" ? M("msgComPublie") : fait === "supprime" ? M("msgComSupprime") : "") + "</p>" +
      '<p class="champ-erreur" id="erreur-supprimer-commentaire" role="alert">' + esc(fait === "droits" ? M("msgComErreurSupprimer") : "") + "</p>";
    if (close) {
      // Message clos : les commentaires restent lisibles, on ne peut plus en écrire.
      html += '<p class="calme" id="commentaires-clos">' + esc(M("msgComClos")) + "</p>" + statut;
    } else {
      // Le champ est toujours visible ; « Publier le commentaire » n'est jamais le bouton principal de l'écran.
      html += '<form class="form-commentaire" data-message="' + esc(m.id) + '" novalidate>' + champCommentaire("champ-commentaire", "") +
        '<button type="submit" class="bouton bouton--secondaire" id="publier-commentaire">' + esc(M("msgComPublier")) + "</button>" + statut + "</form>";
    }
    return html + "</section>";
  }

  // Le compteur « 24 sur 300 » ; à 300, la phrase de la limite. Un texte posé d'un coup est coupé à 300.
  function compterCommentaire(zone) {
    var max = Msg.LIMITES.commentaire;
    if (zone.value.length > max) { zone.value = zone.value.slice(0, max); }
    var n = zone.value.length;
    document.getElementById("compte-commentaire").textContent = M("msgCompteCaracteres300", { n: n });
    var erreur = document.getElementById("erreur-commentaire");
    if (n >= max) { erreur.textContent = M("msgComErreurLong"); }
    else if (erreur.textContent === M("msgComErreurLong")) { erreur.textContent = ""; }
  }

  // Un élément est amené entre le bandeau du testeur et la bande du bouton (ou le menu), s'il n'y est pas déjà.
  function amenerALEcran(el) {
    if (!el || !el.getClientRects().length) { return; }
    var bandeau = document.querySelector(".demo-bandeau"), bande = document.getElementById("bande-action"), menu = document.getElementById("onglets");
    var haut = (bandeau ? bandeau.getBoundingClientRect().bottom : 0) + 8;
    var bas = (bande ? bande.getBoundingClientRect().top : menu && !menu.hidden ? menu.getBoundingClientRect().top : window.innerHeight) - 8;
    var r = el.getBoundingClientRect();
    if (r.bottom > bas) { window.scrollBy(0, r.bottom - bas); }
    else if (r.top < haut) { window.scrollBy(0, r.top - haut); }
  }

  // Publier : aucun changement d'écran. Le commentaire apparaît en dernier, le champ se vide, la phrase le dit.
  function publierCommentaire(form) {
    var id = form.getAttribute("data-message"), zone = form.elements.commentaire;
    var r = Msg.commenter(G(), moi(), id, zone.value);
    if (r.raison === "saisie") {
      document.getElementById("erreur-commentaire").textContent = M(r.erreur === "long" ? "msgComErreurLong" : "msgComErreurVide");
      zone.setAttribute("aria-invalid", "true");
      zone.focus();
      amenerALEcran(document.getElementById("erreur-commentaire"));
      return;
    }
    // Message clos entre-temps, ou qui ne m'est plus adressé : l'écran se redessine et le dit ; rien n'est publié.
    if (!r.ok) { rendre({ garderDefilement: true, garderReplis: true }); return; }
    sauver();
    commentaireFait = { id: id, quoi: "publie" };
    rendre({ garderDefilement: true, garderReplis: true });
    montrerStatutCommentaire();
  }

  function montrerStatutCommentaire() {
    var statut = document.getElementById("commentaire-statut");
    if (statut && !statut.hidden) { statut.focus({ preventScroll: true }); amenerALEcran(statut); }
  }

  // Supprimer : toujours une confirmation, qui ne recopie pas le texte. Le droit est contrôlé par les règles, avant la question.
  function supprimerCommentaire(bouton) {
    var g = G(), p = moi();
    var id = bouton.getAttribute("data-message"), cid = bouton.getAttribute("data-supprimer-commentaire");
    var m = Msg.trouverVisible(g, p, id);
    var c = m ? Msg.trouverCommentaire(m, cid) : null;
    if (!c) { rendre({ garderDefilement: true, garderReplis: true }); return; }
    if (!Msg.peutSupprimerCommentaire(g, p, m, c)) {
      commentaireFait = { id: id, quoi: "droits" };
      rendre({ garderDefilement: true, garderReplis: true });
      amenerALEcran(document.getElementById("erreur-supprimer-commentaire"));
      return;
    }
    if (!window.confirm(M("msgComConfirmerSupprimer"))) { return; }
    if (Msg.supprimerCommentaire(g, p, id, cid).ok) {
      sauver();
      commentaireFait = { id: id, quoi: "supprime" };
    }
    rendre({ garderDefilement: true, garderReplis: true });
    montrerStatutCommentaire();
  }

  // « Voir les N commentaires plus anciens » : ils se déplient sur place, au-dessus des trois plus récents.
  function voirAnciens(bouton) {
    anciensDeplies = bouton.getAttribute("data-voir-anciens");
    Array.prototype.forEach.call(document.querySelectorAll("#liste-commentaires > li[hidden]"), function (li) { li.hidden = false; });
    bouton.remove();
  }


  // Oui ou Non, en un geste : depuis l'écran du message comme depuis le bloc « À répondre » de l'accueil.
  function repondreQuestion(bouton) {
    var id = bouton.getAttribute("data-message"), valeur = bouton.getAttribute("data-reponse");
    var accueil = adresseActuelle().split("/")[0] === "accueil";
    var r = Msg.repondre(G(), moi(), id, valeur);
    if (r.ok) {
      sauver();
      if (accueil) { reponseAccueil = { id: id, reponse: valeur }; }
    }
    rendre({ garderDefilement: true, garderReplis: true });
    var suite = accueil ? document.querySelector("#bloc-repondre .message-ok") : document.querySelector('#ma-reponse [data-reponse="' + (valeur === "non" ? "non" : "oui") + '"]');
    if (suite) { suite.focus({ preventScroll: true }); }
  }

  function cloreQuestion(id) {
    var g = G(), p = moi();
    var m = Msg.trouverVisible(g, p, id);
    if (!m || !Msg.peutGerer(g, p, m) || Msg.estClose(m)) { rendre({ focus: true }); return; }
    if (!window.confirm(M(Msg.sorte(m) === "info" ? "msgInfoConfirmerClore" : "msgConfirmerClore"))) { return; }
    if (Msg.clore(g, p, id).ok) { sauver(); }
    rendre({ focus: true });
  }

  function ajouterAgendaQuestion(id) {
    var g = G(), p = moi();
    var m = Msg.trouverVisible(g, p, id);
    if (!m || Msg.reponse(m, p) !== "oui") { return; }
    var ics = Msg.fichierAgenda(g, m);
    if (!ics) { return; }
    var url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    telecharger("rendez-vous.ics", url);
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  // ----- Écran 7 : le bloc « À répondre » de l'accueil -----
  // Une seule question, la plus pressée, avec « Oui » et « Non » : un toucher répond, sans quitter l'accueil.
  function blocARepondre() {
    var g = G(), p = moi();
    var liste = Msg.listes(g, p).aRepondre;
    var m = liste[0];
    var html = '<section class="bloc-reponse" id="bloc-repondre" aria-labelledby="titre-repondre">' +
      // Demande 008 : le titre porte le nombre de messages qui attendent, le même que la pastille du menu ; à zéro, pas de nombre.
      '<h2 class="carte-etiquette" id="titre-repondre">' + esc(M("msgListeARepondre")) +
      (liste.length ? ' <span class="compte" id="nombre-repondre">' + liste.length + "</span>" : "") + "</h2>";
    var faite = reponseAccueil ? Msg.trouverVisible(g, p, reponseAccueil.id) : null;
    if (faite && reponseAccueil.reponse === "vu") {
      // Demande 009 : « Vu » ne se retire pas ; la phrase le dit, et le bloc passe au message suivant.
      html += '<p class="message-ok" role="status" tabindex="-1">' + esc(M("msgInfoVotreReponse")) + "</p>";
    } else if (faite) {
      html += '<p class="message-ok" role="status" tabindex="-1">' +
        esc(M("msgReponseEnregistree", { reponse: motReponse(reponseAccueil.reponse), question: faite.texte })) +
        ' <a href="#message/' + esc(faite.id) + '">' + esc(M("msgChangerDAvis")) + "</a></p>";
    }
    if (m && Msg.sorte(m) !== "question") {
      // Demande 009 : une info montre son texte et le bouton « Vu », seul bouton principal de l'accueil à ce moment-là ;
      // une idée montre son titre, sans bouton : un toucher ouvre le message.
      html += '<span class="carte-etiquette sorte-message">' + esc(motSorte(m)) + "</span>" +
        '<a class="carte-titre" id="question-a-repondre" href="#message/' + esc(m.id) + '">' + esc(titreMessage(m)) + "</a>" +
        '<span class="carte-quand">' + esc(deQui(m)) + "</span>" +
        (Msg.sorte(m) === "info" ? boutonReponse("msgVu", "data-vu", m.id, null) : "");
    } else if (m) {
      html += '<a class="carte-titre" id="question-a-repondre" href="#message/' + esc(m.id) + '">' + esc(m.texte) + "</a>" +
        '<span class="carte-quand">' + esc([deQui(m), quandRendezVous(m)].filter(Boolean).join(" · ")) + "</span>" +
        paireReponse(m.id, "");
    } else {
      html += '<p class="calme">' + esc(M("msgRienARepondre")) + "</p>";
    }
    if (liste.length > 1) { html += '<a class="lien-suite" id="autres-questions" href="#messages">' + esc(Mn("msgAccueilAutres", liste.length - 1)) + "</a>"; }
    // Groupe simple : « Voir le calendrier » est en bas du bloc « Prochains rendez-vous », juste dessous (demande 008).
    return html + "</section>";
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
      sectionReglage() +
      '<section class="section"><h2 class="section-titre">' + esc(M("apparence")) + "</h2>" +
      '<p class="discret">' + esc(M("apparenceTexte")) + "</p>" +
      '<a class="lien-suite" href="#charte">' + esc(M("voirLaCharte")) + "</a></section>" +
      '<section class="section"><h2 class="section-titre">' + esc(M("demonstration")) + "</h2>" +
      '<p class="discret">' + esc(M("demonstrationTexte")) + "</p>" +
      '<button type="button" class="bouton bouton--secondaire" data-reinitialiser>' + esc(M("reinitialiser")) + "</button></section>";
    return { titre: M("ongletGroupe"), onglet: "groupe", html: html };
  }

  // Réglage « Les membres peuvent écrire à tout le groupe » (demande 007) : seuls le bureau ou les organisateurs
  // voient cette section. Un toucher change l'état et l'enregistre ; l'état se lit en toutes lettres.
  function sectionReglage() {
    if (!gere()) { return ""; }
    var allume = Msg.reglageToutLeGroupe(G());
    var mot = M(allume ? "msgReglageAllume" : "msgReglageEteint");
    var enregistre = reglageEnregistre;
    reglageEnregistre = false;
    return '<section class="section" id="reglage-messages"><h2 class="section-titre">' + esc(M("msgReglageTitre")) + "</h2>" +
      '<ul class="actions"><li class="action"><div class="action-texte"><p class="action-libelle">' + esc(M("msgReglageToutLeGroupe")) + "</p>" +
      // Demande 007b : la phrase d'aide dit ce qui se passe dans l'état affiché par le bouton.
      '<p class="action-meta">' + esc(M(allume ? "msgReglageAideAllume" : "msgReglageAideEteint")) + "</p></div>" +
      '<button type="button" class="statut" data-reglage aria-pressed="' + allume + '" aria-label="' + esc(M("msgReglageToutLeGroupe") + " : " + mot) + '">' +
      esc(mot) + "</button></li></ul>" +
      (enregistre ? '<p class="message-ok" role="status">' + esc(M("msgReglageEnregistre")) + "</p>" : "") + "</section>";
  }

  function changerReglage() {
    var r = Msg.changerReglage(G(), moi(), !Msg.reglageToutLeGroupe(G()));
    if (r.ok) { sauver(); reglageEnregistre = true; }
    rendre({ garderDefilement: true });
    var bouton = document.querySelector("#reglage-messages .statut");
    if (bouton) { bouton.focus({ preventScroll: true }); }
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
          ? '<li><a class="personne personne--lien" id="personne-' + esc(x.id) + '" href="#personne/' + esc(x.id) + '">' + contenu + "</a></li>"
          : '<li><div class="personne" id="personne-' + esc(x.id) + '">' + contenu + "</div></li>";
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
      '<form class="form-personne" data-personne="' + (x ? esc(x.id) : "") + '" novalidate>' +
      champ("prenom", M("champPrenom"), 'autocomplete="off" autocapitalize="words" maxlength="40"' + v("prenom"), "") +
      champ("nom", M("champNom"), 'autocomplete="off" autocapitalize="words" maxlength="40"' + v("nom"), "") +
      champ("contact", M("champContact"), 'autocomplete="off" inputmode="email" autocapitalize="off" spellcheck="false"' + v("contact"),
        M("champContactAide")) +
      choix("role", M("champRole"), optionsRoles(g), [x ? x.role : "membre"]) +
      '<p class="erreur-generale" role="alert"></p>' +
      '<button type="submit" class="bouton bouton--principal">' + esc(nouvelle ? M("ajouterLaPersonne") : M("enregistrerLesChangements")) + "</button>" +
      (nouvelle
        ? '<a class="lien-suite" href="#personnes">' + esc(M("voirLaListe")) + "</a>"
        : '<button type="button" class="lien-bouton lien-bouton--alerte" data-retirer="' + esc(x.id) + '">' + esc(M("retirerLaPersonne")) + "</button>") +
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
        return '<a class="carte" id="equipe-' + esc(e.id) + '" href="#equipe/' + esc(e.id) + '">' +
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
      '<form class="form-equipe" data-equipe="' + (e ? esc(e.id) : "") + '" novalidate>' +
      champ("nom-equipe", M("champNomEquipe"), 'autocomplete="off" autocapitalize="sentences" maxlength="40"' + (e ? ' value="' + esc(e.nom) + '"' : ""), "") +
      choix("membres", M("champMembresEquipe"), options, e ? e.personnes : [], "checkbox", "choix--liste") +
      '<p class="erreur-generale" role="alert"></p>' +
      '<button type="submit" class="bouton bouton--principal">' + esc(nouvelle ? M("creerLEquipe") : M("enregistrerLEquipe")) + "</button>" +
      (nouvelle ? "" : '<button type="button" class="lien-bouton lien-bouton--alerte" data-supprimer-equipe="' + esc(e.id) + '">' + esc(M("supprimerLEquipe")) + "</button>") +
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
      "<li>" + esc(M("charteReglePaire")) + "</li>" +
      "<li>Boutons nommés par un verbe et son objet, jamais une icône seule.</li>" +
      "<li>Texte de 16 px minimum, contraste AA (4,5:1).</li>" +
      "<li>Aucun défilement de côté sur un téléphone de 360 px.</li>" +
      (regleVocabulaire ? "<li>" + esc(regleVocabulaire) + "</li>" : "") + "</ul></section>" +

      '<section class="section"><h2 class="section-titre">Couleurs</h2><ul class="nuancier">' +
      nuances.map(function (n) {
        return '<li class="nuance"><span class="nuance-carre" style="background:' + esc(n[1]) + '"></span>' +
          '<span><span class="nuance-nom">' + esc(n[0]) + " · " + esc(n[1]) + '</span><span class="nuance-detail">' + esc(n[2]) + "</span></span></li>";
      }).join("") + "</ul></section>" +

      '<section class="section" id="charte-couleur"><h2 class="section-titre">' + esc(M("charteCouleurTitre")) + "</h2>" +
      (gere()
        ? '<p class="discret">' + esc(M("charteCouleurTexte")) + "</p>" +
          '<div class="choix-couleurs" style="margin-top:10px">' + M("couleurs").map(function (c) {
            var choisi = c[1].toUpperCase() === p.principale;
            return '<button type="button" class="choix-couleur" data-couleur="' + esc(c[1]) + '" aria-pressed="' + choisi + '">' +
              '<span style="background:' + esc(c[1]) + '" aria-hidden="true"></span>Choisir ' + esc(minuscule(c[0])) + "</button>";
          }).join("") + "</div>"
        : '<p class="discret">' + esc(M("charteCouleurReservee")) + "</p>") + "</section>" +

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
      '<span class="statut statut--en-cours" style="display:inline-flex;align-items:center;justify-content:center">En cours</span></li>' +
      // L'état qui se lit sans se toucher : une étiquette, pas un bouton (demande 006b).
      '<li class="action"><div class="action-texte"><p class="action-libelle">' + esc(M("charteSuppression").actionLecture) + '</p><p class="action-meta">' + esc(M("charteSuppression").actionLectureMeta) + "</p></div>" +
      '<span class="etiquette">' + esc(L.LIBELLES_STATUT["en-cours"]) + "</span></li></ul>" +
      exemplesSuppression() +
      etatVide("calme", "État vide", "Une petite illustration et une phrase qui dit quoi faire.") +
      exemplesFormulaire() +
      exemplesMessages() +
      "</section>";
    return { titre: "Charte graphique", onglet: "groupe", html: html };
  }

  // Confirmation d'une suppression (demande 006b, à la demande de la direction artistique) : la phrase qui dit quoi,
  // le texte d'alerte et le bouton rouge, montrés une fois chacun.
  function exemplesSuppression() {
    var C = M("charteSuppression");
    return '<p class="confirmation-quoi">' + esc(C.quoi) + "</p>" +
      '<p class="texte-alerte">' + esc(C.definitif) + "</p>" +
      '<button type="button" class="bouton bouton--alerte" data-exemple>' + esc(C.bouton) + "</button>";
  }

  // Les éléments de formulaire, montrés une fois chacun (demande 006, à la demande de la direction artistique).
  function exemplesFormulaire() {
    var C = M("charteFormulaire");
    var numeroter = function (t, i) { return { valeur: String(i), titre: t }; };
    return champ("exemple-champ", C.champ, 'autocomplete="off"', C.champAide) +
      champ("exemple-date", C.date, "", "", "date") +
      champ("exemple-heure", C.heure, "", "", "time") +
      champ("exemple-court", C.court, 'inputmode="numeric" autocomplete="off" maxlength="2" class="champ-court" value="2"', "") +
      champ("exemple-erreur", C.erreurChamp, 'autocomplete="off" aria-invalid="true"', "", "text", C.erreur) +
      choix("exemple-choix", C.choix, C.choixOptions.map(numeroter), ["1"]) +
      choixReplie("exemple-replie", C.replie, [{ options: C.replieOptions.map(numeroter) }], "0") +
      '<p class="message-ok">' + esc(C.messageOk) + "</p>" +
      '<button type="button" class="lien-bouton" data-exemple>' + esc(C.lienBouton) + "</button>" +
      '<button type="button" class="lien-bouton lien-bouton--alerte" data-exemple>' + esc(C.lienBoutonAlerte) + "</button>" +
      '<ul class="actions"><li class="action"><a class="action-texte action-texte--lien" href="#charte">' +
      '<p class="action-libelle">' + esc(C.actionLibelle) + '</p><p class="action-meta">' + esc(C.actionMeta) + "</p></a>" +
      '<span class="statut" style="display:inline-flex;align-items:center;justify-content:center">' + esc(L.LIBELLES_STATUT["a-faire"]) + "</span></li></ul>";
  }

  // Les composants de la demande 007, montrés une fois chacun : la paire de réponse dans ses trois états (N1),
  // le bloc « À répondre » (N2), le repère « Rendez-vous » (N3), la case à toucher en grille et en ligne (N13, demande 007d),
  // la bande du bouton (N14, demande 007d), la case qui ne se coche plus (N5), le réglage allumé (N6).
  function exemplesMessages() {
    var C = M("chartePaire");
    var F = M("charteFormulaire");
    // N13 (demande 007d) : quatre cases de la grille des jours, la première choisie ; la ligne des heures, « 20 h » choisie.
    var exemplesJours = joursProposes(L.aujourdhui()).slice(0, 4).map(function (d, i) { return { valeur: String(i), titre: titreJour(d, i) }; });
    return '<h3 id="charte-paire">' + esc(C.titre) + "</h3>" +
      '<p class="discret">' + esc(C.avant) + "</p>" + paireReponse("", "", true) +
      '<p class="discret">' + esc(C.apresOui) + "</p>" + paireReponse("", "oui", true) +
      '<p class="discret">' + esc(C.apresNon) + "</p>" + paireReponse("", "non", true) +
      '<p class="discret">' + esc(C.bloc) + "</p>" +
      '<div class="bloc-reponse"><p class="carte-etiquette">' + esc(M("msgListeARepondre")) + "</p>" +
      '<a class="carte-titre" href="#charte">' + esc(C.question) + "</a>" +
      '<span class="carte-quand">' + esc(M("msgDe", { prenom: C.de }) + " · " + C.rendezVous) + "</span>" +
      paireReponse("", "", true) +
      '<a class="lien-suite" href="#charte">' + esc(Mn("msgAccueilAutres", C.autres)) + "</a></div>" +
      // Le bloc à deux liens de l'accueil (N12, demande 007c ; décision du 2026-11-19, soir) : deux zones, aucun bouton.
      '<p class="discret">' + esc(M("charteBlocLiens").titre) + "</p>" +
      '<div class="bloc-liens" id="charte-bloc-liens"><a class="carte" href="#charte"><span class="carte-titre">' + esc(M("charteBlocLiens").haut) + "</span></a>" +
      '<a class="lien-suite" href="#charte">' + esc(M("charteBlocLiens").bas) + "</a></div>" +
      '<ul class="legende">' + legendeRendezVous() + "</ul>" +
      '<fieldset class="choix quand" id="exemple-choix-jour"><legend>' + esc(M("msgQuand")) + "</legend>" +
      choixCases("exemple-jour", M("msgChampJour"), exemplesJours, "0", "choix--cases", true) +
      choixCases("exemple-heure", M("msgChampHeure"), heuresProposees(), "20:00", "choix--ligne", true) + "</fieldset>" +
      // N14 (demande 007d) : la bande du bouton, posée à plat dans la page (fixe, elle couvrirait la Charte).
      '<div class="bande-action bande-action--exemple" id="exemple-bande-action"><button type="button" class="bouton bouton--secondaire" data-exemple>' +
      esc(M("msgEnvoyer")) + "</button></div>" +
      '<fieldset class="choix choix--liste"><legend>' + esc(M("msgAPersonnes")) + ' <span class="compte">' + esc(M("msgPersonnesCompte", { n: 10 })) + "</span></legend>" +
      '<label class="choix-option"><input type="checkbox" checked disabled><span class="choix-texte"><span class="choix-titre">' + esc(F.replieOptions[1]) + "</span></span></label>" +
      '<label class="choix-option choix-option--bloquee"><input type="checkbox" disabled><span class="choix-texte"><span class="choix-titre">' + esc(F.replieOptions[2]) + "</span></span></label>" +
      '<p class="champ-erreur">' + esc(M("msgErreurDixPersonnes")) + "</p></fieldset>" +
      '<ul class="actions"><li class="action"><div class="action-texte"><p class="action-libelle">' + esc(M("msgReglageToutLeGroupe")) + "</p></div>" +
      '<span class="statut" aria-pressed="true" style="display:inline-flex;align-items:center;justify-content:center">' + esc(M("msgReglageAllume")) + "</span></li></ul>" +
      exemplesCommentaires() + exemplesIdeeInfo();
  }

  // Les composants de la demande 009, tous inertes : le bouton de réponse seul, avant et après (N1) ; une ligne de liste avec
  // son mot de sorte, « Retenue » et « Classée » ; le texte saisi sur plusieurs lignes et sa variante de titre (N11).
  function exemplesIdeeInfo() {
    var C = M("charteIdeeInfo");
    var ligne = function (titre, cleEtat, ok, passee) {
      return '<a class="carte' + (passee ? " carte--passee" : "") + '" href="#charte">' +
        '<span class="carte-etiquette sorte-message">' + esc(M("msgSorteIdee")) + "</span>" +
        '<span class="carte-titre">' + esc(titre) + "</span>" +
        '<span class="carte-quand">' + esc(M("msgDe", { prenom: C.de })) + "</span>" +
        '<span class="carte-infos">' + esc(M("msgIdeeCompteur", { n: C.compte })) +
        ' <span class="etiquette' + (ok ? " etiquette--ok" : "") + '">' + esc(M(cleEtat)) + "</span></span></a>";
    };
    return '<h3 id="charte-idee-info">' + esc(C.titre) + "</h3>" +
      '<p class="discret">' + esc(C.avant) + "</p>" +
      '<div id="exemple-reponse-seule">' + boutonReponse("msgBonneIdee", "", "", false, true) + "</div>" +
      '<p class="discret">' + esc(C.apres) + "</p>" +
      '<div id="exemple-reponse-seule-choisie">' + boutonReponse("msgBonneIdee", "", "", true, true) +
      '<p class="message-ok">' + esc(M("msgIdeeVotreReponse")) + "</p></div>" +
      '<p class="discret">' + esc(C.ligne) + "</p>" +
      '<div id="exemple-ligne-sorte">' + ligne(C.idee, "msgIdeeRetenue", true, false) + ligne(C.ideeClassee, "msgIdeeClassee", false, true) + "</div>" +
      '<p class="discret">' + esc(C.texte) + "</p>" +
      '<div id="exemple-message-texte"><p class="message-texte">' + esc(C.explication) + "</p>" +
      '<p class="message-texte message-texte--titre">' + esc(C.info) + "</p></div>";
  }

  // Les composants de la demande 008, montrés une fois chacun, tous inertes : un commentaire avec son lien de suppression (N8),
  // la zone de saisie sur plusieurs lignes et son compteur (N7), la pastille du menu, « 2 » et « 9+ » (N9),
  // les lignes d'un bloc avec son lien de fin (N10).
  function exemplesCommentaires() {
    var C = M("charteCommentaires");
    return '<h3 id="charte-commentaires">' + esc(C.titre) + "</h3>" +
      '<ul class="personnes" id="exemple-commentaire">' +
      ligneCommentaire({ texte: C.commentaire, nom: C.nom, quand: C.quand, supprimable: true, exemple: true }) + "</ul>" +
      '<div id="exemple-champ-commentaire">' + champCommentaire("exemple-commentaire-champ", C.saisie, true) + "</div>" +
      '<p class="discret">' + esc(C.pastille) + "</p>" +
      '<div class="onglets onglets--exemple" id="exemple-pastille">' + C.pastilleNombres.map(function (n) {
        return lienOnglet("messages", "#charte", M("ongletMessages"), n, true);
      }).join("") + "</div>" +
      '<p class="discret">' + esc(C.lignes) + "</p>" +
      '<div class="bloc-reponse" id="exemple-lignes-bloc"><p class="carte-etiquette">' + esc(C.lignesTitre) + "</p>" +
      '<ul class="lignes-bloc">' + C.rendezVous.map(function (r) { return ligneRendezVous("#charte", r[0], r[1], r[2]); }).join("") + "</ul>" +
      '<a class="lien-suite" href="#charte">' + esc(M("msgVoirCalendrier")) + "</a></div>";
  }

  // Réservé au bureau ou aux organisateurs : le geste est refusé même sans passer par les boutons.
  function choisirCouleur(couleur) {
    if (!gere() || hexCouleurs().indexOf(couleur) < 0) { return; }
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

  // Démo › « Voir ce qui serait envoyé » (demande 008) : les notifications simulées du groupe en cours, la plus récente
  // d'abord, chacune avec ses destinataires et son texte complet. Lecture seule : rien n'est envoyé, rien ne se touche pour répondre.
  function entreeEnvoi(e) {
    var g = G();
    var m = Msg.trouver(g, e.messageId);
    var personnes = Gr.personnesTriees(g).filter(function (x) { return (e.a || []).indexOf(x.id) >= 0; });
    // Demande 009 : l'envoi d'une idée ou d'une info, une idée retenue ou classée (vers son auteur seul).
    var sortes = {
      relance: "msgDemoSorteRelance", commentaire: "msgDemoSorteCommentaire", idee: "msgDemoSorteIdee", info: "msgDemoSorteInfo",
      "idee-retenue": "msgDemoSorteIdeeRetenue", "idee-classee": "msgDemoSorteIdeeClassee"
    };
    var sorte = M(sortes[e.sorte] || "msgDemoSorteQuestion");
    var a = personnes.length === 1
      ? '<p class="envoi-a">' + esc(M("msgA", { destinataires: Gr.nomComplet(personnes[0]) })) + "</p>"
      : '<details class="repli envoi-a"><summary><span class="repli-titres"><span class="repli-titre">' +
        esc(M("msgA", { destinataires: Mn("nPersonnes", personnes.length) })) + "</span></span></summary>" +
        '<div class="repli-corps"><ul class="noms">' + personnes.map(function (x) {
          return '<li><span class="personne-nom">' + esc(Gr.nomComplet(x)) + "</span></li>";
        }).join("") + "</ul></div></details>";
    return '<section class="section confirmation envoi" id="envoi-' + esc(e.id) + '" data-sorte="' + esc(e.sorte) + '">' +
      "<h2>" + esc(sorte) + "</h2>" +
      '<p class="discret envoi-quand"><span class="insecable">' + esc(M("msgDemoQuand", { quand: quandPrecis(Msg.dateEnvoi(e), e.heure) })) + "</span></p>" + a +
      blocNotification(lignesNotification(m, e.sorte, e.de || "", e.commentaire || "")) +
      (e.sorte === "commentaire" && e.supprime ? '<p class="calme envoi-supprime">' + esc(M("msgDemoComSupprime")) + "</p>" : "") +
      "</section>";
  }

  function ecranEnvois() {
    var liste = Msg.envois(G());
    var html = retour("#accueil", M("ongletAccueil")) + entete(D("etiquette"), M("msgEnvoiTitre"));
    if (!liste.length) {
      html += etatVide("panneau", M("msgDemoVide"), esc(M("msgDemoVideAide")));
    } else {
      // Les cinq plus récentes, puis « Voir les N notifications plus anciennes », dépliées sur place.
      html += '<p class="astuce" id="envois-texte">' + esc(M("msgDemoEnvoisTexte")) + "</p>" +
        '<div id="envois">' + liste.slice(0, 5).map(entreeEnvoi).join("") +
        (liste.length > 5
          ? '<div class="suite-liste" hidden>' + liste.slice(5).map(entreeEnvoi).join("") + "</div>" +
            '<button type="button" class="lien-bouton" data-voir-suite>' + esc(Mn("msgDemoVoirAnciennes", liste.length - 5)) + "</button>"
          : "") + "</div>";
    }
    return { titre: M("msgEnvoiTitre"), onglet: null, html: html };
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
      etat = Gr.rattacherActions(r.etat); // essais enregistrés avant la demande 005b
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
      '<p class="affiche-date">' + esc([dateLongue(date), e.lieu].filter(Boolean).join(" · ")) + "</p>" +
      '<p class="affiche-texte">On cherche des parents pour tenir la journée. Choisissez un créneau : même une heure aide beaucoup. Pas besoin de compte.</p>' +
      "</header>" +
      '<ul class="creneaux">';
    e.creneaux.forEach(function (c) {
      var reste = L.placesRestantes(c);
      var complet = reste === 0;
      var ouvert = creneauOuvert === c.id && !complet;
      html += '<li class="creneau' + (complet ? " creneau--complet" : "") + (ouvert ? " creneau--ouvert" : "") + '" id="creneau-' + esc(c.id) + '">' +
        '<div class="creneau-haut">' +
        '<div class="creneau-infos"><p class="creneau-horaire">' + esc(c.horaire) + "</p>" +
        '<p class="creneau-titre">' + esc(c.titre) + "</p>" +
        '<p class="creneau-places">' + jauge(c) + '<span class="creneau-reste">' + esc(textePlaces(reste)) + "</span></p></div>" +
        (complet
          ? '<span class="etiquette">Complet</span>'
          : (ouvert ? "" : '<button type="button" class="bouton bouton--secondaire bouton--petit" data-ouvrir="' + esc(c.id) + '" aria-label="Je viens : ' + esc(c.titre) + ", " + esc(c.horaire) + '">Je viens</button>')) +
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
    return '<form class="formulaire" data-evenement="' + esc(e.id) + '" data-creneau="' + esc(c.id) + '" novalidate>' +
      '<p class="formulaire-titre">Je m\'inscris : ' + esc(minuscule(c.titre)) + ", " + esc(c.horaire) + "</p>" +
      champ("prenom", "Votre prénom", 'autocomplete="given-name" autocapitalize="words" maxlength="40"', "") +
      champ("initiale", "Première lettre de votre nom", 'autocomplete="off" autocapitalize="characters" maxlength="1" class="champ-court"', "Par exemple D pour Dupont.") +
      champ("contact", "Téléphone ou e-mail", 'autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false"', "Pour vous prévenir en cas de changement. Seul le bureau le voit.") +
      '<p class="erreur-generale" id="erreur-generale" role="alert"></p>' +
      '<button type="submit" class="bouton bouton--principal">Je m\'inscris</button>' +
      '<button type="button" class="lien-bouton" data-fermer>Finalement non</button>' +
      "</form>";
  }

  // sorte : "text" (par défaut), "date" ou "time" (saisie de date ou d'heure du téléphone).
  // note : une phrase en .discret sous le champ, qui n'est pas une erreur (demande 009).
  function champ(nom, libelle, attributs, aide, sorte, erreur, note) {
    var idAide = aide ? "aide-" + nom : "";
    return '<div class="champ">' +
      '<label for="champ-' + nom + '">' + esc(libelle) + "</label>" +
      (aide ? '<p class="champ-aide" id="' + idAide + '">' + esc(aide) + "</p>" : "") +
      '<input id="champ-' + nom + '" name="' + nom + '" type="' + (sorte || "text") + '" ' + attributs +
      ' aria-describedby="' + (idAide ? idAide + " " : "") + (note ? "note-" + nom + " " : "") + "erreur-" + nom + '">' +
      (note ? '<p class="discret champ-note" id="note-' + nom + '">' + esc(note) + "</p>" : "") +
      '<p class="champ-erreur" id="erreur-' + nom + '">' + esc(erreur || "") + "</p></div>";
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
    if (!t) { return lienSansInscription(jeton); }
    var lien = lienPersonnel(jeton);
    var contact = L.analyserContact(t.volontaire.contact);
    var parSms = contact && contact.type === "tel";
    var corps = MA("messageLienPersonnel", {
      nom: t.evenement.titre, creneau: minuscule(t.creneau.titre), date: fmtLong.format(L.dateEvenement(t.evenement)),
      horaire: t.creneau.horaire, lien: lien
    });
    var envoi = L.lienEnvoi(t.volontaire.contact, "Mon coup de main — " + t.evenement.titre, corps);
    var html = '<section class="confirmation">' +
      '<span class="tampon-ok">Inscrit</span>' +
      '<h1 tabindex="-1">C\'est noté, ' + esc(t.volontaire.prenom) + ".</h1>" +
      '<p class="confirmation-quoi"><strong>' + esc(t.creneau.titre) + "</strong><br>" +
      esc(dateLongue(L.dateEvenement(t.evenement))) + " · " + esc(t.creneau.horaire) + (t.evenement.lieu ? "<br>" + esc(t.evenement.lieu) : "") + "</p>" +
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
      '<a class="lien-suite" href="#inscription/' + esc(t.evenement.id) + '">Revenir au tableau</a>' +
      "</section>";
    return { titre: "Inscription confirmée", parent: true, html: html };
  }

  function ajouterAgenda(jeton) {
    var t = inscriptionPartout(jeton);
    if (!t) { return; }
    var ics = L.fichierAgenda(t.groupe, t.evenement, t.creneau, lienPersonnel(jeton), null, jeton);
    var url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    telecharger("coup-de-main-" + esc(t.evenement.id) + ".ics", url);
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
          '<a class="bouton bouton--secondaire" href="#inscription/' + esc(a.evenementId) + '">Choisir un autre créneau</a></section>'
      };
    }
    var t = inscriptionPartout(jeton);
    if (!t) { return lienSansInscription(jeton); }
    var inscritAuNom = MA("lienInscritAuNom").split("{nom}");
    var html = '<section class="confirmation">' +
      '<p class="surtitre">' + esc(t.groupe.nom) + "</p>" +
      '<h1 tabindex="-1">Votre coup de main</h1>' +
      '<p class="confirmation-quoi"><strong>' + esc(t.creneau.titre) + "</strong><br>" +
      esc(dateLongue(L.dateEvenement(t.evenement))) + " · " + esc(t.creneau.horaire) + "<br>" + esc(t.evenement.titre) + "</p>" +
      // Demande 007d : un seul point, celui de l'initiale ; la phrase vient de mots.js.
      '<p id="inscrit-au-nom">' + esc(inscritAuNom[0]) + "<strong>" + esc(L.nomPublic(t.volontaire)) + "</strong>" + esc(inscritAuNom[1] || "") + "</p>" +
      "<p>Un empêchement ? Annulez ici : la place sera libérée pour un autre parent.</p>" +
      '<button type="button" class="bouton bouton--alerte" data-annuler="' + esc(jeton) + '">Annuler mon inscription</button>' +
      '<a class="lien-suite" href="#inscription/' + esc(t.evenement.id) + '">Garder mon inscription</a>' +
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
        etatVide("chemin", "L'inscription a peut-être déjà été annulée.", esc(M("lienInconnuAide"))) + "</section>"
    };
  }

  // Lien personnel qui ne mène plus à une inscription : si c'est celui d'un inscrit d'un événement supprimé
  // (son jeton est gardé, et rien d'autre), la page le dit ; sinon, la page « Ce lien ne mène à aucune inscription. ».
  function lienSansInscription(jeton) {
    var supprime = etat.groupes.some(function (g) { return Ev.jetonSupprime(g, jeton); });
    return supprime ? lienEvenementSupprime() : lienInconnu();
  }

  // Deux phrases, aucun bouton ; ni le nom de l'événement ni celui de la personne (ils sont effacés).
  function lienEvenementSupprime() {
    return {
      titre: MA("lienEvenementSupprime"), parent: true,
      html: '<section class="confirmation"><h1 tabindex="-1">' + esc(MA("lienEvenementSupprime")) + "</h1>" +
        etatVide("chemin", MA("lienEvenementSupprimeAide"), "") + "</section>"
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
  var ECRANS_ASSOCIATION = ["mes-actions", "rappels", "creneaux-manquants", "evenements", "evenement"];

  function rendre(options) {
    var morceaux = adresseActuelle().split("/").map(decodeURIComponent);
    var r;
    if (!estAsso() && ECRANS_ASSOCIATION.indexOf(morceaux[0]) >= 0) { morceaux = ["introuvable"]; }
    switch (morceaux[0]) {
      case "accueil": r = ecranAccueil(); break;
      case "mes-actions": r = ecranMesActions(morceaux[1] === "toutes"); break;
      // Décision du 2026-11-19 (soir) : l'adresse #rappels ouvre l'écran des créneaux en manque, sans écran
      // intermédiaire ; elle suit donc la même règle que lui, pour chacun.
      case "rappels": location.replace("#creneaux-manquants"); return;
      // Demande 007c : la liste des créneaux en manque, pour le bureau seul ; pour les autres, la page n'existe pas.
      case "creneaux-manquants": r = gere() && !morceaux[1] ? ecranCreneauxManquants() : introuvable(); break;
      case "messages":
        // Demande 009 : « Écrire un message » (le choix), puis l'un des trois formulaires.
        if (morceaux[1] === "nouveau") {
          r = !morceaux[2] ? ecranChoixMessage() : morceaux[2] === "question" ? ecranNouvelleQuestion(morceaux[3]) :
            (morceaux[2] === "idee" || morceaux[2] === "info") && !morceaux[3] ? ecranEcrire(morceaux[2]) : introuvable();
        } else { r = morceaux[1] ? introuvable() : ecranMessages(); }
        break;
      case "message": r = ecranMessage(morceaux[1], morceaux[2]); break;
      case "calendrier": r = estAsso() ? ecranEvenements() : ecranCalendrier(); break;
      case "evenements": r = ecranEvenements(); break;
      // Une adresse d'événement a quatre morceaux au plus : au-delà (anciens écrans retirés de la demande 009), la page n'existe pas.
      case "evenement": r = morceaux.length > 4 ? introuvable() : ecranEvenement(morceaux[1], morceaux[2], morceaux[3]); break;
      case "association": case "groupe": r = ecranGroupe(); break;
      case "personnes": r = ecranPersonnes(); break;
      case "personne": r = ecranPersonne(morceaux[1]); break;
      case "equipes": r = ecranEquipes(); break;
      case "equipe": r = ecranEquipe(morceaux[1]); break;
      case "charte": r = ecranCharte(); break;
      case "aide": r = ecranAide(); break;
      case "demo":
        r = morceaux[1] === "groupe" ? ecranCreerGroupe() : morceaux[1] === "enregistrer" ? ecranEnregistrer() :
          morceaux[1] === "ouvrir" ? ecranOuvrir() : morceaux[1] === "envois" && !morceaux[2] ? ecranEnvois() : introuvable();
        break;
      case "inscription": r = ecranInscription(morceaux[1]); break;
      case "merci": r = ecranMerci(morceaux[1]); break;
      case "annuler": r = ecranAnnuler(morceaux[1]); break;
      default: r = introuvable();
    }
    var parent = !!r.parent;
    document.body.classList.toggle("espace-parent", parent);
    document.body.classList.toggle("espace-bureau", !parent);
    // Demande 007d : un écran qui porte la bande du bouton garde en bas de page une réserve de sa hauteur.
    document.body.classList.toggle("avec-bande", !!r.bande);
    document.getElementById("onglets").hidden = parent;
    document.getElementById("demo-retour").hidden = !parent;

    var vue = document.getElementById("vue");
    var defilement = window.scrollY;
    // Après une réponse donnée sur l'écran du message, les listes ouvertes le restent.
    var ouverts = options && options.garderReplis
      ? Array.prototype.map.call(vue.querySelectorAll("details[open][id]"), function (d) { return d.id; }) : [];
    // Lien « Aide » en haut de chaque écran (sauf l'espace parent et la page d'aide elle-même).
    var aide = parent || r.aide ? "" : '<a class="lien-aide" id="lien-aide" href="#aide">' + esc(M("lienAide")) + "</a>";
    vue.innerHTML = aide + r.html;
    ouverts.forEach(function (id) { var d = document.getElementById(id); if (d && d.tagName === "DETAILS") { d.open = true; } });
    poserBande();
    poserPastille();
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

  // La bande du bouton se pose juste au-dessus du menu, quelle que soit sa hauteur réelle (marge basse du téléphone comprise).
  function poserBande() {
    var bande = document.getElementById("bande-action"), menu = document.getElementById("onglets");
    if (bande && menu && !menu.hidden && menu.offsetHeight) { bande.style.bottom = menu.offsetHeight + "px"; }
  }
  window.addEventListener("resize", poserBande);

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

  // ---------- Menu du bas : Accueil · Messages · Événements · Association (groupe simple : Accueil · Messages · Groupe) ----------

  var ICONES = {
    accueil: '<path d="M3.5 10.5 12 4l8.5 6.5"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-5.5h4V20"/>',
    messages: '<path d="M4.5 5.5h15a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5H11l-4.5 3.5V17h-2A1.5 1.5 0 0 1 3 15.5V7a1.5 1.5 0 0 1 1.5-1.5z"/>',
    evenements: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    groupe: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.6-3.4 3-5.3 6-5.3s5.4 1.9 6 5.3"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16.5 14.3c2.4.1 4.1 1.8 4.5 4.7"/>'
  };

  function remplirOnglets() {
    var entrees = [["accueil", "#accueil", M("ongletAccueil")], ["messages", "#messages", M("ongletMessages")]];
    if (estAsso()) { entrees.push(["evenements", "#evenements", M("ongletEvenements")]); }
    entrees.push(["groupe", hrefGroupe(), M("ongletGroupe")]);
    document.getElementById("onglets").innerHTML = entrees.map(function (x) { return lienOnglet(x[0], x[1], x[2], 0); }).join("");
    poserPastille();
  }

  // Une entrée du menu. N9 (demande 008) : sur « Messages », le nombre de messages qui attendent ma réponse, posé sur l'icône ;
  // de 1 à 9, puis « 9+ ». Le nom lu de l'onglet donne le nombre exact. exemple : entrée inerte de la page Charte.
  // Le nombre est écrit par la feuille de style (attribut data-nombre) : le mot de l'onglet reste son seul texte, son nom lu dit le nombre.
  function nombreOnglet(n) { return '<span class="onglet-nombre" aria-hidden="true" data-nombre="' + esc(n > 9 ? M("msgPastilleMax") : n) + '"></span>'; }
  function lienOnglet(nom, href, libelle, n, exemple) {
    return '<a href="' + href + '"' + (exemple ? "" : ' data-onglet="' + nom + '"') + (n ? ' aria-label="' + esc(Mn("msgPastilleLecture", n)) + '"' : "") + ">" +
      '<span class="icone">' + (n ? nombreOnglet(n) : "") + '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES[nom] + "</svg></span>" +
      '<span class="onglet-mot">' + esc(libelle) + "</span></a>";
  }

  // La pastille suit chaque écran dessiné : elle baisse ou disparaît dès la réponse donnée, sans recharger. À zéro, elle est absente.
  function poserPastille() {
    var lien = document.querySelector('#onglets [data-onglet="messages"]');
    if (!lien) { return; }
    var n = Msg.nombreARepondre(G(), moi());
    var icone = lien.querySelector(".icone"), pastille = icone.querySelector(".onglet-nombre");
    if (pastille) { pastille.remove(); }
    if (!n) { lien.removeAttribute("aria-label"); return; }
    icone.insertAdjacentHTML("afterbegin", nombreOnglet(n));
    lien.setAttribute("aria-label", Mn("msgPastilleLecture", n));
  }

  // ---------- Menu de démo (outil du testeur, ouvert à tous les rôles) ----------

  function remplirDemo() {
    var g = G(), p = moi();
    var vg = Gr.estAssociation(g) && L.trouverEvenement(g, "vide-grenier");
    document.getElementById("demo-etiquette").textContent = D("etiquette");
    document.getElementById("demo-ouvrir").textContent = D("bouton");
    document.getElementById("demo-retour").textContent = D("retourEspace");
    document.getElementById("demo-menu").innerHTML =
      '<label class="demo-ligne demo-ligne--liste" for="demo-groupe">' + esc(D("changerDeGroupe")) + ' <select id="demo-groupe">' +
      etat.groupes.map(function (x) {
        return '<option value="' + esc(x.id) + '"' + (x.id === g.id ? " selected" : "") + ">" + esc(x.nom) + "</option>";
      }).join("") + "</select></label>" +
      '<label class="demo-ligne demo-ligne--liste" for="demo-utilisateur">' + esc(D("changerDePersonne")) + ' <select id="demo-utilisateur">' +
      Gr.personnesTriees(g).map(function (x) {
        return '<option value="' + esc(x.id) + '"' + (x.id === p.id ? " selected" : "") + ">" +
          esc(Gr.nomComplet(x)) + " — " + esc(minuscule(nomRole(x.role))) + "</option>";
      }).join("") + "</select></label>" +
      '<a class="demo-ligne" href="#demo/groupe">' + esc(D("creerUnGroupe")) + "</a>" +
      (vg && vg.creneaux.length ? '<a class="demo-ligne" href="#inscription/vide-grenier">' + esc(D("voirEspaceParent")) + "</a>" : "") +
      '<a class="demo-ligne" href="#demo/envois">' + esc(D("voirEnvois")) + "</a>" +
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
    reponseAccueil = null;
    appliquerCouleur();
    remplirOnglets();
    remplirDemo();
    var h = adresseActuelle().split("/")[0];
    var garder = ["accueil", "messages", "association", "groupe", "personnes", "equipes", "aide", "charte"];
    if (document.body.classList.contains("espace-parent") || garder.indexOf(h) < 0) { aller("#accueil"); }
    else if (h === "association" || h === "groupe") { aller(hrefGroupe()); }
    else { rendre(); }
  }

  // ---------- Gestes ----------

  document.addEventListener("click", function (ev) {
    if (ev.target.type === "radio" && (ev.target.name === "jour" || ev.target.name === "heure") && ev.target.form && ev.target.form.classList.contains("form-question")) {
      choisirJourOuHeure(ev.target);
      return;
    }
    var cible = ev.target.closest("button, a");
    if (!cible) { return; }
    if (cible.hasAttribute("data-reglage")) { changerReglage(); return; }
    if (cible.hasAttribute("data-reponse")) { repondreQuestion(cible); return; }
    // Demande 009 : « Bonne idée » (le bouton déjà coché ne fait rien : on retire sa réponse par le lien), « Vu », retenir, classer.
    if (cible.hasAttribute("data-bonne-idee")) { if (cible.getAttribute("aria-pressed") !== "true") { direBonneIdee(cible.getAttribute("data-bonne-idee"), true); } return; }
    if (cible.hasAttribute("data-retirer-idee")) { direBonneIdee(cible.getAttribute("data-retirer-idee"), false); return; }
    if (cible.hasAttribute("data-vu")) { marquerVu(cible.getAttribute("data-vu")); return; }
    if (cible.hasAttribute("data-decider")) { deciderIdee(cible); return; }
    if (cible.hasAttribute("data-clore")) { cloreQuestion(cible.getAttribute("data-clore")); return; }
    if (cible.hasAttribute("data-agenda-question")) { ajouterAgendaQuestion(cible.getAttribute("data-agenda-question")); return; }
    if (cible.hasAttribute("data-voir-suite")) { voirSuite(cible); return; }
    if (cible.hasAttribute("data-voir-anciens")) { voirAnciens(cible); return; }
    if (cible.hasAttribute("data-supprimer-commentaire")) { supprimerCommentaire(cible); return; }
    // « Relancer ceux qui n'ont pas répondu » : la relance est notée dans « Ce qui serait envoyé », puis le lien ouvre son écran.
    if (cible.hasAttribute("data-relancer")) {
      if (Msg.noterRelance(G(), moi(), cible.getAttribute("data-relancer")).ok) { sauver(); }
    }
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
    if (cible.hasAttribute("data-supprimer-action")) { supprimerAction(cible); return; }
    if (cible.hasAttribute("data-supprimer-creneau")) { supprimerCreneau(cible); return; }
    if (cible.hasAttribute("data-supprimer-evenement")) { supprimerEvenement(cible); return; }
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
    effacerErreur(c);
    // La phrase des 80 caractères n'est pas une erreur d'envoi : elle reste écrite tant que la limite est atteinte.
    if (c.id === "champ-question") { compterCaracteres(c); }
    if (c.form && c.form.classList.contains("form-ecrire") && (c.name === "idee" || c.name === "explication" || c.name === "info")) { compterChamp(c); }
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
    } else if (c.type === "radio" && c.closest(".choix--replie")) {
      // Choix replié : le titre montre le nouveau choix, la liste se referme.
      var replie = c.closest(".choix--replie");
      replie.querySelector(".repli-titre").textContent = c.closest(".choix-option").querySelector(".choix-titre").textContent;
      replie.querySelector("details").open = false;
    } else if (c.name === "echeance") {
      montrerChampsEcheance(c.form);
    } else if (c.form && c.form.classList.contains("form-question")) {
      if (c.name === "a-qui" || c.name === "jour" || c.name === "heure") { montrerZonesQuestion(c.form); }
      if (c.name === "personnes") { compterPersonnes(c.form); }
    } else if (c.form && c.form.classList.contains("form-ecrire")) {
      // Demande 009 : le même « À qui ? » sur « Nouvelle idée » et « Nouvelle info ».
      if (c.name === "a-qui") { c.form.querySelector("#zone-personnes").hidden = valeurRadio(c.form, "a-qui") !== "personnes"; }
      if (c.name === "personnes") { compterPersonnes(c.form); }
    }
  });

  document.addEventListener("input", function (ev) {
    // D'abord la phrase d'erreur du champ, puis le compteur de la question, qui peut écrire la sienne (« … pas plus longue »).
    effacerErreur(ev.target);
    if (ev.target.id === "champ-question") { compterCaracteres(ev.target); }
    if (ev.target.id === "champ-commentaire") { compterCommentaire(ev.target); }
    if (ev.target.form && ev.target.form.classList.contains("form-ecrire") && ["idee", "explication", "info"].indexOf(ev.target.name) >= 0) { compterChamp(ev.target); }
    if ((ev.target.name === "autre-date" || ev.target.name === "autre-heure") && ev.target.form && ev.target.form.classList.contains("form-question")) {
      effacerErreursRendezVous(ev.target.form, ev.target.name);
    }
  });

  document.addEventListener("submit", function (ev) {
    var f = ev.target;
    var envois = {
      formulaire: envoyerFormulaire, "form-personne": envoyerPersonne, "form-equipe": envoyerEquipe, "form-groupe": envoyerGroupe,
      "form-evenement": envoyerEvenement, "form-action": envoyerAction, "form-creneau": envoyerCreneau,
      "form-question": envoyerQuestion, "form-commentaire": publierCommentaire, "form-ecrire": envoyerEcrit
    };
    Object.keys(envois).forEach(function (classe) {
      if (f.classList.contains(classe)) { ev.preventDefault(); envois[classe](f); }
    });
  });

  window.addEventListener("hashchange", function () {
    creneauOuvert = null;
    qrVisible = false;
    reponseAccueil = null;
    commentaireFait = null;
    anciensDeplies = null;
    rendre({ focus: true });
  });

  appliquerCouleur();
  remplirOnglets();
  remplirDemo();
  rendre();
})();
