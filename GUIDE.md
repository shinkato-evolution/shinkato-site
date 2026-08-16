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

## 4 bis. Inscription à l'annonce de sortie

Le bouton « Être prévenu au lancement » est un **vrai formulaire** (`#telecharger`), pas un
lien `mailto:`. Raison : un `mailto:` ouvre le logiciel de messagerie du visiteur — sur
ordinateur, une grande part des gens utilisent un webmail sans client configuré, et pour
eux le bouton ne faisait tout simplement rien.

Le site étant statique, l'envoi passe par **FormSubmit** (`formsubmit.co`), qui relaie vers
`shinkato.contact@gmail.com`. Aucun compte, aucune clé, rien à héberger.

| Champ caché | Rôle |
|---|---|
| `_subject` | **`Être prévenu au lancement`** — objet FIXE, identique au libellé du bouton. C'est lui qui permet de retrouver toutes les inscriptions d'un seul filtre dans Gmail, et donc de constituer la liste de lancement. |
| `_template=table` | Mail lisible plutôt qu'un bloc brut |
| `_captcha=false` | Pas de captcha imposé au visiteur |
| `_honey` | Piège à robots : champ invisible, hors écran, inatteignable au clavier. Rempli → message rejeté. |
| `_next` | **À renseigner le jour de la mise en ligne** → `merci.html` |

⚠️ **Le formulaire doit être activé une fois** : la première soumission envoie un mail de
confirmation à la boîte Shinkatô, dont il faut cliquer le lien. Avant ça, rien n'arrive.

⚠️ Les adresses transitent par un tiers (FormSubmit). Une mention l'indique sous le champ.
Pour tout garder chez soi, l'alternative serait une table Supabase en écriture seule.

Le bouton **« Devenir partenaire »** (section `#partenaires`) reste un `mailto:` avec l'objet
`Devenir partenaire` — volume attendu faible, et un échange par mail est de toute façon
la suite naturelle. Même logique d'objet fixe pour le tri.

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

- [ ] **ACTIVER LE FORMULAIRE** — indispensable, sinon les inscriptions partent au néant.
      La toute première soumission déclenche un mail de confirmation de FormSubmit à
      `shinkato.contact@gmail.com` : **cliquer son lien une fois**. Tant que ce n'est pas
      fait, aucune inscription n'arrive. Faire un essai avec sa propre adresse.
- [ ] **Brancher la page de remerciement** : une fois le domaine connu, décommenter dans
      `index.html` la ligne `_next` et y mettre `https://TON-DOMAINE/merci.html`. Sans
      elle, le visiteur atterrit sur la page générique de FormSubmit.
- [ ] **Renseigner les liens des stores** dans `#telecharger` (`index.html` ~ligne 353).
      Le texte dit « arrive bientôt sur Google Play et l'App Store ». À reprendre au lancement.
- [ ] Décider pour les polices (section 5).
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
