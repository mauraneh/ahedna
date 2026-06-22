import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';

const projectRoot = path.resolve(process.cwd());

for (const envPath of [
  path.resolve(projectRoot, '.env'),
  path.resolve(projectRoot, '.env.local'),
  path.resolve(projectRoot, '../.env'),
  path.resolve(projectRoot, '../.env.local'),
]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}
