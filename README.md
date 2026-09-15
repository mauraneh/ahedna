# AHEDNA

Site web Angular + API Fastify/PostgreSQL pour l'association AHEDNA.

## Prerequis

- Node.js 20+
- Yarn 1.22+
- PostgreSQL ou Docker Compose

## Lancement

```bash
docker-compose up --build
```

Sans Docker :

```bash
cd backend && yarn install && yarn dev
cd frontend && yarn install && yarn start
```

## Variables utiles

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `AHEDNA_API_URL`
- `AHEDNA_SITE_URL`

## Interfaces

- Site public : `http://localhost:4200`
- Administration : `/admin`
- Gestion des contenus : `/contenu`

## Verification

Les tests backend ecrivent en base : ils utilisent une base dediee, jamais celle de `.env`.
A faire une fois :

```bash
createdb ahedna_test
cp .env.test.example .env.test   # puis ajuster DATABASE_URL si besoin
```

`backend/tests/setup-env.js` charge `.env.test` avec `override: true` : un `DATABASE_URL`
herite du shell ou du conteneur Docker ne peut pas prendre le dessus. Sans `.env.test`
(CI), le `DATABASE_URL` fourni est accepte seulement si le nom de la base contient
`test` — sinon les tests refusent de demarrer.

```bash
cd backend && yarn lint:backend && yarn test:backend
cd frontend && yarn test:ci && yarn build
```

## Deploiement

Le frontend peut etre deploye sur Vercel avec :

- dossier racine : `frontend`
- commande de build : `yarn build`
- sortie : `dist/frontend/browser`

L'API et PostgreSQL doivent rester sur une infrastructure Node/PostgreSQL compatible.


## Stockage des images et affiches

Les nouveaux fichiers envoyés via `/api/uploads/images` et `/api/uploads/event-media`
sont enregistrés dans la table PostgreSQL `uploaded_media` (contenu binaire, type MIME,
URL et date). La table est créée automatiquement à la première utilisation avec le
`DATABASE_URL` existant. Aucun disque local ni nouvelle clé de service n’est nécessaire.
La limite existante de 5 Mo par fichier reste appliquée. Les sauvegardes de PostgreSQL
doivent inclure cette table.

L’URL d’un fichier n’est renvoyée qu’après confirmation de son enregistrement. En cas
d’indisponibilité du stockage, l’envoi retourne 503 et doit être réessayé. Les lectures
restent publiques, comme auparavant, et utilisent la liste CORS autorisée du serveur.

Les fichiers antérieurs encore présents sur disque ou dans `backend/bundled-uploads`
sont migrés dans la base lors de leur lecture, en conservant leur URL. Un ancien fichier
déjà perdu et absent de ces deux emplacements doit être récupéré ou renvoyé.
