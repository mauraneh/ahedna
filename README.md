# AHEDNA

Application web Angular + Fastify.

## Prerequis

- Node.js 20.x
- Yarn 1.22.x
- PostgreSQL, ou Docker Compose

## Variables d'environnement

Backend :

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGINS`

Frontend :

- `AHEDNA_API_URL`

## Demarrage local

Avec Docker Compose :

```bash
docker-compose up --build
```

Avec PostgreSQL local :

```bash
docker-compose --profile local-db up --build
```

Sans Docker :

```bash
cd backend
yarn install
yarn dev
```

```bash
cd frontend
yarn install
yarn start
```

## Qualite

```bash
cd backend
yarn test:backend
yarn lint:backend
```

```bash
cd frontend
yarn test:ci
yarn build
```
