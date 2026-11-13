// Vérifie que les données fictives respectent la demande 001 et nos principes.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const L = require("../js/logique.js");
const DONNEES = require("../donnees.js");

const RACINE = path.join(__dirname, "..");
const REF = new Date("2026-11-13T10:00:00");

test("APE fictive avec un bureau de 6 prénoms", () => {
  assert.equal(DONNEES.association.nom, "APE Les Coquelicots");
  assert.equal(DONNEES.bureau.length, 6);
  DONNEES.bureau.forEach((m) => assert.deepEqual(Object.keys(m).sort(), ["prenom", "role"]));
});

test("3 événements à venir et un bilan passé", () => {
  assert.deepEqual(DONNEES.evenements.map((e) => e.id), ["vide-grenier", "marche-noel", "kermesse"]);
  assert.equal(DONNEES.bilans.length, 1);
  assert.ok(L.dateEvenement(DONNEES.bilans[0]) < REF);
});

test("vide-grenier : environ 20 actions et 2 ou 3 en retard, quel que soit le jour d'ouverture", () => {
  const vg = DONNEES.evenements[0];
  assert.ok(vg.actions.length >= 18 && vg.actions.length <= 24);
  for (let i = 0; i < 7; i++) {
    const ref = L.ajouterJours(REF, i);
    const n = vg.actions.filter((a) => L.estEnRetard(a, vg, ref)).length;
    assert.ok(n >= 2 && n <= 3, "retards le jour +" + i + " : " + n);
  }
});

test("statuts variés et identifiants uniques", () => {
  const statuts = new Set(DONNEES.evenements[0].actions.map((a) => a.statut));
  assert.deepEqual([...statuts].sort(), ["a-faire", "en-cours", "fait"]);
  const ids = DONNEES.evenements.flatMap((e) => e.actions.map((a) => a.id));
  assert.equal(new Set(ids).size, ids.length);
});

test("6 à 8 créneaux, certains complets, d'autres presque vides", () => {
  const cr = DONNEES.evenements[0].creneaux;
  assert.ok(cr.length >= 6 && cr.length <= 8);
  assert.ok(cr.some((c) => L.estComplet(c)));
  assert.ok(cr.some((c) => c.inscrits.length === 0));
  cr.forEach((c) => assert.ok(c.inscrits.length <= c.places, c.id + " déborde"));
});

test("volontaires d'essai : prénom, une seule lettre d'initiale, contact visiblement fictif", () => {
  DONNEES.evenements.flatMap((e) => e.creneaux).flatMap((c) => c.inscrits).forEach((v) => {
    assert.match(v.initiale, /^[A-Z]$/);
    assert.ok(/^06 00 00 00 \d\d$/.test(v.contact) || /@exemple\.fr$/.test(v.contact), v.contact);
  });
});

test("le référent de chaque action fait partie du bureau", () => {
  const prenoms = DONNEES.bureau.map((m) => m.prenom);
  DONNEES.evenements.flatMap((e) => e.actions).forEach((a) => assert.ok(prenoms.includes(a.referent), a.referent));
});

test("aucune ressource externe : tout est dans le dossier", () => {
  const html = fs.readFileSync(path.join(RACINE, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(RACINE, "style.css"), "utf8");
  assert.ok(!/(src|href)="(https?:)?\/\//.test(html), "index.html charge une ressource externe");
  assert.ok(!/url\(["']?(https?:)?\/\//.test(css), "style.css charge une ressource externe");
  for (const m of css.matchAll(/url\("([^"]+)"\)/g)) {
    assert.ok(fs.existsSync(path.join(RACINE, m[1])), "fichier manquant : " + m[1]);
  }
});
