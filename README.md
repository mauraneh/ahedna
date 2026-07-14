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
