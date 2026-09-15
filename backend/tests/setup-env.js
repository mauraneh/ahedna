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

function getDatabaseName(databaseUrl) {
  try {
    return new URL(databaseUrl).pathname.replace(/^\//, '');
  } catch {
    return '';
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    loaded.length === 0
      ? 'Aucun fichier .env.test trouve et aucun DATABASE_URL defini. Cree .env.test a partir ' +
        'de .env.test.example, ou fournis un DATABASE_URL pointant vers une base de test dediee.'
      : 'DATABASE_URL absent de .env.test.'
  );
}

// Sans .env.test (CI, conteneur), le DATABASE_URL herite pourrait etre celui de la
// production : on n'accepte que les bases dont le nom les designe comme base de test.
if (loaded.length === 0 && !/test/i.test(getDatabaseName(process.env.DATABASE_URL))) {
  throw new Error(
    `Les tests ecrivent en base et refusent de tourner sur "${getDatabaseName(process.env.DATABASE_URL)}". ` +
      'Utilise une base dediee dont le nom contient "test", ou cree un fichier .env.test.'
  );
}

process.env.NODE_ENV = 'test';
