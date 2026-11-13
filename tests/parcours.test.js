/*
  Test des parcours dans un vrai Chrome, au format téléphone (375 px), sans dépendance :
  on pilote Chrome par son protocole de débogage.
  Si Chrome n'est pas trouvé, le test est sauté (indiquer son chemin dans CHROME=…).
  CAPTURES=dossier enregistre une capture de chaque écran.
*/
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const CHEMINS_CHROME = [
  process.env.CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].filter(Boolean);
const CHROME = CHEMINS_CHROME.find((p) => fs.existsSync(p));
const PAGE = pathToFileURL(path.join(__dirname, "..", "index.html")).href;
const CAPTURES = process.env.CAPTURES;

function attendre(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function lancerChrome() {
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "monasso-chrome-"));
  const proc = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=0", "--user-data-dir=" + profil, "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });
  const ws = await new Promise((ok, ko) => {
    let tampon = "";
    const minuteur = setTimeout(() => ko(new Error("Chrome ne répond pas")), 15000);
    proc.stderr.on("data", (d) => {
      tampon += d;
      const m = tampon.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(minuteur); ok(m[1]); }
    });
  });
  const port = new URL(ws).port;
  const cible = await (await fetch("http://127.0.0.1:" + port + "/json/new?about:blank", { method: "PUT" })).json();
  const socket = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((ok, ko) => { socket.onopen = ok; socket.onerror = ko; });

  let n = 0;
  const attente = new Map();
  const ecouteurs = [];
  socket.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && attente.has(msg.id)) {
      const { ok, ko } = attente.get(msg.id);
      attente.delete(msg.id);
      msg.error ? ko(new Error(msg.error.message)) : ok(msg.result);
    } else if (msg.method) { ecouteurs.forEach((f) => f(msg)); }
  };
  const envoyer = (method, params = {}) => new Promise((ok, ko) => {
    const id = ++n;
    attente.set(id, { ok, ko });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const fermer = async () => {
    try { socket.close(); } catch (e) { /* rien */ }
    const fini = new Promise((ok) => proc.once("exit", ok));
    proc.kill();
    await fini;
    fs.rmSync(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
  return { envoyer, ecouteurs, fermer };
}

test("parcours complets au téléphone", { skip: !CHROME && "Chrome introuvable", timeout: 60000 }, async (t) => {
  const c = await lancerChrome();
  t.after(c.fermer);

  const requetes = [];
  c.ecouteurs.push((m) => { if (m.method === "Network.requestWillBeSent") { requetes.push(m.params.request.url); } });
  await c.envoyer("Network.enable");
  await c.envoyer("Page.enable");
  await c.envoyer("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
  await c.envoyer("Emulation.setTouchEmulationEnabled", { enabled: true });

  async function evaluer(expr) {
    const r = await c.envoyer("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) { throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text); }
    return r.result.value;
  }
  async function jusqua(expr, quoi) {
    for (let i = 0; i < 50; i++) {
      if (await evaluer(expr)) { return; }
      await attendre(100);
    }
    throw new Error("Délai dépassé : " + (quoi || expr));
  }
  // Vrai chargement de page (comme ouvrir le lien dans un nouvel onglet).
  async function ouvrir(hash) {
    await c.envoyer("Page.navigate", { url: "about:blank" });
    await jusqua("location.href === 'about:blank'");
    await c.envoyer("Page.navigate", { url: PAGE + hash });
    await jusqua("document.readyState === 'complete' && !!document.querySelector('#vue h1')", "chargement " + hash);
    await evaluer("document.fonts.ready.then(() => true)");
  }
  async function aller(hash) {
    await evaluer("location.hash = " + JSON.stringify(hash) + "; true");
    await jusqua("location.hash === " + JSON.stringify(hash) + " && !!document.querySelector('#vue h1')", hash);
  }
  const texte = () => evaluer("document.getElementById('vue').innerText");
  const largeurOk = () => evaluer("document.documentElement.scrollWidth <= window.innerWidth");
  async function capture(nom) {
    if (!CAPTURES) { return; }
    const m = await evaluer("({ h: Math.ceil(document.documentElement.scrollHeight) })");
    await c.envoyer("Emulation.setDeviceMetricsOverride", { width: 375, height: m.h, deviceScaleFactor: 2, mobile: true });
    const r = await c.envoyer("Page.captureScreenshot", { format: "png" });
    fs.mkdirSync(CAPTURES, { recursive: true });
    fs.writeFileSync(path.join(CAPTURES, nom + ".png"), Buffer.from(r.data, "base64"));
    await c.envoyer("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
  }
  const textesVus = [];

  await t.test("s'ouvre depuis le fichier, sans rien charger d'internet", async () => {
    await ouvrir("#accueil");
    await evaluer("localStorage.clear(); true");
    await ouvrir("#accueil");
    const externes = requetes.filter((u) => !/^(file:|data:|about:)/.test(u));
    assert.deepEqual(externes, []);
    assert.equal(await evaluer("document.fonts.check('16px \"Young Serif\"') && document.fonts.check('16px \"Atkinson Hyperlegible\"')"), true, "polices embarquées chargées");
  });

  await t.test("bandeau permanent et menu de démo séparé", async () => {
    assert.equal(await evaluer("document.querySelector('.demo-etiquette').textContent"), "Prototype — données fictives");
    assert.equal(await evaluer("getComputedStyle(document.querySelector('.demo')).position"), "sticky");
    assert.equal(await evaluer("document.getElementById('vue').contains(document.getElementById('demo-menu'))"), false);
    await evaluer("document.getElementById('demo-ouvrir').click(); true");
    assert.equal(await evaluer("document.getElementById('demo-menu').hidden"), false);
    await evaluer("document.querySelector('#demo-menu a[href=\"#evenement/vide-grenier\"]').click(); true");
    await jusqua("location.hash === '#evenement/vide-grenier'");
    assert.equal(await evaluer("document.getElementById('demo-menu').hidden"), true);
  });

  await t.test("écran 1 : accueil avec retards et semaine en cours", async () => {
    await aller("#accueil");
    const t1 = await texte();
    textesVus.push(t1);
    assert.match(t1, /Vide-grenier de l'école/);
    assert.match(t1, /Marché de Noël/);
    assert.match(t1, /Kermesse/);
    assert.match(t1, /EN RETARD|En retard/i);
    assert.match(t1, /Demander l'arrêté en mairie/);
    assert.ok(await largeurOk(), "pas de défilement horizontal");
    await capture("1-accueil");
  });

  await t.test("écran 2 : un geste change le statut, mémorisé après rechargement", async () => {
    await aller("#evenement/vide-grenier");
    const t2 = await texte();
    textesVus.push(t2);
    for (const g of ["6 semaines avant", "4 semaines avant", "La veille", "Le jour J"]) { assert.ok(t2.includes(g), g); }
    assert.ok(await largeurOk(), "pas de défilement horizontal");
    const tailles = await evaluer("[...document.querySelectorAll('.statut')].map(b => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); })");
    assert.ok(Math.min(...tailles) >= 44, "zones tactiles d'au moins 44 px");
    await capture("2-evenement");

    assert.equal(await evaluer("document.querySelector('[data-action=\"vg-affiches\"]').textContent"), "À faire");
    await evaluer("document.querySelector('[data-action=\"vg-affiches\"]').click(); true");
    assert.equal(await evaluer("document.querySelector('[data-action=\"vg-affiches\"]').textContent"), "En cours");
    await ouvrir("#evenement/vide-grenier");
    assert.equal(await evaluer("document.querySelector('[data-action=\"vg-affiches\"]').textContent"), "En cours", "mémorisé");
    await evaluer("document.querySelector('[data-action=\"vg-affiches\"]').click(); true");
    assert.equal(await evaluer("document.querySelector('[data-action=\"vg-affiches\"]').textContent"), "Fait");
    assert.match(await texte(), /5 faites sur 22/);
  });

  let jeton;
  await t.test("écran 3 : un parent s'inscrit sans compte, en 5 gestes", async () => {
    await aller("#coups-de-main/vide-grenier");
    const t3 = await texte();
    textesVus.push(t3);
    assert.ok(await largeurOk(), "pas de défilement horizontal");
    assert.match(t3, /Pas besoin de compte/);
    assert.ok(!/06 00 00 00|@exemple\.fr/.test(await evaluer("document.getElementById('vue').innerHTML")), "aucun contact affiché");
    assert.match(t3, /Fatou S\./);
    assert.ok(!/Fatou S[a-z]/.test(t3));
    await capture("3-coups-de-main");

    // geste 1 : « Je viens »
    await evaluer("document.querySelector('[data-ouvrir=\"vg-buvette-matin\"]').click(); true");
    await jusqua("!!document.querySelector('#creneau-vg-buvette-matin form')");
    assert.equal(await evaluer("document.activeElement.name"), "prenom", "le curseur est déjà dans le prénom");
    // essai avec un contact invalide
    await evaluer(`(() => { const f = document.querySelector('.formulaire');
      f.elements.prenom.value = 'Léa'; f.elements.initiale.value = 'D'; f.elements.contact.value = '06 12';
      f.requestSubmit(); return true; })()`);
    assert.match(await evaluer("document.getElementById('erreur-contact').textContent"), /téléphone/);
    await capture("3b-formulaire-erreur");
    // gestes 2 à 5 : prénom, initiale, contact, « Je m'inscris »
    await evaluer(`(() => { const f = document.querySelector('.formulaire');
      f.elements.contact.value = '06 12 34 56 78'; f.querySelector('button[type=submit]').click(); return true; })()`);
    await jusqua("location.hash.startsWith('#merci/')", "écran de confirmation");
    jeton = await evaluer("location.hash.split('/')[1]");
    const tm = await texte();
    textesVus.push(tm);
    assert.match(tm, /C'est noté, Léa\./);
    assert.match(tm, /Léa D\./);
    assert.ok(tm.includes("#annuler/" + jeton), "lien personnel affiché");
    assert.ok(await largeurOk(), "pas de défilement horizontal");
    await capture("3c-confirmation");

    await aller("#coups-de-main/vide-grenier");
    assert.match(await evaluer("document.querySelector('#creneau-vg-buvette-matin').innerText"), /Léa D\./);
    assert.match(await evaluer("document.querySelector('#creneau-vg-buvette-matin').innerText"), /Dernière place/);
  });

  await t.test("créneau complet : plus de bouton ; annulation par le lien personnel", async () => {
    assert.equal(await evaluer("!!document.querySelector('#creneau-vg-installation [data-ouvrir]')"), false);
    assert.match(await evaluer("document.querySelector('#creneau-vg-installation').innerText"), /Complet/i);

    // on remplit la dernière place de l'accueil des exposants
    await evaluer("document.querySelector('[data-ouvrir=\"vg-accueil-exposants\"]').click(); true");
    await jusqua("!!document.querySelector('#creneau-vg-accueil-exposants form')");
    await evaluer(`(() => { const f = document.querySelector('.formulaire');
      f.elements.prenom.value = 'Noé'; f.elements.initiale.value = 'Martin'; f.elements.contact.value = 'noe@exemple.fr';
      f.querySelector('button[type=submit]').click(); return true; })()`);
    await jusqua("location.hash.startsWith('#merci/')");
    const jetonNoe = await evaluer("location.hash.split('/')[1]");
    await aller("#coups-de-main/vide-grenier");
    assert.equal(await evaluer("!!document.querySelector('#creneau-vg-accueil-exposants [data-ouvrir]')"), false, "devenu complet");
    assert.match(await evaluer("document.querySelector('#creneau-vg-accueil-exposants').innerText"), /Noé M\./);

    // le lien personnel ouvert « depuis un autre onglet »
    await ouvrir("#annuler/" + jetonNoe);
    const ta = await texte();
    textesVus.push(ta);
    assert.match(ta, /Votre coup de main/);
    await capture("3d-annuler");
    await evaluer("document.querySelector('[data-annuler]').click(); true");
    await jusqua("document.getElementById('vue').innerText.includes(\"C'est annulé\")");
    await aller("#coups-de-main/vide-grenier");
    assert.equal(await evaluer("!!document.querySelector('#creneau-vg-accueil-exposants [data-ouvrir]')"), true, "place libérée");
    assert.ok(!(await texte()).includes("Noé M."));

    await ouvrir("#annuler/" + jetonNoe);
    assert.match(await texte(), /ne mène à aucune inscription/);
  });

  await t.test("écran 4 : bilan à partager sur WhatsApp", async () => {
    await aller("#bilan/fete-juin");
    const t4 = await texte();
    textesVus.push(t4);
    assert.match(t4, /34/);
    assert.match(t4, /96/);
    assert.match(t4, /1\s?248/);
    assert.match(t4, /18/);
    const lien = await evaluer("document.getElementById('whatsapp').href");
    assert.ok(lien.startsWith("https://wa.me/?text="));
    assert.match(decodeURIComponent(lien), /34 parents/);
    assert.ok(await largeurOk(), "pas de défilement horizontal");
    await capture("4-bilan");

    // « Enregistrer l'image » fabrique un PNG (on intercepte le téléchargement).
    await evaluer(`(() => { window.__image = null;
      const orig = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__image = { nom: this.download, href: this.href }; } else { orig.call(this); } };
      document.querySelector('[data-image]').click(); return true; })()`);
    await jusqua("!!window.__image", "image du bilan");
    const image = await evaluer("window.__image");
    assert.equal(image.nom, "merci-fete-juin.png");
    assert.ok(image.href.startsWith("data:image/png;base64,") && image.href.length > 20000, "image non vide");
    if (CAPTURES) { fs.writeFileSync(path.join(CAPTURES, "4b-image-partagee.png"), Buffer.from(image.href.split(",")[1], "base64")); }
  });

  await t.test("« Réinitialiser la démo » remet les données d'origine", async () => {
    await evaluer("window.confirm = () => true; document.getElementById('demo-ouvrir').click(); document.getElementById('demo-reinit').click(); true");
    await jusqua("location.hash === '#accueil'");
    await aller("#evenement/vide-grenier");
    assert.equal(await evaluer("document.querySelector('[data-action=\"vg-affiches\"]').textContent"), "À faire");
    await aller("#coups-de-main/vide-grenier");
    assert.ok(!(await texte()).includes("Léa D."));
    await ouvrir("#annuler/" + jeton);
    assert.match(await texte(), /ne mène à aucune inscription/);
  });

  await t.test("le mot interdit n'apparaît sur aucun écran affiché", () => {
    const interdit = new RegExp("t[aâ]" + "che", "i");
    textesVus.forEach((tx) => assert.ok(!interdit.test(tx)));
    assert.ok(textesVus.every((tx) => !tx.includes("!")), "pas de point d'exclamation à l'écran");
  });
});
