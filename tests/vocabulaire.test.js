// Le mot interdit (singulier ou pluriel, avec ou sans accent) ne doit apparaître nulle part dans le prototype.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RACINE = path.join(__dirname, "..");
// Construit pour que ce fichier ne contienne pas lui-même le mot.
const INTERDIT = new RegExp("\\bt[aâ]" + "che(s)?\\b", "i");
const ANGLAIS = new RegExp("\\bta" + "sks?\\b", "i");

function fichiers(dossier) {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((f) => {
    const p = path.join(dossier, f.name);
    if (f.isDirectory()) { return f.name === "polices" ? [] : fichiers(p); }
    return /\.(html|css|js|md|json)$/.test(f.name) ? [p] : [];
  });
}

test("vocabulaire : « actions » et « coups de main » seulement", () => {
  const fautifs = fichiers(RACINE).filter((p) => {
    const t = fs.readFileSync(p, "utf8");
    return INTERDIT.test(t) || ANGLAIS.test(t);
  });
  assert.deepEqual(fautifs.map((p) => path.relative(RACINE, p)), []);
});

test("pas de point d'exclamation dans les textes affichés", () => {
  const sources = ["js/app.js", "donnees.js"].map((f) => fs.readFileSync(path.join(RACINE, f), "utf8"));
  sources.forEach((s) => {
    const chaines = s.match(/"[^"\n]*"|'[^'\n]*'/g) || [];
    chaines.forEach((c) => {
      if (/^["'](!|!==?|.*[=!]==)/.test(c)) { return; }
      assert.ok(!/[A-Za-zÀ-ÿ.\s]!/.test(c), "point d'exclamation : " + c);
    });
  });
});
