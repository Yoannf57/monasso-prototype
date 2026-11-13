# Prototype jetable — kit événement

1. **Sur ordinateur** : double-cliquez sur `index.html`. Tout marche hors ligne, rien n'est envoyé sur internet.
2. **Au téléphone (même Wi-Fi que le Mac)** : dans un terminal, `cd prototype && python3 -m http.server 8000`, puis ouvrez sur le téléphone `http://<adresse-du-Mac>:8000` (l'adresse est dans Réglages Système › Wi-Fi › Détails › Adresse IP).
3. **Naviguer** : le bouton « Écrans » du bandeau noir mène aux 4 écrans ; « Réinitialiser la démo » efface ce que les testeurs ont saisi.
4. **Modifier les données** : tout est dans `donnees.js` (textes, dates, créneaux) ; changez le numéro de `version` pour que les téléphones repartent des nouvelles données.
5. **Tests automatiques** : depuis la racine du dépôt, `node --test prototype/tests/` (Node 20+ ; le test de parcours utilise Google Chrome s'il est installé).

Ce code sera jeté : on garde les écrans et les textes, pas le code (journal des décisions du 2026-11-13).
