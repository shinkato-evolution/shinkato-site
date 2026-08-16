# Shinkatô — site vitrine

> *Deviens le héros de ton évolution.*

Site public de **Shinkatô**, application mobile de développement personnel gamifiée.
Page unique, statique, sans build ni dépendance à installer.

**→ Toute la documentation est dans [GUIDE.md](GUIDE.md)** : assets, structure,
dépendances, poids, et la marche à suivre pour la mise en ligne.

## Démarrer

```bash
npx serve .          # puis ouvrir l'adresse affichée
```

Ou simplement ouvrir `index.html` dans un navigateur.

## Avant de committer

```bash
node _audit.js       # doit afficher : OK — aucune référence cassée
```

Ce dépôt **est** le site publié. Un fichier absent ici est un trou dans la page en ligne.

## Contenu

Page unique en 8 sections, dont trois démonstrations réellement jouables : le territoire
hexagonal, le combat « battle de phrases », et la lecture d'un parchemin d'histoire.
Le fond vidéo de l'accueil est piloté par le scroll de la page.

Aucun secret, aucune clé d'API, aucun tracker : la démo tourne sur des données en dur.

---

© 2026 Shinkatô — shinkato.contact@gmail.com
