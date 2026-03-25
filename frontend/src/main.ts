import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

async function bootstrap(): Promise<void> {
  // Dev server can occasionally fall back to JIT during incremental reloads.
  // Load the compiler only in development so the app does not blank out locally.
  if (!environment.production) {
    await import('@angular/compiler');
  }

  await bootstrapApplication(App, appConfig);
}

bootstrap().catch((err) => console.error(err));
