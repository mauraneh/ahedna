import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const ngCliEntry = resolve(currentDir, '../node_modules/@angular/cli/bin/ng.js');
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node ./scripts/run-ng-safe.mjs <ng-args...>');
  process.exit(1);
}

const env = { ...process.env };
const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] || '0', 10);
const shouldUseSafeWorkerMode = process.platform === 'darwin' && nodeMajor >= 22;

if (shouldUseSafeWorkerMode) {
  env.CI ??= '1';
  env.NG_BUILD_MAX_WORKERS ??= '1';
}

const child = spawn(process.execPath, [ngCliEntry, ...args], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
