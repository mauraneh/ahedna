# Changelog

Toutes les évolutions significatives du projet AHEDNA sont consignées ici.

## Unreleased

### Added

- Mise en place d'une supervision applicative avec `health`, `ready`, `live` et endpoint `metrics`.
- Ajout de tests unitaires backend sur l'authentification, l'upload et le monitoring.
- Ajout de tests frontend sur la configuration runtime, l'internationalisation et la résolution des médias.

### Changed

- Renforcement de la CI GitHub Actions pour exécuter les vrais scripts de test et de lint backend.
- Amélioration de l'accessibilité en synchronisant la langue du document HTML avec la langue active de l'application.

## 0.1.0

### Added

- Première version exploitable du site AHEDNA avec frontend Angular, backend Fastify, authentification, contenus publics et espace d'administration.
