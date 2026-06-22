# AHEDNA

Application web Angular + Fastify, avec un back-office Payload dedie aux contenus editoriaux.

## Prerequis

- Node.js 20.x
- Yarn 1.22.x
- npm 10.x pour le back-office Payload
- PostgreSQL, ou Docker Compose

## Variables d'environnement

Backend :

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGINS`

Frontend :

- `AHEDNA_API_URL`
- `AHEDNA_CMS_URL`

CMS Payload :

- `DATABASE_URL`
- `PAYLOAD_SECRET`
- `PAYLOAD_PUBLIC_SERVER_URL`
- `AHEDNA_FRONTEND_URL` optionnel
- `PAYLOAD_DB_SCHEMA` optionnel (`payload` par defaut)

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

```bash
cd cms
npm install
npm run dev
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

```bash
cd cms
npm run build
```

## Back-office

Payload est disponible sur `http://localhost:4000/admin`.

Il gere :

- les contenus editoriaux : medias, actualites, evenements, documents adherents
- les utilisateurs du site : role, email, coordonnees principales
- la moderation : sujets forum, photos d'evenements, photos galerie

Les contenus publics saisis dans Payload sont synchronises vers les tables lues par l'API Fastify.
