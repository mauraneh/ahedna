# AHEDNA

Application web de l'Association de Harkis et de leurs Enfants de Dordogne et Nouvelle-Aquitaine.

Le dépôt contient deux applications :

- un frontend Angular dans `frontend/`
- un backend Fastify dans `backend/`

## Stack

- Angular 20
- Fastify
- PostgreSQL
- Transloco pour l'internationalisation
- Docker Compose pour le développement local

## Fonctionnalités principales

- site public : accueil, histoire, actualités, événements, forum, galerie
- authentification JWT avec rôles `membre`, `auteur`, `admin`
- espace membre avec profil et documents
- espace d'administration pour les utilisateurs et les contenus

## Arborescence

```text
.
├── backend/              # API Fastify et accès PostgreSQL
├── frontend/             # application Angular
├── docker-compose.yml    # environnement local
├── render.yaml           # déploiement backend
└── init_history.sql      # données d'initialisation histoire
```

## Prérequis

- Node.js 20.x
- Yarn 1.22.x
- PostgreSQL, ou Docker Compose si la base tourne en conteneur

## Configuration

Le backend lit ses variables depuis l'environnement.

Variables principales :

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ahedna_db
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:4200
```

Le frontend génère sa configuration runtime à partir de `AHEDNA_API_URL`.
Si la variable n'est pas définie, la valeur par défaut est `/api`.

```env
AHEDNA_API_URL=/api
```

En développement local, le serveur Angular proxifie `/api` vers `http://localhost:3000`.

## Démarrage local

### Avec Docker Compose

Si vous utilisez une base distante déjà configurée dans `.env` :

```bash
docker-compose up --build
```

Si vous voulez lancer aussi PostgreSQL localement :

```bash
docker-compose --profile local-db up --build
```

### Sans Docker

Terminal 1 :

```bash
cd backend
yarn install
yarn dev
```

Terminal 2 :

```bash
cd frontend
yarn install
yarn start
```

Accès locaux :

- frontend : `http://localhost:4200`
- backend : `http://localhost:3000`
- API : `http://localhost:3000/api`

La base est initialisée automatiquement au premier appel API.

## Build

```bash
cd backend
yarn build

cd ../frontend
yarn build
```

Les deux applications sont prévues pour tourner avec Node 20.x.

## Déploiement

- le backend peut être déployé à partir de `render.yaml`
- le frontend doit recevoir `AHEDNA_API_URL` avec l'URL publique de l'API

## Endpoints utiles

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/news?published=true`
- `GET /api/events?type=upcoming`
- `GET /api/history/chapters`

## Notes

- l'API principale est centralisée dans `backend/lib/api-handler.js`
- le frontend utilise une configuration runtime générée dans `frontend/scripts/generate-app-config.mjs`
