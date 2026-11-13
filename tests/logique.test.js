// Tests des règles du prototype (sans navigateur). Lancer : node --test prototype/tests/
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../js/logique.js");
const DONNEES = require("../donnees.js");

const cloner = (o) => JSON.parse(JSON.stringify(o));
const REF = new Date("2026-11-13T10:00:00"); // un vendredi

function evenementTest(actions) {
  return { id: "e", titre: "Test", dansJours: 10, actions, creneaux: [] };
}

test("une action non faite dont la date limite est passée est en retard", () => {
  const e = evenementTest([
    { id: "a", libelle: "A", joursAvant: 12, statut: "a-faire" },
    { id: "b", libelle: "B", joursAvant: 12, statut: "fait" },
    { id: "c", libelle: "C", joursAvant: 10, statut: "en-cours" }
  ]);
  assert.equal(L.estEnRetard(e.actions[0], e, REF), true);
  assert.equal(L.estEnRetard(e.actions[1], e, REF), false, "une action faite n'est jamais en retard");
  assert.equal(L.estEnRetard(e.actions[2], e, REF), false, "due aujourd'hui : pas encore en retard");
  assert.equal(L.estCetteSemaine(e.actions[2], e, REF), true);
});

test("aSurveiller sépare les retards et la semaine en cours", () => {
  const e = evenementTest([
    { id: "a", joursAvant: 15, statut: "a-faire" },
    { id: "b", joursAvant: 5, statut: "a-faire" },
    { id: "c", joursAvant: 1, statut: "a-faire" }
  ]);
  const s = L.aSurveiller(e, REF);
  assert.deepEqual(s.enRetard.map((a) => a.id), ["a"]);
  assert.deepEqual(s.cetteSemaine.map((a) => a.id), ["b"]);
});

test("le statut avance en un geste : à faire → en cours → fait → à faire", () => {
  assert.equal(L.statutSuivant("a-faire"), "en-cours");
  assert.equal(L.statutSuivant("en-cours"), "fait");
  assert.equal(L.statutSuivant("fait"), "a-faire");
});

test("les actions sont regroupées par échéance, de la plus lointaine au jour J", () => {
  const vg = DONNEES.evenements[0];
  const groupes = L.grouperParEcheance(vg).map((g) => g.echeance);
  assert.equal(groupes[0], "6 semaines avant");
  assert.equal(groupes[groupes.length - 1], "Le jour J");
  assert.ok(groupes.includes("La veille"));
  assert.ok(groupes.includes("4 semaines avant"));
});

test("un événement marqué leSamedi tombe un samedi", () => {
  for (let i = 0; i < 7; i++) {
    const ref = L.ajouterJours(REF, i);
    assert.equal(L.dateEvenement(DONNEES.evenements[0], ref).getDay(), 6);
  }
});

test("seuls le prénom et l'initiale sont affichés", () => {
  assert.equal(L.nomPublic({ prenom: " Léa ", initiale: "d", contact: "06 00 00 00 00" }), "Léa D.");
});

test("l'initiale ne garde que la première lettre, même si on tape le nom entier", () => {
  const v = L.validerInscription({ prenom: "Léa", initiale: "Dupont", contact: "06 12 34 56 78" });
  assert.equal(v.ok, true);
  assert.equal(v.valeurs.initiale, "D");
});

test("le contact accepte un téléphone ou un e-mail, rien d'autre", () => {
  assert.equal(L.analyserContact("06 12 34 56 78").type, "tel");
  assert.equal(L.analyserContact("+33 6 12 34 56 78").type, "tel");
  assert.equal(L.analyserContact("lea@exemple.fr").type, "email");
  assert.equal(L.analyserContact("0612"), null);
  assert.equal(L.analyserContact("lea@"), null);
  assert.equal(L.analyserContact(""), null);
});

test("une saisie incomplète est refusée avec un message par champ", () => {
  const v = L.validerInscription({ prenom: "", initiale: "", contact: "abc" });
  assert.equal(v.ok, false);
  assert.ok(v.erreurs.prenom && v.erreurs.initiale && v.erreurs.contact);
});

test("inscription sans compte : la place est prise et un jeton personnel est créé", () => {
  const etat = cloner(DONNEES);
  const c = L.trouverCreneau(L.trouverEvenement(etat, "vide-grenier"), "vg-buvette-midi");
  const avant = L.placesRestantes(c);
  const r = L.inscrire(etat, "vide-grenier", "vg-buvette-midi", { prenom: "Léa", initiale: "D", contact: "lea@exemple.fr" });
  assert.equal(r.ok, true);
  assert.match(r.jeton, /^[0-9a-f]{24}$/);
  assert.equal(L.placesRestantes(c), avant - 1);
  assert.equal(L.trouverInscription(etat, r.jeton).creneau.id, "vg-buvette-midi");
});

test("deux inscriptions n'ont jamais le même jeton", () => {
  const etat = cloner(DONNEES);
  const a = L.inscrire(etat, "vide-grenier", "vg-rangement", { prenom: "A", initiale: "A", contact: "a@exemple.fr" });
  const b = L.inscrire(etat, "vide-grenier", "vg-rangement", { prenom: "B", initiale: "B", contact: "b@exemple.fr" });
  assert.notEqual(a.jeton, b.jeton);
});

test("un créneau complet n'accepte plus d'inscription", () => {
  const etat = cloner(DONNEES);
  const c = L.trouverCreneau(L.trouverEvenement(etat, "vide-grenier"), "vg-installation");
  assert.equal(L.estComplet(c), true);
  const r = L.inscrire(etat, "vide-grenier", "vg-installation", { prenom: "Léa", initiale: "D", contact: "lea@exemple.fr" });
  assert.equal(r.ok, false);
  assert.equal(r.raison, "complet");
  assert.equal(c.inscrits.length, c.places);
});

test("remplir la dernière place rend le créneau complet ; annuler la libère", () => {
  const etat = cloner(DONNEES);
  const c = L.trouverCreneau(L.trouverEvenement(etat, "vide-grenier"), "vg-accueil-exposants");
  assert.equal(L.placesRestantes(c), 1);
  const r = L.inscrire(etat, "vide-grenier", "vg-accueil-exposants", { prenom: "Léa", initiale: "D", contact: "lea@exemple.fr" });
  assert.equal(L.estComplet(c), true);
  assert.equal(L.annuler(etat, r.jeton), true);
  assert.equal(L.placesRestantes(c), 1);
  assert.equal(L.annuler(etat, r.jeton), false, "un lien déjà utilisé ne fait plus rien");
});

test("le texte de partage reprend les chiffres du bilan", () => {
  const b = DONNEES.bilans[0];
  const t = L.texteBilan(DONNEES.association, b);
  assert.ok(t.includes(String(b.benevoles)));
  assert.ok(t.includes(String(b.heures)));
  assert.ok(t.includes("1 248 €"));
  assert.ok(!t.includes("!"), "pas de point d'exclamation");
});
