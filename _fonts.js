/* Télécharge les polices Google en local (woff2, sous-ensemble latin) et génère css/fonts.css.
   À lancer UNE fois ; ensuite le site ne parle plus jamais à Google. */
const fs = require('fs');
const path = require('path');
const https = require('https');

const RACINE = 'C:/Users/gonca/Desktop/shinkato-site';
const DOSSIER = path.join(RACINE, 'assets/fonts');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const URL_CSS = 'https://fonts.googleapis.com/css2'
  + '?family=Cinzel:wght@600;700;900'
  + '&family=Montserrat:ital,wght@0,400;0,600;0,700;0,900;1,400'
  + '&display=swap';

function get(url, binaire) {
  return new Promise((ok, ko) => {
    https.get(url, { headers: { 'User-Agent': UA } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        return get(r.headers.location, binaire).then(ok, ko);
      }
      if (r.statusCode !== 200) return ko(new Error(url + ' → HTTP ' + r.statusCode));
      const morceaux = [];
      r.on('data', (c) => morceaux.push(c));
      r.on('end', () => ok(binaire ? Buffer.concat(morceaux) : Buffer.concat(morceaux).toString('utf8')));
    }).on('error', ko);
  });
}

(async () => {
  const css = await get(URL_CSS, false);

  // Google émet un bloc par sous-ensemble, précédé d'un commentaire /* latin */.
  // On ne garde que « latin » : il couvre le français (é à ç ù ô œ € …).
  const blocs = css.split('/*').map((b) => '/*' + b);
  const gardes = blocs.filter((b) => /^\/\*\s*latin\s*\*\//.test(b));

  fs.mkdirSync(DOSSIER, { recursive: true });
  let sortie = `/* ============================================================
   POLICES HÉBERGÉES EN LOCAL — Cinzel & Montserrat

   Pourquoi pas le CDN Google : charger une police depuis fonts.gstatic.com
   fait envoyer l'adresse IP de CHAQUE visiteur à Google, sans son accord.
   Le RGPD l'interdit sans consentement (jurisprudence FR/UE). Ici les fichiers
   sont servis par notre propre hébergement : aucune requête ne sort du site.

   Fichiers : woff2, sous-ensemble « latin » (couvre le français : é à ç ù ô œ €).
   Régénération : voir GUIDE.md § Polices.
   ============================================================ */\n\n`;
  let total = 0;

  for (const bloc of gardes) {
    const famille = /font-family:\s*'([^']+)'/.exec(bloc)[1];
    const style = /font-style:\s*(\w+)/.exec(bloc)[1];
    const poids = /font-weight:\s*(\d+)/.exec(bloc)[1];
    const plage = /unicode-range:\s*([^;]+);/.exec(bloc)[1].trim();
    const lien = /url\((https:[^)]+)\)/.exec(bloc)[1];

    const nom = `${famille.toLowerCase()}-${poids}${style === 'italic' ? '-italic' : ''}.woff2`;
    const donnees = await get(lien, true);
    fs.writeFileSync(path.join(DOSSIER, nom), donnees);
    total += donnees.length;
    console.log(`  ${nom.padEnd(30)} ${(donnees.length / 1024).toFixed(1)} Ko`);

    sortie += `@font-face {\n`
      + `  font-family: '${famille}';\n`
      + `  font-style: ${style};\n`
      + `  font-weight: ${poids};\n`
      + `  font-display: swap;\n`
      + `  src: url('../assets/fonts/${nom}') format('woff2');\n`
      + `  unicode-range: ${plage};\n`
      + `}\n\n`;
  }

  fs.writeFileSync(path.join(RACINE, 'css/fonts.css'), sortie, 'utf8');
  console.log(`\n${gardes.length} fichiers, ${(total / 1024).toFixed(1)} Ko au total → css/fonts.css écrit.`);
})();
