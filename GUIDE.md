# Guide du site Shinkatô

Tout ce dont le site a besoin pour tourner, et rien d'autre. Ce dépôt est **autonome** :
il ne dépend d'aucun autre dossier du projet, d'aucun serveur, d'aucune base de données.

> **Statut au 16/08/2026** — le site est complet et prêt. GitHub Pages n'est **pas encore
> activé** : on attend que les liens vers l'application existent (voir « Avant d'activer »).

---

## 1. Ce que c'est

Une page unique (`index.html`), statique, en français. Pas de framework, pas de build,
pas de `npm install`. On ouvre le fichier, ça marche.

**96 fichiers, 13 Mo.** Aucun secret, aucune clé d'API : la démo jouable tourne sur des
données écrites en dur dans `js/main.js`.

## 2. Structure

```
index.html          la page entière (445 lignes)
css/style.css       toute la mise en forme
js/main.js          fond vidéo, territoire jouable, combat, parchemin (1149 lignes)
assets/             96 fichiers — détail en section 4
GUIDE.md            ce document
_audit.js           vérificateur d'intégrité (non publié)
```

## 3. Les 8 sections de la page

| Ancre | Contenu |
|---|---|
| `#hero` | Titre, tagline, fond vidéo piloté par le scroll |
| `#voies` | Les six disciplines |
| `#territoire` | Territoire hexagonal **jouable** (investir des PM, révéler une case) |
| `#combat` | Battle de phrases contre TAMERAI — La Peur de se lancer |
| `#progression` | Niveaux, séries, régularité |
| `#kaen` | Le personnage et le lore |
| `#telecharger` | **Appel à l'action — c'est ici que vont les liens des stores** |
| `#partenaires` | Offre marques + lien vers le tableau de bord partenaire |

## 4. Les assets, par usage

### Vidéo — 5,26 Mo, le plus gros fichier du site
`assets/video/shinkato_scroll.mp4` — fond de la page d'accueil. **Le scroll de la page
EST la tête de lecture** de la vidéo (`js/main.js`, `initFilmBackground`). Trois modes de
repli sont gérés : `scrub` (l'objectif), `loop` (navigateur incapable de se positionner),
`reduced` (image figée si l'utilisateur a demandé moins d'animations).

### Personnages et identité
```
assets/kaen.png              portrait de Kaen (dialogues du parchemin)
assets/kaen_site.png         illustration « L'Appel » — 1,36 Mo, voir section 7
assets/character1..5.png     les 5 héros jouables (section Télécharger)
assets/logo.png              logo Shinkatô
assets/logo_blanc.png        version blanche (CTA + pied de page)
assets/quest.png             icône parchemin
assets/tanto_03.png          tantô affiché en combat
```

### Territoire jouable
```
assets/game/hex_grass.png    case conquise
assets/game/hex_locked.png   case verrouillée
assets/game/chest.png        coffre
assets/game/berries.png      buisson de baies
assets/game/scroll.png       parchemin
assets/game/echo.png         écho (ennemi)
assets/game/pv.png           icône points de vie
assets/game/defeated.png     écho vaincu
```

### Combat
```
assets/fight/bg_combat.jpg       décor des phases 1 et 2
assets/fight/bg_victory.jpg      décor de l'écran de victoire
assets/fight/echo_02..13.webp    frames d'animation de l'écho
assets/fight/hero_02..08.webp    frames d'animation du héros
assets/fight/bulle_parfait.png   retour « PARFAIT »
assets/fight/bulle_bon.png       retour « BON »
assets/fight/bulle_reessaye.png  retour « RÉESSAYE »
```

### Animations de ramassage
```
assets/anim/chest_grass1..5.png  ouverture du coffre
assets/anim/eat_1..6.png         manger des baies
assets/anim/scroll_1..5.png      ramasser un parchemin
```
⚠️ Ces fichiers sont appelés **dynamiquement** en JS (`'assets/anim/eat_' + i + '.png'`).
Une recherche de texte simple ne les trouve pas — ne jamais les supprimer en se fiant à
une recherche du nom complet.

## 4 bis. Formulaires de contact

Deux formulaires : **inscription au lancement** (`#telecharger`) et **demande de
partenariat** (`#partenaires`). Tous deux enregistrent dans **Supabase**, table
`public.site_leads`, via `js/contact.js`.

### Pourquoi pas un `mailto:`, pourquoi pas un service tiers

Un lien `mailto:` ouvre le logiciel de messagerie du visiteur. Sur ordinateur, une grande
part des gens utilisent un webmail sans client configuré : pour eux le bouton **ne fait
rien du tout**, et on perd le contact sans jamais le savoir.

Un service de formulaire tiers (FormSubmit) a été essayé le 16/08/2026 et **abandonné** :
« Unable to submit form » systématique malgré une activation confirmée, et surtout
impossible à diagnostiquer — le service est derrière Cloudflare, chaque essai demandait
une manipulation manuelle à l'aveugle.

Supabase était déjà là, et **se teste**. Tout a été vérifié avant livraison.

### Le chemin d'une inscription

```
Visiteur remplit le formulaire
        │  (js/contact.js, fetch)
        ▼
  table site_leads            ← la liste, elle ne dépend de rien d'autre
        │  (déclencheur trg_notifier_nouveau_lead, ASYNCHRONE)
        ▼
  fonction notifier-lead      ← Edge Function Supabase
        │  (API Resend)
        ▼
  shinkato.contact@gmail.com
```

⚠️ **La collecte et la notification sont volontairement séparées.** Le déclencheur est
`after insert`, asynchrone, et son corps est enveloppé dans un `exception when others` :
si Resend tombe, si le jeton est faux, si le réseau coupe — **l'inscription est quand même
enregistrée**. Un premier jet sans cette protection faisait échouer l'insertion (HTTP 400)
et perdait le contact. Ne jamais retirer ce garde-fou.

### Sécurité

| Élément | Où | Public ? |
|---|---|---|
| Clé Supabase « publishable » | `js/contact.js` | **Oui, et c'est normal** |
| Clé API Resend | Secret Edge Function `RESEND_API_KEY` | Non |
| Jeton du déclencheur | Table `prive.config` + secret `SHINKATO_HOOK_TOKEN` | Non |

La clé du site est publique **par conception**. Ce qui protège les adresses collectées,
c'est la politique RLS de `site_leads` : **une seule politique, INSERT**. Pas de SELECT,
pas d'UPDATE, pas de DELETE. Vérifié — une lecture avec la clé publique renvoie HTTP 401.

Le schéma `prive` n'est pas exposé par PostgREST : le jeton y est hors d'atteinte de l'API.

### Tests passés le 16/08/2026

| Test | Résultat |
|---|---|
| Insertion avec la clé publique | ✅ 201 |
| Lecture avec la clé publique | ✅ 401 refusée |
| E-mail invalide | ✅ 400 contrainte |
| Notification lancement | ✅ mail reçu |
| Notification partenariat | ✅ mail reçu |

### Consulter la liste

Supabase → **Table Editor** → `site_leads`. Export CSV depuis la même page.
La table a été vidée de ses lignes de test le 16/08/2026.

## 4 ter. Pages légales

| Page | Obligatoire ? |
|---|---|
| `mentions-legales.html` | **OUI** — loi LCEN art. 6-III, pour tout site accessible au public, commercial ou non. |
| `confidentialite.html` | **OUI** depuis l'ajout des formulaires : dès qu'on collecte une donnée personnelle, le RGPD impose d'informer. |
| CGV | **Non** — elles n'existent qu'en cas de vente. À créer le jour où l'app vendra quelque chose. |
| CGU | Facultatif pour un site vitrine. Utile pour l'application elle-même. |
| Bandeau cookies | **Non** — le site ne dépose aucun cookie et n'utilise aucun traceur. |

Les deux pages sont **complètes**, en régime professionnel : l'éditeur est une entreprise
individuelle active (Tristan GONCALVES, EI, nom commercial Shinkatô, SIREN 942 998 972).

Pourquoi le régime professionnel et non le régime « non professionnel » — qui aurait permis
de ne publier que l'hébergeur : l'entreprise est active, porte le nom Shinkatô, et le site
démarche des marques pour des partenariats. Le régime allégé n'aurait pas tenu, et l'écart
de sanction est de 1 an d'emprisonnement et 75 000 € d'amende.

L'adresse publiée est celle de l'**établissement au répertoire SIRENE** — « Shinkatô,
Village, 32490 Castillon-Savès » — et non la forme « Le Village » du dossier de création :
elle se présente comme une adresse d'entreprise, ce qu'elle est.

🟠 Le **numéro de téléphone reste un mobile personnel**. La loi l'impose pour une personne
physique professionnelle (LCEN art. 6-III-1). Un second numéro dédié règle la question si
le démarchage devient gênant — à voir après quelques semaines de mise en ligne.

**Sections couvertes** — mentions légales : éditeur, directeur de publication, hébergeur,
accès au site, propriété intellectuelle, données personnelles, responsabilité, liens
hypertextes, cookies, crédits, droit applicable et litiges.
Confidentialité : responsable du traitement, données collectées (volontaires **et** journaux
techniques de l'hébergeur), finalités/base légale/durées en tableau, destinataires et
transferts hors UE, droits, **mineurs**, sécurité, modifications.

⚠️ La clause de litiges ne désigne **pas** un tribunal précis : une clause attributive de
juridiction est réputée non écrite face à un consommateur. Le texte rappelle au contraire
qu'un consommateur peut saisir la juridiction de son lieu de résidence.

⚠️ La section **Mineurs** existe parce que Shinkatô est un jeu : l'âge du consentement
numérique est de 15 ans en France. Beaucoup de sites l'oublient — y compris ceux pris en
référence.

L'hébergeur est déjà renseigné : GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco.

## 5. Dépendances externes

**Une seule** : les polices Google Fonts, chargées dans `index.html` —
**Cinzel** (600/700/900) et **Montserrat** (400 à 900 + italique).

> ⚠️ **À décider avant la mise en ligne.** Google Fonts en CDN envoie l'adresse IP de
> chaque visiteur à Google. En France et dans l'UE, plusieurs décisions de justice ont
> jugé cela non conforme au RGPD sans consentement. **Héberger les deux polices en local**
> (les `.ttf` sont déjà dans `application_shinkato/node_modules/@expo-google-fonts/`)
> supprime le problème, retire une dépendance réseau et accélère le premier affichage.
> Une demi-heure de travail, à faire avant de communiquer l'adresse.

Aucune autre dépendance : pas de jQuery, pas d'analytics, pas de cookies, pas de tracker.

## 6. Travailler sur le site

```bash
# Il suffit d'ouvrir index.html dans un navigateur.
# Pour un vrai serveur local (recommandé, la vidéo se positionne mieux) :
npx serve .          # ou : python -m http.server 8000
```

**Après toute modification, lancer l'audit d'intégrité :**

```bash
node _audit.js
```

Il résout chaque référence du HTML, du CSS et du JS et vérifie que le fichier existe.
Il doit afficher `OK — aucune référence cassée`. C'est le garde-fou du dépôt.

## 7. Poids — pistes d'allègement

Le site fait 13 Mo. Rien de bloquant (GitHub Pages accepte 1 Go), mais sur une page
vitrine le premier affichage compte.

| Fichier | Poids | Piste |
|---|---|---|
| `assets/video/shinkato_scroll.mp4` | 5,26 Mo | Ré-encoder en H.264 CRF 28, ou proposer une version courte sur mobile |
| `assets/kaen_site.png` | 1,36 Mo | PNG sans transparence → **JPEG qualité 88 ≈ 150 Ko** |
| `assets/cosmos.png` | 0,67 Mo | Idem — et il n'est **plus appelé** (voir ci-dessous) |

**15 fichiers ne sont appelés nulle part** (1 380 Ko) — vestiges d'anciennes versions :

```
assets/cosmos.png        assets/door.png          assets/fire.png
assets/glyph_img.png     assets/open_chest.png    assets/tile_*.png (10 fichiers)
```

Ils sont **conservés volontairement** dans ce premier dépôt : la consigne était que rien
ne manque. À supprimer quand tu auras confirmé qu'aucune évolution prévue ne les réclame.

## 8. Avant d'activer GitHub Pages

- [x] ~~**Formulaires**~~ — ✅ **faits et testés le 16/08/2026** (Supabase + Resend).
      Rien à activer, rien à reconfigurer au changement de domaine : l'envoi ne dépend
      ni de l'origine de la page ni du domaine. ⚠️ Refaire malgré tout **un** essai
      après la mise en ligne, par principe.
- [ ] **Renseigner les liens des stores** dans `#telecharger` (`index.html` ~ligne 353).
      Le texte dit « arrive bientôt sur Google Play et l'App Store ». À reprendre au lancement.
- [ ] **Confirmer l'adresse et le téléphone publiés** dans les mentions légales : ce sont
      aujourd'hui le domicile et le mobile personnels de l'éditeur (cf. §4 ter).
- [ ] Décider pour les polices (section 5). Si elles passent en local, supprimer le
      paragraphe Google Fonts de `confidentialite.html`.
- [ ] Vérifier le lien du tableau de bord partenaire (section `#partenaires`).
- [ ] Ajouter les métadonnées de partage (`og:image`, `og:title`) — un des panneaux de
      `store-assets/out/` ferait une excellente image de partage.
- [ ] Passer le dépôt en **public** (obligatoire pour Pages en offre gratuite).
- [ ] Activer Pages : *Settings → Pages → Source : branche `main`, dossier `/`*.
- [ ] Domaine : créer un fichier `CNAME` à la racine contenant le domaine, puis chez le
      registrar un `CNAME` vers `shinkato-evolution.github.io` (ou 4 enregistrements `A`
      vers les IP de GitHub Pages pour un domaine racine). HTTPS s'active seul ensuite.

## 9. Ce que ce dépôt ne contient pas, volontairement

Le code de l'application (`application_shinkato`), l'éditeur de chapitres, le tableau de
bord partenaire, le dossier business et la charte de marque restent **en dehors**. Ce dépôt
étant destiné à devenir public, il ne doit contenir que ce qui est déjà destiné au public.
