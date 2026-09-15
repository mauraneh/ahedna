const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Loaded via --require before any test file, so the test database always wins over
// a DATABASE_URL inherited from the shell or from the Docker container's env_file.
const envPaths = [
  path.resolve(__dirname, '../.env.test'),
  path.resolve(__dirname, '../../.env.test'),
];

const loaded = envPaths.filter((envPath) => fs.existsSync(envPath));

for (const envPath of loaded) {
  dotenv.config({ path: envPath, override: true });
}

if (loaded.length === 0) {
  throw new Error(
    'Aucun fichier .env.test trouve. Cree backend/.env.test ou .env.test a la racine ' +
      'avec un DATABASE_URL pointant vers une base de test dediee.'
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL absent de .env.test.');
}

process.env.NODE_ENV = 'test';
