# Changelog

Toutes les évolutions significatives du projet AHEDNA sont consignées ici.

## Unreleased

### Added

- Mise en place d'une supervision applicative avec `health`, `ready`, `live` et endpoint `metrics`.
- Ajout de tests unitaires backend sur l'authentification, l'upload et le monitoring, puis extension à l'ensemble des routes de l'API, aux fonctions de protection anti-SSRF, au pipeline de veille d'actualités publiques via des doublures de `fetch` et à la configuration du pool PostgreSQL (90 tests au total, couverture backend 90 % lignes / 80 % branches).
- Ajout de tests frontend sur la configuration runtime, l'internationalisation et la résolution des médias, puis extension à l'ensemble des composants, services, guards et intercepteurs de l'application, y compris les parcours d'erreur des espaces d'administration et de gestion de contenu (268 tests au total, couverture frontend 90 % lignes / 76 % branches).
- Déduplication des utilitaires de test partagés (client HTTP backend, configuration Transloco, doublure `AuthService`) entre les suites de tests backend et frontend.
- Ajout d'un lien d'évitement (« Aller au contenu principal ») sur toutes les pages et d'un repère `<main>` sur les pages qui n'en avaient pas.
- Ajout de régions live (`role="alert"` / `role="status"`) sur les messages d'erreur et de confirmation pour les lecteurs d'écran.
- Ajout d'une page 404 dédiée (non indexée) à la place de la redirection silencieuse vers l'accueil.
- Ajout des balises `og:image`/`twitter:image` et de données structurées JSON-LD (organisation) pour améliorer les aperçus de partage et le référencement.
- Ajout d'une URL propre par actualité et par événement (`?id=...`), avec chargement direct par identifiant et mise à jour dynamique du titre/de la description/de l'image SEO le temps de la consultation.

### Fixed

- Correction des accents français manquants dans les balises meta et les titres/descriptions par page.
- Correction du texte alternatif manquant sur une image de la file de modération photo (administration).
- Correction d'un bogue bloquant sur l'import d'actualités publiques (`POST /api/news/import-public`) : la requête d'insertion réutilisait le même paramètre SQL à deux endroits de types incompatibles, ce que PostgreSQL rejetait systématiquement (« inconsistent types deduced for parameter $9 »), empêchant tout import depuis la mise en service de la fonctionnalité.
- Correction de l'initialisation du schéma de base de données (`initDatabase`), qui pouvait échouer en cas de démarrages concurrents (plusieurs instances s'initialisant au même instant) ; une nouvelle tentative automatique gère désormais ce cas.
- Suppression de l'affichage d'image pour les actualités récupérées automatiquement (Google Actualités, Bing, GDELT) : les images issues des flux ou extraites des pages sources sont trop souvent cassées ou mal choisies. Elles ne sont plus ni affichées, ni utilisées comme image de partage (SEO), ni conservées lors de l'import définitif d'un article.

### Changed

- Renforcement de la CI GitHub Actions pour exécuter les vrais scripts de test et de lint backend.
- Amélioration de l'accessibilité en synchronisant la langue du document HTML avec la langue active de l'application.

## 0.1.0

### Added

- Première version exploitable du site AHEDNA avec frontend Angular, backend Fastify, authentification, contenus publics et espace d'administration.
