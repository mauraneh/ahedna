import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiUrl = (process.env.AHEDNA_API_URL || '/api').trim().replace(/\/+$/, '') || '/api';
const cmsUrl =
  (process.env.AHEDNA_CMS_URL || 'http://localhost:4000').trim().replace(/\/+$/, '') ||
  'http://localhost:4000';
const outputPath = resolve(process.cwd(), 'public', 'app-config.js');
const tempPath = resolve(process.cwd(), 'public', 'app-config.js.tmp');

mkdirSync(resolve(process.cwd(), 'public'), { recursive: true });

writeFileSync(
  tempPath,
  `window.__AHEDNA_CONFIG__ = ${JSON.stringify({ apiUrl, cmsUrl }, null, 2)};\n`,
  'utf8'
);
renameSync(tempPath, outputPath);

console.log(`[config] app-config.js generated with apiUrl=${apiUrl}, cmsUrl=${cmsUrl}`);
